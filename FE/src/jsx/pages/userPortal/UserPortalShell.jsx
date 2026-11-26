import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuthUser, useSignOut } from "react-auth-kit";
import { toast } from "react-toastify";
import {
  logoutApi,
  getsignUserApi,
  getCoinsUserApi,
} from "../../../Api/Service";
import useMenuList from "../../layouts/nav/Menu";
import { getTransactionsForCoin } from "../report/assets/coinConfig";
import {
  combinePortfolioTotal,
  buildFiatAmountsFromTransactions,
  extractLivePrices,
  useUsdToEurRate,
  WALLET_BALANCE_UPDATED_EVENT,
  sumCoinPendingIncoming,
} from "../../../utils/euroCoinUtils";
import GoinLogo from "../kycPortal/GoinLogo";
import CryptoNewsTicker from "../../elements/dashboard/CryptoNewsTicker";
import "../kycPortal/kyc-portal.css";
import AuthLangSwitcher from "../authentication/AuthLangSwitcher";
import { useAuthKycLang } from "../authentication/authKycI18n";
import { applyPortalTranslations } from "./userPortalTranslations";
import {
  LayoutDashboard,
  Wallet,
  Coins,
  ArrowLeftRight,
  Layers,
  ReceiptText,
  CreditCard,
  Repeat,
  Bot,
  Landmark,
  Share2,
  Users,
  FileText,
  FileSignature,
  ShieldCheck,
  AlertCircle,
  Clock,
  XCircle,
  HelpCircle,
  Headphones,
  LogOut,
  User,
  Settings,
  ChevronRight,
  ChevronDown,
  Menu,
  X,
  Sun,
  Moon,
} from "lucide-react";

function getMenuIcon(title = "") {
  const t = title.toLowerCase().trim();
  if (t.includes("dashboard")) return LayoutDashboard;
  if (t.includes("asset")) return Wallet;
  if (t.includes("token")) return Coins;
  if (t.includes("swap")) return ArrowLeftRight;
  if (t.includes("staking")) return Layers;
  if (t.includes("transaction")) return ReceiptText;
  if (t.includes("payment")) return CreditCard;
  if (t.includes("exchange")) return Repeat;
  if (t.includes("trading") || t.includes("bot")) return Bot;
  if (t.includes("card")) return CreditCard;
  if (t.includes("loan")) return Landmark;
  if (t.includes("refer")) return Share2;
  if (t.includes("affiliate")) return Users;
  if (t.includes("document")) return FileText;
  if (t.includes("help")) return HelpCircle;
  if (t.includes("support")) return Headphones;
  return LayoutDashboard;
}

const PAGE_TITLES = {
  dashboard: "Dashboard",
  assets: "My Assets",
  tokens: "My Tokens",
  swap: "Swap",
  staking: "Staking",
  transactions: "Transactions",
  account: "Payment Methods",
  exchanges: "Exchanges",
  trading: "AI Trading Bot",
  "crypto-card": "Crypto Card",
  "apply-loan": "Apply for Loan",
  "referral-promo": "Refer & Earn",
  affiliate: "My Affiliate",
  "all-files": "Documents",
  "edit-profile": "Account Settings",
  support: "Support Desk",
  "create-ticket": "Create Ticket",
  tickets: "Support Ticket",
  market: "Market",
  stocks: "Stocks",
  legal: "Legal",
  kyc: "KYC Verification",
  documents: "Document Signing",
  "kyc-profile": "Profile & Signature",
};

export default function UserPortalShell({ children, title, noPadding = false, showTicker = true }) {
  useUsdToEurRate();
  const authUser = useAuthUser();
  const signOut = useSignOut();
  const navigate = useNavigate();
  const location = useLocation();
  const menuItems = useMenuList();
  const { lang, changeLang, t } = useAuthKycLang();
  const portalRootRef = useRef(null);
  const translationStateRef = useRef({
    textOriginals: new WeakMap(),
    textLastApplied: new WeakMap(),
    attrOriginals: new WeakMap(),
    attrLastApplied: new WeakMap(),
  });

  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [isDark, setIsDark] = useState(() => {
    try {
      return localStorage.getItem("userPortalTheme") === "dark";
    } catch {
      return false;
    }
  });
  const [themeAlertDismissed, setThemeAlertDismissed] = useState(() => {
    try {
      return localStorage.getItem("userPortalThemeAlertDismissed") === "true";
    } catch {
      return false;
    }
  });
  const [systemPrefersDark, setSystemPrefersDark] = useState(() => {
    try {
      return Boolean(
        window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches
      );
    } catch {
      return false;
    }
  });
  const [userProfile, setUserProfile] = useState(null);
  const [availableFunds, setAvailableFunds] = useState(null);
  const [pendingFunds, setPendingFunds] = useState(null);
  const profileRef = useRef(null);

  useEffect(() => {
    if (!window.matchMedia) return undefined;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (e) => setSystemPrefersDark(e.matches);
    if (mq.addEventListener) {
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    }
    return undefined;
  }, []);

  const toggleTheme = () => {
    setIsDark((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("userPortalTheme", next ? "dark" : "light");
      } catch {
        // ignore
      }
      return next;
    });
  };

  const enableDarkModeFromAlert = () => {
    setIsDark(true);
    setThemeAlertDismissed(true);
    try {
      localStorage.setItem("userPortalTheme", "dark");
      localStorage.setItem("userPortalThemeAlertDismissed", "true");
    } catch {
      // ignore
    }
  };

  const dismissThemeAlert = () => {
    setThemeAlertDismissed(true);
    try {
      localStorage.setItem("userPortalThemeAlertDismissed", "true");
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (isDark) {
      document.documentElement.classList.add("user-portal-dark");
    } else {
      document.documentElement.classList.remove("user-portal-dark");
    }
    return () => {
      document.documentElement.classList.remove("user-portal-dark");
    };
  }, [isDark]);

  const sessionUser = authUser()?.user || {};

  useEffect(() => {
    document.documentElement.classList.add("kyc-portal-active");
    return () => {
      document.documentElement.classList.remove("kyc-portal-active");
    };
  }, []);

  useEffect(() => {
    const prevLang = document.documentElement.lang;
    document.documentElement.lang = lang;
    return () => {
      document.documentElement.lang = prevLang;
    };
  }, [lang]);

  useEffect(() => {
    const root = portalRootRef.current;
    if (!root) return undefined;

    let rafId = null;
    let isApplying = false;

    const runTranslate = () => {
      if (isApplying) return;
      isApplying = true;
      try {
        applyPortalTranslations(root, lang, translationStateRef.current);
      } finally {
        isApplying = false;
      }
    };

    runTranslate();

    const observer = new MutationObserver(() => {
      if (isApplying) return;
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        rafId = null;
        runTranslate();
      });
    });

    observer.observe(root, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      observer.disconnect();
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [lang, location.pathname]);

  useEffect(() => {
    const role = sessionUser?.role;
    if (role === "admin" || role === "subadmin") {
      navigate("/admin/dashboard");
    }
  }, [sessionUser?.role, navigate]);

  useEffect(() => {
    const onOutside = (e) => {
      if (profileRef.current && !profileRef.current.contains(e.target)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, []);

  const loadBalances = async (userObj) => {
    if (!userObj?._id) return;
    try {
      const userCoins = await getCoinsUserApi(userObj._id);
      if (!userCoins?.success || !userCoins?.getCoin) return;

      const prices = extractLivePrices(userCoins, userObj?.currency);
      const txs = userCoins.getCoin.transactions || [];
      const calcAvail = (coin, price) => getTransactionsForCoin(coin, txs) * price;
      const calcPending = (coin, price) => sumCoinPendingIncoming(txs, coin) * price;

      const coinPairs = [
        ["bitcoin", parseFloat(prices.btc)],
        ["ethereum", prices.eth],
        ["tether", prices.usdt],
        ["bnb", prices.bnb],
        ["xrp", prices.xrp],
        ["dogecoin", prices.doge],
        ["solana", prices.sol],
        ["toncoin", prices.ton],
        ["chainlink", prices.link],
        ["polkadot", prices.dot],
        ["near protocol", prices.near],
        ["usd coin", prices.usdc],
        ["tron", prices.trx],
      ];

      const cryptoAvail = coinPairs.reduce((sum, [c, p]) => sum + calcAvail(c, p), 0);
      const fiatAvail = buildFiatAmountsFromTransactions(txs, "completed");
      const totalAvail = combinePortfolioTotal(cryptoAvail, fiatAvail, userObj.currency, {
        cryptoAlreadyInDisplayCurrency: true,
      });

      const cryptoPend = coinPairs.reduce((sum, [c, p]) => sum + calcPending(c, p), 0);
      const fiatPend = buildFiatAmountsFromTransactions(txs, "pending");
      const totalPend = combinePortfolioTotal(cryptoPend, fiatPend, userObj.currency, {
        cryptoAlreadyInDisplayCurrency: true,
      });

      const currency = userObj.currency === "EUR" ? "EUR" : "USD";
      const fmt = (n) =>
        Math.floor(Number(n) || 0).toLocaleString("en-US", {
          style: "currency",
          currency,
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        });

      setAvailableFunds(fmt(totalAvail));
      setPendingFunds(fmt(totalPend));
    } catch {
      // ignore
    }
  };

  const loadUserAndBalances = async () => {
    if (!sessionUser?._id || sessionUser.role !== "user") return;
    try {
      const fd = new FormData();
      fd.append("id", sessionUser._id);
      const res = await getsignUserApi(fd);
      if (res?.success && res?.signleUser) {
        setUserProfile(res.signleUser);
        loadBalances(res.signleUser);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadUserAndBalances();
  }, [location.pathname, sessionUser?._id]);

  useEffect(() => {
    const onUpdated = () => loadUserAndBalances();
    window.addEventListener(WALLET_BALANCE_UPDATED_EVENT, onUpdated);
    return () => window.removeEventListener(WALLET_BALANCE_UPDATED_EVENT, onUpdated);
  }, [sessionUser?._id]);

  const handleLogout = async () => {
    setProfileOpen(false);
    setMobileOpen(false);
    try {
      const res = await logoutApi();
      if (res?.success) {
        signOut();
        localStorage.removeItem("token");
        localStorage.removeItem("authToken");
        localStorage.removeItem("authUser");
        localStorage.removeItem("auth_state");
        localStorage.removeItem("jwttoken");
        navigate("/auth/login");
      } else {
        toast.dismiss();
        toast.error(res?.msg || "Logout failed");
      }
    } catch (error) {
      toast.dismiss();
      toast.error(error?.message || "Logout failed");
    }
  };

  const isRouteParamId = (seg = "") => /^[a-f0-9]{24}$/i.test(seg) || /^[0-9]+$/.test(seg);
  const segs = location.pathname.split("/").filter(Boolean);
  let lastSeg = (segs[segs.length - 1] || "dashboard").toLowerCase();
  if (isRouteParamId(lastSeg) && segs.length > 1) {
    lastSeg = segs[segs.length - 2].toLowerCase();
  }
  const pageTitle =
    title ||
    PAGE_TITLES[lastSeg] ||
    lastSeg
      .split("-")
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(" ");

  const firstName = userProfile?.firstName || sessionUser?.firstName || "";
  const lastName = userProfile?.lastName || sessionUser?.lastName || "";
  const email = userProfile?.email || sessionUser?.email || "";
  const initials = `${firstName[0] || ""}${lastName[0] || ""}`.toUpperCase() || "U";
  const transactionsPath = sessionUser?._id ? `/Transactions/${sessionUser._id}` : "/dashboard";

  const kycState =
    userProfile?.kyc === true
      ? "verified"
      : userProfile?.submitDoc?.status === "completed"
      ? "pending"
      : userProfile?.submitDoc?.status === "rejected"
      ? "rejected"
      : "unverified";

  const isPathActive = (to) => {
    if (!to || to === "#") return false;
    const clean = String(to).split("?")[0];
    if (clean === "/dashboard") return location.pathname === "/dashboard";
    return location.pathname.startsWith(clean);
  };

  const renderSidebarBody = (onNavigate) => (
    <div className="flex flex-col h-full bg-white">
      {/* Logo */}
      <div className="h-16 px-5 border-b border-slate-200/80 flex items-center justify-between shrink-0">
        <Link to="/dashboard" onClick={onNavigate} className="inline-flex items-center">
          <GoinLogo height={32} width={128} theme={isDark ? "dark" : "light"} />
        </Link>
        <button
          type="button"
          onClick={() => setMobileOpen(false)}
          className="lg:hidden p-1.5 rounded-lg text-slate-500 hover:bg-slate-100"
          aria-label="Close sidebar"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Scrollable Nav */}
      <div className="flex-1 overflow-y-auto px-3.5 py-4 space-y-5">
        {/* Compact Dark Balance Card */}
        <div className="rounded-2xl bg-slate-900 text-white p-4 space-y-2.5 shadow-sm">
          <Link
            to={transactionsPath}
            onClick={onNavigate}
            className="flex items-center justify-between gap-2"
          >
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Available Funds
              </p>
              <p className="text-lg font-extrabold text-white truncate mt-0.5">
                {availableFunds === null ? "..." : availableFunds}
              </p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
              <Wallet className="w-4 h-4" />
            </div>
          </Link>
          <div className="h-px bg-slate-800" />
          <Link
            to={transactionsPath}
            onClick={onNavigate}
            className="flex items-center justify-between text-xs"
          >
            <span className="inline-flex items-center gap-1.5 text-slate-400 font-medium">
              <Clock className="w-3.5 h-3.5" />
              Pending
            </span>
            <span className="font-bold text-blue-300">
              {pendingFunds === null ? "..." : pendingFunds}
            </span>
          </Link>
        </div>

        {/* Wallet & Portfolio Links */}
        <div>
          <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Wallet &amp; Portfolio
          </p>
          <nav className="space-y-0.5">
            {menuItems.map((item, idx) => {
              const Icon = getMenuIcon(item.title);
              const active = !item.external && isPathActive(item.to);
              const baseCls = `w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-semibold transition-colors ${
                active
                  ? "bg-blue-50 text-blue-600"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`;

              if (item.external) {
                return (
                  <a
                    key={idx}
                    href={item.to}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={onNavigate}
                    className={baseCls}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.title}</span>
                  </a>
                );
              }
              return (
                <Link key={idx} to={item.to} onClick={onNavigate} className={baseCls}>
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{item.title}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Compliance & Signing Links */}
        <div className="pt-2 border-t border-slate-100">
          <p className="px-3 mb-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Compliance &amp; Signing
          </p>
          <nav className="space-y-0.5">
            <Link
              to="/flows/kyc"
              onClick={onNavigate}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-[13px] font-semibold transition-colors ${
                isPathActive("/flows/kyc")
                  ? "bg-blue-50 text-blue-600"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <span className="flex items-center gap-2.5 min-w-0">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span className="truncate">KYC Verification</span>
              </span>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                  kycState === "verified"
                    ? "bg-emerald-100 text-emerald-700"
                    : kycState === "pending"
                    ? "bg-blue-100 text-blue-700"
                    : kycState === "rejected"
                    ? "bg-rose-100 text-rose-700"
                    : "bg-amber-100 text-amber-700"
                }`}
              >
                {kycState === "verified"
                  ? "Verified"
                  : kycState === "pending"
                  ? "Review"
                  : kycState === "rejected"
                  ? "Rejected"
                  : "Required"}
              </span>
            </Link>

            <Link
              to="/flows/documents"
              onClick={onNavigate}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-semibold transition-colors ${
                isPathActive("/flows/documents")
                  ? "bg-blue-50 text-blue-600"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <FileSignature className="w-4 h-4 shrink-0" />
              <span className="truncate">Document Signing</span>
            </Link>

            <Link
              to="/flows/kyc-profile"
              onClick={onNavigate}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-semibold transition-colors ${
                isPathActive("/flows/kyc-profile")
                  ? "bg-blue-50 text-blue-600"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <User className="w-4 h-4 shrink-0" />
              <span className="truncate">Profile &amp; Signature</span>
            </Link>
{/* dont remove or uncomment it */}
            {/* <Link
              to="/support"
              onClick={onNavigate}
              className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-[13px] font-semibold transition-colors ${
                isPathActive("/support")
                  ? "bg-blue-50 text-blue-600"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Headphones className="w-4 h-4 shrink-0" />
              <span className="truncate">Support Desk</span>
            </Link> */}
          </nav>
        </div>
      </div>

      {/* Bottom KYC Status + Sign Out */}
      <div className="p-3.5 border-t border-slate-100 space-y-2 shrink-0">
        <Link
          to="/flows/kyc"
          onClick={onNavigate}
          className={`flex items-center justify-between gap-2 p-3 rounded-xl border text-xs transition-colors ${
            kycState === "verified"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : kycState === "pending"
              ? "bg-blue-50 border-blue-200 text-blue-800"
              : kycState === "rejected"
              ? "bg-rose-50 border-rose-200 text-rose-800"
              : "bg-amber-50 border-amber-200 text-amber-900 hover:bg-amber-100/70"
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            {kycState === "verified" ? (
              <ShieldCheck className="w-4 h-4 shrink-0" />
            ) : kycState === "pending" ? (
              <Clock className="w-4 h-4 shrink-0" />
            ) : kycState === "rejected" ? (
              <XCircle className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <div className="min-w-0">
              <p className="font-bold leading-tight truncate">
                {kycState === "verified"
                  ? "KYC Verified"
                  : kycState === "pending"
                  ? "KYC Under Review"
                  : kycState === "rejected"
                  ? "KYC Rejected"
                  : "Complete KYC"}
              </p>
              <p className="text-[10px] opacity-80 truncate">
                {kycState === "verified"
                  ? "Identity approved"
                  : kycState === "pending"
                  ? "Pending review"
                  : kycState === "rejected"
                  ? "Resubmit documents"
                  : "Upload ID & Address"}
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 shrink-0 opacity-60" />
        </Link>

        <button
          type="button"
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-600 text-xs font-bold transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div id="kyc-portal" ref={portalRootRef} className={isDark ? "user-portal-dark" : ""}>
      <div className="min-h-screen bg-[#F8FAFC] flex">
        {/* Desktop Sidebar (Fixed, independent of body scroll) */}
        <aside className="hidden lg:block fixed inset-y-0 left-0 z-40 w-64 border-r border-slate-200/80 bg-white h-screen">
          {renderSidebarBody(() => {})}
        </aside>

        {/* Mobile Drawer */}
        {mobileOpen && (
          <div className="fixed inset-0 z-50 lg:hidden flex">
            <div
              className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs"
              onClick={() => setMobileOpen(false)}
            />
            <div className="relative z-10 w-72 max-w-[85vw] h-full shadow-2xl">
              {renderSidebarBody(() => setMobileOpen(false))}
            </div>
          </div>
        )}

        {/* Right Main Column */}
        <div className="flex-1 min-w-0 lg:pl-64 flex flex-col">
          {/* Clean Sticky Topbar */}
          <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200/80">
            <div className="h-16 px-4 sm:px-6 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => setMobileOpen(true)}
                  className="lg:hidden p-2 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
                  aria-label="Open navigation"
                >
                  <Menu className="w-5 h-5" />
                </button>
                <div className="min-w-0">
                  <h1 className="text-base sm:text-lg font-extrabold text-slate-900 truncate leading-tight">
                    {pageTitle}
                  </h1>
                  <p className="hidden sm:block text-xs text-slate-500 truncate">
                    Welcome back{firstName ? `, ${firstName}` : ""}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2.5 shrink-0">
                {/* Language Switcher (shared with Login / Registration / KYC) */}
                <AuthLangSwitcher
                  lang={lang}
                  onChange={changeLang}
                  ariaLabel={t.switcherAria}
                  dark={isDark}
                />

                {/* Light / Dark Mode Toggle */}
                <button
                  type="button"
                  onClick={toggleTheme}
                  aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
                  title={isDark ? "Switch to light mode" : "Switch to dark mode"}
                  className="inline-flex items-center justify-center w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-slate-700 transition-colors cursor-pointer"
                >
                  {isDark ? (
                    <Sun className="w-4 h-4 text-amber-400" />
                  ) : (
                    <Moon className="w-4 h-4 text-slate-600" />
                  )}
                </button>

                {/* Live KYC Status Pill */}
                <Link
                  to="/flows/kyc"
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition-colors ${
                    kycState === "verified"
                      ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                      : kycState === "pending"
                      ? "bg-blue-50 border-blue-200 text-blue-700"
                      : kycState === "rejected"
                      ? "bg-rose-50 border-rose-200 text-rose-700"
                      : "bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100"
                  }`}
                >
                  {kycState === "verified" ? (
                    <ShieldCheck className="w-3.5 h-3.5" />
                  ) : kycState === "pending" ? (
                    <Clock className="w-3.5 h-3.5" />
                  ) : kycState === "rejected" ? (
                    <XCircle className="w-3.5 h-3.5" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5" />
                  )}
                  <span className="hidden sm:inline">
                    {kycState === "verified"
                      ? "KYC Verified"
                      : kycState === "pending"
                      ? "KYC Pending"
                      : kycState === "rejected"
                      ? "KYC Rejected"
                      : "Verify KYC"}
                  </span>
                </Link>

                {/* Document Signing Pill */}
                <Link
                  to="/flows/documents"
                  className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200/80 border border-slate-200 text-xs font-semibold text-slate-700 transition-colors"
                >
                  <FileSignature className="w-3.5 h-3.5 text-blue-600" />
                  <span>Documents</span>
                </Link>

                {/* Profile Dropdown */}
                <div className="relative" ref={profileRef}>
                  <button
                    type="button"
                    onClick={() => setProfileOpen((p) => !p)}
                    className="flex items-center gap-2 pl-1 pr-2.5 py-1 rounded-full border border-slate-200 hover:bg-slate-50 transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center">
                      {initials}
                    </div>
                    <div className="hidden sm:block text-left">
                      <p className="text-xs font-bold text-slate-900 leading-tight">
                        {firstName} {lastName}
                      </p>
                      <p className="text-[10px] font-medium text-slate-500">
                        {kycState === "verified" ? "Verified Client" : "Client Portal"}
                      </p>
                    </div>
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  </button>

                  {profileOpen && (
                    <div className="absolute right-0 mt-2 w-60 rounded-2xl bg-white shadow-xl border border-slate-200 py-2 z-50">
                      <div className="px-4 py-2.5 border-b border-slate-100">
                        <p className="text-xs font-bold text-slate-900 truncate">
                          {firstName} {lastName}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">{email}</p>
                      </div>
                      <div className="py-1">
                        <Link
                          to="/flows/kyc"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          <ShieldCheck className="w-4 h-4 text-blue-600" />
                          KYC Verification
                        </Link>
                        <Link
                          to="/flows/documents"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          <FileText className="w-4 h-4 text-slate-500" />
                          Document Signing
                        </Link>
                        <Link
                          to="/flows/kyc-profile"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          <User className="w-4 h-4 text-slate-500" />
                          Profile &amp; Saved Signature
                        </Link>
                        <Link
                          to="/edit-profile"
                          onClick={() => setProfileOpen(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
                        >
                          <Settings className="w-4 h-4 text-slate-500" />
                          Account Settings
                        </Link>
                      </div>
                      <div className="border-t border-slate-100 pt-1">
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50"
                        >
                          <LogOut className="w-4 h-4" />
                          Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {showTicker && (
              <div className="border-t border-slate-100">
                <CryptoNewsTicker />
              </div>
            )}
          </header>

          {/* Main Page Content */}
          <main
            className={
              noPadding
                ? "flex-1 min-w-0 w-full"
                : "flex-1 min-w-0 w-full px-5 sm:px-6 lg:px-8 py-6 space-y-6"
            }
          >
            {children}
          </main>
        </div>

        {/* Floating Bottom Popup suggesting Dark Mode when device uses Dark Mode */}
        {!isDark && systemPrefersDark && !themeAlertDismissed && (
          <div
            role="status"
            style={{
              position: "fixed",
              bottom: "24px",
              left: "50%",
              transform: "translateX(-50%)",
              zIndex: 9999,
              width: "calc(100% - 2rem)",
              maxWidth: "560px",
            }}
          >
            <div className="flex items-center justify-between gap-3 px-4 py-3.5 rounded-2xl bg-slate-900 border border-slate-700 shadow-2xl text-slate-100">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/30 text-blue-400 flex items-center justify-center shrink-0">
                  <Moon className="w-4 h-4" />
                </div>
                <p className="text-xs sm:text-sm text-slate-200 leading-snug m-0">
                  <strong className="text-white">Your device is in Dark Mode.</strong> Switch the portal to Dark Mode for a more comfortable view.
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={enableDarkModeFromAlert}
                  className="px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold border-0 shadow-sm transition-colors cursor-pointer whitespace-nowrap"
                >
                  Use Dark Mode
                </button>
                <button
                  type="button"
                  onClick={dismissThemeAlert}
                  aria-label="Dismiss dark mode suggestion"
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 border-0 bg-transparent transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
