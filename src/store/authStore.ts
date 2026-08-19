import { create } from "zustand";

interface AuthState {
  token: string | null;
  refreshToken: string | null;
  email: string | null;
  name: string | null;
  role: string | null;
  isAuthenticated: boolean;
  login: (token: string, refreshToken: string, email: string, name: string, role: string) => void;
  updateToken: (token: string) => void;
  updateProfile: (name: string, email?: string) => void;
  logout: () => void;
  initialize: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  refreshToken: null,
  email: null,
  name: null,
  role: null,
  isAuthenticated: false,

  login: (token, refreshToken, email, name, role) => {
    localStorage.setItem("token", token);
    localStorage.setItem("refreshToken", refreshToken);
    localStorage.setItem("email", email);
    localStorage.setItem("name", name);
    localStorage.setItem("role", role);
    set({ token, refreshToken, email, name, role, isAuthenticated: true });
  },

  updateToken: (token) => {
    localStorage.setItem("token", token);
    set({ token });
  },

  updateProfile: (name, email) => {
    localStorage.setItem("name", name);
    if (email) localStorage.setItem("email", email);
    set((state) => ({ name, email: email || state.email }));
  },

  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("email");
    localStorage.removeItem("name");
    localStorage.removeItem("role");
    localStorage.removeItem("worker_token");
    localStorage.removeItem("worker_refreshToken");
    localStorage.removeItem("worker_info");
    localStorage.removeItem("username");
    set({ token: null, refreshToken: null, email: null, name: null, role: null, isAuthenticated: false });
  },

  initialize: () => {
    if (typeof window !== "undefined") {
      const token = localStorage.getItem("token") || localStorage.getItem("worker_token");
      const refreshToken = localStorage.getItem("refreshToken") || localStorage.getItem("worker_refreshToken");
      let email = localStorage.getItem("email");
      let name = localStorage.getItem("name");
      let role = localStorage.getItem("role");

      if (!email || !role) {
        const workerInfoStr = localStorage.getItem("worker_info");
        if (workerInfoStr) {
          try {
            const info = JSON.parse(workerInfoStr);
            email = email || info.email || `${info.employee_id || 'worker'}@foxflow.internal`;
            name = name || info.name || "Worker";
            role = role || info.role || "worker";
          } catch {}
        }
      }

      if (token) {
        set({ token, refreshToken, email: email || "worker@foxflow.internal", name: name || "Worker", role: role || "worker", isAuthenticated: true });
      }
    }
  },
}));
