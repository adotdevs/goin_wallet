import React, { useEffect, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { useAuthUser } from "react-auth-kit";
import { toast } from "react-toastify";
import {
  LayoutDashboard,
  Wallet,
  ReceiptText,
  Landmark,
  CreditCard,
  ShieldCheck,
  FolderOpen,
  FileText,
  Coins,
  UserCog,
  Mail,
  Phone,
  MapPin,
  Copy,
  Check,
  ArrowLeft,
  Clock,
  CheckCircle2,
  Ban,
  Activity,
  Calendar,
} from "lucide-react";
import { signleUsersApi, updateWalletIntegrationStatusApi } from "../../../../Api/Service";
import { extractLivePrices, normalizeWalletUrl as _unused } from "../../../../utils/euroCoinUtils";
import { normalizeWalletUrl } from "../../../../utils/walletAccess";
import { buildAdminPriceMap } from "../../assets/adminTxDisplay";
import MemberPageChrome from "./MemberPageChrome";
import OverviewTab from "./OverviewTab";
import HubKycTab from "./tabs/HubKycTab";
import HubDocumentsTab from "./tabs/HubDocumentsTab";
import HubCryptoCardTab from "./tabs/HubCryptoCardTab";
import mm from "./MemberHub.module.css";
import { formatDate, formatDateTime, initials, isStaffProfile } from "./hubData";
import { clearHubCache, loadHubOverviewOnce, loadLoanOnce } from "./hubCache";

const UserAssets = React.lazy(() => import("../UserAssets"));
const UserBankAccounts = React.lazy(() => import("../UserBankAccounts"));
const UserLoanApplication = React.lazy(() => import("../UserLoanApplication"));
const General = React.lazy(() => import("../General"));
const UserTransactions = React.lazy(() => import("../UserTransactions"));
const UserTokens = React.lazy(() => import("../userTokens"));
const UserStaking = React.lazy(() => import("../userStaking"));

const BINANCE_TABS = [
  { key: "overview", tab: "overview", sub: "", label: "Overview", icon: LayoutDashboard },
  { key: "wallets", tab: "assets", sub: "wallets", label: "Wallets", icon: Wallet },
  { key: "transactions", tab: "transactions", sub: "", label: "Transactions", icon: ReceiptText },
  { key: "banking", tab: "assets", sub: "banking", label: "Bank Accounts", icon: Landmark },
  { key: "card", tab: "assets", sub: "card", label: "Crypto Card", icon: CreditCard },
  { key: "kyc", tab: "compliance", sub: "kyc", label: "KYC", icon: ShieldCheck },
  { key: "documents", tab: "compliance", sub: "documents", label: "Documents", icon: FolderOpen },
  { key: "loan", tab: "compliance", sub: "loan", label: "Loan", icon: FileText },
  { key: "portfolio", tab: "portfolio", sub: "", label: "Tokens & Staking", icon: Coins },
];

const resolveActiveKey = (tab, sub, editing) => {
  if (editing) return "edit";
  if (tab === "overview") return "overview";
  if (tab === "transactions") return "transactions";
  if (tab === "portfolio") return "portfolio";
  if (tab === "assets") {
    if (sub === "banking") return "banking";
    if (sub === "card") return "card";
    return "wallets";
  }
  if (tab === "compliance") {
    if (sub === "documents") return "documents";
    if (sub === "loan") return "loan";
    return "kyc";
  }
  return "overview";
};

const TabFallback = () => (
  <div className={`${mm.card} ${mm.cardPad}`}>
    <span className={mm.skel} style={{ height: 280, display: "block" }} />
  </div>
);

const MemberHub = () => {
  const { id } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const Navigate = useNavigate();
  const authUser = useAuthUser();

  const rawTab = searchParams.get("tab") || "overview";
  const rawSub = searchParams.get("sub") || "";
  const editing = searchParams.get("edit") === "1";
  const activeKey = resolveActiveKey(rawTab, rawSub, editing);

  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [coinDoc, setCoinDoc] = useState(null);
  const [prices, setPrices] = useState({});
  const [loan, setLoan] = useState(null);
  const [tokens, setTokens] = useState([]);
  const [canEdit, setCanEdit] = useState(true);
  const [copiedId, setCopiedId] = useState(false);
  const [approvingWallet, setApprovingWallet] = useState(false);
  const [localWalletStatus, setLocalWalletStatus] = useState(null);
  const [portfolioSub, setPortfolioSub] = useState("tokens");

  const goSection = (tab, extra = {}) => {
    const params = new URLSearchParams(searchParams);
    params.set("tab", tab);
    if (extra.sub) params.set("sub", extra.sub);
    else params.delete("sub");
    if (extra.edit) params.set("edit", "1");
    else params.delete("edit");
    setSearchParams(params, { replace: true });
  };

  useEffect(() => {
    let cancelled = false;

    const loadOverview = async () => {
      if (!id) return;
      try {
        setLoading(true);
        const current = authUser()?.user;
        if (current?.role === "user") {
          Navigate("/dashboard");
          return;
        }

        const overview = await loadHubOverviewOnce(id);
        if (cancelled || !overview) return;

        const { userRes, coinRes, tokenRes } = overview;

        if (userRes?.success) {
          const target = userRes.signleUser;
          setUser(target);

          if (current?.role === "admin") {
            const self = await signleUsersApi(current._id);
            if (cancelled) return;
            if (
              target?.role !== "user" &&
              self?.signleUser?.adminPermissions?.isSubManagement === false
            ) {
              Navigate("/admin/dashboard");
              return;
            }
            setCanEdit(true);
          } else if (current?.role === "subadmin") {
            const self = await signleUsersApi(current._id);
            if (cancelled) return;
            const canView = self?.signleUser?.permissions?.viewClientDetails === true;
            const canChange = self?.signleUser?.permissions?.editUserProfile === true;
            setCanEdit(canChange);
            if (!canView) {
              toast.error("You do not have permission to view client personal details");
              goSection("assets", { sub: "wallets" });
            }
          } else {
            setCanEdit(true);
          }

          if (isStaffProfile(target)) {
            setLoading(false);
            return;
          }
        } else {
          toast.error(userRes?.msg || "Failed to load member");
        }

        const loanDoc = await loadLoanOnce(id);
        if (cancelled) return;

        if (coinRes?.success) {
          setCoinDoc(coinRes.getCoin || null);
          const live = extractLivePrices(coinRes, userRes?.signleUser?.currency);
          setPrices(
            buildAdminPriceMap({
              liveBtc: live.btc,
              liveEth: live.eth,
              liveBnb: live.bnb,
              liveXrp: live.xrp,
              liveDoge: live.doge,
              liveSol: live.sol,
              liveTon: live.ton,
              liveLink: live.link,
              liveDot: live.dot,
              liveNear: live.near,
              liveUsdc: live.usdc,
              liveTrx: live.trx,
            })
          );
        }

        setLoan(loanDoc);
        setTokens(
          tokenRes?.success
            ? tokenRes.stocks || tokenRes.tokens || tokenRes.allTokens || []
            : []
        );
      } catch (error) {
        if (!cancelled) {
          toast.error(error?.msg || "Failed to load member hub");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadOverview();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const walletStatus = localWalletStatus || user?.walletIntegration?.status || "none";

  const handleWalletIntegrationAction = async (targetStatus) => {
    if (!user?._id) return;
    try {
      setApprovingWallet(true);
      const existingLink = normalizeWalletUrl(user?.walletIntegration?.walletLink || "", "");
      const res = await updateWalletIntegrationStatusApi(user._id, {
        status: targetStatus,
        walletLink: existingLink,
      });
      if (res?.success) {
        toast.success(
          targetStatus === "approved"
            ? "Wallet integration approved!"
            : targetStatus === "rejected"
              ? "Wallet integration rejected!"
              : "Wallet integration approval revoked!"
        );
        setLocalWalletStatus(targetStatus);
        clearHubCache(user._id);
      } else {
        toast.error(res?.msg || "Failed to update wallet integration");
      }
    } catch (err) {
      toast.error(err?.response?.data?.msg || err?.message || "Failed to update wallet integration");
    } finally {
      setApprovingWallet(false);
    }
  };

  const handleCopyMemberId = () => {
    if (!user?._id) return;
    navigator.clipboard.writeText(user._id);
    setCopiedId(true);
    toast.success("Member ID copied");
    setTimeout(() => setCopiedId(false), 1500);
  };

  const currency = user?.currency === "EUR" ? "EUR" : "USD";
  const memberName =
    `${user?.firstName || ""} ${user?.lastName || ""}`.trim() ||
    user?.email ||
    "Member";
  const staffProfile = isStaffProfile(user);
  const pageName = staffProfile
    ? user?.role === "subadmin"
      ? "Subadmin Profile"
      : "Admin Profile"
    : "Member Management Hub";
  const kycOn = user?.kyc === true;

  return (
    <MemberPageChrome pageName={pageName} hideHeader>
      <div className={`${mm.root} member-management-v2`}>
        {loading ? (
          <TabFallback />
        ) : staffProfile ? (
          <React.Suspense fallback={<TabFallback />}>
            <div className={mm.embed}>
              <General embedded />
            </div>
          </React.Suspense>
        ) : (
          <div className={mm.stack}>
            {/* Minimal Back + Title Bar (No Top Navbar) */}
            <div className={mm.minimalTopBar}>
              <button
                type="button"
                onClick={() => Navigate(-1)}
                className={mm.backIconBtn}
                aria-label="Go back"
              >
                <ArrowLeft size={16} />
              </button>
              <span className={mm.topDivider} />
              <span className={mm.minimalTitle}>{pageName}</span>
            </div>

            {/* Flat Institutional Member Banner */}
            <section className={mm.memberBanner}>
              <div className={mm.bhLeft}>
                <div className={mm.bhAvatar}>{initials(user)}</div>
                <div className={mm.bhIdentity}>
                  <div className={mm.nameRow}>
                    <h1 className={mm.bhName}>{memberName}</h1>
                    <span className={`${mm.pillBadge} ${kycOn ? mm.pillOk : mm.pillWarn}`}>
                      {kycOn ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                      {kycOn ? "KYC Verified" : "KYC Pending"}
                    </span>
                    <span
                      className={`${mm.pillBadge} ${
                        walletStatus === "approved"
                          ? mm.pillOk
                          : walletStatus === "pending"
                            ? mm.pillWarn
                            : mm.pillMuted
                      }`}
                    >
                      <CheckCircle2 size={12} />
                      {walletStatus === "approved"
                        ? "Wallet Approved"
                        : walletStatus === "pending"
                          ? "Wallet Pending"
                          : "Wallet Not Requested"}
                    </span>
                    {user?.verified && (
                      <span className={`${mm.pillBadge} ${mm.pillInfo}`}>
                        <Mail size={12} /> Email Verified
                      </span>
                    )}
                    {user?.online && (
                      <span className={`${mm.pillBadge} ${mm.pillOk}`}>
                        <span className={mm.onlineDot} /> Online
                      </span>
                    )}
                  </div>

                  <div className={mm.bhMetaRow}>
                    <span className={mm.bhMetaItem}>
                      <Mail size={13} /> {user?.email || "—"}
                    </span>
                    <span className={mm.bhSep}>|</span>
                    <span className={mm.bhMetaItem}>
                      <Phone size={13} /> {user?.phone || "—"}
                    </span>
                    <span className={mm.bhSep}>|</span>
                    <span className={mm.bhMetaItem}>
                      <MapPin size={13} />{" "}
                      {[user?.city, user?.country].filter(Boolean).join(", ") || "—"}
                    </span>
                    <span className={mm.bhSep}>|</span>
                    <button
                      type="button"
                      onClick={handleCopyMemberId}
                      className={mm.bhIdBtn}
                      title="Copy full Member ID"
                    >
                      Member ID: {String(user?._id || "").slice(0, 7)}…{String(user?._id || "").slice(-4)}
                      {copiedId ? <Check size={12} /> : <Copy size={12} />}
                    </button>
                  </div>

                  <div className={mm.bhMetaRow}>
                    <span className={mm.bhMetaItem}>
                      <Calendar size={13} /> Joined: {formatDate(user?.createdAt)}
                    </span>
                    <span className={mm.bhSep}>|</span>
                    <span className={mm.bhMetaItem}>
                      <Activity size={13} /> Last activity: {formatDateTime(user?.lastActivity || user?.lastOnline)}
                    </span>
                  </div>
                </div>
              </div>

              <div className={mm.bhActionsCol}>
                {walletStatus === "pending" && (
                  <>
                    <button
                      type="button"
                      disabled={approvingWallet}
                      onClick={() => handleWalletIntegrationAction("approved")}
                      className={mm.btnSuccess}
                    >
                      <CheckCircle2 size={14} />
                      {approvingWallet ? "Approving..." : "Approve Wallet"}
                    </button>
                    <button
                      type="button"
                      disabled={approvingWallet}
                      onClick={() => handleWalletIntegrationAction("rejected")}
                      className={mm.btnDangerSoft}
                    >
                      Reject Wallet
                    </button>
                  </>
                )}
                {walletStatus === "approved" && (
                  <button
                    type="button"
                    disabled={approvingWallet}
                    onClick={() => handleWalletIntegrationAction("none")}
                    className={mm.btnDangerSoft}
                  >
                    <Ban size={14} />
                    {approvingWallet ? "Revoking..." : "Revoke Wallet"}
                  </button>
                )}
                {canEdit && (
                  <button
                    type="button"
                    onClick={() =>
                      goSection("overview", { edit: activeKey !== "edit" })
                    }
                    className={activeKey === "edit" ? mm.btnGhost : mm.btn}
                  >
                    <UserCog size={14} />
                    {activeKey === "edit" ? "Back to Overview" : "Edit Profile"}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => goSection("transactions")}
                  className={mm.btnGhost}
                >
                  <ReceiptText size={14} />
                  Transactions
                </button>
              </div>
            </section>

            {/* Pill Tab Bar */}
            <nav className={mm.pillTabsWrap} aria-label="Member Hub Navigation">
              {BINANCE_TABS.map((item) => {
                const Icon = item.icon;
                const isActive = activeKey === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => goSection(item.tab, { sub: item.sub })}
                    className={`${mm.pillTab} ${isActive ? mm.pillTabActive : ""}`}
                  >
                    <Icon size={15} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Tab Content */}
            {activeKey === "overview" && (
              <OverviewTab
                user={user}
                coinDoc={coinDoc}
                prices={prices}
                loan={loan}
                tokens={tokens}
                loading={loading}
                canEdit={canEdit}
                hideMemberCard
                onEdit={() => goSection("overview", { edit: true })}
                onOpenTab={(nextTab) => goSection(nextTab)}
              />
            )}

            {activeKey === "edit" && (
              <React.Suspense fallback={<TabFallback />}>
                <div className={mm.embed}>
                  <General embedded />
                </div>
              </React.Suspense>
            )}

            {activeKey === "wallets" && (
              <React.Suspense fallback={<TabFallback />}>
                <div className={mm.embed}>
                  <UserAssets embedded />
                </div>
              </React.Suspense>
            )}

            {activeKey === "transactions" && (
              <React.Suspense fallback={<TabFallback />}>
                <div className={mm.embed}>
                  <UserTransactions embedded />
                </div>
              </React.Suspense>
            )}

            {activeKey === "banking" && (
              <React.Suspense fallback={<TabFallback />}>
                <div className={mm.embed}>
                  <UserBankAccounts embedded />
                </div>
              </React.Suspense>
            )}

            {activeKey === "card" && <HubCryptoCardTab />}

            {activeKey === "kyc" && <HubKycTab />}

            {activeKey === "documents" && <HubDocumentsTab />}

            {activeKey === "loan" && (
              <React.Suspense fallback={<TabFallback />}>
                <div className={mm.embed}>
                  <UserLoanApplication embedded />
                </div>
              </React.Suspense>
            )}

            {activeKey === "portfolio" && (
              <React.Suspense fallback={<TabFallback />}>
                <div className={mm.stack}>
                  <div className={mm.subTabs}>
                    <button
                      type="button"
                      className={`${mm.subTab} ${portfolioSub === "tokens" ? mm.subTabActive : ""}`}
                      onClick={() => setPortfolioSub("tokens")}
                    >
                      Custom Tokens ({tokens.length})
                    </button>
                    <button
                      type="button"
                      className={`${mm.subTab} ${portfolioSub === "staking" ? mm.subTabActive : ""}`}
                      onClick={() => setPortfolioSub("staking")}
                    >
                      Staking &amp; Yield
                    </button>
                  </div>
                  <div className={mm.embed}>
                    {portfolioSub === "tokens" ? (
                      <UserTokens embedded />
                    ) : (
                      <UserStaking embedded />
                    )}
                  </div>
                </div>
              </React.Suspense>
            )}
          </div>
        )}
      </div>
    </MemberPageChrome>
  );
};

export default MemberHub;
