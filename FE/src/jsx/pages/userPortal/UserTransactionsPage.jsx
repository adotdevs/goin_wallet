import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useAuthUser } from "react-auth-kit";
import { toast } from "react-toastify";
import {
  Search,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  ArrowRight,
  X,
  ReceiptText,
  Copy,
  Check,
  CheckCircle2,
  Clock,
  Layers,
  Info,
} from "lucide-react";
import { getsignUserApi, getUserCoinApi } from "../../../Api/Service";
import {
  isFiatCoin,
  convertFiatToUserCurrency,
  getUserDisplayCurrency,
  extractLivePrices,
  useUsdToEurRate,
} from "../../../utils/euroCoinUtils";
import {
  formatSwapAmountLabel,
  formatSwapPairLabel,
  getSwapDetails,
  getSwapListSubtitle,
  isSwapTransaction,
  shouldShowTransaction,
  trxNameToSymbol,
} from "../report/assets/swapTransactionUtils";
import {
  formatSmartAmount,
  formatStatusLabel,
  formatTransactionDate,
  getStatusTone,
  getTransactionTypeLabel,
  resolveTransactionCoinMeta,
} from "../report/assets/transactionDisplayUtils";
import UserPortalShell from "./UserPortalShell";

const FILTERS = [
  { id: "all", label: "All" },
  { id: "completed", label: "Completed" },
  { id: "pending", label: "Pending" },
  { id: "deposit", label: "Deposit" },
  { id: "withdraw", label: "Withdraw" },
  { id: "swap", label: "Swap" },
];

const truncateMiddle = (value, start = 10, end = 8) => {
  const text = String(value || "");
  if (text.length <= start + end + 3) return text;
  return `${text.slice(0, start)}…${text.slice(-end)}`;
};

export default function UserTransactionsPage() {
  useUsdToEurRate();
  const { id } = useParams();
  const authUser = useAuthUser();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [selectedTx, setSelectedTx] = useState(null);
  const [isUser, setIsUser] = useState({});
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [pricePayload, setPricePayload] = useState(null);
  const [copiedField, setCopiedField] = useState("");

  useEffect(() => {
    const user = authUser()?.user;
    if (!user) return;
    if (["admin", "superadmin", "subadmin"].includes(user.role)) {
      navigate("/admin/dashboard", { replace: true });
      return;
    }
    if (user.role === "user" && id && user._id !== id) {
      navigate("/dashboard", { replace: true });
      return;
    }

    const load = async () => {
      try {
        const fd = new FormData();
        fd.append("id", user._id);
        const [profileRes, txRes] = await Promise.all([
          getsignUserApi(fd).catch(() => null),
          getUserCoinApi(id || user._id).catch(() => null),
        ]);

        if (profileRes?.success && profileRes?.signleUser) {
          setIsUser(profileRes.signleUser);
        }
        if (txRes?.success) {
          const list = Array.isArray(txRes.getCoin?.transactions)
            ? [...txRes.getCoin.transactions].reverse()
            : [];
          setTransactions(list);
          setPricePayload(txRes);
        } else if (txRes?.msg) {
          toast.error(txRes.msg);
        }
      } catch (err) {
        console.error("Error loading transactions:", err);
        toast.error("Failed to load transactions");
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [authUser, id, navigate]);

  const livePrices = useMemo(
    () => extractLivePrices(pricePayload, isUser?.currency),
    [pricePayload, isUser?.currency]
  );

  const prices = useMemo(
    () => ({
      bitcoin: livePrices.btc || 0,
      ethereum: livePrices.eth || 0,
      tether: livePrices.usdt || 1,
      bnb: livePrices.bnb || 0,
      xrp: livePrices.xrp || 0,
      dogecoin: livePrices.doge || 0,
      euro: 1,
      solana: livePrices.sol || 0,
      toncoin: livePrices.ton || 0,
      chainlink: livePrices.link || 0,
      polkadot: livePrices.dot || 0,
      "near protocol": livePrices.near || 0,
      "usd coin": livePrices.usdc || 0,
      tron: livePrices.trx || 0,
    }),
    [livePrices]
  );

  const calculateTransactionValue = (tx) => {
    if (isFiatCoin(tx.trxName)) {
      return convertFiatToUserCurrency(
        tx.amount,
        tx.trxName,
        isUser.currency
      ).toFixed(2);
    }
    const price = prices[String(tx.trxName || "").toLowerCase()] || 0;
    return (Math.abs(parseFloat(tx.amount) || 0) * price).toFixed(2);
  };

  const getFiatLabel = (trxName) => {
    if (isFiatCoin(trxName)) {
      return getUserDisplayCurrency(isUser.currency);
    }
    return isUser.currency === "EUR" ? "EUR" : "USD";
  };

  const getTransactionFiatDisplay = (tx) => {
    const val = calculateTransactionValue(tx);
    const label = getFiatLabel(tx.trxName);
    const prefix =
      tx.type === "deposit"
        ? "+"
        : tx.type === "withdraw"
          ? "-"
          : parseFloat(tx.amount) >= 0
            ? "+"
            : "-";
    return `${prefix}${Number(val).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })} ${label}`;
  };

  const visibleTransactions = useMemo(
    () => transactions.filter(shouldShowTransaction),
    [transactions]
  );

  const summaryStats = useMemo(() => {
    let completed = 0;
    let pending = 0;
    let swaps = 0;
    let deposits = 0;
    let withdrawals = 0;

    visibleTransactions.forEach((tx) => {
      const status = String(tx.status || "").toLowerCase();
      if (status.includes("completed")) completed += 1;
      if (status.includes("pending")) pending += 1;
      if (isSwapTransaction(tx)) swaps += 1;
      else if (tx.type === "deposit") deposits += 1;
      else if (tx.type === "withdraw") withdrawals += 1;
    });

    return {
      total: visibleTransactions.length,
      completed,
      pending,
      swaps,
      deposits,
      withdrawals,
    };
  }, [visibleTransactions]);

  const filteredTransactions = useMemo(() => {
    const q = search.trim().toLowerCase();
    return visibleTransactions.filter((tx) => {
      const status = String(tx.status || "").toLowerCase();
      if (filter === "completed" && !status.includes("completed")) return false;
      if (filter === "pending" && !status.includes("pending")) return false;
      if (filter === "deposit" && !(tx.type === "deposit" && !isSwapTransaction(tx))) return false;
      if (filter === "withdraw" && !(tx.type === "withdraw" && !isSwapTransaction(tx))) return false;
      if (filter === "swap" && !isSwapTransaction(tx)) return false;

      if (!q) return true;
      const meta = resolveTransactionCoinMeta(tx.trxName);
      const swapDetails = isSwapTransaction(tx) ? getSwapDetails(tx, transactions) : null;
      const pairStr = swapDetails ? formatSwapPairLabel(swapDetails) : "";
      return (
        String(tx.trxName || "").toLowerCase().includes(q) ||
        String(meta?.symbol || "").toLowerCase().includes(q) ||
        pairStr.toLowerCase().includes(q) ||
        String(tx.note || "").toLowerCase().includes(q) ||
        String(tx._id || "").toLowerCase().includes(q) ||
        String(tx.txId || "").toLowerCase().includes(q) ||
        String(tx.status || "").toLowerCase().includes(q)
      );
    });
  }, [visibleTransactions, transactions, filter, search]);

  const statusPill = (status) => {
    const tone = getStatusTone(status);
    if (tone === "completed") return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (tone === "pending") return "bg-amber-50 text-amber-700 border-amber-200";
    if (tone === "rejected") return "bg-rose-50 text-rose-700 border-rose-200";
    return "bg-slate-100 text-slate-600 border-slate-200";
  };

  const getMethodOrDetails = (tx, isSwap, swapDetails) => {
    if (isSwap) {
      return {
        badge: "Instant Swap",
        badgeClass: "bg-blue-50 text-blue-700 border-blue-200",
        detail: getSwapListSubtitle(tx, transactions),
      };
    }
    if (tx.txId === "staking amount" || tx.stakingData?.isStaking) {
      const dur = tx.stakingData?.duration;
      const rate = tx.stakingData?.interestRate;
      return {
        badge: "Staking",
        badgeClass: "bg-indigo-50 text-indigo-700 border-indigo-200",
        detail: dur ? `${dur}d lock · ${rate || 0}% APY` : "Staking position",
      };
    }
    if (tx.withdraw === "bank") {
      return {
        badge: "Bank Transfer",
        badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
        detail: tx.selectedPayment
          ? `To ${truncateMiddle(tx.selectedPayment, 12, 8)}`
          : tx.note || "Wire transfer",
      };
    }
    if (tx.withdraw === "crypto") {
      return {
        badge: "Crypto Transfer",
        badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
        detail:
          tx.txId && tx.txId !== "placeholder"
            ? `Ref: ${truncateMiddle(tx.txId, 10, 6)}`
            : tx.note || "On-chain transfer",
      };
    }
    const cleanTxId =
      tx.txId && tx.txId !== "placeholder" && !String(tx.txId).startsWith("swap-")
        ? tx.txId
        : "";
    return {
      badge: tx.type === "deposit" ? "Deposit" : tx.type === "withdraw" ? "Withdraw" : "Transfer",
      badgeClass:
        tx.type === "deposit"
          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
          : "bg-slate-100 text-slate-700 border-slate-200",
      detail: tx.note || cleanTxId || "Wallet transaction",
    };
  };

  const copyText = (value, key) => {
    if (!value) return;
    navigator.clipboard.writeText(String(value));
    setCopiedField(key);
    toast.success("Copied to clipboard");
    setTimeout(() => setCopiedField(""), 1800);
  };

  // Build selected modal info
  const modalMeta = useMemo(() => {
    if (!selectedTx) return null;
    const isSwap = isSwapTransaction(selectedTx);
    const swapDetails = isSwap ? getSwapDetails(selectedTx, transactions) : null;
    const coinMeta = resolveTransactionCoinMeta(selectedTx.trxName);
    const symbol = trxNameToSymbol(selectedTx.trxName) || coinMeta?.symbol || "";
    const amountNum = parseFloat(selectedTx.amount || 0);
    const isPositive =
      selectedTx.type === "deposit" || (selectedTx.type !== "withdraw" && amountNum >= 0);
    const headline = isSwap
      ? swapDetails?.from && swapDetails?.to
        ? `Swap ${formatSwapPairLabel(swapDetails)}`
        : `Swap ${symbol}`
      : `${getTransactionTypeLabel(selectedTx)} ${symbol}`;
    const rate =
      isSwap &&
      swapDetails?.from?.amount > 0 &&
      swapDetails?.to?.amount > 0
        ? `1 ${swapDetails.from.symbol} ≈ ${formatSmartAmount(
            swapDetails.to.amount / swapDetails.from.amount
          )} ${swapDetails.to.symbol}`
        : null;

    return {
      isSwap,
      swapDetails,
      coinMeta,
      symbol,
      amountNum,
      isPositive,
      headline,
      rate,
      fiatDisplay: getTransactionFiatDisplay(selectedTx),
    };
  }, [selectedTx, transactions, prices, isUser]);

  return (
    <UserPortalShell title="Transactions">
      <div className="space-y-6 w-full">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight m-0">
              Transactions
            </h1>
            <p className="text-sm text-slate-500 mt-1 mb-0">
              Complete history of your deposits, withdrawals, staking positions, and instant swaps. Click any row for full details.
            </p>
          </div>
          <span className="inline-flex items-center self-start sm:self-auto px-3.5 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-semibold text-slate-600 shadow-sm">
            Showing {filteredTransactions.length} of {summaryStats.total} records
          </span>
        </div>

        {/* Summary KPI Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 m-0">
                Total Records
              </p>
              <p className="text-2xl font-bold text-slate-900 mt-1 mb-0 tabular-nums">
                {summaryStats.total}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
              <ReceiptText className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 m-0">
                Completed
              </p>
              <p className="text-2xl font-bold text-emerald-600 mt-1 mb-0 tabular-nums">
                {summaryStats.completed}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 m-0">
                Pending
              </p>
              <p className="text-2xl font-bold text-amber-600 mt-1 mb-0 tabular-nums">
                {summaryStats.pending}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Clock className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card p-4 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 m-0">
                Instant Swaps
              </p>
              <p className="text-2xl font-bold text-blue-600 mt-1 mb-0 tabular-nums">
                {summaryStats.swaps}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <ArrowLeftRight className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Main Table Card */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card overflow-hidden">
          {/* Filters & Search Toolbar */}
          <div className="px-6 py-4 border-b border-slate-100 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div className="flex flex-wrap items-center gap-1.5 bg-slate-100/80 p-1 rounded-xl">
              {FILTERS.map((item) => {
                const active = filter === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setFilter(item.id)}
                    className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border-0 ${
                      active
                        ? "bg-blue-600 text-white shadow-sm"
                        : "bg-transparent text-slate-600 hover:text-slate-900 hover:bg-white/70"
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
            </div>

            <div className="relative w-full lg:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search asset, swap pair, note, or ID..."
                className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-colors"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
              <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin mb-3" />
              <p className="text-sm font-medium m-0">Loading transactions...</p>
            </div>
          ) : filteredTransactions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
                <ReceiptText className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-slate-900 m-0">
                No transactions found
              </h3>
              <p className="text-sm text-slate-500 mt-1 mb-0">
                Try switching filters or clearing your search query.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100">
                    <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Transaction
                    </th>
                    <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Method &amp; Details
                    </th>
                    <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Date
                    </th>
                    <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Status
                    </th>
                    <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">
                      Amount
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredTransactions.map((tx, idx) => {
                    const meta = resolveTransactionCoinMeta(tx.trxName);
                    const isSwap = isSwapTransaction(tx);
                    const swapDetails = isSwap ? getSwapDetails(tx, transactions) : null;
                    const symbol = trxNameToSymbol(tx.trxName) || meta?.symbol || "";
                    const title = isSwap
                      ? swapDetails?.from && swapDetails?.to
                        ? `Swap ${formatSwapPairLabel(swapDetails)}`
                        : `Swap ${symbol}`
                      : `${getTransactionTypeLabel(tx)} ${symbol}`;
                    const amountNum = parseFloat(tx.amount) || 0;
                    const isPositive =
                      tx.type === "deposit" || (tx.type !== "withdraw" && amountNum >= 0);
                    const sign = isPositive ? "+" : "-";
                    const formattedAmt = `${sign}${formatSmartAmount(Math.abs(amountNum))} ${symbol}`;
                    const fiatDisplay = getTransactionFiatDisplay(tx);
                    const info = getMethodOrDetails(tx, isSwap, swapDetails);

                    return (
                      <tr
                        key={tx._id || idx}
                        onClick={() => setSelectedTx(tx)}
                        className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3.5">
                            <div className="relative shrink-0">
                              {meta?.logo ? (
                                <img
                                  src={meta.logo}
                                  alt={symbol}
                                  className="w-9 h-9 rounded-full object-contain bg-slate-50 border border-slate-200 p-0.5"
                                />
                              ) : (
                                <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-700 font-bold text-xs flex items-center justify-center border border-blue-100">
                                  {symbol.slice(0, 3)}
                                </div>
                              )}
                              <span
                                className={`w-4 h-4 rounded-full flex items-center justify-center absolute -bottom-0.5 -right-0.5 border border-white ${
                                  isSwap
                                    ? "bg-blue-600 text-white"
                                    : isPositive
                                      ? "bg-emerald-500 text-white"
                                      : "bg-slate-700 text-white"
                                }`}
                              >
                                {isSwap ? (
                                  <ArrowLeftRight className="w-2.5 h-2.5" />
                                ) : isPositive ? (
                                  <ArrowDownLeft className="w-2.5 h-2.5" />
                                ) : (
                                  <ArrowUpRight className="w-2.5 h-2.5" />
                                )}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-900 m-0 truncate">
                                {title}
                              </p>
                              <p className="text-xs text-slate-400 m-0 truncate font-mono">
                                {tx.txId && tx.txId !== "placeholder"
                                  ? truncateMiddle(tx.txId, 12, 6)
                                  : truncateMiddle(tx._id, 10, 6)}
                              </p>
                            </div>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <div className="flex flex-col items-start gap-1 max-w-xs">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold border ${info.badgeClass}`}
                            >
                              {info.badge}
                            </span>
                            <p className="text-xs text-slate-600 m-0 truncate max-w-full">
                              {info.detail}
                            </p>
                          </div>
                        </td>

                        <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">
                          {formatTransactionDate(tx.createdAt)}
                        </td>

                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border capitalize ${statusPill(
                              tx.status
                            )}`}
                          >
                            {formatStatusLabel(tx.status)}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-right whitespace-nowrap">
                          <p className="text-sm font-bold text-slate-900 m-0 tabular-nums">
                            {formattedAmt}
                          </p>
                          <p
                            className={`text-xs font-medium m-0 tabular-nums ${
                              isPositive ? "text-emerald-600" : "text-rose-600"
                            }`}
                          >
                            {fiatDisplay}
                          </p>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Rich Transaction Detail Modal */}
      {selectedTx && modalMeta && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setSelectedTx(null)}
        >
          <div
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-xl max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="px-6 py-5 border-b border-slate-100 flex items-start justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                {modalMeta.coinMeta?.logo ? (
                  <img
                    src={modalMeta.coinMeta.logo}
                    alt={modalMeta.symbol}
                    className="w-11 h-11 rounded-full object-contain bg-slate-50 border border-slate-200 p-1 shrink-0"
                  />
                ) : (
                  <div className="w-11 h-11 rounded-full bg-blue-50 text-blue-700 font-bold text-sm flex items-center justify-center shrink-0">
                    {modalMeta.symbol.slice(0, 3)}
                  </div>
                )}
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-slate-900 m-0 truncate">
                    {modalMeta.headline}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold border capitalize ${statusPill(
                        selectedTx.status
                      )}`}
                    >
                      {formatStatusLabel(selectedTx.status)}
                    </span>
                    <span className="text-xs text-slate-400">
                      {selectedTx.createdAt
                        ? new Date(selectedTx.createdAt).toLocaleString()
                        : "—"}
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedTx(null)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center border-0 bg-transparent cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-sm">
              {/* Swap Breakdown Box (when Swap) */}
              {modalMeta.isSwap && modalMeta.swapDetails?.from && modalMeta.swapDetails?.to && (
                <div className="rounded-2xl bg-blue-50/70 border border-blue-100 p-4 space-y-3">
                  <div className="flex items-center justify-between text-xs font-bold uppercase tracking-wider text-blue-700">
                    <span className="inline-flex items-center gap-1.5">
                      <ArrowLeftRight className="w-3.5 h-3.5" /> Swap Breakdown
                    </span>
                    <span>{formatSwapPairLabel(modalMeta.swapDetails)}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-11 gap-2 items-center">
                    <div className="sm:col-span-5 bg-white rounded-xl p-3 border border-blue-100">
                      <p className="text-[11px] font-semibold text-slate-400 m-0">You Sent</p>
                      <p className="text-sm font-bold text-rose-600 mt-0.5 mb-0 tabular-nums">
                        −{formatSwapAmountLabel(modalMeta.swapDetails.from.amount, modalMeta.swapDetails.from.symbol)}
                      </p>
                    </div>
                    <div className="sm:col-span-1 flex justify-center text-blue-500">
                      <ArrowRight className="w-4 h-4" />
                    </div>
                    <div className="sm:col-span-5 bg-white rounded-xl p-3 border border-blue-100">
                      <p className="text-[11px] font-semibold text-slate-400 m-0">You Received</p>
                      <p className="text-sm font-bold text-emerald-600 mt-0.5 mb-0 tabular-nums">
                        +{formatSwapAmountLabel(modalMeta.swapDetails.to.amount, modalMeta.swapDetails.to.symbol)}
                      </p>
                    </div>
                  </div>
                  {modalMeta.rate && (
                    <p className="text-xs text-slate-600 m-0 text-center">
                      Execution Rate: <strong className="text-slate-900">{modalMeta.rate}</strong>
                    </p>
                  )}
                </div>
              )}

              {/* Staking Breakdown Box (when Staking) */}
              {selectedTx.stakingData?.isStaking && (
                <div className="rounded-2xl bg-indigo-50/70 border border-indigo-100 p-4 space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wider text-indigo-700 m-0 inline-flex items-center gap-1.5">
                    <Layers className="w-3.5 h-3.5" /> Staking Terms
                  </p>
                  <div className="grid grid-cols-3 gap-3 pt-1 text-xs">
                    <div className="bg-white rounded-xl p-2.5 border border-indigo-100">
                      <p className="text-slate-400 m-0">Duration</p>
                      <p className="font-bold text-slate-900 m-0 mt-0.5">
                        {selectedTx.stakingData.duration} Days
                      </p>
                    </div>
                    <div className="bg-white rounded-xl p-2.5 border border-indigo-100">
                      <p className="text-slate-400 m-0">APY Rate</p>
                      <p className="font-bold text-emerald-600 m-0 mt-0.5">
                        {selectedTx.stakingData.interestRate}%
                      </p>
                    </div>
                    <div className="bg-white rounded-xl p-2.5 border border-indigo-100">
                      <p className="text-slate-400 m-0">Expected Reward</p>
                      <p className="font-bold text-blue-600 m-0 mt-0.5 tabular-nums">
                        +{Number(selectedTx.stakingData.expectedReward || 0).toFixed(4)} {modalMeta.symbol}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Key-Value Details */}
              <div className="divide-y divide-slate-100">
                <div className="flex items-center justify-between py-2.5">
                  <span className="text-slate-500">Asset</span>
                  <span className="font-semibold text-slate-900 capitalize">
                    {modalMeta.coinMeta?.name || selectedTx.trxName} ({modalMeta.symbol})
                  </span>
                </div>

                <div className="flex items-center justify-between py-2.5">
                  <span className="text-slate-500">
                    {modalMeta.isSwap ? "This Leg Amount" : "Amount"}
                  </span>
                  <span className="font-bold text-slate-900 tabular-nums">
                    {modalMeta.isPositive ? "+" : "−"}
                    {formatSmartAmount(Math.abs(modalMeta.amountNum))} {modalMeta.symbol}
                  </span>
                </div>

                <div className="flex items-center justify-between py-2.5">
                  <span className="text-slate-500">Estimated Value</span>
                  <span
                    className={`font-semibold tabular-nums ${
                      modalMeta.isPositive ? "text-emerald-600" : "text-rose-600"
                    }`}
                  >
                    {modalMeta.fiatDisplay}
                  </span>
                </div>

                {selectedTx.withdraw && (
                  <div className="flex items-center justify-between py-2.5">
                    <span className="text-slate-500">Method</span>
                    <span className="font-semibold text-slate-900">
                      {selectedTx.withdraw === "bank" ? "Bank Transfer" : "Crypto Transfer"}
                    </span>
                  </div>
                )}

                {selectedTx.txId && selectedTx.txId !== "placeholder" && (
                  <div className="flex items-center justify-between gap-3 py-2.5">
                    <span className="text-slate-500 shrink-0">
                      {modalMeta.isSwap ? "Swap Reference" : "Transaction ID"}
                    </span>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-mono text-xs text-slate-700 truncate">
                        {selectedTx.txId}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyText(selectedTx.txId, "txId")}
                        className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 border-0 bg-transparent cursor-pointer shrink-0"
                      >
                        {copiedField === "txId" ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {selectedTx.fromAddress &&
                  selectedTx.fromAddress !== "placeholder" &&
                  selectedTx.fromAddress !== "swap" && (
                    <div className="flex items-center justify-between gap-3 py-2.5">
                      <span className="text-slate-500 shrink-0">From Address</span>
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="font-mono text-xs text-slate-700 truncate">
                          {truncateMiddle(selectedTx.fromAddress, 12, 8)}
                        </span>
                        <button
                          type="button"
                          onClick={() => copyText(selectedTx.fromAddress, "from")}
                          className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 border-0 bg-transparent cursor-pointer shrink-0"
                        >
                          {copiedField === "from" ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                {selectedTx.selectedPayment && (
                  <div className="flex items-center justify-between gap-3 py-2.5">
                    <span className="text-slate-500 shrink-0">Payment Method / Destination</span>
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="font-mono text-xs text-slate-700 truncate">
                        {truncateMiddle(selectedTx.selectedPayment, 14, 10)}
                      </span>
                      <button
                        type="button"
                        onClick={() => copyText(selectedTx.selectedPayment, "payment")}
                        className="p-1 rounded-md text-slate-400 hover:text-blue-600 hover:bg-blue-50 border-0 bg-transparent cursor-pointer shrink-0"
                      >
                        {copiedField === "payment" ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {selectedTx.reference && (
                  <div className="flex items-center justify-between gap-3 py-2.5">
                    <span className="text-slate-500 shrink-0">Reference Number</span>
                    <span className="font-mono text-xs text-slate-700">
                      {selectedTx.reference}
                    </span>
                  </div>
                )}

                {selectedTx.note && !modalMeta.isSwap && (
                  <div className="py-2.5 space-y-1">
                    <span className="text-slate-500 inline-flex items-center gap-1 text-xs font-semibold">
                      <Info className="w-3.5 h-3.5" /> Note
                    </span>
                    <p className="text-xs text-slate-700 bg-slate-50 rounded-xl p-3 border border-slate-100 m-0">
                      {selectedTx.note}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedTx(null)}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold border-0 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </UserPortalShell>
  );
}
