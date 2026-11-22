import React, { useEffect, useRef, useState } from "react";
import { useAuthUser } from "react-auth-kit";
import { useLocation } from "react-router-dom";
import { KycAuthProvider } from "./KycPortalContext";
import { useAuthenticatedPortalAssets } from "./kycApi";
import TopProgressBar from "./TopProgressBar";
import UserPortalShell from "../userPortal/UserPortalShell";
import AdminShell from "../../Admin/theme/AdminShell";
import { useAdminTheme } from "../../Admin/theme/adminTheme";
import SideBar from "../../layouts/AdminSidebar/Sidebar";
import AdminHeader from "../../Admin/adminHeader";
import "./kyc-portal.css";

function AdminKycInner({ children, rootRef, pageName }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const adminTheme = useAdminTheme();
  const isDark = adminTheme?.resolvedTheme === "dark";
  const toggleBar = () => setSidebarOpen((prev) => !prev);

  return (
    <div className="admin">
      <div className="bg-muted-100 pb-16 dark:bg-muted-900 min-h-screen">
        <SideBar state={sidebarOpen} toggle={toggleBar} />
        <div className="relative min-h-screen w-full overflow-x-hidden bg-muted-100 px-4 transition-all duration-300 dark:bg-muted-900 xl:px-8 lg:max-w-[calc(100%_-_280px)] lg:ms-[280px]">
          <div className="mx-auto w-full max-w-[1500px]">
            <AdminHeader toggle={toggleBar} pageName={pageName} />
            <div
              id="kyc-portal"
              ref={rootRef}
              className={`admin-kyc-embedded ${isDark ? "user-portal-dark" : ""}`}
            >
              <KycAuthProvider>
                <TopProgressBar />
                {children}
              </KycAuthProvider>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function KycPortalShell({ children }) {
  const rootRef = useRef(null);
  const authUser = useAuthUser();
  const location = useLocation();
  useAuthenticatedPortalAssets(rootRef);

  const sessionRole = authUser()?.user?.role;
  const isClientUser = sessionRole === "user";
  const isStaffUser =
    sessionRole === "superadmin" ||
    sessionRole === "admin" ||
    sessionRole === "subadmin";

  useEffect(() => {
    document.documentElement.classList.add("kyc-portal-active");
    return () => {
      document.documentElement.classList.remove("kyc-portal-active");
    };
  }, []);

  if (isClientUser) {
    return (
      <UserPortalShell noPadding showTicker={false}>
        <div ref={rootRef}>
          <KycAuthProvider>
            <TopProgressBar />
            {children}
          </KycAuthProvider>
        </div>
      </UserPortalShell>
    );
  }

  if (isStaffUser) {
    const pathname = location.pathname || "";
    const pageName = pathname.startsWith("/admin/kyc/users/")
      ? "Client KYC & Document Signing"
      : pathname.startsWith("/flows/documents")
        ? "Interactive Document Gallery"
        : pathname.startsWith("/flows/kyc-profile")
          ? "Signature & Compliance Profile"
          : "KYC & Documents Console";

    return (
      <AdminShell>
        <AdminKycInner rootRef={rootRef} pageName={pageName}>
          {children}
        </AdminKycInner>
      </AdminShell>
    );
  }

  return (
    <div id="kyc-portal" ref={rootRef}>
      <KycAuthProvider>
        <TopProgressBar />
        {children}
      </KycAuthProvider>
    </div>
  );
}
