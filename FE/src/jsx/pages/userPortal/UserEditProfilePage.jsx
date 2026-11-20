import React, { useEffect, useState } from "react";
import { useAuthUser, useSignOut } from "react-auth-kit";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Eye, EyeOff, Save, User, ShieldCheck } from "lucide-react";
import {
  logoutApi,
  signleUsersApi,
  updateSignleUsersApi,
} from "../../../Api/Service";
import UserPortalShell from "./UserPortalShell";

export default function UserEditProfilePage() {
  const authUser = useAuthUser();
  const signOut = useSignOut();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [errors, setErrors] = useState({});
  const [userData, setUserData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    phone: "",
    address: "",
    city: "",
    country: "",
    postalCode: "",
  });

  useEffect(() => {
    const user = authUser()?.user;
    if (!user) return;
    if (["admin", "superadmin", "subadmin"].includes(user.role)) {
      navigate("/admin/dashboard", { replace: true });
      return;
    }

    const load = async () => {
      try {
        const res = await signleUsersApi(user._id);
        if (res?.success && res?.signleUser) {
          setUserData((prev) => ({
            ...prev,
            ...res.signleUser,
            password: res.signleUser.password || "",
            confirmPassword: res.signleUser.password || "",
          }));
        }
      } catch (err) {
        toast.error(err?.message || "Failed to load profile");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [authUser, navigate]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setUserData((prev) => ({ ...prev, [name]: value }));
  };

  const handleLogout = async () => {
    try {
      await logoutApi();
    } catch {
      // ignore
    }
    signOut();
    localStorage.removeItem("token");
    localStorage.removeItem("authToken");
    localStorage.removeItem("authUser");
    localStorage.removeItem("auth_state");
    navigate("/auth/login");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const errs = {};
    const required = [
      "firstName",
      "lastName",
      "email",
      "password",
      "confirmPassword",
      "phone",
      "address",
      "city",
      "country",
      "postalCode",
    ];
    required.forEach((f) => {
      if (!String(userData[f] || "").trim()) {
        errs[f] = "This field is required";
      }
    });
    if (userData.password !== userData.confirmPassword) {
      errs.confirmPassword = "Passwords do not match";
    }
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    try {
      setIsSubmitting(true);
      const res = await updateSignleUsersApi(userData._id, { ...userData });
      if (res?.success) {
        toast.success(res.msg || "Profile updated! Please sign in again.");
        await handleLogout();
      } else {
        toast.error(res?.msg || "Failed to update profile");
      }
    } catch (err) {
      toast.error(err?.message || "Failed to update profile");
    } finally {
      setIsSubmitting(false);
    }
  };

  const fieldClass =
    "w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-colors";

  return (
    <UserPortalShell title="Account Settings">
      <div className="space-y-6 w-full">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight m-0">
            Account Settings
          </h1>
          <p className="text-sm text-slate-500 mt-1 mb-0">
            Keep your personal contact details, residential address, and account credentials up to date.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900 m-0">
                  Personal Information
                </h2>
                <p className="text-xs text-slate-500 m-0">
                  Changes will require re-authentication for security.
                </p>
              </div>
            </div>
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-xs font-semibold">
              <ShieldCheck className="w-3.5 h-3.5 text-blue-600" /> Protected Profile
            </span>
          </div>

          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-500">
              <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin mb-3" />
              <p className="text-sm m-0">Loading profile details...</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    First Name
                  </label>
                  <input
                    type="text"
                    name="firstName"
                    value={userData.firstName || ""}
                    onChange={handleChange}
                    className={fieldClass}
                  />
                  {errors.firstName && (
                    <p className="text-xs text-rose-600 mt-1 mb-0">{errors.firstName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Last Name
                  </label>
                  <input
                    type="text"
                    name="lastName"
                    value={userData.lastName || ""}
                    onChange={handleChange}
                    className={fieldClass}
                  />
                  {errors.lastName && (
                    <p className="text-xs text-rose-600 mt-1 mb-0">{errors.lastName}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={userData.email || ""}
                    onChange={handleChange}
                    className={fieldClass}
                  />
                  {errors.email && (
                    <p className="text-xs text-rose-600 mt-1 mb-0">{errors.email}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    name="phone"
                    value={userData.phone || ""}
                    onChange={handleChange}
                    className={fieldClass}
                  />
                  {errors.phone && (
                    <p className="text-xs text-rose-600 mt-1 mb-0">{errors.phone}</p>
                  )}
                </div>

                <div className="md:col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Residential Address
                  </label>
                  <input
                    type="text"
                    name="address"
                    value={userData.address || ""}
                    onChange={handleChange}
                    className={fieldClass}
                  />
                  {errors.address && (
                    <p className="text-xs text-rose-600 mt-1 mb-0">{errors.address}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    City
                  </label>
                  <input
                    type="text"
                    name="city"
                    value={userData.city || ""}
                    onChange={handleChange}
                    className={fieldClass}
                  />
                  {errors.city && (
                    <p className="text-xs text-rose-600 mt-1 mb-0">{errors.city}</p>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Postal Code
                    </label>
                    <input
                      type="text"
                      name="postalCode"
                      value={userData.postalCode || ""}
                      onChange={handleChange}
                      className={fieldClass}
                    />
                    {errors.postalCode && (
                      <p className="text-xs text-rose-600 mt-1 mb-0">{errors.postalCode}</p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Country
                    </label>
                    <input
                      type="text"
                      name="country"
                      value={userData.country || ""}
                      onChange={handleChange}
                      className={fieldClass}
                    />
                    {errors.country && (
                      <p className="text-xs text-rose-600 mt-1 mb-0">{errors.country}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={userData.password || ""}
                      onChange={handleChange}
                      className={`${fieldClass} pr-10`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 bg-transparent border-0 p-0 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.password && (
                    <p className="text-xs text-rose-600 mt-1 mb-0">{errors.password}</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirm ? "text" : "password"}
                      name="confirmPassword"
                      value={userData.confirmPassword || ""}
                      onChange={handleChange}
                      className={`${fieldClass} pr-10`}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm((s) => !s)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 bg-transparent border-0 p-0 cursor-pointer"
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {errors.confirmPassword && (
                    <p className="text-xs text-rose-600 mt-1 mb-0">{errors.confirmPassword}</p>
                  )}
                </div>
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-bold border-0 shadow-sm cursor-pointer transition-colors"
                >
                  <Save className="w-4 h-4" />
                  {isSubmitting ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </UserPortalShell>
  );
}
