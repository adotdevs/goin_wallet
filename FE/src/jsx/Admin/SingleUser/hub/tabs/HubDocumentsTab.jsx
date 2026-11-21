import React, { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import {
  UploadCloud,
  FileText,
  Download,
  Trash2,
  Eye,
  X,
  FolderOpen,
} from "lucide-react";
import {
  deleteSingleFileApi,
  getAllDataApi,
  uploadFilesApi,
} from "../../../../../Api/Service";
import mm from "../MemberHub.module.css";

export default function HubDocumentsTab() {
  const { id } = useParams();
  const inputRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [allFiles, setAllFiles] = useState([]);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [previewFile, setPreviewFile] = useState(null);

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

  useEffect(() => {
    loadFiles();
  }, [id]);

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
    </div>
  );
}
