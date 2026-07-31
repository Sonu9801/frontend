"use client";

import React, { useState, useMemo } from "react";
import { format, subDays, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay } from "date-fns";
import { 
  TrendingUp, Calendar as CalendarIcon, Filter, Search, Download, 
  UserCheck, UserX, CheckCircle2, PlayCircle, Clock, Award, 
  Briefcase, ArrowUpRight, ArrowDownRight, RefreshCw, ChevronLeft, ChevronRight,
  Eye, FileText, Check, AlertCircle, BarChart3, PieChart as PieChartIcon, Printer
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { 
  usePerformanceDashboard, 
  usePerformanceWorkers, 
  usePerformanceWorker,
  useWorkers
} from "@/hooks/useQueries";
import { performanceApi } from "@/lib/api";
import { exportToCSV, exportToExcel, exportToPDF } from "../reports/components/exportUtils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { 
  ResponsiveContainer, BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend 
} from "recharts";

export default function PerformanceDashboardPage() {
  // 1. State Management
  const [selectedDate, setSelectedDate] = useState<string>(format(new Date(), "yyyy-MM-dd"));
  const [selectedMonth, setSelectedMonth] = useState<string>(format(new Date(), "yyyy-MM"));
  const [department, setDepartment] = useState<string>("All");
  const [supervisorId, setSupervisorId] = useState<string>("All");
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [searchQuery, setSearchQuery] = useState<string>("");
  
  // Table Pagination & Sorting
  const [page, setPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(10);
  const [sortBy, setSortBy] = useState<string>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Worker Detail Drawer
  const [selectedWorkerId, setSelectedWorkerId] = useState<number | null>(null);
  const [historyDays, setHistoryDays] = useState<number>(30);
  const [supervisorRemarks, setSupervisorRemarks] = useState<string>("");
  const [isApproving, setIsApproving] = useState<boolean>(false);

  // 2. Data Fetching Hooks
  const { data: dashboardData, isLoading: isDashboardLoading, refetch: refetchDashboard } = usePerformanceDashboard({
    date: selectedDate,
    month: selectedMonth,
    department: department === "All" ? undefined : department,
    supervisor_id: supervisorId === "All" ? undefined : Number(supervisorId)
  });

  const { data: workersTableData, isLoading: isWorkersLoading, refetch: refetchWorkers } = usePerformanceWorkers({
    date: selectedDate,
    page,
    page_size: pageSize,
    search: searchQuery,
    sort_by: sortBy,
    sort_order: sortOrder,
    department: department === "All" ? undefined : department
  });

  const { data: workerDetailData, isLoading: isDetailLoading, refetch: refetchDetail } = usePerformanceWorker(
    selectedWorkerId,
    { date: selectedDate, history_days: historyDays }
  );

  const { data: allWorkersResponse } = useWorkers({ pageSize: 1000 });
  const allWorkers = allWorkersResponse?.items ?? [];

  // Live departments list from registered workers
  const liveDepartments = useMemo(() => {
    const depts = new Set<string>();
    allWorkers.forEach((w: any) => { if (w.department) depts.add(w.department); });
    return Array.from(depts);
  }, [allWorkers]);

  // Supervisors list for filter dropdown
  const supervisors = useMemo(() => {
    return allWorkers.filter((w: any) => w.role?.toLowerCase() === "supervisor" || w.designation?.toLowerCase().includes("supervisor"));
  }, [allWorkers]);

  const kpisToday = dashboardData?.kpis?.today || {};
  const kpisYesterday = dashboardData?.kpis?.yesterday || {};
  const calendarData = dashboardData?.calendar || [];
  const analyticsData = dashboardData?.analytics || {};

  // KPI Comparison helper
  const renderTrend = (current: number, previous: number, suffix = "%") => {
    if (previous === undefined || previous === 0) return <span className="text-xs text-gray-400">vs Yesterday</span>;
    const diff = current - previous;
    const pct = Math.round((diff / previous) * 100);
    const isUp = diff >= 0;
    return (
      <div className={`flex items-center gap-0.5 text-xs font-bold ${isUp ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
        {isUp ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
        <span>{isUp ? `+${pct}%` : `${pct}%`}</span>
        <span className="text-gray-400 font-normal ml-1">vs Yesterday</span>
      </div>
    );
  };

  // Handle Exporting Data
  const handleExport = (type: "pdf" | "excel" | "csv") => {
    const items = workersTableData?.items || [];
    if (items.length === 0) return toast.error("No data available to export.");

    const headers = ["Employee ID", "Worker Name", "Department", "Today's Assignment", "Supervisor", "Completed Jobs", "Running Jobs", "Working Hours", "Efficiency (%)", "Status"];
    const exportRows = items.map((w: any) => ({
      "Employee ID": w.employeeId,
      "Worker Name": w.name,
      "Department": w.department,
      "Today's Assignment": w.todayAssignment,
      "Supervisor": w.supervisor,
      "Completed Jobs": w.completedJobs,
      "Running Jobs": w.runningJobs,
      "Working Hours": `${w.workingHours} hrs`,
      "Efficiency (%)": `${w.efficiency}%`,
      "Status": w.attendanceStatus
    }));

    const filename = `Workforce_Performance_${selectedDate}`;
    if (type === "csv") exportToCSV(filename, headers, exportRows);
    else if (type === "excel") exportToExcel(filename, headers, exportRows);
    else if (type === "pdf") exportToPDF(filename, "Workforce Performance Report", headers, exportRows, { dateRange: selectedDate, summary: `Daily Performance Report for ${selectedDate}` });
  };

  const handleApprovePerformance = async () => {
    if (!selectedWorkerId) return;
    setIsApproving(true);
    try {
      await performanceApi.approveWorker(selectedWorkerId, {
        date: selectedDate,
        remarks: supervisorRemarks,
        status: "Approved"
      });
      toast.success("Worker performance approved successfully!");
      refetchDetail();
    } catch (err: any) {
      toast.error(err.message || "Failed to approve performance.");
    } finally {
      setIsApproving(false);
    }
  };

  return (
    <div className="p-4 md:p-6" data-ocid="performance.page">
      {/* ─── HEADER ──────────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground">
            Performance Dashboard
          </h1>
          <p className="text-sm text-muted-foreground">
            Track daily workforce productivity and manufacturing efficiency
          </p>
        </div>

        {/* Quick Actions & Export */}
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => { refetchDashboard(); refetchWorkers(); }}
          >
            <RefreshCw size={14} className="mr-1.5" /> Refresh
          </Button>
          <Button size="sm" variant="outline" onClick={() => handleExport("csv")}>CSV</Button>
          <Button size="sm" variant="outline" onClick={() => handleExport("excel")}>Excel</Button>
          <Button size="sm" variant="outline" className="text-primary" onClick={() => handleExport("pdf")}>PDF</Button>
        </div>
      </div>

      {/* ─── FILTER BAR ─────────────────────────────────────────────────── */}
      <div className="bg-card border border-border rounded-xl p-4 mb-6 shadow-subtle grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
        {/* Date Picker */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1 block">Date</label>
          <Input 
            type="date" 
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="h-9 text-xs bg-background border-border rounded-lg font-medium"
          />
        </div>

        {/* Department */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1 block">Department</label>
          <Select value={department} onValueChange={setDepartment}>
            <SelectTrigger className="h-9 text-xs bg-background border-border rounded-lg font-medium">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Departments</SelectItem>
              {liveDepartments.map((d: string) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Supervisor */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1 block">Supervisor</label>
          <Select value={supervisorId} onValueChange={setSupervisorId}>
            <SelectTrigger className="h-9 text-xs bg-background border-border rounded-lg font-medium">
              <SelectValue placeholder="Supervisor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Supervisors</SelectItem>
              {supervisors.map((s: any) => (
                <SelectItem key={s.id} value={String(s.id)}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Search */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1 block">Search Worker</label>
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 text-muted-foreground" size={14} />
            <Input 
              placeholder="Name or Emp ID..."
              value={searchQuery}
              onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
              className="h-9 pl-8 text-xs bg-background border-border rounded-lg font-medium"
            />
          </div>
        </div>

        {/* Month Selector for Production Calendar */}
        <div>
          <label className="text-xs font-semibold text-muted-foreground mb-1 block">Calendar Month</label>
          <Input 
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="h-9 text-xs bg-background border-border rounded-lg font-medium"
          />
        </div>
      </div>

      {/* ─── 1. KPI CARDS ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-9 gap-3 mb-6">
        {/* Workers Present */}
        <div className="bg-card border border-border rounded-xl p-3.5 flex flex-col shadow-subtle relative overflow-hidden">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Present</span>
            <UserCheck size={14} className="text-emerald-500" />
          </div>
          <p className="text-2xl font-bold font-display text-foreground">{isDashboardLoading ? "-" : kpisToday.present ?? 0}</p>
          {renderTrend(kpisToday.present, kpisYesterday.present, "")}
        </div>

        {/* Workers Absent */}
        <div className="bg-card border border-border rounded-xl p-3.5 flex flex-col shadow-subtle relative overflow-hidden">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Absent</span>
            <UserX size={14} className="text-destructive" />
          </div>
          <p className="text-2xl font-bold font-display text-foreground">{isDashboardLoading ? "-" : kpisToday.absent ?? 0}</p>
          {renderTrend(kpisToday.absent, kpisYesterday.absent, "")}
        </div>

        {/* Jobs Completed */}
        <div className="bg-card border border-border rounded-xl p-3.5 flex flex-col shadow-subtle relative overflow-hidden">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Completed</span>
            <CheckCircle2 size={14} className="text-emerald-500" />
          </div>
          <p className="text-2xl font-bold font-display text-foreground">{isDashboardLoading ? "-" : kpisToday.completed ?? 0}</p>
          {renderTrend(kpisToday.completed, kpisYesterday.completed, "")}
        </div>

        {/* Running Jobs */}
        <div className="bg-card border border-border rounded-xl p-3.5 flex flex-col shadow-subtle relative overflow-hidden">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Running</span>
            <PlayCircle size={14} className="text-primary" />
          </div>
          <p className="text-2xl font-bold font-display text-foreground">{isDashboardLoading ? "-" : kpisToday.running ?? 0}</p>
          {renderTrend(kpisToday.running, kpisYesterday.running, "")}
        </div>

        {/* Pending Jobs */}
        <div className="bg-card border border-border rounded-xl p-3.5 flex flex-col shadow-subtle relative overflow-hidden">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Pending</span>
            <Clock size={14} className="text-amber-500" />
          </div>
          <p className="text-2xl font-bold font-display text-foreground">{isDashboardLoading ? "-" : kpisToday.pending ?? 0}</p>
          {renderTrend(kpisToday.pending, kpisYesterday.pending, "")}
        </div>

        {/* Avg Efficiency */}
        <div className="bg-card border border-border rounded-xl p-3.5 flex flex-col shadow-subtle relative overflow-hidden">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Avg Efficiency</span>
            <Award size={14} className="text-primary" />
          </div>
          <p className="text-2xl font-bold font-display text-primary">{isDashboardLoading ? "-" : `${kpisToday.efficiency ?? 0}%`}</p>
          {renderTrend(kpisToday.efficiency, kpisYesterday.efficiency, "%")}
        </div>

        {/* Working Hours */}
        <div className="bg-card border border-border rounded-xl p-3.5 flex flex-col shadow-subtle relative overflow-hidden">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Working Hours</span>
            <Briefcase size={14} className="text-muted-foreground" />
          </div>
          <p className="text-2xl font-bold font-display text-foreground">{isDashboardLoading ? "-" : `${kpisToday.working_hours ?? 0}h`}</p>
          {renderTrend(kpisToday.working_hours, kpisYesterday.working_hours, "h")}
        </div>

        {/* Overtime Hours */}
        <div className="bg-card border border-border rounded-xl p-3.5 flex flex-col shadow-subtle relative overflow-hidden">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Overtime</span>
            <Clock size={14} className="text-amber-500" />
          </div>
          <p className="text-2xl font-bold font-display text-foreground">{isDashboardLoading ? "-" : `${kpisToday.ot_hours ?? 0}h`}</p>
          {renderTrend(kpisToday.ot_hours, kpisYesterday.ot_hours, "h")}
        </div>

        {/* Avg Completion Time */}
        <div className="bg-card border border-border rounded-xl p-3.5 flex flex-col shadow-subtle relative overflow-hidden">
          <div className="flex items-center justify-between text-muted-foreground mb-1">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Avg Job Time</span>
            <TrendingUp size={14} className="text-emerald-500" />
          </div>
          <p className="text-2xl font-bold font-display text-foreground">{isDashboardLoading ? "-" : `${kpisToday.avg_completion_time ?? 0}h`}</p>
          {renderTrend(kpisToday.avg_completion_time, kpisYesterday.avg_completion_time, "h")}
        </div>
      </div>

        {/* ─── 2. PRODUCTION CALENDAR (MAIN FEATURE) ────────────────────── */}
        <div className="bg-card border border-border rounded-xl shadow-subtle overflow-hidden mb-6">
          <div className="p-4 border-b border-border bg-muted/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                <CalendarIcon size={16} />
              </div>
              <div>
                <h3 className="font-semibold text-foreground text-sm">Monthly Production Calendar</h3>
                <p className="text-xs text-muted-foreground">Click any day to view complete daily dashboard metrics.</p>
              </div>
            </div>

            {/* Color Legend */}
            <div className="flex items-center gap-3 text-xs font-medium text-muted-foreground">
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-emerald-500" /> Excellent (≥90%)</div>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-amber-500" /> Average (70-89%)</div>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-rose-500" /> Low (&lt;70%)</div>
              <div className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-muted" /> No Jobs</div>
            </div>
          </div>

          <div className="p-4">
            <div className="grid grid-cols-7 gap-2 text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-2">
              <span>Sun</span><span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span>
            </div>

            <div className="grid grid-cols-7 gap-2">
              {calendarData.map((day: any) => {
                const isSelected = day.date === selectedDate;
                const dateNum = new Date(day.date).getDate();
                
                // Color mapping
                const colorClasses = 
                  day.color === "green" ? "bg-emerald-50 text-emerald-900 border-emerald-200 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800/40" :
                  day.color === "yellow" ? "bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800/40" :
                  day.color === "red" ? "bg-rose-50 text-rose-900 border-rose-200 hover:bg-rose-100 dark:bg-rose-950/40 dark:text-rose-200 dark:border-rose-800/40" :
                  "bg-muted/30 text-muted-foreground border-border/50 hover:bg-muted/50";

                return (
                  <button
                    key={day.date}
                    onClick={() => setSelectedDate(day.date)}
                    className={`p-2.5 rounded-xl border text-left flex flex-col justify-between h-18 transition-all relative ${colorClasses} ${isSelected ? 'ring-2 ring-primary shadow-sm font-bold scale-[1.02]' : ''}`}
                  >
                    <div className="flex justify-between items-center w-full">
                      <span className="font-bold text-sm">{dateNum}</span>
                      <Badge variant="outline" className="text-[9px] px-1.5 py-0 h-4 border-current opacity-80">
                        {day.status}
                      </Badge>
                    </div>
                    <div className="text-[11px] font-medium">
                      <span>{day.total_jobs} Jobs</span> • <span>{day.efficiency}%</span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ─── 3. WORKER PERFORMANCE TABLE ─────────────────────────────── */}
        <div className="bg-card border border-border rounded-xl shadow-subtle overflow-hidden mb-6">
          <div className="p-4 border-b border-border bg-muted/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-semibold text-foreground text-sm">Worker Performance Table</h3>
              <p className="text-xs text-muted-foreground">Real-time productivity, today's job assignment, and working hours matrix.</p>
            </div>

            <div className="flex items-center gap-3">
              <Select value={String(pageSize)} onValueChange={(v) => { setPageSize(Number(v)); setPage(1); }}>
                <SelectTrigger className="h-8 text-xs rounded-lg w-28 bg-background border-border">
                  <SelectValue placeholder="Rows" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="10">10 Rows</SelectItem>
                  <SelectItem value="25">25 Rows</SelectItem>
                  <SelectItem value="50">50 Rows</SelectItem>
                  <SelectItem value="100">100 Rows</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/50 text-muted-foreground uppercase font-semibold text-[10px] tracking-wider border-b border-border sticky top-0">
                <tr>
                  <th className="p-3.5">Emp ID</th>
                  <th className="p-3.5">Worker</th>
                  <th className="p-3.5">Department</th>
                  <th className="p-3.5">Today's Assignment</th>
                  <th className="p-3.5">Supervisor</th>
                  <th className="p-3.5 text-center">Completed</th>
                  <th className="p-3.5 text-center">Running</th>
                  <th className="p-3.5 text-center">Pending</th>
                  <th className="p-3.5 text-right">Hours</th>
                  <th className="p-3.5 text-right">OT</th>
                  <th className="p-3.5 text-right">Efficiency</th>
                  <th className="p-3.5 text-center">Status</th>
                  <th className="p-3.5 text-center">Action</th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border/60">
                {isWorkersLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      <td colSpan={13} className="p-3.5"><Skeleton className="h-6 w-full rounded-lg" /></td>
                    </tr>
                  ))
                ) : (workersTableData?.items || []).length === 0 ? (
                  <tr>
                    <td colSpan={13} className="p-8 text-center text-muted-foreground font-medium">
                      No worker performance records found for this date.
                    </td>
                  </tr>
                ) : (
                  workersTableData.items.map((worker: any) => (
                    <tr 
                      key={worker.id}
                      onClick={() => setSelectedWorkerId(worker.id)}
                      className="hover:bg-muted/30 transition-colors cursor-pointer"
                    >
                      <td className="p-3.5 font-mono font-semibold text-primary">{worker.employeeId}</td>
                      <td className="p-3.5 font-semibold text-foreground flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-muted flex items-center justify-center text-[10px] font-bold overflow-hidden">
                          {worker.photo ? <img src={worker.photo} alt={worker.name} className="w-full h-full object-cover" /> : worker.name.slice(0, 2).toUpperCase()}
                        </div>
                        <span>{worker.name}</span>
                      </td>
                      <td className="p-3.5 text-muted-foreground">{worker.department}</td>
                      <td className="p-3.5 font-semibold text-foreground">
                        <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 text-[10px]">
                          {worker.todayAssignment}
                        </Badge>
                      </td>
                      <td className="p-3.5 text-muted-foreground">{worker.supervisor}</td>
                      <td className="p-3.5 text-center font-bold text-emerald-600">{worker.completedJobs}</td>
                      <td className="p-3.5 text-center font-bold text-primary">{worker.runningJobs}</td>
                      <td className="p-3.5 text-center font-bold text-amber-600">{worker.pendingJobs}</td>
                      <td className="p-3.5 text-right font-semibold">{worker.workingHours}h</td>
                      <td className="p-3.5 text-right text-muted-foreground">{worker.overtime}h</td>
                      <td className="p-3.5 text-right font-bold">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] ${worker.efficiency >= 90 ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : worker.efficiency >= 70 ? 'bg-amber-500/15 text-amber-600 dark:text-amber-400' : 'bg-destructive/15 text-destructive'}`}>
                          {worker.efficiency}%
                        </span>
                      </td>
                      <td className="p-3.5 text-center">
                        <Badge className={`text-[10px] ${worker.attendanceStatus === 'Present' ? 'bg-emerald-500 text-white' : worker.attendanceStatus === 'Half Day' ? 'bg-amber-500 text-white' : 'bg-muted text-muted-foreground'}`}>
                          {worker.attendanceStatus}
                        </Badge>
                      </td>
                      <td className="p-3.5 text-center">
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0 rounded-lg" onClick={(e) => { e.stopPropagation(); setSelectedWorkerId(worker.id); }}>
                          <Eye size={15} className="text-muted-foreground hover:text-primary" />
                        </Button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination Controls */}
          <div className="p-4 border-t border-border bg-muted/10 flex items-center justify-between text-xs text-muted-foreground font-medium">
            <span>Showing {workersTableData?.items?.length || 0} of {workersTableData?.total_count || 0} Workers</span>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(page - 1)} className="rounded-lg h-8 text-xs">
                <ChevronLeft size={14} className="mr-1" /> Previous
              </Button>
              <span>Page {page}</span>
              <Button variant="outline" size="sm" disabled={(page * pageSize) >= (workersTableData?.total_count || 0)} onClick={() => setPage(page + 1)} className="rounded-lg h-8 text-xs">
                Next <ChevronRight size={14} className="ml-1" />
              </Button>
            </div>
          </div>
        </div>

        {/* ─── 4. ANALYTICS & CHARTS ──────────────────────────────────────── */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Department Performance Bar Chart */}
          <div className="bg-card border border-border rounded-xl shadow-subtle p-5">
            <h3 className="font-semibold text-sm mb-4 text-foreground flex items-center gap-2">
              <BarChart3 size={16} className="text-primary" /> Department Efficiency Breakdown
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={analyticsData.departmentPerformance || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis fontSize={11} tickLine={false} axisLine={false} unit="%" />
                  <Tooltip cursor={{ fill: 'transparent' }} />
                  <Bar dataKey="efficiency" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Weekly Trends Line Chart */}
          <div className="bg-card border border-border rounded-xl shadow-subtle p-5">
            <h3 className="font-semibold text-sm mb-4 text-foreground flex items-center gap-2">
              <TrendingUp size={16} className="text-emerald-500" /> Weekly Efficiency Trend
            </h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={analyticsData.weeklyTrends || []}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="name" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis fontSize={11} tickLine={false} axisLine={false} unit="%" />
                  <Tooltip />
                  <Line type="monotone" dataKey="efficiency" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

      {/* ─── 5. WORKER DETAIL DRAWER (RIGHT-SIDE SHEET) ───────────────────── */}
      <Sheet open={selectedWorkerId !== null} onOpenChange={(open) => !open && setSelectedWorkerId(null)}>
        <SheetContent side="right" className="w-full sm:max-w-xl p-0 bg-background border-l border-border overflow-y-auto">
          {isDetailLoading ? (
            <div className="p-8 space-y-4"><Skeleton className="h-10 w-full" /><Skeleton className="h-40 w-full" /></div>
          ) : workerDetailData ? (
            <div className="flex flex-col h-full">
              {/* Drawer Header */}
              <div className="p-6 bg-muted/30 border-b border-border">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-primary text-primary-foreground flex items-center justify-center font-bold text-lg shadow-sm">
                    {workerDetailData.overview.photo ? <img src={workerDetailData.overview.photo} alt="Worker" className="w-full h-full object-cover rounded-xl" /> : "EMP"}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-foreground">Worker Profile & Analytics</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Date: {selectedDate}</p>
                  </div>
                </div>
              </div>

              {/* Tabs inside Drawer */}
              <Tabs defaultValue="overview" className="flex-1 p-6 flex flex-col">
                <TabsList className="grid grid-cols-4 bg-muted p-1 rounded-xl mb-5">
                  <TabsTrigger value="overview" className="text-xs font-semibold rounded-lg">Overview</TabsTrigger>
                  <TabsTrigger value="jobs" className="text-xs font-semibold rounded-lg">Jobs</TabsTrigger>
                  <TabsTrigger value="timeline" className="text-xs font-semibold rounded-lg">Timeline</TabsTrigger>
                  <TabsTrigger value="history" className="text-xs font-semibold rounded-lg">History</TabsTrigger>
                </TabsList>

                {/* TAB 1: OVERVIEW */}
                <TabsContent value="overview" className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 rounded-xl bg-card border border-border">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase">Attendance Status</p>
                      <p className="text-lg font-bold text-foreground mt-1">{workerDetailData.overview.status}</p>
                    </div>
                    <div className="p-4 rounded-xl bg-primary/5 border border-primary/20">
                      <p className="text-[10px] font-semibold text-primary uppercase">Productivity Score</p>
                      <p className="text-lg font-bold text-primary mt-1">{workerDetailData.overview.productivityScore} / 100</p>
                    </div>
                    <div className="p-4 rounded-xl bg-card border border-border">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase">Working Hours</p>
                      <p className="text-lg font-bold text-foreground mt-1">{workerDetailData.overview.workingHours} hrs</p>
                    </div>
                    <div className="p-4 rounded-xl bg-card border border-border">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase">Overtime</p>
                      <p className="text-lg font-bold text-foreground mt-1">{workerDetailData.overview.overtime} hrs</p>
                    </div>
                  </div>

                  {/* Supervisor Approval & Remarks */}
                  <div className="p-4 rounded-xl border border-border bg-card space-y-3 mt-4">
                    <h4 className="font-semibold text-xs text-foreground">Supervisor Remarks & Approval</h4>
                    <Input 
                      placeholder="Enter supervisor performance notes..."
                      value={supervisorRemarks}
                      onChange={(e) => setSupervisorRemarks(e.target.value)}
                      className="text-xs rounded-lg bg-background"
                    />
                    <Button 
                      size="sm" 
                      className="w-full rounded-lg font-semibold"
                      onClick={handleApprovePerformance}
                      disabled={isApproving}
                    >
                      <Check size={14} className="mr-1.5" /> Approve Worker Performance
                    </Button>
                  </div>
                </TabsContent>

                {/* TAB 2: TODAY'S JOBS */}
                <TabsContent value="jobs" className="space-y-3">
                  {(workerDetailData.todayJobs || []).length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-6">No job records found for this date.</p>
                  ) : (
                    workerDetailData.todayJobs.map((j: any) => (
                      <div key={j.id} className="p-4 rounded-xl border border-border bg-card space-y-2">
                        <div className="flex justify-between items-start">
                          <h4 className="font-semibold text-sm text-foreground">{j.name}</h4>
                          <Badge variant="outline" className="text-[10px] capitalize">{j.status.replace("_", " ")}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">Duration: {j.duration} mins • Started: {j.startedTime}</p>
                      </div>
                    ))
                  )}
                </TabsContent>

                {/* TAB 3: TIMELINE */}
                <TabsContent value="timeline" className="space-y-4">
                  <div className="relative border-l-2 border-border ml-3 pl-4 space-y-4">
                    {(workerDetailData.timeline || []).map((t: any, idx: number) => (
                      <div key={idx} className="relative">
                        <div className="absolute -left-[23px] top-1 w-3 h-3 rounded-full bg-primary border-2 border-background" />
                        <p className="text-xs font-bold text-primary">{t.time}</p>
                        <p className="text-xs font-semibold text-foreground">{t.title}</p>
                        <p className="text-[11px] text-muted-foreground">{t.description}</p>
                      </div>
                    ))}
                  </div>
                </TabsContent>

                {/* TAB 4: PERFORMANCE HISTORY */}
                <TabsContent value="history" className="space-y-3">
                  <div className="flex justify-end gap-2 mb-3">
                    <Button size="sm" variant={historyDays === 7 ? "default" : "outline"} onClick={() => setHistoryDays(7)} className="h-7 text-[10px]">7 Days</Button>
                    <Button size="sm" variant={historyDays === 30 ? "default" : "outline"} onClick={() => setHistoryDays(30)} className="h-7 text-[10px]">30 Days</Button>
                    <Button size="sm" variant={historyDays === 90 ? "default" : "outline"} onClick={() => setHistoryDays(90)} className="h-7 text-[10px]">90 Days</Button>
                  </div>

                  <div className="space-y-2">
                    {(workerDetailData.history || []).map((h: any) => (
                      <div key={h.date} className="p-3 rounded-xl border border-border bg-card flex items-center justify-between text-xs">
                        <span className="font-semibold text-foreground">{h.date}</span>
                        <span className="text-muted-foreground">{h.workingHours} hrs</span>
                        <span className="font-bold text-emerald-600">{h.efficiency}% Eff</span>
                      </div>
                    ))}
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          ) : null}
        </SheetContent>
      </Sheet>
    </div>
  );
}
