import React, { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { attendanceApi } from "@/lib/api";
import { format } from "date-fns";
import { Users, Clock, AlertCircle, CheckCircle2, Search, Filter, Phone, UserX, AlertTriangle, UserCheck, Calendar } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

interface AttendanceTabProps {
  activeUser: any;
  initialFilter?: "all" | "present" | "absent" | "late" | "half_day";
}

export function AttendanceTab({ activeUser, initialFilter = "all" }: AttendanceTabProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<"all" | "present" | "absent" | "late" | "half_day">(initialFilter);
  const [departmentFilter, setDepartmentFilter] = useState<string>("All");

  React.useEffect(() => {
    if (initialFilter) setActiveFilter(initialFilter);
  }, [initialFilter]);

  // Fetch Attendance Analytics
  const { data: analytics = {} } = useQuery({
    queryKey: ["attendanceAnalytics", activeUser?.id],
    queryFn: () => attendanceApi.getAnalytics(),
    refetchInterval: 30000,
  });

  // Fetch Today's Comprehensive Attendance Records
  const { data: todayRecords = [], isLoading } = useQuery({
    queryKey: ["todayAttendanceRecords", activeUser?.id],
    queryFn: () => attendanceApi.getTodayRecords(),
    refetchInterval: 30000,
  });

  // Unique Department List
  const departments = useMemo(() => {
    const set = new Set<string>();
    todayRecords.forEach((r: any) => {
      if (r.department) set.add(r.department);
    });
    return ["All", ...Array.from(set)];
  }, [todayRecords]);

  // Counts calculated directly from todayRecords for 100% precision
  const counts = useMemo(() => {
    let present = 0;
    let absent = 0;
    let late = 0;
    let halfDay = 0;

    todayRecords.forEach((r: any) => {
      const st = (r.status || "").toLowerCase();
      if (st === "present") present++;
      else if (st === "absent") absent++;
      else if (st === "late" || r.is_late) late++;
      else if (st === "half day" || st === "half_day") halfDay++;
    });

    return {
      total: todayRecords.length,
      present: analytics.present !== undefined ? analytics.present : present,
      absent: analytics.absent !== undefined ? analytics.absent : absent,
      late: analytics.late !== undefined ? analytics.late : late,
      half_day: analytics.half_day !== undefined ? analytics.half_day : halfDay,
    };
  }, [todayRecords, analytics]);

  // Filtered Employee Attendance List
  const filteredRecords = useMemo(() => {
    let list = todayRecords;

    // Search filter (Name, ID, Mobile, Department)
    if (searchQuery) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((r: any) =>
        (r.name || "").toLowerCase().includes(q) ||
        (r.employee_id || "").toLowerCase().includes(q) ||
        (r.department || "").toLowerCase().includes(q) ||
        (r.mobile_number || "").toLowerCase().includes(q)
      );
    }

    // Status filter
    if (activeFilter !== "all") {
      list = list.filter((r: any) => {
        const st = (r.status || "").toLowerCase();
        if (activeFilter === "present") return st === "present" || st === "late";
        if (activeFilter === "absent") return st === "absent";
        if (activeFilter === "late") return st === "late" || r.is_late;
        if (activeFilter === "half_day") return st === "half day" || st === "half_day";
        return true;
      });
    }

    // Department filter
    if (departmentFilter !== "All") {
      list = list.filter((r: any) => (r.department || "").toLowerCase() === departmentFilter.toLowerCase());
    }

    return list;
  }, [todayRecords, searchQuery, activeFilter, departmentFilter]);

  return (
    <div className="p-4 pb-24 animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto">
      {/* Header */}
      <div className="mb-6 flex justify-between items-start flex-wrap gap-2">
        <div>
          <h2 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-2">
            <Users className="text-indigo-600" size={26} />
            Team Attendance Status
          </h2>
          <p className="text-xs text-gray-500 font-semibold mt-1 flex items-center gap-1.5">
            <Calendar size={13} className="text-gray-400" />
            {format(new Date(), "EEEE, MMMM do, yyyy")}
          </p>
        </div>
        <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 font-bold text-xs py-1 px-3">
          Live Sync Active
        </Badge>
      </div>

      {/* KPI Cards (5 Clean Summary Boxes) */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        {/* Total Employees */}
        <div 
          onClick={() => setActiveFilter("all")}
          className={cn(
            "p-3.5 rounded-2xl border text-center transition-all cursor-pointer shadow-sm",
            activeFilter === "all"
              ? "bg-indigo-600 text-white border-indigo-600 shadow-indigo-600/20 shadow-md"
              : "bg-white dark:bg-zinc-900 border-gray-100 dark:border-zinc-800 hover:border-indigo-200"
          )}
        >
          <p className={cn("text-2xl font-black", activeFilter === "all" ? "text-white" : "text-indigo-600")}>
            {counts.total}
          </p>
          <p className={cn("text-[10px] font-extrabold uppercase tracking-wider mt-1", activeFilter === "all" ? "text-indigo-100" : "text-gray-500")}>
            Total Employees
          </p>
        </div>

        {/* Present */}
        <div 
          onClick={() => setActiveFilter("present")}
          className={cn(
            "p-3.5 rounded-2xl border text-center transition-all cursor-pointer shadow-sm",
            activeFilter === "present"
              ? "bg-emerald-600 text-white border-emerald-600 shadow-emerald-600/20 shadow-md"
              : "bg-emerald-50/60 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900/30 hover:border-emerald-300"
          )}
        >
          <p className={cn("text-2xl font-black", activeFilter === "present" ? "text-white" : "text-emerald-600 dark:text-emerald-400")}>
            {counts.present}
          </p>
          <p className={cn("text-[10px] font-extrabold uppercase tracking-wider mt-1", activeFilter === "present" ? "text-emerald-100" : "text-emerald-700 dark:text-emerald-400")}>
            Present Today
          </p>
        </div>

        {/* Absent */}
        <div 
          onClick={() => setActiveFilter("absent")}
          className={cn(
            "p-3.5 rounded-2xl border text-center transition-all cursor-pointer shadow-sm",
            activeFilter === "absent"
              ? "bg-red-600 text-white border-red-600 shadow-red-600/20 shadow-md"
              : "bg-red-50/60 dark:bg-red-950/30 border-red-100 dark:border-red-900/30 hover:border-red-300"
          )}
        >
          <p className={cn("text-2xl font-black", activeFilter === "absent" ? "text-white" : "text-red-600 dark:text-red-400")}>
            {counts.absent}
          </p>
          <p className={cn("text-[10px] font-extrabold uppercase tracking-wider mt-1", activeFilter === "absent" ? "text-red-100" : "text-red-700 dark:text-red-400")}>
            Absent Today
          </p>
        </div>

        {/* Late */}
        <div 
          onClick={() => setActiveFilter("late")}
          className={cn(
            "p-3.5 rounded-2xl border text-center transition-all cursor-pointer shadow-sm",
            activeFilter === "late"
              ? "bg-amber-600 text-white border-amber-600 shadow-amber-600/20 shadow-md"
              : "bg-amber-50/60 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900/30 hover:border-amber-300"
          )}
        >
          <p className={cn("text-2xl font-black", activeFilter === "late" ? "text-white" : "text-amber-600 dark:text-amber-400")}>
            {counts.late}
          </p>
          <p className={cn("text-[10px] font-extrabold uppercase tracking-wider mt-1", activeFilter === "late" ? "text-amber-100" : "text-amber-700 dark:text-amber-400")}>
            Late Arrival
          </p>
        </div>

        {/* Half Day */}
        <div 
          onClick={() => setActiveFilter("half_day")}
          className={cn(
            "p-3.5 rounded-2xl border text-center transition-all cursor-pointer shadow-sm",
            activeFilter === "half_day"
              ? "bg-yellow-600 text-white border-yellow-600 shadow-yellow-600/20 shadow-md"
              : "bg-yellow-50/60 dark:bg-yellow-950/30 border-yellow-100 dark:border-yellow-900/30 hover:border-yellow-300"
          )}
        >
          <p className={cn("text-2xl font-black", activeFilter === "half_day" ? "text-white" : "text-yellow-600 dark:text-yellow-400")}>
            {counts.half_day}
          </p>
          <p className={cn("text-[10px] font-extrabold uppercase tracking-wider mt-1", activeFilter === "half_day" ? "text-yellow-100" : "text-yellow-700 dark:text-yellow-400")}>
            Half Day
          </p>
        </div>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="space-y-3 mb-6">
        <div className="flex flex-col sm:flex-row gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
            <Input 
              placeholder="Search employee name, ID, or mobile..." 
              className="pl-10 bg-white dark:bg-zinc-900 border-gray-200 dark:border-zinc-800 rounded-xl h-11 text-xs"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Department Selector */}
          <div className="w-full sm:w-48">
            <select
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="w-full h-11 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl px-3 text-xs font-semibold text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-primary/40"
            >
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept === "All" ? "All Departments" : dept}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex overflow-x-auto pb-1 gap-2 hide-scrollbar">
          {[
            { id: "all", label: `All Employees (${counts.total})` },
            { id: "present", label: `Present (${counts.present})` },
            { id: "absent", label: `Absent (${counts.absent})` },
            { id: "late", label: `Late (${counts.late})` },
            { id: "half_day", label: `Half Day (${counts.half_day})` },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveFilter(tab.id as any)}
              className={cn(
                "whitespace-nowrap px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer",
                activeFilter === tab.id 
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-600/20" 
                  : "bg-white dark:bg-zinc-900 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-zinc-800 hover:border-gray-300"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Employee Attendance List */}
      <div className="space-y-3">
        {isLoading ? (
          [1, 2, 3, 4, 5].map((i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)
        ) : filteredRecords.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800">
            <UserX className="mx-auto text-gray-300 mb-2" size={40} />
            <p className="text-sm font-bold text-gray-600 dark:text-gray-300">No employees found matching filter criteria</p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setActiveFilter("all");
                setDepartmentFilter("All");
              }}
              className="mt-2 text-xs text-primary font-bold hover:underline"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          filteredRecords.map((r: any, idx: number) => {
            const statusLower = (r.status || "").toLowerCase();
            const isPresent = statusLower === "present";
            const isAbsent = statusLower === "absent";
            const isLate = statusLower === "late" || r.is_late;
            const isHalfDay = statusLower === "half day" || statusLower === "half_day";

            return (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.03 }}
                key={r.id}
                className="bg-white dark:bg-zinc-900 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-zinc-800 flex items-center justify-between gap-4 flex-wrap sm:flex-nowrap hover:border-indigo-100 dark:hover:border-zinc-700 transition-colors"
              >
                {/* Left: Avatar & Info */}
                <div className="flex items-center gap-3.5 min-w-0">
                  <div className="relative shrink-0">
                    <div className="w-12 h-12 rounded-2xl bg-gray-100 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 overflow-hidden flex items-center justify-center font-bold text-gray-600 dark:text-gray-300 text-base">
                      {r.profile_photo_url ? (
                        <img src={r.profile_photo_url} alt={r.name} className="w-full h-full object-cover" />
                      ) : (
                        (r.name || "E").charAt(0).toUpperCase()
                      )}
                    </div>
                    <span 
                      className={cn(
                        "absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-zinc-900",
                        isPresent && "bg-emerald-500",
                        isAbsent && "bg-red-500",
                        isLate && "bg-amber-500",
                        isHalfDay && "bg-yellow-500"
                      )} 
                    />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-extrabold text-sm text-gray-900 dark:text-white truncate">{r.name}</h4>
                      <span className="text-[10px] font-mono text-gray-400 font-bold bg-gray-50 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                        {r.employee_id}
                      </span>
                    </div>
                    <p className="text-xs text-gray-500 font-medium mt-0.5">
                      {r.department} &bull; <span className="text-gray-400">{r.designation}</span>
                    </p>
                  </div>
                </div>

                {/* Right: Timings & Status Badge */}
                <div className="flex items-center gap-4 ml-auto sm:ml-0">
                  {/* Punch Times */}
                  <div className="text-right hidden sm:block">
                    {r.punch_in ? (
                      <div className="text-xs font-bold text-gray-800 dark:text-gray-200 flex items-center justify-end gap-1">
                        <Clock size={12} className="text-emerald-500" />
                        <span>In: {r.punch_in}</span>
                        {r.punch_out && <span className="text-gray-400">| Out: {r.punch_out}</span>}
                      </div>
                    ) : (
                      <div className="text-xs text-gray-400 font-medium">No Punch Recorded</div>
                    )}
                    {r.working_hours > 0 && (
                      <div className="text-[10px] text-gray-400 font-semibold mt-0.5">
                        Hours: {r.working_hours} hrs
                      </div>
                    )}
                  </div>

                  {/* Status Badge */}
                  <div className="text-right">
                    <Badge 
                      variant="outline"
                      className={cn(
                        "text-xs font-bold px-3 py-1 uppercase tracking-wider rounded-xl",
                        isPresent && "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/40",
                        isAbsent && "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-400 dark:border-red-800/40",
                        isLate && "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/40",
                        isHalfDay && "bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-950/40 dark:text-yellow-400 dark:border-yellow-800/40"
                      )}
                    >
                      {isLate ? `Late (${r.late_minutes}m)` : r.status || "Absent"}
                    </Badge>
                  </div>

                  {/* Quick Call Button */}
                  {r.mobile_number && (
                    <a
                      href={`tel:${r.mobile_number}`}
                      className="w-9 h-9 rounded-xl bg-gray-50 hover:bg-indigo-50 text-gray-500 hover:text-indigo-600 dark:bg-zinc-800 dark:hover:bg-zinc-700 flex items-center justify-center transition-colors border border-gray-200 dark:border-zinc-700 shrink-0"
                      title={`Call ${r.name}`}
                    >
                      <Phone size={15} />
                    </a>
                  )}
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </div>
  );
}
