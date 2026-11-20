import React, { useState, useEffect } from "react";
import { useIsAuthenticated, useAuthUser } from "react-auth-kit";
import { registerApi, verifyReferralCodeApi } from "../../../Api/Service";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import Swal from "sweetalert2";
import { toast } from "react-toastify";
import GoinLogo from "../kycPortal/GoinLogo";
import "../kycPortal/kyc-portal.css";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Globe,
  Lock,
  Eye,
  EyeOff,
  ArrowRight,
  Gift,
  CheckCircle2,
} from "lucide-react";

function Register(props) {
  const [isloading, setisloading] = useState(false);
  const [errors, setErrors] = useState({});
  const [errorMsg, setErrorMsg] = useState("");
  const isAuthenticated = useIsAuthenticated();
  const authUser = useAuthUser();
  const navigate = useNavigate();
  const [type1, settype1] = useState("password");
  const [type2, settype2] = useState("password");
  const [searchParams] = useSearchParams();

  const [userData, setUserData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    phone: "",
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

  const handleTogglePassword = () => {
    settype1((prev) => (prev === "password" ? "text" : "password"));
  };
  const handleTogglePassword1 = () => {
    settype2((prev) => (prev === "password" ? "text" : "password"));
  };

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
    } catch (error) {
      setReferrerInfo(null);
      setReferralCodeError("Invalid referral code. Please check and try again.");
      console.error("Referral code verification error:", error);
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
      errorObj.cpassword = "Password and confirm password doesn't match";
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
      let data = {
        firstName: userData.firstName,
        lastName: userData.lastName,
        email: userData.email,
        password: userData.password,
        phone: userData.phone,
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
        toast.dismiss();
        toast.info(updateHeader.msg);
        navigate("/auth/login");
      } else {
        const msg = updateHeader.msg || "Registration failed";
        setErrorMsg(msg);
        toast.dismiss();
        toast.error(msg);
      }
    } catch (error) {
      const msg = error?.data?.msg || error?.message || "Something went wrong";
      setErrorMsg(msg);
      toast.dismiss();
      toast.error(msg);
    } finally {
      setisloading(false);
    }
  };

  const showPassword = type1 === "text";
  const showConfirmPassword = type2 === "text";

  return (
    <div id="kyc-portal">
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-xl">
          <div className="flex items-center justify-center">
            <Link to="/" title="GOin SAS">
              <GoinLogo height={42} width={168} theme="light" />
            </Link>
          </div>

          <h2 className="mt-5 text-center text-2xl font-extrabold text-slate-900">
            Create your account
          </h2>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-xl">
          <form
            onSubmit={onSignUp}
            className="bg-white py-8 px-6 sm:px-8 shadow-card rounded-2xl border border-slate-200/90 space-y-4"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  First Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    name="firstName"
                    required
                    value={userData.firstName}
                    onChange={handleInput}
                    placeholder="First name"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                {errors.firstName && (
                  <p className="mt-1 text-xs text-rose-600">{errors.firstName}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Last Name *
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    name="lastName"
                    required
                    value={userData.lastName}
                    onChange={handleInput}
                    placeholder="Last name"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                {errors.lastName && (
                  <p className="mt-1 text-xs text-rose-600">{errors.lastName}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email Address *
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    name="email"
                    required
                    value={userData.email}
                    onChange={handleInput}
                    placeholder="Enter email address"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-xs text-rose-600">{errors.email}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Phone Number *
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    name="phone"
                    required
                    value={userData.phone}
                    onChange={handleInput}
                    placeholder="Enter phone number"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                {errors.phone && (
                  <p className="mt-1 text-xs text-rose-600">{errors.phone}</p>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Street Address *
              </label>
              <div className="relative">
                <MapPin className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  name="address"
                  required
                  value={userData.address}
                  onChange={handleInput}
                  placeholder="Enter street address"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              {errors.address && (
                <p className="mt-1 text-xs text-rose-600">{errors.address}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  City *
                </label>
                <input
                  name="city"
                  required
                  value={userData.city}
                  onChange={handleInput}
                  placeholder="City"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {errors.city && (
                  <p className="mt-1 text-xs text-rose-600">{errors.city}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Country *
                </label>
                <div className="relative">
                  <Globe className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    name="country"
                    required
                    value={userData.country}
                    onChange={handleInput}
                    placeholder="Country"
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                {errors.country && (
                  <p className="mt-1 text-xs text-rose-600">{errors.country}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Postal Code *
                </label>
                <input
                  name="postalCode"
                  required
                  value={userData.postalCode}
                  onChange={handleInput}
                  placeholder="Postal code"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {errors.postalCode && (
                  <p className="mt-1 text-xs text-rose-600">{errors.postalCode}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={type1}
                    name="password"
                    required
                    value={userData.password}
                    onChange={handleInput}
                    placeholder="Min. 8 characters"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleTogglePassword}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-xs text-rose-600">{errors.password}</p>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Confirm Password *
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={type2}
                    name="cpassword"
                    required
                    value={userData.cpassword}
                    onChange={handleInput}
                    placeholder="Repeat password"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                  <button
                    type="button"
                    onClick={handleTogglePassword1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
                {errors.cpassword && (
                  <p className="mt-1 text-xs text-rose-600">{errors.cpassword}</p>
                )}
              </div>
            </div>

            {/* Optional Referral Code (preserves Wallet MLM referral support) */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Referral Code (Optional)
              </label>
              <div className="relative">
                <Gift className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  name="referralCode"
                  value={userData.referralCode}
                  onChange={(e) => {
                    const code = e.target.value.toUpperCase();
                    setUserData((prev) => ({ ...prev, referralCode: code }));
                    if (code.length === 0) {
                      setReferrerInfo(null);
                      setReferralCodeError("");
                    } else if (code.length >= 8) {
                      verifyReferralCode(code);
                    } else {
                      setReferrerInfo(null);
                      setReferralCodeError("");
                    }
                  }}
                  placeholder="Enter referral code if you have one"
                  className="w-full pl-10 pr-20 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {verifyingCode ? (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-semibold text-slate-400">
                    Checking...
                  </span>
                ) : referrerInfo ? (
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 inline-flex items-center gap-1 text-[11px] font-bold text-emerald-600">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Valid
                  </span>
                ) : null}
              </div>
              {referralCodeError ? (
                <p className="mt-1 text-xs text-rose-600">
                  {referralCodeError} Remove it or correct it to continue.
                </p>
              ) : referrerInfo ? (
                <p className="mt-1 text-xs font-medium text-emerald-600">
                  Referred by: {referrerInfo.name}
                </p>
              ) : null}
            </div>

            {(errorMsg || props.errorMessage) && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs font-medium text-rose-700">
                {errorMsg || props.errorMessage}
              </div>
            )}

            {props.successMessage && (
              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-medium text-emerald-700">
                {props.successMessage}
              </div>
            )}

            <button
              type="submit"
              disabled={isloading}
              className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-bold flex items-center justify-center gap-2 shadow-sm shadow-blue-600/20 transition-all"
            >
              <span>
                {isloading ? "Creating Account..." : "Create Account"}
              </span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <p className="text-center text-xs text-slate-500 pt-1">
              Already have an account?{" "}
              <Link
                to="/auth/login"
                className="font-bold text-blue-600 hover:text-blue-700"
              >
                Sign in here
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Register;
