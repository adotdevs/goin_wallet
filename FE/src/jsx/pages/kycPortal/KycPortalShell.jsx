import React, { useEffect, useRef } from "react";
import { useAuthUser } from "react-auth-kit";
import { KycAuthProvider } from "./KycPortalContext";
import { useAuthenticatedPortalAssets } from "./kycApi";
import TopProgressBar from "./TopProgressBar";
import UserPortalShell from "../userPortal/UserPortalShell";
import "./kyc-portal.css";

export default function KycPortalShell({ children }) {
  const rootRef = useRef(null);
  const authUser = useAuthUser();
  useAuthenticatedPortalAssets(rootRef);

  const sessionRole = authUser()?.user?.role;
  const isClientUser = sessionRole === "user";

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

  return (
    <div id="kyc-portal" ref={rootRef}>
      <KycAuthProvider>
        <TopProgressBar />
        {children}
      </KycAuthProvider>
    </div>
  );
}
