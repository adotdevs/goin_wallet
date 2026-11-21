import React from "react";
import { Link } from "react-router-dom";
import rowStyles from "./AdminCoinWalletRow.module.css";
import { resolveTransactionCoinMeta } from "../../pages/report/assets/transactionDisplayUtils";
import { resolveCoinActivationStatus } from "../../pages/report/assets/coinConfig";
import {
  formatFiatBalanceForAdmin,
  getFiatCurrencyByName,
  isFiatCoin,
} from "../../../utils/euroCoinUtils";

const actionBtnClass = `${rowStyles.btn}`;
const primaryBtnClass = `${rowStyles.btn} ${rowStyles.btnPrimary}`;

const AdminCoinWalletRow = ({
  coin,
  totalBalance,
  getCoinPrice,
  subAdminPermissions,
  onUpdateAddress,
  onDeposit,
  onWithdraw,
  onToggleActivation,
  togglingCoinKey = "",
  userCurrency = "USD",
  userId,
}) => {
  const fiatMeta = getFiatCurrencyByName(coin.coinName);
  const isFiat = isFiatCoin(coin.coinName);
  const coinMeta = resolveTransactionCoinMeta(coin.coinName);
  const activationStatus = resolveCoinActivationStatus(
    coin.tokenAddress,
    coin.activationStatus
  );
  const isActive = activationStatus === "active";
  const isPending = activationStatus === "pending";
  const rowKey = String(coin.coinSymbol || coin.coinName || "").toLowerCase();
  const isToggling = togglingCoinKey === rowKey;
  const usdVal = !isFiat ? totalBalance * getCoinPrice(coin.coinSymbol) : 0;

  return (
    <div className={rowStyles.row}>
      <div className={rowStyles.inner}>
        <div className={rowStyles.meta}>
          <span
            className={rowStyles.coinIcon}
            style={{ "--coin-accent": coinMeta?.accent || "#F0B90B" }}
          >
            {coinMeta?.logo ? (
              <img src={coinMeta.logo} alt={coin.coinSymbol} />
            ) : (
              <span>{coinMeta?.symbol?.slice(0, 3) || coin.coinSymbol?.slice(0, 3)}</span>
            )}
          </span>
          <div>
            <div className={rowStyles.nameRow}>
              <h4 className={rowStyles.name}>{coin.coinName}</h4>
              {isFiat ? (
                <span className={rowStyles.badgeFiat}>Fiat</span>
              ) : isActive ? (
                <span className={rowStyles.badgeActive}>Active</span>
              ) : isPending ? (
                <span className={rowStyles.badgePending}>Pending</span>
              ) : (
                <span className={rowStyles.badgeInactive}>Inactive</span>
              )}
            </div>
            <p className={rowStyles.symbol}>{coin.coinSymbol}</p>
          </div>
        </div>

        <div className={rowStyles.side}>
          <div className={rowStyles.balanceWrap}>
            {isFiat ? (
              <span className={rowStyles.balance}>
                {formatFiatBalanceForAdmin(totalBalance, coin.coinName, userCurrency)}
              </span>
            ) : (
              <>
                <span className={rowStyles.balance}>
                  {Number(totalBalance || 0).toFixed(6)}{" "}
                  {String(coin.coinSymbol || "").toUpperCase()}
                </span>
                <span className={rowStyles.balanceUsd}>
                  ≈ ${usdVal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USD
                </span>
              </>
            )}
          </div>

          <div className={rowStyles.actions}>
            {isFiat && userId && fiatMeta?.adminPath && (
              <Link
                to={`/admin/users/${userId}?tab=assets&sub=banking`}
                className={actionBtnClass}
              >
                <span>Bank account</span>
              </Link>
            )}

            {!isFiat && subAdminPermissions.editWalletAddress && typeof onToggleActivation === "function" && (
              <button
                type="button"
                disabled={isToggling}
                onClick={() => onToggleActivation(coin, !isActive)}
                className={`${rowStyles.btn} ${
                  isActive ? rowStyles.btnDeactivate : rowStyles.btnActivate
                }`}
              >
                <span>
                  {isToggling
                    ? "Saving..."
                    : isActive
                      ? "Deactivate"
                      : "Activate"}
                </span>
              </button>
            )}

            {!isFiat && subAdminPermissions.editWalletAddress && (
              <button
                onClick={() =>
                  onUpdateAddress(coin.coinName, coin.tokenAddress, coin.coinSymbol, coin._id)
                }
                type="button"
                className={actionBtnClass}
              >
                <span>Address</span>
              </button>
            )}

            {subAdminPermissions.editUserWallet && (
              <>
                <button
                  onClick={() => onDeposit(coin)}
                  type="button"
                  className={primaryBtnClass}
                >
                  <span>{isFiat ? "Add balance" : "Deposit"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => onWithdraw(coin)}
                  className={actionBtnClass}
                >
                  <span>Withdraw</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminCoinWalletRow;
