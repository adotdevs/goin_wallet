import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthUser } from "react-auth-kit";
import { toast } from "react-toastify";
import {
  Search,
  ChevronRight,
  CheckCircle2,
  Clock,
  ArrowUpRight,
  Wallet,
} from "lucide-react";
import {
  getCoinsUserApi,
  getsignUserApi,
  patchCoinsApi,
  requestCoinActivationApi,
  requestWalletIntegrationApi,
} from "../../../../Api/Service";
import { normalizeWalletUrl } from "../../../../utils/walletAccess";
import {
  getFiatBalanceFromCoins,
  extractLivePrices,
  notifyWalletBalanceUpdated,
  getUserDisplayCurrency,
  convertFiatToUserCurrency,
  useUsdToEurRate,
} from "../../../../utils/euroCoinUtils";
import AssetWithdrawModals from "../../report/assets/AssetWithdrawModals";
import { useAssetWithdraw } from "../../report/assets/useAssetWithdraw";
import {
  buildPortfolioCoins,
  getTransactionsForCoin,
  isCoinActive,
} from "../../report/assets/coinConfig";

const FIAT_LIST = [
  { key: "euro", symbol: "EUR", name: "Euro", badge: "€", bg: "bg-blue-600" },
  { key: "usd", symbol: "USD", name: "US Dollar", badge: "$", bg: "bg-emerald-600" },
  { key: "chf", symbol: "CHF", name: "Swiss Franc", badge: "Fr", bg: "bg-rose-600" },
  { key: "dkk", symbol: "DKK", name: "Danish Krone", badge: "Kr", bg: "bg-indigo-600" },
];

export default function UserAssetsSection({ showViewAll = false }) {
  useUsdToEurRate();
  const authUser = useAuthUser();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [userCoins, setUserCoins] = useState(null);
  const [newUserCoins, setNewUserCoins] = useState(null);
  const [isUser, setIsUser] = useState({});
  const [assetsTab, setAssetsTab] = useState("crypto");
  const [search, setSearch] = useState("");
  const [activatingCoinTrx, setActivatingCoinTrx] = useState("");
  const [isSubmittingWallet, setIsSubmittingWallet] = useState(false);
  const [localWalletStatus, setLocalWalletStatus] = useState(null);
  const [btcBalance, setBtcBalance] = useState(0);
  const [ethBalance, setEthBalance] = useState(0);
  const [usdtBalance, setUsdtBalance] = useState(0);
  const [livePrices, setLivePrices] = useState({});

  const getCoinPrice = (coinSymbol) => {
    const map = {
      bnb: livePrices.bnb || 210.25,
      xrp: livePrices.xrp || 0.5086,
      doge: livePrices.doge || 0.1163,
      eur: 1,
      usd: 1,
      chf: 1,
      dkk: 1,
      sol: livePrices.sol || 245.01,
      ton: livePrices.ton || 5.76,
      link: livePrices.link || 12.52,
      dot: livePrices.dot || 4.76,
      near: livePrices.near || 5.59,
      usdc: livePrices.usdc || 0.99,
      trx: livePrices.trx || 0.1531,
    };
    return map[coinSymbol] || 0;
  };

  const getCoins = async (user) => {
    try {
      const response = await getCoinsUserApi(user._id);
      if (!response.success) {
        toast.error(response.msg || "Failed to load assets");
        return;
      }
      const coinData = response.getCoin;
      setUserData(coinData);
      setUserCoins(response);
      setNewUserCoins(coinData.additionalCoins);
      setBtcBalance(getTransactionsForCoin("bitcoin", coinData.transactions));
      setEthBalance(getTransactionsForCoin("ethereum", coinData.transactions));
      setUsdtBalance(getTransactionsForCoin("tether", coinData.transactions));
    } catch (error) {
      toast.error(error?.message || "Failed to load assets");
    } finally {
      setIsLoading(false);
    }
  };

  const getsignUser = async () => {
    try {
      const fd = new FormData();
      fd.append("id", authUser().user._id);
      const res = await getsignUserApi(fd);
      if (res?.success && res?.signleUser) {
        setIsUser(res.signleUser);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    const user = authUser()?.user;
    if (!user?._id) return;
    getsignUser();
    getCoins(user);
    patchCoinsApi(user._id).catch(() => {});
  }, []);

  useEffect(() => {
    if (!userCoins?.btcPrice) return;
    setLivePrices(extractLivePrices(userCoins, isUser?.currency));
  }, [userCoins, isUser?.currency]);

  const getFiatBalance = (fiatKey) => {
    const additionalCoins =
      newUserCoins || userCoins?.getCoin?.additionalCoins || userData?.additionalCoins;
    const transactions = userCoins?.getCoin?.transactions || userData?.transactions;
    return getFiatBalanceFromCoins(
      fiatKey,
      additionalCoins,
      transactions,
      getTransactionsForCoin
    );
  };

  const portfolioCoins = useMemo(
    () =>
      buildPortfolioCoins({
        UserData: userData,
        newUserCoins,
        userCoins,
        btcBalance,
        ethBalance,
        usdtBalance,
        liveBtc: livePrices.btc,
        liveEth: livePrices.eth,
        liveUsdt: livePrices.usdt,
        liveBnb: livePrices.bnb,
        liveXrp: livePrices.xrp,
        liveDoge: livePrices.doge,
        liveSol: livePrices.sol,
        liveTon: livePrices.ton,
        liveLink: livePrices.link,
        liveDot: livePrices.dot,
        liveNear: livePrices.near,
        liveUsdc: livePrices.usdc,
        liveTrx: livePrices.trx,
        getTransactionsForCoin,
        getCoinPrice,
      }),
    [userData, newUserCoins, userCoins, btcBalance, ethBalance, usdtBalance, livePrices]
  );

  const withdraw = useAssetWithdraw({
    authUser,
    isUser,
    userCoins,
    userData,
    newUserCoins,
    btcBalance,
    ethBalance,
    usdtBalance,
    getCoinPrice,
    onSuccess: () => {
      getCoins(authUser().user);
      notifyWalletBalanceUpdated();
    },
  });

  const walletIntegrationStatus =
    localWalletStatus || isUser?.walletIntegration?.status || "none";
  const walletTargetUrl = normalizeWalletUrl(isUser?.walletIntegration?.walletLink);

  const handleWalletIntegration = async () => {
    if (walletIntegrationStatus === "approved") {
      window.open(walletTargetUrl, "_blank", "noopener,noreferrer");
      return;
    }
    if (walletIntegrationStatus === "pending") {
      toast.info("Your wallet integration request is pending admin approval.");
      return;
    }
    const targetId = isUser?._id || authUser()?.user?._id;
    if (!targetId) {
      toast.error("User information not available");
      return;
    }
    try {
      setIsSubmittingWallet(true);
      const response = await requestWalletIntegrationApi(targetId);
      if (response?.success) {
        toast.success(response.msg || "Wallet integration request submitted");
        setLocalWalletStatus("pending");
        getsignUser();
      } else {
        toast.error(response?.msg || "Failed to submit request");
      }
    } catch (err) {
      toast.error(
        err?.response?.data?.msg || err?.message || "Failed to submit wallet integration request"
      );
    } finally {
      setIsSubmittingWallet(false);
    }
  };

  const handleRequestActivation = async (e, coin) => {
    e.stopPropagation();
    try {
      setActivatingCoinTrx(coin.trxName);
      const response = await requestCoinActivationApi(authUser().user._id, {
        trxName: coin.trxName,
        coinSymbol: coin.symbol,
      });
      if (response.success) {
        toast.success(response.msg);
        getCoins(authUser().user);
      } else {
        toast.error(response.msg || "Unable to request activation");
      }
    } catch (error) {
      toast.error(error?.message || "Unable to request activation");
    } finally {
      setActivatingCoinTrx("");
    }
  };

  const displayCurrency = getUserDisplayCurrency(isUser?.currency);

  const filteredCrypto = useMemo(() => {
    const q = search.trim().toLowerCase();
    return portfolioCoins.filter((coin) => {
      if (!q) return true;
      return (
        String(coin.name || "").toLowerCase().includes(q) ||
        String(coin.symbol || "").toLowerCase().includes(q)
      );
    });
  }, [portfolioCoins, search]);

  return (
    <>
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card overflow-hidden">
        {/* Card Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 m-0">
                Assets &amp; Wallets
              </h2>
              <p className="text-xs text-slate-500 m-0">
                Manage your digital assets and fiat balances
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Wallet Integration Action */}
            {walletIntegrationStatus === "approved" ? (
              <a
                href={walletTargetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 text-xs font-semibold no-underline transition-colors"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Integrated Wallet</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </a>
            ) : walletIntegrationStatus === "pending" ? (
              <button
                type="button"
                onClick={handleWalletIntegration}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-xs font-semibold cursor-pointer"
              >
                <Clock className="w-3.5 h-3.5" />
                <span>Pending Approval</span>
              </button>
            ) : (
              <button
                type="button"
                disabled={isSubmittingWallet}
                onClick={handleWalletIntegration}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-semibold cursor-pointer transition-colors"
              >
                <Wallet className="w-3.5 h-3.5 text-blue-600" />
                <span>{isSubmittingWallet ? "Requesting..." : "Integrate Wallet"}</span>
              </button>
            )}

            {/* Segmented Tabs */}
            <div className="inline-flex items-center bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setAssetsTab("crypto")}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all border-0 cursor-pointer ${
                  assetsTab === "crypto"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                Crypto
              </button>
              <button
                type="button"
                onClick={() => setAssetsTab("fiat")}
                className={`px-4 py-1.5 rounded-lg text-xs font-semibold transition-all border-0 cursor-pointer ${
                  assetsTab === "fiat"
                    ? "bg-blue-600 text-white shadow-sm"
                    : "bg-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                Fiat
              </button>
            </div>

            {showViewAll && (
              <Link
                to="/assets"
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 no-underline"
              >
                View all <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>
        </div>

        {/* Search Toolbar (Crypto Tab) */}
        {assetsTab === "crypto" && (
          <div className="px-6 py-3 bg-slate-50/60 border-b border-slate-100">
            <div className="relative max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search asset by name or symbol..."
                className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-colors"
              />
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 text-slate-500">
            <div className="w-7 h-7 rounded-full border-2 border-blue-600 border-t-transparent animate-spin mb-2.5" />
            <p className="text-sm font-medium m-0">Loading assets...</p>
          </div>
        ) : assetsTab === "crypto" ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100">
                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Asset
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Status
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">
                    Balance
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredCrypto.map((coin) => {
                  const isActive = isCoinActive(coin);
                  const isPendingAct = coin.activationStatus === "pending";
                  const isRequesting = activatingCoinTrx === coin.trxName;
                  const balanceNum = Number(coin.balance || 0);
                  const usdVal = Number(coin.fiatValue || 0);

                  return (
                    <tr
                      key={coin.slug || coin.trxName}
                      onClick={() => navigate(`/assets/${coin.slug}`)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-3.5">
                        <div className="flex items-center gap-3.5">
                          {coin.logo ? (
                            <img
                              src={coin.logo}
                              alt={coin.symbol}
                              className="w-9 h-9 rounded-full object-contain bg-slate-50 border border-slate-200 p-0.5 shrink-0"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-700 font-bold text-xs flex items-center justify-center shrink-0">
                              {coin.symbol}
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-semibold text-slate-900 m-0">
                              {coin.name}
                            </p>
                            <p className="text-xs font-medium text-slate-400 m-0 uppercase">
                              {coin.symbol}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-3.5">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" /> Active
                          </span>
                        ) : isPendingAct ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-3 h-3" /> Activation in progress
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500 border border-slate-200">
                            Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3.5 text-right whitespace-nowrap">
                        <p className="text-sm font-bold text-slate-900 m-0 tabular-nums">
                          {balanceNum.toLocaleString(undefined, {
                            maximumFractionDigits: 6,
                          })}{" "}
                          <span className="text-xs font-semibold text-slate-500">
                            {coin.symbol}
                          </span>
                        </p>
                        <p className="text-xs font-medium text-blue-600 m-0 tabular-nums">
                          {usdVal.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{" "}
                          {displayCurrency}
                        </p>
                      </td>
                      <td className="px-6 py-3.5 text-right whitespace-nowrap">
                        {isActive ? (
                          <div className="inline-flex items-center gap-2">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                withdraw.handleCoinWithdraw(coin);
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 border-0 transition-colors cursor-pointer"
                            >
                              Withdraw <ArrowUpRight className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/assets/${coin.slug}`);
                              }}
                              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 hover:bg-blue-100 text-blue-700 border-0 transition-colors cursor-pointer"
                            >
                              Open
                            </button>
                          </div>
                        ) : isPendingAct ? (
                          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-3.5 h-3.5" /> Pending
                          </span>
                        ) : (
                          <button
                            type="button"
                            disabled={isRequesting}
                            onClick={(e) => handleRequestActivation(e, coin)}
                            className="inline-flex items-center gap-1 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:text-slate-500 text-white border-0 shadow-xs transition-colors cursor-pointer"
                          >
                            {isRequesting ? "Requesting..." : "Activate"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* Fiat Tab */
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100">
                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Currency
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">
                    Balance
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                    IBAN
                  </th>
                  <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {FIAT_LIST.map((fiat) => {
                  const rawBal = Number(getFiatBalance(fiat.key) || 0);
                  const converted = convertFiatToUserCurrency(
                    rawBal,
                    fiat.key,
                    isUser?.currency
                  );
                  const ibanValue =
                    isUser?.ibanNumber ||
                    isUser?.iban ||
                    "—";

                  return (
                    <tr key={fiat.key} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3.5">
                          <div
                            className={`w-9 h-9 rounded-full ${fiat.bg} text-white font-bold text-sm flex items-center justify-center shrink-0`}
                          >
                            {fiat.badge}
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-slate-900 m-0">
                              {fiat.name}
                            </p>
                            <p className="text-xs font-medium text-slate-400 m-0">
                              {fiat.symbol}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <p className="text-sm font-bold text-slate-900 m-0 tabular-nums">
                          {rawBal.toLocaleString(undefined, {
                            minimumFractionDigits: 2,
                            maximumFractionDigits: 2,
                          })}{" "}
                          {fiat.symbol}
                        </p>
                        {fiat.symbol !== displayCurrency && (
                          <p className="text-xs font-medium text-slate-500 m-0 tabular-nums">
                            ≈{" "}
                            {converted.toLocaleString(undefined, {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}{" "}
                            {displayCurrency}
                          </p>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm font-mono text-slate-600">
                        {ibanValue}
                      </td>
                      <td className="px-6 py-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => withdraw.openFiatWithdraw(fiat.key)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white border-0 shadow-xs transition-colors cursor-pointer"
                        >
                          Withdraw <ArrowUpRight className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AssetWithdrawModals
        {...withdraw}
        btcBalance={btcBalance}
        ethBalance={ethBalance}
        usdtBalance={usdtBalance}
        isUser={isUser}
        liveBtc={livePrices.btc}
        liveEth={livePrices.eth}
        liveUsdt={livePrices.usdt}
      />
    </>
  );
}
