import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, Info } from "lucide-react";
import { logoutApi } from "../../../Api/Service";
import { kycFetch } from "./kycApi";

const KycPortalContext = createContext(undefined);

export function KycAuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState("");
  const [stats, setStats] = useState({
    unreadNotifications: 0,
    pendingDocsCount: 0,
    signedDocsCount: 0,
  });
  const [settings, setSettings] = useState({
    requireEmailVerification: false,
    requireKycBeforeSign: false,
    companyName: "GOin SAS",
  });
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((title, type = "success", description) => {
    const id = Math.random().toString(36).slice(2, 9);
    setToasts((prev) => [...prev, { id, type, title, description }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== id));
    }, 4200);
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      const res = await kycFetch("/api/me");
      const data = await res.json();
      if (res.ok && data.success && data.user) {
        setAuthError("");
        setUser(data.user);
        if (data.stats) setStats(data.stats);
        if (data.settings) setSettings(data.settings);
        return data.user;
      }
      setUser(null);
      setAuthError(data.msg || "Could not open KYC for this session.");
      return null;
    } catch (error) {
      setUser(null);
      setAuthError("Could not reach the wallet API.");
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const logout = useCallback(async () => {
    try {
      await logoutApi();
    } finally {
      localStorage.removeItem("token");
      localStorage.removeItem("jwttoken");
      localStorage.removeItem("authToken");
      localStorage.removeItem("authUser");
      localStorage.removeItem("auth_state");
      document.cookie = "_auth=; Max-Age=0; path=/";
      document.cookie = "_auth_state=; Max-Age=0; path=/";
      document.cookie = "_auth_storage=; Max-Age=0; path=/";
      document.cookie = "_auth_type=; Max-Age=0; path=/";
      setUser(null);
      window.location.assign("/auth/login");
    }
  }, []);

  return (
    <KycPortalContext.Provider
      value={{ user, loading, authError, stats, settings, refreshUser, logout, showToast }}
    >
      {children}
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none px-4 sm:px-0">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl shadow-lg border bg-white/95 text-slate-900 ${
              toast.type === "error"
                ? "border-rose-200"
                : toast.type === "info"
                  ? "border-blue-200"
                  : "border-emerald-200"
            }`}
          >
            {toast.type === "success" && <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />}
            {toast.type === "error" && <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />}
            {toast.type === "info" && <Info className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900">{toast.title}</p>
              {toast.description && <p className="text-xs text-slate-500 mt-0.5">{toast.description}</p>}
            </div>
          </div>
        ))}
      </div>
    </KycPortalContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(KycPortalContext);
  if (!value) {
    throw new Error("useAuth must be used inside the KYC portal");
  }
  return value;
}
