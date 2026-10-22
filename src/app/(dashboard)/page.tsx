"use client";

import React, { useState, useMemo, useEffect } from "react";
import { KPICard } from "@/components/ui/KPICard";
import { PriorityBadge } from "@/components/ui/PriorityBadge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { cn, parseUTCDate } from "@/lib/utils";
import { useVehicles, useActivities, useWorkers } from "@/hooks/useQueries";
import { useUIStore } from "@/store/uiStore";
import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { VehicleLookupBottomSheet } from "@/components/vehicles/VehicleLookupBottomSheet";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  Factory,
  Inbox,
  Truck,
  Zap,
  Users,
  Clock,
  Boxes,
  Banknote,
  Receipt,
  FileBarChart,
  BarChart3,
  Building2,
  Bell,
  Settings,
  ChevronLeft,
  ChevronRight,
  Flame,
  Search,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import type { Vehicle, ActivityEvent, Stage } from "@/types";

interface AdminTabItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string; strokeWidth?: number }>;
  color: string;
  category: "core" | "workforce" | "finance" | "system";
  desc: string;
  isAction?: boolean;
}

// 8 most-used modules as defined in Option D reference
const mostUsedModules: AdminTabItem[] = [
  { label: "Production", href: "/production", icon: Factory, color: "bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/40", category: "core", desc: "Live shopfloor & Kanban" },
  { label: "Received", href: "/production/received", icon: Inbox, color: "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/40", category: "core", desc: "Vehicle intake & checks" },
  { label: "QC Check", href: "/quality-control", icon: CheckCircle2, color: "bg-teal-50 text-teal-600 border-teal-100 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-900/40", category: "core", desc: "Quality inspection" },
  { label: "Dispatch", href: "/dispatch", icon: Truck, color: "bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/40", category: "core", desc: "Gate pass & delivery" },
  { label: "Track 4-Digit", href: "#lookup", icon: Search, color: "bg-sky-50 text-sky-600 border-sky-100 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900/40", category: "core", desc: "Check dealer & dispatch status", isAction: true },
  { label: "Workers", href: "/workers", icon: Users, color: "bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900/40", category: "workforce", desc: "Active staff & skills" },
  { label: "Attendance", href: "/attendance", icon: Clock, color: "bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900/40", category: "workforce", desc: "Live biometric shifts" },
  { label: "Components", href: "/components", icon: Boxes, color: "bg-orange-50 text-orange-600 border-orange-100 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900/40", category: "workforce", desc: "BOM inventory & parts" },
];

const remainingModules: AdminTabItem[] = [
  { label: "Payroll", href: "/payroll", icon: Banknote, color: "bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/40", category: "workforce", desc: "Wages & overtime" },
  { label: "Sales Bill", href: "/revenue", icon: Banknote, color: "bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900/40", category: "finance", desc: "Customer tax invoices" },
  { label: "Purchases", href: "/invoices", icon: Receipt, color: "bg-sky-50 text-sky-600 border-sky-100 dark:bg-sky-950/40 dark:text-sky-300 dark:border-sky-900/40", category: "finance", desc: "Vendor invoices & bills" },
  { label: "Reports", href: "/reports", icon: FileBarChart, color: "bg-cyan-50 text-cyan-600 border-cyan-100 dark:bg-cyan-950/40 dark:text-cyan-300 dark:border-cyan-900/40", category: "finance", desc: "Audit logs & exports" },
  { label: "Analytics", href: "/analytics", icon: BarChart3, color: "bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/40", category: "system", desc: "Performance metrics" },
  { label: "Activity", href: "/activity-logs", icon: Activity, color: "bg-red-50 text-red-600 border-red-100 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900/40", category: "system", desc: "Real-time audit events" },
  { label: "OEM Portal", href: "/oem-portal", icon: Building2, color: "bg-indigo-50 text-indigo-700 border-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900/40", category: "system", desc: "Client self-service" },
  { label: "Alerts", href: "/notifications", icon: Bell, color: "bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/40", category: "system", desc: "Emergency notifications" },
  { label: "Settings", href: "/settings", icon: Settings, color: "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700/40", category: "system", desc: "Plant & system config" },
];

const adminMainTabs: AdminTabItem[] = [...mostUsedModules, ...remainingModules];

function getRelativeTime(timestamp: string) {
  try {
    const relTime = parseUTCDate(timestamp);
    const mins = Math.floor((Date.now() - relTime.getTime()) / 60000);
    if (isNaN(mins)) return timestamp;
    if (mins < 1) return "Just now";
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs} hr ago`;
    const days = Math.floor(hrs / 24);
    return `${days} d ago`;
  } catch {
    return timestamp;
  }
}

function parseMobileActivity(event: ActivityEvent) {
  const relTime = getRelativeTime(event.timestamp);
  let title = "Factory Event";
  let subtitle = event.description;
  let badgeText = "Logged";
  let badgeClass = "bg-muted text-muted-foreground border-border";
  let icon = Activity;
  let iconColor = "bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/40";

  const lowerDesc = (event.description || "").toLowerCase();
  const lowerType = (event.eventType || "").toLowerCase();

  if (lowerType.includes("received") || lowerDesc.includes("received") || lowerDesc.includes("intake")) {
    title = "Vehicle Received";
    badgeText = "Received";
    badgeClass = "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-900/40";
    icon = Truck;
    iconColor = "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/40";
  } else if (lowerType.includes("worker") || lowerDesc.includes("worker") || lowerDesc.includes("started") || lowerDesc.includes("checked in")) {
    title = "Worker Checked In";
    badgeText = "Present";
    badgeClass = "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-900/40";
    icon = Users;
    iconColor = "bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900/40";
  } else if (lowerType.includes("component") || lowerDesc.includes("component") || lowerDesc.includes("part")) {
    title = "Component Used";
    badgeText = "Issued";
    badgeClass = "bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-900/40";
    icon = Boxes;
    iconColor = "bg-orange-50 text-orange-600 border-orange-100 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900/40";
  } else if (lowerType.includes("qc") || lowerDesc.includes("qc") || lowerDesc.includes("quality")) {
    title = "QC Inspection";
    badgeText = lowerType.includes("failed") ? "Failed" : "Passed";
    badgeClass = lowerType.includes("failed")
      ? "bg-rose-50 text-rose-600 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-900/40"
      : "bg-emerald-50 text-emerald-600 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-900/40";
    icon = CheckCircle2;
    iconColor = "bg-teal-50 text-teal-600 border-teal-100 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-900/40";
  } else if (lowerType.includes("dispatch") || lowerDesc.includes("dispatch")) {
    title = "Vehicle Dispatched";
    badgeText = "Delivered";
    badgeClass = "bg-amber-50 text-amber-600 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-900/40";
    icon = Truck;
    iconColor = "bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/40";
  }

  return { title, subtitle, badgeText, badgeClass, icon, iconColor, relTime };
}

const STAGE_ORDER: Stage[] = [
  "received",
  "fabrication",
  "paint",
  "rtd",
  "dispatch",
];

const STAGE_LABELS: Partial<Record<Stage, string>> = {
  oem: "OEM Submitted",
  rejected: "Rejected",
  received: "Received",
  fabrication: "Fabrication",
  paint: "Paint",
  rtd: "Ready for Dispatch",
  dispatch: "Dispatched",
};

const STAGE_COLORS: Partial<Record<Stage, string>> = {
  oem: "bg-orange-500/10 text-orange-500 border-orange-500/20 hover:border-orange-500/40 hover:bg-orange-500/20",
  rejected: "bg-red-500/10 text-red-500 border-red-500/20 hover:border-red-500/40 hover:bg-red-500/20",
  received:
    "bg-muted text-muted-foreground border-border hover:border-primary/40 hover:bg-primary/5",
  fabrication:
    "bg-primary/10 text-primary border-primary/30 hover:bg-primary/15",
  paint: "bg-warning/10 text-warning border-warning/30 hover:bg-warning/15",
  rtd: "bg-success/10 text-success border-success/30 hover:bg-success/15",
  dispatch: "bg-muted/50 text-muted-foreground border-border/50 hover:bg-muted",
};

const EVENT_CONFIG: Record<
  string,
  { bg: string; icon: React.ReactNode; borderColor: string; pulse?: boolean }
> = {
  worker_started: {
    icon: <Factory size={11} />,
    bg: "bg-primary/15 text-primary",
    borderColor: "border-l-primary",
  },
  qc_passed: {
    icon: <CheckCircle2 size={11} />,
    bg: "bg-success/15 text-success",
    borderColor: "border-l-success",
  },
  qc_failed: {
    icon: <AlertTriangle size={11} />,
    bg: "bg-destructive/15 text-destructive",
    borderColor: "border-l-destructive",
  },
  vehicle_dispatched: {
    icon: <Truck size={11} />,
    bg: "bg-primary/10 text-primary",
    borderColor: "border-l-primary/60",
  },
  emergency_created: {
    icon: <Zap size={11} />,
    bg: "bg-destructive/15 text-destructive",
    borderColor: "border-l-destructive",
    pulse: true,
  },
  stage_changed: {
    icon: <Activity size={11} />,
    bg: "bg-warning/15 text-warning",
    borderColor: "border-l-warning",
  },
};


function ActivityItem({
  event,
  isNew,
}: { event: ActivityEvent; isNew?: boolean }) {
  const config = EVENT_CONFIG[event.eventType] ?? EVENT_CONFIG.stage_changed;
  const relTime = parseUTCDate(event.timestamp);
  const mins = Math.floor((Date.now() - relTime.getTime()) / 60000);
  const timeLabel =
    mins < 1
      ? "Just now"
      : mins < 60
        ? `${mins}m ago`
        : `${Math.floor(mins / 60)}h ago`;

  return (
    <motion.div
      initial={isNew ? { opacity: 0, x: 24 } : false}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className={cn(
        "flex gap-3 py-2.5 px-3 border-b border-border/40 hover:bg-muted/25 transition-smooth border-l-2",
        config.borderColor,
        event.eventType === "emergency_created" && "bg-destructive/5",
      )}
    >
      <div
        className={cn(
          "w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center mt-0.5",
          config.bg,
          event.eventType === "emergency_created" && "animate-pulse",
        )}
      >
        {config.icon}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-foreground line-clamp-2 leading-relaxed">
          {event.description}
        </p>
        <span className="text-[10px] text-muted-foreground mt-0.5 block">
          {timeLabel}
        </span>
      </div>
    </motion.div>
  );
}

export default function DashboardPage() {
  const { data: vehiclesData, isLoading: isLoadingVehicles } = useVehicles({ pageSize: 1000 });
  const vehicles = vehiclesData?.items ?? [];
  const { data: activities = [], isLoading: isLoadingActivities } = useActivities();
  const { data: workersData } = useWorkers();
  const workers = Array.isArray(workersData) ? workersData : (workersData?.items ?? []);
  const totalWorkersCount = workers.length > 0 ? workers.length : 25;

  const { searchQuery } = useUIStore();
  const { name } = useAuthStore();
  const adminName = name ? name.split(" ")[0] : "Admin";

  const [showAllModules, setShowAllModules] = useState(false);
  const [showVehicleLookup, setShowVehicleLookup] = useState(false);

  // Month navigation state for Production Flow (auto-aggregates daily counts)
  const getCurrentMonthKey = () => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  };

  const [selectedMonth, setSelectedMonth] = useState<string>(getCurrentMonthKey);
  const isCurrentMonth = selectedMonth === getCurrentMonthKey();

  const handlePrevMonth = () => {
    setSelectedMonth((prev) => {
      const [yearStr, monthStr] = prev.split("-");
      let year = parseInt(yearStr, 10);
      let month = parseInt(monthStr, 10) - 1;
      if (month < 1) {
        month = 12;
        year -= 1;
      }
      return `${year}-${String(month).padStart(2, "0")}`;
    });
  };

  const handleNextMonth = () => {
    setSelectedMonth((prev) => {
      const [yearStr, monthStr] = prev.split("-");
      let year = parseInt(yearStr, 10);
      let month = parseInt(monthStr, 10) + 1;
      if (month > 12) {
        month = 1;
        year += 1;
      }
      return `${year}-${String(month).padStart(2, "0")}`;
    });
  };

  const resetToCurrentMonth = () => {
    setSelectedMonth(getCurrentMonthKey());
  };

  const formatMonthDisplay = (ym: string) => {
    try {
      const [yearStr, monthStr] = ym.split("-");
      const d = new Date(parseInt(yearStr, 10), parseInt(monthStr, 10) - 1, 1);
      return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
    } catch {
      return ym;
    }
  };

  const getMonthKey = (dateStr?: string | null): string | null => {
    if (!dateStr) return null;
    const str = String(dateStr).trim();
    if (/^\d{4}-\d{2}/.test(str)) {
      return str.slice(0, 7);
    }
    try {
      const d = parseUTCDate(str);
      if (isNaN(d.getTime())) return null;
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    } catch {
      return null;
    }
  };

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash === "#lookup") {
      setShowVehicleLookup(true);
    }
  }, []);

  const isLoading = isLoadingVehicles || isLoadingActivities;

  // Filter vehicles by search query
  const filteredVehicles = vehicles.filter((v: Vehicle) => {
    if (!searchQuery) return true;
    const query = (searchQuery || "").toLowerCase();
    const vehicleNumber = (v.vehicleNumber || "").toLowerCase();
    const trackingId = (v.trackingId || "").toLowerCase();
    const oemName = (v.oemName || "").toLowerCase();
    return (
      vehicleNumber.includes(query) ||
      trackingId.includes(query) ||
      oemName.includes(query)
    );
  });

  // Group vehicles by stage
  const vehiclesByStage = STAGE_ORDER.reduce<Partial<Record<Stage, Vehicle[]>>>(
    (acc, stage) => {
      acc[stage] = filteredVehicles.filter((v: Vehicle) => {
        const s = (v.currentStage || "").toLowerCase().trim();
        if (stage === "dispatch") {
          return s === "dispatch" || s === "dispatched" || s === "delivered";
        }
        if (stage === "rtd") {
          return s === "rtd" || s === "readytodispatch";
        }
        if (stage === "received") {
          return s === "received" || s === "incoming_verification" || s === "supervisor_verification";
        }
        return s === (stage || "").toLowerCase();
      });
      return acc;
    },
    { oem: [], rejected: [], received: [], fabrication: [], paint: [], rtd: [], dispatch: [] }
  );

  // Compute month-wise stage statistics (daily numbers automatically accumulate)
  const monthlyStageStats = useMemo<Record<string, number>>(() => {
    const isCurrent = selectedMonth === getCurrentMonthKey();

    // 1. Received in selected month
    const received = filteredVehicles.filter((v: Vehicle) => {
      const m = getMonthKey(v.receivedAt) || getMonthKey(v.arrivalTime) || getMonthKey(v.submittedAt);
      return m === selectedMonth;
    });

    // 2. Dispatched in selected month
    const dispatch = filteredVehicles.filter((v: Vehicle) => {
      const s = (v.currentStage || "").toLowerCase().trim();
      const isDisp = s === "dispatch" || s === "dispatched" || s === "delivered";
      if (!isDisp) return false;
      const dMonth = getMonthKey(v.dispatchDateTime) || getMonthKey(v.receivedAt);
      return dMonth === selectedMonth;
    });

    // 3. Fabrication
    const fabrication = filteredVehicles.filter((v: Vehicle) => {
      const s = (v.currentStage || "").toLowerCase().trim();
      if (s !== "fabrication") return false;
      if (isCurrent) return true;
      return getMonthKey(v.receivedAt) === selectedMonth;
    });

    // 4. Paint
    const paint = filteredVehicles.filter((v: Vehicle) => {
      const s = (v.currentStage || "").toLowerCase().trim();
      if (s !== "paint") return false;
      if (isCurrent) return true;
      return getMonthKey(v.receivedAt) === selectedMonth;
    });

    // 5. Assembly (rtd)
    const rtd = filteredVehicles.filter((v: Vehicle) => {
      const s = (v.currentStage || "").toLowerCase().trim();
      if (s !== "rtd" && s !== "readytodispatch") return false;
      if (isCurrent) return true;
      return getMonthKey(v.receivedAt) === selectedMonth;
    });

    return {
      received: received.length,
      fabrication: fabrication.length,
      paint: paint.length,
      rtd: rtd.length,
      dispatch: dispatch.length,
    };
  }, [filteredVehicles, selectedMonth]);

  // Compute live KPI Stats
  const stats = {
    vehiclesReceived: vehicles.length,
    inFabrication: vehicles.filter((v: Vehicle) => (v.currentStage || "").toLowerCase() === "fabrication").length,
    inPaint: vehicles.filter((v: Vehicle) => (v.currentStage || "").toLowerCase() === "paint").length,
    readyToDispatch: vehicles.filter(
      (v: Vehicle) => {
        const stage = (v.currentStage || "").toLowerCase();
        return stage === "rtd" || stage === "readytodispatch";
      }
    ).length,
    dispatchToday: vehicles.filter(
      (v: Vehicle) => {
        const stage = (v.currentStage || "").toLowerCase();
        return stage === "dispatch" || stage === "dispatched";
      }
    ).length,
    delayedOrders: vehicles.filter(
      (v: Vehicle) => {
        const stage = (v.currentStage || "").toLowerCase();
        return (
          v.estimatedDelivery &&
          new Date(v.estimatedDelivery) < new Date() &&
          stage !== "dispatch" &&
          stage !== "dispatched"
        );
      }
    ).length,
    emergencyOrders: vehicles.filter(
      (v: Vehicle) => {
        const priority = (v.priority || "").toLowerCase();
        const stage = (v.currentStage || "").toLowerCase();
        return (
          priority === "urgent" &&
          stage !== "dispatch" &&
          stage !== "dispatched"
        );
      }
    ).length,
  };

  const onTimeRate = stats.vehiclesReceived > 0
    ? Math.max(0, Math.round(((stats.vehiclesReceived - stats.delayedOrders) / stats.vehiclesReceived) * 100))
    : 92;

  // Active in-plant vehicles (WIP currently physically inside the factory)
  const activeInPlantVehicles = useMemo(() => {
    return vehicles.filter((v: Vehicle) => {
      const s = (v.currentStage || "").toLowerCase().trim();
      return s !== "dispatch" && s !== "dispatched" && s !== "delivered";
    });
  }, [vehicles]);

  // Delayed vehicles requiring urgent manager action
  const delayedVehicles = useMemo(() => {
    return vehicles.filter((v: Vehicle) => {
      const stage = (v.currentStage || "").toLowerCase().trim();
      return (
        v.estimatedDelivery &&
        new Date(v.estimatedDelivery) < new Date() &&
        stage !== "dispatch" &&
        stage !== "dispatched" &&
        stage !== "delivered"
      );
    });
  }, [vehicles]);

  // Emergency priority vehicles
  const emergencyVehicles = useMemo(() => {
    return vehicles.filter((v: Vehicle) => {
      const priority = (v.priority || "").toLowerCase();
      const stage = (v.currentStage || "").toLowerCase().trim();
      return (
        priority === "urgent" &&
        stage !== "dispatch" &&
        stage !== "dispatched" &&
        stage !== "delivered"
      );
    });
  }, [vehicles]);

  // Live real-time physical counts at each stage
  const liveStageCounts = useMemo(() => {
    return {
      received: vehicles.filter((v: Vehicle) => {
        const s = (v.currentStage || "").toLowerCase().trim();
        return s === "received" || s === "incoming_verification" || s === "supervisor_verification";
      }).length,
      fabrication: vehicles.filter((v: Vehicle) => (v.currentStage || "").toLowerCase().trim() === "fabrication").length,
      paint: vehicles.filter((v: Vehicle) => (v.currentStage || "").toLowerCase().trim() === "paint").length,
      rtd: vehicles.filter((v: Vehicle) => {
        const s = (v.currentStage || "").toLowerCase().trim();
        return s === "rtd" || s === "readytodispatch";
      }).length,
      dispatch: vehicles.filter((v: Vehicle) => {
        const s = (v.currentStage || "").toLowerCase().trim();
        return s === "dispatch" || s === "dispatched" || s === "delivered";
      }).length,
    };
  }, [vehicles]);

  // Command Center Interactive State
  const [pipelineMode, setPipelineMode] = useState<"live" | "monthly">("live");
  const [selectedStageFilter, setSelectedStageFilter] = useState<string>("all");
  const [boardSearch, setBoardSearch] = useState<string>("");
  const [rightPanelTab, setRightPanelTab] = useState<"activity" | "delayed">("activity");

  // Computed vehicles to show in the active shopfloor queue
  const boardVehicles = useMemo(() => {
    let list = activeInPlantVehicles;
    if (selectedStageFilter === "delayed") {
      list = delayedVehicles;
    } else if (selectedStageFilter === "emergency") {
      list = emergencyVehicles;
    } else if (selectedStageFilter !== "all") {
      list = (vehiclesByStage[selectedStageFilter as Stage] || []).filter((v: Vehicle) => {
        const s = (v.currentStage || "").toLowerCase().trim();
        return s !== "dispatch" && s !== "dispatched" && s !== "delivered";
      });
    }

    if (boardSearch.trim()) {
      const q = boardSearch.toLowerCase().trim();
      list = list.filter((v: Vehicle) => {
        return (
          (v.vehicleNumber || "").toLowerCase().includes(q) ||
          (v.trackingId || "").toLowerCase().includes(q) ||
          (v.oemName || "").toLowerCase().includes(q) ||
          (v.chassisNumber || "").toLowerCase().includes(q) ||
          (v.vehicleModel || "").toLowerCase().includes(q)
        );
      });
    }
    return list;
  }, [activeInPlantVehicles, delayedVehicles, emergencyVehicles, vehiclesByStage, selectedStageFilter, boardSearch]);

  if (isLoading) {
    return (
      <div className="flex h-full">
        <div className="flex-1 min-w-0 overflow-y-auto p-4 md:p-6">
          <div className="mb-6">
            <Skeleton className="h-7 w-64 mb-2 rounded-lg" />
            <Skeleton className="h-4 w-96 rounded-lg" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map((k) => (
              <div
                key={k}
                className="bg-card border border-border/70 rounded-2xl p-5 flex flex-col gap-3 shadow-2xs"
              >
                <div className="flex justify-between items-center">
                  <Skeleton className="h-4 w-28 rounded-md" />
                  <Skeleton className="h-8 w-8 rounded-xl" />
                </div>
                <Skeleton className="h-8 w-20 rounded-lg" />
                <Skeleton className="h-3.5 w-full rounded-md" />
              </div>
            ))}
          </div>
          <div className="bg-card border border-border/70 rounded-2xl p-5 mb-6">
            <Skeleton className="h-5 w-44 mb-4 rounded-md" />
            <div className="grid grid-cols-5 gap-3">
              {[1, 2, 3, 4, 5].map((k) => (
                <Skeleton key={k} className="h-20 rounded-xl" />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
      className="flex md:h-[calc(100vh-3.5rem)] flex-col md:flex-row min-h-0 md:overflow-hidden"
    >
      {/* Main content */}
      <div className="flex-1 min-w-0 overflow-y-auto p-4 md:p-6 pb-24 md:pb-6">
        {/* DESKTOP PAGE HEADER */}
        <div className="hidden md:block">
          <PageHeader
            title="Factory Command Center"
            description={`Live manufacturing operations overview · ${new Date().toLocaleDateString("en-IN", {
              weekday: "long",
              day: "numeric",
              month: "short",
              year: "numeric",
            })}`}
            actions={
              <>
                {stats.emergencyOrders > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedStageFilter("emergency")}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 border border-rose-500/30 hover:bg-rose-500/20 rounded-lg transition-all cursor-pointer"
                    data-ocid="dashboard.emergency_alert"
                  >
                    <Zap size={14} className="text-rose-600 dark:text-rose-400" />
                    <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                      {stats.emergencyOrders} Emergency
                    </span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowVehicleLookup(true)}
                  className="flex items-center gap-1.5 px-3.5 py-1.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg text-xs font-bold transition-all active:scale-95 shadow-xs cursor-pointer"
                >
                  <Search size={13} strokeWidth={2.4} />
                  <span>Track Vehicle (4-Digit)</span>
                </button>
                {stats.delayedOrders > 0 && (
                  <button
                    type="button"
                    onClick={() => setSelectedStageFilter("delayed")}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 rounded-lg transition-all cursor-pointer"
                  >
                    <AlertTriangle size={13} className="text-amber-600 dark:text-amber-400" />
                    <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                      {stats.delayedOrders} Delayed
                    </span>
                  </button>
                )}
              </>
            }
          />
        </div>

        {/* MOBILE NATIVE APP VIEW (OPTION D COMPACT HOME UI REFERENCE) */}
        <div className="md:hidden space-y-3.5 mb-8">
          {/* 1. COMPACT WELCOME SECTION (OPTION D MATCH) */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-blue-50/70 via-sky-50/40 to-blue-100/60 dark:from-card dark:via-card dark:to-blue-950/20 border border-blue-100/80 dark:border-border/80 p-3.5 shadow-2xs min-h-[126px]">
            {/* Background Factory & Trucks Illustration - enlarged and strictly contained at bottom right */}
            <div className="absolute right-0 bottom-0 pointer-events-none select-none opacity-95 dark:opacity-35">
              <svg width="210" height="52" viewBox="0 0 168 42" fill="none" xmlns="http://www.w3.org/2000/svg">
                {/* Ground Baseline */}
                <line x1="0" y1="41" x2="168" y2="41" stroke="#CBD5E1" strokeWidth="1" />

                {/* Left Pine Trees */}
                <path d="M8 41 L12 32 L4 32 Z" fill="#059669" />
                <path d="M8 34 L11 26 L5 26 Z" fill="#10B981" />
                <path d="M16 41 L21 28 L11 28 Z" fill="#047857" />
                <path d="M16 31 L20 20 L12 20 Z" fill="#059669" />

                {/* Left Delivery Truck */}
                <rect x="23" y="21" width="20" height="16" rx="1.5" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="0.8" />
                <path d="M43 27 L49 27 L51 31 L51 37 L43 37 Z" fill="#60A5FA" />
                <rect x="45" y="28" width="4" height="4" rx="0.5" fill="#DBEAFE" />
                <circle cx="28" cy="38.5" r="2.5" fill="#1E293B" />
                <circle cx="28" cy="38.5" r="1" fill="#94A3B8" />
                <circle cx="47" cy="38.5" r="2.5" fill="#1E293B" />
                <circle cx="47" cy="38.5" r="1" fill="#94A3B8" />

                {/* Modern Factory Building (Fox Enterprises) */}
                <rect x="52" y="9" width="76" height="32" rx="2" fill="#2563EB" />
                <rect x="52" y="9" width="76" height="2" fill="#1D4ED8" />
                <rect x="55" y="13" width="70" height="8" rx="1" fill="#1D4ED8" />
                <text x="90" y="18.6" fontSize="4.3" fontWeight="900" fill="#FFFFFF" textAnchor="middle" letterSpacing="0.35" fontFamily="sans-serif">FOX ENTERPRISES</text>
                {/* Factory Windows */}
                <rect x="58" y="24" width="6" height="12" rx="1" fill="#93C5FD" fillOpacity="0.9" />
                <rect x="68" y="24" width="6" height="12" rx="1" fill="#93C5FD" fillOpacity="0.9" />
                <rect x="78" y="24" width="6" height="12" rx="1" fill="#93C5FD" fillOpacity="0.9" />
                <rect x="88" y="24" width="6" height="12" rx="1" fill="#93C5FD" fillOpacity="0.9" />
                <rect x="98" y="24" width="6" height="12" rx="1" fill="#93C5FD" fillOpacity="0.9" />
                <rect x="108" y="24" width="6" height="12" rx="1" fill="#93C5FD" fillOpacity="0.9" />
                <rect x="118" y="24" width="6" height="12" rx="1" fill="#93C5FD" fillOpacity="0.9" />

                {/* Right Delivery Truck */}
                <rect x="124" y="23" width="18" height="14" rx="1.5" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="0.8" />
                <path d="M142 27 L147 27 L149 31 L149 37 L142 37 Z" fill="#3B82F6" />
                <rect x="143.5" y="28" width="3.5" height="3.5" rx="0.5" fill="#DBEAFE" />
                <circle cx="129" cy="38.5" r="2.5" fill="#1E293B" />
                <circle cx="129" cy="38.5" r="1" fill="#94A3B8" />
                <circle cx="145" cy="38.5" r="2.5" fill="#1E293B" />
                <circle cx="145" cy="38.5" r="1" fill="#94A3B8" />

                {/* Right Pine Trees */}
                <path d="M152 41 L156 30 L148 30 Z" fill="#047857" />
                <path d="M152 32 L155 22 L149 22 Z" fill="#059669" />
                <path d="M160 41 L164 33 L156 33 Z" fill="#059669" />
              </svg>
            </div>

            {/* Content Layer */}
            <div className="relative z-10 flex flex-col justify-between h-full">
              {/* Row 1: Enterprise MES tag + Date */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10.5px] font-extrabold text-muted-foreground uppercase tracking-wider">
                    Enterprise MES
                  </span>
                </div>
                <span className="text-[11px] font-medium text-muted-foreground">
                  {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                </span>
              </div>

              {/* Row 2: Greeting & Admin Console Pill Button */}
              <div className="flex items-center justify-between mt-1">
                <h1 className="text-xl font-extrabold text-foreground tracking-tight">
                  Hello, {adminName} <span className="inline-block animate-wave origin-bottom-right">👋</span>
                </h1>
                <Link
                  href="/settings"
                  className="text-[10.5px] font-bold text-primary bg-white/95 dark:bg-card hover:bg-primary/10 px-2.5 py-1 rounded-full border border-primary/25 flex items-center gap-1 active:scale-95 transition-all shadow-2xs"
                >
                  <span>Admin Console</span>
                  <ArrowRight size={11} className="stroke-[2.5]" />
                </Link>
              </div>

              {/* Row 3: Subtitle */}
              <p className="text-xs text-muted-foreground mt-0.5 font-medium max-w-[210px]">
                Your factory is running smoothly.
              </p>
            </div>
          </div>

          {/* 2. QUICK VEHICLE 4-DIGIT LOOKUP BANNER TAB */}
          <div
            onClick={() => setShowVehicleLookup(true)}
            className="flex items-center justify-between p-3.5 rounded-2xl bg-gradient-to-r from-blue-500/10 via-indigo-500/10 to-teal-500/10 border border-blue-500/25 hover:border-primary/50 cursor-pointer active:scale-[0.99] transition-all shadow-2xs group"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform shrink-0">
                <Search size={20} strokeWidth={2.5} />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-black text-foreground tracking-tight">
                    Track Vehicle (Last 4 Digits)
                  </span>
                  <span className="text-[9.5px] font-extrabold px-1.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/25 shrink-0">
                    INSTANT
                  </span>
                </div>
                <p className="text-[11px] text-muted-foreground font-medium truncate mt-0.5">
                  Check Dealer & Dispatched / Received status
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1 text-[11px] font-bold text-primary bg-background/90 px-3 py-1.5 rounded-full border border-primary/25 group-hover:bg-primary group-hover:text-primary-foreground transition-all shadow-2xs shrink-0">
              <span>Track</span>
              <ArrowRight size={12} className="stroke-[2.5]" />
            </div>
          </div>

          {/* 4. QUICK ACTIONS (8 MOST-USED MODULES) */}
          <div>
            <div className="flex items-center justify-between mb-3 px-0.5">
              <h2 className="text-sm font-bold text-foreground tracking-tight">
                Quick Actions
              </h2>
              <button
                type="button"
                onClick={() => setShowAllModules(!showAllModules)}
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-1 active:scale-95 transition-all"
              >
                <span>{showAllModules ? "Show Less" : "View All 17"}</span>
                <ArrowRight size={12} className={cn("transition-transform duration-200", showAllModules && "rotate-90")} />
              </button>
            </div>

            <div className="grid grid-cols-4 gap-x-2 gap-y-3.5">
              {(showAllModules ? [...mostUsedModules, ...remainingModules] : mostUsedModules).map((item, idx) => {
                const Icon = item.icon;
                if (item.isAction) {
                  return (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setShowVehicleLookup(true)}
                      className="flex flex-col items-center justify-center gap-1.5 group cursor-pointer select-none text-center"
                    >
                      <div
                        className={cn(
                          "w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-150 group-active:scale-90 shadow-2xs border",
                          item.color
                        )}
                      >
                        <Icon size={24} strokeWidth={2.3} />
                      </div>
                      <span className="text-[10.5px] font-bold text-foreground text-center leading-tight line-clamp-1 group-active:text-primary transition-colors">
                        {item.label}
                      </span>
                    </button>
                  );
                }
                return (
                  <Link
                    key={idx}
                    href={item.href}
                    className="flex flex-col items-center justify-center gap-1.5 group cursor-pointer select-none"
                  >
                    <div
                      className={cn(
                        "w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-150 group-active:scale-90 shadow-2xs border",
                        item.color
                      )}
                    >
                      <Icon size={24} strokeWidth={2.3} />
                    </div>
                    <span className="text-[10.5px] font-bold text-foreground text-center leading-tight line-clamp-1 group-active:text-primary transition-colors">
                      {item.label}
                    </span>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* 5. PRODUCTION FLOW (MONTH-WISE WITH AUTO-ACCUMULATION & BACK-MONTH NAV) */}
          <div className="p-3.5 rounded-2xl bg-card border border-border/80 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center">
                  <Activity size={14} />
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-foreground">Production Flow</span>
                    {isCurrentMonth ? (
                      <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400">
                        Live Month
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={resetToCurrentMonth}
                        className="text-[10px] font-semibold text-primary hover:underline"
                        title="Jump back to current month"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Month Navigator Controls */}
              <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-xl border border-border/70">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  aria-label="Previous Month"
                  className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-card text-muted-foreground hover:text-foreground active:scale-95 transition-all"
                  title="Previous Month"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="text-[11px] font-bold text-foreground px-1.5 min-w-[72px] text-center whitespace-nowrap">
                  {formatMonthDisplay(selectedMonth)}
                </span>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  aria-label="Next Month"
                  className="w-6 h-6 rounded-lg flex items-center justify-center hover:bg-card text-muted-foreground hover:text-foreground active:scale-95 transition-all"
                  title="Next Month"
                >
                  <ChevronRight size={14} />
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between gap-1 pt-1">
              {/* Stage 1: Received */}
              <Link href="/production/received" className="flex flex-col items-center flex-1 group">
                <div className="w-10 h-10 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 border border-blue-100 dark:border-blue-900/40 flex items-center justify-center group-active:scale-95 transition-transform shadow-2xs">
                  <Inbox size={18} strokeWidth={2.2} />
                </div>
                <span className="text-[9.5px] font-semibold text-muted-foreground mt-1 truncate">
                  Received
                </span>
                <span className="text-sm font-black text-blue-600 dark:text-blue-400 font-display tabular-nums">
                  {monthlyStageStats.received ?? 0}
                </span>
              </Link>

              <div className="text-muted-foreground/30 text-xs shrink-0 mb-4 font-bold">→</div>

              {/* Stage 2: Fabrication */}
              <Link href="/production" className="flex flex-col items-center flex-1 group">
                <div className="w-10 h-10 rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-600 border border-purple-100 dark:border-purple-900/40 flex items-center justify-center group-active:scale-95 transition-transform shadow-2xs">
                  <Factory size={18} strokeWidth={2.2} />
                </div>
                <span className="text-[9.5px] font-semibold text-muted-foreground mt-1 truncate">
                  Fabrication
                </span>
                <span className="text-sm font-black text-purple-600 dark:text-purple-400 font-display tabular-nums">
                  {monthlyStageStats.fabrication ?? 0}
                </span>
              </Link>

              <div className="text-muted-foreground/30 text-xs shrink-0 mb-4 font-bold">→</div>

              {/* Stage 3: Paint */}
              <Link href="/production" className="flex flex-col items-center flex-1 group">
                <div className="w-10 h-10 rounded-full bg-rose-50 dark:bg-rose-950/40 text-rose-600 border border-rose-100 dark:border-rose-900/40 flex items-center justify-center group-active:scale-95 transition-transform shadow-2xs">
                  <Flame size={18} strokeWidth={2.2} />
                </div>
                <span className="text-[9.5px] font-semibold text-muted-foreground mt-1 truncate">
                  Paint
                </span>
                <span className="text-sm font-black text-rose-600 dark:text-rose-400 font-display tabular-nums">
                  {monthlyStageStats.paint ?? 0}
                </span>
              </Link>

              <div className="text-muted-foreground/30 text-xs shrink-0 mb-4 font-bold">→</div>

              {/* Stage 4: Assembly */}
              <Link href="/production" className="flex flex-col items-center flex-1 group">
                <div className="w-10 h-10 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 border border-amber-100 dark:border-amber-900/40 flex items-center justify-center group-active:scale-95 transition-transform shadow-2xs">
                  <Boxes size={18} strokeWidth={2.2} />
                </div>
                <span className="text-[9.5px] font-semibold text-muted-foreground mt-1 truncate">
                  Assembly
                </span>
                <span className="text-sm font-black text-amber-600 dark:text-amber-400 font-display tabular-nums">
                  {monthlyStageStats.rtd ?? 0}
                </span>
              </Link>

              <div className="text-muted-foreground/30 text-xs shrink-0 mb-4 font-bold">→</div>

              {/* Stage 5: Dispatch */}
              <Link href="/dispatch" className="flex flex-col items-center flex-1 group">
                <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border border-emerald-100 dark:border-emerald-900/40 flex items-center justify-center group-active:scale-95 transition-transform shadow-2xs">
                  <Truck size={18} strokeWidth={2.2} />
                </div>
                <span className="text-[9.5px] font-semibold text-muted-foreground mt-1 truncate">
                  Dispatch
                </span>
                <span className="text-sm font-black text-emerald-600 dark:text-emerald-400 font-display tabular-nums">
                  {monthlyStageStats.dispatch ?? 0}
                </span>
              </Link>
            </div>

            {/* Monthly Auto-accumulate Footer */}
            <div className="mt-3 pt-2.5 border-t border-border/50 flex items-center justify-between text-[11px]">
              <span className="text-muted-foreground">
                {isCurrentMonth ? "Daily entries auto-accumulate in monthly total" : `Historical total for ${formatMonthDisplay(selectedMonth)}`}
              </span>
              <span className="font-semibold text-foreground tabular-nums">
                {monthlyStageStats.received ?? 0} In · {monthlyStageStats.dispatch ?? 0} Out
              </span>
            </div>
          </div>

          {/* 6. RECENT ACTIVITY */}
          <div className="p-3.5 rounded-2xl bg-card border border-border/80 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-xs font-bold text-foreground">Recent Activity</span>
              </div>
              <Link
                href="/activity-logs"
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-0.5"
              >
                <span>View All</span>
                <ArrowRight size={11} />
              </Link>
            </div>

            {activities.length === 0 ? (
              <div className="py-6 text-center text-xs text-muted-foreground font-medium">
                No recent manufacturing events
              </div>
            ) : (
              <div className="space-y-2.5">
                {activities.slice(0, 3).map((event: ActivityEvent) => {
                  const item = parseMobileActivity(event);
                  const Icon = item.icon;
                  return (
                    <div
                      key={event.id}
                      className="flex items-center justify-between gap-2.5 p-2 rounded-xl hover:bg-muted/30 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div
                          className={cn(
                            "w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border shadow-2xs",
                            item.iconColor
                          )}
                        >
                          <Icon size={18} strokeWidth={2.2} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-bold text-foreground truncate">
                            {item.title}
                          </h4>
                          <p className="text-[10.5px] text-muted-foreground truncate leading-tight mt-0.5">
                            {item.subtitle}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-col items-end shrink-0">
                        <span className="text-[10px] text-muted-foreground font-medium whitespace-nowrap">
                          {item.relTime}
                        </span>
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-full text-[9.5px] font-bold border mt-0.5 whitespace-nowrap",
                            item.badgeClass
                          )}
                        >
                          {item.badgeText}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* EXECUTIVE KPI METRIC CARDS (Desktop Web Only - 4 Spacious Balanced Cards) */}
        <div className="hidden md:grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {/* Card 1: Active Shopfloor WIP */}
          <div
            onClick={() => setSelectedStageFilter("all")}
            className={cn(
              "p-4 sm:p-5 rounded-2xl bg-card border transition-all cursor-pointer hover:shadow-subtle hover:border-primary/50 relative overflow-hidden group shadow-2xs",
              selectedStageFilter === "all"
                ? "border-primary/60 ring-2 ring-primary/20"
                : "border-border/80"
            )}
          >
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Active Shopfloor WIP
              </span>
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20">
                <Factory size={16} />
              </div>
            </div>
            <div className="flex items-baseline gap-2 mb-1.5">
              <span className="text-3xl font-black font-display tabular-nums tracking-tight text-foreground">
                {activeInPlantVehicles.length}
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                Live In-Plant
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground truncate font-medium">
              {liveStageCounts.received} Received · {liveStageCounts.fabrication} Fab · {liveStageCounts.paint} Paint · {liveStageCounts.rtd} RTD
            </p>
          </div>

          {/* Card 2: Monthly Output */}
          <Link
            href="/dispatch"
            className="p-4 sm:p-5 rounded-2xl bg-card border border-border/80 transition-all cursor-pointer hover:shadow-subtle hover:border-emerald-500/50 relative overflow-hidden group shadow-2xs"
          >
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                Monthly Dispatches
              </span>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                <Truck size={16} />
              </div>
            </div>
            <div className="flex items-baseline gap-2 mb-1.5">
              <span className="text-3xl font-black font-display tabular-nums tracking-tight text-emerald-600 dark:text-emerald-400">
                {monthlyStageStats.dispatch ?? 0}
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                {formatMonthDisplay(selectedMonth)}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground truncate font-medium">
              {monthlyStageStats.received ?? 0} Intake · {Math.round(((monthlyStageStats.dispatch ?? 0) / (monthlyStageStats.received || 1)) * 100)}% Conversion
            </p>
          </Link>

          {/* Card 3: Delayed / At-Risk Units */}
          <div
            onClick={() => setSelectedStageFilter(selectedStageFilter === "delayed" ? "all" : "delayed")}
            className={cn(
              "p-4 sm:p-5 rounded-2xl bg-card border transition-all cursor-pointer hover:shadow-subtle relative overflow-hidden group shadow-2xs",
              delayedVehicles.length > 0
                ? "border-amber-500/40 bg-amber-500/[0.04] hover:border-amber-500/70"
                : "border-border/80",
              selectedStageFilter === "delayed" && "ring-2 ring-amber-500/40"
            )}
          >
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
                Delayed / At-Risk Units
              </span>
              <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/30">
                <AlertTriangle size={16} />
              </div>
            </div>
            <div className="flex items-baseline gap-2 mb-1.5">
              <span className="text-3xl font-black font-display tabular-nums tracking-tight text-amber-600 dark:text-amber-400">
                {delayedVehicles.length}
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25">
                Action Needed
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground truncate font-medium">
              {emergencyVehicles.length > 0 ? `${emergencyVehicles.length} Urgent priority · ` : ""}Click to filter queue
            </p>
          </div>

          {/* Card 4: Plant SLA & Crew */}
          <Link
            href="/workers"
            className="p-4 sm:p-5 rounded-2xl bg-card border border-border/80 transition-all cursor-pointer hover:shadow-subtle hover:border-primary/50 relative overflow-hidden group shadow-2xs"
          >
            <div className="flex items-center justify-between mb-2.5">
              <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                On-Time SLA & Crew
              </span>
              <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-500/20">
                <CheckCircle2 size={16} />
              </div>
            </div>
            <div className="flex items-baseline gap-2 mb-1.5">
              <span className="text-3xl font-black font-display tabular-nums tracking-tight text-foreground">
                {onTimeRate}%
              </span>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                {onTimeRate >= 90 ? "Optimal" : "Attention"}
              </span>
            </div>
            <p className="text-[11px] text-muted-foreground truncate font-medium">
              {totalWorkersCount} Active Staff on Shift
            </p>
          </Link>
        </div>

        {/* INTERACTIVE PRODUCTION PIPELINE (Desktop Web Only) */}
        <div className="hidden md:block bg-card border border-border/80 rounded-2xl p-4 sm:p-5 shadow-2xs mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-4 mb-4 border-b border-border/60">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
                <Activity size={17} />
              </div>
              <div>
                <h2 className="text-sm font-bold text-foreground tracking-tight">
                  Shopfloor Material Flow
                </h2>
                <p className="text-xs text-muted-foreground">
                  {pipelineMode === "live"
                    ? "Live physical count at stations · Click any stage to filter active queue"
                    : `Aggregated historical throughput for ${formatMonthDisplay(selectedMonth)}`}
                </p>
              </div>
            </div>

            {/* Toggle between Live Shopfloor & Monthly Accumulation */}
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border/70 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => setPipelineMode("live")}
                  className={cn(
                    "px-3 py-1 rounded-lg transition-all",
                    pipelineMode === "live"
                      ? "bg-background text-foreground shadow-2xs font-extrabold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  ⚡ Live In-Plant ({activeInPlantVehicles.length})
                </button>
                <button
                  type="button"
                  onClick={() => setPipelineMode("monthly")}
                  className={cn(
                    "px-3 py-1 rounded-lg transition-all",
                    pipelineMode === "monthly"
                      ? "bg-background text-foreground shadow-2xs font-extrabold"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  📅 Monthly Total
                </button>
              </div>

              {pipelineMode === "monthly" && (
                <div className="flex items-center gap-1 bg-muted/60 p-0.5 rounded-xl border border-border/70">
                  <button
                    type="button"
                    onClick={handlePrevMonth}
                    aria-label="Previous Month"
                    className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-card text-muted-foreground hover:text-foreground active:scale-95 transition-all"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <span className="text-xs font-bold text-foreground px-2 min-w-[76px] text-center">
                    {formatMonthDisplay(selectedMonth)}
                  </span>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    aria-label="Next Month"
                    className="w-7 h-7 rounded-lg flex items-center justify-center hover:bg-card text-muted-foreground hover:text-foreground active:scale-95 transition-all"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}

              <Link
                href="/production"
                className="text-xs font-bold text-primary hover:underline flex items-center gap-1 ml-2"
              >
                <span>Open Kanban Board</span>
                <ArrowRight size={12} />
              </Link>
            </div>
          </div>

          {/* 5 Stages Stepper */}
          <div className="grid grid-cols-5 gap-2 lg:gap-3">
            {STAGE_ORDER.map((stage, idx) => {
              const isSelected = selectedStageFilter === stage;
              const count = pipelineMode === "live"
                ? (liveStageCounts[stage as keyof typeof liveStageCounts] ?? 0)
                : (monthlyStageStats[stage] ?? 0);

              const stageIcons: Record<string, React.ReactNode> = {
                received: <Inbox size={16} />,
                fabrication: <Factory size={16} />,
                paint: <Flame size={16} />,
                rtd: <Boxes size={16} />,
                dispatch: <Truck size={16} />,
              };

              return (
                <div
                  key={stage}
                  onClick={() => {
                    if (stage === "dispatch") return;
                    setSelectedStageFilter(isSelected ? "all" : stage);
                  }}
                  className={cn(
                    "p-3 rounded-xl border transition-all cursor-pointer relative group flex flex-col justify-between min-h-[92px]",
                    isSelected
                      ? "border-primary bg-primary/10 shadow-xs ring-1 ring-primary/30"
                      : "border-border/70 bg-card hover:border-primary/40 hover:bg-muted/30"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-muted-foreground">
                      0{idx + 1}. {STAGE_LABELS[stage]}
                    </span>
                    <div
                      className={cn(
                        "w-6 h-6 rounded-lg flex items-center justify-center border",
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary"
                          : "bg-muted/60 text-muted-foreground border-border/50"
                      )}
                    >
                      {stageIcons[stage]}
                    </div>
                  </div>

                  <div className="flex items-baseline justify-between mt-2">
                    <span
                      className={cn(
                        "text-2xl font-black font-display tabular-nums tracking-tight",
                        count > 0 ? "text-foreground" : "text-muted-foreground/60"
                      )}
                    >
                      {count}
                    </span>
                    <span className="text-[10px] font-semibold text-muted-foreground group-hover:text-primary transition-colors">
                      {stage === "dispatch" ? "Total Out" : "Filter Queue →"}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* OPERATIONS BOARD & INTELLIGENCE SPLIT (Desktop Web Only) */}
        <div className="hidden md:grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Active Shopfloor Queue (col-span-8) */}
          <div className="lg:col-span-8 space-y-4">
            <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border/80 shadow-2xs">
              {/* Header and Filter Tabs */}
              <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-foreground tracking-tight">
                      {selectedStageFilter === "delayed"
                        ? "Delayed & At-Risk Vehicles"
                        : selectedStageFilter === "emergency"
                          ? "Emergency Priority Vehicles"
                          : selectedStageFilter === "all"
                            ? "Active Shopfloor Queue"
                            : `${STAGE_LABELS[selectedStageFilter as Stage]} Stage Queue`}
                    </h3>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                      {boardVehicles.length} Units
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Click on any vehicle card to inspect live jobs, QC records, or update stage
                  </p>
                </div>

                {/* Filter Pills */}
                <div className="flex items-center gap-1.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => setSelectedStageFilter("all")}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-bold transition-all border",
                      selectedStageFilter === "all"
                        ? "bg-foreground text-background border-foreground shadow-2xs"
                        : "bg-muted/50 text-muted-foreground border-border hover:text-foreground"
                    )}
                  >
                    All Active ({activeInPlantVehicles.length})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedStageFilter("received")}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-bold transition-all border",
                      selectedStageFilter === "received"
                        ? "bg-foreground text-background border-foreground shadow-2xs"
                        : "bg-muted/50 text-muted-foreground border-border hover:text-foreground"
                    )}
                  >
                    Received ({liveStageCounts.received})
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedStageFilter("delayed")}
                    className={cn(
                      "px-2.5 py-1 rounded-lg text-xs font-bold transition-all border flex items-center gap-1",
                      selectedStageFilter === "delayed"
                        ? "bg-amber-600 text-white border-amber-600 shadow-2xs"
                        : "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 hover:bg-amber-500/20"
                    )}
                  >
                    <AlertTriangle size={11} />
                    <span>Delayed ({delayedVehicles.length})</span>
                  </button>
                </div>
              </div>

              {/* Search Bar inside Queue */}
              <div className="relative mb-4">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
                <input
                  type="text"
                  value={boardSearch}
                  onChange={(e) => setBoardSearch(e.target.value)}
                  placeholder="Filter by VIN / Vehicle number, OEM name, Chassis, or tracking ID..."
                  className="w-full pl-9 pr-4 py-2 bg-muted/40 border border-border rounded-xl text-xs font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                />
                {boardSearch && (
                  <button
                    type="button"
                    onClick={() => setBoardSearch("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground hover:text-foreground"
                  >
                    Clear
                  </button>
                )}
              </div>

              {/* Vehicle Cards Grid */}
              {boardVehicles.length === 0 ? (
                <EmptyState
                  compact
                  title="No vehicles found"
                  description={
                    boardSearch
                      ? `No vehicles match "${boardSearch}". Try clearing your search.`
                      : `No vehicles currently in ${selectedStageFilter === "delayed" ? "Delayed" : (STAGE_LABELS[selectedStageFilter as Stage] || selectedStageFilter)}.`
                  }
                  className="py-10 border-0 bg-transparent"
                />
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[540px] overflow-y-auto pr-1">
                  {boardVehicles.map((vehicle: Vehicle) => {
                    const isDelayed = vehicle.estimatedDelivery && new Date(vehicle.estimatedDelivery) < new Date();
                    const isUrgent = (vehicle.priority || "").toLowerCase() === "urgent";

                    return (
                      <Link
                        key={vehicle.id}
                        href={`/vehicle/${vehicle.id}`}
                        className="group block"
                      >
                        <div
                          className={cn(
                            "p-3.5 rounded-xl border bg-card hover:bg-muted/30 transition-all duration-150 cursor-pointer shadow-2xs group-hover:shadow-subtle group-hover:border-primary/50 relative",
                            isUrgent
                              ? "border-rose-500/40 bg-rose-500/[0.02]"
                              : isDelayed
                                ? "border-amber-500/40 bg-amber-500/[0.02]"
                                : "border-border/80"
                          )}
                        >
                          {/* Row 1: Vehicle No & Priority */}
                          <div className="flex items-center justify-between gap-2 mb-1.5">
                            <span className="font-mono text-xs font-extrabold text-foreground tracking-tight group-hover:text-primary transition-colors">
                              {vehicle.vehicleNumber}
                            </span>
                            <PriorityBadge priority={vehicle.priority} showLabel={true} />
                          </div>

                          {/* Row 2: OEM Name & Model */}
                          <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-2">
                            <span className="font-semibold text-foreground/85 truncate">
                              {vehicle.oemName || "OEM Unassigned"}
                            </span>
                            <span className="font-mono text-[10px] text-muted-foreground truncate">
                              {vehicle.trackingId}
                            </span>
                          </div>

                          {/* Row 3: Progress Bar & Current Stage */}
                          <div className="space-y-1 mb-2">
                            <div className="flex items-center justify-between text-[10.5px]">
                              <span className="font-bold text-muted-foreground uppercase text-[9.5px]">
                                Stage: <strong className="text-foreground">{STAGE_LABELS[vehicle.currentStage] || vehicle.currentStage}</strong>
                              </span>
                              <span className="font-mono font-bold text-muted-foreground tabular-nums">
                                {vehicle.progressPercent || 0}%
                              </span>
                            </div>
                            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                              <div
                                className={cn(
                                  "h-full rounded-full transition-all duration-500",
                                  vehicle.progressPercent >= 80
                                    ? "bg-emerald-500"
                                    : vehicle.progressPercent >= 40
                                      ? "bg-primary"
                                      : "bg-amber-500"
                                )}
                                style={{ width: `${Math.max(4, vehicle.progressPercent || 0)}%` }}
                              />
                            </div>
                          </div>

                          {/* Row 4: Timeline / Alert Badge & Link */}
                          <div className="flex items-center justify-between text-[10px] pt-1.5 border-t border-border/40">
                            {isDelayed ? (
                              <span className="font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1">
                                <AlertTriangle size={10} />
                                <span>Delayed SLA</span>
                              </span>
                            ) : (
                              <span className="text-muted-foreground">
                                {vehicle.receivedAt ? `Received: ${getRelativeTime(vehicle.receivedAt)}` : "In Shopfloor"}
                              </span>
                            )}

                            <span className="font-bold text-primary group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                              <span>Inspect</span>
                              <ArrowRight size={10} />
                            </span>
                          </div>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Dual Tab Panel (Live Feed & Delayed Action Queue) (col-span-4) */}
          <div className="lg:col-span-4 space-y-4">
            <div className="p-4 sm:p-5 rounded-2xl bg-card border border-border/80 shadow-2xs flex flex-col h-full min-h-[500px]">
              {/* Header Tabs */}
              <div className="flex items-center justify-between pb-3 border-b border-border/70 mb-3">
                <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-xl border border-border/70 text-xs font-bold w-full">
                  <button
                    type="button"
                    onClick={() => setRightPanelTab("activity")}
                    className={cn(
                      "flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5",
                      rightPanelTab === "activity"
                        ? "bg-background text-foreground shadow-2xs font-extrabold"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span>Live Feed</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setRightPanelTab("delayed")}
                    className={cn(
                      "flex-1 py-1.5 rounded-lg transition-all flex items-center justify-center gap-1.5",
                      rightPanelTab === "delayed"
                        ? "bg-background text-foreground shadow-2xs font-extrabold"
                        : "text-muted-foreground hover:text-foreground"
                    )}
                  >
                    <AlertTriangle size={12} className="text-amber-500" />
                    <span>Delayed ({delayedVehicles.length})</span>
                  </button>
                </div>
              </div>

              {/* Tab 1: Live Activity Feed */}
              {rightPanelTab === "activity" ? (
                <div className="flex-1 overflow-y-auto max-h-[500px] space-y-2 pr-1">
                  {activities.length === 0 ? (
                    <EmptyState
                      compact
                      icon={<Activity size={20} className="text-muted-foreground" />}
                      title="No events yet"
                      description="Live factory activities will appear here automatically."
                    />
                  ) : (
                    activities.slice(0, 15).map((event: ActivityEvent) => {
                      const item = parseMobileActivity(event);
                      const Icon = item.icon;
                      return (
                        <div
                          key={event.id}
                          className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-muted/30 transition-colors border border-transparent hover:border-border/50"
                        >
                          <div
                            className={cn(
                              "w-8 h-8 rounded-xl flex items-center justify-center shrink-0 border mt-0.5",
                              item.iconColor
                            )}
                          >
                            <Icon size={14} strokeWidth={2.2} />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between gap-1">
                              <h4 className="text-xs font-bold text-foreground truncate">
                                {item.title}
                              </h4>
                              <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                                {item.relTime}
                              </span>
                            </div>
                            <p className="text-[11px] text-muted-foreground leading-tight line-clamp-2 mt-0.5">
                              {item.subtitle}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              ) : (
                /* Tab 2: Delayed Orders Quick Action Queue */
                <div className="flex-1 overflow-y-auto max-h-[500px] space-y-2.5 pr-1">
                  {delayedVehicles.length === 0 ? (
                    <EmptyState
                      compact
                      title="All On Track"
                      description="Zero orders currently delayed. Factory is operating within SLA."
                    />
                  ) : (
                    delayedVehicles.map((v: Vehicle) => (
                      <Link
                        key={v.id}
                        href={`/vehicle/${v.id}`}
                        className="block p-3 rounded-xl border border-amber-500/30 bg-amber-500/5 hover:bg-amber-500/10 transition-all group"
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono text-xs font-bold text-foreground group-hover:text-primary">
                            {v.vehicleNumber}
                          </span>
                          <span className="text-[10px] font-extrabold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-700 dark:text-amber-300 border border-amber-500/30">
                            Overdue
                          </span>
                        </div>
                        <div className="text-[11px] text-muted-foreground flex items-center justify-between">
                          <span>{v.oemName}</span>
                          <span className="font-semibold text-foreground">
                            {STAGE_LABELS[v.currentStage] || v.currentStage}
                          </span>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              )}

              {/* Sync Footer */}
              <div className="pt-3 mt-auto border-t border-border/50 flex items-center justify-between text-[10px] text-muted-foreground">
                <span className="flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Synchronized with plant WebSockets</span>
                </span>
                <Link href="/activity-logs" className="font-bold text-primary hover:underline">
                  View Logs →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* VEHICLE 4-DIGIT LOOKUP BOTTOM SHEET MODAL */}
      <VehicleLookupBottomSheet
        open={showVehicleLookup}
        onOpenChange={setShowVehicleLookup}
      />
    </motion.div>
  );
}
