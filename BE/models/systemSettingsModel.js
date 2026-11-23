const mongoose = require("mongoose");

const SystemSettingsSchema = new mongoose.Schema(
  {
    requireEmailVerification: {
      type: Boolean,
      default: false,
    },
    requireKycBeforeSign: {
      type: Boolean,
      default: false,
    },
    autoNotifyClientOnUpload: {
      type: Boolean,
      default: true,
    },
    autoNotifyAdminOnSign: {
      type: Boolean,
      default: true,
    },
    companyName: {
      type: String,
      default: "GOin SAS",
    },
    supportEmail: {
      type: String,
      default: "info@goininvest.com",
    },
    smtpConfig: {
      enabled: { type: Boolean, default: true },
      host: { type: String, default: "" },
      port: { type: Number, default: 465 },
      secure: { type: Boolean, default: true },
      user: { type: String, default: "" },
      pass: { type: String, default: "" },
      fromEmail: { type: String, default: "" },
      fromName: { type: String, default: "" },
      adminAlertEmail: { type: String, default: "" },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SystemSettings", SystemSettingsSchema);
