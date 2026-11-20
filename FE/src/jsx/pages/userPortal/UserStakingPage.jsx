import React, { useEffect, useMemo, useState } from "react";
import { useAuthUser } from "react-auth-kit";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Layers, Clock, CheckCircle2, Lock, X, TrendingUp } from "lucide-react";
import {
  createUserTransactionApi,
  getCoinsUserApi,
  getLinksApi,
  getStakingSettingsApi,
  getUserCoinApi,
} from "../../../Api/Service";
import { getTransactionsForCoin } from "../report/assets/coinConfig";
import NearProtocol from "../../../assets/images/new/6.png";
import TonCoin from "../../../assets/images/new/3.png";
import UserPortalShell from "./UserPortalShell";

const COIN_DATA = {
  bitcoin: { name: "Bitcoin", trxName: "bitcoin", symbol: "BTC", icon: "https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1a63530be6e374711a8554f31b17e4cb92c25fa5/128/color/btc.png" },
  ethereum: { name: "Ethereum", trxName: "ethereum", symbol: "ETH", icon: "https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1a63530be6e374711a8554f31b17e4cb92c25fa5/128/color/eth.png" },
  tether: { name: "Tether", trxName: "tether", symbol: "USDT", icon: "https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1a63530be6e374711a8554f31b17e4cb92c25fa5/128/color/usdt.png" },
  bnb: { name: "BNB", trxName: "BNB", symbol: "BNB", icon: "https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1a63530be6e374711a8554f31b17e4cb92c25fa5/128/color/bnb.png" },
  xrp: { name: "XRP", trxName: "XRP", symbol: "XRP", icon: "https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1a63530be6e374711a8554f31b17e4cb92c25fa5/128/color/xrp.png" },
  doge: { name: "Dogecoin", trxName: "Dogecoin", symbol: "DOGE", icon: "https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1a63530be6e374711a8554f31b17e4cb92c25fa5/128/color/doge.png" },
  ton: { name: "Toncoin", trxName: "Toncoin", symbol: "TON", icon: TonCoin },
  link: { name: "Chainlink", trxName: "Chainlink", symbol: "LINK", icon: "https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1a63530be6e374711a8554f31b17e4cb92c25fa5/128/color/link.png" },
  dot: { name: "Polkadot", trxName: "Polkadot", symbol: "DOT", icon: "https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1a63530be6e374711a8554f31b17e4cb92c25fa5/128/color/dot.png" },
  near: { name: "Near Protocol", trxName: "Near Protocol", symbol: "NEAR", icon: NearProtocol },
  usdc: { name: "USD Coin", trxName: "USD Coin", symbol: "USDC", icon: "https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1a63530be6e374711a8554f31b17e4cb92c25fa5/128/color/usdc.png" },
  trx: { name: "Tron", trxName: "Tron", symbol: "TRX", icon: "https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1a63530be6e374711a8554f31b17e4cb92c25fa5/128/color/trx.png" },
  sol: { name: "Solana", trxName: "Solana", symbol: "SOL", icon: "https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1a63530be6e374711a8554f31b17e4cb92c25fa5/128/color/sol.png" },
  eur: { name: "Euro", trxName: "Euro", symbol: "EUR", icon: "https://cdn.jsdelivr.net/gh/atomiclabs/cryptocurrency-icons@1a63530be6e374711a8554f31b17e4cb92c25fa5/128/color/eur.png" },
};

const MIN_VALUES = {
  bitcoin: 0.0117769844,
  ethereum: 0.1969969781,
  tether: 500.3001801081,
  bnb: 0.5,
  xrp: 100,
  doge: 1000,
  ton: 10,
  link: 20,
  dot: 15,
  near: 25,
  usdc: 500,
  trx: 1000,
  sol: 1,
  eur: 500,
};

const DEFAULT_RATES = { thirtyDays: 11, sixtyDays: 45, ninetyDays: 123 };

export default function UserStakingPage() {
  const authUser = useAuthUser();
  const navigate = useNavigate();
  const userId = authUser()?.user?._id;

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [balances, setBalances] = useState({});
  const [stakingSettings, setStakingSettings] = useState({
    disabledCoins: [],
    customRates: {},
  });
  const [activeDurations, setActiveDurations] = useState(
    Object.keys(COIN_DATA).reduce((acc, k) => ({ ...acc, [k]: 30 }), {})
  );
  const [modalCoin, setModalCoin] = useState(null);
  const [amount, setAmount] = useState("");

  const loadData = async () => {
    if (!userId) return;
    try {
      const [coinsRes, settingsRes, txRes] = await Promise.all([
        getCoinsUserApi(userId).catch(() => null),
        getStakingSettingsApi(userId).catch(() => null),
        getUserCoinApi(userId).catch(() => null),
      ]);

      if (coinsRes?.success && coinsRes?.getCoin) {
        const txs = coinsRes.getCoin.transactions || [];
        const nextBalances = {};
        const txMap = { trx: "tron", usdc: "usd" };
        Object.keys(COIN_DATA).forEach((key) => {
          nextBalances[key] = getTransactionsForCoin(txMap[key] || key, txs);
        });
        setBalances(nextBalances);
      }

      if (settingsRes?.success && settingsRes?.stakingSettings) {
        setStakingSettings(settingsRes.stakingSettings);
      }

      if (txRes?.success && Array.isArray(txRes.getCoin?.transactions)) {
        setTransactions([...txRes.getCoin.transactions].reverse());
      }
    } catch (error) {
      console.error("Staking load error:", error);
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
        if (!links?.links?.[6]?.enabled) {
          navigate(-1);
          return;
        }
      } catch {
        // continue
      }
      await loadData();
    };
    init();
  }, [userId]);

  const getRateForCoin = (coinKey, duration) => {
    const custom = stakingSettings.customRates?.[coinKey];
    if (duration === 30) return custom?.thirtyDays || DEFAULT_RATES.thirtyDays;
    if (duration === 60) return custom?.sixtyDays || DEFAULT_RATES.sixtyDays;
    if (duration === 90) return custom?.ninetyDays || DEFAULT_RATES.ninetyDays;
    return 0;
  };

  const activeStakes = useMemo(
    () =>
      transactions.filter(
        (tx) => tx.txId === "staking amount" || tx.stakingData?.isStaking
      ),
    [transactions]
  );

  const openModal = (coinKey) => {
    if (stakingSettings.disabledCoins?.includes(coinKey)) {
      toast.error("Staking for this coin is currently disabled");
      return;
    }
    setModalCoin(coinKey);
    setAmount("");
  };

  const handleStakeSubmit = async () => {
    if (!modalCoin) return;
    const parsedAmount = parseFloat(amount);
    if (!amount.trim() || isNaN(parsedAmount) || parsedAmount <= 0) {
      toast.error("Please enter a valid staking amount");
      return;
    }
    if (stakingSettings.disabledCoins?.includes(modalCoin)) {
      toast.error("Staking for this coin is currently disabled");
      return;
    }

    try {
      setIsSubmitting(true);
      const duration = activeDurations[modalCoin] || 30;
      const interestRate = getRateForCoin(modalCoin, duration);
      const expectedReward = (parsedAmount * interestRate) / 100;
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + duration);

      const body = {
        trxName: COIN_DATA[modalCoin]?.trxName || modalCoin,
        amount: -parsedAmount,
        txId: "staking amount",
        e: "crypto",
        status: "completed",
        Staking: true,
        stakingData: {
          isStaking: true,
          duration,
          interestRate,
          expectedReward,
          stakingStart: new Date(),
          stakingEnd: endDate,
          coin: modalCoin,
          status: "active",
        },
      };

      const res = await createUserTransactionApi(userId, body);
      if (res?.success) {
        toast.success("Staking completed successfully");
        setModalCoin(null);
        setAmount("");
        await loadData();
      } else {
        toast.error(res?.msg || "Unable to complete staking");
      }
    } catch (error) {
      toast.error(error?.message || "Unable to complete staking");
    } finally {
      setIsSubmitting(false);
    }
  };

  const modalCoinObj = modalCoin ? COIN_DATA[modalCoin] : null;
  const modalDuration = modalCoin ? activeDurations[modalCoin] || 30 : 30;
  const modalRate = modalCoin ? getRateForCoin(modalCoin, modalDuration) : 0;
  const modalBalance = modalCoin ? Number(balances[modalCoin] || 0) : 0;
  const modalEstReward = ((parseFloat(amount) || 0) * modalRate) / 100;

  return (
    <UserPortalShell title="Staking">
      <div className="space-y-6 w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight m-0">
              Staking &amp; Yield
            </h1>
            <p className="text-sm text-slate-500 mt-1 mb-0">
              Earn fixed institutional returns by staking your digital assets for 30, 60, or 90 days.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 shadow-sm text-xs font-semibold text-slate-700">
            <Layers className="w-4 h-4 text-blue-600" />
            <span>{activeStakes.length} Active Positions</span>
          </div>
        </div>

        {/* Active Stakes Table */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-slate-900 m-0">
                Active Staking Positions
              </h2>
            </div>
          </div>

          {isLoading ? (
            <div className="py-16 flex flex-col items-center justify-center text-slate-500">
              <div className="w-7 h-7 rounded-full border-2 border-blue-600 border-t-transparent animate-spin mb-2.5" />
              <p className="text-sm m-0">Loading staking positions...</p>
            </div>
          ) : activeStakes.length === 0 ? (
            <div className="py-12 text-center text-sm text-slate-500">
              You have no active staking positions yet. Select a plan below to get started.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100">
                    <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Asset
                    </th>
                    <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Amount Staked
                    </th>
                    <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Duration
                    </th>
                    <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Interest Rate
                    </th>
                    <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Expected Reward
                    </th>
                    <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Status
                    </th>
                    <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">
                      End Date
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {activeStakes.map((tx, idx) => {
                    const sd = tx.stakingData || {};
                    const coinKey = sd.coin || String(tx.trxName || "").toLowerCase();
                    const meta = COIN_DATA[coinKey];
                    const sym = meta?.symbol || String(tx.trxName || "").toUpperCase();
                    const stakedAmt = Math.abs(Number(tx.amount || 0));
                    const rewardAmt = Number(sd.expectedReward || 0);
                    const status = sd.status || "active";

                    return (
                      <tr key={tx._id || idx} className="hover:bg-slate-50/70 transition-colors">
                        <td className="px-6 py-3.5">
                          <div className="flex items-center gap-3">
                            {meta?.icon ? (
                              <img
                                src={meta.icon}
                                alt={sym}
                                className="w-8 h-8 rounded-full object-contain bg-slate-50 border border-slate-200 p-0.5 shrink-0"
                              />
                            ) : (
                              <div className="w-8 h-8 rounded-full bg-blue-50 text-blue-700 font-bold text-xs flex items-center justify-center">
                                {sym.slice(0, 3)}
                              </div>
                            )}
                            <span className="text-sm font-semibold text-slate-900 capitalize">
                              {tx.trxName} ({sym})
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-3.5 text-sm font-semibold text-slate-900 tabular-nums whitespace-nowrap">
                          {stakedAmt.toFixed(4)} {sym}
                        </td>
                        <td className="px-6 py-3.5 text-sm text-slate-600 whitespace-nowrap">
                          {sd.duration ? `${sd.duration} days` : "—"}
                        </td>
                        <td className="px-6 py-3.5">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            {sd.interestRate || 0}%
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-sm font-semibold text-emerald-700 tabular-nums whitespace-nowrap">
                          +{rewardAmt.toFixed(4)} {sym}
                        </td>
                        <td className="px-6 py-3.5">
                          <span
                            className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${
                              status === "completed"
                                ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                                : "bg-amber-50 text-amber-700 border-amber-200"
                            }`}
                          >
                            {status === "completed" ? (
                              <CheckCircle2 className="w-3 h-3" />
                            ) : (
                              <Clock className="w-3 h-3" />
                            )}
                            {status}
                          </span>
                        </td>
                        <td className="px-6 py-3.5 text-right text-sm text-slate-600 whitespace-nowrap">
                          {sd.stakingEnd
                            ? new Date(sd.stakingEnd).toLocaleDateString()
                            : "—"}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Staking Plans Grid */}
        <div>
          <h2 className="text-lg font-bold text-slate-900 mb-4">
            Available Staking Plans
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {Object.keys(COIN_DATA).map((coinKey) => {
              const coin = COIN_DATA[coinKey];
              const isDisabled = stakingSettings.disabledCoins?.includes(coinKey);
              const selectedDur = activeDurations[coinKey] || 30;
              const bal = Number(balances[coinKey] || 0);

              return (
                <div
                  key={coinKey}
                  className={`bg-white rounded-2xl border border-slate-200/90 shadow-card p-5 flex flex-col justify-between transition-all ${
                    isDisabled ? "opacity-60" : "hover:border-blue-300 hover:shadow-md"
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <img
                          src={coin.icon}
                          alt={coin.name}
                          className="w-10 h-10 rounded-full object-contain bg-slate-50 border border-slate-200 p-1 shrink-0"
                        />
                        <div className="min-w-0">
                          <h3 className="text-sm font-bold text-slate-900 m-0 truncate">
                            {coin.name}
                          </h3>
                          <p className="text-xs text-slate-400 m-0">{coin.symbol}</p>
                        </div>
                      </div>
                      {isDisabled && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-slate-100 text-slate-500">
                          <Lock className="w-3 h-3" /> Unavailable
                        </span>
                      )}
                    </div>

                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                      Select Lock Duration
                    </p>
                    <div className="grid grid-cols-3 gap-2 mb-4">
                      {[30, 60, 90].map((dur) => {
                        const rate = getRateForCoin(coinKey, dur);
                        const isSelected = selectedDur === dur;
                        return (
                          <button
                            key={dur}
                            type="button"
                            disabled={isDisabled}
                            onClick={() =>
                              setActiveDurations((prev) => ({
                                ...prev,
                                [coinKey]: dur,
                              }))
                            }
                            className={`py-2 px-1.5 rounded-xl text-center border transition-all cursor-pointer ${
                              isSelected
                                ? "bg-blue-600 border-blue-600 text-white shadow-xs"
                                : "bg-slate-50 border-slate-200 text-slate-700 hover:border-blue-300"
                            }`}
                          >
                            <p className="text-[11px] font-semibold m-0">{dur}d</p>
                            <p
                              className={`text-xs font-extrabold m-0 ${
                                isSelected ? "text-blue-100" : "text-emerald-600"
                              }`}
                            >
                              {rate}%
                            </p>
                          </button>
                        );
                      })}
                    </div>

                    <div className="space-y-1.5 text-xs pt-3 border-t border-slate-100 mb-4">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Min Value</span>
                        <span className="font-semibold text-slate-800 tabular-nums">
                          {MIN_VALUES[coinKey]} {coin.symbol}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Available</span>
                        <span className="font-semibold text-slate-800 tabular-nums">
                          {bal.toLocaleString(undefined, { maximumFractionDigits: 4 })}{" "}
                          {coin.symbol}
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    disabled={isDisabled}
                    onClick={() => openModal(coinKey)}
                    className="w-full py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-500 text-white text-xs font-bold border-0 shadow-xs transition-colors cursor-pointer"
                  >
                    {isDisabled ? "Unavailable" : `Stake ${coin.symbol}`}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Stake Modal */}
      {modalCoin && modalCoinObj && (
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
                  src={modalCoinObj.icon}
                  alt={modalCoinObj.name}
                  className="w-8 h-8 rounded-full object-contain bg-slate-50 border border-slate-200 p-0.5"
                />
                <h3 className="text-base font-bold text-slate-900 m-0">
                  Stake {modalCoinObj.name}
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
                    Amount ({modalCoinObj.symbol})
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
                    const val = e.target.value;
                    if (val === "") {
                      setAmount("");
                      return;
                    }
                    const n = parseFloat(val);
                    if (!isNaN(n)) {
                      setAmount(n > modalBalance ? String(modalBalance) : val);
                    }
                  }}
                  placeholder={`Enter ${modalCoinObj.symbol} amount`}
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
                />
              </div>

              <div className="rounded-xl bg-slate-50 border border-slate-200/80 p-4 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-500">Duration</span>
                  <span className="font-bold text-slate-900">{modalDuration} Days</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Interest Rate</span>
                  <span className="font-bold text-emerald-600">{modalRate}%</span>
                </div>
                <div className="flex justify-between pt-2 border-t border-slate-200">
                  <span className="text-slate-600 font-semibold">Estimated Reward</span>
                  <span className="font-bold text-blue-600 tabular-nums">
                    +{modalEstReward.toFixed(6)} {modalCoinObj.symbol}
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
                  onClick={handleStakeSubmit}
                  className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-bold border-0 shadow-sm cursor-pointer"
                >
                  {isSubmitting ? "Confirming..." : "Confirm Stake"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </UserPortalShell>
  );
}
