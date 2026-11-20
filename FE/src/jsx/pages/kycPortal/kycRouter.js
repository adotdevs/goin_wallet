import { useMemo } from "react";
import { useNavigate } from "react-router-dom";

export function rewriteKycPath(url) {
  if (typeof url !== "string") return url;
  if (
    url.startsWith("/flows/") ||
    url.startsWith("/admin/kyc") ||
    url.startsWith("/auth/") ||
    url.startsWith("/api/") ||
    url.startsWith("http")
  ) {
    return url;
  }

  let next = url.replace("/admin/users/", "/admin/kyc/users/");
  if (next === "/admin" || next.startsWith("/admin?") || next.startsWith("/admin#")) {
    next = `/admin/kyc${next.slice("/admin".length)}`;
  }
  if (next === "/documents" || next.startsWith("/documents?") || next.startsWith("/documents#")) {
    next = `/flows${next}`;
  }
  if (next === "/kyc" || next.startsWith("/kyc?") || next.startsWith("/kyc#")) {
    next = `/flows${next}`;
  }
  if (next === "/profile" || next.startsWith("/profile?") || next.startsWith("/profile#")) {
    next = `/flows/kyc-profile${next.slice("/profile".length)}`;
  }
  if (next === "/login" || next.startsWith("/login?")) {
    next = `/auth/login${next.slice("/login".length)}`;
  }
  return next;
}

export function useKycRouter() {
  const navigate = useNavigate();
  return useMemo(
    () => ({
      push: (url) => navigate(rewriteKycPath(url)),
      replace: (url) => navigate(rewriteKycPath(url), { replace: true }),
    }),
    [navigate]
  );
}
