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
        ? dayItem.is_sunday ? "Sunday Work" : "Present"
        : dayItem.status
    );
    setEditPunchIn(dayItem.punch_in || "09:30");
    setEditPunchOut(dayItem.punch_out || "18:30");
    setEditWorkingHours(dayItem.net_working_hours || (dayItem.status === "Half Day" ? 4.5 : 8.0));
    setEditOtHours(dayItem.ot_hours || 0);
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
        <DialogHeader className="px-6 py-4 border-b border-border bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
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
          <div className="flex items-center gap-2">
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
                {isLoadingSummary ? "..." : `${monthSummary?.ot_hours || 0}h`}
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
                      } else if (isSunday && dayItem.status === "Sunday") {
                        statusBadge = (
                          <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-500/30 font-bold">
                            Sunday
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
                          <td className="py-2.5 px-3 font-mono">
                            {dayItem.punch_in || "--:--"}
                          </td>
                          <td className="py-2.5 px-3 font-mono">
                            {dayItem.punch_out || "--:--"}
                          </td>
                          <td className="py-2.5 px-3 font-bold">
                            {dayItem.net_working_hours > 0 ? `${dayItem.net_working_hours}h` : "-"}
                          </td>
                          <td className="py-2.5 px-3 font-bold text-purple-600">
                            {dayItem.ot_hours > 0 ? `${dayItem.ot_hours}h` : "-"}
                          </td>
                          <td className="py-2.5 px-3">
                            {dayItem.is_sunday ? (
                              <span className="text-[10px] bg-purple-100 text-purple-700 px-1.5 py-0.5 rounded font-bold">
                                Yes
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-[10px]">No</span>
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
                    if (val === "Sunday Work") setEditIsSunday(true);
                    if (val === "Half Day") setEditWorkingHours(4.5);
                    if (val === "Present") setEditWorkingHours(8.0);
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
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Punch In Time</Label>
                  <Input
                    type="time"
                    value={editPunchIn}
                    onChange={(e) => setEditPunchIn(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold">Punch Out Time</Label>
                  <Input
                    type="time"
                    value={editPunchOut}
                    onChange={(e) => setEditPunchOut(e.target.value)}
                    className="h-9 text-xs"
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
                    className="h-9 text-xs"
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

              {/* Sunday Work Checkbox */}
              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="sundayWorkCheck"
                  checked={editIsSunday}
                  onChange={(e) => setEditIsSunday(e.target.checked)}
                  className="w-4 h-4 rounded text-primary border-border focus:ring-primary"
                />
                <Label htmlFor="sundayWorkCheck" className="text-xs font-bold cursor-pointer">
                  Mark as Sunday Work (Double / Overtime Day)
                </Label>
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
