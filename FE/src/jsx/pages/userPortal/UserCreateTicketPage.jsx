import React, { useEffect, useState } from "react";
import { useAuthUser } from "react-auth-kit";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { ArrowLeft, Send, MessageSquarePlus } from "lucide-react";
import { createTicketApi } from "../../../Api/Service";
import {
  TicketAttachmentInput,
  appendTicketAttachments,
} from "../../components/tickets/TicketAttachments";
import UserPortalShell from "./UserPortalShell";

export default function UserCreateTicketPage() {
  const authUser = useAuthUser();
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [attachments, setAttachments] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    const role = authUser()?.user?.role;
    if (["admin", "superadmin", "subadmin"].includes(role)) {
      navigate("/admin/dashboard", { replace: true });
    }
  }, [authUser, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Subject title is required");
      return;
    }
    if (!description.trim() && attachments.length === 0) {
      toast.error("Add a description or at least one attachment");
      return;
    }

    try {
      setIsSubmitting(true);
      const fd = new FormData();
      fd.append("userId", authUser().user._id);
      fd.append("title", title.trim());
      fd.append("description", description.trim());
      fd.append("isAdmin", "false");
      appendTicketAttachments(fd, attachments);

      const res = await createTicketApi(fd);
      if (res?.success) {
        toast.success("Ticket created successfully");
        navigate("/support");
      } else {
        toast.error(res?.msg || "Failed to create ticket");
      }
    } catch (err) {
      toast.error(err?.message || "Failed to create ticket");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <UserPortalShell title="Create Ticket">
      <div className="space-y-6 w-full">
        <div>
          <button
            type="button"
            onClick={() => navigate("/support")}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 mb-2 bg-transparent border-0 p-0 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Support Desk
          </button>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight m-0">
            Create Support Ticket
          </h1>
          <p className="text-sm text-slate-500 mt-1 mb-0">
            Describe your request and attach any relevant screenshots or documents.
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/90 shadow-card overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <MessageSquarePlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 m-0">
                New Request Details
              </h2>
              <p className="text-xs text-slate-500 m-0">
                Our support specialists typically respond within 24 hours.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            <div>
              <label
                htmlFor="ticket-subject"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Subject *
              </label>
              <input
                id="ticket-subject"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Question about my wire deposit or card activation"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
              />
            </div>

            <div>
              <label
                htmlFor="ticket-desc"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Description
              </label>
              <textarea
                id="ticket-desc"
                rows={6}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Provide full details so our team can assist you quickly..."
                className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
              />
            </div>

            <div>
              <TicketAttachmentInput
                files={attachments}
                onChange={setAttachments}
                disabled={isSubmitting}
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => navigate("/support")}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold border-0 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-bold border-0 shadow-sm cursor-pointer transition-colors"
              >
                <Send className="w-4 h-4" />
                {isSubmitting ? "Submitting..." : "Submit Ticket"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </UserPortalShell>
  );
}
