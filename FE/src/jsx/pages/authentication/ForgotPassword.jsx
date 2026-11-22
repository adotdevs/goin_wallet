import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { toast } from "react-toastify";
import { Mail, ArrowRight, ArrowLeft, CheckCircle2 } from "lucide-react";
import { forgotPasswordApi } from "../../../Api/Service";
import GoinLogo from "../kycPortal/GoinLogo";
import "../kycPortal/kyc-portal.css";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    document.documentElement.classList.add("kyc-portal-active");
    return () => {
      document.documentElement.classList.remove("kyc-portal-active");
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    const trimmed = email.trim();
    if (!trimmed) {
      setErrorMsg("Please enter your email address");
      return;
    }

    try {
      setLoading(true);
      const res = await forgotPasswordApi({ email: trimmed });
      if (res?.success) {
        setSent(true);
        toast.dismiss();
        toast.success(
          res.msg || "A password reset link has been sent to your email."
        );
      } else {
        const msg = res?.msg || "Could not send password reset link";
        setErrorMsg(msg);
        toast.dismiss();
        toast.error(msg);
      }
    } catch (err) {
      const msg =
        err?.data?.msg || err?.message || "Could not send password reset link";
      setErrorMsg(msg);
      toast.dismiss();
      toast.error(msg);
    } finally {
      setLoading(false);
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
            Forgot your password?
          </h2>
          <p className="mt-1.5 text-center text-xs text-slate-500">
            Enter your registered email address and we&apos;ll send you a secure
            link to reset your password.
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          {sent ? (
            <div className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-card text-center space-y-5">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-lg font-extrabold text-slate-900">
                  Check your email
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  We have sent a password reset link to{" "}
                  <strong className="text-slate-900">{email}</strong>. Click the
                  link in the email to choose a new password.
                </p>
              </div>

              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-500">
                Didn&apos;t receive the email? Check your spam folder or click
                below to send another link.
              </div>

              <div className="space-y-2.5 pt-1">
                <button
                  type="button"
                  disabled={loading}
                  onClick={handleSubmit}
                  className="w-full py-2.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors"
                >
                  {loading ? "Sending..." : "Resend Reset Link"}
                </button>

                <Link
                  to="/auth/login"
                  className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm shadow-blue-600/20 transition-all"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Back to Sign In</span>
                </Link>
              </div>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-card space-y-5"
            >
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your account email"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-medium text-rose-700">
                  {errorMsg}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-sm shadow-blue-600/20 transition-all"
              >
                <span>{loading ? "Sending Reset Link..." : "Send Reset Link"}</span>
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
