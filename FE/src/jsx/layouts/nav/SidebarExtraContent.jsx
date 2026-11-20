import React, { useEffect, useState } from "react";
import { useLocation, Link } from "react-router-dom";
import { useAuthUser } from "react-auth-kit";
import { getsignUserApi, getCoinsUserApi } from "../../../Api/Service";
import { getTransactionsForCoin } from "../../pages/report/assets/coinConfig";
import {
  combinePortfolioTotal,
  buildFiatAmountsFromTransactions,
  extractLivePrices,
  useUsdToEurRate,
  WALLET_BALANCE_UPDATED_EVENT,
  sumCoinPendingIncoming,
} from "../../../utils/euroCoinUtils";
import { Wallet, Clock } from "lucide-react";

const SidebarExtraContent = () => {
  useUsdToEurRate();
  const location = useLocation();
  const { pathname } = location;
  const authUser = useAuthUser();
  const [totalBalance, settotalBalance] = useState(null);
  const [totalBalancePending, settotalBalancePending] = useState(null);
  const [Admin, setAdmin] = useState("");

  const getCoins = async (data, isUserd) => {
    let id = data._id;
    try {
      const userCoins = await getCoinsUserApi(id);
      if (userCoins.success) {
        const prices = extractLivePrices(userCoins, isUserd?.currency);
        const txs = userCoins.getCoin.transactions || [];
        const calculateBalance = (coinSymbol, coinPrice) =>
          getTransactionsForCoin(coinSymbol, txs) * coinPrice;

        const cryptoUsdTotal =
          calculateBalance("bitcoin", parseFloat(prices.btc)) +
          calculateBalance("ethereum", prices.eth) +
          calculateBalance("tether", prices.usdt) +
          calculateBalance("bnb", prices.bnb) +
          calculateBalance("xrp", prices.xrp) +
          calculateBalance("dogecoin", prices.doge) +
          calculateBalance("solana", prices.sol) +
          calculateBalance("toncoin", prices.ton) +
          calculateBalance("chainlink", prices.link) +
          calculateBalance("polkadot", prices.dot) +
          calculateBalance("near protocol", prices.near) +
          calculateBalance("usd coin", prices.usdc) +
          calculateBalance("tron", prices.trx);

        const fiatAmounts = buildFiatAmountsFromTransactions(txs, "completed");
        const total = combinePortfolioTotal(
          cryptoUsdTotal,
          fiatAmounts,
          isUserd.currency,
          { cryptoAlreadyInDisplayCurrency: true }
        ).toFixed(2);

        const [integerPart] = total.split(".");
        const formattedTotalBalance = parseFloat(integerPart).toLocaleString("en-US", {
          style: "currency",
          currency: isUserd.currency === "EUR" ? "EUR" : "USD",
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        });
        settotalBalance(formattedTotalBalance);

        const calculatePendingBalance = (coinSymbol, coinPrice) =>
          sumCoinPendingIncoming(txs, coinSymbol) * coinPrice;

        const cryptoPendingUsdTotal =
          calculatePendingBalance("bitcoin", parseFloat(prices.btc)) +
          calculatePendingBalance("ethereum", prices.eth) +
          calculatePendingBalance("tether", prices.usdt) +
          calculatePendingBalance("bnb", prices.bnb) +
          calculatePendingBalance("xrp", prices.xrp) +
          calculatePendingBalance("dogecoin", prices.doge) +
          calculatePendingBalance("solana", prices.sol) +
          calculatePendingBalance("toncoin", prices.ton) +
          calculatePendingBalance("chainlink", prices.link) +
          calculatePendingBalance("polkadot", prices.dot) +
          calculatePendingBalance("near protocol", prices.near) +
          calculatePendingBalance("usd coin", prices.usdc) +
          calculatePendingBalance("tron", prices.trx);

        const fiatPending = buildFiatAmountsFromTransactions(txs, "pending");
        const totalPending = combinePortfolioTotal(
          cryptoPendingUsdTotal,
          fiatPending,
          isUserd.currency,
          { cryptoAlreadyInDisplayCurrency: true }
        ).toFixed(2);

        const [integerPartPending] = totalPending.split(".");
        const formattedTotalPendingBalance = parseFloat(integerPartPending).toLocaleString(
          "en-US",
          {
            style: "currency",
            currency: isUserd.currency === "EUR" ? "EUR" : "USD",
            minimumFractionDigits: 0,
            maximumFractionDigits: 0,
          }
        );
        settotalBalancePending(formattedTotalPendingBalance);
      }
    } catch {
      // ignore sidebar fetch errors
    }
  };

  const getsignUser = async () => {
    try {
      const sessionUser = authUser()?.user;
      if (!sessionUser?._id) return;
      const formData = new FormData();
      formData.append("id", sessionUser._id);
      const userCoins = await getsignUserApi(formData);
      if (userCoins.success) {
        getCoins(sessionUser, userCoins.signleUser);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    const sessionUser = authUser()?.user;
    if (sessionUser?.role === "user") {
      setAdmin(sessionUser);
      getsignUser();
    } else if (sessionUser?.role === "admin") {
      setAdmin(sessionUser);
    }
  }, [pathname]);

  useEffect(() => {
    const onWalletUpdated = () => {
      if (authUser()?.user?.role === "user") {
        getsignUser();
      }
    };
    window.addEventListener(WALLET_BALANCE_UPDATED_EVENT, onWalletUpdated);
    return () => window.removeEventListener(WALLET_BALANCE_UPDATED_EVENT, onWalletUpdated);
  }, []);

  const userId = Admin?._id || authUser()?.user?._id;
  const transactionsPath = userId ? `/Transactions/${userId}` : "/dashboard";

  return (
    <div className="up-balance-box">
      <Link to={transactionsPath} className="up-balance-row">
        <div>
          <div className="up-balance-label">Available Funds</div>
          <div className="up-balance-val">
            {totalBalance === null ? "..." : totalBalance}
          </div>
        </div>
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            background: "rgba(59, 130, 246, 0.2)",
            color: "#60a5fa",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Wallet size={17} />
        </div>
      </Link>
      <div className="up-balance-divider" />
      <Link to={transactionsPath} className="up-balance-row">
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 5,
            fontSize: 11,
            fontWeight: 600,
            color: "#94a3b8",
          }}
        >
          <Clock size={12} />
          Pending
        </span>
        <span className="up-balance-pending-val">
          {totalBalancePending === null ? "..." : totalBalancePending}
        </span>
      </Link>
    </div>
  );
};

export default SidebarExtraContent;
