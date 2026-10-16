"use client";

import React, { useState, useMemo } from "react";
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
  ChevronRight,
  Flame,
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
}

// 8 most-used modules as defined in Option D reference
const mostUsedModules: AdminTabItem[] = [
  { label: "Production", href: "/production", icon: Factory, color: "bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/40", category: "core", desc: "Live shopfloor & Kanban" },
  { label: "Received", href: "/production/received", icon: Inbox, color: "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/40", category: "core", desc: "Vehicle intake & checks" },
  { label: "QC Check", href: "/quality-control", icon: CheckCircle2, color: "bg-teal-50 text-teal-600 border-teal-100 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-900/40", category: "core", desc: "Quality inspection" },
  { label: "Dispatch", href: "/dispatch", icon: Truck, color: "bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/40", category: "core", desc: "Gate pass & delivery" },
  { label: "Workers", href: "/workers", icon: Users, color: "bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-950/40 dark:text-indigo-300 dark:border-indigo-900/40", category: "workforce", desc: "Active staff & skills" },
  { label: "Attendance", href: "/attendance", icon: Clock, color: "bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-900/40", category: "workforce", desc: "Live biometric shifts" },
  { label: "Components", href: "/components", icon: Boxes, color: "bg-orange-50 text-orange-600 border-orange-100 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900/40", category: "workforce", desc: "BOM inventory & parts" },
  { label: "Payroll", href: "/payroll", icon: Banknote, color: "bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-950/40 dark:text-rose-300 dark:border-rose-900/40", category: "workforce", desc: "Wages & overtime" },
];

const remainingModules: AdminTabItem[] = [
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
      // Stage strings on backend can be lowercase or title case
      acc[stage] = filteredVehicles.filter(
        (v: Vehicle) => (v.currentStage || "").toLowerCase() === (stage || "").toLowerCase()
      );
      return acc;
    },
    { oem: [], rejected: [], received: [], fabrication: [], paint: [], rtd: [], dispatch: [] }
  );

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

  const kpiCards = [
    {
      title: "Vehicles Received",
      value: stats.vehiclesReceived,
      trend: "up" as const,
      trendValue: "+8%",
      sparklineData: [110, 125, 118, 130, 135, 140, 148],
      sparklineColor: "oklch(var(--primary))",
      icon: <Factory size={14} />,
      semantic: "primary" as const,
    },
    {
      title: "In Fabrication",
      value: stats.inFabrication,
      trend: "up" as const,
      trendValue: "+5%",
      sparklineData: [60, 65, 70, 68, 72, 74, 75],
      sparklineColor: "oklch(var(--primary))",
      icon: <Activity size={14} />,
      semantic: "primary" as const,
    },
    {
      title: "In Paint",
      value: stats.inPaint,
      trend: "down" as const,
      trendValue: "-3%",
      accentClass: "text-purple-600 dark:text-purple-400",
      sparklineData: [38, 35, 36, 34, 33, 32, 32],
      sparklineColor: "#a855f7",
    },
    {
      title: "Ready to Dispatch",
      value: stats.readyToDispatch,
      trend: "up" as const,
      trendValue: "+12%",
      semantic: "success" as const,
      sparklineData: [70, 75, 80, 82, 85, 88, 91],
      sparklineColor: "oklch(var(--success))",
      icon: <CheckCircle2 size={14} />,
    },
    {
      title: "Dispatch Today",
      value: stats.dispatchToday,
      trend: "up" as const,
      trendValue: "+18%",
      semantic: "success" as const,
      sparklineData: [90, 95, 100, 105, 108, 112, 115],
      sparklineColor: "oklch(var(--success))",
      icon: <Truck size={14} />,
    },
    {
      title: "Delayed Orders",
      value: stats.delayedOrders,
      trend: stats.delayedOrders > 0 ? ("down" as const) : ("neutral" as const),
      trendValue: stats.delayedOrders > 0 ? `-${stats.delayedOrders}` : undefined,
      semantic: stats.delayedOrders > 0 ? ("warning" as const) : ("neutral" as const),
      sparklineData: [16, 15, 14, 14, 13, 13, 12],
      sparklineColor: stats.delayedOrders > 0 ? "oklch(var(--warning))" : undefined,
      highlight: stats.delayedOrders > 0 ? "warning" : undefined,
      icon: <AlertTriangle size={14} />,
    },
    {
      title: "Emergency",
      value: stats.emergencyOrders,
      trend: stats.emergencyOrders > 0 ? ("up" as const) : ("neutral" as const),
      trendValue: stats.emergencyOrders > 0 ? `+${stats.emergencyOrders}` : undefined,
      semantic: stats.emergencyOrders > 0 ? ("destructive" as const) : ("neutral" as const),
      sparklineData: stats.emergencyOrders > 0 ? [2, 2, 3, 3, 4, 4, 4] : undefined,
      sparklineColor: stats.emergencyOrders > 0 ? "oklch(var(--destructive))" : undefined,
      highlight: stats.emergencyOrders > 0 ? "destructive" : undefined,
      icon: <Zap size={14} />,
    },
  ];

  if (isLoading) {
    return (
      <div className="flex h-full">
        <div className="flex-1 min-w-0 overflow-y-auto p-6">
          <div className="mb-6">
            <Skeleton className="h-7 w-64 mb-2" />
            <Skeleton className="h-4 w-96" />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3 mb-6">
            {[1, 2, 3, 4, 5, 6, 7].map((k) => (
              <div
                key={k}
                className="bg-card border border-border rounded-xl p-4 flex flex-col gap-3"
              >
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-full" />
              </div>
            ))}
          </div>
          <div className="bg-card border border-border rounded-xl p-4">
            <Skeleton className="h-4 w-40 mb-4" />
            <div className="flex gap-3">
              {[1, 2, 3, 4, 5].map((k) => (
                <Skeleton key={k} className="h-14 flex-1 rounded-xl" />
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
                  <motion.div
                    animate={{ scale: [1, 1.04, 1] }}
                    transition={{ repeat: Number.POSITIVE_INFINITY, duration: 2 }}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-500/10 border border-rose-500/30 rounded-lg"
                    data-ocid="dashboard.emergency_alert"
                  >
                    <Zap size={14} className="text-rose-600 dark:text-rose-400" />
                    <span className="text-xs font-semibold text-rose-600 dark:text-rose-400">
                      {stats.emergencyOrders} Emergency
                    </span>
                  </motion.div>
                )}
                {stats.delayedOrders > 0 && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-lg">
                    <AlertTriangle size={13} className="text-amber-600 dark:text-amber-400" />
                    <span className="text-xs font-semibold text-amber-600 dark:text-amber-400">
                      {stats.delayedOrders} Delayed
                    </span>
                  </div>
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
                <span>{showAllModules ? "Show Less" : "View All 16"}</span>
                <ArrowRight size={12} className={cn("transition-transform duration-200", showAllModules && "rotate-90")} />
              </button>
            </div>

            <div className="grid grid-cols-4 gap-x-2 gap-y-3.5">
              {(showAllModules ? [...mostUsedModules, ...remainingModules] : mostUsedModules).map((item, idx) => {
                const Icon = item.icon;
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

          {/* 5. PRODUCTION FLOW (TODAY) */}
          <div className="p-3.5 rounded-2xl bg-card border border-border/80 shadow-2xs">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 flex items-center justify-center">
                  <Activity size={14} />
                </div>
                <div className="flex items-center gap-1">
                  <span className="text-xs font-bold text-foreground">Production Flow</span>
                  <span className="text-[11px] text-muted-foreground font-medium">(Today)</span>
                </div>
              </div>
              <Link
                href="/production"
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-0.5"
              >
                <span>View Board</span>
                <ArrowRight size={11} />
              </Link>
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
                  {(vehiclesByStage.received || []).length}
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
                <span className="text-sm font-black text-blue-600 dark:text-blue-400 font-display tabular-nums">
                  {(vehiclesByStage.fabrication || []).length}
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
                <span className="text-sm font-black text-blue-600 dark:text-blue-400 font-display tabular-nums">
                  {(vehiclesByStage.paint || []).length}
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
                <span className="text-sm font-black text-blue-600 dark:text-blue-400 font-display tabular-nums">
                  {(vehiclesByStage.rtd || []).length}
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
                <span className="text-sm font-black text-blue-600 dark:text-blue-400 font-display tabular-nums">
                  {(vehiclesByStage.dispatch || []).length}
                </span>
              </Link>
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

        {/* KPI grid (Desktop Web Only) */}
        <div className="hidden md:grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3 mb-6">
          {kpiCards.map((card, i) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07, duration: 0.4, ease: "easeOut" }}
              whileHover={{
                y: -2,
                boxShadow: "0 8px 24px oklch(var(--primary) / 0.12)",
              }}
              className={cn(
                "rounded-xl transition-smooth relative",
                card.highlight === "warning" &&
                  "ring-1 ring-warning/40 ring-offset-0",
                card.highlight === "destructive" &&
                  "ring-1 ring-destructive/40 ring-offset-0",
              )}
            >
              <KPICard
                title={card.title}
                value={card.value}
                trend={card.trend}
                trendValue={card.trendValue}
                sparklineData={card.sparklineData}
                sparklineColor={card.sparklineColor}
                accentClass={card.accentClass}
                icon={card.icon}
                className={cn(
                  card.highlight === "warning" &&
                    "bg-warning/5 border-warning/30",
                  card.highlight === "destructive" &&
                    "bg-destructive/5 border-destructive/30",
                )}
                data-ocid={`dashboard.kpi.${(card.title || "").toLowerCase().replace(/\s+/g, "-")}.card`}
              />
              {card.highlight === "destructive" && (
                <motion.div
                  className="absolute inset-0 rounded-xl pointer-events-none"
                  animate={{ opacity: [0, 0.06, 0] }}
                  transition={{
                    repeat: Number.POSITIVE_INFINITY,
                    duration: 2.5,
                  }}
                  style={{ background: "oklch(var(--destructive))" }}
                />
              )}
            </motion.div>
          ))}
        </div>

        {/* Stage Flow Pills (Desktop Web Only) */}
        <div
          className="hidden md:block bg-card border border-border rounded-xl shadow-subtle overflow-hidden mb-6"
          data-ocid="dashboard.stage_flow"
        >
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">
              Production Flow
            </h2>
            <Link
              href="/production"
              className="text-xs text-primary hover:underline flex items-center gap-1"
              data-ocid="dashboard.stage_flow.view_board_link"
            >
              Open Board <span aria-hidden>→</span>
            </Link>
          </div>
          <div className="flex items-center gap-0 p-4 overflow-x-auto no-scrollbar">
            {STAGE_ORDER.map((stage, si) => (
              <div key={stage} className="flex items-center flex-shrink-0">
                <Link
                  href="/production"
                  data-ocid={`dashboard.stage_flow.${stage}.pill`}
                  className={cn(
                    "flex flex-col items-center gap-1.5 px-5 py-3 rounded-xl border transition-smooth cursor-pointer",
                    STAGE_COLORS[stage],
                  )}
                >
                  <span className="text-2xl font-bold font-display tabular-nums leading-none">
                    {(vehiclesByStage[stage] || []).length}
                  </span>
                  <span className="text-[11px] font-medium whitespace-nowrap">
                    {STAGE_LABELS[stage]}
                  </span>
                </Link>
                {si < STAGE_ORDER.length - 1 && (
                  <div className="flex items-center px-2 text-muted-foreground/40">
                    <svg
                      width="20"
                      height="12"
                      viewBox="0 0 20 12"
                      fill="none"
                      role="img"
                      aria-label="Next stage arrow"
                    >
                      <path
                        d="M0 6h16M12 1l5 5-5 5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Production Board Preview (Desktop Web Only) */}
        <div
          className="hidden md:block bg-card border border-border rounded-xl shadow-subtle overflow-hidden"
          data-ocid="dashboard.production_board"
        >
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
            <h2 className="text-sm font-semibold text-foreground">
              Live Production Board
            </h2>
            <Link
              href="/production"
              className="text-xs text-primary hover:underline flex items-center gap-1"
              data-ocid="dashboard.production_board.view_all_link"
            >
              View Full Board <ArrowRight size={11} />
            </Link>
          </div>
          <div className="overflow-x-auto no-scrollbar">
            <div className="flex gap-0 min-w-max">
              {STAGE_ORDER.map((stage, si) => (
                <div
                  key={stage}
                  className={cn(
                    "flex-1 min-w-48 border-r border-border/50 last:border-r-0",
                    si % 2 === 1 && "bg-muted/20",
                  )}
                >
                  <div className="flex items-center justify-between px-3 py-2.5 border-b border-border/50">
                    <span className="text-xs font-semibold text-foreground">
                      {STAGE_LABELS[stage]}
                    </span>
                    <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded font-mono">
                      {(vehiclesByStage[stage] || []).length}
                    </span>
                  </div>
                  <div className="p-2 space-y-2 max-h-64 overflow-y-auto">
                    {(vehiclesByStage[stage] || []).slice(0, 4).map((vehicle, vi) => (
                      <Link
                        key={vehicle.id}
                        href={`/vehicle/${vehicle.id}`}
                        data-ocid={`production_board.${stage}.item.${vi + 1}`}
                        className="block"
                      >
                        <motion.div
                          whileHover={{ y: -1, scale: 1.005 }}
                          className={cn(
                            "p-2.5 rounded-lg border bg-background hover:border-primary/40 transition-smooth cursor-pointer",
                            (vehicle.priority || "").toLowerCase() === "urgent"
                              ? "border-destructive/40"
                              : (vehicle.priority || "").toLowerCase() === "high"
                                ? "border-warning/30"
                                : "border-border/60",
                          )}
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-semibold text-foreground truncate">
                              {vehicle.vehicleNumber}
                            </span>
                            <PriorityBadge
                              priority={vehicle.priority}
                              showLabel={false}
                            />
                          </div>
                          <p className="text-[10px] text-muted-foreground mb-1.5 truncate">
                            {vehicle.oemName}
                          </p>
                          <div className="flex items-center gap-1.5">
                            <div className="flex-1 h-1 bg-muted rounded-full overflow-hidden">
                              <motion.div
                                initial={{ width: 0 }}
                                animate={{
                                  width: `${vehicle.progressPercent}%`,
                                }}
                                transition={{ duration: 0.8, delay: si * 0.1 }}
                                className={cn(
                                  "h-full rounded-full",
                                  vehicle.progressPercent >= 80
                                    ? "bg-success"
                                    : vehicle.progressPercent >= 40
                                      ? "bg-primary"
                                      : "bg-warning",
                                )}
                              />
                            </div>
                            <span className="text-[10px] text-muted-foreground tabular-nums">
                              {vehicle.progressPercent}%
                            </span>
                          </div>
                          <p className="text-[10px] text-muted-foreground mt-1 font-mono truncate">
                            {vehicle.trackingId}
                          </p>
                        </motion.div>
                      </Link>
                    ))}
                    {(vehiclesByStage[stage] || []).length > 4 && (
                      <Link
                        href="/production"
                        className="block text-[10px] text-primary hover:underline text-center py-1.5"
                      >
                        +{(vehiclesByStage[stage] || []).length - 4} more
                      </Link>
                    )}
                    {(vehiclesByStage[stage] || []).length === 0 && (
                      <EmptyState
                        compact
                        title="No vehicles"
                        description={`No vehicles currently in ${STAGE_LABELS[stage]}`}
                        className="py-6 border-0 bg-transparent"
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Activity panel */}
      <div
        className="w-80 flex-shrink-0 border-l border-border bg-card overflow-hidden hidden xl:flex flex-col"
        data-ocid="dashboard.activity_panel"
      >
        <div className="flex items-center justify-between px-4 py-3.5 border-b border-border sticky top-0 bg-card z-10">
          <div className="flex items-center gap-2">
            <Activity size={14} className="text-primary" />
            <span className="text-sm font-semibold text-foreground">
              Live Factory Feed
            </span>
          </div>
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <motion.div
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ repeat: Number.POSITIVE_INFINITY, duration: 2 }}
              className="w-1.5 h-1.5 rounded-full bg-emerald-500"
            />
            <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold">
              Live
            </span>
          </div>
        </div>
        <div
          className="flex-1 overflow-y-auto"
          data-ocid="dashboard.activity_feed"
        >
          {activities.length === 0 ? (
            <div className="p-6">
              <EmptyState
                compact
                icon={<Activity size={20} className="text-muted-foreground" />}
                title="No activity yet"
                description="Live manufacturing events and status changes will appear here automatically."
              />
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {activities.slice(0, 20).map((event: ActivityEvent) => (
                <ActivityItem
                  key={event.id}
                  event={event}
                />
              ))}
            </AnimatePresence>
          )}
        </div>
        <div className="px-4 py-2.5 border-t border-border/50 bg-muted/20">
          <p className="text-[10px] text-muted-foreground text-center">
            Synchronized via live WebSockets
          </p>
        </div>
      </div>
    </motion.div>
  );
}
