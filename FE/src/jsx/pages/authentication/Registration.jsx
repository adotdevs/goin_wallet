import React, { useState, useEffect } from "react";
import { useIsAuthenticated, useAuthUser, useSignIn } from "react-auth-kit";
import { registerApi, verifyReferralCodeApi } from "../../../Api/Service";
import { isBackendLocalhost, isElectronApp } from "../../../config/appConfig";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import GoinLogo from "../kycPortal/GoinLogo";
import "../kycPortal/kyc-portal.css";
import {
  Eye,
  EyeOff,
  Shield,
  Zap,
  TrendingUp,
  Loader2,
  CheckCircle2,
  Gift,
} from "lucide-react";

const NATIONALITIES = [
  "Afghan", "Albanian", "Algerian", "American", "Andorran", "Angolan", "Argentine", "Armenian", "Australian", "Austrian",
  "Azerbaijani", "Bahamian", "Bahraini", "Bangladeshi", "Barbadian", "Belarusian", "Belgian", "Belizean", "Beninese", "Bhutanese",
  "Bolivian", "Bosnian", "Brazilian", "British", "Bruneian", "Bulgarian", "Burkinabe", "Burmese", "Burundian", "Cambodian",
  "Cameroonian", "Canadian", "Cape Verdean", "Central African", "Chadian", "Chilean", "Chinese", "Colombian", "Comorian", "Congolese",
  "Costa Rican", "Croatian", "Cuban", "Cypriot", "Czech", "Danish", "Djiboutian", "Dominican", "Dutch", "Ecuadorian",
  "Egyptian", "Emirati", "Equatorial Guinean", "Eritrean", "Estonian", "Ethiopian", "Fijian", "Filipino", "Finnish", "French",
  "Gabonese", "Gambian", "Georgian", "German", "Ghanaian", "Greek", "Grenadian", "Guatemalan", "Guinean", "Guyanese",
  "Haitian", "Honduran", "Hungarian", "Icelandic", "Indian", "Indonesian", "Iranian", "Iraqi", "Irish", "Israeli",
  "Italian", "Ivorian", "Jamaican", "Japanese", "Jordanian", "Kazakh", "Kenyan", "Kuwaiti", "Kyrgyz", "Laotian",
  "Latvian", "Lebanese", "Liberian", "Libyan", "Lithuanian", "Luxembourgish", "Macedonian", "Malagasy", "Malawian", "Malaysian",
  "Maldivian", "Malian", "Maltese", "Mauritanian", "Mauritian", "Mexican", "Moldovan", "Monacan", "Mongolian", "Montenegrin",
  "Moroccan", "Mozambican", "Namibian", "Nepalese", "New Zealand", "Nicaraguan", "Nigerian", "North Korean", "Norwegian", "Omani",
  "Pakistani", "Panamanian", "Paraguayan", "Peruvian", "Polish", "Portuguese", "Qatari", "Romanian", "Russian", "Rwandan",
  "Saudi", "Senegalese", "Serbian", "Singaporean", "Slovak", "Slovenian", "Somali", "South African", "South Korean", "Spanish",
  "Sri Lankan", "Sudanese", "Surinamese", "Swedish", "Swiss", "Syrian", "Taiwanese", "Tajik", "Tanzanian", "Thai",
  "Togolese", "Trinidadian", "Tunisian", "Turkish", "Turkmen", "Ugandan", "Ukrainian", "Uruguayan", "Uzbek", "Venezuelan",
  "Vietnamese", "Yemeni", "Zambian", "Zimbabwean",
];

const BENEFITS = [
  { icon: Shield, text: "Bank-grade security" },
  { icon: Zap, text: "Instant transactions" },
  { icon: TrendingUp, text: "Real-time market data" },
];

function Register() {
  const [isloading, setisloading] = useState(false);
  const [errors, setErrors] = useState({});
  const [errorMsg, setErrorMsg] = useState("");
  const isAuthenticated = useIsAuthenticated();
  const authUser = useAuthUser();
  const signIn = useSignIn();
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [searchParams] = useSearchParams();

  const [userData, setUserData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    phone: "",
    dateOfBirth: "",
    nationality: "",
    note: "",
    address: "",
    city: "",
    country: "",
    postalCode: "",
    cpassword: "",
    referralCode: "",
  });

  const [referrerInfo, setReferrerInfo] = useState(null);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [referralCodeError, setReferralCodeError] = useState("");

  useEffect(() => {
    document.documentElement.classList.add("kyc-portal-active");
    return () => {
      document.documentElement.classList.remove("kyc-portal-active");
    };
  }, []);

  const handleInput = (e) => {
    const { name, value } = e.target;
    setUserData((prev) => ({ ...prev, [name]: value }));
  };

  const verifyReferralCode = async (code) => {
    if (!code || code.trim().length === 0) {
      setReferrerInfo(null);
      setReferralCodeError("");
      return;
    }

    if (code.trim().length < 8) {
      setReferrerInfo(null);
      setReferralCodeError("Referral code must be at least 8 characters");
      return;
    }

    try {
      setVerifyingCode(true);
      setReferralCodeError("");
      const response = await verifyReferralCodeApi(code.toUpperCase());

      if (response.success && response.valid) {
        setReferrerInfo(response.referrer);
        setReferralCodeError("");
      } else {
        setReferrerInfo(null);
        setReferralCodeError("Invalid referral code. Please check and try again.");
      }
    } catch (_error) {
      setReferrerInfo(null);
      setReferralCodeError("Invalid referral code. Please check and try again.");
    } finally {
      setVerifyingCode(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated() && authUser()?.user?.role === "user") {
      navigate("/dashboard");
      return;
    } else if (
      isAuthenticated() &&
      ["admin", "subadmin", "superadmin"].includes(authUser()?.user?.role)
    ) {
      navigate("/admin/dashboard");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const refCode = searchParams.get("ref");
    if (refCode) {
      setUserData((prev) => ({ ...prev, referralCode: refCode.toUpperCase() }));
      verifyReferralCode(refCode.toUpperCase());
    }
  }, [searchParams]);

  const onSignUp = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    let error = false;
    const errorObj = {};

    if (!userData.firstName.trim()) {
      errorObj.firstName = "First Name is Required";
      error = true;
    }
    if (!userData.lastName.trim()) {
      errorObj.lastName = "Last Name is Required";
      error = true;
    }
    if (!userData.phone.trim()) {
      errorObj.phone = "Phone is Required";
      error = true;
    }
    if (!userData.country.trim()) {
      errorObj.country = "Country is Required";
      error = true;
    }
    if (!userData.postalCode.trim()) {
      errorObj.postalCode = "Postal Code is Required";
      error = true;
    }
    if (!userData.city.trim()) {
      errorObj.city = "City is Required";
      error = true;
    }
    if (!userData.address.trim()) {
      errorObj.address = "Address is Required";
      error = true;
    }
    if (!userData.email.trim()) {
      errorObj.email = "Email is Required";
      error = true;
    }
    if (userData.password === "") {
      errorObj.password = "Password is Required";
      error = true;
    } else if (userData.password.length < 8) {
      errorObj.password = "Password must be at least 8 characters long";
      error = true;
    }
    if (userData.password !== userData.cpassword) {
      errorObj.cpassword = "Passwords do not match";
      error = true;
    }

    if (userData.referralCode && userData.referralCode.trim()) {
      if (referralCodeError || !referrerInfo) {
        Swal.fire({
          icon: "error",
          title: "Invalid Referral Code",
          text: "Please remove the referral code or enter a valid one to continue registration.",
        });
        error = true;
      }
    }

    setErrors(errorObj);
    if (error) {
      const firstErr = Object.values(errorObj)[0];
      if (firstErr) setErrorMsg(firstErr);
      return;
    }

    setisloading(true);
    try {
      const data = {
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        password: userData.password,
        phone: userData.phone,
        dateOfBirth: userData.dateOfBirth,
        nationality: userData.nationality,
        address: userData.address,
        city: userData.city,
        country: userData.country,
        postalCode: userData.postalCode,
      };

      if (userData.referralCode && userData.referralCode.trim() && referrerInfo) {
        data.referralCode = userData.referralCode.trim().toUpperCase();
      }

      const updateHeader = await registerApi(data);

      if (updateHeader.success) {
        const tokenValue =
          typeof updateHeader.token === "string"
            ? updateHeader.token
            : updateHeader.token?.token || updateHeader.token;

        // If backend issued an immediate session (e.g. when signup KYC onboarding is enabled)
        if (tokenValue && updateHeader.user) {
          const authState = {
            success: true,
            token: tokenValue,
            user: {
              _id: updateHeader.user._id,
              address: updateHeader.user.address,
              city: updateHeader.user.city,
              country: updateHeader.user.country,
              email: updateHeader.user.email,
              kyc: updateHeader.user.kyc,
              firstName: updateHeader.user.firstName,
              lastName: updateHeader.user.lastName,
              note: updateHeader.user.note,
              phone: updateHeader.user.phone,
              postalCode: updateHeader.user.postalCode,
              role: updateHeader.user.role,
              status: updateHeader.user.status,
              verified: updateHeader.user.verified,
              signupKycRequired: updateHeader.user.signupKycRequired,
              signupKycCompleted: updateHeader.user.signupKycCompleted,
              permissions: updateHeader.user.permissions || {},
              adminPermissions: updateHeader.user.adminPermissions || {},
            },
          };

          signIn({
            token: tokenValue,
            expiresIn: 4317,
            tokenType: "Bearer",
            authState,
            sameSite: false,
          });

          if (isElectronApp() || isBackendLocalhost()) {
            localStorage.setItem("jwttoken", tokenValue);
          }

          toast.dismiss();
          toast.success(
            updateHeader.msg ||
              "Account created! Please complete KYC verification to continue."
          );
          navigate(updateHeader.requireSignupKyc ? "/fiscal-profile" : "/dashboard");
          return;
        }

        toast.dismiss();
        toast.info(updateHeader.msg);
        navigate("/auth/login");
      } else {
        const msg = updateHeader.msg || "Registration failed";
        setErrorMsg(msg);
        toast.dismiss();
        toast.error(msg);
      }
    } catch (err) {
      const msg = err?.data?.msg || err?.message || "Something went wrong";
      setErrorMsg(msg);
      toast.dismiss();
      toast.error(msg);
    } finally {
      setisloading(false);
    }
  };

  const inputClass =
    "w-full h-11 px-3.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500";
  const labelClass = "block text-xs font-semibold text-slate-700 mb-1.5";

  return (
    <div id="kyc-portal">
      <div className="flex min-h-screen bg-[#F8FAFC] text-slate-900">
        {/* Left Panel - Branding */}
        <div className="hidden lg:flex lg:w-[42%] xl:w-[40%] relative overflow-hidden bg-gradient-to-br from-blue-700 via-blue-800 to-indigo-900">
          <div className="absolute inset-0 opacity-10">
            <div
              className="absolute inset-0"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 1px 1px, white 1px, transparent 0)",
                backgroundSize: "40px 40px",
              }}
            />
          </div>

          <div className="relative z-10 flex flex-col justify-between p-12 text-white w-full">
            <Link to="/" title="GOin SAS">
              <GoinLogo height={40} width={160} theme="dark" />
            </Link>

            <div className="space-y-8 my-auto">
              <div>
                <h1 className="mb-4 text-4xl font-extrabold leading-tight xl:text-5xl text-white">
                  Start your crypto journey today
                </h1>
                <p className="text-lg text-blue-100/85">
                  Join thousands of traders who trust GOin SAS for secure and
                  seamless cryptocurrency management.
                </p>
              </div>

              <div className="space-y-4">
                {BENEFITS.map((benefit, index) => {
                  const Icon = benefit.icon;
                  return (
                    <div key={index} className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
                        <Icon className="h-5 w-5 text-white" />
                      </div>
                      <span className="text-lg font-medium text-white">
                        {benefit.text}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center gap-3 rounded-2xl bg-white/10 p-4 backdrop-blur-sm border border-white/15">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="h-8 w-8 rounded-full border-2 border-white/30 bg-white/25"
                  />
                ))}
              </div>
              <div>
                <p className="font-bold text-white">50,000+ users</p>
                <p className="text-xs text-blue-100/80">Already trading with us</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Form */}
        <div className="flex w-full flex-col lg:w-[58%] xl:w-[60%]">
          {/* Mobile Header */}
          <div className="flex items-center justify-between border-b border-slate-200 bg-white p-4 lg:hidden">
            <Link to="/" title="GOin SAS">
              <GoinLogo height={34} width={136} theme="light" />
            </Link>
            <Link
              to="/auth/login"
              className="text-sm font-bold text-blue-600 hover:underline"
            >
              Sign In
            </Link>
          </div>

          <div className="flex flex-1 items-start sm:items-center justify-center p-4 sm:p-6 lg:p-10 overflow-y-auto">
            <div className="w-full max-w-2xl space-y-6 bg-white p-6 sm:p-8 lg:p-10 rounded-2xl border border-slate-200/90 shadow-sm">
              <div className="text-center lg:text-left">
                <h2 className="text-2xl font-extrabold tracking-tight text-slate-900 lg:text-3xl">
                  Create Account
                </h2>
                <p className="mt-1.5 text-sm text-slate-500">
                  Join our secure crypto management platform
                </p>
              </div>

              {errorMsg && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-xs font-semibold text-rose-700">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={onSignUp} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="firstName" className={labelClass}>
                      First Name *
                    </label>
                    <input
                      id="firstName"
                      name="firstName"
                      placeholder="John"
                      value={userData.firstName}
                      onChange={handleInput}
                      required
                      disabled={isloading}
                      className={inputClass}
                    />
                    {errors.firstName && (
                      <p className="mt-1 text-xs text-rose-600">{errors.firstName}</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="lastName" className={labelClass}>
                      Last Name *
                    </label>
                    <input
                      id="lastName"
                      name="lastName"
                      placeholder="Doe"
                      value={userData.lastName}
                      onChange={handleInput}
                      required
                      disabled={isloading}
                      className={inputClass}
                    />
                    {errors.lastName && (
                      <p className="mt-1 text-xs text-rose-600">{errors.lastName}</p>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="email" className={labelClass}>
                      Email Address *
                    </label>
                    <input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="you@example.com"
                      value={userData.email}
                      onChange={handleInput}
                      required
                      disabled={isloading}
                      className={inputClass}
                    />
                    {errors.email && (
                      <p className="mt-1 text-xs text-rose-600">{errors.email}</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="phone" className={labelClass}>
                      Phone Number *
                    </label>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      placeholder="442012345678"
                      value={userData.phone}
                      onChange={handleInput}
                      required
                      disabled={isloading}
                      className={inputClass}
                    />
                    {errors.phone && (
                      <p className="mt-1 text-xs text-rose-600">{errors.phone}</p>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="dateOfBirth" className={labelClass}>
                      Date of Birth
                    </label>
                    <input
                      id="dateOfBirth"
                      name="dateOfBirth"
                      type="date"
                      value={userData.dateOfBirth}
                      onChange={handleInput}
                      disabled={isloading}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <label htmlFor="nationality" className={labelClass}>
                      Nationality
                    </label>
                    <select
                      id="nationality"
                      name="nationality"
                      value={userData.nationality}
                      onChange={handleInput}
                      disabled={isloading}
                      className={inputClass}
                    >
                      <option value="">Select</option>
                      {NATIONALITIES.map((nat) => (
                        <option key={nat} value={nat}>
                          {nat}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="address" className={labelClass}>
                    Address *
                  </label>
                  <input
                    id="address"
                    name="address"
                    placeholder="123 Main Street"
                    value={userData.address}
                    onChange={handleInput}
                    required
                    disabled={isloading}
                    className={inputClass}
                  />
                  {errors.address && (
                    <p className="mt-1 text-xs text-rose-600">{errors.address}</p>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label htmlFor="city" className={labelClass}>
                      City *
                    </label>
                    <input
                      id="city"
                      name="city"
                      placeholder="London"
                      value={userData.city}
                      onChange={handleInput}
                      required
                      disabled={isloading}
                      className={inputClass}
                    />
                    {errors.city && (
                      <p className="mt-1 text-xs text-rose-600">{errors.city}</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="postalCode" className={labelClass}>
                      Postal Code *
                    </label>
                    <input
                      id="postalCode"
                      name="postalCode"
                      placeholder="SW1A 1AA"
                      value={userData.postalCode}
                      onChange={handleInput}
                      required
                      disabled={isloading}
                      className={inputClass}
                    />
                    {errors.postalCode && (
                      <p className="mt-1 text-xs text-rose-600">{errors.postalCode}</p>
                    )}
                  </div>
                  <div>
                    <label htmlFor="country" className={labelClass}>
                      Country *
                    </label>
                    <input
                      id="country"
                      name="country"
                      placeholder="United Kingdom"
                      value={userData.country}
                      onChange={handleInput}
                      required
                      disabled={isloading}
                      className={inputClass}
                    />
                    {errors.country && (
                      <p className="mt-1 text-xs text-rose-600">{errors.country}</p>
                    )}
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label htmlFor="password" className={labelClass}>
                      Password *
                    </label>
                    <div className="relative">
                      <input
                        id="password"
                        name="password"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={userData.password}
                        onChange={handleInput}
                        required
                        disabled={isloading}
                        className={`${inputClass} pr-10`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((s) => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-400">
                      Minimum 8 characters
                    </p>
                    {errors.password && (
                      <p className="mt-1 text-xs text-rose-600">{errors.password}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="cpassword" className={labelClass}>
                      Confirm Password *
                    </label>
                    <div className="relative">
                      <input
                        id="cpassword"
                        name="cpassword"
                        type={showConfirmPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={userData.cpassword}
                        onChange={handleInput}
                        required
                        disabled={isloading}
                        className={`${inputClass} pr-10`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword((s) => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      >
                        {showConfirmPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                    {errors.cpassword && (
                      <p className="mt-1 text-xs text-rose-600">{errors.cpassword}</p>
                    )}
                  </div>
                </div>

                {/* Referral Code (Optional) */}
                <div>
                  <label htmlFor="referralCode" className={labelClass}>
                    Referral Code (Optional)
                  </label>
                  <div className="relative">
                    <Gift className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="referralCode"
                      name="referralCode"
                      value={userData.referralCode}
                      onChange={(e) => {
                        const val = e.target.value.toUpperCase();
                        setUserData((prev) => ({ ...prev, referralCode: val }));
                        verifyReferralCode(val);
                      }}
                      placeholder="Enter 8-character referral code"
                      maxLength={8}
                      disabled={isloading}
                      className={`${inputClass} pl-10 uppercase`}
                    />
                  </div>
                  {verifyingCode && (
                    <p className="mt-1 text-xs text-slate-500">
                      Verifying referral code...
                    </p>
                  )}
                  {referrerInfo && !verifyingCode && (
                    <p className="mt-1 text-xs text-emerald-600 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Referred by {referrerInfo.name}
                    </p>
                  )}
                  {referralCodeError && !verifyingCode && (
                    <p className="mt-1 text-xs text-rose-600">{referralCodeError}</p>
                  )}
                </div>

                <p className="text-xs text-slate-500">
                  By creating an account, you agree to our{" "}
                  <Link
                    to="/terms-of-service"
                    className="text-blue-600 font-semibold hover:underline"
                  >
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link
                    to="/privacy-policy"
                    className="text-blue-600 font-semibold hover:underline"
                  >
                    Privacy Policy
                  </Link>
                  .
                </p>

                <button
                  type="submit"
                  disabled={isloading}
                  className="w-full h-12 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-bold text-base flex items-center justify-center gap-2 shadow-sm transition-all"
                >
                  {isloading ? (
                    <>
                      <Loader2 className="h-5 w-5 animate-spin" />
                      <span>Creating account...</span>
                    </>
                  ) : (
                    <span>Create Account</span>
                  )}
                </button>
              </form>

              {/* Security Note */}
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 p-3.5">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-500/15 text-emerald-600">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div className="text-xs">
                  <p className="font-bold text-slate-900">Your data is protected</p>
                  <p className="text-slate-500">
                    256-bit SSL encryption on all connections
                  </p>
                </div>
              </div>

              <p className="text-center text-sm text-slate-500">
                Already have an account?{" "}
                <Link
                  to="/auth/login"
                  className="font-bold text-blue-600 hover:underline"
                >
                  Sign In
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Register;
