import React, { useEffect, useState } from "react";
import { useAuthUser } from "react-auth-kit";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { Coins, Search } from "lucide-react";
import { getLinksApi, getMyTokensApi, getsignUserApi } from "../../../Api/Service";
import UserPortalShell from "./UserPortalShell";

export default function UserTokensPage() {
  const authUser = useAuthUser();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [tokens, setTokens] = useState([]);
  const [search, setSearch] = useState("");
  const [userCurrency, setUserCurrency] = useState("USD");

  useEffect(() => {
    const user = authUser()?.user;
    if (!user) return;
    if (["admin", "superadmin", "subadmin"].includes(user.role)) {
      navigate("/admin/dashboard", { replace: true });
      return;
    }

    const load = async () => {
      try {
        const linksData = await getLinksApi();
        if (!linksData?.links?.[8]?.enabled) {
          navigate(-1);
          return;
        }

        const fd = new FormData();
        fd.append("id", user._id);
        const [profileRes, tokensRes] = await Promise.all([
          getsignUserApi(fd).catch(() => null),
          getMyTokensApi(user._id).catch(() => null),
        ]);

        if (profileRes?.success && profileRes?.signleUser?.currency) {
          setUserCurrency(profileRes.signleUser.currency);
        }

        if (tokensRes?.success) {
          setTokens(Array.isArray(tokensRes.myTokens) ? tokensRes.myTokens : []);
        } else if (tokensRes?.msg) {
          toast.error(tokensRes.msg);
        }
      } catch (err) {
        console.error("Error loading tokens:", err);
        toast.error("Failed to load tokens");
      } finally {
        setIsLoading(false);
      }
    };

    load();
  }, [authUser, navigate]);

  const filtered = tokens.filter((t) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      String(t.name || "").toLowerCase().includes(q) ||
      String(t.symbol || "").toLowerCase().includes(q)
    );
  });

  const totalPortfolioValue = tokens.reduce(
    (sum, t) => sum + (Number(t.totalValue) || 0),
    0
  );
  const currencySymbol = userCurrency === "EUR" ? "€" : "$";

  return (
    <UserPortalShell title="My Tokens">
      <div className="space-y-6 w-full">
        {/* Header & Summary Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight m-0">
              My Tokens
            </h1>
            <p className="text-sm text-slate-500 mt-1 mb-0">
              View your custom token holdings, unit valuation, and total allocation.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-white border border-slate-200/90 rounded-xl px-4 py-2.5 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 m-0">
                Total Value
              </p>
              <p className="text-lg font-bold text-slate-900 m-0 tabular-nums">
                {currencySymbol}
                {totalPortfolioValue.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>
            <div className="bg-white border border-slate-200/90 rounded-xl px-4 py-2.5 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 m-0">
                Tokens
              </p>
              <p className="text-lg font-bold text-slate-900 m-0 tabular-nums">
                {tokens.length}
              </p>
            </div>
          </div>
        </div>

        {/* Main Card */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Coins className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-slate-900 m-0">
                Token Holdings
              </h2>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search token name or symbol..."
                className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15 transition-colors"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-500">
              <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin mb-3" />
              <p className="text-sm font-medium m-0">Loading your tokens...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mb-3">
                <Coins className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-slate-900 m-0">
                No tokens found
              </h3>
              <p className="text-sm text-slate-500 mt-1 mb-0">
                {search
                  ? "No tokens match your search query."
                  : "You do not have any custom tokens in your portfolio yet."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100">
                    <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Token
                    </th>
                    <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Symbol
                    </th>
                    <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">
                      Quantity
                    </th>
                    <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">
                      Token Value
                    </th>
                    <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500 text-right">
                      Total Value
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((token, idx) => (
                    <tr
                      key={token._id || idx}
                      className="hover:bg-slate-50/70 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {token.logo ? (
                            <img
                              src={token.logo}
                              alt={token.name || token.symbol}
                              onError={(e) => {
                                e.currentTarget.style.display = "none";
                              }}
                              className="w-10 h-10 rounded-full object-cover border border-slate-200 bg-slate-100 shrink-0"
                            />
                          ) : (
                            <div className="w-10 h-10 rounded-full bg-blue-50 text-blue-700 font-bold text-xs flex items-center justify-center border border-blue-100 shrink-0">
                              {String(token.symbol || token.name || "T")
                                .slice(0, 3)
                                .toUpperCase()}
                            </div>
                          )}
                          <span className="text-sm font-semibold text-slate-900">
                            {token.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-xs font-bold uppercase tracking-wide">
                          {token.symbol}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-semibold text-slate-900 tabular-nums">
                        {Number(token.quantity || 0).toLocaleString()}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-medium text-slate-600 tabular-nums">
                        {currencySymbol}
                        {Number(token.value || 0).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 4,
                        })}
                      </td>
                      <td className="px-6 py-4 text-right text-sm font-bold text-slate-900 tabular-nums">
                        {currencySymbol}
                        {Number(token.totalValue || 0).toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </UserPortalShell>
  );
}
