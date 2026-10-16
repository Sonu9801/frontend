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
  RotateCcw,
  Calendar as CalendarIcon
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
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showOemDropdown, setShowOemDropdown] = useState(false);
  const [showDealerDropdown, setShowDealerDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  // Date Presets State
  const [selectedDatePreset, setSelectedDatePreset] = useState("All Time");
  const [dateRange, setDateRange] = useState("All Time");
  const [customMonth, setCustomMonth] = useState(
    () => new Date().toISOString().slice(0, 7)
  );
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const handleDatePresetChange = (preset: string) => {
    setSelectedDatePreset(preset);
    if (preset === "Custom Month") {
      setDateRange(`Month: ${customMonth}`);
    } else if (preset === "Custom Range") {
      if (startDate && endDate) {
        setDateRange(`Custom: ${startDate} to ${endDate}`);
      } else {
        setDateRange("All Time");
      }
    } else {
      setDateRange(preset);
    }
  };

  const handleCustomMonthChange = (monthVal: string) => {
    setCustomMonth(monthVal);
    if (selectedDatePreset === "Custom Month") {
      setDateRange(`Month: ${monthVal}`);
    }
  };

  const handleCustomDateChange = (start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
    if (selectedDatePreset === "Custom Range" && start && end) {
      setDateRange(`Custom: ${start} to ${end}`);
    }
  };

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
      const matchOem = oemFilter === "All OEMs" || (v.oemName || "").toLowerCase().trim() === oemFilter.toLowerCase().trim();
      const matchDealer = dealerFilter === "All Dealers" || (v.dealerName || "").toLowerCase().trim() === dealerFilter.toLowerCase().trim();
      const matchPriority = priorityFilter === "all" || (v.priority || "Normal").toLowerCase() === priorityFilter.toLowerCase();

      const normStage = (v.currentStage || (v as any).current_stage || "received").toLowerCase().trim();
      const isDispatched = normStage === "dispatch" || normStage === "dispatched" || normStage === "delivered";
      const matchStatus =
        statusFilter === "All Statuses" ||
        (statusFilter === "Pending Only" && !isDispatched) ||
        (statusFilter === "Dispatched Only" && isDispatched);

      const vDateRaw = getVehicleDate(v);
      const matchDate = isDateInFilterRange(vDateRaw, dateRange);

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
  }, [receivedVehicles, search, categoryFilter, oemFilter, dealerFilter, priorityFilter, statusFilter, dateRange]);

  const isFiltered = Boolean(
    search || 
    dateRange !== "All Time" || 
    categoryFilter !== "All Categories" || 
    oemFilter !== "All OEMs" || 
    dealerFilter !== "All Dealers" || 
    priorityFilter !== "all" || 
    statusFilter !== "All Statuses"
  );

  const urgentCount = useMemo(() => {
    return receivedVehicles.filter(v => (v.priority || "").toLowerCase() === "urgent").length;
  }, [receivedVehicles]);

  const highCount = useMemo(() => {
    return receivedVehicles.filter(v => (v.priority || "").toLowerCase() === "high").length;
  }, [receivedVehicles]);

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
    <div className="flex flex-col min-h-full bg-background" data-ocid="received_vehicles.page">
      {/* Top bar */}
      <div className="flex-shrink-0 p-3 sm:p-4 md:px-6 md:pt-5 md:pb-4 border-b border-border bg-card space-y-3 sm:space-y-4">
        {/* Header with PageHeader and Actions */}
        <PageHeader
          title="Received Vehicles"
          className="mb-0 pb-0 gap-3"
          description={
            <span className="flex items-center gap-2 flex-wrap">
              <span>{receivedVehicles.length} total vehicles tracked through inward staging</span>
              {urgentCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                  {urgentCount} urgent
                </span>
              )}
              {highCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                  {highCount} high priority
                </span>
              )}
            </span>
          }
          actions={
            <div className="flex items-center gap-2 w-full sm:w-auto">
              {canEdit && (
                <>
                  <Button
                    type="button"
                    onClick={() => setShowAddModal(true)}
                    className="flex-1 sm:flex-initial gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 shadow-xs h-9 text-xs font-semibold cursor-pointer"
                  >
                    <Plus size={14} /> Receive Vehicle
                  </Button>

                  <Button
                    type="button"
                    variant="success"
                    onClick={() => setShowSelectDispatchModal(true)}
                    className="flex-1 sm:flex-initial gap-1.5 shadow-xs h-9 text-xs font-semibold cursor-pointer"
                  >
                    <Truck size={14} /> Dispatch Vehicle
                  </Button>
                </>
              )}
            </div>
          }
        />

        <div className="flex flex-col sm:flex-row flex-wrap items-center gap-2">
          {/* Search Input */}
          <div className="relative w-full sm:flex-1 sm:min-w-[180px] sm:max-w-xs">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="text"
              placeholder="Search tracking ID, vehicle, OEM…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 h-9 text-xs bg-muted/50 border border-input rounded-xl text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all shadow-2xs"
              data-ocid="received.search_input"
            />
          </div>

          {/* Date Range & Custom Month Filter Selector */}
          <div className="flex items-center gap-1.5 px-2.5 h-9 bg-muted/50 rounded-xl border border-border w-full sm:w-auto">
            <CalendarIcon size={14} className="text-muted-foreground shrink-0" />
            <select 
              value={selectedDatePreset}
              onChange={(e) => handleDatePresetChange(e.target.value)}
              className="bg-transparent text-xs font-semibold text-foreground outline-none cursor-pointer w-full sm:w-auto"
            >
              <option value="All Time">All Time (All Dates)</option>
              <option value="Today">Today</option>
              <option value="Yesterday">Yesterday</option>
              <option value="This Week">This Week</option>
              <option value="Last 7 Days">Last 7 Days</option>
              <option value="Last 30 Days">Last 30 Days</option>
              <option value="This Month">This Month</option>
              <option value="Last Month">Last Month</option>
              <option value="Custom Month">Select Month (Custom)</option>
              <option value="Custom Range">Custom Date Range</option>
            </select>

            {selectedDatePreset === "Custom Month" && (
              <input 
                type="month"
                value={customMonth}
                onChange={(e) => handleCustomMonthChange(e.target.value)}
                className="bg-background border border-input rounded px-2 py-0.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
              />
            )}

            {selectedDatePreset === "Custom Range" && (
              <div className="flex items-center gap-1">
                <input 
                  type="date"
                  value={startDate}
                  onChange={(e) => handleCustomDateChange(e.target.value, endDate)}
                  className="bg-background border border-input rounded px-1.5 py-0.5 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <span className="text-[10px] text-muted-foreground">to</span>
                <input 
                  type="date"
                  value={endDate}
                  onChange={(e) => handleCustomDateChange(startDate, e.target.value)}
                  className="bg-background border border-input rounded px-1.5 py-0.5 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            )}
          </div>

          {/* Priority Tabs */}
          <div className="grid grid-cols-4 sm:flex items-center w-full sm:w-auto gap-1 bg-muted/50 rounded-xl p-1 border border-border">
            {(["all", "normal", "high", "urgent"] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setPriorityFilter(f as any)}
                data-ocid={`received.priority.${f}.tab`}
                className={cn(
                  "px-1.5 sm:px-2.5 py-1 rounded-lg text-[11px] font-semibold capitalize transition-all duration-150 whitespace-nowrap text-center truncate",
                  priorityFilter === f
                    ? f === "urgent"
                      ? "bg-destructive text-white shadow-xs"
                      : f === "high"
                        ? "bg-warning text-white shadow-xs"
                        : "bg-card text-foreground shadow-xs border border-border"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {f === "all" ? `All (${receivedVehicles.length})` : f}
              </button>
            ))}
          </div>

          {/* Dropdown Filters: Clean 2x2 Grid on Mobile, Inline Flex on Desktop */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Category Filter */}
            <div className="relative w-full sm:w-auto">
              <button
                type="button"
                onClick={() => {
                  setShowCategoryDropdown((v) => !v);
                  setShowOemDropdown(false);
                  setShowDealerDropdown(false);
                  setShowStatusDropdown(false);
                }}
                data-ocid="received.category.select"
                className="flex items-center justify-between gap-1.5 px-2.5 h-9 text-[11px] font-medium bg-muted/50 border border-border rounded-xl text-foreground hover:border-primary/40 transition-all w-full min-w-0 shadow-2xs"
              >
                <span className="truncate">{categoryFilter}</span>
                <ChevronDown
                  size={12}
                  className={cn(
                    "shrink-0 transition-transform text-muted-foreground",
                    showCategoryDropdown && "rotate-180",
                  )}
                />
              </button>
              <AnimatePresence>
                {showCategoryDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 right-0 sm:right-auto mt-1.5 bg-card border border-border rounded-xl shadow-xl z-30 py-1 min-w-[170px]"
                    data-ocid="received.category.dropdown_menu"
                  >
                    {PRODUCT_CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          setCategoryFilter(cat);
                          setShowCategoryDropdown(false);
                        }}
                        className={cn(
                          "w-full text-left px-3 py-2 text-xs transition-colors",
                          categoryFilter === cat
                            ? "bg-primary/10 text-primary font-semibold"
                            : "text-foreground hover:bg-muted",
                        )}
                      >
                        {cat}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* OEM Name Filter Dropdown */}
            <div className="relative w-full sm:w-auto">
              <button
                type="button"
                onClick={() => {
                  setShowOemDropdown((v) => !v);
                  setShowCategoryDropdown(false);
                  setShowDealerDropdown(false);
                  setShowStatusDropdown(false);
                }}
                data-ocid="received.oem.select"
                className="flex items-center justify-between gap-1.5 px-2.5 h-9 text-[11px] font-medium bg-muted/50 border border-border rounded-xl text-foreground hover:border-primary/40 transition-all w-full min-w-0 sm:min-w-[130px] shadow-2xs"
              >
                <span className="truncate">{oemFilter === "All OEMs" ? "All OEMs" : `OEM: ${oemFilter}`}</span>
                <ChevronDown
                  size={12}
                  className={cn(
                    "shrink-0 transition-transform text-muted-foreground",
                    showOemDropdown && "rotate-180",
                  )}
                />
              </button>
              <AnimatePresence>
                {showOemDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 right-0 sm:right-auto mt-1.5 bg-card border border-border rounded-xl shadow-xl z-30 py-1 min-w-[180px] max-h-60 overflow-y-auto"
                    data-ocid="received.oem.dropdown_menu"
                  >
                    {allOemOptions.map((oem) => (
                      <button
                        key={oem}
                        type="button"
                        onClick={() => {
                          setOemFilter(oem);
                          setShowOemDropdown(false);
                        }}
                        className={cn(
                          "w-full text-left px-3 py-2 text-xs transition-colors truncate",
                          oemFilter === oem
                            ? "bg-primary/10 text-primary font-semibold"
                            : "text-foreground hover:bg-muted",
                        )}
                      >
                        {oem}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Dealer Name Filter Dropdown */}
            <div className="relative w-full sm:w-auto">
              <button
                type="button"
                onClick={() => {
                  setShowDealerDropdown((v) => !v);
                  setShowCategoryDropdown(false);
                  setShowOemDropdown(false);
                  setShowStatusDropdown(false);
                }}
                data-ocid="received.dealer.select"
                className="flex items-center justify-between gap-1.5 px-2.5 h-9 text-[11px] font-medium bg-muted/50 border border-border rounded-xl text-foreground hover:border-primary/40 transition-all w-full min-w-0 sm:min-w-[130px] shadow-2xs"
              >
                <span className="truncate">{dealerFilter === "All Dealers" ? "All Dealers" : `Dealer: ${dealerFilter}`}</span>
                <ChevronDown
                  size={12}
                  className={cn(
                    "shrink-0 transition-transform text-muted-foreground",
                    showDealerDropdown && "rotate-180",
                  )}
                />
              </button>
              <AnimatePresence>
                {showDealerDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 right-0 sm:right-auto mt-1.5 bg-card border border-border rounded-xl shadow-xl z-30 py-1 min-w-[180px] max-h-60 overflow-y-auto"
                    data-ocid="received.dealer.dropdown_menu"
                  >
                    {allDealerOptions.map((dealer) => (
                      <button
                        key={dealer}
                        type="button"
                        onClick={() => {
                          setDealerFilter(dealer);
                          setShowDealerDropdown(false);
                        }}
                        className={cn(
                          "w-full text-left px-3 py-2 text-xs transition-colors truncate",
                          dealerFilter === dealer
                            ? "bg-primary/10 text-primary font-semibold"
                            : "text-foreground hover:bg-muted",
                        )}
                      >
                        {dealer}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Status Filter Dropdown */}
            <div className="relative w-full sm:w-auto">
              <button
                type="button"
                onClick={() => {
                  setShowStatusDropdown((v) => !v);
                  setShowCategoryDropdown(false);
                  setShowOemDropdown(false);
                  setShowDealerDropdown(false);
                }}
                data-ocid="received.status.select"
                className="flex items-center justify-between gap-1.5 px-2.5 h-9 text-[11px] font-medium bg-muted/50 border border-border rounded-xl text-foreground hover:border-primary/40 transition-all w-full min-w-0 sm:min-w-[130px] shadow-2xs"
              >
                <span className="truncate">
                  {statusFilter === "All Statuses" ? "All Statuses" : statusFilter === "Pending Only" ? "⏳ Pending" : "✅ Dispatched"}
                </span>
                <ChevronDown
                  size={12}
                  className={cn(
                    "shrink-0 transition-transform text-muted-foreground",
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
                    className="absolute top-full right-0 sm:right-auto mt-1.5 bg-card border border-border rounded-xl shadow-xl z-30 py-1 min-w-[170px]"
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
                          "w-full text-left px-3 py-2 text-xs transition-colors truncate",
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
          </div>

          {isFiltered && (
            <span className="text-[11px] text-muted-foreground w-full sm:w-auto text-center">
              {filteredVehicles.length} / {receivedVehicles.length} shown
            </span>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 p-3 sm:p-4 md:p-6 bg-muted/10 space-y-4 pb-28 md:pb-6">
        {/* Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
          <KPICard
            title="Total Received"
            value={stats.total}
            description={isFiltered ? `Matching filter (${stats.total} of ${receivedVehicles.length})` : "Inward vehicles in stock"}
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
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3 sm:p-4 rounded-xl border border-border shadow-xs">
          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 shrink-0">
              <FileSpreadsheet size={18} />
            </div>
            <div className="min-w-0">
              <h3 className="text-xs sm:text-sm font-bold text-foreground truncate">Received Vehicles Master List (Excel View)</h3>
              <p className="text-[11px] sm:text-xs text-muted-foreground truncate">{filteredVehicles.length} vehicles matching filter</p>
            </div>
          </div>

          {/* Export Buttons */}
          <div className="grid grid-cols-3 sm:flex items-center gap-1.5 sm:gap-2 w-full sm:w-auto">
            <button
              type="button"
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
              className="flex items-center justify-center gap-1 px-2.5 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs transition-all cursor-pointer whitespace-nowrap"
            >
              <Download size={13} className="shrink-0" />
              <span className="hidden sm:inline">Export </span>Excel
            </button>

            <button
              type="button"
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
              className="flex items-center justify-center gap-1 px-2.5 py-2 text-xs font-semibold rounded-lg bg-rose-600 text-white hover:bg-rose-700 shadow-xs transition-all cursor-pointer whitespace-nowrap"
            >
              <FileText size={13} className="shrink-0" />
              <span className="hidden sm:inline">Export </span>PDF
            </button>

            <button
              type="button"
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
              className="flex items-center justify-center gap-1 px-2.5 py-2 text-xs font-semibold rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 transition-all cursor-pointer whitespace-nowrap"
            >
              <Download size={13} className="shrink-0" />
              CSV
            </button>
          </div>
        </div>

        {/* Mobile Cards View */}
        <div className="md:hidden space-y-3">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-40 rounded-xl bg-card border border-border animate-pulse p-4" />
              ))}
            </div>
          ) : filteredVehicles.length === 0 ? (
            <div className="text-center py-12 bg-card rounded-xl border border-border p-6">
              <Inbox size={32} className="mx-auto text-muted-foreground/40 mb-2" />
              <p className="text-sm font-semibold text-foreground">No received vehicles found</p>
              <p className="text-xs text-muted-foreground mt-1">Try adjusting your filters or date range.</p>
            </div>
          ) : (
            filteredVehicles.map((v: Vehicle) => {
              const vDateRaw = (v as any).receivedAt || (v as any).arrivalTime || (v as any).submittedAt || (v as any).createdAt;
              const vDateFormatted = formatReceivedDate(vDateRaw);
              const pNorm = (v.priority || "Normal").toLowerCase();

              return (
                <div key={v.id} className="bg-card border border-border rounded-xl p-3.5 space-y-3 shadow-2xs">
                  {/* Top Header */}
                  <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2.5">
                    <div className="flex items-center gap-2 min-w-0">
                      <button
                        type="button"
                        onClick={() => router.push(`/vehicle/${v.id}`)}
                        className="font-mono text-xs font-bold text-primary hover:underline truncate"
                      >
                        {v.trackingId}
                      </button>
                      <span className="font-semibold px-2 py-0.5 rounded-full text-[10px] bg-primary/10 text-primary border border-primary/20 capitalize shrink-0">
                        {v.currentStage}
                      </span>
                    </div>
                    <span
                      className={cn(
                        "font-bold px-2 py-0.5 rounded-full text-[10px] shrink-0",
                        pNorm === "urgent"
                          ? "bg-rose-500/15 text-rose-600 border border-rose-500/30"
                          : pNorm === "high"
                          ? "bg-amber-500/15 text-amber-600 border border-amber-500/30"
                          : "bg-muted text-muted-foreground"
                      )}
                    >
                      {v.priority || "Normal"}
                    </span>
                  </div>

                  {/* Body Info Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block">OEM & Model</span>
                      <span className="font-semibold text-foreground truncate block">{v.oemName}</span>
                      <span className="text-muted-foreground text-[11px] truncate block">{v.vehicleModel || (v as any).modelName || "-"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block">Chassis / VIN</span>
                      <span className="font-mono text-muted-foreground font-medium truncate block">{v.chassisNumber || v.vin || "-"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block">Dealer</span>
                      <span className="text-foreground truncate block">{v.dealerName || "-"}</span>
                    </div>
                    <div>
                      <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block">Received Date</span>
                      <span className="text-muted-foreground truncate block">{vDateFormatted}</span>
                    </div>
                  </div>

                  {/* Category */}
                  <div className="flex items-center justify-between pt-1 border-t border-border/40 text-[11px] text-muted-foreground">
                    <span className="truncate">{v.productCategory}</span>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-end gap-2 pt-1 border-t border-border/60">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => router.push(`/vehicle/${v.id}`)}
                      className="h-8 px-2.5 text-xs font-semibold cursor-pointer"
                    >
                      View
                    </Button>
                    {canEdit && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setPendingDispatchVehicle(v)}
                        className="h-8 px-2.5 text-xs font-semibold gap-1 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-emerald-500/30 cursor-pointer"
                      >
                        <Truck size={12} /> Dispatch
                      </Button>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="h-8 w-8 rounded-lg border border-border flex items-center justify-center text-muted-foreground hover:bg-muted cursor-pointer"
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
                </div>
              );
            })
          )}
        </div>

        {/* Desktop Main Table View */}
        <div className="hidden md:block bg-card border border-border rounded-xl shadow-xs overflow-hidden">
          <div className="overflow-x-auto touch-pan-x [webkit-overflow-scrolling:touch]">
            <table className="w-full min-w-[850px] text-xs text-left border-collapse">
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
