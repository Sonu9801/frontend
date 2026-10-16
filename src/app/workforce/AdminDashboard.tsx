"use client";

import React, { useState, useEffect, useRef } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { 
  Building2, TrendingUp, Users, Wallet, Target, LogOut, 
  LayoutDashboard, Factory, Clock, Receipt, FileBarChart, Bell,
  ChevronRight, ChevronLeft, ArrowRight, ShieldCheck, CheckCircle2, AlertCircle,
  Truck, Boxes, Settings, Inbox, BarChart3, Banknote, Activity, Menu, X,
  Grid, LayoutGrid, HelpCircle, UserCircle, Briefcase, Sun, Megaphone,
  CalendarCheck, Eye, Search, Layers, RefreshCw, HandCoins, ArrowUpDown
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { useVehicles, useWorkers, useNotifications } from "@/hooks/useQueries";

// Embedded Tab Components
import { ProductionTab } from "./ProductionTab";
import { AttendanceTab } from "./AttendanceTab";
import { InvoiceTab } from "./InvoiceTab";
import { ReportsTab } from "./ReportsTab";
import { NotificationsTab } from "./NotificationsTab";
import { WorkerSettingsTab } from "./components/WorkerSettingsTab";
import { WorkerSupportTab } from "./components/WorkerSupportTab";
import { WorkerProfileTab } from "./components/WorkerProfileTab";

// Dynamic Imports for Large ERP Sub-Modules (Keeps PWA fast & completely embedded)
const PayrollDashboardTab = dynamic(() => import("../(dashboard)/payroll/components/PayrollDashboardTab"), { 
  ssr: false, 
  loading: () => <div className="p-8 text-center text-sm font-semibold text-muted-foreground animate-pulse">Loading Payroll Data...</div> 
});
const PayrollEmployeesTab = dynamic(() => import("../(dashboard)/payroll/components/PayrollEmployeesTab"), { 
  ssr: false,
  loading: () => <div className="p-8 text-center text-sm font-semibold text-muted-foreground animate-pulse">Loading Employees...</div>
});
const PayrollAdvancesTab = dynamic(() => import("../(dashboard)/payroll/components/PayrollAdvancesTab"), { 
  ssr: false,
  loading: () => <div className="p-8 text-center text-sm font-semibold text-muted-foreground animate-pulse">Loading Advances...</div>
});
const PayrollAnalyticsTab = dynamic(() => import("../(dashboard)/payroll/components/PayrollAnalyticsTab"), { 
  ssr: false,
  loading: () => <div className="p-8 text-center text-sm font-semibold text-muted-foreground animate-pulse">Loading Payroll Analytics...</div>
});

const ComponentReportsTab = dynamic(() => import("../(dashboard)/reports/components/ComponentReportsTab").then(mod => mod.ComponentReportsTab), {
  ssr: false,
  loading: () => <div className="p-8 text-center text-sm font-semibold text-muted-foreground animate-pulse">Loading Components...</div>
});
const AnalyticsPage = dynamic(() => import("../(dashboard)/analytics/page"), {
  ssr: false,
  loading: () => <div className="p-8 text-center text-sm font-semibold text-muted-foreground animate-pulse">Loading Analytics...</div>
});
const QualityControlPage = dynamic(() => import("../(dashboard)/quality-control/page"), {
  ssr: false,
  loading: () => <div className="p-8 text-center text-sm font-semibold text-muted-foreground animate-pulse">Loading Quality Control...</div>
});
const RevenueDashboardPage = dynamic(() => import("../(dashboard)/revenue/page"), {
  ssr: false,
  loading: () => <div className="p-8 text-center text-sm font-semibold text-muted-foreground animate-pulse">Loading Sales Invoices...</div>
});
const ActivityLogsPage = dynamic(() => import("../(dashboard)/activity-logs/page"), {
  ssr: false,
  loading: () => <div className="p-8 text-center text-sm font-semibold text-muted-foreground animate-pulse">Loading Activity Logs...</div>
});
const OEMPortalPage = dynamic(() => import("../(dashboard)/oem-portal/page"), {
  ssr: false,
  loading: () => <div className="p-8 text-center text-sm font-semibold text-muted-foreground animate-pulse">Loading OEM Portal...</div>
});
const WorkersPage = dynamic(() => import("../(dashboard)/workers/page"), {
  ssr: false,
  loading: () => <div className="p-8 text-center text-sm font-semibold text-muted-foreground animate-pulse">Loading Workers Directory...</div>
});

type AdminTabKey = 
  | "home" 
  | "production" 
  | "received"
  | "dispatch"
  | "attendance" 
  | "payroll"
  | "workers"
  | "components"
  | "qc"
  | "sales_invoices"
  | "invoice" 
  | "reports" 
  | "analytics"
  | "activity"
  | "oem"
  | "notifications"
  | "settings"
  | "support"
  | "profile";

export function AdminDashboard({ worker, onLogout }: { worker: any; onLogout: () => void }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<AdminTabKey>("home");
  const [prodStage, setProdStage] = useState<string>("all");
  const [prodView, setProdView] = useState<"kanban" | "table">("kanban");
  const [prodAutoForm, setProdAutoForm] = useState<"received" | "dispatch" | null>(null);
  const [showSidebar, setShowSidebar] = useState(false);

  // Queries for live metrics
  const { data: vehiclesData } = useVehicles({ page: 1, pageSize: 50 });
  const vehicles = Array.isArray(vehiclesData) ? vehiclesData : (vehiclesData?.items ?? []);
  
  const { data: workersData } = useWorkers({ page: 1, pageSize: 50 });
  const workers = Array.isArray(workersData) ? workersData : (workersData?.items ?? []);

  const { data: notifications = [] } = useNotifications();
  const unreadNotifsCount = Array.isArray(notifications) 
    ? notifications.filter((n: any) => !n.read).length 
    : 0;

  // Intercept back button to return to home tab seamlessly
  useEffect(() => {
    if (typeof window !== "undefined" && (!window.history.state || !window.history.state.tab)) {
      window.history.replaceState({ tab: activeTab }, "");
    }

    const onPopState = (e: PopStateEvent) => {
      if (e.state && e.state.tab) {
        setActiveTab(e.state.tab);
      } else {
        setActiveTab("home");
      }
      setProdAutoForm(null);
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const handleTabChange = (
    tab: AdminTabKey, 
    stage: string = "all", 
    view: "kanban" | "table" = "kanban", 
    autoForm: "received" | "dispatch" | null = null
  ) => {
    setProdStage(stage);
    setProdView(view);
    setProdAutoForm(autoForm);
    if (tab !== activeTab) {
      if (typeof window !== "undefined") {
        window.history.pushState({ tab }, "");
      }
      setActiveTab(tab);
    }
  };

  // Quick horizontal scroll container ref for auto-centering
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const activeTabPillRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (activeTabPillRef.current) {
      activeTabPillRef.current.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest"
      });
    }
  }, [activeTab]);

  // ALL SIDEBAR MODULES DEFINITION — ALL OPEN EMBEDDED INSIDE PWA!
  const allSidebarTabs = [
    // Production
    { id: "production", label: "Production", icon: Factory, color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300", category: "Production", action: () => handleTabChange("production", "all", "kanban", null) },
    { id: "received", label: "Received", icon: Inbox, color: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300", category: "Production", action: () => handleTabChange("received", "received", "table", null) },
    { id: "dispatch", label: "Dispatch", icon: Truck, color: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300", category: "Production", action: () => handleTabChange("dispatch", "dispatch", "table", null) },

    // Workforce
    { id: "workers", label: "Workers", icon: Users, color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300", category: "Workforce", action: () => handleTabChange("workers") },
    { id: "attendance", label: "Attendance", icon: Clock, color: "bg-teal-100 text-teal-700 dark:bg-teal-900/40 dark:text-teal-300", category: "Workforce", action: () => handleTabChange("attendance") },
    { id: "components", label: "Components", icon: Boxes, color: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300", category: "Workforce", action: () => handleTabChange("components") },
    { id: "payroll", label: "Payroll", icon: Banknote, color: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300", category: "Workforce", action: () => handleTabChange("payroll") },

    // Quality & Finance
    { id: "qc", label: "Quality Control", icon: CheckCircle2, color: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300", category: "Quality & Delivery", action: () => handleTabChange("qc") },
    { id: "sales_invoices", label: "Sales Invoices", icon: Banknote, color: "bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300", category: "Quality & Delivery", action: () => handleTabChange("sales_invoices") },
    { id: "invoice", label: "Purchase Invoices", icon: Receipt, color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300", category: "Quality & Delivery", action: () => handleTabChange("invoice") },

    // System
    { id: "reports", label: "Reports", icon: FileBarChart, color: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300", category: "System", action: () => handleTabChange("reports") },
    { id: "activity", label: "Activity Logs", icon: Activity, color: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300", category: "System", action: () => handleTabChange("activity") },
    { id: "oem", label: "OEM Portal", icon: Building2, color: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300", category: "System", action: () => handleTabChange("oem") },
    { id: "notifications", label: "Alerts", icon: Bell, color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300", category: "System", action: () => handleTabChange("notifications") },
    { id: "settings", label: "Settings", icon: Settings, color: "bg-zinc-100 text-zinc-700 dark:bg-zinc-800 dark:text-zinc-300", category: "System", action: () => handleTabChange("settings") },
  ];

  const adminName = worker?.name || "Admin";

  return (
    <div className="min-h-screen bg-background text-foreground pb-24 font-body select-none">
      
      {/* ─── 1. TOP HEADER (JUST LIKE SUPERVISOR PWA) ─────────────────────────── */}
      <header className="bg-card px-4 py-3 sticky top-0 z-40 border-b border-border shadow-xs flex items-center justify-between">
        
        {/* Left: Back button (if inside a subtab) OR Hamburger Menu (if on Home) */}
        <div className="flex items-center gap-2">
          {activeTab !== "home" ? (
            <button
              type="button"
              onClick={() => {
                if (typeof window !== "undefined" && window.history.state?.tab && window.history.state.tab !== "home") {
                  window.history.back();
                } else {
                  handleTabChange("home");
                }
              }}
              className="p-1.5 -ml-1 rounded-full text-foreground hover:bg-muted active:scale-95 transition-all flex items-center justify-center"
              title="Go Back to Home"
            >
              <ChevronLeft size={22} strokeWidth={2.5} />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setShowSidebar(true)}
              className="p-1.5 -ml-1 rounded-full text-foreground hover:bg-muted active:scale-95 transition-all flex items-center justify-center"
              title="Open Navigation Menu"
            >
              <Menu size={22} strokeWidth={2.2} />
            </button>
          )}

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center text-primary-foreground font-black text-xs shadow-sm">
              👑
            </div>
            <div>
              <h1 className="text-sm font-bold tracking-tight text-foreground leading-none truncate max-w-[170px]">
                {activeTab === "home" ? `Hello, ${adminName.split(" ")[0]} 👋` : allSidebarTabs.find(t => t.id === activeTab)?.label || "Module View"}
              </h1>
              <p className="text-[10px] text-primary font-extrabold tracking-wider uppercase mt-0.5">
                Admin Console
              </p>
            </div>
          </div>
        </div>

        {/* Right: Full ERP Switcher + Notification Bell + Avatar */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => router.push("/")}
            className="text-[11px] px-2.5 py-1.5 rounded-lg border border-border/80 bg-muted/60 font-bold text-foreground hover:bg-muted active:scale-95 transition-all flex items-center gap-1"
          >
            <span>ERP</span>
            <ArrowRight size={12} />
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("notifications")}
            className="relative p-1.5 rounded-full text-muted-foreground hover:bg-muted active:scale-95 transition-colors"
          >
            <Bell size={20} />
            {unreadNotifsCount > 0 && (
              <span className="absolute top-0.5 right-0.5 min-w-[16px] h-[16px] px-1 bg-destructive text-destructive-foreground text-[9px] font-black rounded-full flex items-center justify-center border-2 border-card animate-pulse">
                {unreadNotifsCount > 9 ? "9+" : unreadNotifsCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleTabChange("profile")}
            className="relative ml-0.5"
          >
            <div className="w-8 h-8 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold text-xs border border-primary/30">
              {adminName.charAt(0).toUpperCase()}
            </div>
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-[1.5px] border-card rounded-full bg-emerald-500" />
          </button>
        </div>
      </header>

      {/* ─── 2. HORIZONTAL SCROLLABLE TAB BUTTONS BAR (STICKY SUB-HEADER) ─────── */}
      <div 
        ref={scrollContainerRef}
        className="sticky top-[53px] z-30 bg-card/95 backdrop-blur-md border-b border-border/80 px-3 py-2 flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {allSidebarTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              ref={isActive ? activeTabPillRef : null}
              type="button"
              onClick={tab.action}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-150 shrink-0 select-none active:scale-95",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm shadow-primary/30 font-bold"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/60"
              )}
            >
              <Icon size={14} className={isActive ? "text-primary-foreground" : "text-muted-foreground"} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ─── 3. TAB CONTENT OR MAIN HOME DASHBOARD ────────────────────────────── */}
      <main className="p-3 sm:p-4 w-full max-w-5xl mx-auto">
        {activeTab === "home" && (
          <motion.div 
            initial={{ opacity: 0, y: 8 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.25 }}
            className="space-y-5"
          >
            {/* HERO EXECUTIVE CARD */}
            <div className="bg-gradient-to-br from-primary via-indigo-600 to-indigo-800 text-white rounded-3xl p-5 shadow-xl shadow-indigo-600/20 relative overflow-hidden border border-white/10">
              <div className="relative z-10">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black tracking-widest uppercase bg-white/20 text-white px-2.5 py-0.5 rounded-full">
                    Admin Executive Console
                  </span>
                  <span className="text-[11px] font-bold text-white/90 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Live ERP
                  </span>
                </div>

                <h2 className="text-xl font-black mt-2 mb-0.5">Manufacturing Floor Status</h2>
                <p className="text-xs font-medium text-white/80 mb-4">Enterprise access to all production, workforce & finance</p>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <div className="bg-black/20 backdrop-blur-sm rounded-2xl p-3 border border-white/10">
                    <p className="text-[10px] font-bold text-white/70 uppercase tracking-wider">Total Vehicles</p>
                    <p className="text-2xl font-black mt-0.5 text-white">{vehicles.length || "12"}</p>
                    <span className="text-[10px] text-emerald-300 font-semibold flex items-center gap-1 mt-0.5">
                      ✓ Line Active
                    </span>
                  </div>

                  <div className="bg-black/20 backdrop-blur-sm rounded-2xl p-3 border border-white/10">
                    <p className="text-[10px] font-bold text-white/70 uppercase tracking-wider">Active Workforce</p>
                    <p className="text-2xl font-black mt-0.5 text-white">{workers.length || "24"}</p>
                    <span className="text-[10px] text-emerald-300 font-semibold flex items-center gap-1 mt-0.5">
                      ✓ Synced Today
                    </span>
                  </div>
                </div>
              </div>

              {/* Decorative Glow */}
              <div className="absolute -right-8 -bottom-8 w-40 h-40 bg-white/10 rounded-full blur-2xl pointer-events-none" />
            </div>

            {/* ─── QUICK ACTIONS GRID (JUST LIKE SUPERVISOR PWA - ALL SIDEBAR ITEMS) ─── */}
            <div>
              <div className="flex items-center justify-between mb-3 px-1">
                <h3 className="text-sm font-bold text-foreground tracking-tight flex items-center gap-1.5">
                  <Grid size={16} className="text-primary" />
                  Quick Module Tabs (Sidebar Items)
                </h3>
                <span className="text-[11px] font-bold text-primary">
                  {allSidebarTabs.length} Modules
                </span>
              </div>

              <div className="grid grid-cols-4 gap-x-2 gap-y-4">
                {allSidebarTabs.map((item) => {
                  const Icon = item.icon;
                  return (
                    <motion.button 
                      key={item.id} 
                      whileTap={{ scale: 0.9 }}
                      onClick={item.action}
                      className="flex flex-col items-center justify-center gap-1.5 group cursor-pointer outline-none select-none"
                    >
                      <div className={cn(
                        "w-14 h-14 rounded-[18px] flex items-center justify-center transition-transform group-hover:scale-105 shadow-xs border border-border/40",
                        item.color
                      )}>
                        <Icon size={24} strokeWidth={2.4} />
                      </div>
                      <span className="text-[10.5px] font-bold text-foreground text-center leading-tight line-clamp-1">
                        {item.label}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </div>

            {/* QUICK ACTIONS BANNER */}
            <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">Need Desktop Experience?</span>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => router.push("/")}
                  className="rounded-xl text-xs font-bold h-8"
                >
                  Launch Full ERP
                </Button>
              </div>
            </div>
          </motion.div>
        )}

        {/* ─── EMBEDDED TAB COMPONENTS (REMAINS 100% INSIDE PWA!) ──────────────── */}

        {/* 1. PAYROLL TAB (EMBEDDED INSIDE PWA WITHOUT NAVIGATING AWAY!) */}
        {activeTab === "payroll" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <div>
                <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                  <Banknote className="w-5 h-5 text-emerald-600" />
                  Payroll Command Center
                </h2>
                <p className="text-xs text-muted-foreground">Compensation, OT & Advance Management</p>
              </div>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => handleTabChange("home")}
                className="h-8 rounded-xl text-xs font-semibold gap-1"
              >
                <ChevronLeft size={14} /> Back
              </Button>
            </div>

            <Tabs defaultValue="dashboard" className="w-full space-y-4">
              <div className="w-full">
                <TabsList className="w-full grid grid-cols-4 p-1 bg-muted/70 border border-border rounded-xl gap-1">
                  <TabsTrigger value="dashboard" className="whitespace-nowrap px-1 sm:px-3 py-2 text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1 sm:gap-1.5">
                    <Banknote size={14} className="shrink-0" />
                    <span className="truncate">Dashboard</span>
                  </TabsTrigger>
                  <TabsTrigger value="employees" className="whitespace-nowrap px-1 sm:px-3 py-2 text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1 sm:gap-1.5">
                    <Users size={14} className="shrink-0" />
                    <span className="truncate">Employees</span>
                  </TabsTrigger>
                  <TabsTrigger value="advances" className="whitespace-nowrap px-1 sm:px-3 py-2 text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1 sm:gap-1.5">
                    <HandCoins size={14} className="shrink-0" />
                    <span className="truncate">Advances</span>
                  </TabsTrigger>
                  <TabsTrigger value="analytics" className="whitespace-nowrap px-1 sm:px-3 py-2 text-[11px] sm:text-xs font-semibold flex items-center justify-center gap-1 sm:gap-1.5">
                    <BarChart3 size={14} className="shrink-0" />
                    <span className="truncate">Analytics</span>
                  </TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="dashboard" className="outline-none mt-2">
                <PayrollDashboardTab />
              </TabsContent>
              <TabsContent value="employees" className="outline-none mt-2">
                <PayrollEmployeesTab />
              </TabsContent>
              <TabsContent value="advances" className="outline-none mt-2">
                <PayrollAdvancesTab />
              </TabsContent>
              <TabsContent value="analytics" className="outline-none mt-2">
                <PayrollAnalyticsTab />
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* 2. WORKERS DIRECTORY TAB */}
        {activeTab === "workers" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Users className="w-5 h-5 text-emerald-600" />
                Workforce Directory
              </h2>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => handleTabChange("home")}
                className="h-8 rounded-xl text-xs font-semibold gap-1"
              >
                <ChevronLeft size={14} /> Back
              </Button>
            </div>
            <WorkersPage />
          </div>
        )}

        {/* 3. COMPONENTS (BOM) TAB */}
        {activeTab === "components" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Boxes className="w-5 h-5 text-amber-600" />
                Components & BOM Tracking
              </h2>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => handleTabChange("home")}
                className="h-8 rounded-xl text-xs font-semibold gap-1"
              >
                <ChevronLeft size={14} /> Back
              </Button>
            </div>
            <ComponentReportsTab dateRange="Last 30 Days" />
          </div>
        )}

        {/* 4. PRODUCTION KANBAN / TABLE TAB */}
        {(activeTab === "production" || activeTab === "received" || activeTab === "dispatch") && (
          <ProductionTab 
            activeUser={worker} 
            initialStage={prodStage} 
            initialViewMode={prodView} 
            autoOpenForm={prodAutoForm} 
          />
        )}

        {/* 5. ATTENDANCE TAB */}
        {activeTab === "attendance" && (
          <AttendanceTab activeUser={worker} />
        )}

        {/* 6. PURCHASE INVOICES TAB */}
        {activeTab === "invoice" && (
          <InvoiceTab activeUser={worker} />
        )}

        {/* 7. SALES INVOICES (REVENUE) TAB */}
        {activeTab === "sales_invoices" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Banknote className="w-5 h-5 text-violet-600" />
                Sales Invoices & Revenue
              </h2>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => handleTabChange("home")}
                className="h-8 rounded-xl text-xs font-semibold gap-1"
              >
                <ChevronLeft size={14} /> Back
              </Button>
            </div>
            <RevenueDashboardPage />
          </div>
        )}

        {/* 8. QUALITY CONTROL TAB */}
        {activeTab === "qc" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                Quality Control & Inspection
              </h2>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => handleTabChange("home")}
                className="h-8 rounded-xl text-xs font-semibold gap-1"
              >
                <ChevronLeft size={14} /> Back
              </Button>
            </div>
            <QualityControlPage />
          </div>
        )}

        {/* 9. ANALYTICS TAB */}
        {activeTab === "analytics" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-purple-600" />
                Manufacturing Analytics
              </h2>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => handleTabChange("home")}
                className="h-8 rounded-xl text-xs font-semibold gap-1"
              >
                <ChevronLeft size={14} /> Back
              </Button>
            </div>
            <AnalyticsPage />
          </div>
        )}

        {/* 10. ACTIVITY LOGS TAB */}
        {activeTab === "activity" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Activity className="w-5 h-5 text-red-600" />
                System Activity Logs
              </h2>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => handleTabChange("home")}
                className="h-8 rounded-xl text-xs font-semibold gap-1"
              >
                <ChevronLeft size={14} /> Back
              </Button>
            </div>
            <ActivityLogsPage />
          </div>
        )}

        {/* 11. OEM PORTAL TAB */}
        {activeTab === "oem" && (
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h2 className="text-base font-bold text-foreground flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-600" />
                OEM Portal
              </h2>
              <Button 
                size="sm" 
                variant="outline" 
                onClick={() => handleTabChange("home")}
                className="h-8 rounded-xl text-xs font-semibold gap-1"
              >
                <ChevronLeft size={14} /> Back
              </Button>
            </div>
            <OEMPortalPage />
          </div>
        )}

        {/* 12. REPORTS TAB */}
        {activeTab === "reports" && (
          <ReportsTab activeUser={worker} />
        )}

        {/* 13. NOTIFICATIONS TAB */}
        {activeTab === "notifications" && (
          <NotificationsTab activeUser={worker} setActiveTab={handleTabChange} />
        )}

        {/* 14. SETTINGS TAB */}
        {activeTab === "settings" && (
          <WorkerSettingsTab />
        )}

        {/* 15. SUPPORT TAB */}
        {activeTab === "support" && (
          <WorkerSupportTab />
        )}

        {/* 16. PROFILE TAB */}
        {activeTab === "profile" && (
          <WorkerProfileTab 
            worker={worker} 
            onLogout={onLogout} 
            getTranslation={(_lang: any, str: string) => str}
            langIndex={0}
          />
        )}
      </main>

      {/* ─── 4. FLOATING BOTTOM NAVIGATION BAR (JUST LIKE SUPERVISOR PWA) ───────── */}
      <div className="floating-home-bar fixed bottom-0 left-0 right-0 p-3 z-30 pointer-events-none flex justify-center pb-safe">
        <div className="bg-card/95 backdrop-blur-md rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.15)] border border-border/80 p-1.5 flex items-center gap-1 pointer-events-auto">
          
          <button 
            type="button"
            onClick={() => handleTabChange("home")} 
            className={cn(
              "flex items-center gap-1.5 px-4 py-2 rounded-full transition-all text-xs font-bold active:scale-95",
              activeTab === "home" 
                ? "bg-primary text-primary-foreground shadow-xs" 
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            <LayoutDashboard size={18} strokeWidth={2.4} />
            <span>Home</span>
          </button>

          <button 
            type="button"
            onClick={() => handleTabChange("production")} 
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-2 rounded-full transition-all text-xs font-bold active:scale-95",
              activeTab === "production" || activeTab === "received" || activeTab === "dispatch"
                ? "bg-primary text-primary-foreground shadow-xs" 
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            <Factory size={18} strokeWidth={2.4} />
            <span className="hidden sm:inline">Production</span>
          </button>

          <button 
            type="button"
            onClick={() => handleTabChange("payroll")} 
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-2 rounded-full transition-all text-xs font-bold active:scale-95",
              activeTab === "payroll" 
                ? "bg-primary text-primary-foreground shadow-xs" 
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            <Banknote size={18} strokeWidth={2.4} />
            <span className="hidden sm:inline">Payroll</span>
          </button>

          <button 
            type="button"
            onClick={() => handleTabChange("attendance")} 
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-2 rounded-full transition-all text-xs font-bold active:scale-95",
              activeTab === "attendance" 
                ? "bg-primary text-primary-foreground shadow-xs" 
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            <Clock size={18} strokeWidth={2.4} />
            <span className="hidden sm:inline">Attendance</span>
          </button>

          <button 
            type="button"
            onClick={() => handleTabChange("invoice")} 
            className={cn(
              "flex items-center gap-1.5 px-3.5 py-2 rounded-full transition-all text-xs font-bold active:scale-95",
              activeTab === "invoice" 
                ? "bg-primary text-primary-foreground shadow-xs" 
                : "text-muted-foreground hover:bg-muted"
            )}
          >
            <Receipt size={18} strokeWidth={2.4} />
            <span className="hidden sm:inline">Invoices</span>
          </button>

          <button 
            type="button"
            onClick={() => setShowSidebar(true)} 
            className="flex items-center gap-1.5 px-3 py-2 rounded-full transition-all text-xs font-bold text-muted-foreground hover:bg-muted active:scale-95"
            title="All Modules"
          >
            <Grid size={18} strokeWidth={2.4} />
          </button>

        </div>
      </div>

      {/* ─── 5. SIDEBAR DRAWER (ALL SIDEBAR GROUPS) ───────────────────────────── */}
      <AnimatePresence>
        {showSidebar && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} 
              animate={{ opacity: 1 }} 
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs z-50 md:hidden"
              onClick={() => setShowSidebar(false)}
            />
            
            <motion.div 
              initial={{ x: "-100%" }} 
              animate={{ x: 0 }} 
              exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.28, ease: "easeInOut" }}
              className="fixed top-0 left-0 bottom-0 w-[82%] max-w-[320px] bg-card text-card-foreground z-50 flex flex-col shadow-2xl border-r border-border pt-safe"
            >
              {/* Profile Card Header */}
              <div className="p-5 bg-gradient-to-r from-primary to-indigo-600 text-white">
                <div className="flex items-center justify-between mb-3">
                  <div className="w-12 h-12 rounded-full bg-white/20 border-2 border-white/50 flex items-center justify-center font-bold text-lg text-white">
                    {adminName.charAt(0).toUpperCase()}
                  </div>
                  <button 
                    onClick={() => setShowSidebar(false)}
                    className="p-1.5 rounded-full bg-white/10 text-white hover:bg-white/20"
                  >
                    <X size={18} />
                  </button>
                </div>
                <div>
                  <h2 className="text-base font-bold leading-tight">{adminName}</h2>
                  <p className="text-[11px] text-white/80 mt-0.5">{worker?.email || "admin@foxflow.internal"}</p>
                  <span className="inline-block mt-2 text-[9px] font-black uppercase tracking-widest bg-white/25 px-2 py-0.5 rounded-full">
                    Enterprise Admin
                  </span>
                </div>
              </div>

              {/* Sidebar Modules List grouped */}
              <div className="flex-1 overflow-y-auto p-3 space-y-4 scrollbar-thin">
                {["Production", "Workforce", "Quality & Delivery", "System"].map((category) => {
                  const items = allSidebarTabs.filter(item => item.category === category);
                  return (
                    <div key={category} className="space-y-1">
                      <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground px-2">
                        {category}
                      </p>
                      {items.map((item) => {
                        const Icon = item.icon;
                        const isCurrent = activeTab === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => {
                              setShowSidebar(false);
                              item.action();
                            }}
                            className={cn(
                              "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all active:scale-98",
                              isCurrent
                                ? "bg-primary text-primary-foreground shadow-xs font-bold"
                                : "text-foreground hover:bg-muted"
                            )}
                          >
                            <Icon size={18} className={isCurrent ? "text-primary-foreground" : "text-muted-foreground"} />
                            <span>{item.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  );
                })}
              </div>

              {/* Footer with Logout */}
              <div className="p-3 border-t border-border/80">
                <button
                  type="button"
                  onClick={() => {
                    setShowSidebar(false);
                    onLogout();
                  }}
                  className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20 font-bold text-xs transition-colors"
                >
                  <LogOut size={16} />
                  <span>Logout</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

    </div>
  );
}
