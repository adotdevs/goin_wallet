const crypto = require("crypto");
const User = require("../models/userModel");
const SignDocument = require("../models/signDocumentModel");
const Notification = require("../models/kycPortalNotificationModel");
const WalletNotification = require("../models/notifications");
const SystemSettings = require("../models/systemSettingsModel");
const {
  isStaffRole,
  isValidObjectId,
  escapeRegex,
  getAssignedSubAdminIds,
  syncAssignedSubAdmins,
  subadminAccessibleUsersQuery,
  canStaffAccessUser,
  sanitizeUserForViewer,
  portalBaseUrl,
} = require("../utils/kycPortalAccess");
const {
  uploadBufferToCloudinary,
  deleteFromCloudinary,
  fetchCloudinaryAssetBuffer,
} = require("../utils/kycPortalCloudinary");
const {
  getEffectiveSmtpConfig,
  sendEmail,
  sendAdminAlertEmail,
  buildBrandedEmailHtml,
  testSmtpConnectionAndSend,
} = require("../utils/kycPortalEmail");
const { generateDocumentPdfBuffer } = require("../utils/kycPortalPdf");

const ALLOWED_KYC_MIMES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
];

function fail(res, status, msg) {
  return res.status(status).json({ success: false, msg });
}

function fileByField(req, field) {
  return (req.files || []).find((file) => file.fieldname === field);
}

function isAllowedKycFile(file) {
  const mime = (file.mimetype || "").toLowerCase();
  const name = (file.originalname || "").toLowerCase();
  return (
    ALLOWED_KYC_MIMES.includes(mime) ||
    name.endsWith(".pdf") ||
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg") ||
    name.endsWith(".png") ||
    name.endsWith(".webp")
  );
}

function detectFileTypeCategory(fileName, mimeType) {
  const lower = (fileName || "").toLowerCase();
  const mime = mimeType || "";
  if (
    lower.endsWith(".doc") ||
    lower.endsWith(".docx") ||
    mime.includes("word") ||
    mime.includes("officedocument")
  ) {
    return "doc";
  }
  if (
    lower.endsWith(".png") ||
    lower.endsWith(".jpg") ||
    lower.endsWith(".jpeg") ||
    lower.endsWith(".webp") ||
    mime.startsWith("image/")
  ) {
    return "image";
  }
  return "pdf";
}

function clientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.trim()) {
    return forwarded.split(",")[0].trim();
  }
  return req.ip || "127.0.0.1";
}

function snapshotSubmitDoc(currentDoc, decision, staff, reason) {
  return {
    cnic: currentDoc.cnic || null,
    cnicName: currentDoc.cnicName || null,
    cnicMimeType: currentDoc.cnicMimeType || null,
    bill: currentDoc.bill || null,
    billName: currentDoc.billName || null,
    billMimeType: currentDoc.billMimeType || null,
    idType: currentDoc.idType || "national_id",
    idNumber: currentDoc.idNumber || "",
    dateOfBirth: currentDoc.dateOfBirth || "",
    nationality: currentDoc.nationality || "",
    submittedAt: currentDoc.submittedAt || new Date(),
    decision,
    decidedAt: new Date(),
    decidedByName: `${staff.firstName} ${staff.lastName} (${staff.role})`,
    rejectionReason: reason || null,
  };
}

function applySmtpConfig(target, incoming) {
  const current = target.smtpConfig?.toObject?.() || { ...(target.smtpConfig || {}) };
  const next = { ...current };
  ["enabled", "host", "port", "user", "fromEmail", "fromName", "adminAlertEmail", "secure"].forEach(
    (field) => {
      if (incoming[field] !== undefined) next[field] = incoming[field];
    }
  );
  const secret = incoming.pass ?? incoming.password;
  if (
    secret !== undefined &&
    secret !== "••••••••" &&
    String(secret).trim() !== ""
  ) {
    next.password = String(secret);
  }
  delete next.pass;
  target.smtpConfig = next;
  target.markModified("smtpConfig");
  return next;
}

async function ensureSettings() {
  let settings = await SystemSettings.findOne();
  if (!settings) {
    settings = await SystemSettings.create({
      smtpConfig: {
        enabled: true,
        host: process.env.EMAILHOST || "smtp.hostinger.com",
        port: Number(process.env.EMAIL_PORT || 465),
        secure: Number(process.env.EMAIL_PORT || 465) === 465,
        user: process.env.EMAILUSER || "",
        pass: process.env.EMAILPASS || "",
        fromEmail: process.env.HOST_EMAIL || process.env.EMAILUSER || "",
        fromName: process.env.WebName || "GOin SAS",
        adminAlertEmail: process.env.ADMIN_ALERT_EMAIL || "info@goin-in-vest.com",
      },
    });
  }
  return settings;
}

async function notifyWalletAdmins(user, content) {
  try {
    await WalletNotification.create({
      userId: user._id,
      type: "KYC_request",
      content,
      userName: `${user.firstName} ${user.lastName}`,
      userEmail: user.email,
      isRead: false,
    });
  } catch (error) {
    console.warn("Wallet KYC notification skipped:", error?.message);
  }
}

async function notifyAllClientsOfGlobalDocument(doc, uploader) {
  const clients = await User.find({ role: "user" }, "_id firstName lastName email").lean();
  if (!clients.length) return;
  const notifications = clients.map((client) => ({
    userId: client._id,
    recipientRole: "user",
    type: "document_uploaded",
    title: "New Global Document Ready to Sign",
    content: `${uploader.firstName} ${uploader.lastName} shared "${doc.title}" globally in ${doc.folder} for signature.`,
    link: `/flows/documents?doc=${doc._id}`,
    userEmail: client.email,
    userName: `${client.firstName} ${client.lastName}`,
  }));
  await Notification.insertMany(notifications, { ordered: false }).catch(() => {});
}

async function notifyRecipientOfNewDocument(recipient, doc, uploader) {
  if (String(recipient._id) === String(uploader._id)) return;
  await Notification.create({
    userId: recipient._id,
    recipientRole: "user",
    type: "document_uploaded",
    title: "New Document Ready to Sign",
    content: `${uploader.firstName} ${uploader.lastName} uploaded "${doc.title}" to your ${doc.folder} folder for signature.`,
    link: `/flows/documents?doc=${doc._id}`,
    userEmail: recipient.email,
    userName: `${recipient.firstName} ${recipient.lastName}`,
  });
  const html = buildBrandedEmailHtml({
    title: "New Document Ready for Your Signature",
    greeting: `Hello ${recipient.firstName},`,
    bodyLines: [
      `A new document ("${doc.title}") has been uploaded to your account in the ${doc.folder} folder.`,
      "Please sign in to review the document and complete your electronic signature.",
    ],
    ctaLabel: "Review & Sign Document",
    ctaUrl: `${portalBaseUrl()}/flows/documents`,
  });
  sendEmail(
    recipient.email,
    `${process.env.WebName || "Wallet"} — Document Ready for Signature: ${doc.title}`,
    `A new document (${doc.title}) is waiting for your signature.`,
    html
  ).catch(() => {});
}

exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return fail(res, 401, "Please sign in");
    const settings = await SystemSettings.findOne();
    const isStaff = isStaffRole(user.role);
    const unreadNotifications = await Notification.countDocuments(
      isStaff
        ? { recipientRole: "admin", isRead: false }
        : { userId: user._id, recipientRole: "user", isRead: false }
    );
    const pendingDocsCount = await SignDocument.countDocuments(
      isStaff
        ? { status: "pending_signature" }
        : {
            $or: [{ user: user._id }, { isGlobal: true }],
            status: "pending_signature",
          }
    );
    const signedDocsCount = await SignDocument.countDocuments(
      isStaff ? { status: "signed" } : { user: user._id, status: "signed" }
    );
    return res.json({
      success: true,
      user: sanitizeUserForViewer(user, user),
      stats: { unreadNotifications, pendingDocsCount, signedDocsCount },
      settings: {
        requireEmailVerification: settings?.requireEmailVerification ?? false,
        requireKycBeforeSign: settings?.requireKycBeforeSign ?? false,
        companyName: settings?.companyName || "GOin SAS",
      },
    });
  } catch (error) {
    return fail(res, 500, error?.message || "Failed to fetch profile");
  }
};

exports.submitKyc = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    if (!user) return fail(res, 401, "Please sign in to submit KYC documents");
    if (isStaffRole(user.role)) {
      return fail(res, 400, "Staff accounts do not require KYC submission");
    }
    if (user.kyc === true) {
      return fail(res, 400, "Your account is already KYC verified. No further submission is required.");
    }
    if (user.submitDoc?.status === "completed") {
      return fail(
        res,
        400,
        "Your KYC verification documents have already been submitted and are currently under review. You will be notified once the review is completed."
      );
    }

    const body = req.body || {};
    let cnicUrl = user.submitDoc?.cnic || null;
    let cnicName = user.submitDoc?.cnicName || null;
    let cnicMimeType = user.submitDoc?.cnicMimeType || null;
    let billUrl = user.submitDoc?.bill || null;
    let billName = user.submitDoc?.billName || null;
    let billMimeType = user.submitDoc?.billMimeType || null;
    const allowedIdTypes = ["passport", "national_id", "driving_license"];
    let idType = body.idType || user.submitDoc?.idType || "national_id";
    if (!allowedIdTypes.includes(idType)) idType = "national_id";
    let idNumber = body.idNumber !== undefined ? String(body.idNumber) : user.submitDoc?.idNumber || "";
    let dateOfBirth = body.dateOfBirth !== undefined ? String(body.dateOfBirth) : user.submitDoc?.dateOfBirth || "";
    let nationality = body.nationality !== undefined ? String(body.nationality) : user.submitDoc?.nationality || "";

    if (body.address) user.address = String(body.address).trim();
    if (body.city) user.city = String(body.city).trim();
    if (body.country) user.country = String(body.country).trim();
    if (body.postalCode) user.postalCode = String(body.postalCode).trim();
    if (body.phone) {
      const digits = String(body.phone).replace(/\D/g, "");
      if (digits) user.phone = Number(digits);
    }
    if (body.cnic && !fileByField(req, "cnic")) cnicUrl = body.cnic;
    if (body.cnicName) cnicName = body.cnicName;
    if (body.cnicMimeType) cnicMimeType = body.cnicMimeType;
    if (body.bill && !fileByField(req, "bill")) billUrl = body.bill;
    if (body.billName) billName = body.billName;
    if (body.billMimeType) billMimeType = body.billMimeType;

    const maxBytes = 10 * 1024 * 1024;
    const cnicFile = fileByField(req, "cnic");
    const billFile = fileByField(req, "bill");

    if (cnicFile && cnicFile.size > 0) {
      if (!isAllowedKycFile(cnicFile)) {
        return fail(res, 400, "Government ID must be a PDF, JPG, PNG, or WEBP file");
      }
      if (cnicFile.size > maxBytes) {
        return fail(res, 400, "Government ID file cannot exceed 10 MB");
      }
      cnicName = cnicFile.originalname;
      cnicMimeType = cnicFile.mimetype || "image/jpeg";
      try {
        const uploaded = await uploadBufferToCloudinary(cnicFile.buffer, {
          folder: "signdocs_kyc/id",
          mimeType: cnicMimeType,
          fileName: cnicName,
        });
        cnicUrl = uploaded.secure_url;
      } catch (error) {
        cnicUrl = `data:${cnicMimeType};base64,${cnicFile.buffer.toString("base64")}`;
      }
    }

    if (billFile && billFile.size > 0) {
      if (!isAllowedKycFile(billFile)) {
        return fail(res, 400, "Proof of Address must be a PDF, JPG, PNG, or WEBP file");
      }
      if (billFile.size > maxBytes) {
        return fail(res, 400, "Proof of Address file cannot exceed 10 MB");
      }
      billName = billFile.originalname;
      billMimeType = billFile.mimetype || "image/jpeg";
      try {
        const uploaded = await uploadBufferToCloudinary(billFile.buffer, {
          folder: "signdocs_kyc/address",
          mimeType: billMimeType,
          fileName: billName,
        });
        billUrl = uploaded.secure_url;
      } catch (error) {
        billUrl = `data:${billMimeType};base64,${billFile.buffer.toString("base64")}`;
      }
    }

    if (!cnicUrl && !billUrl) {
      return fail(res, 400, "Please upload at least one verification document (Government ID or Proof of Address)");
    }

    const bothPresent = Boolean(cnicUrl && billUrl);
    user.submitDoc = {
      status: bothPresent ? "completed" : "pending",
      cnic: cnicUrl,
      cnicName,
      cnicMimeType,
      bill: billUrl,
      billName,
      billMimeType,
      idType,
      idNumber,
      dateOfBirth,
      nationality,
      submittedAt: new Date(),
      verifiedAt: user.submitDoc?.verifiedAt || null,
      rejectionReason: null,
    };
    if (bothPresent) user.kyc = false;
    user.markModified("submitDoc");
    await user.save({ validateBeforeSave: false });

    await Notification.create({
      userId: user._id,
      recipientRole: "admin",
      type: "kyc_submitted",
      title: "New KYC Verification Submitted",
      content: `${user.firstName} ${user.lastName} (${user.email}) uploaded KYC verification documents for compliance review.`,
      link: `/admin/kyc/users/${user._id}?tab=kyc`,
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`,
    });
    notifyWalletAdmins(
      user,
      `You have a new KYC application from ${user.firstName} ${user.lastName}.`
    ).catch(() => {});

    const html = buildBrandedEmailHtml({
      title: "KYC Documents Received",
      greeting: `Hello ${user.firstName},`,
      bodyLines: [
        "We have received your KYC identity and address verification documents.",
        "Our compliance team is reviewing your submission and will notify you once your verification status is updated.",
      ],
    });
    sendEmail(
      user.email,
      `${process.env.WebName || "Wallet"} — KYC Verification Documents Received`,
      "We have received your KYC documents and our compliance team is reviewing them.",
      html
    ).catch(() => {});
    sendAdminAlertEmail({
      subject: `[KYC Submitted] ${user.firstName} ${user.lastName} — Action Required`,
      title: "New KYC Identity & Address Verification Submitted",
      bodyLines: [
        "A client has submitted their identity verification documents and is awaiting compliance review.",
        `Status: Pending Review (Submitted at ${new Date().toUTCString()})`,
      ],
      extraDetails: [
        { label: "Client Name", value: `${user.firstName} ${user.lastName}` },
        { label: "Client Email", value: user.email },
        { label: "Phone", value: user.phone || "Not provided" },
        {
          label: "Residential Address",
          value: [user.address, user.city, user.country, user.postalCode].filter(Boolean).join(", ") || "Not provided",
        },
        { label: "Document Type", value: String(idType).toUpperCase() },
        { label: "ID Number", value: idNumber || "Not provided" },
        { label: "Date of Birth", value: dateOfBirth || "Not provided" },
        { label: "Nationality", value: nationality || "Not provided" },
        { label: "Government ID File", value: cnicName || (cnicUrl ? "Uploaded" : "Pending") },
        { label: "Proof of Address File", value: billName || (billUrl ? "Uploaded" : "Pending") },
      ],
      ctaLabel: "Review Client KYC in Dashboard",
      ctaUrl: `${portalBaseUrl()}/admin/kyc/users/${user._id}?tab=kyc`,
      replyTo: `"${user.firstName} ${user.lastName}" <${user.email}>`,
    }).catch(() => {});

    return res.json({
      success: true,
      msg: bothPresent
        ? "KYC documents submitted! Your verification is now under compliance review."
        : "Document saved! Please upload the remaining document to complete your KYC submission.",
      user: sanitizeUserForViewer(user, user),
    });
  } catch (error) {
    console.error("KYC submit error:", error);
    return fail(res, 500, error?.message || "Failed to upload KYC documents");
  }
};

exports.reviewKyc = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.userId)) return fail(res, 400, "Invalid client ID");
    const staff = req.user;
    if (!isStaffRole(staff.role)) return fail(res, 403, "Unauthorized");
    if (staff.role === "admin" && staff.adminPermissions?.canManageKyc === false) {
      return fail(res, 403, "Your Admin account does not have permission to approve/reject KYC");
    }
    if (staff.role === "subadmin" && staff.permissions?.canReviewKyc === false) {
      return fail(res, 403, "Your Sub-Admin account does not have permission to approve/reject KYC");
    }
    const user = await User.findById(req.params.userId);
    if (!user) return fail(res, 404, "Client not found");
    if (!canStaffAccessUser(staff, user)) return fail(res, 403, "Access denied to this client");

    const { action, reason } = req.body || {};
    const approve = action === "approve" ? true : action === "reject" ? false : !user.kyc;
    const currentDoc = user.submitDoc?.toObject?.() || user.submitDoc || {};
    const defaultRejectMsg =
      "Your KYC verification documents were reviewed and rejected by compliance. Please upload valid, legible, and unexpired documents.";
    const effectiveReason = (reason || "").trim() || defaultRejectMsg;

    if (approve) {
      user.kyc = true;
      user.submitDoc = {
        ...currentDoc,
        status: "verified",
        verifiedAt: new Date(),
        rejectionReason: null,
      };
      user.kycHistory = user.kycHistory || [];
      user.kycHistory.unshift(snapshotSubmitDoc(currentDoc, "approved", staff, null));
      user.markModified("kycHistory");
    } else {
      const hasUploadedDocs = Boolean(currentDoc.cnic || currentDoc.bill);
      const isAlreadyRejected = currentDoc.status === "rejected" && !hasUploadedDocs;
      if (isAlreadyRejected) {
        return fail(res, 400, "Client KYC is already marked as rejected. No new documents have been uploaded to reject.");
      }
      user.kyc = false;
      if (hasUploadedDocs) {
        user.kycHistory = user.kycHistory || [];
        user.kycHistory.unshift(snapshotSubmitDoc(currentDoc, "rejected", staff, effectiveReason));
        user.markModified("kycHistory");
      }
      user.submitDoc = {
        status: "rejected",
        cnic: null,
        cnicName: null,
        cnicMimeType: null,
        bill: null,
        billName: null,
        billMimeType: null,
        idType: currentDoc.idType || "national_id",
        idNumber: currentDoc.idNumber || "",
        dateOfBirth: currentDoc.dateOfBirth || "",
        nationality: currentDoc.nationality || "",
        submittedAt: currentDoc.submittedAt || null,
        verifiedAt: null,
        rejectionReason: effectiveReason,
      };
    }
    user.markModified("submitDoc");
    await user.save({ validateBeforeSave: false });

    await Notification.create({
      userId: user._id,
      recipientRole: "user",
      type: approve ? "kyc_approved" : "kyc_rejected",
      title: approve ? "KYC Verification Approved" : "KYC Verification Update",
      content: approve
        ? "Your identity and address verification (KYC) has been approved by our compliance team."
        : `Your KYC verification requires attention: ${user.submitDoc.rejectionReason}`,
      link: "/flows/kyc",
      userEmail: user.email,
      userName: `${user.firstName} ${user.lastName}`,
    });
    const html = buildBrandedEmailHtml({
      title: approve ? "Your KYC Verification is Approved" : "KYC Verification Status Update",
      greeting: `Hello ${user.firstName},`,
      bodyLines: approve
        ? [
            "Your KYC identity and address verification documents have been reviewed and approved.",
            "You now have verified status on your wallet account.",
          ]
        : [
            "Our compliance team reviewed your KYC submission and requires an update:",
            `Note: ${user.submitDoc.rejectionReason}`,
            "Please sign in to upload updated verification documents.",
          ],
    });
    sendEmail(
      user.email,
      approve
        ? `${process.env.WebName || "Wallet"} — KYC Verification Approved`
        : `${process.env.WebName || "Wallet"} — Action Required on Your KYC Verification`,
      approve
        ? "Your KYC verification has been approved."
        : `Your KYC verification requires attention: ${user.submitDoc.rejectionReason}`,
      html
    ).catch(() => {});

    return res.json({
      success: true,
      msg: approve
        ? "Client KYC approved successfully"
        : "Client KYC rejected. Client can now re-submit updated documents.",
      user: sanitizeUserForViewer(user, staff),
    });
  } catch (error) {
    return fail(res, 500, error?.message || "Failed to update KYC status");
  }
};

exports.deleteKyc = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.userId)) return fail(res, 400, "Invalid client ID");
    const staff = req.user;
    if (!isStaffRole(staff.role)) return fail(res, 403, "Unauthorized");
    if (
      (staff.role === "admin" && staff.adminPermissions?.canManageKyc === false) ||
      (staff.role === "subadmin" &&
        (staff.permissions?.canReviewKyc === false || staff.permissions?.canDeleteKyc !== true))
    ) {
      return fail(res, 403, "Your account does not have permission to delete KYC documents");
    }
    const user = await User.findById(req.params.userId);
    if (!user) return fail(res, 404, "User not found");
    if (!canStaffAccessUser(staff, user)) return fail(res, 403, "Access denied");

    const clearHistoryParam = req.query.clearHistory;
    const historyIndexParam = req.query.historyIndex;
    const historyIdParam = req.query.historyId;
    const docType = req.query.docType;

    if (clearHistoryParam === "true" || clearHistoryParam === "1") {
      user.kycHistory = [];
      user.markModified("kycHistory");
      await user.save({ validateBeforeSave: false });
      return res.json({
        success: true,
        msg: "All KYC upload and decision history records cleared successfully",
        user: sanitizeUserForViewer(user, staff),
      });
    }

    if (historyIdParam !== undefined || historyIndexParam !== undefined) {
      if (!Array.isArray(user.kycHistory) || user.kycHistory.length === 0) {
        return fail(res, 404, "No history records found to delete");
      }
      if (historyIdParam) {
        user.kycHistory = user.kycHistory.filter((entry) => String(entry._id) !== historyIdParam);
      } else {
        const idx = parseInt(historyIndexParam, 10);
        if (Number.isNaN(idx) || idx < 0 || idx >= user.kycHistory.length) {
          return fail(res, 400, "Invalid history record index");
        }
        user.kycHistory.splice(idx, 1);
      }
      user.markModified("kycHistory");
      await user.save({ validateBeforeSave: false });
      return res.json({
        success: true,
        msg: "History record deleted successfully",
        user: sanitizeUserForViewer(user, staff),
      });
    }

    if (docType !== "cnic" && docType !== "bill") {
      return fail(res, 400, "Invalid action. Specify docType (cnic/bill), clearHistory=true, or historyIndex.");
    }
    const currentUrl = user.submitDoc?.[docType];
    if (currentUrl && currentUrl.includes("cloudinary.com")) {
      await deleteFromCloudinary(currentUrl);
    }
    if (docType === "cnic") {
      user.submitDoc.cnic = null;
      user.submitDoc.cnicName = null;
      user.submitDoc.cnicMimeType = null;
    } else {
      user.submitDoc.bill = null;
      user.submitDoc.billName = null;
      user.submitDoc.billMimeType = null;
    }
    user.kyc = false;
    if (!user.submitDoc.cnic && !user.submitDoc.bill) user.submitDoc.status = "pending";
    user.markModified("submitDoc");
    await user.save({ validateBeforeSave: false });
    return res.json({
      success: true,
      msg: `${docType === "cnic" ? "Government ID" : "Proof of Address"} removed successfully`,
      user: sanitizeUserForViewer(user, staff),
    });
  } catch (error) {
    return fail(res, 500, error?.message || "Failed to delete KYC document");
  }
};

exports.getKycDocument = async (req, res) => {
  try {
    const viewer = req.user;
    const { docType } = req.params;
    if (docType !== "cnic" && docType !== "bill") {
      return fail(res, 400, "Invalid KYC document type");
    }
    const targetId = req.params.userId === "me" ? String(viewer._id) : req.params.userId;
    if (!isValidObjectId(targetId)) return fail(res, 400, "Invalid user ID");
    const user = await User.findById(targetId);
    if (!user) return fail(res, 404, "User not found");
    const isSelf = String(viewer._id) === String(user._id);
    if (!isSelf && !isStaffRole(viewer.role)) return fail(res, 403, "Access denied");
    if (!isSelf && !canStaffAccessUser(viewer, user)) return fail(res, 403, "Access denied");

    let docUrl = user.submitDoc?.[docType];
    let defaultName = user.submitDoc?.[`${docType}Name`] || `${user.firstName}_${docType.toUpperCase()}`;
    let docMimeType = user.submitDoc?.[`${docType}MimeType`];
    if (req.query.history !== undefined && isStaffRole(viewer.role) && Array.isArray(user.kycHistory)) {
      const entry = user.kycHistory[parseInt(req.query.history, 10)];
      if (entry && entry[docType]) {
        docUrl = entry[docType];
        defaultName = entry[`${docType}Name`] || defaultName;
        docMimeType = entry[`${docType}MimeType`] || docMimeType;
      }
    }
    if (!docUrl) return fail(res, 404, "KYC document not found");
    const shouldDownload = req.query.download === "1";

    if (docUrl.startsWith("data:")) {
      const matches = docUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (!matches) return fail(res, 400, "Malformed document data");
      const mimeType = matches[1];
      const buffer = Buffer.from(matches[2], "base64");
      const ext = mimeType.includes("pdf") ? ".pdf" : mimeType.includes("png") ? ".png" : ".jpg";
      const fileName = defaultName.includes(".") ? defaultName : `${defaultName}${ext}`;
      res.setHeader("Content-Type", mimeType);
      res.setHeader("Content-Disposition", `${shouldDownload ? "attachment" : "inline"}; filename="${fileName}"`);
      return res.send(buffer);
    }

    const asset = await fetchCloudinaryAssetBuffer(docUrl);
    if (!asset) return res.redirect(docUrl);
    res.setHeader("Content-Type", docMimeType || asset.contentType || "application/octet-stream");
    res.setHeader("Content-Disposition", `${shouldDownload ? "attachment" : "inline"}; filename="${defaultName}"`);
    return res.send(asset.buffer);
  } catch (error) {
    return fail(res, 500, error?.message || "Failed to load KYC file");
  }
};

exports.listDocuments = async (req, res) => {
  try {
    const viewer = req.user;
    const targetUserId = req.query.userId;
    const folder = req.query.folder;
    const status = req.query.status;
    const search = (req.query.search || "").trim();
    let baseScopeQuery = {};

    if (!isStaffRole(viewer.role)) {
      const signedGlobalParents = await SignDocument.find(
        { user: viewer._id, globalParentId: { $ne: null } },
        "globalParentId"
      ).lean();
      const excludedGlobalIds = signedGlobalParents.map((d) => d.globalParentId).filter(Boolean);
      baseScopeQuery = {
        $or: [
          { user: viewer._id },
          {
            isGlobal: true,
            ...(excludedGlobalIds.length ? { _id: { $nin: excludedGlobalIds } } : {}),
          },
        ],
      };
    } else if (targetUserId) {
      const targetUser = await User.findById(targetUserId);
      if (!targetUser || !canStaffAccessUser(viewer, targetUser)) {
        return fail(res, 403, "Access denied");
      }
      const signedGlobalParents = await SignDocument.find(
        { user: targetUser._id, globalParentId: { $ne: null } },
        "globalParentId"
      ).lean();
      const excludedGlobalIds = signedGlobalParents.map((d) => d.globalParentId).filter(Boolean);
      baseScopeQuery = {
        $or: [
          { user: targetUser._id },
          {
            isGlobal: true,
            ...(excludedGlobalIds.length ? { _id: { $nin: excludedGlobalIds } } : {}),
          },
        ],
      };
    } else if (viewer.role === "subadmin") {
      const accessibleUsers = await User.find(subadminAccessibleUsersQuery(viewer._id), "_id").lean();
      baseScopeQuery = {
        $or: [{ isGlobal: true }, { user: { $in: accessibleUsers.map((u) => u._id) } }],
      };
    }

    const andConditions = [];
    if (Object.keys(baseScopeQuery).length) andConditions.push(baseScopeQuery);
    if (folder && folder !== "All") andConditions.push({ folder });
    if (status === "pending_signature" || status === "signed") andConditions.push({ status });
    if (search) {
      const regex = new RegExp(escapeRegex(search), "i");
      andConditions.push({
        $or: [{ title: regex }, { fileName: regex }, { description: regex }, { folder: regex }],
      });
    }
    const filterQuery =
      andConditions.length === 0
        ? {}
        : andConditions.length === 1
          ? andConditions[0]
          : { $and: andConditions };

    const [documents, allScopedDocs] = await Promise.all([
      SignDocument.find(filterQuery)
        .sort({ updatedAt: -1, createdAt: -1 })
        .populate("user", "firstName lastName email kyc verified"),
      SignDocument.find(baseScopeQuery, "folder status fileSize requiresSignature isGlobal").lean(),
    ]);

    const folderCounts = {
      Contracts: 0,
      Agreements: 0,
      NDAs: 0,
      "KYC & Compliance": 0,
      Other: 0,
    };
    let pendingCount = 0;
    let signedCount = 0;
    let totalBytes = 0;
    for (const doc of allScopedDocs) {
      const key = doc.folder || "Other";
      folderCounts[key] = (folderCounts[key] || 0) + 1;
      if (doc.status === "signed") signedCount += 1;
      else pendingCount += 1;
      totalBytes += doc.fileSize || 0;
    }

    return res.json({
      success: true,
      documents,
      summary: {
        total: allScopedDocs.length,
        pendingSignature: pendingCount,
        signed: signedCount,
        totalBytes,
        folderCounts,
      },
    });
  } catch (error) {
    console.error("GET documents error:", error);
    return fail(res, 500, error?.message || "Failed to fetch documents");
  }
};

async function createGeneratedDocument({ uploader, isGlobalFlag, targetUser, folder, title, description, contentPreview, requiresSignature }) {
  const safeFileName = title.toLowerCase().endsWith(".pdf") ? title : `${title}.pdf`;
  const docDescription =
    description ||
    (isGlobalFlag
      ? "Global compliance document shared with all clients for review and signature."
      : `Compliance document assigned to ${targetUser.firstName} ${targetUser.lastName}.`);
  const generatedBuffer = await generateDocumentPdfBuffer({
    title: safeFileName,
    fileName: safeFileName,
    folder,
    description: docDescription,
    contentPreview,
  });
  let fileUrl = "";
  let publicId = "";
  let size = generatedBuffer.length;
  try {
    const uploaded = await uploadBufferToCloudinary(generatedBuffer, {
      folder: isGlobalFlag ? "signdocs_documents/global" : `signdocs_documents/${targetUser._id}`,
      mimeType: "application/pdf",
      fileName: safeFileName,
    });
    fileUrl = uploaded.secure_url;
    publicId = uploaded.public_id;
    size = uploaded.bytes || generatedBuffer.length;
  } catch (error) {
    fileUrl = `data:application/pdf;base64,${generatedBuffer.toString("base64")}`;
  }
  const created = await SignDocument.create({
    user: isGlobalFlag ? null : targetUser._id,
    isGlobal: isGlobalFlag,
    globalParentId: null,
    uploadedBy: uploader._id,
    uploadedByName: `${uploader.firstName} ${uploader.lastName}`,
    uploadedByRole: uploader.role,
    title: safeFileName,
    fileName: safeFileName,
    description: docDescription,
    folder,
    fileType: "pdf",
    mimeType: "application/pdf",
    fileSize: size,
    fileUrl,
    publicId,
    pageCount: 1,
    requiresSignature,
    status: requiresSignature ? "pending_signature" : "completed",
    documentContentPreview: contentPreview,
  });
  if (isGlobalFlag) notifyAllClientsOfGlobalDocument(created, uploader).catch(() => {});
  else if (targetUser) await notifyRecipientOfNewDocument(targetUser, created, uploader);
  return created;
}

exports.createDocument = async (req, res) => {
  try {
    const uploader = req.user;
    if (!isStaffRole(uploader.role)) {
      return fail(res, 403, "Only administrators with document permissions can upload documents");
    }
    if (
      (uploader.role === "admin" && uploader.adminPermissions?.canManageDocuments === false) ||
      (uploader.role === "subadmin" && uploader.permissions?.canManageDocuments === false)
    ) {
      return fail(res, 403, "Your account does not have permission to upload or manage documents");
    }

    const body = req.body || {};
    const rawUserId = String(body.userId || "").trim();
    const isGlobalFlag = body.isGlobal === true || body.isGlobal === "true" || rawUserId === "global" || rawUserId === "__GLOBAL__";
    const folder = String(body.folder || "Agreements");
    const customTitle = String(body.title || "").trim();
    const description = String(body.description || "").trim();
    const contentPreview = String(body.documentContentPreview || "").trim();
    const requiresSignature = body.requiresSignature !== "false" && body.requiresSignature !== false;
    let targetUser = null;

    if (!isGlobalFlag) {
      const targetUserId = rawUserId || (!isStaffRole(uploader.role) ? String(uploader._id) : "");
      if (!targetUserId) {
        return fail(res, 400, "Please select a client or choose Global sharing before uploading");
      }
      targetUser = await User.findById(targetUserId);
      if (!targetUser || !canStaffAccessUser(uploader, targetUser)) {
        return fail(res, 403, "You do not have access to upload documents for this client");
      }
    }

    const uploadList = (req.files || []).filter((file) => file.fieldname === "files" || file.fieldname === "file");
    if (uploadList.length === 0) {
      if (!customTitle && !body.fileName) {
        return fail(res, 400, "Please select a file to upload or provide a document title");
      }
      if (body.fileUrl && !customTitle && body.title === undefined && body.fileName) {
        // json fallback continues below
      } else if (!body.fileUrl) {
        const created = await createGeneratedDocument({
          uploader,
          isGlobalFlag,
          targetUser,
          folder,
          title: customTitle || body.fileName || "Compliance Agreement.pdf",
          description,
          contentPreview,
          requiresSignature,
        });
        return res.status(201).json({
          success: true,
          msg: isGlobalFlag ? "Document created and shared globally with all clients!" : "Document created and assigned for signature",
          documents: [created],
        });
      }
    }

    if (uploadList.length > 0) {
      const createdDocs = [];
      for (const file of uploadList) {
        if (!file || !file.size) continue;
        const fileName = file.originalname;
        const docTitle = uploadList.length === 1 && customTitle ? customTitle : fileName;
        const mimeType = file.mimetype || "application/pdf";
        let fileUrl = "";
        let publicId = "";
        let pages = 1;
        try {
          const uploaded = await uploadBufferToCloudinary(file.buffer, {
            folder: isGlobalFlag ? "signdocs_documents/global" : `signdocs_documents/${targetUser._id}`,
            mimeType,
            fileName,
          });
          fileUrl = uploaded.secure_url;
          publicId = uploaded.public_id;
          pages = uploaded.pages || 1;
        } catch (error) {
          if (file.buffer.length < 4 * 1024 * 1024) {
            fileUrl = `data:${mimeType};base64,${file.buffer.toString("base64")}`;
          } else {
            continue;
          }
        }
        const doc = await SignDocument.create({
          user: isGlobalFlag ? null : targetUser._id,
          isGlobal: isGlobalFlag,
          uploadedBy: uploader._id,
          uploadedByName: `${uploader.firstName} ${uploader.lastName}`,
          uploadedByRole: uploader.role,
          title: docTitle,
          fileName,
          description:
            description ||
            (isGlobalFlag
              ? `Global document uploaded by ${uploader.firstName} ${uploader.lastName} for all clients.`
              : `Uploaded by ${uploader.firstName} ${uploader.lastName} for digital review and execution.`),
          folder,
          fileType: detectFileTypeCategory(fileName, mimeType),
          mimeType,
          fileSize: file.size,
          fileUrl,
          publicId,
          pageCount: pages,
          requiresSignature,
          status: requiresSignature ? "pending_signature" : "completed",
          documentContentPreview: contentPreview,
        });
        createdDocs.push(doc);
        if (isGlobalFlag) notifyAllClientsOfGlobalDocument(doc, uploader).catch(() => {});
        else if (targetUser) await notifyRecipientOfNewDocument(targetUser, doc, uploader);
      }
      return res.status(201).json({
        success: true,
        msg: isGlobalFlag
          ? "Document uploaded and shared globally with all clients!"
          : createdDocs.length > 1
            ? `${createdDocs.length} documents uploaded successfully`
            : "Document uploaded successfully",
        documents: createdDocs,
      });
    }

    const title = (body.title || body.fileName || "Compliance Agreement.pdf").trim();
    const fileName = title.includes(".") ? title : `${title}.pdf`;
    const doc = await SignDocument.create({
      user: isGlobalFlag ? null : targetUser._id,
      isGlobal: isGlobalFlag,
      uploadedBy: uploader._id,
      uploadedByName: `${uploader.firstName} ${uploader.lastName}`,
      uploadedByRole: uploader.role,
      title,
      fileName,
      description: body.description || "",
      folder: body.folder || "Agreements",
      fileType: detectFileTypeCategory(fileName, body.mimeType || "application/pdf"),
      mimeType: body.mimeType || "application/pdf",
      fileSize: body.fileSize || 0,
      fileUrl: body.fileUrl || "",
      pageCount: body.pageCount || 1,
      requiresSignature,
      status: "pending_signature",
      documentContentPreview: body.documentContentPreview || "",
    });
    if (isGlobalFlag) notifyAllClientsOfGlobalDocument(doc, uploader).catch(() => {});
    else if (targetUser) await notifyRecipientOfNewDocument(targetUser, doc, uploader);
    return res.status(201).json({
      success: true,
      msg: isGlobalFlag ? "Document shared globally with all clients!" : "Document assigned for signature",
      documents: [doc],
    });
  } catch (error) {
    console.error("POST documents error:", error);
    return fail(res, 500, error?.message || "Failed to upload document");
  }
};

function canDeleteDocuments(viewer) {
  if (!isStaffRole(viewer.role)) return false;
  if (viewer.role === "admin" && (viewer.adminPermissions?.canManageDocuments === false || viewer.adminPermissions?.canDeleteDocuments === false)) {
    return false;
  }
  if (viewer.role === "subadmin" && (viewer.permissions?.canManageDocuments === false || viewer.permissions?.canDeleteDocuments !== true)) {
    return false;
  }
  return true;
}

exports.bulkDeleteDocuments = async (req, res) => {
  try {
    const viewer = req.user;
    if (!canDeleteDocuments(viewer)) {
      return fail(res, 403, "Your account does not have permission to delete documents");
    }
    const rawIds = Array.isArray(req.body?.ids) ? req.body.ids : [];
    const validIds = [...new Set(rawIds.map((id) => String(id || "").trim()).filter((id) => isValidObjectId(id)))];
    if (!validIds.length) return fail(res, 400, "No valid documents selected for deletion");
    const docs = await SignDocument.find({ _id: { $in: validIds } });
    if (!docs.length) return fail(res, 404, "Selected documents were not found");
    const deletableDocIds = [];
    const globalMasterIds = [];
    for (const doc of docs) {
      if (doc.isGlobal) {
        if (viewer.role !== "superadmin" && viewer.role !== "admin") continue;
        deletableDocIds.push(String(doc._id));
        if (!doc.user) globalMasterIds.push(String(doc._id));
        if ((doc.fileUrl && doc.fileUrl.includes("cloudinary.com")) || doc.publicId) {
          deleteFromCloudinary(doc.fileUrl || doc.publicId).catch(() => {});
        }
      } else if (doc.user) {
        const ownerUser = await User.findById(doc.user);
        if (ownerUser && !canStaffAccessUser(viewer, ownerUser)) continue;
        deletableDocIds.push(String(doc._id));
        if (!doc.globalParentId && ((doc.fileUrl && doc.fileUrl.includes("cloudinary.com")) || doc.publicId)) {
          deleteFromCloudinary(doc.fileUrl || doc.publicId).catch(() => {});
        }
      } else {
        deletableDocIds.push(String(doc._id));
      }
    }
    if (!deletableDocIds.length) {
      return fail(res, 403, "You do not have permission to delete the selected documents");
    }
    if (globalMasterIds.length) {
      await SignDocument.deleteMany({ globalParentId: { $in: globalMasterIds } });
    }
    await SignDocument.deleteMany({ _id: { $in: deletableDocIds } });
    return res.json({
      success: true,
      deletedCount: deletableDocIds.length,
      msg: `Deleted ${deletableDocIds.length} document(s) successfully`,
    });
  } catch (error) {
    return fail(res, 500, error?.message || "Bulk document deletion failed");
  }
};

exports.getDocument = async (req, res) => {
  try {
    const viewer = req.user;
    const doc = await SignDocument.findById(req.params.id).populate("user", "firstName lastName email kyc verified");
    if (!doc) return fail(res, 404, "Document not found");
    const ownerId = doc.user ? String(doc.user._id || doc.user) : "";
    if (!doc.isGlobal && !isStaffRole(viewer.role) && ownerId !== String(viewer._id)) {
      return fail(res, 403, "Access denied");
    }
    return res.json({ success: true, document: doc });
  } catch (error) {
    return fail(res, 500, error?.message || "Failed to fetch document");
  }
};

exports.patchDocument = async (req, res) => {
  try {
    const viewer = req.user;
    if (!isStaffRole(viewer.role)) return fail(res, 403, "Only authorized administrators can modify documents");
    if (
      (viewer.role === "admin" && viewer.adminPermissions?.canManageDocuments === false) ||
      (viewer.role === "subadmin" && viewer.permissions?.canManageDocuments === false)
    ) {
      return fail(res, 403, "Your account does not have permission to modify documents");
    }
    const doc = await SignDocument.findById(req.params.id);
    if (!doc) return fail(res, 404, "Document not found");
    if (!doc.isGlobal && doc.user) {
      const ownerUser = await User.findById(doc.user);
      if (ownerUser && !canStaffAccessUser(viewer, ownerUser)) return fail(res, 403, "Access denied");
    }
    const body = req.body || {};
    if (body.title !== undefined) doc.title = String(body.title).trim();
    if (body.description !== undefined) doc.description = String(body.description).trim();
    if (body.folder !== undefined) doc.folder = body.folder;
    if (body.isStarred !== undefined) doc.isStarred = Boolean(body.isStarred);
    if (body.documentContentPreview !== undefined) doc.documentContentPreview = body.documentContentPreview;
    await doc.save();
    return res.json({ success: true, msg: "Document updated", document: doc });
  } catch (error) {
    return fail(res, 500, error?.message || "Failed to update document");
  }
};

exports.deleteDocument = async (req, res) => {
  try {
    const viewer = req.user;
    if (!canDeleteDocuments(viewer)) {
      return fail(res, 403, "Your account does not have permission to delete documents");
    }
    const doc = await SignDocument.findById(req.params.id);
    if (!doc) return fail(res, 404, "Document not found");
    if (!doc.isGlobal && doc.user && String(doc.user) !== String(viewer._id)) {
      const ownerUser = await User.findById(doc.user);
      if (ownerUser && !canStaffAccessUser(viewer, ownerUser)) return fail(res, 403, "Access denied");
    }
    if (doc.publicId || (doc.fileUrl && doc.fileUrl.includes("cloudinary.com"))) {
      await deleteFromCloudinary(doc.publicId || doc.fileUrl, doc.fileType === "doc" ? "raw" : "image");
    }
    if (doc.signature?.signedFileUrl) await deleteFromCloudinary(doc.signature.signedFileUrl);
    if (doc.isGlobal) {
      await SignDocument.deleteMany({ globalParentId: doc._id });
    }
    await SignDocument.findByIdAndDelete(doc._id);
    return res.json({ success: true, msg: "Document deleted successfully" });
  } catch (error) {
    return fail(res, 500, error?.message || "Failed to delete document");
  }
};

exports.signDocument = async (req, res) => {
  try {
    const signer = await User.findById(req.user._id);
    if (!signer) return fail(res, 401, "Please sign in to execute this document");
    const doc = await SignDocument.findById(req.params.id);
    if (!doc) return fail(res, 404, "Document not found");
    let ownerUser = doc.user ? await User.findById(doc.user) : null;
    if (!doc.isGlobal) {
      if (!ownerUser) return fail(res, 404, "Document owner not found");
      if (!canStaffAccessUser(signer, ownerUser) && String(signer._id) !== String(ownerUser._id)) {
        return fail(res, 403, "You are not authorized to sign this document");
      }
    } else {
      ownerUser = signer;
    }
    if (signer.isComplianceRestricted) {
      return fail(res, 403, "Your account is currently under compliance review and cannot execute documents.");
    }
    const settings = await SystemSettings.findOne();
    if (settings?.requireKycBeforeSign && signer.role === "user" && !signer.kyc) {
      return fail(res, 403, "Please complete your KYC verification before signing documents.");
    }
    const body = req.body || {};
    const signatureMode = body.signatureMode || "draw";
    const signatureDataUrl = body.signatureDataUrl;
    if (signatureMode === "type") {
      return fail(res, 400, "Typed signatures are not accepted. Please draw your handwritten signature.");
    }
    if (!signatureDataUrl || typeof signatureDataUrl !== "string" || !signatureDataUrl.startsWith("data:image/") || signatureDataUrl.length < 200) {
      return fail(res, 400, "Handwritten signature is compulsory. Please draw your signature before saving.");
    }
    const finalSignerName = (body.signerName || `${signer.firstName} ${signer.lastName}`).trim();
    if (!finalSignerName) return fail(res, 400, "Please enter your full legal name before signing.");
    const certificateId = `SD-CERT-${new Date().getFullYear()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
    const signaturePayload = {
      signatureDataUrl,
      signatureMode: "draw",
      typedText: "",
      fontFamily: "",
      signerName: finalSignerName,
      signerEmail: signer.email,
      signerTitle: String(body.signerTitle || "").trim(),
      signedAt: new Date(),
      ipAddress: clientIp(req),
      userAgent: req.headers["user-agent"] || "Wallet Web Client",
      certificateId,
      pageNumber: Number(body.pageNumber) || doc.pageCount || 1,
      positionX: Number(body.positionX) || 65,
      positionY: Number(body.positionY) || 78,
      signedFileUrl: null,
    };
    let signedDocRecord = doc;
    if (doc.isGlobal && !doc.user) {
      const existingCopy = await SignDocument.findOne({ user: signer._id, globalParentId: doc._id });
      if (existingCopy) {
        existingCopy.status = "signed";
        existingCopy.signature = signaturePayload;
        await existingCopy.save();
        signedDocRecord = existingCopy;
      } else {
        signedDocRecord = await SignDocument.create({
          user: signer._id,
          isGlobal: false,
          globalParentId: doc._id,
          uploadedBy: doc.uploadedBy,
          uploadedByName: doc.uploadedByName,
          uploadedByRole: doc.uploadedByRole,
          title: doc.title,
          fileName: doc.fileName,
          description: doc.description,
          folder: doc.folder,
          fileType: doc.fileType,
          mimeType: doc.mimeType,
          fileSize: doc.fileSize,
          fileUrl: doc.fileUrl,
          publicId: doc.publicId,
          pageCount: doc.pageCount,
          requiresSignature: true,
          status: "signed",
          documentContentPreview: doc.documentContentPreview,
          signature: signaturePayload,
        });
      }
    } else {
      doc.status = "signed";
      doc.signature = signaturePayload;
      await doc.save();
      signedDocRecord = doc;
    }
    if (body.saveForFuture !== false && signatureDataUrl) {
      signer.savedSignature = signatureDataUrl;
      await signer.save({ validateBeforeSave: false });
    }
    const notifyTargetUserId = ownerUser?._id || signer._id;
    await Notification.create({
      userId: notifyTargetUserId,
      recipientRole: "admin",
      type: "document_signed",
      title: "Document Signed by Client",
      content: `${finalSignerName} (${signer.email}) signed "${signedDocRecord.title}" with a handwritten signature.`,
      link: `/admin/kyc/users/${notifyTargetUserId}?tab=documents`,
      userEmail: signer.email,
      userName: finalSignerName,
    });
    const html = buildBrandedEmailHtml({
      title: "Document Signed Successfully",
      greeting: `Hello ${finalSignerName},`,
      bodyLines: [
        `You have signed "${signedDocRecord.title}".`,
        `Certificate ID: ${certificateId}`,
        `Timestamp: ${new Date().toUTCString()}`,
      ],
    });
    sendEmail(
      signer.email,
      `${process.env.WebName || "Wallet"} — Signature Confirmation: ${signedDocRecord.title}`,
      `You have signed "${signedDocRecord.title}". Certificate ID: ${certificateId}`,
      html
    ).catch(() => {});
    sendAdminAlertEmail({
      subject: `[Document Signed] ${signedDocRecord.title} — ${finalSignerName}`,
      title: "Client Document Signed with Handwritten Signature",
      bodyLines: [`The document "${signedDocRecord.title}" was signed by ${finalSignerName}.`],
      extraDetails: [
        { label: "Document Title", value: signedDocRecord.title },
        { label: "Signer Name", value: finalSignerName },
        { label: "Signer Email", value: signer.email },
        { label: "Certificate ID", value: certificateId },
        { label: "Signed At", value: new Date().toUTCString() },
      ],
      ctaLabel: "View Document in Admin Portal",
      ctaUrl: `${portalBaseUrl()}/admin/kyc/users/${notifyTargetUserId}?tab=documents`,
      replyTo: `"${finalSignerName}" <${signer.email}>`,
    }).catch(() => {});
    const populated = await SignDocument.findById(signedDocRecord._id).populate(
      "user",
      "firstName lastName email kyc verified"
    );
    return res.json({
      success: true,
      msg: `"${signedDocRecord.title}" signed successfully!`,
      document: populated,
    });
  } catch (error) {
    console.error("Sign document error:", error);
    return fail(res, 500, error?.message || "Failed to sign document");
  }
};

exports.downloadDocument = async (req, res) => {
  try {
    const viewer = req.user;
    const doc = await SignDocument.findById(req.params.id);
    if (!doc) return fail(res, 404, "Document not found");
    if (!doc.isGlobal && doc.user) {
      const ownerUser = await User.findById(doc.user);
      if (ownerUser && String(ownerUser._id) !== String(viewer._id) && !canStaffAccessUser(viewer, ownerUser)) {
        return fail(res, 403, "Access denied");
      }
    }
    const inline = req.query.inline === "1";
    const baseName = (doc.fileName || doc.title || "document").replace(/\.[^.]+$/, "");
    const downloadFileName = `${baseName}.pdf`;
    let originalBuffer = null;
    if (doc.fileUrl && doc.fileUrl.startsWith("data:")) {
      const commaIdx = doc.fileUrl.indexOf(",");
      if (commaIdx !== -1) originalBuffer = Buffer.from(doc.fileUrl.slice(commaIdx + 1), "base64");
    } else if ((doc.fileUrl && doc.fileUrl.startsWith("http")) || doc.publicId) {
      const asset = await fetchCloudinaryAssetBuffer(doc.fileUrl, doc.publicId);
      if (asset && asset.buffer.length > 0) originalBuffer = asset.buffer;
    }
    if (originalBuffer && originalBuffer.length > 4 && originalBuffer.subarray(0, 5).toString("ascii") === "%PDF-") {
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `${inline ? "inline" : "attachment"}; filename="${downloadFileName}"`);
      res.setHeader("Cache-Control", "no-store");
      return res.send(originalBuffer);
    }
    const pdfBuffer = await generateDocumentPdfBuffer({
      title: doc.title,
      fileName: doc.fileName,
      folder: doc.folder,
      description: doc.description,
      contentPreview: doc.documentContentPreview,
      originalPdfBuffer: originalBuffer,
      signature: null,
    });
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `${inline ? "inline" : "attachment"}; filename="${downloadFileName}"`);
    res.setHeader("Cache-Control", "no-store");
    return res.send(pdfBuffer);
  } catch (error) {
    console.error("Download PDF error:", error);
    return fail(res, 500, error?.message || "Failed to load PDF");
  }
};

exports.listNotifications = async (req, res) => {
  try {
    const user = req.user;
    const query = isStaffRole(user.role)
      ? { recipientRole: "admin" }
      : { userId: user._id, recipientRole: "user" };
    const notifications = await Notification.find(query).sort({ createdAt: -1 }).limit(30);
    return res.json({ success: true, notifications });
  } catch (error) {
    return fail(res, 500, error?.message || "Failed to fetch notifications");
  }
};

exports.patchNotifications = async (req, res) => {
  try {
    const user = req.user;
    const { id, markAll } = req.body || {};
    const scopeFilter = isStaffRole(user.role)
      ? { recipientRole: "admin" }
      : { userId: user._id, recipientRole: "user" };
    if (markAll) await Notification.updateMany(scopeFilter, { $set: { isRead: true } });
    else if (id) await Notification.findOneAndUpdate({ _id: id, ...scopeFilter }, { $set: { isRead: true } });
    return res.json({ success: true, msg: "Notification status updated" });
  } catch (error) {
    return fail(res, 500, error?.message || "Failed to update notification");
  }
};

exports.deleteNotifications = async (req, res) => {
  try {
    const user = req.user;
    if (!isStaffRole(user.role)) return fail(res, 403, "Only administrators can delete notifications");
    const scopeFilter = { recipientRole: "admin" };
    if (req.query.id) await Notification.findOneAndDelete({ _id: req.query.id, ...scopeFilter });
    else await Notification.deleteMany(scopeFilter);
    return res.json({ success: true, msg: "Notifications cleared" });
  } catch (error) {
    return fail(res, 500, error?.message || "Failed to clear notifications");
  }
};

exports.getSettings = async (req, res) => {
  try {
    const settings = await ensureSettings();
    const viewer = req.user;
    const settingsObj = settings.toObject();
    if (viewer.role !== "superadmin") {
      delete settingsObj.smtpConfig;
    }
    return res.json({ success: true, settings: settingsObj });
  } catch (error) {
    return fail(res, 500, error?.message || "Failed to load settings");
  }
};

exports.patchSettings = async (req, res) => {
  try {
    const viewer = req.user;
    if (viewer.role !== "superadmin") {
      return fail(res, 403, "Only Super Admin can modify global settings and global SMTP configuration");
    }
    const settings = await ensureSettings();
    const body = req.body || {};
    ["requireEmailVerification", "requireKycBeforeSign", "autoNotifyClientOnUpload", "autoNotifyAdminOnSign"].forEach(
      (field) => {
        if (typeof body[field] === "boolean") settings[field] = body[field];
      }
    );
    if (body.companyName !== undefined) settings.companyName = String(body.companyName).trim();
    if (body.supportEmail !== undefined) settings.supportEmail = String(body.supportEmail).trim();
    if (body.smtpConfig && typeof body.smtpConfig === "object") {
      const current = settings.smtpConfig?.toObject?.() || settings.smtpConfig || {};
      const nextPort = body.smtpConfig.port !== undefined ? Number(body.smtpConfig.port) : current.port;
      settings.smtpConfig = {
        enabled: typeof body.smtpConfig.enabled === "boolean" ? body.smtpConfig.enabled : current.enabled,
        host: body.smtpConfig.host !== undefined ? String(body.smtpConfig.host).trim() : current.host,
        port: nextPort,
        secure: typeof body.smtpConfig.secure === "boolean" ? body.smtpConfig.secure : nextPort === 465,
        user: body.smtpConfig.user !== undefined ? String(body.smtpConfig.user).trim() : current.user,
        pass: body.smtpConfig.pass !== undefined && body.smtpConfig.pass !== "••••••••" ? String(body.smtpConfig.pass) : current.pass,
        fromEmail: body.smtpConfig.fromEmail !== undefined ? String(body.smtpConfig.fromEmail).trim() : current.fromEmail,
        fromName: body.smtpConfig.fromName !== undefined ? String(body.smtpConfig.fromName).trim() : current.fromName,
        adminAlertEmail:
          body.smtpConfig.adminAlertEmail !== undefined
            ? String(body.smtpConfig.adminAlertEmail).trim()
            : current.adminAlertEmail || "info@goin-in-vest.com",
      };
      settings.markModified("smtpConfig");
    }
    await settings.save();
    if (body.smtpConfig && settings.smtpConfig) {
      const set = {
        "smtpConfig.enabled": settings.smtpConfig.enabled,
        "smtpConfig.host": settings.smtpConfig.host,
        "smtpConfig.port": settings.smtpConfig.port,
        "smtpConfig.secure": settings.smtpConfig.secure,
        "smtpConfig.user": settings.smtpConfig.user,
        "smtpConfig.fromEmail": settings.smtpConfig.fromEmail,
        "smtpConfig.fromName": settings.smtpConfig.fromName,
        "smtpConfig.adminAlertEmail": settings.smtpConfig.adminAlertEmail,
      };
      if (settings.smtpConfig.pass) set["smtpConfig.password"] = settings.smtpConfig.pass;
      await User.updateMany({ role: "superadmin" }, { $set: set });
    }
    return res.json({
      success: true,
      msg: "Global settings & SMTP configuration saved successfully",
      settings,
    });
  } catch (error) {
    return fail(res, 500, error?.message || "Failed to update settings");
  }
};

exports.testSmtp = async (req, res) => {
  try {
    const viewer = req.user;
    if (viewer.role !== "superadmin") {
      return fail(res, 403, "Only Super Admin can test global SMTP settings");
    }
    const recipient = String(req.body?.testRecipient || viewer.email || "").trim();
    if (!recipient) return fail(res, 400, "Please enter a recipient email for the test");
    const result = await testSmtpConnectionAndSend({
      smtpConfig: req.body?.smtpConfig || {},
      testRecipient: recipient,
    });
    return res.json({
      success: true,
      msg: `SMTP verified! Test email delivered to ${recipient}`,
      messageId: result.messageId,
    });
  } catch (error) {
    return fail(res, 400, error?.message || "SMTP connection failed. Please check Host, Port, Username, and Password.");
  }
};

exports.listUsers = async (req, res) => {
  try {
    const viewer = req.user;
    if (!isStaffRole(viewer.role)) return fail(res, 403, "Unauthorized access");
    const roleFilter = req.query.role || "";
    const search = (req.query.search || "").trim();
    const verifiedFilter = req.query.verified;
    const kycFilter = req.query.kyc;
    const subadminId = req.query.subadminId;
    const query = {};
    if (viewer.role === "subadmin") {
      if (roleFilter && roleFilter !== "user") return fail(res, 403, "Sub-Admins can only view assigned clients");
      Object.assign(query, subadminAccessibleUsersQuery(viewer._id));
    } else if (roleFilter) {
      if ((roleFilter === "admin" || roleFilter === "superadmin") && viewer.role !== "superadmin") {
        return fail(res, 403, "Only Superadmin can list Admin accounts");
      }
      query.role = roleFilter;
    } else if (viewer.role === "admin") {
      query.role = { $in: ["user", "subadmin"] };
    }
    if (verifiedFilter === "true" || verifiedFilter === "false") query.verified = verifiedFilter === "true";
    if (kycFilter === "verified") query.kyc = true;
    else if (kycFilter === "submitted") {
      query.kyc = false;
      query["submitDoc.status"] = "completed";
    } else if (kycFilter === "unverified") query.kyc = false;
    if (subadminId && viewer.role !== "subadmin" && isValidObjectId(subadminId)) {
      query.$or = [{ assignedSubAdmins: subadminId }, { assignedSubAdmin: subadminId }];
    }
    if (search) {
      const regex = new RegExp(escapeRegex(search), "i");
      const searchOr = [
        { firstName: regex },
        { lastName: regex },
        { email: regex },
        { city: regex },
        { country: regex },
      ];
      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: searchOr }];
        delete query.$or;
      } else query.$or = searchOr;
    }
    const users = await User.find(query)
      .sort({ "submitDoc.submittedAt": -1, createdAt: -1 })
      .populate("assignedSubAdmins", "firstName lastName email")
      .populate("assignedSubAdmin", "firstName lastName email");
    const docCounts = await SignDocument.aggregate([
      {
        $group: {
          _id: "$user",
          totalDocs: { $sum: 1 },
          pendingDocs: { $sum: { $cond: [{ $eq: ["$status", "pending_signature"] }, 1, 0] } },
          signedDocs: { $sum: { $cond: [{ $eq: ["$status", "signed"] }, 1, 0] } },
        },
      },
    ]);
    const docCountMap = new Map();
    for (const item of docCounts) {
      if (item._id) {
        docCountMap.set(String(item._id), {
          totalDocs: item.totalDocs,
          pendingDocs: item.pendingDocs,
          signedDocs: item.signedDocs,
        });
      }
    }
    let allClients = [];
    if (roleFilter === "subadmin" || !roleFilter) {
      allClients = await User.find({ role: "user" }, "_id isShared assignedSubAdmin assignedSubAdmins").lean();
    }
    const sanitizedUsers = users.map((user) => {
      const clean = sanitizeUserForViewer(user, viewer);
      clean.documentStats = docCountMap.get(String(user._id)) || { totalDocs: 0, pendingDocs: 0, signedDocs: 0 };
      if (user.role === "subadmin") {
        const sid = String(user._id);
        let dedicated = 0;
        let shared = 0;
        for (const client of allClients) {
          const assignedIds = getAssignedSubAdminIds(client);
          if (assignedIds.includes(sid)) dedicated += 1;
          else if (client.isShared) shared += 1;
        }
        clean.managedUsersCount = { dedicated, shared, total: dedicated + shared };
      }
      return clean;
    });
    const baseClientFilter = viewer.role === "subadmin" ? subadminAccessibleUsersQuery(viewer._id) : { role: "user" };
    const [totalClients, verifiedClients, kycApprovedCount, kycPendingReviewCount, totalAdmins, totalSubAdmins] =
      await Promise.all([
        User.countDocuments(baseClientFilter),
        User.countDocuments({ ...baseClientFilter, verified: true }),
        User.countDocuments({ ...baseClientFilter, kyc: true }),
        User.countDocuments({ ...baseClientFilter, kyc: false, "submitDoc.status": "completed" }),
        User.countDocuments({ role: "admin" }),
        User.countDocuments({ role: "subadmin" }),
      ]);
    return res.json({
      success: true,
      users: sanitizedUsers,
      counts: {
        totalClients,
        verifiedClients,
        unverifiedClients: Math.max(0, totalClients - verifiedClients),
        kycApprovedCount,
        kycPendingReviewCount,
        totalAdmins,
        totalSubAdmins,
      },
    });
  } catch (error) {
    console.error("GET users error:", error);
    return fail(res, 500, error?.message || "Failed to fetch users");
  }
};

function canDeleteUser(viewer, target) {
  if (target.role === "superadmin") return false;
  if (String(viewer._id) === String(target._id)) return false;
  if (target.role === "admin" && viewer.role !== "superadmin") return false;
  if (target.role === "subadmin") {
    if (viewer.role === "subadmin") return false;
    if (viewer.role === "admin" && viewer.adminPermissions?.isSubManagement === false) return false;
  }
  if (target.role === "user") {
    if (!canStaffAccessUser(viewer, target)) return false;
    if (viewer.role === "admin" && viewer.adminPermissions?.canDeleteUsers === false) return false;
    if (viewer.role === "subadmin" && viewer.permissions?.canDeleteUsers !== true) return false;
  }
  return true;
}

exports.bulkDeleteUsers = async (req, res) => {
  try {
    const viewer = req.user;
    if (!isStaffRole(viewer.role)) return fail(res, 403, "Only authorized staff can bulk delete user accounts");
    const rawIds = Array.isArray(req.body?.ids) ? req.body.ids : [];
    const validIds = [...new Set(rawIds.map((id) => String(id || "").trim()).filter((id) => isValidObjectId(id)))];
    if (!validIds.length) return fail(res, 400, "No valid user accounts selected for deletion");
    const targetUsers = await User.find({ _id: { $in: validIds } });
    const deletableIds = [];
    const deletedSubAdminIds = [];
    for (const target of targetUsers) {
      if (!canDeleteUser(viewer, target)) continue;
      deletableIds.push(String(target._id));
      if (target.role === "subadmin") deletedSubAdminIds.push(String(target._id));
      if (target.submitDoc?.cnic?.includes?.("cloudinary.com")) deleteFromCloudinary(target.submitDoc.cnic).catch(() => {});
      if (target.submitDoc?.bill?.includes?.("cloudinary.com")) deleteFromCloudinary(target.submitDoc.bill).catch(() => {});
    }
    if (!deletableIds.length) return fail(res, 403, "You do not have permission to delete the selected accounts");
    if (deletedSubAdminIds.length) {
      await User.updateMany(
        { assignedSubAdmins: { $in: deletedSubAdminIds } },
        { $pull: { assignedSubAdmins: { $in: deletedSubAdminIds } } }
      );
      await User.updateMany({ assignedSubAdmin: { $in: deletedSubAdminIds } }, { $set: { assignedSubAdmin: null } });
    }
    await SignDocument.deleteMany({ user: { $in: deletableIds } });
    await Notification.deleteMany({ userId: { $in: deletableIds } });
    await User.deleteMany({ _id: { $in: deletableIds } });
    return res.json({
      success: true,
      deletedCount: deletableIds.length,
      msg: `Deleted ${deletableIds.length} account(s) successfully`,
    });
  } catch (error) {
    return fail(res, 500, error?.message || "Bulk deletion failed");
  }
};

exports.getPortalUser = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return fail(res, 400, "Invalid user ID");
    const viewer = req.user;
    const targetUser = await User.findById(req.params.id)
      .populate("assignedSubAdmins", "firstName lastName email phone")
      .populate("assignedSubAdmin", "firstName lastName email phone");
    if (!targetUser) return fail(res, 404, "User not found");
    if (!canStaffAccessUser(viewer, targetUser)) return fail(res, 403, "Access denied to this client");
    const signedGlobalParents = await SignDocument.find(
      { user: targetUser._id, globalParentId: { $ne: null } },
      "globalParentId"
    ).lean();
    const excludedGlobalIds = signedGlobalParents.map((d) => d.globalParentId).filter(Boolean);
    const documents = await SignDocument.find({
      $or: [
        { user: targetUser._id },
        { isGlobal: true, ...(excludedGlobalIds.length ? { _id: { $nin: excludedGlobalIds } } : {}) },
      ],
    }).sort({ createdAt: -1 });
    return res.json({
      success: true,
      user: sanitizeUserForViewer(targetUser, viewer),
      documents,
    });
  } catch (error) {
    return fail(res, 500, error?.message || "Failed to load user");
  }
};

exports.patchPortalUser = async (req, res) => {
  try {
    if (!isValidObjectId(req.params.id)) return fail(res, 400, "Invalid user ID");
    const viewer = req.user;
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) return fail(res, 404, "User not found");
    const isSelf = String(viewer._id) === String(targetUser._id);
    if (!isSelf && !canStaffAccessUser(viewer, targetUser)) return fail(res, 403, "Access denied");
    if (!isSelf && targetUser.role === "superadmin") return fail(res, 403, "Cannot modify a Superadmin account");
    if (!isSelf && targetUser.role === "admin" && viewer.role !== "superadmin") {
      return fail(res, 403, "Only Superadmin can modify Admin accounts");
    }
    const body = req.body || {};
    const profileFields = ["firstName", "lastName", "address", "city", "country", "postalCode", "note", "savedSignature"];
    const isEditingProfile =
      profileFields.some((field) => body[field] !== undefined) ||
      body.email !== undefined ||
      body.phone !== undefined ||
      body.password !== undefined;
    if (isEditingProfile && !isSelf) {
      if (viewer.role === "admin" && viewer.adminPermissions?.isProfileUpdate === false) {
        return fail(res, 403, "Your admin account does not have permission to edit user profiles");
      }
      if (viewer.role === "subadmin" && viewer.permissions?.editUserProfile !== true) {
        return fail(res, 403, "Your sub-admin account does not have permission to edit client profiles");
      }
    }
    for (const field of profileFields) {
      if (body[field] !== undefined) targetUser[field] = body[field];
    }
    if (body.phone !== undefined) {
      const digits = String(body.phone).replace(/\D/g, "");
      if (digits) targetUser.phone = Number(digits);
    }
    if (body.email && body.email.toLowerCase().trim() !== targetUser.email) {
      const normalized = body.email.toLowerCase().trim();
      const exists = await User.findOne({ email: normalized, _id: { $ne: targetUser._id } });
      if (exists) return fail(res, 400, "Email is already in use by another account");
      targetUser.email = normalized;
    }
    if (body.password !== undefined && String(body.password).trim().length > 0) {
      const nextPass = String(body.password).trim();
      if (nextPass.length < 8) return fail(res, 400, "Password must be at least 8 characters");
      if (nextPass !== targetUser.password) targetUser.password = nextPass;
    }
    if (isStaffRole(viewer.role)) {
      if (typeof body.verified === "boolean") targetUser.verified = body.verified;
      if (typeof body.isShared === "boolean" && (viewer.role === "superadmin" || viewer.role === "admin")) {
        targetUser.isShared = body.isShared;
      }
      if (typeof body.isComplianceRestricted === "boolean") {
        if (
          (viewer.role === "admin" && viewer.adminPermissions?.canManageComplianceLock === false) ||
          (viewer.role === "subadmin" && viewer.permissions?.canManageComplianceLock === false)
        ) {
          return fail(res, 403, "Your account does not have permission to restrict or unlock client compliance access");
        }
        targetUser.isComplianceRestricted = body.isComplianceRestricted;
        targetUser.complianceRestrictedAt = body.isComplianceRestricted ? new Date() : null;
        targetUser.complianceRestrictedBy = body.isComplianceRestricted ? viewer._id : null;
      }
      if (body.permissions && targetUser.role === "subadmin") {
        const canEdit =
          viewer.role === "superadmin" ||
          (viewer.role === "admin" && viewer.adminPermissions?.isEditSubManagementPermissions !== false);
        if (!canEdit) return fail(res, 403, "You do not have permission to edit Sub-Admin permissions");
        targetUser.permissions = {
          ...(targetUser.permissions?.toObject?.() || {}),
          ...body.permissions,
        };
        targetUser.markModified("permissions");
      }
      if (body.adminPermissions && targetUser.role === "admin") {
        if (viewer.role !== "superadmin") return fail(res, 403, "Only Superadmin can modify Admin permissions");
        targetUser.adminPermissions = {
          ...(targetUser.adminPermissions?.toObject?.() || {}),
          ...body.adminPermissions,
        };
        targetUser.markModified("adminPermissions");
      }
      if (body.smtpConfig) {
        if (viewer.role !== "superadmin" && !isSelf) {
          return fail(res, 403, "Only Superadmin can update another staff member's SMTP config");
        }
        const next = applySmtpConfig(targetUser, body.smtpConfig);
        if (targetUser.role === "superadmin") {
          const settings = await ensureSettings();
          const nextPort = Number(next.port || 465);
          settings.smtpConfig = {
            enabled: next.enabled !== false,
            host: String(next.host || process.env.EMAILHOST || "").trim(),
            port: nextPort,
            secure: nextPort === 465,
            user: String(next.user || "").trim(),
            pass: String(next.password || ""),
            fromEmail: String(next.fromEmail || next.user || "").trim(),
            fromName: String(next.fromName || process.env.WebName || "GOin SAS").trim(),
            adminAlertEmail: String(next.adminAlertEmail || "info@goin-in-vest.com").trim(),
          };
          settings.markModified("smtpConfig");
          await settings.save();
        }
      }
    } else if (body.savedSignature !== undefined) {
      targetUser.savedSignature = body.savedSignature;
    }
    await targetUser.save({ validateBeforeSave: false });
    const updated = await User.findById(targetUser._id)
      .populate("assignedSubAdmins", "firstName lastName email")
      .populate("assignedSubAdmin", "firstName lastName email");
    return res.json({
      success: true,
      msg: "Updated successfully",
      user: sanitizeUserForViewer(updated, viewer),
    });
  } catch (error) {
    console.error("PATCH portal user error:", error);
    return fail(res, 500, error?.message || "Failed to update user");
  }
};

exports.deletePortalUser = async (req, res) => {
  try {
    const viewer = req.user;
    if (!isStaffRole(viewer.role)) return fail(res, 403, "Unauthorized");
    const targetUser = await User.findById(req.params.id);
    if (!targetUser) return fail(res, 404, "Account not found");
    if (!canDeleteUser(viewer, targetUser)) {
      return fail(res, 403, "You do not have permission to delete this account");
    }
    if (targetUser.role === "subadmin") {
      await User.updateMany({ assignedSubAdmins: targetUser._id }, { $pull: { assignedSubAdmins: targetUser._id } });
      await User.updateMany({ assignedSubAdmin: targetUser._id }, { $set: { assignedSubAdmin: null } });
    }
    await SignDocument.deleteMany({ user: targetUser._id });
    await Notification.deleteMany({ userId: targetUser._id });
    await User.findByIdAndDelete(targetUser._id);
    return res.json({ success: true, msg: "Account deleted successfully" });
  } catch (error) {
    return fail(res, 500, error?.message || "Failed to delete account");
  }
};

exports.createPortalAccount = async (req, res) => {
  try {
    const currentUser = req.user;
    if (!isStaffRole(currentUser.role)) {
      return fail(res, 403, "Only staff can create accounts from the KYC portal");
    }
    const body = req.body || {};
    const firstName = String(body.firstName || "").trim();
    const lastName = String(body.lastName || "").trim();
    const email = String(body.email || "").toLowerCase().trim();
    const password = String(body.password || "");
    const address = String(body.address || "").trim();
    const city = String(body.city || "").trim();
    const country = String(body.country || "").trim();
    const postalCode = String(body.postalCode || "").trim();
    const note = String(body.note || "").trim();
    const phoneDigits = String(body.phone || "").replace(/\D/g, "");
    if (!firstName || !lastName || !email || !phoneDigits || !password || !address || !city || !country || !postalCode) {
      return fail(res, 400, "First name, last name, email, phone, password, address, city, country, and postal code are required");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return fail(res, 400, "Please enter a valid email address");
    }
    if (password.length < 8) {
      return fail(res, 400, "Password must be at least 8 characters");
    }
    const existing = await User.findOne({ email });
    if (existing) return fail(res, 400, "An account with this email already exists");

    let finalRole = "user";
    const requestedRole = body.role || "user";
    if (requestedRole === "user") {
      if (currentUser.role === "admin" && currentUser.adminPermissions?.canCreateUsers === false) {
        return fail(res, 403, "Your Admin account does not have permission to create new client accounts");
      }
      if (currentUser.role === "subadmin" && currentUser.permissions?.canCreateUsers === false) {
        return fail(res, 403, "Your Sub-Admin account does not have permission to create new client accounts");
      }
    } else if (requestedRole === "admin" || requestedRole === "superadmin") {
      if (currentUser.role !== "superadmin") {
        return fail(res, 403, "Only Superadmin can create Admin accounts");
      }
      finalRole = requestedRole === "superadmin" ? "superadmin" : "admin";
    } else if (requestedRole === "subadmin") {
      const canCreateSubAdmin =
        currentUser.role === "superadmin" ||
        (currentUser.role === "admin" && currentUser.adminPermissions?.isSubManagement !== false);
      if (!canCreateSubAdmin) {
        return fail(res, 403, "You do not have permission to create Sub-Admins");
      }
      finalRole = "subadmin";
    }

    const isStaffFinalRole = finalRole !== "user";
    const assignedSubAdmins = currentUser.role === "subadmin" && finalRole === "user" ? [currentUser._id] : [];
    const newUser = await User.create({
      firstName: firstName.slice(0, 30),
      lastName: lastName.slice(0, 30),
      email,
      phone: Number(phoneDigits),
      password,
      address,
      city,
      country,
      postalCode,
      note,
      role: finalRole,
      verified: isStaffFinalRole,
      kyc: isStaffFinalRole,
      assignedSubAdmin: assignedSubAdmins[0] || null,
      assignedSubAdmins,
    });

    return res.status(201).json({
      success: true,
      requiresVerification: false,
      msg: `${finalRole === "user" ? "Client" : finalRole.toUpperCase()} account created successfully`,
      user: sanitizeUserForViewer(newUser, currentUser),
    });
  } catch (error) {
    return fail(res, 500, error?.message || "Failed to register account");
  }
};

exports.assignUsers = async (req, res) => {
  try {
    const viewer = req.user;
    const { userId, email, subadminIds, subadminId, action = "set" } = req.body || {};
    if (viewer.role === "admin" && viewer.adminPermissions?.isAddUsersToSubAdmin === false) {
      return fail(res, 403, "You do not have permission to assign users to Sub-Admins");
    }
    if (viewer.role !== "superadmin" && viewer.role !== "admin" && viewer.role !== "subadmin") {
      return fail(res, 403, "Unauthorized");
    }
    const targetUser = userId
      ? await User.findById(userId)
      : email
        ? await User.findOne({ email: String(email).toLowerCase().trim() })
        : null;
    if (!targetUser || targetUser.role !== "user") return fail(res, 404, "Client user not found");
    let nextIds = getAssignedSubAdminIds(targetUser);
    if (viewer.role === "subadmin") {
      const selfId = String(viewer._id);
      if (action === "remove") nextIds = nextIds.filter((id) => id !== selfId);
      else if (!nextIds.includes(selfId)) nextIds.push(selfId);
    } else if (action === "set" && Array.isArray(subadminIds)) {
      nextIds = subadminIds.map(String);
    } else if (action === "add" && subadminId) {
      const targetSubId = String(subadminId);
      if (!nextIds.includes(targetSubId)) nextIds.push(targetSubId);
    } else if (action === "remove" && subadminId) {
      nextIds = nextIds.filter((id) => id !== String(subadminId));
    }
    syncAssignedSubAdmins(targetUser, nextIds);
    await targetUser.save({ validateBeforeSave: false });
    const populated = await User.findById(targetUser._id)
      .populate("assignedSubAdmins", "firstName lastName email")
      .populate("assignedSubAdmin", "firstName lastName email");
    return res.json({
      success: true,
      msg: "Sub-Admin assignment updated",
      user: sanitizeUserForViewer(populated, viewer),
    });
  } catch (error) {
    return fail(res, 500, error?.message || "Failed to update assignment");
  }
};

const AGREEMENT_MAX_EVIDENCE_BYTES = 8 * 1024 * 1024;
const AGREEMENT_ALLOWED_EXTENSIONS = new Set([
  "jpg",
  "jpeg",
  "png",
  "gif",
  "webp",
  "pdf",
  "doc",
  "docx",
  "txt",
  "eml",
  "msg",
]);

function readBodyField(body, key) {
  const val = body?.[key];
  if (Array.isArray(val)) return String(val[0] || "").trim();
  return typeof val === "string" ? val.trim() : "";
}

exports.submitAgreement = async (req, res) => {
  try {
    const body = req.body || {};
    const fullName = readBodyField(body, "full_name");
    const idPassport = readBodyField(body, "id_passport");
    const email = readBodyField(body, "email");
    const phone = readBodyField(body, "phone");
    const street = readBodyField(body, "street_address");
    const addressLine = readBodyField(body, "address_line");
    const city = readBodyField(body, "city");
    const state = readBodyField(body, "state");
    const postal = readBodyField(body, "postal");
    const country = readBodyField(body, "country");
    const companyName = readBodyField(body, "company_name");
    const platformDiscovery = readBodyField(body, "platform_discovery");
    const contactMethod = readBodyField(body, "contact_method");
    const lossDetails = readBodyField(body, "loss_details");
    const additionalLoss = readBodyField(body, "additional_loss_details");
    const reportedRaw = readBodyField(body, "reported_authorities");
    const reportedAuthorities =
      reportedRaw === "Yes" || reportedRaw === "No" ? reportedRaw : "Not specified";
    const agreeTerms = body.agree_terms;
    const signatureRaw = readBodyField(body, "signature");

    const rawHelpWith = []
      .concat(body["help_with[]"] || [])
      .concat(body.help_with || []);
    const helpWithEntries = rawHelpWith
      .filter((v) => typeof v === "string")
      .map((v) => v.trim())
      .filter(Boolean);

    if (
      !fullName ||
      !idPassport ||
      !email ||
      !phone ||
      !street ||
      !city ||
      !postal ||
      !country ||
      !agreeTerms
    ) {
      return res.status(400).json({
        success: false,
        message: "Please complete all required fields.",
      });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: "Please enter a valid email address.",
      });
    }

    if (helpWithEntries.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Please select at least one option under "I need help with".',
      });
    }

    const sigMatch = signatureRaw.match(/^data:image\/(png|jpe?g);base64,(.+)$/i);
    if (!sigMatch) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid signature.",
      });
    }

    const sigFormat = sigMatch[1].toLowerCase();
    const sigExt = sigFormat === "png" ? "png" : "jpg";
    const sigMime = sigExt === "png" ? "image/png" : "image/jpeg";
    const sigBuffer = Buffer.from(sigMatch[2], "base64");
    if (!sigBuffer || sigBuffer.length === 0) {
      return res.status(400).json({
        success: false,
        message: "Could not read signature data.",
      });
    }

    const attachments = [
      {
        filename: `signature.${sigExt}`,
        content: sigBuffer,
        contentType: sigMime,
      },
    ];

    const uploadedFiles = Array.isArray(req.files) ? req.files : [];
    for (const file of uploadedFiles) {
      if (!file || !file.originalname || !file.size) continue;
      if (file.size > AGREEMENT_MAX_EVIDENCE_BYTES) {
        return res.status(400).json({
          success: false,
          message: "Each evidence file must be 8 MB or smaller.",
        });
      }
      const ext = (file.originalname.split(".").pop() || "").toLowerCase();
      if (!ext || !AGREEMENT_ALLOWED_EXTENSIONS.has(ext)) {
        return res.status(400).json({
          success: false,
          message: `File type not allowed: ${file.originalname}`,
        });
      }
      const safeFilename =
        file.originalname.replace(/[^\w.\- ()]/g, "_") || `evidence.${ext}`;
      attachments.push({
        filename: safeFilename,
        content: file.buffer,
        contentType: file.mimetype || "application/octet-stream",
      });
    }

    const safeFullName = fullName.replace(/[\r\n]+/g, " ");
    const subject = `Client onboarding — ${safeFullName}`;
    const lines = [
      "New client onboarding / agreement submission",
      "============================================",
      "",
      `Full name: ${fullName}`,
      `ID / Passport: ${idPassport}`,
      `Email: ${email}`,
      `Phone: ${phone}`,
      "",
      "Address",
      "-------",
      `Street: ${street}`,
      `Address line 2: ${addressLine !== "" ? addressLine : "—"}`,
      `City: ${city}`,
      `State / Province / Region: ${state !== "" ? state : "—"}`,
      `Postal / ZIP: ${postal}`,
      `Country: ${country}`,
      "",
      "What they need help with",
      "------------------------",
      helpWithEntries.join(", "),
      "",
      "Company / platform name",
      "-----------------------",
      companyName !== "" ? companyName : "—",
      "",
      "How they came across the platform",
      "---------------------------------",
      platformDiscovery !== "" ? platformDiscovery : "—",
      "",
      "Main way of contact with the platform",
      "-------------------------------------",
      contactMethod !== "" ? contactMethod : "—",
      "",
      "Details of the loss (amounts, dates, currency)",
      "----------------------------------------------",
      lossDetails !== "" ? lossDetails : "—",
      "",
      "Additional loss details",
      "-----------------------",
      additionalLoss !== "" ? additionalLoss : "—",
      "",
      `Reported to authorities: ${reportedAuthorities}`,
      "",
      "Agreement checkbox: Confirmed",
      "",
      "(Signature image and any evidence files are attached to this email.)",
    ];

    const textBody = lines.join("\r\n");
    const smtpConfig = await getEffectiveSmtpConfig();
    const recipientEmail = smtpConfig.adminAlertEmail || "info@goin-in-vest.com";

    const sendResult = await sendEmail(
      recipientEmail,
      subject,
      textBody,
      null,
      smtpConfig,
      {
        replyTo: `"${safeFullName}" <${email}>`,
        attachments,
      }
    );

    if (!sendResult.success) {
      return res.status(500).json({
        success: false,
        message:
          "We could not send your submission right now. Please try again later or email us directly.",
      });
    }

    return res.json({
      success: true,
      message: "Your agreement was submitted. We will be in touch by email.",
    });
  } catch (error) {
    console.error("POST /kyc-portal/submit-agreement error:", error);
    return res.status(500).json({
      success: false,
      message:
        "We could not send your submission right now. Please try again later or email us directly.",
    });
  }
};
