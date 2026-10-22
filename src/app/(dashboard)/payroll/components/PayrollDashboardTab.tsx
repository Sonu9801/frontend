"use client";

import React, { useEffect, useState, useMemo } from "react";
import { format } from "date-fns";
import {
  Users,
  Banknote,
  Clock,
  CalendarDays,
  IndianRupee,
  HandCoins,
  CheckCircle2,
  Factory,
  TrendingUp,
  AlertCircle,
  Download,
  RefreshCw,
  ArrowUpRight,
  ShieldCheck,
  Building2,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { KPICard } from "@/components/ui/KPICard";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Format currency to Indian Rupees without ugly decimals
export const formatINR = (val: number | string = 0) => {
  const num = Math.round(Number(val) || 0);
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(num);
};

const getDeptIcon = (dept: string) => {
  const d = (dept || "").toLowerCase();
  if (d.includes("fabricat")) return "⚡";
  if (d.includes("paint")) return "🎨";
  if (d.includes("assembl")) return "🛠️";
  if (d.includes("qual") || d.includes("qc")) return "🔍";
  if (d.includes("dispatch")) return "📦";
  if (d.includes("office") || d.includes("manage")) return "💼";
  return "🏭";
};

export default function PayrollDashboardTab() {
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), "yyyy-MM"));
  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchSummary = () => {
    setLoading(true);
    api.get(`/payroll/summary?month=${selectedMonth}`)
      .then((res) => {
        setSummary(res.data);
      })
      .catch((err) => {
        console.error(err);
        toast.error("Failed to load payroll summary");
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchSummary();
  }, [selectedMonth]);

  const handleExportPayrollSummary = () => {
    if (!summary) return;
    try {
      const headers = ["Metric", "Amount / Value", "Notes"];
      const rows = [
        ["Selected Billing Month", selectedMonth, "Payroll cycle"],
        ["Total Active Workforce", String(summary.totalEmployees || 0), "Registered on payroll"],
        ["Total Base Salary", formatINR(summary.baseSalaryCost || 0), "Base compensation"],
        ["Overtime Compensation (OT)", formatINR(summary.otCost || 0), "Extra shift hours"],
        ["Sunday / Holiday Pay", formatINR(summary.sundayCost || 0), "Weekend shift loading"],
        ["Total Monthly Labour Expense", formatINR(summary.monthlyPayrollCost || 0), "Gross liability"],
        ["Pending Draft Payroll", formatINR(summary.pendingPayroll || 0), "Awaiting approval"],
        ["Approved Payroll", formatINR(summary.approvedPayroll || 0), "Cleared for payment"],
        ["Disbursed / Paid Payroll", formatINR(summary.paidPayroll || 0), "Settled in bank accounts"],
      ];

      if (summary.departmentCosts) {
        Object.entries(summary.departmentCosts).forEach(([dept, cost]: any) => {
          rows.push([`Department: ${dept}`, formatINR(cost), "Departmental wage share"]);
        });
      }

      const csvContent =
        "data:text/csv;charset=utf-8," +
        [headers.join(","), ...rows.map((r) => r.map((c) => `"${c}"`).join(","))].join("\n");

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `payroll_summary_${selectedMonth}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Payroll summary exported successfully");
    } catch (err) {
      toast.error("Failed to export payroll summary");
    }
  };

  if (loading && (!summary || summary.detail)) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 bg-card border border-border rounded-xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-64 bg-card border border-border rounded-xl" />
          <div className="h-64 bg-card border border-border rounded-xl lg:col-span-2" />
        </div>
      </div>
    );
  }

  const totalCost = summary?.monthlyPayrollCost || 0;
  const depts = Object.entries(summary?.departmentCosts || {});

  // Primary 4 Executive KPI Cards
  const primaryKpis = [
    {
      title: "Monthly Labour Expense",
      value: formatINR(totalCost),
      description: "Total gross payroll liability",
      icon: <IndianRupee size={15} />,
      semantic: "primary" as const,
      badge: `${summary?.totalEmployees || 0} Staff`,
    },
    {
      title: "Overtime Compensation",
      value: formatINR(summary?.otCost || 0),
      description: `${totalCost > 0 ? Math.round(((summary?.otCost || 0) / totalCost) * 100) : 0}% of monthly payroll`,
      icon: <Clock size={15} />,
      semantic: "warning" as const,
      badge: "OT Premium",
    },
    {
      title: "Sunday & Holiday Pay",
      value: formatINR(summary?.sundayCost || 0),
      description: "Weekend & special shift loading",
      icon: <CalendarDays size={15} />,
      semantic: "warning" as const,
      badge: "Weekend Shifts",
    },
    {
      title: "Active Payroll Roster",
      value: `${summary?.totalEmployees || 0}`,
      description: "Registered wage earners",
      icon: <Users size={15} />,
      semantic: "success" as const,
      badge: "Plant Workforce",
    },
  ];

  return (
    <div className="space-y-6 pb-20">
      {/* 1. Header & Month Selector Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-card border border-border rounded-xl p-3 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold">
            <Banknote size={16} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground">Compensation Executive Summary</h2>
            <p className="text-[11px] text-muted-foreground">
              Month-to-date wage accruals, overtime expenditure & disbursement status
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-end sm:self-auto">
          {/* Month Dropdown */}
          <div className="flex items-center gap-1.5 bg-background border border-border rounded-lg px-2.5 h-8.5 shrink-0">
            <CalendarDays size={14} className="text-emerald-500 shrink-0" />
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="bg-transparent text-xs font-semibold text-foreground focus:outline-none cursor-pointer"
            >
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((offset) => {
                const now = new Date();
                const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
                const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
                const label = format(d, "MMMM yyyy");
                return (
                  <option key={val} value={val} className="bg-popover text-popover-foreground">
                    {label}
                  </option>
                );
              })}
            </select>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={fetchSummary}
            className="h-8.5 px-2.5 text-xs font-semibold gap-1.5"
            title="Refresh payroll figures"
          >
            <RefreshCw size={13} className={cn(loading && "animate-spin")} />
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportPayrollSummary}
            className="h-8.5 px-3 text-xs font-semibold gap-1.5 border-emerald-500/30 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10"
          >
            <Download size={13} /> Export CSV
          </Button>
        </div>
      </div>

      {/* 2. Top Executive 4-KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3.5">
        {primaryKpis.map((kpi, i) => (
          <KPICard
            key={i}
            title={kpi.title}
            value={kpi.value}
            description={kpi.description}
            icon={kpi.icon}
            semantic={kpi.semantic}
            className="p-3 sm:p-3.5"
          />
        ))}
      </div>

      {/* 3. Disbursement Workflow Pipeline */}
      <div className="bg-card border border-border rounded-xl p-4 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck size={16} className="text-primary" />
            <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
              Disbursement & Lifecycle Status
            </h3>
          </div>
          <span className="text-[11px] font-semibold text-muted-foreground">
            Target Payout: 07th of Next Month
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
          {/* Draft Status */}
          <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-amber-700 dark:text-amber-300 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                Draft / In Review
              </span>
              <Badge variant="outline" className="text-[10px] font-bold bg-background text-amber-700 dark:text-amber-300 border-amber-500/30">
                100% Volume
              </Badge>
            </div>
            <div>
              <p className="font-mono text-base font-bold text-foreground">{formatINR(summary?.pendingPayroll || totalCost)}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Automated biometric shift accrual</p>
            </div>
          </div>

          {/* Approved Status */}
          <div className="p-3 rounded-xl bg-blue-500/5 border border-border/80 flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-blue-500/40" />
                Supervisor Approved
              </span>
              <Badge variant="outline" className="text-[10px] font-bold bg-background text-muted-foreground border-border">
                {formatINR(summary?.approvedPayroll || 0)}
              </Badge>
            </div>
            <div>
              <p className="font-mono text-base font-bold text-muted-foreground">{formatINR(summary?.approvedPayroll || 0)}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Cleared for accounts release</p>
            </div>
          </div>

          {/* Paid Status */}
          <div className="p-3 rounded-xl bg-emerald-500/5 border border-border/80 flex flex-col justify-between space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500/40" />
                Bank Disbursed
              </span>
              <Badge variant="outline" className="text-[10px] font-bold bg-background text-muted-foreground border-border">
                {formatINR(summary?.paidPayroll || 0)}
              </Badge>
            </div>
            <div>
              <p className="font-mono text-base font-bold text-muted-foreground">{formatINR(summary?.paidPayroll || 0)}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">Direct bank transfer advice</p>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Detailed Breakdown: Department Costs + Owner Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Department Cost Summary */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-2xs space-y-4 lg:col-span-2">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <Factory size={16} className="text-primary" />
              <h3 className="text-sm font-bold text-foreground">Department Cost Allocation</h3>
            </div>
            <span className="text-xs font-bold text-primary font-mono">{formatINR(totalCost)} Total</span>
          </div>

          <div className="space-y-4">
            {depts.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">No departmental allocation available.</p>
            ) : null}

            {depts.map(([dept, cost]: any) => {
              const numCost = Number(cost) || 0;
              const pct = totalCost > 0 ? Math.round((numCost / totalCost) * 100) : 0;
              const icon = getDeptIcon(dept);

              return (
                <div key={dept} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-foreground flex items-center gap-1.5">
                      <span>{icon}</span>
                      <span>{dept}</span>
                    </span>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="text-[11px] text-muted-foreground">({pct}%)</span>
                      <span className="font-bold text-foreground">{formatINR(numCost)}</span>
                    </div>
                  </div>
                  <div className="h-2 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(pct, 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Cost Structure Summary Card */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-2xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 border-b border-border/60 pb-3 mb-4">
              <Banknote size={16} className="text-emerald-500" />
              <h3 className="text-sm font-bold text-foreground">Wage Structure Breakdown</h3>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="flex justify-between items-center py-1 border-b border-border/40">
                <span className="text-muted-foreground font-medium">Regular Base Wages</span>
                <span className="font-mono font-bold text-foreground">
                  {formatINR(summary?.baseSalaryCost || (totalCost - (summary?.otCost || 0) - (summary?.sundayCost || 0)))}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-border/40">
                <span className="text-muted-foreground font-medium">Overtime (OT) Pay</span>
                <span className="font-mono font-bold text-amber-600 dark:text-amber-400">
                  {formatINR(summary?.otCost || 0)}
                </span>
              </div>
              <div className="flex justify-between items-center py-1 border-b border-border/40">
                <span className="text-muted-foreground font-medium">Sunday / Festival Pay</span>
                <span className="font-mono font-bold text-purple-600 dark:text-purple-400">
                  {formatINR(summary?.sundayCost || 0)}
                </span>
              </div>
              <div className="pt-2 flex justify-between items-center">
                <span className="text-foreground font-bold">Gross Monthly Payout</span>
                <span className="font-mono font-extrabold text-base text-primary">
                  {formatINR(totalCost)}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-border/60 bg-muted/20 p-3 rounded-lg">
            <p className="text-[11px] text-muted-foreground leading-relaxed">
              💡 <span className="font-semibold text-foreground">Financial Tip:</span> Overtime contributes{" "}
              <span className="font-bold text-foreground">
                {totalCost > 0 ? Math.round(((summary?.otCost || 0) / totalCost) * 100) : 0}%
              </span>{" "}
              of labour cost this month. Check worker shifts to optimize plant margins.
            </p>
          </div>
        </div>
      </div>

      {/* 5. Owner Insights: Highest Earners & Top Overtime Contributors */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Highest Paid Employees */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 border-b border-border/60 pb-3">
            <TrendingUp size={16} className="text-emerald-500" />
            <h3 className="text-sm font-bold text-foreground">Top Wage Earners (This Month)</h3>
          </div>

          <div className="space-y-2.5">
            {summary?.highestPaid && summary.highestPaid.length > 0 ? (
              summary.highestPaid.slice(0, 4).map((emp: any, idx: number) => (
                <div
                  key={`hp-${emp.id || idx}`}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 border border-border/50 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-emerald-500/10 text-emerald-600 font-bold text-[10px] flex items-center justify-center border border-emerald-500/20">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="font-bold text-foreground">{emp.name}</p>
                      <p className="text-[10px] text-muted-foreground">{emp.department || "Production"}</p>
                    </div>
                  </div>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {formatINR(emp.total_salary)}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground py-2">No employee earnings data available.</p>
            )}
          </div>
        </div>

        {/* Highest OT Workers */}
        <div className="bg-card border border-border rounded-xl p-5 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 border-b border-border/60 pb-3">
            <Clock size={16} className="text-amber-500" />
            <h3 className="text-sm font-bold text-foreground">Top Overtime Contributors</h3>
          </div>

          <div className="space-y-2.5">
            {summary?.highestOT && summary.highestOT.length > 0 ? (
              summary.highestOT.slice(0, 4).map((emp: any, idx: number) => (
                <div
                  key={`hot-${emp.id || idx}`}
                  className="flex items-center justify-between p-2.5 rounded-lg bg-muted/30 border border-border/50 text-xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-amber-500/10 text-amber-600 font-bold text-[10px] flex items-center justify-center border border-amber-500/20">
                      {idx + 1}
                    </span>
                    <div>
                      <p className="font-bold text-foreground">{emp.name}</p>
                      <p className="text-[10px] text-muted-foreground">{emp.department || "Production"}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono font-bold text-amber-600 dark:text-amber-400">
                      {Math.round(Number(emp.ot_hours || 0) * 10) / 10} hrs
                    </p>
                    <p className="text-[10px] text-muted-foreground">OT Accrual</p>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground py-2">No overtime records logged this month.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
