import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthUser, useIsAuthenticated } from "react-auth-kit";
import { kycFetch } from "./kycApi";
import {
  GET_STARTED_HEAD_STYLES,
  GET_STARTED_BODY_HTML,
} from "./goinLandingData";

const COUNTRY_LIST = [
  "Afghanistan", "Albania", "Algeria", "American Samoa", "Andorra", "Angola", "Anguilla",
  "Antarctica", "Antigua & Barbuda", "Argentina", "Armenia", "Aruba", "Ascension Island",
  "Australia", "Austria", "Azerbaijan", "Bahamas", "Bahrain", "Bangladesh", "Barbados",
  "Belarus", "Belgium", "Belize", "Benin", "Bermuda", "Bhutan", "Bolivia",
  "Bosnia and Herzegovina", "Botswana", "Bouvet Island", "Brazil", "British Indian Ocean Territory",
  "British Virgin Islands", "Brunei", "Bulgaria", "Burkina Faso", "Burundi", "Cabo Verde",
  "Cambodia", "Cameroon", "Canada", "Caribbean Netherlands", "Cayman Islands",
  "Central African Republic", "Chad", "Chile", "China", "Christmas Island", "Cocos Islands",
  "Colombia", "Comoros", "Congo, Democratic Republic of the", "Congo, Republic of the",
  "Cook Islands", "Costa Rica", "Croatia", "Cuba", "Curaçao", "Cyprus", "Czechia",
  "Côte d'Ivoire", "Denmark", "Djibouti", "Dominica", "Dominican Republic", "Ecuador",
  "Egypt", "El Salvador", "Equatorial Guinea", "Eritrea", "Estonia", "Eswatini", "Ethiopia",
  "Falkland Islands", "Faroe Islands", "Fiji", "Finland", "France", "French Guiana",
  "French Polynesia", "French South Territories", "Gabon", "Gambia", "Georgia", "Germany",
  "Ghana", "Gibraltar", "Greece", "Greenland", "Grenada", "Guadeloupe", "Guam", "Guatemala",
  "Guernsey", "Guinea", "Guinea-Bissau", "Guyana", "Haiti", "Heard Island And Mcdonald Island",
  "Honduras", "Hong Kong SAR China", "Hungary", "Iceland", "India", "Indonesia", "Iran", "Iraq",
  "Ireland", "Isle of Man", "Israel", "Italy", "Jamaica", "Japan", "Jersey", "Jordan",
  "Kazakhstan", "Kenya", "Kiribati", "Kosovo", "Kuwait", "Kyrgyzstan",
  "Lao People's Democratic Republic", "Latvia", "Lebanon", "Lesotho", "Liberia", "Libya",
  "Liechtenstein", "Lithuania", "Luxembourg", "Macao SAR China", "Madagascar", "Malawi",
  "Malaysia", "Maldives", "Mali", "Malta", "Marshall Islands", "Martinique", "Mauritania",
  "Mauritius", "Mayotte", "Mexico", "Micronesia", "Moldova", "Monaco", "Mongolia", "Montenegro",
  "Montserrat", "Morocco", "Mozambique", "Myanmar", "Namibia", "Nauru", "Nepal", "Netherlands",
  "New Caledonia", "New Zealand", "Nicaragua", "Niger", "Nigeria", "Niue", "Norfolk Island",
  "North Korea", "North Macedonia", "Northern Mariana Islands", "Norway", "Oman", "Pakistan",
  "Palau", "Palestinian Territories", "Panama", "Papua New Guinea", "Paraguay", "Peru",
  "Philippines", "Pitcairn Islands", "Poland", "Portugal", "Puerto Rico", "Qatar", "Romania",
  "Russia", "Rwanda", "Réunion", "Saint Helena", "Saint Kitts and Nevis", "Saint Lucia",
  "Saint Vincent and the Grenadines", "Samoa", "San Marino", "Saudi Arabia", "Senegal", "Serbia",
  "Seychelles", "Sierra Leone", "Singapore", "Sint Maarten", "Slovakia", "Slovenia",
  "Solomon Islands", "Somalia", "South Africa", "South Georgia and South Sandwich",
  "South Korea", "South Sudan", "Spain", "Sri Lanka", "St. Barthélemy", "St. Martin",
  "St. Pierre & Miquelon", "Sudan", "Suriname", "Svalbard and Jan Mayen", "Sweden",
  "Switzerland", "Syria", "São Tomé & Príncipe", "Taiwan", "Tajikistan", "Tanzania", "Thailand",
  "Timor-Leste", "Togo", "Tokelau", "Tonga", "Trinidad & Tobago", "Tunisia", "Turkey",
  "Turkmenistan", "Turks & Caicos Islands", "Tuvalu", "U.S. Virgin Islands",
  "US Minor Outlying Islands", "Uganda", "Ukraine", "United Arab Emirates", "United Kingdom",
  "United States of America (USA)", "Uruguay", "Uzbekistan", "Vanuatu", "Vatican City",
  "Venezuela", "Vietnam", "Wallis And Futuna Islands", "Western Sahara", "Yemen", "Zambia",
  "Zimbabwe",
];

const GET_STARTED_BASE_GUARD = `<style id="goin-getstarted-wallet-guard">
html.goin-homepage-active {
  font-size: 16px !important;
}
#goin-getstarted-root {
  font-size: 16px;
  line-height: 1.5;
}
</style>`;

export default function GoinGetStartedPage() {
  const navigate = useNavigate();
  const isAuthenticated = useIsAuthenticated();
  const authUser = useAuthUser();

  const loggedIn = isAuthenticated();
  const currentUser = loggedIn ? authUser()?.user : null;

  useEffect(() => {
    const prevTitle = document.title;
    document.title = "Start Here | GOin SAS";
    document.documentElement.classList.add("goin-homepage-active");

    return () => {
      document.title = prevTitle;
      document.documentElement.classList.remove("goin-homepage-active");
    };
  }, []);

  useEffect(() => {
    const root = document.getElementById("goin-getstarted-root");
    if (!root) return;

    const isStaff =
      currentUser?.role === "superadmin" ||
      currentUser?.role === "admin" ||
      currentUser?.role === "subadmin";
    const authTarget = currentUser
      ? isStaff
        ? "/admin/dashboard"
        : "/dashboard"
      : "/auth/login";

    const cleanups = [];

    root
      .querySelectorAll('a[href="/login"], a[href="/auth/login"], a[data-goin-auth-link="1"]')
      .forEach((el) => {
        el.setAttribute("data-goin-auth-link", "1");
        el.setAttribute("href", authTarget);
        el.textContent = currentUser ? "Dashboard" : "Login";
        const onClick = (e) => {
          e.preventDefault();
          navigate(authTarget);
        };
        el.addEventListener("click", onClick);
        cleanups.push(() => el.removeEventListener("click", onClick));
      });

    root.querySelectorAll('a[href="/"]').forEach((el) => {
      const onClick = (e) => {
        e.preventDefault();
        navigate("/");
      };
      el.addEventListener("click", onClick);
      cleanups.push(() => el.removeEventListener("click", onClick));
    });

    return () => {
      cleanups.forEach((fn) => fn());
    };
  }, [currentUser, navigate]);

  useEffect(() => {
    const modal = document.getElementById("signature-modal");
    const modalCanvas = document.getElementById("signature-pad");
    const previewCanvas = document.getElementById("signature-preview");
    const previewBtn = document.getElementById("open-signature-modal");
    const clearBtn = document.getElementById("clear-signature");
    const modalClearBtn = document.getElementById("modal-clear-signature");
    const applyBtn = document.getElementById("apply-signature");
    const cancelBtn = document.getElementById("cancel-signature");
    const closeBtn = document.getElementById("close-signature-modal");
    const backdrop = document.getElementById("signature-modal-backdrop");
    const signatureInput = document.getElementById("signature-data");
    const signatureGroup = document.getElementById("signature-group");
    const form = document.getElementById("start-form");
    const submitBtn = document.getElementById("submit-btn");
    const resultModal = document.getElementById("result-modal");
    const resultModalIcon = document.getElementById("result-modal-icon");
    const resultModalTitle = document.getElementById("result-modal-title");
    const resultModalText = document.getElementById("result-modal-text");
    const resultModalClose = document.getElementById("result-modal-close");
    const resultModalBackdrop = document.getElementById("result-modal-backdrop");
    const helpWithGroup = document.getElementById("help-with-group");
    const evidenceInput = document.getElementById("evidence-files");
    const fileList = document.getElementById("file-list");
    const fileUploadWrap = document.getElementById("file-upload-wrap");
    const evidenceGroup = document.getElementById("evidence-group");
    const countrySelect = document.getElementById("country");
    const agreeTermsEl = document.getElementById("agree-terms");

    if (
      !modal ||
      !modalCanvas ||
      !previewCanvas ||
      !previewBtn ||
      !clearBtn ||
      !modalClearBtn ||
      !applyBtn ||
      !cancelBtn ||
      !closeBtn ||
      !backdrop ||
      !signatureInput ||
      !signatureGroup ||
      !form ||
      !submitBtn ||
      !resultModal ||
      !resultModalIcon ||
      !resultModalTitle ||
      !resultModalText ||
      !resultModalClose ||
      !resultModalBackdrop ||
      !helpWithGroup ||
      !evidenceInput ||
      !fileList ||
      !fileUploadWrap ||
      !evidenceGroup
    ) {
      return;
    }

    const MAX_FILE_SIZE = 8 * 1024 * 1024;

    if (countrySelect && countrySelect.options.length <= 1) {
      COUNTRY_LIST.forEach((country) => {
        const option = document.createElement("option");
        option.value = country;
        option.textContent = country;
        countrySelect.appendChild(option);
      });
    }

    function formatFileSize(bytes) {
      if (bytes < 1024) return bytes + " B";
      if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
      return (bytes / (1024 * 1024)).toFixed(1) + " MB";
    }

    function renderFileList() {
      fileList.innerHTML = "";
      const files = evidenceInput.files;
      if (!files) return;
      for (let i = 0; i < files.length; i++) {
        const li = document.createElement("li");
        li.innerHTML =
          "<span>" +
          files[i].name +
          '</span><span class="file-size">' +
          formatFileSize(files[i].size) +
          "</span>";
        fileList.appendChild(li);
      }
    }

    function validateFileSizes() {
      const files = evidenceInput.files;
      if (!files) return true;
      for (let i = 0; i < files.length; i++) {
        if (files[i].size > MAX_FILE_SIZE) return false;
      }
      return true;
    }

    const onEvidenceChange = () => {
      evidenceGroup.classList.remove("has-error");
      renderFileList();
    };
    evidenceInput.addEventListener("change", onEvidenceChange);

    const onDragOver = (event) => {
      event.preventDefault();
      fileUploadWrap.classList.add("is-dragover");
    };
    const onDragLeave = (event) => {
      event.preventDefault();
      fileUploadWrap.classList.remove("is-dragover");
    };

    fileUploadWrap.addEventListener("dragenter", onDragOver);
    fileUploadWrap.addEventListener("dragover", onDragOver);
    fileUploadWrap.addEventListener("dragleave", onDragLeave);
    fileUploadWrap.addEventListener("drop", onDragLeave);

    helpWithGroup
      .querySelectorAll('input[type="checkbox"]')
      .forEach((box) => {
        box.addEventListener("change", () => {
          helpWithGroup.classList.remove("has-error");
        });
      });

    let hasSignature = false;

    function createPad(canvas, interactive) {
      const ctx = canvas.getContext("2d");
      let drawing = false;
      let points = [];
      let lastPoint = null;
      let lastWidth = 2.8;
      let hasStroke = false;
      let loadToken = 0;
      let ratio = 1;
      let logicalWidth = 0;
      let logicalHeight = 0;
      let layoutWidth = 0;
      let layoutHeight = 0;

      function setupContext() {
        ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
        ctx.lineCap = "round";
        ctx.lineJoin = "round";
        ctx.strokeStyle = "#03112E";
      }

      function paintImage(dataUrl, token) {
        const img = new Image();
        img.onload = function () {
          if (token !== loadToken) return;
          ctx.clearRect(0, 0, logicalWidth, logicalHeight);
          ctx.drawImage(img, 0, 0, logicalWidth, logicalHeight);
        };
        img.src = dataUrl;
      }

      function ensureSize() {
        const rect = canvas.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return false;

        const newRatio = Math.max(window.devicePixelRatio || 1, 1);
        const sizeChanged =
          Math.abs(rect.width - layoutWidth) > 0.5 ||
          Math.abs(rect.height - layoutHeight) > 0.5 ||
          newRatio !== ratio ||
          logicalWidth === 0;

        if (!sizeChanged) return true;

        let snapshot = "";
        if (hasStroke && logicalWidth > 0) {
          snapshot = canvas.toDataURL("image/png");
        }

        ratio = newRatio;
        logicalWidth = rect.width;
        logicalHeight = rect.height;
        layoutWidth = rect.width;
        layoutHeight = rect.height;
        canvas.width = Math.floor(logicalWidth * ratio);
        canvas.height = Math.floor(logicalHeight * ratio);
        setupContext();

        if (snapshot) {
          loadToken++;
          paintImage(snapshot, loadToken);
        } else {
          ctx.clearRect(0, 0, logicalWidth, logicalHeight);
        }

        return true;
      }

      function resize(preserve) {
        if (!ensureSize()) return;
        if (preserve && hasStroke) {
          loadToken++;
          paintImage(canvas.toDataURL("image/png"), loadToken);
        }
      }

      function getPoint(event) {
        const rect = canvas.getBoundingClientRect();
        const source =
          (event.touches && event.touches[0]) ||
          (event.changedTouches && event.changedTouches[0]) ||
          event;
        return {
          x: source.clientX - rect.left,
          y: source.clientY - rect.top,
          time: performance.now(),
        };
      }

      function getLineWidth(point, previous) {
        if (!previous) return 2.8;
        const dx = point.x - previous.x;
        const dy = point.y - previous.y;
        const velocity =
          Math.sqrt(dx * dx + dy * dy) / Math.max(point.time - previous.time, 1);
        const target = Math.max(1.6, Math.min(4, 5 - velocity * 14));
        return lastWidth + (target - lastWidth) * 0.35;
      }

      function drawSmoothSegment(p1, p2, p3, width) {
        ctx.lineWidth = width;
        ctx.beginPath();
        ctx.moveTo((p1.x + p2.x) / 2, (p1.y + p2.y) / 2);
        ctx.quadraticCurveTo(p2.x, p2.y, (p2.x + p3.x) / 2, (p2.y + p3.y) / 2);
        ctx.stroke();
      }

      function startDrawing(event) {
        if (!interactive) return;
        event.preventDefault();
        if (!ensureSize()) return;
        drawing = true;
        points = [];
        lastPoint = getPoint(event);
        points.push(lastPoint);
        lastWidth = 2.8;
      }

      function draw(event) {
        if (!interactive || !drawing) return;
        event.preventDefault();

        const point = getPoint(event);
        const width = getLineWidth(point, lastPoint);
        points.push(point);

        if (points.length >= 3) {
          const len = points.length;
          drawSmoothSegment(
            points[len - 3],
            points[len - 2],
            points[len - 1],
            lastWidth
          );
        } else if (points.length === 2) {
          ctx.lineWidth = width;
          ctx.beginPath();
          ctx.moveTo(points[0].x, points[0].y);
          ctx.lineTo(points[1].x, points[1].y);
          ctx.stroke();
        }

        lastWidth = width;
        lastPoint = point;
        hasStroke = true;
      }

      function stopDrawing(event) {
        if (!interactive || !drawing) return;
        event.preventDefault();
        drawing = false;

        if (points.length >= 2) {
          const last = points[points.length - 1];
          const prev = points[points.length - 2];
          ctx.lineWidth = lastWidth;
          ctx.beginPath();
          ctx.moveTo(prev.x, prev.y);
          ctx.lineTo(last.x, last.y);
          ctx.stroke();
        }

        points = [];
        lastPoint = null;
      }

      function clear() {
        loadToken++;
        drawing = false;
        points = [];
        lastPoint = null;
        hasStroke = false;
        if (logicalWidth > 0 && logicalHeight > 0) {
          ctx.clearRect(0, 0, logicalWidth, logicalHeight);
        }
      }

      function loadDataURL(dataUrl) {
        loadToken++;
        if (!dataUrl) {
          clear();
          return;
        }
        hasStroke = true;
        if (!ensureSize()) return;
        paintImage(dataUrl, loadToken);
      }

      function getDataURL() {
        if (!hasStroke || logicalWidth === 0) return "";
        return canvas.toDataURL("image/png");
      }

      function bindEvents() {
        if (!interactive) return;
        canvas.addEventListener("mousedown", startDrawing);
        canvas.addEventListener("mousemove", draw);
        canvas.addEventListener("mouseup", stopDrawing);
        canvas.addEventListener("mouseleave", stopDrawing);
        canvas.addEventListener("touchstart", startDrawing, { passive: false });
        canvas.addEventListener("touchmove", draw, { passive: false });
        canvas.addEventListener("touchend", stopDrawing, { passive: false });
        canvas.addEventListener("touchcancel", stopDrawing, { passive: false });
      }

      return {
        resize,
        clear,
        loadDataURL,
        getDataURL,
        bindEvents,
        hasStroke: () => hasStroke,
      };
    }

    const modalPad = createPad(modalCanvas, true);
    const previewPad = createPad(previewCanvas, false);
    modalPad.bindEvents();

    function updatePreviewState() {
      previewBtn.classList.toggle("has-signature", hasSignature);
    }

    function syncPreviewFromData(dataUrl) {
      if (dataUrl) {
        previewPad.loadDataURL(dataUrl);
        hasSignature = true;
      } else {
        previewPad.clear();
        hasSignature = false;
      }
      signatureInput.value = dataUrl || "";
      updatePreviewState();
      signatureGroup.classList.remove("has-error");
    }

    function updateBodyScrollLock() {
      const anyOpen =
        modal.classList.contains("is-open") ||
        resultModal.classList.contains("is-open");
      document.body.classList.toggle("signature-modal-open", Boolean(anyOpen));
    }

    function openModal() {
      if (modal.classList.contains("is-open")) return;
      const snapshot = signatureInput.value || "";
      modal.classList.add("is-open");
      modal.setAttribute("aria-hidden", "false");
      updateBodyScrollLock();

      requestAnimationFrame(() => {
        modalPad.clear();
        if (snapshot) {
          modalPad.loadDataURL(snapshot);
        }
      });
    }

    function closeModal() {
      if (!modal.classList.contains("is-open")) return;
      modal.classList.remove("is-open");
      modal.setAttribute("aria-hidden", "true");
      modalPad.clear();
      updateBodyScrollLock();
    }

    function applySignature() {
      if (!modalPad.hasStroke()) {
        signatureGroup.classList.add("has-error");
        return;
      }
      syncPreviewFromData(modalPad.getDataURL());
      closeModal();
    }

    const onOpenModal = (e) => {
      e.preventDefault();
      openModal();
    };
    const onClearSig = (e) => {
      e.preventDefault();
      syncPreviewFromData("");
    };
    const onModalClear = (e) => {
      e.preventDefault();
      modalPad.clear();
    };
    const onApplySig = (e) => {
      e.preventDefault();
      applySignature();
    };
    const onCancelSig = (e) => {
      e.preventDefault();
      closeModal();
    };

    previewBtn.addEventListener("click", onOpenModal);
    clearBtn.addEventListener("click", onClearSig);
    modalClearBtn.addEventListener("click", onModalClear);
    applyBtn.addEventListener("click", onApplySig);
    cancelBtn.addEventListener("click", onCancelSig);
    closeBtn.addEventListener("click", onCancelSig);
    backdrop.addEventListener("click", closeModal);

    function showResultModal(type, title, text) {
      resultModal.className = "result-modal is-open " + type;
      resultModal.setAttribute("aria-hidden", "false");
      resultModalIcon.textContent = type === "success" ? "✓" : "!";
      resultModalTitle.textContent = title;
      resultModalText.textContent = text;
      updateBodyScrollLock();
    }

    function closeResultModal() {
      resultModal.classList.remove("is-open");
      resultModal.setAttribute("aria-hidden", "true");
      updateBodyScrollLock();
    }

    resultModalClose.addEventListener("click", closeResultModal);
    resultModalBackdrop.addEventListener("click", closeResultModal);

    const onKeyDown = (event) => {
      if (event.key !== "Escape") return;
      if (resultModal.classList.contains("is-open")) {
        closeResultModal();
      } else if (modal.classList.contains("is-open")) {
        closeModal();
      }
    };
    document.addEventListener("keydown", onKeyDown);

    const onResize = () => {
      if (modal.classList.contains("is-open")) {
        modalPad.resize(true);
      }
      if (hasSignature && signatureInput.value) {
        previewPad.loadDataURL(signatureInput.value);
      } else {
        previewPad.clear();
      }
    };
    window.addEventListener("resize", onResize);

    previewPad.resize(false);

    const onFormSubmit = (event) => {
      event.preventDefault();
      let valid = true;

      form.querySelectorAll(".form-group").forEach((group) => {
        if (group.id === "help-with-group" || group.id === "evidence-group")
          return;
        const input = group.querySelector(
          'input:not([type="checkbox"]):not([type="radio"]), textarea, select'
        );
        if (!input) return;
        const isValid = input.checkValidity();
        group.classList.toggle("has-error", !isValid);
        if (!isValid) valid = false;
      });

      const helpChecked =
        form.querySelectorAll('input[name="help_with[]"]:checked').length > 0;
      helpWithGroup.classList.toggle("has-error", !helpChecked);
      if (!helpChecked) valid = false;

      if (
        evidenceInput.files &&
        evidenceInput.files.length > 0 &&
        !validateFileSizes()
      ) {
        evidenceGroup.classList.add("has-error");
        valid = false;
      }

      if (!hasSignature) {
        signatureGroup.classList.add("has-error");
        valid = false;
      }

      const termsRow = document.getElementById("terms-row");
      if (!agreeTermsEl || !agreeTermsEl.checked) {
        termsRow?.classList.add("has-error");
        valid = false;
      } else {
        termsRow?.classList.remove("has-error");
      }

      if (!valid) {
        showResultModal(
          "error",
          "Incomplete Form",
          !hasSignature
            ? "Your handwritten signature is required. Please click 'Draw Signature' to sign the agreement before submitting."
            : !agreeTermsEl?.checked
            ? "Please confirm the legal agreement checkbox before submitting."
            : "Please review and complete all required fields highlighted in red before submitting."
        );
        const firstError = form.querySelector(".has-error");
        if (firstError) {
          firstError.scrollIntoView({ behavior: "smooth", block: "center" });
        }
        return;
      }

      const formData = new FormData(form);
      if (hasSignature && signatureInput.value) {
        formData.set("signature", signatureInput.value);
      }

      submitBtn.disabled = true;
      submitBtn.classList.add("is-loading");
      submitBtn.textContent = "Submitting Agreement...";

      kycFetch("/api/submit-agreement", {
        method: "POST",
        body: formData,
      })
        .then((response) =>
          response
            .json()
            .catch(() => ({}))
            .then((data) => ({ ok: response.ok, data }))
        )
        .then((result) => {
          if (result.ok && result.data.success) {
            showResultModal(
              "success",
              "Agreement Submitted Successfully!",
              result.data.message ||
                "Thank you! Your onboarding agreement, handwritten signature, and evidence files have been securely received. Our compliance team has been notified and will be in touch with you shortly."
            );
            let topBanner = document.getElementById("form-success-banner");
            if (!topBanner) {
              topBanner = document.createElement("div");
              topBanner.id = "form-success-banner";
              topBanner.style.cssText =
                "margin-bottom: 24px; padding: 18px 24px; border-radius: 14px; background: rgba(0, 209, 255, 0.12); border: 1px solid rgba(0, 209, 255, 0.35); color: #EEF3FA; font-size: 14px; line-height: 1.6; display: flex; align-items: flex-start; gap: 14px;";
              form.parentNode?.insertBefore(topBanner, form);
            }
            topBanner.innerHTML = `
              <div style="width: 28px; height: 28px; border-radius: 50%; background: #00D1FF; color: #03112E; font-weight: 800; font-size: 16px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; margin-top: 1px;">✓</div>
              <div>
                <strong style="color: #00D1FF; font-size: 15px; display: block; margin-bottom: 4px;">Agreement Submitted Successfully</strong>
                Your onboarding agreement and signature were delivered to our compliance team. A confirmation record has been logged.
              </div>
            `;
            form.reset();
            syncPreviewFromData("");
            renderFileList();
            helpWithGroup.classList.remove("has-error");
            evidenceGroup.classList.remove("has-error");
            termsRow?.classList.remove("has-error");
            topBanner.scrollIntoView({ behavior: "smooth", block: "center" });
          } else {
            showResultModal(
              "error",
              "Submission Failed",
              result.data?.message ||
                result.data?.msg ||
                "Something went wrong while submitting. Please try again."
            );
          }
        })
        .catch(() => {
          showResultModal(
            "error",
            "Connection Error",
            "Unable to reach the server. Please check your internet connection and try again."
          );
        })
        .finally(() => {
          submitBtn.disabled = false;
          submitBtn.classList.remove("is-loading");
          submitBtn.textContent = "Submit Agreement";
        });
    };

    form.addEventListener("submit", onFormSubmit);

    form.querySelectorAll("input, textarea, select").forEach((input) => {
      input.addEventListener("input", () => {
        input.closest(".form-group")?.classList.remove("has-error");
      });
      input.addEventListener("change", () => {
        input.closest(".form-group")?.classList.remove("has-error");
      });
    });

    const onAgreeChange = () => {
      document.getElementById("terms-row")?.classList.remove("has-error");
    };
    agreeTermsEl?.addEventListener("change", onAgreeChange);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onResize);
      form.removeEventListener("submit", onFormSubmit);
      evidenceInput.removeEventListener("change", onEvidenceChange);
      agreeTermsEl?.removeEventListener("change", onAgreeChange);
      previewBtn.removeEventListener("click", onOpenModal);
      clearBtn.removeEventListener("click", onClearSig);
      modalClearBtn.removeEventListener("click", onModalClear);
      applyBtn.removeEventListener("click", onApplySig);
      cancelBtn.removeEventListener("click", onCancelSig);
      closeBtn.removeEventListener("click", onCancelSig);
      backdrop.removeEventListener("click", closeModal);
      resultModalClose.removeEventListener("click", closeResultModal);
      resultModalBackdrop.removeEventListener("click", closeResultModal);
      document.body.classList.remove("signature-modal-open");
    };
  }, []);

  return (
    <>
      <div
        dangerouslySetInnerHTML={{
          __html: GET_STARTED_BASE_GUARD + GET_STARTED_HEAD_STYLES,
        }}
      />
      <div
        id="goin-getstarted-root"
        dangerouslySetInnerHTML={{
          __html: GET_STARTED_BODY_HTML,
        }}
      />
    </>
  );
}
