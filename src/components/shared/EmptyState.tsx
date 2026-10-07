"use client";

import React from "react";
import { Inbox } from "lucide-react";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  icon?: React.ReactNode | React.ElementType;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode | { label: string; onClick: () => void };
  className?: string;
  compact?: boolean;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
  compact = false,
}: EmptyStateProps) {
  const renderIcon = () => {
    if (!icon) return <Inbox size={22} className="opacity-70" />;
    if (React.isValidElement(icon)) return icon;
    if (typeof icon === "function" || typeof icon === "object") {
      const IconComp = icon as React.ElementType;
      return <IconComp size={22} className="opacity-70" />;
    }
    return icon;
  };

  const renderAction = () => {
    if (!action) return null;
    if (React.isValidElement(action)) return action;
    if (typeof action === "object" && "label" in action && "onClick" in action) {
      return (
        <button
          onClick={action.onClick}
          className="mt-4 px-3.5 py-1.5 bg-primary text-primary-foreground text-xs font-semibold rounded-lg hover:bg-primary/90 transition-colors shadow-xs"
        >
          {action.label}
        </button>
      );
    }
    return null;
  };

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center rounded-xl border border-dashed border-border bg-card/50",
        compact ? "py-8 px-4" : "py-12 px-6",
        className,
      )}
    >
      <div className="w-12 h-12 rounded-2xl bg-muted/60 border border-border flex items-center justify-center text-muted-foreground mb-3 shadow-xs">
        {renderIcon()}
      </div>
      <h3 className="text-sm font-bold text-foreground tracking-tight">
        {title}
      </h3>
      {description && (
        <p className="text-xs text-muted-foreground max-w-sm mt-1 leading-relaxed">
          {description}
        </p>
      )}
      {renderAction()}
    </div>
  );
}
