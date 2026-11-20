import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useAuthUser } from "react-auth-kit";
import {
  ChevronRight,
  ArrowDownLeft,
  ArrowUpRight,
  ArrowLeftRight,
  ReceiptText,
} from "lucide-react";
import { getsignUserApi, getUserCoinApi } from "../../../../Api/Service";
import {
  isFiatCoin,
  convertFiatToUserCurrency,
  getUserDisplayCurrency,
  extractLivePrices,
  useUsdToEurRate,
} from "../../../../utils/euroCoinUtils";
import {
  formatSwapPairLabel,
  getSwapDetails,
  getSwapListSubtitle,
  isSwapTransaction,
  shouldShowTransaction,
  trxNameToSymbol,
} from "../../report/assets/swapTransactionUtils";
import {
  formatSmartAmount,
  formatTransactionDate,
  getStatusTone,
  getTransactionTypeLabel,
  resolveTransactionCoinMeta,
} from "../../report/assets/transactionDisplayUtils";

export default function UserRecentTransactionsSection({ limit = 8 }) {
  useUsdToEurRate();
  const authUser = useAuthUser();
  const userId = authUser()?.user?._id;

  const [isLoading, setIsLoading] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [isUser, setIsUser] = useState({});
  const [pricePayload, setPricePayload] = useState(null);

  useEffect(() => {
    if (!userId) return;
    const load = async () => {
      try {
        const fd = new FormData();
        fd.append("id", userId);
        const [profileRes, txRes] = await Promise.all([
          getsignUserApi(fd).catch(() => null),
          getUserCoinApi(userId).catch(() => null),
        ]);
        if (profileRes?.success && profileRes?.signleUser) {
          setIsUser(profileRes.signleUser);
        }
        if (txRes?.success && Array.isArray(txRes.getCoin?.transactions)) {
          setTransactions([...txRes.getCoin.transactions].reverse());
          setPricePayload(txRes);
        }
      } catch {
        // ignore
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [userId]);

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

  const recent = useMemo(
    () => transactions.filter(shouldShowTransaction).slice(0, limit),
    [transactions, limit]
  );

  const getFiatDisplay = (tx) => {
    let val = 0;
    if (isFiatCoin(tx.trxName)) {
      val = convertFiatToUserCurrency(tx.amount, tx.trxName, isUser.currency);
    } else {
      const price = prices[String(tx.trxName || "").toLowerCase()] || 0;
      val = Math.abs(parseFloat(tx.amount) || 0) * price;
    }
    const label = isFiatCoin(tx.trxName)
      ? getUserDisplayCurrency(isUser.currency)
      : isUser.currency === "EUR"
        ? "EUR"
        : "USD";
    const prefix =
      tx.type === "deposit"
        ? "+"
        : tx.type === "withdraw"
          ? "-"
          : parseFloat(tx.amount) >= 0
            ? "+"
            : "-";
    return `${prefix}${val.toFixed(2)} ${label}`;
  };

  const statusPill = (status) => {
    const tone = getStatusTone(status);
    if (tone === "completed") return "bg-emerald-50 text-emerald-700 border-emerald-200";
    if (tone === "pending") return "bg-amber-50 text-amber-700 border-amber-200";
    if (tone === "rejected") return "bg-rose-50 text-rose-700 border-rose-200";
    return "bg-slate-100 text-slate-600 border-slate-200";
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-slate-100 text-slate-700 flex items-center justify-center">
            <ReceiptText className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 m-0">
              Recent Transactions
            </h2>
            <p className="text-xs text-slate-500 m-0">
              Latest activity across your wallets
            </p>
          </div>
        </div>
        {userId && (
          <Link
            to={`/Transactions/${userId}`}
            className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700 no-underline"
          >
            View all <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-14 text-slate-500">
          <div className="w-7 h-7 rounded-full border-2 border-blue-600 border-t-transparent animate-spin mb-2" />
          <p className="text-sm font-medium m-0">Loading recent activity...</p>
        </div>
      ) : recent.length === 0 ? (
        <div className="py-14 text-center text-sm text-slate-500">
          No recent transactions yet.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-100">
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Transaction
                </th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Date
                </th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  Status
                </th>
                <th className="px-6 py-3 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">
                  Amount
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recent.map((tx, idx) => {
                const meta = resolveTransactionCoinMeta(tx.trxName);
                const isSwap = isSwapTransaction(tx);
                const swapDetails = isSwap ? getSwapDetails(tx, transactions) : null;
                const symbol = trxNameToSymbol(tx.trxName) || meta?.symbol || "";
                const title = isSwap
                  ? swapDetails?.from && swapDetails?.to
                    ? `Swap ${formatSwapPairLabel(swapDetails)}`
                    : `Swap ${symbol}`
                  : `${getTransactionTypeLabel(tx)} ${symbol}`;
                const subtitle = isSwap
                  ? getSwapListSubtitle(tx, transactions)
                  : tx.note || (tx.txId && tx.txId !== "placeholder" ? tx.txId : tx._id) || "—";
                const amountNum = parseFloat(tx.amount) || 0;
                const isPositive =
                  tx.type === "deposit" || (tx.type !== "withdraw" && amountNum >= 0);

                return (
                  <tr key={tx._id || idx} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-6 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="relative shrink-0">
                          {meta?.logo ? (
                            <img
                              src={meta.logo}
                              alt={symbol}
                              className="w-9 h-9 rounded-full object-contain bg-slate-50 border border-slate-200 p-0.5"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-700 font-bold text-xs flex items-center justify-center">
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
                          <p className="text-xs text-slate-400 m-0 truncate max-w-[260px]">
                            {subtitle}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-3.5 text-sm text-slate-600 whitespace-nowrap">
                      {formatTransactionDate(tx.createdAt)}
                    </td>
                    <td className="px-6 py-3.5 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border capitalize ${statusPill(
                          tx.status
                        )}`}
                      >
                        {tx.status || "Unknown"}
                      </span>
                    </td>
                    <td className="px-6 py-3.5 text-right whitespace-nowrap">
                      <p className="text-sm font-bold text-slate-900 m-0 tabular-nums">
                        {isPositive ? "+" : "-"}
                        {formatSmartAmount(Math.abs(amountNum))} {symbol}
                      </p>
                      <p
                        className={`text-xs font-medium m-0 tabular-nums ${
                          isPositive ? "text-emerald-600" : "text-rose-600"
                        }`}
                      >
                        {getFiatDisplay(tx)}
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
  );
}
