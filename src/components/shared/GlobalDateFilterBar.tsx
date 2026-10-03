"use client";

import React, { useMemo, useState } from "react";
import { Calendar, Filter, X, RotateCcw, CalendarDays, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface GlobalDateFilterBarProps {
  dateFilter: string; // "All" | "Today" | "This Month" | "Last Month" | "This Quarter" | "Last Quarter" | "This Year" | "Month" | "Custom"
  setDateFilter: (val: string) => void;
  customMonth?: string; // "YYYY-MM"
  setCustomMonth?: (val: string) => void;
  customStartDate?: string; // "YYYY-MM-DD"
  setCustomStartDate?: (val: string) => void;
  customEndDate?: string; // "YYYY-MM-DD"
  setCustomEndDate?: (val: string) => void;
  className?: string;
}

const MONTH_NAMES = [
  { short: "Jan", full: "January", val: "01" },
  { short: "Feb", full: "February", val: "02" },
  { short: "Mar", full: "March", val: "03" },
  { short: "Apr", full: "April", val: "04" },
  { short: "May", full: "May", val: "05" },
  { short: "Jun", full: "June", val: "06" },
  { short: "Jul", full: "July", val: "07" },
  { short: "Aug", full: "August", val: "08" },
  { short: "Sep", full: "September", val: "09" },
  { short: "Oct", full: "October", val: "10" },
  { short: "Nov", full: "November", val: "11" },
  { short: "Dec", full: "December", val: "12" },
];

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
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(() => {
    if (customMonth) {
      const y = parseInt(customMonth.split("-")[0], 10);
      if (!isNaN(y)) return y;
    }
    return currentYear;
  });

  // Preset pill definitions
  const presets = [
    { label: "All Time", value: "All" },
    { label: "Today", value: "Today" },
    { label: "This Month", value: "This Month" },
    { label: "Last Month", value: "Last Month" },
    { label: "This Quarter", value: "This Quarter" },
    { label: "Last Quarter", value: "Last Quarter" },
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
      return `This Quarter (Q${q} ${now.getFullYear()})`;
    }

    if (dateFilter === "Last Quarter") {
      const currentQ = Math.floor(now.getMonth() / 3);
      const lastQ = currentQ === 0 ? 4 : currentQ;
      const lastQYear = currentQ === 0 ? now.getFullYear() - 1 : now.getFullYear();
      return `Last Quarter (Q${lastQ} ${lastQYear})`;
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
      return `Custom Range: ${start} → ${end}`;
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

  const activeMonthVal = useMemo(() => {
    if (customMonth && customMonth.includes("-")) {
      return customMonth.split("-")[1];
    }
    return "";
  }, [customMonth]);

  const handleSelectMonthName = (monthVal: string) => {
    const yearMonth = `${selectedYear}-${monthVal}`;
    if (setCustomMonth) setCustomMonth(yearMonth);
    setDateFilter("Month");
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

      {/* Month Names Selector Grid or Custom Date Range Inputs */}
      {(dateFilter === "Month" || dateFilter === "Custom") && (
        <div className="mt-3 pt-3 border-t border-border flex flex-col gap-3 bg-muted/30 p-3 rounded-xl animate-in fade-in duration-200">
          {dateFilter === "Month" && setCustomMonth && (
            <div className="space-y-2.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <label className="text-xs font-bold text-foreground flex items-center gap-1.5 uppercase tracking-wider">
                  <Calendar size={14} className="text-primary" />
                  Select Month & Year:
                </label>

                {/* Year Selector */}
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => setSelectedYear((y) => y - 1)}
                  >
                    <ChevronLeft size={14} />
                  </Button>
                  <span className="text-xs font-bold px-2 py-1 bg-background border border-border rounded-md min-w-16 text-center">
                    {selectedYear}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={() => setSelectedYear((y) => y + 1)}
                  >
                    <ChevronRight size={14} />
                  </Button>
                </div>
              </div>

              {/* Month Name Buttons Grid (Jan - Dec) */}
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-12 gap-1.5">
                {MONTH_NAMES.map((m) => {
                  const isSelected = dateFilter === "Month" && customMonth === `${selectedYear}-${m.val}`;
                  return (
                    <button
                      key={m.val}
                      type="button"
                      onClick={() => handleSelectMonthName(m.val)}
                      className={cn(
                        "py-1.5 px-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer text-center",
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary shadow-xs ring-2 ring-primary/30 font-bold scale-105"
                          : "bg-background text-foreground hover:bg-primary/10 hover:border-primary/40 border-border"
                      )}
                      title={`${m.full} ${selectedYear}`}
                    >
                      {m.short}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {dateFilter === "Custom" && (
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-foreground">From Date:</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate && setCustomStartDate(e.target.value)}
                  className="h-9 px-3 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 font-medium text-foreground"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-semibold text-foreground">To Date:</label>
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
