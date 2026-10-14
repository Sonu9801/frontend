"use client";

import React, { useEffect, useRef } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  BarChart3,
  Factory,
  Inbox,
  Truck,
  Users,
  Clock,
  Boxes,
  Banknote,
  CheckCircle2,
  FileBarChart,
  Activity,
  Building2,
  Settings
} from "lucide-react";

interface AdminTabItem {
  id: string;
  label: string;
  href: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
  exact?: boolean;
}

const adminTabs: AdminTabItem[] = [
  { id: "dashboard", label: "Dashboard", href: "/", icon: LayoutDashboard, exact: true },
  { id: "analytics", label: "Analytics", href: "/analytics", icon: BarChart3 },
  { id: "production", label: "Production", href: "/production", icon: Factory, exact: true },
  { id: "received", label: "Received", href: "/production/received", icon: Inbox },
  { id: "dispatch", label: "Dispatch", href: "/dispatch", icon: Truck },
  { id: "workers", label: "Workers", href: "/workers", icon: Users },
  { id: "attendance", label: "Attendance", href: "/attendance", icon: Clock },
  { id: "components", label: "Components", href: "/components", icon: Boxes },
  { id: "payroll", label: "Payroll", href: "/payroll", icon: Banknote },
  { id: "qc", label: "Quality Control", href: "/quality-control", icon: CheckCircle2 },
  { id: "revenue", label: "Sales Invoices", href: "/revenue", icon: Banknote },
  { id: "invoices", label: "Purchase Invoices", href: "/invoices", icon: Banknote },
  { id: "reports", label: "Reports", href: "/reports", icon: FileBarChart },
  { id: "activity", label: "Activity Logs", href: "/activity-logs", icon: Activity },
  { id: "oem", label: "OEM Portal", href: "/oem-portal", icon: Building2 },
  { id: "settings", label: "Settings", href: "/settings", icon: Settings },
];

export function MobileAdminTabsBar() {
  const pathname = usePathname();
  const { role } = useAuthStore();
  const currentRole = role?.toLowerCase() || "";

  // Only display for privileged administrative roles
  const isAdminRole = ["admin", "manager", "owner"].includes(currentRole);

  const containerRef = useRef<HTMLDivElement>(null);
  const activeTabRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    if (activeTabRef.current) {
      activeTabRef.current.scrollIntoView({
        behavior: "smooth",
        inline: "center",
        block: "nearest"
      });
    }
  }, [pathname]);

  if (!isAdminRole) {
    return null;
  }

  return (
    <nav 
      aria-label="Admin Module Tabs"
      className="md:hidden sticky top-14 z-30 w-full bg-card/95 backdrop-blur-md border-b border-border/80 shadow-[0_2px_8px_rgba(0,0,0,0.04)] dark:shadow-[0_2px_8px_rgba(0,0,0,0.2)]"
    >
      <div 
        ref={containerRef}
        className="flex items-center gap-1.5 px-3 py-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden touch-pan-x"
      >
        {adminTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = tab.exact 
            ? pathname === tab.href 
            : pathname.startsWith(tab.href);

          return (
            <Link
              key={tab.id}
              ref={isActive ? activeTabRef : null}
              href={tab.href}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-150 shrink-0 select-none active:scale-95",
                isActive
                  ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25 font-bold"
                  : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground border border-border/50"
              )}
            >
              <Icon size={14} className={isActive ? "text-primary-foreground" : "text-muted-foreground"} />
              <span>{tab.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
