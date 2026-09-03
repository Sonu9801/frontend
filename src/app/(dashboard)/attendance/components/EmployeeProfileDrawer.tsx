import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { jobsApi, componentsApi, attendanceApi } from "@/lib/api";
import { Worker } from "@/types";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetClose } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { 
  User, Mail, Phone, Calendar, Clock, MapPin, 
  Briefcase, CheckCircle2, TrendingUp, CalendarDays,
  IndianRupee, X, Edit2, Image as ImageIcon
} from "lucide-react";
import { format, differenceInMinutes } from "date-fns";

interface EmployeeProfileDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  worker: Worker | null;
  onEditClick: (worker: Worker) => void;
  onOpenMonthlyAttendance?: (worker: Worker) => void;
}

export default function EmployeeProfileDrawer({ open, onOpenChange, worker, onEditClick, onOpenMonthlyAttendance }: EmployeeProfileDrawerProps) {
  const DetailItem = ({ icon: Icon, label, value }: any) => (
    <div className="flex items-start gap-3 py-3 border-b border-border/50 last:border-0">
      <Icon className="text-muted-foreground mt-0.5" size={16} />
      <div>
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <p className="text-sm text-foreground font-medium mt-0.5">{value || "N/A"}</p>
      </div>
    </div>
  );

  const { data: rawTasks, isLoading: isLoadingJobs } = useQuery({
    queryKey: ['worker-jobs-history', worker?.id],
    queryFn: () => componentsApi.getWorkerTasks(Number(worker!.id)),
    enabled: !!worker?.id && open,
  });

  const jobHistory = React.useMemo(() => {
    if (!rawTasks) return [];
    return rawTasks.filter((task: any) => task.status === 'completed');
  }, [rawTasks]);

  const { data: attendanceSummary, isLoading: isLoadingSummary } = useQuery({
    queryKey: ['worker-attendance-summary', worker?.id],
    queryFn: () => attendanceApi.getWorkerMonthlySummary(worker!.id),
    enabled: !!worker?.id && open,
  });

  const calculateEstSalary = () => {
    if (!attendanceSummary || !worker?.salaryProfile) return "N/A";
    let est = 0;
    const { present_days, half_days, ot_hours, sunday_work } = attendanceSummary;
    const sp = worker.salaryProfile;

    if (sp.salaryType === 'Monthly' && sp.monthlySalary) {
      const perDay = sp.monthlySalary / 30;
      est += (present_days + half_days * 0.5) * perDay;
    } else if (sp.salaryType === 'Daily' && sp.dailyWage) {
      est += (present_days + half_days * 0.5) * sp.dailyWage;
    }
    
    if (sp.otRatePerHour) est += ot_hours * sp.otRatePerHour;
    if (sp.sundayRatePerHour) est += sunday_work * sp.sundayRatePerHour;
    
    return est > 0 ? `₹${Math.round(est).toLocaleString()}` : "N/A";
  };

  const calculateDuration = (start?: string | null, end?: string | null) => {
    if (!start || !end) return "N/A";
    const mins = differenceInMinutes(new Date(end), new Date(start));
    if (mins < 60) return `${mins} mins`;
    const hrs = Math.floor(mins / 60);
    const remMins = mins % 60;
    return `${hrs}h ${remMins}m`;
  };

  const formatTime = (timeStr?: string | null) => {
    if (!timeStr) return "N/A";
    try {
      let str = String(timeStr).trim();
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?$/.test(str)) {
        str += "Z";
      }
      return format(new Date(str), "dd MMM yy, hh:mm a");
    } catch (e) {
      return timeStr;
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col h-full bg-card">
        <SheetHeader className="sr-only">
          <SheetTitle>Employee Profile</SheetTitle>
          <SheetDescription>Details of the selected employee</SheetDescription>
        </SheetHeader>
        {worker && (
          <>
            {/* Custom Header with Background */}
            <div className="relative h-32 bg-primary/10 flex-shrink-0">
              <div className="absolute -bottom-10 left-6">
                <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-3xl font-bold border-4 border-card shadow-sm">
                  {worker.name.charAt(0)}
                </div>
              </div>
            </div>

            <div className="px-6 pt-12 pb-4 border-b border-border flex-shrink-0 flex justify-between items-start">
              <div>
                <h2 className="text-xl font-bold text-foreground">{worker.name}</h2>
                <p className="text-sm text-muted-foreground">{worker.employeeId || worker.employee_id} • {worker.designation || worker.role}</p>
                <div className="flex gap-2 mt-3">
                  <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                    {worker.employmentStatus || worker.employment_status}
                  </Badge>
                  <Badge variant="outline" className="bg-muted">
                    {worker.department}
                  </Badge>
                </div>
              </div>
              <Button variant="outline" size="icon" onClick={() => { onOpenChange(false); onEditClick(worker); }}>
                <Edit2 size={16} />
              </Button>
            </div>

            <ScrollArea className="flex-1">
              <div className="p-6 flex flex-col gap-6">
                
                {/* Quick Stats Grid */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-muted/30 p-3 rounded-lg border border-border/50">
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5"><CalendarDays size={14}/> Attendance</p>
                    <p className="text-lg font-semibold mt-1">
                      {isLoadingSummary ? "..." : `${attendanceSummary?.net_attendance_percent || 0}%`}
                    </p>
                  </div>
                  <div className="bg-muted/30 p-3 rounded-lg border border-border/50">
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5"><Clock size={14}/> OT Hours</p>
                    <p className="text-lg font-semibold mt-1">
                      {isLoadingSummary ? "..." : `${attendanceSummary?.ot_hours || 0} hrs`}
                    </p>
                  </div>
                  <div className="bg-muted/30 p-3 rounded-lg border border-border/50">
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5"><TrendingUp size={14}/> Sunday Work</p>
                    <p className="text-lg font-semibold mt-1">
                      {isLoadingSummary ? "..." : `${attendanceSummary?.sunday_work || 0} day(s)`}
                    </p>
                  </div>
                  <div className="bg-muted/30 p-3 rounded-lg border border-border/50">
                    <p className="text-xs text-muted-foreground flex items-center gap-1.5"><IndianRupee size={14}/> Est. Salary</p>
                    <p className="text-lg font-semibold mt-1">
                      {isLoadingSummary ? "..." : calculateEstSalary()}
                    </p>
                  </div>
                </div>

                {/* Full Month Attendance Action Button */}
                <Button
                  variant="default"
                  onClick={() => {
                    onOpenChange(false);
                    if (onOpenMonthlyAttendance) onOpenMonthlyAttendance(worker);
                  }}
                  className="w-full bg-primary text-primary-foreground font-bold gap-2 py-2.5 rounded-xl shadow-sm"
                >
                  <CalendarDays size={18} />
                  View & Edit Full Month Attendance
                </Button>

                {/* Personal Details */}
                <div>
                  <h3 className="text-sm font-semibold mb-3">Personal Details</h3>
                  <div className="bg-muted/20 border border-border rounded-xl px-4 py-1">
                    <DetailItem icon={Phone} label="Mobile Number" value={worker.mobileNumber} />
                    <DetailItem icon={Mail} label="Email Address" value={worker.email} />
                    <DetailItem icon={Calendar} label="Date of Birth" value={worker.dateOfBirth} />
                    <DetailItem icon={User} label="Gender" value={worker.gender} />
                    <DetailItem icon={MapPin} label="Address" value={worker.address} />
                  </div>
                </div>

                {/* Work Details */}
                <div>
                  <h3 className="text-sm font-semibold mb-3">Work Details</h3>
                  <div className="bg-muted/20 border border-border rounded-xl px-4 py-1">
                    <DetailItem icon={Briefcase} label="Joining Date" value={worker.joiningDate} />
                    <DetailItem icon={Clock} label="Shift Details" value={`${worker.shiftType} (${worker.shiftStart} - ${worker.shiftEnd})`} />
                    <DetailItem icon={IndianRupee} label="Salary Config" value={worker.salaryProfile?.salaryType} />
                  </div>
                </div>

                {/* Face Registration */}
                <div className="bg-card border border-border rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${worker.faceRegistrationStatus === 'Completed' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-muted text-muted-foreground'}`}>
                      {worker.faceRegistrationStatus === 'Completed' ? <CheckCircle2 size={20} /> : <User size={20} />}
                    </div>
                    <div>
                      <p className="text-sm font-semibold">Face Registration</p>
                      <p className="text-xs text-muted-foreground">{worker.faceRegistrationStatus}</p>
                    </div>
                  </div>
                </div>

                {/* Job History & Proofs */}
                <div>
                  <h3 className="text-sm font-semibold mb-3">Job History & Proofs</h3>
                  {isLoadingJobs ? (
                    <p className="text-xs text-muted-foreground">Loading job history...</p>
                  ) : jobHistory && jobHistory.length > 0 ? (
                    <div className="space-y-3">
                      {jobHistory.map((job: any) => (
                        <div key={job.id} className="bg-muted/20 border border-border rounded-xl p-4">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <p className="text-sm font-semibold capitalize">{job.component_type.replace(/_/g, " ")}</p>
                              <p className="text-xs text-muted-foreground">{job.component_type.toLowerCase() === 'platform' ? 'Platform' : 'Ref'} No: {job.component_number}</p>
                            </div>
                            <Badge variant="outline" className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20">
                              Completed
                            </Badge>
                          </div>
                          {job.notes && (
                            <p className="text-xs text-foreground bg-muted/30 p-2 rounded-md mb-2 border border-border/50">
                              <span className="font-medium">Notes:</span> {job.notes}
                            </p>
                          )}
                          <div className="grid grid-cols-2 gap-2 mt-2 text-xs text-muted-foreground bg-card p-2 rounded-lg border border-border/50">
                            <div>
                              <span className="block font-medium">Start Time</span>
                              {formatTime(job.start_time)}
                            </div>
                            <div>
                              <span className="block font-medium">End Time</span>
                              {formatTime(job.end_time)}
                            </div>
                            <div className="col-span-2 pt-1 border-t border-border/50 mt-1">
                              <span className="font-medium text-foreground">Duration:</span> {calculateDuration(job.start_time, job.end_time)}
                            </div>
                          </div>
                          
                          {/* Proof Images */}
                          {(job.photo_proof_url || (job.photos && job.photos.length > 0)) && (
                            <div className="mt-4">
                              <p className="text-xs font-medium mb-2 flex items-center gap-1"><ImageIcon size={12}/> Proof Images</p>
                              <div className="flex flex-wrap gap-2">
                                {job.photo_proof_url && (
                                  <a href={job.photo_proof_url} target="_blank" rel="noreferrer" className="relative h-16 w-16 rounded-md overflow-hidden border border-border hover:opacity-80 transition-opacity">
                                    <img src={job.photo_proof_url} alt="Proof" className="object-cover w-full h-full" />
                                  </a>
                                )}
                                {job.photos?.map((photo: any) => (
                                  <a key={photo.id} href={photo.photo_url} target="_blank" rel="noreferrer" className="relative h-16 w-16 rounded-md overflow-hidden border border-border hover:opacity-80 transition-opacity">
                                    <img src={photo.photo_url} alt={photo.photo_type} className="object-cover w-full h-full" />
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-muted/20 border border-border border-dashed rounded-xl p-6 flex flex-col items-center justify-center text-center">
                      <Briefcase className="text-muted-foreground/50 mb-2" size={24} />
                      <p className="text-sm font-medium">No completed jobs</p>
                      <p className="text-xs text-muted-foreground mt-1">This worker hasn't completed any jobs yet.</p>
                    </div>
                  )}
                </div>

              </div>
            </ScrollArea>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
