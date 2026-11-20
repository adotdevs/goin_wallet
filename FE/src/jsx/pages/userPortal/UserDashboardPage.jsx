import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { useAuthUser } from "react-auth-kit";
import { toast } from "react-toastify";
import {
  getCoinsUserApi,
  getHtmlDataApi,
  getsignUserApi,
  patchCoinsApi,
  getLinksApi,
} from "../../../Api/Service";
import { getTransactionsForCoin } from "../report/assets/coinConfig";
import {
  combinePortfolioTotal,
  buildFiatAmountsFromTransactions,
  extractLivePrices,
  getUserDisplaySymbol,
  sumCoinPendingIncoming,
  useUsdToEurRate,
} from "../../../utils/euroCoinUtils";
import UserPortalShell from "./UserPortalShell";
import UserAssetsSection from "./components/UserAssetsSection";
import UserRecentTransactionsSection from "./components/UserRecentTransactionsSection";
import {
  ShieldCheck,
  Clock,
  AlertTriangle,
  Sparkles,
  FileSignature,
  ArrowRight,
  Wallet,
  TrendingUp,
  TrendingDown,
  Gift,
  X,
} from "lucide-react";

const COIN_CARDS = [
  {
    key: "bitcoin",
    name: "Bitcoin",
    symbol: "BTC",
    logo: "https://assets.coingecko.com/coins/images/1/small/bitcoin.png",
  },
  {
    key: "ethereum",
    name: "Ethereum",
    symbol: "ETH",
    logo: "https://assets.coingecko.com/coins/images/279/small/ethereum.png",
  },
  {
    key: "binancecoin",
    name: "BNB",
    symbol: "BNB",
    logo: "https://assets.coingecko.com/coins/images/825/small/bnb-icon2_2x.png",
  },
  {
    key: "solana",
    name: "Solana",
    symbol: "SOL",
    logo: "https://assets.coingecko.com/coins/images/4128/small/solana.png",
  },
];

export default function UserDashboardPage() {
  useUsdToEurRate();
  const authUser = useAuthUser();
  const sessionUser = authUser()?.user || {};

  const [isUser, setIsUser] = useState({});
  const [totalBalance, setTotalBalance] = useState(null);
  const [pendingBalance, setPendingBalance] = useState(null);
  const [description1, setDescription1] = useState("");
  const [description2, setDescription2] = useState("");
  const [showReferralAd, setShowReferralAd] = useState(false);
  const [referralLinkEnabled, setReferralLinkEnabled] = useState(false);
  const [marketCoins, setMarketCoins] = useState(
    COIN_CARDS.map((c) => ({ ...c, price: 0, change24h: 0 }))
  );

  useEffect(() => {
    if (sessionUser?.role !== "user" || !sessionUser?._id) return;

    const loadAll = async () => {
      try {
        const fd = new FormData();
        fd.append("id", sessionUser._id);
        const [userRes, htmlRes, linksRes] = await Promise.all([
          getsignUserApi(fd).catch(() => null),
          getHtmlDataApi().catch(() => null),
          getLinksApi().catch(() => null),
        ]);

        let currentUserObj = sessionUser;
        if (userRes?.success && userRes?.signleUser) {
          setIsUser(userRes.signleUser);
          currentUserObj = userRes.signleUser;
        }
        if (htmlRes?.success && Array.isArray(htmlRes?.description)) {
          setDescription1(htmlRes.description[0]?.description || "");
          setDescription2(htmlRes.description[1]?.description || "");
        }
        if (linksRes?.links && Array.isArray(linksRes.links) && linksRes.links[9]) {
          setReferralLinkEnabled(Boolean(linksRes.links[9].enabled));
        }

        // Load balances
        const coinsRes = await getCoinsUserApi(sessionUser._id).catch(() => null);
        if (coinsRes?.success && coinsRes?.getCoin) {
          const prices = extractLivePrices(coinsRes, currentUserObj?.currency);
          const txs = coinsRes.getCoin.transactions || [];
          const pairs = [
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
          const cryptoAvail = pairs.reduce(
            (s, [c, p]) => s + getTransactionsForCoin(c, txs) * p,
            0
          );
          const fiatAvail = buildFiatAmountsFromTransactions(txs, "completed");
          const avail = combinePortfolioTotal(
            cryptoAvail,
            fiatAvail,
            currentUserObj?.currency,
            { cryptoAlreadyInDisplayCurrency: true }
          );

          const cryptoPend = pairs.reduce(
            (s, [c, p]) => s + sumCoinPendingIncoming(txs, c) * p,
            0
          );
          const fiatPend = buildFiatAmountsFromTransactions(txs, "pending");
          const pend = combinePortfolioTotal(
            cryptoPend,
            fiatPend,
            currentUserObj?.currency,
            { cryptoAlreadyInDisplayCurrency: true }
          );

          const curr = currentUserObj?.currency === "EUR" ? "EUR" : "USD";
          const fmt = (val) =>
            Number(val || 0).toLocaleString("en-US", {
              style: "currency",
              currency: curr,
              minimumFractionDigits: 2,
              maximumFractionDigits: 2,
            });
          setTotalBalance(fmt(avail));
          setPendingBalance(fmt(pend));
        }

        // Preserve existing patchCoins sync
        patchCoinsApi(sessionUser._id).catch(() => {});
      } catch (err) {
        toast.dismiss();
        toast.error(err?.message || "Failed to load dashboard");
      }
    };

    loadAll();
    const adDismissed = localStorage.getItem("referralAdDismissed");
    setShowReferralAd(adDismissed !== "true");
  }, [sessionUser?._id, sessionUser?.role]);

  useEffect(() => {
    const vsCurrency = isUser?.currency === "EUR" ? "eur" : "usd";
    const fetchMarkets = async () => {
      try {
        const res = await axios.get("https://api.coingecko.com/api/v3/coins/markets", {
          params: {
            vs_currency: vsCurrency,
            ids: COIN_CARDS.map((c) => c.key).join(","),
            order: "market_cap_desc",
            per_page: 4,
            page: 1,
            sparkline: false,
          },
        });
        const list = Array.isArray(res.data) ? res.data : [];
        setMarketCoins(
          COIN_CARDS.map((c) => {
            const match = list.find((m) => m.id === c.key);
            return {
              ...c,
              price: match?.current_price ?? 0,
              change24h: match?.price_change_percentage_24h ?? 0,
              logo: match?.image || c.logo,
            };
          })
        );
      } catch {
        // ignore rate limit
      }
    };
    fetchMarkets();
    const timer = setInterval(fetchMarkets, 60000);
    return () => clearInterval(timer);
  }, [isUser?.currency]);

  const dismissReferralAd = () => {
    setShowReferralAd(false);
    localStorage.setItem("referralAdDismissed", "true");
  };

  const currencySymbol = getUserDisplaySymbol(isUser?.currency);
  const kycState = isUser?._id
    ? isUser.kyc === true
      ? "verified"
      : isUser.submitDoc?.status === "completed"
      ? "pending"
      : isUser.submitDoc?.status === "rejected"
      ? "rejected"
      : "unverified"
    : null;

  return (
    <UserPortalShell title="Dashboard">
      {/* 1. KYC & Document Signing Status Banner */}
      {kycState && (
        <div
          className={`rounded-2xl p-5 border shadow-card flex flex-col md:flex-row items-start md:items-center justify-between gap-4 ${
            kycState === "verified"
              ? "bg-emerald-50 border-emerald-200 text-emerald-900"
              : kycState === "pending"
              ? "bg-blue-50 border-blue-200 text-blue-900"
              : kycState === "rejected"
              ? "bg-rose-50 border-rose-200 text-rose-900"
              : "bg-gradient-to-r from-blue-600 to-indigo-700 border-blue-700 text-white"
          }`}
        >
          <div className="flex items-start gap-3.5 min-w-0">
            <div
              className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${
                kycState === "verified"
                  ? "bg-emerald-600 text-white"
                  : kycState === "pending"
                  ? "bg-blue-600 text-white"
                  : kycState === "rejected"
                  ? "bg-rose-600 text-white"
                  : "bg-white/15 text-white"
              }`}
            >
              {kycState === "verified" ? (
                <ShieldCheck className="w-5 h-5" />
              ) : kycState === "pending" ? (
                <Clock className="w-5 h-5" />
              ) : kycState === "rejected" ? (
                <AlertTriangle className="w-5 h-5" />
              ) : (
                <Sparkles className="w-5 h-5" />
              )}
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-extrabold leading-snug">
                {kycState === "verified"
                  ? "KYC Identity Verified"
                  : kycState === "pending"
                  ? "KYC Verification Under Compliance Review"
                  : kycState === "rejected"
                  ? "KYC Verification Requires Resubmission"
                  : "Complete Your KYC Identity Verification"}
              </h2>
              <p
                className={`text-xs sm:text-sm mt-0.5 ${
                  kycState === "unverified" ? "text-blue-100" : "opacity-80"
                }`}
              >
                {kycState === "verified"
                  ? "Your identity and address are approved. Full wallet, KYC, and e-signature access is active."
                  : kycState === "pending"
                  ? "Your Government ID and Proof of Address have been submitted. You can sign pending documents while we review."
                  : kycState === "rejected"
                  ? isUser.submitDoc?.rejectionReason ||
                    "Your previous submission was rejected. Please upload clear, valid documents."
                  : "Upload your Government ID and Proof of Address to activate full account compliance."}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <Link
              to="/flows/documents"
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors ${
                kycState === "unverified"
                  ? "bg-white/15 hover:bg-white/25 text-white border border-white/25"
                  : "bg-white hover:bg-slate-50 text-slate-800 border border-slate-200"
              }`}
            >
              <FileSignature className="w-3.5 h-3.5" />
              <span>Document Signing</span>
            </Link>
            <Link
              to="/flows/kyc"
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold shadow-sm transition-colors ${
                kycState === "unverified"
                  ? "bg-white hover:bg-blue-50 text-blue-700"
                  : kycState === "verified"
                  ? "bg-emerald-600 hover:bg-emerald-700 text-white"
                  : kycState === "rejected"
                  ? "bg-rose-600 hover:bg-rose-700 text-white"
                  : "bg-blue-600 hover:bg-blue-700 text-white"
              }`}
            >
              <span>
                {kycState === "verified"
                  ? "View KYC Record"
                  : kycState === "pending"
                  ? "View KYC Status"
                  : kycState === "rejected"
                  ? "Resubmit KYC"
                  : "Complete KYC Now"}
              </span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      )}

      {/* 2. Portfolio Summary + Live Market Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {marketCoins.map((coin) => {
          const isUp = Number(coin.change24h) >= 0;
          const formattedPrice =
            coin.price >= 10000
              ? Math.round(coin.price).toLocaleString("en-US")
              : Number(coin.price || 0).toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                });

          return (
            <div
              key={coin.key}
              className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-card hover:shadow-card-hover transition-all flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                    {coin.name}
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                    {coin.symbol}
                  </span>
                </div>
                <p className="text-xl font-extrabold text-slate-900 mt-2 truncate">
                  {currencySymbol}
                  {formattedPrice}
                </p>
                <div
                  className={`inline-flex items-center gap-1 text-xs font-bold mt-1 ${
                    isUp ? "text-emerald-600" : "text-rose-600"
                  }`}
                >
                  {isUp ? (
                    <TrendingUp className="w-3.5 h-3.5" />
                  ) : (
                    <TrendingDown className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {isUp ? "+" : ""}
                    {Number(coin.change24h || 0).toFixed(2)}%
                  </span>
                </div>
              </div>
              <div className="w-11 h-11 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center shrink-0">
                <img
                  src={coin.logo}
                  alt={coin.name}
                  className="w-7 h-7 rounded-full object-contain"
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* 3. Balance KPI Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-card flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Available Portfolio Balance
            </p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1.5">
              {totalBalance === null ? "Loading..." : totalBalance}
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
            <Wallet className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-card flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Pending Incoming Balance
            </p>
            <p className="text-2xl font-extrabold text-slate-900 mt-1.5">
              {pendingBalance === null ? "Loading..." : pendingBalance}
            </p>
          </div>
          <div className="w-11 h-11 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 4. Dismissible Referral Promo Banner */}
      {showReferralAd && referralLinkEnabled && (
        <div className="relative rounded-2xl bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6 shadow-md overflow-hidden">
          <button
            type="button"
            onClick={dismissReferralAd}
            aria-label="Dismiss referral promo"
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 pr-8">
            <div className="w-14 h-14 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
              <Gift className="w-7 h-7 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-extrabold text-white">
                Turn Your Friends Into Cash!
              </h3>
              <p className="text-xs sm:text-sm text-blue-100 mt-1 max-w-2xl">
                Share your unique referral code and earn <strong>$100</strong> for every
                friend who signs up and starts trading.
              </p>
            </div>
            <Link
              to="/user/referral-promo"
              className="shrink-0 inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-white hover:bg-blue-50 text-blue-700 text-xs font-bold shadow-sm transition-colors"
            >
              <span>Get Referral Code</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      )}

      {/* 5. Admin-configured Announcement HTML (if any) */}
      {description1 && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-card text-sm text-slate-700">
          <div className="htmData" dangerouslySetInnerHTML={{ __html: description1 }} />
        </div>
      )}

      {/* 6. Assets & Wallets Section */}
      <UserAssetsSection showViewAll />

      {/* 7. Recent Transactions */}
      <UserRecentTransactionsSection limit={8} />

      {/* 8. Secondary Announcement HTML (if any) */}
      {description2 && (
        <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-card text-sm text-slate-700">
          <div className="htmData" dangerouslySetInnerHTML={{ __html: description2 }} />
        </div>
      )}
    </UserPortalShell>
  );
}
