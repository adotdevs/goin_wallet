import React, { useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import useMenuList from "./Menu";
import SidebarExtraContent from "./SidebarExtraContent";
import { logoutApi, getsignUserApi } from "../../../Api/Service";
import { useAuthUser, useSignOut } from "react-auth-kit";
import { toast } from "react-toastify";
import { useDispatch, useSelector } from "react-redux";
import { navtoggle } from "../../../store/actions/AuthActions";
import GoinLogo from "../../pages/kycPortal/GoinLogo";
import {
  LayoutDashboard,
  Wallet,
  Coins,
  ArrowLeftRight,
  Layers,
  ReceiptText,
  CreditCard,
  Repeat,
  Bot,
  Landmark,
  Share2,
  Users,
  FileText,
  FileSignature,
  ShieldCheck,
  AlertCircle,
  Clock,
  XCircle,
  HelpCircle,
  ClipboardList,
  Headphones,
  LogOut,
  User,
  ChevronRight,
  X,
} from "lucide-react";

function getLucideIconForItem(title = "") {
  const t = title.toLowerCase().trim();
  if (t.includes("dashboard")) return LayoutDashboard;
  if (t.includes("asset")) return Wallet;
  if (t.includes("token")) return Coins;
  if (t.includes("swap")) return ArrowLeftRight;
  if (t.includes("staking")) return Layers;
  if (t.includes("transaction")) return ReceiptText;
  if (t.includes("payment")) return CreditCard;
  if (t.includes("exchange")) return Repeat;
  if (t.includes("trading") || t.includes("bot")) return Bot;
  if (t.includes("card")) return CreditCard;
  if (t.includes("loan")) return Landmark;
  if (t.includes("refer")) return Share2;
  if (t.includes("affiliate")) return Users;
  if (t.includes("document")) return FileText;
  if (t.includes("help")) return HelpCircle;
  if (t.includes("tax")) return ClipboardList;
  if (t.includes("support")) return Headphones;
  return LayoutDashboard;
}

const SideBar = () => {
  const Navigate = useNavigate();
  const signOut = useSignOut();
  const authUser = useAuthUser();
  const location = useLocation();
  const dispatch = useDispatch();
  const sideMenu = useSelector((state) => state.sideMenu);
  const MenuList = useMenuList();

  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    const sessionUser = authUser()?.user;
    if (!sessionUser?._id || sessionUser.role !== "user") return;
    let active = true;
    const loadUser = async () => {
      try {
        const fd = new FormData();
        fd.append("id", sessionUser._id);
        const res = await getsignUserApi(fd);
        if (active && res?.success && res?.signleUser) {
          setUserProfile(res.signleUser);
        }
      } catch {
        // ignore
      }
    };
    loadUser();
    return () => {
      active = false;
    };
  }, [location.pathname]);

  const closeMobileSidebar = () => {
    if (window.innerWidth <= 1024 && sideMenu) {
      dispatch(navtoggle());
    }
  };

  const onLogout = async () => {
    try {
      const logout = await logoutApi();
      if (logout.success) {
        signOut();
        localStorage.removeItem("token");
        localStorage.removeItem("authToken");
        localStorage.removeItem("authUser");
        localStorage.removeItem("auth_state");
        localStorage.removeItem("jwttoken");
        Navigate("/auth/login");
        return;
      } else {
        toast.dismiss();
        toast.error(logout.msg);
      }
    } catch (error) {
      toast.dismiss();
      toast.error(error?.message || "Failed to log out");
    }
  };

  const isVerified = userProfile?.kyc === true;
  const kycDocStatus = userProfile?.submitDoc?.status;
  const kycState = isVerified
    ? "verified"
    : kycDocStatus === "completed"
    ? "pending"
    : kycDocStatus === "rejected"
    ? "rejected"
    : "unverified";

  const isPathActive = (to) => {
    if (!to || to === "#") return false;
    const cleanTo = String(to).split("?")[0];
    if (cleanTo === "/dashboard") return location.pathname === "/dashboard";
    return location.pathname.startsWith(cleanTo);
  };

  return (
    <>
      {sideMenu && (
        <div
          className="up-mobile-overlay"
          onClick={closeMobileSidebar}
          aria-hidden="true"
        />
      )}

      <aside className="dlabnav">
        {/* Mobile drawer header */}
        <div
          className="up-mobile-drawer-head"
          style={{
            display: "none",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "14px 16px",
            borderBottom: "1px solid #e2e8f0",
          }}
        >
          <Link to="/dashboard" onClick={closeMobileSidebar}>
            <GoinLogo height={28} width={112} theme="light" />
          </Link>
          <button
            type="button"
            onClick={closeMobileSidebar}
            style={{
              width: 32,
              height: 32,
              borderRadius: 8,
              border: "1px solid #e2e8f0",
              background: "#f8fafc",
              color: "#475569",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
            aria-label="Close navigation"
          >
            <X size={16} />
          </button>
        </div>

        <div className="up-sidebar-scroll">
          {/* Portfolio Balance Summary */}
          <SidebarExtraContent />

          {/* Main Wallet Menu */}
          <div>
            <div className="up-nav-section-label">Wallet &amp; Portfolio</div>
            <ul className="up-nav-list">
              {MenuList.map((item, index) => {
                const Icon = getLucideIconForItem(item.title);
                const active = !item.external && isPathActive(item.to);
                return (
                  <li key={index}>
                    {item.external ? (
                      <a
                        href={item.to}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={closeMobileSidebar}
                        className="up-nav-item"
                      >
                        <span className="up-nav-item-left">
                          <Icon size={16} />
                          <span>{item.title}</span>
                        </span>
                      </a>
                    ) : (
                      <Link
                        to={item.to}
                        onClick={closeMobileSidebar}
                        className={`up-nav-item ${active ? "active" : ""}`}
                      >
                        <span className="up-nav-item-left">
                          <Icon size={16} />
                          <span>{item.title}</span>
                        </span>
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Unified Compliance & Document Signing Section */}
          <div>
            <div className="up-nav-section-label">Compliance &amp; Signing</div>
            <ul className="up-nav-list">
              <li>
                <Link
                  to="/flows/kyc"
                  onClick={closeMobileSidebar}
                  className={`up-nav-item ${isPathActive("/flows/kyc") ? "active" : ""}`}
                >
                  <span className="up-nav-item-left">
                    <ShieldCheck size={16} />
                    <span>KYC Verification</span>
                  </span>
                  <span
                    className="up-nav-badge"
                    style={{
                      background:
                        kycState === "verified"
                          ? "#d1fae5"
                          : kycState === "pending"
                          ? "#dbeafe"
                          : kycState === "rejected"
                          ? "#ffe4e6"
                          : "#fef3c7",
                      color:
                        kycState === "verified"
                          ? "#047857"
                          : kycState === "pending"
                          ? "#1d4ed8"
                          : kycState === "rejected"
                          ? "#be123c"
                          : "#b45309",
                    }}
                  >
                    {kycState === "verified"
                      ? "Verified"
                      : kycState === "pending"
                      ? "Review"
                      : kycState === "rejected"
                      ? "Rejected"
                      : "Required"}
                  </span>
                </Link>
              </li>

              <li>
                <Link
                  to="/flows/documents"
                  onClick={closeMobileSidebar}
                  className={`up-nav-item ${isPathActive("/flows/documents") ? "active" : ""}`}
                >
                  <span className="up-nav-item-left">
                    <FileSignature size={16} />
                    <span>Document Signing</span>
                  </span>
                </Link>
              </li>

              <li>
                <Link
                  to="/flows/kyc-profile"
                  onClick={closeMobileSidebar}
                  className={`up-nav-item ${isPathActive("/flows/kyc-profile") ? "active" : ""}`}
                >
                  <span className="up-nav-item-left">
                    <User size={16} />
                    <span>Profile &amp; Signature</span>
                  </span>
                </Link>
              </li>

              <li>
                <Link
                  to="/support"
                  onClick={closeMobileSidebar}
                  className={`up-nav-item ${isPathActive("/support") ? "active" : ""}`}
                >
                  <span className="up-nav-item-left">
                    <Headphones size={16} />
                    <span>Support Desk</span>
                  </span>
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom KYC Status Card + Logout */}
        <div className="up-sidebar-footer">
          <Link
            to="/flows/kyc"
            onClick={closeMobileSidebar}
            className={`up-sidebar-kyc-card ${kycState}`}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 9, minWidth: 0 }}>
              {kycState === "verified" ? (
                <ShieldCheck size={17} style={{ flexShrink: 0 }} />
              ) : kycState === "pending" ? (
                <Clock size={17} style={{ flexShrink: 0 }} />
              ) : kycState === "rejected" ? (
                <XCircle size={17} style={{ flexShrink: 0 }} />
              ) : (
                <AlertCircle size={17} style={{ flexShrink: 0 }} />
              )}
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, fontWeight: 700, lineHeight: 1.2 }}>
                  {kycState === "verified"
                    ? "KYC Verified"
                    : kycState === "pending"
                    ? "KYC Under Review"
                    : kycState === "rejected"
                    ? "KYC Action Needed"
                    : "Complete KYC"}
                </div>
                <div style={{ fontSize: 10, opacity: 0.85, marginTop: 2 }}>
                  {kycState === "verified"
                    ? "Identity approved"
                    : kycState === "pending"
                    ? "Compliance reviewing"
                    : kycState === "rejected"
                    ? "Please resubmit docs"
                    : "Upload ID & Address"}
                </div>
              </div>
            </div>
            <ChevronRight size={15} style={{ flexShrink: 0, opacity: 0.7 }} />
          </Link>

          <button
            type="button"
            className="up-logout-btn"
            onClick={() => {
              closeMobileSidebar();
              onLogout();
            }}
          >
            <LogOut size={15} />
            <span>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default SideBar;
