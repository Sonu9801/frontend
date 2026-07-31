"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export interface PaginationState {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

interface PaginationProps {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  isLoading?: boolean;
  pageSizeOptions?: number[];
  className?: string;
}

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export function Pagination({
  page,
  pageSize,
  total,
  totalPages,
  onPageChange,
  onPageSizeChange,
  isLoading = false,
  pageSizeOptions = PAGE_SIZE_OPTIONS,
  className,
}: PaginationProps) {
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  const isPrevDisabled = page <= 1 || isLoading;
  const isNextDisabled = page >= totalPages || isLoading;

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-border bg-card/50",
        className
      )}
    >
      {/* Left: Record count info */}
      <div className="flex items-center gap-3 text-xs text-muted-foreground">
        <span className="font-medium text-foreground">
          {isLoading ? (
            <span className="inline-block w-28 h-3.5 rounded bg-muted animate-pulse" />
          ) : (
            <>
              Showing{" "}
              <span className="text-foreground font-semibold">{from}</span>
              {"–"}
              <span className="text-foreground font-semibold">{to}</span> of{" "}
              <span className="text-foreground font-semibold">{total}</span>{" "}
              records
            </>
          )}
        </span>
        <span className="hidden sm:inline text-muted-foreground/50">|</span>
        <span className="hidden sm:inline">
          {isLoading ? (
            <span className="inline-block w-16 h-3.5 rounded bg-muted animate-pulse" />
          ) : (
            <>
              Page <span className="font-semibold text-foreground">{page}</span>{" "}
              of{" "}
              <span className="font-semibold text-foreground">{totalPages || 1}</span>
            </>
          )}
        </span>
      </div>

      {/* Right: Controls */}
      <div className="flex items-center gap-2.5">
        {/* Page size selector */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-muted-foreground hidden sm:inline">Rows:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              onPageSizeChange(Number(e.target.value));
            }}
            disabled={isLoading}
            className={cn(
              "text-xs border border-border rounded-md px-2 py-1.5 bg-background text-foreground",
              "focus:outline-none focus:ring-1 focus:ring-primary/40 cursor-pointer",
              "disabled:opacity-50 disabled:cursor-not-allowed transition-colors",
              "hover:border-primary/40"
            )}
          >
            {pageSizeOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        {/* Navigation buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => onPageChange(page - 1)}
            disabled={isPrevDisabled}
            aria-label="Previous page"
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center border border-border",
              "transition-all duration-150",
              isPrevDisabled
                ? "opacity-40 cursor-not-allowed bg-muted text-muted-foreground"
                : "hover:bg-primary hover:text-primary-foreground hover:border-primary cursor-pointer bg-background text-foreground active:scale-95"
            )}
          >
            <ChevronLeft size={15} strokeWidth={2.2} />
          </button>

          {/* Page number pills */}
          <div className="hidden sm:flex items-center gap-1">
            {getPageNumbers(page, totalPages).map((p, i) =>
              p === "..." ? (
                <span key={`ellipsis-${i}`} className="w-7 text-center text-xs text-muted-foreground">
                  {"…"}
                </span>
              ) : (
                <button
                  key={p}
                  onClick={() => onPageChange(p as number)}
                  disabled={isLoading}
                  className={cn(
                    "w-7 h-7 rounded-full text-xs font-medium transition-all duration-150",
                    p === page
                      ? "bg-primary text-primary-foreground shadow-sm"
                      : "hover:bg-muted text-foreground cursor-pointer"
                  )}
                >
                  {p}
                </button>
              )
            )}
          </div>

          <button
            onClick={() => onPageChange(page + 1)}
            disabled={isNextDisabled}
            aria-label="Next page"
            className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center border border-border",
              "transition-all duration-150",
              isNextDisabled
                ? "opacity-40 cursor-not-allowed bg-muted text-muted-foreground"
                : "hover:bg-primary hover:text-primary-foreground hover:border-primary cursor-pointer bg-background text-foreground active:scale-95"
            )}
          >
            <ChevronRight size={15} strokeWidth={2.2} />
          </button>
        </div>
      </div>
    </div>
  );
}

/** Generate page number array with ellipsis for large page counts */
function getPageNumbers(current: number, total: number): (number | "...")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  if (current <= 4) return [1, 2, 3, 4, 5, "...", total];
  if (current >= total - 3) return [1, "...", total - 4, total - 3, total - 2, total - 1, total];
  return [1, "...", current - 1, current, current + 1, "...", total];
}
