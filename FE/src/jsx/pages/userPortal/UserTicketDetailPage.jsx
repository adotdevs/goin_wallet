import React, { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { format, isWithinInterval, subDays, differenceInDays } from "date-fns";
import { useAuthUser } from "react-auth-kit";
import { toast } from "react-toastify";
import { ArrowLeft, Send, Edit3, Clock, Hash, Calendar, CheckCircle2, AlertCircle } from "lucide-react";
import profile from "../../../assets/images/7309681.jpg";
import adminDp from "../../../assets/admin.jpg";
import { getIndivTicketApi, updateMessageApi, editTicketMessageApi } from "../../../Api/Service";
import { messageContainsHtml } from "../../../utils/emailTemplateUtils";
import {
  TicketAttachmentInput,
  TicketMessageAttachments,
  TicketEditAttachments,
  appendTicketAttachments,
} from "../../components/tickets/TicketAttachments";
import UserPortalShell from "./UserPortalShell";

const USER_MESSAGE_EDIT_WINDOW_MS = 15 * 60 * 1000;

const canUserEditMessage = (message) => {
  if (!message || message.sender !== "user" || !message.createdAt) return false;
  const createdAt = new Date(message.createdAt).getTime();
  if (Number.isNaN(createdAt)) return false;
  return Date.now() - createdAt <= USER_MESSAGE_EDIT_WINDOW_MS;
};

export default function UserTicketDetailPage() {
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();
  const authUser = useAuthUser();
  const { ticketId } = useParams();

  const [isDisable, setIsDisable] = useState(false);
  const [currentUser, setCurrentUser] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [ticket, setTicket] = useState({});
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [replyAttachments, setReplyAttachments] = useState([]);
  const [editingMessageId, setEditingMessageId] = useState(null);
  const [editingText, setEditingText] = useState("");
  const [editingRemovedAttachmentIndexes, setEditingRemovedAttachmentIndexes] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [, setEditTick] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => setEditTick((t) => t + 1), 30000);
    return () => clearInterval(interval);
  }, []);

  const getTickets = async () => {
    try {
      const id = authUser()?.user?._id;
      const indivTicket = await getIndivTicketApi(id, ticketId);
      if (indivTicket?.success) {
        if (!indivTicket.ticket || indivTicket.ticket.length <= 0) {
          navigate("/support");
          return;
        }
        setIsLoading(false);
        const ticketData = indivTicket.ticket[0];
        setTicket(ticketData);
        setMessages(ticketData.ticketContent || []);
      } else {
        toast.dismiss();
        toast.error(indivTicket?.msg || "Failed to load ticket");
      }
    } catch (error) {
      toast.dismiss();
      toast.error(error?.message || "Failed to load ticket");
    }
  };

  useEffect(() => {
    const user = authUser()?.user;
    if (user?.role === "user") {
      setCurrentUser(user);
      getTickets();
    } else if (["admin", "superadmin", "subadmin"].includes(user?.role)) {
      navigate("/admin/dashboard", { replace: true });
    }
  }, [ticketId]);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const diffInSeconds = Math.floor((Date.now() - date.getTime()) / 1000);
    const diffInMinutes = Math.floor(diffInSeconds / 60);
    const diffInHours = Math.floor(diffInMinutes / 60);
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInSeconds < 60) return "just now";
    if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes === 1 ? "" : "s"} ago`;
    if (diffInHours < 24) return `${diffInHours} hour${diffInHours === 1 ? "" : "s"} ago`;
    if (diffInDays < 30) return `${diffInDays} day${diffInDays === 1 ? "" : "s"} ago`;
    return date.toLocaleDateString();
  };

  const formatDateNew = (dateString) => {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return "—";
    const now = new Date();
    if (isWithinInterval(date, { start: subDays(now, 7), end: now })) {
      return format(date, "EEEE 'at' HH:mm");
    }
    return format(date, "MMMM d, yyyy HH:mm");
  };

  const isTicketClosed = () => {
    if (ticket.status === "open") return false;
    const lastActivityDate = new Date(ticket.updatedAt);
    return differenceInDays(new Date(), lastActivityDate) > 30;
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() && replyAttachments.length === 0) {
      toast.error("Add a message or at least one attachment");
      return;
    }
    try {
      setIsDisable(true);
      const formData = new FormData();
      formData.append("status", "open");
      formData.append("userId", authUser().user._id);
      formData.append("ticketId", ticketId);
      formData.append("sender", "user");
      formData.append("description", newMessage.trim());
      appendTicketAttachments(formData, replyAttachments);

      const response = await updateMessageApi(formData);
      if (response.success) {
        toast.success("Ticket updated successfully!");
        setNewMessage("");
        setReplyAttachments([]);
        getTickets();
      } else {
        toast.error(response.msg);
      }
    } catch {
      toast.error("Failed to submit the ticket.");
    } finally {
      setIsDisable(false);
    }
  };

  const handleStartEdit = (message) => {
    if (!canUserEditMessage(message)) {
      toast.error("Messages can only be edited within 15 minutes of sending.");
      return;
    }
    setEditingMessageId(message._id);
    setEditingText(message.description === "(Attachment)" ? "" : message.description);
    setEditingRemovedAttachmentIndexes([]);
  };

  const handleCancelEdit = () => {
    setEditingMessageId(null);
    setEditingText("");
    setEditingRemovedAttachmentIndexes([]);
  };

  const handleRemoveEditAttachment = (index) => {
    setEditingRemovedAttachmentIndexes((prev) =>
      prev.includes(index) ? prev : [...prev, index]
    );
  };

  const handleSaveEdit = async (message) => {
    const remainingAttachments =
      (message.attachments?.length || 0) - editingRemovedAttachmentIndexes.length;
    if (!editingText.trim() && remainingAttachments <= 0) {
      toast.error("Message cannot be empty");
      return;
    }
    try {
      setActionLoading(true);
      const userId = authUser().user._id;
      const response = await editTicketMessageApi(userId, ticketId, message._id, {
        description: editingText.trim(),
        removedAttachmentIndexes: editingRemovedAttachmentIndexes,
      });
      if (response.success) {
        toast.success("Message updated");
        handleCancelEdit();
        getTickets();
      } else {
        toast.error(response.msg || "Failed to update message");
      }
    } catch {
      toast.error("Failed to update message");
    } finally {
      setActionLoading(false);
    }
  };

  const renderStatusBadge = (status) => {
    if (status === "open") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 capitalize">
          <AlertCircle className="w-3.5 h-3.5" /> {status}
        </span>
      );
    }
    if (status === "solved") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 capitalize">
          <CheckCircle2 className="w-3.5 h-3.5" /> {status}
        </span>
      );
    }
    if (status === "awaiting reply") {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200 capitalize">
          <Clock className="w-3.5 h-3.5" /> {status}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
        {status || "Unknown"}
      </span>
    );
  };

  return (
    <UserPortalShell title="Support Ticket">
      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin" />
        </div>
      ) : (
        <div className="space-y-6">
          {/* Header Bar */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <button
                type="button"
                onClick={() => navigate("/support")}
                className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              <h1 className="text-xl font-bold text-slate-900 truncate m-0">
                {ticket.title}
              </h1>
              {renderStatusBadge(ticket.status)}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Messages Thread */}
            <div className="lg:col-span-2 space-y-4">
              {messages.map((message, index) => {
                const isUserMsg = message.sender === "user";
                return (
                  <div
                    key={message._id || index}
                    className={`rounded-2xl border p-5 shadow-card ${
                      isUserMsg
                        ? "bg-white border-slate-200/90"
                        : "bg-blue-50/40 border-blue-100"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <img
                          src={isUserMsg ? profile : adminDp}
                          alt={isUserMsg ? "User" : "Support Team"}
                          className="w-9 h-9 rounded-full object-cover border border-slate-200"
                        />
                        <div>
                          <p className="text-sm font-semibold text-slate-900 m-0 capitalize">
                            {isUserMsg
                              ? `${currentUser.firstName || ""} ${currentUser.lastName || ""}`.trim() || "You"
                              : "Support Team"}
                          </p>
                          <p className="text-xs text-slate-400 m-0">
                            {formatDate(message.createdAt)}
                          </p>
                        </div>
                      </div>
                      {isUserMsg &&
                        editingMessageId !== message._id &&
                        !isTicketClosed() &&
                        canUserEditMessage(message) && (
                          <button
                            type="button"
                            onClick={() => handleStartEdit(message)}
                            disabled={actionLoading}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 border-0 transition-colors cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" /> Edit
                          </button>
                        )}
                    </div>

                    {editingMessageId === message._id ? (
                      <div className="space-y-3">
                        <textarea
                          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                          rows={3}
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                        />
                        <TicketEditAttachments
                          attachments={message.attachments}
                          removedIndexes={editingRemovedAttachmentIndexes}
                          onRemove={handleRemoveEditAttachment}
                          disabled={actionLoading}
                        />
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleSaveEdit(message)}
                            disabled={actionLoading}
                            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 border-0 cursor-pointer"
                          >
                            Save
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelEdit}
                            disabled={actionLoading}
                            className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 border-0 cursor-pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        {(() => {
                          const text = String(message.description || "").trim();
                          if (!text || text === "(Attachment)") return null;
                          if (messageContainsHtml(message.description)) {
                            return (
                              <div
                                className="text-sm text-slate-700 leading-relaxed prose prose-sm max-w-none"
                                dangerouslySetInnerHTML={{ __html: message.description }}
                              />
                            );
                          }
                          return (
                            <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap m-0">
                              {message.description}
                            </p>
                          );
                        })()}
                        <div className="mt-2">
                          <TicketMessageAttachments
                            attachments={message.attachments}
                            userId={authUser().user._id}
                            ticketId={ticketId}
                            messageId={message._id}
                          />
                        </div>
                      </>
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                );
              })}

              {/* Reply Box */}
              <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-card">
                {isTicketClosed() ? (
                  <p className="text-sm font-medium text-slate-600 m-0">
                    This request is closed for comments. You can{" "}
                    <Link to="/create-ticket" className="text-blue-600 font-semibold underline">
                      create a new ticket
                    </Link>
                    .
                  </p>
                ) : (
                  <div className="space-y-4">
                    <div>
                      <label htmlFor="ticket-reply-msg" className="block text-sm font-semibold text-slate-800 mb-2">
                        Send a Reply
                      </label>
                      <textarea
                        id="ticket-reply-msg"
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        rows={4}
                        placeholder="Type your message here..."
                        className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
                      />
                    </div>
                    <TicketAttachmentInput
                      files={replyAttachments}
                      onChange={setReplyAttachments}
                      disabled={isDisable}
                    />
                    <div className="flex justify-end">
                      <button
                        type="button"
                        disabled={isDisable}
                        onClick={handleSendMessage}
                        className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-semibold border-0 shadow-sm transition-colors cursor-pointer"
                      >
                        <Send className="w-4 h-4" />
                        {isDisable ? "Submitting..." : "Send Reply"}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Ticket Info Sidebar */}
            <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-card space-y-4">
              <h2 className="text-base font-bold text-slate-900 m-0 pb-3 border-b border-slate-100">
                Ticket Information
              </h2>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-slate-500">
                    <Hash className="w-4 h-4 text-slate-400" /> Ticket ID
                  </span>
                  <span className="font-semibold text-slate-900">{ticket.ticketId || "—"}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-slate-500">
                    <Calendar className="w-4 h-4 text-slate-400" /> Created
                  </span>
                  <span className="font-medium text-slate-700 text-right">{formatDateNew(ticket.createdAt)}</span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="inline-flex items-center gap-1.5 text-slate-500">
                    <Clock className="w-4 h-4 text-slate-400" /> Last Activity
                  </span>
                  <span className="font-medium text-slate-700 text-right">{formatDateNew(ticket.updatedAt)}</span>
                </div>
                <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                  <span className="text-slate-500">Status</span>
                  {renderStatusBadge(ticket.status)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </UserPortalShell>
  );
}
