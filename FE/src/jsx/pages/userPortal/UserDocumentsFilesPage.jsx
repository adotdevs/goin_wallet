import React, { useEffect, useState } from "react";
import { useAuthUser } from "react-auth-kit";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { FileText, Download, Eye, X, FolderOpen } from "lucide-react";
import { getAllDataApi, getLinksApi } from "../../../Api/Service";
import UserPortalShell from "./UserPortalShell";

export default function UserDocumentsFilesPage() {
  const authUser = useAuthUser();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [files, setFiles] = useState([]);
  const [previewFile, setPreviewFile] = useState(null);

  useEffect(() => {
    const user = authUser()?.user;
    if (!user) return;
    if (["admin", "superadmin", "subadmin"].includes(user.role)) {
      navigate("/admin/dashboard", { replace: true });
      return;
    }

    const load = async () => {
      try {
        const links = await getLinksApi();
        if (!links?.links?.[3]?.enabled) {
          navigate(-1);
          return;
        }
        const res = await getAllDataApi(user._id);
        if (res?.success) {
          setFiles(Array.isArray(res.allFiles?.files) ? res.allFiles.files : []);
        } else if (res?.msg) {
          toast.error(res.msg);
        }
      } catch (err) {
        toast.error(err?.data?.msg || err?.message || "Failed to load files");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [authUser, navigate]);

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
    <UserPortalShell title="Documents">
      <div className="space-y-6 w-full">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight m-0">
            Account Documents &amp; Files
          </h1>
          <p className="text-sm text-slate-500 mt-1 mb-0">
            Access and download files shared with your account.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
              <FolderOpen className="w-4 h-4" />
            </div>
            <h2 className="text-base font-bold text-slate-900 m-0">
              All Files ({files.length})
            </h2>
          </div>

          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-500">
              <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin mb-3" />
              <p className="text-sm m-0">Loading files...</p>
            </div>
          ) : files.length === 0 ? (
            <div className="py-20 text-center px-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <FileText className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-slate-900 m-0">
                No documents available
              </h3>
              <p className="text-sm text-slate-500 mt-1 mb-0">
                Any files uploaded to your account will appear here.
              </p>
            </div>
          ) : (
            <div className="p-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
              {files.map((file, idx) => {
                const isImage = String(file.type || "").startsWith("image");
                const isVideo = String(file.type || "").startsWith("video");
                return (
                  <div
                    key={file._id || idx}
                    className="rounded-xl border border-slate-200 bg-slate-50/70 overflow-hidden flex flex-col justify-between hover:border-blue-300 transition-colors"
                  >
                    <div className="h-36 bg-slate-100 flex items-center justify-center overflow-hidden">
                      {isImage ? (
                        <img
                          src={file.url}
                          alt={file.public_id || "File"}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <FileText className="w-10 h-10 text-slate-400" />
                      )}
                    </div>
                    <div className="p-4 space-y-3">
                      <p className="text-xs font-semibold text-slate-800 truncate m-0">
                        {file.name || file.public_id || `Document ${idx + 1}`}
                      </p>
                      <div className="flex items-center gap-2">
                        {(isImage || isVideo) && (
                          <button
                            type="button"
                            onClick={() => setPreviewFile(file)}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-white hover:bg-slate-100 text-slate-700 text-xs font-semibold border border-slate-200 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" /> View
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDownload(file)}
                          className="flex-1 inline-flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold border-0 cursor-pointer"
                        >
                          <Download className="w-3.5 h-3.5" /> Download
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {previewFile && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/75 backdrop-blur-xs flex items-center justify-center p-4"
          onClick={() => setPreviewFile(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
              <p className="text-sm font-bold text-slate-900 truncate m-0">
                {previewFile.name || previewFile.public_id}
              </p>
              <button
                type="button"
                onClick={() => setPreviewFile(null)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center border-0 bg-transparent cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-4 bg-slate-900 flex items-center justify-center max-h-[75vh]">
              {String(previewFile.type || "").startsWith("video") ? (
                <video src={previewFile.url} controls className="max-h-[70vh] max-w-full" />
              ) : (
                <img
                  src={previewFile.url}
                  alt={previewFile.public_id}
                  className="max-h-[70vh] max-w-full object-contain"
                />
              )}
            </div>
          </div>
        </div>
      )}
    </UserPortalShell>
  );
}
