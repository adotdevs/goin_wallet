const mongoose = require("mongoose");

function isStaffRole(role) {
  return role === "superadmin" || role === "admin" || role === "subadmin";
}

function isValidObjectId(id) {
  if (!id || typeof id !== "string") return false;
  return mongoose.Types.ObjectId.isValid(id);
}

function escapeRegex(input) {
  return String(input || "").replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeIdString(value) {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object" && value._id) return String(value._id);
  return String(value);
}

function getAssignedSubAdminIds(userDoc) {
  if (!userDoc) return [];
  const ids = [];
  const seen = new Set();

  if (Array.isArray(userDoc.assignedSubAdmins)) {
    for (const item of userDoc.assignedSubAdmins) {
      const id = normalizeIdString(item);
      if (id && !seen.has(id)) {
        seen.add(id);
        ids.push(id);
      }
    }
  }

  const legacyId = normalizeIdString(userDoc.assignedSubAdmin);
  if (legacyId && !seen.has(legacyId)) {
    seen.add(legacyId);
    ids.push(legacyId);
  }

  return ids;
}

function syncAssignedSubAdmins(userDoc, nextIds) {
  const uniqueIds = [];
  const seen = new Set();

  for (const rawId of nextIds || []) {
    const id = normalizeIdString(rawId);
    if (!id || !isValidObjectId(id) || seen.has(id)) continue;
    seen.add(id);
    uniqueIds.push(id);
  }

  userDoc.assignedSubAdmins = uniqueIds.map(
    (id) => new mongoose.Types.ObjectId(id)
  );
  userDoc.assignedSubAdmin = uniqueIds[0]
    ? new mongoose.Types.ObjectId(uniqueIds[0])
    : null;
  return uniqueIds;
}

function hasSubAdminAccessToUser(subadminId, userDoc) {
  if (!subadminId || !userDoc) return false;
  if (userDoc.role && userDoc.role !== "user") return false;
  if (userDoc.isShared === true) return true;
  const targetId = normalizeIdString(subadminId);
  if (!targetId) return false;
  return getAssignedSubAdminIds(userDoc).includes(targetId);
}

function subadminAccessibleUsersQuery(subadminId) {
  const objId = new mongoose.Types.ObjectId(String(subadminId));
  return {
    role: "user",
    $or: [
      { assignedSubAdmins: objId },
      { assignedSubAdmin: objId },
      { isShared: true },
    ],
  };
}

function canStaffAccessUser(staff, targetUser) {
  if (!staff || !targetUser) return false;
  if (String(staff._id) === String(targetUser._id)) return true;
  if (staff.role === "superadmin") return true;
  if (staff.role === "admin") {
    return targetUser.role === "user" || targetUser.role === "subadmin";
  }
  if (staff.role === "subadmin") {
    return (
      targetUser.role === "user" && hasSubAdminAccessToUser(staff._id, targetUser)
    );
  }
  return false;
}

function smtpPassForViewer(smtpConfig, viewer, targetId) {
  if (!smtpConfig) return undefined;
  const plain =
    smtpConfig.toObject?.() ||
    (typeof smtpConfig === "object" ? { ...smtpConfig } : {});
  const secret = plain.password || plain.pass || "";
  const isSelf = viewer && targetId && String(viewer._id) === String(targetId);
  const canSeeSecret = viewer?.role === "superadmin" || isSelf;
  return {
    enabled: plain.enabled !== false,
    host: plain.host || "",
    port: plain.port || 465,
    secure: plain.secure !== false,
    user: plain.user || "",
    pass: canSeeSecret ? secret : secret ? "••••••••" : "",
    fromEmail: plain.fromEmail || "",
    fromName: plain.fromName || "",
    adminAlertEmail: plain.adminAlertEmail || "",
  };
}

function sanitizeUserForViewer(targetUser, viewer) {
  if (!targetUser) return null;
  const obj =
    typeof targetUser.toObject === "function"
      ? targetUser.toObject()
      : { ...targetUser };

  delete obj.password;
  delete obj.resetPasswordToken;
  delete obj.resetPasswordExpire;
  delete obj.__v;

  if (obj.smtpConfig) {
    obj.smtpConfig = smtpPassForViewer(obj.smtpConfig, viewer, obj._id);
  }

  if (
    viewer?.role === "subadmin" &&
    viewer.permissions?.viewClientDetails === false &&
    obj.role === "user" &&
    String(viewer._id) !== String(obj._id)
  ) {
    obj.email = "hidden@privacy.protected";
    obj.phone = "••••••••••";
    obj.address = "Hidden by administrator policy";
    obj.city = "Hidden";
    obj.postalCode = "•••••";
  }

  return obj;
}

function portalBaseUrl() {
  return process.env.BASE_URL || "http://localhost:3000";
}

module.exports = {
  isStaffRole,
  isValidObjectId,
  escapeRegex,
  normalizeIdString,
  getAssignedSubAdminIds,
  syncAssignedSubAdmins,
  hasSubAdminAccessToUser,
  subadminAccessibleUsersQuery,
  canStaffAccessUser,
  sanitizeUserForViewer,
  portalBaseUrl,
};
