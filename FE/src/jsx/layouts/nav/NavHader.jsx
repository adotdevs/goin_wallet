import React from "react";
import { Link } from "react-router-dom";
import GoinLogo from "../../pages/kycPortal/GoinLogo";

const NavHader = () => {
  return (
    <div className="nav-header">
      <Link to="/dashboard" className="brand-logo" title="GOin SAS">
        <GoinLogo height={32} width={128} theme="light" />
      </Link>
    </div>
  );
};

export default NavHader;
