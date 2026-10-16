"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { DataTable, type ColumnDef } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useInvoices, useInvoiceDashboardStats, useInvoiceAnalytics, useDeleteInvoice, useUpdateInvoice } from "@/hooks/useQueries";
import { Pagination } from "@/components/ui/Pagination";
import { Banknote, CheckCircle2, Search, Plus, Calendar, Clock, IndianRupee, FileText, MoreHorizontal, Eye, Trash2, Edit, ChevronDown, Check } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { InvoiceAnalyticsCharts } from "./components/InvoiceAnalyticsCharts";
import { AddInvoiceDialog } from "@/components/invoices/AddInvoiceDialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { EditRecordDialog } from "@/components/shared/EditRecordDialog";
import { PageHeader } from "@/components/shared/PageHeader";
import { KPICard } from "@/components/ui/KPICard";
import { GlobalDateFilterBar } from "@/components/shared/GlobalDateFilterBar";

export default function InvoicesDashboardPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState("vendor_name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [statusFilter, setStatusFilter] = useState("All");
  const [paymentFilter, setPaymentFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("All");
  const [customMonth, setCustomMonth] = useState("");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  const dateRangeParams = useMemo(() => {
    if (!dateFilter || dateFilter === "All") return {};

    const now = new Date();
    if (dateFilter === "Today") {
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const dd = String(now.getDate()).padStart(2, "0");
      const todayStr = `${yyyy}-${mm}-${dd}`;
      return { start_date: todayStr, end_date: todayStr };
    }

    if (dateFilter === "This Month") {
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const lastDay = new Date(yyyy, now.getMonth() + 1, 0).getDate();
      return { 
        start_date: `${yyyy}-${mm}-01`, 
        end_date: `${yyyy}-${mm}-${String(lastDay).padStart(2, "0")}` 
      };
    }

    if (dateFilter === "Last Month") {
      const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const yyyy = lm.getFullYear();
      const mm = String(lm.getMonth() + 1).padStart(2, "0");
      const lastDay = new Date(yyyy, lm.getMonth() + 1, 0).getDate();
      return {
        start_date: `${yyyy}-${mm}-01`,
        end_date: `${yyyy}-${mm}-${String(lastDay).padStart(2, "0")}`
      };
    }

    if (dateFilter === "This Quarter") {
      const yyyy = now.getFullYear();
      const q = Math.floor(now.getMonth() / 3);
      const startMonth = String(q * 3 + 1).padStart(2, "0");
      const endMonthNum = q * 3 + 3;
      const lastDay = new Date(yyyy, endMonthNum, 0).getDate();
      const endMonth = String(endMonthNum).padStart(2, "0");
      return {
        start_date: `${yyyy}-${startMonth}-01`,
        end_date: `${yyyy}-${endMonth}-${String(lastDay).padStart(2, "0")}`
      };
    }

    if (dateFilter === "Last Quarter") {
      const yyyy = now.getFullYear();
      const currentQ = Math.floor(now.getMonth() / 3);
      const lastQ = currentQ === 0 ? 3 : currentQ - 1;
      const lastQYear = currentQ === 0 ? yyyy - 1 : yyyy;
      const startMonth = String(lastQ * 3 + 1).padStart(2, "0");
      const endMonthNum = lastQ * 3 + 3;
      const lastDay = new Date(lastQYear, endMonthNum, 0).getDate();
      const endMonth = String(endMonthNum).padStart(2, "0");
      return {
        start_date: `${lastQYear}-${startMonth}-01`,
        end_date: `${lastQYear}-${endMonth}-${String(lastDay).padStart(2, "0")}`
      };
    }

    if (dateFilter === "This Year") {
      const yyyy = now.getFullYear();
      return { start_date: `${yyyy}-01-01`, end_date: `${yyyy}-12-31` };
    }

    if (dateFilter === "Month" && customMonth) {
      const [yyyyStr, mmStr] = customMonth.split("-");
      const yyyy = parseInt(yyyyStr, 10);
      const mm = parseInt(mmStr, 10);
      if (!isNaN(yyyy) && !isNaN(mm)) {
        const lastDay = new Date(yyyy, mm, 0).getDate();
        return {
          start_date: `${customMonth}-01`,
          end_date: `${customMonth}-${String(lastDay).padStart(2, "0")}`
        };
      }
    }

    if (dateFilter === "Custom") {
      const res: any = {};
      if (customStartDate) res.start_date = customStartDate;
      if (customEndDate) res.end_date = customEndDate;
      return res;
    }

    return {};
  }, [dateFilter, customMonth, customStartDate, customEndDate]);

  const { data: stats, isLoading: isLoadingStats } = useInvoiceDashboardStats(dateRangeParams);
  const { data: analyticsData } = useInvoiceAnalytics(dateRangeParams);
  const updateInvoice = useUpdateInvoice();
  
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editRecord, setEditRecord] = useState<any>(null);
  
  const role = useAuthStore((state: any) => state.role);
  const canUpload = ["admin", "owner", "finance_manager"].includes(role);
  const deleteInvoice = useDeleteInvoice();

  const { data: invoicesData, isLoading: isLoadingInvoices } = useInvoices({
    page,
    pageSize,
    search: searchQuery || undefined,
    approval_status: statusFilter !== "All" ? statusFilter : undefined,
    payment_status: paymentFilter !== "All" ? paymentFilter : undefined,
    sort_by: sortBy,
    sort_order: sortOrder,
    ...dateRangeParams,
  });
  const invoices = invoicesData?.items ?? [];
  const totalInvoices = invoicesData?.total ?? 0;
  const totalPages = invoicesData?.total_pages ?? 1;


  const columns: ColumnDef<any>[] = useMemo(() => [
    {
      id: "invoice_number",
      header: "Invoice #",
      accessor: (d: any) => (
        <span className="font-mono text-primary font-semibold text-[11px]">
          {d.invoice_number || "PENDING OCR"}
        </span>
      ),
      sortable: true,
    },
    {
      id: "vendor_name",
      header: "Vendor",
      accessor: (d: any) => (
        <div className="flex flex-col">
          <span className="font-semibold text-sm">{d.vendor_name || "Unknown"}</span>
        </div>
      ),
      sortable: true,
    },
    {
      id: "vendor_gstin",
      header: "GSTIN",
      accessor: (d: any) => (
        <span className="text-[10px] text-muted-foreground font-mono">{d.vendor_gstin || "-"}</span>
      ),
    },
    {
      id: "invoice_date",
      header: "Date",
      accessor: (d: any) => (
        <span className="tabular-nums text-muted-foreground text-xs">
          {d.invoice_date ? new Date(d.invoice_date).toLocaleDateString("en-IN") : "-"}
        </span>
      ),
      sortable: true,
    },
    {
      id: "hsn_sac",
      header: "HSN/SAC",
      accessor: (d: any) => (
        <span className="text-xs text-muted-foreground">{d.hsn_sac || "-"}</span>
      ),
    },
    {
      id: "subtotal",
      header: "Before Tax",
      accessor: (d: any) => (
        <span className="tabular-nums text-xs">
          ₹{d.subtotal?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || "0.00"}
        </span>
      ),
      sortable: true,
    },
    {
      id: "cgst",
      header: "CGST",
      accessor: (d: any) => (
        <span className="tabular-nums text-xs text-muted-foreground">
          ₹{d.cgst?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || "0.00"}
        </span>
      ),
    },
    {
      id: "sgst",
      header: "SGST",
      accessor: (d: any) => (
        <span className="tabular-nums text-xs text-muted-foreground">
          ₹{d.sgst?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || "0.00"}
        </span>
      ),
    },
    {
      id: "igst",
      header: "IGST",
      accessor: (d: any) => (
        <span className="tabular-nums text-xs text-muted-foreground">
          ₹{d.igst?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || "0.00"}
        </span>
      ),
    },
    {
      id: "gst_amount",
      header: "Total GST",
      accessor: (d: any) => (
        <span className="tabular-nums text-xs font-medium">
          ₹{d.gst_amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || "0.00"}
        </span>
      ),
      sortable: true,
    },
    {
      id: "grand_total",
      header: "Grand Total",
      accessor: (d: any) => (
        <span className="font-bold tabular-nums text-primary">
          ₹{d.grand_total?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || "0.00"}
        </span>
      ),
      sortable: true,
    },
    {
      id: "approval_status",
      header: "Status",
      accessor: (d: any) => {
        let color = "bg-muted text-muted-foreground";
        if (d.approval_status === "Approved") color = "bg-success/15 text-success";
        if (d.approval_status === "Rejected") color = "bg-destructive/15 text-destructive";
        if (d.approval_status === "Pending Review") color = "bg-warning/15 text-warning";
        return (
          <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded uppercase tracking-wider whitespace-nowrap", color)}>
            {d.approval_status}
          </span>
        );
      },
    },
    {
      id: "actions",
      header: "",
      accessor: (d: any) => {
        const canDelete = ["admin", "owner", "finance_manager"].includes(role);
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={(e) => e.stopPropagation()}>
                <MoreHorizontal size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem 
                onClick={(e) => {
                  e.stopPropagation();
                  router.push(`/invoices/${d.id}`);
                }}
              >
                <Eye className="mr-2 h-4 w-4" /> View Details
              </DropdownMenuItem>
              {canDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditRecord(d);
                    }}
                  >
                    <Edit className="mr-2 h-4 w-4 text-primary" /> Edit Purchase Invoice
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="text-red-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm("Are you sure you want to delete this purchase invoice?")) {
                        deleteInvoice.mutate(d.id, {
                          onSuccess: () => toast.success("Purchase Invoice deleted successfully"),
                          onError: (err: any) => toast.error(err.response?.data?.detail || "Failed to delete purchase invoice")
                        });
                      }
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Delete Purchase Invoice
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      }
    }
  ], [router, role, deleteInvoice]);

  if ((isLoadingInvoices && !invoicesData) || (isLoadingStats && !stats)) {
    return (
      <div className="p-6 space-y-4 animate-pulse">
        <div className="h-10 w-48 bg-muted rounded-lg" />
        <div className="grid grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map((k) => (
            <div key={k} className="h-24 bg-card border border-border rounded-xl p-4" />
          ))}
        </div>
        <div className="h-64 bg-card border border-border rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 pb-24 md:pb-6" data-ocid="invoices.page">
      <PageHeader
        title="Purchase Invoices Dashboard"
        description="Manage vendor purchase invoices, tax calculations, approvals, and OCR processing"
        actions={
          canUpload && (
            <div className="flex items-center gap-2 flex-wrap">
              <Button 
                onClick={() => setShowAddModal(true)} 
                className="gap-1.5 shadow-xs"
              >
                <Plus size={15} />
                Add Purchase Invoice
              </Button>
              <Button 
                variant="outline"
                onClick={() => router.push("/invoices/upload")} 
                className="gap-1.5"
              >
                <Plus size={15} />
                Upload Invoice
              </Button>
            </div>
          )
        }
      />

      {/* Global Date & Month Calendar Filter Bar */}
      <GlobalDateFilterBar
        dateFilter={dateFilter}
        setDateFilter={(v) => { setDateFilter(v); setPage(1); }}
        customMonth={customMonth}
        setCustomMonth={(v) => { setCustomMonth(v); setPage(1); }}
        customStartDate={customStartDate}
        setCustomStartDate={(v) => { setCustomStartDate(v); setPage(1); }}
        customEndDate={customEndDate}
        setCustomEndDate={(v) => { setCustomEndDate(v); setPage(1); }}
      />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5 sm:gap-4">
        <KPICard
          title="Today's Uploads"
          value={stats?.today_uploads || 0}
          description="Invoices processed today"
          icon={<FileText size={14} />}
          semantic="neutral"
        />
        <KPICard
          title="Pending Review"
          value={stats?.pending_review || 0}
          description="Awaiting verification"
          icon={<Clock size={14} />}
          semantic={stats?.pending_review > 0 ? "warning" : "neutral"}
        />
        <KPICard
          title="Today's Expenses"
          value={`₹${(stats?.today_expenses || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
          description="Day purchase total"
          icon={<IndianRupee size={14} />}
          semantic="primary"
        />
        <KPICard
          title="Monthly Expenses"
          value={`₹${(stats?.monthly_expenses || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`}
          description="Current month procurement"
          icon={<Calendar size={14} />}
          semantic="primary"
        />
        <KPICard
          title="Unpaid Invoices"
          value={stats?.unpaid || 0}
          description="Vendor dues pending"
          icon={<Banknote size={14} />}
          semantic={stats?.unpaid > 0 ? "warning" : "success"}
        />
      </div>

      {/* Analytics Charts */}
      {analyticsData && (
        <InvoiceAnalyticsCharts data={analyticsData} />
      )}

      {/* Invoice Table with Sticky Filters */}
      <div className="bg-card border border-border rounded-xl shadow-subtle overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/20 flex flex-wrap items-center gap-3 sticky top-0 z-10">
          <div className="flex items-center justify-between w-full md:w-auto md:mr-auto">
            <h2 className="font-semibold text-sm md:text-base">Recent Purchase Invoices</h2>
            <span className="md:hidden text-xs text-muted-foreground font-mono">
              {totalInvoices} total
            </span>
          </div>
          
          <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap">
            <div className="relative flex-1 md:w-60 min-w-[180px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search invoice #, vendor, GSTIN..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setPage(1);
                }}
                className="w-full pl-8 pr-3 h-9 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/30"
              />
            </div>

            <select
              value={`${sortBy}_${sortOrder}`}
              onChange={(e) => {
                const [sb, so] = e.target.value.split("_");
                setSortBy(sb);
                setSortOrder(so as "asc" | "desc");
                setPage(1);
              }}
              className="flex-1 md:w-40 h-9 text-xs bg-background border border-border rounded-lg px-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="vendor_name_asc">Sort: Vendor (A-Z)</option>
              <option value="vendor_name_desc">Sort: Vendor (Z-A)</option>
              <option value="invoice_number_asc">Sort: Invoice # (Asc)</option>
              <option value="invoice_number_desc">Sort: Invoice # (Desc)</option>
              <option value="invoice_date_desc">Sort: Date (Newest)</option>
              <option value="invoice_date_asc">Sort: Date (Oldest)</option>
              <option value="grand_total_desc">Sort: Total (High-Low)</option>
              <option value="grand_total_asc">Sort: Total (Low-High)</option>
            </select>

            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="flex-1 md:w-32 h-9 text-xs bg-background border border-border rounded-lg px-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="All">All Approvals</option>
              <option value="Pending Review">Pending Review</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>

            <select
              value={paymentFilter}
              onChange={(e) => { setPaymentFilter(e.target.value); setPage(1); }}
              className="flex-1 md:w-32 h-9 text-xs bg-background border border-border rounded-lg px-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="All">All Payments</option>
              <option value="Unpaid">Unpaid</option>
              <option value="Partial">Partial</option>
              <option value="Paid">Paid</option>
            </select>
          </div>
        </div>

        <div className="p-0">
          {/* Mobile Responsive Purchase Invoices List */}
          <div className="md:hidden space-y-3 p-3 bg-muted/10">
            {isLoadingInvoices ? (
              <div className="space-y-3">
                {[1, 2, 3].map((n) => (
                  <div key={n} className="h-36 rounded-xl bg-card border border-border animate-pulse p-4" />
                ))}
              </div>
            ) : invoices.length === 0 ? (
              <div className="text-center py-10 bg-card rounded-xl border border-border p-6">
                <FileText size={32} className="mx-auto text-muted-foreground/40 mb-2" />
                <p className="text-sm font-semibold text-foreground">No purchase invoices found</p>
                <p className="text-xs text-muted-foreground mt-1">Try adjusting your search or filters.</p>
              </div>
            ) : (
              invoices.map((inv: any) => {
                let approvalColor = "bg-muted text-muted-foreground border-transparent";
                if (inv.approval_status === "Approved") approvalColor = "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25";
                if (inv.approval_status === "Rejected") approvalColor = "bg-destructive/15 text-destructive border-destructive/25";
                if (inv.approval_status === "Pending Review") approvalColor = "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25";

                let paymentColor = "bg-muted text-muted-foreground border-transparent";
                if (inv.payment_status === "Paid") paymentColor = "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/25";
                if (inv.payment_status === "Partial") paymentColor = "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25";
                if (inv.payment_status === "Unpaid") paymentColor = "bg-destructive/15 text-destructive border-destructive/25";

                const handleQuickPayment = (newStatus: string) => {
                  if (newStatus === inv.payment_status) return;
                  updateInvoice.mutate(
                    { id: inv.id, data: { payment_status: newStatus } },
                    {
                      onSuccess: () => toast.success(`Payment status updated to ${newStatus}`),
                      onError: (err: any) => toast.error(err.response?.data?.detail || "Failed to update payment status"),
                    }
                  );
                };

                return (
                  <div 
                    key={inv.id} 
                    className="bg-card border border-border rounded-xl p-3.5 space-y-2.5 shadow-2xs hover:border-primary/30 transition-all"
                  >
                    {/* Header: Invoice #, Date, Status Badges */}
                    <div className="flex items-start justify-between gap-2 border-b border-border/60 pb-2">
                      <div className="flex flex-col min-w-0">
                        <button
                          type="button"
                          onClick={() => router.push(`/invoices/${inv.id}`)}
                          className="font-mono text-xs font-bold text-primary hover:underline truncate text-left cursor-pointer"
                        >
                          {inv.invoice_number || "PENDING OCR"}
                        </button>
                        <span className="text-[10px] text-muted-foreground tabular-nums">
                          {inv.invoice_date ? new Date(inv.invoice_date).toLocaleDateString("en-IN") : "-"}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span className={cn("text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border", approvalColor)}>
                          {inv.approval_status || "Pending"}
                        </span>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              className={cn(
                                "inline-flex items-center gap-1 text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider transition-colors cursor-pointer border",
                                paymentColor
                              )}
                              title="Click to change payment status"
                            >
                              <span>{inv.payment_status || "Unpaid"}</span>
                              <ChevronDown className="h-2.5 w-2.5 opacity-70" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-32">
                            <DropdownMenuItem
                              className="text-xs flex items-center justify-between cursor-pointer"
                              onClick={() => handleQuickPayment("Unpaid")}
                            >
                              <span className="font-medium text-muted-foreground">Unpaid</span>
                              {inv.payment_status === "Unpaid" && <Check className="h-3.5 w-3.5 text-foreground" />}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-xs flex items-center justify-between cursor-pointer text-amber-600 focus:text-amber-700"
                              onClick={() => handleQuickPayment("Partial")}
                            >
                              <span className="font-medium">Partial</span>
                              {inv.payment_status === "Partial" && <Check className="h-3.5 w-3.5 text-amber-600" />}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-xs flex items-center justify-between cursor-pointer text-emerald-600 focus:text-emerald-700"
                              onClick={() => handleQuickPayment("Paid")}
                            >
                              <span className="font-medium">Paid</span>
                              {inv.payment_status === "Paid" && <Check className="h-3.5 w-3.5 text-emerald-600" />}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {/* Vendor Information */}
                    <div>
                      <h4 className="font-bold text-xs text-foreground truncate">{inv.vendor_name || "Unknown Vendor"}</h4>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5 flex-wrap">
                        {inv.vendor_gstin && <span className="font-mono">GSTIN: {inv.vendor_gstin}</span>}
                        {inv.department && (
                          <span className="px-1.5 py-0.5 rounded bg-muted/60 text-foreground font-medium text-[9px]">
                            Dept: {inv.department}
                          </span>
                        )}
                        {inv.hsn_sac && (
                          <span className="text-muted-foreground text-[10px]">HSN: {inv.hsn_sac}</span>
                        )}
                      </div>
                    </div>

                    {/* Financial Summary Box */}
                    <div className="bg-muted/30 border border-border/50 rounded-lg p-2.5 grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block">Grand Total</span>
                        <span className="font-bold text-sm text-foreground tabular-nums block">
                          ₹{inv.grand_total?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || "0.00"}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block">Total GST</span>
                        <span className="font-medium text-xs text-muted-foreground tabular-nums block">
                          ₹{inv.gst_amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || "0.00"}
                        </span>
                      </div>
                      {inv.subtotal !== undefined && inv.subtotal !== null && (
                        <div className="col-span-2 pt-1 border-t border-border/40 flex items-center justify-between text-[10px] text-muted-foreground">
                          <span>Subtotal (Before Tax):</span>
                          <span className="font-mono">₹{inv.subtotal?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                        </div>
                      )}
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-border/60">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push(`/invoices/${inv.id}`)}
                        className="h-7 px-2.5 text-xs font-semibold gap-1 cursor-pointer"
                      >
                        <Eye size={12} /> View Details
                      </Button>

                      {canUpload && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditRecord(inv)}
                          className="h-7 px-2.5 text-xs font-semibold gap-1 text-primary hover:bg-primary/5 cursor-pointer"
                        >
                          <Edit size={12} /> Edit
                        </Button>
                      )}

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 cursor-pointer">
                            <MoreHorizontal size={14} />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {canUpload && (
                            <DropdownMenuItem 
                              className="text-red-600 cursor-pointer"
                              onClick={() => {
                                if (confirm("Are you sure you want to delete this purchase invoice?")) {
                                  deleteInvoice.mutate(inv.id, {
                                    onSuccess: () => toast.success("Purchase Invoice deleted successfully"),
                                    onError: (err: any) => toast.error(err.response?.data?.detail || "Failed to delete")
                                  });
                                }
                              }}
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete Invoice
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Desktop Main Table View */}
          <div className="hidden md:block">
            <DataTable
              columns={columns}
              data={invoices}
              rowId={(d) => String(d.id)}
              searchKey={(d) => `${d.invoice_number} ${d.vendor_name} ${d.vendor_gstin} ${d.department}`}
              searchValue={searchQuery}
              onSearchChange={(val) => { setSearchQuery(val); setPage(1); }}
              hidePagination={true}
            />
          </div>

          <Pagination
            page={page}
            pageSize={pageSize}
            total={totalInvoices}
            totalPages={totalPages}
            onPageChange={setPage}
            onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
            isLoading={isLoadingInvoices}
          />
        </div>
      </div>
      
      {showAddModal && (
        <AddInvoiceDialog 
          open={showAddModal} 
          onOpenChange={setShowAddModal} 
        />
      )}
      
      <EditRecordDialog
        open={!!editRecord}
        onOpenChange={(open) => !open && setEditRecord(null)}
        title={`Edit Purchase Invoice: ${editRecord?.invoice_number || 'Pending OCR'}`}
        fields={editRecord ? [
          { name: "invoice_number", label: "Invoice #", type: "text", defaultValue: editRecord.invoice_number || "" },
          { name: "vendor_name", label: "Vendor Name", type: "text", defaultValue: editRecord.vendor_name || "" },
          { name: "vendor_gstin", label: "GSTIN", type: "text", defaultValue: editRecord.vendor_gstin || "" },
          { name: "invoice_date", label: "Date", type: "date", defaultValue: editRecord.invoice_date ? String(editRecord.invoice_date).split('T')[0] : "" },
          { name: "hsn_sac", label: "HSN/SAC", type: "text", defaultValue: editRecord.hsn_sac || "" },
          { name: "subtotal", label: "Before Tax (Subtotal)", type: "number", defaultValue: editRecord.subtotal ?? 0 },
          { name: "cgst", label: "CGST Amount", type: "number", defaultValue: editRecord.cgst ?? 0 },
          { name: "sgst", label: "SGST Amount", type: "number", defaultValue: editRecord.sgst ?? 0 },
          { name: "igst", label: "IGST Amount", type: "number", defaultValue: editRecord.igst ?? 0 },
          { name: "gst_amount", label: "Total GST Amount", type: "number", defaultValue: editRecord.gst_amount ?? 0 },
          { name: "grand_total", label: "Grand Total", type: "number", defaultValue: editRecord.grand_total ?? 0 },
          { name: "approval_status", label: "Status", type: "select", defaultValue: editRecord.approval_status || "Pending Review", options: ["Pending Review", "Approved", "Rejected"] },
          { name: "payment_status", label: "Payment Status", type: "select", defaultValue: editRecord.payment_status || "Unpaid", options: ["Unpaid", "Partial", "Paid"] },
          { name: "expense_category", label: "Expense Category", type: "text", defaultValue: editRecord.expense_category || "" },
          { name: "department", label: "Department", type: "text", defaultValue: editRecord.department || "" }
        ] : []}
        onSubmit={(data) => {
          if (!editRecord) return;
          const formattedData = {
            ...data,
            invoice_date: data.invoice_date ? data.invoice_date : null,
            subtotal: Number(data.subtotal) || 0,
            cgst: Number(data.cgst) || 0,
            sgst: Number(data.sgst) || 0,
            igst: Number(data.igst) || 0,
            gst_amount: Number(data.gst_amount) || 0,
            grand_total: Number(data.grand_total) || 0,
          };
          updateInvoice.mutate({ id: editRecord.id, data: formattedData }, {
            onSuccess: () => {
              toast.success("Purchase Invoice updated successfully");
              setEditRecord(null);
            }
          });
        }}
        isSubmitting={updateInvoice.isPending}
      />
    </div>
  );
}
