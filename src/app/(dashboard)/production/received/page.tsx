"use client";

import React, { useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import { 
  useVehicles, 
  useCreateVehicle, 
  useUpdateVehicle, 
  useUpdateVehicleStage 
} from "@/hooks/useQueries";
import { useAuthStore } from "@/store/authStore";
import { PageHeader } from "@/components/shared/PageHeader";
import { KPICard } from "@/components/ui/KPICard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { GlobalDateFilterBar } from "@/components/shared/GlobalDateFilterBar";
import { AddVehicleDialog } from "@/components/vehicles/AddVehicleDialog";
import { DispatchVehicleDialog, type DispatchFormValues } from "@/components/vehicles/DispatchVehicleDialog";
import { EditRecordDialog } from "@/components/shared/EditRecordDialog";
import { AuditHistoryDrawer } from "@/components/shared/AuditHistoryDrawer";
import { exportToCSV, exportToExcel, exportToPDF } from "../../reports/components/exportUtils";
import { isDateInFilterRange } from "../../reports/components/dateFilterUtils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { motion, AnimatePresence } from "motion/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Priority, Vehicle } from "@/types";
import { 
  Inbox, 
  Plus, 
  Truck, 
  Search, 
  FileSpreadsheet, 
  Download, 
  FileText, 
  Edit, 
  History, 
  ChevronDown, 
  Clock, 
  AlertTriangle,
  CheckCircle2,
  Package,
  RotateCcw
} from "lucide-react";
import { toast } from "sonner";

const PRODUCT_CATEGORIES = [
  "All Categories",
  "Cargo Box",
  "Cargo Box / Air Cutter / Battery Box",
  "Cargo Box / Air Cutter",
  "Cargo Box / Battery Box",
  "Garbage Body",
  "Grocery Cart",
  "Food Cart",
];

export default function ReceivedVehiclesPage() {
  const router = useRouter();
  const { data: vehiclesData, isLoading } = useVehicles({ pageSize: 1000 });
  const vehicles: Vehicle[] = Array.isArray(vehiclesData) ? vehiclesData : (vehiclesData?.items ?? []);

  const createVehicleMutation = useCreateVehicle();
  const updateVehicleMutation = useUpdateVehicle();
  const updateStageMutation = useUpdateVehicleStage();

  const userRole = (useAuthStore((state: any) => state.role) || "operator").toLowerCase();
  const canEdit = ["admin", "owner", "manager", "supervisor", "dispatcher", "dispatch"].includes(userRole);

  // Modal states
  const [showAddModal, setShowAddModal] = useState(false);
  const [pendingDispatchVehicle, setPendingDispatchVehicle] = useState<Vehicle | null>(null);
  const [showSelectDispatchModal, setShowSelectDispatchModal] = useState(false);
  const [editRecord, setEditRecord] = useState<Vehicle | null>(null);
  const [historyRecord, setHistoryRecord] = useState<Vehicle | null>(null);

  // Filters state
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [oemFilter, setOemFilter] = useState("All OEMs");
  const [dealerFilter, setDealerFilter] = useState("All Dealers");
  const [priorityFilter, setPriorityFilter] = useState<"all" | Priority>("all");
  const [statusFilter, setStatusFilter] = useState<"All Statuses" | "Pending Only" | "Dispatched Only">("All Statuses");
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  // Date Filter State
  const [dateFilter, setDateFilter] = useState("All");
  const [customMonth, setCustomMonth] = useState("");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  // All received vehicles in system
  const receivedVehicles = useMemo(() => {
    return vehicles;
  }, [vehicles]);

  // Dynamic OEMs
  const allOemOptions = useMemo(() => {
    const set = new Set<string>();
    receivedVehicles.forEach((v) => {
      if (v.oemName) set.add(v.oemName.trim());
    });
    return ["All OEMs", ...Array.from(set).sort()];
  }, [receivedVehicles]);

  // Dynamic Dealers
  const allDealerOptions = useMemo(() => {
    const set = new Set<string>();
    receivedVehicles.forEach((v) => {
      if (v.dealerName) set.add(v.dealerName.trim());
    });
    return ["All Dealers", ...Array.from(set).sort()];
  }, [receivedVehicles]);

  const getVehicleDate = (v: Vehicle): string | undefined => {
    return v.receivedAt || (v as any).received_at || v.arrivalTime || (v as any).arrival_time || v.gateEntryTime || (v as any).gate_entry_time || (v as any).submittedAt || (v as any).createdAt || (v as any).created_at;
  };

  const matchesDateFilter = useCallback((vDateRaw: string | undefined | null): boolean => {
    if (dateFilter === "All") return true;
    if (!vDateRaw) return false;

    try {
      const d = new Date(vDateRaw);
      if (isNaN(d.getTime())) return false;

      const now = new Date();

      if (dateFilter === "Today") {
        const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
        const dStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        return dStr === todayStr;
      }

      if (dateFilter === "This Month") {
        return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
      }

      if (dateFilter === "Last Month") {
        const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        return d.getFullYear() === lm.getFullYear() && d.getMonth() === lm.getMonth();
      }

      if (dateFilter === "This Quarter") {
        const currentQ = Math.floor(now.getMonth() / 3);
        const dQ = Math.floor(d.getMonth() / 3);
        return d.getFullYear() === now.getFullYear() && dQ === currentQ;
      }

      if (dateFilter === "Last Quarter") {
        const currentQ = Math.floor(now.getMonth() / 3);
        const targetQ = currentQ === 0 ? 3 : currentQ - 1;
        const targetYear = currentQ === 0 ? now.getFullYear() - 1 : now.getFullYear();
        const dQ = Math.floor(d.getMonth() / 3);
        return d.getFullYear() === targetYear && dQ === targetQ;
      }

      if (dateFilter === "This Year") {
        return d.getFullYear() === now.getFullYear();
      }

      if (dateFilter === "Month" && customMonth) {
        const [y, m] = customMonth.split("-").map(Number);
        return d.getFullYear() === y && (d.getMonth() + 1) === m;
      }

      if (dateFilter === "Custom" && customStartDate && customEndDate) {
        const sd = new Date(`${customStartDate}T00:00:00`);
        const ed = new Date(`${customEndDate}T23:59:59.999`);
        return d >= sd && d <= ed;
      }

      return true;
    } catch {
      return false;
    }
  }, [dateFilter, customMonth, customStartDate, customEndDate]);

  // Filtered List
  const filteredVehicles = useMemo(() => {
    return receivedVehicles.filter((v) => {
      const q = search.toLowerCase().trim();
      const matchSearch = !q || [
        v.trackingId,
        v.chassisNumber,
        v.vin,
        v.vehicleNumber,
        v.oemName,
        v.vehicleModel,
        (v as any).modelName,
        v.dealerName,
        v.productCategory,
      ].some((val) => (val || "").toLowerCase().includes(q));

      const matchCategory = categoryFilter === "All Categories" || v.productCategory === categoryFilter;
      const matchOem = oemFilter === "All OEMs" || (v.oemName || "").toLowerCase() === oemFilter.toLowerCase();
      const matchDealer = dealerFilter === "All Dealers" || (v.dealerName || "").toLowerCase() === dealerFilter.toLowerCase();
      const matchPriority = priorityFilter === "all" || (v.priority || "Normal").toLowerCase() === priorityFilter.toLowerCase();

      const normStage = (v.currentStage || (v as any).current_stage || "received").toLowerCase().trim();
      const isDispatched = normStage === "dispatch" || normStage === "dispatched" || normStage === "delivered";
      const matchStatus =
        statusFilter === "All Statuses" ||
        (statusFilter === "Pending Only" && !isDispatched) ||
        (statusFilter === "Dispatched Only" && isDispatched);

      const vDateRaw = getVehicleDate(v);
      const matchDate = matchesDateFilter(vDateRaw);

      return matchSearch && matchCategory && matchOem && matchDealer && matchPriority && matchStatus && matchDate;
    }).sort((a, b) => {
      const stageA = (a.currentStage || (a as any).current_stage || "received").toLowerCase().trim();
      const stageB = (b.currentStage || (b as any).current_stage || "received").toLowerCase().trim();

      const isDispatchedA = stageA === "dispatch" || stageA === "dispatched" || stageA === "delivered";
      const isDispatchedB = stageB === "dispatch" || stageB === "dispatched" || stageB === "delivered";

      // Non-dispatched vehicles on top
      if (!isDispatchedA && isDispatchedB) return -1;
      if (isDispatchedA && !isDispatchedB) return 1;

      const dateA = new Date(getVehicleDate(a) || 0).getTime();
      const dateB = new Date(getVehicleDate(b) || 0).getTime();
      if (dateA !== dateB) return dateB - dateA;
      return (Number(b.id) || 0) - (Number(a.id) || 0);
    });
  }, [receivedVehicles, search, categoryFilter, oemFilter, dealerFilter, priorityFilter, statusFilter, matchesDateFilter]);

  const isFiltered = Boolean(
    search || 
    dateFilter !== "All" || 
    categoryFilter !== "All Categories" || 
    oemFilter !== "All OEMs" || 
    dealerFilter !== "All Dealers" || 
    priorityFilter !== "all" || 
    statusFilter !== "All Statuses"
  );

  // Dynamic KPIs strictly calculated from the filtered dataset
  const stats = useMemo(() => {
    const total = filteredVehicles.length;
    const urgent = filteredVehicles.filter(v => (v.priority || "").toLowerCase() === "urgent").length;
    const high = filteredVehicles.filter(v => (v.priority || "").toLowerCase() === "high").length;
    
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
    const todayCount = filteredVehicles.filter(v => {
      const d = getVehicleDate(v);
      if (!d) return false;
      const dObj = new Date(d);
      if (isNaN(dObj.getTime())) return false;
      const dStr = `${dObj.getFullYear()}-${String(dObj.getMonth() + 1).padStart(2, "0")}-${String(dObj.getDate()).padStart(2, "0")}`;
      return dStr === todayStr;
    }).length;

    return { total, urgent, high, todayCount };
  }, [filteredVehicles]);

  // Handlers
  const handleAddVehicle = (data: any) => {
    createVehicleMutation.mutate(data, {
      onSuccess: () => {
        toast.success("Vehicle received and added successfully!");
        setShowAddModal(false);
      },
      onError: (err: any) => {
        toast.error(err?.response?.data?.detail || "Failed to add vehicle");
      }
    });
  };

  const handleFinalDispatchSubmit = (values: DispatchFormValues) => {
    if (!pendingDispatchVehicle) return;

    updateVehicleMutation.mutate(
      {
        id: pendingDispatchVehicle.id,
        data: {
          current_stage: "dispatch",
          progress_percent: 100,
          transport_company: values.transportCompany,
          truck_number: values.truckNumber,
          driver_name: values.driverName,
          driver_mobile_number: values.driverMobileNumber,
          dispatch_challan_number: values.dispatchChallanNumber,
          invoice_number: values.invoiceNumber,
          lr_number: values.lrNumber,
          dealer_name: values.destination,
          dispatch_date_time: values.dispatchDateTime || undefined,
          remarks: values.remarks,
          documents_url: values.documentsUrl,
        },
      },
      {
        onSuccess: () => {
          toast.success(`Vehicle ${pendingDispatchVehicle.chassisNumber || pendingDispatchVehicle.trackingId} dispatched successfully!`, {
            action: {
              label: "View Dispatch Table",
              onClick: () => router.push("/dispatch"),
            },
          });
          setPendingDispatchVehicle(null);
        },
        onError: (err: any) => {
          toast.error(err?.response?.data?.detail || "Failed to dispatch vehicle");
        },
      }
    );
  };

  const formatReceivedDate = (dateStr?: string): string => {
    if (!dateStr) return "-";
    try {
      const d = new Date(dateStr);
      if (isNaN(d.getTime())) return String(dateStr);
      return d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
    } catch {
      return String(dateStr);
    }
  };

  return (
    <div className="p-4 md:p-6 space-y-6" data-ocid="received_vehicles.page">
      {/* Top Header */}
      <PageHeader
        title="Received Vehicles"
        description="Incoming vehicle intake, verification inventory, gate entry, and production staging"
        icon={<Inbox className="w-5 h-5 text-primary" />}
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            {canEdit && (
              <>
                <Button
                  type="button"
                  onClick={() => setShowAddModal(true)}
                  className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs font-semibold cursor-pointer"
                >
                  <Plus size={14} /> Receive Vehicle
                </Button>
                <Button
                  type="button"
                  onClick={() => setShowSelectDispatchModal(true)}
                  className="gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs font-semibold cursor-pointer"
                >
                  <Truck size={14} /> Dispatch Vehicle
                </Button>
              </>
            )}
          </div>
        }
      />

      {/* Global Date Filter Bar */}
      <GlobalDateFilterBar
        dateFilter={dateFilter}
        setDateFilter={setDateFilter}
        customMonth={customMonth}
        setCustomMonth={setCustomMonth}
        customStartDate={customStartDate}
        setCustomStartDate={setCustomStartDate}
        customEndDate={customEndDate}
        setCustomEndDate={setCustomEndDate}
      />

      {/* Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        <KPICard
          title="Total Received"
          value={stats.total}
          description={isFiltered ? `Matching filter (${stats.total} of ${vehicles.length})` : "Inward vehicles in stock"}
          icon={<Inbox size={14} />}
          semantic="primary"
        />
        <KPICard
          title="Received Today"
          value={stats.todayCount}
          description={isFiltered ? "Filtered today intake" : "Today's gate intake"}
          icon={<CheckCircle2 size={14} />}
          semantic="success"
        />
        <KPICard
          title="Urgent Priority"
          value={stats.urgent}
          description={isFiltered ? "Filtered urgent vehicles" : "Immediate attention required"}
          icon={<AlertTriangle size={14} />}
          semantic={stats.urgent > 0 ? "destructive" : "neutral"}
        />
        <KPICard
          title="High Priority"
          value={stats.high}
          description={isFiltered ? "Filtered high priority" : "Fast-track production"}
          icon={<Clock size={14} />}
          semantic={stats.high > 0 ? "warning" : "neutral"}
        />
      </div>

      {/* Table Action Header Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-4 rounded-xl border border-border shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-primary/10 text-primary border border-primary/20">
            <FileSpreadsheet size={20} />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Received Vehicles Master Table</h3>
            <p className="text-xs text-muted-foreground">Real-time table view ({filteredVehicles.length} of {receivedVehicles.length} vehicles matching filter)</p>
          </div>
        </div>

        {/* Export Buttons */}
        <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
          <Button
            type="button"
            size="sm"
            onClick={() => {
              const headers = ["Tracking ID", "Chassis / VIN", "Received Date", "OEM Name", "Model Name", "Dealer Name", "Category", "Priority", "Stage"];
              const tableRows = filteredVehicles.map((v) => ({
                "Tracking ID": v.trackingId,
                "Chassis / VIN": v.chassisNumber || v.vin || "-",
                "Received Date": formatReceivedDate((v as any).receivedAt || (v as any).createdAt),
                "OEM Name": v.oemName,
                "Model Name": v.vehicleModel || (v as any).modelName || "-",
                "Dealer Name": v.dealerName || "-",
                "Category": v.productCategory,
                "Priority": v.priority || "Normal",
                "Stage": v.currentStage || "received"
              }));
              exportToExcel("Received_Vehicles_Master", headers, tableRows);
            }}
            className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs cursor-pointer"
          >
            <Download size={13} /> Export Excel (.xlsx)
          </Button>

          <Button
            type="button"
            size="sm"
            onClick={() => {
              const headers = ["Tracking ID", "Chassis / VIN", "Received Date", "OEM Name", "Model Name", "Dealer Name", "Category", "Priority", "Stage"];
              const tableRows = filteredVehicles.map((v) => ({
                "Tracking ID": v.trackingId,
                "Chassis / VIN": v.chassisNumber || v.vin || "-",
                "Received Date": formatReceivedDate((v as any).receivedAt || (v as any).createdAt),
                "OEM Name": v.oemName,
                "Model Name": v.vehicleModel || (v as any).modelName || "-",
                "Dealer Name": v.dealerName || "-",
                "Category": v.productCategory,
                "Priority": v.priority || "Normal",
                "Stage": v.currentStage || "received"
              }));
              exportToPDF("Received_Vehicles_Master", "Received Vehicles Report", headers, tableRows, {
                summary: `Total ${filteredVehicles.length} received vehicles shown.`
              });
            }}
            className="bg-rose-600 hover:bg-rose-700 text-white text-xs cursor-pointer"
          >
            <FileText size={13} /> Export PDF (.pdf)
          </Button>

          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => {
              const headers = ["Tracking ID", "Chassis / VIN", "Received Date", "OEM Name", "Model Name", "Dealer Name", "Category", "Priority", "Stage"];
              const tableRows = filteredVehicles.map((v) => ({
                "Tracking ID": v.trackingId,
                "Chassis / VIN": v.chassisNumber || v.vin || "-",
                "Received Date": formatReceivedDate((v as any).receivedAt || (v as any).createdAt),
                "OEM Name": v.oemName,
                "Model Name": v.vehicleModel || (v as any).modelName || "-",
                "Dealer Name": v.dealerName || "-",
                "Category": v.productCategory,
                "Priority": v.priority || "Normal",
                "Stage": v.currentStage || "received"
              }));
              exportToCSV("Received_Vehicles_Master", headers, tableRows);
            }}
            className="text-xs cursor-pointer"
          >
            <Download size={13} /> CSV
          </Button>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="flex flex-col sm:flex-row flex-wrap items-center gap-2.5">
        <div className="relative w-full sm:flex-1 sm:min-w-[200px] sm:max-w-xs">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search tracking ID, chassis, OEM, dealer..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs bg-muted/50 border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
        </div>

        {/* Category Filter */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="h-9 text-xs font-medium bg-muted/50 border border-input rounded-lg px-2 text-foreground focus:outline-none"
        >
          {PRODUCT_CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat === "All Categories" ? "📦 All Categories" : cat}
            </option>
          ))}
        </select>

        {/* OEM Filter */}
        <select
          value={oemFilter}
          onChange={(e) => setOemFilter(e.target.value)}
          className="h-9 text-xs font-medium bg-muted/50 border border-input rounded-lg px-2 text-foreground focus:outline-none"
        >
          {allOemOptions.map((oem) => (
            <option key={oem} value={oem}>
              {oem === "All OEMs" ? "🏭 All OEMs" : oem}
            </option>
          ))}
        </select>

        {/* Dealer Filter */}
        <select
          value={dealerFilter}
          onChange={(e) => setDealerFilter(e.target.value)}
          className="h-9 text-xs font-medium bg-muted/50 border border-input rounded-lg px-2 text-foreground focus:outline-none"
        >
          {allDealerOptions.map((dealer) => (
            <option key={dealer} value={dealer}>
              {dealer === "All Dealers" ? "🏪 All Dealers" : dealer}
            </option>
          ))}
        </select>

        {/* Priority Filter */}
        <select
          value={priorityFilter}
          onChange={(e) => setPriorityFilter(e.target.value as any)}
          className="h-9 text-xs font-medium bg-muted/50 border border-input rounded-lg px-2 text-foreground focus:outline-none"
        >
          <option value="all">⚡ All Priorities</option>
          <option value="Normal">Normal</option>
          <option value="High">High Priority</option>
          <option value="Urgent">Urgent</option>
        </select>

        {/* Status Filter Dropdown (All Statuses, Pending, Dispatched) */}
        <div className="relative w-full sm:w-auto">
          <button
            type="button"
            onClick={() => {
              setShowStatusDropdown((v) => !v);
            }}
            data-ocid="received.status.select"
            className="flex items-center justify-between gap-1.5 px-3 py-2 text-[11px] font-medium bg-muted/50 border border-border rounded-lg text-foreground hover:border-primary/40 transition-all w-full min-w-[130px] cursor-pointer h-9"
          >
            <span className="truncate">
              {statusFilter === "All Statuses" ? "All Statuses" : statusFilter === "Pending Only" ? "⏳ Pending Only" : "✅ Dispatched Only"}
            </span>
            <ChevronDown
              size={11}
              className={cn(
                "transition-transform",
                showStatusDropdown && "rotate-180",
              )}
            />
          </button>
          <AnimatePresence>
            {showStatusDropdown && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -6 }}
                transition={{ duration: 0.15 }}
                className="absolute top-full left-0 right-0 sm:right-auto mt-1.5 bg-card border border-border rounded-xl shadow-xl z-30 py-1 min-w-[180px]"
                data-ocid="received.status.dropdown_menu"
              >
                {[
                  { id: "All Statuses", label: "All Statuses" },
                  { id: "Pending Only", label: "⏳ Pending Vehicles Only" },
                  { id: "Dispatched Only", label: "✅ Dispatched Only" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      setStatusFilter(item.id as any);
                      setShowStatusDropdown(false);
                    }}
                    className={cn(
                      "w-full text-left px-3 py-2 text-xs transition-colors truncate cursor-pointer",
                      statusFilter === item.id
                        ? "bg-primary/10 text-primary font-semibold"
                        : "text-foreground hover:bg-muted",
                    )}
                  >
                    {item.label}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Reset Filters button */}
        {isFiltered && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              setSearch("");
              setDateFilter("All");
              setCustomMonth("");
              setCustomStartDate("");
              setCustomEndDate("");
              setCategoryFilter("All Categories");
              setOemFilter("All OEMs");
              setDealerFilter("All Dealers");
              setPriorityFilter("all");
              setStatusFilter("All Statuses");
            }}
            className="h-9 text-xs text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 gap-1.5 cursor-pointer font-semibold ml-auto sm:ml-0"
          >
            <RotateCcw size={12} /> Reset Filters
          </Button>
        )}
      </div>

      {/* Main Table View */}
      <div className="bg-card border border-border rounded-xl shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left border-collapse">
            <thead className="bg-muted/70 text-muted-foreground uppercase text-[11px] font-bold border-b border-border">
              <tr>
                <th className="px-4 py-3.5">#</th>
                <th className="px-4 py-3.5">Tracking ID</th>
                <th className="px-4 py-3.5">Chassis / VIN</th>
                <th className="px-4 py-3.5">Received Date</th>
                <th className="px-4 py-3.5">OEM Name</th>
                <th className="px-4 py-3.5">Model Name</th>
                <th className="px-4 py-3.5">Dealer</th>
                <th className="px-4 py-3.5">Category</th>
                <th className="px-4 py-3.5">Stage</th>
                <th className="px-4 py-3.5">Priority</th>
                <th className="px-4 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {isLoading ? (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-muted-foreground animate-pulse">
                    Loading received vehicles...
                  </td>
                </tr>
              ) : filteredVehicles.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-12 text-center text-muted-foreground">
                    No received vehicles found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredVehicles.map((v: Vehicle, idx: number) => {
                  const vDateRaw = (v as any).receivedAt || (v as any).arrivalTime || (v as any).submittedAt || (v as any).createdAt;
                  const vDateFormatted = formatReceivedDate(vDateRaw);
                  const pNorm = (v.priority || "Normal").toLowerCase();

                  return (
                    <tr key={v.id} className="hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 font-mono text-muted-foreground">{idx + 1}</td>
                      <td className="px-4 py-3 font-mono font-bold text-primary">
                        <button
                          type="button"
                          onClick={() => router.push(`/vehicle/${v.id}`)}
                          className="hover:underline text-left text-primary font-bold cursor-pointer"
                        >
                          {v.trackingId}
                        </button>
                      </td>
                      <td className="px-4 py-3 font-mono text-muted-foreground font-medium">
                        {v.chassisNumber || v.vin || "-"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground whitespace-nowrap font-medium">
                        {vDateFormatted}
                      </td>
                      <td className="px-4 py-3 font-medium text-foreground">{v.oemName}</td>
                      <td className="px-4 py-3 font-semibold text-foreground">
                        {v.vehicleModel || (v as any).modelName || "-"}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">{v.dealerName || "-"}</td>
                      <td className="px-4 py-3 text-muted-foreground">{v.productCategory}</td>
                      <td className="px-4 py-3">
                        <span className="font-semibold px-2 py-0.5 rounded-full text-[10px] bg-primary/10 text-primary border border-primary/20 capitalize">
                          {v.currentStage}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={cn(
                            "font-bold px-2 py-0.5 rounded-full text-[10px]",
                            pNorm === "urgent"
                              ? "bg-rose-500/15 text-rose-600 border border-rose-500/30"
                              : pNorm === "high"
                              ? "bg-amber-500/15 text-amber-600 border border-amber-500/30"
                              : "bg-muted text-muted-foreground"
                          )}
                        >
                          {v.priority || "Normal"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {canEdit && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setPendingDispatchVehicle(v)}
                              className="h-7 px-2 text-[11px] gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-500/30 cursor-pointer"
                              title="Dispatch Vehicle"
                            >
                              <Truck size={12} /> Dispatch
                            </Button>
                          )}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                type="button"
                                className="p-1 rounded-md text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
                              >
                                <ChevronDown size={14} />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              {canEdit && (
                                <DropdownMenuItem onClick={() => setEditRecord(v)}>
                                  <Edit className="w-3.5 h-3.5 mr-2" /> Edit Details
                                </DropdownMenuItem>
                              )}
                              <DropdownMenuItem onClick={() => setHistoryRecord(v)}>
                                <History className="w-3.5 h-3.5 mr-2" /> View Audit History
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD VEHICLE MODAL */}
      {showAddModal && (
        <AddVehicleDialog
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddVehicle}
          isOemSubmission={false}
          initialMode="received"
        />
      )}

      {/* DISPATCH VEHICLE MODAL */}
      <DispatchVehicleDialog
        open={!!pendingDispatchVehicle}
        onOpenChange={(open) => !open && setPendingDispatchVehicle(null)}
        vehicle={pendingDispatchVehicle}
        onSubmit={handleFinalDispatchSubmit}
        isSubmitting={updateVehicleMutation.isPending}
      />

      {/* SELECT VEHICLE TO DISPATCH MODAL */}
      <Dialog open={showSelectDispatchModal} onOpenChange={setShowSelectDispatchModal}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Truck className="w-5 h-5 text-emerald-600" />
              Select Received Vehicle to Dispatch
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-2 max-h-[400px] pr-1 mt-2">
            {receivedVehicles.length === 0 ? (
              <div className="p-8 text-center text-muted-foreground text-xs">
                No received vehicles available for dispatch.
              </div>
            ) : (
              receivedVehicles.map((v) => (
                <div
                  key={v.id}
                  className="flex items-center justify-between p-3 rounded-xl border border-border/70 hover:border-emerald-500/40 bg-card hover:bg-muted/30 transition-all gap-3"
                >
                  <div className="flex flex-col min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-primary">{v.trackingId}</span>
                      <span className="text-[11px] font-mono text-muted-foreground">VIN: {v.chassisNumber || v.vin || "-"}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground flex-wrap">
                      <span className="font-medium text-foreground">{v.oemName}</span>
                      <span>•</span>
                      <span>{v.vehicleModel || (v as any).modelName || "N/A"}</span>
                      <span>•</span>
                      <span className="capitalize px-1.5 py-0.2 rounded text-[10px] bg-muted font-medium">{v.productCategory}</span>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => {
                      setPendingDispatchVehicle(v);
                      setShowSelectDispatchModal(false);
                    }}
                    className="gap-1 bg-emerald-600 hover:bg-emerald-700 text-white shrink-0 text-xs font-semibold cursor-pointer"
                  >
                    <Truck size={12} /> Dispatch
                  </Button>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* EDIT VEHICLE MODAL */}
      <EditRecordDialog
        open={!!editRecord}
        onOpenChange={(open) => !open && setEditRecord(null)}
        title={`Edit Received Vehicle: ${editRecord?.trackingId || editRecord?.vehicleNumber}`}
        fields={[
          { name: "chassisNumber", label: "Chassis / VIN", type: "text", defaultValue: editRecord?.chassisNumber || editRecord?.vin || "" },
          { name: "oemName", label: "OEM Name", type: "text", defaultValue: editRecord?.oemName || "" },
          { name: "vehicleModel", label: "Model Name", type: "text", defaultValue: editRecord?.vehicleModel || (editRecord as any)?.modelName || "" },
          { name: "dealerName", label: "Dealer Name", type: "text", defaultValue: editRecord?.dealerName || "" },
          { name: "productCategory", label: "Category", type: "select", defaultValue: editRecord?.productCategory || "Cargo Box", options: PRODUCT_CATEGORIES.filter(c => c !== "All Categories") },
          { name: "priority", label: "Priority", type: "select", defaultValue: editRecord?.priority || "Normal", options: ["Normal", "High", "Urgent"] },
        ]}
        onSubmit={(data, reason) => {
          if (!editRecord) return;
          updateVehicleMutation.mutate({
            id: editRecord.id,
            data: {
              chassis_number: data.chassisNumber,
              vin: data.chassisNumber,
              oem_name: data.oemName,
              vehicle_model: data.vehicleModel,
              dealer_name: data.dealerName,
              product_category: data.productCategory,
              priority: data.priority,
              reason,
            }
          }, {
            onSuccess: () => {
              toast.success(`Vehicle ${editRecord.trackingId} updated successfully`);
              setEditRecord(null);
            },
            onError: (err: any) => {
              toast.error(err?.response?.data?.detail || "Failed to update vehicle");
            }
          });
        }}
        isSubmitting={updateVehicleMutation.isPending}
      />

      {/* AUDIT HISTORY DRAWER */}
      <AuditHistoryDrawer
        open={!!historyRecord}
        onOpenChange={(open) => !open && setHistoryRecord(null)}
        recordId={historyRecord?.id?.toString() || ""}
        module="vehicles"
        title={`Audit History: ${historyRecord?.vehicleNumber || historyRecord?.trackingId}`}
      />
    </div>
  );
}
