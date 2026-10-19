"use client";

import React, { useState, useMemo } from "react";
import type { ColumnDef } from "@/components/ui/DataTable";
import { DataTable } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useDispatchRecords, useVehicles, useUpdateDispatchRecord, useDeleteDispatchRecord, useUpdateVehicleStage, useUpdateVehicle } from "@/hooks/useQueries";
import { PageHeader } from "@/components/shared/PageHeader";
import { KPICard } from "@/components/ui/KPICard";
import { EmptyState } from "@/components/shared/EmptyState";
import { DispatchVehicleDialog, type DispatchFormValues } from "@/components/vehicles/DispatchVehicleDialog";
import { Pagination } from "@/components/ui/Pagination";
import type { DispatchRecord, Vehicle, Priority } from "@/types";
import { useAuthStore } from "@/store/authStore";
import { exportToCSV, exportToExcel, exportToPDF } from "../reports/components/exportUtils";
import { isDateInFilterRange } from "../reports/components/dateFilterUtils";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
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
  FileText, 
  Search, 
  Eye, 
  AlertTriangle 
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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

const DEFAULT_OEM_OPTIONS = [
  "EULER MOTORS",
  "MONTRA ELECTRIC",
  "BAJAJ AUTO",
  "PIAGGIO",
  "JUPITER ELECTRIC MOBILITY",
  "TVS MOTORS",
  "E NEXT MOBILITY",
  "TATA MOTORS",
  "MAHINDRA",
];

const DEFAULT_DEALER_OPTIONS = [
  "Tech UP",
  "Eco Edge",
  "Smart Solution",
  "Sincere Marketing",
  "Bhutani Auto Cap",
  "KK Auto mobile",
  "SHREE BALAJI MOTORS",
  "RAJAN AUTOTECH LLP",
  "ALLIED EV SOLUTIONS",
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

// Helper to parse numeric challan sequence for accurate sorting
function parseChallanNumber(d: any, v?: Vehicle): number | null {
  const rawChallan = d.dispatchChallanNumber || d.challanNumber || (d as any).challan_number || v?.dispatchChallanNumber || (v as any)?.challanNumber;
  if (!rawChallan) return null;
  const match = String(rawChallan).match(/\d+/);
  if (match) {
    const num = parseInt(match[0], 10);
    return isNaN(num) ? null : num;
  }
  return null;
}

export default function DispatchPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"standard" | "excel">("excel");
  const [showSelectVehicleModal, setShowSelectVehicleModal] = useState(false);
  const [vehicleSearchQuery, setVehicleSearchQuery] = useState("");
  const [modalStageFilter, setModalStageFilter] = useState<"all" | "received" | "rtd" | "dispatch" | "all_system">("all");
  
  // Table pagination state
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filters state (1:1 matching received vehicles page)
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All Categories");
  const [oemFilter, setOemFilter] = useState("All OEMs");
  const [dealerFilter, setDealerFilter] = useState("All Dealers");
  const [carrierFilter, setCarrierFilter] = useState("All Carriers");
  const [priorityFilter, setPriorityFilter] = useState<"all" | Priority>("all");
  const [statusFilter, setStatusFilter] = useState("All Statuses");

  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showOemDropdown, setShowOemDropdown] = useState(false);
  const [showDealerDropdown, setShowDealerDropdown] = useState(false);
  const [showCarrierDropdown, setShowCarrierDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  // Date Presets State (identical to received vehicles page)
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

  const closeAllDropdowns = () => {
    setShowCategoryDropdown(false);
    setShowOemDropdown(false);
    setShowDealerDropdown(false);
    setShowCarrierDropdown(false);
    setShowStatusDropdown(false);
  };

  // Fetch full records for client-side filtering and real-time responsiveness
  const { data: dispatchData, isLoading: isLoadingDispatch } = useDispatchRecords({
    pageSize: 1000,
  });

  const dispatchRecords = dispatchData?.items ?? [];

  const { data: vehiclesData } = useVehicles({ pageSize: 1000 });
  const vehiclesList: Vehicle[] = Array.isArray(vehiclesData) ? vehiclesData : (vehiclesData?.items ?? []);
  const updateDispatchMutation = useUpdateDispatchRecord();
  const deleteDispatchMutation = useDeleteDispatchRecord();
  const updateStageMutation = useUpdateVehicleStage();
  const updateVehicleMutation = useUpdateVehicle();

  const [editRecord, setEditRecord] = useState<DispatchRecord | null>(null);
  const [historyRecord, setHistoryRecord] = useState<DispatchRecord | null>(null);
  const [pendingDispatchVehicle, setPendingDispatchVehicle] = useState<Vehicle | null>(null);

  const userRole = (useAuthStore((state: any) => state.role) || "operator").toLowerCase();
  const canEdit = ["admin", "owner", "manager", "supervisor", "dispatcher", "dispatch"].includes(userRole);

  const handleFinalDispatchSubmit = (values: DispatchFormValues) => {
    if (!pendingDispatchVehicle) return;

    const payload: any = {
      current_stage: "dispatched",
      progress_percent: 100,
      transport_company: values.transportCompany || "Self Transport",
      truck_number: values.truckNumber || "",
      driver_name: values.driverName || "",
      driver_mobile_number: values.driverMobileNumber || "",
      dispatch_challan_number: values.dispatchChallanNumber || "",
      invoice_number: values.invoiceNumber || "",
      lr_number: values.lrNumber || "",
      dealer_name: values.destination || "",
      remarks: values.remarks || "",
      documents_url: values.documentsUrl || "",
    };

    if (values.dispatchDateTime) {
      payload.dispatch_date_time = values.dispatchDateTime;
    }

    updateVehicleMutation.mutate(
      {
        id: pendingDispatchVehicle.id,
        data: payload,
      },
      {
        onSuccess: () => {
          toast.success(
            `Vehicle ${
              pendingDispatchVehicle.chassisNumber ||
              pendingDispatchVehicle.vehicleNumber ||
              pendingDispatchVehicle.trackingId ||
              pendingDispatchVehicle.id
            } dispatched & all logistics details saved successfully!`
          );
          setPendingDispatchVehicle(null);
        },
        onError: (err: any) =>
          toast.error(err?.response?.data?.detail || "Failed to dispatch vehicle"),
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
    const itemsList: any[] = [];
    const addedVehicleIds = new Set<string>();
    const addedChassisNumbers = new Set<string>();

    const extractVehicleId = (d: any): string => {
      const vid = d.vehicleId ?? d.vehicle_id;
      if (vid !== undefined && vid !== null && String(vid).trim() !== "" && String(vid) !== "undefined") {
        return String(vid).replace("v_", "").trim();
      }
      return "";
    };

    const extractChassis = (d: any, v?: Vehicle): string => {
      const ch = d.chassisNumber || d.chassis_number || d.vin || v?.chassisNumber || v?.vin;
      if (ch && String(ch).trim() && String(ch).trim() !== "-") {
        return String(ch).trim().toLowerCase();
      }
      return "";
    };

    // 1. Include records from backend query
    dispatchRecords.forEach((d: any) => {
      const vid = extractVehicleId(d);
      const matchingV = vid ? vehicleMap[vid] : undefined;
      const chassis = extractChassis(d, matchingV);

      // Exclude vehicles that are still strictly in 'received' stage (they belong on Received vehicles page, not Dispatch)
      const vStage = ((matchingV?.currentStage || (matchingV as any)?.current_stage || d.currentStage || "") as string).toLowerCase().trim();
      if (vStage === "received") {
        return;
      }

      if (vid && addedVehicleIds.has(vid)) return;
      if (chassis && addedChassisNumbers.has(chassis)) return;

      if (vid) addedVehicleIds.add(vid);
      if (chassis) addedChassisNumbers.add(chassis);

      itemsList.push({
        ...d,
        vehicleId: vid ? (Number(vid) || vid) : d.vehicleId,
      });
    });

    // 2. Include vehicles from Production Board whose stage is dispatch / dispatched / rtd / delivered
    vehiclesList.forEach((v: Vehicle) => {
      const vid = String(v.id).trim();
      const chassis = extractChassis(v);

      if (vid && addedVehicleIds.has(vid)) return;
      if (chassis && addedChassisNumbers.has(chassis)) return;

      const vStage = (v.currentStage || (v as any).current_stage || "").toLowerCase().trim();
      const isDispatchedStage =
        vStage === "dispatch" ||
        vStage === "dispatched" ||
        vStage === "delivered" ||
        vStage === "rtd" ||
        vStage === "ready_to_dispatch" ||
        vStage === "readytodispatch";

      if (isDispatchedStage) {
        if (vid) addedVehicleIds.add(vid);
        if (chassis) addedChassisNumbers.add(chassis);

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
          scheduledDate: v.dispatchDateTime || new Date().toISOString(),
          status: vStage === "delivered" ? "delivered" : "dispatched",
          documentsUrl: v.documentsUrl,
        });
      }
    });

    return itemsList;
  }, [vehiclesList, dispatchRecords, vehicleMap]);

  // Urgent and high counts for badges
  const urgentCount = useMemo(() => {
    return allDispatchedItems.filter((d) => {
      const v = vehicleMap[String(d.vehicleId)];
      return ((v?.priority || (d as any).priority || "").toLowerCase() === "urgent");
    }).length;
  }, [allDispatchedItems, vehicleMap]);

  const highCount = useMemo(() => {
    return allDispatchedItems.filter((d) => {
      const v = vehicleMap[String(d.vehicleId)];
      return ((v?.priority || (d as any).priority || "").toLowerCase() === "high");
    }).length;
  }, [allDispatchedItems, vehicleMap]);

  // Dynamic unique OEMs list
  const uniqueOems = useMemo(() => {
    const oemsMap = new Map<string, string>();
    DEFAULT_OEM_OPTIONS.forEach((o) => {
      oemsMap.set(o.toLowerCase().trim(), o.trim());
    });
    try {
      const stored = localStorage.getItem("custom_oem_names");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          parsed.forEach((o: string) => {
            if (o && String(o).trim()) oemsMap.set(String(o).toLowerCase().trim(), String(o).trim());
          });
        }
      }
    } catch {}
    vehiclesList.forEach((v) => {
      const oem = v.oemName || (v as any).oem_name;
      if (oem && String(oem).trim()) {
        oemsMap.set(String(oem).toLowerCase().trim(), String(oem).trim());
      }
    });
    allDispatchedItems.forEach((d: any) => {
      const v = vehicleMap[String(d.vehicleId)];
      const oem = d.oemName || (d as any).oem_name || v?.oemName;
      if (oem && String(oem).trim()) {
        oemsMap.set(String(oem).toLowerCase().trim(), String(oem).trim());
      }
    });
    return ["All OEMs", ...Array.from(oemsMap.values()).sort((a, b) => a.localeCompare(b))];
  }, [vehiclesList, allDispatchedItems, vehicleMap]);

  // Dynamic unique Dealers list
  const uniqueDealers = useMemo(() => {
    const dealersMap = new Map<string, string>();
    DEFAULT_DEALER_OPTIONS.forEach((d) => {
      dealersMap.set(d.toLowerCase().trim(), d.trim());
    });
    try {
      const stored = localStorage.getItem("custom_dealer_names");
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          parsed.forEach((d: string) => {
            if (d && String(d).trim()) dealersMap.set(String(d).toLowerCase().trim(), String(d).trim());
          });
        }
      }
    } catch {}
    vehiclesList.forEach((v) => {
      const dealer = v.dealerName || (v as any).dealer_name;
      if (dealer && String(dealer).trim()) {
        const trimmed = String(dealer).trim();
        if (trimmed.toLowerCase() === "sincear marketing") {
          dealersMap.set("sincere marketing", "Sincere Marketing");
        } else if (trimmed.toLowerCase() === "euler moters") {
          dealersMap.set("euler motors", "EULER MOTORS");
        } else {
          dealersMap.set(trimmed.toLowerCase(), trimmed);
        }
      }
    });
    allDispatchedItems.forEach((d: any) => {
      const v = vehicleMap[String(d.vehicleId)];
      const dealer = d.destination || (d as any).dealerName || (d as any).destination || v?.dealerName;
      if (dealer && String(dealer).trim()) {
        const trimmed = String(dealer).trim();
        dealersMap.set(trimmed.toLowerCase(), trimmed);
      }
    });
    return ["All Dealers", ...Array.from(dealersMap.values()).sort((a, b) => a.localeCompare(b))];
  }, [vehiclesList, allDispatchedItems, vehicleMap]);

  // Dynamic carriers list
  const dynamicCarriers = useMemo(() => {
    const carriers = new Set<string>(CARRIERS.filter((c) => c !== "All"));
    allDispatchedItems.forEach((d: any) => {
      const v = vehicleMap[String(d.vehicleId)];
      const carrier = d.carrier || v?.transportCompany;
      if (carrier && String(carrier).trim() && carrier !== "Pending Assignment") {
        carriers.add(String(carrier).trim());
      }
    });
    return ["All Carriers", ...Array.from(carriers).sort()];
  }, [allDispatchedItems, vehicleMap]);

  // Filtered dispatches: Search, Category, OEM, Dealer, Carrier, Priority, Status, Date
  const filteredRecords = useMemo(() => {
    const list = allDispatchedItems.filter((d: any) => {
      const v = vehicleMap[String(d.vehicleId)];

      // 1. Search Query Filter
      const q = searchQuery.toLowerCase().trim();
      const matchSearch = !q || [
        d.trackingNumber,
        d.trackingId,
        d.chassisNumber,
        (d as any).chassis_number,
        v?.chassisNumber,
        v?.vin,
        d.vehicleNumber,
        v?.vehicleNumber,
        d.oemName,
        v?.oemName,
        v?.vehicleModel,
        (v as any)?.modelName,
        d.destination,
        v?.dealerName,
        d.carrier,
        v?.transportCompany,
        d.truckNumber,
        v?.truckNumber,
        d.driverName,
        v?.driverName,
        d.driverPhone,
        v?.driverMobileNumber,
        d.dispatchChallanNumber,
        v?.dispatchChallanNumber,
        d.invoiceNumber,
        v?.invoiceNumber,
        d.lrNumber,
        v?.lrNumber,
      ].some((val) => (val || "").toLowerCase().includes(q));

      if (!matchSearch) return false;

      // 2. Category Filter
      const vCategory = v?.productCategory || (v as any)?.product_category || (d as any)?.productCategory;
      const matchCategory = categoryFilter === "All Categories" || vCategory === categoryFilter;
      if (!matchCategory) return false;

      // 3. OEM Filter
      const currentOem = (d.oemName || (d as any).oem_name || v?.oemName || "").toLowerCase().trim();
      const targetOem = oemFilter.toLowerCase().trim();
      const matchOem =
        oemFilter === "All" ||
        oemFilter === "All OEMs" ||
        currentOem === targetOem ||
        currentOem.includes(targetOem) ||
        targetOem.includes(currentOem);
      if (!matchOem) return false;

      // 4. Dealer / Destination Filter
      const currentDealer = (d.destination || (d as any).dealerName || (d as any).destination || v?.dealerName || "").toLowerCase().trim();
      const targetDealer = dealerFilter.toLowerCase().trim();
      const matchDealer =
        dealerFilter === "All" ||
        dealerFilter === "All Dealers" ||
        currentDealer === targetDealer ||
        currentDealer.includes(targetDealer) ||
        targetDealer.includes(currentDealer);
      if (!matchDealer) return false;

      // 5. Carrier Filter
      const currentCarrier = (d.carrier && d.carrier !== "Pending Assignment" ? d.carrier : (v?.transportCompany || v?.driverName || "Self Transport")).toLowerCase().trim();
      const targetCarrier = carrierFilter.toLowerCase().trim();
      const matchCarrier =
        carrierFilter === "All" ||
        carrierFilter === "All Carriers" ||
        currentCarrier === targetCarrier ||
        currentCarrier.includes(targetCarrier) ||
        targetCarrier.includes(currentCarrier);
      if (!matchCarrier) return false;

      // 6. Priority Filter
      const priority = ((v?.priority || (d as any).priority || "Normal") as string).toLowerCase().trim();
      const matchPriority = priorityFilter === "all" || priority === priorityFilter.toLowerCase().trim();
      if (!matchPriority) return false;

      // 7. Status Filter
      const normStatus = (d.status || "dispatched").toLowerCase().trim();
      const matchStatus =
        statusFilter === "All" ||
        statusFilter === "All Statuses" ||
        normStatus === statusFilter.toLowerCase().trim();
      if (!matchStatus) return false;

      // 8. Date Range Filter
      const dDate = d.scheduledDate || (d as any).dispatchDate || (d as any).dispatch_date_time || v?.dispatchDateTime;
      const matchDate = isDateInFilterRange(dDate, dateRange);
      if (!matchDate) return false;

      return true;
    });

    // Sort descending:
    // 1. By Challan Number (numerical descending: e.g. 538, 537, 536, ...)
    // 2. By Dispatch / Scheduled Date (newest date first)
    // 3. By ID descending
    return list.sort((a: any, b: any) => {
      const vA = vehicleMap[String(a.vehicleId)];
      const vB = vehicleMap[String(b.vehicleId)];

      const challanA = parseChallanNumber(a, vA);
      const challanB = parseChallanNumber(b, vB);

      if (challanA !== null && challanB !== null && challanA !== challanB) {
        return challanB - challanA;
      }
      if (challanA !== null && challanB === null) return -1;
      if (challanA === null && challanB !== null) return 1;

      const dateA = a.scheduledDate || (a as any).dispatchDate || (a as any).dispatch_date_time || vA?.dispatchDateTime;
      const dateB = b.scheduledDate || (b as any).dispatchDate || (b as any).dispatch_date_time || vB?.dispatchDateTime;
      const timeA = dateA ? new Date(dateA).getTime() : 0;
      const timeB = dateB ? new Date(dateB).getTime() : 0;
      if (timeB !== timeA) {
        return timeB - timeA;
      }

      return (b.id || 0) - (a.id || 0);
    });
  }, [allDispatchedItems, searchQuery, categoryFilter, oemFilter, dealerFilter, carrierFilter, priorityFilter, statusFilter, dateRange, vehicleMap]);

  // Overall Stats calculation strictly based on filtered dataset (matching received page)
  const stats = useMemo(() => {
    const total = filteredRecords.length;
    let scheduled = 0;
    let inTransit = 0;
    let delivered = 0;
    let pending = 0;
    let urgent = 0;
    let high = 0;
    let todayCount = 0;
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    filteredRecords.forEach((d: any) => {
      const st = (d.status || "pending").toLowerCase();
      if (st === "dispatched" || st === "delivered") delivered++;
      else if (st === "in_transit" || st === "intransit") inTransit++;
      else if (st === "scheduled") scheduled++;
      else pending++;

      const v = vehicleMap[String(d.vehicleId)];
      const p = ((v?.priority || (d as any).priority || "Normal") as string).toLowerCase();
      if (p === "urgent") urgent++;
      if (p === "high") high++;

      const dDate = d.scheduledDate || (d as any).dispatchDate || (d as any).dispatch_date_time || v?.dispatchDateTime;
      if (dDate) {
        const dObj = new Date(dDate);
        if (!isNaN(dObj.getTime())) {
          const dStr = `${dObj.getFullYear()}-${String(dObj.getMonth() + 1).padStart(2, "0")}-${String(dObj.getDate()).padStart(2, "0")}`;
          if (dStr === todayStr) todayCount++;
        }
      }
    });

    return { total, scheduled, pending, inTransit, delivered, urgent, high, todayCount };
  }, [filteredRecords, vehicleMap]);

  const isFiltered = Boolean(
    searchQuery ||
    dateRange !== "All Time" ||
    priorityFilter !== "all" ||
    categoryFilter !== "All Categories" ||
    (oemFilter !== "All" && oemFilter !== "All OEMs") ||
    (dealerFilter !== "All" && dealerFilter !== "All Dealers") ||
    (carrierFilter !== "All" && carrierFilter !== "All Carriers") ||
    (statusFilter !== "All" && statusFilter !== "All Statuses")
  );

  const handleExportExcel = () => {
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
        "Dispatch Date": dateStr ? new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-",
        "Status": d.status || "pending"
      };
    });
    exportToExcel("Dispatch_Master_List", headers, tableRows);
  };

  const handleExportPDF = () => {
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
        "Dispatch Date": dateStr ? new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-",
        "Status": d.status || "pending"
      };
    });
    exportToPDF(
      "Dispatch_Master_List",
      "Dispatch & Logistics Master Report",
      headers,
      tableRows,
      {
        dateRange,
        oem: oemFilter,
        dealer: dealerFilter,
        carrier: carrierFilter,
        status: statusFilter,
        summary: `Total ${filteredRecords.length} dispatch records matching filter criteria.`
      }
    );
  };

  const handleExportCSV = () => {
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
        "Dispatch Date": dateStr ? new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-",
        "Status": d.status || "pending"
      };
    });
    exportToCSV("Dispatch_Master_List", headers, tableRows);
  };

  // Client-side pagination calculations for accurate page switching
  const totalFilteredRecords = filteredRecords.length;
  const calculatedTotalPages = Math.max(1, Math.ceil(totalFilteredRecords / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, page), calculatedTotalPages);

  const paginatedRecords = useMemo(() => {
    const startIndex = (safeCurrentPage - 1) * pageSize;
    return filteredRecords.slice(startIndex, startIndex + pageSize);
  }, [filteredRecords, safeCurrentPage, pageSize]);

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
        sortValue: (d: DispatchRecord) => {
          const v = vehicleMap[String(d.vehicleId)];
          return d.chassisNumber || (d as any).chassis_number || v?.chassisNumber || v?.vin || "";
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
        sortValue: (d: DispatchRecord) => {
          const v = vehicleMap[String(d.vehicleId)];
          return d.oemName || (d as any).oem_name || v?.oemName || "";
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
        sortValue: (d: DispatchRecord) => {
          const v = vehicleMap[String(d.vehicleId)];
          return parseChallanNumber(d, v) ?? 0;
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
        sortValue: (d: DispatchRecord) => {
          const v = vehicleMap[String(d.vehicleId)];
          return d.trackingNumber || d.trackingId || v?.trackingId || "";
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
        sortValue: (d: DispatchRecord) => {
          const v = vehicleMap[String(d.vehicleId)];
          return d.carrier || v?.transportCompany || "";
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
        sortValue: (d: DispatchRecord) => {
          const v = vehicleMap[String(d.vehicleId)];
          return d.driverName || (d as any).driver_name || v?.driverName || "";
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
        sortValue: (d: DispatchRecord) => {
          const v = vehicleMap[String(d.vehicleId)];
          const dateStr = d.scheduledDate || d.dispatchDate || (d as any).dispatch_date_time || v?.dispatchDateTime;
          return dateStr ? new Date(dateStr).getTime() : 0;
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
        sortValue: (d: DispatchRecord) => d.destination || "",
        sortable: true,
      },
      {
        id: "status",
        header: "Status",
        accessor: (d: DispatchRecord) => <DispatchStatusBadge status={d.status} />,
        sortValue: (d: DispatchRecord) => d.status || "",
        sortable: true,
      },
      {
        id: "actions",
        header: "",
        accessor: (d: DispatchRecord) => {
          if (!canEdit) return null;
          const v = vehicleMap[String(d.vehicleId)];
          const truckNo = d.truckNumber || v?.truckNumber;
          const driver = d.driverName || (d as any).driver_name || v?.driverName;
          const challan = d.dispatchChallanNumber || v?.dispatchChallanNumber;
          const invoice = d.invoiceNumber || v?.invoiceNumber;
          const hasMissingDetails = !truckNo || !driver || (!challan && !invoice);

          return (
            <div className="flex items-center gap-1.5 justify-end" onClick={(e) => e.stopPropagation()}>
              <Button
                size="sm"
                variant={hasMissingDetails ? "default" : "outline"}
                className={cn(
                  "h-7 px-2 text-xs flex items-center gap-1 cursor-pointer font-medium",
                  hasMissingDetails
                    ? "bg-amber-600 hover:bg-amber-700 text-white shadow-xs"
                    : "text-primary border-primary/30 hover:bg-primary/10"
                )}
                onClick={() => setTimeout(() => setEditRecord(d), 0)}
                title="Edit / Add Dispatch Details"
              >
                <Edit size={12} />
                <span>{hasMissingDetails ? "Add Details" : "Edit"}</span>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline" className="h-7 w-7 p-0 cursor-pointer"><ChevronDown size={14} /></Button>
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

  const anyDropdownOpen = showCategoryDropdown || showOemDropdown || showDealerDropdown || showCarrierDropdown || showStatusDropdown;

  return (
    <div className="flex flex-col min-h-full bg-background" data-ocid="dispatch.page">
      {/* Click-away backdrop for dropdowns */}
      {anyDropdownOpen && (
        <div
          className="fixed inset-0 z-20 bg-transparent"
          onClick={closeAllDropdowns}
        />
      )}

      {/* Top bar */}
      <div className="flex-shrink-0 p-3 sm:p-4 md:px-6 md:pt-5 md:pb-4 border-b border-border bg-card space-y-3 sm:space-y-4">
        {/* Header with PageHeader and Actions */}
        <PageHeader
          title="Dispatch Command Center"
          className="mb-0 pb-0 gap-3"
          description={
            <span className="flex items-center gap-2 flex-wrap">
              <span>{allDispatchedItems.length} total vehicles tracked through outbound staging</span>
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
                <Button
                  type="button"
                  onClick={() => setShowSelectVehicleModal(true)}
                  className="flex-1 sm:flex-initial gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs h-9 text-xs font-semibold cursor-pointer"
                >
                  <Truck size={14} /> Dispatch Vehicle
                </Button>
              )}
              <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border">
                <button
                  type="button"
                  onClick={() => setActiveTab("standard")}
                  className={cn(
                    "px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer",
                    activeTab === "standard" ? "bg-card text-foreground shadow-xs font-bold" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  Standard View
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("excel")}
                  className={cn(
                    "px-2.5 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer",
                    activeTab === "excel" ? "bg-card text-foreground shadow-xs font-bold" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <FileSpreadsheet size={13} className="text-emerald-600" />
                  Table View
                </button>
              </div>
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
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-3 h-9 text-xs bg-muted/50 border border-input rounded-xl text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all shadow-2xs"
              data-ocid="dispatch.search_input"
            />
          </div>

          {/* Date Range & Custom Month Filter Selector */}
          <div className="flex items-center gap-1.5 px-2.5 h-9 bg-muted/50 rounded-xl border border-border w-full sm:w-auto">
            <CalendarIcon size={14} className="text-muted-foreground shrink-0" />
            <select 
              value={selectedDatePreset}
              onChange={(e) => {
                handleDatePresetChange(e.target.value);
                setPage(1);
              }}
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
                onChange={(e) => {
                  handleCustomMonthChange(e.target.value);
                  setPage(1);
                }}
                className="bg-background border border-input rounded px-2 py-0.5 text-xs font-semibold text-foreground focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
              />
            )}

            {selectedDatePreset === "Custom Range" && (
              <div className="flex items-center gap-1">
                <input 
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    handleCustomDateChange(e.target.value, endDate);
                    setPage(1);
                  }}
                  className="bg-background border border-input rounded px-1.5 py-0.5 text-xs font-medium text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                />
                <span className="text-[10px] text-muted-foreground">to</span>
                <input 
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    handleCustomDateChange(startDate, e.target.value);
                    setPage(1);
                  }}
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
                onClick={() => {
                  setPriorityFilter(f as any);
                  setPage(1);
                }}
                data-ocid={`dispatch.priority.${f}.tab`}
                className={cn(
                  "px-1.5 sm:px-2.5 py-1 rounded-lg text-[11px] font-semibold capitalize transition-all duration-150 whitespace-nowrap text-center truncate cursor-pointer",
                  priorityFilter === f
                    ? f === "urgent"
                      ? "bg-destructive text-white shadow-xs"
                      : f === "high"
                        ? "bg-warning text-white shadow-xs"
                        : "bg-card text-foreground shadow-xs border border-border"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {f === "all" ? `All (${allDispatchedItems.length})` : f}
              </button>
            ))}
          </div>

          {/* Dropdown Filters */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Category Filter */}
            <div className="relative w-full sm:w-auto z-30">
              <button
                type="button"
                onClick={() => {
                  const cur = showCategoryDropdown;
                  closeAllDropdowns();
                  setShowCategoryDropdown(!cur);
                }}
                data-ocid="dispatch.category.select"
                className="flex items-center justify-between gap-1.5 px-2.5 h-9 text-[11px] font-medium bg-muted/50 border border-border rounded-xl text-foreground hover:border-primary/40 transition-all w-full min-w-0 shadow-2xs cursor-pointer"
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
                    data-ocid="dispatch.category.dropdown_menu"
                  >
                    {PRODUCT_CATEGORIES.map((cat) => (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => {
                          setCategoryFilter(cat);
                          setShowCategoryDropdown(false);
                          setPage(1);
                        }}
                        className={cn(
                          "w-full text-left px-3 py-2 text-xs transition-colors cursor-pointer",
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
            <div className="relative w-full sm:w-auto z-30">
              <button
                type="button"
                onClick={() => {
                  const cur = showOemDropdown;
                  closeAllDropdowns();
                  setShowOemDropdown(!cur);
                }}
                data-ocid="dispatch.oem.select"
                className="flex items-center justify-between gap-1.5 px-2.5 h-9 text-[11px] font-medium bg-muted/50 border border-border rounded-xl text-foreground hover:border-primary/40 transition-all w-full min-w-0 sm:min-w-[130px] shadow-2xs cursor-pointer"
              >
                <span className="truncate">{oemFilter === "All" || oemFilter === "All OEMs" ? "All OEMs" : `OEM: ${oemFilter}`}</span>
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
                    data-ocid="dispatch.oem.dropdown_menu"
                  >
                    {uniqueOems.map((oem) => (
                      <button
                        key={oem}
                        type="button"
                        onClick={() => {
                          setOemFilter(oem);
                          setShowOemDropdown(false);
                          setPage(1);
                        }}
                        className={cn(
                          "w-full text-left px-3 py-2 text-xs transition-colors truncate cursor-pointer",
                          oemFilter === oem
                            ? "bg-primary/10 text-primary font-semibold"
                            : "text-foreground hover:bg-muted",
                        )}
                      >
                        {oem === "All" ? "All OEMs" : oem}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Dealer Name Filter Dropdown */}
            <div className="relative w-full sm:w-auto z-30">
              <button
                type="button"
                onClick={() => {
                  const cur = showDealerDropdown;
                  closeAllDropdowns();
                  setShowDealerDropdown(!cur);
                }}
                data-ocid="dispatch.dealer.select"
                className="flex items-center justify-between gap-1.5 px-2.5 h-9 text-[11px] font-medium bg-muted/50 border border-border rounded-xl text-foreground hover:border-primary/40 transition-all w-full min-w-0 sm:min-w-[130px] shadow-2xs cursor-pointer"
              >
                <span className="truncate">{dealerFilter === "All" || dealerFilter === "All Dealers" ? "All Dealers" : `Dealer: ${dealerFilter}`}</span>
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
                    data-ocid="dispatch.dealer.dropdown_menu"
                  >
                    {uniqueDealers.map((dealer) => (
                      <button
                        key={dealer}
                        type="button"
                        onClick={() => {
                          setDealerFilter(dealer);
                          setShowDealerDropdown(false);
                          setPage(1);
                        }}
                        className={cn(
                          "w-full text-left px-3 py-2 text-xs transition-colors truncate cursor-pointer",
                          dealerFilter === dealer
                            ? "bg-primary/10 text-primary font-semibold"
                            : "text-foreground hover:bg-muted",
                        )}
                      >
                        {dealer === "All" ? "All Dealers" : dealer}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Carrier / Transporter Filter Dropdown */}
            <div className="relative w-full sm:w-auto z-30">
              <button
                type="button"
                onClick={() => {
                  const cur = showCarrierDropdown;
                  closeAllDropdowns();
                  setShowCarrierDropdown(!cur);
                }}
                data-ocid="dispatch.carrier.select"
                className="flex items-center justify-between gap-1.5 px-2.5 h-9 text-[11px] font-medium bg-muted/50 border border-border rounded-xl text-foreground hover:border-primary/40 transition-all w-full min-w-0 sm:min-w-[130px] shadow-2xs cursor-pointer"
              >
                <span className="truncate">{carrierFilter === "All" || carrierFilter === "All Carriers" ? "All Carriers" : `Carrier: ${carrierFilter}`}</span>
                <ChevronDown
                  size={12}
                  className={cn(
                    "shrink-0 transition-transform text-muted-foreground",
                    showCarrierDropdown && "rotate-180",
                  )}
                />
              </button>
              <AnimatePresence>
                {showCarrierDropdown && (
                  <motion.div
                    initial={{ opacity: 0, y: -6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.15 }}
                    className="absolute top-full left-0 right-0 sm:right-auto mt-1.5 bg-card border border-border rounded-xl shadow-xl z-30 py-1 min-w-[180px] max-h-60 overflow-y-auto"
                    data-ocid="dispatch.carrier.dropdown_menu"
                  >
                    {dynamicCarriers.map((carrier) => (
                      <button
                        key={carrier}
                        type="button"
                        onClick={() => {
                          setCarrierFilter(carrier);
                          setShowCarrierDropdown(false);
                          setPage(1);
                        }}
                        className={cn(
                          "w-full text-left px-3 py-2 text-xs transition-colors truncate cursor-pointer",
                          carrierFilter === carrier
                            ? "bg-primary/10 text-primary font-semibold"
                            : "text-foreground hover:bg-muted",
                        )}
                      >
                        {carrier === "All" ? "All Carriers" : carrier}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Status Filter Dropdown */}
            <div className="relative w-full sm:w-auto z-30">
              <button
                type="button"
                onClick={() => {
                  const cur = showStatusDropdown;
                  closeAllDropdowns();
                  setShowStatusDropdown(!cur);
                }}
                data-ocid="dispatch.status.select"
                className="flex items-center justify-between gap-1.5 px-2.5 h-9 text-[11px] font-medium bg-muted/50 border border-border rounded-xl text-foreground hover:border-primary/40 transition-all w-full min-w-0 sm:min-w-[130px] shadow-2xs cursor-pointer"
              >
                <span className="truncate">
                  {statusFilter === "All" || statusFilter === "All Statuses"
                    ? "All Statuses"
                    : statusFilter === "dispatched"
                      ? "🚚 Dispatched"
                      : statusFilter === "delivered"
                        ? "✅ Delivered"
                        : statusFilter === "in_transit"
                          ? "🛣️ In Transit"
                          : statusFilter === "scheduled"
                            ? "📅 Scheduled"
                            : "⏳ Pending"}
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
                    data-ocid="dispatch.status.dropdown_menu"
                  >
                    {[
                      { id: "All Statuses", label: "All Statuses" },
                      { id: "dispatched", label: "🚚 Dispatched" },
                      { id: "delivered", label: "✅ Delivered" },
                      { id: "in_transit", label: "🛣️ In Transit" },
                      { id: "scheduled", label: "📅 Scheduled" },
                      { id: "pending", label: "⏳ Pending Vehicles" },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setStatusFilter(item.id);
                          setShowStatusDropdown(false);
                          setPage(1);
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
          </div>

          {isFiltered && (
            <span className="text-[11px] text-muted-foreground w-full sm:w-auto text-center">
              {filteredRecords.length} / {allDispatchedItems.length} shown
            </span>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 p-3 sm:p-4 md:p-6 bg-muted/10 space-y-4 pb-28 md:pb-6">
        {/* Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
          <KPICard
            title="Total Dispatches"
            value={stats.total}
            description={isFiltered ? `Matching filter (${stats.total} of ${allDispatchedItems.length})` : "Outbound vehicles recorded"}
            icon={<Truck size={14} />}
            semantic="primary"
          />
          <KPICard
            title="Dispatched Today"
            value={stats.todayCount}
            description={isFiltered ? "Filtered today dispatches" : "Today's outbound departures"}
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
            description={isFiltered ? "Filtered high priority" : "Fast-track dispatches"}
            icon={<Clock size={14} />}
            semantic={stats.high > 0 ? "warning" : "neutral"}
          />
        </div>

        {/* TABLE VIEW SWITCHER */}
        {activeTab === "excel" ? (
          <div className="space-y-4 animate-in fade-in duration-300">
            {/* Table Action Header Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-card p-3 sm:p-4 rounded-xl border border-border shadow-xs">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 border border-emerald-500/20">
                  <FileSpreadsheet size={20} />
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-bold text-foreground truncate">Dispatch Vehicles Master List (Excel View)</h3>
                  <p className="text-[11px] text-muted-foreground">{filteredRecords.length} vehicles matching filter</p>
                </div>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={handleExportExcel}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition-all cursor-pointer"
                >
                  <Download size={13} /> Export Excel
                </button>
                <button
                  type="button"
                  onClick={handleExportPDF}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-rose-600 text-white hover:bg-rose-700 shadow-sm transition-all cursor-pointer"
                >
                  <FileText size={13} /> Export PDF
                </button>
                <button
                  type="button"
                  onClick={handleExportCSV}
                  className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-muted text-muted-foreground hover:bg-muted/80 transition-all cursor-pointer"
                >
                  <Download size={13} /> CSV
                </button>
              </div>
            </div>

          {/* Mobile Cards View */}
          <div className="md:hidden space-y-3">
            {paginatedRecords.length === 0 ? (
              <div className="text-center py-12 bg-card rounded-xl border border-border p-6">
                <Truck size={32} className="mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-sm font-semibold text-foreground">No dispatch records found</p>
                <p className="text-xs text-muted-foreground mt-1">Try adjusting your filters or date range.</p>
              </div>
            ) : (
              paginatedRecords.map((d: DispatchRecord) => {
                const v = vehicleMap[String(d.vehicleId)];
                const chassis = d.chassisNumber || (d as any).chassis_number || v?.chassisNumber || v?.vin || "-";
                const oem = d.oemName || (d as any).oem_name || v?.oemName || "-";
                const vModel = v?.vehicleModel || (v as any)?.modelName || (v as any)?.model_name || (d as any)?.modelName || "-";
                const category = v?.productCategory || (v as any)?.product_category || (d as any)?.productCategory || "Cargo Box";
                const carrierName = d.carrier && d.carrier !== "Pending Assignment" ? d.carrier : (v?.transportCompany || v?.driverName || "Self Transport");
                const truckNo = d.truckNumber || v?.truckNumber || "-";
                const driver = d.driverName || (d as any).driver_name || v?.driverName || "-";
                const phone = d.driverPhone || (d as any).driver_phone || v?.driverMobileNumber || "-";
                const challan = d.dispatchChallanNumber || v?.dispatchChallanNumber;
                const invoice = d.invoiceNumber || v?.invoiceNumber;
                const dateStr = d.scheduledDate || (d as any).dispatchDate;
                const docUrl = (d as any).documentsUrl || v?.documentsUrl;
                const hasMissingDetails = truckNo === "-" || driver === "-" || (!challan && !invoice);
                const pNorm = ((v?.priority || "Normal") as string).toLowerCase();
                const targetVehicleId = d.vehicleId || v?.id;

                return (
                  <div key={d.id} className="bg-card border border-border rounded-xl p-3.5 space-y-3 shadow-2xs">
                    {/* Top Header */}
                    <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-2.5">
                      <div className="flex items-center gap-2 min-w-0">
                        {targetVehicleId ? (
                          <button
                            type="button"
                            onClick={() => router.push(`/vehicle/${targetVehicleId}`)}
                            className="font-mono text-xs font-bold text-primary hover:underline truncate cursor-pointer"
                          >
                            {d.trackingNumber || d.trackingId || `ID: ${d.id}`}
                          </button>
                        ) : (
                          <span className="font-mono text-xs font-bold text-primary truncate">
                            {d.trackingNumber || d.trackingId || `ID: ${d.id}`}
                          </span>
                        )}
                        {d.destination && (
                          <span className="text-[10px] text-muted-foreground truncate">
                            📍 {d.destination}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
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
                          {v?.priority || "Normal"}
                        </span>
                        <DispatchStatusBadge status={d.status} />
                      </div>
                    </div>

                    {/* Body Info Grid (Admin Format) */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block">OEM & Model</span>
                        <span className="font-semibold text-foreground truncate block">{oem}</span>
                        <span className="text-muted-foreground text-[11px] truncate block">{vModel}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block">Chassis / VIN</span>
                        <span className="font-mono text-foreground font-semibold truncate block bg-muted/40 px-1.5 py-0.5 rounded border border-border/60">
                          {chassis}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block">Category</span>
                        <span className="text-muted-foreground text-[11px] truncate block">{category}</span>
                      </div>
                      <div>
                        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block">Driver & Mobile</span>
                        <span className="text-foreground truncate block">{driver !== "-" ? driver : "Unassigned"}</span>
                        <span className="font-mono text-muted-foreground text-[11px] truncate block">{phone}</span>
                      </div>
                      <div className="col-span-2">
                        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block">Truck & Carrier</span>
                        <span className="font-mono text-foreground font-medium truncate block">{truckNo} • {carrierName}</span>
                      </div>
                    </div>

                    {/* Challan & Date Row */}
                    <div className="flex items-center justify-between pt-2 border-t border-border/40 text-xs">
                      <div className="font-mono text-[11px] text-muted-foreground">
                        {challan ? `Challan: ${challan}` : invoice ? `Inv: ${invoice}` : "No challan / invoice"}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        {dateStr ? new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-"}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center justify-end gap-1.5 pt-1 border-t border-border/60">
                      {targetVehicleId && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => router.push(`/vehicle/${targetVehicleId}`)}
                          className="h-8 px-2.5 text-xs font-semibold gap-1 cursor-pointer"
                        >
                          <Eye size={12} /> View
                        </Button>
                      )}
                      {docUrl && (
                        <a
                          href={docUrl.startsWith("http") || docUrl.startsWith("/") ? docUrl : "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="h-8 px-2.5 text-xs font-semibold rounded-lg border border-border bg-background hover:bg-muted inline-flex items-center gap-1 text-foreground transition-colors cursor-pointer"
                        >
                          <FileText size={12} /> Doc
                        </a>
                      )}
                      {((d.status || "").toLowerCase() === "pending" || (d.status || "").toLowerCase() === "scheduled") && (
                        <Button
                          size="sm"
                          onClick={() => {
                            const matchingV = vehicleMap[String(d.vehicleId)];
                            if (matchingV) {
                              setPendingDispatchVehicle(matchingV);
                            } else {
                              setEditRecord(d);
                            }
                          }}
                          className="h-8 px-2.5 text-xs font-semibold bg-emerald-600 hover:bg-emerald-700 text-white gap-1 cursor-pointer"
                        >
                          <Truck size={12} /> Dispatch
                        </Button>
                      )}
                      {canEdit && (
                        <Button
                          size="sm"
                          variant={hasMissingDetails ? "default" : "outline"}
                          onClick={() => setEditRecord(d)}
                          className={cn(
                            "h-8 px-2.5 text-xs font-semibold gap-1 cursor-pointer",
                            hasMissingDetails
                              ? "bg-amber-600 hover:bg-amber-700 text-white"
                              : "hover:bg-primary/10 text-primary border-primary/30"
                          )}
                        >
                          <Edit size={12} />
                          <span>{hasMissingDetails ? "Add Details" : "Edit"}</span>
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
                          <DropdownMenuItem onClick={() => setHistoryRecord(d)}>
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

          {/* Excel Grid Table (Desktop) */}
          <div className="hidden md:block bg-card border border-border rounded-xl shadow-sm overflow-hidden">
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
                    <th className="px-3.5 py-3 text-right sticky right-0 bg-muted/95 backdrop-blur-xs z-10 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.06)]">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {paginatedRecords.length === 0 ? (
                    <tr>
                      <td colSpan={15} className="px-4 py-12 text-center text-muted-foreground">
                        No dispatch records found matching your criteria.
                      </td>
                    </tr>
                  ) : (
                    paginatedRecords.map((d: DispatchRecord, idx: number) => {
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
                      const hasMissingDetails = truckNo === "-" || driver === "-" || (!challan && !invoice);

                      return (
                        <tr key={d.id} className="hover:bg-muted/30 transition-colors group">
                          <td className="px-3.5 py-2.5 font-mono text-muted-foreground">
                            {(safeCurrentPage - 1) * pageSize + idx + 1}
                          </td>
                          <td className="px-3.5 py-2.5 font-mono font-semibold text-primary">
                            {d.trackingNumber || d.trackingId || "-"}
                          </td>
                          <td className="px-3.5 py-2.5 font-mono font-medium text-foreground">
                            {chassis}
                          </td>
                          <td className="px-3.5 py-2.5 font-medium text-foreground">{oem}</td>
                          <td className="px-3.5 py-2.5 font-semibold text-foreground">{vModel}</td>
                          <td className="px-3.5 py-2.5 text-muted-foreground">{carrierName}</td>
                          <td className="px-3.5 py-2.5 font-mono text-foreground">
                            {truckNo !== "-" ? (
                              truckNo
                            ) : (
                              <button
                                type="button"
                                onClick={() => setEditRecord(d)}
                                className="text-muted-foreground/60 hover:text-primary hover:underline cursor-pointer font-medium"
                                title="Click to add Truck #"
                              >
                                -
                              </button>
                            )}
                          </td>
                          <td className="px-3.5 py-2.5 font-medium text-foreground">
                            {driver !== "-" ? (
                              driver
                            ) : (
                              <button
                                type="button"
                                onClick={() => setEditRecord(d)}
                                className="text-muted-foreground/60 hover:text-primary hover:underline cursor-pointer"
                                title="Click to add Driver Name"
                              >
                                -
                              </button>
                            )}
                          </td>
                          <td className="px-3.5 py-2.5 font-mono text-muted-foreground">
                            {phone !== "-" ? (
                              phone
                            ) : (
                              <button
                                type="button"
                                onClick={() => setEditRecord(d)}
                                className="text-muted-foreground/60 hover:text-primary hover:underline cursor-pointer"
                                title="Click to add Driver Mobile"
                              >
                                -
                              </button>
                            )}
                          </td>
                          <td className="px-3.5 py-2.5 font-mono text-xs">
                            {challan && <div>C: {challan}</div>}
                            {invoice && <div className="text-[10px] text-muted-foreground">I: {invoice}</div>}
                            {!challan && !invoice && (
                              <button
                                type="button"
                                onClick={() => setEditRecord(d)}
                                className="text-muted-foreground/60 hover:text-primary hover:underline cursor-pointer"
                                title="Click to add Challan / Invoice"
                              >
                                -
                              </button>
                            )}
                          </td>
                          <td className="px-3.5 py-2.5 font-medium text-foreground">{d.destination || "-"}</td>
                          <td className="px-3.5 py-2.5 font-mono text-muted-foreground text-xs whitespace-nowrap">
                            {dateStr ? new Date(dateStr).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-"}
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
                          <td className="px-3.5 py-2.5 text-right sticky right-0 bg-card/95 backdrop-blur-xs z-10 shadow-[-4px_0_6px_-2px_rgba(0,0,0,0.06)]">
                            <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
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
                                <Button
                                  size="sm"
                                  variant={hasMissingDetails ? "default" : "outline"}
                                  onClick={() => setEditRecord(d)}
                                  className={cn(
                                    "h-7 px-2.5 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors shadow-xs",
                                    hasMissingDetails
                                      ? "bg-amber-600 hover:bg-amber-700 text-white"
                                      : "hover:bg-primary/10 text-primary border-primary/30"
                                  )}
                                  title="Edit / Add Dispatch Details"
                                >
                                  <Edit size={12} />
                                  <span>{hasMissingDetails ? "Add Details" : "Edit"}</span>
                                </Button>
                              )}
                              {canEdit && (
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button size="sm" variant="outline" className="h-7 w-7 p-0 cursor-pointer"><ChevronDown size={14} /></Button>
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
            page={safeCurrentPage}
            pageSize={pageSize}
            total={totalFilteredRecords}
            totalPages={calculatedTotalPages}
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
            data={paginatedRecords}
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
          />

          <Pagination
            page={safeCurrentPage}
            pageSize={pageSize}
            total={totalFilteredRecords}
            totalPages={calculatedTotalPages}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
            isLoading={isLoadingDispatch}
          />
        </div>
      )}
      </div>

      {/* EDIT RECORD DIALOG */}
      <EditRecordDialog
        key={editRecord?.id ?? "empty"}
        open={!!editRecord}
        onOpenChange={(open) => !open && setEditRecord(null)}
        title={
          editRecord
            ? `Dispatch Details: ${
                editRecord.chassisNumber ||
                (editRecord as any).chassis_number ||
                vehicleMap[String(editRecord.vehicleId)]?.chassisNumber ||
                editRecord.trackingNumber ||
                `#${editRecord.id}`
              }`
            : "Edit Dispatch Details"
        }
        fields={
          editRecord
            ? [
                {
                  name: "truckNumber",
                  label: "Truck # (Transport / Carrier Truck)",
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
                  name: "carrier",
                  label: "Transporter / Carrier Company",
                  type: "text",
                  defaultValue: editRecord.carrier || vehicleMap[String(editRecord.vehicleId)]?.transportCompany || "Self Transport",
                },
                {
                  name: "destination",
                  label: "Destination / Dealer",
                  type: "text",
                  defaultValue: editRecord.destination || vehicleMap[String(editRecord.vehicleId)]?.dealerName || "",
                },
                {
                  name: "lrNumber",
                  label: "LR Number",
                  type: "text",
                  defaultValue: editRecord.lrNumber || vehicleMap[String(editRecord.vehicleId)]?.lrNumber || "",
                },
                {
                  name: "trackingNumber",
                  label: "Tracking ID / LR",
                  type: "text",
                  defaultValue: editRecord.trackingNumber || editRecord.trackingId || vehicleMap[String(editRecord.vehicleId)]?.trackingId || "",
                },
                {
                  name: "chassisNumber",
                  label: "Chassis / VIN Number",
                  type: "text",
                  defaultValue: editRecord.chassisNumber || (editRecord as any).chassis_number || vehicleMap[String(editRecord.vehicleId)]?.chassisNumber || "",
                },
                {
                  name: "vehicleNumber",
                  label: "Vehicle Registration #",
                  type: "text",
                  defaultValue: editRecord.vehicleNumber || (editRecord as any).vehicle_number || vehicleMap[String(editRecord.vehicleId)]?.vehicleNumber || "",
                },
                {
                  name: "oemName",
                  label: "OEM Name",
                  type: "select",
                  defaultValue: editRecord.oemName || (editRecord as any).oem_name || vehicleMap[String(editRecord.vehicleId)]?.oemName || "",
                  options: ["EULER MOTORS", "MONTRA ELECTRIC", "BAJAJ AUTO", "PIAGGIO", "JUPITER ELECTRIC MOBILITY", "TVS MOTORS", "E NEXT MOBILITY", "TATA MOTORS", "MAHINDRA"],
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
        onSubmit={(data, reason) => {
          if (!editRecord) return;
          updateDispatchMutation.mutate(
            {
              id: editRecord.id,
              data: { ...data, reason: reason || "Dispatch details updated" },
            },
            {
              onSuccess: () => {
                toast.success(`Dispatch details for #${editRecord.chassisNumber || editRecord.trackingNumber || editRecord.id} updated successfully!`);
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
        isSubmitting={updateVehicleMutation.isPending}
      />

      {/* SELECT VEHICLE TO DISPATCH MODAL */}
      <Dialog open={showSelectVehicleModal} onOpenChange={setShowSelectVehicleModal}>
        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-6">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold">
              <Truck className="w-5 h-5 text-emerald-600" />
              Select Vehicle to Dispatch
            </DialogTitle>
          </DialogHeader>

          {/* Search Bar */}
          <div className="relative my-2">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search by Chassis / VIN (e.g. 4434), Tracking ID, OEM, Model, Dealer..."
              value={vehicleSearchQuery}
              onChange={(e) => setVehicleSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-2 text-xs bg-muted/50 border border-input rounded-lg text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
              autoFocus
            />
            {vehicleSearchQuery && (
              <button
                type="button"
                onClick={() => setVehicleSearchQuery("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs p-0.5 rounded cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Quick Stage Filter Pills */}
          {(() => {
            const availableVehicles = vehiclesList.filter((v: Vehicle) => {
              const stage = (v.currentStage || (v as any).current_stage || "").toLowerCase();
              return stage !== "delivered";
            });
            const recCount = vehiclesList.filter((v) => (v.currentStage || (v as any).current_stage || "").toLowerCase() === "received").length;
            const rtdCount = vehiclesList.filter((v) => {
              const s = (v.currentStage || (v as any).current_stage || "").toLowerCase();
              return s === "rtd" || s.includes("ready");
            }).length;
            const dispCount = vehiclesList.filter((v) => (v.currentStage || (v as any).current_stage || "").toLowerCase() === "dispatch").length;

            return (
              <div className="flex items-center gap-1.5 mb-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setModalStageFilter("all")}
                  className={cn(
                    "px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer border",
                    modalStageFilter === "all"
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
                  )}
                >
                  All Available ({availableVehicles.length})
                </button>
                <button
                  type="button"
                  onClick={() => setModalStageFilter("received")}
                  className={cn(
                    "px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer border",
                    modalStageFilter === "received"
                      ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                      : "bg-muted/50 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/10"
                  )}
                >
                  📥 Received ({recCount})
                </button>
                <button
                  type="button"
                  onClick={() => setModalStageFilter("rtd")}
                  className={cn(
                    "px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer border",
                    modalStageFilter === "rtd"
                      ? "bg-blue-600 text-white border-blue-600 shadow-xs"
                      : "bg-muted/50 text-blue-700 dark:text-blue-400 border-blue-500/30 hover:bg-blue-500/10"
                  )}
                >
                  Ready to Dispatch ({rtdCount})
                </button>
                <button
                  type="button"
                  onClick={() => setModalStageFilter("dispatch")}
                  className={cn(
                    "px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer border",
                    modalStageFilter === "dispatch"
                      ? "bg-amber-600 text-white border-amber-600 shadow-xs"
                      : "bg-muted/50 text-amber-700 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/10"
                  )}
                >
                  In Dispatch ({dispCount})
                </button>
                <button
                  type="button"
                  onClick={() => setModalStageFilter("all_system")}
                  className={cn(
                    "px-2.5 py-1 text-[11px] font-semibold rounded-lg transition-colors cursor-pointer border",
                    modalStageFilter === "all_system"
                      ? "bg-slate-700 text-white border-slate-700 shadow-xs"
                      : "bg-muted/50 text-muted-foreground border-border hover:bg-muted"
                  )}
                >
                  All in System ({vehiclesList.length})
                </button>
              </div>
            );
          })()}

          <div className="flex-1 overflow-y-auto space-y-2 max-h-[380px] pr-1">
            {(() => {
              const q = vehicleSearchQuery.toLowerCase().trim();
              const qClean = q.replace(/[\s\-_]/g, "");

              const eligible = vehiclesList
                .filter((v: Vehicle) => {
                  const stage = (v.currentStage || (v as any).current_stage || "").toLowerCase();

                  // When user is searching (e.g. chassis no. "4434"), search across ALL vehicles
                  if (q) return true;

                  if (modalStageFilter === "received") {
                    return stage === "received";
                  }
                  if (modalStageFilter === "rtd") {
                    return stage === "rtd" || stage === "ready_to_dispatch" || stage === "readytodispatch";
                  }
                  if (modalStageFilter === "dispatch") {
                    return stage === "dispatch";
                  }
                  if (modalStageFilter === "all_system") {
                    return true;
                  }
                  // Default "all": show all available vehicles (not delivered)
                  return stage !== "delivered";
                })
                .filter((v: Vehicle) => {
                  if (!q) return true;
                  const chassis = `${v.chassisNumber || (v as any).chassis_number || ""} ${v.vin || ""}`.toLowerCase();
                  const chassisClean = chassis.replace(/[\s\-_]/g, "");
                  const stage = (v.currentStage || (v as any).current_stage || "").toLowerCase();
                  const tracking = `${v.trackingId || (v as any).tracking_id || ""}`.toLowerCase();
                  const trackingClean = tracking.replace(/[\s\-_]/g, "");
                  const dealer = `${v.dealerName || (v as any).dealer_name || ""}`.toLowerCase();
                  const oem = `${v.oemName || (v as any).oem_name || ""}`.toLowerCase();
                  const model = `${v.vehicleModel || (v as any).modelName || (v as any).vehicle_model || ""}`.toLowerCase();
                  const vehNum = `${v.vehicleNumber || (v as any).vehicle_number || ""}`.toLowerCase();
                  const challan = `${v.dispatchChallanNumber || (v as any).dispatch_challan_number || ""}`.toLowerCase();
                  const truck = `${v.truckNumber || (v as any).truck_number || ""}`.toLowerCase();
                  const driver = `${v.driverName || (v as any).driver_name || ""}`.toLowerCase();

                  // Flexible stage matching for received / recived / rtd
                  const matchesStageSearch =
                    (q.includes("rec") && stage === "received") ||
                    (q.includes("rtd") && (stage === "rtd" || stage.includes("ready"))) ||
                    (q.includes("disp") && (stage === "dispatch" || stage === "dispatched"));

                  return (
                    chassis.includes(q) ||
                    chassisClean.includes(qClean) ||
                    tracking.includes(q) ||
                    trackingClean.includes(qClean) ||
                    dealer.includes(q) ||
                    oem.includes(q) ||
                    model.includes(q) ||
                    vehNum.includes(q) ||
                    challan.includes(q) ||
                    truck.includes(q) ||
                    driver.includes(q) ||
                    stage.includes(q) ||
                    matchesStageSearch
                  );
                })
                .sort((a, b) => {
                  if (q) {
                    const chassisA = `${a.chassisNumber || (a as any).chassis_number || ""}`.toLowerCase();
                    const chassisB = `${b.chassisNumber || (b as any).chassis_number || ""}`.toLowerCase();
                    const matchA = chassisA.includes(qClean) || chassisA.includes(q);
                    const matchB = chassisB.includes(qClean) || chassisB.includes(q);
                    if (matchA && !matchB) return -1;
                    if (!matchA && matchB) return 1;
                  }
                  const stageA = (a.currentStage || (a as any).current_stage || "").toLowerCase();
                  const stageB = (b.currentStage || (b as any).current_stage || "").toLowerCase();
                  if (stageA === "received" && stageB !== "received") return -1;
                  if (stageB === "received" && stageA !== "received") return 1;
                  if (stageA === "rtd" && stageB !== "rtd") return -1;
                  if (stageB === "rtd" && stageA !== "rtd") return 1;
                  return (Number(b.id) || 0) - (Number(a.id) || 0);
                });

              if (eligible.length === 0) {
                return (
                  <div className="p-8 text-center text-muted-foreground text-xs">
                    No vehicles found matching {vehicleSearchQuery ? `"${vehicleSearchQuery}"` : "the selected filter"}.
                  </div>
                );
              }

              return eligible.map((v) => {
                const stage = (v.currentStage || (v as any).current_stage || "").toLowerCase();
                const isDispatched = stage === "dispatched" || stage === "delivered";

                return (
                  <div
                    key={v.id}
                    className="flex items-center justify-between p-3 rounded-xl border border-border/70 hover:border-emerald-500/40 bg-card hover:bg-muted/30 transition-all gap-3"
                  >
                    <div className="flex flex-col min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-primary">{v.trackingId}</span>
                        <span className="text-[11px] font-mono text-muted-foreground font-semibold">
                          Chassis: {v.chassisNumber || v.vin || "-"}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground flex-wrap">
                        <span className="font-medium text-foreground">{v.oemName}</span>
                        <span>•</span>
                        <span>{v.vehicleModel || (v as any).modelName || "N/A"}</span>
                        <span>•</span>
                        <span
                          className={cn(
                            "capitalize px-1.5 py-0.5 rounded text-[10px] font-semibold border",
                            stage === "received"
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/30"
                              : stage === "rtd" || stage.includes("ready")
                              ? "bg-blue-500/10 text-blue-600 border-blue-500/30"
                              : stage === "dispatch"
                              ? "bg-amber-500/10 text-amber-600 border-amber-500/30"
                              : stage === "dispatched" || stage === "delivered"
                              ? "bg-purple-500/10 text-purple-600 border-purple-500/30"
                              : "bg-muted text-muted-foreground border-border"
                          )}
                        >
                          {v.currentStage || "Received"}
                        </span>
                        {v.dealerName && (
                          <>
                            <span>•</span>
                            <span className="text-[11px] text-muted-foreground truncate max-w-[180px]">
                              {v.dealerName}
                            </span>
                          </>
                        )}
                        {v.dispatchChallanNumber && (
                          <>
                            <span>•</span>
                            <span className="text-[10px] font-mono text-foreground font-medium">
                              Challan: {v.dispatchChallanNumber}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => {
                        setPendingDispatchVehicle(v);
                        setShowSelectVehicleModal(false);
                      }}
                      className={cn(
                        "gap-1 shrink-0 text-xs font-semibold cursor-pointer shadow-xs",
                        isDispatched
                          ? "bg-slate-700 hover:bg-slate-800 text-white"
                          : "bg-emerald-600 hover:bg-emerald-700 text-white"
                      )}
                    >
                      <Truck size={12} /> {isDispatched ? "Re-Dispatch / Update" : "Dispatch"}
                    </Button>
                  </div>
                );
              });
            })()}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
