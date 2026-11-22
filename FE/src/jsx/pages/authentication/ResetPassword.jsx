import React, { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { toast } from "react-toastify";
import {
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import {
  confirmResetPasswordApi,
  verifyResetPasswordTokenApi,
} from "../../../Api/Service";
import GoinLogo from "../kycPortal/GoinLogo";
import "../kycPortal/kyc-portal.css";

export default function ResetPassword() {
  const { id, token } = useParams();
  const navigate = useNavigate();

  const [verifying, setVerifying] = useState(true);
  const [validToken, setValidToken] = useState(false);
  const [userEmail, setUserEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [showConfirmPass, setShowConfirmPass] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    document.documentElement.classList.add("kyc-portal-active");
    return () => {
      document.documentElement.classList.remove("kyc-portal-active");
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    const checkToken = async () => {
      try {
        setVerifying(true);
        const res = await verifyResetPasswordTokenApi(id, token);
        if (cancelled) return;
        if (res?.success) {
          setValidToken(true);
          setUserEmail(res.email || "");
        } else {
          setValidToken(false);
          setErrorMsg(
            res?.msg || "This password reset link is invalid or has expired."
          );
        }
      } catch (err) {
        if (cancelled) return;
        setValidToken(false);
        setErrorMsg(
          err?.data?.msg ||
            err?.message ||
            "This password reset link is invalid or has expired."
        );
      } finally {
        if (!cancelled) setVerifying(false);
      }
    };
    checkToken();
    return () => {
      cancelled = true;
    };
  }, [id, token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");

    if (password.length < 8) {
      setErrorMsg("Password must be at least 8 characters long.");
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg("Passwords do not match.");
      return;
    }

    try {
      setSubmitting(true);
      const res = await confirmResetPasswordApi(id, token, {
        password,
        confirmPassword,
      });
      if (res?.success) {
        setCompleted(true);
        toast.dismiss();
        toast.success(
          res.msg || "Your password has been reset! You can now sign in."
        );
        setTimeout(() => {
          navigate("/auth/login");
        }, 2000);
      } else {
        const msg = res?.msg || "Could not reset password.";
        setErrorMsg(msg);
        toast.dismiss();
        toast.error(msg);
      }
    } catch (err) {
      const msg =
        err?.data?.msg || err?.message || "Could not reset password.";
      setErrorMsg(msg);
      toast.dismiss();
      toast.error(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div id="kyc-portal">
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex items-center justify-center">
            <Link to="/" title="GOin SAS">
              <GoinLogo height={42} width={168} theme="light" />
            </Link>
          </div>

          <h2 className="mt-5 text-center text-2xl font-extrabold text-slate-900">
            Set a new password
          </h2>
          {userEmail && (
            <p className="mt-1.5 text-center text-xs text-slate-500">
              Resetting password for{" "}
              <strong className="text-slate-700">{userEmail}</strong>
            </p>
          )}
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          {verifying ? (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-8 shadow-card text-center space-y-3">
              <div className="w-7 h-7 rounded-full border-2 border-blue-600 border-t-transparent animate-spin mx-auto" />
              <p className="text-xs font-semibold text-slate-500">
                Verifying your password reset link...
              </p>
            </div>
          ) : !validToken ? (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-card text-center space-y-5">
              <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
                <AlertCircle className="w-6 h-6" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-lg font-extrabold text-slate-900">
                  Reset Link Expired or Invalid
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {errorMsg ||
                    "This password reset link is no longer valid or has expired. Please request a new password reset link."}
                </p>
              </div>

              <div className="space-y-2.5 pt-1">
                <Link
                  to="/auth/forgot-password"
                  className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm shadow-blue-600/20 transition-all"
                >
                  <span>Request a New Reset Link</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>

                <Link
                  to="/auth/login"
                  className="w-full py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold flex items-center justify-center gap-1.5 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Sign In</span>
                </Link>
              </div>
            </div>
          ) : completed ? (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-card text-center space-y-5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-lg font-extrabold text-slate-900">
                  Password Reset Successful
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Your password has been updated. Redirecting you to sign in...
                </p>
              </div>

              <Link
                to="/auth/login"
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm shadow-blue-600/20 transition-all"
              >
                <span>Go to Sign In</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-card space-y-5"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPass ? "text" : "password"}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimum 8 characters"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    aria-label={showPass ? "Hide password" : "Show password"}
                  >
                    {showPass ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showConfirmPass ? "text" : "password"}
                    required
                    minLength={8}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter your new password"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPass((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    aria-label={
                      showConfirmPass ? "Hide password" : "Show password"
                    }
                  >
                    {showConfirmPass ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-medium text-rose-700">
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-sm shadow-blue-600/20 transition-all"
              >
                <span>{submitting ? "Updating Password..." : "Reset Password"}</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <div className="text-center pt-1">
                <Link
                  to="/auth/login"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-blue-600 transition-colors"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Back to Sign In</span>
                </Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
