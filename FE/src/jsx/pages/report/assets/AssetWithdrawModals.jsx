import React from "react";
import { X, Wallet, Landmark, ShieldCheck, ArrowUpRight, RefreshCw } from "lucide-react";
import {
  convertFiatToUserCurrency,
  getFiatCurrencyByKey,
  getUserDisplayCurrency,
  isFiatCoin,
  isFiatNativeMatchingUserCurrency,
} from "../../../../utils/euroCoinUtils";
import { formatBankPaymentOptionLabel } from "./paymentDisplayUtils";

const AvailableBalance = ({ label, amount, onSelect }) => (
  <div className="flex items-center justify-between mt-2 text-xs">
    <span className="text-slate-500">
      Available: <strong className="text-slate-800 tabular-nums">{label}</strong>
    </span>
    <button
      type="button"
      onClick={() => onSelect(amount)}
      className="px-2 py-0.5 rounded-md bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-[11px] border border-blue-200 cursor-pointer transition-colors"
    >
      MAX
    </button>
  </div>
);

const AssetWithdrawModals = ({
  modal3,
  otpModal,
  closeDeposit,
  activeBank,
  activeCrypto,
  activeBankOne,
  depositName,
  transactionDetail,
  transactionDetailId,
  NewValue,
  newCoin,
  btcBalance,
  ethBalance,
  usdtBalance,
  isUser,
  isDisable,
  isDisable2,
  isError,
  otp,
  counter,
  counterDisable,
  handlePaymentSelection,
  handleTransactionId,
  handleTransaction,
  postUserTransaction,
  verifyOtp,
  reSend,
  setOtp,
  setIsError,
  setMaxWithdrawAmount,
  getCoinPrice,
  liveBtc,
  liveEth,
  liveUsdt,
}) => {
  const renderAvailableBalance = () => {
    const selectMax = (amount) => setMaxWithdrawAmount(amount);

    if (depositName === "bitcoin") {
      return (
        <AvailableBalance
          label={`${btcBalance.toFixed(8)} BTC`}
          amount={btcBalance.toFixed(8)}
          onSelect={selectMax}
        />
      );
    }
    if (depositName === "ethereum") {
      return (
        <AvailableBalance
          label={`${ethBalance.toFixed(8)} ETH`}
          amount={ethBalance.toFixed(8)}
          onSelect={selectMax}
        />
      );
    }
    if (depositName === "tether") {
      return (
        <AvailableBalance
          label={`${usdtBalance.toFixed(8)} USDT`}
          amount={usdtBalance.toFixed(8)}
          onSelect={selectMax}
        />
      );
    }
    if (isFiatCoin(depositName)) {
      const fiat = getFiatCurrencyByKey(depositName);
      return (
        <AvailableBalance
          label={`${Number(NewValue).toFixed(2)} ${fiat?.label || "EUR"}`}
          amount={NewValue}
          onSelect={selectMax}
        />
      );
    }

    const altCoins = {
      bnb: "BNB",
      xrp: "XRP",
      dogecoin: "DOGE",
      solana: "SOL",
      toncoin: "TON",
      chainlink: "LINK",
      polkadot: "DOT",
      "near protocol": "NEAR",
      "usd coin": "USDC",
      tron: "TRX",
    };

    if (altCoins[depositName]) {
      return (
        <AvailableBalance
          label={`${NewValue} ${altCoins[depositName]}`}
          amount={NewValue}
          onSelect={selectMax}
        />
      );
    }

    return null;
  };

  const renderTotalAmount = () => {
    const displayCurrency = getUserDisplayCurrency(isUser?.currency);
    if (depositName === "bitcoin") {
      const converted = `${(Number(transactionDetail.amountMinus || 0) * (liveBtc || 0)).toFixed(2)} ${displayCurrency}`;
      return (
        <span>
          BTC {transactionDetail.amountMinus || "0"} ({converted})
        </span>
      );
    }
    if (depositName === "ethereum") {
      const converted = `${(Number(transactionDetail.amountMinus || 0) * (liveEth || 0)).toFixed(2)} ${displayCurrency}`;
      return (
        <span>
          ETH {transactionDetail.amountMinus || "0"} ({converted})
        </span>
      );
    }
    if (depositName === "tether") {
      const converted = `${(Number(transactionDetail.amountMinus || 0) * (liveUsdt || 1)).toFixed(2)} ${displayCurrency}`;
      return (
        <span>
          USDT {transactionDetail.amountMinus || "0"} ({converted})
        </span>
      );
    }
    if (isFiatCoin(depositName)) {
      return (
        <span>
          {getFiatCurrencyByKey(depositName)?.label || "EUR"}{" "}
          {Number(transactionDetail.amountMinus || 0).toFixed(2)}
          {!isFiatNativeMatchingUserCurrency(depositName, isUser?.currency) && (
            <>
              {" "}
              (
              {convertFiatToUserCurrency(
                transactionDetail.amountMinus,
                depositName,
                isUser?.currency
              ).toFixed(2)}{" "}
              {getUserDisplayCurrency(isUser?.currency)})
            </>
          )}
        </span>
      );
    }
    const converted = `${(Number(transactionDetail.amountMinus || 0) * getCoinPrice(newCoin.coinSymbol)).toFixed(2)} ${getUserDisplayCurrency(isUser?.currency)}`;
    return (
      <span className="uppercase">
        <span>{newCoin.coinSymbol} </span>
        {transactionDetail.amountMinus || "0"} ({converted})
      </span>
    );
  };

  return (
    <>
      {modal3 && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={closeDeposit}
        >
          <div
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 space-y-4">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <ArrowUpRight className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 m-0">
                      Create New Withdrawal
                    </h3>
                    <p className="text-xs text-slate-500 m-0">
                      Transfer funds securely to your wallet or linked bank
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeDeposit}
                  aria-label="Close"
                  className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center border-0 bg-transparent cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Segmented Method Toggle */}
              <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={activeCrypto}
                  className={`inline-flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold border-0 cursor-pointer transition-all ${
                    !activeBank
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-transparent text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Wallet className="w-3.5 h-3.5" /> Crypto Withdraw
                </button>
                <button
                  type="button"
                  onClick={activeBankOne}
                  className={`inline-flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-xs font-bold border-0 cursor-pointer transition-all ${
                    activeBank
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-transparent text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <Landmark className="w-3.5 h-3.5" /> Bank / Card Withdraw
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="p-6 overflow-y-auto space-y-5">
              {/* Selected Currency */}
              <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-slate-50 border border-slate-200/80">
                <span className="text-xs font-semibold text-slate-500">
                  Selected Asset
                </span>
                <span className="inline-flex items-center px-3 py-1 rounded-lg bg-blue-600 text-white text-xs font-bold capitalize">
                  {depositName}
                </span>
              </div>

              {/* Amount Input */}
              <div>
                <label
                  htmlFor="withdraw-amount"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Withdrawal Amount
                </label>
                <input
                  id="withdraw-amount"
                  type="number"
                  onFocus={() => {
                    window.onwheel = () => false;
                  }}
                  onBlur={() => {
                    window.onwheel = null;
                  }}
                  onKeyDown={(e) =>
                    ["ArrowUp", "ArrowDown", "e", "E", "+", "-", "*", ""].includes(e.key) &&
                    e.preventDefault()
                  }
                  onChange={handleTransaction}
                  value={transactionDetail.amountMinus}
                  name="amountMinus"
                  placeholder="Ex: 0.00000000"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 tabular-nums"
                />
                {renderAvailableBalance()}
              </div>

              {/* Destination Details */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                {activeBank ? (
                  <>
                    <h4 className="text-sm font-bold text-slate-900 m-0">
                      Payment Method
                    </h4>
                    <select
                      onChange={handlePaymentSelection}
                      className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500"
                    >
                      <option>Select a Payment Method</option>
                      {isUser?.payments?.length > 0 ? (
                        isUser.payments.map((item, index) => (
                          <option
                            key={index}
                            value={
                              item.type === "bank"
                                ? item.bank.accountName
                                : `${item.card.cardCategory.toUpperCase()} *${item.card.cardNumber.slice(-4)}`
                            }
                          >
                            {item.type === "bank"
                              ? formatBankPaymentOptionLabel(item.bank)
                              : `${item.card.cardCategory.toUpperCase()} *${item.card.cardNumber.slice(-4)}`}
                          </option>
                        ))
                      ) : (
                        <option disabled>No payment methods available</option>
                      )}
                    </select>
                  </>
                ) : (
                  <>
                    <h4 className="text-sm font-bold text-slate-900 m-0">
                      Transaction Details
                    </h4>
                    <div>
                      <label
                        htmlFor="formGridReceivingAddress"
                        className="block text-xs font-semibold text-slate-700 mb-1.5"
                      >
                        Receiving Wallet Address
                      </label>
                      <div className="relative">
                        <input
                          id="formGridReceivingAddress"
                          type="text"
                          onChange={handleTransactionId}
                          value={transactionDetailId.txId}
                          name="txId"
                          placeholder="Ex: 0x1234567890..."
                          className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
                        />
                        <Wallet className="w-4 h-4 text-slate-400 absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Summary Strip */}
              <div className="flex items-center justify-between px-4 py-3.5 rounded-xl bg-blue-50/70 border border-blue-100">
                <span className="text-xs font-bold text-slate-700">Total Amount</span>
                <span className="text-sm font-extrabold text-blue-700 tabular-nums">
                  {renderTotalAmount()}
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={closeDeposit}
                className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDisable}
                onClick={() => postUserTransaction(activeBank ? "bank" : "crypto", true)}
                className="px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold border-0 shadow-sm cursor-pointer transition-colors"
              >
                {isDisable ? "Processing..." : "Create Withdrawal"}
              </button>
            </div>
          </div>
        </div>
      )}

      {otpModal && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={closeDeposit}
        >
          <div
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-slate-900 m-0">
                  Two-Factor Authentication
                </h3>
              </div>
              <button
                type="button"
                onClick={closeDeposit}
                aria-label="Close"
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center border-0 bg-transparent cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Body */}
            <div className="p-6 space-y-4">
              <p className="text-sm text-slate-600 leading-relaxed m-0">
                For your security, we&apos;ve sent a{" "}
                <strong className="text-slate-900">6-digit verification code</strong> to your
                registered email address. Enter it below to confirm your withdrawal.
              </p>

              <div>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="• • • • • •"
                  value={otp}
                  onChange={(e) => {
                    setOtp(e.target.value.replace(/\D/g, ""));
                    setIsError({ show: false, type: "" });
                  }}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-center text-xl font-mono font-bold tracking-[0.4em] text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
                />
                {isError.show && (
                  <p className="text-xs font-semibold text-rose-600 mt-1.5 mb-0 text-center">
                    {isError.type}
                  </p>
                )}
              </div>

              <div className="flex justify-center">
                <button
                  type="button"
                  disabled={isDisable2 || counterDisable}
                  onClick={reSend}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 disabled:opacity-50 text-slate-700 text-xs font-semibold border-0 cursor-pointer transition-colors"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  {counterDisable ? `Resend in ${counter}s` : "Resend OTP"}
                </button>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={closeDeposit}
                className="px-4 py-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDisable || otp.length !== 6}
                onClick={() => verifyOtp(activeBank ? "bank" : "crypto")}
                className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-bold border-0 shadow-sm cursor-pointer transition-colors"
              >
                {isDisable ? "Verifying..." : "Verify & Withdraw"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default AssetWithdrawModals;
