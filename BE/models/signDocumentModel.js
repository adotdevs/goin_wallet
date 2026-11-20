const mongoose = require("mongoose");

const DocumentSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: false,
      default: null,
      index: true,
    },
    isGlobal: {
      type: Boolean,
      default: false,
      index: true,
    },
    globalParentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "SignDocument",
      default: null,
      index: true,
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      default: null,
    },
    uploadedByName: {
      type: String,
      default: "Compliance Team",
    },
    uploadedByRole: {
      type: String,
      default: "admin",
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    fileName: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
      trim: true,
    },
    folder: {
      type: String,
      enum: ["Contracts", "Agreements", "NDAs", "KYC & Compliance", "Other"],
      default: "Agreements",
    },
    fileType: {
      type: String,
      enum: ["pdf", "doc", "image"],
      default: "pdf",
    },
    mimeType: {
      type: String,
      default: "application/pdf",
    },
    fileSize: {
      type: Number,
      default: 0,
    },
    fileUrl: {
      type: String,
      required: true,
    },
    publicId: {
      type: String,
      default: "",
    },
    pageCount: {
      type: Number,
      default: 3,
    },
    requiresSignature: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ["pending_signature", "signed", "completed"],
      default: "pending_signature",
    },
    isStarred: {
      type: Boolean,
      default: false,
    },
    isTemplate: {
      type: Boolean,
      default: false,
    },
    documentContentPreview: {
      type: String,
      default: "",
    },
    signature: {
      signatureDataUrl: { type: String },
      signatureMode: { type: String, enum: ["draw", "type"], default: "draw" },
      typedText: { type: String },
      fontFamily: { type: String },
      signerName: { type: String },
      signerEmail: { type: String },
      signerTitle: { type: String },
      signedAt: { type: Date },
      ipAddress: { type: String },
      userAgent: { type: String },
      certificateId: { type: String },
      pageNumber: { type: Number, default: 1 },
      positionX: { type: Number, default: 65 },
      positionY: { type: Number, default: 78 },
      signedFileUrl: { type: String, default: null },
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("SignDocument", DocumentSchema);
