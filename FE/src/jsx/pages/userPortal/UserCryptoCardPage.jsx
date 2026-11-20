import React, { useEffect, useState } from "react";
import { useAuthUser } from "react-auth-kit";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  CreditCard,
  Globe,
  ShieldCheck,
  Zap,
  Activity,
  Eye,
  EyeOff,
  CheckCircle2,
  Clock,
  Lock,
} from "lucide-react";
import {
  applyCreditCardApi,
  getCoinsUserApi,
  getLinksApi,
  getsignUserApi,
} from "../../../Api/Service";
import { getTransactionsForCoin } from "../report/assets/coinConfig";
import UserPortalShell from "./UserPortalShell";

const FEATURES = [
  { title: "Global Spending", desc: "Accepted at millions of merchants worldwide", icon: Globe, color: "bg-blue-50 text-blue-600" },
  { title: "Instant Activation", desc: "Virtual card ready immediately upon approval", icon: Zap, color: "bg-indigo-50 text-indigo-600" },
  { title: "Bank-Grade Security", desc: "3D Secure, instant freeze, and encrypted storage", icon: ShieldCheck, color: "bg-emerald-50 text-emerald-600" },
  { title: "Real-Time Control", desc: "Track spending and balances live from your portal", icon: Activity, color: "bg-amber-50 text-amber-600" },
];

export default function UserCryptoCardPage() {
  const authUser = useAuthUser();
  const navigate = useNavigate();
  const userId = authUser()?.user?._id;

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [isUser, setIsUser] = useState({});
  const [usdtBalance, setUsdtBalance] = useState(0);

  useEffect(() => {
    const user = authUser()?.user;
    if (!user) return;
    if (["admin", "superadmin", "subadmin"].includes(user.role)) {
      navigate("/admin/dashboard", { replace: true });
      return;
    }

    const load = async () => {
      try {
        const links = await getLinksApi();
        if (!links?.links?.[0]?.enabled) {
          navigate(-1);
          return;
        }
        const fd = new FormData();
        fd.append("id", user._id);
        const [profileRes, coinsRes] = await Promise.all([
          getsignUserApi(fd).catch(() => null),
          getCoinsUserApi(user._id).catch(() => null),
        ]);
        if (profileRes?.success && profileRes?.signleUser) {
          setIsUser(profileRes.signleUser);
        }
        if (coinsRes?.success && coinsRes?.getCoin?.transactions) {
          setUsdtBalance(getTransactionsForCoin("tether", coinsRes.getCoin.transactions));
        }
      } catch (err) {
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [userId]);

  const card = isUser?.cryptoCard || {};
  const cardStatus = card.status;
  const isActive = cardStatus === "active";
  const isApplied = cardStatus === "applied";
  const hasCard = Boolean(card.cardNumber);
  const isDeactivated = cardStatus === "inactive" && hasCard;
  const canApply = (!cardStatus || cardStatus === "inactive") && !hasCard;

  const displayName =
    `${isUser.firstName || ""} ${isUser.lastName || ""}`.trim() ||
    authUser()?.user?.firstName ||
    "Client";
  const cardHolder = (card.cardName || displayName).toUpperCase();

  const handleApply = async () => {
    try {
      setIsSubmitting(true);
      const res = await applyCreditCardApi({
        userId,
        type: "card_request",
        status: "applied",
      });
      if (res?.success) {
        toast.success("Card application submitted successfully!");
        setIsUser((prev) => ({ ...prev, cryptoCard: { status: "applied" } }));
      } else {
        toast.error(res?.msg || "Failed to apply for card");
      }
    } catch (err) {
      toast.error(err?.message || "Failed to apply for card");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formattedNumber = hasCard
    ? showDetails
      ? String(card.cardNumber).replace(/(.{4})/g, "$1 ").trim()
      : `•••• •••• •••• ${String(card.cardNumber).slice(-4)}`
    : "4532 •••• •••• 8910";

  return (
    <UserPortalShell title="Crypto Card">
      <div className="space-y-6 w-full">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight m-0">
            GOin Crypto Card
          </h1>
          <p className="text-sm text-slate-500 mt-1 mb-0">
            Spend your digital assets globally with Apple Pay, Google Pay, and institutional security.
          </p>
        </div>

        {isLoading ? (
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card py-20 flex flex-col items-center justify-center text-slate-500">
            <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin mb-3" />
            <p className="text-sm m-0">Loading card status...</p>
          </div>
        ) : (
          <>
            {/* Hero Card Showcase */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card p-6 sm:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              {/* Visual Card */}
              <div className="lg:col-span-5">
                <div className="rounded-2xl bg-gradient-to-br from-[#0B1120] via-[#1E293B] to-[#1D4ED8] text-white p-6 shadow-xl aspect-[1.58/1] flex flex-col justify-between relative overflow-hidden">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-extrabold tracking-wide">
                      GOin <span className="text-blue-300 font-normal">CARD</span>
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase bg-white/15 text-white">
                      {isActive
                        ? "Active"
                        : isApplied
                          ? "Under Review"
                          : isDeactivated
                            ? "Frozen"
                            : "Virtual Visa"}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <p className="text-[11px] uppercase tracking-wider text-blue-200 m-0">
                      Card Number
                    </p>
                    <p className="text-lg sm:text-xl font-mono tracking-widest font-semibold m-0">
                      {formattedNumber}
                    </p>
                  </div>

                  <div className="flex items-end justify-between gap-4">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider text-blue-200 m-0">
                        Cardholder
                      </p>
                      <p className="text-xs font-bold tracking-wider m-0 truncate max-w-[180px]">
                        {cardHolder}
                      </p>
                    </div>
                    {hasCard && (
                      <div className="flex items-center gap-4 text-right">
                        <div>
                          <p className="text-[10px] uppercase text-blue-200 m-0">Expiry</p>
                          <p className="text-xs font-mono font-bold m-0">
                            {showDetails ? card.cardExpiry || "12/28" : "••/••"}
                          </p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase text-blue-200 m-0">CVV</p>
                          <p className="text-xs font-mono font-bold m-0">
                            {showDetails ? card.cardCvv || "•••" : "•••"}
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Status & Actions */}
              <div className="lg:col-span-7 space-y-5">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-bold bg-blue-50 text-blue-700 border border-blue-100">
                  <CreditCard className="w-3.5 h-3.5" /> Institutional Virtual &amp; Physical Card
                </div>

                <div>
                  <h2 className="text-xl sm:text-2xl font-bold text-slate-900 m-0">
                    {isActive
                      ? "Your GOin Crypto Card is Active"
                      : isApplied
                        ? "Application Under Review"
                        : isDeactivated
                          ? "Your Card is Currently Deactivated"
                          : "Spend Crypto Anywhere Like Cash"}
                  </h2>
                  <p className="text-sm text-slate-500 mt-2 mb-0">
                    Linked directly to your USDT balance (
                    <strong className="text-slate-900">
                      {Number(usdtBalance || 0).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}{" "}
                      USDT
                    </strong>
                    ) with instant conversion at point of sale.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-1">
                  {canApply && (
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={handleApply}
                      className="px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-bold border-0 shadow-sm cursor-pointer transition-colors"
                    >
                      {isSubmitting ? "Submitting Application..." : "Apply for Crypto Card"}
                    </button>
                  )}

                  {isApplied && (
                    <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
                      <Clock className="w-4 h-4" /> Your card application is being reviewed by compliance.
                    </div>
                  )}

                  {isActive && (
                    <>
                      <button
                        type="button"
                        onClick={() => setShowDetails((s) => !s)}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold border-0 shadow-sm cursor-pointer"
                      >
                        {showDetails ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        {showDetails ? "Hide Card Details" : "Reveal Card Details"}
                      </button>
                      <span className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold">
                        <CheckCircle2 className="w-4 h-4" /> Ready for online &amp; Apple Pay use
                      </span>
                    </>
                  )}

                  {isDeactivated && (
                    <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
                      <Lock className="w-4 h-4" /> Contact Support Desk to reactivate your card.
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {FEATURES.map((f) => {
                const Icon = f.icon;
                return (
                  <div
                    key={f.title}
                    className="bg-white rounded-2xl border border-slate-200/90 shadow-card p-5 space-y-3"
                  >
                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${f.color}`}>
                      <Icon className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-slate-900 m-0">{f.title}</h3>
                      <p className="text-xs text-slate-500 mt-1 mb-0">{f.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>
    </UserPortalShell>
  );
}
