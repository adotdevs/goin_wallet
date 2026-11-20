import React, { useEffect } from "react";
import { useAuthUser } from "react-auth-kit";
import { useNavigate, useParams } from "react-router-dom";
import UserPortalShell from "./UserPortalShell";
import UserAssetsSection from "./components/UserAssetsSection";
import Orders from "../report/Assests";

export default function UserAssetsPage() {
  const authUser = useAuthUser();
  const navigate = useNavigate();
  const { coinSlug } = useParams();

  useEffect(() => {
    const role = authUser()?.user?.role;
    if (role === "admin" || role === "superadmin" || role === "subadmin") {
      navigate("/admin/dashboard", { replace: true });
    }
  }, [authUser, navigate]);

  return (
    <UserPortalShell title="My Assets">
      <div className="space-y-6 w-full">
        {coinSlug ? (
          <Orders />
        ) : (
          <>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight m-0">
                My Assets
              </h1>
              <p className="text-sm text-slate-500 mt-1 mb-0">
                View balances, activate wallets, and manage your crypto &amp; fiat holdings.
              </p>
            </div>
            <UserAssetsSection />
          </>
        )}
      </div>
    </UserPortalShell>
  );
}
