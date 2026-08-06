"use client";

import { useEffect, useCallback, useRef } from "react";
import axios from "axios";

/**
 * Enterprise-grade session keep-alive hook.
 * 
 * Listens for app resume (visibilitychange) and proactively refreshes
 * the access token before any API call can fail with 401.
 * 
 * This is critical for mobile PWA workers who background the app
 * and reopen it hours later.
 */
export function useSessionKeepAlive(opts?: {
  /** Which localStorage key holds the refresh token */
  refreshTokenKey?: string;
  /** Which localStorage key holds the access token */
  accessTokenKey?: string;
  /** Optional callback on successful refresh */
  onRefreshed?: (newToken: string) => void;
  /** Optional callback when refresh fails (session truly expired) */
  onSessionExpired?: () => void;
}) {
  const {
    refreshTokenKey = "worker_refreshToken",
    accessTokenKey = "worker_token",
    onRefreshed,
    onSessionExpired,
  } = opts || {};

  const isRefreshing = useRef(false);

  const refreshSession = useCallback(async () => {
    if (isRefreshing.current) return;
    isRefreshing.current = true;

    try {
      const refreshToken = localStorage.getItem(refreshTokenKey);
      if (!refreshToken) {
        onSessionExpired?.();
        return;
      }

      const response = await axios.post(
        "/api/auth/refresh",
        { refresh_token: refreshToken },
        { 
          withCredentials: true, 
          timeout: 10000,
          headers: { "ngrok-skip-browser-warning": "true" }
        }
      );

      const newToken = response.data.access_token;
      if (newToken) {
        localStorage.setItem(accessTokenKey, newToken);
        
        // Also update worker_info if it exists
        const infoStr = localStorage.getItem("worker_info");
        if (infoStr) {
          try {
            const info = JSON.parse(infoStr);
            info.access_token = newToken;
            localStorage.setItem("worker_info", JSON.stringify(info));
          } catch {}
        }

        onRefreshed?.(newToken);
      }
    } catch (err: any) {
      // Only treat 401/403 as truly expired
      if (err.response?.status === 401 || err.response?.status === 403) {
        onSessionExpired?.();
      }
      // Network errors are transient — don't log out
    } finally {
      isRefreshing.current = false;
    }
  }, [refreshTokenKey, accessTokenKey, onRefreshed, onSessionExpired]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // App came back to foreground — proactively refresh
        refreshSession();
      }
    };

    // Also refresh on first mount (app cold start / page load)
    refreshSession();

    document.addEventListener("visibilitychange", handleVisibilityChange);
    
    // Periodic keep-alive every 10 minutes while app is active
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") {
        refreshSession();
      }
    }, 10 * 60 * 1000);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      clearInterval(interval);
    };
  }, [refreshSession]);
}
