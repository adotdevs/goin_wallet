import { useEffect } from "react";
import axiosService from "../../../Api/axiosService";
import { isBackendLocalhost, isElectronApp } from "../../../config/appConfig";

function credentialsConfig() {
  if (isElectronApp() || isBackendLocalhost()) {
    return { withCredentials: false };
  }
  return { withCredentials: true };
}

function portalPath(input) {
  const raw = String(input || "");
  const path = raw.startsWith("/api/") ? raw.slice(4) : raw.startsWith("/") ? raw : `/${raw}`;
  return `kyc-portal${path}`;
}

export async function kycFetch(input, init = {}) {
  const method = String(init.method || "GET").toUpperCase();
  const isForm = typeof FormData !== "undefined" && init.body instanceof FormData;
  let data;
  if (isForm) {
    data = init.body;
  } else if (typeof init.body === "string" && init.body.length) {
    try {
      data = JSON.parse(init.body);
    } catch (error) {
      data = init.body;
    }
  } else if (init.body) {
    data = init.body;
  }

  const response = await axiosService.request({
    url: portalPath(input),
    method,
    data,
    responseType: "arraybuffer",
    validateStatus: () => true,
    ...credentialsConfig(),
    headers: isForm ? undefined : method === "GET" || method === "DELETE" ? undefined : { "Content-Type": "application/json" },
  });

  const contentType = String(response.headers?.["content-type"] || "");
  const buffer = response.data;
  const bytes = buffer instanceof ArrayBuffer ? new Uint8Array(buffer) : new Uint8Array(buffer || []);

  if (contentType.includes("application/json") || contentType.includes("text/json")) {
    let json = {};
    try {
      json = JSON.parse(new TextDecoder().decode(bytes));
    } catch (error) {
      json = { success: false, msg: "Invalid server response" };
    }
    if (!json.msg && json.message) json.msg = json.message;
    return {
      ok: response.status < 400 && json.success !== false,
      status: response.status,
      json: async () => json,
      blob: async () => new Blob([bytes], { type: contentType }),
    };
  }

  const blob = new Blob([bytes], { type: contentType || "application/octet-stream" });
  return {
    ok: response.status < 400,
    status: response.status,
    json: async () => ({ success: response.status < 400 }),
    blob: async () => blob,
  };
}

export async function kycBlob(input) {
  const result = await kycFetch(input);
  return result.blob();
}

const blobCache = new Map();

export function useAuthenticatedPortalAssets(rootRef) {
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return undefined;
    let cancelled = false;

    const bindAnchor = (anchor) => {
      if (anchor.dataset.kycBound === "1") return;
      anchor.dataset.kycBound = "1";
      anchor.addEventListener(
        "click",
        async (event) => {
        const href = anchor.getAttribute("href") || "";
        if (!href.startsWith("/api/")) return;
        event.preventDefault();
        event.stopPropagation();
        const blob = await kycBlob(href);
        const url = URL.createObjectURL(blob);
        if (href.includes("inline=1") || anchor.getAttribute("target") === "_blank") {
          window.open(url, "_blank", "noopener");
          return;
        }
        const download = document.createElement("a");
        download.href = url;
        download.download = anchor.getAttribute("download") || "document";
        download.click();
      },
        true
      );
    };

    const hydrateMedia = async (node) => {
      const marker = node.getAttribute("data-kyc-src") || "";
      const rawSrc = node.getAttribute("src") || "";
      const source = marker || (rawSrc.startsWith("/api/") ? rawSrc : "");
      if (!source || node.dataset.kycHydrated === source) return;
      node.dataset.kycHydrated = source;
      try {
        const blob = await kycBlob(source);
        if (cancelled) return;
        const url = URL.createObjectURL(blob);
        blobCache.set(source, url);
        node.setAttribute("src", url);
      } catch (error) {
        node.dataset.kycHydrated = "";
      }
    };

    const scan = () => {
      root.querySelectorAll("[data-kyc-src], img[src^='/api/'], iframe[src^='/api/']").forEach((node) => {
        hydrateMedia(node);
      });
      root.querySelectorAll("a[href^='/api/']").forEach(bindAnchor);
    };

    scan();
    const observer = new MutationObserver(scan);
    observer.observe(root, {
      subtree: true,
      childList: true,
      attributes: true,
      attributeFilter: ["src", "href", "data-kyc-src"],
    });
    return () => {
      cancelled = true;
      observer.disconnect();
    };
  }, [rootRef]);
}
