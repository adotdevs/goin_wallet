import React, { useEffect, useMemo, useState } from "react";
import { useAuthUser } from "react-auth-kit";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Bot,
  TrendingUp,
  CheckCircle2,
  Activity,
  X,
  Sparkles,
  ShieldCheck,
} from "lucide-react";
import {
  createUserTransactionApi,
  markTrxCloseApi,
  getCoinsUserApi,
  getsignUserApi,
  getUserCoinApi,
  getLinksApi,
} from "../../../Api/Service";
import { getTransactionsForCoin } from "../report/assets/coinConfig";
import UserPortalShell from "./UserPortalShell";

const BOT_COINS = [
  {
    key: "bitcoin",
    short: "btc",
    name: "Bitcoin",
    symbol: "BTC",
    minValue: 0.0117769844,
    icon: "https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1a63530be6e374711a8554f31b17e4cb92c25fa5/128/color/btc.png",
  },
  {
    key: "ethereum",
    short: "eth",
    name: "Ethereum",
    symbol: "ETH",
    minValue: 0.1969969781,
    icon: "https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1a63530be6e374711a8554f31b17e4cb92c25fa5/128/color/eth.png",
  },
  {
    key: "tether",
    short: "usdt",
    name: "Tether USDT",
    symbol: "USDT",
    minValue: 500.3001801081,
    icon: "https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1a63530be6e374711a8554f31b17e4cb92c25fa5/128/color/usdt.png",
  },
];

const MULTIPLIERS = { 30: 1.0, 60: 1.2, 90: 1.5 };

export default function UserTradingPage() {
  const authUser = useAuthUser();
  const navigate = useNavigate();
  const userId = authUser()?.user?._id;

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [closingId, setClosingId] = useState("");
  const [transactions, setTransactions] = useState([]);
  const [livePrices, setLivePrices] = useState({ btc: 96075.25, eth: 2640, usdt: 1 });
  const [balances, setBalances] = useState({ bitcoin: 0, ethereum: 0, tether: 0 });
  const [baseRate, setBaseRate] = useState(1.25);
  const [durations, setDurations] = useState({ bitcoin: 30, ethereum: 30, tether: 30 });
  const [modalCoin, setModalCoin] = useState(null);
  const [amount, setAmount] = useState("");

  const loadAll = async () => {
    if (!userId) return;
    try {
      const fd = new FormData();
      fd.append("id", userId);
      const [profileRes, coinsRes, txRes] = await Promise.all([
        getsignUserApi(fd).catch(() => null),
        getCoinsUserApi(userId).catch(() => null),
        getUserCoinApi(userId).catch(() => null),
      ]);

      if (profileRes?.success && profileRes?.signleUser) {
        const pct = Number(profileRes.signleUser.AiTradingPercentage);
        if (!Number.isNaN(pct) && pct > 0) setBaseRate(pct);
      }

      if (coinsRes?.success && coinsRes?.getCoin) {
        const txs = coinsRes.getCoin.transactions || [];
        setBalances({
          bitcoin: getTransactionsForCoin("bitcoin", txs),
          ethereum: getTransactionsForCoin("ethereum", txs),
          tether: getTransactionsForCoin("tether", txs),
        });
        setLivePrices({
          btc: coinsRes?.btcPrice?.quote?.USD?.price || 96075.25,
          eth: coinsRes?.ethPrice?.quote?.USD?.price || 2640,
          usdt: 1,
        });
      }

      if (txRes?.success && Array.isArray(txRes.getCoin?.transactions)) {
        setTransactions([...txRes.getCoin.transactions].reverse());
      }
    } catch (err) {
      console.error("AI trading load error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const user = authUser()?.user;
    if (!user) return;
    if (["admin", "superadmin", "subadmin"].includes(user.role)) {
      navigate("/admin/dashboard", { replace: true });
      return;
    }

    const init = async () => {
      try {
        const links = await getLinksApi();
        if (!links?.links?.[1]?.enabled) {
          navigate(-1);
          return;
        }
      } catch {
        // continue
      }
      await loadAll();
    };
    init();
  }, [userId]);

  const botPositions = useMemo(
    () =>
      transactions.filter(
        (tx) => !tx.isHidden && tx.txId === "Trading amount"
      ),
    [transactions]
  );

  const getUsdValue = (trxName, bal) => {
    if (trxName === "bitcoin") return bal * livePrices.btc;
    if (trxName === "ethereum") return bal * livePrices.eth;
    if (trxName === "tether") return bal;
    return 0;
  };

  const summary = useMemo(() => {
    let active = 0;
    let closed = 0;
    let totalProfitUsd = 0;
    botPositions.forEach((tx) => {
      if (tx.isTrading) active += 1;
      else closed += 1;
      totalProfitUsd += getUsdValue(tx.trxName, Math.abs(tx.totalProfit || 0));
    });
    return { active, closed, totalProfitUsd };
  }, [botPositions, livePrices]);

  const handleStartTrade = async () => {
    if (!modalCoin) return;
    const parsed = parseFloat(amount);
    if (!amount.trim() || isNaN(parsed) || parsed <= 0) {
      toast.error("Please enter a valid trade amount");
      return;
    }

    try {
      setIsSubmitting(true);
      const tradingTime = durations[modalCoin.key] || 30;
      const body = {
        trxName: modalCoin.key,
        amount: -parsed,
        txId: "Trading amount",
        e: "crypto",
        status: "completed",
        tradingTime,
        lastProfitDate: null,
        totalProfit: 0,
        isTrading: true,
        profit: 0,
      };
      const res = await createUserTransactionApi(userId, body);
      if (res?.success) {
        toast.success("AI Trading Bot activated successfully!");
        setModalCoin(null);
        setAmount("");
        await loadAll();
      } else {
        toast.error(res?.msg || "Failed to start trading bot");
      }
    } catch (err) {
      toast.error(err?.message || "Failed to start trading bot");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEndTrade = async (tx, currentBalance) => {
    try {
      setClosingId(tx._id);
      const body = {
        trxName: tx.trxName,
        amount: Math.abs(currentBalance),
        txId: "Trade closure",
        e: "crypto",
        status: "completed",
        type: "deposit",
        isTrading: false,
      };
      const res = await markTrxCloseApi(userId, tx._id);
      await createUserTransactionApi(userId, body);
      if (res?.success) {
        toast.success("Trade closed! Profit has been added to your available balance.");
        await loadAll();
      } else {
        toast.error(res?.msg || "Failed to close trade");
      }
    } catch (err) {
      toast.error(err?.message || "Failed to close trade");
    } finally {
      setClosingId("");
    }
  };

  const modalDuration = modalCoin ? durations[modalCoin.key] || 30 : 30;
  const modalEffectiveRate = baseRate * (MULTIPLIERS[modalDuration] || 1);
  const modalBalance = modalCoin ? Number(balances[modalCoin.key] || 0) : 0;
  const modalEstProfit = ((parseFloat(amount) || 0) * modalEffectiveRate) / 100;

  return (
    <UserPortalShell title="AI Trading Bot">
      <div className="space-y-6 w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight m-0">
              AI Trading Bot
            </h1>
            <p className="text-sm text-slate-500 mt-1 mb-0">
              Automate your crypto trading strategies with algorithmic 24/7 execution and live profit tracking.
            </p>
          </div>
          <span className="inline-flex items-center gap-2 self-start sm:self-auto px-4 py-2 rounded-xl bg-blue-50 border border-blue-100 text-blue-700 text-xs font-bold">
            <Bot className="w-4 h-4" /> Algorithmic Execution Active
          </span>
        </div>

        {/* KPI Strip */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card p-5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 m-0">
                Active Bots
              </p>
              <p className="text-2xl font-bold text-blue-600 mt-1 mb-0 tabular-nums">
                {summary.active}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card p-5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 m-0">
                Completed Trades
              </p>
              <p className="text-2xl font-bold text-slate-900 mt-1 mb-0 tabular-nums">
                {summary.closed}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card p-5 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 m-0">
                Cumulative Bot Profit
              </p>
              <p className="text-2xl font-bold text-emerald-600 mt-1 mb-0 tabular-nums">
                +${summary.totalProfitUsd.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Launch New Bot Section */}
        <div>
          <h2 className="text-lg font-bold text-slate-900 mb-4">
            Launch Automated Trading Strategy
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {BOT_COINS.map((coin) => {
              const dur = durations[coin.key] || 30;
              const bal = Number(balances[coin.key] || 0);
              return (
                <div
                  key={coin.key}
                  className="bg-white rounded-2xl border border-slate-200/90 shadow-card p-6 flex flex-col justify-between hover:border-blue-300 transition-all"
                >
                  <div>
                    <div className="flex items-center gap-3.5 mb-5">
                      <img
                        src={coin.icon}
                        alt={coin.name}
                        className="w-11 h-11 rounded-full object-contain bg-slate-50 border border-slate-200 p-1 shrink-0"
                      />
                      <div>
                        <h3 className="text-base font-bold text-slate-900 m-0">
                          Trade {coin.name}
                        </h3>
                        <p className="text-xs text-slate-400 m-0">
                          Available: {bal.toLocaleString(undefined, { maximumFractionDigits: 6 })}{" "}
                          {coin.symbol}
                        </p>
                      </div>
                    </div>

                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Select Duration
                    </p>
                    <div className="grid grid-cols-3 gap-2 mb-5">
                      {[30, 60, 90].map((d) => {
                        const active = dur === d;
                        return (
                          <button
                            key={d}
                            type="button"
                            onClick={() =>
                              setDurations((prev) => ({ ...prev, [coin.key]: d }))
                            }
                            className={`py-2.5 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
                              active
                                ? "bg-blue-600 border-blue-600 text-white shadow-xs"
                                : "bg-slate-50 border-slate-200 text-slate-700 hover:border-blue-300"
                            }`}
                          >
                            {d} Days
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex items-center justify-between text-xs py-3 border-t border-slate-100 mb-4">
                      <span className="text-slate-500">Minimum Allocation</span>
                      <span className="font-bold text-slate-900 tabular-nums">
                        {coin.minValue} {coin.symbol}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setModalCoin(coin);
                      setAmount("");
                    }}
                    className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold border-0 shadow-xs transition-colors cursor-pointer"
                  >
                    Start {coin.symbol} Bot
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* Trade Rewards / Active & Closed Positions */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-slate-900 m-0">
                Trade Performance &amp; Rewards ({botPositions.length})
              </h2>
            </div>
          </div>

          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center text-slate-500">
              <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin mb-3" />
              <p className="text-sm m-0">Loading trading performance...</p>
            </div>
          ) : botPositions.length === 0 ? (
            <div className="py-14 text-center text-sm text-slate-500">
              No active or past AI trading bot positions yet. Launch a strategy above to begin.
            </div>
          ) : (
            <div className="p-6 space-y-6">
              {botPositions.map((tx, idx) => {
                const initialAmt = Math.abs(tx.amount || 0);
                const totalProfit = Math.abs(tx.totalProfit || 0);
                const currentBalance = initialAmt + totalProfit;
                const profitPct =
                  initialAmt > 0 ? ((totalProfit / initialAmt) * 100).toFixed(2) : "0.00";
                const chartData = (tx.dailyProfits || []).map((p, i) => ({
                  day: `Day ${i + 1}`,
                  profit: Number(Math.abs(p.profit || 0).toFixed(6)),
                }));
                const isActive = Boolean(tx.isTrading);
                const sym =
                  tx.trxName === "bitcoin"
                    ? "BTC"
                    : tx.trxName === "ethereum"
                      ? "ETH"
                      : "USDT";

                return (
                  <div
                    key={tx._id || idx}
                    className="rounded-2xl border border-slate-200 bg-slate-50/50 p-5 space-y-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <h3 className="text-base font-bold text-slate-900 capitalize m-0">
                          {tx.trxName} Trading ({tx.tradingTime || 30} days)
                        </h3>
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase border ${
                            isActive
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : "bg-slate-100 text-slate-600 border-slate-200"
                          }`}
                        >
                          {isActive ? "Running" : "Closed"}
                        </span>
                      </div>

                      {isActive && (
                        <button
                          type="button"
                          disabled={closingId === tx._id}
                          onClick={() => handleEndTrade(tx, currentBalance)}
                          className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 disabled:opacity-60 text-white text-xs font-bold border-0 shadow-xs cursor-pointer"
                        >
                          {closingId === tx._id ? "Closing..." : "End Trade & Claim"}
                        </button>
                      )}
                    </div>

                    {chartData.length > 0 && (
                      <div className="h-56 w-full bg-white rounded-xl border border-slate-200/80 p-3">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={chartData}>
                            <defs>
                              <linearGradient id={`grad-${idx}`} x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="day" tick={{ fontSize: 11, fill: "#64748b" }} />
                            <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
                            <Tooltip
                              contentStyle={{
                                backgroundColor: "#ffffff",
                                border: "1px solid #e2e8f0",
                                borderRadius: "10px",
                                fontSize: "12px",
                              }}
                            />
                            <Area
                              type="monotone"
                              dataKey="profit"
                              stroke="#10b981"
                              strokeWidth={2}
                              fill={`url(#grad-${idx})`}
                            />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    )}

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                      <div className="bg-white rounded-xl border border-slate-200/80 p-3">
                        <p className="text-slate-400 font-semibold m-0">Initial Capital</p>
                        <p className="text-sm font-bold text-slate-900 mt-1 mb-0 tabular-nums">
                          {initialAmt.toFixed(6)} {sym}
                        </p>
                        <p className="text-[11px] text-slate-500 m-0 tabular-nums">
                          ${getUsdValue(tx.trxName, initialAmt).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </p>
                      </div>

                      <div className="bg-white rounded-xl border border-slate-200/80 p-3">
                        <p className="text-slate-400 font-semibold m-0">Current Value</p>
                        <p className="text-sm font-bold text-slate-900 mt-1 mb-0 tabular-nums">
                          {currentBalance.toFixed(6)} {sym}
                        </p>
                        <p className="text-[11px] text-slate-500 m-0 tabular-nums">
                          ${getUsdValue(tx.trxName, currentBalance).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </p>
                      </div>

                      <div className="bg-white rounded-xl border border-slate-200/80 p-3">
                        <p className="text-slate-400 font-semibold m-0">Total Profit</p>
                        <p className="text-sm font-bold text-emerald-600 mt-1 mb-0 tabular-nums">
                          +{totalProfit.toFixed(6)} {sym}
                        </p>
                        <p className="text-[11px] text-emerald-600 m-0 tabular-nums">
                          +${getUsdValue(tx.trxName, totalProfit).toLocaleString(undefined, { maximumFractionDigits: 2 })}
                        </p>
                      </div>

                      <div className="bg-white rounded-xl border border-slate-200/80 p-3">
                        <p className="text-slate-400 font-semibold m-0">Return %</p>
                        <p className="text-sm font-bold text-emerald-600 mt-1 mb-0 tabular-nums">
                          +{profitPct}%
                        </p>
                        <p className="text-[11px] text-slate-400 m-0">Cumulative ROI</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Educational Info Strip */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 text-blue-600 font-bold text-xs uppercase tracking-wider">
              <Sparkles className="w-4 h-4" /> Automated Trading Bot
            </div>
            <p className="text-sm text-slate-600 leading-relaxed m-0">
              Our institutional trading engine executes strategies around the clock across bullish, bearish, and sideways market cycles—capturing consistent opportunities without manual monitoring.
            </p>
          </div>
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 text-emerald-600 font-bold text-xs uppercase tracking-wider">
              <ShieldCheck className="w-4 h-4" /> Disciplined Risk-Managed Execution
            </div>
            <p className="text-sm text-slate-600 leading-relaxed m-0">
              Algorithmic execution eliminates emotional trading decisions. Track daily yield curves transparently and close positions anytime to settle profits directly into your wallet balance.
            </p>
          </div>
        </div>
      </div>

      {/* Launch Trade Modal */}
      {modalCoin && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setModalCoin(null)}
        >
          <div
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <img
                  src={modalCoin.icon}
                  alt={modalCoin.name}
                  className="w-8 h-8 rounded-full object-contain bg-slate-50 border border-slate-200 p-0.5"
                />
                <h3 className="text-base font-bold text-slate-900 m-0">
                  Launch {modalCoin.name} Bot
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setModalCoin(null)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center border-0 bg-transparent cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <div className="flex items-center justify-between text-xs mb-1.5">
                  <label className="font-semibold text-slate-700">
                    Allocation Amount ({modalCoin.symbol})
                  </label>
                  <button
                    type="button"
                    onClick={() => setAmount(String(modalBalance))}
                    className="text-blue-600 font-bold hover:underline bg-transparent border-0 p-0 cursor-pointer"
                  >
                    Max: {modalBalance.toLocaleString(undefined, { maximumFractionDigits: 6 })}
                  </button>
                </div>
                <input
                  type="number"
                  step="any"
                  value={amount}
                  onChange={(e) => {
                    const v = e.target.value;
                    if (v === "") {
                      setAmount("");
                      return;
                    }
                    const n = parseFloat(v);
                    if (!isNaN(n)) {
                      setAmount(n > modalBalance ? String(modalBalance) : v);
                    }
                  }}
                  placeholder={`Enter ${modalCoin.symbol} amount`}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500"
                />
              </div>

              <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Duration</span>
                  <span className="font-bold text-slate-900">{modalDuration} Days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Target Rate</span>
                  <span className="font-bold text-emerald-600">
                    {modalEffectiveRate.toFixed(2)}%
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200">
                  <span className="text-slate-600 font-semibold">Estimated Return</span>
                  <span className="font-bold text-blue-600 tabular-nums">
                    +{modalEstProfit.toFixed(6)} {modalCoin.symbol}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setModalCoin(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border-0 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={handleStartTrade}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-bold border-0 shadow-sm cursor-pointer"
                >
                  {isSubmitting ? "Activating..." : "Confirm & Start Bot"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </UserPortalShell>
  );
}
