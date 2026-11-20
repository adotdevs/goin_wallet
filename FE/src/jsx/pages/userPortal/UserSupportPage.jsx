import React, { useEffect, useState } from "react";
import { useAuthUser } from "react-auth-kit";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import {
  Headphones,
  Plus,
  Search,
  ChevronRight,
  Clock,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { getUserTicketsApi } from "../../../Api/Service";
import UserPortalShell from "./UserPortalShell";

const formatRelative = (dateString) => {
  const date = new Date(dateString);
  const diffSec = Math.floor((Date.now() - date.getTime()) / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHr = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHr / 24);
  if (diffSec < 60) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHr < 24) return `${diffHr}h ago`;
  if (diffDay < 30) return `${diffDay}d ago`;
  return date.toLocaleDateString();
};

export default function UserSupportPage() {
  const authUser = useAuthUser();
  const navigate = useNavigate();
  const userId = authUser()?.user?._id;

  const [isLoading, setIsLoading] = useState(true);
  const [tickets, setTickets] = useState([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const user = authUser()?.user;
    if (!user) return;
    if (["admin", "superadmin", "subadmin"].includes(user.role)) {
      navigate("/admin/dashboard", { replace: true });
      return;
    }

    const load = async () => {
      try {
        const res = await getUserTicketsApi(user._id);
        if (res?.success && Array.isArray(res.ticket)) {
          const sorted = [...res.ticket].sort((a, b) => {
            const diff = new Date(b.updatedAt) - new Date(a.updatedAt);
            return diff !== 0 ? diff : new Date(b.createdAt) - new Date(a.createdAt);
          });
          setTickets(sorted);
        } else if (res?.msg) {
          toast.error(res.msg);
        }
      } catch (err) {
        toast.error(err?.message || "Failed to load tickets");
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [userId]);

  const filtered = tickets.filter((t) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      String(t.title || "").toLowerCase().includes(q) ||
      String(t.ticketId || "").toLowerCase().includes(q) ||
      String(t.status || "").toLowerCase().includes(q)
    );
  });

  const statusBadge = (status) => {
    if (status === "open") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 capitalize">
          <AlertCircle className="w-3 h-3" /> {status}
        </span>
      );
    }
    if (status === "solved") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 capitalize">
          <CheckCircle2 className="w-3 h-3" /> {status}
        </span>
      );
    }
    if (status === "awaiting reply") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 capitalize">
          <Clock className="w-3 h-3" /> {status}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 capitalize">
        {status || "Unknown"}
      </span>
    );
  };

  return (
    <UserPortalShell title="Support Desk">
      <div className="space-y-6 w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight m-0">
              Support Desk
            </h1>
            <p className="text-sm text-slate-500 mt-1 mb-0">
              View your support conversations or open a new request with our compliance &amp; operations team.
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigate("/create-ticket")}
            className="inline-flex items-center gap-2 self-start sm:self-auto px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold border-0 shadow-sm cursor-pointer transition-colors"
          >
            <Plus className="w-4 h-4" /> Create New Ticket
          </button>
        </div>

        {/* Tickets Table Card */}
        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                <Headphones className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-slate-900 m-0">
                My Tickets ({tickets.length})
              </h2>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search subject, ID, or status..."
                className="w-full pl-9 pr-3.5 py-2 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-500"
              />
            </div>
          </div>

          {isLoading ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-500">
              <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin mb-3" />
              <p className="text-sm m-0">Loading support tickets...</p>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-20 text-center px-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <Headphones className="w-6 h-6" />
              </div>
              <h3 className="text-base font-semibold text-slate-900 m-0">
                No tickets found
              </h3>
              <p className="text-sm text-slate-500 mt-1 mb-4">
                Need assistance? Open a new ticket and our team will respond promptly.
              </p>
              <button
                type="button"
                onClick={() => navigate("/create-ticket")}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold border-0 cursor-pointer"
              >
                Create Ticket
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100">
                    <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Subject
                    </th>
                    <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Ticket ID
                    </th>
                    <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Created
                    </th>
                    <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Last Activity
                    </th>
                    <th className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">
                      Status
                    </th>
                    <th className="px-6 py-3.5 text-right text-xs font-semibold uppercase tracking-wider text-slate-500" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filtered.map((t) => (
                    <tr
                      key={t._id || t.ticketId}
                      onClick={() => navigate(`/tickets/${t.ticketId}`)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                    >
                      <td className="px-6 py-4 text-sm font-semibold text-slate-900">
                        {t.title}
                      </td>
                      <td className="px-6 py-4 text-xs font-mono text-slate-500">
                        #{t.ticketId}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">
                        {formatRelative(t.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 whitespace-nowrap">
                        {formatRelative(t.updatedAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {statusBadge(t.status)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <ChevronRight className="w-4 h-4 text-slate-400 inline" />
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
