import { cn } from "@/lib/utils";
import type { Stage } from "@/types";

const stageConfig: Record<string, { label: string; className: string }> = {
  received: { 
    label: "Received", 
    className: "bg-muted text-muted-foreground border-border" 
  },
  supervisor_verification: {
    label: "Supervisor Verify",
    className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
  incoming_verification: {
    label: "Verify (In)",
    className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
  fabrication: {
    label: "Fabrication",
    className: "bg-primary/10 text-primary border-primary/20",
  },
  paint: {
    label: "Paint",
    className: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
  },
  quality: {
    label: "Quality",
    className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  },
  quality_check: {
    label: "Quality Check",
    className: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  },
  rtd: {
    label: "RTD",
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
  readytodispatch: {
    label: "Ready to Dispatch",
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
  dispatch: {
    label: "Dispatched",
    className: "bg-emerald-600/15 text-emerald-700 dark:text-emerald-300 font-semibold border-emerald-600/30",
  },
  dispatched: {
    label: "Dispatched",
    className: "bg-emerald-600/15 text-emerald-700 dark:text-emerald-300 font-semibold border-emerald-600/30",
  },
  delivered: {
    label: "Delivered",
    className: "bg-emerald-700/20 text-emerald-800 dark:text-emerald-200 font-bold border-emerald-700/30",
  },
  oem: {
    label: "OEM Submitted",
    className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
  rejected: {
    label: "Rejected",
    className: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
  },
  // Common states
  active: {
    label: "Active",
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
  inactive: {
    label: "Inactive",
    className: "bg-muted text-muted-foreground border-border",
  },
  offline: {
    label: "Offline",
    className: "bg-muted text-muted-foreground border-border",
  },
  pending: {
    label: "Pending",
    className: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  },
  approved: {
    label: "Approved",
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
  paid: {
    label: "Paid",
    className: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
  },
  overdue: {
    label: "Overdue",
    className: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
  },
};

interface StatusBadgeProps {
  stage?: Stage | string;
  status?: string;
  label?: string;
  variant?: "pill" | "badge";
  className?: string;
}

export function StatusBadge({ stage, status, label, className }: StatusBadgeProps) {
  const val = (stage || status || "").toString().toLowerCase().trim();
  const config = stageConfig[val] || {
    label: label || stage || status || "Unknown",
    className: "bg-muted text-muted-foreground border-border",
  };
  
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border tracking-tight select-none",
        config.className,
        className,
      )}
    >
      {label || config.label}
    </span>
  );
}
