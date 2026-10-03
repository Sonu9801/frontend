"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { useUIStore } from "@/store/uiStore";
import { useAuthStore } from "@/store/authStore";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Boxes,
  Building2,
  Cable,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Factory,
  LayoutDashboard,
  Package,
  Radio,
  Settings,
  Trash2,
  Truck,
  Users,
  Wrench,
  Zap,
  Clock,
  Banknote,
  FileBarChart,
  Activity,
  Bell
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";

const navGroups = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", href: "/", icon: LayoutDashboard, roles: ["admin", "manager", "owner"] },
      { label: "Supervisor Dashboard", href: "/workforce/supervisor", icon: LayoutDashboard, roles: ["admin", "manager", "owner", "supervisor"] },
      { label: "Analytics", href: "/analytics", icon: BarChart3, roles: ["admin", "manager", "owner"] },
    ]
  },
  {
    title: "Production",
    items: [
      { label: "All Vehicles", href: "/production?category=All+Categories", icon: Factory, roles: ["admin", "manager", "owner", "supervisor", "dispatcher", "dispatch"] },
      { label: "Cargo Box", href: "/production?category=Cargo+Box", icon: Package, roles: ["admin", "manager", "owner", "supervisor", "dispatcher", "dispatch"] },
      { label: "Cargo Box / Air Cutter / Battery Box", href: "/production?category=Cargo+Box+%2F+Air+Cutter+%2F+Battery+Box", icon: Package, roles: ["admin", "manager", "owner", "supervisor", "dispatcher", "dispatch"] },
      { label: "Cargo Box / Air Cutter", href: "/production?category=Cargo+Box+%2F+Air+Cutter", icon: Package, roles: ["admin", "manager", "owner", "supervisor", "dispatcher", "dispatch"] },
      { label: "Cargo Box / Battery Box", href: "/production?category=Cargo+Box+%2F+Battery+Box", icon: Package, roles: ["admin", "manager", "owner", "supervisor", "dispatcher", "dispatch"] },
      { label: "Garbage Body", href: "/production?category=Garbage+Body", icon: Trash2, roles: ["admin", "manager", "owner", "supervisor", "dispatcher", "dispatch"] },
      { label: "Grocery Cart", href: "/production?category=Grocery+Cart", icon: Package, roles: ["admin", "manager", "owner", "supervisor", "dispatcher", "dispatch"] },
      { label: "Food Cart", href: "/production?category=Food+Cart", icon: Package, roles: ["admin", "manager", "owner", "supervisor", "dispatcher", "dispatch"] },
    ]
  },
  {
    title: "Workforce",
    items: [
      { label: "Workers", href: "/workers", icon: Users, roles: ["admin", "manager", "owner", "supervisor"] },
      { label: "Attendance", href: "/attendance", icon: Clock, roles: ["admin", "manager", "owner", "supervisor", "attendance", "attendance_only"] },
      { label: "Components", href: "/components", icon: Boxes, roles: ["admin", "manager", "owner", "supervisor"] },
      { label: "Payroll", href: "/payroll", icon: Banknote, roles: ["admin", "manager", "owner", "hr"] },
    ]
  },
  {
    title: "Quality & Delivery",
    items: [
      { label: "Quality Control", href: "/quality-control", icon: CheckCircle2, roles: ["admin", "manager", "owner", "supervisor"] },
      { label: "Dispatch", href: "/dispatch", icon: Truck, roles: ["admin", "manager", "owner", "supervisor", "dispatcher", "dispatch"] },
      { label: "Sales Invoices", href: "/revenue", icon: Banknote, roles: ["admin", "manager", "owner", "finance"] },
      { label: "Purchase Invoices", href: "/invoices", icon: Banknote, roles: ["admin", "manager", "owner", "finance", "supervisor"] },
    ]
  },
  {
    title: "System",
    items: [
      { label: "Reports", href: "/reports", icon: FileBarChart, roles: ["admin", "manager", "owner", "supervisor"] },
      { label: "Activity Logs", href: "/activity-logs", icon: Activity, roles: ["admin", "manager", "owner"] },
      { label: "Notifications", href: "/notifications", icon: Bell, roles: ["admin", "manager", "owner", "supervisor", "dispatcher", "dispatch"] },
      { label: "OEM Portal", href: "/oem-portal", icon: Building2, roles: ["admin", "manager", "owner", "oem"] },
      { label: "Settings", href: "/settings", icon: Settings, roles: ["admin", "manager", "owner"] },
    ]
  }
];

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const { name, email, role, initialize } = useAuthStore();
  const pathname = usePathname();
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({
    "Overview": true,
    "Production": true,
    "Workforce": true,
    "Quality & Delivery": true,
    "System": true
  });

  useEffect(() => {
    initialize();
  }, [initialize]);

  const displayUser = name ? name.toUpperCase() : "FM";
  const displayRole = role ? `${role.charAt(0).toUpperCase()}${role.slice(1)}` : "Factory Manager";
  const displayEmail = email ? email : "admin@foxflow.in";

  const toggleGroup = (title: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [title]: !prev[title]
    }));
  };

  return (
    <TooltipProvider delayDuration={0}>
      <motion.aside
        initial={false}
        animate={{ width: sidebarCollapsed ? 64 : 260 }}
        transition={{ duration: 0.25, ease: [0.4, 0, 0.2, 1] }}
        className="relative flex flex-col h-full bg-sidebar border-r border-sidebar-border overflow-hidden flex-shrink-0 z-30"
      >
        <div className="flex items-center justify-between h-16 px-3 border-b border-sidebar-border bg-sidebar flex-shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center flex-shrink-0 shadow-sm">
              <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 text-primary-foreground" stroke="currentColor" strokeWidth={2}>
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <AnimatePresence>
              {!sidebarCollapsed && (
                <motion.div
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: "auto" }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <span className="font-display font-extrabold text-sidebar-foreground text-sm tracking-tight whitespace-nowrap block">
                    FOXFLOW
                  </span>
                  <span className="block text-[10px] text-primary font-bold tracking-widest uppercase whitespace-nowrap">
                    ERP
                  </span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            type="button"
            onClick={toggleSidebar}
            title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="p-1.5 rounded-lg text-sidebar-foreground/60 hover:text-sidebar-foreground hover:bg-sidebar-accent transition-colors flex-shrink-0"
          >
            {sidebarCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto [overscroll-behavior:contain] px-3 py-4 space-y-4">
          {navGroups.map((group) => {
            const userRole = role?.toLowerCase() || "";
            const filteredItems = group.items.filter(item => {
              if (userRole === "admin" || userRole === "manager" || userRole === "owner") return true;
              if (userRole === "oem") return item.roles?.includes("oem");
              if (!item.roles) return false;
              return item.roles.includes(userRole);
            });
            
            if (filteredItems.length === 0) return null;

            return (
            <div key={group.title} className="flex flex-col gap-1">
              {!sidebarCollapsed ? (
                <button 
                  onClick={() => toggleGroup(group.title)}
                  className="flex items-center justify-between px-2.5 py-1.5 w-full text-left rounded-md hover:bg-sidebar-accent/50 transition-colors"
                >
                  <span className="text-[11px] font-bold uppercase tracking-wider text-sidebar-foreground/50">
                    {group.title}
                  </span>
                  <ChevronDown 
                    size={14} 
                    className={cn(
                      "text-sidebar-foreground/40 transition-transform duration-200",
                      expandedGroups[group.title] ? "" : "-rotate-90"
                    )}
                  />
                </button>
              ) : (
                <div className="h-4 border-b border-sidebar-border/30 mb-2 mx-2" />
              )}
              
              <AnimatePresence initial={false}>
                {(expandedGroups[group.title] || sidebarCollapsed) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="flex flex-col gap-1 overflow-hidden"
                  >
                    {filteredItems.map((item) => {
                      const Icon = item.icon;
                      let isActive = false;
                      if (item.href === "/") {
                        isActive = pathname === "/";
                      } else if (item.href.includes("?")) {
                        // Very simple active check for now
                        isActive = typeof window !== 'undefined' && window.location.search.includes(item.href.split("?")[1]);
                      } else {
                        isActive = pathname.startsWith(item.href);
                      }

                      const content = (
                        <Link
                          href={item.href}
                          className={cn(
                            "flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-semibold transition-all relative group",
                            isActive
                              ? "bg-primary text-primary-foreground font-bold shadow-xs"
                              : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                          )}
                        >
                          <Icon
                            size={18}
                            className={cn(
                              "flex-shrink-0 transition-colors",
                              isActive
                                ? "text-primary-foreground"
                                : "text-sidebar-foreground/60 group-hover:text-sidebar-accent-foreground"
                            )}
                          />
                          <AnimatePresence>
                            {!sidebarCollapsed && (
                              <motion.span
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                exit={{ opacity: 0 }}
                                transition={{ duration: 0.15 }}
                                className="truncate"
                              >
                                {item.label}
                              </motion.span>
                            )}
                          </AnimatePresence>
                        </Link>
                      );

                      if (sidebarCollapsed) {
                        return (
                          <Tooltip key={item.label}>
                            <TooltipTrigger asChild>{content}</TooltipTrigger>
                            <TooltipContent side="right" className="font-semibold">{item.label}</TooltipContent>
                          </Tooltip>
                        );
                      }
                      return <div key={item.label}>{content}</div>;
                    })}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
            );
          })}
        </nav>

        <div className="border-t border-sidebar-border p-3 bg-sidebar flex-shrink-0">
          <div
            className={cn(
              "flex items-center gap-2.5 px-2.5 py-2 rounded-lg bg-sidebar-accent/50 hover:bg-sidebar-accent transition-smooth cursor-pointer border border-sidebar-border/30",
              sidebarCollapsed && "justify-center px-0"
            )}
          >
            <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-xs font-bold flex-shrink-0 shadow-xs">
              {displayUser.slice(0, 2)}
            </div>
            <AnimatePresence>
              {!sidebarCollapsed && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="min-w-0 flex-1"
                >
                  <p className="text-xs font-bold text-sidebar-foreground truncate">
                    {displayRole}
                  </p>
                  <p className="text-[10px] text-sidebar-foreground/60 truncate">
                    {displayEmail}
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.aside>
    </TooltipProvider>
  );
}
