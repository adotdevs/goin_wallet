import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthUser } from "react-auth-kit";
import { toast } from "react-toastify";
import {
  Briefcase,
  ArrowRight,
  Lock,
  CheckCircle2,
  Loader2,
  Building2,
  Wallet,
  Users,
} from "lucide-react";
import GoinLogo from "../kycPortal/GoinLogo";
import "../kycPortal/kyc-portal.css";
import {
  saveMyFiscalProfileApi,
  signleUsersApi,
  getRestrictionsApi,
} from "../../../Api/Service";

const OCCUPATION_OPTIONS = [
  { value: "employed", label: "Employee" },
  { value: "self_employed", label: "Self-employed / Freelancer" },
  { value: "business_owner", label: "Business Owner" },
  { value: "executive", label: "Senior Executive" },
  { value: "liberal_profession", label: "Liberal Profession" },
  { value: "civil_servant", label: "Civil Servant" },
  { value: "retired", label: "Retired" },
  { value: "student", label: "Student" },
  { value: "unemployed", label: "Unemployed" },
  { value: "investor", label: "Investor" },
  { value: "other", label: "Other" },
];

const INCOME_RANGES = [
  { value: "0-15000", label: "Less than €15,000" },
  { value: "15000-30000", label: "€15,000 – €30,000" },
  { value: "30000-50000", label: "€30,000 – €50,000" },
  { value: "50000-75000", label: "€50,000 – €75,000" },
  { value: "75000-100000", label: "€75,000 – €100,000" },
  { value: "100000-150000", label: "€100,000 – €150,000" },
  { value: "150000-250000", label: "€150,000 – €250,000" },
  { value: "250000+", label: "More than €250,000" },
];

const WEALTH_RANGES = [
  { value: "0-50000", label: "Less than €50,000" },
  { value: "50000-150000", label: "€50,000 – €150,000" },
  { value: "150000-300000", label: "€150,000 – €300,000" },
  { value: "300000-500000", label: "€300,000 – €500,000" },
  { value: "500000-1000000", label: "€500,000 – €1,000,000" },
  { value: "1000000+", label: "More than €1,000,000" },
];

const INVESTMENT_EXP_LEVELS = [
  { value: "none", label: "No experience" },
  { value: "beginner", label: "Beginner (less than 1 year)" },
  { value: "intermediate", label: "Intermediate (1-3 years)" },
  { value: "experienced", label: "Experienced (3-5 years)" },
  { value: "expert", label: "Expert (more than 5 years)" },
];

const CRYPTO_EXP_LEVELS = [
  { value: "never", label: "Never invested in crypto" },
  { value: "occasional", label: "Occasional investments" },
  { value: "regular", label: "Regular investor" },
  { value: "professional", label: "Professional trader" },
];

const FUND_SOURCES = [
  { value: "salary", label: "Salary / Professional income" },
  { value: "savings", label: "Personal savings" },
  { value: "inheritance", label: "Inheritance" },
  { value: "real_estate", label: "Real estate sale" },
  { value: "investments", label: "Investment gains" },
  { value: "business", label: "Business income" },
  { value: "other", label: "Other" },
];

export default function FiscalProfilePage() {
  const navigate = useNavigate();
  const authUser = useAuthUser();
  const [isLoading, setIsLoading] = useState(false);

  const [formData, setFormData] = useState({
    occupation: "",
    employer: "",
    incomeRange: "",
    wealthRange: "",
    investmentExperience: "",
    cryptoExperience: "",
    fundSource: "",
    taxResidence: "",
    hasForeignAccounts: "",
    isPoliticallyExposed: "",
  });

  useEffect(() => {
    document.documentElement.classList.add("kyc-portal-active");
    return () => {
      document.documentElement.classList.remove("kyc-portal-active");
    };
  }, []);

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
        if (u?.fiscalProfile) {
          setFormData((prev) => ({
            ...prev,
            occupation: u.fiscalProfile.occupation || prev.occupation,
            employer: u.fiscalProfile.employer || prev.employer,
            incomeRange: u.fiscalProfile.incomeRange || prev.incomeRange,
            wealthRange: u.fiscalProfile.wealthRange || prev.wealthRange,
            fundSource: u.fiscalProfile.fundSource || prev.fundSource,
            investmentExperience:
              u.fiscalProfile.investmentExperience || prev.investmentExperience,
            cryptoExperience:
              u.fiscalProfile.cryptoExperience || prev.cryptoExperience,
            taxResidence: u.fiscalProfile.taxResidence || prev.taxResidence,
            hasForeignAccounts:
              u.fiscalProfile.completedAt != null
                ? u.fiscalProfile.hasForeignAccounts
                  ? "yes"
                  : "no"
                : prev.hasForeignAccounts,
            isPoliticallyExposed:
              u.fiscalProfile.completedAt != null
                ? u.fiscalProfile.isPoliticallyExposed
                  ? "yes"
                  : "no"
                : prev.isPoliticallyExposed,
          }));
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

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.occupation || !formData.incomeRange) {
      toast.error("Please fill in at least your professional situation and income.");
      return;
    }

    setIsLoading(true);
    try {
      const res = await saveMyFiscalProfileApi({
        occupation: formData.occupation,
        employer: formData.employer || "",
        incomeRange: formData.incomeRange,
        wealthRange: formData.wealthRange || "",
        fundSource: formData.fundSource || "",
        investmentExperience: formData.investmentExperience || "",
        cryptoExperience: formData.cryptoExperience || "",
        taxResidence: formData.taxResidence || "",
        hasForeignAccounts: formData.hasForeignAccounts === "yes",
        isPoliticallyExposed: formData.isPoliticallyExposed === "yes",
      });

      if (res?.success) {
        window.dispatchEvent(new Event("signup-kyc-updated"));
        toast.success("Fiscal profile saved! Continue to identity verification.");
        navigate("/onboarding-kyc");
      } else {
        toast.error(res?.msg || "Failed to save fiscal profile. Please try again.");
      }
    } catch (error) {
      toast.error(
        error?.data?.msg || error?.message || "An error occurred. Please try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = Boolean(formData.occupation && formData.incomeRange);
  const selectClass =
    "w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500";
  const inputClass =
    "w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500";

  return (
    <div id="kyc-portal">
      <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100/70 text-slate-900">
        {/* Sticky SimpleHeader */}
        <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/85 backdrop-blur-sm">
          <div className="max-w-5xl mx-auto flex h-14 items-center justify-between px-4 sm:px-6">
            <Link to="/" title="GOin SAS">
              <GoinLogo height={34} width={136} theme="light" />
            </Link>
            <div className="flex items-center gap-1.5 text-xs font-medium text-slate-500">
              <Lock className="h-3.5 w-3.5 text-emerald-600" />
              <span>Data secured</span>
            </div>
          </div>
        </header>

        {/* Progress Bar */}
        <div className="border-b border-slate-200 bg-white">
          <div className="max-w-5xl mx-auto py-3 px-4 sm:px-6">
            <div className="flex items-center justify-between text-xs font-medium text-slate-500 mb-2">
              <span>Step 1 of 2</span>
              <span>Fiscal Profile</span>
            </div>
            <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all duration-300"
                style={{ width: "25%" }}
              />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="max-w-5xl mx-auto py-8 lg:py-12 px-4 sm:px-6">
          <div className="mx-auto max-w-2xl">
            {/* Title */}
            <div className="text-center mb-8">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-600/10">
                <Briefcase className="h-8 w-8 text-blue-600" />
              </div>
              <h1 className="mb-2 text-2xl sm:text-3xl font-extrabold text-slate-900">
                Fiscal &amp; Financial Profile
              </h1>
              <p className="text-sm sm:text-base text-slate-500">
                This information is required by regulations for fund recovery
              </p>
            </div>

            {/* Info Card */}
            <div className="mb-8 rounded-2xl border border-blue-200/80 bg-blue-50/60 p-4 sm:p-5">
              <div className="flex gap-3">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-blue-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-bold text-slate-900">Why this information?</p>
                  <p className="text-slate-600 mt-1 leading-relaxed">
                    In accordance with European anti-money laundering (AML) directives and
                    know your customer (KYC) requirements, we must collect this information
                    to process your fund recovery case.
                  </p>
                </div>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Professional Situation */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
                <h2 className="mb-4 font-bold text-slate-900 flex items-center gap-2 text-base">
                  <Briefcase className="h-5 w-5 text-blue-600" />
                  Professional Situation
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Profession / Status *
                    </label>
                    <select
                      value={formData.occupation}
                      onChange={(e) =>
                        setFormData({ ...formData, occupation: e.target.value })
                      }
                      className={selectClass}
                      required
                    >
                      <option value="">Select your situation</option>
                      {OCCUPATION_OPTIONS.map((occ) => (
                        <option key={occ.value} value={occ.value}>
                          {occ.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {(formData.occupation === "employed" ||
                    formData.occupation === "executive" ||
                    formData.occupation === "civil_servant") && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                        Employer Name
                      </label>
                      <input
                        type="text"
                        placeholder="Company name"
                        value={formData.employer}
                        onChange={(e) =>
                          setFormData({ ...formData, employer: e.target.value })
                        }
                        className={inputClass}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Financial Situation */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
                <h2 className="mb-4 font-bold text-slate-900 flex items-center gap-2 text-base">
                  <Wallet className="h-5 w-5 text-blue-600" />
                  Financial Situation
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Annual gross income *
                    </label>
                    <select
                      value={formData.incomeRange}
                      onChange={(e) =>
                        setFormData({ ...formData, incomeRange: e.target.value })
                      }
                      className={selectClass}
                      required
                    >
                      <option value="">Select a range</option>
                      {INCOME_RANGES.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Estimated net worth
                    </label>
                    <select
                      value={formData.wealthRange}
                      onChange={(e) =>
                        setFormData({ ...formData, wealthRange: e.target.value })
                      }
                      className={selectClass}
                    >
                      <option value="">Select a range</option>
                      {WEALTH_RANGES.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Source of funds
                    </label>
                    <select
                      value={formData.fundSource}
                      onChange={(e) =>
                        setFormData({ ...formData, fundSource: e.target.value })
                      }
                      className={selectClass}
                    >
                      <option value="">Main source of your funds</option>
                      {FUND_SOURCES.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Investment Experience */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
                <h2 className="mb-4 font-bold text-slate-900 flex items-center gap-2 text-base">
                  <Building2 className="h-5 w-5 text-blue-600" />
                  Investment Experience
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Investment experience
                    </label>
                    <select
                      value={formData.investmentExperience}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          investmentExperience: e.target.value,
                        })
                      }
                      className={selectClass}
                    >
                      <option value="">Your level of experience</option>
                      {INVESTMENT_EXP_LEVELS.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Cryptocurrency experience
                    </label>
                    <select
                      value={formData.cryptoExperience}
                      onChange={(e) =>
                        setFormData({ ...formData, cryptoExperience: e.target.value })
                      }
                      className={selectClass}
                    >
                      <option value="">Your crypto experience</option>
                      {CRYPTO_EXP_LEVELS.map((item) => (
                        <option key={item.value} value={item.value}>
                          {item.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Tax Compliance */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-6 shadow-sm">
                <h2 className="mb-4 font-bold text-slate-900 flex items-center gap-2 text-base">
                  <Users className="h-5 w-5 text-blue-600" />
                  Tax Compliance
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Country of tax residence
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. France"
                      value={formData.taxResidence}
                      onChange={(e) =>
                        setFormData({ ...formData, taxResidence: e.target.value })
                      }
                      className={inputClass}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Do you have bank accounts abroad?
                    </label>
                    <select
                      value={formData.hasForeignAccounts}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          hasForeignAccounts: e.target.value,
                        })
                      }
                      className={selectClass}
                    >
                      <option value="">Select</option>
                      <option value="no">No</option>
                      <option value="yes">Yes</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Are you a politically exposed person (PEP)?
                    </label>
                    <select
                      value={formData.isPoliticallyExposed}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          isPoliticallyExposed: e.target.value,
                        })
                      }
                      className={selectClass}
                    >
                      <option value="">Select</option>
                      <option value="no">No</option>
                      <option value="yes">Yes</option>
                    </select>
                    <p className="mt-1.5 text-xs text-slate-500">
                      A PEP is a person who holds or has held important political,
                      judicial or administrative functions.
                    </p>
                  </div>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={!isFormValid || isLoading}
                className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold text-sm sm:text-base flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <span>Continue to identity verification</span>
                    <ArrowRight className="h-5 w-5" />
                  </>
                )}
              </button>

              <p className="text-center text-xs text-slate-500">
                Your data is protected and processed in accordance with GDPR.
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
