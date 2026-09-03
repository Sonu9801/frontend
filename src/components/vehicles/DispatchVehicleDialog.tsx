"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Truck, User, Phone, FileText, MapPin, Calendar, ShieldCheck, CheckCircle2 } from "lucide-react";
import type { Vehicle } from "@/types";

export interface DispatchFormValues {
  transportCompany: string;
  truckNumber: string;
  driverName: string;
  driverMobileNumber: string;
  dispatchChallanNumber: string;
  invoiceNumber: string;
  lrNumber: string;
  destination: string;
  dispatchDateTime: string;
  remarks: string;
}

export interface DispatchVehicleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  vehicle: Vehicle | null;
  onSubmit: (values: DispatchFormValues) => void;
  isSubmitting?: boolean;
}

export function DispatchVehicleDialog({
  open,
  onOpenChange,
  vehicle,
  onSubmit,
  isSubmitting = false,
}: DispatchVehicleDialogProps) {
  const [transportCompany, setTransportCompany] = useState("Self Transport");
  const [truckNumber, setTruckNumber] = useState("");
  const [driverName, setDriverName] = useState("");
  const [driverMobileNumber, setDriverMobileNumber] = useState("");
  const [dispatchChallanNumber, setDispatchChallanNumber] = useState("");
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [lrNumber, setLrNumber] = useState("");
  const [destination, setDestination] = useState("");
  const [dispatchDateTime, setDispatchDateTime] = useState("");
  const [remarks, setRemarks] = useState("");

  useEffect(() => {
    if (open && vehicle) {
      setTransportCompany(vehicle.transportCompany || "Self Transport");
      setTruckNumber(vehicle.truckNumber || "");
      setDriverName(vehicle.driverName || "");
      setDriverMobileNumber(vehicle.driverMobileNumber || "");
      setDispatchChallanNumber(
        vehicle.dispatchChallanNumber || `DC-${Date.now().toString().slice(-6)}`
      );
      setInvoiceNumber(vehicle.invoiceNumber || "");
      setLrNumber(vehicle.lrNumber || "");
      setDestination(vehicle.dealerName || vehicle.oemName || "Factory Outbound");
      
      const now = new Date();
      const localIso = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
        .toISOString()
        .slice(0, 16);
      setDispatchDateTime(vehicle.dispatchDateTime ? vehicle.dispatchDateTime.slice(0, 16) : localIso);
      setRemarks(vehicle.remarks || "");
    }
  }, [open, vehicle]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      transportCompany,
      truckNumber,
      driverName,
      driverMobileNumber,
      dispatchChallanNumber,
      invoiceNumber,
      lrNumber,
      destination,
      dispatchDateTime,
      remarks,
    });
  };

  if (!vehicle) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] flex flex-col p-0 overflow-hidden rounded-2xl">
        <DialogHeader className="px-6 pt-5 pb-4 border-b border-border bg-muted/20">
          <DialogTitle className="flex items-center gap-2 text-lg font-bold text-foreground">
            <div className="p-2 rounded-xl bg-primary/10 text-primary">
              <Truck size={20} />
            </div>
            Vehicle Dispatch Details Form
          </DialogTitle>
          <p className="text-xs text-muted-foreground">
            Fill dispatch & transport logistics details before finalizing vehicle stage to Dispatch.
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col overflow-y-auto p-6 space-y-5">
          {/* Vehicle Info Card */}
          <div className="bg-primary/5 border border-primary/20 rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">Chassis / VIN</span>
              <span className="font-bold text-sm text-foreground">{vehicle.chassisNumber || vehicle.vin || `CH-${vehicle.id}`}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">OEM Name</span>
              <span className="font-semibold text-foreground">{vehicle.oemName || "N/A"}</span>
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-muted-foreground block">Tracking ID</span>
              <span className="font-mono text-primary font-bold">{vehicle.trackingId}</span>
            </div>
          </div>

          {/* Grid Inputs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Carrier / Transport Company */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold flex items-center gap-1.5">
                <Truck size={13} className="text-primary" />
                Carrier / Transporter
              </Label>
              <Input
                value={transportCompany}
                onChange={(e) => setTransportCompany(e.target.value)}
                placeholder="e.g. Self Transport, VRL, Safexpress"
                required
                className="h-9 text-xs"
              />
            </div>

            {/* Truck Number */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold flex items-center gap-1.5">
                <Truck size={13} className="text-muted-foreground" />
                Truck / Vehicle Reg Number
              </Label>
              <Input
                value={truckNumber}
                onChange={(e) => setTruckNumber(e.target.value)}
                placeholder="e.g. MH12AB1234"
                className="h-9 text-xs"
              />
            </div>

            {/* Driver Name */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold flex items-center gap-1.5">
                <User size={13} className="text-muted-foreground" />
                Driver Name
              </Label>
              <Input
                value={driverName}
                onChange={(e) => setDriverName(e.target.value)}
                placeholder="Driver full name"
                className="h-9 text-xs"
              />
            </div>

            {/* Driver Phone */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold flex items-center gap-1.5">
                <Phone size={13} className="text-muted-foreground" />
                Driver Mobile Number
              </Label>
              <Input
                value={driverMobileNumber}
                onChange={(e) => setDriverMobileNumber(e.target.value)}
                placeholder="Driver contact number"
                className="h-9 text-xs"
              />
            </div>

            {/* Dispatch Challan Number */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold flex items-center gap-1.5">
                <FileText size={13} className="text-primary" />
                Dispatch Challan Number
              </Label>
              <Input
                value={dispatchChallanNumber}
                onChange={(e) => setDispatchChallanNumber(e.target.value)}
                placeholder="Challan Number"
                className="h-9 text-xs"
              />
            </div>

            {/* Invoice Number */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold flex items-center gap-1.5">
                <FileText size={13} className="text-muted-foreground" />
                Invoice Number
              </Label>
              <Input
                value={invoiceNumber}
                onChange={(e) => setInvoiceNumber(e.target.value)}
                placeholder="Invoice Number"
                className="h-9 text-xs"
              />
            </div>

            {/* LR Number */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold flex items-center gap-1.5">
                <FileText size={13} className="text-muted-foreground" />
                LR / Consignment Number
              </Label>
              <Input
                value={lrNumber}
                onChange={(e) => setLrNumber(e.target.value)}
                placeholder="LR Number"
                className="h-9 text-xs"
              />
            </div>

            {/* Destination */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold flex items-center gap-1.5">
                <MapPin size={13} className="text-primary" />
                Destination / Delivery Address
              </Label>
              <Input
                value={destination}
                onChange={(e) => setDestination(e.target.value)}
                placeholder="Destination city / dealer"
                className="h-9 text-xs"
              />
            </div>
          </div>

          {/* Dispatch Date & Time */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold flex items-center gap-1.5">
              <Calendar size={13} className="text-primary" />
              Dispatch Date & Time
            </Label>
            <Input
              type="datetime-local"
              value={dispatchDateTime}
              onChange={(e) => setDispatchDateTime(e.target.value)}
              className="h-9 text-xs"
            />
          </div>

          {/* Remarks */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold">Remarks / Notes</Label>
            <Textarea
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder="Any additional dispatch instructions..."
              rows={2}
              className="text-xs"
            />
          </div>

          <DialogFooter className="pt-3 border-t border-border flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="bg-primary text-primary-foreground hover:bg-primary/90 font-bold gap-1.5"
            >
              <CheckCircle2 size={15} />
              {isSubmitting ? "Dispatching..." : "Final Submit & Dispatch"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
