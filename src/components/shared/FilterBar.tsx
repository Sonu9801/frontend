"use client";

import React from "react";
import { Search, RotateCcw, Download, Filter } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface FilterOption {
  value: string;
  label: string;
}

export interface FilterSelectProps {
  id?: string;
  label?: string;
  value: string;
  onChange: (val: string) => void;
  options: (string | FilterOption)[];
  placeholder?: string;
  className?: string;
}

export function FilterSelect({
  id,
  label,
  value,
  onChange,
  options,
  placeholder,
  className,
}: FilterSelectProps) {
  return (
    <div className="flex flex-col gap-1 min-w-[130px] flex-1 sm:flex-none">
      {label && (
        <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-0.5">
          {label}
        </span>
      )}
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-9 text-xs bg-background border border-border rounded-lg px-2.5 text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors cursor-pointer",
          className,
        )}
      >
        {placeholder && <option value="All">{placeholder}</option>}
        {options.map((opt) => {
          const optValue = typeof opt === "string" ? opt : opt.value;
          const optLabel = typeof opt === "string" ? opt : opt.label;
          return (
            <option key={optValue} value={optValue}>
              {optLabel}
            </option>
          );
        })}
      </select>
    </div>
  );
}

interface FilterBarProps {
  search?: string;
  onSearchChange?: (val: string) => void;
  searchPlaceholder?: string;
  children?: React.ReactNode;
  onReset?: () => void;
  onExport?: () => void;
  exportLabel?: string;
  className?: string;
}

export function FilterBar({
  search,
  onSearchChange,
  searchPlaceholder = "Search records...",
  children,
  onReset,
  onExport,
  exportLabel = "Export",
  className,
}: FilterBarProps) {
  return (
    <div
      className={cn(
        "bg-card border border-border rounded-xl p-3 sm:p-4 shadow-xs flex flex-wrap items-center gap-3",
        className,
      )}
    >
      {onSearchChange && (
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search
            size={14}
            className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={search || ""}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder={searchPlaceholder}
            className="pl-8 h-9 text-xs bg-background border-border focus:ring-2 focus:ring-primary/30"
          />
        </div>
      )}

      {children && (
        <div className="flex flex-wrap items-center gap-2.5 flex-1 min-w-0">
          {children}
        </div>
      )}

      <div className="flex items-center gap-2 ml-auto">
        {onReset && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onReset}
            className="h-9 text-xs gap-1.5 text-muted-foreground hover:text-foreground"
          >
            <RotateCcw size={13} />
            <span>Reset</span>
          </Button>
        )}

        {onExport && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onExport}
            className="h-9 text-xs gap-1.5"
          >
            <Download size={13} />
            <span>{exportLabel}</span>
          </Button>
        )}
      </div>
    </div>
  );
}
