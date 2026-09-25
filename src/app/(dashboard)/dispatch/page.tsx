"use client";

import React, { useState, useMemo } from "react";
import type { ColumnDef } from "@/components/ui/DataTable";
import { DataTable } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useDispatchRecords, useVehicles, useUpdateDispatchRecord, useDeleteDispatchRecord, useUpdateVehicleStage } from "@/hooks/useQueries";
import { DispatchVehicleDialog, type DispatchFormValues } from "@/components/vehicles/DispatchVehicleDialog";
import { Pagination } from "@/components/ui/Pagination";
import type { DispatchRecord, Vehicle } from "@/types";
import { useAuthStore } from "@/store/authStore";
import { GlobalDateFilterBar } from "@/components/shared/GlobalDateFilterBar";
import { exportToCSV, exportToExcel } from "../reports/components/exportUtils";
import { 
  Calendar as CalendarIcon, 
  ExternalLink, 
  MapPin, 
  Truck, 
  Edit, 
  History, 
  ChevronDown, 
  CheckCircle2,
  Clock,
  Trash2,
  FileSpreadsheet,
  Download,
  FileText
} from "lucide-react";
import { toast } from "sonner";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EditRecordDialog } from "@/components/shared/EditRecordDialog";
import { AuditHistoryDrawer } from "@/components/shared/AuditHistoryDrawer";

const STATUS_CONFIG: Record<
  string,
  { label: string; cls: string }
> = {
  pending: { label: "Pending", cls: "bg-muted text-muted-foreground border-muted" },
  scheduled: { label: "Scheduled", cls: "bg-primary/15 text-primary border-primary/30" },
  in_transit: { label: "In Transit", cls: "bg-warning/15 text-warning border-warning/30" },
  dispatched: { label: "Dispatched", cls: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
  delivered: { label: "Delivered", cls: "bg-success/15 text-success border-success/30" },
};

const STATUSES = ["All", "pending", "scheduled", "in_transit", "dispatched", "delivered"];
const CARRIERS = ["All", "BlueDart", "DHL", "FedEx", "DTDC", "Gati", "Self Transport"];

function DispatchStatusBadge({ status }: { status: string }) {
  const normStatus = (status || "pending").toLowerCase();
  const cfg = STATUS_CONFIG[normStatus] || STATUS_CONFIG.pending;
  return (
    <span className={cn("text-[11px] font-semibold px-2 py-0.5 rounded-full border", cfg.cls)}>
      {cfg.label}
    </span>
  );
}

function DispatchExpand({ record, vehicle }: { record: DispatchRecord; vehicle?: Vehicle }) {
  const chassis = (record as any).chassisNumber || vehicle?.chassisNumber || vehicle?.vin || "N/A";
  const vehicleNum = (record as any).vehicleNumber || vehicle?.vehicleNumber || "N/A";
  const oem = (record as any).oemName || vehicle?.oemName || "OEM";
  const driver = (record as any).driverName || vehicle?.driverName || record.driverName || "Not assigned";
  const driverPhone = (record as any).driverPhone || vehicle?.driverMobileNumber || record.driverPhone;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 p-4 bg-muted/10 rounded-xl border border-border/50">
      <div>
        <p className="text-xs font-semibold text-foreground mb-1">
          Chassis & Vehicle
        </p>
        <p className="text-xs text-muted-foreground font-mono">
          Chassis: <span className="font-semibold text-foreground">{chassis}</span>
        </p>
        <p className="text-xs text-muted-foreground font-mono">
          Vehicle #: {vehicleNum}
        </p>
      </div>
      <div>
        <p className="text-xs font-semibold text-foreground mb-1">
          Destination & OEM
        </p>
        <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
          <MapPin size={11} className="mt-0.5 flex-shrink-0" />
          <span>{record.destination} ({oem})</span>
        </div>
      </div>
      <div>
        <p className="text-xs font-semibold text-foreground mb-1">Logistics & Driver</p>
        <p className="text-xs text-muted-foreground">
          Driver: {driver}
        </p>
        {driverPhone && (
          <p className="text-xs text-muted-foreground">
            Phone: {driverPhone}
          </p>
        )}
        {vehicle?.truckNumber && (
          <p className="text-xs text-muted-foreground">
            Truck: {vehicle.truckNumber}
          </p>
        )}
      </div>
      <div>
        <p className="text-xs font-semibold text-foreground mb-1">Tracking Number</p>
        <a
          href={`https://track.dtdc.com/trace-tracking.do?trackingNo=${record.trackingNumber}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-xs text-primary hover:underline font-medium font-mono"
        >
          <ExternalLink size={11} />
          {record.trackingNumber}
        </a>
      </div>
    </div>
  );
}

export default function DispatchPage() {
  const [activeTab, setActiveTab] = useState<"standard" | "excel">("standard");
  const [dispatchScope, setDispatchScope] = useState<"production_dispatches" | "all" | "pending">("production_dispatches");
  // Table pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState("All");
  const [carrierFilter, setCarrierFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");

  // Date filter state
  const [dateFilter, setDateFilter] = useState("All");
  const [customMonth, setCustomMonth] = useState("");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  const dateQueryParams = useMemo(() => {
    const now = new Date();
    if (dateFilter === "Today") {
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const dd = String(now.getDate()).padStart(2, "0");
      const todayStr = `${yyyy}-${mm}-${dd}`;
      return { start_date: todayStr, end_date: todayStr };
    }
    if (dateFilter === "This Month") {
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      return { month: `${yyyy}-${mm}` };
    }
    if (dateFilter === "Last Month") {
      const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const yyyy = lm.getFullYear();
      const mm = String(lm.getMonth() + 1).padStart(2, "0");
      return { month: `${yyyy}-${mm}` };
    }
    if (dateFilter === "This Quarter") {
      const qMonth = Math.floor(now.getMonth() / 3) * 3;
      const qStart = new Date(now.getFullYear(), qMonth, 1);
      const yyyy = qStart.getFullYear();
      const mm = String(qStart.getMonth() + 1).padStart(2, "0");
      return { start_date: `${yyyy}-${mm}-01` };
    }
    if (dateFilter === "This Year") {
      return { start_date: `${now.getFullYear()}-01-01` };
    }
    if (dateFilter === "Month" && customMonth) {
      return { month: customMonth };
    }
    if (dateFilter === "Custom") {
      return { start_date: customStartDate || undefined, end_date: customEndDate || undefined };
    }
    return {};
  }, [dateFilter, customMonth, customStartDate, customEndDate]);

  // Fetch paginated dispatch records for table view
  const { data: dispatchData, isLoading: isLoadingDispatch } = useDispatchRecords({
    page,
    pageSize,
    search: searchQuery,
    ...dateQueryParams,
  });

  const dispatchRecords = dispatchData?.items ?? [];
  const totalDispatch = dispatchData?.total ?? 0;
  const totalPages = dispatchData?.total_pages ?? 1;

  const { data: vehiclesData } = useVehicles({ pageSize: 1000 });
  const vehiclesList: Vehicle[] = Array.isArray(vehiclesData) ? vehiclesData : (vehiclesData?.items ?? []);
  const updateDispatchMutation = useUpdateDispatchRecord();
  const deleteDispatchMutation = useDeleteDispatchRecord();
  const updateStageMutation = useUpdateVehicleStage();

  const [editRecord, setEditRecord] = useState<DispatchRecord | null>(null);
  const [historyRecord, setHistoryRecord] = useState<DispatchRecord | null>(null);
  const [pendingDispatchVehicle, setPendingDispatchVehicle] = useState<Vehicle | null>(null);

  const userRole = (useAuthStore((state: any) => state.role) || "operator").toLowerCase();
  const canEdit = ["admin", "owner", "manager", "supervisor", "dispatcher", "dispatch"].includes(userRole);

  const handleFinalDispatchSubmit = (values: DispatchFormValues) => {
    if (!pendingDispatchVehicle) return;
    updateStageMutation.mutate(
      {
        id: pendingDispatchVehicle.id,
        stage: "dispatch",
        progress: 100,
      },
      {
        onSuccess: () => {
          toast.success(`Vehicle ${pendingDispatchVehicle.chassisNumber || pendingDispatchVehicle.vehicleNumber || pendingDispatchVehicle.id} dispatched successfully!`);
          setPendingDispatchVehicle(null);
        },
        onError: (err: any) => toast.error(err.response?.data?.detail || "Failed to dispatch vehicle"),
      }
    );
  };

  // Helper map for vehicles
  const vehicleMap = useMemo(() => {
    return vehiclesList.reduce((acc: Record<string, Vehicle>, v: Vehicle) => {
      acc[String(v.id)] = v;
      return acc;
    }, {});
  }, [vehiclesList]);

  // Combined Production Board Dispatches & Dispatch Records List
  const allDispatchedItems = useMemo(() => {
    const recordsMap: Record<string, DispatchRecord> = {};
    dispatchRecords.forEach((d: any) => {
      recordsMap[String(d.vehicleId)] = d;
    });

    const itemsList: any[] = [];
    const addedVehicleIds = new Set<string>();

    // 1. Include all vehicles from Production Board whose stage is dispatch / dispatched / rtd / delivered
    vehiclesList.forEach((v: Vehicle) => {
      const vStage = (v.currentStage || (v as any).current_stage || "").toLowerCase().trim();
      const isDispatchedStage =
        vStage === "dispatch" ||
        vStage === "dispatched" ||
        vStage === "delivered" ||
        vStage === "rtd" ||
        vStage === "ready_to_dispatch" ||
        vStage === "readytodispatch" ||
        Boolean(v.truckNumber || v.driverName || v.dispatchDateTime);

      if (isDispatchedStage) {
        addedVehicleIds.add(String(v.id));
        const existingRecord = recordsMap[String(v.id)];
        if (existingRecord) {
          itemsList.push(existingRecord);
        } else {
          itemsList.push({
            id: `v_${v.id}`,
            vehicleId: v.id,
            trackingNumber: v.trackingId || `FF-${v.id}`,
            trackingId: v.trackingId,
            chassisNumber: v.chassisNumber || v.vin,
            vehicleNumber: v.vehicleNumber,
            oemName: v.oemName,
            modelName: v.vehicleModel || (v as any).modelName,
            carrier: v.transportCompany || "Self Transport",
            truckNumber: v.truckNumber,
            driverName: v.driverName,
            driverPhone: v.driverMobileNumber,
            dispatchChallanNumber: v.dispatchChallanNumber,
            invoiceNumber: v.invoiceNumber,
            lrNumber: v.lrNumber,
            destination: v.dealerName || v.oemName || "Factory Outbound",
            scheduledDate: v.dispatchDateTime || (v as any).receivedAt || new Date().toISOString(),
            status: vStage === "delivered" ? "delivered" : "dispatched",
            documentsUrl: v.documentsUrl,
          });
        }
      }
    });

    // 2. Include explicit dispatch records with active statuses
    dispatchRecords.forEach((d: any) => {
      if (!addedVehicleIds.has(String(d.vehicleId))) {
        const normStatus = (d.status || "").toLowerCase();
        if (normStatus === "dispatched" || normStatus === "delivered" || normStatus === "in_transit" || normStatus === "scheduled") {
          itemsList.push(d);
          addedVehicleIds.add(String(d.vehicleId));
        }
      }
    });

    // If dispatchScope is "all" or "pending", also include remaining pending dispatchRecords
    if (dispatchScope !== "production_dispatches") {
      dispatchRecords.forEach((d: any) => {
        if (!addedVehicleIds.has(String(d.vehicleId))) {
          itemsList.push(d);
        }
      });
    }

    return itemsList;
  }, [vehiclesList, dispatchRecords, dispatchScope]);

  // Filtered dispatches for status and carrier
  const filteredRecords = useMemo(() => {
    return allDispatchedItems.filter((d: any) => {
      const v = vehicleMap[String(d.vehicleId)];
      const normStatus = (d.status || "dispatched").toLowerCase();

      if (statusFilter !== "All" && normStatus !== statusFilter.toLowerCase()) {
        return false;
      }

      if (carrierFilter !== "All") {
        const carrierName = d.carrier || v?.transportCompany || v?.driverName || "Self Transport";
        if (carrierName.toLowerCase() !== carrierFilter.toLowerCase()) return false;
      }

      return true;
    });
  }, [allDispatchedItems, statusFilter, carrierFilter, vehicleMap]);

  // Overall Stats calculation
  const stats = useMemo(() => {
    const total = filteredRecords.length;
    let scheduled = 0;
    let inTransit = 0;
    let delivered = 0;
    let pending = 0;
    const oemCounts: Record<string, number> = {};

    filteredRecords.forEach((d: any) => {
      const st = (d.status || "pending").toLowerCase();
      if (st === "dispatched" || st === "delivered") delivered++;
      else if (st === "in_transit" || st === "intransit") inTransit++;
      else if (st === "scheduled") scheduled++;
      else pending++;

      const v = vehicleMap[String(d.vehicleId)];
      const oem = d.oemName || (d as any).oem_name || v?.oemName || "OEM";
      oemCounts[oem] = (oemCounts[oem] || 0) + 1;
    });

    return { total, scheduled, pending, inTransit, delivered, oemCounts };
  }, [filteredRecords, vehicleMap]);

  // Table view columns
  const columns: ColumnDef<DispatchRecord>[] = useMemo(
    () => [
      {
        id: "chassisNo",
        header: "Chassis / VIN",
        accessor: (d: DispatchRecord) => {
          const v = vehicleMap[String(d.vehicleId)];
          const chassis = d.chassisNumber || (d as any).chassis_number || v?.chassisNumber || v?.vin || (d.vehicleId ? `CH-${d.vehicleId}` : "N/A");
          const vehicleNum = d.vehicleNumber || (d as any).vehicle_number || v?.vehicleNumber;
          return (
            <div className="flex flex-col">
              <span className="font-bold text-foreground font-mono text-xs">
                {chassis}
              </span>
              {vehicleNum && vehicleNum !== chassis && (
                <span className="text-[10px] text-muted-foreground font-mono">
                  {vehicleNum}
                </span>
              )}
            </div>
          );
        },
        sortable: true,
      },
      {
        id: "oem",
        header: "OEM Name",
        accessor: (d: DispatchRecord) => {
          const v = vehicleMap[String(d.vehicleId)];
          const oem = d.oemName || (d as any).oem_name || v?.oemName || "-";
          return (
            <span className="text-foreground font-medium text-xs">
              {oem}
            </span>
          );
        },
        sortable: true,
      },
      {
        id: "challanInvoice",
        header: "Challan / Invoice",
        accessor: (d: DispatchRecord) => {
          const v = vehicleMap[String(d.vehicleId)];
          const challan = d.dispatchChallanNumber || v?.dispatchChallanNumber;
          const invoice = d.invoiceNumber || v?.invoiceNumber;
          if (!challan && !invoice) return <span className="text-muted-foreground text-xs">-</span>;
          return (
            <div className="flex flex-col text-xs font-mono">
              {challan && <span className="text-foreground font-medium">Challan: {challan}</span>}
              {invoice && <span className="text-muted-foreground text-[10px]">Inv: {invoice}</span>}
            </div>
          );
        },
        sortable: true,
      },
      {
        id: "trackingId",
        header: "LR / Tracking ID",
        accessor: (d: DispatchRecord) => {
          const v = vehicleMap[String(d.vehicleId)];
          const tracking = d.trackingNumber || d.trackingId || v?.trackingId || (d.vehicleId ? `TRK-${d.vehicleId}` : "-");
          const lr = d.lrNumber || v?.lrNumber;
          return (
            <div className="flex flex-col">
              <span className="font-mono text-primary font-semibold text-[11px]">
                {tracking}
              </span>
              {lr && <span className="text-[10px] text-muted-foreground font-mono">LR: {lr}</span>}
            </div>
          );
        },
        sortable: true,
      },
      {
        id: "carrierTruck",
        header: "Carrier / Truck",
        accessor: (d: DispatchRecord) => {
          const v = vehicleMap[String(d.vehicleId)];
          const carrierName = d.carrier && d.carrier !== "Pending Assignment" ? d.carrier : (v?.transportCompany || v?.driverName || "Self Transport");
          const truckNo = d.truckNumber || v?.truckNumber;
          return (
            <div className="flex flex-col text-xs">
              <span className="flex items-center gap-1.5 text-foreground font-medium">
                <Truck size={12} className="text-muted-foreground shrink-0" />
                {carrierName}
              </span>
              {truckNo && <span className="text-[10px] text-muted-foreground font-mono pl-4">Truck: {truckNo}</span>}
            </div>
          );
        },
        sortable: true,
      },
      {
        id: "driver",
        header: "Driver Details",
        accessor: (d: DispatchRecord) => {
          const v = vehicleMap[String(d.vehicleId)];
          const driver = d.driverName || (d as any).driver_name || v?.driverName;
          const phone = d.driverPhone || (d as any).driver_phone || v?.driverMobileNumber;
          if (!driver) return <span className="text-muted-foreground text-xs">-</span>;
          return (
            <div className="flex flex-col text-xs">
              <span className="font-medium text-foreground">{driver}</span>
              {phone && <span className="text-[10px] text-muted-foreground font-mono">{phone}</span>}
            </div>
          );
        },
        sortable: true,
      },
      {
        id: "dispatchDate",
        header: "Dispatch Date",
        accessor: (d: DispatchRecord) => {
          const dateStr = d.scheduledDate || d.dispatchDate;
          return (
            <span className="tabular-nums text-muted-foreground text-xs font-mono font-medium">
              {dateStr ? new Date(dateStr).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : "-"}
            </span>
          );
        },
        sortable: true,
      },
      {
        id: "destination",
        header: "Destination",
        accessor: (d: DispatchRecord) => (
          <span className="text-xs text-foreground font-medium">
            {d.destination || "-"}
          </span>
        ),
        sortable: true,
      },
      {
        id: "status",
        header: "Status",
        accessor: (d: DispatchRecord) => <DispatchStatusBadge status={d.status} />,
      },
      {
        id: "actions",
        header: "",
        accessor: (d: DispatchRecord) => {
          if (!canEdit) return null;
          return (
            <div onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline" className="h-7 w-7 p-0"><ChevronDown size={14} /></Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => setTimeout(() => setEditRecord(d), 0)}>
                    <Edit className="mr-2 h-4 w-4 text-primary" /> Edit Details
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTimeout(() => setHistoryRecord(d), 0)}>
                    <History className="mr-2 h-4 w-4 text-muted-foreground" /> Audit History
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    className="text-destructive focus:text-destructive cursor-pointer"
                    onClick={() => {
                      if (window.confirm(`Are you sure you want to delete dispatch record #${d.id}?`)) {
                        deleteDispatchMutation.mutate(d.id, {
                          onSuccess: () => toast.success(`Dispatch record #${d.id} deleted successfully`),
                          onError: (err: any) => toast.error(err.response?.data?.detail || "Failed to delete dispatch record"),
                        });
                      }
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4 text-destructive" /> Delete Record
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      }
    ],
    [vehicleMap, canEdit, deleteDispatchMutation]
  );

  return (
    <div className="p-4 md:p-6 space-y-6" data-ocid="dispatch.page">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border border-border p-4 rounded-xl shadow-sm">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground flex items-center gap-2">
            <Truck className="text-primary" size={24} />
            Dispatch Module
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Logistics chassis dispatch records & date filtering
          </p>
        </div>

        {/* View Mode Switcher */}
        <div className="flex items-center gap-1.5 bg-muted/50 p-1 rounded-lg border border-border/60">
          <button
            type="button"
            onClick={() => setActiveTab("standard")}
            className={cn(
              "px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap cursor-pointer",
              activeTab === "standard" ? "bg-card text-foreground shadow-sm font-bold" : "text-muted-foreground hover:text-foreground"
            )}
          >
            Standard View
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("excel")}
            className={cn(
              "px-3 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer",
              activeTab === "excel" ? "bg-card text-foreground shadow-sm font-bold" : "text-muted-foreground hover:text-foreground"
            )}
          >
            <FileSpreadsheet size={14} className="text-emerald-600" />
            Excel / Table View
          </button>
        </div>
      </div>

      {/* Global Date Filter Bar */}
      <GlobalDateFilterBar
        dateFilter={dateFilter}
        setDateFilter={(v) => { setDateFilter(v); setPage(1); }}
        customMonth={customMonth}
        setCustomMonth={(v) => { setCustomMonth(v); setPage(1); }}
        customStartDate={customStartDate}
        setCustomStartDate={(v) => { setCustomStartDate(v); setPage(1); }}
        customEndDate={customEndDate}
        setCustomEndDate={(v) => { setCustomEndDate(v); setPage(1); }}
      />

      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3.5 shadow-sm">
          <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
            <CalendarIcon size={22} />
          </div>
          <div>
            <p className="text-2xl font-bold font-display text-foreground">
              {totalDispatch}
            </p>
            <p className="text-xs font-semibold text-muted-foreground">
              Total Dispatches
            </p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3.5 shadow-sm">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <p className="text-2xl font-bold font-display text-foreground">
              {stats.delivered + stats.inTransit}
            </p>
            <p className="text-xs font-semibold text-muted-foreground">
              Dispatched / Delivered
            </p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3.5 shadow-sm">
          <div className="w-11 h-11 rounded-xl bg-warning/10 text-warning flex items-center justify-center flex-shrink-0">
            <Clock size={22} />
          </div>
          <div>
            <p className="text-2xl font-bold font-display text-foreground">
              {stats.scheduled + stats.pending}
            </p>
            <p className="text-xs font-semibold text-muted-foreground">
              Scheduled / Pending
            </p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 flex flex-col justify-center shadow-sm">
          <p className="text-xs font-bold text-foreground mb-1">OEM Dispatches Summary</p>
          <div className="flex items-center gap-2 flex-wrap">
            {Object.keys(stats.oemCounts).length === 0 ? (
              <span className="text-xs text-muted-foreground">No dispatches</span>
            ) : (
              Object.entries(stats.oemCounts).map(([oem, cnt]) => (
                <span key={oem} className="text-[11px] font-semibold bg-muted px-2 py-0.5 rounded-md text-foreground">
                  {oem}: <span className="text-primary font-bold">{cnt}</span>
                </span>
              ))
            )}
          </div>
        </div>
      </div>

      {/* TABLE VIEW SWITCHER */}
      {activeTab === "excel" ? (
        <div className="space-y-4 animate-in fade-in duration-300">
          {/* Table Action Header Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-4 rounded-xl border border-border shadow-sm">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                <FileSpreadsheet size={20} />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground">Dispatch Master List (Excel View)</h3>
                <p className="text-xs text-muted-foreground">Real-time row and column table list ({filteredRecords.length} records matching filter)</p>
              </div>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={() => {
                  const headers = [
                    "Tracking ID",
                    "Chassis / VIN",
                    "Vehicle Number",
                    "OEM Name",
                    "Transporter / Carrier",
                    "Truck Number",
                    "Driver Name",
                    "Driver Mobile",
                    "Challan Number",
                    "Invoice Number",
                    "Destination",
                    "Dispatch Date",
                    "Status"
                  ];
                  const tableRows = filteredRecords.map((d: DispatchRecord) => {
                    const v = vehicleMap[String(d.vehicleId)];
                    const chassis = d.chassisNumber || (d as any).chassis_number || v?.chassisNumber || v?.vin || "-";
                    const vehicleNum = d.vehicleNumber || (d as any).vehicle_number || v?.vehicleNumber || "-";
                    const oem = d.oemName || (d as any).oem_name || v?.oemName || "-";
                    const carrierName = d.carrier && d.carrier !== "Pending Assignment" ? d.carrier : (v?.transportCompany || v?.driverName || "Self Transport");
                    const truckNo = d.truckNumber || v?.truckNumber || "-";
                    const driver = d.driverName || (d as any).driver_name || v?.driverName || "-";
                    const phone = d.driverPhone || (d as any).driver_phone || v?.driverMobileNumber || "-";
                    const challan = d.dispatchChallanNumber || v?.dispatchChallanNumber || "-";
                    const invoice = d.invoiceNumber || v?.invoiceNumber || "-";
                    const dateStr = d.scheduledDate || (d as any).dispatchDate;
                    return {
                      "Tracking ID": d.trackingNumber || d.trackingId || "-",
                      "Chassis / VIN": chassis,
                      "Vehicle Number": vehicleNum,
                      "OEM Name": oem,
                      "Transporter / Carrier": carrierName,
                      "Truck Number": truckNo,
                      "Driver Name": driver,
                      "Driver Mobile": phone,
                      "Challan Number": challan,
                      "Invoice Number": invoice,
                      "Destination": d.destination || "-",
                      "Dispatch Date": dateStr ? new Date(dateStr).toLocaleDateString("en-IN") : "-",
                      "Status": d.status || "pending"
                    };
                  });
                  exportToExcel("Dispatch_Master_List", headers, tableRows);
                }}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition-all cursor-pointer"
              >
                <Download size={13} /> Export Excel (.xlsx)
              </button>
              <button
                type="button"
                onClick={() => {
                  const headers = [
                    "Tracking ID",
                    "Chassis / VIN",
                    "Vehicle Number",
                    "OEM Name",
                    "Transporter / Carrier",
                    "Truck Number",
                    "Driver Name",
                    "Driver Mobile",
                    "Challan Number",
                    "Invoice Number",
                    "Destination",
                    "Dispatch Date",
                    "Status"
                  ];
                  const tableRows = filteredRecords.map((d: DispatchRecord) => {
                    const v = vehicleMap[String(d.vehicleId)];
                    const chassis = d.chassisNumber || (d as any).chassis_number || v?.chassisNumber || v?.vin || "-";
                    const vehicleNum = d.vehicleNumber || (d as any).vehicle_number || v?.vehicleNumber || "-";
                    const oem = d.oemName || (d as any).oem_name || v?.oemName || "-";
                    const carrierName = d.carrier && d.carrier !== "Pending Assignment" ? d.carrier : (v?.transportCompany || v?.driverName || "Self Transport");
                    const truckNo = d.truckNumber || v?.truckNumber || "-";
                    const driver = d.driverName || (d as any).driver_name || v?.driverName || "-";
                    const phone = d.driverPhone || (d as any).driver_phone || v?.driverMobileNumber || "-";
                    const challan = d.dispatchChallanNumber || v?.dispatchChallanNumber || "-";
                    const invoice = d.invoiceNumber || v?.invoiceNumber || "-";
                    const dateStr = d.scheduledDate || (d as any).dispatchDate;
                    return {
                      "Tracking ID": d.trackingNumber || d.trackingId || "-",
                      "Chassis / VIN": chassis,
                      "Vehicle Number": vehicleNum,
                      "OEM Name": oem,
                      "Transporter / Carrier": carrierName,
                      "Truck Number": truckNo,
                      "Driver Name": driver,
                      "Driver Mobile": phone,
                      "Challan Number": challan,
                      "Invoice Number": invoice,
                      "Destination": d.destination || "-",
                      "Dispatch Date": dateStr ? new Date(dateStr).toLocaleDateString("en-IN") : "-",
                      "Status": d.status || "pending"
                    };
                  });
                  exportToCSV("Dispatch_Master_List", headers, tableRows);
                }}
                className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 transition-all cursor-pointer"
              >
                <Download size={13} /> Export CSV
              </button>
            </div>
          </div>

          {/* Excel Grid Table */}
          <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left border-collapse">
                <thead className="bg-muted/70 text-muted-foreground uppercase text-[11px] font-bold border-b border-border whitespace-nowrap">
                  <tr>
                    <th className="px-3.5 py-3">#</th>
                    <th className="px-3.5 py-3">Tracking / LR</th>
                    <th className="px-3.5 py-3">Chassis / VIN</th>
                    <th className="px-3.5 py-3">OEM Name</th>
                    <th className="px-3.5 py-3">Model Name</th>
                    <th className="px-3.5 py-3">Transporter</th>
                    <th className="px-3.5 py-3">Truck #</th>
                    <th className="px-3.5 py-3">Driver Name</th>
                    <th className="px-3.5 py-3">Driver Mobile</th>
                    <th className="px-3.5 py-3">Challan / Inv</th>
                    <th className="px-3.5 py-3">Destination</th>
                    <th className="px-3.5 py-3">Dispatch Date</th>
                    <th className="px-3.5 py-3">Status</th>
                    <th className="px-3.5 py-3">Doc</th>
                    <th className="px-3.5 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {filteredRecords.length === 0 ? (
                    <tr>
                      <td colSpan={15} className="px-4 py-12 text-center text-muted-foreground">
                        No dispatch records found matching your criteria.
                      </td>
                    </tr>
                  ) : (
                    filteredRecords.map((d: DispatchRecord, idx: number) => {
                      const v = vehicleMap[String(d.vehicleId)];
                      const chassis = d.chassisNumber || (d as any).chassis_number || v?.chassisNumber || v?.vin || "-";
                      const oem = d.oemName || (d as any).oem_name || v?.oemName || "-";
                      const vModel = v?.vehicleModel || (v as any)?.modelName || (v as any)?.model_name || (d as any)?.modelName || "-";
                      const carrierName = d.carrier && d.carrier !== "Pending Assignment" ? d.carrier : (v?.transportCompany || v?.driverName || "Self Transport");
                      const truckNo = d.truckNumber || v?.truckNumber || "-";
                      const driver = d.driverName || (d as any).driver_name || v?.driverName || "-";
                      const phone = d.driverPhone || (d as any).driver_phone || v?.driverMobileNumber || "-";
                      const challan = d.dispatchChallanNumber || v?.dispatchChallanNumber;
                      const invoice = d.invoiceNumber || v?.invoiceNumber;
                      const dateStr = d.scheduledDate || (d as any).dispatchDate;
                      const docUrl = (d as any).documentsUrl || v?.documentsUrl;

                      return (
                        <tr key={d.id} className="hover:bg-muted/30 transition-colors">
                          <td className="px-3.5 py-2.5 font-mono text-muted-foreground">{idx + 1}</td>
                          <td className="px-3.5 py-2.5 font-mono font-semibold text-primary">
                            {d.trackingNumber || d.trackingId || "-"}
                          </td>
                          <td className="px-3.5 py-2.5 font-mono font-medium text-foreground">
                            {chassis}
                          </td>
                          <td className="px-3.5 py-2.5 font-medium text-foreground">{oem}</td>
                          <td className="px-3.5 py-2.5 font-semibold text-foreground">{vModel}</td>
                          <td className="px-3.5 py-2.5 text-muted-foreground">{carrierName}</td>
                          <td className="px-3.5 py-2.5 font-mono text-foreground">{truckNo}</td>
                          <td className="px-3.5 py-2.5 font-medium text-foreground">{driver}</td>
                          <td className="px-3.5 py-2.5 font-mono text-muted-foreground">{phone}</td>
                          <td className="px-3.5 py-2.5 font-mono text-xs">
                            {challan && <div>C: {challan}</div>}
                            {invoice && <div className="text-[10px] text-muted-foreground">I: {invoice}</div>}
                            {!challan && !invoice && "-"}
                          </td>
                          <td className="px-3.5 py-2.5 font-medium text-foreground">{d.destination || "-"}</td>
                          <td className="px-3.5 py-2.5 font-mono text-muted-foreground text-xs whitespace-nowrap">
                            {dateStr ? new Date(dateStr).toLocaleDateString("en-IN") : "-"}
                          </td>
                          <td className="px-3.5 py-2.5">
                            <DispatchStatusBadge status={d.status} />
                          </td>
                          <td className="px-3.5 py-2.5">
                            {docUrl ? (
                              <a
                                href={docUrl.startsWith("http") || docUrl.startsWith("/") ? docUrl : "#"}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-primary hover:underline font-semibold text-[11px]"
                                title="View Document"
                              >
                                <FileText size={13} /> View
                              </a>
                            ) : (
                              <span className="text-muted-foreground text-[11px]">-</span>
                            )}
                          </td>
                          <td className="px-3.5 py-2.5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {((d.status || "").toLowerCase() === "pending" || (d.status || "").toLowerCase() === "scheduled") && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const matchingV = vehicleMap[String(d.vehicleId)];
                                    if (matchingV) {
                                      setPendingDispatchVehicle(matchingV);
                                    } else {
                                      setEditRecord(d);
                                    }
                                  }}
                                  className="px-2.5 py-1 text-[11px] font-bold rounded-md bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap"
                                >
                                  <Truck size={12} /> Dispatch
                                </button>
                              )}
                              {canEdit && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button size="sm" variant="outline" className="h-7 w-7 p-0"><ChevronDown size={14} /></Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                    <DropdownMenuItem onClick={() => setEditRecord(d)}>
                                      <Edit className="mr-2 h-4 w-4 text-primary" /> Edit Details
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => setHistoryRecord(d)}>
                                      <History className="mr-2 h-4 w-4 text-muted-foreground" /> Audit History
                                    </DropdownMenuItem>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem
                                      className="text-destructive focus:text-destructive cursor-pointer"
                                      onClick={() => {
                                        if (window.confirm(`Delete dispatch record #${d.id}?`)) {
                                          deleteDispatchMutation.mutate(d.id);
                                        }
                                      }}
                                    >
                                      <Trash2 className="mr-2 h-4 w-4 text-destructive" /> Delete Record
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              )}
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

          <Pagination
            page={page}
            pageSize={pageSize}
            total={totalDispatch}
            totalPages={totalPages}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
            isLoading={isLoadingDispatch}
          />
        </div>
      ) : (
        /* TABLE LIST VIEW */
        <div className="space-y-4">
          <DataTable
            columns={columns}
            data={filteredRecords}
            rowId={(d) => String(d.id)}
            hidePagination={true}
            bulkAction={(selectedRows: DispatchRecord[]) => (
              <Button
                size="sm"
                variant="destructive"
                className="h-8 text-xs font-semibold gap-1.5"
                onClick={() => {
                  if (window.confirm(`Are you sure you want to delete ${selectedRows.length} selected dispatch records?`)) {
                    Promise.all(selectedRows.map((r) => deleteDispatchMutation.mutateAsync(r.id)))
                      .then(() => toast.success(`${selectedRows.length} dispatch records deleted successfully`))
                      .catch((err: any) => toast.error(err.response?.data?.detail || "Failed to delete selected records"));
                  }
                }}
              >
                <Trash2 size={13} />
                Delete Selected ({selectedRows.length})
              </Button>
            )}
            searchKey={(d) => {
              const v = vehicleMap[String(d.vehicleId)];
              const chassis = d.chassisNumber || (d as any).chassis_number || v?.chassisNumber || "";
              const vehicleNum = d.vehicleNumber || (d as any).vehicle_number || v?.vehicleNumber || "";
              const oem = d.oemName || (d as any).oem_name || v?.oemName || "";
              const challan = d.dispatchChallanNumber || v?.dispatchChallanNumber || "";
              const invoice = d.invoiceNumber || v?.invoiceNumber || "";
              const driver = d.driverName || (d as any).driver_name || v?.driverName || "";
              const truck = d.truckNumber || v?.truckNumber || "";
              const lr = d.lrNumber || v?.lrNumber || "";
              return `${d.trackingNumber} ${chassis} ${vehicleNum} ${oem} ${d.carrier} ${d.destination} ${challan} ${invoice} ${driver} ${truck} ${lr}`;
            }}
            expandable={(d) => {
              const v = vehicleMap[String(d.vehicleId)];
              return <DispatchExpand record={d} vehicle={v} />;
            }}
            extraFilters={
              <>
                <select
                  value={dispatchScope}
                  onChange={(e) => {
                    setDispatchScope(e.target.value as any);
                    setPage(1);
                  }}
                  className="h-8 text-xs font-semibold bg-primary/10 text-primary border border-primary/20 rounded-lg px-2 focus:outline-none cursor-pointer"
                >
                  <option value="production_dispatches">🚚 Production Dispatches Only</option>
                  <option value="all">📋 All Records (Inc. Pending)</option>
                  <option value="pending">⏳ Pending Dispatch Only</option>
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => {
                    setStatusFilter(e.target.value);
                    setPage(1);
                  }}
                  className="h-8 text-xs font-medium bg-muted/50 border border-border rounded-lg px-2 text-foreground focus:outline-none"
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s === "All" ? "All Statuses" : s.replace("_", " ").toUpperCase()}
                    </option>
                  ))}
                </select>

                <select
                  value={carrierFilter}
                  onChange={(e) => setCarrierFilter(e.target.value)}
                  className="h-8 text-xs font-medium bg-muted/50 border border-border rounded-lg px-2 text-foreground focus:outline-none"
                >
                  {CARRIERS.map((c) => (
                    <option key={c} value={c}>
                      {c === "All" ? "All Carriers" : c}
                    </option>
                  ))}
                </select>
              </>
            }
          />

          <Pagination
            page={page}
            pageSize={pageSize}
            total={totalDispatch}
            totalPages={totalPages}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
            isLoading={isLoadingDispatch}
          />
        </div>
      )}

      {/* EDIT RECORD DIALOG */}
      <EditRecordDialog
        open={!!editRecord}
        onOpenChange={(open) => !open && setEditRecord(null)}
        title={`Edit Dispatch Record #${editRecord?.id}`}
        fields={
          editRecord
            ? [
                {
                  name: "chassisNumber",
                  label: "Chassis / VIN Number",
                  type: "text",
                  defaultValue: editRecord.chassisNumber || (editRecord as any).chassis_number || vehicleMap[String(editRecord.vehicleId)]?.chassisNumber || "",
                },
                {
                  name: "vehicleNumber",
                  label: "Vehicle Number",
                  type: "text",
                  defaultValue: editRecord.vehicleNumber || (editRecord as any).vehicle_number || vehicleMap[String(editRecord.vehicleId)]?.vehicleNumber || "",
                },
                {
                  name: "oemName",
                  label: "OEM Name",
                  type: "text",
                  defaultValue: editRecord.oemName || (editRecord as any).oem_name || vehicleMap[String(editRecord.vehicleId)]?.oemName || "",
                },
                {
                  name: "dispatchChallanNumber",
                  label: "Dispatch Challan Number",
                  type: "text",
                  defaultValue: editRecord.dispatchChallanNumber || vehicleMap[String(editRecord.vehicleId)]?.dispatchChallanNumber || "",
                },
                {
                  name: "invoiceNumber",
                  label: "Invoice Number",
                  type: "text",
                  defaultValue: editRecord.invoiceNumber || vehicleMap[String(editRecord.vehicleId)]?.invoiceNumber || "",
                },
                {
                  name: "lrNumber",
                  label: "LR Number",
                  type: "text",
                  defaultValue: editRecord.lrNumber || vehicleMap[String(editRecord.vehicleId)]?.lrNumber || "",
                },
                {
                  name: "trackingNumber",
                  label: "Tracking ID / Number",
                  type: "text",
                  defaultValue: editRecord.trackingNumber || editRecord.trackingId || vehicleMap[String(editRecord.vehicleId)]?.trackingId || "",
                },
                {
                  name: "carrier",
                  label: "Carrier / Transporter",
                  type: "text",
                  defaultValue: editRecord.carrier || "",
                },
                {
                  name: "truckNumber",
                  label: "Truck Number",
                  type: "text",
                  defaultValue: editRecord.truckNumber || vehicleMap[String(editRecord.vehicleId)]?.truckNumber || "",
                },
                {
                  name: "driverName",
                  label: "Driver Name",
                  type: "text",
                  defaultValue: editRecord.driverName || (editRecord as any).driver_name || vehicleMap[String(editRecord.vehicleId)]?.driverName || "",
                },
                {
                  name: "driverPhone",
                  label: "Driver Mobile Number",
                  type: "text",
                  defaultValue: editRecord.driverPhone || (editRecord as any).driver_phone || vehicleMap[String(editRecord.vehicleId)]?.driverMobileNumber || "",
                },
                {
                  name: "destination",
                  label: "Destination / Location",
                  type: "text",
                  defaultValue: editRecord.destination || "",
                },
                {
                  name: "scheduledDate",
                  label: "Dispatch Date & Time",
                  type: "datetime-local",
                  defaultValue: editRecord.scheduledDate || (editRecord as any).dispatchDate || (editRecord as any).dispatch_date_time
                    ? new Date(editRecord.scheduledDate || (editRecord as any).dispatchDate || (editRecord as any).dispatch_date_time).toISOString().slice(0, 16)
                    : "",
                },
                {
                  name: "status",
                  label: "Dispatch Status",
                  type: "select",
                  defaultValue: editRecord.status || "dispatched",
                  options: ["dispatched", "delivered", "in_transit", "scheduled", "pending"],
                },
              ]
            : []
        }
        onSubmit={(data) => {
          if (!editRecord) return;
          updateDispatchMutation.mutate(
            {
              id: editRecord.id,
              data: { ...data, reason: data.reason },
            },
            {
              onSuccess: () => {
                toast.success(`Dispatch record #${editRecord.id} updated successfully`);
                setEditRecord(null);
              },
              onError: (err: any) => toast.error(err.response?.data?.detail || "Failed to update dispatch record"),
            }
          );
        }}
        isSubmitting={updateDispatchMutation.isPending}
      />

      <AuditHistoryDrawer
        open={!!historyRecord}
        onOpenChange={(open) => !open && setHistoryRecord(null)}
        recordId={historyRecord?.vehicleId?.toString() || ""}
        module="dispatch_records"
        title={`Audit History: Dispatch for Vehicle #${historyRecord?.vehicleId}`}
      />

      <DispatchVehicleDialog
        open={!!pendingDispatchVehicle}
        onOpenChange={(open) => !open && setPendingDispatchVehicle(null)}
        vehicle={pendingDispatchVehicle}
        onSubmit={handleFinalDispatchSubmit}
        isSubmitting={updateStageMutation.isPending}
      />
    </div>
  );
}
