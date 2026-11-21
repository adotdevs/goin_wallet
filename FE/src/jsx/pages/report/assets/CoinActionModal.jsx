import React, { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { ArrowUpRight, Copy, Check, X } from "lucide-react";
import { formatCoinAmount } from "./coinConfig";

const CoinActionModal = ({ open, mode, coin, onClose, onSend }) => {
  const [copied, setCopied] = useState(false);

  if (!open || !coin) return null;

  const hasAddress = Boolean(String(coin.address || "").trim());
  if (mode === "receive" && !hasAddress) return null;

  const handleCopy = async () => {
    if (!coin.address) return;
    try {
      await navigator.clipboard.writeText(coin.address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error("Copy failed", error);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wider text-blue-600 m-0">
              Step 1 of 1
            </p>
            <h2 className="text-base font-bold text-slate-900 m-0 mt-0.5">
              {mode === "send" ? "Send" : "Receive"} {coin.name}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center border-0 bg-transparent cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {mode === "receive" ? (
          <div className="p-6 flex flex-col items-center text-center space-y-4">
            <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs">
              <QRCodeSVG
                value={coin.address}
                size={196}
                bgColor="#ffffff"
                fgColor="#0f172a"
                level="M"
              />
            </div>
            <p className="text-xs text-slate-500 m-0">
              Scan this QR code or copy your <strong className="text-slate-800">{coin.symbol}</strong> wallet address below.
            </p>
            <div className="w-full flex items-center justify-between gap-2 px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-xs font-mono text-slate-700 truncate">
                {coin.address}
              </span>
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold border-0 shrink-0 cursor-pointer transition-colors"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
        ) : (
          <div className="p-6 flex flex-col items-center text-center space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 text-blue-600 flex items-center justify-center">
              <ArrowUpRight className="w-6 h-6" />
            </div>
            <div className="space-y-1.5">
              <h3 className="text-lg font-bold text-slate-900 m-0">
                Withdraw {coin.symbol}
              </h3>
              <p className="text-sm text-slate-500 m-0 leading-relaxed">
                You will continue in the secure withdrawal flow. Available balance:{" "}
                <strong className="text-slate-900 tabular-nums">
                  {formatCoinAmount(coin.balance)} {coin.symbol}
                </strong>
              </p>
            </div>
            <div className="w-full flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold border-0 cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={onSend}
                className="flex-1 py-2.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold border-0 shadow-sm cursor-pointer transition-colors"
              >
                Continue to Withdraw
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CoinActionModal;
