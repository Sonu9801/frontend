"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { DataTable, type ColumnDef } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useRevenue, useRevenueDashboardStats, useRevenueAnalytics, useDeleteSalesInvoice, useUpdateSalesInvoice } from "@/hooks/useQueries";
import { Banknote, CheckCircle2, Search, Plus, Calendar, Clock, IndianRupee, FileText, MoreHorizontal, Eye, Trash2, Edit } from "lucide-react";
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

export default function RevenueDashboardPage() {
  const router = useRouter();
  const { data: invoices = [], isLoading: isLoadingInvoices } = useRevenue();
  const { data: stats, isLoading: isLoadingStats } = useRevenueDashboardStats();
  const { data: analyticsData } = useRevenueAnalytics();
  const updateInvoice = useUpdateSalesInvoice();
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [editRecord, setEditRecord] = useState<any>(null);
  
  const role = useAuthStore((state: any) => state.role);
  const canUpload = ["admin", "owner", "finance_manager"].includes(role);
  const deleteInvoice = useDeleteSalesInvoice();

  const [statusFilter, setStatusFilter] = useState("All");
  const [paymentFilter, setPaymentFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("All");
  const [oemFilter, setOemFilter] = useState("All");
  const [workTypeFilter, setWorkTypeFilter] = useState("All");
  const [customerFilter, setCustomerFilter] = useState("All");

  const filteredInvoices = useMemo(() => {
    return invoices.filter((inv: any) => {
      const statusOk = statusFilter === "All" || inv.approval_status === statusFilter;
      const paymentOk = paymentFilter === "All" || inv.payment_status === paymentFilter;
      const oemOk = oemFilter === "All" || inv.oem === oemFilter;
      const workTypeOk = workTypeFilter === "All" || inv.work_type === workTypeFilter;
      const customerOk = customerFilter === "All" || inv.customer_name === customerFilter;
      
      let dateOk = true;
      if (dateFilter !== "All") {
        const invDate = new Date(inv.invoice_date || inv.created_at);
        const today = new Date();
        if (dateFilter === "Today") {
          dateOk = invDate.toDateString() === today.toDateString();
        } else if (dateFilter === "This Month") {
          dateOk = invDate.getMonth() === today.getMonth() && invDate.getFullYear() === today.getFullYear();
        } else if (dateFilter === "This Year") {
          dateOk = invDate.getFullYear() === today.getFullYear();
        } else if (dateFilter.includes("-")) {
          // Custom Month logic (YYYY-MM)
          const [yyyy, mm] = dateFilter.split("-");
          dateOk = invDate.getFullYear() === parseInt(yyyy) && (invDate.getMonth() + 1) === parseInt(mm);
        }
      }

      return statusOk && paymentOk && dateOk && oemOk && workTypeOk && customerOk;
    });
  }, [invoices, statusFilter, paymentFilter, dateFilter, oemFilter, workTypeFilter, customerFilter]);
  
  // Extract unique values for filter dropdowns
  const uniqueOems = useMemo(() => Array.from(new Set(invoices.map((inv: any) => inv.oem).filter(Boolean))), [invoices]);
  const uniqueWorkTypes = useMemo(() => Array.from(new Set(invoices.map((inv: any) => inv.work_type).filter(Boolean))), [invoices]);
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
      id: "vehicle_number",
      header: "Vehicle No",
      accessor: (d: any) => (
        <span className="text-xs font-mono">{d.vehicle_number || "-"}</span>
      ),
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
      id: "work_type",
      header: "Work Type",
      accessor: (d: any) => (
        <span className="text-xs">{d.work_type || "-"}</span>
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
        let color = "bg-muted text-muted-foreground";
        if (d.payment_status === "Paid") color = "bg-success/15 text-success";
        if (d.payment_status === "Partially Paid") color = "bg-warning/15 text-warning";
        if (d.payment_status === "Overdue") color = "bg-destructive/15 text-destructive";
        return (
          <span className={cn("text-[10px] font-semibold px-2 py-0.5 rounded uppercase tracking-wider whitespace-nowrap", color)}>
            {d.payment_status}
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
                  router.push(`/revenue/${d.id}`);
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
  ], [router, role, deleteInvoice]);

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
          <div className="absolute top-0 right-0 p-3 opacity-10 text-primary"><IndianRupee size={48} /></div>
          <p className="text-xs text-muted-foreground mb-1 uppercase font-semibold tracking-wider">Avg Invoice Value</p>
          <p className="text-2xl font-bold font-display text-primary">
            ₹{(stats?.average_invoice_value || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 flex flex-col shadow-subtle relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-10 text-success"><CheckCircle2 size={48} /></div>
          <p className="text-xs text-muted-foreground mb-1 uppercase font-semibold tracking-wider">Collection Rate</p>
          <p className="text-2xl font-bold font-display text-success">
            {(stats?.collection_rate || 0).toFixed(1)}%
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
            {dateFilter !== "All" && dateFilter !== "Today" && dateFilter !== "This Month" && dateFilter !== "This Year" ? (
              <div className="flex items-center gap-2">
                <input
                  type="month"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="flex-1 md:w-36 h-9 text-xs bg-background border border-border rounded-lg px-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setDateFilter("All")}
                  className="h-9 px-2 text-xs text-muted-foreground"
                >
                  Clear
                </Button>
              </div>
            ) : (
              <select
                value={dateFilter}
                onChange={(e) => {
                  if (e.target.value === "Custom") {
                    const now = new Date();
                    setDateFilter(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`);
                  } else {
                    setDateFilter(e.target.value);
                  }
                }}
                className="flex-1 md:w-36 h-9 text-xs bg-background border border-border rounded-lg px-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
              >
                <option value="All">All Time</option>
                <option value="Today">Today</option>
                <option value="This Month">This Month</option>
                <option value="This Year">This Year</option>
                <option value="Custom">Custom Month...</option>
              </select>
            )}

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
              value={workTypeFilter}
              onChange={(e) => setWorkTypeFilter(e.target.value)}
              className="flex-1 md:w-32 h-9 text-xs bg-background border border-border rounded-lg px-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="All">All Work Types</option>
              {uniqueWorkTypes.map((w: any) => <option key={w} value={w}>{w}</option>)}
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
            data={filteredInvoices}
            rowId={(d) => String(d.id)}
            searchKey={(d) => `${d.invoice_number} ${d.customer_name} ${d.customer_gstin} ${d.vehicle_number} ${d.po_number}`}
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
          { name: "customer_name", label: "Customer Name", type: "text", defaultValue: editRecord.customer_name || "" },
          { name: "invoice_number", label: "Invoice Number", type: "text", defaultValue: editRecord.invoice_number || "" },
          { name: "received_amount", label: "Received Amount", type: "number", defaultValue: editRecord.received_amount || 0 },
          { name: "approval_status", label: "Approval Status", type: "select", defaultValue: editRecord.approval_status || "Pending Review", options: ["Pending Review", "Approved", "Rejected"] },
          { name: "payment_status", label: "Payment Status", type: "select", defaultValue: editRecord.payment_status || "Pending", options: ["Pending", "Partially Paid", "Paid"] }
        ] : []}
        onSubmit={(data) => {
          if (!editRecord) return;
          updateInvoice.mutate({ id: editRecord.id, data }, {
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
