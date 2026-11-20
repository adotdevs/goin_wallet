const mongoose = require("mongoose");

const NotificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "user",
    default: null,
  },
  recipientRole: {
    type: String,
    enum: ["admin", "user", "all"],
    default: "admin",
  },
  type: {
    type: String,
    enum: [
      "kyc_submitted",
      "kyc_approved",
      "kyc_rejected",
      "document_uploaded",
      "document_signed",
      "account_verified",
    ],
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  link: {
    type: String,
    default: "",
  },
  userEmail: {
    type: String,
    default: "",
  },
  userName: {
    type: String,
    default: "",
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model(
  "KycPortalNotification",
  NotificationSchema,
  "kyc_portal_notifications"
);
