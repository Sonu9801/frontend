"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useRevenue, useUpdateSalesInvoice } from "@/hooks/useQueries";
import { ChevronLeft, FileText, Download, Clock, Loader2, Save, FileImage, User, CreditCard, Activity, Search } from "lucide-react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/authStore";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export default function SalesInvoiceDetailsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = React.use(params);
  const router = useRouter();
  const { data: invoices = [], isLoading } = useRevenue();
  const updateMutation = useUpdateSalesInvoice();
  
  const role = useAuthStore((state: any) => state.role);
  const canEdit = ["admin", "owner", "finance_manager"].includes(role);

  const [invoice, setInvoice] = useState<any>(null);
  const [editData, setEditData] = useState<any>({});
  
  useEffect(() => {
    if (invoices.length > 0) {
      const found = invoices.find((inv: any) => String(inv.id) === id);
      if (found) {
        setInvoice(found);
        setEditData({
          payment_status: found.payment_status || "Pending",
          approval_status: found.approval_status || "Pending Review",
          finance_remarks: found.finance_remarks || "",
          received_amount: found.received_amount || 0,
        });
      }
    }
  }, [invoices, id]);

  const handleSave = async () => {
    if (!invoice) return;
    try {
      const dataToSave = {
        ...editData,
        received_amount: parseFloat(editData.received_amount) || 0
      };
      await updateMutation.mutateAsync({ id: invoice.id, data: dataToSave });
      toast.success("Sales Invoice updated successfully");
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Failed to update sales invoice");
    }
  };

  const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://192.168.1.6:8000";
  let BASE_URL = API_URL.replace(/\/api\/?$/, "");
  // Replace 0.0.0.0 with localhost for browser compatibility
  if (BASE_URL.includes("0.0.0.0")) {
    BASE_URL = BASE_URL.replace("0.0.0.0", "localhost");
  }

  const getFileUrl = (path: string) => {
    if (!path) return "";
    // Handle windows path separators just in case
    const normalizedPath = path.replace(/\\/g, '/');
    const cleanPath = normalizedPath.startsWith('/') ? normalizedPath : `/${normalizedPath}`;
    const cleanBaseUrl = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL;
    return `${cleanBaseUrl}${cleanPath}`;
  };

  if (isLoading) {
    return <div className="p-6 flex items-center justify-center min-h-[50vh]"><Loader2 className="animate-spin text-primary w-8 h-8" /></div>;
  }

  if (!invoice) {
    return <div className="p-6 text-center text-muted-foreground">Sales Invoice not found</div>;
  }

  return (
    <div className="p-4 md:p-6 pb-24" data-ocid="revenue.details">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="rounded-full">
          <ChevronLeft size={20} />
        </Button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold font-display text-foreground">
            Sales Invoice #{invoice.invoice_number || invoice.id}
          </h1>
          <div className="flex gap-2 items-center text-sm text-muted-foreground mt-1">
            <span className="font-medium text-primary">{invoice.oem || "Unknown OEM"}</span> •
            <span>{invoice.customer_name}</span> •
            <span>{invoice.invoice_date ? new Date(invoice.invoice_date).toLocaleDateString() : 'Unknown Date'}</span>
          </div>
        </div>
        <div className="flex gap-2">
          {canEdit && (
            <Button onClick={handleSave} disabled={updateMutation.isPending}>
              {updateMutation.isPending ? <Loader2 className="animate-spin mr-2" /> : <Save size={16} className="mr-2" />}
              Save Changes
            </Button>
          )}
          <Button variant="outline" onClick={() => window.open(getFileUrl(invoice.file_path), '_blank')}>
            <Download size={16} className="mr-2" /> Download
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="mb-6 w-full justify-start overflow-x-auto h-auto p-1 bg-muted/50">
          <TabsTrigger value="overview" className="flex items-center gap-2"><Activity size={16} /> Overview</TabsTrigger>
          <TabsTrigger value="ocr" className="flex items-center gap-2"><Search size={16} /> OCR Data</TabsTrigger>
          <TabsTrigger value="customer" className="flex items-center gap-2"><User size={16} /> Customer</TabsTrigger>
          <TabsTrigger value="payment" className="flex items-center gap-2"><CreditCard size={16} /> Payment</TabsTrigger>
          <TabsTrigger value="attachments" className="flex items-center gap-2"><FileImage size={16} /> Attachments</TabsTrigger>
          <TabsTrigger value="audit" className="flex items-center gap-2"><Clock size={16} /> Audit & Timeline</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 grid grid-cols-2 gap-4">
              <div className="bg-card border border-border rounded-xl p-5 shadow-subtle">
                <p className="text-xs uppercase font-bold text-muted-foreground tracking-wider mb-1">Grand Total</p>
                <p className="text-3xl font-bold font-display text-primary">₹{invoice.grand_total?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-5 shadow-subtle">
                <p className="text-xs uppercase font-bold text-muted-foreground tracking-wider mb-1">Outstanding</p>
                <p className="text-3xl font-bold font-display text-destructive">₹{invoice.outstanding_amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className="bg-card border border-border rounded-xl p-5 shadow-subtle col-span-2 grid grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Work Type</p>
                  <p className="font-semibold">{invoice.work_type || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Vehicle No</p>
                  <p className="font-semibold">{invoice.vehicle_number || "N/A"}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Approval</p>
                  <span className="text-xs font-semibold px-2 py-1 bg-muted rounded">{invoice.approval_status}</span>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Payment</p>
                  <span className="text-xs font-semibold px-2 py-1 bg-muted rounded">{invoice.payment_status}</span>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl shadow-subtle flex flex-col h-[300px]">
              <div className="p-4 border-b border-border bg-muted/20 flex items-center gap-2">
                <FileText size={18} className="text-primary" />
                <h3 className="font-semibold">Document Preview</h3>
              </div>
              <div className="flex-1 bg-muted/10 p-2 overflow-hidden flex items-center justify-center">
                 {invoice.file_path.toLowerCase().endsWith('.pdf') ? (
                   <Button variant="outline" onClick={() => window.open(getFileUrl(invoice.file_path), '_blank')}>Open PDF</Button>
                 ) : (
                   <img src={getFileUrl(invoice.file_path)} alt="Sales Invoice Preview" className="max-h-full object-contain cursor-pointer" onClick={() => window.open(getFileUrl(invoice.file_path), '_blank')} />
                 )}
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="ocr" className="space-y-6">
          <div className="bg-card border border-border rounded-xl shadow-subtle">
            <div className="p-4 border-b border-border bg-muted/20">
              <h3 className="font-semibold">Extracted Information</h3>
            </div>
            <div className="p-6 grid grid-cols-2 lg:grid-cols-3 gap-6">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Invoice Number</p>
                <p className="font-semibold">{invoice.invoice_number}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Invoice Date</p>
                <p className="font-semibold">{invoice.invoice_date}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">PO Number</p>
                <p className="font-semibold">{invoice.po_number || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">HSN/SAC</p>
                <p className="font-semibold">{invoice.hsn_sac || "N/A"}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-muted-foreground mb-1">Work Description</p>
                <p className="font-semibold">{invoice.description_work_details || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Quantity</p>
                <p className="font-semibold">{invoice.quantity || "-"} {invoice.unit || ""}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">Rate</p>
                <p className="font-semibold">{invoice.rate ? `₹${invoice.rate}` : "-"}</p>
              </div>
              
              <div className="col-span-3 border-t border-border mt-2 pt-4 grid grid-cols-4 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground mb-1">CGST</p>
                  <p className="font-semibold">₹{invoice.cgst || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">SGST</p>
                  <p className="font-semibold">₹{invoice.sgst || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">IGST</p>
                  <p className="font-semibold">₹{invoice.igst || 0}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground mb-1">Subtotal</p>
                  <p className="font-semibold">₹{invoice.subtotal || 0}</p>
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="customer" className="space-y-6">
          <div className="bg-card border border-border rounded-xl shadow-subtle">
            <div className="p-4 border-b border-border bg-muted/20">
              <h3 className="font-semibold">Customer Details</h3>
            </div>
            <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <p className="text-xs text-muted-foreground mb-1">Customer Name</p>
                <p className="font-semibold text-lg">{invoice.customer_name}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">GSTIN</p>
                <p className="font-semibold font-mono">{invoice.customer_gstin || "N/A"}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground mb-1">OEM</p>
                <p className="font-semibold">{invoice.oem || "N/A"}</p>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="payment" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-card border border-border rounded-xl shadow-subtle">
              <div className="p-4 border-b border-border bg-muted/20">
                <h3 className="font-semibold">Payment Status</h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Payment Terms</label>
                    <p className="font-semibold">{invoice.payment_terms || "N/A"}</p>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Due Date</label>
                    <p className="font-semibold">{invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : "N/A"}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Payment Mode</label>
                    <p className="font-semibold">{invoice.payment_mode || "N/A"}</p>
                  </div>
                  <div>
                    <label className="text-xs text-muted-foreground block mb-1">Transaction Ref</label>
                    <p className="font-semibold">{invoice.transaction_reference || "N/A"}</p>
                  </div>
                </div>
                <div>
                  <label className="text-xs text-muted-foreground block mb-1">Remarks</label>
                  <p className="font-semibold">{invoice.remarks || "N/A"}</p>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl shadow-subtle">
              <div className="p-4 border-b border-border bg-muted/20">
                <h3 className="font-semibold">Update Tracking</h3>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-bold text-muted-foreground block mb-1">Approval Status</label>
                    <select 
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20"
                      value={editData.approval_status}
                      onChange={(e) => setEditData({...editData, approval_status: e.target.value})}
                      disabled={!canEdit}
                    >
                      <option value="Pending Review">Pending Review</option>
                      <option value="Approved">Approved</option>
                      <option value="Rejected">Rejected</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-muted-foreground block mb-1">Payment Status</label>
                    <select 
                      className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20"
                      value={editData.payment_status}
                      onChange={(e) => setEditData({...editData, payment_status: e.target.value})}
                      disabled={!canEdit}
                    >
                      <option value="Pending">Pending</option>
                      <option value="Partially Paid">Partially Paid</option>
                      <option value="Paid">Paid</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground block mb-1">Received Amount</label>
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-muted-foreground">₹</span>
                    <input 
                      type="number" 
                      className="w-full bg-background border border-border rounded-lg pl-7 pr-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 font-bold"
                      value={editData.received_amount}
                      onChange={(e) => setEditData({...editData, received_amount: e.target.value})}
                      disabled={!canEdit}
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-muted-foreground block mb-1">Finance Remarks</label>
                  <textarea 
                    className="w-full bg-background border border-border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-primary/20 min-h-[80px]"
                    value={editData.finance_remarks}
                    onChange={(e) => setEditData({...editData, finance_remarks: e.target.value})}
                    disabled={!canEdit}
                    placeholder="Internal notes..."
                  />
                </div>
              </div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="attachments" className="space-y-6">
          <div className="bg-card border border-border rounded-xl shadow-subtle p-8 flex flex-col items-center justify-center min-h-[400px]">
             <FileText size={64} className="text-primary mb-4" />
             <h3 className="text-xl font-bold mb-2">Original Document</h3>
             <p className="text-muted-foreground mb-6">The uploaded file for this sales invoice.</p>
             <Button size="lg" onClick={() => window.open(getFileUrl(invoice.file_path), '_blank')}>
               <Download className="mr-2" /> Download File
             </Button>
          </div>
        </TabsContent>

        <TabsContent value="audit" className="space-y-6">
          <div className="bg-card border border-border rounded-xl shadow-subtle overflow-hidden">
            <div className="p-4 border-b border-border bg-muted/20">
              <h3 className="font-semibold flex items-center gap-2">
                <Clock size={18} className="text-primary" />
                Sales Invoice Timeline & Audit Logs
              </h3>
            </div>
            <div className="p-6">
              <div className="relative border-l-2 border-border/50 ml-4 pl-6 space-y-6">
                <div className="relative">
                  <div className="absolute -left-[31px] bg-primary w-4 h-4 rounded-full border-4 border-card" />
                  <p className="text-sm font-semibold">Uploaded</p>
                  <p className="text-xs text-muted-foreground">{new Date(invoice.created_at).toLocaleString()}</p>
                </div>
                {invoice.audit_logs?.map((log: any, idx: number) => (
                  <div key={idx} className="relative">
                    <div className="absolute -left-[31px] bg-muted w-4 h-4 rounded-full border-4 border-card" />
                    <p className="text-sm">
                      <span className="font-semibold">{log.edited_by}</span> updated 
                      <span className="font-medium text-primary ml-1">{log.field_name.replace("_", " ")}</span>
                    </p>
                    <div className="bg-muted/30 p-2 rounded mt-2 inline-block">
                      <p className="text-xs text-muted-foreground">
                        <span className="line-through mr-2">{log.old_value || "None"}</span>
                        <span className="text-foreground font-medium">→ {log.new_value || "None"}</span>
                      </p>
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-1">{new Date(log.edited_date).toLocaleString()} • {log.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </TabsContent>

      </Tabs>
    </div>
  );
}
