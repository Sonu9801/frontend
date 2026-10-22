"use client";

import React, { useState, useMemo } from "react";
import { Bell, Check, Clock, Search, AlertTriangle, FileText, CheckCircle2, Info, ArrowRight, CheckCheck } from "lucide-react";
import { useNotifications, useMarkNotificationClicked, useMarkAllNotificationsRead } from "@/hooks/useQueries";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export default function NotificationsPage() {
  const router = useRouter();
  const { data: notifications = [], isLoading } = useNotifications();
  const markClickedMutation = useMarkNotificationClicked();
  const markAllReadMutation = useMarkAllNotificationsRead();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<string>("all");

  const unreadCount = notifications.filter((n: any) => !n.read).length;
  const invoiceCount = notifications.filter((n: any) => (n.title || "").toLowerCase().includes("invoice") || (n.message || "").toLowerCase().includes("invoice")).length;
  const qcProdCount = notifications.filter((n: any) => 
    (n.title || "").toLowerCase().includes("qc") || 
    (n.title || "").toLowerCase().includes("vehicle") || 
    (n.title || "").toLowerCase().includes("dispatch") ||
    (n.message || "").toLowerCase().includes("qc") ||
    (n.message || "").toLowerCase().includes("production")
  ).length;
  const urgentCount = notifications.filter((n: any) => n.type === "error" || n.type === "warning").length;

  const filteredNotifications = useMemo(() => {
    return notifications.filter((notification: any) => {
      // Filter by category
      if (selectedFilter === "unread" && notification.read) return false;
      if (selectedFilter === "invoices") {
        const isInv = (notification.title || "").toLowerCase().includes("invoice") || (notification.message || "").toLowerCase().includes("invoice");
        if (!isInv) return false;
      }
      if (selectedFilter === "qc_prod") {
        const isQc = (notification.title || "").toLowerCase().includes("qc") || 
                     (notification.title || "").toLowerCase().includes("vehicle") || 
                     (notification.title || "").toLowerCase().includes("dispatch") ||
                     (notification.message || "").toLowerCase().includes("qc") ||
                     (notification.message || "").toLowerCase().includes("production");
        if (!isQc) return false;
      }
      if (selectedFilter === "urgent") {
        if (notification.type !== "error" && notification.type !== "warning") return false;
      }

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const tMatch = (notification.title || "").toLowerCase().includes(q);
        const mMatch = (notification.message || "").toLowerCase().includes(q);
        return tMatch || mMatch;
      }
      return true;
    });
  }, [notifications, selectedFilter, searchQuery]);

  const handleNotificationClick = (notification: any) => {
    if (!notification.read || !notification.clicked) {
      markClickedMutation.mutate(notification.id);
    }
    if (notification.target_url) {
      router.push(notification.target_url);
    }
  };

  const handleSingleMarkRead = (e: React.MouseEvent, notificationId: number | string) => {
    e.stopPropagation();
    markClickedMutation.mutate(notificationId);
  };

  const notifIconColor: Record<string, string> = {
    error: "bg-destructive/10 text-destructive border-destructive/20",
    warning: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    success: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    info: "bg-primary/10 text-primary border-primary/20",
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  return (
    <div className="flex flex-col h-full overflow-hidden bg-background">
      <div className="flex-shrink-0 px-3 sm:px-6 py-3 sm:py-5 border-b border-border bg-card">
        <PageHeader
          title="Notifications & Alerts"
          subtitle="System triggers, workflow bottlenecks, invoice audits, and operational events"
          badge={unreadCount > 0 ? `${unreadCount} unread` : undefined}
          actions={
            <Button
              variant="outline"
              size="sm"
              onClick={() => markAllReadMutation.mutate()}
              disabled={unreadCount === 0 || markAllReadMutation.isPending}
              className="gap-1.5 h-9"
            >
              <CheckCheck size={15} />
              Mark all as read
            </Button>
          }
        />
      </div>
      
      <div className="flex-1 overflow-y-auto p-3 sm:p-6 pb-24 md:pb-6">
        <div className="max-w-5xl mx-auto space-y-5">
          {/* Executive Summary Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <button
              type="button"
              onClick={() => setSelectedFilter("all")}
              className={`p-3.5 sm:p-4 rounded-xl border text-left transition-all cursor-pointer ${
                selectedFilter === "all" ? "bg-card border-primary ring-2 ring-primary/20 shadow-sm" : "bg-card border-border hover:bg-muted/30"
              }`}
            >
              <p className="text-xs font-semibold uppercase text-muted-foreground tracking-wider">Total Alerts</p>
              <p className="text-2xl font-bold text-foreground mt-1">{notifications.length}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">All activity logs</p>
            </button>

            <button
              type="button"
              onClick={() => setSelectedFilter("unread")}
              className={`p-3.5 sm:p-4 rounded-xl border text-left transition-all cursor-pointer ${
                selectedFilter === "unread" ? "bg-card border-primary ring-2 ring-primary/20 shadow-sm" : "bg-card border-border hover:bg-muted/30"
              }`}
            >
              <p className="text-xs font-semibold uppercase text-primary tracking-wider">Unread Actionable</p>
              <p className="text-2xl font-bold text-primary mt-1">{unreadCount}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Require review</p>
            </button>

            <button
              type="button"
              onClick={() => setSelectedFilter("invoices")}
              className={`p-3.5 sm:p-4 rounded-xl border text-left transition-all cursor-pointer ${
                selectedFilter === "invoices" ? "bg-card border-primary ring-2 ring-primary/20 shadow-sm" : "bg-card border-border hover:bg-muted/30"
              }`}
            >
              <p className="text-xs font-semibold uppercase text-amber-600 dark:text-amber-400 tracking-wider">Invoice Audits</p>
              <p className="text-2xl font-bold text-foreground mt-1">{invoiceCount}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Accounts review</p>
            </button>

            <button
              type="button"
              onClick={() => setSelectedFilter("urgent")}
              className={`p-3.5 sm:p-4 rounded-xl border text-left transition-all cursor-pointer ${
                selectedFilter === "urgent" ? "bg-card border-primary ring-2 ring-primary/20 shadow-sm" : "bg-card border-border hover:bg-muted/30"
              }`}
            >
              <p className="text-xs font-semibold uppercase text-destructive tracking-wider">High Priority</p>
              <p className="text-2xl font-bold text-destructive mt-1">{urgentCount}</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Warnings & exceptions</p>
            </button>
          </div>

          {/* Search & Filter Chips Row */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div className="relative flex-1 sm:max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
              <Input
                placeholder="Search alerts by title, order or vendor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-10 text-xs sm:text-sm bg-card"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              {[
                { id: "all", label: "All", count: notifications.length },
                { id: "unread", label: "Unread", count: unreadCount },
                { id: "invoices", label: "Invoices", count: invoiceCount },
                { id: "qc_prod", label: "Production & QC", count: qcProdCount },
                { id: "urgent", label: "Urgent", count: urgentCount },
              ].map(chip => (
                <button
                  key={chip.id}
                  type="button"
                  onClick={() => setSelectedFilter(chip.id)}
                  className={`text-xs font-semibold px-3 py-1.5 rounded-lg border whitespace-nowrap transition-all flex items-center gap-1.5 cursor-pointer ${
                    selectedFilter === chip.id
                      ? "bg-primary text-primary-foreground border-primary shadow-xs"
                      : "bg-card text-muted-foreground border-border hover:bg-muted/50 hover:text-foreground"
                  }`}
                >
                  <span>{chip.label}</span>
                  <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                    selectedFilter === chip.id ? "bg-white/20 text-white" : "bg-muted text-muted-foreground"
                  }`}>
                    {chip.count}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Notifications List */}
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-24 bg-card border border-border rounded-xl animate-pulse" />
              ))}
            </div>
          ) : filteredNotifications.length === 0 ? (
            <div className="py-16 bg-card border border-border rounded-xl">
              <EmptyState
                icon={Bell}
                title="No notifications found"
                description={
                  selectedFilter !== "all" || searchQuery
                    ? "No alerts match your current filter or search criteria."
                    : "You're all caught up! New alerts and updates will appear here."
                }
                action={
                  selectedFilter !== "all" || searchQuery ? {
                    label: "Clear Filters",
                    onClick: () => { setSelectedFilter("all"); setSearchQuery(""); }
                  } : undefined
                }
              />
            </div>
          ) : (
            <div className="space-y-3">
              {filteredNotifications.map((notification: any) => (
                <div
                  key={notification.id}
                  onClick={() => handleNotificationClick(notification)}
                  className={cn(
                    "w-full text-left bg-card border rounded-xl p-4 sm:p-5 transition-all hover:shadow-md cursor-pointer group relative",
                    !notification.read 
                      ? "border-primary/40 bg-card shadow-xs ring-1 ring-primary/10" 
                      : "border-border/60 opacity-85 hover:opacity-100"
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-xl flex-shrink-0 flex items-center justify-center text-sm font-bold border",
                        notifIconColor[notification.type] || notifIconColor.info
                      )}
                    >
                      {notification.type === "error" ? <AlertTriangle size={18} />
                        : notification.type === "success" ? <CheckCircle2 size={18} />
                        : notification.type === "warning" ? <AlertTriangle size={18} />
                        : <Info size={18} />}
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-3 mb-1.5">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className={cn("text-sm sm:text-base font-semibold", !notification.read ? "text-foreground" : "text-muted-foreground")}>
                            {notification.title}
                          </h3>
                          {!notification.read && (
                            <span className="inline-flex items-center text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30">
                              NEW
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground flex-shrink-0">
                          <span className="flex items-center gap-1 font-mono">
                            <Clock size={12} />
                            {formatDate(notification.timestamp)}
                          </span>
                          {!notification.read && (
                            <button
                              type="button"
                              onClick={(e) => handleSingleMarkRead(e, notification.id)}
                              title="Mark as read"
                              className="p-1 rounded-md text-muted-foreground hover:text-primary hover:bg-muted transition-colors"
                            >
                              <Check size={14} />
                            </button>
                          )}
                        </div>
                      </div>
                      
                      <p className={cn("text-xs sm:text-sm line-clamp-2 leading-relaxed", !notification.read ? "text-foreground/90 font-medium" : "text-muted-foreground")}>
                        {notification.message}
                      </p>
                      
                      {notification.target_url && (
                        <div className="mt-3 flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 text-xs text-primary font-semibold group-hover:underline">
                            Open Details <ArrowRight size={12} className="transition-transform group-hover:translate-x-1" />
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
