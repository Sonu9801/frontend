"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { DataTable, type ColumnDef } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useRevenue, useRevenueDashboardStats, useRevenueAnalytics, useDeleteSalesInvoice, useUpdateSalesInvoice } from "@/hooks/useQueries";
import { Pagination } from "@/components/ui/Pagination";
import { Banknote, CheckCircle2, Search, Plus, Calendar, Clock, IndianRupee, FileText, MoreHorizontal, Eye, Trash2, Edit, ChevronDown, Check } from "lucide-react";
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
import { GlobalDateFilterBar } from "@/components/shared/GlobalDateFilterBar";

export default function RevenueDashboardPage() {
  const router = useRouter();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
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

  const { data: invoicesData, isLoading: isLoadingInvoices } = useRevenue({
    page,
    pageSize,
    approval_status: statusFilter !== "All" ? statusFilter : undefined,
    payment_status: paymentFilter !== "All" ? paymentFilter : undefined,
    oem: oemFilter !== "All" ? oemFilter : undefined,
    customer: customerFilter !== "All" ? customerFilter : undefined,
    ...dateRangeParams,
  });
  const { data: stats, isLoading: isLoadingStats } = useRevenueDashboardStats(dateRangeParams);
  const { data: analyticsData } = useRevenueAnalytics(dateRangeParams);
  const updateInvoice = useUpdateSalesInvoice();

  const [showAddModal, setShowAddModal] = useState(false);
  const [editRecord, setEditRecord] = useState<any>(null);

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

  if (isLoadingInvoices || isLoadingStats) {
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
    <div className="p-4 md:p-6" data-ocid="revenue.page">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground">
            Sales Invoices Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage sales invoices, customer payments, and track income
          </p>
        </div>
        {canUpload && (
          <div className="flex items-center gap-2">
            <Button 
              onClick={() => setShowAddModal(true)} 
              className="flex items-center gap-2"
            >
              <Plus size={16} />
              Add Sales Invoice
            </Button>
            <Button 
              onClick={() => router.push("/revenue/upload")} 
              className="flex items-center gap-2"
            >
              <Plus size={16} />
              Upload Sales Invoice
            </Button>
          </div>
        )}
      </div>

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
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-card border border-border rounded-xl p-4 flex flex-col shadow-subtle relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-10"><FileText size={48} /></div>
          <p className="text-xs text-muted-foreground mb-1 uppercase font-semibold tracking-wider">Today's Bills</p>
          <p className="text-2xl font-bold font-display text-foreground">{stats?.today_uploads || 0}</p>
        </div>
        
        <div className="bg-card border border-border rounded-xl p-4 flex flex-col shadow-subtle relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-10 text-warning"><Clock size={48} /></div>
          <p className="text-xs text-muted-foreground mb-1 uppercase font-semibold tracking-wider">Pending Review</p>
          <p className="text-2xl font-bold font-display text-warning">{stats?.pending_review || 0}</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 flex flex-col shadow-subtle relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-10"><IndianRupee size={48} /></div>
          <p className="text-xs text-muted-foreground mb-1 uppercase font-semibold tracking-wider">Today's Sales Revenue</p>
          <p className="text-2xl font-bold font-display text-foreground">
            ₹{(stats?.today_revenue || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
        </div>
        
        <div className="bg-card border border-border rounded-xl p-4 flex flex-col shadow-subtle relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-10 text-primary"><Calendar size={48} /></div>
          <p className="text-xs text-muted-foreground mb-1 uppercase font-semibold tracking-wider">Monthly Sales Revenue</p>
          <p className="text-2xl font-bold font-display text-primary">
            ₹{(stats?.monthly_revenue || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 flex flex-col shadow-subtle relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-10 text-destructive"><Banknote size={48} /></div>
          <p className="text-xs text-muted-foreground mb-1 uppercase font-semibold tracking-wider">Outstanding Dues</p>
          <p className="text-2xl font-bold font-display text-destructive">
            ₹{(stats?.outstanding || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
        </div>



        <div className="bg-card border border-border rounded-xl p-4 flex flex-col shadow-subtle relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-10 text-success"><Banknote size={48} /></div>
          <p className="text-xs text-muted-foreground mb-1 uppercase font-semibold tracking-wider">Received Amount</p>
          <p className="text-2xl font-bold font-display text-success">
            ₹{(stats?.received || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 flex flex-col shadow-subtle relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-10 text-warning"><Clock size={48} /></div>
          <p className="text-xs text-muted-foreground mb-1 uppercase font-semibold tracking-wider">Pending Amount</p>
          <p className="text-2xl font-bold font-display text-warning">
            ₹{(stats?.outstanding || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
        </div>
      </div>

      {/* Analytics Charts */}
      {analyticsData && (
        <InvoiceAnalyticsCharts data={analyticsData} />
      )}

      {/* Invoice Table with Sticky Filters */}
      <div className="bg-card border border-border rounded-xl shadow-subtle overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/20 flex flex-wrap items-center gap-4 sticky top-0 z-10">
          <h2 className="font-semibold mr-auto">Recent Sales Invoices</h2>
          
          <div className="flex items-center gap-3 w-full md:w-auto">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex-1 md:w-36 h-9 text-xs bg-background border border-border rounded-lg px-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="All">All Approvals</option>
              <option value="Pending Review">Pending Review</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>

            <select
              value={paymentFilter}
              onChange={(e) => setPaymentFilter(e.target.value)}
              className="flex-1 md:w-36 h-9 text-xs bg-background border border-border rounded-lg px-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="All">All Payments</option>
              <option value="Pending">Pending</option>
              <option value="Partially Paid">Partially Paid</option>
              <option value="Paid">Paid</option>
            </select>
            
            <select
              value={oemFilter}
              onChange={(e) => setOemFilter(e.target.value)}
              className="flex-1 md:w-32 h-9 text-xs bg-background border border-border rounded-lg px-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="All">All OEMs</option>
              {uniqueOems.map((o: any) => <option key={o} value={o}>{o}</option>)}
            </select>
            


            <select
              value={customerFilter}
              onChange={(e) => setCustomerFilter(e.target.value)}
              className="flex-1 md:w-36 h-9 text-xs bg-background border border-border rounded-lg px-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="All">All Customers</option>
              {uniqueCustomers.map((c: any) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="p-0">
          <DataTable
            columns={columns}
            data={invoices}
            rowId={(d) => String(d.id)}
            searchKey={(d) => `${d.invoice_number} ${d.customer_name} ${d.customer_gstin} ${d.vehicle_number} ${d.po_number}`}
            hidePagination={true}
          />
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
