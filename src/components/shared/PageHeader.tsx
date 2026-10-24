"use client";

import React from "react";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: React.ReactNode;
  subtitle?: React.ReactNode;
  icon?: React.ReactNode;
  badge?: React.ReactNode;
  actions?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  className?: string;
}

export function PageHeader({
  title,
  description,
  subtitle,
  icon,
  badge,
  actions,
  backHref,
  backLabel,
  className,
}: PageHeaderProps) {
  const desc = subtitle ?? description;
  return (
    <div
      className={cn(
        "flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4 mb-4 md:mb-6 pb-1 md:pb-2",
        className,
      )}
    >
      <div className="flex flex-col gap-1 min-w-0">
        {backHref && (
          <Link
            href={backHref}
            className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors mb-0.5 w-fit active:scale-95"
          >
            <ChevronLeft size={14} />
            <span>{backLabel || "Back"}</span>
          </Link>
        )}
        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
          {icon && (
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary flex-shrink-0 shadow-2xs">
              {icon}
            </div>
          )}
          <h1 className="text-lg sm:text-2xl font-bold font-display text-foreground tracking-tight">
            {title}
          </h1>
          {badge && <div className="flex-shrink-0">{badge}</div>}
        </div>
        {desc && (
          <div className="text-[11px] sm:text-xs md:text-sm text-muted-foreground leading-relaxed mt-0.5 max-w-3xl line-clamp-2 md:line-clamp-none">
            {desc}
          </div>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-2 flex-nowrap sm:flex-wrap overflow-x-auto no-scrollbar flex-shrink-0 max-w-full sm:w-auto mt-1 md:mt-0 pb-0.5">
          {actions}
        </div>
      )}
    </div>
  );
}
