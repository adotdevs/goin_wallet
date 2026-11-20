import React, { useEffect, useRef } from "react";
import { KycAuthProvider } from "./KycPortalContext";
import { useAuthenticatedPortalAssets } from "./kycApi";
import TopProgressBar from "./TopProgressBar";
import "./kyc-portal.css";

export default function KycPortalShell({ children }) {
  const rootRef = useRef(null);
  useAuthenticatedPortalAssets(rootRef);

  useEffect(() => {
    document.documentElement.classList.add("kyc-portal-active");
    return () => {
      document.documentElement.classList.remove("kyc-portal-active");
    };
  }, []);

  return (
    <div id="kyc-portal" ref={rootRef}>
      <KycAuthProvider>
        <TopProgressBar />
        {children}
      </KycAuthProvider>
    </div>
  );
}
