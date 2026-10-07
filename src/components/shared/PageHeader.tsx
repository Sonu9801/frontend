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
        "flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-2",
        className,
      )}
    >
      <div className="flex flex-col gap-1 min-w-0">
        {backHref && (
          <Link
            href={backHref}
            className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors mb-1 w-fit"
          >
            <ChevronLeft size={14} />
            <span>{backLabel || "Back"}</span>
          </Link>
        )}
        <div className="flex items-center gap-3 flex-wrap">
          {icon && (
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary flex-shrink-0">
              {icon}
            </div>
          )}
          <h1 className="text-xl sm:text-2xl font-bold font-display text-foreground tracking-tight">
            {title}
          </h1>
          {badge && <div className="flex-shrink-0">{badge}</div>}
        </div>
        {desc && (
          <div className="text-xs sm:text-sm text-muted-foreground leading-relaxed mt-0.5 max-w-3xl">
            {desc}
          </div>
        )}
      </div>

      {actions && (
        <div className="flex items-center gap-2.5 flex-wrap flex-shrink-0 self-start md:self-center">
          {actions}
        </div>
      )}
    </div>
  );
}
