"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { authApi } from "@/lib/api";
import { useAuthStore } from "@/store/authStore";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Loader2, ArrowRight, Mail, ShieldCheck, UserPlus, ArrowLeft } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

type AuthStep = "login" | "register" | "accept-invite";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [regName, setRegName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regRole, setRegRole] = useState("operator");
  const [regDealerName, setRegDealerName] = useState("");

  const [step, setStep] = useState<AuthStep>("login");
  const [loading, setLoading] = useState(false);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [setupRequired, setSetupRequired] = useState(false);

  const router = useRouter();
  const { login: loginStore, initialize } = useAuthStore();

  React.useEffect(() => {
    initialize();
    const token = localStorage.getItem("token");
    const role = localStorage.getItem("role");

    if (token && role) {
      if (role.toLowerCase() === "worker") {
        router.push("/workforce");
      } else if (role.toLowerCase() === "supervisor") {
        router.push("/workforce/supervisor");
      } else {
        router.push("/");
      }
      return;
    }

    // Check search params for invite/error
    const searchParams = typeof window !== "undefined" ? new URLSearchParams(window.location.search) : null;
    const emailParam = searchParams?.get("email") || "";
    const inviteParam = searchParams?.get("invite") === "true";
    const errorParam = searchParams?.get("error") || "";

    if (errorParam === "invite_only") {
      toast.error("This Google account has not been invited. Please contact your system administrator.");
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    const checkSetupAndInvite = async () => {
      try {
        const { setup_required } = await authApi.getSetupStatus();
        setSetupRequired(setup_required);
        
        if (setup_required) {
          setRegRole("admin");
          setStep("register");
        } else if (inviteParam && emailParam) {
          setRegEmail(emailParam);
          setStep("accept-invite");
        }
      } catch (err) {
        console.error("Failed to check setup status:", err);
      } finally {
        setCheckingAuth(false);
      }
    };

    checkSetupAndInvite();
  }, [initialize, router]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please enter email/mobile and password");
      return;
    }

    setLoading(true);
    try {
      const data = await authApi.login(email, password);
      loginStore(data.access_token, data.refresh_token, data.email || data.username, data.name, data.role);
      toast.success("Successfully signed in!");
      if (data.role?.toLowerCase() === "worker") {
        router.push("/workforce");
      } else if (data.role?.toLowerCase() === "supervisor") {
        router.push("/workforce/supervisor");
      } else {
        router.push("/");
      }
    } catch (err: any) {
      console.error(err);
      const detail = err.response?.data?.detail || "Incorrect username or password";
      toast.error(detail);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regEmail || !regName || !regPassword) {
      toast.error("Please fill in all fields");
      return;
    }
    if (regPassword.length < 6) {
      toast.error("Password must be at least 6 characters long");
      return;
    }

    setLoading(true);
    try {
      await authApi.register(
        regEmail,
        regName,
        regPassword,
        regRole,
        regRole === "oem" ? regDealerName : undefined
      );
      toast.success("Account created! You can now sign in.");
      setEmail(regEmail);
      setPassword(regPassword);
      setSetupRequired(false);
      setStep("login");
    } catch (err: any) {
      console.error(err);
      const detail = err.response?.data?.detail || "Registration failed";
      toast.error(detail);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = () => {
    // Must be absolute URL to backend (not proxied), since this is a browser redirect.
    // NEXT_PUBLIC_API_URL is the backend host (e.g. http://localhost:8000)
    const backendHost = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    window.location.href = `${backendHost}/api/auth/google`;
  };

  if (checkingAuth) {
    return (
      <div className="min-h-screen w-full flex flex-col items-center justify-center bg-background">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-xl font-display font-bold text-foreground">FOXFLOW</h2>
        <p className="text-sm text-muted-foreground animate-pulse">Restoring session...</p>
      </div>
    );
  }

  return (
    <div className="relative min-h-screen w-full flex bg-background overflow-hidden font-body">
      {/* Background Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[120px] mix-blend-screen pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-secondary/20 blur-[120px] mix-blend-screen pointer-events-none" />

      {/* Left side: Branding / Illustration */}
      <div className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 bg-card/30 glass-effect border-r border-border/50 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="flex items-center gap-3 mb-12">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-primary-foreground" stroke="currentColor" strokeWidth={2}>
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="font-display font-black text-2xl tracking-tighter text-foreground">FOXFLOW</span>
          </div>

          <h1 className="text-5xl font-display font-bold leading-tight tracking-tight mt-10">
            Intelligent <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-secondary">
              Manufacturing
            </span> <br />
            Command Center
          </h1>
          <p className="text-lg text-muted-foreground mt-6 max-w-md leading-relaxed">
            Unify your factory floor, streamline production workflows, and execute dispatch operations with pinpoint precision.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="text-sm text-muted-foreground/60"
        >
          &copy; {new Date().getFullYear()} FoxFlow ERP v1.0. All rights reserved.
        </motion.div>
      </div>

      {/* Right side: Auth Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 relative z-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="w-full max-w-[420px]"
        >
          {/* Mobile Header (Hidden on Desktop) */}
          <div className="flex lg:hidden items-center justify-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center shadow-lg shadow-primary/20">
              <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-primary-foreground" stroke="currentColor" strokeWidth={2}>
                <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
              </svg>
            </div>
            <span className="font-display font-black text-2xl tracking-tighter text-foreground">FOXFLOW</span>
          </div>

          <div className="bg-card/60 glass-effect border border-border/50 rounded-2xl p-8 shadow-elevated">
            <AnimatePresence mode="wait">
              {/* ─── STEP 1: Login Form ─── */}
              {step === "login" && (
                <motion.div
                  key="login-step"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.25 }}
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                      <Mail className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-display font-bold">Welcome Back</h2>
                    </div>
                  </div>
                  <p className="text-muted-foreground text-sm mb-6">Enter your credentials or use social single sign-on.</p>

                  <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Email or Mobile</label>
                      <input
                        type="text"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@company.com"
                        className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-smooth"
                        autoFocus
                        suppressHydrationWarning
                      />
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Password</label>
                      </div>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-smooth"
                        suppressHydrationWarning
                      />
                    </div>

                    <div className="pt-2">
                      <Button
                        type="submit"
                        className="w-full h-12 rounded-xl text-base font-semibold group transition-all duration-300 hover:shadow-lg hover:shadow-primary/25"
                        disabled={loading}
                        suppressHydrationWarning
                      >
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Signing In
                          </>
                        ) : (
                          <>
                            Sign In
                            <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                          </>
                        )}
                      </Button>
                    </div>
                  </form>



                  <div className="mt-6 pt-5 border-t border-border/50 text-center flex flex-col gap-2.5">
                    {setupRequired ? (
                      <p className="text-sm text-muted-foreground">
                        System setup is required.{" "}
                        <button
                          type="button"
                          onClick={() => setStep("register")}
                          className="text-primary font-semibold hover:underline underline-offset-4 transition-colors"
                          suppressHydrationWarning
                        >
                          Setup Admin Account
                        </button>
                      </p>
                    ) : (
                      <p className="text-sm text-muted-foreground" suppressHydrationWarning>
                        Registration is invite-only. If you have been invited, please check your email.
                      </p>
                    )}
                    <p className="text-sm text-muted-foreground">
                      Are you a worker?{" "}
                      <button
                        type="button"
                        onClick={() => router.push("/workforce/login")}
                        className="text-primary font-semibold hover:underline underline-offset-4 transition-colors"
                        suppressHydrationWarning
                      >
                        Log in here
                      </button>
                    </p>
                  </div>
                </motion.div>
              )}

              {/* ─── REGISTER OR ACCEPT INVITE ─── */}
              {(step === "register" || step === "accept-invite") && (
                <motion.div
                  key="register-step"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.25 }}
                >
                  {!setupRequired && (
                    <button
                      type="button"
                      onClick={() => setStep("login")}
                      className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-5"
                      suppressHydrationWarning
                    >
                      <ArrowLeft className="w-4 h-4" />
                      Back to Sign In
                    </button>
                  )}

                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                      <UserPlus className="w-5 h-5 text-blue-500" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-display font-bold">
                        {setupRequired ? "Setup Admin Account" : "Complete Registration"}
                      </h2>
                    </div>
                  </div>
                  <p className="text-muted-foreground text-sm mb-6">
                    {setupRequired 
                      ? "Set up the primary administrator account for FoxFlow." 
                      : "Enter your name and password to complete setup."}
                  </p>

                  <form onSubmit={handleRegister} className="space-y-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Full Name</label>
                      <input
                        type="text"
                        value={regName}
                        onChange={(e) => setRegName(e.target.value)}
                        placeholder="John Doe"
                        className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-smooth"
                        autoFocus
                        required
                        suppressHydrationWarning
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Email Address</label>
                      <input
                        type="email"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="you@company.com"
                        disabled={step === "accept-invite"}
                        className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-smooth disabled:opacity-60 disabled:cursor-not-allowed"
                        required
                        suppressHydrationWarning
                      />
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Password</label>
                      <input
                        type="password"
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="Min. 6 characters"
                        className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-smooth"
                        required
                        suppressHydrationWarning
                      />
                    </div>

                    {/* Hide role select dropdown during setup (locked to admin) or invite (pre-determined role) */}
                    {setupRequired && (
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Role</label>
                        <select
                          value={regRole}
                          disabled={setupRequired}
                          className="w-full bg-background border border-border rounded-xl px-4 py-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary transition-smooth appearance-none disabled:opacity-80"
                          suppressHydrationWarning
                        >
                          <option value="admin">Admin</option>
                        </select>
                      </div>
                    )}

                    <div className="pt-2">
                      <Button
                        type="submit"
                        className="w-full h-12 rounded-xl text-base font-semibold group transition-all duration-300 hover:shadow-lg hover:shadow-primary/25"
                        disabled={loading}
                        suppressHydrationWarning
                      >
                        {loading ? (
                          <>
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                            Completing Setup
                          </>
                        ) : (
                          <>
                            {setupRequired ? "Create Admin" : "Complete Setup"}
                            <UserPlus className="ml-2 h-4 w-4" />
                          </>
                        )}
                      </Button>
                    </div>
                  </form>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
