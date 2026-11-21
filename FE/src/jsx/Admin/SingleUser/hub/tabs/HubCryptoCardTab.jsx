import React, { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { CreditCard, CheckCircle2, Power, Save, Edit3 } from "lucide-react";
import {
  signleUsersApi,
  userCryptoCardApi,
  userCryptoCardStatusApi,
} from "../../../../../Api/Service";
import { clearHubCache } from "../hubCache";
import mm from "../MemberHub.module.css";

const formatCardNumber = (value) => {
  if (!value) return "";
  return String(value).replace(/\D/g, "").slice(0, 16).replace(/(.{4})/g, "$1 ").trim();
};

export default function HubCryptoCardTab() {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [userData, setUserData] = useState(null);
  const [form, setForm] = useState({
    cardNumber: "",
    cardHolder: "",
    expiryDate: "",
    cvv: "",
  });
  const [errors, setErrors] = useState({});

  const loadUser = useCallback(async () => {
    try {
      setLoading(true);
      const res = await signleUsersApi(id);
      if (res?.success) {
        const u = res.signleUser;
        setUserData(u);
        const c = u.cryptoCard || {};
        setForm({
          cardNumber: c.cardNumber ? formatCardNumber(c.cardNumber) : "",
          cardHolder: c.cardName || `${u.firstName || ""} ${u.lastName || ""}`.trim(),
          expiryDate: c.Exp || "",
          cvv: c.cvv ? String(c.cvv) : "",
        });
        const status = c.status || "inactive";
        setIsEditing(status !== "active" && !(status === "inactive" && c.cardNumber));
      }
    } catch {
      toast.error("Failed to load crypto card");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const card = userData?.cryptoCard || {};
  const rawStatus = card.status || "inactive";
  const hasCard = Boolean(card.cardNumber);
  const isActive = rawStatus === "active";
  const isApplied = rawStatus === "applied";

  const handleChange = (field) => (e) => {
    let v = e.target.value;
    if (field === "cardNumber") v = formatCardNumber(v);
    if (field === "expiryDate") v = v.replace(/[^\d/]/g, "").slice(0, 5);
    if (field === "cvv") v = v.replace(/\D/g, "").slice(0, 4);
    setForm((p) => ({ ...p, [field]: v }));
    setErrors((p) => ({ ...p, [field]: "" }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    const digits = form.cardNumber.replace(/\D/g, "");
    if (digits.length !== 16) errs.cardNumber = "Must be 16 digits";
    if (!form.cardHolder.trim()) errs.cardHolder = "Required";
    if (!form.expiryDate.trim()) errs.expiryDate = "Required";
    if (form.cvv.length < 3) errs.cvv = "3–4 digits";
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    try {
      setSaving(true);
      const res = await userCryptoCardApi({
        userId: id,
        cardNumber: digits,
        cardName: form.cardHolder.trim(),
        cardExpiry: form.expiryDate.trim(),
        cardCvv: form.cvv.trim(),
      });
      if (res?.success) {
        toast.success(res.msg || "Crypto card saved");
        clearHubCache(id);
        await loadUser();
        setIsEditing(false);
      } else {
        toast.error(res?.msg || "Failed to save card");
      }
    } catch (err) {
      toast.error(err?.message || "Failed to save card");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleStatus = async (nextStatus) => {
    try {
      setToggling(true);
      const res = await userCryptoCardStatusApi({ userId: id, status: nextStatus });
      if (res?.success) {
        toast.success(res.msg || `Card ${nextStatus}`);
        clearHubCache(id);
        await loadUser();
      } else {
        toast.error(res?.msg || "Failed to update card status");
      }
    } catch (err) {
      toast.error(err?.message || "Failed to update card status");
    } finally {
      setToggling(false);
    }
  };

  if (loading) {
    return (
      <div className={`${mm.card} ${mm.cardPad}`}>
        <span className={mm.skel} style={{ height: 240 }} />
      </div>
    );
  }

  return (
    <div className={mm.stack}>
      <section className={`${mm.card} ${mm.cardPad}`}>
        <div className={mm.cardHead}>
          <div className={mm.docCardTitleWrap}>
            <div className={mm.iconTile}>
              <CreditCard size={18} />
            </div>
            <div>
              <h2 className={mm.title}>Member Crypto Card</h2>
              <p className={mm.subtitle}>Issue, update, activate, or freeze the member&apos;s virtual Visa card</p>
            </div>
          </div>
          <span
            className={`${mm.badge} ${
              isActive ? mm.badgeOk : isApplied ? mm.badgeWarn : mm.badgeMuted
            }`}
          >
            {isActive
              ? "Active"
              : isApplied
                ? "Applied — Pending"
                : hasCard
                  ? "Deactivated"
                  : "Not Issued"}
          </span>
        </div>

        <div className={mm.gridEqual2}>
          {/* Visual Card */}
          <div className={mm.visaWrap}>
            <div className={`${mm.visaCard} ${!isActive && hasCard ? mm.visaDimmed : ""}`}>
              <div className={mm.visaTop}>
                <span className={mm.visaBrand}>GOin VIRTUAL</span>
                <span className={mm.visaTag}>VISA</span>
              </div>
              <div className={mm.visaNumber}>
                {form.cardNumber || "•••• •••• •••• ••••"}
              </div>
              <div className={mm.visaBottom}>
                <div>
                  <span className={mm.visaMetaLabel}>Cardholder</span>
                  <span className={mm.visaMetaVal}>
                    {(form.cardHolder || "CARDHOLDER").toUpperCase()}
                  </span>
                </div>
                <div style={{ textAlign: "right" }}>
                  <span className={mm.visaMetaLabel}>Valid Thru</span>
                  <span className={mm.visaMetaVal}>{form.expiryDate || "MM/YY"}</span>
                </div>
              </div>
            </div>

            {hasCard && (
              <div className={mm.actions}>
                {isActive ? (
                  <button
                    type="button"
                    disabled={toggling}
                    onClick={() => handleToggleStatus("inactive")}
                    className={mm.btnDangerSoft}
                  >
                    <Power size={14} /> {toggling ? "Updating..." : "Deactivate Card"}
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={toggling}
                    onClick={() => handleToggleStatus("active")}
                    className={mm.btnSuccess}
                  >
                    <CheckCircle2 size={14} /> {toggling ? "Updating..." : "Activate Card"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setIsEditing((s) => !s)}
                  className={mm.btnGhost}
                >
                  <Edit3 size={14} /> {isEditing ? "Cancel Edit" : "Edit Card Details"}
                </button>
              </div>
            )}
          </div>

          {/* Issue / Edit Form */}
          <form onSubmit={handleSubmit} className={mm.formStack}>
            <div className={mm.fieldGroup}>
              <label>Card Number (16 digits)</label>
              <input
                type="text"
                value={form.cardNumber}
                onChange={handleChange("cardNumber")}
                disabled={!isEditing && hasCard}
                placeholder="4532 0000 0000 0000"
              />
              {errors.cardNumber && <span className={mm.fieldErr}>{errors.cardNumber}</span>}
            </div>
            <div className={mm.fieldGroup}>
              <label>Cardholder Name</label>
              <input
                type="text"
                value={form.cardHolder}
                onChange={handleChange("cardHolder")}
                disabled={!isEditing && hasCard}
                placeholder="Full name"
              />
              {errors.cardHolder && <span className={mm.fieldErr}>{errors.cardHolder}</span>}
            </div>
            <div className={mm.gridEqual2}>
              <div className={mm.fieldGroup}>
                <label>Expiry (MM/YY)</label>
                <input
                  type="text"
                  value={form.expiryDate}
                  onChange={handleChange("expiryDate")}
                  disabled={!isEditing && hasCard}
                  placeholder="12/28"
                />
                {errors.expiryDate && <span className={mm.fieldErr}>{errors.expiryDate}</span>}
              </div>
              <div className={mm.fieldGroup}>
                <label>CVV</label>
                <input
                  type="text"
                  value={form.cvv}
                  onChange={handleChange("cvv")}
                  disabled={!isEditing && hasCard}
                  placeholder="123"
                />
                {errors.cvv && <span className={mm.fieldErr}>{errors.cvv}</span>}
              </div>
            </div>

            {(isEditing || !hasCard) && (
              <div style={{ display: "flex", justifyContent: "flex-end", paddingTop: 6 }}>
                <button type="submit" disabled={saving} className={mm.btn}>
                  <Save size={14} /> {saving ? "Saving..." : hasCard ? "Save Card Changes" : "Issue & Activate Card"}
                </button>
              </div>
            )}
          </form>
        </div>
      </section>
    </div>
  );
}
