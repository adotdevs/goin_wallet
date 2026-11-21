import React, { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
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
  ExternalLink,
  CheckCircle2,
  CreditCard,
  Home,
} from "lucide-react";
import {
  deleteKycDocumentApi,
  getKycDocumentApi,
  patchCoinsApi,
  signleUsersApi,
  updateKycApi,
} from "../../../../../Api/Service";
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

  const loadUser = async () => {
    try {
      const res = await signleUsersApi(id);
      if (res?.success) {
        setUserData(res.signleUser || {});
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

  const handleUpdateKyc = async (approve) => {
    try {
      setBusy(true);
      const res = await updateKycApi(id, { kyc: approve });
      await patchCoinsApi(id).catch(() => {});
      if (res?.success) {
        toast.success(res.msg || (approve ? "KYC Approved" : "KYC Updated"));
        clearHubCache(id);
        await loadUser();
        if (typeof onUpdated === "function") onUpdated();
      } else {
        toast.error(res?.msg || "Failed to update KYC");
        setBusy(false);
      }
    } catch (err) {
      toast.error(err?.message || "Failed to update KYC");
      setBusy(false);
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

          <div className={mm.kycHeroActions}>
            {!isVerified ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => handleUpdateKyc(true)}
                className={mm.btnSuccess}
              >
                <CheckCircle2 size={15} /> {busy ? "Saving..." : "Approve KYC"}
              </button>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={() => handleUpdateKyc(false)}
                className={mm.btnDangerSoft}
              >
                <XCircle size={15} /> {busy ? "Saving..." : "Revoke KYC"}
              </button>
            )}
            <Link to={`/admin/kyc/users/${id}`} className={mm.btnGhost}>
              <ExternalLink size={14} /> Full KYC &amp; Signing Console
            </Link>
          </div>
        </div>
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
