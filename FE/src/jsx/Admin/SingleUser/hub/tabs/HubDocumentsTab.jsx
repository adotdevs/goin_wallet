import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import {
  UploadCloud,
  FileText,
  FileSignature,
  CheckCircle2,
  Clock,
  Download,
  Trash2,
  Eye,
  X,
  FolderOpen,
  Plus,
} from "lucide-react";
import {
  deleteSingleFileApi,
  getAllDataApi,
  uploadFilesApi,
} from "../../../../../Api/Service";
import { kycBlob, kycFetch } from "../../../../pages/kycPortal/kycApi";
import mm from "../MemberHub.module.css";

const E_SIGN_FOLDERS = [
  "Contracts",
  "Agreements",
  "NDAs",
  "KYC & Compliance",
  "Other",
];

export default function HubDocumentsTab() {
  const { id } = useParams();
  const inputRef = useRef(null);
  const signFileInputRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [allFiles, setAllFiles] = useState([]);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [previewFile, setPreviewFile] = useState(null);

  // E-Signature Documents State (merged from KYC & Signing system)
  const [signDocs, setSignDocs] = useState([]);
  const [loadingSignDocs, setLoadingSignDocs] = useState(true);
  const [signModalOpen, setSignModalOpen] = useState(false);
  const [signTitle, setSignTitle] = useState("");
  const [signFolder, setSignFolder] = useState("Agreements");
  const [signDescription, setSignDescription] = useState("");
  const [signContentPreview, setSignContentPreview] = useState("");
  const [signShareGlobal, setSignShareGlobal] = useState(false);
  const [signFiles, setSignFiles] = useState([]);
  const [uploadingSignDoc, setUploadingSignDoc] = useState(false);
  const [deletingSignDocId, setDeletingSignDocId] = useState("");

  const loadFiles = async () => {
    try {
      const res = await getAllDataApi(id);
      if (res?.success) {
        setAllFiles(Array.isArray(res.allFiles?.files) ? res.allFiles.files : []);
      }
    } catch (err) {
      toast.error(err?.data?.msg || err?.message || "Failed to load documents");
    } finally {
      setLoading(false);
    }
  };

  const loadSignDocuments = async () => {
    try {
      setLoadingSignDocs(true);
      const res = await kycFetch(`/api/users/${id}`, { cache: "no-store" });
      if (res.ok) {
        const data = await res.json();
        if (data?.success) {
          setSignDocs(Array.isArray(data.documents) ? data.documents : []);
        }
      }
    } catch {
      // ignore if unavailable
    } finally {
      setLoadingSignDocs(false);
    }
  };

  useEffect(() => {
    loadFiles();
    loadSignDocuments();
  }, [id]);

  const handleUploadSignDoc = async (e) => {
    e.preventDefault();
    if (signFiles.length === 0 && !signTitle.trim()) {
      toast.error("Please select a file or enter a document title");
      return;
    }
    try {
      setUploadingSignDoc(true);
      const fd = new FormData();
      fd.append("isGlobal", String(signShareGlobal));
      fd.append("userId", signShareGlobal ? "global" : id);
      fd.append("folder", signFolder);
      if (signTitle.trim()) fd.append("title", signTitle.trim());
      if (signDescription.trim()) fd.append("description", signDescription.trim());
      if (signContentPreview.trim()) {
        fd.append("documentContentPreview", signContentPreview.trim());
      }
      fd.append("requiresSignature", "true");
      signFiles.forEach((f) => fd.append("files", f));

      const res = await kycFetch("/api/documents", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        throw new Error(data?.msg || "Upload failed");
      }
      toast.success(
        data.msg || "Document uploaded and assigned for electronic signature!"
      );
      setSignFiles([]);
      setSignTitle("");
      setSignDescription("");
      setSignContentPreview("");
      setSignShareGlobal(false);
      setSignModalOpen(false);
      await loadSignDocuments();
    } catch (err) {
      toast.error(err?.message || "Failed to upload E-Signature document");
    } finally {
      setUploadingSignDoc(false);
    }
  };

  const handleDeleteSignDoc = async (docId) => {
    if (!window.confirm("Delete this E-Signature document permanently?")) return;
    try {
      setDeletingSignDocId(docId);
      const res = await kycFetch(`/api/documents/${docId}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (data?.success) {
        toast.success("E-Signature document deleted");
        await loadSignDocuments();
      } else {
        toast.error(data?.msg || "Failed to delete document");
      }
    } catch {
      toast.error("Failed to delete document");
    } finally {
      setDeletingSignDocId("");
    }
  };

  const handleOpenSignDocPdf = async (doc, inline = false) => {
    try {
      const path = `/api/documents/${doc._id}/download${inline ? "?inline=1" : ""}`;
      const blob = await kycBlob(path);
      const url = URL.createObjectURL(blob);
      if (inline) {
        window.open(url, "_blank", "noopener,noreferrer");
        return;
      }
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.fileName || `${doc.title || "document"}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch {
      toast.error("Could not open PDF document");
    }
  };

  const handleSelectFiles = (e) => {
    const incoming = Array.from(e.target.files || []);
    if (!incoming.length) return;
    setPendingFiles((prev) => [...prev, ...incoming]);
    e.target.value = "";
  };

  const handleUpload = async () => {
    if (pendingFiles.length === 0) {
      toast.error("Select at least one file to upload");
      return;
    }
    try {
      setUploading(true);
      const fd = new FormData();
      pendingFiles.forEach((file, idx) => fd.append(`file_${idx + 1}`, file));
      const res = await uploadFilesApi(id, fd);
      if (res?.success) {
        toast.success(res.msg || "Files uploaded successfully");
        setPendingFiles([]);
        await loadFiles();
      } else {
        toast.error(res?.msg || "Upload failed");
      }
    } catch (err) {
      toast.error(err?.data?.msg || err?.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (fileId) => {
    if (!window.confirm("Delete this file permanently?")) return;
    try {
      setDeletingId(fileId);
      const res = await deleteSingleFileApi(fileId);
      if (res?.success) {
        toast.success(res.msg || "File deleted");
        await loadFiles();
      } else {
        toast.error(res?.msg || "Failed to delete file");
      }
    } catch (err) {
      toast.error(err?.data?.msg || err?.message || "Failed to delete file");
    } finally {
      setDeletingId("");
    }
  };

  const handleDownload = async (file) => {
    try {
      const response = await fetch(file.url);
      const blob = await response.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = file.public_id || file.name || "document";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch {
      window.open(file.url, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className={mm.stack}>
      {/* E-Signature Contracts & Agreements Section (Merged KYC & E-Sign System) */}
      <section className={`${mm.card} ${mm.cardPad}`}>
        <div className={mm.cardHead}>
          <div className={mm.docCardTitleWrap}>
            <div className={mm.iconTile}>
              <FileSignature size={18} />
            </div>
            <div>
              <h2 className={mm.title}>
                E-Signature Documents &amp; Contracts ({signDocs.length})
              </h2>
              <p className={mm.subtitle}>
                Assign contracts, agreements, or compliance PDFs for the client to electronically sign online
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setSignModalOpen(true)}
            className={mm.btn}
          >
            <Plus size={15} /> Upload Document for E-Signature
          </button>
        </div>

        {loadingSignDocs ? (
          <span className={mm.skel} style={{ height: 180 }} />
        ) : signDocs.length === 0 ? (
          <div className={mm.empty}>
            No E-Signature documents assigned to this member yet. Click &ldquo;Upload Document for E-Signature&rdquo; above to assign a contract or agreement.
          </div>
        ) : (
          <div className={mm.fileGrid}>
            {signDocs.map((doc) => {
              const isSigned = doc.status === "signed" && doc.signature;
              return (
                <div
                  key={doc._id}
                  className={mm.fileCard}
                  style={{
                    padding: 16,
                    display: "flex",
                    flexDirection: "column",
                    justifyContent: "space-between",
                    gap: 14,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
                    <div style={{ minWidth: 0 }}>
                      <p className={mm.fileCardName} style={{ fontSize: 14, marginBottom: 4 }}>
                        {doc.title}
                      </p>
                      <p className={mm.subtitle} style={{ fontSize: 12 }}>
                        {doc.folder || "Agreements"} •{" "}
                        {doc.createdAt
                          ? new Date(doc.createdAt).toLocaleDateString()
                          : "—"}
                      </p>
                    </div>
                    <span
                      className={`${mm.badge} ${
                        isSigned ? mm.badgeOk : mm.badgeWarn
                      }`}
                    >
                      {isSigned ? (
                        <>
                          <CheckCircle2 size={12} /> Signed
                        </>
                      ) : (
                        <>
                          <Clock size={12} /> Awaiting Signature
                        </>
                      )}
                    </span>
                  </div>

                  {isSigned ? (
                    <div
                      style={{
                        padding: 10,
                        borderRadius: 10,
                        background: "var(--admin-success-soft, rgba(52, 211, 153, 0.12))",
                        border: "1px solid rgba(52, 211, 153, 0.28)",
                        display: "flex",
                        flexDirection: "column",
                        gap: 8,
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11.5 }}>
                        <strong style={{ color: "var(--admin-success, #34d399)" }}>
                          Signed by {doc.signature.signerName}
                        </strong>
                        <span className={mm.subtitle}>
                          {doc.signature.certificateId}
                        </span>
                      </div>
                      {doc.signature.signatureDataUrl && (
                        <img
                          src={doc.signature.signatureDataUrl}
                          alt="Client Handwritten Signature"
                          style={{
                            height: 40,
                            objectFit: "contain",
                            background: "#ffffff",
                            borderRadius: 6,
                            padding: "2px 8px",
                          }}
                        />
                      )}
                    </div>
                  ) : (
                    <div
                      style={{
                        padding: "10px 12px",
                        borderRadius: 10,
                        background: "var(--admin-warning-soft, rgba(251, 191, 36, 0.12))",
                        fontSize: 12,
                        color: "var(--admin-warning, #fbbf24)",
                        fontWeight: 600,
                      }}
                    >
                      Awaiting Client Handwritten E-Signature Online
                    </div>
                  )}

                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <button
                      type="button"
                      onClick={() => handleOpenSignDocPdf(doc, true)}
                      className={mm.btnGhost}
                      style={{ flex: 1 }}
                    >
                      <Eye size={13} /> Preview PDF
                    </button>
                    <button
                      type="button"
                      onClick={() => handleOpenSignDocPdf(doc, false)}
                      className={mm.btn}
                      style={{ flex: 1 }}
                    >
                      <Download size={13} /> Download
                    </button>
                    <button
                      type="button"
                      disabled={deletingSignDocId === doc._id}
                      onClick={() => handleDeleteSignDoc(doc._id)}
                      className={mm.btnDangerSoft}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Upload Card */}
      <section className={`${mm.card} ${mm.cardPad}`}>
        <div className={mm.cardHead}>
          <div>
            <h2 className={mm.title}>Upload Documents to Member Account</h2>
            <p className={mm.subtitle}>
              Files uploaded here appear immediately in the member&apos;s Documents area
            </p>
          </div>
          {pendingFiles.length > 0 && (
            <button
              type="button"
              disabled={uploading}
              onClick={handleUpload}
              className={mm.btn}
            >
              <UploadCloud size={15} />{" "}
              {uploading ? "Uploading..." : `Upload ${pendingFiles.length} File${pendingFiles.length > 1 ? "s" : ""}`}
            </button>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          multiple
          style={{ display: "none" }}
          onChange={handleSelectFiles}
        />

        <div
          className={mm.dropzone}
          role="button"
          tabIndex={0}
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        >
          <UploadCloud size={26} />
          <p className={mm.dropzoneTitle}>Click to select files to upload</p>
          <p className={mm.dropzoneHint}>Supports PDF, PNG, JPG, WEBP, and office documents</p>
        </div>

        {pendingFiles.length > 0 && (
          <div className={mm.chipList}>
            {pendingFiles.map((file, idx) => (
              <span key={`${file.name}-${idx}`} className={mm.fileChip}>
                <FileText size={13} />
                <span>{file.name}</span>
                <button
                  type="button"
                  onClick={() =>
                    setPendingFiles((prev) => prev.filter((_, i) => i !== idx))
                  }
                  className={mm.fileChipRemove}
                >
                  <X size={12} />
                </button>
              </span>
            ))}
          </div>
        )}
      </section>

      {/* Files Grid Card */}
      <section className={`${mm.card} ${mm.cardPad}`}>
        <div className={mm.cardHead}>
          <div className={mm.docCardTitleWrap}>
            <div className={mm.iconTile}>
              <FolderOpen size={18} />
            </div>
            <div>
              <h2 className={mm.title}>Shared Account Files ({allFiles.length})</h2>
              <p className={mm.subtitle}>Download, inspect, or remove stored documents</p>
            </div>
          </div>
        </div>

        {loading ? (
          <span className={mm.skel} style={{ height: 180 }} />
        ) : allFiles.length === 0 ? (
          <div className={mm.empty}>No files uploaded for this member yet.</div>
        ) : (
          <div className={mm.fileGrid}>
            {allFiles.map((file, idx) => {
              const isImg = String(file.type || "").startsWith("image");
              return (
                <div key={file._id || idx} className={mm.fileCard}>
                  <div className={mm.fileThumb}>
                    {isImg ? (
                      <img src={file.url} alt={file.public_id || "File"} />
                    ) : (
                      <FileText size={30} />
                    )}
                  </div>
                  <div className={mm.fileCardBody}>
                    <p className={mm.fileCardName}>
                      {file.name || file.public_id || `Document ${idx + 1}`}
                    </p>
                    <div className={mm.fileCardActions}>
                      {isImg && (
                        <button
                          type="button"
                          className={mm.btnGhost}
                          onClick={() => setPreviewFile(file)}
                        >
                          <Eye size={13} />
                        </button>
                      )}
                      <button
                        type="button"
                        className={mm.btnGhost}
                        onClick={() => handleDownload(file)}
                      >
                        <Download size={13} />
                      </button>
                      <button
                        type="button"
                        disabled={deletingId === file._id}
                        className={mm.btnDangerSoft}
                        onClick={() => handleDelete(file._id)}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {previewFile && (
        <div className={mm.modalOverlay} onClick={() => setPreviewFile(null)}>
          <div className={mm.modalBox} onClick={(e) => e.stopPropagation()}>
            <div className={mm.modalHead}>
              <h3 className={mm.title}>{previewFile.name || previewFile.public_id}</h3>
              <button
                type="button"
                className={mm.iconClose}
                onClick={() => setPreviewFile(null)}
              >
                <X size={16} />
              </button>
            </div>
            <div className={mm.modalBody} style={{ textAlign: "center" }}>
              <img
                src={previewFile.url}
                alt={previewFile.public_id}
                style={{ maxWidth: "100%", maxHeight: "72vh", borderRadius: 10 }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Upload E-Signature Document Modal */}
      {signModalOpen && (
        <div className={mm.modalOverlay} onClick={() => setSignModalOpen(false)}>
          <div
            className={mm.modalBox}
            style={{ maxWidth: 540 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={mm.modalHead}>
              <h3 className={mm.title}>Upload Document for Client E-Signature</h3>
              <button
                type="button"
                className={mm.iconClose}
                onClick={() => setSignModalOpen(false)}
              >
                <X size={16} />
              </button>
            </div>
            <form
              onSubmit={handleUploadSignDoc}
              className={mm.modalBody}
              style={{ display: "flex", flexDirection: "column", gap: 14 }}
            >
              <div className={mm.gridEqual2}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                    Category Folder
                  </label>
                  <select
                    value={signFolder}
                    onChange={(e) => setSignFolder(e.target.value)}
                    className={mm.select}
                  >
                    {E_SIGN_FOLDERS.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                    Document Title
                  </label>
                  <input
                    type="text"
                    value={signTitle}
                    onChange={(e) => setSignTitle(e.target.value)}
                    placeholder="e.g., Investment Agreement.pdf"
                    className={mm.input}
                  />
                </div>
              </div>

              <input
                ref={signFileInputRef}
                type="file"
                multiple
                accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
                style={{ display: "none" }}
                onChange={(e) => {
                  const incoming = Array.from(e.target.files || []);
                  if (!incoming.length) return;
                  setSignFiles((prev) => [...prev, ...incoming]);
                  if (!signTitle && incoming.length === 1) {
                    setSignTitle(incoming[0].name);
                  }
                  e.target.value = "";
                }}
              />

              <div
                className={mm.dropzone}
                role="button"
                tabIndex={0}
                onClick={() => signFileInputRef.current?.click()}
                onKeyDown={(e) => e.key === "Enter" && signFileInputRef.current?.click()}
              >
                <UploadCloud size={24} />
                <p className={mm.dropzoneTitle}>
                  Click to select PDF, DOCX, or Image files
                </p>
                <p className={mm.dropzoneHint}>
                  Or leave empty to auto-generate a formatted PDF contract from the clauses below
                </p>
              </div>

              {signFiles.length > 0 && (
                <div className={mm.chipList}>
                  {signFiles.map((file, idx) => (
                    <span key={`${file.name}-${idx}`} className={mm.fileChip}>
                      <FileText size={13} />
                      <span>{file.name}</span>
                      <button
                        type="button"
                        onClick={() =>
                          setSignFiles((prev) => prev.filter((_, i) => i !== idx))
                        }
                        className={mm.fileChipRemove}
                      >
                        <X size={12} />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                  Summary / Notes for Client (Optional)
                </label>
                <input
                  type="text"
                  value={signDescription}
                  onChange={(e) => setSignDescription(e.target.value)}
                  placeholder="Instructions or notes shown to the client..."
                  className={mm.input}
                />
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, marginBottom: 6 }}>
                  Contract Clauses (Used when auto-generating a PDF without file upload)
                </label>
                <textarea
                  rows={3}
                  value={signContentPreview}
                  onChange={(e) => setSignContentPreview(e.target.value)}
                  placeholder="Enter agreement terms or clauses..."
                  className={mm.textarea}
                />
              </div>

              <label
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  fontSize: 12.5,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={signShareGlobal}
                  onChange={(e) => setSignShareGlobal(e.target.checked)}
                />
                <span>Share globally with all clients (instead of only this member)</span>
              </label>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, paddingTop: 6 }}>
                <button
                  type="button"
                  onClick={() => setSignModalOpen(false)}
                  className={mm.btnGhost}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploadingSignDoc}
                  className={mm.btn}
                >
                  <UploadCloud size={15} />{" "}
                  {uploadingSignDoc ? "Uploading..." : "Upload & Assign for Signature"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
