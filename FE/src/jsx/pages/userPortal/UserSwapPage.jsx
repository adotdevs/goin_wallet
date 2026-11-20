import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useAuthUser } from "react-auth-kit";
import {
  ArrowLeft,
  ArrowUpDown,
  ChevronDown,
  Search,
  X,
  AlertCircle,
  Sparkles,
  Check,
} from "lucide-react";
import {
  createUserTransactionDepositSwapApi,
  createUserTransactionWithdrawSwapApi,
  getCoinsUserApi,
  getLinksApi,
  getsignUserApi,
} from "../../../Api/Service";
import {
  buildPortfolioCoins,
  getAdditionalCoinPrice,
  isCoinActive,
} from "../report/assets/coinConfig";
import { buildSwapNote } from "../report/assets/swapTransactionUtils";
import {
  buildFiatSwapCoins,
  convertSwapAmount,
  findSwapCoin,
  formatFiatEstimate,
  formatSwapAmount,
  getSwapDecimals,
  getSwapRate,
  getTransactionsForCoin,
  pickAlternateCoin,
} from "../report/swap/swapUtils";
import { extractLivePrices, useUsdToEurRate } from "../../../utils/euroCoinUtils";
import UserPortalShell from "./UserPortalShell";

const CoinBadge = ({ coin }) => {
  if (coin?.logo) {
    return (
      <img
        src={coin.logo}
        alt={coin.symbol}
        className="w-9 h-9 rounded-full object-contain bg-white border border-slate-200 p-0.5 shrink-0"
      />
    );
  }
  return (
    <div className="w-9 h-9 rounded-full bg-blue-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
      {String(coin?.symbol || "?").slice(0, 3)}
    </div>
  );
};

export default function UserSwapPage() {
  useUsdToEurRate();
  const authUser = useAuthUser();
  const navigate = useNavigate();
  const location = useLocation();
  const userId = authUser()?.user?._id;

  const [linksReady, setLinksReady] = useState(false);
  const [swapEnabled, setSwapEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [walletSnapshot, setWalletSnapshot] = useState(null);

  const [fromCoin, setFromCoin] = useState(null);
  const [toCoin, setToCoin] = useState(null);
  const [inputValue, setInputValue] = useState("");
  const [outputValue, setOutputValue] = useState("");
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pickerMode, setPickerMode] = useState(null);
  const [pickerSearch, setPickerSearch] = useState("");
  const [userCurrency, setUserCurrency] = useState("USD");

  useEffect(() => {
    const role = authUser()?.user?.role;
    if (["admin", "superadmin", "subadmin"].includes(role)) {
      navigate("/admin/dashboard", { replace: true });
    }
  }, [authUser, navigate]);

  useEffect(() => {
    let cancelled = false;
    const fetchLinks = async () => {
      try {
        const data = await getLinksApi();
        const enabled = Boolean(data?.links?.[7]?.enabled);
        if (!cancelled) {
          setSwapEnabled(enabled);
          if (!enabled) {
            toast.info("Swap is currently unavailable");
            navigate("/assets");
          }
        }
      } catch (error) {
        console.error("Error fetching links:", error);
        if (!cancelled) setSwapEnabled(true);
      } finally {
        if (!cancelled) setLinksReady(true);
      }
    };
    fetchLinks();
    return () => {
      cancelled = true;
    };
  }, [navigate]);

  useEffect(() => {
    if (!userId) {
      setIsLoading(false);
      return undefined;
    }
    let cancelled = false;
    const loadWallet = async () => {
      setIsLoading(true);
      try {
        const formData = new FormData();
        formData.append("id", userId);
        const [userCoins, userProfile] = await Promise.all([
          getCoinsUserApi(userId),
          getsignUserApi(formData),
        ]);
        if (cancelled) return;

        if (userProfile?.success && userProfile.signleUser?.currency) {
          setUserCurrency(userProfile.signleUser.currency);
        }
        if (!userCoins?.success) {
          toast.error(userCoins?.msg || "Unable to load wallet");
          return;
        }

        const transactions = userCoins.getCoin?.transactions || [];
        const accountCurrency = userProfile?.signleUser?.currency || "USD";
        const livePrices = extractLivePrices(userCoins, accountCurrency);

        setWalletSnapshot({
          userData: userCoins.getCoin,
          additionalCoins: userCoins.getCoin?.additionalCoins || [],
          transactions,
          liveBtc: livePrices.btc,
          liveEth: livePrices.eth,
          liveUsdt: livePrices.usdt,
          livePrices,
          btcBalance: getTransactionsForCoin("bitcoin", transactions),
          ethBalance: getTransactionsForCoin("ethereum", transactions),
          usdtBalance: getTransactionsForCoin("tether", transactions),
        });
      } catch (error) {
        if (!cancelled) toast.error(error?.message || "Unable to load wallet");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    loadWallet();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const swapCoins = useMemo(() => {
    if (!walletSnapshot) return [];
    const cryptoCoins = buildPortfolioCoins({
      UserData: walletSnapshot.userData,
      newUserCoins: walletSnapshot.additionalCoins,
      userCoins: { getCoin: walletSnapshot.userData },
      btcBalance: walletSnapshot.btcBalance,
      ethBalance: walletSnapshot.ethBalance,
      usdtBalance: walletSnapshot.usdtBalance,
      liveBtc: walletSnapshot.liveBtc,
      liveEth: walletSnapshot.liveEth,
      liveUsdt: walletSnapshot.liveUsdt,
      liveBnb: walletSnapshot.livePrices.bnb,
      liveXrp: walletSnapshot.livePrices.xrp,
      liveDoge: walletSnapshot.livePrices.doge,
      liveSol: walletSnapshot.livePrices.sol,
      liveTon: walletSnapshot.livePrices.ton,
      liveLink: walletSnapshot.livePrices.link,
      liveDot: walletSnapshot.livePrices.dot,
      liveNear: walletSnapshot.livePrices.near,
      liveUsdc: walletSnapshot.livePrices.usdc,
      liveTrx: walletSnapshot.livePrices.trx,
      getTransactionsForCoin,
      getCoinPrice: (symbol) => getAdditionalCoinPrice(symbol, walletSnapshot.livePrices),
    }).filter((coin) => isCoinActive(coin));

    const fiatCoins = buildFiatSwapCoins(
      walletSnapshot.additionalCoins,
      walletSnapshot.transactions,
      getTransactionsForCoin,
      userCurrency
    );
    return [...cryptoCoins, ...fiatCoins];
  }, [walletSnapshot, userCurrency]);

  const swapAvailable = swapCoins.length >= 2;

  useEffect(() => {
    if (!swapCoins.length) {
      setFromCoin(null);
      setToCoin(null);
      return;
    }
    if (swapCoins.length === 1) {
      setFromCoin(swapCoins[0]);
      setToCoin(null);
      setInputValue("");
      setOutputValue("");
      return;
    }
    if (fromCoin) return;

    const routeCoin = findSwapCoin(swapCoins, {
      symbol: location.state?.fromCoin,
      trxName: location.state?.fromTrxName,
      slug: location.state?.fromSlug,
    });
    const defaultFrom =
      routeCoin || findSwapCoin(swapCoins, { symbol: "USDT" }) || swapCoins[0];
    const defaultTo =
      pickAlternateCoin(swapCoins, defaultFrom.trxName) ||
      findSwapCoin(swapCoins, { symbol: "BTC" }) ||
      swapCoins[1] ||
      swapCoins[0];
    setFromCoin(defaultFrom);
    setToCoin(defaultTo);
  }, [swapCoins, fromCoin, location.state]);

  useEffect(() => {
    if (!swapAvailable || !fromCoin) return;
    if (!toCoin || toCoin.trxName === fromCoin.trxName) {
      setToCoin(pickAlternateCoin(swapCoins, fromCoin.trxName));
    }
  }, [swapAvailable, fromCoin, swapCoins, toCoin]);

  const recalculateOutput = useCallback((amount, nextFrom, nextTo) => {
    if (!nextFrom || !nextTo) {
      setOutputValue("");
      return;
    }
    const converted = convertSwapAmount(amount, nextFrom, nextTo);
    setOutputValue(converted ? formatSwapAmount(converted, getSwapDecimals(nextTo)) : "");
  }, []);

  useEffect(() => {
    if (!inputValue || !fromCoin || !toCoin) {
      setOutputValue("");
      return undefined;
    }
    setIsCalculating(true);
    const timer = window.setTimeout(() => {
      recalculateOutput(inputValue, fromCoin, toCoin);
      setIsCalculating(false);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [inputValue, fromCoin, toCoin, recalculateOutput]);

  const handleInputChange = (event) => {
    const rawValue = event.target.value;
    if (rawValue !== "" && !/^\d*\.?\d*$/.test(rawValue)) return;
    const maxBalance = Number(fromCoin?.balance || 0);
    let nextValue = rawValue;
    if (rawValue && parseFloat(rawValue) > maxBalance) {
      nextValue = formatSwapAmount(maxBalance, getSwapDecimals(fromCoin));
    }
    setInputValue(nextValue);
  };

  const handleMaxClick = () => {
    if (!fromCoin) return;
    setInputValue(formatSwapAmount(fromCoin.balance || 0, getSwapDecimals(fromCoin)));
  };

  const handlePickCoin = (mode, coin) => {
    if (mode === "from") {
      setFromCoin(coin);
      if (swapAvailable && (!toCoin || coin.trxName === toCoin?.trxName)) {
        setToCoin(pickAlternateCoin(swapCoins, coin.trxName));
      } else if (!swapAvailable) {
        setToCoin(null);
      }
    } else if (swapAvailable) {
      setToCoin(coin);
      if (coin.trxName === fromCoin?.trxName) {
        setFromCoin(pickAlternateCoin(swapCoins, coin.trxName));
      }
    }
    setInputValue("");
    setOutputValue("");
    setPickerMode(null);
    setPickerSearch("");
  };

  const handleFlip = () => {
    if (!swapAvailable || !fromCoin || !toCoin) return;
    const nextFrom = toCoin;
    const nextTo = fromCoin;
    setFromCoin(nextFrom);
    setToCoin(nextTo);
    if (inputValue) recalculateOutput(inputValue, nextFrom, nextTo);
  };

  const expectedRate = useMemo(() => {
    if (!fromCoin || !toCoin) return "0";
    return formatSwapAmount(
      getSwapRate(fromCoin, toCoin),
      Math.max(getSwapDecimals(fromCoin), getSwapDecimals(toCoin))
    );
  }, [fromCoin, toCoin]);

  const canSwap =
    swapAvailable &&
    fromCoin &&
    toCoin &&
    fromCoin.trxName !== toCoin.trxName &&
    parseFloat(inputValue) > 0 &&
    outputValue &&
    !isCalculating &&
    !isSubmitting;

  const postUserTransaction = async () => {
    if (!canSwap) return;
    setIsSubmitting(true);
    try {
      const swapId = `swap-${Date.now()}`;
      const swapNote = buildSwapNote({
        swapId,
        fromCoin,
        toCoin,
        fromAmount: parseFloat(inputValue),
        toAmount: parseFloat(outputValue),
      });

      const bodyWithdraw = {
        trxName: fromCoin.trxName,
        amount: -parseFloat(inputValue),
        txId: swapId,
        fromAddress: "swap",
        status: "completed",
        type: "withdraw",
        note: swapNote,
        isHidden: true,
      };
      const bodyDeposit = {
        trxName: toCoin.trxName,
        amount: parseFloat(outputValue),
        txId: swapId,
        fromAddress: "swap",
        status: "completed",
        type: "deposit",
        note: swapNote,
        isHidden: true,
      };

      const [withdrawResult, depositResult] = await Promise.all([
        createUserTransactionWithdrawSwapApi(userId, bodyWithdraw),
        createUserTransactionDepositSwapApi(userId, bodyDeposit),
      ]);

      if (depositResult.success) {
        toast.success(depositResult.msg || "Swap completed successfully");
        navigate("/assets");
      } else {
        toast.error(withdrawResult?.msg || depositResult?.msg || "Swap failed");
      }
    } catch (error) {
      toast.error(error?.message || "Swap failed");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredPickerCoins = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase();
    return swapCoins.filter((c) => {
      if (!q) return true;
      return (
        String(c.name || "").toLowerCase().includes(q) ||
        String(c.symbol || "").toLowerCase().includes(q)
      );
    });
  }, [swapCoins, pickerSearch]);

  const fromFiatEstimate = formatFiatEstimate(
    parseFloat(inputValue) || 0,
    fromCoin,
    userCurrency
  );
  const toFiatEstimate = formatFiatEstimate(
    parseFloat(outputValue) || 0,
    toCoin,
    userCurrency
  );

  return (
    <UserPortalShell title="Swap">
      <div className="space-y-6 w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <button
              type="button"
              onClick={() => navigate("/assets")}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 mb-2 bg-transparent border-0 p-0 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Assets
            </button>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight m-0">
              Instant Swap
            </h1>
            <p className="text-sm text-slate-500 mt-1 mb-0">
              Exchange any active crypto or fiat asset in your wallet instantly at live rates.
            </p>
          </div>
        </div>

        {!linksReady || isLoading ? (
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card py-24 flex flex-col items-center justify-center text-slate-500">
            <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin mb-3" />
            <p className="text-sm font-medium m-0">Loading live swap rates...</p>
          </div>
        ) : !swapEnabled ? null : !fromCoin ? (
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card py-20 px-6 text-center">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mx-auto mb-4">
              <ArrowUpDown className="w-6 h-6" />
            </div>
            <h2 className="text-lg font-bold text-slate-900 m-0">No active wallets yet</h2>
            <p className="text-sm text-slate-500 mt-1 mb-5">
              Activate at least two assets before you can swap between them.
            </p>
            <button
              type="button"
              onClick={() => navigate("/assets")}
              className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold border-0 shadow-sm cursor-pointer"
            >
              Go to Assets
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Swap Form Card */}
            <div className="lg:col-span-7 xl:col-span-7 bg-white rounded-2xl border border-slate-200/90 shadow-card p-6 sm:p-7 space-y-5">
              {!swapAvailable && (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-sm">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold m-0">One more wallet needed</p>
                    <p className="text-xs text-amber-800 mt-0.5 mb-0">
                      You have {swapCoins.length} active asset. Activate another wallet in{" "}
                      <button
                        type="button"
                        onClick={() => navigate("/assets")}
                        className="underline font-semibold text-amber-900 bg-transparent border-0 p-0 cursor-pointer"
                      >
                        Assets
                      </button>{" "}
                      to start swapping.
                    </p>
                  </div>
                </div>
              )}

              {/* FROM Box */}
              <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-5 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold uppercase tracking-wider text-slate-400">
                    From
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500">
                      Balance:{" "}
                      <strong className="text-slate-800 tabular-nums">
                        {formatSwapAmount(fromCoin.balance || 0, getSwapDecimals(fromCoin))}{" "}
                        {fromCoin.symbol}
                      </strong>
                    </span>
                    <button
                      type="button"
                      onClick={handleMaxClick}
                      className="px-2 py-0.5 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] border border-blue-200/80 cursor-pointer transition-colors"
                    >
                      MAX
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-4">
                  <button
                    type="button"
                    onClick={() => {
                      setPickerSearch("");
                      setPickerMode("from");
                    }}
                    className="flex items-center gap-3 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:border-blue-400 shadow-xs transition-colors cursor-pointer shrink-0"
                  >
                    <CoinBadge coin={fromCoin} />
                    <div className="text-left">
                      <p className="text-sm font-bold text-slate-900 m-0 leading-tight">
                        {fromCoin.name}
                      </p>
                      <p className="text-xs font-medium text-slate-400 m-0">
                        {fromCoin.symbol}
                      </p>
                    </div>
                    <ChevronDown className="w-4 h-4 text-slate-400 ml-1" />
                  </button>

                  <div className="flex-1 min-w-0 text-right">
                    <input
                      type="text"
                      inputMode="decimal"
                      value={inputValue}
                      onChange={handleInputChange}
                      placeholder="0.00"
                      className="w-full text-right text-2xl font-bold text-slate-900 bg-transparent border-0 focus:outline-none placeholder:text-slate-300 tabular-nums"
                    />
                    <p className="text-xs font-semibold text-blue-600 m-0 tabular-nums">
                      {fromFiatEstimate}
                    </p>
                  </div>
                </div>
              </div>

              {/* Flip Button */}
              <div className="relative flex items-center justify-center -my-2 z-10">
                <div className="w-full h-px bg-slate-200 absolute" />
                <button
                  type="button"
                  onClick={handleFlip}
                  disabled={!swapAvailable}
                  aria-label="Swap direction"
                  className="relative w-10 h-10 rounded-xl bg-white border border-slate-200 hover:border-blue-500 hover:text-blue-600 text-slate-600 shadow-sm flex items-center justify-center transition-all cursor-pointer disabled:opacity-40"
                >
                  <ArrowUpDown className="w-4 h-4" />
                </button>
              </div>

              {/* TO Box */}
              <div className="rounded-2xl bg-slate-50 border border-slate-200/80 p-5 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold uppercase tracking-wider text-slate-400">
                    To (Estimated)
                  </span>
                  {toCoin && (
                    <span className="text-slate-500">
                      Balance:{" "}
                      <strong className="text-slate-800 tabular-nums">
                        {formatSwapAmount(toCoin.balance || 0, getSwapDecimals(toCoin))}{" "}
                        {toCoin.symbol}
                      </strong>
                    </span>
                  )}
                </div>

                <div className="flex items-center justify-between gap-4">
                  <button
                    type="button"
                    disabled={!swapAvailable}
                    onClick={() => {
                      setPickerSearch("");
                      setPickerMode("to");
                    }}
                    className="flex items-center gap-3 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:border-blue-400 shadow-xs transition-colors cursor-pointer shrink-0 disabled:opacity-50"
                  >
                    {toCoin ? (
                      <>
                        <CoinBadge coin={toCoin} />
                        <div className="text-left">
                          <p className="text-sm font-bold text-slate-900 m-0 leading-tight">
                            {toCoin.name}
                          </p>
                          <p className="text-xs font-medium text-slate-400 m-0">
                            {toCoin.symbol}
                          </p>
                        </div>
                      </>
                    ) : (
                      <span className="text-sm font-semibold text-slate-500">Select Asset</span>
                    )}
                    <ChevronDown className="w-4 h-4 text-slate-400 ml-1" />
                  </button>

                  <div className="flex-1 min-w-0 text-right">
                    <p className="text-2xl font-bold text-slate-900 m-0 tabular-nums truncate">
                      {isCalculating ? "..." : outputValue || "0.00"}
                    </p>
                    <p className="text-xs font-semibold text-blue-600 m-0 tabular-nums">
                      {toFiatEstimate}
                    </p>
                  </div>
                </div>
              </div>

              {/* Rate Summary Bar */}
              {fromCoin && toCoin && (
                <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 rounded-xl bg-blue-50/60 border border-blue-100 text-xs">
                  <span className="text-slate-600 font-medium">
                    Rate:{" "}
                    <strong className="text-slate-900 tabular-nums">
                      1 {fromCoin.symbol} ≈ {expectedRate} {toCoin.symbol}
                    </strong>
                  </span>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[11px]">
                    <Sparkles className="w-3 h-3" /> NO EXTRA FEES
                  </span>
                </div>
              )}

              {/* Primary CTA Button */}
              <button
                type="button"
                disabled={!canSwap}
                onClick={postUserTransaction}
                className="w-full py-3.5 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-sm border-0 shadow-sm transition-all cursor-pointer"
              >
                {isSubmitting
                  ? "Processing Swap..."
                  : fromCoin && toCoin
                    ? `Swap ${fromCoin.symbol} for ${toCoin.symbol}`
                    : "Enter an amount to swap"}
              </button>
            </div>

            {/* Right Info Panel */}
            <div className="lg:col-span-5 xl:col-span-5 space-y-4">
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card p-6 space-y-4">
                <h3 className="text-base font-bold text-slate-900 m-0">
                  Swap Summary
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex items-center justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">Execution Type</span>
                    <span className="font-semibold text-slate-900">Instant Market</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">Platform Fee</span>
                    <span className="font-semibold text-emerald-600">0.00% (Zero Fee)</span>
                  </div>
                  <div className="flex items-center justify-between py-2 border-b border-slate-100">
                    <span className="text-slate-500">Settlement</span>
                    <span className="font-semibold text-slate-900">Immediate to Wallet</span>
                  </div>
                  <div className="flex items-center justify-between py-2">
                    <span className="text-slate-500">Available Assets</span>
                    <span className="font-semibold text-slate-900">{swapCoins.length} Active</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Pure Tailwind Coin Picker Modal */}
      {pickerMode && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setPickerMode(null)}
        >
          <div
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 m-0">
                Select {pickerMode === "from" ? "Source" : "Destination"} Asset
              </h3>
              <button
                type="button"
                onClick={() => setPickerMode(null)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center border-0 bg-transparent cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 border-b border-slate-100">
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={pickerSearch}
                  onChange={(e) => setPickerSearch(e.target.value)}
                  placeholder="Search asset..."
                  autoFocus
                  className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500"
                />
              </div>
            </div>
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
              {filteredPickerCoins.map((coin) => {
                const isSelected =
                  (pickerMode === "from" ? fromCoin?.trxName : toCoin?.trxName) ===
                  coin.trxName;
                return (
                  <button
                    key={coin.trxName}
                    type="button"
                    onClick={() => handlePickCoin(pickerMode, coin)}
                    className={`w-full px-5 py-3.5 flex items-center justify-between text-left border-0 transition-colors cursor-pointer ${
                      isSelected ? "bg-blue-50/70" : "bg-white hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <CoinBadge coin={coin} />
                      <div>
                        <p className="text-sm font-semibold text-slate-900 m-0">
                          {coin.name}
                        </p>
                        <p className="text-xs text-slate-400 m-0">{coin.symbol}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2.5 text-right">
                      <div>
                        <p className="text-sm font-bold text-slate-900 m-0 tabular-nums">
                          {formatSwapAmount(coin.balance || 0, getSwapDecimals(coin))}
                        </p>
                        <p className="text-[11px] text-slate-400 m-0">{coin.symbol}</p>
                      </div>
                      {isSelected && <Check className="w-4 h-4 text-blue-600" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </UserPortalShell>
  );
}
