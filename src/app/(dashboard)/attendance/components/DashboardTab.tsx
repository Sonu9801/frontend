"use client";

import React, { useState, useMemo } from "react";
import {
  useAttendanceAnalytics,
  useAttendanceLogs,
  usePayrollSummary,
  useUpdateAttendance,
} from "@/hooks/useQueries";
import AttendanceDetailsDrawer from "./AttendanceDetailsDrawer";
import { Worker } from "@/types";
import {
  Users,
  UserCheck,
  UserX,
  Clock,
  Calendar,
  Briefcase,
  IndianRupee,
  TrendingUp,
  MapPin,
  Camera,
  Filter,
  Download,
  List,
  Search,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
} from "lucide-react";
import { EditRecordDialog } from "@/components/shared/EditRecordDialog";
import { toast } from "sonner";
import { useAuthStore } from "@/store/authStore";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  AreaChart,
  Area,
  Line,
} from "recharts";
import { cn } from "@/lib/utils";

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-popover/95 backdrop-blur-md border border-border p-3 rounded-xl shadow-lg min-w-[130px] text-xs">
        {label && <p className="font-bold text-foreground mb-1.5">{label}</p>}
        {payload.map((entry: any, index: number) => (
          <div key={index} className="flex items-center gap-2 py-0.5">
            <div
              className="w-2.5 h-2.5 rounded-full"
              style={{ backgroundColor: entry.color || entry.fill || "#3b82f6" }}
            />
            <span className="text-muted-foreground capitalize font-medium">
              {entry.name}:
            </span>
            <span className="font-mono font-bold text-foreground ml-auto">
              {entry.value}
            </span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const getLocalDateString = (d: Date = new Date()) => {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export default function DashboardTab({
  workers,
  isLoading,
}: {
  workers: Worker[];
  isLoading: boolean;
}) {
  const [dateRange, setDateRange] = useState("Today");
  const [customStartDate, setCustomStartDate] = useState(getLocalDateString(new Date()));
  const [customEndDate, setCustomEndDate] = useState(getLocalDateString(new Date()));
  const [showFilters, setShowFilters] = useState(false);
  const [filterDept, setFilterDept] = useState("All");
  const [filterType, setFilterType] = useState("All");
  const [tableSearch, setTableSearch] = useState("");
  const [selectedRecord, setSelectedRecord] = useState<any>(null);
  const [editRecord, setEditRecord] = useState<any>(null);

  const updateAttendance = useUpdateAttendance();
  const userRole = useAuthStore((state: any) => state.role) || "operator";
  const canEdit = ["admin", "owner"].includes(userRole);

  const { data: analytics } = useAttendanceAnalytics();
  const { data: logsData } = useAttendanceLogs({ pageSize: 1000 });
  const logs = logsData?.items ?? [];
  const { data: payrollSummary } = usePayrollSummary();

  const { kpis, presentPercent, absentPercent, latePercent } = useMemo(() => {
    const now = new Date();
    const todayStr = getLocalDateString(now);

    const rangeLogs = (logs || []).filter((l: any) => {
      if (dateRange === "Today") {
        return l.date === todayStr;
      }
      if (dateRange === "Yesterday") {
        const yest = new Date();
        yest.setDate(yest.getDate() - 1);
        const yestStr = getLocalDateString(yest);
        return l.date === yestStr;
      }
      if (dateRange === "This Week") {
        const startOfWeek = new Date();
        startOfWeek.setDate(now.getDate() - now.getDay());
        const startStr = getLocalDateString(startOfWeek);
        return l.date >= startStr && l.date <= todayStr;
      }
      if (dateRange === "This Month") {
        const startStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
        return l.date >= startStr && l.date <= todayStr;
      }
      if (dateRange === "Custom Range") {
        return l.date >= customStartDate && l.date <= customEndDate;
      }
      return true;
    });

    const activeCount = workers.filter(
      (w: any) => (w.employmentStatus || w.employment_status) === "Active"
    ).length;
    const total = activeCount || workers.length || analytics?.total || 27;

    let present = 0;
    let absent = 0;
    let late = 0;
    let halfDay = 0;
    let ot = 0;

    if (dateRange === "Today") {
      present =
        analytics?.present ??
        rangeLogs.filter((l: any) =>
          ["Present", "Half Day", "Late", "Sunday Work"].includes(l.status)
        ).length;
      absent = analytics?.absent ?? Math.max(0, total - present);
      late =
        analytics?.late ?? rangeLogs.filter((l: any) => l.status === "Late").length;
      halfDay =
        analytics?.half_day ??
        rangeLogs.filter((l: any) => l.status === "Half Day").length;
      ot =
        analytics?.ot_running ??
        rangeLogs.filter((l: any) => !l.punch_out && l.ot_hours > 0).length;
    } else {
      const uniqueWorkers = new Set(rangeLogs.map((l: any) => l.worker_id));
      present = rangeLogs.filter((l: any) =>
        ["Present", "Half Day", "Late", "Sunday Work"].includes(l.status)
      ).length;
      absent = Math.max(0, total - uniqueWorkers.size);
      late = rangeLogs.filter((l: any) => l.status === "Late").length;
      halfDay = rangeLogs.filter((l: any) => l.status === "Half Day").length;
      ot = rangeLogs.filter((l: any) => l.ot_hours > 0).length;
    }

    const pPct = total > 0 ? Math.round((present / total) * 100) : 0;
    const aPct = total > 0 ? Math.round((absent / total) * 100) : 0;
    const lPct = present > 0 ? Math.round((late / present) * 100) : 0;

    return {
      kpis: { total, present, absent, late, halfDay, ot },
      presentPercent: pPct,
      absentPercent: aPct,
      latePercent: lPct,
    };
  }, [logs, dateRange, customStartDate, customEndDate, workers, analytics]);

  const monthlyAvg = 92;

  const tableLogs = useMemo(() => {
    const now = new Date();
    const todayStr = getLocalDateString(now);

    return (logs || []).filter((l: any) => {
      // 1. Date range filter
      let matchDate = false;
      if (dateRange === "Today") {
        matchDate = l.date === todayStr;
      } else if (dateRange === "Yesterday") {
        const yest = new Date();
        yest.setDate(yest.getDate() - 1);
        const yestStr = getLocalDateString(yest);
        matchDate = l.date === yestStr;
      } else if (dateRange === "This Week") {
        const startOfWeek = new Date();
        startOfWeek.setDate(now.getDate() - now.getDay());
        const startStr = getLocalDateString(startOfWeek);
        matchDate = l.date >= startStr && l.date <= todayStr;
      } else if (dateRange === "This Month") {
        const startStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-01`;
        matchDate = l.date >= startStr && l.date <= todayStr;
      } else if (dateRange === "Custom Range") {
        matchDate = l.date >= customStartDate && l.date <= customEndDate;
      } else {
        matchDate = true;
      }

      // 2. Department & Status filter
      const matchDept = filterDept === "All" || l.department === filterDept;
      let matchType = true;
      if (filterType !== "All") {
        if (filterType === "Present") matchType = l.status === "Present";
        else if (filterType === "Late") matchType = l.status === "Late";
        else if (filterType === "Out") matchType = !!l.punch_out;
      }

      // 3. Search query filter
      let matchSearch = true;
      if (tableSearch.trim()) {
        const q = tableSearch.toLowerCase().trim();
        matchSearch =
          (l.employee_name || "").toLowerCase().includes(q) ||
          (l.department || "").toLowerCase().includes(q) ||
          (l.employee_id || "").toLowerCase().includes(q);
      }

      return matchDate && matchDept && matchType && matchSearch;
    });
  }, [logs, dateRange, customStartDate, customEndDate, filterDept, filterType, tableSearch]);

  const liveFeed = useMemo(() => {
    return (logs || []).slice(0, 10).map((log: any) => {
      let text = `${log.employee_name} Punched In`;
      let type = "present";
      let time = log.punch_in
        ? new Date(log.punch_in).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        : "--";

      if (log.punch_out) {
        text = `${log.employee_name} Punched Out`;
        type = "out";
        time = new Date(log.punch_out).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        });
      } else if (log.status === "Late") {
        type = "late";
        text = `${log.employee_name} Late Arrival`;
      } else if (log.status === "Absent") {
        type = "absent";
        text = `${log.employee_name} is Absent`;
      }

      return { text, type, time, department: log.department || "Production" };
    });
  }, [logs]);

  let displayFeed = liveFeed;
  if (filterDept !== "All" || filterType !== "All") {
    displayFeed = displayFeed.filter((item: any) => {
      const matchDept = filterDept === "All" || item.department === filterDept;
      const matchType = filterType === "All" || item.type === filterType.toLowerCase();
      return matchDept && matchType;
    });
  }

  // Real CSV Export Action
  const handleExportCSV = () => {
    if (!tableLogs.length) {
      toast.error("No attendance records to export for this period.");
      return;
    }
    const headers = [
      "Employee Name",
      "Department",
      "Date",
      "Punch In",
      "Punch Out",
      "Status",
      "Working Hours",
      "OT Hours",
      "Late Minutes",
      "Location Verified",
      "Photo Verified",
    ];
    const rows = tableLogs.map((r: any) => [
      `"${r.employee_name || ""}"`,
      `"${r.department || ""}"`,
      `"${r.date || ""}"`,
      `"${r.punch_in ? new Date(r.punch_in).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--"}"`,
      `"${r.punch_out ? new Date(r.punch_out).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--"}"`,
      `"${r.status || ""}"`,
      `"${r.net_working_hours || 0}"`,
      `"${r.ot_hours || 0}"`,
      `"${r.late_minutes || 0}"`,
      `"${r.location_status || "Unverified"}"`,
      `"${r.photo_status || "Unverified"}"`,
    ]);
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e: string[]) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `attendance_${dateRange.toLowerCase().replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast.success("Attendance CSV exported successfully!");
  };

  return (
    <div className="flex flex-col gap-6 pb-8" data-ocid="attendance.dashboard">
      {/* Overview Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-card p-4 rounded-2xl border border-border/80 shadow-2xs">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center border border-primary/20">
            <Briefcase size={16} />
          </div>
          <div>
            <h2 className="text-sm font-bold text-foreground tracking-tight">
              Attendance Overview
            </h2>
            <p className="text-xs text-muted-foreground">
              Real-time biometric & mobile shift attendance logs
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Quick Date Range Pills */}
          <div className="flex items-center bg-muted/60 p-1 rounded-xl border border-border/70 text-xs font-bold shadow-2xs">
            {["Today", "Yesterday", "This Week", "This Month"].map((range) => (
              <button
                key={range}
                type="button"
                onClick={() => setDateRange(range)}
                className={cn(
                  "px-2.5 py-1 rounded-lg transition-all",
                  dateRange === range
                    ? "bg-card text-foreground shadow-2xs font-extrabold"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                {range}
              </button>
            ))}
          </div>

          {/* Filter Dropdown Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border shadow-2xs",
              showFilters
                ? "bg-primary/10 text-primary border-primary/30"
                : "bg-muted/40 hover:bg-muted text-foreground border-border/70"
            )}
          >
            <Filter size={13} />
            <span>Filters</span>
          </button>

          {/* Working Export CSV */}
          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95 shadow-2xs"
          >
            <Download size={13} />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Expandable Filter Panel */}
      {showFilters && (
        <div className="bg-card border border-border/80 rounded-2xl p-4 shadow-2xs flex flex-wrap gap-4 items-end animate-in fade-in slide-in-from-top-2">
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase">
              Department
            </label>
            <select
              value={filterDept}
              onChange={(e) => setFilterDept(e.target.value)}
              className="h-9 bg-background border border-input rounded-xl px-3 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary min-w-[160px]"
            >
              <option value="All">All Departments</option>
              <option value="Fabrication">Fabrication</option>
              <option value="Paint">Paint</option>
              <option value="Assembly">Assembly</option>
              <option value="Quality">Quality</option>
              <option value="Dispatch">Dispatch</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-muted-foreground uppercase">
              Status Type
            </label>
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="h-9 bg-background border border-input rounded-xl px-3 text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary min-w-[140px]"
            >
              <option value="All">All Statuses</option>
              <option value="Present">Present</option>
              <option value="Late">Late</option>
              <option value="Out">Punched Out</option>
            </select>
          </div>
          <div className="ml-auto">
            <button
              onClick={() => {
                setFilterDept("All");
                setFilterType("All");
              }}
              className="h-9 px-3.5 bg-muted/50 text-muted-foreground hover:text-foreground text-xs font-bold rounded-xl transition-colors border border-border/50"
            >
              Reset Filters
            </button>
          </div>
        </div>
      )}

      {/* 5 Spacious Balanced Metric Cards (Zero Truncation) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Card 1: Present */}
        <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-2xs hover:shadow-subtle hover:border-emerald-500/50 transition-all group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              {dateRange === "Today" ? "Present Today" : "Present Crew"}
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center border border-emerald-500/20">
              <UserCheck size={16} />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-3xl font-black font-display tabular-nums tracking-tight text-emerald-600 dark:text-emerald-400">
              {kpis.present}
            </span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
              {presentPercent}%
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground font-medium">
            Active on shift floor
          </p>
        </div>

        {/* Card 2: Absent */}
        <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-2xs hover:shadow-subtle hover:border-rose-500/50 transition-all group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              {dateRange === "Today" ? "Absent Today" : "Absent Crew"}
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center border border-rose-500/20">
              <UserX size={16} />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-3xl font-black font-display tabular-nums tracking-tight text-rose-600 dark:text-rose-400">
              {kpis.absent}
            </span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
              {absentPercent}%
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground font-medium">
            Unscheduled absence
          </p>
        </div>

        {/* Card 3: Late Arrivals */}
        <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-2xs hover:shadow-subtle hover:border-amber-500/50 transition-all group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wider">
              Late Arrivals
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Clock size={16} />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-3xl font-black font-display tabular-nums tracking-tight text-amber-600 dark:text-amber-400">
              {kpis.late}
            </span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-700 dark:text-amber-300 border border-amber-500/25">
              {kpis.halfDay > 0 ? `${kpis.halfDay} Half Day` : "Past Cutoff"}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground font-medium">
            Punched after 08:30 AM
          </p>
        </div>

        {/* Card 4: Overtime (OT) */}
        <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-2xs hover:shadow-subtle hover:border-purple-500/50 transition-all group">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              {dateRange === "Today" ? "OT Running" : "Overtime Logs"}
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center border border-purple-500/20">
              <TrendingUp size={16} />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-3xl font-black font-display tabular-nums tracking-tight text-purple-600 dark:text-purple-400">
              {kpis.ot}
            </span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
              Extended Shift
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground font-medium">
            Workers logging extra hours
          </p>
        </div>

        {/* Card 5: Total Registered Workforce (Full title, never truncated!) */}
        <div className="p-4 rounded-2xl bg-card border border-border/80 shadow-2xs hover:shadow-subtle hover:border-primary/50 transition-all group col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
              Total Workforce
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center border border-blue-500/20">
              <Users size={16} />
            </div>
          </div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-3xl font-black font-display tabular-nums tracking-tight text-foreground">
              {kpis.total}
            </span>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
              Registered
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground font-medium">
            Plant biometric roster
          </p>
        </div>
      </div>

      {/* Row 1: 7-Day Trend Chart & Real-Time Shift Activity Feed (Split 8 / 4) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 7-Day Trend Chart (8 cols) */}
        <div className="lg:col-span-8 bg-card border border-border/80 rounded-2xl p-5 shadow-2xs">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4 pb-3 border-b border-border/60">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-foreground tracking-tight">
                  7-Day Attendance Trend
                </h3>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  Weekly Overview
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Daily present vs absent ratios across manufacturing shifts
              </p>
            </div>

            {/* Metric Pills on Top */}
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                {presentPercent}% Present
              </span>
              <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-rose-500/10 text-rose-600 dark:text-rose-400 border border-rose-500/20">
                {absentPercent}% Absent
              </span>
              <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-700 dark:text-amber-300 border border-amber-500/20">
                {latePercent}% Late
              </span>
              <span className="px-2.5 py-1 rounded-xl text-xs font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                {monthlyAvg}% Monthly Avg
              </span>
            </div>
          </div>

          <div className="h-60 mt-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={analytics?.attendance_trend || []}
                margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="var(--color-border)"
                  opacity={0.35}
                />
                <XAxis
                  dataKey="day"
                  stroke="#888888"
                  fontSize={11}
                  fontWeight={600}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#888888"
                  fontSize={11}
                  fontWeight={600}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <RechartsTooltip content={<CustomTooltip />} />
                <Area
                  type="monotone"
                  dataKey="present"
                  name="Present"
                  stroke="#10b981"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorPresent)"
                  isAnimationActive={false}
                />
                <Line
                  type="monotone"
                  dataKey="absent"
                  name="Absent"
                  stroke="#ef4444"
                  strokeWidth={2}
                  dot={{ r: 3, fill: "#ef4444" }}
                  isAnimationActive={false}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Live Punch Stream / Feed (4 cols) */}
        <div className="lg:col-span-4 bg-card border border-border/80 rounded-2xl p-5 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/60">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="text-sm font-bold text-foreground tracking-tight">
                  Live Shift Activity
                </h3>
              </div>
              <span className="text-[10.5px] font-bold text-muted-foreground bg-muted/60 px-2 py-0.5 rounded-full border border-border/50">
                Real-Time
              </span>
            </div>

            <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
              {displayFeed.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-6">
                  No recent punch activity.
                </p>
              ) : (
                displayFeed.slice(0, 5).map((feed: any, i: number) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-2.5 rounded-xl bg-muted/30 border border-border/40 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={cn(
                          "w-7 h-7 rounded-lg flex items-center justify-center shrink-0 text-xs font-bold border",
                          feed.type === "present"
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                            : feed.type === "late"
                              ? "bg-amber-500/10 text-amber-700 border-amber-500/20"
                              : feed.type === "out"
                                ? "bg-blue-500/10 text-blue-600 border-blue-500/20"
                                : "bg-rose-500/10 text-rose-600 border-rose-500/20"
                        )}
                      >
                        {feed.type === "present"
                          ? "IN"
                          : feed.type === "out"
                            ? "OUT"
                            : feed.type === "late"
                              ? "LT"
                              : "AB"}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-foreground truncate">
                          {feed.text}
                        </p>
                        <p className="text-[10px] text-muted-foreground truncate font-medium">
                          {feed.department}
                        </p>
                      </div>
                    </div>
                    <span className="text-[10.5px] font-mono font-bold text-muted-foreground shrink-0 ml-2">
                      {feed.time}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="mt-3 pt-3 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground">
            <span>Biometric Clock-ins</span>
            <span className="font-bold text-primary">Live Sync</span>
          </div>
        </div>
      </div>

      {/* Row 2: Department Analytics & Owner Financial Command Center (Split 6 / 6) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left (6 cols): Department Staffing Analytics */}
        <div className="lg:col-span-6 bg-card border border-border/80 rounded-2xl p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/60">
            <div>
              <h3 className="text-sm font-bold text-foreground tracking-tight">
                Department Attendance Breakdown
              </h3>
              <p className="text-xs text-muted-foreground">
                Shift headcount across shopfloor divisions
              </p>
            </div>
            <Users size={16} className="text-muted-foreground" />
          </div>

          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={analytics?.dept_stats || []}
                layout="vertical"
                margin={{ top: 0, right: 10, left: 20, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  horizontal={true}
                  vertical={false}
                  stroke="var(--color-border)"
                  opacity={0.3}
                />
                <XAxis
                  type="number"
                  stroke="#888888"
                  fontSize={11}
                  fontWeight={600}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  dataKey="name"
                  type="category"
                  stroke="#888888"
                  fontSize={11}
                  fontWeight={700}
                  tickLine={false}
                  axisLine={false}
                />
                <RechartsTooltip content={<CustomTooltip />} />
                <Legend wrapperStyle={{ fontSize: 11, fontWeight: 600 }} />
                <Bar
                  dataKey="present"
                  name="Present"
                  fill="#10b981"
                  radius={[0, 4, 4, 0]}
                  barSize={12}
                  isAnimationActive={false}
                />
                <Bar
                  dataKey="ot"
                  name="OT Running"
                  fill="#8b5cf6"
                  radius={[0, 4, 4, 0]}
                  barSize={12}
                  isAnimationActive={false}
                />
                <Bar
                  dataKey="absent"
                  name="Absent"
                  fill="#ef4444"
                  radius={[0, 4, 4, 0]}
                  barSize={12}
                  isAnimationActive={false}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Right (6 cols): Owner Labour Cost Command Center */}
        <div className="lg:col-span-6 bg-card border border-border/80 rounded-2xl p-5 shadow-2xs relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 p-3 opacity-5 pointer-events-none">
            <IndianRupee size={120} />
          </div>

          <div>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-border/60">
              <div>
                <h3 className="text-sm font-bold text-foreground tracking-tight">
                  Labour Cost Command Center
                </h3>
                <p className="text-xs text-muted-foreground">
                  Estimated wages, overtime payout & workforce utilization
                </p>
              </div>
              <IndianRupee size={16} className="text-muted-foreground" />
            </div>

            <div className="grid grid-cols-2 gap-3 relative z-10">
              <div className="bg-muted/40 rounded-xl p-3.5 border border-border/50">
                <p className="text-[11px] font-bold text-muted-foreground uppercase">
                  Today's Est. Wage
                </p>
                <p className="text-2xl font-black mt-1 text-foreground font-mono">
                  ₹{Math.round((payrollSummary?.baseSalaryCost || 0) / 30).toLocaleString()}
                </p>
              </div>
              <div className="bg-muted/40 rounded-xl p-3.5 border border-border/50">
                <p className="text-[11px] font-bold text-muted-foreground uppercase">
                  Monthly Labour Cost
                </p>
                <p className="text-2xl font-black mt-1 text-foreground font-mono">
                  ₹{Math.round(payrollSummary?.monthlyPayrollCost || 0).toLocaleString()}
                </p>
              </div>
              <div className="bg-purple-500/10 rounded-xl p-3.5 border border-purple-500/20">
                <p className="text-[11px] font-bold text-purple-600 dark:text-purple-400 uppercase">
                  OT Cost (Month)
                </p>
                <p className="text-2xl font-black mt-1 text-purple-700 dark:text-purple-300 font-mono">
                  ₹{Math.round(payrollSummary?.otCost || 0).toLocaleString()}
                </p>
              </div>
              <div className="bg-blue-500/10 rounded-xl p-3.5 border border-blue-500/20">
                <p className="text-[11px] font-bold text-blue-600 dark:text-blue-400 uppercase">
                  Sunday Premium
                </p>
                <p className="text-2xl font-black mt-1 text-blue-700 dark:text-blue-300 font-mono">
                  ₹{Math.round(payrollSummary?.sundayCost || 0).toLocaleString()}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-3 bg-emerald-500/10 rounded-xl p-3 border border-emerald-500/20 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                Workforce Utilization Rate
              </p>
              <p className="text-lg font-black mt-0.5 text-emerald-700 dark:text-emerald-300">
                {presentPercent}% on shift
              </p>
            </div>
            <TrendingUp className="text-emerald-500 opacity-60" size={24} />
          </div>
        </div>
      </div>

      {/* Row 3: Today's Shift Punch Table with Instant Search */}
      <div className="bg-card border border-border/80 rounded-2xl shadow-2xs overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-border/60 flex flex-wrap justify-between items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-foreground tracking-tight">
                {dateRange === "Today"
                  ? "Today's Attendance Roster"
                  : `${dateRange} Attendance Roster`}
              </h3>
              <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                {tableLogs.length} Records
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-0.5">
              Live biometric punches, working hours & geofence verification
            </p>
          </div>

          {/* Table Search Input */}
          <div className="relative min-w-[220px]">
            <Search
              size={13}
              className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
            />
            <input
              type="text"
              value={tableSearch}
              onChange={(e) => setTableSearch(e.target.value)}
              placeholder="Search by worker name, dept..."
              className="w-full pl-8 pr-3 py-1.5 bg-muted/40 border border-border rounded-xl text-xs font-medium placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
            />
            {tableSearch && (
              <button
                type="button"
                onClick={() => setTableSearch("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-bold text-muted-foreground hover:text-foreground"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted/30 text-muted-foreground text-xs uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-5 py-3 font-semibold">Employee</th>
                <th className="px-5 py-3 font-semibold">Department</th>
                <th className="px-5 py-3 font-semibold">Punch In</th>
                <th className="px-5 py-3 font-semibold">Punch Out</th>
                <th className="px-5 py-3 font-semibold">Duty Status</th>
                <th className="px-5 py-3 font-semibold">Net Hours</th>
                <th className="px-5 py-3 font-semibold">GPS & Photo</th>
                <th className="px-5 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {tableLogs.length === 0 ? (
                <tr>
                  <td
                    colSpan={8}
                    className="px-5 py-10 text-center text-xs text-muted-foreground font-medium"
                  >
                    No attendance records found matching current date and filters.
                  </td>
                </tr>
              ) : (
                tableLogs.map((row: any) => (
                  <tr
                    key={row.id}
                    className="hover:bg-muted/25 transition-colors"
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-lg bg-primary/10 text-primary font-bold text-xs flex items-center justify-center border border-primary/20">
                          {row.employee_name
                            ? row.employee_name.charAt(0).toUpperCase()
                            : "W"}
                        </div>
                        <span className="font-bold text-foreground text-xs">
                          {row.employee_name}
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-xs text-muted-foreground font-medium">
                      {row.department || "Production"}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs">
                      {row.punch_in
                        ? new Date(row.punch_in).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "--"}
                    </td>
                    <td className="px-5 py-3 font-mono text-xs text-muted-foreground">
                      {row.punch_out
                        ? new Date(row.punch_out).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : "--"}
                    </td>
                    <td className="px-5 py-3">
                      <span
                        className={cn(
                          "inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-bold border",
                          row.status === "Present"
                            ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/25"
                            : row.status === "Half Day"
                              ? "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/25"
                              : row.status === "Late"
                                ? "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/25"
                                : "bg-rose-500/10 text-rose-600 border-rose-500/25"
                        )}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="px-5 py-3 font-mono font-bold text-xs">
                      {row.net_working_hours > 0 ? `${row.net_working_hours}h` : "0h"}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span title={`Location: ${row.location_status || "Unverified"}`}>
                          <MapPin
                            size={14}
                            className={
                              row.location_status === "Verified"
                                ? "text-emerald-500"
                                : "text-muted-foreground/40"
                            }
                          />
                        </span>
                        <span title={`Photo: ${row.photo_status || "Unverified"}`}>
                          <Camera
                            size={14}
                            className={
                              row.photo_status === "Verified"
                                ? "text-emerald-500"
                                : "text-muted-foreground/40"
                            }
                          />
                        </span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-2.5">
                        <button
                          onClick={() => setSelectedRecord(row)}
                          className="text-primary hover:underline text-xs font-bold"
                        >
                          View
                        </button>
                        {canEdit && (
                          <button
                            onClick={() => setEditRecord(row)}
                            className="text-muted-foreground hover:text-foreground text-xs font-medium"
                          >
                            Edit
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <AttendanceDetailsDrawer
        open={!!selectedRecord}
        onOpenChange={(open: boolean) => !open && setSelectedRecord(null)}
        record={selectedRecord}
      />

      <EditRecordDialog
        open={!!editRecord}
        onOpenChange={(open) => !open && setEditRecord(null)}
        title={`Edit Attendance: ${editRecord?.employee_name}`}
        fields={
          editRecord
            ? [
                {
                  name: "status",
                  label: "Status",
                  type: "select",
                  defaultValue: editRecord.status,
                  options: ["Present", "Absent", "Half Day", "Late", "Sunday Work"],
                },
                {
                  name: "punch_in",
                  label: "Punch In (ISO)",
                  type: "text",
                  defaultValue: editRecord.punch_in || "",
                },
                {
                  name: "punch_out",
                  label: "Punch Out (ISO)",
                  type: "text",
                  defaultValue: editRecord.punch_out || "",
                },
                {
                  name: "net_working_hours",
                  label: "Net Working Hours",
                  type: "number",
                  defaultValue: editRecord.net_working_hours || 0,
                },
                {
                  name: "ot_hours",
                  label: "OT Hours",
                  type: "number",
                  defaultValue: editRecord.ot_hours || 0,
                },
                {
                  name: "late_minutes",
                  label: "Late Minutes",
                  type: "number",
                  defaultValue: editRecord.late_minutes || 0,
                },
              ]
            : []
        }
        onSubmit={(data: any, reason: string) => {
          if (!editRecord) return;
          updateAttendance.mutate(
            { id: editRecord.id, data: { ...data, reason } },
            {
              onSuccess: () => {
                toast.success("Attendance updated successfully");
                setEditRecord(null);
              },
              onError: (err: any) => {
                toast.error(err.response?.data?.detail || "Failed to update attendance");
              },
            }
          );
        }}
        isSubmitting={updateAttendance.isPending}
      />
    </div>
  );
}
