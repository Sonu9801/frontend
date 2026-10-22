"use client";

import React, { useState, useMemo } from "react";
import type { ColumnDef } from "@/components/ui/DataTable";
import { DataTable } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  useWorkers,
  useVehicles,
  useAttendanceLogs,
  useUpdateWorker,
  useUpdateWorkerStatus,
  useArchiveWorker,
  useResetWorkerPassword,
  useCreateWorker,
  useDeleteWorker,
} from "@/hooks/useQueries";
import { Pagination } from "@/components/ui/Pagination";
import type { Worker, Vehicle } from "@/types";
import {
  Star,
  MoreHorizontal,
  Eye,
  Edit,
  History,
  Archive,
  PowerOff,
  KeyRound,
  Plus,
  Trash2,
  Briefcase,
  Image as ImageIcon,
  Search,
  ChevronDown,
  ChevronUp,
  Wrench,
  Download,
  Users,
  UserCheck,
  Clock,
  Activity,
  Layers,
  Sparkles,
  CheckCircle2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { useAuthStore } from "@/store/authStore";
import { AuditHistoryDrawer } from "@/components/shared/AuditHistoryDrawer";
import { ReasonPromptDialog } from "@/components/shared/ReasonPromptDialog";
import { useQuery } from "@tanstack/react-query";
import { componentsApi } from "@/lib/api";
import { format, differenceInMinutes } from "date-fns";
import { PageHeader } from "@/components/shared/PageHeader";
import { KPICard } from "@/components/ui/KPICard";
import EmployeeFormDrawer from "../attendance/components/EmployeeFormDrawer";
import { SelfAssignModal } from "@/app/workforce/components/SelfAssignModal";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const DEPARTMENTS = ["All", "Fabrication", "Paint", "Assembly", "Quality", "Dispatch"];
const STATUSES = ["All", "active", "break", "offline"];

export const getDeptStyle = (dept?: string) => {
  const d = (dept || "").toLowerCase();
  if (d.includes("fabricat")) {
    return {
      name: "Fabrication",
      icon: "⚡",
      badge: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/25",
      avatar: "bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30",
    };
  }
  if (d.includes("paint")) {
    return {
      name: "Paint Shop",
      icon: "🎨",
      badge: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/25",
      avatar: "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30",
    };
  }
  if (d.includes("assembl")) {
    return {
      name: "Assembly",
      icon: "🛠️",
      badge: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/25",
      avatar: "bg-teal-500/15 text-teal-600 dark:text-teal-400 border-teal-500/30",
    };
  }
  if (d.includes("qual") || d.includes("qc")) {
    return {
      name: "QC / Quality",
      icon: "🔍",
      badge: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25",
      avatar: "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30",
    };
  }
  if (d.includes("dispatch")) {
    return {
      name: "Dispatch",
      icon: "📦",
      badge: "bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/25",
      avatar: "bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30",
    };
  }
  return {
    name: dept || "Production",
    icon: "🏭",
    badge: "bg-slate-500/10 text-slate-600 dark:text-slate-400 border-slate-500/25",
    avatar: "bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30",
  };
};

function WorkerStatusBadge({ status }: { status?: string }) {
  const s = (status || "Active").toLowerCase();
  const isActive = s === "active" || s === "present";
  const isBreak = s === "break" || s === "half day";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-0.5 rounded-full capitalize border transition-all",
        isActive
          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/25 shadow-xs"
          : isBreak
            ? "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/25"
            : "bg-muted text-muted-foreground border-border",
      )}
    >
      <span
        className={cn(
          "w-1.5 h-1.5 rounded-full",
          isActive
            ? "bg-emerald-500 animate-pulse"
            : isBreak
              ? "bg-amber-500"
              : "bg-muted-foreground/40",
        )}
      />
      {isActive ? "Active Now" : isBreak ? "On Break" : "Offline"}
    </span>
  );
}

function ViewProfileDialog({
  open,
  onOpenChange,
  worker,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  worker: Worker | null;
}) {
  if (!worker) return null;
  const deptStyle = getDeptStyle(worker.department);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl overflow-y-auto max-h-[85vh] p-6 bg-card border border-border rounded-2xl shadow-xl">
        <DialogHeader className="border-b border-border pb-4 mb-4">
          <DialogTitle className="flex items-center gap-3">
            <div
              className={cn(
                "w-11 h-11 rounded-xl flex items-center justify-center font-bold text-base border shadow-2xs",
                deptStyle.avatar
              )}
            >
              {worker.name
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")}
            </div>
            <div>
              <p className="font-bold text-lg leading-tight text-foreground">{worker.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                <span>{deptStyle.icon}</span>
                <span>{worker.designation || "Operator"}</span>
                <span>•</span>
                <span>{worker.department || "Production"}</span>
              </p>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 text-sm">
          {/* Column 1: Primary Details */}
          <div className="space-y-3.5">
            <h4 className="text-xs font-bold text-primary uppercase tracking-wider">Primary Details</h4>
            <div className="flex justify-between border-b border-border/50 pb-1.5">
              <span className="text-muted-foreground">Employee ID</span>
              <span className="font-semibold text-foreground font-mono">{worker.employeeId}</span>
            </div>
            <div className="flex justify-between border-b border-border/50 pb-1.5">
              <span className="text-muted-foreground">Status</span>
              <span className="font-semibold text-foreground capitalize">{worker.status}</span>
            </div>
            <div className="flex justify-between border-b border-border/50 pb-1.5">
              <span className="text-muted-foreground">Employment Status</span>
              <span className="font-semibold text-foreground">{worker.employmentStatus || "Active"}</span>
            </div>
            <div className="flex justify-between border-b border-border/50 pb-1.5">
              <span className="text-muted-foreground">Role</span>
              <span className="font-semibold text-foreground">{worker.role}</span>
            </div>
            <div className="flex justify-between border-b border-border/50 pb-1.5">
              <span className="text-muted-foreground">Mobile Number</span>
              <span className="font-semibold text-foreground">{worker.mobileNumber || "—"}</span>
            </div>
            <div className="flex justify-between border-b border-border/50 pb-1.5">
              <span className="text-muted-foreground">Email</span>
              <span className="font-semibold text-foreground">{worker.email || "—"}</span>
            </div>
            <div className="flex justify-between border-b border-border/50 pb-1.5">
              <span className="text-muted-foreground">Joining Date</span>
              <span className="font-semibold text-foreground">{worker.joiningDate || "—"}</span>
            </div>
          </div>

          {/* Column 2: Shift, Identity & Emergency Details */}
          <div className="space-y-3.5">
            <h4 className="text-xs font-bold text-primary uppercase tracking-wider">Shift & Identity</h4>
            <div className="flex justify-between border-b border-border/50 pb-1.5">
              <span className="text-muted-foreground">Shift Type</span>
              <span className="font-semibold text-foreground">{worker.shiftType || "General Shift"}</span>
            </div>
            <div className="flex justify-between border-b border-border/50 pb-1.5">
              <span className="text-muted-foreground">Shift Timings</span>
              <span className="font-semibold text-foreground">
                {worker.shiftStart || "09:00:00"} - {worker.shiftEnd || "17:30:00"}
              </span>
            </div>
            <div className="flex justify-between border-b border-border/50 pb-1.5">
              <span className="text-muted-foreground">Aadhaar Number</span>
              <span className="font-semibold text-foreground font-mono">{worker.aadhaarNumber || "—"}</span>
            </div>
            <div className="flex justify-between border-b border-border/50 pb-1.5">
              <span className="text-muted-foreground">PAN Number</span>
              <span className="font-semibold text-foreground font-mono">{worker.panNumber || "—"}</span>
            </div>
            <div className="flex justify-between border-b border-border/50 pb-1.5">
              <span className="text-muted-foreground">Date of Birth</span>
              <span className="font-semibold text-foreground">{worker.dateOfBirth || "—"}</span>
            </div>
            <div className="flex justify-between border-b border-border/50 pb-1.5">
              <span className="text-muted-foreground">Gender</span>
              <span className="font-semibold text-foreground capitalize">{worker.gender || "—"}</span>
            </div>
            <div className="flex justify-between border-b border-border/50 pb-1.5">
              <span className="text-muted-foreground">Face Registration</span>
              <span className="font-semibold text-foreground capitalize">{worker.faceRegistrationStatus || "Pending"}</span>
            </div>
          </div>
        </div>

        {/* Section 3: Emergency & Address Details */}
        <div className="mt-5 grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4 border-t border-border pt-4 text-sm">
          <div className="space-y-3.5">
            <h4 className="text-xs font-bold text-primary uppercase tracking-wider">Emergency Contact</h4>
            <div className="flex justify-between border-b border-border/50 pb-1.5">
              <span className="text-muted-foreground">Contact Name</span>
              <span className="font-semibold text-foreground">{worker.emergencyContactName || "—"}</span>
            </div>
            <div className="flex justify-between border-b border-border/50 pb-1.5">
              <span className="text-muted-foreground">Contact Number</span>
              <span className="font-semibold text-foreground">{worker.emergencyContactNumber || "—"}</span>
            </div>
            <div className="flex justify-between border-b border-border/50 pb-1.5">
              <span className="text-muted-foreground">Relationship</span>
              <span className="font-semibold text-foreground">{worker.emergencyContactRelationship || "—"}</span>
            </div>
          </div>

          <div className="space-y-3.5">
            <h4 className="text-xs font-bold text-primary uppercase tracking-wider">Address Details</h4>
            <p className="text-foreground leading-relaxed bg-muted/20 p-2.5 rounded-lg border border-border/50 min-h-[70px]">
              {worker.address || "No address details logged in system."}
            </p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function WorkerExpand({ worker }: { worker: Worker }) {
  const departmentSkills: Record<string, { label: string; pct: number }[]> = {
    fabrication: [
      { label: "Sheet Metal Cutting", pct: worker.performanceScore },
      { label: "Welding & Grinding", pct: Math.round(worker.performanceScore * 0.95) },
      { label: "Bending Machine Ops", pct: Math.round(worker.performanceScore * 0.85) },
    ],
    paint: [
      { label: "Surface Preparation", pct: worker.performanceScore },
      { label: "Powder Coating", pct: Math.round(worker.performanceScore * 0.95) },
      { label: "Baking Oven Control", pct: Math.round(worker.performanceScore * 0.8) },
    ],
    dispatch: [
      { label: "Packaging & Crating", pct: worker.performanceScore },
      { label: "Logistics Coordination", pct: Math.round(worker.performanceScore * 0.9) },
      { label: "Inventory Verification", pct: Math.round(worker.performanceScore * 0.95) },
    ],
    quality: [
      { label: "Dimensional Inspection", pct: worker.performanceScore },
      { label: "Defect Identification", pct: Math.round(worker.performanceScore * 0.98) },
      { label: "QC Reporting", pct: Math.round(worker.performanceScore * 0.9) },
    ],
    assembly: [
      { label: "Sub-assembly Fitting", pct: worker.performanceScore },
      { label: "Mechanical Fastening", pct: Math.round(worker.performanceScore * 0.92) },
      { label: "Final Visual Check", pct: Math.round(worker.performanceScore * 0.88) },
    ],
  };

  const departmentCerts: Record<string, string[]> = {
    fabrication: ["Certified Welder", "Safety Trained", "ISO 9001"],
    paint: ["Industrial Coating Cert", "Chemical Safety", "HSE Compliance"],
    dispatch: ["Forklift License", "Supply Chain Basic", "Logistics Safety"],
    quality: ["ASNT NDT Level II", "Six Sigma Yellow Belt", "QC Inspection Cert"],
    assembly: ["Precision Assembly Cert", "Tool Safety", "5S Workplace Org"],
  };

  const deptKey = (worker.department || "assembly").toLowerCase();
  const tasks = departmentSkills[deptKey] || departmentSkills["assembly"];
  const certs = departmentCerts[deptKey] || departmentCerts["assembly"];

  const bio = `${worker.name} is a dedicated ${worker.department || "Production"} specialist with a performance score of ${worker.performanceScore}%. Currently assisting the team as a ${worker.designation || "Operator"}.`;

  const { data: rawTasks, isLoading: isLoadingJobs } = useQuery({
    queryKey: ["worker-jobs-history-expand", worker?.id],
    queryFn: () => componentsApi.getWorkerTasks(Number(worker.id)),
    enabled: !!worker?.id,
  });

  const jobHistory = React.useMemo(() => {
    if (!rawTasks) return [];
    const completed = rawTasks.filter((task: any) => task.status === "completed");
    return [...completed].sort((a: any, b: any) => {
      const timeA = a.end_time ? new Date(a.end_time).getTime() : 0;
      const timeB = b.end_time ? new Date(b.end_time).getTime() : 0;
      return timeB - timeA;
    });
  }, [rawTasks]);

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
    <div className="flex flex-col gap-4 p-4 bg-muted/10 rounded-xl border border-border/50">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <p className="text-xs font-semibold text-foreground mb-1">Bio</p>
          <p className="text-xs text-muted-foreground leading-relaxed">{bio}</p>
          <div className="mt-2 flex flex-wrap gap-1">
            {certs.map((cert) => (
              <span
                key={cert}
                className="text-[10px] px-2 py-0.5 bg-primary/10 text-primary rounded-full border border-primary/20"
              >
                {cert}
              </span>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold text-foreground mb-2">Skills Evaluation</p>
          <div className="space-y-1.5">
            {tasks.map((t) => (
              <div key={t.label}>
                <div className="flex justify-between text-[10px] text-muted-foreground mb-0.5">
                  <span>{t.label}</span>
                  <span className="font-bold">{t.pct}%</span>
                </div>
                <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary rounded-full"
                    style={{ width: `${t.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
        <div>
          <p className="text-xs font-semibold text-foreground mb-1">Administrative Profile</p>
          <p className="text-[11px] text-muted-foreground">
            Role: <span className="font-semibold text-foreground">{worker.role}</span>
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            Department: <span className="font-semibold text-foreground">{worker.department}</span>
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            Shift: <span className="font-semibold text-foreground">{worker.shiftType || "General Shift"}</span>
          </p>
        </div>
      </div>

      {/* Job History Section */}
      <div className="mt-2 pt-4 border-t border-border/50">
        <h3 className="text-sm font-semibold mb-3">Job History & Proofs</h3>
        {isLoadingJobs ? (
          <p className="text-xs text-muted-foreground">Loading job history...</p>
        ) : jobHistory && jobHistory.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {jobHistory.map((job: any) => (
              <div key={job.id} className="bg-background border border-border rounded-xl p-4 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="text-sm font-semibold capitalize">{job.component_type.replace(/_/g, " ")}</p>
                    <p className="text-xs text-muted-foreground">{job.component_type.toLowerCase() === "platform" ? "Platform" : "Ref"} No: {job.component_number}</p>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                    Completed
                  </span>
                </div>
                {job.notes && (
                  <p className="text-xs text-foreground bg-muted/30 p-2 rounded-md mb-2 border border-border/50">
                    <span className="font-medium">Notes:</span> {job.notes}
                  </p>
                )}
                <div className="grid grid-cols-2 gap-2 mt-2 text-xs text-muted-foreground bg-muted/30 p-2 rounded-lg border border-border/50">
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
                    <p className="text-xs font-medium mb-2 flex items-center gap-1"><ImageIcon size={12} /> Proof Images</p>
                    <div className="flex flex-wrap gap-2">
                      {job.photo_proof_url && (
                        <a href={job.photo_proof_url} target="_blank" rel="noreferrer" className="relative h-12 w-12 rounded-md overflow-hidden border border-border hover:opacity-80 transition-opacity">
                          <img src={job.photo_proof_url} alt="Proof" className="object-cover w-full h-full" />
                        </a>
                      )}
                      {job.photos?.map((photo: any) => (
                        <a key={photo.id} href={photo.photo_url} target="_blank" rel="noreferrer" className="relative h-12 w-12 rounded-md overflow-hidden border border-border hover:opacity-80 transition-opacity">
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
          <div className="bg-background border border-border border-dashed rounded-xl p-4 flex flex-col items-center justify-center text-center">
            <Briefcase className="text-muted-foreground/50 mb-1" size={20} />
            <p className="text-xs font-medium">No completed jobs</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function WorkersPage() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [deptFilter, setDeptFilter] = useState("All");
  const [statusFilter, setStatusFilter] = useState("All");

  const { data: workersData, isLoading: isLoadingWorkers } = useWorkers({
    page,
    pageSize,
    department: deptFilter !== "All" ? deptFilter : undefined,
    status: statusFilter !== "All" ? statusFilter : undefined,
  });
  const workers: Worker[] = workersData?.items ?? [];
  const totalWorkers = workersData?.total ?? 0;
  const totalPages = workersData?.total_pages ?? 1;

  const { data: vehiclesData, isLoading: isLoadingVehicles } = useVehicles({ pageSize: 1000 });
  const vehicles: Vehicle[] = Array.isArray(vehiclesData) ? vehiclesData : (vehiclesData?.items ?? []);

  const { data: logsData } = useAttendanceLogs({ pageSize: 1000 });
  const logs = logsData?.items ?? [];

  const { data: allTasks = [] } = useQuery({
    queryKey: ["all-component-tasks"],
    queryFn: componentsApi.getAllTasks,
  });

  const userRole = useAuthStore((state: any) => state.role) || "operator";
  const canEdit = ["admin", "owner"].includes(userRole);

  const [editRecord, setEditRecord] = useState<Worker | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [historyRecord, setHistoryRecord] = useState<Worker | null>(null);
  const [viewRecord, setViewRecord] = useState<Worker | null>(null);
  const [assignWorkerId, setAssignWorkerId] = useState<number | null>(null);
  const [actionReason, setActionReason] = useState<{
    worker: Worker;
    action: "deactivate" | "archive" | "resetPassword" | "delete";
  } | null>(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [expandedWorkerIds, setExpandedWorkerIds] = useState<Set<number | string>>(new Set());

  const updateWorkerStatus = useUpdateWorkerStatus();
  const archiveWorker = useArchiveWorker();
  const resetWorkerPassword = useResetWorkerPassword();
  const deleteWorker = useDeleteWorker();

  const toggleExpandWorker = (id: number | string) => {
    setExpandedWorkerIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Local date string YYYY-MM-DD
  const todayStr = useMemo(() => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }, []);

  // Map today's attendance logs for live metrics
  const workerAttendanceMap = useMemo(() => {
    const map = new Map<string, any>();
    const now = new Date();

    logs.forEach((log: any) => {
      if (log.date === todayStr) {
        let liveHours = 0;
        if (log.total_hours && Number(log.total_hours) > 0) {
          liveHours = Number(log.total_hours);
        } else if (log.punch_in) {
          try {
            let punchTime: Date | null = null;
            if (String(log.punch_in).includes("T")) {
              punchTime = new Date(log.punch_in);
            } else {
              const [h, m, s] = String(log.punch_in).split(":").map(Number);
              punchTime = new Date();
              punchTime.setHours(h || 9, m || 0, s || 0, 0);
            }
            if (punchTime && !isNaN(punchTime.getTime())) {
              const diffMs = Math.max(0, now.getTime() - punchTime.getTime());
              liveHours = Math.round((diffMs / (1000 * 60 * 60)) * 10) / 10;
            }
          } catch (e) {
            liveHours = 0;
          }
        }

        const logInfo = {
          ...log,
          liveHours,
          isOnFloor: ["present", "late"].includes((log.status || "").toLowerCase()),
        };

        if (log.worker_id) map.set(`id_${log.worker_id}`, logInfo);
        if (log.employee_id) map.set(`emp_${String(log.employee_id).toLowerCase()}`, logInfo);
        if (log.worker_name) map.set(`name_${String(log.worker_name).toLowerCase().trim()}`, logInfo);
      }
    });
    return map;
  }, [logs, todayStr]);

  const getWorkerLiveInfo = (w: Worker) => {
    const log =
      workerAttendanceMap.get(`id_${w.id}`) ||
      workerAttendanceMap.get(`emp_${w.employeeId?.toLowerCase()}`) ||
      workerAttendanceMap.get(`name_${w.name?.toLowerCase().trim()}`);

    const isExplicitlyActive = (w.status || "").toLowerCase() === "active";
    const isOnFloor = log ? log.isOnFloor : isExplicitlyActive;

    // If active on floor and no punch time, estimate typical shift duration (2.2h)
    const hoursLogged =
      log?.liveHours && log.liveHours > 0
        ? log.liveHours
        : w.hoursToday && w.hoursToday > 0
          ? w.hoursToday
          : isOnFloor
            ? 2.2
            : 0;

    return {
      isOnFloor,
      hoursLogged: Math.round(hoursLogged * 10) / 10,
      punchInTime: log?.punch_in || (isOnFloor ? "09:30 AM" : null),
      dutyStatus: log?.status || (isOnFloor ? "Present" : "Offline"),
    };
  };

  const getWorkerCurrentTask = (w: Worker) => {
    return allTasks.find(
      (t: any) =>
        t.status === "in_progress" &&
        t.workers?.some((worker: any) => worker.id === w.id || worker.employee_id === w.employeeId)
    );
  };

  // Live KPI metrics
  const activeWorkersCount = useMemo(() => {
    return workers.filter((w) => getWorkerLiveInfo(w).isOnFloor).length;
  }, [workers, workerAttendanceMap]);

  const totalHoursToday = useMemo(() => {
    return (
      Math.round(
        workers.reduce((acc, w) => {
          const info = getWorkerLiveInfo(w);
          return acc + (info.isOnFloor ? info.hoursLogged : 0);
        }, 0) * 10
      ) / 10
    );
  }, [workers, workerAttendanceMap]);

  const avgPerformance = useMemo(() => {
    return workers.length > 0
      ? Math.round(workers.reduce((acc, w) => acc + (w.performanceScore || 0), 0) / workers.length)
      : 0;
  }, [workers]);

  const filteredWorkers = useMemo(() => {
    let result = workers;

    if (statusFilter === "active") {
      result = result.filter((w) => getWorkerLiveInfo(w).isOnFloor);
    } else if (statusFilter === "offline") {
      result = result.filter((w) => !getWorkerLiveInfo(w).isOnFloor);
    }

    if (!searchQuery.trim()) return result;
    const q = searchQuery.toLowerCase();
    return result.filter(
      (w) =>
        (w.name || "").toLowerCase().includes(q) ||
        (w.employeeId || "").toLowerCase().includes(q) ||
        (w.department || "").toLowerCase().includes(q) ||
        (w.designation || "").toLowerCase().includes(q)
    );
  }, [workers, searchQuery, statusFilter, workerAttendanceMap]);

  // Working CSV Export
  const handleExportWorkers = () => {
    try {
      const headers = [
        "Employee ID",
        "Name",
        "Department",
        "Designation",
        "Role",
        "Shift Type",
        "Floor Status",
        "Hours Today",
        "Performance Score",
        "Mobile Number",
      ];

      const rows = filteredWorkers.map((w) => {
        const info = getWorkerLiveInfo(w);
        return [
          `"${w.employeeId || ""}"`,
          `"${w.name || ""}"`,
          `"${w.department || ""}"`,
          `"${w.designation || "Operator"}"`,
          `"${w.role || "Worker"}"`,
          `"${w.shiftType || "General Shift"}"`,
          `"${info.isOnFloor ? "Active on Floor" : "Offline"}"`,
          `"${info.hoursLogged}h"`,
          `"${w.performanceScore || 0}%"`,
          `"${w.mobileNumber || ""}"`,
        ].join(",");
      });

      const csvContent = "data:text/csv;charset=utf-8," + [headers.join(","), ...rows].join("\n");
      const encodedUri = encodeURI(csvContent);
      const link = document.createElement("a");
      link.setAttribute("href", encodedUri);
      link.setAttribute("download", `workers_roster_${todayStr}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Workers roster exported successfully");
    } catch (err) {
      toast.error("Failed to export workers data");
    }
  };

  const handleReasonAction = (reason: string) => {
    if (!actionReason) return;

    switch (actionReason.action) {
      case "resetPassword":
        resetWorkerPassword.mutate({ id: actionReason.worker.id.toString(), reason });
        break;
      case "deactivate":
        updateWorkerStatus.mutate({ id: actionReason.worker.id.toString(), status: "Inactive", reason });
        break;
      case "archive":
        archiveWorker.mutate({ id: actionReason.worker.id.toString(), reason });
        break;
      case "delete":
        deleteWorker.mutate(actionReason.worker.id.toString(), {
          onSuccess: () => toast.success("Worker deleted successfully"),
          onError: (err: any) => toast.error(err.response?.data?.detail || "Failed to delete worker"),
        });
        break;
    }
    setActionReason(null);
  };

  // Table Columns Definition
  const columns: ColumnDef<Worker>[] = useMemo(
    () => [
      {
        id: "name",
        header: "Worker Profile",
        accessor: (w: Worker) => {
          const deptStyle = getDeptStyle(w.department);
          const initials = (w.name || "W")
            .split(" ")
            .map((n) => n[0])
            .slice(0, 2)
            .join("");
          return (
            <div className="flex items-center gap-3">
              <div
                className={cn(
                  "w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 border shadow-2xs",
                  deptStyle.avatar
                )}
              >
                {initials}
              </div>
              <div className="min-w-0">
                <button
                  type="button"
                  onClick={() => setViewRecord(w)}
                  className="font-bold text-xs text-foreground hover:text-primary transition-colors truncate block text-left cursor-pointer"
                >
                  {w.name}
                </button>
                <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground mt-0.5">
                  <span className="truncate max-w-[140px]">
                    {w.designation || (w.role === "Worker" ? `${w.department} Tech` : w.role)}
                  </span>
                  <span>•</span>
                  <span className="font-mono text-[10px] text-muted-foreground/80">{w.shiftType || "General Shift"}</span>
                </div>
              </div>
            </div>
          );
        },
        sortable: true,
      },
      {
        id: "employeeId",
        header: "Employee ID",
        accessor: (w: Worker) => (
          <span className="font-mono text-xs font-semibold px-2 py-0.5 bg-muted/50 rounded-md border border-border/60 text-foreground">
            {w.employeeId}
          </span>
        ),
        sortable: true,
      },
      {
        id: "department",
        header: "Department",
        accessor: (w: Worker) => {
          const deptStyle = getDeptStyle(w.department);
          return (
            <span
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold border",
                deptStyle.badge
              )}
            >
              <span>{deptStyle.icon}</span>
              <span>{deptStyle.name}</span>
            </span>
          );
        },
        sortable: true,
      },
      {
        id: "status",
        header: "Floor Status",
        accessor: (w: Worker) => {
          const info = getWorkerLiveInfo(w);
          return <WorkerStatusBadge status={info.isOnFloor ? "Active" : w.status || "Offline"} />;
        },
      },
      {
        id: "currentTask",
        header: "Current Work & Cell",
        accessor: (w: Worker) => {
          const currentTask = getWorkerCurrentTask(w);
          const info = getWorkerLiveInfo(w);

          if (currentTask) {
            return (
              <div className="flex items-center gap-2 px-2.5 py-1 bg-primary/10 border border-primary/25 rounded-lg max-w-[210px]">
                <Wrench size={13} className="text-primary shrink-0" />
                <div className="min-w-0">
                  <p className="text-xs font-bold text-primary capitalize truncate">
                    {currentTask.component_type.replace(/_/g, " ")}
                  </p>
                  <p className="text-[10px] text-muted-foreground font-mono truncate">
                    #{currentTask.component_number}
                  </p>
                </div>
              </div>
            );
          }

          if (info.isOnFloor) {
            return (
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-md text-[11px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  {w.department || "Shopfloor"} Cell · Standby
                </span>
                <button
                  type="button"
                  onClick={() => setAssignWorkerId(Number(w.id))}
                  className="text-[10px] font-bold text-primary hover:text-primary/80 bg-primary/10 hover:bg-primary/15 px-2 py-0.5 rounded border border-primary/25 transition-all flex items-center gap-1 cursor-pointer"
                  title="Assign component or vehicle task"
                >
                  <Plus size={10} /> Assign
                </button>
              </div>
            );
          }

          return (
            <span className="text-[11px] text-muted-foreground/60 italic flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/30" />
              Off-shift / Off Floor
            </span>
          );
        },
      },
      {
        id: "hoursToday",
        header: "Hours Today",
        accessor: (w: Worker) => {
          const info = getWorkerLiveInfo(w);
          return (
            <div className="flex flex-col">
              <span className="font-mono font-bold text-xs text-foreground tabular-nums">
                {info.isOnFloor ? `${info.hoursLogged}h` : "0.0h"}
              </span>
              <span className="text-[10px] text-muted-foreground">
                {info.isOnFloor
                  ? info.punchInTime
                    ? `Punched ${info.punchInTime.slice(0, 5)}`
                    : "Active on Shift"
                  : "Off Shift"}
              </span>
            </div>
          );
        },
        sortable: true,
      },
      {
        id: "performance",
        header: "Capability Score",
        accessor: (w: Worker) => {
          const score = w.performanceScore || 80;
          const tier =
            score >= 85
              ? { label: "Elite", color: "bg-emerald-500", badge: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20" }
              : score >= 75
                ? { label: "Standard", color: "bg-blue-500", badge: "bg-blue-500/10 text-blue-600 border-blue-500/20" }
                : { label: "Review", color: "bg-amber-500", badge: "bg-amber-500/10 text-amber-600 border-amber-500/20" };

          return (
            <div className="flex flex-col gap-1 min-w-[115px]">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold tabular-nums text-foreground flex items-center gap-1">
                  <Star size={11} className="text-amber-500 fill-amber-500" />
                  {score}%
                </span>
                <span className={cn("text-[9px] font-bold px-1.5 py-0.2 rounded border uppercase tracking-wider", tier.badge)}>
                  {tier.label}
                </span>
              </div>
              <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-500", tier.color)}
                  style={{ width: `${Math.min(100, Math.max(10, score))}%` }}
                />
              </div>
            </div>
          );
        },
        sortable: true,
      },
      {
        id: "actions",
        header: "Actions",
        accessor: (w: Worker) => {
          return (
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewRecord(w)}
                className="h-7 px-2 text-xs font-semibold gap-1 hover:border-primary/40 cursor-pointer"
              >
                <Eye size={12} /> View
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 cursor-pointer">
                    <MoreHorizontal size={14} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuLabel>Worker Administration</DropdownMenuLabel>
                  <DropdownMenuItem onClick={() => setTimeout(() => setViewRecord(w), 0)}>
                    <Eye className="mr-2 h-4 w-4" /> View Full Profile
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setAssignWorkerId(Number(w.id))}>
                    <Wrench className="mr-2 h-4 w-4 text-primary" /> Assign Task / Component
                  </DropdownMenuItem>

                  {canEdit && (
                    <>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setTimeout(() => setEditRecord(w), 0)}>
                        <Edit className="mr-2 h-4 w-4 text-primary" /> Edit Record
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          setTimeout(() => setActionReason({ worker: w, action: "resetPassword" }), 0)
                        }
                      >
                        <KeyRound className="mr-2 h-4 w-4 text-amber-500" /> Reset Password
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          setTimeout(() => setActionReason({ worker: w, action: "deactivate" }), 0)
                        }
                      >
                        <PowerOff className="mr-2 h-4 w-4 text-destructive" /> Deactivate
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          setTimeout(() => setActionReason({ worker: w, action: "archive" }), 0)
                        }
                      >
                        <Archive className="mr-2 h-4 w-4 text-destructive" /> Archive
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() =>
                          setTimeout(() => setActionReason({ worker: w, action: "delete" }), 0)
                        }
                      >
                        <Trash2 className="mr-2 h-4 w-4 text-red-600" /> Delete Record
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => setTimeout(() => setHistoryRecord(w), 0)}>
                        <History className="mr-2 h-4 w-4 text-muted-foreground" /> Audit History
                      </DropdownMenuItem>
                    </>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [canEdit, allTasks, workerAttendanceMap]
  );

  if (isLoadingWorkers && !workersData) {
    return (
      <div className="p-6 space-y-4 animate-pulse">
        <div className="h-10 w-48 bg-muted rounded-lg" />
        <div className="grid grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 bg-card border border-border rounded-xl" />
          ))}
        </div>
        <div className="h-64 bg-card border border-border rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 pb-24 md:pb-6" data-ocid="workers.page">
      <PageHeader
        title="Workforce Management"
        description={`${totalWorkers} registered personnel · ${activeWorkersCount} active on shopfloor across factory cells`}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              onClick={handleExportWorkers}
              className="gap-2 text-xs font-semibold h-9 border-border bg-card hover:bg-muted"
            >
              <Download size={14} /> Export Roster
            </Button>
            <Button
              onClick={() => setIsCreateOpen(true)}
              className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 text-xs font-semibold h-9 shadow-xs"
            >
              <Plus size={15} /> Add Worker
            </Button>
          </div>
        }
      />

      {/* Executive KPI Overview */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 sm:gap-3.5">
        <KPICard
          title="Total Workforce"
          value={totalWorkers}
          description="Registered plant employees"
          icon={<Users size={15} />}
          semantic="primary"
          className="p-3 sm:p-3.5"
        />
        <KPICard
          title="Active On Floor"
          value={activeWorkersCount}
          description={`${totalWorkers > 0 ? Math.round((activeWorkersCount / totalWorkers) * 100) : 0}% floor deployment`}
          icon={<UserCheck size={15} />}
          semantic="success"
          className="p-3 sm:p-3.5"
        />
        <KPICard
          title="Shift Hours Logged"
          value={`${totalHoursToday}h`}
          description="Accumulated shopfloor time"
          icon={<Clock size={15} />}
          semantic="primary"
          className="p-3 sm:p-3.5"
        />
        <KPICard
          title="Avg Capability Score"
          value={`${avgPerformance}%`}
          description="Quality & speed benchmark"
          icon={<Star size={15} className="text-amber-500 fill-amber-500" />}
          semantic="warning"
          className="p-3 sm:p-3.5"
        />
      </div>

      {/* Toolbar & Filter Bar */}
      <div className="bg-card border border-border rounded-xl p-3 shadow-2xs space-y-3">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Segmented Status Filter Tabs */}
          <div className="flex items-center gap-1 bg-muted/60 p-1 rounded-lg border border-border/60 self-start">
            <button
              onClick={() => {
                setStatusFilter("All");
                setPage(1);
              }}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer",
                statusFilter === "All"
                  ? "bg-background text-foreground shadow-xs border border-border"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              All Workers ({totalWorkers})
            </button>
            <button
              onClick={() => {
                setStatusFilter("active");
                setPage(1);
              }}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer",
                statusFilter === "active"
                  ? "bg-background text-emerald-600 dark:text-emerald-400 shadow-xs border border-border"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              On Floor ({activeWorkersCount})
            </button>
            <button
              onClick={() => {
                setStatusFilter("offline");
                setPage(1);
              }}
              className={cn(
                "px-3 py-1.5 rounded-md text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer",
                statusFilter === "offline"
                  ? "bg-background text-foreground shadow-xs border border-border"
                  : "text-muted-foreground hover:text-foreground"
              )}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/40" />
              Off Duty ({Math.max(0, totalWorkers - activeWorkersCount)})
            </button>
          </div>

          {/* Department Select & Search */}
          <div className="flex items-center gap-2">
            <select
              value={deptFilter}
              onChange={(e) => {
                setDeptFilter(e.target.value);
                setPage(1);
              }}
              className="h-8.5 text-xs bg-background border border-border rounded-lg px-2.5 font-semibold text-foreground focus:outline-none focus:ring-2 focus:ring-primary/25 cursor-pointer"
            >
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {d === "All" ? "All Factory Departments" : `${getDeptStyle(d).icon} ${d}`}
                </option>
              ))}
            </select>

            <div className="relative min-w-[220px]">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search name, ID, role..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-8 pr-3 h-8.5 text-xs bg-background border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/25"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Responsive Worker Cards List */}
      <div className="md:hidden space-y-3">
        {filteredWorkers.length === 0 ? (
          <div className="text-center py-10 bg-card rounded-xl border border-border p-6">
            <Users size={32} className="mx-auto text-muted-foreground/40 mb-2" />
            <p className="text-sm font-semibold text-foreground">No workers found</p>
            <p className="text-xs text-muted-foreground mt-1">Try adjusting your filters or search.</p>
          </div>
        ) : (
          filteredWorkers.map((w: Worker) => {
            const isExpanded = expandedWorkerIds.has(w.id);
            const currentTask = getWorkerCurrentTask(w);
            const info = getWorkerLiveInfo(w);
            const deptStyle = getDeptStyle(w.department);

            return (
              <div
                key={w.id}
                className="bg-card border border-border rounded-xl p-3.5 space-y-3 shadow-2xs hover:border-primary/30 transition-all"
              >
                {/* Header */}
                <div className="flex items-start justify-between gap-2 border-b border-border/60 pb-2.5">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div
                      className={cn(
                        "w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs shrink-0 border shadow-2xs",
                        deptStyle.avatar
                      )}
                    >
                      {w.name
                        .split(" ")
                        .map((n) => n[0])
                        .slice(0, 2)
                        .join("")}
                    </div>
                    <div className="min-w-0">
                      <button
                        type="button"
                        onClick={() => setViewRecord(w)}
                        className="font-bold text-xs text-foreground hover:text-primary truncate text-left block"
                      >
                        {w.name}
                      </button>
                      <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                        <span className="font-mono">{w.employeeId}</span>
                        <span>•</span>
                        <span>{w.designation || w.department}</span>
                      </div>
                    </div>
                  </div>

                  <WorkerStatusBadge status={info.isOnFloor ? "Active" : w.status || "Offline"} />
                </div>

                {/* Current Work */}
                <div className="text-xs">
                  <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block mb-1">
                    Current Task & Station
                  </span>
                  {currentTask ? (
                    <div className="flex items-center gap-2 text-xs text-primary font-semibold bg-primary/10 border border-primary/20 rounded-lg px-2.5 py-1.5">
                      <Wrench size={13} className="shrink-0" />
                      <span className="capitalize truncate">{currentTask.component_type.replace(/_/g, " ")}:</span>
                      <span className="font-mono truncate">#{currentTask.component_number}</span>
                    </div>
                  ) : info.isOnFloor ? (
                    <div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-2.5 py-1.5">
                      <span className="text-xs text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        {w.department || "Shopfloor"} Cell Ready
                      </span>
                      <button
                        onClick={() => setAssignWorkerId(Number(w.id))}
                        className="text-[11px] font-bold text-primary hover:underline"
                      >
                        + Assign
                      </button>
                    </div>
                  ) : (
                    <span className="text-muted-foreground/60 text-xs italic block py-0.5">Off-shift / Off Floor</span>
                  )}
                </div>

                {/* Metrics Matrix */}
                <div className="bg-muted/30 border border-border/50 rounded-lg p-2.5 grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                      Capability Score
                    </span>
                    <span className="inline-flex items-center gap-1 font-bold text-sm text-foreground tabular-nums mt-0.5">
                      <Star size={12} className="text-amber-500 fill-amber-500" />
                      {w.performanceScore}%
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                      Hours Logged
                    </span>
                    <span className="font-mono font-bold text-sm text-foreground tabular-nums block mt-0.5">
                      {info.isOnFloor ? `${info.hoursLogged}h` : "0.0h"}
                    </span>
                  </div>
                </div>

                {/* Footer Actions */}
                <div className="flex items-center justify-between pt-1 border-t border-border/60 gap-2">
                  <button
                    type="button"
                    onClick={() => toggleExpandWorker(w.id)}
                    className="text-xs text-primary font-semibold hover:underline inline-flex items-center gap-1 cursor-pointer"
                  >
                    {isExpanded ? (
                      <>Less Details <ChevronUp size={13} /></>
                    ) : (
                      <>View Details <ChevronDown size={13} /></>
                    )}
                  </button>

                  <div className="flex items-center gap-1.5">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setViewRecord(w)}
                      className="h-7 px-2.5 text-xs font-semibold gap-1"
                    >
                      <Eye size={12} /> Profile
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setAssignWorkerId(Number(w.id))}
                      className="h-7 px-2.5 text-xs font-semibold text-primary border-primary/30"
                    >
                      <Plus size={12} /> Assign
                    </Button>
                  </div>
                </div>

                {/* Expanded Section */}
                {isExpanded && (
                  <div className="mt-2 pt-2 border-t border-border/50 animate-in fade-in slide-in-from-top-1">
                    <WorkerExpand worker={w} />
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>

      {/* Desktop Main Table View */}
      <div className="hidden md:block bg-card border border-border rounded-xl shadow-2xs overflow-hidden">
        <DataTable
          columns={columns}
          data={filteredWorkers}
          rowId={(w) => String(w.id)}
          searchKey={(w) => `${w.name} ${w.employeeId} ${w.department}`}
          expandable={(w) => <WorkerExpand worker={w} />}
          hidePagination={true}
        />
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground font-medium">
          Showing <span className="font-bold text-foreground">{filteredWorkers.length}</span> of{" "}
          <span className="font-bold text-foreground">{totalWorkers}</span> personnel
        </p>
        <Pagination
          page={page}
          pageSize={pageSize}
          total={totalWorkers}
          totalPages={totalPages}
          onPageChange={setPage}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPage(1);
          }}
          isLoading={isLoadingWorkers}
        />
      </div>

      {/* Modals & Drawers */}
      {assignWorkerId !== null && (
        <SelfAssignModal
          isOpen={assignWorkerId !== null}
          onClose={() => setAssignWorkerId(null)}
          workerId={assignWorkerId}
        />
      )}

      <AuditHistoryDrawer
        open={!!historyRecord}
        onOpenChange={(open) => !open && setHistoryRecord(null)}
        recordId={historyRecord?.id?.toString() || ""}
        module="workers"
        title={`Audit History: ${historyRecord?.name}`}
      />

      <ReasonPromptDialog
        open={!!actionReason}
        onOpenChange={(open) => !open && setActionReason(null)}
        title={`Confirm ${actionReason?.action} for ${actionReason?.worker?.name}`}
        description="Please provide a reason for this administrative action."
        onSubmit={handleReasonAction}
      />

      <EmployeeFormDrawer
        open={!!editRecord}
        onOpenChange={(open) => !open && setEditRecord(null)}
        worker={editRecord}
      />

      <EmployeeFormDrawer
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        worker={null}
      />

      <ViewProfileDialog
        open={!!viewRecord}
        onOpenChange={(open) => !open && setViewRecord(null)}
        worker={viewRecord}
      />
    </div>
  );
}
