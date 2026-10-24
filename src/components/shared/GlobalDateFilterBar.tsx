"use client";

import React, { useMemo, useState } from "react";
import {
  Calendar,
  RotateCcw,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Check,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

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
  className,
}: GlobalDateFilterBarProps) {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState<number>(() => {
    if (customMonth) {
      const y = parseInt(customMonth.split("-")[0], 10);
      if (!isNaN(y)) return y;
    }
    return currentYear;
  });

  // Primary top-level presets (fast 1-click access)
  const primaryPresets = [
    { label: "All Time", value: "All" },
    { label: "Today", value: "Today" },
    { label: "This Month", value: "This Month" },
  ];

  // Secondary presets housed neatly inside the dropdown menu
  const dropdownPresets = [
    { label: "Last Month", value: "Last Month" },
    { label: "This Quarter", value: "This Quarter" },
    { label: "Last Quarter", value: "Last Quarter" },
    { label: "This Year", value: "This Year" },
  ];

  // Active label format for the badge
  const activeLabel = useMemo(() => {
    const now = new Date();
    if (dateFilter === "All") return "All Time (Complete History)";
    if (dateFilter === "Today")
      return `Today (${now.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })})`;

    if (dateFilter === "This Month") {
      return `This Month (${now.toLocaleDateString("en-IN", {
        month: "long",
        year: "numeric",
      })})`;
    }

    if (dateFilter === "Last Month") {
      const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return `Last Month (${lm.toLocaleDateString("en-IN", {
        month: "long",
        year: "numeric",
      })})`;
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
        return `Month: ${d.toLocaleDateString("en-IN", {
          month: "long",
          year: "numeric",
        })}`;
      }
    }

    if (dateFilter === "Custom" && (customStartDate || customEndDate)) {
      const start = customStartDate
        ? new Date(customStartDate).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
        : "Start";
      const end = customEndDate
        ? new Date(customEndDate).toLocaleDateString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
        : "End";
      return `Custom: ${start} → ${end}`;
    }

    return "Filtered View";
  }, [dateFilter, customMonth, customStartDate, customEndDate]);

  const isFiltered = dateFilter !== "All";

  // Check if active filter is inside the dropdown group
  const isDropdownActive = [
    "Last Month",
    "This Quarter",
    "Last Quarter",
    "This Year",
    "Month",
    "Custom",
  ].includes(dateFilter);

  // Dynamic dropdown trigger button label
  const dropdownTriggerLabel = useMemo(() => {
    if (dateFilter === "Last Month") return "Last Month";
    if (dateFilter === "This Quarter") return "This Quarter";
    if (dateFilter === "Last Quarter") return "Last Quarter";
    if (dateFilter === "This Year") return "This Year";
    if (dateFilter === "Month") {
      if (customMonth) {
        const [y, m] = customMonth.split("-");
        const monthObj = MONTH_NAMES.find((mn) => mn.val === m);
        return monthObj ? `${monthObj.short} ${y}` : "Month...";
      }
      return "Month...";
    }
    if (dateFilter === "Custom") return "Custom Range";
    return "More Periods";
  }, [dateFilter, customMonth]);

  const handleSelectPreset = (val: string) => {
    setDateFilter(val);
    if (val === "Month" && !customMonth) {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      if (setCustomMonth) setCustomMonth(`${yyyy}-${mm}`);
    }
    if (val === "Custom" && (!customStartDate || !customEndDate)) {
      const now = new Date();
      const yyyy = now.getFullYear();
      const mm = String(now.getMonth() + 1).padStart(2, "0");
      const dd = String(now.getDate()).padStart(2, "0");
      if (setCustomStartDate) setCustomStartDate(`${yyyy}-${mm}-01`);
      if (setCustomEndDate) setCustomEndDate(`${yyyy}-${mm}-${dd}`);
    }
  };

  const handleReset = () => {
    setDateFilter("All");
    if (setCustomMonth) setCustomMonth("");
    if (setCustomStartDate) setCustomStartDate("");
    if (setCustomEndDate) setCustomEndDate("");
  };

  const handleSelectMonthName = (monthVal: string) => {
    const yearMonth = `${selectedYear}-${monthVal}`;
    if (setCustomMonth) setCustomMonth(yearMonth);
    setDateFilter("Month");
  };

  const applyQuickRange = (days: number) => {
    const now = new Date();
    const past = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
    const formatDate = (d: Date) => {
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, "0");
      const dd = String(d.getDate()).padStart(2, "0");
      return `${yyyy}-${mm}-${dd}`;
    };
    if (setCustomStartDate) setCustomStartDate(formatDate(past));
    if (setCustomEndDate) setCustomEndDate(formatDate(now));
    setDateFilter("Custom");
  };

  return (
    <div
      className={cn(
        "bg-card border border-border/80 rounded-2xl p-3 sm:p-3.5 shadow-2xs transition-all",
        className
      )}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        {/* Left: Icon, Title & Active Filter Badge */}
        <div className="flex items-center justify-between sm:justify-start gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="h-8 w-8 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
              <CalendarDays size={16} />
            </div>
            <div className="min-w-0">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground block leading-tight">
                Page Date Filter
              </span>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-primary opacity-60"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-primary"></span>
                </span>
                <span className="text-xs font-semibold text-foreground truncate max-w-[200px] sm:max-w-xs md:max-w-md">
                  {activeLabel}
                </span>
              </div>
            </div>
          </div>

          {/* Mobile Reset Action */}
          {isFiltered && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="sm:hidden h-7 px-2 text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 rounded-lg shrink-0"
            >
              <RotateCcw size={12} />
              <span>Reset</span>
            </Button>
          )}
        </div>

        {/* Right: Compact Presets + More Dropdown + Desktop Reset */}
        <div className="flex items-center gap-1.5 flex-nowrap overflow-x-auto no-scrollbar py-0.5 shrink-0">
          {primaryPresets.map((preset) => {
            const isActive = dateFilter === preset.value;
            return (
              <button
                key={preset.value}
                type="button"
                onClick={() => handleSelectPreset(preset.value)}
                className={cn(
                  "px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-medium transition-all shrink-0 border cursor-pointer whitespace-nowrap",
                  isActive
                    ? "bg-primary text-primary-foreground border-primary shadow-xs font-semibold"
                    : "bg-background text-foreground hover:bg-muted border-border hover:border-muted-foreground/30"
                )}
              >
                {preset.label}
              </button>
            );
          })}

          {/* More Periods Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(
                  "px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-medium transition-all flex items-center gap-1 shrink-0 border cursor-pointer whitespace-nowrap",
                  isDropdownActive
                    ? "bg-primary text-primary-foreground border-primary shadow-xs font-semibold"
                    : "bg-background text-foreground hover:bg-muted border-border hover:border-muted-foreground/30"
                )}
              >
                <span>{dropdownTriggerLabel}</span>
                <ChevronDown size={13} className="opacity-70 shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-52 p-1.5 rounded-xl shadow-lg border border-border bg-card z-50"
            >
              <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 py-1">
                Standard Periods
              </DropdownMenuLabel>
              {dropdownPresets.map((preset) => {
                const isSelected = dateFilter === preset.value;
                return (
                  <DropdownMenuItem
                    key={preset.value}
                    onSelect={() => handleSelectPreset(preset.value)}
                    className={cn(
                      "flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg cursor-pointer transition-colors",
                      isSelected
                        ? "bg-primary/10 text-primary font-semibold"
                        : "hover:bg-muted"
                    )}
                  >
                    <span>{preset.label}</span>
                    {isSelected && <Check size={14} className="text-primary" />}
                  </DropdownMenuItem>
                );
              })}
              <DropdownMenuSeparator className="my-1" />
              <DropdownMenuLabel className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-2 py-1">
                Custom Pickers
              </DropdownMenuLabel>
              <DropdownMenuItem
                onSelect={() => handleSelectPreset("Month")}
                className={cn(
                  "flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg cursor-pointer transition-colors",
                  dateFilter === "Month"
                    ? "bg-primary/10 text-primary font-semibold"
                    : "hover:bg-muted"
                )}
              >
                <div className="flex items-center gap-2">
                  <Calendar size={13} className="text-primary" />
                  <span>Calendar Month</span>
                </div>
                {dateFilter === "Month" && (
                  <Check size={14} className="text-primary" />
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => handleSelectPreset("Custom")}
                className={cn(
                  "flex items-center justify-between px-2.5 py-1.5 text-xs rounded-lg cursor-pointer transition-colors",
                  dateFilter === "Custom"
                    ? "bg-primary/10 text-primary font-semibold"
                    : "hover:bg-muted"
                )}
              >
                <div className="flex items-center gap-2">
                  <CalendarDays size={13} className="text-primary" />
                  <span>Custom Date Range</span>
                </div>
                {dateFilter === "Custom" && (
                  <Check size={14} className="text-primary" />
                )}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Desktop Reset Action */}
          {isFiltered && (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleReset}
              className="hidden sm:flex h-8 px-2.5 text-xs text-muted-foreground hover:text-destructive items-center gap-1 rounded-xl shrink-0"
            >
              <RotateCcw size={13} />
              <span>Reset</span>
            </Button>
          )}
        </div>
      </div>

      {/* Expanded Interactive Subpanels for Calendar Month or Custom Date Range */}
      {(dateFilter === "Month" || dateFilter === "Custom") && (
        <div className="mt-3 pt-3 border-t border-border flex flex-col gap-3 bg-muted/30 p-3 sm:p-3.5 rounded-xl animate-in fade-in slide-in-from-top-1 duration-200">
          {/* Calendar Month Picker */}
          {dateFilter === "Month" && setCustomMonth && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <Calendar size={14} className="text-primary" />
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Select Month & Year:
                  </span>
                </div>

                {/* Year Navigation */}
                <div className="flex items-center gap-1.5">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 p-0 rounded-lg"
                    onClick={() => setSelectedYear((y) => y - 1)}
                  >
                    <ChevronLeft size={14} />
                  </Button>
                  <span className="text-xs font-bold px-2.5 py-1 bg-background border border-border rounded-lg min-w-16 text-center shadow-2xs">
                    {selectedYear}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 w-7 p-0 rounded-lg"
                    onClick={() => setSelectedYear((y) => y + 1)}
                  >
                    <ChevronRight size={14} />
                  </Button>
                </div>
              </div>

              {/* Month Buttons Grid (Jan - Dec) */}
              <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-12 gap-1.5">
                {MONTH_NAMES.map((m) => {
                  const isSelected =
                    dateFilter === "Month" &&
                    customMonth === `${selectedYear}-${m.val}`;
                  return (
                    <button
                      key={m.val}
                      type="button"
                      onClick={() => handleSelectMonthName(m.val)}
                      className={cn(
                        "py-1.5 px-2 text-xs font-medium rounded-lg border transition-all cursor-pointer text-center",
                        isSelected
                          ? "bg-primary text-primary-foreground border-primary shadow-xs ring-2 ring-primary/30 font-bold scale-102"
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

          {/* Custom Date Range Picker */}
          {dateFilter === "Custom" && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <CalendarDays size={14} className="text-primary" />
                  <span className="text-xs font-bold text-foreground uppercase tracking-wider">
                    Custom Date Range:
                  </span>
                </div>

                {/* Quick Range Shortcuts */}
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => applyQuickRange(7)}
                    className="px-2 py-1 text-[11px] font-medium rounded-md border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                  >
                    Last 7 Days
                  </button>
                  <button
                    type="button"
                    onClick={() => applyQuickRange(30)}
                    className="px-2 py-1 text-[11px] font-medium rounded-md border border-border bg-background hover:bg-muted text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
                  >
                    Last 30 Days
                  </button>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3 sm:gap-4">
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                    From:
                  </label>
                  <input
                    type="date"
                    value={customStartDate}
                    onChange={(e) =>
                      setCustomStartDate && setCustomStartDate(e.target.value)
                    }
                    className="h-8 sm:h-9 px-2.5 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 font-medium text-foreground"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                    To:
                  </label>
                  <input
                    type="date"
                    value={customEndDate}
                    onChange={(e) =>
                      setCustomEndDate && setCustomEndDate(e.target.value)
                    }
                    className="h-8 sm:h-9 px-2.5 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 font-medium text-foreground"
                  />
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
