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
        router.replace("/workforce/login");
        return;
      }

      // We have worker_info — try to use it
      if (workerInfoStr) {
        try {
          const info = JSON.parse(workerInfoStr);

          // Ensure token is synced across keys
          const token = localStorage.getItem("worker_token") || localStorage.getItem("token") || info.access_token;
          if (token) {
            localStorage.setItem("worker_token", token);
            localStorage.setItem("token", token);
          }

          // Fetch latest worker profile in background so shift timings, role, and details are always up to date
          try {
            const currentToken = localStorage.getItem("worker_token") || localStorage.getItem("token") || info.access_token;
            if (currentToken) {
              const meRes = await axios.get("/api/auth/me", {
                headers: { 
                  Authorization: `Bearer ${currentToken}`,
                  "ngrok-skip-browser-warning": "true"
                },
                timeout: 5000,
                validateStatus: (status) => status < 500 // Prevent Turbopack console AxiosError popups
              });

              if (meRes.status === 200 && meRes.data) {
                Object.assign(info, meRes.data);
                const actualRole = (meRes.data.role || info.role || "").toLowerCase();
                if (actualRole) {
                  info.role = actualRole;
                  localStorage.setItem("role", actualRole);
                }
                localStorage.setItem("worker_info", JSON.stringify(info));
              } else if (meRes.status === 401 && refreshToken) {
                // If token expired, perform silent refresh quietly
                const refreshRes = await axios.post(
                  "/api/auth/refresh",
                  { refresh_token: refreshToken },
                  { 
                    withCredentials: true, 
                    timeout: 5000,
                    headers: { "ngrok-skip-browser-warning": "true" },
                    validateStatus: (status) => status < 500
                  }
                );
                if (refreshRes.status === 200 && refreshRes.data?.access_token) {
                  const newToken = refreshRes.data.access_token;
                  info.access_token = newToken;
                  localStorage.setItem("worker_token", newToken);
                  localStorage.setItem("token", newToken);
                  localStorage.setItem("worker_info", JSON.stringify(info));
                } else if (refreshRes.status === 401 || refreshRes.status === 403) {
                  console.warn("[WorkforceAuth] Session expired. Redirecting to login.");
                  localStorage.clear();
                  router.replace("/workforce/login");
                  return;
                }
              }
            }
          } catch {
            // Proceed with cached info if offline or network error
          }

          // Fallback check: if user is admin Sonu (id=1 or skhjp2000@gmail.com) or role in localStorage is admin/supervisor
          const storedRole = (localStorage.getItem("role") || "").toLowerCase();
          if (["admin", "owner", "manager", "supervisor", "dispatcher"].includes(storedRole)) {
            info.role = storedRole;
          }
          if (info.id === 1 || info.email === "skhjp2000@gmail.com") {
            info.role = "admin";
            localStorage.setItem("role", "admin");
            localStorage.setItem("worker_info", JSON.stringify(info));
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
            { 
              withCredentials: true, 
              timeout: 10000,
              headers: { "ngrok-skip-browser-warning": "true" }
            }
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
        router.replace("/workforce/login");
        return;
      }

      // Fallback
      router.replace("/workforce/login");
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
    router.replace("/workforce/login");
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

  let role = (worker.role || localStorage.getItem("role") || "").toLowerCase();
  if (worker.id === 1 || worker.email === "skhjp2000@gmail.com") {
    role = "admin";
  }
  if (!role) {
    role = "worker";
  }

  switch (role) {
    case "admin":
    case "owner":
      return <AdminDashboard worker={worker} onLogout={handleLogout} />;
    case "manager":
      return <ManagerDashboard worker={worker} onLogout={handleLogout} />;
    case "supervisor":
      return <SupervisorDashboard worker={worker} onLogout={handleLogout} />;
    case "dispatcher":
    case "dispatch":
      return <SupervisorDashboard worker={worker} onLogout={handleLogout} />;
    case "attendance":
    case "attendance_only":
      if (typeof window !== "undefined") {
        window.location.href = "/attendance";
      }
      return null;
    default:
      if (worker.department?.toLowerCase() === "dispatch") {
        return <SupervisorDashboard worker={worker} onLogout={handleLogout} />;
      }
      // Default fallback is worker
      return <WorkerDashboard worker={worker} onLogout={handleLogout} setWorker={handleSetWorker} />;
  }
}
