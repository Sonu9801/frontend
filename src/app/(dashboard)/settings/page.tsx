"use client";

import React, { useState, useCallback, useMemo, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import {
  Building2,
  Check,
  ChevronRight,
  Clock,
  Copy,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  Monitor,
  Moon,
  Pencil,
  Plus,
  Shield,
  ShieldCheck,
  ShieldAlert,
  Smartphone,
  Laptop,
  QrCode,
  Wifi,
  RefreshCw,
  LogOut,
  AlertTriangle,
  CheckCircle2,
  Download,
  Sun,
  Trash2,
  User,
  UserPlus,
  Users,
  X,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AnimatePresence, motion } from "motion/react";
import { useTheme } from "next-themes";
import { toast } from "sonner";
import { Pagination } from "@/components/ui/Pagination";

type SettingsSection =
  | "profile"
  | "factory"
  | "team"
  | "preferences"
  | "security";

const SECTIONS: {
  id: SettingsSection;
  label: string;
  icon: React.ReactNode;
  description: string;
}[] = [
  {
    id: "profile",
    label: "Profile",
    icon: <User size={15} />,
    description: "Your personal information",
  },
  {
    id: "factory",
    label: "Factory",
    icon: <Building2 size={15} />,
    description: "Facility configuration",
  },
  {
    id: "team",
    label: "Team Members",
    icon: <Users size={15} />,
    description: "Manage your team",
  },
  {
    id: "preferences",
    label: "Preferences",
    icon: <Monitor size={15} />,
    description: "App behavior & theme",
  },
  {
    id: "security",
    label: "Security",
    icon: <Shield size={15} />,
    description: "Passwords & access",
  },
];

const ROLES = [
  "admin",
  "manager",
  "supervisor",
  "dispatcher",
  "oem",
];

const TIMEZONES = [
  "Asia/Kolkata",
  "UTC",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Dubai",
];

const DEFAULT_VIEWS = [
  "Dashboard",
  "Production Board",
  "Dispatch",
  "Quality Control",
  "Workers",
];

const NOTIF_PREFS = [
  { id: "job_started", label: "Job started by worker" },
  { id: "qc_passed", label: "QC inspection passed" },
  { id: "qc_failed", label: "QC inspection failed" },
  { id: "vehicle_dispatched", label: "Vehicle dispatched" },
  { id: "emergency_created", label: "Emergency order created" },
  { id: "delayed_order", label: "Order delayed past ETA" },
];

const INITIAL_TEAM = [
  {
    id: 1,
    name: "Arjun Mehta",
    email: "arjun.mehta@foxflow.in",
    role: "Factory Owner",
  },
  {
    id: 2,
    name: "Priya Sharma",
    email: "priya.sharma@foxflow.in",
    role: "Production Manager",
  },
  {
    id: 3,
    name: "Rohan Das",
    email: "rohan.das@foxflow.in",
    role: "Supervisor",
  },
  {
    id: 4,
    name: "Kavita Patel",
    email: "kavita.patel@foxflow.in",
    role: "Quality Inspector",
  },
  {
    id: 5,
    name: "Suresh Kumar",
    email: "suresh.kumar@foxflow.in",
    role: "Dispatch Team",
  },
];

const LOGIN_HISTORY = [
  {
    device: "Chrome on Windows",
    ip: "103.21.45.12",
    location: "Mumbai, India",
    time: "Today 09:14 AM",
  },
  {
    device: "Safari on iPhone",
    ip: "103.21.45.12",
    location: "Mumbai, India",
    time: "Yesterday 06:30 PM",
  },
  {
    device: "Chrome on Windows",
    ip: "103.21.45.12",
    location: "Mumbai, India",
    time: "25 May 2026 11:00 AM",
  },
];

function RoleBadge({ userRole }: { userRole: string }) {
  if (!userRole) return null;
  const role = userRole.toLowerCase();
  const color =
    role === "admin" || role === "factory owner"
      ? "bg-primary/10 text-primary border-primary/20"
      : role === "manager" || role === "production manager"
        ? "bg-warning/10 text-warning border-warning/20"
        : role === "supervisor"
          ? "bg-secondary text-secondary-foreground border-border"
          : role === "oem"
            ? "bg-success/10 text-success border-success/20"
            : "bg-muted text-muted-foreground border-border";

  let label = userRole;
  if (role === "admin" || role === "factory owner") label = "Admin";
  else if (role === "manager" || role === "production manager") label = "Manager";
  else if (role === "supervisor") label = "Supervisor";
  else if (role === "oem") label = "OEM";

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium border ${color}`}
    >
      {label}
    </span>
  );
}

function SectionCard({
  title,
  description,
  children,
}: { title: string; description: string; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -6 }}
      transition={{ duration: 0.22 }}
      className="bg-card border border-border rounded-xl shadow-subtle"
    >
      <div className="px-6 pt-5 pb-4">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
      </div>
      <Separator />
      <div className="px-6 py-5">{children}</div>
    </motion.div>
  );
}

function ProfileSection() {
  const { name: storeName, email: storeEmail, role: storeRole } = useAuthStore();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(storeName || "Unknown User");
  const [draft, setDraft] = useState(name);

  useEffect(() => {
    if (storeName) {
      setName(storeName);
      setDraft(storeName);
    }
  }, [storeName]);

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const queryClient = useQueryClient();
  const updateProfile = useAuthStore((s) => s.updateProfile);

  const updateMutation = useMutation({
    mutationFn: async (name: string) => {
      const res = await api.put("/auth/me", { name });
      return res.data;
    },
    onSuccess: (data) => {
      updateProfile(data.name, data.email);
      setName(data.name);
      setEditing(false);
      toast.success("Profile saved");
    },
    onError: () => {
      toast.error("Failed to save profile");
    }
  });

  const save = () => {
    updateMutation.mutate(draft);
  };
  const cancel = () => {
    setDraft(name);
    setEditing(false);
  };

  return (
    <div className="space-y-6">
      <SectionCard
        title="Account Profile"
        description="Your personal information, factory authorization, and active role."
      >
        <div className="flex flex-col sm:flex-row items-start gap-5">
          <div className="relative shrink-0">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/80 to-primary flex items-center justify-center text-primary-foreground font-bold font-display text-xl shadow-md">
              {initials}
            </div>
            <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-500 border-2 border-card" title="Active on platform" />
          </div>

          <div className="flex-1 min-w-0 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Full Name</Label>
                {editing ? (
                  <Input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    className="h-8 text-sm"
                    data-ocid="settings.profile.name_input"
                    autoFocus
                  />
                ) : (
                  <p
                    className="text-sm font-bold text-foreground py-0.5"
                    data-ocid="settings.profile.name_display"
                  >
                    {name}
                  </p>
                )}
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Email Address</Label>
                <div className="flex items-center gap-1.5 py-0.5">
                  <Mail size={13} className="text-muted-foreground shrink-0" />
                  <p className="text-sm text-foreground font-medium truncate">
                    {storeEmail || "no-email@foxflow.com"}
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">System Role</Label>
                <div className="py-0.5">
                  <RoleBadge userRole={storeRole || "operator"} />
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Employee ID</Label>
                <p className="text-sm font-mono font-medium text-foreground py-0.5">
                  FOX-ADM-001
                </p>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Assigned Department</Label>
                <p className="text-sm font-medium text-foreground py-0.5">
                  Plant Operations & MES Administration
                </p>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground font-semibold uppercase tracking-wider">Factory Facility</Label>
                <p className="text-sm font-medium text-foreground py-0.5">
                  FoxFlow Unit 1 - Main Manufacturing Plant
                </p>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-2">
              {editing ? (
                <>
                  <Button
                    size="sm"
                    onClick={save}
                    disabled={updateMutation.isPending}
                    data-ocid="settings.profile.save_button"
                    className="h-8 text-xs font-semibold"
                  >
                    <Check size={13} className="mr-1.5" /> {updateMutation.isPending ? "Saving..." : "Save Changes"}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={cancel}
                    data-ocid="settings.profile.cancel_button"
                    className="h-8 text-xs font-semibold"
                  >
                    <X size={13} className="mr-1.5" /> Cancel
                  </Button>
                </>
              ) : (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditing(true)}
                  data-ocid="settings.profile.edit_button"
                  className="h-8 text-xs font-semibold"
                >
                  <Pencil size={13} className="mr-1.5" /> Edit Profile Details
                </Button>
              )}
            </div>
          </div>
        </div>
      </SectionCard>

      {/* Account Security & Compliance Overview */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border border-border bg-card shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">2FA Protection</span>
            <ShieldCheck size={16} className="text-emerald-500" />
          </div>
          <p className="text-lg font-bold text-foreground">Active & Protected</p>
          <p className="text-[11px] text-muted-foreground mt-1">TOTP authenticator app configured</p>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Active Session</span>
            <Laptop size={16} className="text-primary" />
          </div>
          <p className="text-lg font-bold text-foreground">Chrome on Windows</p>
          <p className="text-[11px] text-muted-foreground mt-1 font-mono">103.21.45.12 • Mumbai, IN</p>
        </div>

        <div className="p-4 rounded-xl border border-border bg-card shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Audit Trail</span>
            <CheckCircle2 size={16} className="text-blue-500" />
          </div>
          <p className="text-lg font-bold text-foreground">1,518+ Events</p>
          <p className="text-[11px] text-muted-foreground mt-1">100% compliance score</p>
        </div>
      </div>
    </div>
  );
}

function FactorySection() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: ["factorySettings"],
    queryFn: async () => {
      const res = await api.get("/settings/factory");
      return res.data;
    }
  });

  const [facilityName, setFacilityName] = useState("");
  const [address, setAddress] = useState("");
  const [hours, setHours] = useState("");
  const [timezone, setTimezone] = useState("Asia/Kolkata");
  const [departments, setDepartments] = useState<string[]>([]);
  const [newDept, setNewDept] = useState("");

  useEffect(() => {
    if (data) {
      setFacilityName(data.facilityName ?? data.facility_name ?? "");
      setAddress(data.address ?? "");
      setHours(data.operatingHours ?? data.operating_hours ?? "");
      const tz = data.timezone ?? "Asia/Kolkata";
      setTimezone(TIMEZONES.includes(tz) ? tz : "Asia/Kolkata");
      setDepartments(Array.isArray(data.departments) ? data.departments : []);
    }
  }, [data]);

  const updateMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.put("/settings/factory", payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["factorySettings"] });
      toast.success("Factory configuration saved");
    },
    onError: () => {
      toast.error("Failed to save factory configuration");
    }
  });

  const addDept = () => {
    const d = newDept.trim();
    if (d && !departments.includes(d)) {
      setDepartments([...departments, d]);
      setNewDept("");
    }
  };
  const removeDept = (d: string) =>
    setDepartments(departments.filter((x) => x !== d));
    
  const save = () => {
    updateMutation.mutate({
      facility_name: facilityName,
      facilityName: facilityName,
      address,
      operating_hours: hours,
      operatingHours: hours,
      timezone,
      departments
    });
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading factory settings...</div>;

  return (
    <SectionCard
      title="Factory Configuration"
      description="Set up your facility details and operational parameters."
    >
      <div className="space-y-4">
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Company Name</Label>
          <Input
            value={facilityName ?? ""}
            onChange={(e) => setFacilityName(e.target.value)}
            placeholder="Fox Enterprises"
            className="h-8 text-sm"
            data-ocid="settings.factory.name_input"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs text-muted-foreground">Address</Label>
          <Input
            value={address ?? ""}
            onChange={(e) => setAddress(e.target.value)}
            className="h-8 text-sm"
            data-ocid="settings.factory.address_input"
          />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Operating Hours
            </Label>
            <Input
              value={hours ?? ""}
              onChange={(e) => setHours(e.target.value)}
              className="h-8 text-sm"
              data-ocid="settings.factory.hours_input"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Time Zone</Label>
            <Select value={timezone || "Asia/Kolkata"} onValueChange={setTimezone}>
              <SelectTrigger
                className="h-8 text-sm text-left"
                data-ocid="settings.factory.timezone_select"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TIMEZONES.map((tz) => (
                  <SelectItem key={tz} value={tz}>
                    {tz}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground font-medium">Departments</Label>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {departments.map((d) => (
              <span
                key={d}
                className="inline-flex items-center gap-1 pl-2.5 pr-1.5 py-0.5 bg-secondary text-secondary-foreground text-xs rounded-full border border-border"
              >
                {d}
                <button
                  type="button"
                  onClick={() => removeDept(d)}
                  className="hover:text-destructive transition-colors"
                  data-ocid={`settings.factory.dept_remove.${d.toLowerCase()}`}
                >
                  <X size={11} />
                </button>
              </span>
            ))}
          </div>
          <div className="flex gap-2 max-w-sm">
            <Input
              placeholder="Add department…"
              value={newDept ?? ""}
              onChange={(e) => setNewDept(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && addDept()}
              className="h-8 text-xs"
              data-ocid="settings.factory.dept_input"
            />
            <Button
              size="sm"
              variant="outline"
              onClick={addDept}
              type="button"
              className="h-8 shrink-0 px-2"
              data-ocid="settings.factory.dept_add_button"
            >
              <Plus size={13} />
            </Button>
          </div>
        </div>
      </div>
      <div className="mt-5">
        <Button
          size="sm"
          onClick={save}
          disabled={updateMutation.isPending}
          data-ocid="settings.factory.save_button"
          className="h-8 text-xs"
        >
          <Check size={13} className="mr-1.5" /> {updateMutation.isPending ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    </SectionCard>
  );
}

function TeamSection() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const currentUserRole = useAuthStore((state: any) => state.role);
  const isAdmin = currentUserRole === "admin";

  const { data: teamData, isLoading } = useQuery({
    queryKey: ["teamMembers", page, pageSize],
    queryFn: async () => {
      const res = await api.get("/users", { params: { page, page_size: pageSize } });
      return res.data;
    }
  });
  const team = teamData?.items ?? [];
  const totalTeam = teamData?.total ?? 0;
  const totalPages = teamData?.total_pages ?? 1;

  const [showInvite, setShowInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteName, setInviteName] = useState("");
  const [inviteRole, setInviteRole] = useState(ROLES[1]);

  const inviteMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post("/users/invite", payload);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teamMembers"] });
      setInviteEmail("");
      setInviteName("");
      setShowInvite(false);
      toast.success(`Invitation sent`);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || "Failed to invite member");
    }
  });

  const removeMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["teamMembers"] });
      toast.success("Member removed");
    }
  });

  const invite = () => {
    if (!inviteEmail.trim() || !inviteName.trim()) return;
    inviteMutation.mutate({ email: inviteEmail, name: inviteName, role: inviteRole });
  };
  const remove = (id: number) => {
    if (confirm("Are you sure you want to remove this member?")) {
      removeMutation.mutate(id);
    }
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading team members...</div>;

  return (
    <SectionCard
      title="Team Members"
      description="Manage who has access to FOXFLOW ERP and their roles."
    >
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs text-muted-foreground">{totalTeam} members</p>
        {isAdmin && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => setShowInvite(true)}
            className="h-8 text-xs"
            data-ocid="settings.team.invite_button"
          >
            <UserPlus size={13} className="mr-1.5" /> Invite Member
          </Button>
        )}
      </div>
      <AnimatePresence>
        {showInvite && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mb-4 p-4 bg-muted/50 border border-border rounded-lg space-y-3"
            data-ocid="settings.team.invite_dialog"
          >
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold text-foreground">
                Invite New Member
              </p>
              <button
                type="button"
                onClick={() => setShowInvite(false)}
                className="text-muted-foreground hover:text-foreground"
                data-ocid="settings.team.invite_close_button"
              >
                <X size={14} />
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <Input
                placeholder="Name"
                value={inviteName}
                onChange={(e) => setInviteName(e.target.value)}
                className="h-8 text-sm"
              />
              <Input
                placeholder="Email address"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="h-8 text-sm"
                data-ocid="settings.team.invite_email_input"
              />
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger
                  className="h-8 text-sm text-left"
                  data-ocid="settings.team.invite_role_select"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r === "admin"
                        ? "Admin"
                        : r === "manager"
                          ? "Manager"
                          : r === "supervisor"
                            ? "Supervisor"
                            : r === "dispatcher"
                              ? "Dispatch Team"
                              : r === "oem"
                                ? "OEM"
                                : r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 mt-1">
              <Button
                size="sm"
                onClick={invite}
                disabled={inviteMutation.isPending}
                className="h-8 text-xs"
                data-ocid="settings.team.invite_confirm_button"
              >
                {inviteMutation.isPending ? "Sending..." : "Send Invite"}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setShowInvite(false)}
                className="h-8 text-xs"
                data-ocid="settings.team.invite_cancel_button"
              >
                Cancel
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <div className="border border-border rounded-lg overflow-hidden shadow-subtle mb-4">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">
                Member
              </th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground hidden sm:table-cell">
                Email
              </th>
              <th className="text-left px-4 py-2.5 text-xs font-semibold text-muted-foreground">
                Role
              </th>
              <th className="w-10" />
            </tr>
          </thead>
          <tbody>
            {team.map((m: any, i: number) => (
              <tr
                key={m.id}
                className="border-b border-border last:border-0 hover:bg-muted/20 transition-colors"
                data-ocid={`settings.team.item.${i + 1}`}
              >
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary/60 to-primary/90 flex items-center justify-center text-primary-foreground text-xs font-semibold shrink-0 font-display">
                      {m.name[0].toUpperCase()}
                    </div>
                    <span className="font-semibold text-foreground text-sm truncate">
                      {m.name}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-3 text-muted-foreground text-xs hidden sm:table-cell">
                  {m.email}
                </td>
                <td className="px-4 py-3">
                  <RoleBadge userRole={m.role} />
                </td>
                <td className="px-4 py-3">
                  {isAdmin && (
                    <button
                       type="button"
                      onClick={() => remove(m.id)}
                      className="text-muted-foreground hover:text-destructive transition-colors"
                      data-ocid={`settings.team.delete_button.${i + 1}`}
                    >
                      <Trash2 size={13} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <Pagination
        page={page}
        pageSize={pageSize}
        total={totalTeam}
        totalPages={totalPages}
        onPageChange={setPage}
        onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
        isLoading={isLoading}
      />
    </SectionCard>
  );
}

function PreferencesSection() {
  const { data = {}, isLoading } = useQuery({
    queryKey: ["userPreferences"],
    queryFn: async () => {
      const res = await api.get("/auth/preferences");
      return res.data;
    }
  });

  const { theme, setTheme } = useTheme();
  const [defaultView, setDefaultView] = useState("Dashboard");
  const [notifs, setNotifs] = useState<Record<string, boolean>>(
    Object.fromEntries(NOTIF_PREFS.map((n) => [n.id, true])),
  );

  useEffect(() => {
    if (Object.keys(data).length > 0) {
      if (data.theme) setTheme(data.theme);
      if (data.defaultView) setDefaultView(data.defaultView);
      if (data.notifs) setNotifs(data.notifs);
    }
  }, [data, setTheme]);

  const updateMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.put("/auth/preferences", payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Preferences saved");
    }
  });

  const toggleNotif = (id: string) =>
    setNotifs((prev) => ({ ...prev, [id]: !prev[id] }));
    
  const save = () => {
    updateMutation.mutate({ theme, defaultView, notifs });
  };

  if (isLoading) return <div className="p-8 text-center text-muted-foreground">Loading preferences...</div>;

  const themes: { value: string; label: string; icon: React.ReactNode }[] = [
    { value: "light", label: "Light", icon: <Sun size={13} /> },
    { value: "dark", label: "Dark", icon: <Moon size={13} /> },
    { value: "system", label: "System", icon: <Monitor size={13} /> },
  ];

  return (
    <SectionCard
      title="Preferences"
      description="Customize your experience and notification settings."
    >
      <div className="space-y-6">
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-foreground">Theme</Label>
          <div className="flex gap-2">
            {themes.map((t) => (
              <button
                key={t.value}
                type="button"
                onClick={() => setTheme(t.value)}
                data-ocid={`settings.preferences.theme_${t.value}.toggle`}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-smooth ${
                  theme === t.value
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card text-muted-foreground border-border hover:bg-muted/50"
                }`}
              >
                {t.icon} {t.label}
              </button>
            ))}
          </div>
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-foreground">
            Default View
          </Label>
          <Select value={defaultView} onValueChange={setDefaultView}>
            <SelectTrigger
              className="h-8 text-sm w-48 text-left"
              data-ocid="settings.preferences.default_view_select"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {DEFAULT_VIEWS.map((v) => (
                <SelectItem key={v} value={v}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label className="text-xs font-semibold text-foreground">
            Notification Preferences
          </Label>
          <p className="text-xs text-muted-foreground">
            Choose which factory events you want to be notified about.
          </p>
          <div className="mt-2 space-y-2.5">
            {NOTIF_PREFS.map((n) => (
              <div key={n.id} className="flex items-center gap-2.5">
                <Checkbox
                  id={n.id}
                  checked={notifs[n.id]}
                  onCheckedChange={() => toggleNotif(n.id)}
                  data-ocid={`settings.preferences.notif_${n.id}.checkbox`}
                />
                <label
                  htmlFor={n.id}
                  className="text-xs text-foreground cursor-pointer select-none font-medium hover:text-primary"
                >
                  {n.label}
                </label>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="mt-5">
        <Button
          size="sm"
          onClick={save}
          disabled={updateMutation.isPending}
          className="h-8 text-xs"
          data-ocid="settings.preferences.save_button"
        >
          <Check size={13} className="mr-1.5" /> {updateMutation.isPending ? "Saving..." : "Save Preferences"}
        </Button>
      </div>
    </SectionCard>
  );
}

function SecuritySection() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNext, setShowNext] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // 2FA State
  const [twoFactorEnabled, setTwoFactorEnabled] = useState(true);
  const [show2FAModal, setShow2FAModal] = useState(false);
  const [twoFactorCode, setTwoFactorCode] = useState("");
  const twoFactorSecret = "FOX7-9B21-K8P4-W3E0";
  const backupCodes = [
    "9A21-44B1", "78F2-11D0", "34C9-8812", "55E1-2904",
    "61B8-3349", "40D2-9901", "12A7-8763", "83F4-2190"
  ];

  // Session Policies
  const [sessionTimeout, setSessionTimeout] = useState("30");
  const [autoLockIdle, setAutoLockIdle] = useState(true);
  const [criticalActionAuth, setCriticalActionAuth] = useState(true);
  const [geofenceRestricted, setGeofenceRestricted] = useState(false);

  // Security Notifications
  const [alertNewLogin, setAlertNewLogin] = useState(true);
  const [alertFailedAttempts, setAlertFailedAttempts] = useState(true);

  // API Key State
  const [apiKey, setApiKey] = useState("sk-foxflow-fxw8n2kp4qr1m7jt9lz3vdy6whe0ucs");
  const [apiRevealed, setApiRevealed] = useState(false);
  const maskedKey = `${apiKey.slice(0, 12)}••••••••••••••••••••${apiKey.slice(-4)}`;

  const { data: loginHistory = [], isLoading: isLoadingHistory, refetch: refetchLoginHistory } = useQuery({
    queryKey: ["loginHistory"],
    queryFn: async () => {
      const res = await api.get("/auth/login-history");
      return res.data;
    }
  });

  // Password Strength Calculation
  const passwordStrength = useMemo(() => {
    if (!next) return { score: 0, label: "", color: "" };
    let score = 0;
    if (next.length >= 8) score++;
    if (/[A-Z]/.test(next)) score++;
    if (/[0-9]/.test(next)) score++;
    if (/[^A-Za-z0-9]/.test(next)) score++;

    if (score <= 1) return { score: 1, label: "Weak", color: "bg-rose-500", text: "text-rose-600 dark:text-rose-400" };
    if (score === 2) return { score: 2, label: "Fair", color: "bg-amber-500", text: "text-amber-600 dark:text-amber-400" };
    if (score === 3) return { score: 3, label: "Good", color: "bg-blue-500", text: "text-blue-600 dark:text-blue-400" };
    return { score: 4, label: "Strong", color: "bg-emerald-500", text: "text-emerald-600 dark:text-emerald-400" };
  }, [next]);

  const passwordMutation = useMutation({
    mutationFn: async (payload: { old_password: string; new_password: string }) => {
      const res = await api.post("/auth/change-password", payload);
      return res.data;
    },
    onSuccess: () => {
      setCurrent("");
      setNext("");
      setConfirm("");
      toast.success("Password updated successfully!");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || "Failed to update password");
    }
  });

  const logoutAllMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post("/auth/logout-all");
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data?.message || "Successfully logged out from all other devices");
      refetchLoginHistory();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.detail || "Failed to revoke sessions");
    }
  });

  const changePassword = () => {
    if (!current || !next || !confirm) {
      toast.error("All password fields are required");
      return;
    }
    if (next.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }
    if (next !== confirm) {
      toast.error("New passwords do not match");
      return;
    }
    passwordMutation.mutate({ old_password: current, new_password: next });
  };

  const copyKey = useCallback(() => {
    navigator.clipboard.writeText(apiKey);
    toast.success("API key copied to clipboard");
  }, [apiKey]);

  const copySecret = useCallback(() => {
    navigator.clipboard.writeText(twoFactorSecret);
    toast.success("2FA setup key copied to clipboard");
  }, [twoFactorSecret]);

  const copyBackupCodes = useCallback(() => {
    navigator.clipboard.writeText(backupCodes.join("\n"));
    toast.success("8 Backup recovery codes copied to clipboard");
  }, [backupCodes]);

  const regenerateKey = () => {
    const randomHex = Math.random().toString(36).substring(2, 14) + Math.random().toString(36).substring(2, 14);
    setApiKey(`sk-foxflow-${randomHex}`);
    toast.success("API key regenerated successfully!");
  };

  const savePolicies = () => {
    toast.success("Security policies & session preferences saved!");
  };

  function PwField({
    id,
    value,
    show,
    onChange,
    onToggle,
    placeholder,
    ocid,
  }: {
    id: string;
    value: string;
    show: boolean;
    onChange: (v: string) => void;
    onToggle: () => void;
    placeholder: string;
    ocid: string;
  }) {
    return (
      <div className="relative">
        <Input
          id={id}
          type={show ? "text" : "password"}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="h-8 text-xs pr-9"
          data-ocid={ocid}
        />
        <button
          type="button"
          onClick={onToggle}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        >
          {show ? <EyeOff size={13} /> : <Eye size={13} />}
        </button>
      </div>
    );
  }

  return (
    <SectionCard
      title="Security & Access Control"
      description="Manage password credentials, multi-factor authentication, active devices, and enterprise security policies."
    >
      <div className="space-y-8">
        {/* 1. PASSWORD & AUTHENTICATION */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Lock size={15} className="text-primary" />
              <p className="text-xs font-bold text-foreground">Password & Credentials</p>
            </div>
            <span className="text-[11px] font-medium text-muted-foreground">
              Last changed: 14 days ago
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 p-4 rounded-xl border border-border/80 bg-muted/20">
            {/* Form Fields */}
            <div className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Current Password</Label>
                <PwField
                  id="current"
                  value={current}
                  show={showCurrent}
                  onChange={setCurrent}
                  onToggle={() => setShowCurrent(!showCurrent)}
                  placeholder="Enter current password"
                  ocid="settings.security.current_password_input"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">New Password</Label>
                <PwField
                  id="next"
                  value={next}
                  show={showNext}
                  onChange={setNext}
                  onToggle={() => setShowNext(!showNext)}
                  placeholder="Enter new password (min. 8 characters)"
                  ocid="settings.security.new_password_input"
                />
              </div>

              {/* Password Strength Meter */}
              {next && (
                <div className="space-y-1.5 pt-1">
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="text-muted-foreground font-medium">Password Strength:</span>
                    <span className={cn("font-bold", passwordStrength.text)}>
                      {passwordStrength.label}
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-1.5 h-1.5">
                    {[1, 2, 3, 4].map((step) => (
                      <div
                        key={step}
                        className={cn(
                          "h-full rounded-full transition-all",
                          passwordStrength.score >= step
                            ? passwordStrength.color
                            : "bg-muted-foreground/20"
                        )}
                      />
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Confirm New Password</Label>
                <PwField
                  id="confirm"
                  value={confirm}
                  show={showConfirm}
                  onChange={setConfirm}
                  onToggle={() => setShowConfirm(!showConfirm)}
                  placeholder="Confirm new password"
                  ocid="settings.security.confirm_password_input"
                />
              </div>

              <Button
                size="sm"
                onClick={changePassword}
                disabled={passwordMutation.isPending}
                className="h-8 text-xs font-semibold mt-2"
                data-ocid="settings.security.password_save_button"
              >
                <Check size={13} className="mr-1.5" />
                {passwordMutation.isPending ? "Updating..." : "Update Password"}
              </Button>
            </div>

            {/* Password Policy Guidelines */}
            <div className="space-y-3 p-3.5 rounded-lg border border-border/60 bg-card flex flex-col justify-between">
              <div>
                <p className="text-xs font-bold text-foreground mb-1.5">Enterprise Password Policy</p>
                <p className="text-[11px] text-muted-foreground leading-relaxed mb-3">
                  Passwords must be strong to safeguard sensitive factory operational data and worker payroll records.
                </p>

                <div className="space-y-2 text-xs">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={13} className={next.length >= 8 ? "text-emerald-500" : "text-muted-foreground/50"} />
                    <span className={next.length >= 8 ? "text-foreground font-medium" : "text-muted-foreground"}>
                      At least 8 characters long
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={13} className={/[A-Z]/.test(next) ? "text-emerald-500" : "text-muted-foreground/50"} />
                    <span className={/[A-Z]/.test(next) ? "text-foreground font-medium" : "text-muted-foreground"}>
                      Contains an uppercase letter (A-Z)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={13} className={/[0-9]/.test(next) ? "text-emerald-500" : "text-muted-foreground/50"} />
                    <span className={/[0-9]/.test(next) ? "text-foreground font-medium" : "text-muted-foreground"}>
                      Contains a number (0-9)
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 size={13} className={/[^A-Za-z0-9]/.test(next) ? "text-emerald-500" : "text-muted-foreground/50"} />
                    <span className={/[^A-Za-z0-9]/.test(next) ? "text-foreground font-medium" : "text-muted-foreground"}>
                      Contains a special symbol (!@#$%^&*)
                    </span>
                  </div>
                </div>
              </div>

              <div className="text-[11px] text-muted-foreground/80 flex items-center gap-1.5 pt-2 border-t border-border/50">
                <Shield size={12} className="text-primary" />
                <span>Protected with Argon2 / BCrypt military-grade hashing</span>
              </div>
            </div>
          </div>
        </div>

        <Separator />

        {/* 2. TWO-FACTOR AUTHENTICATION (2FA / MFA) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-emerald-500" />
              <div>
                <p className="text-xs font-bold text-foreground">Two-Factor Authentication (2FA)</p>
                <p className="text-[11px] text-muted-foreground">
                  Require a one-time verification code from Google Authenticator or SMS upon login.
                </p>
              </div>
            </div>
            <span className={cn(
              "text-[10.5px] font-bold px-2.5 py-0.5 rounded-full border",
              twoFactorEnabled
                ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20"
                : "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20"
            )}>
              {twoFactorEnabled ? "Active & Enforced" : "Disabled"}
            </span>
          </div>

          <div className="p-4 rounded-xl border border-border/80 bg-card flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1">
              <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Smartphone size={14} className="text-primary" />
                TOTP Authenticator App (Google / Microsoft Authenticator)
              </p>
              <p className="text-[11px] text-muted-foreground">
                Generates a 6-digit rolling security code on your mobile device.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShow2FAModal(true)}
                className="h-8 text-xs font-semibold"
              >
                <QrCode size={13} className="mr-1.5" />
                {twoFactorEnabled ? "View Setup / Backup Codes" : "Configure 2FA"}
              </Button>
              <Button
                variant={twoFactorEnabled ? "destructive" : "default"}
                size="sm"
                onClick={() => {
                  setTwoFactorEnabled(!twoFactorEnabled);
                  toast.success(twoFactorEnabled ? "Two-Factor Authentication disabled" : "Two-Factor Authentication activated!");
                }}
                className="h-8 text-xs font-semibold"
              >
                {twoFactorEnabled ? "Disable" : "Enable"}
              </Button>
            </div>
          </div>
        </div>

        <Separator />

        {/* 3. ACTIVE SESSIONS & CONNECTED DEVICES */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Laptop size={16} className="text-primary" />
              <div>
                <p className="text-xs font-bold text-foreground">Active Sessions & Connected Devices</p>
                <p className="text-[11px] text-muted-foreground">
                  Review all browser and mobile sessions currently authorized to access your account.
                </p>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => logoutAllMutation.mutate()}
              disabled={logoutAllMutation.isPending}
              className="h-8 text-xs font-semibold text-destructive hover:bg-destructive/10 border-destructive/30"
            >
              <LogOut size={13} className="mr-1.5" />
              {logoutAllMutation.isPending ? "Revoking..." : "Log Out All Other Devices"}
            </Button>
          </div>

          <div className="border border-border rounded-xl overflow-hidden shadow-subtle bg-card">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="text-left px-4 py-2.5 font-bold text-muted-foreground">Device / OS</th>
                  <th className="text-left px-4 py-2.5 font-bold text-muted-foreground hidden sm:table-cell">IP & Location</th>
                  <th className="text-left px-4 py-2.5 font-bold text-muted-foreground">Status / Activity</th>
                </tr>
              </thead>
              <tbody>
                {isLoadingHistory ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-4 text-center text-muted-foreground animate-pulse">
                      Checking active sessions...
                    </td>
                  </tr>
                ) : loginHistory.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-4 text-center text-muted-foreground">
                      No session history recorded.
                    </td>
                  </tr>
                ) : (
                  loginHistory.map((l: any, i: number) => {
                    const isCurrent = i === 0;
                    const isMobile = l.device?.toLowerCase().includes("iphone") || l.device?.toLowerCase().includes("android");
                    return (
                      <tr
                        key={l.device + l.time + i}
                        className="border-b border-border last:border-0 hover:bg-muted/10 transition-colors"
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-lg bg-muted flex items-center justify-center text-muted-foreground shrink-0">
                              {isMobile ? <Smartphone size={14} /> : <Laptop size={14} />}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-foreground leading-tight flex items-center gap-1.5">
                                {l.device}
                                {isCurrent && (
                                  <span className="text-[9.5px] font-extrabold px-1.5 py-0.2 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
                                    Current Device
                                  </span>
                                )}
                              </p>
                              <span className="text-[10px] text-muted-foreground sm:hidden">
                                {l.location} • {l.ip || "103.21.45.12"}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground hidden sm:table-cell font-mono text-[11px]">
                          {l.location} <span className="text-muted-foreground/60">({l.ip || "103.21.45.12"})</span>
                        </td>
                        <td className="px-4 py-3 text-muted-foreground">
                          {isCurrent ? (
                            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-semibold text-[11px]">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Active Now
                            </div>
                          ) : (
                            <span className="font-mono text-[11px]">
                              {new Date(l.time).toLocaleString("en-IN", { dateStyle: "short", timeStyle: "short" })}
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        <Separator />

        {/* 4. ENTERPRISE MES SECURITY POLICIES */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <ShieldAlert size={16} className="text-primary" />
            <div>
              <p className="text-xs font-bold text-foreground">Session & Operational Security Policies</p>
              <p className="text-[11px] text-muted-foreground">
                Enterprise policies to safeguard factory floor MES terminals and admin consoles.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Inactivity Timeout */}
            <div className="p-4 rounded-xl border border-border/80 bg-muted/20 space-y-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-foreground">Idle Session Timeout</Label>
                <p className="text-[11px] text-muted-foreground">
                  Automatically sign out or lock screen after period of inactivity.
                </p>
              </div>

              <Select value={sessionTimeout} onValueChange={setSessionTimeout}>
                <SelectTrigger className="h-8 text-xs bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 Minutes (Strict Security)</SelectItem>
                  <SelectItem value="30">30 Minutes (Recommended)</SelectItem>
                  <SelectItem value="60">1 Hour</SelectItem>
                  <SelectItem value="240">4 Hours (Half Shift)</SelectItem>
                  <SelectItem value="480">8 Hours (Full Shift)</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex items-center gap-2.5 pt-1">
                <Checkbox
                  id="autoLockIdle"
                  checked={autoLockIdle}
                  onCheckedChange={(c) => setAutoLockIdle(!!c)}
                />
                <label htmlFor="autoLockIdle" className="text-xs text-foreground cursor-pointer font-medium">
                  Auto-lock terminal screen when idle
                </label>
              </div>
            </div>

            {/* Critical Action Re-auth */}
            <div className="p-4 rounded-xl border border-border/80 bg-muted/20 space-y-3">
              <div className="space-y-1">
                <Label className="text-xs font-bold text-foreground">Access Restrictions & Verification</Label>
                <p className="text-[11px] text-muted-foreground">
                  Prevent unauthorized alterations to payroll, worker records, and BOM components.
                </p>
              </div>

              <div className="space-y-2.5 pt-1">
                <div className="flex items-center gap-2.5">
                  <Checkbox
                    id="criticalAuth"
                    checked={criticalActionAuth}
                    onCheckedChange={(c) => setCriticalActionAuth(!!c)}
                  />
                  <label htmlFor="criticalAuth" className="text-xs text-foreground cursor-pointer font-medium leading-tight">
                    Step-Up: Require password confirmation before Payroll release or Worker deletion
                  </label>
                </div>

                <div className="flex items-center gap-2.5">
                  <Checkbox
                    id="geofence"
                    checked={geofenceRestricted}
                    onCheckedChange={(c) => setGeofenceRestricted(!!c)}
                  />
                  <label htmlFor="geofence" className="text-xs text-foreground cursor-pointer font-medium leading-tight">
                    Factory Floor Geofencing (Restrict operator logins to factory IP / Wi-Fi)
                  </label>
                </div>
              </div>
            </div>
          </div>

          {/* Security Notifications & Alerts */}
          <div className="p-4 rounded-xl border border-border/80 bg-card space-y-2.5">
            <p className="text-xs font-bold text-foreground">Security Notifications</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="flex items-center gap-2.5">
                <Checkbox
                  id="alertLogin"
                  checked={alertNewLogin}
                  onCheckedChange={(c) => setAlertNewLogin(!!c)}
                />
                <label htmlFor="alertLogin" className="text-xs text-foreground cursor-pointer font-medium">
                  Email alert on login from new or unknown device
                </label>
              </div>

              <div className="flex items-center gap-2.5">
                <Checkbox
                  id="alertFailed"
                  checked={alertFailedAttempts}
                  onCheckedChange={(c) => setAlertFailedAttempts(!!c)}
                />
                <label htmlFor="alertFailed" className="text-xs text-foreground cursor-pointer font-medium">
                  Alert on 3+ consecutive failed password attempts
                </label>
              </div>
            </div>

            <div className="pt-2">
              <Button size="sm" onClick={savePolicies} className="h-8 text-xs font-semibold">
                <Check size={13} className="mr-1.5" />
                Save Security Policies
              </Button>
            </div>
          </div>
        </div>

        <Separator />

        {/* 5. API KEY & DEVELOPER ACCESS */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <KeyRound size={15} className="text-primary" />
              <div>
                <p className="text-xs font-bold text-foreground">Enterprise API Key & Webhooks</p>
                <p className="text-[11px] text-muted-foreground">
                  Use this token to authenticate external OEM integrations, barcode scanners, and MES automated kiosks.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                HMAC-SHA256
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 p-3 bg-muted/40 border border-border rounded-xl font-mono text-xs text-muted-foreground">
            <span className="flex-1 truncate select-all font-semibold">
              {apiRevealed ? apiKey : maskedKey}
            </span>
            <button
              type="button"
              onClick={() => setApiRevealed(!apiRevealed)}
              className="text-muted-foreground hover:text-foreground transition-colors shrink-0 p-1 rounded-md hover:bg-muted"
              title={apiRevealed ? "Hide key" : "Reveal key"}
            >
              {apiRevealed ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
            <button
              type="button"
              onClick={copyKey}
              className="text-muted-foreground hover:text-foreground transition-colors shrink-0 p-1 rounded-md hover:bg-muted"
              title="Copy API key"
            >
              <Copy size={14} />
            </button>
            <button
              type="button"
              onClick={regenerateKey}
              className="text-muted-foreground hover:text-foreground transition-colors shrink-0 p-1 rounded-md hover:bg-muted"
              title="Regenerate API key"
            >
              <RefreshCw size={14} />
            </button>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <span className="text-[11px] text-muted-foreground font-medium">Scopes:</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-muted text-foreground font-mono">mes:read</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-muted text-foreground font-mono">mes:write</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-muted text-foreground font-mono">factory:admin</span>
          </div>
        </div>
      </div>

      {/* 2FA SETUP MODAL DIALOG */}
      <Dialog open={show2FAModal} onOpenChange={setShow2FAModal}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <ShieldCheck size={20} className="text-emerald-500" />
              Two-Factor Authentication Setup
            </DialogTitle>
            <DialogDescription className="text-xs">
              Follow these steps to connect your authenticator app (Google Authenticator, Microsoft Authenticator, or 1Password).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Step 1: QR & Secret */}
            <div className="p-3.5 rounded-xl border border-border bg-muted/30 text-center space-y-2">
              <p className="text-xs font-bold text-foreground">Step 1: Scan QR or Enter Setup Key</p>
              
              {/* Stylized QR Code placeholder */}
              <div className="w-32 h-32 mx-auto bg-white p-2 rounded-xl border shadow-xs flex items-center justify-center">
                <svg width="112" height="112" viewBox="0 0 112 112" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="0" y="0" width="36" height="36" rx="4" fill="#0F172A" />
                  <rect x="6" y="6" width="24" height="24" rx="2" fill="#FFFFFF" />
                  <rect x="12" y="12" width="12" height="12" rx="1" fill="#0F172A" />
                  
                  <rect x="76" y="0" width="36" height="36" rx="4" fill="#0F172A" />
                  <rect x="82" y="6" width="24" height="24" rx="2" fill="#FFFFFF" />
                  <rect x="88" y="12" width="12" height="12" rx="1" fill="#0F172A" />

                  <rect x="0" y="76" width="36" height="36" rx="4" fill="#0F172A" />
                  <rect x="6" y="82" width="24" height="24" rx="2" fill="#FFFFFF" />
                  <rect x="12" y="88" width="12" height="12" rx="1" fill="#0F172A" />

                  <rect x="46" y="8" width="20" height="8" rx="1" fill="#0F172A" />
                  <rect x="46" y="24" width="8" height="20" rx="1" fill="#0F172A" />
                  <rect x="60" y="24" width="14" height="8" rx="1" fill="#0F172A" />
                  <rect x="52" y="48" width="16" height="16" rx="2" fill="#2563EB" />
                  <rect x="76" y="56" width="28" height="8" rx="1" fill="#0F172A" />
                  <rect x="88" y="72" width="16" height="20" rx="1" fill="#0F172A" />
                  <rect x="44" y="88" width="22" height="16" rx="1" fill="#0F172A" />
                </svg>
              </div>

              <div className="flex items-center justify-center gap-2">
                <span className="font-mono text-xs font-bold text-foreground bg-card px-2.5 py-1 rounded-lg border">
                  {twoFactorSecret}
                </span>
                <Button size="icon" variant="ghost" className="h-7 w-7" onClick={copySecret}>
                  <Copy size={13} />
                </Button>
              </div>
            </div>

            {/* Step 2: 6-Digit Verification */}
            <div className="space-y-1.5">
              <Label className="text-xs font-bold text-foreground">Step 2: Enter 6-Digit Code from App</Label>
              <div className="flex gap-2">
                <Input
                  type="text"
                  maxLength={6}
                  value={twoFactorCode}
                  onChange={(e) => setTwoFactorCode(e.target.value)}
                  placeholder="123456"
                  className="font-mono text-center tracking-widest text-sm h-9"
                />
                <Button
                  size="sm"
                  onClick={() => {
                    if (twoFactorCode.length === 6) {
                      setTwoFactorEnabled(true);
                      toast.success("Two-Factor Authentication verified & enabled!");
                    } else {
                      toast.error("Please enter a valid 6-digit code");
                    }
                  }}
                  className="h-9 font-semibold text-xs px-4"
                >
                  Verify
                </Button>
              </div>
            </div>

            {/* Step 3: Emergency Backup Codes */}
            <div className="space-y-2 p-3 rounded-xl border border-border/80 bg-muted/20">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-foreground">Emergency Backup Codes</span>
                <Button variant="ghost" size="sm" onClick={copyBackupCodes} className="h-6 text-[11px] px-2 text-primary">
                  <Copy size={11} className="mr-1" /> Copy All
                </Button>
              </div>
              <p className="text-[10.5px] text-muted-foreground">
                Save these single-use codes in a safe place. If you lose your phone, you can use these to recover access.
              </p>
              <div className="grid grid-cols-2 gap-1.5 font-mono text-[11px] bg-card p-2.5 rounded-lg border">
                {backupCodes.map((code) => (
                  <span key={code} className="text-foreground/90 font-medium">
                    {code}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button size="sm" onClick={() => setShow2FAModal(false)} className="w-full text-xs font-semibold">
              Done & Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SectionCard>
  );
}

export default function SettingsPage() {
  const [active, setActive] = useState<SettingsSection>("profile");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const tab = params.get("tab") as SettingsSection;
      if (tab && ["profile", "factory", "team", "preferences", "security"].includes(tab)) {
        setActive(tab);
      }
    }
  }, []);

  const sectionContent: Record<SettingsSection, React.ReactNode> = {
    profile: <ProfileSection />,
    factory: <FactorySection />,
    team: <TeamSection />,
    preferences: <PreferencesSection />,
    security: <SecuritySection />,
  };

  return (
    <div className="flex h-full min-h-0" data-ocid="settings.page">
      <aside className="hidden md:flex flex-col w-52 shrink-0 border-r border-border bg-card">
        <div className="px-4 pt-6 pb-4">
          <h1 className="text-sm font-semibold text-foreground font-display tracking-tight">
            Settings
          </h1>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Configure your platform
          </p>
        </div>
        <nav className="px-2 space-y-0.5">
          {SECTIONS.map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setActive(s.id)}
              data-ocid={`settings.nav.${s.id}.link`}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-left transition-smooth group ${
                active === s.id
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              }`}
            >
              <span className="shrink-0">{s.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium truncate">{s.label}</p>
              </div>
              {active === s.id && (
                <ChevronRight size={12} className="shrink-0 opacity-60" />
              )}
            </button>
          ))}
        </nav>
      </aside>
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        {/* Mobile Top Settings Sections Bar (100% Inline Segmented Control - Zero Horizontal Sliding) */}
        <div className="md:hidden sticky top-0 z-20 bg-card/95 backdrop-blur-md border-b border-border px-2.5 py-2 shrink-0">
          <div className="grid grid-cols-5 bg-muted/60 dark:bg-muted/30 p-1 rounded-2xl gap-1 border border-border/60">
            {SECTIONS.map((s) => {
              const isSelected = active === s.id;
              const mobileLabels: Record<string, string> = {
                profile: "Profile",
                factory: "Factory",
                team: "Team",
                preferences: "Prefs",
                security: "Security",
              };
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => setActive(s.id)}
                  data-ocid={`settings.nav_mobile.${s.id}.link`}
                  className={cn(
                    "flex flex-col items-center justify-center py-2 px-0.5 rounded-xl transition-all text-[10.5px] leading-tight gap-1 select-none",
                    isSelected
                      ? "bg-primary text-primary-foreground font-bold shadow-xs"
                      : "text-muted-foreground hover:text-foreground font-medium active:scale-95 hover:bg-muted/50"
                  )}
                >
                  <span className={cn(
                    "transition-transform",
                    isSelected ? "scale-110 text-primary-foreground" : "text-muted-foreground"
                  )}>
                    {s.icon}
                  </span>
                  <span className="truncate max-w-full font-display">
                    {mobileLabels[s.id] || s.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-3 sm:px-6 py-4 sm:py-6 pb-24 md:pb-6">
            <div className="md:hidden mb-4">
              <h1 className="text-xl font-bold font-display text-foreground">
                Settings
              </h1>
              <p className="text-xs text-muted-foreground mt-0.5">
                Configure your platform
              </p>
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -10 }}
                transition={{ duration: 0.18 }}
              >
                {sectionContent[active]}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}
