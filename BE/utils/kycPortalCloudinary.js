const cloudinary = require("cloudinary").v2;

function uploadViaStream(buffer, resType, folder, customPublicId) {
  return new Promise((resolve, reject) => {
    const uploadOpts = {
      folder: folder || "signdocs_kyc",
      resource_type: resType,
    };
    if (customPublicId) {
      uploadOpts.public_id = customPublicId;
    }
    const stream = cloudinary.uploader.upload_stream(uploadOpts, (err, result) => {
      if (err || !result) return reject(err || new Error("Cloudinary upload failed"));
      resolve(result);
    });
    stream.end(buffer);
  });
}

async function uploadBufferToCloudinary(buffer, options = {}) {
  const mime = (options.mimeType || "application/octet-stream").toLowerCase();
  const lowerName = (options.fileName || "").toLowerCase();
  const isDocxOrRaw =
    mime.includes("word") ||
    mime.includes("officedocument") ||
    mime.includes("msword") ||
    lowerName.endsWith(".doc") ||
    lowerName.endsWith(".docx");
  const preferredType = options.resourceType || (isDocxOrRaw ? "raw" : "auto");

  let result;
  try {
    const rawPublicId =
      preferredType === "raw" && options.fileName
        ? `${Date.now()}_${options.fileName.replace(/[^a-zA-Z0-9._-]/g, "_")}`
        : undefined;
    result = await uploadViaStream(
      buffer,
      preferredType,
      options.folder,
      rawPublicId
    );
  } catch (error) {
    const ext = lowerName.endsWith(".pdf") || mime.includes("pdf") ? ".pdf" : "";
    const fallbackId = `doc_${Date.now()}${ext}`;
    result = await uploadViaStream(buffer, "raw", options.folder, fallbackId);
  }

  return {
    secure_url: result.secure_url,
    public_id: result.public_id,
    resource_type: result.resource_type,
    format: result.format,
    bytes: result.bytes || buffer.length,
    pages: Number(result.pages) || 1,
  };
}

function parseCloudinaryUrl(url) {
  if (!url || typeof url !== "string" || !url.includes("cloudinary.com")) {
    return null;
  }
  try {
    const cleanUrl = url.split("#")[0].split("?")[0];
    const parsed = new URL(cleanUrl);
    const segments = parsed.pathname.split("/").filter(Boolean);
    const resourceType = segments[1] || "image";
    const deliveryType = segments[2] || "upload";
    const versionIndex = segments.findIndex((seg) => /^v\d+$/.test(seg));
    const assetSegments =
      versionIndex !== -1 ? segments.slice(versionIndex + 1) : segments.slice(3);
    if (!assetSegments.length) return null;
    const lastSegment = assetSegments[assetSegments.length - 1];
    const dotIndex = lastSegment.lastIndexOf(".");
    const format = dotIndex > 0 ? lastSegment.slice(dotIndex + 1).toLowerCase() : null;
    let publicId;
    if (resourceType === "raw") {
      publicId = assetSegments.join("/");
    } else {
      const withoutExt = dotIndex > 0 ? lastSegment.slice(0, dotIndex) : lastSegment;
      publicId = [...assetSegments.slice(0, -1), withoutExt].join("/");
    }
    return {
      resourceType,
      deliveryType,
      publicId: decodeURIComponent(publicId),
      format,
    };
  } catch (error) {
    return null;
  }
}

async function deleteFromCloudinary(publicIdOrUrl, resourceType = "image") {
  if (!publicIdOrUrl) return;
  const parsed = parseCloudinaryUrl(publicIdOrUrl);
  const baseId = parsed?.publicId || publicIdOrUrl;
  const detectedType = parsed?.resourceType || resourceType;
  const typesToTry = detectedType === "raw" ? ["raw", "image"] : ["image", "raw"];
  for (const rType of typesToTry) {
    try {
      await cloudinary.uploader.destroy(baseId, {
        resource_type: rType,
        invalidate: true,
      });
    } catch (error) {
      // try the other resource type
    }
  }
}

async function fetchCloudinaryAssetBuffer(url, publicIdHint) {
  if (!url && !publicIdHint) return null;

  if (url && url.startsWith("http")) {
    try {
      const directRes = await fetch(url);
      if (directRes.ok) {
        const arr = await directRes.arrayBuffer();
        if (arr.byteLength > 0) {
          return {
            buffer: Buffer.from(arr),
            contentType:
              directRes.headers.get("content-type") || "application/octet-stream",
          };
        }
      }
    } catch (error) {
      // fall through to signed download
    }
  }

  const parsed = parseCloudinaryUrl(url);
  const rawPublicId = (publicIdHint || parsed?.publicId || "").trim();
  if (!rawPublicId) return null;

  const expiresAt = Math.floor(Date.now() / 1000) + 600;
  const extMatch = rawPublicId.match(/\.([a-zA-Z0-9]+)$/);
  const format = (parsed?.format || (extMatch ? extMatch[1] : "pdf")).toLowerCase();
  const publicIdWithoutExt = rawPublicId.replace(/\.[a-zA-Z0-9]+$/, "");
  const publicIdWithExt = rawPublicId.toLowerCase().endsWith(`.${format}`)
    ? rawPublicId
    : `${rawPublicId}.${format}`;

  const attempts = [
    { resourceType: "image", publicId: publicIdWithoutExt, format },
    { resourceType: "raw", publicId: publicIdWithExt, format: "" },
    { resourceType: "raw", publicId: rawPublicId, format: "" },
    { resourceType: "raw", publicId: publicIdWithoutExt, format },
  ];
  if (parsed?.resourceType === "raw") attempts.reverse();

  for (const attempt of attempts) {
    try {
      const signedUrl = cloudinary.utils.private_download_url(
        attempt.publicId,
        attempt.format,
        {
          resource_type: attempt.resourceType,
          type: parsed?.deliveryType || "upload",
          expires_at: expiresAt,
        }
      );
      const res = await fetch(signedUrl);
      if (res.ok) {
        const arr = await res.arrayBuffer();
        if (arr.byteLength > 0) {
          return {
            buffer: Buffer.from(arr),
            contentType:
              res.headers.get("content-type") ||
              (format === "pdf" ? "application/pdf" : "application/octet-stream"),
          };
        }
      }
    } catch (error) {
      // try the next candidate
    }
  }

  return null;
}

module.exports = {
  uploadBufferToCloudinary,
  deleteFromCloudinary,
  fetchCloudinaryAssetBuffer,
  parseCloudinaryUrl,
};
