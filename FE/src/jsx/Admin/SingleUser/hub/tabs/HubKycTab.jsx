import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import {
  ShieldCheck,
  Clock,
  XCircle,
  AlertCircle,
  Download,
  Trash2,
  Eye,
  X,
  FileText,
  CheckCircle2,
  CreditCard,
  Home,
  Lock,
  Unlock,
} from "lucide-react";
import {
  deleteKycDocumentApi,
  getKycDocumentApi,
  patchCoinsApi,
  signleUsersApi,
  updateKycApi,
} from "../../../../../Api/Service";
import { kycBlob, kycFetch } from "../../../../pages/kycPortal/kycApi";
import {
  getKycDocumentPreviewUrl,
  isCloudinaryPdfUrl,
} from "../../../../../utils/cloudinaryKyc";
import { clearHubCache } from "../hubCache";
import mm from "../MemberHub.module.css";

export default function HubKycTab({ onUpdated }) {
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [userData, setUserData] = useState({});
  const [previewErrors, setPreviewErrors] = useState({ cnic: false, bill: false });
  const [zoomDoc, setZoomDoc] = useState(null);
  const [rejectionNote, setRejectionNote] = useState("");
  const [confirmKycModal, setConfirmKycModal] = useState(null);
  const [deletingHistory, setDeletingHistory] = useState(false);

  const loadUser = async () => {
    try {
      const [res, kycPortalRes] = await Promise.all([
        signleUsersApi(id),
        kycFetch(`/api/users/${id}`, { cache: "no-store" }).catch(() => null),
      ]);
      let mergedUser = res?.signleUser || {};
      if (kycPortalRes && kycPortalRes.ok) {
        const kycData = await kycPortalRes.json().catch(() => ({}));
        if (kycData?.success && kycData?.user) {
          mergedUser = {
            ...mergedUser,
            ...kycData.user,
            submitDoc: {
              ...(mergedUser.submitDoc || {}),
              ...(kycData.user.submitDoc || {}),
            },
            fiscalProfile:
              mergedUser.fiscalProfile || kycData.user.fiscalProfile,
          };
        }
      }
      if (res?.success || mergedUser?._id) {
        setUserData(mergedUser);
      } else if (res?.msg) {
        toast.error(res.msg);
      }
    } catch (err) {
      toast.error(err?.message || "Failed to load KYC data");
    } finally {
      setLoading(false);
      setBusy(false);
    }
  };

  useEffect(() => {
    loadUser();
  }, [id]);

  const handleExecuteKycDecision = async (action, customReason) => {
    try {
      setBusy(true);
      const approve = action === "approve";
      const kycRes = await kycFetch(`/api/kyc/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          reason:
            action === "reject"
              ? customReason ||
                rejectionNote.trim() ||
                "Your KYC documents were reviewed and rejected by compliance. Please upload valid, legible, and unexpired documents."
              : undefined,
        }),
      }).catch(() => null);

      if (kycRes && kycRes.ok) {
        const data = await kycRes.json();
        await patchCoinsApi(id).catch(() => {});
        toast.success(data?.msg || (approve ? "KYC Approved" : "KYC Rejected"));
      } else {
        const res = await updateKycApi(id, { kyc: approve });
        await patchCoinsApi(id).catch(() => {});
        if (!res?.success) {
          toast.error(res?.msg || "Failed to update KYC");
          setBusy(false);
          return;
        }
        toast.success(res.msg || (approve ? "KYC Approved" : "KYC Updated"));
      }

      setRejectionNote("");
      setConfirmKycModal(null);
      clearHubCache(id);
      await loadUser();
      if (typeof onUpdated === "function") onUpdated();
    } catch (err) {
      toast.error(err?.message || "Failed to update KYC");
      setBusy(false);
    }
  };

  const handleToggleComplianceLock = async () => {
    try {
      setBusy(true);
      const nextVal = !userData?.isComplianceRestricted;
      const res = await kycFetch(`/api/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isComplianceRestricted: nextVal }),
      });
      const data = await res.json();
      if (data?.success) {
        toast.info(
          nextVal
            ? "Client account restricted for compliance review"
            : "Compliance restriction lifted"
        );
        await loadUser();
      } else {
        toast.error(data?.msg || "Failed to update compliance lock");
        setBusy(false);
      }
    } catch {
      toast.error("Failed to update compliance lock");
      setBusy(false);
    }
  };

  const handleDeleteHistoryEntry = async (index, historyId) => {
    if (
      !window.confirm(
        "Delete this historical KYC record permanently from the audit log?"
      )
    )
      return;
    try {
      setDeletingHistory(true);
      const query = historyId
        ? `historyId=${historyId}`
        : `historyIndex=${index}`;
      const res = await kycFetch(`/api/kyc/${id}?${query}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data?.success) {
        toast.success(data.msg || "History record deleted");
        await loadUser();
      } else {
        toast.error(data?.msg || "Failed to delete history record");
      }
    } catch {
      toast.error("Failed to delete history record");
    } finally {
      setDeletingHistory(false);
    }
  };

  const handleClearAllHistory = async () => {
    if (
      !window.confirm(
        "Clear ALL document upload and decision history records for this client?"
      )
    )
      return;
    try {
      setDeletingHistory(true);
      const res = await kycFetch(`/api/kyc/${id}?clearHistory=true`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data?.success) {
        toast.success(data.msg || "All history records cleared");
        await loadUser();
      } else {
        toast.error(data?.msg || "Failed to clear history");
      }
    } catch {
      toast.error("Failed to clear history");
    } finally {
      setDeletingHistory(false);
    }
  };

  const handleOpenHistoryFile = async (docType, idx, download = false) => {
    try {
      const path = `/api/kyc/${id}/${docType}?history=${idx}${download ? "&download=1" : ""}`;
      const blob = await kycBlob(path);
      const url = URL.createObjectURL(blob);
      if (!download) {
        window.open(url, "_blank", "noopener,noreferrer");
        return;
      }
      const a = document.createElement("a");
      a.href = url;
      a.download = `${userData.firstName || "client"}-${docType}-history-${idx + 1}`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Could not load historical document");
    }
  };

  const handleDeleteDoc = async (docType) => {
    const label = docType === "cnic" ? "Government ID" : "Proof of Address";
    if (!window.confirm(`Delete ${label}? This removes the file permanently.`)) return;
    try {
      setBusy(true);
      const res = await deleteKycDocumentApi(id, docType);
      if (res?.success) {
        toast.success(res.msg || `${label} deleted`);
        setPreviewErrors((prev) => ({ ...prev, [docType]: false }));
        clearHubCache(id);
        await loadUser();
      } else {
        toast.error(res?.msg || "Failed to delete document");
        setBusy(false);
      }
    } catch (err) {
      toast.error(err?.message || "Failed to delete document");
      setBusy(false);
    }
  };

  const handleDownloadPdf = (docType, filename) => {
    getKycDocumentApi(id, docType).then((response) => {
      const blobData = response?.data;
      if (!(blobData instanceof Blob)) return;
      const blob =
        blobData.type === "application/pdf"
          ? blobData
          : new Blob([blobData], { type: "application/pdf" });
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = `${filename}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    });
  };

  if (loading) {
    return (
      <div className={`${mm.card} ${mm.cardPad}`}>
        <span className={mm.skel} style={{ height: 240 }} />
      </div>
    );
  }

  const isVerified = userData?.kyc === true;
  const docStatus = userData?.submitDoc?.status;
  const isPending = !isVerified && docStatus === "completed";
  const isRejected = !isVerified && docStatus === "rejected";
  const submitDoc = userData?.submitDoc || {};

  const renderDocCard = ({ title, subtitle, url, docType, fileLabel, Icon }) => {
    const hasUrl = Boolean(url);
    const isPdf = hasUrl && isCloudinaryPdfUrl(url);
    const previewUrl = hasUrl ? (isPdf ? getKycDocumentPreviewUrl(url) : url) : "";
    const hasErr = previewErrors[docType];

    return (
      <div className={mm.docCard}>
        <div className={mm.docCardHead}>
          <div className={mm.docCardTitleWrap}>
            <div className={mm.iconTile}>
              <Icon size={18} />
            </div>
            <div>
              <h3 className={mm.title}>{title}</h3>
              <p className={mm.subtitle}>{subtitle}</p>
            </div>
          </div>
          <span
            className={`${mm.badge} ${hasUrl ? mm.badgeOk : mm.badgeMuted}`}
          >
            {hasUrl ? "Uploaded" : "Not Uploaded"}
          </span>
        </div>

        <div className={mm.docPreviewBox}>
          {!hasUrl ? (
            <div className={mm.docEmpty}>
              <FileText size={28} />
              <span>No document submitted yet</span>
            </div>
          ) : hasErr ? (
            <div className={mm.docEmpty}>
              <FileText size={28} />
              <span>Preview unavailable — use download below</span>
            </div>
          ) : (
            <img
              src={previewUrl}
              alt={title}
              className={mm.docPreviewImg}
              onClick={() => setZoomDoc({ title, url: previewUrl, rawUrl: url, isPdf })}
              onError={() => setPreviewErrors((p) => ({ ...p, [docType]: true }))}
            />
          )}
        </div>

        {hasUrl && (
          <div className={mm.docCardFoot}>
            <button
              type="button"
              className={mm.btnGhost}
              onClick={() => setZoomDoc({ title, url: previewUrl, rawUrl: url, isPdf })}
            >
              <Eye size={14} /> Preview
            </button>
            {isPdf ? (
              <button
                type="button"
                className={mm.btnGhost}
                onClick={() => handleDownloadPdf(docType, fileLabel)}
              >
                <Download size={14} /> Download PDF
              </button>
            ) : (
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className={mm.btnGhost}
              >
                <Download size={14} /> Open Original
              </a>
            )}
            <button
              type="button"
              disabled={busy}
              className={mm.btnDangerSoft}
              onClick={() => handleDeleteDoc(docType)}
            >
              <Trash2 size={14} /> Delete
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={mm.stack}>
      {/* KYC Decision Hero Card */}
      <section className={`${mm.card} ${mm.cardPad}`}>
        <div className={mm.kycHero}>
          <div className={mm.kycHeroLeft}>
            <div
              className={`${mm.kycHeroIcon} ${
                isVerified
                  ? mm.toneOk
                  : isPending
                    ? mm.toneWarn
                    : isRejected
                      ? mm.toneDanger
                      : mm.toneInfo
              }`}
            >
              {isVerified ? (
                <ShieldCheck size={24} />
              ) : isPending ? (
                <Clock size={24} />
              ) : isRejected ? (
                <XCircle size={24} />
              ) : (
                <AlertCircle size={24} />
              )}
            </div>
            <div>
              <div className={mm.nameRow}>
                <h2 className={mm.title} style={{ fontSize: 18 }}>
                  KYC Identity Verification
                </h2>
                <span
                  className={`${mm.badge} ${
                    isVerified
                      ? mm.badgeOk
                      : isPending
                        ? mm.badgeWarn
                        : isRejected
                          ? mm.badgeDanger
                          : mm.badgeMuted
                  }`}
                >
                  {isVerified
                    ? "Verified"
                    : isPending
                      ? "Pending Review"
                      : isRejected
                        ? "Rejected"
                        : "Unverified"}
                </span>
              </div>
              <p className={mm.subtitle}>
                Inspect submitted identity documents, verify residential details, and approve or revoke member KYC compliance.
              </p>
            </div>
          </div>

          <div className={mm.kycHeroActions} style={{ flexWrap: "wrap" }}>
            <input
              type="text"
              value={rejectionNote}
              onChange={(e) => setRejectionNote(e.target.value)}
              placeholder="Optional rejection / resubmission note..."
              className={mm.input}
              style={{ width: 240, height: 38, fontSize: 12 }}
            />
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                setConfirmKycModal({
                  action: "approve",
                })
              }
              className={mm.btnSuccess}
            >
              <CheckCircle2 size={15} /> {busy ? "Saving..." : "Approve KYC"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                setConfirmKycModal({
                  action: "reject",
                  reason:
                    rejectionNote.trim() ||
                    "Your KYC documents were reviewed and rejected by compliance. Please upload valid, legible, and unexpired documents.",
                })
              }
              className={mm.btnDangerSoft}
            >
              <XCircle size={15} /> {busy ? "Saving..." : "Reject / Set Unverified"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={handleToggleComplianceLock}
              className={
                userData?.isComplianceRestricted ? mm.btnDangerSoft : mm.btnGhost
              }
            >
              {userData?.isComplianceRestricted ? (
                <>
                  <Lock size={14} /> Restricted (Unlock)
                </>
              ) : (
                <>
                  <Unlock size={14} /> Compliance Active
                </>
              )}
            </button>
          </div>
        </div>

        {isRejected && submitDoc.rejectionReason && (
          <div
            style={{
              marginTop: 14,
              padding: "12px 16px",
              borderRadius: 10,
              background: "var(--admin-danger-soft, rgba(225, 29, 72, 0.12))",
              border: "1px solid rgba(225, 29, 72, 0.28)",
              fontSize: 13,
            }}
          >
            <strong style={{ color: "var(--admin-danger, #fb7185)" }}>
              Recorded Rejection Reason:{" "}
            </strong>
            <span>{submitDoc.rejectionReason}</span>
          </div>
        )}
      </section>

      {/* Submitted Identity Details */}
      <section className={`${mm.card} ${mm.cardPad}`}>
        <div className={mm.cardHead}>
          <div>
            <h3 className={mm.title}>Identity &amp; Residential Details</h3>
            <p className={mm.subtitle}>Information declared by the client during onboarding</p>
          </div>
        </div>
        <dl className={mm.dl4}>
          <div>
            <dt>Document Type</dt>
            <dd style={{ textTransform: "capitalize" }}>
              {String(submitDoc.idType || "—").replace(/_/g, " ")}
            </dd>
          </div>
          <div>
            <dt>Document / ID Number</dt>
            <dd>{submitDoc.idNumber || "—"}</dd>
          </div>
          <div>
            <dt>Date of Birth</dt>
            <dd>{submitDoc.dateOfBirth || "—"}</dd>
          </div>
          <div>
            <dt>Nationality</dt>
            <dd>{submitDoc.nationality || userData.country || "—"}</dd>
          </div>
          <div>
            <dt>Street Address</dt>
            <dd>{userData.address || "—"}</dd>
          </div>
          <div>
            <dt>City</dt>
            <dd>{userData.city || "—"}</dd>
          </div>
          <div>
            <dt>Postal Code</dt>
            <dd>{userData.postalCode || "—"}</dd>
          </div>
          <div>
            <dt>Country</dt>
            <dd>{userData.country || "—"}</dd>
          </div>
        </dl>
      </section>

      {/* Fiscal & Financial Profile (from Signup Onboarding) */}
      {userData?.fiscalProfile?.occupation && (
        <section className={`${mm.card} ${mm.cardPad}`}>
          <div className={mm.cardHead}>
            <div>
              <h3 className={mm.title}>Fiscal &amp; Financial Profile</h3>
              <p className={mm.subtitle}>
                AML / KYC declaration submitted during registration onboarding
              </p>
            </div>
            <span
              className={`${mm.badge} ${
                userData?.signupKycCompleted ? mm.badgeOk : mm.badgeWarn
              }`}
            >
              {userData?.signupKycCompleted
                ? "100% Banking Check Completed"
                : "Verification In Progress"}
            </span>
          </div>
          <dl className={mm.dl4}>
            <div>
              <dt>Profession / Status</dt>
              <dd style={{ textTransform: "capitalize" }}>
                {String(userData.fiscalProfile.occupation || "—").replace(/_/g, " ")}
              </dd>
            </div>
            <div>
              <dt>Employer</dt>
              <dd>{userData.fiscalProfile.employer || "—"}</dd>
            </div>
            <div>
              <dt>Annual Gross Income (€)</dt>
              <dd>{userData.fiscalProfile.incomeRange || "—"}</dd>
            </div>
            <div>
              <dt>Estimated Net Worth (€)</dt>
              <dd>{userData.fiscalProfile.wealthRange || "—"}</dd>
            </div>
            <div>
              <dt>Source of Funds</dt>
              <dd style={{ textTransform: "capitalize" }}>
                {String(userData.fiscalProfile.fundSource || "—").replace(/_/g, " ")}
              </dd>
            </div>
            <div>
              <dt>Investment Experience</dt>
              <dd style={{ textTransform: "capitalize" }}>
                {userData.fiscalProfile.investmentExperience || "—"}
              </dd>
            </div>
            <div>
              <dt>Crypto Experience</dt>
              <dd style={{ textTransform: "capitalize" }}>
                {userData.fiscalProfile.cryptoExperience || "—"}
              </dd>
            </div>
            <div>
              <dt>Tax Residence</dt>
              <dd>{userData.fiscalProfile.taxResidence || "—"}</dd>
            </div>
            <div>
              <dt>Foreign Bank Accounts</dt>
              <dd>{userData.fiscalProfile.hasForeignAccounts ? "Yes" : "No"}</dd>
            </div>
            <div>
              <dt>Politically Exposed (PEP)</dt>
              <dd>{userData.fiscalProfile.isPoliticallyExposed ? "Yes" : "No"}</dd>
            </div>
          </dl>
        </section>
      )}

      {/* Uploaded KYC Documents Grid */}
      <div className={mm.gridEqual2}>
        {renderDocCard({
          title: "Government-Issued Photo ID",
          subtitle: "Passport, National ID Card, or Driver's License",
          url: submitDoc.cnic,
          docType: "cnic",
          fileLabel: `${userData.firstName || "user"}-government-id`,
          Icon: CreditCard,
        })}
        {renderDocCard({
          title: "Proof of Residential Address",
          subtitle: "Utility Bill, Bank Statement, or Tax Notice",
          url: submitDoc.bill,
          docType: "bill",
          fileLabel: `${userData.firstName || "user"}-proof-of-address`,
          Icon: Home,
        })}
      </div>

      {/* Document Upload & Decision Audit History */}
      <section className={`${mm.card} ${mm.cardPad}`}>
        <div className={mm.cardHead}>
          <div className={mm.docCardTitleWrap}>
            <div className={mm.iconTile}>
              <Clock size={18} />
            </div>
            <div>
              <h3 className={mm.title}>
                Document Upload &amp; Decision History ({userData?.kycHistory?.length || 0})
              </h3>
              <p className={mm.subtitle}>
                Audit trail of previous KYC submissions, uploaded documents, and compliance decisions
              </p>
            </div>
          </div>
          {Array.isArray(userData?.kycHistory) && userData.kycHistory.length > 0 && (
            <button
              type="button"
              disabled={deletingHistory}
              onClick={handleClearAllHistory}
              className={mm.btnDangerSoft}
            >
              <Trash2 size={14} /> Clear All History
            </button>
          )}
        </div>

        {!Array.isArray(userData?.kycHistory) || userData.kycHistory.length === 0 ? (
          <div className={mm.empty}>
            No previous submission or decision history recorded for this client.
          </div>
        ) : (
          <div className={mm.stack} style={{ gap: 12 }}>
            {userData.kycHistory.map((item, idx) => (
              <div
                key={item._id || idx}
                style={{
                  padding: 16,
                  borderRadius: 12,
                  background: "var(--admin-surface-2, #1a1f28)",
                  border: "1px solid var(--admin-border-strong, rgba(255,255,255,0.12))",
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 8,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span
                      className={`${mm.badge} ${
                        item.decision === "approved" ? mm.badgeOk : mm.badgeDanger
                      }`}
                    >
                      {item.decision === "approved" ? "Approved" : "Rejected"}
                    </span>
                    <span className={mm.subtitle}>
                      Decision Date:{" "}
                      <strong style={{ color: "var(--admin-text-primary)" }}>
                        {item.decidedAt ? new Date(item.decidedAt).toLocaleString() : "N/A"}
                      </strong>
                    </span>
                    {item.decidedByName && (
                      <span className={mm.subtitle}>by {item.decidedByName}</span>
                    )}
                  </div>

                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {item.submittedAt && (
                      <span className={mm.subtitle}>
                        Submitted: {new Date(item.submittedAt).toLocaleDateString()}
                      </span>
                    )}
                    <button
                      type="button"
                      disabled={deletingHistory}
                      onClick={() => handleDeleteHistoryEntry(idx, item._id)}
                      className={mm.btnDangerSoft}
                      style={{ height: 30, padding: "0 10px" }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {item.rejectionReason && (
                  <div
                    style={{
                      padding: "8px 12px",
                      borderRadius: 8,
                      background: "var(--admin-danger-soft, rgba(225, 29, 72, 0.1))",
                      fontSize: 12.5,
                    }}
                  >
                    <strong>Note / Reason:</strong> {item.rejectionReason}
                  </div>
                )}

                <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                  {item.cnic && (
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => handleOpenHistoryFile("cnic", idx, false)}
                        className={mm.btnGhost}
                        style={{ height: 32, padding: "0 12px", fontSize: 12 }}
                      >
                        <CreditCard size={13} /> View Archived ID
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenHistoryFile("cnic", idx, true)}
                        className={mm.btnGhost}
                        style={{ height: 32, padding: "0 12px", fontSize: 12 }}
                      >
                        <Download size={13} /> Download ID
                      </button>
                    </div>
                  )}
                  {item.bill && (
                    <div style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
                      <button
                        type="button"
                        onClick={() => handleOpenHistoryFile("bill", idx, false)}
                        className={mm.btnGhost}
                        style={{ height: 32, padding: "0 12px", fontSize: 12 }}
                      >
                        <Home size={13} /> View Archived Bill
                      </button>
                      <button
                        type="button"
                        onClick={() => handleOpenHistoryFile("bill", idx, true)}
                        className={mm.btnGhost}
                        style={{ height: 32, padding: "0 12px", fontSize: 12 }}
                      >
                        <Download size={13} /> Download Bill
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Confirm KYC Approve / Reject Modal */}
      {confirmKycModal && (
        <div className={mm.modalOverlay} onClick={() => setConfirmKycModal(null)}>
          <div
            className={mm.modalBox}
            style={{ maxWidth: 480 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={mm.modalHead}>
              <h3 className={mm.title}>
                {confirmKycModal.action === "approve"
                  ? "Confirm KYC Approval"
                  : "Confirm KYC Rejection"}
              </h3>
              <button
                type="button"
                className={mm.iconClose}
                onClick={() => setConfirmKycModal(null)}
              >
                <X size={16} />
              </button>
            </div>
            <div className={mm.modalBody} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <p className={mm.subtitle} style={{ lineHeight: 1.5 }}>
                {confirmKycModal.action === "approve"
                  ? "Are you sure you want to approve this client's KYC verification? This will grant them verified compliance status and dispatch an approval email."
                  : "Are you sure you want to reject this KYC verification? The uploaded documents will be archived to history and cleared from the user's dashboard so they can upload fresh files."}
              </p>

              {confirmKycModal.action === "reject" && (
                <div>
                  <label
                    style={{
                      display: "block",
                      fontSize: 12,
                      fontWeight: 600,
                      marginBottom: 6,
                    }}
                  >
                    Rejection Reason / Guidance for Client
                  </label>
                  <textarea
                    rows={3}
                    value={confirmKycModal.reason || ""}
                    onChange={(e) =>
                      setConfirmKycModal((prev) =>
                        prev ? { ...prev, reason: e.target.value } : null
                      )
                    }
                    className={mm.textarea}
                    placeholder="Explain why the documents were rejected..."
                  />
                </div>
              )}

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setConfirmKycModal(null)}
                  className={mm.btnGhost}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() =>
                    handleExecuteKycDecision(
                      confirmKycModal.action,
                      confirmKycModal.reason
                    )
                  }
                  className={
                    confirmKycModal.action === "approve"
                      ? mm.btnSuccess
                      : mm.btnDanger
                  }
                >
                  {busy
                    ? "Processing..."
                    : confirmKycModal.action === "approve"
                      ? "Confirm & Approve"
                      : "Confirm & Reject"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox Modal */}
      {zoomDoc && (
        <div className={mm.modalOverlay} onClick={() => setZoomDoc(null)}>
          <div className={mm.modalBox} onClick={(e) => e.stopPropagation()}>
            <div className={mm.modalHead}>
              <h3 className={mm.title}>{zoomDoc.title}</h3>
              <button
                type="button"
                className={mm.iconClose}
                onClick={() => setZoomDoc(null)}
              >
                <X size={16} />
              </button>
            </div>
            <div className={mm.modalBody} style={{ textAlign: "center" }}>
              <img
                src={zoomDoc.url}
                alt={zoomDoc.title}
                style={{ maxWidth: "100%", maxHeight: "72vh", borderRadius: 10 }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
