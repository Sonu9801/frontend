"use client";

import React, { useMemo } from "react";
import { Calendar, Filter, X, RotateCcw, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface GlobalDateFilterBarProps {
  dateFilter: string; // "All" | "Today" | "This Month" | "Last Month" | "This Quarter" | "This Year" | "Month" | "Custom"
  setDateFilter: (val: string) => void;
  customMonth?: string; // "YYYY-MM"
  setCustomMonth?: (val: string) => void;
  customStartDate?: string; // "YYYY-MM-DD"
  setCustomStartDate?: (val: string) => void;
  customEndDate?: string; // "YYYY-MM-DD"
  setCustomEndDate?: (val: string) => void;
  className?: string;
}

export function GlobalDateFilterBar({
  dateFilter,
  setDateFilter,
  customMonth = "",
  setCustomMonth,
  customStartDate = "",
  setCustomStartDate,
  customEndDate = "",
  setCustomEndDate,
  className
}: GlobalDateFilterBarProps) {

  // Preset pill definitions
  const presets = [
    { label: "All Time", value: "All" },
    { label: "Today", value: "Today" },
    { label: "This Month", value: "This Month" },
    { label: "Last Month", value: "Last Month" },
    { label: "This Quarter", value: "This Quarter" },
    { label: "This Year", value: "This Year" },
    { label: "Calendar Month", value: "Month" },
    { label: "Custom Range", value: "Custom" },
  ];

  // Active label format for display badge
  const activeLabel = useMemo(() => {
    const now = new Date();
    if (dateFilter === "All") return "All Time (Complete History)";
    if (dateFilter === "Today") return `Today (${now.toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' })})`;
    
    if (dateFilter === "This Month") {
      return `This Month (${now.toLocaleDateString("en-IN", { month: 'long', year: 'numeric' })})`;
    }
    
    if (dateFilter === "Last Month") {
      const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return `Last Month (${lm.toLocaleDateString("en-IN", { month: 'long', year: 'numeric' })})`;
    }

    if (dateFilter === "This Quarter") {
      const q = Math.floor(now.getMonth() / 3) + 1;
      return `Q${q} ${now.getFullYear()}`;
    }

    if (dateFilter === "This Year") {
      return `Year ${now.getFullYear()}`;
    }

    if (dateFilter === "Month" && customMonth) {
      const [y, m] = customMonth.split("-");
      if (y && m) {
        const d = new Date(parseInt(y), parseInt(m) - 1, 1);
        return `Month: ${d.toLocaleDateString("en-IN", { month: 'long', year: 'numeric' })}`;
      }
    }

    if (dateFilter === "Custom" && (customStartDate || customEndDate)) {
      const start = customStartDate ? new Date(customStartDate).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' }) : "Start";
      const end = customEndDate ? new Date(customEndDate).toLocaleDateString("en-IN", { day: '2-digit', month: 'short', year: 'numeric' }) : "End";
      return `Custom: ${start} → ${end}`;
    }

    return "Filtered View";
  }, [dateFilter, customMonth, customStartDate, customEndDate]);

  const isFiltered = dateFilter !== "All";

  const handleReset = () => {
    setDateFilter("All");
    if (setCustomMonth) setCustomMonth("");
    if (setCustomStartDate) setCustomStartDate("");
    if (setCustomEndDate) setCustomEndDate("");
  };

  return (
    <div className={cn("bg-card border border-border rounded-2xl p-3 shadow-subtle mb-6 transition-all", className)}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left Title & Icon */}
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center font-medium">
            <CalendarDays size={18} />
          </div>
          <div>
            <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground block">
              Page Date Filter
            </span>
            <span className="text-xs font-semibold text-primary">
              {activeLabel}
            </span>
          </div>
        </div>

        {/* Center: Quick Presets Pills */}
        <div className="flex items-center gap-1.5 flex-wrap">
          {presets.map((preset) => {
            const isActive = dateFilter === preset.value;
            return (
              <button
                key={preset.value}
                type="button"
                onClick={() => {
                  setDateFilter(preset.value);
                  if (preset.value === "Month" && !customMonth) {
                    const now = new Date();
                    const yyyy = now.getFullYear();
                    const mm = String(now.getMonth() + 1).padStart(2, "0");
                    if (setCustomMonth) setCustomMonth(`${yyyy}-${mm}`);
                  }
                  if (preset.value === "Custom" && (!customStartDate || !customEndDate)) {
                    const now = new Date();
                    const yyyy = now.getFullYear();
                    const mm = String(now.getMonth() + 1).padStart(2, "0");
                    const dd = String(now.getDate()).padStart(2, "0");
                    if (setCustomStartDate) setCustomStartDate(`${yyyy}-${mm}-01`);
                    if (setCustomEndDate) setCustomEndDate(`${yyyy}-${mm}-${dd}`);
                  }
                }}
                className={cn(
                  "px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1 border cursor-pointer",
                  isActive
                    ? "bg-primary text-primary-foreground border-primary shadow-xs font-semibold"
                    : "bg-background text-foreground hover:bg-muted border-border hover:border-muted-foreground/30"
                )}
              >
                {preset.label}
              </button>
            );
          })}
        </div>

        {/* Right Reset Action */}
        {isFiltered && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="h-8 px-2.5 text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 rounded-xl"
          >
            <RotateCcw size={14} />
            <span>Reset</span>
          </Button>
        )}
      </div>

      {/* Conditional Inputs: Calendar Month Picker or Custom Date Range */}
      {(dateFilter === "Month" || dateFilter === "Custom") && (
        <div className="mt-3 pt-3 border-t border-border flex flex-wrap items-center gap-4 bg-muted/30 p-2.5 rounded-xl animate-in fade-in duration-200">
          {dateFilter === "Month" && setCustomMonth && (
            <div className="flex items-center gap-2">
              <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <Calendar size={14} className="text-primary" />
                Select Month:
              </label>
              <input
                type="month"
                value={customMonth}
                onChange={(e) => setCustomMonth(e.target.value)}
                className="h-9 px-3 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 font-medium text-foreground"
              />
            </div>
          )}

          {dateFilter === "Custom" && (
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-foreground">From:</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate && setCustomStartDate(e.target.value)}
                  className="h-9 px-3 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 font-medium text-foreground"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-foreground">To:</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate && setCustomEndDate(e.target.value)}
                  className="h-9 px-3 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 font-medium text-foreground"
                />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
