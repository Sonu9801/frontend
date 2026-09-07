"use client";

import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { attendanceApi } from "@/lib/api";
import type { Worker } from "@/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import {
  CalendarDays,
  Clock,
  User,
  Edit2,
  CheckCircle2,
  XCircle,
  TrendingUp,
  Sun,
  Calendar,
  Save,
  RotateCcw,
} from "lucide-react";
import { format } from "date-fns";

export interface EmployeeMonthlyAttendanceModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  worker: Worker | null;
}

const formatTime12h = (timeStr: string | null) => {
  if (!timeStr || timeStr === "--:--" || !timeStr.trim()) return "--:--";
  if (timeStr.toUpperCase().includes("AM") || timeStr.toUpperCase().includes("PM")) return timeStr;
  try {
    const parts = timeStr.split(":");
    let h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m)) return timeStr;
    const ampm = h >= 12 ? "PM" : "AM";
    h = h % 12;
    if (h === 0) h = 12;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")} ${ampm}`;
  } catch {
    return timeStr;
  }
};

const to24hTime = (timeStr: string | null) => {
  if (!timeStr || timeStr === "--:--" || !timeStr.trim()) return "09:30";
  timeStr = timeStr.trim();
  if (timeStr.toUpperCase().includes("AM") || timeStr.toUpperCase().includes("PM")) {
    try {
      const parts = timeStr.split(" ");
      const timeParts = parts[0].split(":");
      let h = parseInt(timeParts[0], 10);
      const m = parseInt(timeParts[1], 10);
      const isPm = parts[1].toUpperCase() === "PM";
      if (isPm && h < 12) h += 12;
      if (!isPm && h === 12) h = 0;
      return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    } catch {
      return "09:30";
    }
  }
  return timeStr;
};

interface TimeInput12hProps {
  value24: string;
  onChange: (val24: string) => void;
}

function TimeInput12h({ value24, onChange }: TimeInput12hProps) {
  const parseVal = (str: string) => {
    if (!str || !str.includes(":")) {
      return { h12: "09", min: "30", ampm: "AM" };
    }
    const [hStr, mStr] = str.split(":");
    let h = parseInt(hStr, 10);
    const m = parseInt(mStr, 10);
    if (isNaN(h)) h = 9;
    const minVal = isNaN(m) ? "00" : String(m).padStart(2, "0");
    const ampmVal = h >= 12 ? "PM" : "AM";
    let h12 = h % 12;
    if (h12 === 0) h12 = 12;
    const h12Str = String(h12).padStart(2, "0");
    return { h12: h12Str, min: minVal, ampm: ampmVal };
  };

  const { h12, min, ampm } = parseVal(value24);

  const update = (newH12: string, newMin: string, newAmPm: string) => {
    let h = parseInt(newH12, 10);
    if (isNaN(h)) h = 12;
    if (newAmPm === "PM" && h < 12) {
      h += 12;
    } else if (newAmPm === "AM" && h === 12) {
      h = 0;
    }
    const h24Str = String(h).padStart(2, "0");
    const mStr = String(parseInt(newMin, 10) || 0).padStart(2, "0");
    onChange(`${h24Str}:${mStr}`);
  };

  const hoursList = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];
  const minutesList = ["00", "05", "10", "15", "20", "25", "30", "35", "40", "45", "50", "55"];

  return (
    <div className="flex items-center gap-1.5 bg-background border border-input rounded-xl px-2 py-1 h-10 shadow-xs w-full">
      <div className="flex items-center gap-1 flex-1">
        <select
          value={h12}
          onChange={(e) => update(e.target.value, min, ampm)}
          className="h-8 px-1 text-xs font-extrabold bg-muted/30 border border-border rounded-lg text-foreground focus:outline-none cursor-pointer text-center"
        >
          {hoursList.map((h) => (
            <option key={h} value={h} className="bg-popover text-popover-foreground font-bold">
              {h}
            </option>
          ))}
        </select>

        <span className="text-xs font-extrabold text-muted-foreground select-none">:</span>

        <select
          value={minutesList.includes(min) ? min : min}
          onChange={(e) => update(h12, e.target.value, ampm)}
          className="h-8 px-1 text-xs font-extrabold bg-muted/30 border border-border rounded-lg text-foreground focus:outline-none cursor-pointer text-center"
        >
          {!minutesList.includes(min) && (
            <option value={min} className="bg-popover text-popover-foreground font-bold">
              {min}
            </option>
          )}
          {minutesList.map((m) => (
            <option key={m} value={m} className="bg-popover text-popover-foreground font-bold">
              {m}
            </option>
          ))}
        </select>
      </div>

      <div className="flex rounded-lg border border-border overflow-hidden p-0.5 bg-muted/50 shrink-0">
        <button
          type="button"
          onClick={() => update(h12, min, "AM")}
          className={`px-2.5 py-1 text-[11px] font-black rounded-md transition-all ${
            ampm === "AM"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          AM
        </button>
        <button
          type="button"
          onClick={() => update(h12, min, "PM")}
          className={`px-2.5 py-1 text-[11px] font-black rounded-md transition-all ${
            ampm === "PM"
              ? "bg-primary text-primary-foreground shadow-xs"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          PM
        </button>
      </div>
    </div>
  );
}

const calcOtAndWorking = (in24: string, out24: string) => {
  if (!in24 || !out24 || !in24.includes(":") || !out24.includes(":")) {
    return { workingHours: 8.0, otHours: 0.0 };
  }
  const [inH, inM] = in24.split(":").map(Number);
  const [outH, outM] = out24.split(":").map(Number);
  if (isNaN(inH) || isNaN(outH)) return { workingHours: 8.0, otHours: 0.0 };

  const inMins = inH * 60 + (inM || 0);
  const outMins = outH * 60 + (outM || 0);

  if (outMins <= inMins) return { workingHours: 8.0, otHours: 0.0 };

  // OT ONLY calculates if checkout is at or after 18:30 (6:30 PM threshold)
  const minOtMins = 18 * 60 + 30; // 18:30 (6:30 PM)
  const shiftEndMins = 18 * 60; // 18:00 (6:00 PM)

  let otHrs = 0.0;
  if (outMins >= minOtMins) {
    const otMins = outMins - shiftEndMins;
    otHrs = Math.max(0, Math.round((otMins / 60.0) * 10) / 10);
  }

  return {
    workingHours: 8.0,
    otHours: otHrs
  };
};

export default function EmployeeMonthlyAttendanceModal({
  open,
  onOpenChange,
  worker,
}: EmployeeMonthlyAttendanceModalProps) {
  const queryClient = useQueryClient();
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthStr);

  // Edit Day state
  const [editingDay, setEditingDay] = useState<any | null>(null);
  const [editStatus, setEditStatus] = useState<string>("Present");
  const [editPunchIn, setEditPunchIn] = useState<string>("");
  const [editPunchOut, setEditPunchOut] = useState<string>("");
  const [editWorkingHours, setEditWorkingHours] = useState<number>(8.0);
  const [editOtHours, setEditOtHours] = useState<number>(0);
  const [editIsSunday, setEditIsSunday] = useState<boolean>(false);
  const [editReason, setEditReason] = useState<string>("Manual Manager Edit");

  // Fetch full month logs for worker
  const { data: monthLogs, isLoading: isLoadingLogs } = useQuery({
    queryKey: ["worker-full-month-logs", worker?.id, selectedMonth],
    queryFn: () => attendanceApi.getWorkerFullMonthLogs(worker!.id, selectedMonth),
    enabled: !!worker?.id && open,
  });

  // Fetch monthly summary for worker
  const { data: monthSummary, isLoading: isLoadingSummary } = useQuery({
    queryKey: ["worker-monthly-summary-modal", worker?.id, selectedMonth],
    queryFn: () => attendanceApi.getWorkerMonthlySummary(worker!.id, selectedMonth),
    enabled: !!worker?.id && open,
  });

  // Mutation to mark/update attendance day
  const markDayMutation = useMutation({
    mutationFn: (data: any) => attendanceApi.markDayAttendance(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["worker-full-month-logs", worker?.id] });
      queryClient.invalidateQueries({ queryKey: ["worker-monthly-summary-modal", worker?.id] });
      queryClient.invalidateQueries({ queryKey: ["attendanceLogs"] });
      queryClient.invalidateQueries({ queryKey: ["attendanceAnalytics"] });
      queryClient.invalidateQueries({ queryKey: ["workerHistory"] });
      queryClient.invalidateQueries({ queryKey: ["workerMonthlySummary"] });
      toast.success(`Attendance updated for ${editingDay?.date}!`);
      setEditingDay(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || "Failed to update attendance");
    },
  });

  const handleOpenEditDay = (dayItem: any) => {
    setEditingDay(dayItem);
    setEditStatus(
      dayItem.status === "Not Punched" || dayItem.status === "Upcoming" || dayItem.status === "Sunday"
        ? dayItem.is_sunday ? "Sunday Work" : (dayItem.is_calendar_sunday || dayItem.day_name === "Sun" ? "Holiday" : "Present")
        : dayItem.status
    );
    const inStr = dayItem.punch_in_24 || to24hTime(dayItem.punch_in) || "09:30";
    const outStr = dayItem.punch_out_24 || to24hTime(dayItem.punch_out) || "18:00";
    setEditPunchIn(inStr);
    setEditPunchOut(outStr);

    const calculated = calcOtAndWorking(inStr, outStr);
    setEditWorkingHours(dayItem.net_working_hours > 0 ? dayItem.net_working_hours : calculated.workingHours);
    setEditOtHours(dayItem.ot_hours > 0 ? dayItem.ot_hours : calculated.otHours);
    setEditIsSunday(Boolean(dayItem.is_sunday));
    setEditReason("Manual Edit by Manager");
  };

  const handleSaveDayEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!worker || !editingDay) return;

    markDayMutation.mutate({
      worker_id: worker.id,
      date: editingDay.date,
      status: editStatus,
      punch_in_time: editPunchIn,
      punch_out_time: editPunchOut,
      net_working_hours: Number(editWorkingHours) || 0,
      ot_hours: Number(editOtHours) || 0,
      is_sunday: editIsSunday,
      reason: editReason,
    });
  };

  if (!worker) return null;

  const logs = monthLogs || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-4xl max-h-[92vh] flex flex-col p-0 overflow-hidden rounded-2xl">
        {/* Modal Header */}
        <DialogHeader className="px-6 py-4 sm:pr-14 border-b border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-lg font-bold">
              {worker.name.charAt(0)}
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-foreground flex items-center gap-2">
                {worker.name}
              </DialogTitle>
              <p className="text-xs text-muted-foreground">
                {worker.employeeId || worker.employee_id} • {worker.department} • {worker.role}
              </p>
            </div>
          </div>

          {/* Month Selector */}
          <div className="flex items-center gap-2 sm:mr-2">
            <Label className="text-xs font-bold text-muted-foreground">Month:</Label>
            <select
              value={selectedMonth}
              onChange={(e) => setSelectedMonth(e.target.value)}
              className="h-9 px-3 text-xs font-bold bg-muted/60 border border-border rounded-xl text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 cursor-pointer"
            >
              {[0, 1, 2, 3, 4, 5, 6].map((offset) => {
                const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
                const val = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
                const label = format(d, "MMMM yyyy");
                return (
                  <option key={val} value={val}>
                    {label}
                  </option>
                );
              })}
            </select>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Monthly KPI Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
            <div className="bg-card border border-border p-3 rounded-xl shadow-xs">
              <p className="text-[10px] uppercase font-bold text-muted-foreground">Present Days</p>
              <p className="text-xl font-extrabold text-emerald-600 mt-0.5">
                {isLoadingSummary ? "..." : monthSummary?.present_days || 0}
              </p>
            </div>

            <div className="bg-card border border-border p-3 rounded-xl shadow-xs">
              <p className="text-[10px] uppercase font-bold text-muted-foreground">Absent Days</p>
              <p className="text-xl font-extrabold text-destructive mt-0.5">
                {isLoadingSummary ? "..." : monthSummary?.absent_days || 0}
              </p>
            </div>

            <div className="bg-card border border-border p-3 rounded-xl shadow-xs">
              <p className="text-[10px] uppercase font-bold text-muted-foreground">Half Days / Leaves</p>
              <p className="text-xl font-extrabold text-warning mt-0.5">
                {isLoadingSummary ? "..." : (monthSummary?.half_days || 0) + (monthSummary?.leave_days || 0)}
              </p>
            </div>

            <div className="bg-card border border-border p-3 rounded-xl shadow-xs">
              <p className="text-[10px] uppercase font-bold text-muted-foreground">OT Hours</p>
              <p className="text-xl font-extrabold text-purple-600 mt-0.5">
                {isLoadingSummary ? "..." : `${monthSummary?.ot_hours ? Number(monthSummary.ot_hours).toFixed(1).replace(/\.0$/, "") : 0}h`}
              </p>
            </div>

            <div className="bg-card border border-border p-3 rounded-xl shadow-xs">
              <p className="text-[10px] uppercase font-bold text-muted-foreground">Sunday Work</p>
              <p className="text-xl font-extrabold text-blue-600 mt-0.5">
                {isLoadingSummary ? "..." : `${monthSummary?.sunday_work || 0} day(s)`}
              </p>
            </div>

            <div className="bg-card border border-border p-3 rounded-xl shadow-xs">
              <p className="text-[10px] uppercase font-bold text-muted-foreground">Attendance %</p>
              <p className="text-xl font-extrabold text-primary mt-0.5">
                {isLoadingSummary ? "..." : `${monthSummary?.net_attendance_percent || 0}%`}
              </p>
            </div>
          </div>

          {/* Day-by-Day Monthly Attendance Table */}
          <div className="bg-card border border-border rounded-xl overflow-hidden shadow-sm">
            <div className="px-4 py-3 bg-muted/30 border-b border-border flex items-center justify-between">
              <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
                <CalendarDays size={16} className="text-primary" />
                Full Month Attendance Sheet ({logs.length} Days)
              </h3>
              <span className="text-xs text-muted-foreground italic">
                Click "Edit" on any day row to update In/Out time, OT, or Sunday Work
              </span>
            </div>

            {isLoadingLogs ? (
              <div className="p-8 text-center text-xs text-muted-foreground animate-pulse">
                Loading full month attendance logs...
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/50 border-b border-border text-[11px] font-bold uppercase text-muted-foreground">
                    <tr>
                      <th className="py-2.5 px-3">Date & Day</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">In Time</th>
                      <th className="py-2.5 px-3">Out Time</th>
                      <th className="py-2.5 px-3">Working Hours</th>
                      <th className="py-2.5 px-3">OT Hours</th>
                      <th className="py-2.5 px-3">Sunday Work</th>
                      <th className="py-2.5 px-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {logs.map((dayItem: any) => {
                      const isSunday = dayItem.day_name === "Sun" || dayItem.is_sunday;
                      const dateObj = new Date(dayItem.date);
                      const formattedDate = format(dateObj, "dd MMM (EEE)");

                      let statusBadge = (
                        <Badge variant="outline" className="bg-muted text-muted-foreground">
                          {dayItem.status}
                        </Badge>
                      );

                      if (dayItem.status === "Present") {
                        statusBadge = (
                          <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/30 font-bold">
                            Present
                          </Badge>
                        );
                      } else if (dayItem.status === "Absent") {
                        statusBadge = (
                          <Badge variant="outline" className="bg-destructive/10 text-destructive border-destructive/30 font-bold">
                            Absent
                          </Badge>
                        );
                      } else if (dayItem.status === "Half Day") {
                        statusBadge = (
                          <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30 font-bold">
                            Half Day
                          </Badge>
                        );
                      } else if (dayItem.status === "Sunday Work") {
                        statusBadge = (
                          <Badge variant="outline" className="bg-purple-500/10 text-purple-600 border-purple-500/30 font-bold">
                            Sunday Work
                          </Badge>
                        );
                      } else if (dayItem.status === "Holiday" || dayItem.status.startsWith("Holiday") || (isSunday && (dayItem.status === "Sunday" || !dayItem.has_record))) {
                        statusBadge = (
                          <Badge variant="outline" className="bg-indigo-500/10 text-indigo-600 border-indigo-500/30 font-bold">
                            {dayItem.status.startsWith("Holiday") ? dayItem.status : "Holiday"}
                          </Badge>
                        );
                      }

                      return (
                        <tr
                          key={dayItem.date}
                          className={`hover:bg-muted/30 transition-colors ${
                            isSunday ? "bg-blue-500/5 font-semibold" : ""
                          }`}
                        >
                          <td className="py-2.5 px-3 font-medium text-foreground">
                            {formattedDate}
                          </td>
                          <td className="py-2.5 px-3">{statusBadge}</td>
                          <td className="py-2.5 px-3 font-mono text-xs font-semibold">
                            {formatTime12h(dayItem.punch_in)}
                          </td>
                          <td className="py-2.5 px-3 font-mono text-xs font-semibold">
                            {formatTime12h(dayItem.punch_out)}
                          </td>
                          <td className="py-2.5 px-3 font-bold">
                            {dayItem.net_working_hours > 0 ? `${dayItem.net_working_hours}h` : "-"}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-purple-600">
                            {dayItem.ot_hours > 0 ? `${dayItem.ot_hours}h` : "-"}
                          </td>
                          <td className="py-2.5 px-3">
                            {dayItem.is_sunday ? (
                              <span className="text-[10px] bg-purple-500/15 text-purple-600 dark:text-purple-300 border border-purple-500/30 px-2 py-0.5 rounded-full font-bold">
                                Yes
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-[10px] font-medium">No</span>
                            )}
                          </td>
                          <td className="py-2.5 px-3 text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleOpenEditDay(dayItem)}
                              className="h-7 px-2 text-xs text-primary hover:bg-primary/10 rounded-lg gap-1"
                            >
                              <Edit2 size={12} />
                              Edit
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </DialogContent>

      {/* Edit Day Attendance Inner Dialog */}
      {editingDay && (
        <Dialog open={!!editingDay} onOpenChange={(open) => !open && setEditingDay(null)}>
          <DialogContent className="sm:max-w-md p-0 overflow-hidden rounded-2xl">
            <DialogHeader className="px-6 py-4 border-b border-border bg-muted/20">
              <DialogTitle className="text-base font-bold text-foreground flex items-center gap-2">
                <Edit2 size={16} className="text-primary" />
                Edit Attendance for {editingDay.date}
              </DialogTitle>
              <p className="text-xs text-muted-foreground">
                Employee: <strong className="text-foreground">{worker.name}</strong>
              </p>
            </DialogHeader>

            <form onSubmit={handleSaveDayEdit} className="p-6 space-y-4">
              {/* Status Selector */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Attendance Status</Label>
                <select
                  value={editStatus}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEditStatus(val);
                    if (val === "Absent" || val === "Leave" || val === "Holiday" || val === "Not Punched") {
                      setEditPunchIn("");
                      setEditPunchOut("");
                      setEditWorkingHours(0);
                      setEditOtHours(0);
                      setEditIsSunday(false);
                    } else if (val === "Sunday Work") {
                      setEditIsSunday(true);
                      setEditWorkingHours(8.0);
                    } else if (val === "Half Day") {
                      setEditWorkingHours(4.5);
                    } else if (val === "Present") {
                      setEditWorkingHours(8.0);
                    }
                  }}
                  className="w-full h-9 px-3 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 font-medium"
                >
                  <option value="Present">Present</option>
                  <option value="Absent">Absent</option>
                  <option value="Half Day">Half Day</option>
                  <option value="Leave">Leave</option>
                  <option value="Late">Late</option>
                  <option value="Sunday Work">Sunday Work</option>
                  <option value="Holiday">Holiday</option>
                </select>
              </div>

              {/* In Time & Out Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold flex items-center justify-between">
                    <span>Punch In Time</span>
                    <span className="text-[11px] font-mono text-primary font-bold">{formatTime12h(editPunchIn)}</span>
                  </Label>
                  <TimeInput12h
                    value24={editPunchIn}
                    onChange={(newIn) => {
                      setEditPunchIn(newIn);
                      const calculated = calcOtAndWorking(newIn, editPunchOut);
                      setEditOtHours(calculated.otHours);
                    }}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label className="text-xs font-bold flex items-center justify-between">
                    <span>Punch Out Time</span>
                    <span className="text-[11px] font-mono text-primary font-bold">{formatTime12h(editPunchOut)}</span>
                  </Label>
                  <TimeInput12h
                    value24={editPunchOut}
                    onChange={(newOut) => {
                      setEditPunchOut(newOut);
                      const calculated = calcOtAndWorking(editPunchIn, newOut);
                      setEditOtHours(calculated.otHours);
                    }}
                  />
                </div>
              </div>

              {/* Working Hours & OT Hours */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Working Hours</Label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    max="24"
                    value={editWorkingHours}
                    onChange={(e) => setEditWorkingHours(Number(e.target.value))}
                    className="h-9 text-xs font-medium"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-purple-600">OT Hours (Overtime)</Label>
                  <Input
                    type="number"
                    step="0.5"
                    min="0"
                    max="24"
                    value={editOtHours}
                    onChange={(e) => setEditOtHours(Number(e.target.value))}
                    className="h-9 text-xs font-bold text-purple-600"
                  />
                </div>
              </div>

              {/* Sunday Work Selector (Yes / No) */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Sunday Work (Extra Shift / Pay)</Label>
                <select
                  value={editIsSunday ? "yes" : "no"}
                  onChange={(e) => {
                    const isYes = e.target.value === "yes";
                    setEditIsSunday(isYes);
                    if (isYes && (editStatus === "Holiday" || editStatus === "Sunday")) {
                      setEditStatus("Sunday Work");
                    }
                  }}
                  className="w-full h-9 px-3 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/40 font-bold"
                >
                  <option value="no">No (Regular Day / Normal Holiday)</option>
                  <option value="yes">Yes (Mark as Sunday Work)</option>
                </select>
              </div>

              {/* Reason */}
              <div className="space-y-1.5">
                <Label className="text-xs font-bold">Edit Reason / Remarks</Label>
                <Input
                  type="text"
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder="e.g. Approved OT by Manager"
                  className="h-9 text-xs"
                />
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setEditingDay(null)}
                  disabled={markDayMutation.isPending}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  disabled={markDayMutation.isPending}
                  className="bg-primary text-primary-foreground font-bold gap-1.5"
                >
                  <Save size={14} />
                  {markDayMutation.isPending ? "Saving..." : "Save Attendance"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </Dialog>
  );
}
