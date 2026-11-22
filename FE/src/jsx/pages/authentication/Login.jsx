import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { toast } from "react-toastify";
import { loginApi } from "../../../Api/Service";
import { useSignIn, useIsAuthenticated, useAuthUser } from "react-auth-kit";
import { isBackendLocalhost, isElectronApp } from "../../../config/appConfig";
import GoinLogo from "../kycPortal/GoinLogo";
import "../kycPortal/kyc-portal.css";
import {
  Mail,
  Lock,
  ArrowRight,
  Eye,
  EyeOff,
} from "lucide-react";

function Login(props) {
  const [isloading, setisloading] = useState(false);
  const signIn = useSignIn();
  const isAuthenticated = useIsAuthenticated();
  const authUser = useAuthUser();
  const navigate = useNavigate();
  const location = useLocation();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [type1, settype1] = useState("password");
  const [errorMsg, setErrorMsg] = useState("");

  let errorsObj = { email: "", password: "" };
  const [errors, setErrors] = useState(errorsObj);

  useEffect(() => {
    document.documentElement.classList.add("kyc-portal-active");
    return () => {
      document.documentElement.classList.remove("kyc-portal-active");
    };
  }, []);

  const handleTogglePassword = () => {
    settype1((prev) => (prev === "password" ? "text" : "password"));
  };

  const onLogin = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    let error = false;
    const errorObj = { email: "", password: "" };
    if (email.trim() === "") {
      errorObj.email = "Email is required";
      error = true;
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        errorObj.email = "Please enter a valid email address";
        error = true;
      }
    }

    if (password === "") {
      errorObj.password = "Password is Required";
      error = true;
    }
    setErrors(errorObj);
    if (error) {
      return;
    }
    setisloading(true);
    try {
      let data = { email, password };

      const updateHeader = await loginApi(data);
      let newData = updateHeader;
      if (updateHeader.success === true && updateHeader.link === false) {
        newData = {
          success: updateHeader.success,
          token: updateHeader.token,
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
            fiscalProfile: updateHeader.user.fiscalProfile,
            permissions: updateHeader.user.permissions || {},
            adminPermissions: updateHeader.user.adminPermissions || {},
          },
        };
      }

      const tokenValue =
        typeof updateHeader.token === "string"
          ? updateHeader.token
          : updateHeader.token?.token || updateHeader.token;

      if (
        updateHeader.success &&
        updateHeader.link === false &&
        tokenValue &&
        signIn({
          token: tokenValue,
          expiresIn: 4317,
          tokenType: "Bearer",
          authState: newData,
          sameSite: false,
        })
      ) {
        if (isElectronApp() || isBackendLocalhost()) {
          localStorage.setItem("jwttoken", tokenValue);
          const envType = isElectronApp() ? "Electron" : "localhost backend";
          console.log(
            `🔐 [Login] Token stored in localStorage for ${envType}:`,
            tokenValue.substring(0, 20) + "..."
          );
          const stored = localStorage.getItem("jwttoken");
          if (!stored || stored !== tokenValue) {
            console.error("❌ [Login] Failed to store token in localStorage!");
          }
        }
        toast.dismiss();
        toast.success(updateHeader.msg);

        setTimeout(() => {
          if (updateHeader.user.role === "user") {
            const redirectTo = location.state?.from || "/dashboard";
            navigate(redirectTo);
            return;
          } else if (
            updateHeader.user.role === "admin" ||
            updateHeader.user.role === "subadmin" ||
            updateHeader.user.role === "superadmin"
          ) {
            const redirectTo = location.state?.from || "/admin/dashboard";
            navigate(redirectTo);
            return;
          }
        }, 100);
      } else if (updateHeader.success === true && updateHeader.link === true) {
        toast.dismiss();
        toast.info(updateHeader.msg);
        setPassword("");
        return;
      } else {
        const msg = updateHeader.msg || "Invalid email or password";
        setErrorMsg(msg);
        toast.dismiss();
        toast.error(msg);
      }
    } catch (error) {
      const msg = error?.data?.msg || "Something went wrong";
      setErrorMsg(msg);
      toast.dismiss();
      toast.error(msg);
    } finally {
      setisloading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated() && authUser()?.user?.role === "user") {
      navigate("/dashboard");
      return;
    }
    if (
      isAuthenticated() &&
      ["admin", "subadmin", "superadmin"].includes(authUser()?.user?.role)
    ) {
      navigate("/admin/dashboard");
    }
  }, []);

  const showPassword = type1 === "text";

  return (
    <div id="kyc-portal">
      <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <div className="flex items-center justify-center">
            <Link to="/" title="GOin SAS">
              <GoinLogo height={42} width={168} theme="light" />
            </Link>
          </div>

          <h2 className="mt-5 text-center text-2xl font-extrabold text-slate-900">
            Sign in to your account
          </h2>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <form
            onSubmit={onLogin}
            className="bg-white rounded-2xl border border-slate-200/90 p-6 sm:p-8 shadow-card space-y-5"
          >
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              {errors.email && (
                <p className="mt-1.5 text-xs font-medium text-rose-600">{errors.email}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={type1}
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
                <p className="mt-1.5 text-xs font-medium text-rose-600">{errors.password}</p>
              )}
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
              <span>{isloading ? "Signing in..." : "Sign In"}</span>
              <ArrowRight className="w-4 h-4" />
            </button>

            <p className="text-center text-xs text-slate-500 pt-1">
              Don&apos;t have an account yet?{" "}
              <Link
                to="/auth/signup"
                className="font-bold text-blue-600 hover:text-blue-700"
              >
                Create an account
              </Link>
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}

export default Login;
