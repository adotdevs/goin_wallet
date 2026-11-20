import React, { useEffect } from "react";
import { useAuthUser } from "react-auth-kit";
import { useNavigate } from "react-router-dom";
import UserPortalShell from "./UserPortalShell";
import StocksSec from "../report/StocksSec.jsx";

export default function UserStocksPage() {
  const authUser = useAuthUser();
  const navigate = useNavigate();

  useEffect(() => {
    const role = authUser()?.user?.role;
    if (role === "admin" || role === "superadmin" || role === "subadmin") {
      navigate("/admin/dashboard", { replace: true });
    }
  }, [authUser, navigate]);

  return (
    <UserPortalShell title="Stocks">
      <div className="space-y-6">
        <StocksSec />
      </div>
    </UserPortalShell>
  );
}
