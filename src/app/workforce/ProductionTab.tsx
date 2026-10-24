"use client";

import React, { useState, useMemo, useEffect } from "react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { vehiclesApi } from "@/lib/api";
import { 
  CarFront, Clock, CheckCircle2, AlertCircle, ChevronRight, ChevronDown, 
  Users, Settings2, Search, Plus, UserPlus, Truck, FileSpreadsheet, Download, 
  LayoutGrid, Filter, Calendar as CalendarIcon, X, Tag, Inbox, Eye, ArrowUpDown, 
  ShieldCheck, FileText, ExternalLink, Edit, History, MapPin, UploadCloud, AlertTriangle
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AddVehicleDialog } from "@/components/vehicles/AddVehicleDialog";
import { AssignJobDialog } from "@/components/vehicles/AssignJobDialog";
import { GateEntryDrawer } from "@/components/vehicles/GateEntryDrawer";
import { DispatchVehicleDialog, type DispatchFormValues } from "@/components/vehicles/DispatchVehicleDialog";
import { EditRecordDialog, type FieldDefinition } from "@/components/shared/EditRecordDialog";
import { AuditHistoryDrawer } from "@/components/shared/AuditHistoryDrawer";
import { useCreateVehicle, useVerifyVehicle, useWorkers, useUpdateVehicleStage, useUpdateVehicle } from "@/hooks/useQueries";
import { exportToCSV, exportToExcel, exportToPDF } from "../(dashboard)/reports/components/exportUtils";
import { isDateInFilterRange, formatFilterLabel } from "../(dashboard)/reports/components/dateFilterUtils";
import { PriorityBadge } from "@/components/ui/PriorityBadge";
import { KPICard } from "@/components/ui/KPICard";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ProductionTabProps {
  activeUser: any;
  initialStage?: string;
  initialViewMode?: "kanban" | "table";
  autoOpenForm?: "received" | "dispatch" | null;
}

const VEHICLE_EDIT_FIELDS: FieldDefinition[] = [
  { name: "vehicleNumber", label: "Vehicle / Plate No", type: "text" },
  { name: "chassisNumber", label: "Chassis Number / VIN", type: "text" },
  { name: "oemName", label: "OEM Name", type: "text" },
  { name: "vehicleModel", label: "Model Name", type: "text" },
  { name: "dealerName", label: "Destination Dealer", type: "text" },
  { name: "productCategory", label: "Product Category", type: "text" },
  { name: "driverName", label: "Driver Name", type: "text" },
  { name: "driverMobileNumber", label: "Driver Mobile", type: "text" },
  { name: "truckNumber", label: "Truck Number", type: "text" },
  { name: "transportCompany", label: "Transport Carrier", type: "text" },
  { name: "dispatchChallanNumber", label: "Challan Number", type: "text" },
  { name: "invoiceNumber", label: "Invoice Number", type: "text" },
  { name: "lrNumber", label: "LR Number", type: "text" },
  { name: "priority", label: "Priority", type: "select", options: ["normal", "medium", "high", "urgent"] },
];

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

const STATUS_OPTIONS = [
  { id: "All Statuses", label: "All Statuses" },
  { id: "received", label: "📥 Received / Inward" },
  { id: "in_assembly", label: "⚙️ In Assembly / Production" },
  { id: "quality", label: "🔍 Quality Inspection" },
  { id: "rtd", label: "📦 Ready to Dispatch (RTD)" },
  { id: "dispatched", label: "🚚 Dispatched" },
];

export function ProductionTab({ activeUser, initialStage = "all", initialViewMode = "kanban", autoOpenForm }: ProductionTabProps) {
  const router = useRouter();
  const queryClient = useQueryClient();

  // Active sub-tab: "all" (Full Board), "received" (Inward Gate), "dispatch" (Outbound Logistics)
  const [tabMode, setTabMode] = useState<"all" | "received" | "dispatch">(() => {
    if (initialStage === "received") return "received";
    if (initialStage === "dispatch") return "dispatch";
    return "all";
  });

  const [viewMode, setViewMode] = useState<"kanban" | "table">(initialViewMode);
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<string>(initialStage);
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("All Categories");
  const [oemFilter, setOemFilter] = useState<string>("All OEMs");
  const [dealerFilter, setDealerFilter] = useState<string>("All Dealers");
  const [statusFilter, setStatusFilter] = useState<string>("All Statuses");

  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showOemDropdown, setShowOemDropdown] = useState(false);
  const [showDealerDropdown, setShowDealerDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);

  const closeAllDropdowns = () => {
    setShowCategoryDropdown(false);
    setShowOemDropdown(false);
    setShowDealerDropdown(false);
    setShowStatusDropdown(false);
  };

  const [dateRange, setDateRange] = useState<string>("All Time");
  const [selectedDatePreset, setSelectedDatePreset] = useState("All Time");
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

  const currentMonthKey = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }, []);

  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthKey);
  
  // Modals & Drawers state
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalMode, setAddModalMode] = useState<"received" | "standard">("standard");
  const [showSelectDispatchModal, setShowSelectDispatchModal] = useState(false);
  const [dispatchSearchQuery, setDispatchSearchQuery] = useState("");
  const [editRecord, setEditRecord] = useState<any | null>(null);
  const [historyRecord, setHistoryRecord] = useState<any | null>(null);

  const [assignJobState, setAssignJobState] = useState<{ isOpen: boolean; vehicle: any | null }>({
    isOpen: false,
    vehicle: null,
  });
  const [verifyState, setVerifyState] = useState<{ isOpen: boolean; vehicle: any | null }>({
    isOpen: false,
    vehicle: null,
  });
  const [pendingDispatchVehicle, setPendingDispatchVehicle] = useState<any | null>(null);

  // Sync props when initialStage or initialViewMode changes from Quick Actions
  useEffect(() => {
    if (initialStage === "received") {
      setTabMode("received");
      setStageFilter("received");
    } else if (initialStage === "dispatch") {
      setTabMode("dispatch");
      setStageFilter("dispatch");
    } else if (initialStage) {
      setStageFilter(initialStage);
    }

    if (initialViewMode) setViewMode(initialViewMode);
  }, [initialStage, initialViewMode]);

  const createVehicleMutation = useCreateVehicle();
  const verifyVehicleMutation = useVerifyVehicle();
  const updateStageMutation = useUpdateVehicleStage();
  const updateVehicleMutation = useUpdateVehicle();
  const { data: workersData } = useWorkers({ pageSize: 1000 });

  const workers = useMemo(() => {
    if (Array.isArray(workersData)) return workersData;
    if (workersData && Array.isArray((workersData as any).items)) return (workersData as any).items;
    if (workersData && Array.isArray((workersData as any).data)) return (workersData as any).data;
    return [];
  }, [workersData]);

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
          toast.success(
            `Vehicle ${pendingDispatchVehicle.chassisNumber || pendingDispatchVehicle.platformNumber || pendingDispatchVehicle.trackingId || pendingDispatchVehicle.vehicleNumber || ""} dispatched successfully!`
          );
          setPendingDispatchVehicle(null);
          queryClient.invalidateQueries({ queryKey: ["vehicles"] });
        },
        onError: (err: any) => {
          toast.error(err?.response?.data?.detail || "Failed to dispatch vehicle");
        },
      }
    );
  };

  const handleEditRecordSubmit = (data: Record<string, any>, reason: string) => {
    if (!editRecord) return;
    updateVehicleMutation.mutate(
      {
        id: editRecord.id,
        data: {
          ...data,
          edit_reason: reason,
        },
      },
      {
        onSuccess: () => {
          toast.success("Vehicle details updated successfully");
          setEditRecord(null);
          queryClient.invalidateQueries({ queryKey: ["vehicles"] });
        },
        onError: (err: any) => {
          toast.error(err?.response?.data?.detail || "Failed to update vehicle");
        },
      }
    );
  };

  const { data: platforms = [], isLoading } = useQuery({
    queryKey: ["vehicles"],
    queryFn: () => vehiclesApi.getAll({ pageSize: 1000 }),
    refetchInterval: 30000,
  });

  const platformsList = useMemo(() => {
    if (Array.isArray(platforms)) return platforms;
    if (platforms && Array.isArray((platforms as any).items)) return (platforms as any).items;
    if (platforms && Array.isArray((platforms as any).data)) return (platforms as any).data;
    if (platforms && (platforms as any).data && Array.isArray((platforms as any).data.items)) return (platforms as any).data.items;
    return [];
  }, [platforms]);

  const oemList = useMemo(() => {
    const set = new Set<string>();
    platformsList.forEach((p: any) => {
      const oem = p.oemName || p.oem_name;
      if (oem) set.add(oem);
    });
    return ["All OEMs", ...Array.from(set)];
  }, [platformsList]);

  const dealerList = useMemo(() => {
    const set = new Set<string>();
    platformsList.forEach((p: any) => {
      const d = p.dealerName || p.dealer_name;
      if (d) set.add(d);
    });
    return ["All Dealers", ...Array.from(set)];
  }, [platformsList]);

  // Helper to extract received/created date string
  const getVehicleReceivedDate = (p: any): string | null => {
    return p.receivedAt || p.received_at || p.arrivalTime || p.arrival_time || p.gateEntryTime || p.gate_entry_time || p.submittedAt || p.createdAt || p.created_at || null;
  };

  // Helper to extract YYYY-MM key from vehicle intake date
  const getVehicleMonthKey = (p: any): string => {
    const dt = getVehicleReceivedDate(p);
    if (!dt) return "";
    try {
      const d = new Date(dt);
      if (isNaN(d.getTime())) return "";
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    } catch {
      return "";
    }
  };

  // Dynamically build available months list from vehicles data
  const availableMonths = useMemo(() => {
    const map = new Map<string, string>();
    const now = new Date();
    const curKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
    const curLabel = now.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
    map.set(curKey, curLabel);

    platformsList.forEach((p: any) => {
      const mKey = getVehicleMonthKey(p);
      if (mKey) {
        try {
          const [y, m] = mKey.split("-");
          const d = new Date(Number(y), Number(m) - 1, 1);
          const label = d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
          map.set(mKey, label);
        } catch {}
      }
    });

    return Array.from(map.entries()).sort((a, b) => b[0].localeCompare(a[0]));
  }, [platformsList]);

  const monthDisplayLabel = useMemo(() => {
    if (selectedMonth === "all") return "All Time";
    const found = availableMonths.find(([k]) => k === selectedMonth);
    if (found) return found[1];
    try {
      const [y, m] = selectedMonth.split("-");
      const d = new Date(Number(y), Number(m) - 1, 1);
      return d.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
    } catch {
      return selectedMonth;
    }
  }, [selectedMonth, availableMonths]);

  // Main Filtered Dataset for Excel Table & Kanban Views
  const filteredPlatforms = useMemo(() => {
    let list = platformsList;

    // Sub-tab mode filtering
    if (tabMode === "received") {
      list = list.filter((p: any) => {
        const curr = (p.currentStage || p.current_stage || p.stage || "").toLowerCase();
        if (selectedMonth === "all") {
          return ["received", "oem", "incoming_verification", "supervisor_verification"].includes(curr);
        }
        return true;
      });
    } else if (tabMode === "dispatch") {
      list = list.filter((p: any) => {
        const curr = (p.currentStage || p.current_stage || p.stage || "").toLowerCase();
        return ["dispatch", "dispatched", "rtd", "readytodispatch", "delivered"].includes(curr);
      });
    }

    // Month filter (filters records by month of intake/dispatch)
    if (selectedMonth && selectedMonth !== "all") {
      list = list.filter((p: any) => {
        return getVehicleMonthKey(p) === selectedMonth;
      });
    }

    // Search query filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((p: any) => 
        (p.platformNumber || p.trackingId || p.tracking_id || "").toLowerCase().includes(q) ||
        (p.vehicleNumber || p.vehicle_number || p.vehicleModel || "").toLowerCase().includes(q) ||
        (p.chassisNumber || p.chassis_number || p.vin || "").toLowerCase().includes(q) ||
        (p.oemName || p.oem_name || "").toLowerCase().includes(q) ||
        (p.dealerName || p.dealer_name || "").toLowerCase().includes(q) ||
        (p.dispatchChallanNumber || "").toLowerCase().includes(q) ||
        (p.invoiceNumber || "").toLowerCase().includes(q) ||
        (p.productCategory || p.product_category || "").toLowerCase().includes(q) ||
        (p.currentStage || p.current_stage || p.stage || "").toLowerCase().includes(q)
      );
    }

    // Stage filter (only if not strictly in received or dispatch tab)
    if (tabMode === "all" && stageFilter && stageFilter !== "all") {
      const sf = stageFilter.toLowerCase();
      list = list.filter((p: any) => {
        const curr = (p.currentStage || p.current_stage || p.stage || "").toLowerCase();
        if (sf === "received") return curr === "received" || curr === "oem" || curr === "incoming_verification" || curr === "supervisor_verification";
        if (sf === "dispatch" || sf === "rtd") return curr === "dispatch" || curr === "rtd" || curr === "readytodispatch" || curr === "delivered";
        if (sf === "in_assembly") return ["fabrication", "paint", "quality", "assembly", "chassis assembly", "battery installation"].includes(curr);
        return curr === sf;
      });
    }

    // Priority filter
    if (priorityFilter && priorityFilter !== "all") {
      const pf = priorityFilter.toLowerCase();
      list = list.filter((p: any) => (p.priority || "normal").toLowerCase() === pf);
    }

    // OEM filter
    if (oemFilter && oemFilter !== "All OEMs") {
      list = list.filter((p: any) => (p.oemName || p.oem_name || "").toLowerCase() === oemFilter.toLowerCase());
    }

    // Dealer filter
    if (dealerFilter && dealerFilter !== "All Dealers") {
      list = list.filter((p: any) => (p.dealerName || p.dealer_name || "").toLowerCase() === dealerFilter.toLowerCase());
    }

    // Category filter
    if (categoryFilter && categoryFilter !== "All Categories") {
      const cf = categoryFilter.toLowerCase();
      list = list.filter((p: any) => {
        const cat = (p.productCategory || p.product_category || "Cargo Box").toLowerCase();
        return cat === cf || cat.includes(cf);
      });
    }

    // Status filter
    if (statusFilter && statusFilter !== "All Statuses") {
      const sf = statusFilter.toLowerCase();
      list = list.filter((p: any) => {
        const curr = (p.currentStage || p.current_stage || p.stage || "").toLowerCase();
        if (sf === "received") return curr === "received" || curr === "oem" || curr === "incoming_verification" || curr === "supervisor_verification";
        if (sf === "in_assembly") return ["fabrication", "paint", "quality", "assembly", "chassis assembly", "battery installation"].includes(curr);
        if (sf === "quality") return curr === "quality" || curr === "qc";
        if (sf === "rtd") return curr === "rtd" || curr === "readytodispatch";
        if (sf === "dispatched" || sf === "dispatch") return curr === "dispatch" || curr === "dispatched" || curr === "delivered";
        if (sf === "pending only" || sf === "pending") return curr !== "dispatch" && curr !== "dispatched" && curr !== "delivered";
        if (sf === "dispatched only") return curr === "dispatch" || curr === "dispatched" || curr === "delivered";
        return curr === sf;
      });
    }

    // Date range filter
    if (dateRange && dateRange !== "All Time") {
      list = list.filter((p: any) => {
        const dt = p.dispatchDateTime || p.receivedAt || p.createdAt;
        return isDateInFilterRange(dt, dateRange);
      });
    }

    // Sort descending by date
    return list.sort((a: any, b: any) => {
      const dtA = a.dispatchDateTime || a.receivedAt || a.createdAt;
      const dtB = b.dispatchDateTime || b.receivedAt || b.createdAt;
      const timeA = dtA ? new Date(dtA).getTime() : 0;
      const timeB = dtB ? new Date(dtB).getTime() : 0;

      if (timeA !== timeB) return timeB - timeA;
      return (Number(b.id) || 0) - (Number(a.id) || 0);
    });
  }, [platformsList, tabMode, searchQuery, stageFilter, priorityFilter, oemFilter, dealerFilter, dateRange, selectedMonth]);

  // Specific KPI stats calculation
  const stats = useMemo(() => {
    const total = platformsList.length;

    // Monthly received vehicles (intake in selected month, or all-time if "all")
    const monthReceivedCount = platformsList.filter((p: any) => {
      if (selectedMonth === "all") return true;
      return getVehicleMonthKey(p) === selectedMonth;
    }).length;

    // All-time pending vehicles in factory (not yet dispatched / delivered)
    const allTimePendingCount = platformsList.filter((p: any) => {
      const stage = (p.currentStage || p.current_stage || p.stage || "").toLowerCase();
      return !["dispatched", "delivered"].includes(stage);
    }).length;

    const receivedCount = platformsList.filter((p: any) => 
      ["received", "oem", "incoming_verification", "supervisor_verification"].includes((p.currentStage || "").toLowerCase())
    ).length;
    const inAssemblyCount = platformsList.filter((p: any) => 
      ["fabrication", "paint", "quality", "assembly", "chassis assembly", "battery installation"].includes((p.currentStage || "").toLowerCase())
    ).length;
    const rtdCount = platformsList.filter((p: any) => 
      ["rtd", "readytodispatch"].includes((p.currentStage || "").toLowerCase())
    ).length;
    const dispatchedCount = platformsList.filter((p: any) => 
      ["dispatch", "dispatched", "delivered"].includes((p.currentStage || "").toLowerCase())
    ).length;

    const todayStr = new Date().toISOString().slice(0, 10);
    const todayReceived = platformsList.filter((p: any) => {
      const dt = getVehicleReceivedDate(p);
      return dt && dt.slice(0, 10) === todayStr;
    }).length;
    const todayDispatched = platformsList.filter((p: any) => {
      const dt = p.dispatchDateTime || p.updatedAt;
      const stage = (p.currentStage || "").toLowerCase();
      return (stage === "dispatch" || stage === "delivered") && dt && dt.slice(0, 10) === todayStr;
    }).length;

    return { 
      total, 
      monthReceivedCount, 
      allTimePendingCount, 
      receivedCount, 
      inAssemblyCount, 
      rtdCount, 
      dispatchedCount, 
      todayReceived, 
      todayDispatched 
    };
  }, [platformsList, selectedMonth]);

  const dispatchCandidateVehicles = useMemo(() => {
    let list = platformsList.filter((v: any) => (v.currentStage || "").toLowerCase() !== "delivered");
    if (dispatchSearchQuery) {
      const q = dispatchSearchQuery.toLowerCase().trim();
      list = list.filter((v: any) =>
        (v.platformNumber || v.trackingId || "").toLowerCase().includes(q) ||
        (v.vehicleNumber || v.vehicleModel || "").toLowerCase().includes(q) ||
        (v.chassisNumber || v.vin || "").toLowerCase().includes(q) ||
        (v.oemName || "").toLowerCase().includes(q)
      );
    }
    return list.sort((a: any, b: any) => {
      const aRtd = ["rtd", "readytodispatch"].includes((a.currentStage || "").toLowerCase());
      const bRtd = ["rtd", "readytodispatch"].includes((b.currentStage || "").toLowerCase());
      if (aRtd && !bRtd) return -1;
      if (!aRtd && bRtd) return 1;
      return 0;
    });
  }, [platformsList, dispatchSearchQuery]);

  const formatReceivedDate = (dateVal: any) => {
    if (!dateVal) return "-";
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return "-";
      return d.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return "-";
    }
  };

  // Export handlers
  const handleExportExcel = () => {
    if (filteredPlatforms.length === 0) return toast.error("No vehicle records to export");
    const filename = tabMode === "received" ? "Received_Vehicles_Master" : tabMode === "dispatch" ? "Dispatch_Vehicles_Master" : "Production_Board_Vehicles";
    const exportData = filteredPlatforms.map((p: any) => ({
      "Tracking ID": p.trackingId || p.platformNumber || "",
      "Chassis / VIN": p.chassisNumber || p.vin || "-",
      "Vehicle Model": p.vehicleNumber || p.vehicleModel || "",
      "OEM Name": p.oemName || "",
      "Dealer Name": p.dealerName || "-",
      "Category": p.productCategory || "",
      "Stage": p.currentStage || "Pending",
      "Priority": p.priority || "Normal",
      "Challan Number": p.dispatchChallanNumber || "-",
      "Invoice Number": p.invoiceNumber || "-",
      "Transporter": p.transportCompany || "-",
      "Truck Number": p.truckNumber || "-",
      "Driver Name": p.driverName || "-",
      "Driver Mobile": p.driverMobileNumber || "-",
      "Date": formatReceivedDate(p.dispatchDateTime || p.receivedAt || p.createdAt),
    }));
    exportToExcel(filename, Object.keys(exportData[0]), exportData);
  };

  const handleExportPDF = () => {
    if (filteredPlatforms.length === 0) return toast.error("No vehicle records to export");
    const filename = tabMode === "received" ? "Received_Vehicles_Master" : tabMode === "dispatch" ? "Dispatch_Vehicles_Master" : "Production_Board_Vehicles";
    const title = tabMode === "received" ? "Received Vehicles Master Report" : tabMode === "dispatch" ? "Dispatch & Logistics Report" : "Production Board Master Report";
    const headers = ["Tracking ID", "Chassis / VIN", "Vehicle Model", "OEM", "Dealer", "Category", "Challan/Inv", "Stage", "Date"];
    const exportData = filteredPlatforms.map((p: any) => ({
      "Tracking ID": p.trackingId || p.platformNumber || "",
      "Chassis / VIN": p.chassisNumber || p.vin || "-",
      "Vehicle Model": p.vehicleNumber || p.vehicleModel || "",
      "OEM": p.oemName || "",
      "Dealer": p.dealerName || "-",
      "Category": p.productCategory || "",
      "Challan/Inv": p.dispatchChallanNumber ? `Ch: ${p.dispatchChallanNumber}` : p.invoiceNumber ? `Inv: ${p.invoiceNumber}` : "-",
      "Stage": p.currentStage || "Pending",
      "Date": formatReceivedDate(p.dispatchDateTime || p.receivedAt || p.createdAt),
    }));
    exportToPDF(filename, title, headers, exportData, {
      summary: `Total ${filteredPlatforms.length} vehicles matching current filter.`
    });
  };

  const handleExportCSV = () => {
    if (filteredPlatforms.length === 0) return toast.error("No vehicle records to export");
    const filename = tabMode === "received" ? "Received_Vehicles_Master" : tabMode === "dispatch" ? "Dispatch_Vehicles_Master" : "Production_Board_Vehicles";
    const exportData = filteredPlatforms.map((p: any) => ({
      "Tracking ID": p.trackingId || p.platformNumber || "",
      "Chassis / VIN": p.chassisNumber || p.vin || "-",
      "Vehicle Model": p.vehicleNumber || p.vehicleModel || "",
      "OEM Name": p.oemName || "",
      "Dealer Name": p.dealerName || "-",
      "Category": p.productCategory || "",
      "Stage": p.currentStage || "Pending",
      "Priority": p.priority || "Normal",
      "Challan Number": p.dispatchChallanNumber || "-",
      "Invoice Number": p.invoiceNumber || "-",
      "Transporter": p.transportCompany || "-",
      "Truck Number": p.truckNumber || "-",
      "Driver Name": p.driverName || "-",
      "Driver Mobile": p.driverMobileNumber || "-",
      "Date": formatReceivedDate(p.dispatchDateTime || p.receivedAt || p.createdAt),
    }));
    exportToCSV(filename, Object.keys(exportData[0]), exportData);
  };

  const columns = [
    { id: "oem", title: "OEM", stages: ["oem"], color: "border-gray-200 bg-gray-50/50 dark:bg-zinc-900/50 dark:border-zinc-800/80" },
    { id: "incoming_verification", title: "Verify (In)", stages: ["incoming_verification"], color: "border-orange-200 bg-orange-50/50 dark:bg-orange-950/20 dark:border-orange-900/30" },
    { id: "supervisor_verification", title: "Verify (Sup)", stages: ["supervisor_verification"], color: "border-orange-200 bg-orange-50/50 dark:bg-orange-950/20 dark:border-orange-900/30" },
    { id: "rejected", title: "Rejected", stages: ["rejected"], color: "border-red-200 bg-red-50/50 dark:bg-red-950/20 dark:border-red-900/30" },
    { id: "received", title: "Received", stages: ["received"], color: "border-gray-200 bg-gray-50/50 dark:bg-zinc-900/50 dark:border-zinc-800/80" },
    { id: "fabrication", title: "Fabrication", stages: ["fabrication"], color: "border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-900/30" },
    { id: "paint", title: "Paint", stages: ["paint"], color: "border-purple-200 bg-purple-50/50 dark:bg-purple-950/20 dark:border-purple-900/30" },
    { id: "quality", title: "Quality", stages: ["quality"], color: "border-yellow-200 bg-yellow-50/50 dark:bg-yellow-950/20 dark:border-yellow-900/30" },
    { id: "rtd", title: "RTD", stages: ["rtd", "readytodispatch"], color: "border-green-200 bg-green-50/50 dark:bg-green-950/20 dark:border-green-900/30" },
    { id: "dispatch", title: "Dispatch", stages: ["dispatch"], color: "border-green-200 bg-green-50/50 dark:bg-green-950/20 dark:border-green-900/30" }
  ];

  return (
    <div className="p-3 sm:p-4 pb-28 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* ─── TOP SECTION: MODE SELECTOR & STATS ─── */}
      <div className="space-y-4 mb-5">
        {/* Sub-tab Mode Switcher (All Production / Received Inward / Dispatch Outward) */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white dark:bg-zinc-900 p-2 sm:p-3 rounded-2xl border border-gray-200 dark:border-zinc-800 shadow-xs">
          <div className="flex bg-gray-100 dark:bg-zinc-800 p-1 rounded-xl w-full sm:w-auto">
            <button
              type="button"
              onClick={() => {
                setTabMode("all");
                setStageFilter("all");
              }}
              className={cn(
                "flex-1 sm:flex-initial px-3 sm:px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5",
                tabMode === "all"
                  ? "bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
              )}
            >
              <CarFront size={14} />
              <span>All Production ({platformsList.length})</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setTabMode("received");
                setStageFilter("received");
              }}
              className={cn(
                "flex-1 sm:flex-initial px-3 sm:px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5",
                tabMode === "received"
                  ? "bg-teal-600 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
              )}
            >
              <Inbox size={14} />
              <span>Received (Inward)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setTabMode("dispatch");
                setStageFilter("dispatch");
              }}
              className={cn(
                "flex-1 sm:flex-initial px-3 sm:px-4 py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5",
                tabMode === "dispatch"
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
              )}
            >
              <Truck size={14} />
              <span>Dispatch (Outward)</span>
            </button>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2 justify-end">
            <Button
              size="sm"
              onClick={() => {
                setAddModalMode("received");
                setShowAddModal(true);
              }}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold h-9 rounded-xl gap-1.5 cursor-pointer shadow-xs"
            >
              <Plus size={14} />
              Receive New
            </Button>
            <Button
              size="sm"
              onClick={() => setShowSelectDispatchModal(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold h-9 rounded-xl gap-1.5 cursor-pointer shadow-xs"
            >
              <Truck size={14} />
              Dispatch
            </Button>
          </div>
        </div>

        {/* ─── DYNAMIC KPI CARDS MATCHING ADMIN FORMAT ─── */}
        {tabMode === "received" ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
            <KPICard
              title={selectedMonth === "all" ? "Total Received" : `Total Received (${monthDisplayLabel})`}
              value={stats.monthReceivedCount}
              description={selectedMonth === "all" ? "All-time gate intake & stock" : `${stats.monthReceivedCount} vehicles received in ${monthDisplayLabel}`}
              icon={<Inbox size={16} />}
              semantic="primary"
            />
            <KPICard
              title="Received Today"
              value={stats.todayReceived}
              description="Today's gate intake"
              icon={<CheckCircle2 size={16} />}
              semantic="success"
            />
            <KPICard
              title="In Assembly"
              value={stats.inAssemblyCount}
              description="Active in fab, paint & QA"
              icon={<CarFront size={16} />}
              semantic="warning"
            />
            <KPICard
              title="Pending Vehicles"
              value={stats.allTimePendingCount}
              description="All-time pending in factory"
              icon={<Clock size={16} />}
              semantic="destructive"
            />
          </div>
        ) : tabMode === "dispatch" ? (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
            <KPICard
              title="Total Dispatched"
              value={stats.dispatchedCount}
              description="All logged outbounds"
              icon={<Truck size={16} />}
              semantic="primary"
            />
            <KPICard
              title="Dispatched Today"
              value={stats.todayDispatched}
              description="Today's outgoing shipments"
              icon={<CheckCircle2 size={16} />}
              semantic="success"
            />
            <KPICard
              title="Ready to Dispatch"
              value={stats.rtdCount}
              description="Passed QA, waiting truck"
              icon={<Clock size={16} />}
              semantic="warning"
            />
            <KPICard
              title="Pending Dispatch"
              value={platformsList.filter((p: any) => !["dispatch", "dispatched", "delivered"].includes((p.currentStage || "").toLowerCase())).length}
              description="Remaining in factory"
              icon={<AlertCircle size={16} />}
              semantic="destructive"
            />
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3">
            <KPICard
              title="Total Fleet"
              value={stats.total}
              description="Entire production roster"
              icon={<CarFront size={16} />}
              semantic="primary"
            />
            <KPICard
              title="In Assembly"
              value={stats.inAssemblyCount}
              description="Running on floor"
              icon={<Settings2 size={16} />}
              semantic="warning"
            />
            <KPICard
              title="Ready / Dispatched"
              value={stats.rtdCount + stats.dispatchedCount}
              description="Finished / dispatched"
              icon={<CheckCircle2 size={16} />}
              semantic="success"
            />
            <KPICard
              title={selectedMonth === "all" ? "Received & Intake" : `Received (${monthDisplayLabel})`}
              value={stats.monthReceivedCount}
              description={selectedMonth === "all" ? "Inward gate vehicles" : `${stats.monthReceivedCount} received in ${monthDisplayLabel}`}
              icon={<Inbox size={16} />}
              semantic="primary"
            />
          </div>
        )}
      </div>

      {/* Click outside backdrop for custom dropdowns */}
      {(showCategoryDropdown || showOemDropdown || showDealerDropdown || showStatusDropdown) && (
        <div
          className="fixed inset-0 z-20"
          onClick={closeAllDropdowns}
        />
      )}

      {/* ─── FILTER CONTROL BAR & EXPORT STRIP ─── */}
      <div className="bg-white dark:bg-zinc-900 p-3 sm:p-4 rounded-2xl border border-gray-200 dark:border-zinc-800 shadow-xs mb-5 space-y-3">
        <div className="flex flex-col sm:flex-row flex-wrap items-center gap-2">
          {/* Search Bar */}
          <div className="relative w-full sm:flex-1 sm:min-w-[180px] sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" size={14} />
            <input 
              placeholder="Search Chassis, VIN, Tracking ID, Model, OEM, Dealer..." 
              className="w-full pl-9 pr-3 h-9 text-xs bg-muted/50 border border-input rounded-xl text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/60 transition-all shadow-2xs"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Date Range & Custom Month Selector */}
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
                onClick={() => setPriorityFilter(f)}
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
                {f === "all" ? `All (${platformsList.length})` : f}
              </button>
            ))}
          </div>

          {/* Dropdown Filters: Clean 2x2 Grid on Mobile, Inline Flex on Desktop */}
          <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full sm:w-auto">
            {/* Category Filter Dropdown */}
            <div className="relative w-full sm:w-auto z-30">
              <button
                type="button"
                onClick={() => {
                  const cur = showCategoryDropdown;
                  closeAllDropdowns();
                  setShowCategoryDropdown(!cur);
                }}
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

            {/* OEM Filter Dropdown */}
            <div className="relative w-full sm:w-auto z-30">
              <button
                type="button"
                onClick={() => {
                  const cur = showOemDropdown;
                  closeAllDropdowns();
                  setShowOemDropdown(!cur);
                }}
                className="flex items-center justify-between gap-1.5 px-2.5 h-9 text-[11px] font-medium bg-muted/50 border border-border rounded-xl text-foreground hover:border-primary/40 transition-all w-full min-w-0 shadow-2xs cursor-pointer"
              >
                <span className="truncate">{oemFilter === "All" || oemFilter === "All OEMs" ? "All OEMs" : oemFilter}</span>
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
                  >
                    {oemList.map((oem) => (
                      <button
                        key={oem}
                        type="button"
                        onClick={() => {
                          setOemFilter(oem);
                          setShowOemDropdown(false);
                        }}
                        className={cn(
                          "w-full text-left px-3 py-2 text-xs transition-colors truncate cursor-pointer",
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

            {/* Dealer Filter Dropdown */}
            <div className="relative w-full sm:w-auto z-30">
              <button
                type="button"
                onClick={() => {
                  const cur = showDealerDropdown;
                  closeAllDropdowns();
                  setShowDealerDropdown(!cur);
                }}
                className="flex items-center justify-between gap-1.5 px-2.5 h-9 text-[11px] font-medium bg-muted/50 border border-border rounded-xl text-foreground hover:border-primary/40 transition-all w-full min-w-0 sm:min-w-[110px] shadow-2xs cursor-pointer"
              >
                <span className="truncate">{dealerFilter === "All" || dealerFilter === "All Dealers" ? "All Dealers" : dealerFilter}</span>
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
                  >
                    {dealerList.map((dealer) => (
                      <button
                        key={dealer}
                        type="button"
                        onClick={() => {
                          setDealerFilter(dealer);
                          setShowDealerDropdown(false);
                        }}
                        className={cn(
                          "w-full text-left px-3 py-2 text-xs transition-colors truncate cursor-pointer",
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
            <div className="relative w-full sm:w-auto z-30">
              <button
                type="button"
                onClick={() => {
                  const cur = showStatusDropdown;
                  closeAllDropdowns();
                  setShowStatusDropdown(!cur);
                }}
                className="flex items-center justify-between gap-1.5 px-2.5 h-9 text-[11px] font-medium bg-muted/50 border border-border rounded-xl text-foreground hover:border-primary/40 transition-all w-full min-w-0 sm:min-w-[110px] shadow-2xs cursor-pointer"
              >
                <span className="truncate">
                  {statusFilter === "All Statuses" ? "All Statuses" : STATUS_OPTIONS.find((s) => s.id === statusFilter)?.label || statusFilter}
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
                  >
                    {STATUS_OPTIONS.map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => {
                          setStatusFilter(item.id);
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
          </div>
        </div>

        {/* Export Buttons & View Toggle Strip */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-zinc-800 flex-wrap gap-2">
          {/* View Toggle */}
          <div className="bg-gray-100 dark:bg-zinc-800 p-0.5 rounded-lg flex items-center border border-gray-200 dark:border-zinc-700">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer",
                viewMode === "table" 
                  ? "bg-emerald-600 text-white shadow-xs" 
                  : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
              )}
            >
              <FileSpreadsheet size={13} />
              Excel / Table View
            </button>
            <button
              type="button"
              onClick={() => setViewMode("kanban")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer",
                viewMode === "kanban" 
                  ? "bg-white dark:bg-zinc-900 text-indigo-600 shadow-xs" 
                  : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
              )}
            >
              <LayoutGrid size={13} />
              Kanban Board
            </button>
          </div>

          {/* Export Action Buttons */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              type="button"
              onClick={handleExportExcel}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <FileSpreadsheet size={13} />
              <span className="hidden sm:inline">Export </span>Excel
            </button>
            <button
              type="button"
              onClick={handleExportPDF}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
            >
              <FileText size={13} />
              <span className="hidden sm:inline">Export </span>PDF
            </button>
            <button
              type="button"
              onClick={handleExportCSV}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:text-gray-300 text-gray-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
            >
              <Download size={13} />
              CSV
            </button>
          </div>
        </div>
      </div>

      {/* ─── MOBILE CARDS VIEW (ADMIN FORMATTED) ─── */}
      <div className="md:hidden space-y-3 mb-6">
        {filteredPlatforms.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-2xl border border-border p-6 shadow-xs">
            <CarFront size={36} className="mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm font-semibold text-foreground">No vehicles found</p>
            <p className="text-xs text-muted-foreground mt-1">Try adjusting your search query or filters.</p>
          </div>
        ) : (
          filteredPlatforms.map((pf: any) => {
            const chassis = pf.chassisNumber || pf.vin || "-";
            const stage = (pf.currentStage || "received").toLowerCase();
            const isCompleted = ["rtd", "dispatch", "delivered", "readytodispatch"].includes(stage);
            const dateStr = formatReceivedDate(pf.dispatchDateTime || pf.receivedAt || pf.createdAt);
            const pNorm = (pf.priority || "normal").toLowerCase();

            return (
              <div key={pf.id} className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl p-4 space-y-3 shadow-xs">
                {/* Header row */}
                <div className="flex items-center justify-between gap-2 border-b border-gray-100 dark:border-zinc-800/80 pb-2.5">
                  <div className="flex items-center gap-2 min-w-0">
                    <button
                      type="button"
                      onClick={() => router.push(`/vehicle/${pf.id}`)}
                      className="font-mono text-xs font-bold text-indigo-600 dark:text-indigo-400 hover:underline truncate"
                    >
                      {pf.trackingId || pf.platformNumber}
                    </button>
                    <span className="font-semibold px-2 py-0.5 rounded-full text-[10px] bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 capitalize shrink-0">
                      {pf.currentStage || "Received"}
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
                    {pf.priority || "Normal"}
                  </span>
                </div>

                {/* Body Details Grid (Exact Admin Format) */}
                <div className="grid grid-cols-2 gap-2.5 text-xs">
                  <div>
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block">OEM & Model</span>
                    <span className="font-bold text-foreground truncate block">{pf.oemName || "Fox Motors"}</span>
                    <span className="text-muted-foreground text-[11px] truncate block">{pf.vehicleNumber || pf.vehicleModel || "-"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block">Chassis / VIN</span>
                    <span className="font-mono text-foreground font-semibold truncate block bg-gray-50 dark:bg-zinc-800/80 px-1.5 py-0.5 rounded border border-gray-100 dark:border-zinc-800">
                      {chassis}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block">Dealer / Destination</span>
                    <span className="text-foreground font-medium truncate block">{pf.dealerName || "Factory Floor"}</span>
                  </div>
                  <div>
                    <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block">Date</span>
                    <span className="text-muted-foreground text-[11px] truncate block">{dateStr}</span>
                  </div>
                </div>

                {/* Category & Logistics Row */}
                <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-zinc-800/60 text-[11px]">
                  <span className="text-muted-foreground font-medium truncate">{pf.productCategory || "Cargo Box"}</span>
                  {(pf.dispatchChallanNumber || pf.invoiceNumber) && (
                    <span className="font-mono text-indigo-600 dark:text-indigo-400 font-semibold truncate">
                      {pf.dispatchChallanNumber ? `Ch: ${pf.dispatchChallanNumber}` : `Inv: ${pf.invoiceNumber}`}
                    </span>
                  )}
                </div>

                {/* Progress bar */}
                <div>
                  <div className="flex justify-between items-center text-[10px] font-bold text-gray-500 mb-1">
                    <span>Progress</span>
                    <span>{pf.progressPercent || 0}%</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className={cn("h-full rounded-full transition-all duration-300", isCompleted ? "bg-emerald-500" : "bg-indigo-600")}
                      style={{ width: `${pf.progressPercent || 0}%` }}
                    />
                  </div>
                </div>

                {/* Action Buttons Strip */}
                <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-gray-100 dark:border-zinc-800 flex-wrap">
                  {pf.documentsUrl && (
                    <a
                      href={pf.documentsUrl.startsWith("http") || pf.documentsUrl.startsWith("/") ? pf.documentsUrl : "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="h-8 px-2.5 text-xs font-semibold rounded-lg border border-border bg-background hover:bg-muted inline-flex items-center gap-1 text-foreground transition-colors cursor-pointer"
                    >
                      <FileText size={12} /> Doc
                    </a>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => router.push(`/vehicle/${pf.id}`)}
                    className="h-8 px-2.5 text-xs font-bold cursor-pointer"
                  >
                    <Eye size={12} className="mr-1" /> View
                  </Button>

                  {["oem", "incoming_verification", "supervisor_verification"].includes(stage) && (
                    <Button
                      size="sm"
                      onClick={() => setVerifyState({ isOpen: true, vehicle: pf })}
                      className="h-8 px-2.5 text-xs font-bold bg-green-600 hover:bg-green-700 text-white gap-1 cursor-pointer"
                    >
                      <CheckCircle2 size={12} /> Verify
                    </Button>
                  )}

                  {!["oem", "incoming_verification", "supervisor_verification", "rejected"].includes(stage) && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setAssignJobState({ isOpen: true, vehicle: pf })}
                      className="h-8 px-2.5 text-xs font-bold text-indigo-600 border-indigo-200 dark:border-indigo-800 gap-1 cursor-pointer"
                    >
                      <UserPlus size={12} /> Assign
                    </Button>
                  )}

                  <Button
                    size="sm"
                    onClick={() => setPendingDispatchVehicle(pf)}
                    className="h-8 px-2.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white gap-1 cursor-pointer"
                  >
                    <Truck size={12} /> Dispatch
                  </Button>

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
                      <DropdownMenuItem onClick={() => setEditRecord(pf)}>
                        <Edit className="w-3.5 h-3.5 mr-2" /> Edit Details
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => setHistoryRecord(pf)}>
                        <History className="w-3.5 h-3.5 mr-2" /> Audit History
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* ─── DESKTOP VIEW 1: EXCEL / MASTER TABLE VIEW ─── */}
      {viewMode === "table" ? (
        <div className="hidden md:block bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[1050px]">
              <thead>
                <tr className="bg-gray-50/80 dark:bg-zinc-800/80 border-b border-gray-200 dark:border-zinc-800 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <th className="p-3.5 pl-4">Platform / Tracking ID</th>
                  <th className="p-3.5">Chassis / VIN</th>
                  <th className="p-3.5">OEM & Model</th>
                  <th className="p-3.5">Dealer / Destination</th>
                  <th className="p-3.5">Challan / Invoice</th>
                  <th className="p-3.5">Category</th>
                  <th className="p-3.5">Stage</th>
                  <th className="p-3.5">Priority</th>
                  <th className="p-3.5">Progress</th>
                  <th className="p-3.5 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-800 text-xs">
                {filteredPlatforms.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="text-center py-16 text-gray-400">
                      <CarFront size={44} className="mx-auto mb-2 opacity-25" />
                      <p className="text-sm font-semibold">No vehicles found matching current filters</p>
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery("");
                          setStageFilter("all");
                          setPriorityFilter("all");
                          setOemFilter("All OEMs");
                          setDealerFilter("All Dealers");
                          setDateRange("All Time");
                        }}
                        className="mt-2 text-xs text-indigo-600 font-bold hover:underline cursor-pointer"
                      >
                        Reset All Filters
                      </button>
                    </td>
                  </tr>
                ) : (
                  filteredPlatforms.map((pf: any) => {
                    const chassis = pf.chassisNumber || pf.vin || "-";
                    const stage = (pf.currentStage || "received").toLowerCase();
                    const isCompleted = ["rtd", "dispatch", "delivered", "readytodispatch"].includes(stage);
                    const workerCount = pf.assignedWorkerIds?.length || pf.workers?.length || 0;

                    return (
                      <tr key={pf.id} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/40 transition-colors">
                        {/* Tracking ID */}
                        <td className="p-3.5 pl-4 font-extrabold">
                          <button
                            type="button"
                            onClick={() => router.push(`/vehicle/${pf.id}`)}
                            className="font-mono text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1.5"
                          >
                            <CarFront size={14} className="text-gray-400" />
                            {pf.platformNumber || pf.trackingId}
                          </button>
                          <div className="text-[10px] text-gray-400 font-normal mt-0.5">
                            {formatReceivedDate(pf.dispatchDateTime || pf.receivedAt || pf.createdAt)}
                          </div>
                        </td>

                        {/* Chassis / VIN */}
                        <td className="p-3.5">
                          <span className="font-mono font-semibold text-foreground bg-gray-50 dark:bg-zinc-800/80 px-2 py-0.5 rounded border border-gray-200 dark:border-zinc-700 text-xs">
                            {chassis}
                          </span>
                        </td>

                        {/* OEM & Model */}
                        <td className="p-3.5">
                          <div className="font-bold text-gray-900 dark:text-white">{pf.oemName || "Fox Motors"}</div>
                          <div className="text-[11px] text-muted-foreground">{pf.vehicleNumber || pf.vehicleModel || "-"}</div>
                        </td>

                        {/* Dealer */}
                        <td className="p-3.5 font-medium text-foreground">
                          {pf.dealerName || "Factory Outbound"}
                        </td>

                        {/* Challan / Invoice */}
                        <td className="p-3.5 font-mono text-xs">
                          {pf.dispatchChallanNumber ? (
                            <span className="text-foreground font-semibold block">Ch: {pf.dispatchChallanNumber}</span>
                          ) : null}
                          {pf.invoiceNumber ? (
                            <span className="text-muted-foreground text-[10px] block">Inv: {pf.invoiceNumber}</span>
                          ) : null}
                          {!pf.dispatchChallanNumber && !pf.invoiceNumber && <span className="text-gray-400">-</span>}
                        </td>

                        {/* Category */}
                        <td className="p-3.5 text-muted-foreground">
                          {pf.productCategory || "Cargo Box"}
                        </td>

                        {/* Stage */}
                        <td className="p-3.5">
                          <Badge 
                            variant="outline"
                            className={cn(
                              "text-[10px] uppercase font-bold px-2 py-0.5",
                              stage === "received" && "bg-blue-50 text-blue-700 border-blue-200",
                              stage === "fabrication" && "bg-purple-50 text-purple-700 border-purple-200",
                              stage === "paint" && "bg-pink-50 text-pink-700 border-pink-200",
                              stage === "quality" && "bg-amber-50 text-amber-700 border-amber-200",
                              (stage === "rtd" || stage === "readytodispatch") && "bg-emerald-50 text-emerald-700 border-emerald-200",
                              stage === "dispatch" && "bg-green-100 text-green-800 border-green-300",
                              stage === "rejected" && "bg-red-50 text-red-700 border-red-200"
                            )}
                          >
                            {pf.currentStage || "Received"}
                          </Badge>
                        </td>

                        {/* Priority */}
                        <td className="p-3.5">
                          <PriorityBadge priority={pf.priority || "normal"} />
                        </td>

                        {/* Progress */}
                        <td className="p-3.5 w-32">
                          <div className="flex items-center justify-between text-[10px] font-bold mb-1 text-gray-500">
                            <span>{pf.progressPercent || 0}%</span>
                            <span>{workerCount} worker(s)</span>
                          </div>
                          <div className="w-full bg-gray-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden">
                            <div 
                              className={cn("h-full rounded-full transition-all duration-300", isCompleted ? "bg-emerald-500" : "bg-indigo-600")}
                              style={{ width: `${pf.progressPercent || 0}%` }}
                            />
                          </div>
                        </td>

                        {/* Actions */}
                        <td className="p-3.5 pr-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {pf.documentsUrl && (
                              <a
                                href={pf.documentsUrl.startsWith("http") || pf.documentsUrl.startsWith("/") ? pf.documentsUrl : "#"}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-2 py-1 rounded-md border border-border bg-background hover:bg-muted text-xs font-semibold inline-flex items-center gap-1 text-foreground transition-colors cursor-pointer"
                              >
                                <FileText size={12} /> Doc
                              </a>
                            )}

                            <button
                              type="button"
                              onClick={() => router.push(`/vehicle/${pf.id}`)}
                              className="px-2.5 py-1 text-xs font-bold text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 rounded-lg cursor-pointer"
                            >
                              View
                            </button>

                            {["oem", "incoming_verification", "supervisor_verification"].includes(stage) && (
                              <button
                                type="button"
                                onClick={() => setVerifyState({ isOpen: true, vehicle: pf })}
                                className="px-2.5 py-1 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer"
                              >
                                <CheckCircle2 size={12} /> Verify
                              </button>
                            )}

                            {!["oem", "incoming_verification", "supervisor_verification", "rejected"].includes(stage) && (
                              <button
                                type="button"
                                onClick={() => setAssignJobState({ isOpen: true, vehicle: pf })}
                                className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 rounded-lg text-xs font-bold border border-indigo-200 dark:border-indigo-800/40 flex items-center gap-1 cursor-pointer"
                              >
                                <UserPlus size={12} /> Assign
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => setPendingDispatchVehicle(pf)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-xs cursor-pointer"
                            >
                              <Truck size={12} /> Dispatch
                            </button>

                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="p-1 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg text-gray-500 cursor-pointer">
                                  <ChevronDown size={15} />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => setEditRecord(pf)}>
                                  <Edit className="w-3.5 h-3.5 mr-2" /> Edit Details
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setHistoryRecord(pf)}>
                                  <History className="w-3.5 h-3.5 mr-2" /> Audit History
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

          {/* Table Footer Summary */}
          <div className="p-3.5 bg-gray-50 dark:bg-zinc-800/60 border-t border-gray-200 dark:border-zinc-800 flex items-center justify-between text-xs font-bold text-gray-600 dark:text-gray-300 flex-wrap gap-2">
            <div>
              Showing <span className="text-indigo-600 dark:text-indigo-400">{filteredPlatforms.length}</span> of {platformsList.length} vehicles
            </div>
            <div className="flex items-center gap-4">
              <span>Urgent: <strong className="text-red-600">{filteredPlatforms.filter((p: any) => (p.priority || "").toLowerCase() === "urgent").length}</strong></span>
              <span>Received: <strong className="text-blue-600">{filteredPlatforms.filter((p: any) => ["received", "incoming_verification", "supervisor_verification"].includes((p.currentStage || "").toLowerCase())).length}</strong></span>
              <span>Dispatched: <strong className="text-emerald-600">{filteredPlatforms.filter((p: any) => ["dispatch", "delivered"].includes((p.currentStage || "").toLowerCase())).length}</strong></span>
            </div>
          </div>
        </div>
      ) : (
        /* ─── DESKTOP VIEW 2: KANBAN BOARD ─── */
        <div className="hidden md:flex overflow-x-auto snap-x snap-mandatory hide-scrollbar pb-6 gap-4 -mx-4 px-4 h-[calc(100vh-280px)] min-h-[500px]">
          {columns.map((col) => {
            const columnVehicles = filteredPlatforms.filter((pf: any) => {
              const stage = pf.currentStage?.toLowerCase() === "readytodispatch" ? "rtd" : pf.currentStage?.toLowerCase() || "";
              return col.stages.includes(stage);
            });
            
            return (
              <div 
                key={col.id} 
                className={`snap-center shrink-0 w-[85vw] max-w-[340px] flex flex-col rounded-[24px] border ${col.color} overflow-hidden`}
              >
                <div className="px-5 py-4 border-b border-inherit bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm sticky top-0 z-10 flex justify-between items-center">
                  <h3 className="font-extrabold text-gray-900 dark:text-white">{col.title}</h3>
                  <Badge variant="secondary" className="bg-white dark:bg-zinc-800 rounded-full font-bold">
                    {columnVehicles.length}
                  </Badge>
                </div>
                
                <div className="flex-1 overflow-y-auto p-3 space-y-3 hide-scrollbar">
                  {columnVehicles.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-center p-6 text-gray-400">
                      <CarFront size={32} className="mb-2 opacity-20" />
                      <p className="text-sm font-medium">No vehicles</p>
                    </div>
                  ) : (
                    columnVehicles.map((pf: any, idx: number) => {
                      const workerCount = pf.assignedWorkerIds?.length || pf.workers?.length || 0;
                      const stage = pf.currentStage?.toLowerCase() || "";
                      const isCompleted = ["rtd", "dispatch", "delivered", "readytodispatch"].includes(stage);
                      const chassis = pf.chassisNumber || pf.vin || "-";
                      
                      return (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          key={pf.id} 
                          className="bg-white dark:bg-zinc-900 rounded-[20px] p-4 shadow-sm border border-gray-100 dark:border-zinc-800 space-y-2.5"
                        >
                          {/* Top Badges */}
                          <div className="flex justify-between items-start">
                            <div>
                              <Badge variant="outline" className="mb-1.5 bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] uppercase font-bold px-2 py-0.5">
                                {pf.currentStage || "Pending"}
                              </Badge>
                              <h3 
                                onClick={() => router.push(`/vehicle/${pf.id}`)}
                                className="font-extrabold text-base leading-tight text-indigo-600 dark:text-indigo-400 hover:underline cursor-pointer"
                              >
                                {pf.platformNumber || pf.trackingId}
                              </h3>
                              <p className="text-xs text-gray-800 dark:text-gray-200 font-bold mt-0.5">{pf.vehicleNumber || pf.vehicleModel}</p>
                              <p className="text-[11px] text-gray-500 font-medium">{pf.oemName} • {pf.productCategory || "Cargo Box"}</p>
                            </div>
                            <PriorityBadge priority={pf.priority || "normal"} showLabel={false} />
                          </div>

                          {/* Chassis & Dealer Details */}
                          <div className="bg-gray-50 dark:bg-zinc-800/60 p-2 rounded-xl text-[11px] space-y-1 border border-gray-100 dark:border-zinc-800">
                            <div className="flex justify-between items-center">
                              <span className="text-gray-400 font-medium">Chassis / VIN:</span>
                              <span className="font-mono font-bold text-gray-800 dark:text-gray-200">{chassis}</span>
                            </div>
                            {pf.dealerName && (
                              <div className="flex justify-between items-center">
                                <span className="text-gray-400 font-medium">Dealer:</span>
                                <span className="font-semibold text-gray-700 dark:text-gray-300 truncate max-w-[150px]">{pf.dealerName}</span>
                              </div>
                            )}
                          </div>
                          
                          {/* Progress bar */}
                          <div className="pt-2 border-t border-gray-100 dark:border-zinc-800">
                            <div className="flex justify-between items-center text-[10px] font-bold mb-1.5">
                              <span className="text-gray-600 flex items-center gap-1">
                                <Users size={11} /> 
                                {workerCount} {workerCount === 1 ? 'Worker' : 'Workers'}
                              </span>
                              <span className="text-indigo-600">{pf.progressPercent || 0}%</span>
                            </div>
                            
                            <div className="w-full bg-gray-100 dark:bg-zinc-800 h-1.5 rounded-full overflow-hidden mb-3">
                              <div 
                                className={`h-full rounded-full transition-all duration-500 ${isCompleted ? 'bg-emerald-500' : 'bg-indigo-600'}`} 
                                style={{ width: `${pf.progressPercent || 0}%` }}
                              />
                            </div>
                            
                            {/* Card Actions */}
                            <div className="space-y-1.5">
                              {(!isCompleted && ["oem", "incoming_verification", "supervisor_verification"].includes(stage)) && (
                                <button
                                  onClick={() => setVerifyState({ isOpen: true, vehicle: pf })}
                                  className="w-full flex items-center justify-center gap-1.5 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                                >
                                  <CheckCircle2 size={13} />
                                  Verify Gate Entry
                                </button>
                              )}

                              <div className="flex items-center gap-1.5">
                                <button
                                  onClick={() => router.push(`/vehicle/${pf.id}`)}
                                  className="flex-1 flex items-center justify-center gap-1 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:text-gray-200 text-gray-700 px-2 py-1.5 rounded-xl text-xs font-bold transition-colors cursor-pointer"
                                >
                                  <Eye size={12} /> View
                                </button>

                                {(!isCompleted && !["oem", "incoming_verification", "supervisor_verification", "rejected"].includes(stage)) && (
                                  <button
                                    onClick={() => setAssignJobState({ isOpen: true, vehicle: pf })}
                                    className="flex-1 flex items-center justify-center gap-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 px-2 py-1.5 rounded-xl text-xs font-bold border border-indigo-200 dark:border-indigo-800/40 transition-colors cursor-pointer"
                                  >
                                    <UserPlus size={12} /> Assign
                                  </button>
                                )}

                                <button
                                  onClick={() => setPendingDispatchVehicle(pf)}
                                  className="flex-1 flex items-center justify-center gap-1 bg-emerald-600 hover:bg-emerald-700 text-white px-2 py-1.5 rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                                >
                                  <Truck size={12} /> Dispatch
                                </button>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── MODALS & DRAWERS ─── */}
      {showAddModal && (
        <AddVehicleDialog
          onClose={() => setShowAddModal(false)}
          onAdd={(data) => createVehicleMutation.mutate(data)}
          isOemSubmission={false}
        />
      )}

      <AssignJobDialog 
        vehicle={assignJobState.vehicle} 
        open={assignJobState.isOpen}
        stage={assignJobState.vehicle?.currentStage || ""}
        workers={workers}
        onClose={() => setAssignJobState({ isOpen: false, vehicle: null })} 
        onAssignComplete={() => setAssignJobState({ isOpen: false, vehicle: null })}
      />

      <GateEntryDrawer 
        vehicle={verifyState.vehicle}
        open={verifyState.isOpen}
        onOpenChange={(open) => setVerifyState({ isOpen: open, vehicle: open ? verifyState.vehicle : null })}
        onVerificationComplete={() => {
          setVerifyState({ isOpen: false, vehicle: null });
          queryClient.invalidateQueries({ queryKey: ["vehicles"] });
        }}
      />

      <DispatchVehicleDialog
        open={!!pendingDispatchVehicle}
        onOpenChange={(open) => !open && setPendingDispatchVehicle(null)}
        vehicle={pendingDispatchVehicle}
        onSubmit={handleFinalDispatchSubmit}
        isSubmitting={updateVehicleMutation.isPending}
      />

      {/* Edit Record Dialog */}
      {editRecord && (
        <EditRecordDialog
          open={!!editRecord}
          onOpenChange={(open) => !open && setEditRecord(null)}
          title={`Edit Vehicle: ${editRecord.trackingId || editRecord.platformNumber || editRecord.vehicleNumber}`}
          fields={VEHICLE_EDIT_FIELDS}
          initialValues={{
            vehicleNumber: editRecord.vehicleNumber || "",
            chassisNumber: editRecord.chassisNumber || editRecord.vin || "",
            oemName: editRecord.oemName || "",
            vehicleModel: editRecord.vehicleModel || "",
            dealerName: editRecord.dealerName || "",
            productCategory: editRecord.productCategory || "",
            driverName: editRecord.driverName || "",
            driverMobileNumber: editRecord.driverMobileNumber || "",
            truckNumber: editRecord.truckNumber || "",
            transportCompany: editRecord.transportCompany || "",
            dispatchChallanNumber: editRecord.dispatchChallanNumber || "",
            invoiceNumber: editRecord.invoiceNumber || "",
            lrNumber: editRecord.lrNumber || "",
            priority: (editRecord.priority || "normal").toLowerCase(),
          }}
          onSubmit={handleEditRecordSubmit}
          isSubmitting={updateVehicleMutation.isPending}
        />
      )}

      {/* Audit History Drawer */}
      <AuditHistoryDrawer
        open={!!historyRecord}
        onOpenChange={(open) => !open && setHistoryRecord(null)}
        recordId={historyRecord?.id}
        module="vehicles"
        title={`Audit History: ${historyRecord?.trackingId || historyRecord?.vehicleNumber || historyRecord?.id}`}
      />

      {/* Select Vehicle For Dispatch Modal */}
      <Dialog open={showSelectDispatchModal} onOpenChange={setShowSelectDispatchModal}>
        <DialogContent className="max-w-md w-[95vw] rounded-2xl p-6">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-xl font-extrabold flex items-center gap-2 text-emerald-700 dark:text-emerald-400">
              <Truck size={22} />
              Dispatch Vehicle
            </DialogTitle>
            <p className="text-xs text-gray-500 font-medium mt-1">
              Select a vehicle from production to complete dispatch details.
            </p>
          </DialogHeader>

          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <Input
              placeholder="Search vehicle number, chassis or ID..."
              value={dispatchSearchQuery}
              onChange={(e) => setDispatchSearchQuery(e.target.value)}
              className="pl-9 h-10 rounded-xl bg-gray-50 dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 text-xs"
            />
          </div>

          <div className="max-h-[350px] overflow-y-auto space-y-2 pr-1 hide-scrollbar">
            {dispatchCandidateVehicles.length === 0 ? (
              <div className="text-center py-8 text-gray-400">
                <CarFront size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-xs font-semibold">No active vehicles available for dispatch</p>
              </div>
            ) : (
              dispatchCandidateVehicles.map((vehicle: any) => {
                const stage = (vehicle.currentStage || "").toLowerCase();
                const isRtd = stage === "rtd" || stage === "readytodispatch";
                return (
                  <div
                    key={vehicle.id}
                    className={`p-3 rounded-xl border flex justify-between items-center transition-all ${
                      isRtd
                        ? "bg-emerald-50/50 border-emerald-200 dark:bg-emerald-950/20 dark:border-emerald-900/40"
                        : "bg-white border-gray-100 dark:bg-zinc-900 dark:border-zinc-800"
                    }`}
                  >
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-extrabold text-sm text-gray-900 dark:text-white">
                          {vehicle.platformNumber || vehicle.trackingId}
                        </span>
                        <Badge
                          variant="outline"
                          className={`text-[9px] uppercase font-bold px-1.5 py-0.2 ${
                            isRtd
                              ? "bg-emerald-100 text-emerald-800 border-emerald-300"
                              : "bg-gray-100 text-gray-700 border-gray-200"
                          }`}
                        >
                          {isRtd ? "Ready to Dispatch" : vehicle.currentStage || "In Production"}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-700 dark:text-gray-300 font-semibold">
                        {vehicle.vehicleNumber || vehicle.vehicleModel}
                      </p>
                      <p className="text-[11px] text-gray-400 font-mono">
                        Chassis: {vehicle.chassisNumber || vehicle.vin || "-"}
                      </p>
                      <p className="text-[11px] text-gray-400">{vehicle.oemName}</p>
                    </div>

                    <button
                      onClick={() => {
                        setShowSelectDispatchModal(false);
                        setPendingDispatchVehicle(vehicle);
                      }}
                      className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-xs cursor-pointer"
                    >
                      <Truck size={13} />
                      Dispatch
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
