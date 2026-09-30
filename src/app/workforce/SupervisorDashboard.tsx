"use client";

import React, { useState, useRef, useEffect } from "react";
import { format } from "date-fns";
import Webcam from "react-webcam";
import { 
  Menu, Bell, CheckCircle2, XCircle, AlertCircle, 
  Users, Activity, Clock, ShieldCheck, FileText, FileSignature, 
  CarFront, Zap, ChevronRight, BarChart3, Star, LogOut, Plus, Search, Calendar,
  Factory, Receipt, UserCircle, Grid, MessageSquare, Home, ClipboardList, ChevronLeft,
  Inbox, Truck, Send, MapPin, Camera, LogIn, RotateCcw, Loader2,
  Sun, CalendarCheck, Megaphone, HelpCircle, Briefcase
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { attendanceApi, vehiclesApi, notificationsApi, jobsApi, workersApi, authApi } from "@/lib/api";
import { useWorkerSummary, useAttendanceSettings, useWorkerHistory, useLeaveHistory, useNotifications } from "@/hooks/useQueries";
import { compressImage, dataURLtoBlob, getDistanceInMeters } from "./utils/attendanceUtils";
import { useWebSocket } from "@/hooks/useWebSocket";
import { useAuthStore } from "@/store/authStore";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ReportsTab } from "./ReportsTab";
import { NotificationsTab } from "./NotificationsTab";
import { PerformanceTab } from "./PerformanceTab";
import { WorkerSettingsTab } from "./components/WorkerSettingsTab";
import { WorkerSupportTab } from "./components/WorkerSupportTab";
import { WorkerAttendanceTab } from "./components/WorkerAttendanceTab";
import { WorkerLeaveTab } from "./components/WorkerLeaveTab";
import { WorkerNoticeTab } from "./components/WorkerNoticeTab";
import { WorkerOTTab } from "./components/WorkerOTTab";
import { WorkerSundayTab } from "./components/WorkerSundayTab";
import { ApplyLeaveModal } from "./components/ApplyLeaveModal";
import { WorkerProfileTab } from "./components/WorkerProfileTab";
import { getTranslation } from "./i18n";
import { ProductionTab } from "./ProductionTab";
import { InvoiceTab } from "./InvoiceTab";
import { cn } from "@/lib/utils";

// Geofence constants
const COMPANY_LAT = 28.475117;
const COMPANY_LNG = 77.297224;
const RADIUS_METERS = 10000;
const COMPANY_ADDRESS = "Fox Enterprises, Faridabad, Haryana";

// MOCK DATA FALLBACKS (Used if API data is empty for design consistency while developing)
const fallbackPlatforms = [
  { id: "PF-401", vehicle: "Fox e-Rickshaw", oem: "Fox Motors", stage: "Chassis Assembly", assigned: 4, progress: 75, status: "in_progress" },
  { id: "PF-402", vehicle: "Fox e-Cart", oem: "Fox Motors", stage: "Battery Installation", assigned: 2, progress: 30, status: "delayed" }
];

const fallbackApprovals = [
  { id: 1, type: "Completion Photo", detail: "Job #1024 - Chassis welded", time: "10 mins ago" },
  { id: 2, type: "Attendance Correction", detail: "Ramesh K. - Missing Punch Out", time: "1 hour ago" },
];

const fallbackNotifications = [
  { id: 1, title: "Critical Delay", msg: "Platform PF-402 is falling behind schedule.", time: "15 mins ago", icon: AlertCircle, color: "text-red-500", bg: "bg-red-50" },
  { id: 2, title: "Worker Online", msg: "Suresh P. just punched in.", time: "45 mins ago", icon: Users, color: "text-green-500", bg: "bg-green-50" },
];

export function SupervisorDashboard({ worker, onLogout }: { worker?: any; onLogout?: () => void }) {
  const [activeTab, setActiveTab] = useState<"home" | "platforms" | "reports" | "profile" | "notifications" | "performance" | "settings" | "support" | "production" | "invoice" | "my_attendance" | "my_leaves" | "ot" | "sunday" | "notice">("home");
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [prodStage, setProdStage] = useState<string>("all");
  const [prodView, setProdView] = useState<"kanban" | "table">("kanban");
  const [prodAutoForm, setProdAutoForm] = useState<"received" | "dispatch" | null>(null);
  const [attSubTab, setAttSubTab] = useState<"team" | "my">("team");

  // Sync activeTab with browser history to intercept back button
  useEffect(() => {
    if (typeof window !== 'undefined' && (!window.history.state || !window.history.state.tab)) {
      window.history.replaceState({ tab: activeTab }, "");
    }

    const onPopState = (e: PopStateEvent) => {
      if (e.state && e.state.tab) {
        setActiveTab(e.state.tab);
      } else {
        setActiveTab("home");
      }
      setProdAutoForm(null);
    };

    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  const handleTabChange = (tab: any, stage: string = "all", view: "kanban" | "table" = "kanban", autoForm: "received" | "dispatch" | null = null) => {
    setProdStage(stage);
    setProdView(view);
    setProdAutoForm(autoForm);
    if (tab !== activeTab) {
      if (typeof window !== 'undefined') {
        window.history.pushState({ tab }, "");
      }
      setActiveTab(tab);
    }
  };
  const [attFilter, setAttFilter] = useState<"all" | "present" | "absent" | "late" | "half_day">("all");
  const [showSidebar, setShowSidebar] = useState(false);
  const [langIndex, setLangIndex] = useState(0);
  const [isAssignDialogOpen, setIsAssignDialogOpen] = useState(false);
  const [selectedVehicleId, setSelectedVehicleId] = useState<number | string | null>(null);
  const [selectedWorkerIds, setSelectedWorkerIds] = useState<number[]>([]);
  const [selectedStage, setSelectedStage] = useState<string>("assembly");
  const queryClient = useQueryClient();
  const router = useRouter();

  // Personal Punch In / Out state
  const [currentTime, setCurrentTime] = useState(new Date());
  const [location, setLocation] = useState<{lat: number, lng: number, accuracy: number} | null>(null);
  const [distance, setDistance] = useState<number | null>(null);
  const [locating, setLocating] = useState(false);
  const [showCameraModal, setShowCameraModal] = useState(false);
  const [punchAction, setPunchAction] = useState<"Punch In" | "Punch Out">("Punch In");
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const webcamRef = useRef<Webcam>(null);

  // Initialize WebSocket for real-time updates across the dashboard
  useWebSocket();

  // Fetch full user profile (only if worker prop is not provided)
  const { data: userProfile } = useQuery({
    queryKey: ["userProfile"],
    queryFn: () => authApi.me(),
    staleTime: Infinity,
    enabled: !worker,
  });

  // Use worker prop from workforce login session if available, fallback to fetched profile
  const activeUser = worker || userProfile || {};

  const isValidId = (id: any) => id !== undefined && id !== null && id !== "undefined" && id !== "null" && id !== "";
  const managerId = isValidId(worker?.worker_id) 
    ? worker.worker_id 
    : (isValidId(worker?.id) 
      ? worker.id 
      : (isValidId(userProfile?.worker_id) 
        ? userProfile.worker_id 
        : (isValidId(userProfile?.id) 
          ? userProfile.id 
          : 1)));

  const { data: summary, refetch: refetchSummary } = useWorkerSummary(managerId);
  const { data: attendanceSettings } = useAttendanceSettings();
  const { data: history = [] } = useWorkerHistory(managerId);
  const { data: leaveHistory = [], isLoading: isLeavesLoading } = useLeaveHistory(managerId);


  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const isPunchedIn = summary?.status === "Punched In" || summary?.status === "Present" || summary?.status === "Late" || Boolean(summary?.punch_in && !summary?.punch_out);

  const requestLocationAsync = (): Promise<{lat: number, lng: number, accuracy: number, distance: number}> => {
    return new Promise((resolve, reject) => {
      setLocating(true);
      if (!navigator.geolocation) {
        setLocating(false);
        reject(new Error("Geolocation not supported"));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude, accuracy } = position.coords;
          setLocation({ lat: latitude, lng: longitude, accuracy });
          const dist = getDistanceInMeters(latitude, longitude, COMPANY_LAT, COMPANY_LNG);
          setDistance(dist);
          setLocating(false);
          resolve({ lat: latitude, lng: longitude, accuracy, distance: dist });
        },
        (error) => {
          setLocating(false);
          reject(new Error(error.message || "GPS Denied"));
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  };

  const handlePunchClick = async (action: "Punch In" | "Punch Out") => {
    try {
      const pos = await requestLocationAsync();
      if (pos.accuracy > 50) {
        toast.error(`GPS accuracy too low (${Math.round(pos.accuracy)}m). Please step outside or try again.`);
        return;
      }
      if (pos.distance > RADIUS_METERS) {
        toast.error("You are outside the allowed office location. Please move closer to mark attendance.");
        return;
      }
    } catch (err: any) {
      toast.error(err.message || "Could not retrieve GPS location.");
      return;
    }
    setPunchAction(action);
    setPreviewImage(null);
    setShowCameraModal(true);
  };

  const handleCapture = async () => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (!imageSrc) return toast.error("Failed to capture photo");
    setPreviewImage(await compressImage(imageSrc));
  };

  const submitPunch = async () => {
    if (!previewImage) return;
    setUploading(true);
    const token = localStorage.getItem("worker_token") || localStorage.getItem("token");
    try {
      const formData = new FormData();
      formData.append("worker_id", String(managerId));
      formData.append("action", punchAction);
      formData.append("latitude", String(location?.lat || 0));
      formData.append("longitude", String(location?.lng || 0));
      formData.append("accuracy", String(location?.accuracy || 0));
      formData.append("photo", dataURLtoBlob(previewImage), `punch_${Date.now()}.jpg`);
      
      const res = await fetch("/api/attendance/punch", { 
        method: "POST", 
        headers: token ? { "Authorization": `Bearer ${token}` } : {}, 
        body: formData 
      });
      
      if (!res.ok) {
        let errorMsg = "Failed to record attendance";
        try {
          const errData = await res.json();
          if (typeof errData.detail === "string") errorMsg = errData.detail;
          else if (errData.message) errorMsg = errData.message;
        } catch {
          if (res.status === 401) errorMsg = "Session expired. Please log in again.";
        }
        throw new Error(errorMsg);
      }
      
      toast.success(`${punchAction} successful!`);
      setShowCameraModal(false);
      refetchSummary();
      queryClient.invalidateQueries({ queryKey: ["workerSummary"] });
      queryClient.invalidateQueries({ queryKey: ["attendanceAnalytics"] });
    } catch (err: any) {
      toast.error(err.message || "Error submitting punch.");
    } finally { 
      setUploading(false); 
    }
  };

  const { data: attendanceAnalytics } = useQuery({
    queryKey: ["attendanceAnalytics", managerId],
    queryFn: () => attendanceApi.getAnalytics(),
    refetchInterval: 30000,
    enabled: !!managerId,
  });

  const { data: todayAttendanceRecords = [] } = useQuery({
    queryKey: ["todayAttendanceRecords"],
    queryFn: () => attendanceApi.getTodayRecords(),
    refetchInterval: 30000,
  });

  const { data: pendingApprovals } = useQuery({
    queryKey: ["pendingRequests", managerId],
    queryFn: () => attendanceApi.getPendingRequests(managerId),
    refetchInterval: 30000,
    enabled: !!managerId,
  });

  const { data: platforms = [] } = useQuery({
    queryKey: ["vehicles"],
    queryFn: () => vehiclesApi.getAll(),
    refetchInterval: 60000,
  });

  const { data: notifications = [] } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationsApi.getAll(false),
    refetchInterval: 60000,
  });

  const { data: allWorkers = [] } = useQuery({
    queryKey: ["workers", 1, 1000],
    queryFn: () => workersApi.getAll({ page: 1, pageSize: 1000 }),
    refetchInterval: 60000,
  });

  const assignMutation = useMutation({
    mutationFn: (data: any) => jobsApi.assign(data),
    onSuccess: () => {
      toast.success("Job assigned successfully");
      queryClient.invalidateQueries({ queryKey: ["vehicles"] });
      setIsAssignDialogOpen(false);
      setSelectedWorkerIds([]);
      setSelectedVehicleId(null);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.detail || "Failed to assign job");
    }
  });

  const handleAssign = () => {
    if (!selectedVehicleId) return toast.error("Select a platform");
    if (selectedWorkerIds.length === 0) return toast.error("Select at least one worker");
    if (selectedWorkerIds.length > 2) return toast.error("Maximum two workers allowed.");
    
    assignMutation.mutate({
      vehicle_id: Number(selectedVehicleId),
      stage: selectedStage,
      worker_ids: selectedWorkerIds,
      supervisor_id: activeUser.id || activeUser.worker_id,
      expected_duration_minutes: 120
    });
  };

  const toggleWorker = (id: number) => {
    if (selectedWorkerIds.includes(id)) {
      setSelectedWorkerIds(prev => prev.filter(wId => wId !== id));
    } else {
      if (selectedWorkerIds.length >= 2) {
        toast.error("Maximum two workers allowed.");
        return;
      }
      setSelectedWorkerIds(prev => [...prev, id]);
    }
  };

  const totalApprovals = (pendingApprovals?.pending_leaves || 0) + (pendingApprovals?.pending_corrections || 0);

  // Safely extract notifications array
  const notificationsList = React.useMemo(() => {
    if (Array.isArray(notifications)) return notifications;
    if (notifications && Array.isArray((notifications as any).items)) return (notifications as any).items;
    if (notifications && Array.isArray((notifications as any).data)) return (notifications as any).data;
    return [];
  }, [notifications]);

  // Safely extract platforms array (handles paginated object or flat array response)
  const platformsList = React.useMemo(() => {
    if (Array.isArray(platforms)) return platforms;
    if (platforms && Array.isArray((platforms as any).items)) return (platforms as any).items;
    if (platforms && Array.isArray((platforms as any).data)) return (platforms as any).data;
    return [];
  }, [platforms]);

  // Safely extract workers array
  const workersList = React.useMemo(() => {
    if (Array.isArray(allWorkers)) return allWorkers;
    if (allWorkers && Array.isArray((allWorkers as any).items)) return (allWorkers as any).items;
    if (allWorkers && Array.isArray((allWorkers as any).data)) return (allWorkers as any).data;
    return [];
  }, [allWorkers]);

  // Extract today's attendance records list or fallback to workersList
  const teamAttendanceList = React.useMemo(() => {
    const list = Array.isArray(todayAttendanceRecords) 
      ? todayAttendanceRecords 
      : (todayAttendanceRecords as any)?.data || [];
    if (list.length > 0) return list;
    return workersList;
  }, [todayAttendanceRecords, workersList]);

  // Live attendance metrics (uses attendanceAnalytics backend data or computes from teamAttendanceList)
  const presentCount = attendanceAnalytics?.present ?? (
    teamAttendanceList.filter((w: any) => {
      const st = (w.status || "").toLowerCase();
      return ["present", "late", "half day", "half_day", "punched in", "active", "online"].includes(st) || !!w.punch_in;
    }).length
  );
  
  const absentCount = attendanceAnalytics?.absent ?? (
    teamAttendanceList.filter((w: any) => {
      const st = (w.status || "").toLowerCase();
      return st === "absent" || st === "off duty" || (!w.punch_in && st !== "present" && st !== "late" && st !== "half day");
    }).length
  );

  // --- Production Summary Computed Metrics ---
  const completedVehicles = platformsList.filter((v: any) => {
    const stage = (v.current_stage || v.currentStage || "").toLowerCase();
    return stage === "dispatch" || stage === "rtd" || stage === "delivered";
  }).length;

  const delayedVehicles = platformsList.filter((v: any) => {
    const est = v.estimated_delivery || v.estimatedDelivery;
    const stage = (v.current_stage || v.currentStage || "").toLowerCase();
    return est && new Date(est) < new Date() && stage !== "dispatch" && stage !== "delivered";
  }).length;

  const runningPlatforms = platformsList.filter((v: any) => {
    const stage = (v.current_stage || v.currentStage || "").toLowerCase();
    return stage !== "oem" && stage !== "dispatch" && stage !== "rtd" && stage !== "delivered";
  }).length;
  
  // --- Assigned Platforms Calculation ---
  const assignedPlatforms = platformsList.filter((p: any) => {
    const stage = (p.current_stage || p.currentStage || "").toLowerCase();
    return stage !== "dispatch" && stage !== "rtd" && stage !== "delivered";
  });

  const handleLogoutAction = async () => {
    try {
      await authApi.logout();
    } catch (e) {
      console.error("Backend logout failed:", e);
    }
    useAuthStore.getState().logout();
    router.push("/login");
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 17) return "Good Afternoon";
    return "Good Evening";
  };

  return (
    <div className="min-h-screen bg-gray-50/50 dark:bg-zinc-950 pb-24 font-sans text-gray-900 dark:text-gray-100 overflow-x-hidden">
      
      {/* Enterprise Mobile Header */}
      <header className="fixed top-0 left-0 right-0 bg-white dark:bg-zinc-950 px-4 pt-[max(12px,env(safe-area-inset-top))] pb-2.5 z-40 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between transition-colors">
        
        {/* LEFT SECTION: Hamburger Menu or Back Button */}
        <div className="flex-shrink-0">
          {activeTab === "home" ? (
            <button onClick={() => setShowSidebar(true)} className="p-1.5 -ml-1.5 rounded-full text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors flex items-center justify-center">
               <Menu size={22} strokeWidth={2} />
            </button>
          ) : (
            <button 
              onClick={() => {
                if (typeof window !== 'undefined' && window.history.state?.tab && window.history.state.tab !== "home") {
                  window.history.back();
                } else {
                  handleTabChange("home");
                }
              }} 
              className="p-1.5 -ml-1.5 rounded-full text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors flex items-center justify-center"
            >
               <ChevronLeft size={22} strokeWidth={2} />
            </button>
          )}
        </div>

        {/* CENTER SECTION: Greeting */}
        <div className="flex-1 px-3 text-left overflow-hidden">
          <h1 className="text-[17px] font-[700] leading-tight text-[#111827] dark:text-white mb-1 truncate">
            {getTranslation(langIndex, getGreeting())}, {activeUser?.name?.split(' ')[0] || "Supervisor"} 👋
          </h1>
          <p className="text-[12px] font-[500] text-[#6B7280] dark:text-gray-400 leading-none truncate mt-0.5">
            ID: {activeUser?.employee_id || "SUP-001"} • {getTranslation(langIndex, activeUser?.department || "Production")}
          </p>
        </div>

        {/* RIGHT SECTION: Notifications & Profile */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button onClick={() => handleTabChange("notifications")} className="relative p-1.5 rounded-full text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors flex items-center justify-center">
            <Bell size={22} strokeWidth={2} />
            {notificationsList.filter((n: any) => !n.is_read).length > 0 && (
              <span className="absolute top-1 right-1.5 bg-red-600 text-white text-[9px] font-bold w-3.5 h-3.5 flex items-center justify-center rounded-full border border-white dark:border-zinc-900 box-content">
                {notificationsList.filter((n: any) => !n.is_read).length > 99 ? '99+' : notificationsList.filter((n: any) => !n.is_read).length}
              </span>
            )}
          </button>
          
          <button className="relative ml-1 flex items-center justify-center" onClick={() => handleTabChange("profile")}>
            <div className="w-9 h-9 rounded-full bg-gray-100 dark:bg-zinc-800 overflow-hidden flex items-center justify-center shrink-0 border border-gray-200 dark:border-zinc-700">
              {activeUser?.profile_photo_url ? <img src={activeUser.profile_photo_url} className="w-full h-full object-cover" /> : <span className="font-bold text-gray-500 dark:text-gray-400 text-sm">{activeUser?.name?.charAt(0) || "S"}</span>}
            </div>
            <div className="absolute bottom-0 right-0 w-2.5 h-2.5 border-[1.5px] border-white dark:border-zinc-950 rounded-full bg-green-500"></div>
          </button>
        </div>
      </header>

      <div className="pt-[72px]">
      {activeTab === "home" && (
        <AnimatePresence mode="wait">
          <motion.div 
            key="home-tab"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-4 space-y-6 max-w-xl mx-auto"
          >
            {/* 1. PERSONAL ATTENDANCE PUNCH IN / OUT CARD */}
            <div className="bg-gradient-to-br from-[#4F6BFF] to-[#5A43F2] rounded-[28px] p-5 shadow-xl shadow-blue-600/20 text-white w-full min-h-[180px] flex flex-col justify-between border border-white/10 relative overflow-hidden">
              <Clock size={140} strokeWidth={0.5} className="absolute -right-8 top-1/2 -translate-y-1/2 text-white opacity-[0.12] pointer-events-none" />
              <div className="relative z-10 flex flex-col h-full justify-between">
                <div className="flex w-full mb-3 mt-0.5">
                  <div className="flex-1 flex flex-col items-start pr-4 border-r border-white/10">
                    <div className={`px-2.5 py-1 rounded-full flex items-center gap-1.5 text-[10px] sm:text-[11px] font-bold uppercase tracking-wider mb-3 ${isPunchedIn ? 'bg-[#4ADE80]/20 text-white' : 'bg-white/20 text-white'}`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${isPunchedIn ? 'bg-[#86efac]' : 'bg-white/50'}`}></div>
                      {isPunchedIn ? "Present (Punched In)" : "Off Duty"}
                    </div>
                    <h2 className="text-[32px] sm:text-[36px] font-black tracking-tight leading-none drop-shadow-sm mb-1">
                      {format(currentTime, "hh:mm")} <span className="text-[16px] sm:text-[18px] font-bold text-white/90">{format(currentTime, "a")}</span>
                    </h2>
                    <p className="text-white/80 text-[12px] font-medium tracking-wide mb-3">
                      {format(currentTime, "EEEE, d MMMM yyyy")}
                    </p>
                    <div className="flex items-center gap-4 mt-2">
                      <div className={`flex items-center gap-1.5 ${isPunchedIn ? 'opacity-100' : 'opacity-60'}`}>
                        <MapPin size={12} className="text-white/80" />
                        <span className="text-[10px] font-medium text-white/90">Location {isPunchedIn ? 'Verified' : 'Pending'}</span>
                        {isPunchedIn ? <CheckCircle2 size={14} className="fill-[#4ADE80] text-[#4F6BFF]" /> : <div className="w-3.5 h-3.5 rounded-full border border-white/50" />}
                      </div>
                      <div className={`flex items-center gap-1.5 ${isPunchedIn ? 'opacity-100' : 'opacity-60'}`}>
                        <Camera size={12} className="text-white/80" />
                        <span className="text-[10px] font-medium text-white/90">Selfie {isPunchedIn ? 'Verified' : 'Pending'}</span>
                        {isPunchedIn ? <CheckCircle2 size={14} className="fill-[#4ADE80] text-[#4F6BFF]" /> : <div className="w-3.5 h-3.5 rounded-full border border-white/50" />}
                      </div>
                    </div>
                  </div>

                  <div className="pl-4 flex flex-col justify-start">
                    <div className="mb-4 mt-2">
                      <p className="text-[10px] text-white/70 font-medium mb-1.5 tracking-wide">Shift Time</p>
                      <p className="text-[11px] font-bold text-white tracking-wide leading-tight">
                        {activeUser?.shift_start && activeUser?.shift_end ? `${activeUser.shift_start} - ${activeUser.shift_end}` : "09:00 AM - 06:00 PM"}
                      </p>
                    </div>
                    <div className="h-[1px] w-3/4 bg-white/10 mb-4"></div>
                    <div>
                      <p className="text-[10px] text-white/70 font-medium mb-1.5 tracking-wide">Working Time</p>
                      <p className="text-[16px] font-bold text-white leading-none tracking-wide">
                        {summary?.net_working_hours ? `${Math.floor(summary.net_working_hours).toString().padStart(2, '0')}h ${Math.round((summary.net_working_hours % 1) * 60).toString().padStart(2, '0')}m` : "00h 00m"}
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <motion.button 
                    whileTap={{ scale: 0.96 }}
                    onClick={() => handlePunchClick(isPunchedIn ? "Punch Out" : "Punch In")} 
                    disabled={uploading || locating}
                    className={`w-full bg-white rounded-[16px] h-[52px] font-black text-[16px] shadow-[0_4px_12px_rgba(0,0,0,0.1)] flex justify-center items-center gap-2 overflow-hidden transition-colors disabled:opacity-80 disabled:cursor-not-allowed ${isPunchedIn ? 'text-red-500' : 'text-[#4F6BFF]'}`}
                  >
                    {uploading || locating ? (
                      <Loader2 size={24} className="animate-spin text-current" />
                    ) : isPunchedIn ? (
                      <>
                        <LogOut size={22} strokeWidth={2.5} /> 
                        <span className="tracking-wide uppercase mt-0.5">Punch Out</span>
                      </>
                    ) : (
                      <>
                        <LogIn size={22} strokeWidth={2.5} /> 
                        <span className="tracking-wide uppercase mt-0.5">Punch In</span>
                      </>
                    )}
                  </motion.button>
                </div>
              </div>
            </div>

            {/* 3. QUICK ACTIONS (4-per-row Grid) */}
            <div>
              <h2 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-3 px-1">Quick Actions</h2>
              <div className="grid grid-cols-4 gap-x-2 gap-y-4">
                {[
                  { 
                    icon: Factory, 
                    label: "Production", 
                    color: "bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400", 
                    onClick: () => handleTabChange("production", "all", "kanban", null) 
                  },
                  { 
                    icon: Inbox, 
                    label: "Received", 
                    color: "bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400", 
                    onClick: () => handleTabChange("production", "received", "table", "received") 
                  },
                  { 
                    icon: Truck, 
                    label: "Dispatch", 
                    color: "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400", 
                    onClick: () => handleTabChange("production", "dispatch", "table", "dispatch") 
                  },
                  { icon: Receipt, label: "Invoices", color: "bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400", onClick: () => handleTabChange('invoice') },
                  { icon: CalendarCheck, label: "Attendance", color: "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400", onClick: () => handleTabChange('my_attendance') },
                  { icon: Briefcase, label: "Leaves", color: "bg-pink-100 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400", onClick: () => handleTabChange('my_leaves') },
                  { icon: Clock, label: "Overtime", color: "bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400", onClick: () => handleTabChange('ot') },
                  { icon: Sun, label: "Sunday / Festival", color: "bg-yellow-100 text-yellow-600 dark:bg-yellow-900/30 dark:text-yellow-400", onClick: () => handleTabChange('sunday') },
                  { icon: Megaphone, label: "Notices", color: "bg-purple-100 text-purple-600 dark:bg-purple-900/30 dark:text-purple-400", onClick: () => handleTabChange('notice') },
                  { icon: HelpCircle, label: "Support", color: "bg-teal-100 text-teal-600 dark:bg-teal-900/30 dark:text-teal-400", onClick: () => handleTabChange('support') },
                  { icon: BarChart3, label: "Reports", color: "bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400", onClick: () => handleTabChange('reports') },
                  { icon: Menu, label: "More", color: "bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-gray-400", onClick: () => setShowSidebar(true) }
                ].map((item, i) => (
                  <motion.button 
                    key={i} 
                    whileTap={{ scale: 0.9 }}
                    onClick={item.onClick}
                    className="flex flex-col items-center justify-center gap-2 group cursor-pointer"
                  >
                    <div className={`w-14 h-14 rounded-[18px] flex items-center justify-center transition-transform group-hover:scale-105 shadow-sm ${item.color}`}>
                      <item.icon size={24} strokeWidth={2.5} />
                    </div>
                    <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400 text-center leading-tight">
                      {item.label}
                    </span>
                  </motion.button>
                ))}
              </div>
            </div>

            {/* 4. PRODUCTION SUMMARY */}
            <div 
              className="bg-white dark:bg-zinc-900 rounded-[28px] p-5 shadow-sm border border-gray-100 dark:border-zinc-800 cursor-pointer hover:border-indigo-200 transition-colors"
              onClick={() => handleTabChange('production')}
            >
              <h2 className="text-sm font-bold text-gray-800 dark:text-gray-200 mb-4 flex items-center justify-between">
                Production Summary
                <Badge variant="secondary" className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 border border-green-200">Live</Badge>
              </h2>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-gray-50 dark:bg-zinc-800/50 p-3 rounded-2xl border border-gray-100 dark:border-zinc-800 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center"><Activity size={16} /></div>
                    <span className="text-xs font-bold text-gray-600">Running</span>
                  </div>
                  <span className="text-lg font-black">{runningPlatforms}</span>
                </div>
                <div className="bg-gray-50 dark:bg-zinc-800/50 p-3 rounded-2xl border border-gray-100 dark:border-zinc-800 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-green-100 text-green-600 flex items-center justify-center"><CheckCircle2 size={16} /></div>
                    <span className="text-xs font-bold text-gray-600">Completed</span>
                  </div>
                  <span className="text-lg font-black text-green-600">{completedVehicles}</span>
                </div>
                <div className="bg-gray-50 dark:bg-zinc-800/50 p-3 rounded-2xl border border-gray-100 dark:border-zinc-800 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center"><XCircle size={16} /></div>
                    <span className="text-xs font-bold text-gray-600">Delayed</span>
                  </div>
                  <span className="text-lg font-black text-red-600">{delayedVehicles}</span>
                </div>
                <div className="bg-gray-50 dark:bg-zinc-800/50 p-3 rounded-2xl border border-gray-100 dark:border-zinc-800 flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center"><CarFront size={16} /></div>
                    <span className="text-xs font-bold text-gray-600">Total</span>
                  </div>
                  <span className="text-lg font-black">{platformsList.length}</span>
                </div>
              </div>
            </div>





            {/* 7. TEAM PERFORMANCE */}
            <div>
              <div className="flex items-center justify-between mb-3 px-1">
                <h2 className="text-sm font-bold text-gray-800 dark:text-gray-200">Performance Analytics</h2>
                <button onClick={() => handleTabChange("performance")} className="text-xs font-bold text-indigo-600 dark:text-indigo-400">Detailed View</button>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white dark:bg-zinc-900 p-4 rounded-[24px] shadow-sm border border-gray-100 dark:border-zinc-800 flex flex-col justify-center items-center text-center">
                  <div className="w-10 h-10 rounded-full bg-yellow-100 text-yellow-600 flex items-center justify-center mb-2"><Star size={20} /></div>
                  <p className="text-xl font-black">94%</p>
                  <p className="text-[10px] font-bold text-gray-500 uppercase mt-1">Productivity</p>
                </div>
                <div className="bg-white dark:bg-zinc-900 p-4 rounded-[24px] shadow-sm border border-gray-100 dark:border-zinc-800 flex flex-col justify-center items-center text-center">
                  <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center mb-2"><Zap size={20} /></div>
                  <p className="text-xl font-black">4h 20m</p>
                  <p className="text-[10px] font-bold text-gray-500 uppercase mt-1">Avg Completion</p>
                </div>
              </div>
            </div>


            
            <div className="h-10"></div>
          </motion.div>
        </AnimatePresence>
      )}

      {/* Reports Tab */}
      {activeTab === "reports" && (
        <ReportsTab activeUser={activeUser} />
      )}

      {/* Notifications Tab */}
      {activeTab === "notifications" && (
        <NotificationsTab activeUser={activeUser} setActiveTab={setActiveTab} />
      )}

      {/* Performance Tab */}
      {activeTab === "performance" && (
        <PerformanceTab activeUser={activeUser} />
      )}

      {/* Attendance Tab (Personal & Team Attendance) */}
      {activeTab === "my_attendance" && (
        <div className="p-4 space-y-4 max-w-xl mx-auto pb-24">
          <div className="flex bg-gray-100 dark:bg-zinc-800 p-1 rounded-xl border border-gray-200 dark:border-zinc-700">
            <button
              type="button"
              onClick={() => setAttSubTab("team")}
              className={cn(
                "flex-1 py-2 text-xs font-bold rounded-lg transition-all text-center",
                attSubTab === "team"
                  ? "bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
              )}
            >
              Team Attendance ({teamAttendanceList.length})
            </button>
            <button
              type="button"
              onClick={() => setAttSubTab("my")}
              className={cn(
                "flex-1 py-2 text-xs font-bold rounded-lg transition-all text-center",
                attSubTab === "my"
                  ? "bg-white dark:bg-zinc-900 text-indigo-600 dark:text-indigo-400 shadow-sm"
                  : "text-gray-500 hover:text-gray-900 dark:hover:text-white"
              )}
            >
              My Attendance Log
            </button>
          </div>

          {attSubTab === "my" ? (
            <WorkerAttendanceTab history={history} workerId={managerId} />
          ) : (
            <div className="space-y-4">
              {/* Team Attendance Analytics Summary */}
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="bg-emerald-50 dark:bg-emerald-950/40 p-3 rounded-2xl border border-emerald-200 dark:border-emerald-800/40">
                  <p className="text-xl font-extrabold text-emerald-600 dark:text-emerald-400">
                    {presentCount}
                  </p>
                  <p className="text-[10px] font-bold text-gray-500 uppercase mt-0.5">Present Today</p>
                </div>
                <div className="bg-red-50 dark:bg-red-950/40 p-3 rounded-2xl border border-red-200 dark:border-red-800/40">
                  <p className="text-xl font-extrabold text-red-600 dark:text-red-400">
                    {absentCount}
                  </p>
                  <p className="text-[10px] font-bold text-gray-500 uppercase mt-0.5">Absent Today</p>
                </div>
                <div className="bg-amber-50 dark:bg-amber-950/40 p-3 rounded-2xl border border-amber-200 dark:border-amber-800/40">
                  <p className="text-xl font-extrabold text-amber-600 dark:text-amber-400">
                    {totalApprovals}
                  </p>
                  <p className="text-[10px] font-bold text-gray-500 uppercase mt-0.5">Pending Req</p>
                </div>
              </div>

              {/* Workers List */}
              <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-100 dark:border-zinc-800 p-4 space-y-3">
                <h3 className="text-sm font-bold text-gray-800 dark:text-gray-200 flex items-center justify-between">
                  Team Members Status
                  <span className="text-xs font-normal text-gray-500">{teamAttendanceList.length} workers</span>
                </h3>

                <div className="space-y-2">
                  {teamAttendanceList.length === 0 ? (
                    <p className="text-xs text-gray-500 text-center py-4">No team workers found</p>
                  ) : (
                    teamAttendanceList.map((w: any) => {
                      const statusLower = (w.status || "").toLowerCase();
                      const isPresent = ["present", "punched in", "active", "online"].includes(statusLower);
                      const isLate = statusLower === "late" || w.is_late;
                      const isHalfDay = statusLower === "half day" || statusLower === "half_day";
                      
                      let statusText = "Off Duty / Absent";
                      let badgeStyle = "bg-gray-100 text-gray-600 border-gray-200 dark:bg-zinc-800 dark:text-gray-400 dark:border-zinc-700";
                      
                      if (isLate) {
                        statusText = "Late";
                        badgeStyle = "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800/40";
                      } else if (isHalfDay) {
                        statusText = "Half Day";
                        badgeStyle = "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-400 dark:border-blue-800/40";
                      } else if (isPresent || w.punch_in) {
                        statusText = "Active / Present";
                        badgeStyle = "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800/40";
                      }

                      return (
                        <div key={w.id || w.employee_id} className="flex items-center justify-between p-2.5 bg-gray-50 dark:bg-zinc-800/50 rounded-xl border border-gray-100 dark:border-zinc-800">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                              {w.profile_photo_url ? (
                                <img src={w.profile_photo_url} alt={w.name} className="w-full h-full object-cover" />
                              ) : (
                                w.name?.charAt(0) || "W"
                              )}
                            </div>
                            <div>
                              <p className="text-xs font-bold text-gray-900 dark:text-white">{w.name}</p>
                              <p className="text-[10px] text-gray-500">
                                {w.designation || w.role || w.department || "Worker"}
                                {w.punch_in && <span className="ml-2 font-semibold text-emerald-600 dark:text-emerald-400">In: {w.punch_in}</span>}
                              </p>
                            </div>
                          </div>
                          <Badge variant="outline" className={cn("text-[10px] font-bold uppercase", badgeStyle)}>
                            {statusText}
                          </Badge>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* My Personal Leaves Tab */}
      {activeTab === "my_leaves" && (
        <WorkerLeaveTab leaveHistory={leaveHistory} isLoading={isLeavesLoading} onApplyLeave={() => setShowLeaveModal(true)} />
      )}

      {/* Overtime Tab */}
      {activeTab === "ot" && (
        <WorkerOTTab history={history} workerId={managerId} />
      )}

      {/* Sunday Work Tab */}
      {activeTab === "sunday" && (
        <WorkerSundayTab history={history} workerId={managerId} />
      )}

      {/* Notice Board Tab */}
      {activeTab === "notice" && (
        <WorkerNoticeTab notifications={notifications.filter((n: any) => n.type === 'general' || n.module === 'notice')} title="Notice Board" emptyText="No new notices" icon="megaphone" />
      )}

      {/* Production Dashboard Tab */}
      {activeTab === "production" && (
        <ProductionTab activeUser={activeUser} initialStage={prodStage} initialViewMode={prodView} autoOpenForm={prodAutoForm} />
      )}

      {/* Invoice Tab */}
      {activeTab === "invoice" && (
        <InvoiceTab activeUser={activeUser} />
      )}

      {/* Profile Tab */}
      {activeTab === "profile" && (
        <WorkerProfileTab 
          worker={activeUser} 
          onLogout={handleLogoutAction} 
          getTranslation={getTranslation}
          langIndex={langIndex}
        />
      )}

      {/* Settings Tab */}
      {activeTab === "settings" && (
         <WorkerSettingsTab />
      )}

      {/* Support Tab */}
      {activeTab === "support" && (
         <WorkerSupportTab />
      )}

      </div>

      {/* BOTTOM NAVIGATION (Simplified to Home Button only) */}
      <div className="fixed bottom-0 left-0 right-0 p-4 z-50 pointer-events-none flex justify-center">
        <div className="bg-white dark:bg-zinc-900 rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.12)] border border-gray-100 dark:border-zinc-800 p-2 flex items-center pointer-events-auto">
          <button 
            onClick={() => handleTabChange("home")} 
            className={`flex items-center gap-2 px-6 py-3 rounded-full transition-colors ${activeTab === 'home' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600' : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-zinc-800'}`}
          >
            <Home size={22} strokeWidth={2.5} />
            <span className="text-[13px] font-bold">Home</span>
          </button>
        </div>
      </div>

      {/* Sidebar Drawer */}
      <AnimatePresence>
        {showSidebar && (
          <>
            <motion.div 
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
              onClick={() => setShowSidebar(false)}
            />
            <motion.div 
              initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.3, ease: "easeInOut" }}
              className="fixed top-0 left-0 bottom-0 w-[80%] max-w-[320px] bg-white dark:bg-zinc-950 z-50 flex flex-col shadow-2xl border-r border-transparent dark:border-zinc-800"
            >
              <div className="p-6 bg-indigo-600 text-white">
                <div className="flex items-center gap-4 mb-6">
                  <div className="w-14 h-14 rounded-full bg-white/20 border-2 border-white/50 overflow-hidden flex items-center justify-center shrink-0">
                    {activeUser?.profile_photo_url ? (
                      <img src={activeUser.profile_photo_url} className="w-full h-full object-cover" />
                    ) : (
                      <span className="font-bold text-white text-xl">{activeUser?.name?.charAt(0) || "S"}</span>
                    )}
                  </div>
                  <div>
                    <h2 className="text-[18px] font-bold leading-tight">{activeUser?.name || "Supervisor"}</h2>
                    <p className="text-[12px] text-white/80 mt-1">{activeUser?.employee_id || "SUP-001"}</p>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2">
                <button onClick={() => { setShowSidebar(false); handleTabChange("profile"); }} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-50 dark:hover:bg-zinc-900 text-gray-700 dark:text-gray-300 transition-colors w-full text-left">
                  <UserCircle size={22} className="text-blue-500" />
                  <span className="font-semibold">{getTranslation(langIndex, "My Profile")}</span>
                </button>
                <button onClick={() => { setShowSidebar(false); handleTabChange("my_attendance"); }} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-50 dark:hover:bg-zinc-900 text-gray-700 dark:text-gray-300 transition-colors w-full text-left">
                  <CalendarCheck size={22} className="text-emerald-500" />
                  <span className="font-semibold">My Attendance</span>
                </button>
                <button onClick={() => { setShowSidebar(false); handleTabChange("my_leaves"); }} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-50 dark:hover:bg-zinc-900 text-gray-700 dark:text-gray-300 transition-colors w-full text-left">
                  <Briefcase size={22} className="text-pink-500" />
                  <span className="font-semibold">My Leaves</span>
                </button>
                <button onClick={() => { setShowSidebar(false); handleTabChange("ot"); }} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-50 dark:hover:bg-zinc-900 text-gray-700 dark:text-gray-300 transition-colors w-full text-left">
                  <Clock size={22} className="text-orange-500" />
                  <span className="font-semibold">Overtime</span>
                </button>
                <button onClick={() => { setShowSidebar(false); handleTabChange("sunday"); }} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-50 dark:hover:bg-zinc-900 text-gray-700 dark:text-gray-300 transition-colors w-full text-left">
                  <Sun size={22} className="text-yellow-500" />
                  <span className="font-semibold">Sunday / Festival</span>
                </button>
                <button onClick={() => { setShowSidebar(false); handleTabChange("notice"); }} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-50 dark:hover:bg-zinc-900 text-gray-700 dark:text-gray-300 transition-colors w-full text-left">
                  <Megaphone size={22} className="text-purple-500" />
                  <span className="font-semibold">Notices</span>
                </button>
                <button onClick={() => { setShowSidebar(false); handleTabChange("production"); }} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-50 dark:hover:bg-zinc-900 text-gray-700 dark:text-gray-300 transition-colors w-full text-left">
                  <Factory size={22} className="text-indigo-500" />
                  <span className="font-semibold">{getTranslation(langIndex, "Production")}</span>
                </button>
                <button onClick={() => { setShowSidebar(false); handleTabChange("invoice"); }} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-50 dark:hover:bg-zinc-900 text-gray-700 dark:text-gray-300 transition-colors w-full text-left">
                  <Receipt size={22} className="text-blue-500" />
                  <span className="font-semibold">{getTranslation(langIndex, "Purchase Invoices")}</span>
                </button>
                <button onClick={() => { setShowSidebar(false); handleTabChange("reports"); }} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-50 dark:hover:bg-zinc-900 text-gray-700 dark:text-gray-300 transition-colors w-full text-left">
                  <BarChart3 size={22} className="text-cyan-500" />
                  <span className="font-semibold">{getTranslation(langIndex, "Reports")}</span>
                </button>
                <button onClick={() => { setShowSidebar(false); handleTabChange("settings"); }} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-50 dark:hover:bg-zinc-900 text-gray-700 dark:text-gray-300 transition-colors w-full text-left">
                  <Grid size={22} className="text-gray-500" />
                  <span className="font-semibold">{getTranslation(langIndex, "App Settings")}</span>
                </button>
                <button onClick={() => { setShowSidebar(false); handleTabChange("support"); }} className="flex items-center gap-4 p-4 rounded-2xl hover:bg-gray-50 dark:hover:bg-zinc-900 text-gray-700 dark:text-gray-300 transition-colors w-full text-left">
                  <HelpCircle size={22} className="text-teal-500" />
                  <span className="font-semibold">{getTranslation(langIndex, "Help & Support")}</span>
                </button>
              </div>

              <div className="p-4 border-t border-gray-100 dark:border-zinc-800">
                <button onClick={() => { setShowSidebar(false); handleLogoutAction(); }} className="flex items-center justify-center gap-2 p-4 rounded-2xl bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900 transition-colors w-full font-bold">
                  <LogOut size={20} />
                  <span>{getTranslation(langIndex, "Logout")}</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <ApplyLeaveModal isOpen={showLeaveModal} onClose={() => setShowLeaveModal(false)} workerId={managerId} />

      {/* Selfie Camera Modal for Supervisor / Dispatch Personal Punch */}
      <AnimatePresence>
        {showCameraModal && (
          <Dialog open={showCameraModal} onOpenChange={setShowCameraModal}>
            <DialogContent className="max-w-sm rounded-3xl p-6 text-center">
              <DialogHeader>
                <DialogTitle className="text-xl font-extrabold flex items-center justify-center gap-2">
                  <Camera size={22} className="text-indigo-600" />
                  {punchAction} Selfie
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-4 my-2">
                {!previewImage ? (
                  <div className="relative aspect-[3/4] w-full rounded-2xl overflow-hidden bg-black flex items-center justify-center">
                    <Webcam
                      audio={false}
                      ref={webcamRef}
                      screenshotFormat="image/jpeg"
                      videoConstraints={{ facingMode: "user", width: { ideal: 720 }, height: { ideal: 960 } }}
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-4 border-2 border-dashed border-white/50 rounded-2xl pointer-events-none"></div>
                  </div>
                ) : (
                  <div className="relative aspect-[3/4] w-full rounded-2xl overflow-hidden border border-gray-200">
                    <img src={previewImage} alt="Selfie Preview" className="w-full h-full object-cover" />
                  </div>
                )}

                <div className="flex gap-2">
                  {!previewImage ? (
                    <Button onClick={handleCapture} className="w-full h-12 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold">
                      <Camera size={18} className="mr-2" /> Take Selfie
                    </Button>
                  ) : (
                    <>
                      <Button variant="outline" onClick={() => setPreviewImage(null)} className="flex-1 h-12 rounded-2xl font-bold">
                        <RotateCcw size={16} className="mr-1" /> Re-take
                      </Button>
                      <Button onClick={submitPunch} disabled={uploading} className="flex-1 h-12 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                        {uploading ? <Loader2 size={18} className="animate-spin" /> : "Submit Punch"}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </AnimatePresence>

    </div>
  );
}
