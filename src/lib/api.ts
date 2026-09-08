import axios from "axios";

const getApiUrl = () => {
  if (typeof window === "undefined") {
    const base = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
    return `${base}/api`;
  }
  return "/api";
};

const API_URL = getApiUrl();

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true"
  },
});

import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";

declare global {
  interface Window {
    _lastTimeoutToast?: number;
  }
}

api.interceptors.request.use(
  (config) => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token") || localStorage.getItem("worker_token");
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

let isRefreshing = false;
let failedQueue: any[] = [];

const processQueue = (error: any, token: string | null = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  failedQueue = [];
};

api.interceptors.response.use(
  (response) => {
    // Backwards-compatibility for older live backend returning flat arrays
    if (Array.isArray(response.data) && response.config.url && (
      response.config.url.includes("/workers") ||
      response.config.url.includes("/vehicles") ||
      response.config.url.includes("/invoices") ||
      response.config.url.includes("/revenue") ||
      response.config.url.includes("/quality") ||
      response.config.url.includes("/dispatch") ||
      response.config.url.includes("/users") ||
      response.config.url.includes("/attendance/logs/detailed")
    )) {
      let items = [...response.data];
      const params = response.config.params || {};

      // 1. Client-side Search Filter
      if (params.search) {
        const query = params.search.toLowerCase().trim();
        items = items.filter((item: any) => 
          (item.name && item.name.toLowerCase().includes(query)) ||
          (item.employee_id && item.employee_id.toLowerCase().includes(query)) ||
          (item.employeeId && item.employeeId.toLowerCase().includes(query)) ||
          (item.vehicleNumber && item.vehicleNumber.toLowerCase().includes(query)) ||
          (item.trackingId && item.trackingId.toLowerCase().includes(query)) ||
          (item.oemName && item.oemName.toLowerCase().includes(query))
        );
      }

      // 2. Client-side Department Filter
      if (params.department && params.department !== "All") {
        const dept = params.department.toLowerCase().trim();
        items = items.filter((item: any) => 
          (item.department && item.department.toLowerCase() === dept) ||
          (item.department && dept === "qc" && item.department.toLowerCase() === "quality") ||
          (item.department && dept === "quality" && item.department.toLowerCase() === "qc")
        );
      }

      // 3. Client-side Status Filter
      if (params.status && params.status !== "All") {
        const status = params.status.toLowerCase().trim();
        items = items.filter((item: any) => 
          item.status && item.status.toLowerCase() === status
        );
      }

      // 4. Client-side Pagination
      const page = params.page ? parseInt(params.page) : 1;
      const pageSize = params.page_size ? parseInt(params.page_size) : 10;
      const total = items.length;
      const totalPages = Math.max(1, Math.ceil(total / pageSize));
      const offset = (page - 1) * pageSize;
      const paginatedItems = items.slice(offset, offset + pageSize);

      response.data = {
        items: paginatedItems,
        total: total,
        page: page,
        page_size: pageSize,
        total_pages: totalPages
      };
    }
    return response;
  },
  async (error) => {
    // Normalize Pydantic validation errors (arrays of objects) into a clean string to prevent React rendering crashes
    if (error.response?.data?.detail) {
      const detail = error.response.data.detail;
      if (Array.isArray(detail)) {
        error.response.data.detail = detail
          .map((err: any) => {
            const field = err.loc ? err.loc[err.loc.length - 1] : "";
            return `${field ? `'${field}' ` : ""}${err.msg}`;
          })
          .join(", ");
      } else if (typeof detail === "object") {
        error.response.data.detail = JSON.stringify(detail);
      }
    }

    const originalRequest = error.config;
    
    // Ignore login, refresh, or registration requests to prevent infinite refresh loops
    if (
      originalRequest.url.includes('/auth/login') || 
      originalRequest.url.includes('/auth/worker-login') || 
      originalRequest.url.includes('/auth/refresh') || 
      originalRequest.url.includes('/auth/register')
    ) {
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !originalRequest._retry) {
      if (isRefreshing) {
        return new Promise(function(resolve, reject) {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = 'Bearer ' + token;
          return api(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = typeof window !== "undefined" ? (localStorage.getItem("refreshToken") || localStorage.getItem("worker_refreshToken")) : null;
        
        const response = await axios.post(
          `${API_URL}/auth/refresh`,
          refreshToken ? { refresh_token: refreshToken } : {},
          { 
            withCredentials: true,
            headers: { "ngrok-skip-browser-warning": "true" }
          }
        );
        const newToken = response.data.access_token;
        
        if (typeof window !== "undefined") {
          if (localStorage.getItem("worker_token")) {
            localStorage.setItem("worker_token", newToken);
            const infoStr = localStorage.getItem("worker_info");
            if (infoStr) {
              try {
                const info = JSON.parse(infoStr);
                info.access_token = newToken;
                localStorage.setItem("worker_info", JSON.stringify(info));
              } catch (e) {}
            }
          } else {
            useAuthStore.getState().updateToken(newToken);
          }
        }
        
        processQueue(null, newToken);
        originalRequest.headers.Authorization = 'Bearer ' + newToken;
        return api(originalRequest);
      } catch (err: any) {
        processQueue(err, null);
        
        // Only log out if it's an actual rejection from the server (e.g. 401/400) 
        // and not just a network drop/timeout.
        if (err.response && (err.response.status === 401 || err.response.status === 400 || err.response.status === 403)) {
          if (typeof window !== "undefined") {
            const isWorker = !!localStorage.getItem("worker_token");
            if (isWorker) {
              localStorage.clear();
              window.location.href = '/workforce/login';
            } else {
              useAuthStore.getState().logout();
              window.location.href = '/login';
            }
          }
        }
        return Promise.reject(err);
      } finally {
        isRefreshing = false;
      }
    }
    
    // Handle Ngrok/Cloudflare timeouts (504) or Network Errors
    if (error.response?.status === 504 || error.message === 'Network Error') {
      console.warn("Server timeout or network error. It might be reloading.");
      if (typeof window !== "undefined" && !window.location.pathname.includes('/login')) {
        // Only show toast once every few seconds to avoid spam
        if (!window._lastTimeoutToast || Date.now() - window._lastTimeoutToast > 5000) {
          window._lastTimeoutToast = Date.now();
          toast.error("Server is reconnecting. Please wait a moment...", { id: "network-timeout" });
        }
      }
    }

    return Promise.reject(error);
  }
);

export const authApi = {
  register: async (email: string, name: string, password?: string, role = "operator", dealer_name?: string) => {
    const payload: any = { email, name, role };
    if (password) payload.password = password;
    if (dealer_name) payload.dealer_name = dealer_name;
    const response = await api.post("/auth/register", payload);
    return response.data;
  },
  login: async (username: string, password: string) => {
    const formData = new URLSearchParams();
    formData.append("username", username);
    formData.append("password", password);
    const response = await api.post("/auth/login", formData, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    return response.data;
  },
  logout: async () => {
    const response = await api.post("/auth/logout");
    return response.data;
  },
  requestOtp: async (email: string) => {
    const response = await api.post("/auth/request-otp", { email });
    return response.data;
  },
  verifyOtp: async (email: string, otp_code: string) => {
    const response = await api.post("/auth/verify-otp", { email, otp_code });
    return response.data;
  },
  refresh: async (refreshToken?: string) => {
    const payload = refreshToken ? { refresh_token: refreshToken } : {};
    const response = await api.post("/auth/refresh", payload);
    return response.data;
  },
  getSetupStatus: async () => {
    const response = await api.get("/auth/setup-status");
    return response.data;
  },
  me: async () => {
    const response = await api.get("/auth/me");
    return response.data;
  },
};

export const vehiclesApi = {
  getAll: async (params?: { page?: number; pageSize?: number; search?: string }) => {
    const response = await api.get("/vehicles", { params: { page: params?.page ?? 1, page_size: params?.pageSize ?? 10, search: params?.search } });
    return response.data;
  },
  getOne: async (id: number | string) => {
    const response = await api.get(`/vehicles/${id}`);
    return response.data;
  },
  create: async (data: any) => {
    const response = await api.post("/vehicles", data);
    return response.data;
  },
  oemSubmit: async (data: any) => {
    const response = await api.post("/vehicles/oem-dispatch", data);
    return response.data;
  },
  update: async (id: number | string, data: any) => {
    const response = await api.put(`/vehicles/${id}`, data);
    return response.data;
  },
  updateStage: async (id: number | string, stage: string, progress?: number, priority?: string, reason?: string) => {
    const data: any = { stage };
    if (progress !== undefined) {
      data.progress = progress;
      data.progress_percent = progress;
    }
    if (priority !== undefined) data.priority = priority;
    if (reason !== undefined) data.reason = reason;
    const response = await api.patch(`/vehicles/${id}/stage`, data);
    return response.data;
  },
  verify: async (id: number | string, data: any) => {
    const response = await api.post(`/vehicles/${id}/verify`, data);
    return response.data;
  },
  reject: async (id: number | string, reason: string) => {
    const response = await api.post(`/vehicles/${id}/reject`, { reason });
    return response.data;
  },
};

export const workersApi = {
  getAll: async (params?: { page?: number; pageSize?: number; search?: string; department?: string; status?: string }) => {
    const response = await api.get("/workers", { params: { page: params?.page ?? 1, page_size: params?.pageSize ?? 10, search: params?.search, department: params?.department, status: params?.status } });
    return response.data;
  },
  getOne: async (id: number | string) => {
    const response = await api.get(`/workers/${id}`);
    return response.data;
  },
  create: async (data: any) => {
    const response = await api.post("/workers", data);
    return response.data;
  },
  update: async (id: number | string, data: any) => {
    const response = await api.put(`/workers/${id}`, data);
    return response.data;
  },
  updateStatus: async (id: number | string, status: string, reason: string = "") => {
    const response = await api.patch(`/workers/${id}/status`, { status, reason });
    return response.data;
  },
  archive: async (id: number | string, reason: string) => {
    const response = await api.post(`/workers/${id}/archive`, { reason });
    return response.data;
  },
  resetPassword: async (id: number | string, reason: string) => {
    const response = await api.post(`/workers/${id}/reset-password`, { reason });
    return response.data;
  },
  getPerformanceMonthly: async (month?: string) => {
    const params = month ? { month } : {};
    const response = await api.get("/workers/performance/monthly", { params });
    return response.data;
  },
  delete: async (id: number | string) => {
    const response = await api.delete(`/workers/${id}`);
    return response.data;
  }
};

export const qualityApi = {
  getAll: async (params?: { page?: number; pageSize?: number; search?: string }) => {
    const response = await api.get("/quality", { params: { page: params?.page ?? 1, page_size: params?.pageSize ?? 10, search: params?.search } });
    return response.data;
  },
  getOne: async (id: number | string) => {
    const response = await api.get(`/quality/${id}`);
    return response.data;
  },
  create: async (data: any) => {
    const response = await api.post("/quality", data);
    return response.data;
  },
  update: async (id: number | string, data: any) => {
    const response = await api.put(`/quality/${id}`, data);
    return response.data;
  },
  uploadPhoto: async (id: number | string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post(`/quality/${id}/photos`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },
  createDefect: async (data: any) => {
    const response = await api.post("/quality/defects", data);
    return response.data;
  },
  updateDefectStatus: async (id: number | string, status: string) => {
    const response = await api.put(`/quality/defects/${id}/status?status_str=${encodeURIComponent(status)}`);
    return response.data;
  },
};

export const dispatchApi = {
  getAll: async (params?: { page?: number; pageSize?: number; search?: string; month?: string; start_date?: string; end_date?: string }) => {
    const response = await api.get("/dispatch", { params: { page: params?.page ?? 1, page_size: params?.pageSize ?? 10, search: params?.search, month: params?.month, start_date: params?.start_date, end_date: params?.end_date } });
    return response.data;
  },
  create: async (data: any) => {
    const response = await api.post("/dispatch", data);
    return response.data;
  },
  update: async (id: number | string, data: any) => {
    const response = await api.put(`/dispatch/${id}`, data);
    return response.data;
  },
  updateStatus: async (id: number | string, status: string) => {
    const response = await api.patch(`/dispatch/${id}/status`, { status });
    return response.data;
  },
  delete: async (id: number | string) => {
    const response = await api.delete(`/dispatch/${id}`);
    return response.data;
  },
};

export const invoicesApi = {
  getAll: async (params?: { page?: number; pageSize?: number; search?: string; approval_status?: string; payment_status?: string; vendor?: string; department?: string; category?: string; start_date?: string; end_date?: string; date_from?: string; date_to?: string }) => {
    const response = await api.get("/invoices", { params: { page: params?.page ?? 1, page_size: params?.pageSize ?? 10, ...params } });
    return response.data;
  },
  getOne: async (id: number | string) => {
    const response = await api.get(`/invoices/${id}`);
    return response.data;
  },
  getDashboardStats: async (params?: { start_date?: string; end_date?: string }) => {
    const response = await api.get("/invoices/dashboard-stats", { params });
    return response.data;
  },
  getAnalytics: async (params?: { start_date?: string; end_date?: string }) => {
    const response = await api.get("/invoices/analytics", { params });
    return response.data;
  },
  upload: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post("/invoices/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },
  create: async (data: any) => {
    const response = await api.post("/invoices", data);
    return response.data;
  },
  update: async (id: number | string, data: any) => {
    const response = await api.patch(`/invoices/${id}`, data);
    return response.data;
  },
  delete: async (id: number | string) => {
    const response = await api.delete(`/invoices/${id}`);
    return response.data;
  }
};

export const revenueApi = {
  getAll: async (params?: { page?: number; pageSize?: number; search?: string; approval_status?: string; payment_status?: string; customer?: string; oem?: string; work_type?: string; start_date?: string; end_date?: string }) => {
    const response = await api.get("/revenue", { params: { page: params?.page ?? 1, page_size: params?.pageSize ?? 10, ...params } });
    return response.data;
  },
  getOne: async (id: number | string) => {
    const response = await api.get(`/revenue/${id}`);
    return response.data;
  },
  getDashboardStats: async (params?: { start_date?: string; end_date?: string }) => {
    const response = await api.get("/revenue/dashboard-stats", { params });
    return response.data;
  },
  getAnalytics: async (params?: { start_date?: string; end_date?: string }) => {
    const response = await api.get("/revenue/analytics", { params });
    return response.data;
  },
  upload: async (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    const response = await api.post("/revenue/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return response.data;
  },
  create: async (data: any) => {
    const response = await api.post("/revenue", data);
    return response.data;
  },
  update: async (id: number | string, data: any) => {
    const response = await api.patch(`/revenue/${id}`, data);
    return response.data;
  },
  delete: async (id: number | string) => {
    const response = await api.delete(`/revenue/${id}`);
    return response.data;
  }
};

export const activitiesApi = {
  getAll: async () => {
    const response = await api.get("/activities");
    return response.data;
  },
  create: async (data: any) => {
    const response = await api.post("/activities", data);
    return response.data;
  },
};

export const notificationsApi = {
  getAll: async (unreadOnly: boolean = false) => {
    const response = await api.get(`/notifications?unread_only=${unreadOnly}`);
    return response.data;
  },
  markAsRead: async (id: number | string) => {
    const response = await api.post(`/notifications/${id}/read`);
    return response.data;
  },
  markAsClicked: async (id: number | string) => {
    const response = await api.post(`/notifications/${id}/click`);
    return response.data;
  },
  markAllAsRead: async () => {
    const response = await api.post("/notifications/read-all");
    return response.data;
  },
};

export const attendanceApi = {
  getSettings: async () => {
    const response = await api.get("/settings/attendance");
    return response.data;
  },
  getAnalytics: async () => {
    const response = await api.get("/attendance/analytics");
    return response.data;
  },
  getLogs: async (params?: { page?: number; pageSize?: number; search?: string; status?: string; department?: string; date_from?: string; date_to?: string }) => {
    const { pageSize, ...rest } = params || {};
    const response = await api.get("/attendance/logs/detailed", { params: { page: rest?.page ?? 1, page_size: pageSize ?? 10, ...rest } });
    return response.data;
  },
  getAll: async () => {
    const response = await api.get("/attendance");
    return response.data;
  },
  getExceptions: async () => {
    const response = await api.get("/attendance/exceptions");
    return response.data;
  },
  approveException: async (id: number | string, reason: string) => {
    const response = await api.put(`/attendance/exceptions/${id}/approve`, { reason });
    return response.data;
  },
  update: async (id: number | string, data: any) => {
    const response = await api.put(`/attendance/${id}`, data);
    return response.data;
  },
  getWorkerSummary: async (workerId: string | number) => {
    const response = await api.get(`/attendance/worker/${workerId}/summary`);
    return response.data;
  },
  getWorkerHistory: async (workerId: string | number, month?: string) => {
    const url = month ? `/attendance/worker/${workerId}/history?month=${month}` : `/attendance/worker/${workerId}/history`;
    const response = await api.get(url);
    return response.data;
  },
  getWorkerMonthlySummary: async (workerId: string | number, month?: string) => {
    const url = month ? `/attendance/worker/${workerId}/monthly-summary?month=${month}` : `/attendance/worker/${workerId}/monthly-summary`;
    const response = await api.get(url);
    return response.data;
  },
  getWorkerFullMonthLogs: async (workerId: string | number, month?: string) => {
    const url = month ? `/attendance/worker/${workerId}/full-month-logs?month=${month}` : `/attendance/worker/${workerId}/full-month-logs`;
    const response = await api.get(url);
    return response.data;
  },
  markDayAttendance: async (data: {
    worker_id: number | string;
    date: string;
    status: string;
    punch_in_time?: string;
    punch_out_time?: string;
    net_working_hours?: number;
    ot_hours?: number;
    is_sunday?: boolean;
    reason?: string;
  }) => {
    const response = await api.post("/attendance/mark-day", data);
    return response.data;
  },
  submitCorrection: async (workerId: string | number, dateStr: string, type: string, notes: string) => {
    const response = await api.post(`/attendance/exceptions?worker_id=${workerId}&date_str=${dateStr}&type=${encodeURIComponent(type)}&notes=${encodeURIComponent(notes)}`);
    return response.data;
  },
  applyLeave: async (workerId: string | number, startDate: string, endDate: string, type: string, reason: string) => {
    const response = await api.post(`/leave/`, {
      worker_id: Number(workerId),
      start_date: startDate,
      end_date: endDate,
      leave_type: type,
      reason: reason
    });
    return response.data;
  },
  getLeaveHistory: async (workerId: string | number) => {
    const response = await api.get(`/leave/worker/${workerId}`);
    return response.data;
  },
  updateProfile: async (workerId: string | number, profileData: any) => {
    const response = await api.put(`/workers/${workerId}/profile_edit`, profileData);
    return response.data;
  },
  getDocuments: async (workerId: string | number) => {
    const response = await api.get(`/documents/worker/${workerId}`);
    return response.data;
  },
  getSalaryHistory: async (workerId: string | number) => {
    const response = await api.get(`/payroll/worker/${workerId}`);
    return response.data;
  },
  getTeamSummary: async (managerId: string | number) => {
    const response = await api.get(`/team/summary/${managerId}`);
    return response.data;
  },
  getPendingRequests: async (managerId: string | number) => {
    const response = await api.get(`/team/pending-requests/${managerId}`);
    return response.data;
  },
  delete: async (id: number | string) => {
    const response = await api.delete(`/attendance/${id}`);
    return response.data;
  }
};

export const jobsApi = {
  assign: async (data: any) => {
    const response = await api.post("/jobs/assign", data);
    return response.data;
  },
  getWorkerTodayJobs: async (workerId: string | number) => {
    const response = await api.get(`/jobs/worker/${workerId}/today`);
    return response.data;
  },
  getWorkerJobs: async (workerId: string | number) => {
    const response = await api.get(`/jobs/worker/${workerId}`);
    return response.data;
  },
  updateStatus: async (jobId: string | number, data: any) => {
    const response = await api.patch(`/jobs/${jobId}/status`, data);
    return response.data;
  },
  getWorkerJobHistory: async (workerId: string | number) => {
    const response = await api.get(`/jobs/worker/${workerId}/history`);
    return response.data;
  }
};

export const payrollApi = {
  getSummary: async (month?: string) => {
    const params = month ? { month } : {};
    const response = await api.get("/payroll/summary", { params });
    return response.data;
  },
  getEmployeePayroll: async (month?: string) => {
    const params = month ? { month } : {};
    const response = await api.get("/payroll/employees", { params });
    return response.data;
  },
  updateEmployeePayroll: async (workerId: number | string, data: any) => {
    const response = await api.put(`/payroll/employees/${workerId}`, data);
    return response.data;
  },
  generate: async (month?: string) => {
    const params = month ? { month } : {};
    const response = await api.post("/payroll/generate", null, { params });
    return response.data;
  },
  deleteEmployeePayroll: async (workerId: number | string, month: string) => {
    const response = await api.delete(`/payroll/employees/${workerId}?month=${month}`);
    return response.data;
  }
};

export const leaveApi = {
  getAll: async () => {
    const response = await api.get("/leave");
    return response.data;
  },
  updateStatus: async (id: number | string, data: { status: string, remarks?: string }) => {
    const response = await api.put(`/leave/${id}/status`, data);
    return response.data;
  }
};

export const componentsApi = {
  startTask: async (component_type: string, component_number: string, partner_id?: string | number) => {
    const payload: any = { component_type, component_number };
    if (partner_id) payload.partner_id = parseInt(partner_id as string);
    const response = await api.post("/components/start", payload);
    return response.data;
  },
  updateTask: async (task_id: number, data: { component_type?: string, component_number?: string, partner_id?: string | number }) => {
    if (data.partner_id) data.partner_id = parseInt(data.partner_id as string);
    const response = await api.put(`/components/${task_id}`, data);
    return response.data;
  },
  submitTask: async (task_id: number, photo_proof_url: string, notes?: string) => {
    const response = await api.post(`/components/${task_id}/submit`, { photo_proof_url, notes });
    return response.data;
  },
  getWorkerTasks: async (worker_id: number) => {
    const response = await api.get(`/components/worker/${worker_id}`);
    return response.data;
  },
  getAllTasks: async () => {
    const response = await api.get("/components");
    return response.data;
  },
  deleteTask: async (task_id: number) => {
    const response = await api.delete(`/components/${task_id}`);
    return response.data;
  }
};

export const performanceApi = {
  getDashboard: async (params?: { date?: string; month?: string; department?: string; supervisor_id?: number }) => {
    const response = await api.get("/performance/dashboard", { params });
    return response.data;
  },
  getWorkers: async (params?: { date?: string; page?: number; page_size?: number; search?: string; sort_by?: string; sort_order?: string; department?: string }) => {
    const response = await api.get("/performance/workers", { params });
    return response.data;
  },
  getWorker: async (workerId: string | number, params?: { date?: string; history_days?: number }) => {
    const response = await api.get(`/performance/worker/${workerId}`, { params });
    return response.data;
  },
  approveWorker: async (workerId: string | number, data: { date?: string; remarks?: string; status?: string }) => {
    const response = await api.post(`/performance/worker/${workerId}/approve`, data);
    return response.data;
  }
};

