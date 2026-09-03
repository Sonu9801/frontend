"use client";

import React, { useState, useMemo } from "react";
import type { ColumnDef } from "@/components/ui/DataTable";
import { DataTable } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useDispatchRecords, useVehicles, useUpdateDispatchRecord, useDeleteDispatchRecord } from "@/hooks/useQueries";
import { Pagination } from "@/components/ui/Pagination";
import type { DispatchRecord, Vehicle } from "@/types";
import { GlobalDateFilterBar } from "@/components/shared/GlobalDateFilterBar";
import { 
  Calendar as CalendarIcon, 
  CalendarDays, 
  List, 
  ExternalLink, 
  MapPin, 
  Package, 
  Truck, 
  Edit, 
  History, 
  ChevronDown, 
  ChevronLeft, 
  ChevronRight,
  Info,
  X,
  Search,
  CheckCircle2,
  Clock,
  Trash2
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

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

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
  const [viewMode, setViewMode] = useState<"calendar" | "table">("calendar");

  // Date selection state for Calendar View
  const today = new Date();
  const [currentYear, setCurrentYear] = useState<number>(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState<number>(today.getMonth()); // 0-indexed
  const [selectedDayDispatches, setSelectedDayDispatches] = useState<{ dateStr: string; records: any[] } | null>(null);

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

  // Month query string (YYYY-MM)
  const monthQuery = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}`;

  // Fetch dispatch records for calendar (pageSize=1000 for full month view)
  const { data: monthDispatchData, isLoading: isLoadingMonthDispatch } = useDispatchRecords({
    month: monthQuery,
    pageSize: 1000,
  });

  // Fetch paginated dispatch records for table view
  const { data: dispatchData, isLoading: isLoadingDispatch } = useDispatchRecords({
    page,
    pageSize,
    search: searchQuery,
    ...dateQueryParams,
  });

  const monthRecords = monthDispatchData?.items ?? [];
  const dispatchRecords = dispatchData?.items ?? [];
  const totalDispatch = dispatchData?.total ?? 0;
  const totalPages = dispatchData?.total_pages ?? 1;

  const { data: vehiclesData, isLoading: isLoadingVehicles } = useVehicles({ pageSize: 1000 });
  const vehiclesList: Vehicle[] = Array.isArray(vehiclesData) ? vehiclesData : (vehiclesData?.items ?? []);
  const updateDispatchMutation = useUpdateDispatchRecord();
  const deleteDispatchMutation = useDeleteDispatchRecord();

  const { useAuthStore } = require("@/store/authStore");
  const userRole = useAuthStore((state: any) => state.role) || "operator";
  const canEdit = ["admin", "owner"].includes(userRole);

  const [editRecord, setEditRecord] = useState<DispatchRecord | null>(null);
  const [historyRecord, setHistoryRecord] = useState<DispatchRecord | null>(null);

  // Helper map for vehicles
  const vehicleMap = useMemo(() => {
    return vehiclesList.reduce((acc: Record<string, Vehicle>, v: Vehicle) => {
      acc[String(v.id)] = v;
      return acc;
    }, {});
  }, [vehiclesList]);

  // Combined month dispatch records with vehicle details merged
  const enrichedMonthRecords = useMemo(() => {
    return monthRecords.map((d: any) => {
      const v = vehicleMap[String(d.vehicleId)];
      return {
        ...d,
        chassisNumber: d.chassisNumber || v?.chassisNumber || v?.vin || "N/A",
        vehicleNumber: d.vehicleNumber || v?.vehicleNumber || "N/A",
        oemName: d.oemName || v?.oemName || "OEM",
        vehicleModel: d.vehicleModel || (v as any)?.modelName || v?.vehicleModel || "Standard",
        productCategory: d.productCategory || v?.productCategory || "Cargo Box",
        driverName: d.driverName || v?.driverName,
        driverPhone: d.driverPhone || v?.driverMobileNumber,
      };
    });
  }, [monthRecords, vehicleMap]);

  // Overall Stats for top cards
  const monthStats = useMemo(() => {
    const totalMonth = enrichedMonthRecords.length;
    const oemCounts: Record<string, number> = {};
    const categoryCounts: Record<string, number> = {};
    let scheduled = 0;
    let inTransit = 0;
    let delivered = 0;

    enrichedMonthRecords.forEach((d: any) => {
      const st = (d.status || "").toLowerCase();
      if (st === "scheduled" || st === "pending") scheduled++;
      else if (st === "in_transit" || st === "intransit") inTransit++;
      else delivered++;

      const oem = d.oemName || "Unknown OEM";
      oemCounts[oem] = (oemCounts[oem] || 0) + 1;

      const cat = d.productCategory || "General";
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });

    return { totalMonth, scheduled, inTransit, delivered, oemCounts, categoryCounts };
  }, [enrichedMonthRecords]);

  // Calendar Grid calculation
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay(); // 0 = Sun, 1 = Mon
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    // Map dispatches by day of month
    const dispatchesByDay: Record<number, any[]> = {};
    enrichedMonthRecords.forEach((rec: any) => {
      if (rec.scheduledDate) {
        const d = new Date(rec.scheduledDate);
        if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
          const dayNum = d.getDate();
          if (!dispatchesByDay[dayNum]) dispatchesByDay[dayNum] = [];
          dispatchesByDay[dayNum].push(rec);
        }
      }
    });

    const days = [];
    // Blank cells before day 1
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ blank: true, key: `blank-${i}` });
    }
    // Days 1 to N
    for (let day = 1; day <= daysInMonth; day++) {
      const dayDispatches = dispatchesByDay[day] || [];
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const isToday =
        today.getFullYear() === currentYear &&
        today.getMonth() === currentMonth &&
        today.getDate() === day;

      days.push({
        blank: false,
        key: `day-${day}`,
        day,
        dateStr,
        isToday,
        dispatches: dayDispatches,
      });
    }
    return days;
  }, [currentYear, currentMonth, enrichedMonthRecords, today]);

  // Navigation handlers for Calendar
  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear((y) => y - 1);
    } else {
      setCurrentMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear((y) => y + 1);
    } else {
      setCurrentMonth((m) => m + 1);
    }
  };

  const handleToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth());
  };

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
      </div>

      {/* Global Date Calendar Filter Bar */}
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

      {/* Month-Wise Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3.5 shadow-sm">
          <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
            <CalendarIcon size={22} />
          </div>
          <div>
            <p className="text-2xl font-bold font-display text-foreground">
              {monthStats.totalMonth}
            </p>
            <p className="text-xs font-semibold text-muted-foreground">
              Dispatches in {MONTH_NAMES[currentMonth]} {currentYear}
            </p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-3.5 shadow-sm">
          <div className="w-11 h-11 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center flex-shrink-0">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <p className="text-2xl font-bold font-display text-foreground">
              {monthStats.delivered + monthStats.inTransit}
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
              {monthStats.scheduled}
            </p>
            <p className="text-xs font-semibold text-muted-foreground">
              Scheduled Dispatches
            </p>
          </div>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 flex flex-col justify-center shadow-sm">
          <p className="text-xs font-bold text-foreground mb-1">OEM Dispatches (This Month)</p>
          <div className="flex items-center gap-2 flex-wrap">
            {Object.keys(monthStats.oemCounts).length === 0 ? (
              <span className="text-xs text-muted-foreground">No dispatches</span>
            ) : (
              Object.entries(monthStats.oemCounts).map(([oem, cnt]) => (
                <span key={oem} className="text-[11px] font-semibold bg-muted px-2 py-0.5 rounded-md text-foreground">
                  {oem}: <span className="text-primary font-bold">{cnt}</span>
                </span>
              ))
            )}
          </div>
        </div>
      </div>

      {/* DISPATCH TABLE LIST VIEW */}
      <div className="space-y-4">
          <DataTable
            columns={columns}
            data={dispatchRecords}
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

      {/* DAY DISPATCH DETAILS DIALOG */}
      {selectedDayDispatches && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-card border border-border rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <div>
                <h3 className="text-lg font-bold font-display text-foreground flex items-center gap-2">
                  <CalendarDays size={20} className="text-emerald-600" />
                  Dispatches on {new Date(selectedDayDispatches.dateStr).toLocaleDateString("en-IN", { day: 'numeric', month: 'long', year: 'numeric' })}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {selectedDayDispatches.records.length} vehicle(s) dispatched on this date
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedDayDispatches(null)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {selectedDayDispatches.records.map((d: any) => (
                <div
                  key={d.id}
                  className="p-4 rounded-xl border border-border bg-muted/20 space-y-2 hover:border-emerald-500/50 transition-colors"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold font-mono text-foreground flex items-center gap-2">
                        Chassis: {d.chassisNumber}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Vehicle #: {d.vehicleNumber} | OEM: <span className="font-semibold text-foreground">{d.oemName}</span>
                      </p>
                    </div>
                    <DispatchStatusBadge status={d.status} />
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-border/50 text-muted-foreground">
                    <div>
                      <span className="font-medium text-foreground">Carrier:</span> {d.carrier}
                    </div>
                    <div>
                      <span className="font-medium text-foreground">Destination:</span> {d.destination}
                    </div>
                    {d.driverName && (
                      <div>
                        <span className="font-medium text-foreground">Driver:</span> {d.driverName} ({d.driverPhone || 'N/A'})
                      </div>
                    )}
                    <div>
                      <span className="font-medium text-foreground">Tracking #:</span> {d.trackingNumber}
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 text-right">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDayDispatches(null)}
              >
                Close
              </Button>
            </div>
          </div>
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
    </div>
  );
}
