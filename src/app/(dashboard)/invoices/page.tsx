"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { DataTable, type ColumnDef } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useInvoices, useInvoiceDashboardStats, useInvoiceAnalytics, useDeleteInvoice, useUpdateInvoice } from "@/hooks/useQueries";
import { Pagination } from "@/components/ui/Pagination";
import { Banknote, CheckCircle2, Search, Plus, Calendar, Clock, IndianRupee, FileText, MoreHorizontal, Eye, Trash2, Edit } from "lucide-react";
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

export default function InvoicesDashboardPage() {
  const router = useRouter();
  const { data: stats, isLoading: isLoadingStats } = useInvoiceDashboardStats();
  const { data: analyticsData } = useInvoiceAnalytics();
  const updateInvoice = useUpdateInvoice();
  
  const [showAddModal, setShowAddModal] = useState(false);
  const [editRecord, setEditRecord] = useState<any>(null);
  
  const role = useAuthStore((state: any) => state.role);
  const canUpload = ["admin", "owner", "finance_manager"].includes(role);
  const deleteInvoice = useDeleteInvoice();

  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [statusFilter, setStatusFilter] = useState("All");
  const [paymentFilter, setPaymentFilter] = useState("All");
  const [dateFilter, setDateFilter] = useState("All");

  const { data: invoicesData, isLoading: isLoadingInvoices } = useInvoices({
    page,
    pageSize,
    approval_status: statusFilter !== "All" ? statusFilter : undefined,
    payment_status: paymentFilter !== "All" ? paymentFilter : undefined,
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
    <div className="p-4 md:p-6" data-ocid="invoices.page">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground">
            Purchase Invoices Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Manage vendor purchase invoices, approvals, and OCR processing
          </p>
        </div>
        {canUpload && (
          <div className="flex items-center gap-2">
            <Button 
              onClick={() => setShowAddModal(true)} 
              className="flex items-center gap-2"
            >
              <Plus size={16} />
              Add Purchase Invoice
            </Button>
            <Button 
              onClick={() => router.push("/invoices/upload")} 
              className="flex items-center gap-2"
            >
              <Plus size={16} />
              Upload Purchase Invoice
            </Button>
          </div>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
        <div className="bg-card border border-border rounded-xl p-4 flex flex-col shadow-subtle relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-10"><FileText size={48} /></div>
          <p className="text-xs text-muted-foreground mb-1 uppercase font-semibold tracking-wider">Today's Uploads</p>
          <p className="text-2xl font-bold font-display text-foreground">{stats?.today_uploads || 0}</p>
        </div>
        
        <div className="bg-card border border-border rounded-xl p-4 flex flex-col shadow-subtle relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-10 text-warning"><Clock size={48} /></div>
          <p className="text-xs text-muted-foreground mb-1 uppercase font-semibold tracking-wider">Pending Review</p>
          <p className="text-2xl font-bold font-display text-warning">{stats?.pending_review || 0}</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 flex flex-col shadow-subtle relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-10"><IndianRupee size={48} /></div>
          <p className="text-xs text-muted-foreground mb-1 uppercase font-semibold tracking-wider">Today's Purchase Expenses</p>
          <p className="text-2xl font-bold font-display text-foreground">
            ₹{(stats?.today_expenses || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
        </div>
        
        <div className="bg-card border border-border rounded-xl p-4 flex flex-col shadow-subtle relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-10 text-primary"><Calendar size={48} /></div>
          <p className="text-xs text-muted-foreground mb-1 uppercase font-semibold tracking-wider">Monthly Purchase Expenses</p>
          <p className="text-2xl font-bold font-display text-primary">
            ₹{(stats?.monthly_expenses || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </p>
        </div>

        <div className="bg-card border border-border rounded-xl p-4 flex flex-col shadow-subtle relative overflow-hidden">
          <div className="absolute top-0 right-0 p-3 opacity-10 text-destructive"><Banknote size={48} /></div>
          <p className="text-xs text-muted-foreground mb-1 uppercase font-semibold tracking-wider">Unpaid Purchase Invoices</p>
          <p className="text-2xl font-bold font-display text-destructive">{stats?.unpaid || 0}</p>
        </div>
      </div>

      {/* Analytics Charts */}
      {analyticsData && (
        <InvoiceAnalyticsCharts data={analyticsData} />
      )}

      {/* Invoice Table with Sticky Filters */}
      <div className="bg-card border border-border rounded-xl shadow-subtle overflow-hidden">
        <div className="p-4 border-b border-border bg-muted/20 flex flex-wrap items-center gap-4 sticky top-0 z-10">
          <h2 className="font-semibold mr-auto">Recent Purchase Invoices</h2>
          
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
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              className="flex-1 md:w-36 h-9 text-xs bg-background border border-border rounded-lg px-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="All">All Approvals</option>
              <option value="Pending Review">Pending Review</option>
              <option value="Approved">Approved</option>
              <option value="Rejected">Rejected</option>
            </select>

            <select
              value={paymentFilter}
              onChange={(e) => { setPaymentFilter(e.target.value); setPage(1); }}
              className="flex-1 md:w-36 h-9 text-xs bg-background border border-border rounded-lg px-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              <option value="All">All Payments</option>
              <option value="Unpaid">Unpaid</option>
              <option value="Partial">Partial</option>
              <option value="Paid">Paid</option>
            </select>
          </div>
        </div>

        <div className="p-0">
          <DataTable
            columns={columns}
            data={invoices}
            rowId={(d) => String(d.id)}
            searchKey={(d) => `${d.invoice_number} ${d.vendor_name} ${d.vendor_gstin} ${d.department}`}
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
          { name: "vendor_name", label: "Vendor Name", type: "text", defaultValue: editRecord.vendor_name || "" },
          { name: "invoice_number", label: "Invoice Number", type: "text", defaultValue: editRecord.invoice_number || "" },
          { name: "subtotal", label: "Subtotal", type: "number", defaultValue: editRecord.subtotal || 0 },
          { name: "grand_total", label: "Grand Total", type: "number", defaultValue: editRecord.grand_total || 0 },
          { name: "approval_status", label: "Approval Status", type: "select", defaultValue: editRecord.approval_status || "Pending Review", options: ["Pending Review", "Approved", "Rejected"] },
          { name: "payment_status", label: "Payment Status", type: "select", defaultValue: editRecord.payment_status || "Unpaid", options: ["Unpaid", "Partial", "Paid"] }
        ] : []}
        onSubmit={(data) => {
          if (!editRecord) return;
          updateInvoice.mutate({ id: editRecord.id, data }, {
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
