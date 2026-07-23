import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText } from "lucide-react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface AddSalesInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddSalesInvoiceDialog({ open, onOpenChange }: AddSalesInvoiceDialogProps) {
  const queryClient = useQueryClient();
  
  const [formData, setFormData] = useState({
    invoice_number: "",
    customer_name: "",
    customer_gstin: "",
    invoice_date: "",
    po_number: "",
    vehicle_number: "",
    hsn_sac: "",
    cgst: "",
    sgst: "",
    igst: "",
    gst_amount: "",
    subtotal: "",
    grand_total: "",
    oem: "",
    work_type: "",
    description_work_details: "",
    quantity: "",
    unit: "",
    rate: "",
    payment_terms: "",
    due_date: "",
    remarks: "",
  });

  const createInvoiceMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await api.post("/revenue/", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["revenue"] });
      queryClient.invalidateQueries({ queryKey: ["revenueStats"] });
      toast.success("Sales Invoice added successfully");
      onOpenChange(false);
      // Reset form
      setFormData({
        invoice_number: "",
        customer_name: "",
        customer_gstin: "",
        invoice_date: "",
        po_number: "",
        vehicle_number: "",
        hsn_sac: "",
        cgst: "",
        sgst: "",
        igst: "",
        gst_amount: "",
        subtotal: "",
        grand_total: "",
        oem: "",
        work_type: "",
        description_work_details: "",
        quantity: "",
        unit: "",
        rate: "",
        payment_terms: "",
        due_date: "",
        remarks: "",
      });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.detail || "Failed to add sales invoice");
    },
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.invoice_number || !formData.customer_name || !formData.grand_total) {
      toast.error("Please fill all required fields");
      return;
    }

    const dataToSubmit = {
      ...formData,
      cgst: parseFloat(formData.cgst) || 0,
      sgst: parseFloat(formData.sgst) || 0,
      igst: parseFloat(formData.igst) || 0,
      gst_amount: parseFloat(formData.gst_amount) || 0,
      subtotal: parseFloat(formData.subtotal) || 0,
      grand_total: parseFloat(formData.grand_total) || 0,
      quantity: formData.quantity ? parseFloat(formData.quantity) : null,
      rate: formData.rate ? parseFloat(formData.rate) : null,
      file_path: "manual_entry",
      ocr_confidence_score: 100, // Manual entry is considered 100% confident
    };

    createInvoiceMutation.mutate(dataToSubmit);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl bg-card border-border overflow-y-auto max-h-[90vh]">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold font-display flex items-center gap-2">
            <FileText size={20} className="text-primary" />
            Add Manual Sales Invoice
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6 mt-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="invoice_number">Invoice Number *</Label>
              <Input
                id="invoice_number"
                name="invoice_number"
                value={formData.invoice_number}
                onChange={handleChange}
                placeholder="INV-XXXX"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="invoice_date">Invoice Date *</Label>
              <Input
                id="invoice_date"
                name="invoice_date"
                type="date"
                value={formData.invoice_date}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2 lg:col-span-2">
              <Label htmlFor="customer_name">Customer Name *</Label>
              <Input
                id="customer_name"
                name="customer_name"
                value={formData.customer_name}
                onChange={handleChange}
                placeholder="Customer Name"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="customer_gstin">Customer GSTIN</Label>
              <Input
                id="customer_gstin"
                name="customer_gstin"
                value={formData.customer_gstin}
                onChange={handleChange}
                placeholder="GSTIN"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="hsn_sac">HSN/SAC</Label>
              <Input
                id="hsn_sac"
                name="hsn_sac"
                value={formData.hsn_sac}
                onChange={handleChange}
                placeholder="HSN/SAC"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="po_number">PO Number</Label>
              <Input
                id="po_number"
                name="po_number"
                value={formData.po_number}
                onChange={handleChange}
                placeholder="PO-XXXX"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="vehicle_number">Vehicle Number</Label>
              <Input
                id="vehicle_number"
                name="vehicle_number"
                value={formData.vehicle_number}
                onChange={handleChange}
                placeholder="AB-12-CD-3456"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="oem">OEM</Label>
              <Input
                id="oem"
                name="oem"
                value={formData.oem}
                onChange={handleChange}
                placeholder="OEM"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="work_type">Work Type</Label>
              <Input
                id="work_type"
                name="work_type"
                value={formData.work_type}
                onChange={handleChange}
                placeholder="Type of Work"
              />
            </div>
            <div className="space-y-2 lg:col-span-2">
              <Label htmlFor="description_work_details">Description</Label>
              <Input
                id="description_work_details"
                name="description_work_details"
                value={formData.description_work_details}
                onChange={handleChange}
                placeholder="Work Details"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                name="quantity"
                type="number"
                step="0.01"
                value={formData.quantity}
                onChange={handleChange}
                placeholder="0"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit">Unit</Label>
              <Input
                id="unit"
                name="unit"
                value={formData.unit}
                onChange={handleChange}
                placeholder="Nos/Kg"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rate">Rate</Label>
              <Input
                id="rate"
                name="rate"
                type="number"
                step="0.01"
                value={formData.rate}
                onChange={handleChange}
                placeholder="0.00"
              />
            </div>
          </div>
          
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="payment_terms">Payment Terms</Label>
              <Input
                id="payment_terms"
                name="payment_terms"
                value={formData.payment_terms}
                onChange={handleChange}
                placeholder="Net 30"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="due_date">Due Date</Label>
              <Input
                id="due_date"
                name="due_date"
                type="date"
                value={formData.due_date}
                onChange={handleChange}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="remarks">Remarks</Label>
              <Input
                id="remarks"
                name="remarks"
                value={formData.remarks}
                onChange={handleChange}
                placeholder="Notes"
              />
            </div>
          </div>

          <div className="grid grid-cols-4 gap-4">
            <div className="space-y-2">
              <Label htmlFor="cgst">CGST</Label>
              <Input
                id="cgst"
                name="cgst"
                type="number"
                step="0.01"
                value={formData.cgst}
                onChange={handleChange}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="sgst">SGST</Label>
              <Input
                id="sgst"
                name="sgst"
                type="number"
                step="0.01"
                value={formData.sgst}
                onChange={handleChange}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="igst">IGST</Label>
              <Input
                id="igst"
                name="igst"
                type="number"
                step="0.01"
                value={formData.igst}
                onChange={handleChange}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="gst_amount">Total GST</Label>
              <Input
                id="gst_amount"
                name="gst_amount"
                type="number"
                step="0.01"
                value={formData.gst_amount}
                onChange={handleChange}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 border-t border-border pt-4">
            <div className="space-y-2">
              <Label htmlFor="subtotal">Subtotal</Label>
              <Input
                id="subtotal"
                name="subtotal"
                type="number"
                step="0.01"
                value={formData.subtotal}
                onChange={handleChange}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="grand_total">Grand Total *</Label>
              <Input
                id="grand_total"
                name="grand_total"
                type="number"
                step="0.01"
                value={formData.grand_total}
                onChange={handleChange}
                placeholder="0.00"
                required
                className="font-bold text-lg border-primary/30 focus-visible:ring-primary"
              />
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={createInvoiceMutation.isPending}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={createInvoiceMutation.isPending}>
              {createInvoiceMutation.isPending ? "Adding..." : "Add Sales Invoice"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
