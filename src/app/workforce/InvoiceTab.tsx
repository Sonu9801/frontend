"use client";

import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { invoicesApi } from "@/lib/api";
import { useInvoiceDashboardStats, useUpdateInvoice } from "@/hooks/useQueries";
import { 
  Receipt, IndianRupee, Clock, CheckCircle2, FileText, Download, Plus, 
  UploadCloud, Search, ExternalLink, Calendar, Filter, X
} from "lucide-react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { AddInvoiceDialog } from "@/components/invoices/AddInvoiceDialog";
import { UploadInvoiceDialog } from "@/components/invoices/UploadInvoiceDialog";
import { exportToCSV, exportToExcel } from "../(dashboard)/reports/components/exportUtils";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

export function InvoiceTab({ activeUser }: { activeUser: any }) {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("All");
  const [showAddModal, setShowAddModal] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const updateInvoice = useUpdateInvoice();

  const { data: invoicesData, isLoading } = useQuery({
    queryKey: ["invoices", 1, 1000],
    queryFn: () => invoicesApi.getAll({ page: 1, pageSize: 1000 }),
    refetchInterval: 30000,
  });
  const invoices = Array.isArray(invoicesData) ? invoicesData : (invoicesData?.items ?? []);

  const { data: stats } = useInvoiceDashboardStats();

  const filteredInvoices = useMemo(() => {
    let list = invoices;
    if (search.trim()) {
      const q = search.toLowerCase().trim();
      list = list.filter((inv: any) => 
        (inv.invoice_number || "").toLowerCase().includes(q) ||
        (inv.vendor_name || inv.oem_name || "").toLowerCase().includes(q) ||
        (inv.notes || "").toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "All") {
      list = list.filter((inv: any) => {
        const isPaid = (inv.payment_status || "").toLowerCase() === "paid" || (inv.status || "").toLowerCase() === "paid";
        if (statusFilter.toLowerCase() === "paid") return isPaid;
        if (statusFilter.toLowerCase() === "pending") return !isPaid;
        return (inv.status || inv.approval_status || "").toLowerCase() === statusFilter.toLowerCase();
      });
    }
    return list;
  }, [invoices, search, statusFilter]);

  const getStatusBadge = (inv: any) => {
    const isOct = inv.invoice_date ? new Date(inv.invoice_date) >= new Date("2026-10-01") : true;
    const isPaid = (inv.payment_status || "").toLowerCase() === "paid";

    if (isOct) {
      if (isPaid) {
        return (
          <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-full text-[11px] font-bold flex items-center gap-1 border border-emerald-300 dark:border-emerald-800">
            <CheckCircle2 size={12}/> Paid (Approved)
          </span>
        );
      }
      return (
        <span className="px-2.5 py-1 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded-full text-[11px] font-bold flex items-center gap-1 border border-amber-300 dark:border-amber-800">
          <Clock size={12}/> Pending Review
        </span>
      );
    }

    // Historical pre-October invoices
    if (isPaid || inv.approval_status === "Approved") {
      return (
        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 rounded-full text-[11px] font-bold flex items-center gap-1 border border-emerald-300 dark:border-emerald-800">
          <CheckCircle2 size={12}/> Approved
        </span>
      );
    }

    return (
      <span className="px-2.5 py-1 bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 rounded-full text-[11px] font-bold flex items-center gap-1 border border-amber-300 dark:border-amber-800">
        <Clock size={12}/> Pending
      </span>
    );
  };

  const handleTogglePayment = async (inv: any, newStatus: string) => {
    setUpdatingId(inv.id);
    const isOct = inv.invoice_date ? new Date(inv.invoice_date) >= new Date("2026-10-01") : true;
    const payload: any = { payment_status: newStatus };
    if (newStatus === "Paid") {
      payload.approval_status = "Approved";
    } else if (newStatus === "Unpaid" && isOct) {
      payload.approval_status = "Pending Review";
    }

    try {
      await updateInvoice.mutateAsync({ id: inv.id, data: payload });
      toast.success(newStatus === "Paid" ? "Invoice marked as Paid & Approved!" : "Invoice set back to Pending Review");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to update status");
    } finally {
      setUpdatingId(null);
    }
  };

  const handleExportExcel = () => {
    if (filteredInvoices.length === 0) return toast.error("No invoice records to export");
    const exportData = filteredInvoices.map((inv: any) => ({
      "Invoice Number": inv.invoice_number,
      "OEM / Vendor": inv.vendor_name || inv.oem_name || "-",
      "Amount (INR)": inv.grand_total ?? inv.amount ?? 0,
      "Payment Status": inv.payment_status || "Unpaid",
      "Approval Status": inv.approval_status || "Pending Review",
      "Due Date": inv.due_date ? format(new Date(inv.due_date), "yyyy-MM-dd") : "-",
      "Invoice Date": inv.invoice_date ? format(new Date(inv.invoice_date), "yyyy-MM-dd") : "-",
    }));
    exportToExcel("Supervisor_Invoices_Report", Object.keys(exportData[0]), exportData);
  };

  const handleExportCSV = () => {
    if (filteredInvoices.length === 0) return toast.error("No invoice records to export");
    const exportData = filteredInvoices.map((inv: any) => ({
      "Invoice Number": inv.invoice_number,
      "OEM / Vendor": inv.vendor_name || inv.oem_name || "-",
      "Amount (INR)": inv.grand_total ?? inv.amount ?? 0,
      "Payment Status": inv.payment_status || "Unpaid",
      "Approval Status": inv.approval_status || "Pending Review",
      "Due Date": inv.due_date ? format(new Date(inv.due_date), "yyyy-MM-dd") : "-",
      "Invoice Date": inv.invoice_date ? format(new Date(inv.invoice_date), "yyyy-MM-dd") : "-",
    }));
    exportToCSV("Supervisor_Invoices_Report", Object.keys(exportData[0]), exportData);
  };

  return (
    <div className="p-3 sm:p-4 space-y-5 max-w-4xl mx-auto pb-28 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* Top Header Card */}
      <div className="bg-white dark:bg-zinc-900 p-4 sm:p-5 rounded-2xl border border-gray-200 dark:border-zinc-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-extrabold text-gray-900 dark:text-white">Purchase & Billing Invoices</h2>
            <span className="bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800 text-[10px] font-bold px-2 py-0.5 rounded-full">
              Admin OCR Format
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">Upload vendor and vehicle billing invoices with AI camera OCR.</p>
        </div>

        <div className="flex items-center gap-2">
          <button 
            type="button"
            onClick={() => setShowUploadModal(true)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-xs transition-colors cursor-pointer"
          >
            <UploadCloud size={16} />
            Scan / Upload OCR
          </button>
          <button 
            type="button"
            onClick={() => setShowAddModal(true)}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:text-gray-200 text-gray-800 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition-colors cursor-pointer"
          >
            <Plus size={16} />
            Manual Entry
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-3">
        <div className="bg-white dark:bg-zinc-900 rounded-xl p-3 sm:p-4 shadow-xs border border-gray-200 dark:border-zinc-800">
          <div className="flex items-center gap-1.5 mb-1.5">
            <div className="p-1.5 bg-green-50 dark:bg-green-900/20 text-green-600 rounded-lg">
              <IndianRupee size={14} />
            </div>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Total Paid</p>
          </div>
          <p className="text-base sm:text-lg font-black text-foreground">₹{stats?.total_paid?.toLocaleString() || 0}</p>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-xl p-3 sm:p-4 shadow-xs border border-gray-200 dark:border-zinc-800">
          <div className="flex items-center gap-1.5 mb-1.5">
            <div className="p-1.5 bg-amber-50 dark:bg-amber-900/20 text-amber-600 rounded-lg">
              <Clock size={14} />
            </div>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Pending</p>
          </div>
          <p className="text-base sm:text-lg font-black text-amber-600">₹{stats?.total_pending?.toLocaleString() || 0}</p>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-xl p-3 sm:p-4 shadow-xs border border-gray-200 dark:border-zinc-800">
          <div className="flex items-center gap-1.5 mb-1.5">
            <div className="p-1.5 bg-rose-50 dark:bg-rose-900/20 text-rose-600 rounded-lg">
              <Clock size={14} />
            </div>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Overdue</p>
          </div>
          <p className="text-base sm:text-lg font-black text-rose-600">₹{stats?.total_overdue?.toLocaleString() || 0}</p>
        </div>

        <div className="bg-white dark:bg-zinc-900 rounded-xl p-3 sm:p-4 shadow-xs border border-gray-200 dark:border-zinc-800">
          <div className="flex items-center gap-1.5 mb-1.5">
            <div className="p-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg">
              <Receipt size={14} />
            </div>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-wider">Invoices Count</p>
          </div>
          <p className="text-base sm:text-lg font-black text-foreground">{invoices.length}</p>
        </div>
      </div>

      {/* Filter and Export Strip */}
      <div className="bg-white dark:bg-zinc-900 p-3 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 w-full sm:w-auto flex-1">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <Input
              placeholder="Search invoice number, OEM vendor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs bg-gray-50 dark:bg-zinc-800 border-gray-200 dark:border-zinc-700 rounded-lg"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-8 text-xs font-semibold bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg px-2 text-foreground focus:outline-none"
          >
            <option value="All">All Statuses</option>
            <option value="Paid">Paid</option>
            <option value="Pending">Pending</option>
            <option value="Overdue">Overdue</option>
          </select>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={handleExportExcel}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
          >
            <FileText size={12} /> Excel
          </button>
          <button
            type="button"
            onClick={handleExportCSV}
            className="flex items-center gap-1 px-2.5 py-1.5 bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 text-gray-700 dark:text-gray-300 rounded-lg text-xs font-bold transition-all cursor-pointer"
          >
            <Download size={12} /> CSV
          </button>
        </div>
      </div>

      {/* Invoices List */}
      <div className="space-y-3">
        {isLoading ? (
          <div className="text-center py-12 text-gray-400 text-xs">Loading invoice records...</div>
        ) : filteredInvoices.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 shadow-xs p-6">
            <Receipt className="mx-auto text-gray-300 dark:text-gray-600 mb-2" size={36} />
            <p className="text-sm font-semibold text-foreground">No invoices found</p>
            <p className="text-xs text-muted-foreground mt-0.5">Try adjusting your filters or upload a new invoice.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {filteredInvoices.map((inv: any) => {
              const fileUrl = inv.file_url || inv.document_url || inv.documentsUrl;

              return (
                <div key={inv.id} className="bg-white dark:bg-zinc-900 rounded-2xl p-4 shadow-xs border border-gray-200 dark:border-zinc-800 flex flex-col justify-between gap-3 hover:border-indigo-200 dark:hover:border-indigo-900/50 transition-all">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-100 dark:border-indigo-900/50">
                        <FileText size={18} />
                      </div>
                      <div className="min-w-0">
                        <button
                          type="button"
                          onClick={() => router.push(`/invoices/${inv.id}`)}
                          className="font-extrabold text-foreground text-sm font-mono truncate text-left hover:text-indigo-600 transition-colors cursor-pointer block"
                        >
                          {inv.invoice_number || "PENDING OCR"}
                        </button>
                        <p className="text-xs text-muted-foreground truncate">{inv.vendor_name || inv.oem_name || "OEM Vendor"}</p>
                      </div>
                    </div>
                    {getStatusBadge(inv)}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-gray-100 dark:border-zinc-800/80">
                    <div>
                      <span className="text-[10px] text-muted-foreground block uppercase font-medium">Due Date</span>
                      <span className="font-medium text-foreground">
                        {inv.due_date ? format(new Date(inv.due_date), "dd MMM yyyy") : "-"}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-muted-foreground block uppercase font-medium">Grand Total</span>
                      <span className="font-black text-indigo-600 dark:text-indigo-400 text-sm">
                        ₹{(inv.grand_total ?? inv.amount ?? 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  </div>

                  {/* Actions & Document links */}
                  <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-zinc-800/60 text-xs gap-2">
                    <div>
                      {(inv.payment_status || "").toLowerCase() === "paid" ? (
                        <button
                          type="button"
                          disabled={updatingId === inv.id}
                          onClick={() => handleTogglePayment(inv, "Unpaid")}
                          className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer"
                          title="Revert to Pending"
                        >
                          <Clock size={12} />
                          {updatingId === inv.id ? "Updating..." : "Mark as Pending"}
                        </button>
                      ) : (
                        <button
                          type="button"
                          disabled={updatingId === inv.id}
                          onClick={() => handleTogglePayment(inv, "Paid")}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-all shadow-xs cursor-pointer"
                          title="Mark as Paid & Approve"
                        >
                          <CheckCircle2 size={12} />
                          {updatingId === inv.id ? "Updating..." : "Mark as Paid"}
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => router.push(`/invoices/${inv.id}`)}
                        className="inline-flex items-center gap-1 font-semibold text-xs text-gray-600 dark:text-gray-300 hover:text-indigo-600 hover:underline cursor-pointer"
                      >
                        Details
                      </button>
                      {fileUrl ? (
                        <a
                          href={fileUrl.startsWith("http") || fileUrl.startsWith("/") ? fileUrl : "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 font-semibold text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                        >
                          <ExternalLink size={12} /> View Doc
                        </a>
                      ) : (
                        <span className="text-[10px] text-gray-400">No doc</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <AddInvoiceDialog open={showAddModal} onOpenChange={setShowAddModal} />
      <UploadInvoiceDialog open={showUploadModal} onOpenChange={setShowUploadModal} />
    </div>
  );
}
