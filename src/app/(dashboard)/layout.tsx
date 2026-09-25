"use client";

import React, { useEffect, useState } from "react";
import { Sidebar } from "@/components/Sidebar";
import { TopBar } from "@/components/TopBar";
import { MobileTopBar } from "@/components/MobileTopBar";
import { MobileBottomNav } from "@/components/MobileBottomNav";
import { useAuthStore } from "@/store/authStore";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useRouter } from "next/navigation";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { isAuthenticated, initialize } = useAuthStore();
  const [loading, setLoading] = useState(true);
  
  // Hook up WebSocket client
  useWebSocket();

  useEffect(() => {
    initialize();
    
    const rawToken = localStorage.getItem("token") || useAuthStore.getState().token;
    const isValidToken = rawToken && rawToken !== "null" && rawToken !== "undefined" && rawToken.trim().length > 5;

    if (!isValidToken) {
      useAuthStore.getState().logout();
      router.replace("/login");
    } else {
      const role = localStorage.getItem("role")?.toLowerCase() || useAuthStore.getState().role?.toLowerCase() || "";
      const currentPath = typeof window !== "undefined" ? window.location.pathname : "";

      if ((role === 'attendance' || role === 'attendance_only') && currentPath === '/') {
        router.replace("/attendance");
        return;
      }
      if (role === 'supervisor' && currentPath === '/') {
        router.replace("/workforce/supervisor");
        return;
      }
      if ((role === 'dispatcher' || role === 'dispatch') && currentPath === '/') {
        router.replace("/production");
        return;
      }
      if (role === 'worker' && currentPath === '/') {
        router.replace("/workforce");
        return;
      }
      if (role === 'oem' && currentPath === '/') {
        router.replace("/oem-portal");
        return;
      }

      // Route Protection: Prevent non-admin roles from accessing admin-only pages
      const adminOnlyPaths = ["/analytics", "/payroll", "/revenue", "/invoices", "/settings", "/activity-logs"];
      if (adminOnlyPaths.some(p => currentPath.startsWith(p)) && !['admin', 'manager', 'owner', 'hr', 'finance'].includes(role)) {
        if (role === 'supervisor') {
          router.replace("/workforce/supervisor");
          return;
        }
        if (role === 'dispatcher' || role === 'dispatch') {
          router.replace("/production");
          return;
        }
        if (role === 'worker') {
          router.replace("/workforce");
          return;
        }
        router.replace("/");
        return;
      }

      setLoading(false);
    }
  }, [initialize, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background text-foreground font-body">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-sm font-semibold tracking-wide text-muted-foreground animate-pulse">Starting session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-background font-body">
      {/* Desktop Sidebar */}
      <div className="hidden md:flex sticky top-0 h-screen flex-shrink-0 z-40">
        <Sidebar />
      </div>
      
      <div className="flex flex-col flex-1 min-w-0 pb-16 md:pb-0">
        {/* Desktop TopBar */}
        <div className="hidden md:block sticky top-0 z-50">
          <TopBar />
        </div>
        
        {/* Mobile TopBar */}
        <MobileTopBar />

        <main
          className="flex-1 flex flex-col bg-background"
          data-ocid="main.content"
        >
          {children}
        </main>
        
        {/* Mobile Bottom Navigation */}
        <MobileBottomNav />
      </div>
    </div>
  );
}
