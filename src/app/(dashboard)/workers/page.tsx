"use client";

import React, { useState, useMemo } from "react";
import type { ColumnDef } from "@/components/ui/DataTable";
import { DataTable } from "@/components/ui/DataTable";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useWorkers, useVehicles, useUpdateWorker, useUpdateWorkerStatus, useArchiveWorker, useResetWorkerPassword, useCreateWorker, useDeleteWorker } from "@/hooks/useQueries";
import { Pagination } from "@/components/ui/Pagination";
import type { Worker, Vehicle } from "@/types";
import { Star, MoreHorizontal, Eye, Edit, History, Archive, PowerOff, KeyRound, Plus, Trash2, Briefcase, Image as ImageIcon } from "lucide-react";
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
import { EditRecordDialog } from "@/components/shared/EditRecordDialog";
import { AuditHistoryDrawer } from "@/components/shared/AuditHistoryDrawer";
import { ReasonPromptDialog } from "@/components/shared/ReasonPromptDialog";
import { useQuery } from "@tanstack/react-query";
import { jobsApi, componentsApi } from "@/lib/api";
import { format, differenceInMinutes } from "date-fns";
import { Badge } from "@/components/ui/badge";

const DEPARTMENTS = ["All", "Fabrication", "Paint", "Assembly", "Quality", "Dispatch"];
const STATUSES = ["All", "active", "break", "offline"];

// ... Avatar, Badge, Expand components remain unchanged ...
function WorkerAvatar({ name }: { name: string }) {
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("");
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center text-primary font-bold text-[10px] flex-shrink-0">
        {initials}
      </div>
      <span className="font-semibold text-foreground truncate">{name}</span>
    </div>
  );
}

function WorkerStatusBadge({ status }: { status: Worker["status"] }) {
  return (
    <span
      className={cn(
        "text-[10px] font-medium px-2 py-0.5 rounded-full capitalize",
        status === "active"
          ? "bg-success/15 text-success"
          : status === "break"
            ? "bg-warning/15 text-warning"
            : "bg-muted text-muted-foreground",
      )}
    >
      {status}
    </span>
  );
}

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl overflow-y-auto max-h-[85vh] p-6 bg-card border border-border rounded-2xl shadow-xl">
        <DialogHeader className="border-b border-border pb-4 mb-4">
          <DialogTitle className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-base font-display">
              {worker.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </div>
            <div>
              <p className="font-bold text-lg leading-tight text-foreground">{worker.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {worker.designation || "Operator"} • {worker.department}
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
                {worker.shiftStart || "09:30:00"} - {worker.shiftEnd || "18:00:00"}
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
    queryKey: ['worker-jobs-history-expand', worker?.id],
    queryFn: () => componentsApi.getWorkerTasks(Number(worker.id)),
    enabled: !!worker?.id,
  });

  const jobHistory = React.useMemo(() => {
    if (!rawTasks) return [];
    const completed = rawTasks.filter((task: any) => task.status === 'completed');
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
          <p className="text-xs text-muted-foreground">
            {bio}
          </p>
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
          <p className="text-xs font-semibold text-foreground mb-2">Skills</p>
          <div className="space-y-1.5">
            {tasks.map((t) => (
              <div key={t.label}>
                <div className="flex justify-between text-[10px] text-muted-foreground mb-0.5">
                  <span>{t.label}</span>
                  <span>{t.pct}%</span>
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
          <p className="text-xs font-semibold text-foreground mb-1">
            Performance
          </p>
          <div className="flex items-center gap-1.5 mb-2">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                size={14}
                className={cn(
                  star <= Math.round(worker.performanceScore / 20)
                    ? "text-warning fill-warning"
                    : "text-muted-foreground/30",
                )}
              />
            ))}
            <span className="text-xs font-bold text-foreground">
              {worker.performanceScore}%
            </span>
          </div>
          <p className="text-[10px] text-muted-foreground">
            Employee ID: {worker.employeeId}
          </p>
          <p className="text-[10px] text-muted-foreground">
            Department: {worker.department}
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
                    <p className="text-xs font-medium mb-2 flex items-center gap-1"><ImageIcon size={12}/> Proof Images</p>
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

  const { data: vehicles = [], isLoading: isLoadingVehicles } = useVehicles();
  const { data: allTasks = [] } = useQuery({
    queryKey: ['all-component-tasks'],
    queryFn: componentsApi.getAllTasks,
  });
  const updateWorker = useUpdateWorker();
  const updateWorkerStatus = useUpdateWorkerStatus();
  const archiveWorker = useArchiveWorker();
  const resetWorkerPassword = useResetWorkerPassword();
  const createWorker = useCreateWorker();
  const deleteWorker = useDeleteWorker();
  const userRole = useAuthStore((state: any) => state.role) || "operator";

  const [editRecord, setEditRecord] = useState<Worker | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [historyRecord, setHistoryRecord] = useState<Worker | null>(null);
  const [viewRecord, setViewRecord] = useState<Worker | null>(null);
  const [actionReason, setActionReason] = useState<{ worker: Worker, action: "deactivate" | "archive" | "resetPassword" | "delete" } | null>(null);

  const columns: ColumnDef<Worker>[] = useMemo(() => [
    {
      id: "name",
      header: "Name",
      accessor: (w: Worker) => <WorkerAvatar name={w.name} />,
      sortable: true,
    },
    {
      id: "employeeId",
      header: "Employee ID",
      accessor: (w: Worker) => (
        <span className="font-mono text-muted-foreground">{w.employeeId}</span>
      ),
      sortable: true,
    },
    {
      id: "department",
      header: "Department",
      accessor: (w: Worker) => w.department,
      sortable: true,
    },
    {
      id: "status",
      header: "Status",
      accessor: (w: Worker) => <WorkerStatusBadge status={w.status} />,
    },
    {
      id: "currentTask",
      header: "Current Work",
      accessor: (w: Worker) => {
        const currentTask = allTasks.find(
          (t: any) => t.status === "in_progress" && t.workers?.some((worker: any) => worker.id === w.id)
        );
        return currentTask ? (
          <div className="flex flex-col">
            <span className="truncate text-primary max-w-36 block font-medium capitalize">
              {currentTask.component_type.replace(/_/g, " ")}
            </span>
            <span className="text-[10px] text-muted-foreground truncate">
              {currentTask.component_type.toLowerCase() === 'platform' ? 'Platform No: ' : 'Ref No: '}
              {currentTask.component_number}
            </span>
          </div>
        ) : (
          <span className="text-muted-foreground/50">—</span>
        );
      },
    },
    {
      id: "hoursToday",
      header: "Hours Today",
      accessor: (w: Worker) => (
        <span className="tabular-nums font-semibold">{w.hoursToday}h</span>
      ),
      sortable: true,
    },
    {
      id: "performance",
      header: "Performance",
      accessor: (w: Worker) => (
        <span className="inline-flex items-center gap-1">
          <Star size={11} className="text-warning fill-warning" />
          <span className="font-bold tabular-nums">{w.performanceScore}%</span>
        </span>
      ),
      sortable: true,
    },
    {
      id: "actions",
      header: "Actions",
      accessor: (w: Worker) => {
        const canEdit = ["admin", "owner"].includes(userRole);
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreHorizontal size={16} />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Administrative</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => setTimeout(() => setViewRecord(w), 0)}>
                <Eye className="mr-2 h-4 w-4" /> View Full Profile
              </DropdownMenuItem>
              
              {canEdit && (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => setTimeout(() => setEditRecord(w), 0)}>
                    <Edit className="mr-2 h-4 w-4 text-primary" /> Edit Record
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTimeout(() => setActionReason({ worker: w, action: "resetPassword" }), 0)}>
                    <KeyRound className="mr-2 h-4 w-4 text-warning" /> Reset Password
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTimeout(() => setActionReason({ worker: w, action: "deactivate" }), 0)}>
                    <PowerOff className="mr-2 h-4 w-4 text-destructive" /> Deactivate
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTimeout(() => setActionReason({ worker: w, action: "archive" }), 0)}>
                    <Archive className="mr-2 h-4 w-4 text-destructive" /> Archive
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTimeout(() => setActionReason({ worker: w, action: "delete" }), 0)}>
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
        );
      },
    },
  ], [vehicles, userRole]);

  const handleReasonAction = (reason: string) => {
    if (!actionReason) return;
    
    switch (actionReason.action) {
      case 'resetPassword':
        resetWorkerPassword.mutate({ id: actionReason.worker.id.toString(), reason });
        break;
      case 'deactivate':
        updateWorkerStatus.mutate({ id: actionReason.worker.id.toString(), status: 'Inactive', reason });
        break;
      case 'archive':
        archiveWorker.mutate({ id: actionReason.worker.id.toString(), reason });
        break;
      case 'delete':
        deleteWorker.mutate(actionReason.worker.id.toString(), {
          onSuccess: () => toast.success("Worker deleted successfully"),
          onError: (err: any) => toast.error(err.response?.data?.detail || "Failed to delete worker")
        });
        break;
    }
    setActionReason(null);
  };

  if (isLoadingWorkers || isLoadingVehicles) {
    return (
      <div className="p-6 space-y-4 animate-pulse">
        <div className="h-10 w-48 bg-muted rounded-lg" />
        <div className="h-64 bg-card border border-border rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6" data-ocid="workers.page">
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-5 gap-4">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground">
            Workers
          </h1>
          <p className="text-sm text-muted-foreground">
            {totalWorkers} team members ·{" "}
            {workers.filter((w: Worker) => w.status.toLowerCase() === "active").length} active now
          </p>
        </div>
        <Button onClick={() => setIsCreateOpen(true)} className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90">
          <Plus size={16} /> Add Worker
        </Button>
      </div>
      <DataTable
        columns={columns}
        data={workers}
        rowId={(w) => String(w.id)}
        searchKey={(w) => `${w.name} ${w.employeeId}`}
        expandable={(w) => <WorkerExpand worker={w} />}
        hidePagination={true}
        extraFilters={
          <>
            <select
              value={deptFilter}
              onChange={(e) => { setDeptFilter(e.target.value); setPage(1); }}
              data-ocid="workers.dept_filter"
              className="h-8 text-xs bg-muted/40 border border-border rounded-lg px-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {DEPARTMENTS.map((d) => (
                <option key={d} value={d}>
                  {d === "All" ? "All Departments" : d === "Quality" ? "QC" : d}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
              data-ocid="workers.status_filter"
              className="h-8 text-xs bg-muted/40 border border-border rounded-lg px-2 focus:outline-none focus:ring-2 focus:ring-primary/30"
            >
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s === "All"
                    ? "All Statuses"
                    : s.charAt(0).toUpperCase() + s.slice(1)}
                </option>
              ))}
            </select>
          </>
        }
      />
      <Pagination
        page={page}
        pageSize={pageSize}
        total={totalWorkers}
        totalPages={totalPages}
        onPageChange={setPage}
        onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
        isLoading={isLoadingWorkers}
      />
      {/* Enterprise Administration Controls */}
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
      
      <EditRecordDialog
        open={!!editRecord}
        onOpenChange={(open) => !open && setEditRecord(null)}
        title={`Edit Worker: ${editRecord?.name}`}
        isSubmitting={updateWorker.isPending}
        initialValues={editRecord ? {
          name: editRecord.name,
          department: editRecord.department,
          status: editRecord.status,
          role: editRecord.role,
          mobileNumber: editRecord.mobileNumber || "",
          email: editRecord.email || "",
        } : undefined}
        fields={[
          { name: "name", label: "Full Name", type: "text" },
          { name: "department", label: "Department", type: "select", options: [
            { label: "Fabrication", value: "Fabrication" },
            { label: "Paint", value: "Paint" },
            { label: "Assembly", value: "Assembly" },
            { label: "QC", value: "Quality" },
            { label: "Dispatch", value: "Dispatch" },
          ]},
          { name: "status", label: "Status", type: "select", options: [
            { label: "Active", value: "Active" },
            { label: "Offline", value: "Offline" },
            { label: "Break", value: "Break" },
          ]},
          { name: "role", label: "Role", type: "select", options: [
            { label: "Worker", value: "Worker" },
            { label: "Supervisor", value: "Supervisor" },
            { label: "Manager", value: "Manager" },
          ]},
          { name: "mobileNumber", label: "Mobile Number", type: "text" },
          { name: "email", label: "Email Address", type: "text" },
        ]}
        onSubmit={(data, reason) => {
          if (!editRecord) return;
          updateWorker.mutate({
            id: editRecord.id,
            data: {
              ...editRecord,
              ...data,
              reason,
            }
          }, {
            onSuccess: () => {
              toast.success("Worker updated successfully");
              setEditRecord(null);
            },
            onError: () => toast.error("Failed to update worker")
          });
        }}
      />
      
      <EditRecordDialog
        open={isCreateOpen}
        onOpenChange={setIsCreateOpen}
        title="Add New Worker"
        isSubmitting={createWorker.isPending}
        requireReason={false}
        fields={[
          { name: "name", label: "Full Name", type: "text" },
          { name: "department", label: "Department", type: "select", options: [
            { label: "Fabrication", value: "Fabrication" },
            { label: "Paint", value: "Paint" },
            { label: "Assembly", value: "Assembly" },
            { label: "QC", value: "Quality" },
            { label: "Dispatch", value: "Dispatch" },
          ]},
          { name: "role", label: "Role", type: "select", options: [
            { label: "Worker", value: "Worker" },
            { label: "Supervisor", value: "Supervisor" },
            { label: "Manager", value: "Manager" },
          ]},
          { name: "mobileNumber", label: "Mobile Number", type: "text" },
          { name: "employeeId", label: "Employee ID", type: "text", disabled: true, defaultValue: "Auto-generated on save" },
        ]}
        onSubmit={(data) => {
          createWorker.mutate({
            ...data,
            status: "Offline", // Default status
            performanceScore: 0,
            hoursToday: 0
          }, {
            onSuccess: () => {
              toast.success("Worker created successfully");
              setIsCreateOpen(false);
            },
            onError: (err: any) => {
              toast.error(err.response?.data?.detail || "Failed to create worker");
            }
          });
        }}
      />
      <ViewProfileDialog
        open={!!viewRecord}
        onOpenChange={(open) => !open && setViewRecord(null)}
        worker={viewRecord}
      />
    </div>
  );
}
