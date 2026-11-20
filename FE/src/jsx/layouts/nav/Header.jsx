import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuthUser, useSignOut } from "react-auth-kit";
import { useDispatch } from "react-redux";
import { toast } from "react-toastify";
import { logoutApi, getsignUserApi } from "../../../Api/Service";
import { navtoggle } from "../../../store/actions/AuthActions";
import CryptoNewsTicker from "../../elements/dashboard/CryptoNewsTicker";
import {
  Menu,
  ShieldCheck,
  Clock,
  AlertCircle,
  XCircle,
  FileSignature,
  ChevronDown,
  Settings,
  User,
  LogOut,
  FileText,
} from "lucide-react";

const PAGE_TITLES = {
  dashboard: "Dashboard",
  assets: "My Assets",
  tokens: "My Tokens",
  swap: "Swap",
  staking: "Staking",
  transactions: "Transactions",
  account: "Payment Methods",
  exchanges: "Exchanges",
  trading: "AI Trading Bot",
  "crypto-card": "Crypto Card",
  "apply-loan": "Apply for Loan",
  "referral-promo": "Refer & Earn",
  affiliate: "My Affiliate",
  "all-files": "Documents",
  "edit-profile": "Account Settings",
  support: "Support Desk",
  "create-ticket": "Create Ticket",
  tickets: "Support Ticket",
  market: "Market",
  stocks: "Stocks",
  legal: "Legal",
  kyc: "KYC Verification",
  documents: "Document Signing",
  "kyc-profile": "Profile & Signature",
};

const Header = () => {
  const authUser = useAuthUser();
  const signOut = useSignOut();
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useDispatch();

  const [isUser, setIsUser] = useState({});
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  const sessionUser = authUser()?.user || {};

  useEffect(() => {
    const handleOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutside);
    return () => document.removeEventListener("mousedown", handleOutside);
  }, []);

  useEffect(() => {
    if (sessionUser?.role !== "user" || !sessionUser?._id) return;
    let active = true;
    const loadProfile = async () => {
      try {
        const fd = new FormData();
        fd.append("id", sessionUser._id);
        const res = await getsignUserApi(fd);
        if (active && res?.success && res?.signleUser) {
          setIsUser(res.signleUser);
        }
      } catch {
        // ignore
      }
    };
    loadProfile();
    return () => {
      active = false;
    };
  }, [location.pathname, sessionUser?._id, sessionUser?.role]);

  const handleLogout = async () => {
    setMenuOpen(false);
    try {
      const res = await logoutApi();
      if (res?.success) {
        signOut();
        localStorage.removeItem("token");
        localStorage.removeItem("authToken");
        localStorage.removeItem("authUser");
        localStorage.removeItem("auth_state");
        localStorage.removeItem("jwttoken");
        navigate("/auth/login");
      } else {
        toast.dismiss();
        toast.error(res?.msg || "Logout failed");
      }
    } catch (error) {
      toast.dismiss();
      toast.error(error?.message || "Logout failed");
    }
  };

  // Resolve clean page title from current route
  const isRouteParamId = (segment = "") =>
    /^[a-f0-9]{24}$/i.test(segment) || /^[0-9]+$/.test(segment);
  const segments = location.pathname.split("/").filter(Boolean);
  let lastSeg = (segments[segments.length - 1] || "dashboard").toLowerCase();
  if (isRouteParamId(lastSeg) && segments.length > 1) {
    lastSeg = segments[segments.length - 2].toLowerCase();
  }
  const pageTitle =
    PAGE_TITLES[lastSeg] ||
    lastSeg
      .split("-")
      .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
      .join(" ");

  const kycState =
    sessionUser?.role !== "user"
      ? null
      : isUser?.kyc === true
      ? "verified"
      : isUser?.submitDoc?.status === "completed"
      ? "pending"
      : isUser?.submitDoc?.status === "rejected"
      ? "rejected"
      : "unverified";

  const firstName = isUser?.firstName || sessionUser?.firstName || "";
  const lastName = isUser?.lastName || sessionUser?.lastName || "";
  const email = isUser?.email || sessionUser?.email || "";
  const initials = `${firstName[0] || ""}${lastName[0] || ""}`.toUpperCase() || "U";

  return (
    <header className="header">
      <div className="header-content">
        {/* Left: Mobile Drawer Toggle + Page Title */}
        <div className="up-header-left">
          <button
            type="button"
            className="up-mobile-menu-btn"
            onClick={() => dispatch(navtoggle())}
            aria-label="Toggle navigation menu"
          >
            <Menu size={19} />
          </button>
          <div style={{ minWidth: 0 }}>
            <h1 className="up-page-title">{pageTitle}</h1>
            <p className="up-page-sub up-hide-sm">
              Welcome back{firstName ? `, ${firstName}` : ""}
            </p>
          </div>
        </div>

        {/* Right: KYC Status Pill + Documents Pill + Profile Menu */}
        <div className="up-header-right">
          {kycState === "verified" && (
            <Link
              to="/flows/kyc"
              className="up-pill-link up-pill-verified"
              title="Identity verified"
            >
              <ShieldCheck size={14} />
              <span className="up-hide-sm">KYC Verified</span>
            </Link>
          )}
          {kycState === "pending" && (
            <Link
              to="/flows/kyc"
              className="up-pill-link up-pill-pending"
              title="KYC documents under compliance review"
            >
              <Clock size={14} />
              <span className="up-hide-sm">KYC Pending</span>
            </Link>
          )}
          {kycState === "rejected" && (
            <Link
              to="/flows/kyc"
              className="up-pill-link up-pill-rejected"
              title="KYC requires attention"
            >
              <XCircle size={14} />
              <span className="up-hide-sm">KYC Rejected</span>
            </Link>
          )}
          {kycState === "unverified" && (
            <Link
              to="/flows/kyc"
              className="up-pill-link up-pill-unverified"
              title="Complete KYC verification"
            >
              <AlertCircle size={14} />
              <span>Verify KYC</span>
            </Link>
          )}

          {sessionUser?.role === "user" && (
            <Link
              to="/flows/documents"
              className="up-pill-link up-pill-docs up-hide-sm"
              title="Sign and view documents"
            >
              <FileSignature size={14} />
              <span>Documents</span>
            </Link>
          )}

          {/* Profile Dropdown */}
          <div style={{ position: "relative" }} ref={menuRef}>
            <button
              type="button"
              className="up-profile-btn"
              onClick={() => setMenuOpen((prev) => !prev)}
            >
              <span className="up-avatar">{initials}</span>
              <div className="up-hide-sm" style={{ textAlign: "left", lineHeight: 1.2 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: "#0f172a" }}>
                  {firstName} {lastName}
                </div>
                <div style={{ fontSize: 10, fontWeight: 500, color: "#64748b" }}>
                  {kycState === "verified" ? "Verified Client" : "Client Account"}
                </div>
              </div>
              <ChevronDown size={14} style={{ color: "#94a3b8" }} />
            </button>

            {menuOpen && (
              <div className="up-profile-dropdown">
                <div
                  style={{
                    padding: "10px 16px",
                    borderBottom: "1px solid #f1f5f9",
                  }}
                >
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 700,
                      color: "#0f172a",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {firstName} {lastName}
                  </div>
                  <div
                    style={{
                      fontSize: 11,
                      color: "#64748b",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      marginTop: 2,
                    }}
                  >
                    {email}
                  </div>
                </div>

                <div style={{ padding: "4px 0" }}>
                  <Link
                    to="/flows/kyc"
                    className="up-dropdown-item"
                    onClick={() => setMenuOpen(false)}
                  >
                    <ShieldCheck size={15} style={{ color: "#2563eb" }} />
                    <span>KYC Verification</span>
                  </Link>
                  <Link
                    to="/flows/documents"
                    className="up-dropdown-item"
                    onClick={() => setMenuOpen(false)}
                  >
                    <FileText size={15} style={{ color: "#64748b" }} />
                    <span>Document Signing</span>
                  </Link>
                  <Link
                    to="/flows/kyc-profile"
                    className="up-dropdown-item"
                    onClick={() => setMenuOpen(false)}
                  >
                    <User size={15} style={{ color: "#64748b" }} />
                    <span>Profile &amp; Saved Signature</span>
                  </Link>
                  <Link
                    to="/edit-profile"
                    className="up-dropdown-item"
                    onClick={() => setMenuOpen(false)}
                  >
                    <Settings size={15} style={{ color: "#64748b" }} />
                    <span>Account Settings</span>
                  </Link>
                </div>

                <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 4 }}>
                  <button
                    type="button"
                    className="up-dropdown-item danger"
                    onClick={handleLogout}
                  >
                    <LogOut size={15} />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Live market ticker strip */}
      <CryptoNewsTicker />
    </header>
  );
};

export default Header;
