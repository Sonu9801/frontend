"use client";

import React, { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useUploadInvoice, useCreateInvoice } from "@/hooks/useQueries";
import { UploadCloud, FileText, Loader2, CheckCircle2, RotateCw, Receipt } from "lucide-react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

interface UploadInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UploadInvoiceDialog({ open, onOpenChange }: UploadInvoiceDialogProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [ocrData, setOcrData] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [rotation, setRotation] = useState<number>(0);

  const uploadMutation = useUploadInvoice();
  const createMutation = useCreateInvoice();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setRotation(0);
      if (file.type.startsWith("image/")) {
        setPreviewUrl(URL.createObjectURL(file));
      } else {
        setPreviewUrl(null);
      }
      processOCR(file);
    }
  };

  const compressImageIfNeeded = async (file: File): Promise<File> => {
    if (!file.type.startsWith("image/")) return file;
    return new Promise((resolve) => {
      const img = new Image();
      const objectUrl = URL.createObjectURL(file);
      img.src = objectUrl;
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const maxDim = 1800;
        let width = img.width;
        let height = img.height;
        if (width <= maxDim && height <= maxDim && file.size <= 1.5 * 1024 * 1024) {
          resolve(file);
          return;
        }
        if (width > height) {
          if (width > maxDim) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          }
        } else {
          if (height > maxDim) {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) ctx.drawImage(img, 0, 0, width, height);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              resolve(new File([blob], file.name.replace(/\.[^/.]+$/, "") + ".jpg", { type: "image/jpeg" }));
            } else {
              resolve(file);
            }
          },
          "image/jpeg",
          0.85
        );
      };
      img.onerror = () => {
        URL.revokeObjectURL(objectUrl);
        resolve(file);
      };
    });
  };

  const processOCR = async (file: File) => {
    setIsProcessing(true);
    setOcrData(null);
    try {
      const fileToUpload = await compressImageIfNeeded(file);
      const result = await uploadMutation.mutateAsync(fileToUpload);
      setOcrData(result);
      toast.success("Invoice processed successfully!");
    } catch (error: any) {
      const detail = error.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Failed to process invoice");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleSave = async () => {
    if (!ocrData) return;
    try {
      const payload = { ...ocrData };
      if (!payload.invoice_number) payload.invoice_number = null;
      if (!payload.vendor_name) payload.vendor_name = null;
      if (!payload.invoice_date) payload.invoice_date = null;

      await createMutation.mutateAsync(payload);
      queryClient.invalidateQueries({ queryKey: ["invoices"] });
      queryClient.invalidateQueries({ queryKey: ["invoiceStats"] });
      toast.success("Purchase Invoice saved successfully!");
      handleClose();
    } catch (error: any) {
      const detail = error.response?.data?.detail;
      toast.error(typeof detail === "string" ? detail : "Failed to save purchase invoice");
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setOcrData(null);
    setIsProcessing(false);
    setRotation(0);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-xl w-[95vw] rounded-2xl p-6 max-h-[90vh] overflow-y-auto">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-xl font-extrabold flex items-center gap-2 text-indigo-600 dark:text-indigo-400">
            <Receipt size={22} />
            Upload Purchase Invoice
          </DialogTitle>
          <p className="text-xs text-gray-500 font-medium">
            Upload or capture an invoice image/PDF to extract details automatically.
          </p>
        </DialogHeader>

        {!selectedFile ? (
          <div className="border-2 border-dashed border-gray-200 dark:border-zinc-700 rounded-2xl p-8 flex flex-col items-center justify-center text-center bg-gray-50/50 dark:bg-zinc-900/50">
            <UploadCloud size={44} className="text-indigo-500 mb-3" />
            <h3 className="font-bold text-base mb-1">Select Purchase Invoice</h3>
            <p className="text-xs text-gray-400 mb-4">Supports PDF, JPG, PNG files</p>
            <input
              type="file"
              accept=".pdf,image/*"
              className="hidden"
              ref={fileInputRef}
              onChange={handleFileChange}
            />
            <Button
              onClick={() => fileInputRef.current?.click()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold px-5 py-2.5 shadow-md"
            >
              Choose File
            </Button>
          </div>
        ) : isProcessing ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
            <Loader2 className="animate-spin text-indigo-600 w-10 h-10" />
            <p className="text-sm font-bold text-gray-700 dark:text-gray-300">Extracting invoice details...</p>
            <p className="text-xs text-gray-400">Please wait while OCR processes your file.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {previewUrl && (
              <div className="flex justify-center bg-gray-100 dark:bg-zinc-800 p-2 rounded-xl max-h-[200px] overflow-hidden">
                <img
                  src={previewUrl}
                  alt="Invoice Preview"
                  className="max-h-[190px] object-contain rounded-lg"
                  style={{ transform: `rotate(${rotation}deg)` }}
                />
              </div>
            )}

            <div className="flex justify-between items-center bg-gray-50 dark:bg-zinc-800/50 p-2.5 rounded-xl border border-gray-100 dark:border-zinc-700">
              <span className="text-xs font-bold truncate max-w-[250px]">{selectedFile.name}</span>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-8 rounded-lg"
                onClick={() => {
                  setSelectedFile(null);
                  setPreviewUrl(null);
                  setOcrData(null);
                }}
              >
                Change File
              </Button>
            </div>

            {ocrData && (
              <div className="space-y-3 pt-2">
                <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Extracted Information</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label className="text-[11px] text-gray-500">Invoice Number</Label>
                    <Input
                      value={ocrData.invoice_number || ""}
                      onChange={(e) => setOcrData({ ...ocrData, invoice_number: e.target.value })}
                      className="h-9 text-xs rounded-lg mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] text-gray-500">Vendor Name</Label>
                    <Input
                      value={ocrData.vendor_name || ""}
                      onChange={(e) => setOcrData({ ...ocrData, vendor_name: e.target.value })}
                      className="h-9 text-xs rounded-lg mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] text-gray-500">Invoice Date</Label>
                    <Input
                      type="date"
                      value={ocrData.invoice_date || ""}
                      onChange={(e) => setOcrData({ ...ocrData, invoice_date: e.target.value })}
                      className="h-9 text-xs rounded-lg mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-[11px] text-gray-500">Grand Total (₹)</Label>
                    <Input
                      type="number"
                      value={ocrData.grand_total || ""}
                      onChange={(e) => setOcrData({ ...ocrData, grand_total: parseFloat(e.target.value) || 0 })}
                      className="h-9 text-xs rounded-lg font-bold text-indigo-600 mt-1"
                    />
                  </div>
                </div>

                <div className="flex gap-2 pt-3">
                  <Button
                    variant="outline"
                    onClick={handleClose}
                    className="flex-1 rounded-xl text-xs font-bold"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSave}
                    disabled={createMutation.isPending}
                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-md"
                  >
                    {createMutation.isPending ? <Loader2 className="animate-spin w-4 h-4 mr-1" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
                    Save Invoice
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
