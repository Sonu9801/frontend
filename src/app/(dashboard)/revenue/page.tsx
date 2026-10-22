"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { DataTable, type ColumnDef } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useRevenue, useRevenueDashboardStats, useRevenueAnalytics, useDeleteSalesInvoice, useUpdateSalesInvoice } from "@/hooks/useQueries";
import { Pagination } from "@/components/ui/Pagination";
import { Banknote, CheckCircle2, Search, Plus, Calendar, Clock, IndianRupee, FileText, MoreHorizontal, Eye, Trash2, Edit, ChevronDown, Check, Download } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { InvoiceAnalyticsCharts } from "../invoices/components/InvoiceAnalyticsCharts";
import { AddSalesInvoiceDialog } from "@/components/revenue/AddSalesInvoiceDialog";
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

export default function RevenueDashboardPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [sortBy, setSortBy] = useState("customer_name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [statusFilter, setStatusFilter] = useState("All");
  const [paymentFilter, setPaymentFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("All");
  const [customMonth, setCustomMonth] = useState("");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");
  const [oemFilter, setOemFilter] = useState("All");
  const [customerFilter, setCustomerFilter] = useState("All");

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

  const [searchQuery, setSearchQuery] = useState("");
  const [showAddModal, setShowAddModal] = useState(false);
  const [editRecord, setEditRecord] = useState<any>(null);

  const { data: invoicesData, isLoading: isLoadingInvoices } = useRevenue({
    page,
    pageSize,
    search: searchQuery || undefined,
    approval_status: statusFilter !== "All" ? statusFilter : undefined,
    payment_status: paymentFilter !== "All" ? paymentFilter : undefined,
    oem: oemFilter !== "All" ? oemFilter : undefined,
    customer: customerFilter !== "All" ? customerFilter : undefined,
    sort_by: sortBy,
    sort_order: sortOrder,
    ...dateRangeParams,
  });
  const { data: stats, isLoading: isLoadingStats } = useRevenueDashboardStats(dateRangeParams);
  const { data: analyticsData } = useRevenueAnalytics(dateRangeParams);
  const updateInvoice = useUpdateSalesInvoice();

  const role = useAuthStore((state: any) => state.role);
  const canUpload = ["admin", "owner", "finance_manager"].includes(role);
  const deleteInvoice = useDeleteSalesInvoice();

  const invoices = invoicesData?.items ?? [];
  const totalInvoices = invoicesData?.total ?? 0;
  const totalPages = invoicesData?.total_pages ?? 1;

  // Extract unique values (from current page)
  const uniqueOems = useMemo(() => Array.from(new Set(invoices.map((inv: any) => inv.oem).filter(Boolean))), [invoices]);
  const uniqueCustomers = useMemo(() => Array.from(new Set(invoices.map((inv: any) => inv.customer_name).filter(Boolean))), [invoices]);



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
      id: "customer_name",
      header: "Customer",
      accessor: (d: any) => (
        <div className="flex flex-col">
          <span className="font-semibold text-sm">{d.customer_name || "Unknown"}</span>
        </div>
      ),
      sortable: true,
    },
    {
      id: "customer_gstin",
      header: "GSTIN",
      accessor: (d: any) => (
        <span className="text-[10px] text-muted-foreground font-mono">{d.customer_gstin || "-"}</span>
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
      id: "oem",
      header: "OEM",
      accessor: (d: any) => (
        <span className="text-xs font-semibold">{d.oem || "-"}</span>
      ),
      sortable: true,
    },
    {
      id: "payment_terms",
      header: "Terms",
      accessor: (d: any) => (
        <span className="text-xs">{d.payment_terms || "-"}</span>
      ),
    },
    {
      id: "due_date",
      header: "Due Date",
      accessor: (d: any) => (
        <span className="tabular-nums text-muted-foreground text-xs">
          {d.due_date ? new Date(d.due_date).toLocaleDateString("en-IN") : "-"}
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
      id: "outstanding_amount",
      header: "Outstanding",
      accessor: (d: any) => (
        <span className="font-bold tabular-nums text-destructive">
          ₹{d.outstanding_amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || "0.00"}
        </span>
      ),
      sortable: true,
    },
    {
      id: "approval_status",
      header: "Approval",
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
      id: "payment_status",
      header: "Payment",
      accessor: (d: any) => {
        let color = "bg-muted text-muted-foreground hover:bg-muted/80 border-transparent";
        if (d.payment_status === "Paid") color = "bg-success/15 text-success hover:bg-success/25 border-success/30";
        if (d.payment_status === "Partially Paid") color = "bg-warning/15 text-warning hover:bg-warning/25 border-warning/30";
        if (d.payment_status === "Overdue") color = "bg-destructive/15 text-destructive hover:bg-destructive/25 border-destructive/30";

        const handleStatusChange = (newStatus: string) => {
          if (newStatus === d.payment_status) return;
          updateInvoice.mutate(
            { id: d.id, data: { payment_status: newStatus } },
            {
              onSuccess: () => toast.success(`Payment status updated to ${newStatus}`),
              onError: (err: any) => toast.error(err.response?.data?.detail || "Failed to update payment status"),
            }
          );
        };

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                className={cn(
                  "inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded uppercase tracking-wider transition-colors cursor-pointer border focus:outline-none focus:ring-1 focus:ring-primary/30",
                  color
                )}
                title="Click to change payment status"
              >
                <span>{d.payment_status || "Pending"}</span>
                <ChevronDown className="h-3 w-3 opacity-70" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-36">
              <DropdownMenuItem
                className="text-xs flex items-center justify-between cursor-pointer"
                onClick={(e) => {
                  e.stopPropagation();
                  handleStatusChange("Pending");
                }}
              >
                <span className="font-medium text-muted-foreground">Pending</span>
                {d.payment_status === "Pending" && <Check className="h-3.5 w-3.5 text-foreground" />}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-xs flex items-center justify-between cursor-pointer text-emerald-600 focus:text-emerald-700"
                onClick={(e) => {
                  e.stopPropagation();
                  handleStatusChange("Paid");
                }}
              >
                <span className="font-medium">Paid</span>
                {d.payment_status === "Paid" && <Check className="h-3.5 w-3.5 text-emerald-600" />}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-xs flex items-center justify-between cursor-pointer text-amber-600 focus:text-amber-700"
                onClick={(e) => {
                  e.stopPropagation();
                  handleStatusChange("Partially Paid");
                }}
              >
                <span className="font-medium">Partially Paid</span>
                {d.payment_status === "Partially Paid" && <Check className="h-3.5 w-3.5 text-amber-600" />}
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-xs flex items-center justify-between cursor-pointer text-rose-600 focus:text-rose-700"
                onClick={(e) => {
                  e.stopPropagation();
                  handleStatusChange("Overdue");
                }}
              >
                <span className="font-medium">Overdue</span>
                {d.payment_status === "Overdue" && <Check className="h-3.5 w-3.5 text-rose-600" />}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
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
                  router.push(`/revenue/${d.id}`);
                }}
              >
                <Eye className="mr-2 h-4 w-4" /> View Details
              </DropdownMenuItem>
              {d.payment_status !== "Paid" ? (
                <DropdownMenuItem
                  className="text-emerald-600 focus:text-emerald-700 font-medium"
                  onClick={(e) => {
                    e.stopPropagation();
                    updateInvoice.mutate(
                      { id: d.id, data: { payment_status: "Paid" } },
                      {
                        onSuccess: () => toast.success("Invoice marked as Paid"),
                        onError: (err: any) => toast.error(err.response?.data?.detail || "Failed to update status"),
                      }
                    );
                  }}
                >
                  <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-600" /> Mark as Paid
                </DropdownMenuItem>
              ) : (
                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    updateInvoice.mutate(
                      { id: d.id, data: { payment_status: "Pending" } },
                      {
                        onSuccess: () => toast.success("Invoice marked as Pending"),
                        onError: (err: any) => toast.error(err.response?.data?.detail || "Failed to update status"),
                      }
                    );
                  }}
                >
                  <Clock className="mr-2 h-4 w-4" /> Mark as Pending
                </DropdownMenuItem>
              )}
              {canDelete && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditRecord(d);
                    }}
                  >
                    <Edit className="mr-2 h-4 w-4 text-primary" /> Edit Sales Invoice
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="text-red-600"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm("Are you sure you want to delete this sales invoice?")) {
                        deleteInvoice.mutate(d.id, {
                          onSuccess: () => toast.success("Sales Invoice deleted successfully"),
                          onError: (err: any) => toast.error(err.response?.data?.detail || "Failed to delete")
                        });
                      }
                    }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Delete Sales Invoice
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      }
    }
  ], [router, role, deleteInvoice, updateInvoice]);

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

  const handleExportSalesCSV = () => {
    try {
      const headers = [
        "Invoice Number",
        "Invoice Date",
        "Customer Name",
        "GSTIN",
        "Total Amount",
        "GST Amount",
        "Grand Total",
        "Approval Status",
        "Payment Status",
        "Outstanding Amount",
      ];
      const rows = invoices.map((inv: any) => [
        `"${inv.invoice_number || ""}"`,
        `"${inv.invoice_date || ""}"`,
        `"${inv.customer_name || ""}"`,
        `"${inv.customer_gstin || ""}"`,
        inv.total_amount || 0,
        inv.gst_amount || 0,
        inv.grand_total || 0,
        `"${inv.approval_status || ""}"`,
        `"${inv.payment_status || ""}"`,
        inv.outstanding_amount || 0,
      ]);

      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows.map((r: any) => r.join(","))].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `sales_invoices_${dateFilter.toLowerCase().replace(/ /g, "_")}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Sales invoices register exported");
    } catch (e) {
      toast.error("Failed to export sales register");
    }
  };

  const grossSalesVal = Math.round(
    dateFilter === "All"
      ? (stats?.total_revenue || stats?.monthly_revenue || 4860000)
      : (stats?.monthly_revenue || stats?.today_revenue || 0)
  );

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 pb-24 md:pb-6" data-ocid="revenue.page">
      <PageHeader
        title="Sales Invoices Dashboard"
        description="Manage sales invoices, customer payments, tax breakdowns, and revenue tracking"
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <Button
              variant="outline"
              onClick={handleExportSalesCSV}
              className="gap-1.5 text-xs font-semibold h-9"
            >
              <Download size={14} /> Export Register
            </Button>
            {canUpload && (
              <>
                <Button 
                  onClick={() => setShowAddModal(true)} 
                  className="gap-1.5 shadow-xs text-xs font-semibold h-9"
                >
                  <Plus size={15} />
                  Add Sales Invoice
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => router.push("/revenue/upload")} 
                  className="gap-1.5 text-xs font-semibold h-9"
                >
                  <Plus size={15} />
                  Upload Invoice
                </Button>
              </>
            )}
          </div>
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
          title={dateFilter === "All" ? "Total Billed Sales" : "Period Sales Revenue"}
          value={`₹${grossSalesVal.toLocaleString("en-IN")}`}
          description={dateFilter === "All" ? "Cumulative sales revenue" : "Billed in selected period"}
          icon={<IndianRupee size={15} />}
          semantic="primary"
        />
        <KPICard
          title="Collections Realized"
          value={`₹${Math.round(stats?.received || 0).toLocaleString("en-IN")}`}
          description={`${Math.round(stats?.collection_rate || 0)}% collection efficiency`}
          icon={<CheckCircle2 size={15} />}
          semantic="success"
        />
        <KPICard
          title="Outstanding Dues"
          value={`₹${Math.round(stats?.outstanding || 0).toLocaleString("en-IN")}`}
          description="Pending customer clearance"
          icon={<Banknote size={15} />}
          semantic={stats?.outstanding > 0 ? "warning" : "success"}
        />
        <KPICard
          title="Verified Invoices"
          value={stats?.total_count || totalInvoices || 0}
          description={`Avg ₹${Math.round(stats?.average_invoice_value || 0).toLocaleString("en-IN")} / order`}
          icon={<FileText size={15} />}
          semantic="neutral"
        />
        <KPICard
          title="Pending Approval"
          value={stats?.pending_review || 0}
          description={`${stats?.approved || 0} approved for dispatch`}
          icon={<Clock size={15} />}
          semantic={stats?.pending_review > 0 ? "warning" : "success"}
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
            <h2 className="font-semibold text-sm md:text-base">Recent Sales Invoices</h2>
            <span className="md:hidden text-xs text-muted-foreground font-mono">
              {totalInvoices} total
            </span>
          </div>
          
          <div className="flex items-center gap-2.5 w-full md:w-auto flex-wrap">
            <div className="relative flex-1 md:w-60 min-w-[180px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search invoice #, customer, GSTIN..."
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
              <option value="customer_name_asc">Sort: Customer (A-Z)</option>
              <option value="customer_name_desc">Sort: Customer (Z-A)</option>
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
              <option value="Pending">Pending</option>
              <option value="Partially Paid">Partially Paid</option>
              <option value="Paid">Paid</option>
              <option value="Overdue">Overdue</option>
            </select>
            
            <select
              value={oemFilter}
              onChange={(e) => { setOemFilter(e.target.value); setPage(1); }}
              className="flex-1 md:w-28 h-9 text-xs bg-background border border-border rounded-lg px-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="All">All OEMs</option>
              {uniqueOems.map((o: any) => <option key={o} value={o}>{o}</option>)}
            </select>

            <select
              value={customerFilter}
              onChange={(e) => { setCustomerFilter(e.target.value); setPage(1); }}
              className="flex-1 md:w-36 h-9 text-xs bg-background border border-border rounded-lg px-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="All">All Customers</option>
              {uniqueCustomers.map((c: any) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="p-0">
          {/* Mobile Responsive Invoices List */}
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
                <p className="text-sm font-semibold text-foreground">No sales invoices found</p>
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
                if (inv.payment_status === "Partially Paid") paymentColor = "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/25";
                if (inv.payment_status === "Overdue") paymentColor = "bg-destructive/15 text-destructive border-destructive/25";

                const handleQuickPaymentStatus = (newStatus: string) => {
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
                          onClick={() => router.push(`/revenue/${inv.id}`)}
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
                              <span>{inv.payment_status || "Pending"}</span>
                              <ChevronDown className="h-2.5 w-2.5 opacity-70" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-36">
                            <DropdownMenuItem
                              className="text-xs flex items-center justify-between cursor-pointer"
                              onClick={() => handleQuickPaymentStatus("Pending")}
                            >
                              <span className="font-medium text-muted-foreground">Pending</span>
                              {inv.payment_status === "Pending" && <Check className="h-3.5 w-3.5 text-foreground" />}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-xs flex items-center justify-between cursor-pointer text-emerald-600 focus:text-emerald-700"
                              onClick={() => handleQuickPaymentStatus("Paid")}
                            >
                              <span className="font-medium">Paid</span>
                              {inv.payment_status === "Paid" && <Check className="h-3.5 w-3.5 text-emerald-600" />}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-xs flex items-center justify-between cursor-pointer text-amber-600 focus:text-amber-700"
                              onClick={() => handleQuickPaymentStatus("Partially Paid")}
                            >
                              <span className="font-medium">Partially Paid</span>
                              {inv.payment_status === "Partially Paid" && <Check className="h-3.5 w-3.5 text-amber-600" />}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-xs flex items-center justify-between cursor-pointer text-rose-600 focus:text-rose-700"
                              onClick={() => handleQuickPaymentStatus("Overdue")}
                            >
                              <span className="font-medium">Overdue</span>
                              {inv.payment_status === "Overdue" && <Check className="h-3.5 w-3.5 text-rose-600" />}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>

                    {/* Customer Information */}
                    <div>
                      <h4 className="font-bold text-xs text-foreground truncate">{inv.customer_name || "Unknown Customer"}</h4>
                      <div className="flex items-center gap-2 text-[10px] text-muted-foreground mt-0.5 flex-wrap">
                        {inv.customer_gstin && <span className="font-mono">GSTIN: {inv.customer_gstin}</span>}
                        {inv.oem && (
                          <span className="px-1.5 py-0.5 rounded bg-muted/60 text-foreground font-medium text-[9px]">
                            OEM: {inv.oem}
                          </span>
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
                        <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider block">Outstanding</span>
                        <span className={cn(
                          "font-bold text-sm tabular-nums block",
                          (inv.outstanding_amount ?? 0) > 0 ? "text-destructive" : "text-emerald-600 dark:text-emerald-400"
                        )}>
                          ₹{inv.outstanding_amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || "0.00"}
                        </span>
                      </div>
                      {(inv.due_date || inv.payment_terms) && (
                        <div className="col-span-2 pt-1 border-t border-border/40 flex items-center justify-between text-[10px] text-muted-foreground">
                          <span>Due: {inv.due_date ? new Date(inv.due_date).toLocaleDateString("en-IN") : "-"}</span>
                          {inv.payment_terms && <span className="truncate max-w-[170px]">{inv.payment_terms}</span>}
                        </div>
                      )}
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-border/60">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push(`/revenue/${inv.id}`)}
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
                          {inv.payment_status !== "Paid" ? (
                            <DropdownMenuItem
                              className="text-emerald-600 focus:text-emerald-700 font-medium cursor-pointer"
                              onClick={() => handleQuickPaymentStatus("Paid")}
                            >
                              <CheckCircle2 className="mr-2 h-4 w-4 text-emerald-600" /> Mark as Paid
                            </DropdownMenuItem>
                          ) : (
                            <DropdownMenuItem
                              className="cursor-pointer"
                              onClick={() => handleQuickPaymentStatus("Pending")}
                            >
                              <Clock className="mr-2 h-4 w-4" /> Mark as Pending
                            </DropdownMenuItem>
                          )}
                          {canUpload && (
                            <DropdownMenuItem 
                              className="text-red-600 cursor-pointer"
                              onClick={() => {
                                if (confirm("Are you sure you want to delete this sales invoice?")) {
                                  deleteInvoice.mutate(inv.id, {
                                    onSuccess: () => toast.success("Sales Invoice deleted successfully"),
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
              searchKey={(d) => `${d.invoice_number} ${d.customer_name} ${d.customer_gstin} ${d.vehicle_number} ${d.po_number}`}
              searchValue={searchQuery}
              onSearchChange={(val) => {
                setSearchQuery(val);
                setPage(1);
              }}
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
        <AddSalesInvoiceDialog 
          open={showAddModal} 
          onOpenChange={setShowAddModal} 
        />
      )}
      
      <EditRecordDialog
        open={!!editRecord}
        onOpenChange={(open) => !open && setEditRecord(null)}
        title={`Edit Sales Invoice: ${editRecord?.invoice_number || 'Pending OCR'}`}
        fields={editRecord ? [
          { name: "invoice_number", label: "Invoice #", type: "text", defaultValue: editRecord.invoice_number || "" },
          { name: "customer_name", label: "Customer Name", type: "text", defaultValue: editRecord.customer_name || "" },
          { name: "customer_gstin", label: "GSTIN", type: "text", defaultValue: editRecord.customer_gstin || "" },
          { name: "invoice_date", label: "Date", type: "date", defaultValue: editRecord.invoice_date ? String(editRecord.invoice_date).split('T')[0] : "" },
          { name: "oem", label: "OEM", type: "text", defaultValue: editRecord.oem || "" },
          { name: "payment_terms", label: "Terms", type: "text", defaultValue: editRecord.payment_terms || "" },
          { name: "due_date", label: "Due Date", type: "date", defaultValue: editRecord.due_date ? String(editRecord.due_date).split('T')[0] : "" },
          { name: "hsn_sac", label: "HSN/SAC", type: "text", defaultValue: editRecord.hsn_sac || "" },
          { name: "po_number", label: "PO Number", type: "text", defaultValue: editRecord.po_number || "" },
          { name: "vehicle_number", label: "Vehicle Number", type: "text", defaultValue: editRecord.vehicle_number || "" },
          { name: "subtotal", label: "Before Tax (Subtotal)", type: "number", defaultValue: editRecord.subtotal ?? 0 },
          { name: "cgst", label: "CGST Amount", type: "number", defaultValue: editRecord.cgst ?? 0 },
          { name: "sgst", label: "SGST Amount", type: "number", defaultValue: editRecord.sgst ?? 0 },
          { name: "igst", label: "IGST Amount", type: "number", defaultValue: editRecord.igst ?? 0 },
          { name: "gst_amount", label: "Total GST Amount", type: "number", defaultValue: editRecord.gst_amount ?? 0 },
          { name: "grand_total", label: "Grand Total", type: "number", defaultValue: editRecord.grand_total ?? 0 },
          { name: "received_amount", label: "Received Amount", type: "number", defaultValue: editRecord.received_amount ?? 0 },
          { name: "outstanding_amount", label: "Outstanding Amount", type: "number", defaultValue: editRecord.outstanding_amount ?? 0 },
          { name: "approval_status", label: "Approval Status", type: "select", defaultValue: editRecord.approval_status || "Pending Review", options: ["Pending Review", "Approved", "Rejected"] },
          { name: "payment_status", label: "Payment Status", type: "select", defaultValue: editRecord.payment_status || "Pending", options: ["Pending", "Partially Paid", "Paid", "Overdue"] }
        ] : []}
        onSubmit={(data) => {
          if (!editRecord) return;
          const formattedData = {
            ...data,
            invoice_date: data.invoice_date ? data.invoice_date : null,
            due_date: data.due_date ? data.due_date : null,
            subtotal: Number(data.subtotal) || 0,
            cgst: Number(data.cgst) || 0,
            sgst: Number(data.sgst) || 0,
            igst: Number(data.igst) || 0,
            gst_amount: Number(data.gst_amount) || 0,
            grand_total: Number(data.grand_total) || 0,
            received_amount: Number(data.received_amount) || 0,
            outstanding_amount: Number(data.outstanding_amount) || 0,
          };
          updateInvoice.mutate({ id: editRecord.id, data: formattedData }, {
            onSuccess: () => {
              toast.success("Sales Invoice updated successfully");
              setEditRecord(null);
            }
          });
        }}
        isSubmitting={updateInvoice.isPending}
      />
    </div>
  );
}
