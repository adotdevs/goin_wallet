import React, { useEffect, useState } from "react";
import { useAuthUser } from "react-auth-kit";
import { useNavigate } from "react-router-dom";
import { getLinksApi } from "../../../Api/Service";
import UserPortalShell from "./UserPortalShell";
import ApplyLoanSec from "../dashboard/ApplyLoanSec.js";

const isLoanLinkEnabled = (links) => {
  if (!Array.isArray(links)) return false;
  const loanLink =
    links.find((l) => l.name === "Apply For Loan" || l.path === "/flows/apply-loan") ||
    links[10];
  return Boolean(loanLink?.enabled);
};

export default function UserApplyLoanPage() {
  const authUser = useAuthUser();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [linkAllowed, setLinkAllowed] = useState(false);

  useEffect(() => {
    const role = authUser()?.user?.role;
    if (["admin", "superadmin", "subadmin"].includes(role)) {
      navigate("/admin/dashboard", { replace: true });
      return;
    }

    const fetchLinks = async () => {
      try {
        const data = await getLinksApi();
        if (isLoanLinkEnabled(data?.links)) {
          setLinkAllowed(true);
        } else {
          navigate("/dashboard", { replace: true });
        }
      } catch (error) {
        console.error("Error fetching links:", error);
        navigate("/dashboard", { replace: true });
      }
    };
    fetchLinks();
  }, [authUser, navigate]);

  useEffect(() => {
    if (!linkAllowed) return undefined;

    const onVisible = () => {
      if (document.visibilityState === "visible") {
        getLinksApi().then((data) => {
          if (!isLoanLinkEnabled(data?.links)) {
            navigate("/dashboard", { replace: true });
          }
        });
      }
    };

    document.addEventListener("visibilitychange", onVisible);
    const interval = setInterval(async () => {
      try {
        const data = await getLinksApi();
        if (!isLoanLinkEnabled(data?.links)) {
          navigate("/dashboard", { replace: true });
        }
      } catch {
        /* ignore transient errors */
      }
    }, 15000);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      clearInterval(interval);
    };
  }, [linkAllowed, navigate]);

  return (
    <UserPortalShell title="Apply for Loan">
      {isLoading || !linkAllowed ? (
        <div className="flex items-center justify-center py-24 relative">
          <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
          {linkAllowed && (
            <div style={{ opacity: 0, position: "absolute", left: "-2000%" }}>
              <ApplyLoanSec isLoading={isLoading} setisLoading={setIsLoading} />
            </div>
          )}
        </div>
      ) : (
        <div className="apply-loan-wrapper space-y-6 pb-8">
          <ApplyLoanSec isLoading={isLoading} setisLoading={setIsLoading} />
        </div>
      )}
    </UserPortalShell>
  );
}
