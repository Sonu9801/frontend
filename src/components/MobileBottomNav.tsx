"use client";

import React, { useState } from "react";
import { useAuthStore } from "@/store/authStore";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Factory,
  Users,
  Truck,
  Settings,
  Building2,
  Clock,
  LayoutGrid,
  X,
  Search,
  BarChart3,
  Inbox,
  Boxes,
  Banknote,
  CheckCircle2,
  FileBarChart,
  Activity,
  LogOut,
  ChevronRight,
  User,
  Sun,
  Moon,
  Laptop
} from "lucide-react";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "motion/react";
import { authApi } from "@/lib/api";
import { useTheme } from "next-themes";

interface ModuleItem {
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  color: string;
  category: string;
  badge?: string;
}

const allModulesList: ModuleItem[] = [
  // Overview
  { label: "Dashboard", href: "/", icon: LayoutDashboard, color: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/20", category: "Overview" },
  { label: "Analytics", href: "/analytics", icon: BarChart3, color: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/20", category: "Overview" },
  { label: "Supervisor Hub", href: "/workforce/supervisor", icon: Users, color: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/20", category: "Overview" },
  
  // Production
  { label: "All Vehicles", href: "/production", icon: Factory, color: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20", category: "Production" },
  { label: "Received Vehicles", href: "/production/received", icon: Inbox, color: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-500/20", category: "Production" },
  { label: "Dispatch Hub", href: "/dispatch", icon: Truck, color: "bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/20", category: "Production" },
  
  // Workforce
  { label: "Workers Directory", href: "/workers", icon: Users, color: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/20", category: "Workforce" },
  { label: "Attendance Live", href: "/attendance", icon: Clock, color: "bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/20", category: "Workforce" },
  { label: "BOM Components", href: "/components", icon: Boxes, color: "bg-yellow-500/15 text-yellow-600 dark:text-yellow-400 border-yellow-500/20", category: "Workforce" },
  { label: "Payroll Master", href: "/payroll", icon: Banknote, color: "bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/20", category: "Workforce" },
  
  // Quality & Delivery
  { label: "Quality Control", href: "/quality-control", icon: CheckCircle2, color: "bg-green-500/15 text-green-600 dark:text-green-400 border-green-500/20", category: "Quality & Delivery" },
  { label: "Sales Invoices", href: "/revenue", icon: Banknote, color: "bg-violet-500/15 text-violet-600 dark:text-violet-400 border-violet-500/20", category: "Quality & Delivery" },
  { label: "Purchase Invoices", href: "/invoices", icon: Banknote, color: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/20", category: "Quality & Delivery" },
  
  // System
  { label: "Reports & Exports", href: "/reports", icon: FileBarChart, color: "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/20", category: "System" },
  { label: "Activity Logs", href: "/activity-logs", icon: Activity, color: "bg-red-500/15 text-red-600 dark:text-red-400 border-red-500/20", category: "System" },
  { label: "OEM Portal", href: "/oem-portal", icon: Building2, color: "bg-blue-600/15 text-blue-600 dark:text-blue-400 border-blue-600/20", category: "System" },
  { label: "System Settings", href: "/settings", icon: Settings, color: "bg-zinc-500/15 text-zinc-600 dark:text-zinc-400 border-zinc-500/20", category: "System" },
];

export function MobileBottomNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { role, logout, name, email } = useAuthStore();
  const { theme, setTheme } = useTheme();
  const currentRole = role?.toLowerCase() || "manager";
  const [showProfileSheet, setShowProfileSheet] = useState(false);
  const [showModulesSheet, setShowModulesSheet] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");

  const isAdminRole = ["admin", "manager", "owner"].includes(currentRole);
  const displayName = name || "Sonu";

  let navItems = [];

  if (currentRole === "worker") {
    navItems = [
      { label: "Home", href: "/workforce", icon: LayoutDashboard },
      { label: "Attendance", href: "/attendance", icon: Clock },
      { label: "Profile", href: "#profile", icon: User, isAction: true },
    ];
  } else if (currentRole === "oem") {
    navItems = [
      { label: "Portal", href: "/oem-portal", icon: Building2 },
      { label: "Profile", href: "#profile", icon: User, isAction: true },
    ];
  } else if (currentRole === "attendance" || currentRole === "attendance_only") {
    navItems = [
      { label: "Attendance", href: "/attendance", icon: Clock },
      { label: "Profile", href: "#profile", icon: User, isAction: true },
    ];
  } else if (currentRole === "dispatcher" || currentRole === "dispatch") {
    navItems = [
      { label: "Received", href: "/production?category=All+Categories", icon: Factory },
      { label: "Dispatch", href: "/dispatch", icon: Truck },
      { label: "Profile", href: "#profile", icon: User, isAction: true },
    ];
  } else if (currentRole === "supervisor") {
    navItems = [
      { label: "Home", href: "/workforce/supervisor", icon: LayoutDashboard },
      { label: "Production", href: "/production", icon: Factory },
      { label: "Dispatch", href: "/dispatch", icon: Truck },
      { label: "Workers", href: "/workers", icon: Users },
      { label: "Profile", href: "#profile", icon: User, isAction: true },
    ];
  } else {
    // Manager, Owner, Admin
    navItems = [
      { label: "Home", href: "/", icon: LayoutDashboard },
      { label: "Production", href: "/production", icon: Factory },
      { label: "Workers", href: "/workers", icon: Users },
      { label: "Dispatch", href: "/dispatch", icon: Truck },
      { label: "Profile", href: "#profile", icon: User, isAction: true },
    ];
  }

  const handleSignOut = async () => {
    try {
      await authApi.logout();
    } catch (e) {
      console.error("Backend logout failed:", e);
    }
    logout();
    router.push("/login");
  };

  const filteredModules = allModulesList.filter((m) =>
    m.label.toLowerCase().includes(searchFilter.toLowerCase()) ||
    m.category.toLowerCase().includes(searchFilter.toLowerCase())
  );

  const categories = Array.from(new Set(filteredModules.map((m) => m.category)));

  return (
    <>
      <nav 
        aria-label="Mobile Bottom Navigation"
        className="fixed bottom-0 w-full bg-card/95 backdrop-blur-md border-t border-border z-50 md:hidden pb-safe shadow-[0_-4px_16px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_16px_rgba(0,0,0,0.3)]"
      >
        <div className="flex justify-around items-center h-16 px-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            
            if (item.isAction) {
              const isActive = showProfileSheet || pathname === "/settings";
              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => setShowProfileSheet(!showProfileSheet)}
                  className={cn(
                    "flex flex-col items-center justify-center w-full h-full gap-1 active:scale-95 transition-all select-none relative",
                    isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <div className={cn(
                    "relative p-1 rounded-xl transition-all",
                    isActive ? "bg-primary/10 text-primary" : ""
                  )}>
                    <Icon size={21} strokeWidth={isActive ? 2.5 : 2} className={cn(isActive && "drop-shadow-[0_0_8px_rgba(var(--primary),0.5)]")} />
                  </div>
                  <span className={cn("text-[10px] tracking-wide", isActive ? "font-bold text-primary" : "font-medium")}>
                    {item.label}
                  </span>
                </button>
              );
            }

            let isActive = false;
            if (item.href === "/") {
              isActive = pathname === "/";
            } else if (item.href.includes("?")) {
              isActive = typeof window !== "undefined" && window.location.search.includes(item.href.split("?")[1]);
            } else {
              isActive = pathname.startsWith(item.href);
            }

            return (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => {
                  setShowProfileSheet(false);
                  setShowModulesSheet(false);
                }}
                className={cn(
                  "flex flex-col items-center justify-center w-full h-full gap-1 active:scale-95 transition-all select-none",
                  isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                )}
              >
                <Icon size={21} strokeWidth={isActive ? 2.5 : 2} className={cn(isActive && "drop-shadow-[0_0_8px_rgba(var(--primary),0.5)]")} />
                <span className={cn("text-[10px] tracking-wide", isActive ? "font-bold text-primary" : "font-medium")}>
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* PROFILE BOTTOM SHEET MODAL */}
      <AnimatePresence>
        {showProfileSheet && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setShowProfileSheet(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] md:hidden"
            />

            {/* Profile Bottom Sheet Modal */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed inset-x-0 bottom-0 max-h-[88vh] bg-card border-t border-border rounded-t-[28px] shadow-2xl z-[70] flex flex-col md:hidden pb-safe"
            >
              {/* Sheet Drag Handle & Header */}
              <div className="pt-3 pb-3 px-5 flex flex-col border-b border-border/60">
                <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full mx-auto mb-2.5" />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <User size={18} className="text-primary" />
                    <h2 className="text-base font-bold text-foreground">User Profile</h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowProfileSheet(false)}
                    className="p-1.5 rounded-full bg-muted/60 text-muted-foreground hover:text-foreground active:scale-95 transition-all"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>

              {/* Sheet Body */}
              <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4 scrollbar-thin">
                {/* User Info Card */}
                <div className="flex items-center gap-3.5 p-3.5 rounded-2xl bg-gradient-to-br from-primary/10 via-sky-500/5 to-transparent border border-primary/20 shadow-2xs">
                  <div className="relative">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center text-lg font-black shadow-md">
                      {displayName.charAt(0).toUpperCase()}
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-card" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-black text-foreground truncate">{displayName}</h3>
                      <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded-full bg-primary text-primary-foreground">
                        {currentRole}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground truncate mt-0.5 font-medium">
                      {email || `${displayName.toLowerCase()}@foxenterprises.in`}
                    </p>
                    <div className="flex items-center gap-1 text-[11px] font-bold text-primary mt-1">
                      <Building2 size={12} />
                      <span>FOX ENTERPRISES</span>
                    </div>
                  </div>
                </div>

                {/* Quick Account Links */}
                <div className="space-y-1.5">
                  <span className="text-[10.5px] font-bold text-muted-foreground uppercase tracking-wider px-1">
                    Account & System
                  </span>

                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileSheet(false);
                      router.push("/settings");
                    }}
                    className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-muted/60 active:scale-[0.99] transition-all border border-border/60 text-left bg-card"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                        <User size={18} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground">My Profile & Security</p>
                        <p className="text-[10px] text-muted-foreground">Personal details, password & access</p>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-muted-foreground" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileSheet(false);
                      router.push("/settings");
                    }}
                    className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-muted/60 active:scale-[0.99] transition-all border border-border/60 text-left bg-card"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                        <Settings size={18} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground">Factory Configuration</p>
                        <p className="text-[10px] text-muted-foreground">Facility setup, team roles & rules</p>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-muted-foreground" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileSheet(false);
                      setShowModulesSheet(true);
                    }}
                    className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-muted/60 active:scale-[0.99] transition-all border border-border/60 text-left bg-card"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                        <LayoutGrid size={18} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground">All ERP Modules (16)</p>
                        <p className="text-[10px] text-muted-foreground">Production, Workers, Dispatch & more</p>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-muted-foreground" />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowProfileSheet(false);
                      router.push("/activity-logs");
                    }}
                    className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-muted/60 active:scale-[0.99] transition-all border border-border/60 text-left bg-card"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                        <Activity size={18} />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-foreground">Activity & Audit Logs</p>
                        <p className="text-[10px] text-muted-foreground">Recent actions across system</p>
                      </div>
                    </div>
                    <ChevronRight size={16} className="text-muted-foreground" />
                  </button>
                </div>

                {/* Appearance / Theme Switcher */}
                <div className="p-3.5 rounded-2xl bg-muted/40 border border-border/60">
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-xs font-bold text-foreground">Theme & Appearance</span>
                    <span className="text-[10px] font-semibold text-muted-foreground uppercase">{theme || "system"}</span>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setTheme("light")}
                      className={cn(
                        "flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold border transition-all",
                        theme === "light"
                          ? "bg-card text-primary border-primary shadow-xs"
                          : "bg-muted/50 text-muted-foreground border-transparent hover:text-foreground"
                      )}
                    >
                      <Sun size={14} />
                      <span>Light</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTheme("dark")}
                      className={cn(
                        "flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold border transition-all",
                        theme === "dark"
                          ? "bg-card text-primary border-primary shadow-xs"
                          : "bg-muted/50 text-muted-foreground border-transparent hover:text-foreground"
                      )}
                    >
                      <Moon size={14} />
                      <span>Dark</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setTheme("system")}
                      className={cn(
                        "flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-semibold border transition-all",
                        theme === "system"
                          ? "bg-card text-primary border-primary shadow-xs"
                          : "bg-muted/50 text-muted-foreground border-transparent hover:text-foreground"
                      )}
                    >
                      <Laptop size={14} />
                      <span>Auto</span>
                    </button>
                  </div>
                </div>

                {/* Sign Out Button */}
                <button
                  type="button"
                  onClick={() => {
                    setShowProfileSheet(false);
                    handleSignOut();
                  }}
                  className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-destructive/10 text-destructive border border-destructive/20 font-bold text-xs hover:bg-destructive/20 active:scale-[0.98] transition-all"
                >
                  <LogOut size={16} />
                  <span>Sign Out of FOX ENTERPRISES</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ALL MODULES BOTTOM SHEET MODAL (FOR ADMIN & SUPERVISOR EASY ACCESS) */}
      <AnimatePresence>
        {showModulesSheet && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setShowModulesSheet(false)}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60] md:hidden"
            />

            {/* Bottom Sheet Modal */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed inset-x-0 bottom-0 max-h-[88vh] bg-card border-t border-border rounded-t-[28px] shadow-2xl z-[70] flex flex-col md:hidden pb-safe"
            >
              {/* Sheet Drag Handle & Header */}
              <div className="pt-3 pb-2 px-4 flex flex-col border-b border-border/60">
                <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full mx-auto mb-3" />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-bold">
                      <LayoutGrid size={20} />
                    </div>
                    <div>
                      <h2 className="text-base font-bold text-foreground leading-tight flex items-center gap-2">
                        FoxFlow Modules
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/15 text-primary font-extrabold uppercase">
                          {isAdminRole ? "Admin Hub" : "Supervisor Hub"}
                        </span>
                      </h2>
                      <p className="text-xs text-muted-foreground">Quick access to all ERP apps & features</p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowModulesSheet(false)}
                    className="p-2 rounded-full bg-muted/60 text-muted-foreground hover:text-foreground active:scale-95 transition-all"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Instant Search Filter */}
                <div className="relative mt-3">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
                  <input
                    type="text"
                    value={searchFilter}
                    onChange={(e) => setSearchFilter(e.target.value)}
                    placeholder="Search any module (e.g. attendance, payroll)..."
                    className="w-full bg-muted/50 border border-border/70 rounded-xl pl-9 pr-8 py-2 text-xs font-medium placeholder:text-muted-foreground/70 focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-all"
                  />
                  {searchFilter && (
                    <button
                      type="button"
                      onClick={() => setSearchFilter("")}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
              </div>

              {/* Modules Grid categorized */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4 scrollbar-thin">
                {categories.length === 0 ? (
                  <div className="text-center py-10">
                    <p className="text-sm font-semibold text-muted-foreground">No modules found matching &ldquo;{searchFilter}&rdquo;</p>
                  </div>
                ) : (
                  categories.map((category) => {
                    const items = filteredModules.filter((m) => m.category === category);
                    return (
                      <div key={category} className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                            {category}
                          </span>
                          <span className="text-[10px] font-semibold text-muted-foreground/70">
                            {items.length} items
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          {items.map((item) => {
                            const Icon = item.icon;
                            const isActive = item.href === "/" 
                              ? pathname === "/" 
                              : pathname.startsWith(item.href);

                            return (
                              <button
                                key={item.label}
                                type="button"
                                onClick={() => {
                                  setShowModulesSheet(false);
                                  router.push(item.href);
                                }}
                                className={cn(
                                  "flex items-center gap-3 p-3 rounded-2xl border text-left transition-all active:scale-95 duration-150",
                                  isActive
                                    ? "bg-primary/10 border-primary/40 shadow-sm"
                                    : "bg-card hover:bg-muted/40 border-border/70"
                                )}
                              >
                                <div className={cn(
                                  "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border",
                                  item.color
                                )}>
                                  <Icon size={20} />
                                </div>
                                <div className="min-w-0 flex-1">
                                  <p className={cn(
                                    "text-xs font-bold leading-tight truncate",
                                    isActive ? "text-primary" : "text-foreground"
                                  )}>
                                    {item.label}
                                  </p>
                                  <span className="text-[10px] text-muted-foreground flex items-center gap-0.5 mt-0.5">
                                    Open <ChevronRight size={10} />
                                  </span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })
                )}

                {/* Footer Quick Profile/Actions */}
                <div className="pt-3 pb-4 border-t border-border/60 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModulesSheet(false);
                      router.push("/settings");
                    }}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:bg-muted"
                  >
                    <Settings size={16} />
                    Settings
                  </button>

                  <button
                    type="button"
                    onClick={handleSignOut}
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-destructive hover:bg-destructive/10"
                  >
                    <LogOut size={16} />
                    Sign Out
                  </button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
