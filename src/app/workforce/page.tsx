"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { WorkerDashboard } from "./WorkerDashboard";
import { SupervisorDashboard } from "./SupervisorDashboard";
import { ManagerDashboard } from "./ManagerDashboard";
import { AdminDashboard } from "./AdminDashboard";
import { Loader2 } from "lucide-react";
import { authApi } from "@/lib/api";
import axios from "axios";

export default function WorkforceOrchestrator() {
  const router = useRouter();
  const [worker, setWorker] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function initSession() {
      const workerInfoStr = localStorage.getItem("worker_info");
      const refreshToken = localStorage.getItem("worker_refreshToken");

      // No stored session at all → go to login
      if (!workerInfoStr && !refreshToken) {
        router.push("/workforce/login");
        return;
      }

      // We have worker_info — try to use it
      if (workerInfoStr) {
        try {
          const info = JSON.parse(workerInfoStr);

          // Attempt a silent token refresh to ensure the session is still valid
          if (refreshToken) {
            try {
              const res = await axios.post(
                "/api/auth/refresh",
                { refresh_token: refreshToken },
                { withCredentials: true, timeout: 10000 }
              );
              const newToken = res.data.access_token;
              if (newToken) {
                info.access_token = newToken;
                localStorage.setItem("worker_token", newToken);
                localStorage.setItem("worker_info", JSON.stringify(info));
              }
            } catch (refreshErr: any) {
              // If refresh fails with auth error, session is truly expired
              if (refreshErr.response?.status === 401 || refreshErr.response?.status === 403) {
                console.warn("[WorkforceAuth] Session expired. Redirecting to login.");
                localStorage.clear();
                router.push("/workforce/login");
                return;
              }
              // Network errors are transient — proceed with existing token
              console.warn("[WorkforceAuth] Refresh failed (network), proceeding with cached token.");
            }
          }

          setWorker(info);
          setLoading(false);
          return;
        } catch (e) {
          // Corrupted worker_info
          console.error("[WorkforceAuth] Corrupted worker_info:", e);
        }
      }

      // Have refreshToken but no worker_info — try to refresh and rebuild
      if (refreshToken) {
        try {
          const res = await axios.post(
            "/api/auth/refresh",
            { refresh_token: refreshToken },
            { withCredentials: true, timeout: 10000 }
          );
          const newToken = res.data.access_token;
          if (newToken) {
            localStorage.setItem("worker_token", newToken);
            // We don't have full worker_info, redirect to login to get it
            // (This is a rare edge case)
          }
        } catch {
          // Refresh truly failed
        }
        // Can't reconstruct worker_info → login
        localStorage.clear();
        router.push("/workforce/login");
        return;
      }

      // Fallback
      router.push("/workforce/login");
    }

    initSession();
  }, [router]);

  const handleLogout = async () => {
    try {
      await authApi.logout();
    } catch (e) {
      console.error("Backend logout failed:", e);
    }
    localStorage.clear();
    router.push("/workforce/login");
  };

  const handleSetWorker = (newWorker: any) => {
    setWorker(newWorker);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F7F9FC] flex flex-col items-center justify-center">
        <Loader2 className="animate-spin text-blue-600 w-10 h-10" />
      </div>
    );
  }

  if (!worker) return null;

  const role = worker.role?.toLowerCase() || "worker";

  switch (role) {
    case "admin":
    case "owner":
      return <AdminDashboard worker={worker} onLogout={handleLogout} />;
    case "manager":
      return <ManagerDashboard worker={worker} onLogout={handleLogout} />;
    case "supervisor":
      return <SupervisorDashboard worker={worker} onLogout={handleLogout} />;
    default:
      // Default fallback is worker
      return <WorkerDashboard worker={worker} onLogout={handleLogout} setWorker={handleSetWorker} />;
  }
}
