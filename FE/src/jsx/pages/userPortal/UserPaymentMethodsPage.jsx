import React, { useEffect, useState } from "react";
import { useAuthUser } from "react-auth-kit";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  CreditCard,
  Landmark,
  Plus,
  Trash2,
  X,
  ShieldCheck,
} from "lucide-react";
import {
  addCardApi,
  deletePaymentApi,
  getLinksApi,
  getsignUserApi,
  PaymentsApi,
} from "../../../Api/Service";
import UserPortalShell from "./UserPortalShell";

const getCardTypeFromNumber = (cardNumber) => {
  const patterns = {
    visa: /^4/,
    mastercard: /^(5[1-5]|2(2(2[1-9]|[3-9])|[3-6]|7(0|1|20)))/,
    amex: /^3[47]/,
    discover: /^6(?:011|5[0-9]{2})/,
    dinersClub: /^3(?:0[0-5]|[68][0-9])[0-9]{11}$/,
    jcb: /^(?:2131|1800|35\d{3})\d{11}$/,
  };
  for (const [cardType, pattern] of Object.entries(patterns)) {
    if (pattern.test(cardNumber)) return cardType;
  }
  return "other";
};

export default function UserPaymentMethodsPage() {
  const authUser = useAuthUser();
  const navigate = useNavigate();
  const userId = authUser()?.user?._id;

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [isUser, setIsUser] = useState({});
  const [modalOpen, setModalOpen] = useState(false);
  const [modalTab, setModalTab] = useState("bank"); // "bank" | "card"

  const [accountDetail, setAccountDetail] = useState({
    accountName: "",
    accountNumber: "",
    iban: "",
    bicSwift: "",
    accountNotes: "",
  });

  const [cardForm, setCardForm] = useState({
    cardNumber: "",
    cardHolder: "",
    expiryDate: "",
    cvv: "",
    notes: "",
  });
  const [cardErrors, setCardErrors] = useState({});

  const loadUser = async () => {
    if (!userId) return;
    try {
      const fd = new FormData();
      fd.append("id", userId);
      const res = await getsignUserApi(fd);
      if (res?.success && res?.signleUser) {
        setIsUser(res.signleUser);
      } else if (res?.msg) {
        toast.error(res.msg);
      }
    } catch (err) {
      toast.error(err?.message || "Failed to load payment methods");
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
        const data = await getLinksApi();
        if (!data?.links?.[5]?.enabled) {
          navigate(-1);
          return;
        }
      } catch {
        // continue
      }
      await loadUser();
    };
    init();
  }, [userId]);

  const handleDelete = async (pId) => {
    try {
      setDeletingId(pId);
      const res = await deletePaymentApi(userId, pId);
      if (res?.success) {
        toast.success(res.msg || "Payment method removed");
        await loadUser();
      } else {
        toast.error(res?.msg || "Failed to remove payment method");
      }
    } catch (err) {
      toast.error(err?.message || "Failed to remove payment method");
    } finally {
      setDeletingId("");
    }
  };

  const handleAddBank = async (e) => {
    e.preventDefault();
    if (!accountDetail.accountName.trim()) {
      toast.error("Bank name is required");
      return;
    }
    try {
      setIsSubmitting(true);
      const res = await PaymentsApi(userId, accountDetail);
      if (res?.success) {
        toast.success(res.msg || "Bank account added");
        setAccountDetail({
          accountName: "",
          accountNumber: "",
          iban: "",
          bicSwift: "",
          accountNotes: "",
        });
        setModalOpen(false);
        await loadUser();
      } else {
        toast.error(res?.msg || "Failed to add bank account");
      }
    } catch (err) {
      toast.error(err?.message || "Failed to add bank account");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCardInput = (e) => {
    const { name, value } = e.target;
    let formatted = value;
    if (name === "cardNumber") {
      formatted = formatted.replace(/\D/g, "").slice(0, 16);
    } else if (name === "expiryDate") {
      formatted = formatted.replace(/\D/g, "").slice(0, 4);
      if (formatted.length > 2) formatted = `${formatted.slice(0, 2)}/${formatted.slice(2)}`;
    } else if (name === "cvv") {
      formatted = formatted.replace(/\D/g, "").slice(0, 3);
    }
    setCardForm((prev) => ({ ...prev, [name]: formatted }));
  };

  const handleAddCard = async (e) => {
    e.preventDefault();
    const errs = {};
    if (!/^\d{16}$/.test(cardForm.cardNumber)) {
      errs.cardNumber = "Card number must be 16 digits";
    }
    const cardType = getCardTypeFromNumber(cardForm.cardNumber);
    if (cardType === "other" && cardForm.cardNumber.length === 16) {
      errs.cardNumber = "Unsupported or invalid card number";
    }
    if (!cardForm.cardHolder.trim()) errs.cardHolder = "Card holder is required";
    if (!/^\d{3}$/.test(cardForm.cvv)) errs.cvv = "CVV must be 3 digits";
    if (!/^\d{2}\/\d{2}$/.test(cardForm.expiryDate)) {
      errs.expiryDate = "Expiry must be MM/YY";
    }
    setCardErrors(errs);
    if (Object.keys(errs).length > 0) return;

    try {
      setIsSubmitting(true);
      const res = await addCardApi(userId, {
        cardType,
        cardNumber: cardForm.cardNumber,
        cardName: cardForm.cardHolder,
        cardExpiry: cardForm.expiryDate,
        cardCvv: cardForm.cvv,
        cardNotes: cardForm.notes,
      });
      if (res?.success) {
        toast.success(res.msg || "Card added");
        setCardForm({ cardNumber: "", cardHolder: "", expiryDate: "", cvv: "", notes: "" });
        setModalOpen(false);
        await loadUser();
      } else {
        toast.error(res?.msg || "Failed to add card");
      }
    } catch (err) {
      toast.error(err?.message || "Failed to add card");
    } finally {
      setIsSubmitting(false);
    }
  };

  const allPayments = Array.isArray(isUser?.payments) ? isUser.payments : [];
  const bankAccounts = allPayments.filter(
    (item) => item?.type === "bank" || (!item?.type && (item?.bank || item?.accountName))
  );
  const savedCards = allPayments.filter(
    (item) => item?.type === "card" || (!item?.type && item?.card)
  );

  return (
    <UserPortalShell title="Payment Methods">
      <div className="space-y-6 w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight m-0">
              Payment Methods
            </h1>
            <p className="text-sm text-slate-500 mt-1 mb-0">
              Manage your linked bank accounts and cards for seamless fiat deposits and withdrawals.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => {
                setModalTab("bank");
                setModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold border-0 shadow-sm cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4" /> Add Bank Account
            </button>
            <button
              type="button"
              onClick={() => {
                setModalTab("card");
                setModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-200 shadow-xs cursor-pointer transition-colors"
            >
              <CreditCard className="w-4 h-4 text-blue-600" /> Add Card
            </button>
          </div>
        </div>

        {isLoading ? (
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card py-20 flex flex-col items-center justify-center text-slate-500">
            <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin mb-3" />
            <p className="text-sm m-0">Loading payment methods...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Bank Accounts Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                    <Landmark className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900 m-0">
                      Bank Accounts
                    </h2>
                    <p className="text-xs text-slate-500 m-0">
                      {bankAccounts.length} linked {bankAccounts.length === 1 ? "account" : "accounts"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-4">
                {bankAccounts.length === 0 ? (
                  <div className="py-10 text-center">
                    <p className="text-sm font-medium text-slate-500 m-0">
                      No bank accounts added yet.
                    </p>
                  </div>
                ) : (
                  bankAccounts.map((item) => {
                    const bank = item.bank || item;
                    return (
                      <div
                        key={item._id}
                        className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 flex items-start justify-between gap-4 hover:border-blue-200 transition-colors"
                      >
                        <div className="space-y-1.5 text-sm min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-blue-50 text-blue-700 border border-blue-100">
                              Bank Account
                            </span>
                            {bank.createdAt && (
                              <span className="text-[11px] text-slate-400">
                                Added {new Date(bank.createdAt).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                          <p className="font-bold text-slate-900 m-0 text-base">
                            {bank.accountName || "Linked Bank Account"}
                          </p>
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 pt-1 text-xs">
                            {bank.accountNumber && (
                              <p className="text-slate-600 m-0">
                                <span className="text-slate-400 font-medium">Account: </span>
                                <span className="font-mono font-semibold text-slate-800">
                                  {bank.accountNumber}
                                </span>
                              </p>
                            )}
                            {bank.iban && (
                              <p className="text-slate-600 m-0 break-all">
                                <span className="text-slate-400 font-medium">IBAN: </span>
                                <span className="font-mono font-semibold text-slate-800">
                                  {bank.iban}
                                </span>
                              </p>
                            )}
                            {bank.bicSwift && (
                              <p className="text-slate-600 m-0">
                                <span className="text-slate-400 font-medium">BIC / SWIFT: </span>
                                <span className="font-mono font-semibold text-slate-800">
                                  {bank.bicSwift}
                                </span>
                              </p>
                            )}
                          </div>
                          {bank.accountNotes && (
                            <p className="text-xs text-slate-500 italic m-0 pt-1">
                              {bank.accountNotes}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          disabled={deletingId === item._id}
                          onClick={() => handleDelete(item._id)}
                          className="p-2 rounded-lg text-rose-500 hover:text-rose-700 hover:bg-rose-50 border-0 bg-transparent cursor-pointer shrink-0"
                          title="Remove account"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Cards Card */}
            <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
                    <CreditCard className="w-4 h-4" />
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-slate-900 m-0">
                      Credit &amp; Debit Cards
                    </h2>
                    <p className="text-xs text-slate-500 m-0">
                      {savedCards.length} linked {savedCards.length === 1 ? "card" : "cards"}
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-6 space-y-4">
                {savedCards.length === 0 ? (
                  <div className="py-10 text-center">
                    <p className="text-sm font-medium text-slate-500 m-0">
                      No payment cards added yet.
                    </p>
                  </div>
                ) : (
                  savedCards.map((item, idx) => {
                    const card = item.card || item;
                    return (
                      <div
                        key={item._id || idx}
                        className="rounded-xl border border-slate-200 bg-gradient-to-br from-slate-900 to-slate-800 text-white p-5 space-y-3"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold uppercase tracking-wider text-blue-300">
                            {card.cardCategory || card.cardType || "Card"}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 text-[11px] text-emerald-300 font-semibold">
                              <ShieldCheck className="w-3.5 h-3.5" /> Encrypted
                            </span>
                            <button
                              type="button"
                              disabled={deletingId === item._id}
                              onClick={() => handleDelete(item._id)}
                              className="p-1.5 rounded-lg text-rose-300 hover:text-white hover:bg-rose-500/30 border-0 bg-transparent cursor-pointer"
                              title="Remove card"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <p className="text-base font-mono tracking-widest m-0">
                          •••• •••• •••• {String(card.cardNumber || "").slice(-4)}
                        </p>
                        <div className="flex items-center justify-between text-xs text-slate-300 pt-1">
                          <span className="font-semibold uppercase">
                            {card.cardName || "Cardholder"}
                          </span>
                          <span>
                            {card.cardExpiry
                              ? `Exp: ${card.cardExpiry}`
                              : card.createdAt
                                ? new Date(card.createdAt).toLocaleDateString()
                                : ""}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Add Payment Method Modal */}
      {modalOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 m-0">
                Add Payment Method
              </h3>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center border-0 bg-transparent cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="px-6 pt-4">
              <div className="grid grid-cols-2 gap-2 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setModalTab("bank")}
                  className={`py-2 rounded-lg text-xs font-bold border-0 cursor-pointer transition-all ${
                    modalTab === "bank"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-transparent text-slate-600"
                  }`}
                >
                  Bank Account
                </button>
                <button
                  type="button"
                  onClick={() => setModalTab("card")}
                  className={`py-2 rounded-lg text-xs font-bold border-0 cursor-pointer transition-all ${
                    modalTab === "card"
                      ? "bg-blue-600 text-white shadow-xs"
                      : "bg-transparent text-slate-600"
                  }`}
                >
                  Credit / Debit Card
                </button>
              </div>
            </div>

            {modalTab === "bank" ? (
              <form onSubmit={handleAddBank} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Bank Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={accountDetail.accountName}
                    onChange={(e) =>
                      setAccountDetail((p) => ({ ...p, accountName: e.target.value }))
                    }
                    placeholder="e.g. BNP Paribas, Revolut, Wise"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500"
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Account Number
                    </label>
                    <input
                      type="text"
                      value={accountDetail.accountNumber}
                      onChange={(e) =>
                        setAccountDetail((p) => ({ ...p, accountNumber: e.target.value }))
                      }
                      placeholder="Account number"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      BIC / SWIFT
                    </label>
                    <input
                      type="text"
                      value={accountDetail.bicSwift}
                      onChange={(e) =>
                        setAccountDetail((p) => ({ ...p, bicSwift: e.target.value }))
                      }
                      placeholder="BIC / SWIFT code"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    IBAN
                  </label>
                  <input
                    type="text"
                    value={accountDetail.iban}
                    onChange={(e) =>
                      setAccountDetail((p) => ({ ...p, iban: e.target.value }))
                    }
                    placeholder="FR76 ..."
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 font-mono focus:outline-none focus:bg-white focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Notes (Optional)
                  </label>
                  <input
                    type="text"
                    value={accountDetail.accountNotes}
                    onChange={(e) =>
                      setAccountDetail((p) => ({ ...p, accountNotes: e.target.value }))
                    }
                    placeholder="Reference note"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500"
                  />
                </div>
                <div className="flex justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border-0 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-bold border-0 cursor-pointer"
                  >
                    {isSubmitting ? "Saving..." : "Save Bank Account"}
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleAddCard} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Card Number *
                  </label>
                  <input
                    type="text"
                    name="cardNumber"
                    value={cardForm.cardNumber}
                    onChange={handleCardInput}
                    placeholder="16-digit card number"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 font-mono focus:outline-none focus:bg-white focus:border-blue-500"
                  />
                  {cardErrors.cardNumber && (
                    <p className="text-xs text-rose-600 mt-1 mb-0">{cardErrors.cardNumber}</p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Cardholder Name *
                  </label>
                  <input
                    type="text"
                    name="cardHolder"
                    value={cardForm.cardHolder}
                    onChange={handleCardInput}
                    placeholder="Name on card"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 focus:outline-none focus:bg-white focus:border-blue-500"
                  />
                  {cardErrors.cardHolder && (
                    <p className="text-xs text-rose-600 mt-1 mb-0">{cardErrors.cardHolder}</p>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Expiry (MM/YY) *
                    </label>
                    <input
                      type="text"
                      name="expiryDate"
                      value={cardForm.expiryDate}
                      onChange={handleCardInput}
                      placeholder="MM/YY"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 font-mono focus:outline-none focus:bg-white focus:border-blue-500"
                    />
                    {cardErrors.expiryDate && (
                      <p className="text-xs text-rose-600 mt-1 mb-0">{cardErrors.expiryDate}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      CVV *
                    </label>
                    <input
                      type="password"
                      name="cvv"
                      value={cardForm.cvv}
                      onChange={handleCardInput}
                      placeholder="•••"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 font-mono focus:outline-none focus:bg-white focus:border-blue-500"
                    />
                    {cardErrors.cvv && (
                      <p className="text-xs text-rose-600 mt-1 mb-0">{cardErrors.cvv}</p>
                    )}
                  </div>
                </div>
                <div className="flex justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border-0 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-bold border-0 cursor-pointer"
                  >
                    {isSubmitting ? "Saving..." : "Save Card"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </UserPortalShell>
  );
}
