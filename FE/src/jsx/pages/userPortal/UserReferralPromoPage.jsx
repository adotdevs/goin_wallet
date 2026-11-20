import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthUser } from "react-auth-kit";
import { toast } from "react-toastify";
import {
  Copy,
  Share2,
  Users,
  DollarSign,
  TrendingUp,
  ArrowRight,
  CheckCircle2,
  Gift,
  Sparkles,
} from "lucide-react";
import {
  getMyReferralCodeApi,
  getMyReferralsApi,
  getMyEarningsApi,
  getLinksApi,
} from "../../../Api/Service";
import UserPortalShell from "./UserPortalShell";

const STEPS = [
  {
    step: "01",
    title: "Share Your Unique Code",
    desc: "Copy your personal referral code or link and send it to friends, colleagues, or your community.",
  },
  {
    step: "02",
    title: "They Sign Up & Activate",
    desc: "Your invitees create their GOin account using your referral code and begin trading on the platform.",
  },
  {
    step: "03",
    title: "Earn $100 Per Referral",
    desc: "Receive $100 in referral rewards for every qualifying friend who joins and activates their account.",
  },
];

export default function UserReferralPromoPage() {
  const authUser = useAuthUser();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [referralCode, setReferralCode] = useState("");
  const [referralLink, setReferralLink] = useState("");
  const [stats, setStats] = useState({ total: 0, active: 0, inactive: 0 });
  const [earnings, setEarnings] = useState(0);

  useEffect(() => {
    const role = authUser()?.user?.role;
    if (["admin", "superadmin", "subadmin"].includes(role)) {
      navigate("/admin/dashboard", { replace: true });
      return;
    }

    const loadAll = async () => {
      try {
        const linksData = await getLinksApi().catch(() => null);
        const refLink = linksData?.links?.[9];
        if (refLink && !refLink.enabled) {
          toast.error("Referral system is currently not available");
          navigate("/dashboard", { replace: true });
          return;
        }

        const [codeRes, refRes, earnRes] = await Promise.all([
          getMyReferralCodeApi().catch(() => null),
          getMyReferralsApi().catch(() => null),
          getMyEarningsApi().catch(() => null),
        ]);

        if (codeRes?.success) {
          setReferralCode(codeRes.referralCode || "");
          setReferralLink(codeRes.referralLink || "");
        }
        if (refRes?.success && refRes.stats) {
          setStats(refRes.stats);
        }
        if (earnRes?.success && earnRes.earnings) {
          setEarnings(earnRes.earnings.total || 0);
        }
      } catch (err) {
        console.error("Error fetching referral data:", err);
        toast.error("Failed to load referral data");
      } finally {
        setLoading(false);
      }
    };

    loadAll();
  }, [authUser, navigate]);

  const copyToClipboard = (text, label) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  const shareReferral = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join me on GOin!",
          text: `Use my referral code: ${referralCode} and get started on GOin!`,
          url: referralLink,
        });
      } catch {
        // user cancelled share
      }
    } else {
      copyToClipboard(referralLink, "Referral link");
    }
  };

  return (
    <UserPortalShell title="Refer & Earn">
      <div className="space-y-6 w-full">
        {loading ? (
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card py-24 flex flex-col items-center justify-center text-slate-500">
            <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin mb-3" />
            <p className="text-sm m-0">Loading your referral program...</p>
          </div>
        ) : (
          <>
            {/* Hero Banner */}
            <div className="relative rounded-2xl bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-700 text-white p-7 sm:p-10 shadow-lg overflow-hidden">
              <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
                <div className="lg:col-span-7 space-y-5">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-white text-xs font-bold">
                    <Sparkles className="w-3.5 h-3.5" /> Partner Referral Program
                  </span>
                  <h1 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight m-0">
                    Turn your friends into crypto buddies!
                  </h1>
                  <p className="text-sm sm:text-base text-blue-100 leading-relaxed m-0 max-w-2xl">
                    Share your unique referral code and earn{" "}
                    <strong className="text-white">$100</strong> for every friend who signs up
                    and starts trading. The more you refer, the more you earn — it&apos;s that simple.
                  </p>

                  {/* Referral Code Pill + Actions */}
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    <div className="px-4 py-2.5 rounded-xl bg-white/15 border border-white/25 backdrop-blur-xs">
                      <p className="text-[10px] font-bold uppercase tracking-widest text-blue-100 m-0">
                        Your Referral Code
                      </p>
                      <p className="text-lg font-mono font-extrabold text-white tracking-widest m-0 mt-0.5">
                        {referralCode || "—"}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => copyToClipboard(referralCode, "Referral code")}
                      className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-white hover:bg-blue-50 text-blue-700 text-xs font-bold border-0 shadow-sm cursor-pointer transition-colors"
                    >
                      <Copy className="w-4 h-4" /> Copy Code
                    </button>

                    <button
                      type="button"
                      onClick={shareReferral}
                      className="inline-flex items-center gap-2 px-4 py-3 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold border border-white/25 cursor-pointer transition-colors"
                    >
                      <Share2 className="w-4 h-4" /> Share Link
                    </button>
                  </div>

                  <div className="pt-1">
                    <Link
                      to="/user/affiliate"
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-white hover:text-blue-100 underline underline-offset-4"
                    >
                      View My Affiliate Dashboard <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>

                {/* Right Referral Link Card */}
                <div className="lg:col-span-5">
                  <div className="rounded-2xl bg-white/10 border border-white/20 backdrop-blur-sm p-6 space-y-4">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                        <Gift className="w-6 h-6 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white m-0">Direct Invite Link</p>
                        <p className="text-xs text-blue-100 m-0">
                          One-click signup with your code pre-filled
                        </p>
                      </div>
                    </div>
                    <div className="rounded-xl bg-slate-900/30 border border-white/15 px-3.5 py-2.5 text-xs font-mono text-blue-50 truncate">
                      {referralLink || "Loading link..."}
                    </div>
                    <button
                      type="button"
                      onClick={() => copyToClipboard(referralLink, "Referral link")}
                      className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-blue-50 text-blue-700 text-xs font-bold border-0 shadow-sm cursor-pointer transition-colors"
                    >
                      Copy Referral Link
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card p-6 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 m-0">
                    Total Referrals
                  </p>
                  <p className="text-3xl font-extrabold text-slate-900 m-0 tabular-nums">
                    {stats.total || 0}
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {stats.active || 0} Active
                    </span>
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                      {stats.inactive || 0} Pending
                    </span>
                  </div>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <Users className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card p-6 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 m-0">
                    Total Earned
                  </p>
                  <p className="text-3xl font-extrabold text-emerald-600 m-0 tabular-nums">
                    ${Number(earnings || 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-slate-500 m-0 pt-1">
                    Credited directly to your account
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                  <DollarSign className="w-6 h-6" />
                </div>
              </div>

              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card p-6 flex items-center justify-between">
                <div className="space-y-1">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 m-0">
                    Reward Per Referral
                  </p>
                  <p className="text-3xl font-extrabold text-blue-600 m-0 tabular-nums">
                    $100
                  </p>
                  <p className="text-xs text-slate-500 m-0 pt-1">
                    Unlimited earning potential
                  </p>
                </div>
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-6 h-6" />
                </div>
              </div>
            </div>

            {/* How It Works */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card p-6 sm:p-8 space-y-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900 m-0">How It Works</h2>
                <p className="text-sm text-slate-500 mt-1 mb-0">
                  Three simple steps to start earning passive referral commissions.
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {STEPS.map((s) => (
                  <div
                    key={s.step}
                    className="rounded-xl border border-slate-200 bg-slate-50/70 p-5 space-y-2.5"
                  >
                    <span className="inline-flex items-center justify-center w-9 h-9 rounded-lg bg-blue-600 text-white font-bold text-xs">
                      {s.step}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 m-0">{s.title}</h3>
                    <p className="text-xs text-slate-600 leading-relaxed m-0">{s.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom CTA */}
            <div className="rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white p-6 sm:p-8 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-md">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-100">
                  <CheckCircle2 className="w-4 h-4" /> Ready to grow your network?
                </div>
                <h3 className="text-xl font-extrabold text-white m-0">
                  Track your live referral tree &amp; payouts
                </h3>
              </div>
              <div className="flex flex-wrap items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => copyToClipboard(referralLink, "Referral link")}
                  className="px-5 py-2.5 rounded-xl bg-white hover:bg-emerald-50 text-emerald-700 text-xs font-bold border-0 shadow-sm cursor-pointer"
                >
                  Copy Referral Link
                </button>
                <Link
                  to="/user/affiliate"
                  className="px-5 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-bold border border-white/30 no-underline"
                >
                  Open Affiliate Dashboard
                </Link>
              </div>
            </div>
          </>
        )}
      </div>
    </UserPortalShell>
  );
}
