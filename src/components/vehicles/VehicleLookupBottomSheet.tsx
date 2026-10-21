"use client";

import React, { useState, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  Search,
  X,
  Truck,
  Inbox,
  Factory,
  Building2,
  Calendar,
  Clock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Car,
  FileText,
  User,
  Phone,
  Hash,
  ExternalLink,
  ChevronRight,
  Sparkles,
  Info,
} from "lucide-react";
import { cn, parseUTCDate } from "@/lib/utils";
import { useVehicles } from "@/hooks/useQueries";
import type { Vehicle, Stage } from "@/types";
import Link from "next/link";

interface VehicleLookupBottomSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialQuery?: string;
}

function formatDisplayDate(dateStr?: string | null) {
  if (!dateStr) return "N/A";
  try {
    const d = parseUTCDate(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return dateStr;
  }
}

export function VehicleLookupBottomSheet({
  open,
  onOpenChange,
  initialQuery = "",
}: VehicleLookupBottomSheetProps) {
  const [query, setQuery] = useState(initialQuery);
  const inputRef = useRef<HTMLInputElement>(null);

  // Fetch all vehicles
  const { data: vehiclesData, isLoading } = useVehicles({ pageSize: 1000 });
  const vehicles: Vehicle[] = useMemo(() => vehiclesData?.items ?? [], [vehiclesData]);

  // Focus input whenever opened
  useEffect(() => {
    if (open) {
      setQuery(initialQuery);
      setTimeout(() => {
        inputRef.current?.focus();
      }, 250);
    }
  }, [open, initialQuery]);

  // Extract last 4 digits helper
  const getLast4 = (str?: string | null) => {
    if (!str) return "";
    const clean = str.replace(/[^a-zA-Z0-9]/g, "");
    return clean.slice(-4);
  };

  // Filter vehicles based on last 4 digits or any search term
  const searchResults = useMemo(() => {
    const cleanQuery = query.trim().toLowerCase();
    if (!cleanQuery) return [];

    return vehicles.filter((v) => {
      const vNum = (v.vehicleNumber || "").toLowerCase();
      const chassis = (v.chassisNumber || "").toLowerCase();
      const vin = (v.vin || "").toLowerCase();
      const trk = (v.trackingId || "").toLowerCase();
      const dealer = (v.dealerName || "").toLowerCase();
      const oem = (v.oemName || "").toLowerCase();
      const model = (v.vehicleModel || "").toLowerCase();

      // Check last 4 digits
      const last4VNum = getLast4(v.vehicleNumber).toLowerCase();
      const last4Chassis = getLast4(v.chassisNumber).toLowerCase();
      const last4Vin = getLast4(v.vin).toLowerCase();
      const last4Trk = getLast4(v.trackingId).toLowerCase();

      if (
        last4VNum === cleanQuery ||
        last4Chassis === cleanQuery ||
        last4Vin === cleanQuery ||
        last4Trk === cleanQuery
      ) {
        return true;
      }

      // Check substring matches
      return (
        vNum.includes(cleanQuery) ||
        chassis.includes(cleanQuery) ||
        vin.includes(cleanQuery) ||
        trk.includes(cleanQuery) ||
        dealer.includes(cleanQuery) ||
        oem.includes(cleanQuery) ||
        model.includes(cleanQuery)
      );
    });
  }, [vehicles, query]);

  // Quick suggestions: top 4 recent vehicles
  const recentVehicles = useMemo(() => {
    return vehicles.slice(0, 4);
  }, [vehicles]);

  const getStageMeta = (stage?: string) => {
    const s = (stage || "").toLowerCase();
    if (s === "dispatch" || s === "dispatched" || s === "delivered") {
      return {
        label: "Dispatched",
        statusText: "Dispatched",
        badgeBg: "bg-emerald-600 text-white font-extrabold border-emerald-700 dark:bg-emerald-500 dark:border-emerald-600 shadow-xs",
        icon: Truck,
        isDispatched: true,
        isReceived: false,
      };
    }
    if (s === "received" || s === "incoming_verification" || s === "supervisor_verification") {
      return {
        label: "Received",
        statusText: "Received",
        badgeBg: "bg-rose-600 text-white font-extrabold border-rose-700 dark:bg-rose-500 dark:border-rose-600 shadow-xs",
        icon: Inbox,
        isDispatched: false,
        isReceived: true,
      };
    }
    if (s === "fabrication" || s === "paint" || s === "quality" || s === "rtd" || s === "readytodispatch") {
      const stageMap: Record<string, string> = {
        fabrication: "Fabrication",
        paint: "Paint Shop",
        quality: "QC Inspection",
        rtd: "Ready to Dispatch",
        readytodispatch: "Ready to Dispatch",
      };
      const name = stageMap[s] || "In Production";
      return {
        label: name,
        statusText: name,
        badgeBg: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25",
        icon: Factory,
        isDispatched: false,
        isReceived: false,
      };
    }
    if (s === "hold") {
      return {
        label: "On Hold",
        statusText: "On Hold",
        badgeBg: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/25",
        icon: AlertTriangle,
        isDispatched: false,
        isReceived: false,
      };
    }
    return {
      label: s.toUpperCase() || "Active",
      statusText: s.toUpperCase() || "Active",
      badgeBg: "bg-muted text-muted-foreground border-border",
      icon: Car,
      isDispatched: false,
      isReceived: false,
    };
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => onOpenChange(false)}
            className="fixed inset-0 bg-black/65 backdrop-blur-sm z-[9998]"
          />

          {/* Bottom Sheet Modal */}
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 320 }}
            className="fixed inset-x-0 bottom-0 max-h-[92vh] bg-card border-t border-border rounded-t-[32px] shadow-2xl z-[9999] flex flex-col pb-safe overflow-hidden"
          >
            {/* Sheet Handle */}
            <div className="pt-3 pb-2 px-6 flex flex-col items-center">
              <div className="w-12 h-1.5 bg-muted-foreground/30 rounded-full mb-3" />
            </div>

            {/* Header */}
            <div className="px-5 pb-3 border-b border-border/70 flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                    <Search size={18} strokeWidth={2.4} />
                  </div>
                  <h2 className="text-base font-extrabold text-foreground tracking-tight">
                    Vehicle 4-Digit Lookup
                  </h2>
                </div>
                <p className="text-xs text-muted-foreground mt-1 font-medium">
                  Enter <span className="font-bold text-foreground">last 4 digits</span> to verify destination dealer and dispatch / received status.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="p-2 rounded-full bg-muted/60 text-muted-foreground hover:text-foreground active:scale-95 transition-all"
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            {/* Search Input Box */}
            <div className="p-4 bg-muted/30 border-b border-border/50">
              <div className="relative flex items-center">
                <Search
                  size={19}
                  className="absolute left-3.5 text-muted-foreground pointer-events-none"
                />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Enter last 4 digits (e.g. 3866 or chassis)..."
                  className="w-full pl-11 pr-11 py-3 text-base font-bold bg-background text-foreground border-2 border-primary/30 rounded-2xl focus:outline-none focus:border-primary shadow-xs tracking-wider placeholder:text-muted-foreground/60 placeholder:text-xs placeholder:tracking-normal placeholder:font-normal"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => setQuery("")}
                    className="absolute right-3 p-1.5 rounded-full bg-muted text-muted-foreground hover:text-foreground"
                  >
                    <X size={15} />
                  </button>
                )}
              </div>

              {/* Quick suggestion chips */}
              {!query && recentVehicles.length > 0 && (
                <div className="mt-2.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                  <span className="text-[11px] font-semibold text-muted-foreground whitespace-nowrap">
                    Recent:
                  </span>
                  {recentVehicles.map((v) => {
                    const last4 = getLast4(v.vehicleNumber) || getLast4(v.chassisNumber);
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setQuery(last4)}
                        className="px-2.5 py-1 rounded-full bg-card border border-border text-[11px] font-bold text-foreground hover:border-primary/50 hover:text-primary active:scale-95 transition-all whitespace-nowrap shadow-2xs flex items-center gap-1"
                      >
                        <Hash size={11} className="text-muted-foreground" />
                        <span>{last4 || v.vehicleNumber}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Results Area */}
            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3.5 min-h-[220px]">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
                  <div className="w-8 h-8 rounded-full border-2 border-primary border-t-transparent animate-spin mb-3" />
                  <p className="text-xs font-medium">Loading factory vehicles...</p>
                </div>
              ) : !query.trim() ? (
                /* Empty state - instructions */
                <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-3">
                    <Car size={28} strokeWidth={2.2} />
                  </div>
                  <h3 className="text-sm font-bold text-foreground">
                    Enter Vehicle Last 4 Digits
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 max-w-[280px]">
                    Type the last 4 digits of vehicle plate or chassis number to instantly verify:
                  </p>
                  <div className="mt-4 grid grid-cols-2 gap-2 w-full max-w-xs text-left">
                    <div className="p-2.5 rounded-xl bg-muted/40 border border-border flex items-start gap-2">
                      <Building2 size={16} className="text-blue-500 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-[11px] font-bold text-foreground">Destination Dealer</div>
                        <div className="text-[10px] text-muted-foreground">Assigned dealer & OEM client</div>
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-muted/40 border border-border flex items-start gap-2">
                      <Truck size={16} className="text-emerald-500 shrink-0 mt-0.5" />
                      <div>
                        <div className="text-[11px] font-bold text-foreground">Live Status</div>
                        <div className="text-[10px] text-muted-foreground">Received, active, or dispatched</div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : searchResults.length === 0 ? (
                /* No matching vehicle */
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-600 flex items-center justify-center mb-2.5">
                    <AlertTriangle size={24} />
                  </div>
                  <h3 className="text-sm font-bold text-foreground">
                    No Vehicle Found
                  </h3>
                  <p className="text-xs text-muted-foreground mt-1 max-w-[280px]">
                    No vehicle found matching "{query}". Please verify the last 4 digits and try again.
                  </p>
                </div>
              ) : (
                /* Matching Results */
                <div className="space-y-3">
                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                      Matches Found ({searchResults.length})
                    </span>
                    <span className="text-[11px] font-medium text-primary">
                      Instant Live Result
                    </span>
                  </div>

                  {searchResults.map((vehicle) => {
                    const meta = getStageMeta(vehicle.currentStage);
                    const Icon = meta.icon;
                    const dealerDisplayName =
                      vehicle.dealerName || vehicle.oemName || "Direct Factory / Plant";

                    return (
                      <div
                        key={vehicle.id}
                        className="p-3 rounded-xl border border-border/70 bg-card hover:border-primary/40 transition-all shadow-2xs space-y-2"
                      >
                        {/* Row 1: Header - Plate No + Model + Status Badge */}
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider shrink-0">
                              Plate:
                            </span>
                            <span className="font-mono font-bold text-sm text-foreground tracking-tight truncate">
                              {vehicle.vehicleNumber}
                            </span>
                            {vehicle.vehicleModel && (
                              <span className="text-[10px] font-semibold text-muted-foreground px-1.5 py-0.5 rounded bg-muted/70 shrink-0">
                                {vehicle.vehicleModel}
                              </span>
                            )}
                          </div>

                          <div
                            className={cn(
                              "px-2 py-0.5 rounded-full text-[10.5px] font-semibold flex items-center gap-1 border shrink-0",
                              meta.badgeBg
                            )}
                          >
                            <Icon size={12} strokeWidth={2.4} />
                            <span>{meta.statusText}</span>
                          </div>
                        </div>

                        {/* Row 2: 2-Column Key Metrics (Dealer & Date/Status) */}
                        <div className="grid grid-cols-2 gap-2 p-1.5 rounded-lg bg-muted/30 border border-border/50 text-xs items-stretch">
                          {/* Left Col: Dealer Name with Blinking Highlight Animation */}
                          <div className="min-w-0 p-1.5 rounded-md border animate-dealer-blink transition-all flex flex-col justify-center">
                            <div className="flex items-center justify-between gap-1 text-[9px] font-black text-amber-900 dark:text-amber-200 uppercase tracking-wider mb-0.5">
                              <div className="flex items-center gap-1">
                                <Building2 size={11} className="text-amber-700 dark:text-amber-400 shrink-0" />
                                <span>Dealer</span>
                              </div>
                              <span className="flex h-1.5 w-1.5 relative shrink-0">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-500 opacity-75" />
                                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-600 dark:bg-amber-400" />
                              </span>
                            </div>
                            <div className="font-black text-amber-950 dark:text-amber-50 text-xs truncate leading-tight" title={dealerDisplayName}>
                              {dealerDisplayName}
                            </div>
                            {vehicle.dealerName && vehicle.oemName && vehicle.dealerName !== vehicle.oemName && (
                              <div className="text-[9.5px] text-amber-800/80 dark:text-amber-300/80 font-medium truncate mt-0.5">
                                OEM: {vehicle.oemName}
                              </div>
                            )}
                          </div>

                          {/* Right Col: Received / Dispatched Date with Red / Green Blinking Background */}
                          <div
                            className={cn(
                              "min-w-0 p-1.5 rounded-md border transition-all flex flex-col justify-center",
                              meta.isDispatched
                                ? "animate-dispatch-blink"
                                : meta.isReceived
                                ? "animate-received-blink"
                                : "bg-muted/40 border-border/50"
                            )}
                          >
                            <div
                              className={cn(
                                "flex items-center justify-between gap-1 text-[9px] font-black uppercase tracking-wider mb-0.5",
                                meta.isDispatched
                                  ? "text-emerald-900 dark:text-emerald-200"
                                  : meta.isReceived
                                  ? "text-rose-900 dark:text-rose-200"
                                  : "text-muted-foreground"
                              )}
                            >
                              <div className="flex items-center gap-1">
                                <Clock
                                  size={11}
                                  className={cn(
                                    "shrink-0",
                                    meta.isDispatched
                                      ? "text-emerald-700 dark:text-emerald-400"
                                      : meta.isReceived
                                      ? "text-rose-700 dark:text-rose-400"
                                      : "text-muted-foreground"
                                  )}
                                />
                                <span>{meta.isDispatched ? "Dispatched On" : meta.isReceived ? "Received On" : "Status"}</span>
                              </div>
                              {(meta.isDispatched || meta.isReceived) && (
                                <span className="flex h-1.5 w-1.5 relative shrink-0">
                                  <span
                                    className={cn(
                                      "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75",
                                      meta.isDispatched ? "bg-emerald-500" : "bg-rose-500"
                                    )}
                                  />
                                  <span
                                    className={cn(
                                      "relative inline-flex rounded-full h-1.5 w-1.5",
                                      meta.isDispatched
                                        ? "bg-emerald-600 dark:bg-emerald-400"
                                        : "bg-rose-600 dark:bg-rose-400"
                                    )}
                                  />
                                </span>
                              )}
                            </div>
                            <div
                              className={cn(
                                "font-black text-xs truncate leading-tight",
                                meta.isDispatched
                                  ? "text-emerald-950 dark:text-emerald-50"
                                  : meta.isReceived
                                  ? "text-rose-950 dark:text-rose-50"
                                  : "text-foreground"
                              )}
                            >
                              {meta.isDispatched
                                ? (vehicle.dispatchDateTime ? formatDisplayDate(vehicle.dispatchDateTime) : "Dispatched")
                                : (vehicle.receivedAt || vehicle.arrivalTime ? formatDisplayDate(vehicle.receivedAt || vehicle.arrivalTime) : "In Plant")}
                            </div>
                            {meta.isReceived && vehicle.platformNumber && (
                              <div className="text-[9.5px] text-rose-800/80 dark:text-rose-300/80 font-medium truncate mt-0.5">
                                Platform: {vehicle.platformNumber}
                              </div>
                            )}
                            {meta.isDispatched && vehicle.dispatchChallanNumber && (
                              <div className="text-[9.5px] font-mono text-emerald-800/80 dark:text-emerald-300/80 font-medium truncate mt-0.5">
                                Challan: {vehicle.dispatchChallanNumber}
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Row 3: Logistics details (if dispatched) */}
                        {meta.isDispatched && (vehicle.truckNumber || (vehicle.driverName && vehicle.driverName !== "N/A")) && (
                          <div className="flex items-center gap-2.5 text-[10.5px] text-muted-foreground px-0.5 truncate">
                            {vehicle.truckNumber && (
                              <span className="truncate">
                                <span className="font-medium">Truck:</span>{" "}
                                <span className="font-semibold text-foreground font-mono">{vehicle.truckNumber}</span>
                              </span>
                            )}
                            {vehicle.driverName && vehicle.driverName !== "N/A" && (
                              <span className="truncate">
                                • <span className="font-medium">Driver:</span>{" "}
                                <span className="font-semibold text-foreground">{vehicle.driverName}</span>
                              </span>
                            )}
                          </div>
                        )}

                        {/* Row 4: Footer with Chassis & Full Details Link */}
                        <div className="flex items-center justify-between text-[10.5px] text-muted-foreground pt-1.5 border-t border-border/40">
                          <span className="truncate max-w-[200px] font-mono">
                            Chassis: <span className="font-semibold text-foreground">{vehicle.chassisNumber || "N/A"}</span>
                          </span>
                          <Link
                            href={`/vehicle/${vehicle.id}`}
                            onClick={() => onOpenChange(false)}
                            className="text-primary hover:underline font-semibold flex items-center gap-1 active:scale-95 transition-transform shrink-0"
                          >
                            <span>Full Details</span>
                            <ArrowRight size={11} className="stroke-[2.5]" />
                          </Link>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer Summary */}
            <div className="px-5 py-3 border-t border-border bg-card flex items-center justify-between">
              <span className="text-[11px] font-medium text-muted-foreground">
                Total Factory Vehicles: <span className="font-bold text-foreground">{vehicles.length}</span>
              </span>
              <button
                type="button"
                onClick={() => onOpenChange(false)}
                className="px-4 py-1.5 rounded-full bg-muted hover:bg-muted/80 text-foreground text-xs font-bold active:scale-95 transition-all"
              >
                Done
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
