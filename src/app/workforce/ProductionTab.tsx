import React, { useState, useMemo, useEffect } from "react";
import { format } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { vehiclesApi } from "@/lib/api";
import { 
  CarFront, Clock, CheckCircle2, AlertCircle, ChevronRight, ChevronDown, 
  Users, Settings2, Search, Plus, UserPlus, Truck, FileSpreadsheet, Download, 
  LayoutGrid, Filter, Calendar as CalendarIcon, X, Tag, Inbox, Eye, ArrowUpDown, ShieldCheck
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { AddVehicleDialog } from "@/components/vehicles/AddVehicleDialog";
import { AssignJobDialog } from "@/components/vehicles/AssignJobDialog";
import { GateEntryDrawer } from "@/components/vehicles/GateEntryDrawer";
import { DispatchVehicleDialog, type DispatchFormValues } from "@/components/vehicles/DispatchVehicleDialog";
import { useCreateVehicle, useVerifyVehicle, useWorkers, useUpdateVehicleStage, useUpdateVehicle } from "@/hooks/useQueries";
import { exportToCSV, exportToExcel } from "../(dashboard)/reports/components/exportUtils";
import { isDateInFilterRange, formatFilterLabel } from "../(dashboard)/reports/components/dateFilterUtils";
import { PriorityBadge } from "@/components/ui/PriorityBadge";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ProductionTabProps {
  activeUser: any;
  initialStage?: string;
  initialViewMode?: "kanban" | "table";
}

export function ProductionTab({ activeUser, initialStage = "all", initialViewMode = "kanban" }: ProductionTabProps) {
  const [viewMode, setViewMode] = useState<"kanban" | "table">(initialViewMode);
  const [searchQuery, setSearchQuery] = useState("");
  const [stageFilter, setStageFilter] = useState<string>(initialStage);
  const [priorityFilter, setPriorityFilter] = useState<string>("all");
  const [oemFilter, setOemFilter] = useState<string>("All OEMs");
  const [dateRange, setDateRange] = useState<string>("All Time");
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [addModalMode, setAddModalMode] = useState<"received" | "standard">("standard");
  const [showSelectDispatchModal, setShowSelectDispatchModal] = useState(false);
  const [dispatchSearchQuery, setDispatchSearchQuery] = useState("");
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
    if (initialStage) setStageFilter(initialStage);
    if (initialViewMode) setViewMode(initialViewMode);
  }, [initialStage, initialViewMode]);

  const createVehicleMutation = useCreateVehicle();
  const verifyVehicleMutation = useVerifyVehicle();
  const updateStageMutation = useUpdateVehicleStage();
  const updateVehicleMutation = useUpdateVehicle();
  const { data: workersData } = useWorkers();

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
          dispatch_date_time: values.dispatchDateTime,
          remarks: values.remarks,
        },
      },
      {
        onSuccess: () => {
          toast.success(
            `Vehicle ${pendingDispatchVehicle.platformNumber || pendingDispatchVehicle.trackingId || pendingDispatchVehicle.vehicleNumber || ""} dispatched successfully!`
          );
          setPendingDispatchVehicle(null);
        },
        onError: (err: any) => {
          toast.error(err?.response?.data?.detail || "Failed to dispatch vehicle");
        },
      }
    );
  };

  const { data: platforms = [], isLoading } = useQuery({
    queryKey: ["vehicles"],
    queryFn: () => vehiclesApi.getAll(),
    refetchInterval: 30000,
  });

  const platformsList = useMemo(() => {
    if (Array.isArray(platforms)) return platforms;
    if (platforms && Array.isArray((platforms as any).items)) return (platforms as any).items;
    if (platforms && Array.isArray((platforms as any).data)) return (platforms as any).data;
    return [];
  }, [platforms]);

  const oemList = useMemo(() => {
    const set = new Set<string>();
    platformsList.forEach((p: any) => {
      if (p.oemName) set.add(p.oemName);
    });
    return ["All OEMs", ...Array.from(set)];
  }, [platformsList]);

  // Main Filtered Dataset for Excel Table & Kanban Views
  const filteredPlatforms = useMemo(() => {
    let list = platformsList;

    // Search query filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((p: any) => 
        (p.platformNumber || p.trackingId || "").toLowerCase().includes(q) ||
        (p.vehicleNumber || p.vehicleModel || "").toLowerCase().includes(q) ||
        (p.oemName || "").toLowerCase().includes(q) ||
        (p.productCategory || "").toLowerCase().includes(q) ||
        (p.currentStage || "").toLowerCase().includes(q)
      );
    }

    // Stage filter
    if (stageFilter && stageFilter !== "all") {
      const sf = stageFilter.toLowerCase();
      list = list.filter((p: any) => {
        const curr = (p.currentStage || "").toLowerCase();
        if (sf === "received") return curr === "received" || curr === "incoming_verification" || curr === "supervisor_verification";
        if (sf === "dispatch" || sf === "rtd") return curr === "dispatch" || curr === "rtd" || curr === "readytodispatch" || curr === "delivered";
        if (sf === "in_assembly") return ["fabrication", "paint", "quality"].includes(curr);
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
      list = list.filter((p: any) => (p.oemName || "").toLowerCase() === oemFilter.toLowerCase());
    }

    // Date range filter
    if (dateRange && dateRange !== "All Time") {
      list = list.filter((p: any) => {
        const dt = p.createdAt || p.receivedAt || p.date;
        return dt ? isDateInFilterRange(dt, dateRange) : true;
      });
    }

    return list;
  }, [platformsList, searchQuery, stageFilter, priorityFilter, oemFilter, dateRange]);

  const dispatchCandidateVehicles = useMemo(() => {
    let list = platformsList.filter((v: any) => (v.currentStage || "").toLowerCase() !== "delivered");
    if (dispatchSearchQuery) {
      const q = dispatchSearchQuery.toLowerCase().trim();
      list = list.filter((v: any) =>
        (v.platformNumber || v.trackingId || "").toLowerCase().includes(q) ||
        (v.vehicleNumber || v.vehicleModel || "").toLowerCase().includes(q) ||
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

  // Export handlers
  const handleExportExcel = () => {
    if (filteredPlatforms.length === 0) return toast.error("No vehicle records to export");
    const exportData = filteredPlatforms.map((p: any) => ({
      "Platform Number / ID": p.platformNumber || p.trackingId || "",
      "Vehicle Model": p.vehicleNumber || p.vehicleModel || "",
      "OEM Name": p.oemName || "",
      "Category": p.productCategory || "",
      "Stage": p.currentStage || "Pending",
      "Priority": p.priority || "Normal",
      "Progress %": `${p.progressPercent || 0}%`,
      "Workers Assigned": (p.assignedWorkerIds || p.workers || []).length,
      "Received Date": p.createdAt ? format(new Date(p.createdAt), "yyyy-MM-dd HH:mm") : "",
      "Transport / Driver": p.driverName ? `${p.driverName} (${p.truckNumber || ""})` : ""
    }));
    exportToExcel("Production_Board_Vehicles", Object.keys(exportData[0]), exportData);
  };

  const handleExportCSV = () => {
    if (filteredPlatforms.length === 0) return toast.error("No vehicle records to export");
    const exportData = filteredPlatforms.map((p: any) => ({
      "Platform Number / ID": p.platformNumber || p.trackingId || "",
      "Vehicle Model": p.vehicleNumber || p.vehicleModel || "",
      "OEM Name": p.oemName || "",
      "Category": p.productCategory || "",
      "Stage": p.currentStage || "Pending",
      "Priority": p.priority || "Normal",
      "Progress %": `${p.progressPercent || 0}%`,
      "Workers Assigned": (p.assignedWorkerIds || p.workers || []).length,
      "Received Date": p.createdAt ? format(new Date(p.createdAt), "yyyy-MM-dd HH:mm") : "",
      "Transport / Driver": p.driverName ? `${p.driverName} (${p.truckNumber || ""})` : ""
    }));
    exportToCSV("Production_Board_Vehicles", Object.keys(exportData[0]), exportData);
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
    <div className="p-4 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header & View Switcher */}
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-extrabold text-gray-900 dark:text-white">Production Board</h2>
            {stageFilter !== "all" && (
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/30 uppercase text-[10px] font-bold">
                Filter: {stageFilter}
              </Badge>
            )}
          </div>
          <p className="text-sm text-gray-500 font-medium">Track vehicle assembly stages & full production excel view</p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* View Mode Toggle Switch */}
          <div className="bg-gray-100 dark:bg-zinc-800 p-1 rounded-xl flex items-center border border-gray-200 dark:border-zinc-700">
            <button
              type="button"
              onClick={() => setViewMode("kanban")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all",
                viewMode === "kanban" 
                  ? "bg-white dark:bg-zinc-900 text-primary shadow-sm" 
                  : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
              )}
            >
              <LayoutGrid size={14} />
              Kanban Board
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all",
                viewMode === "table" 
                  ? "bg-emerald-600 text-white shadow-sm" 
                  : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
              )}
            >
              <FileSpreadsheet size={14} />
              Excel / Table View
            </button>
          </div>

          <button
            onClick={() => {
              setAddModalMode("received");
              setShowAddModal(true);
            }}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-md transition-colors"
          >
            <Plus size={16} />
            Receive New
          </button>
          <button
            onClick={() => setShowSelectDispatchModal(true)}
            className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-md transition-colors"
          >
            <Truck size={16} />
            Dispatch Vehicle
          </button>
        </div>
      </div>

      {/* Filter Control Bar */}
      <div className="bg-white dark:bg-zinc-900 p-4 rounded-2xl border border-gray-200 dark:border-zinc-800 shadow-sm mb-6 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search Bar */}
          <div className="relative lg:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={16} />
            <Input 
              placeholder="Search Platform ID, Vehicle, OEM..." 
              className="pl-9 bg-gray-50 dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 rounded-xl h-10 text-xs"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Stage Filter Dropdown */}
          <div>
            <select
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value)}
              className="w-full h-10 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-3 text-xs font-semibold text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="all">All Production Stages</option>
              <option value="received">Received / Incoming</option>
              <option value="in_assembly">In Assembly (Fab/Paint/QA)</option>
              <option value="fabrication">Fabrication</option>
              <option value="paint">Paint</option>
              <option value="quality">Quality</option>
              <option value="rtd">Ready to Dispatch (RTD)</option>
              <option value="dispatch">Dispatch / Delivered</option>
              <option value="supervisor_verification">Supervisor Verification</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>

          {/* Priority Filter Dropdown */}
          <div>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="w-full h-10 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-3 text-xs font-semibold text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="all">All Priorities</option>
              <option value="urgent">Urgent Priority</option>
              <option value="high">High Priority</option>
              <option value="medium">Medium Priority</option>
              <option value="normal">Normal Priority</option>
            </select>
          </div>

          {/* Date Range Dropdown */}
          <div>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full h-10 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl px-3 text-xs font-semibold text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              <option value="All Time">All Time</option>
              <option value="Today">Today</option>
              <option value="Yesterday">Yesterday</option>
              <option value="This Week">This Week</option>
              <option value="This Month">This Month</option>
            </select>
          </div>
        </div>

        {/* Secondary Filter & Export Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-zinc-800/80 flex-wrap gap-2">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Active filter pills */}
            {stageFilter !== "all" && (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-primary/10 text-primary border border-primary/20">
                Stage: {stageFilter}
                <button type="button" onClick={() => setStageFilter("all")} className="hover:text-primary/60">
                  <X size={12} />
                </button>
              </span>
            )}
            {priorityFilter !== "all" && (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-destructive/10 text-destructive border border-destructive/20">
                Priority: {priorityFilter}
                <button type="button" onClick={() => setPriorityFilter("all")} className="hover:text-destructive/60">
                  <X size={12} />
                </button>
              </span>
            )}
            {oemFilter !== "All OEMs" && (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                OEM: {oemFilter}
                <button type="button" onClick={() => setOemFilter("All OEMs")} className="hover:text-blue-600">
                  <X size={12} />
                </button>
              </span>
            )}
            {dateRange !== "All Time" && (
              <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20">
                Date: {dateRange}
                <button type="button" onClick={() => setDateRange("All Time")} className="hover:text-amber-600">
                  <X size={12} />
                </button>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleExportExcel}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 dark:hover:bg-emerald-900/60 rounded-xl text-xs font-bold border border-emerald-200 dark:border-emerald-800/40 transition-colors shadow-sm cursor-pointer"
            >
              <FileSpreadsheet size={14} className="text-emerald-600 dark:text-emerald-400" />
              Export Excel (.xlsx)
            </button>
            <button
              type="button"
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 hover:bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-gray-300 dark:hover:bg-zinc-700 rounded-xl text-xs font-bold border border-gray-200 dark:border-zinc-700 transition-colors cursor-pointer"
            >
              <Download size={14} />
              CSV
            </button>
          </div>
        </div>
      </div>

      {/* ─── VIEW 1: EXCEL / TABLE VIEW ─── */}
      {viewMode === "table" ? (
        <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="bg-gray-50/80 dark:bg-zinc-800/80 border-b border-gray-200 dark:border-zinc-800 text-[11px] font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  <th className="p-3.5 pl-4">Platform / Tracking ID</th>
                  <th className="p-3.5">Vehicle Model</th>
                  <th className="p-3.5">OEM & Category</th>
                  <th className="p-3.5">Current Stage</th>
                  <th className="p-3.5">Priority</th>
                  <th className="p-3.5">Assigned Workers</th>
                  <th className="p-3.5">Progress</th>
                  <th className="p-3.5 pr-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-zinc-800 text-xs">
                {filteredPlatforms.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-12 text-gray-400">
                      <CarFront size={40} className="mx-auto mb-2 opacity-25" />
                      <p className="text-sm font-semibold">No vehicles found matching current filters</p>
                      <button
                        type="button"
                        onClick={() => {
                          setSearchQuery("");
                          setStageFilter("all");
                          setPriorityFilter("all");
                          setOemFilter("All OEMs");
                          setDateRange("All Time");
                        }}
                        className="mt-2 text-xs text-primary font-bold hover:underline"
                      >
                        Reset All Filters
                      </button>
                    </td>
                  </tr>
                ) : (
                  filteredPlatforms.map((pf: any) => {
                    const workerCount = pf.assignedWorkerIds?.length || pf.workers?.length || 0;
                    const stage = (pf.currentStage || "").toLowerCase();
                    const isCompleted = ["rtd", "dispatch", "delivered", "readytodispatch"].includes(stage);

                    return (
                      <tr key={pf.id} className="hover:bg-gray-50/50 dark:hover:bg-zinc-800/40 transition-colors">
                        <td className="p-3.5 pl-4 font-extrabold text-gray-900 dark:text-white">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center font-black shrink-0">
                              <CarFront size={16} />
                            </div>
                            <div>
                              <div className="font-extrabold text-gray-900 dark:text-white">
                                {pf.platformNumber || pf.trackingId}
                              </div>
                              <div className="text-[10px] text-gray-400 font-mono">
                                {pf.createdAt ? format(new Date(pf.createdAt), "dd MMM yyyy") : ""}
                              </div>
                            </div>
                          </div>
                        </td>

                        <td className="p-3.5 font-bold text-gray-800 dark:text-gray-200">
                          {pf.vehicleNumber || pf.vehicleModel || "N/A"}
                        </td>

                        <td className="p-3.5">
                          <div className="font-semibold text-gray-700 dark:text-gray-300">{pf.oemName || "Fox Motors"}</div>
                          <div className="text-[10px] text-gray-400">{pf.productCategory || "Cargo Box"}</div>
                        </td>

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

                        <td className="p-3.5">
                          <PriorityBadge priority={pf.priority || "normal"} />
                        </td>

                        <td className="p-3.5 font-semibold">
                          <div className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-300">
                            <Users size={13} className="text-gray-400" />
                            <span>{workerCount} worker(s)</span>
                          </div>
                        </td>

                        <td className="p-3.5 w-36">
                          <div className="flex items-center justify-between text-[11px] font-bold mb-1">
                            <span className="text-gray-500">{pf.progressPercent || 0}%</span>
                          </div>
                          <div className="w-full bg-gray-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden">
                            <div 
                              className={cn(
                                "h-full rounded-full transition-all duration-300",
                                isCompleted ? "bg-green-500" : "bg-indigo-500"
                              )} 
                              style={{ width: `${pf.progressPercent || 0}%` }}
                            />
                          </div>
                        </td>

                        <td className="p-3.5 pr-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Verification Button */}
                            {["oem", "incoming_verification", "supervisor_verification"].includes(stage) && (
                              <button
                                type="button"
                                onClick={() => setVerifyState({ isOpen: true, vehicle: pf })}
                                className="px-2.5 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-sm"
                              >
                                <CheckCircle2 size={13} /> Verify
                              </button>
                            )}

                            {/* Dispatch Button */}
                            {(stage === "rtd" || stage === "readytodispatch") && (
                              <button
                                type="button"
                                onClick={() => setPendingDispatchVehicle(pf)}
                                className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1 shadow-sm"
                              >
                                <Truck size={13} /> Dispatch
                              </button>
                            )}

                            {/* Assign Job Button */}
                            {!["oem", "incoming_verification", "supervisor_verification", "rejected"].includes(stage) && (
                              <button
                                type="button"
                                onClick={() => setAssignJobState({ isOpen: true, vehicle: pf })}
                                className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 rounded-lg text-xs font-bold border border-indigo-200 dark:border-indigo-800/40 transition-colors flex items-center gap-1"
                              >
                                <UserPlus size={13} /> Assign
                              </button>
                            )}

                            {/* Change Stage Dropdown */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button className="p-1.5 hover:bg-gray-100 dark:hover:bg-zinc-800 rounded-lg text-gray-500 transition-colors">
                                  <ChevronDown size={16} />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {["Received", "Fabrication", "Paint", "Ready-to-Dispatch", "Dispatch", "Delivered"].map(stageLabel => {
                                  const stageMap: Record<string, string> = {
                                    "Received": "received",
                                    "Fabrication": "fabrication",
                                    "Paint": "paint",
                                    "Ready-to-Dispatch": "rtd",
                                    "Dispatch": "dispatch",
                                    "Delivered": "delivered"
                                  };
                                  return (
                                    <DropdownMenuItem 
                                      key={stageLabel}
                                      onClick={() => {
                                        const targetStage = stageMap[stageLabel];
                                        if (targetStage === "dispatch" || targetStage === "delivered") {
                                          setPendingDispatchVehicle(pf);
                                          return;
                                        }
                                        let progress = 0;
                                        if (targetStage === "received") progress = 0;
                                        else if (targetStage === "fabrication") progress = 30;
                                        else if (targetStage === "paint") progress = 60;
                                        else if (targetStage === "rtd") progress = 90;
                                        updateStageMutation.mutate({ id: pf.id, stage: targetStage, progress });
                                      }}
                                    >
                                      Change to {stageLabel}
                                    </DropdownMenuItem>
                                  );
                                })}
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
          <div className="p-4 bg-gray-50 dark:bg-zinc-800/60 border-t border-gray-200 dark:border-zinc-800 flex items-center justify-between text-xs font-bold text-gray-600 dark:text-gray-300 flex-wrap gap-2">
            <div>
              Showing <span className="text-primary">{filteredPlatforms.length}</span> of {platformsList.length} vehicles
            </div>
            <div className="flex items-center gap-4">
              <span>Urgent: <strong className="text-red-600">{filteredPlatforms.filter((p: any) => (p.priority || "").toLowerCase() === "urgent").length}</strong></span>
              <span>Received: <strong className="text-blue-600">{filteredPlatforms.filter((p: any) => ["received", "incoming_verification", "supervisor_verification"].includes((p.currentStage || "").toLowerCase())).length}</strong></span>
              <span>Dispatched: <strong className="text-emerald-600">{filteredPlatforms.filter((p: any) => ["dispatch", "delivered"].includes((p.currentStage || "").toLowerCase())).length}</strong></span>
            </div>
          </div>
        </div>
      ) : (
        /* ─── VIEW 2: KANBAN BOARD ─── */
        <div className="flex overflow-x-auto snap-x snap-mandatory hide-scrollbar pb-6 gap-4 -mx-4 px-4 h-[calc(100vh-280px)] min-h-[500px]">
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
                      
                      return (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: idx * 0.05 }}
                          key={pf.id} 
                          className="bg-white dark:bg-zinc-900 rounded-[20px] p-4 shadow-sm border border-gray-100 dark:border-zinc-800"
                        >
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <Badge variant="outline" className="mb-2 bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] uppercase font-bold px-2 py-0.5">
                                {pf.currentStage || "Pending"}
                              </Badge>
                              <h3 className="font-extrabold text-lg leading-tight">{pf.platformNumber || pf.trackingId}</h3>
                              <p className="text-sm text-gray-800 dark:text-gray-300 font-bold mt-1">{pf.vehicleNumber || pf.vehicleModel}</p>
                              <p className="text-xs text-gray-500 font-medium mt-0.5">{pf.oemName}</p>
                            </div>
                            {isCompleted ? (
                              <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center flex-shrink-0">
                                <CheckCircle2 size={16} />
                              </div>
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">
                                <Settings2 size={16} />
                              </div>
                            )}
                          </div>
                          
                          <div className="mt-4 pt-3 border-t border-gray-100 dark:border-zinc-800">
                            <div className="flex justify-between items-center text-[11px] font-bold mb-2">
                              <span className="text-gray-600 flex items-center gap-1.5">
                                <Users size={12} /> 
                                {workerCount} {workerCount === 1 ? 'Worker' : 'Workers'}
                              </span>
                              <span className="text-indigo-600">{pf.progressPercent || 0}%</span>
                            </div>
                            
                            <div className="w-full bg-gray-100 dark:bg-zinc-800 h-2 rounded-full overflow-hidden mb-3">
                              <div 
                                className={`h-full rounded-full transition-all duration-500 ${isCompleted ? 'bg-green-500' : 'bg-indigo-500'}`} 
                                style={{ width: `${pf.progressPercent || 0}%` }}
                              />
                            </div>
                            
                            {(!isCompleted && ["oem", "incoming_verification", "supervisor_verification"].includes(stage)) && (
                              <button
                                onClick={() => setVerifyState({ isOpen: true, vehicle: pf })}
                                className="w-full flex items-center justify-center gap-2 bg-green-500 hover:bg-green-600 text-white px-3 py-2 rounded-xl text-xs font-bold shadow-sm transition-colors"
                              >
                                <CheckCircle2 size={14} />
                                Verify
                              </button>
                            )}
                            
                            {(!isCompleted && !["oem", "incoming_verification", "supervisor_verification", "rejected"].includes(stage)) && (
                              <div className="w-full space-y-2">
                                {(stage === "rtd" || stage === "readytodispatch") && (
                                  <button
                                    onClick={() => setPendingDispatchVehicle(pf)}
                                    className="w-full flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-2 rounded-xl text-xs font-bold shadow-sm transition-colors"
                                  >
                                    <Truck size={14} />
                                    Dispatch Vehicle
                                  </button>
                                )}
                                <div className="w-full flex gap-2">
                                  <button
                                    onClick={() => setAssignJobState({ isOpen: true, vehicle: pf })}
                                    className="flex-1 flex items-center justify-center gap-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20 px-3 py-2 rounded-xl text-xs font-bold shadow-sm transition-colors border border-indigo-200 dark:border-indigo-500/30"
                                  >
                                    <UserPlus size={14} />
                                    Assign Job
                                  </button>
                                  
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <button 
                                        className="flex items-center justify-center gap-1 bg-gray-50 hover:bg-gray-100 text-gray-700 dark:bg-zinc-800 dark:text-gray-300 dark:hover:bg-zinc-700 px-3 py-2 rounded-xl text-xs font-bold shadow-sm transition-colors border border-gray-200 dark:border-zinc-700"
                                      >
                                        Stage <ChevronDown size={14} />
                                      </button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                      {["Received", "Fabrication", "Paint", "Ready-to-Dispatch", "Dispatch", "Delivered"].map(stageLabel => {
                                        const stageMap: Record<string, string> = {
                                          "Received": "received",
                                          "Fabrication": "fabrication",
                                          "Paint": "paint",
                                          "Ready-to-Dispatch": "rtd",
                                          "Dispatch": "dispatch",
                                          "Delivered": "delivered"
                                        };
                                        return (
                                          <DropdownMenuItem 
                                            key={stageLabel}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              const targetStage = stageMap[stageLabel];
                                              if (targetStage === "dispatch" || targetStage === "delivered") {
                                                setPendingDispatchVehicle(pf);
                                                return;
                                              }
                                              let progress = 0;
                                              if (targetStage === "received") progress = 0;
                                              else if (targetStage === "fabrication") progress = 30;
                                              else if (targetStage === "paint") progress = 60;
                                              else if (targetStage === "rtd") progress = 90;
                                              updateStageMutation.mutate({ id: pf.id, stage: targetStage, progress });
                                            }}
                                          >
                                            {stageLabel}
                                          </DropdownMenuItem>
                                        );
                                      })}
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              </div>
                            )}
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
        onVerificationComplete={() => setVerifyState({ isOpen: false, vehicle: null })}
      />

      <DispatchVehicleDialog
        open={!!pendingDispatchVehicle}
        onOpenChange={(open) => !open && setPendingDispatchVehicle(null)}
        vehicle={pendingDispatchVehicle}
        onSubmit={handleFinalDispatchSubmit}
        isSubmitting={updateVehicleMutation.isPending}
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
              placeholder="Search vehicle number or ID..."
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
                      <p className="text-[11px] text-gray-400">{vehicle.oemName}</p>
                    </div>

                    <button
                      onClick={() => {
                        setShowSelectDispatchModal(false);
                        setPendingDispatchVehicle(vehicle);
                      }}
                      className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-xs font-bold transition-colors shadow-sm cursor-pointer"
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
