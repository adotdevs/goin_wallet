import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useAuthUser, useIsAuthenticated } from "react-auth-kit";
import { INDEX_HEAD_STYLES, INDEX_BODY_HTML } from "./goinLandingData";
import {
  SUPPORTED_LANGUAGES,
  HOME_META,
  translateHomeString,
} from "./goinHomeTranslations";

const LANG_STORAGE_KEY = "goin_home_lang";

const getInitialLanguage = () => {
  if (typeof window === "undefined") return "fr";
  const saved = window.localStorage.getItem(LANG_STORAGE_KEY);
  return saved && HOME_META[saved] ? saved : "fr";
};

const HOMEPAGE_BASE_GUARD = `<style id="goin-homepage-wallet-guard">
html.goin-homepage-active {
  font-size: 16px !important;
}
#goin-homepage-root {
  font-size: 16px;
  line-height: 1.5;
}
#goin-homepage-root .goin-lang-dropdown {
  position: relative;
  display: inline-flex;
  align-items: center;
}
#goin-homepage-root .goin-lang-trigger {
  appearance: none;
  -webkit-appearance: none;
  box-sizing: border-box;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: 42px;
  padding: 0 14px;
  margin: 0;
  border-radius: 10px;
  border: 1px solid #2A4366;
  background-color: rgba(12, 26, 46, 0.92);
  color: #E6EDF7;
  font-family: Manrope, system-ui, sans-serif;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.03em;
  line-height: 1;
  cursor: pointer;
  transition: border-color 0.18s ease, background-color 0.18s ease, box-shadow 0.18s ease;
}
#goin-homepage-root .goin-lang-trigger:hover,
#goin-homepage-root .goin-lang-trigger[aria-expanded="true"] {
  border-color: #5B9BFF;
  background-color: rgba(18, 39, 68, 0.98);
  box-shadow: 0 0 0 3px rgba(91, 155, 255, 0.16);
}
#goin-homepage-root .goin-lang-chevron {
  transition: transform 0.2s ease;
  color: #8FB6F2;
}
#goin-homepage-root .goin-lang-trigger[aria-expanded="true"] .goin-lang-chevron {
  transform: rotate(180deg);
}
#goin-homepage-root .goin-lang-menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  min-width: 176px;
  padding: 6px;
  border-radius: 12px;
  border: 1px solid #2A4366;
  background-color: rgba(11, 25, 43, 0.98);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  box-shadow: 0 18px 44px rgba(0, 0, 0, 0.48), 0 1px 0 rgba(255, 255, 255, 0.05) inset;
  z-index: 120;
  display: flex;
  flex-direction: column;
  gap: 3px;
  animation: goin-lang-drop 0.16s ease-out;
}
@keyframes goin-lang-drop {
  from { opacity: 0; transform: translateY(-6px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
#goin-homepage-root .goin-lang-option {
  appearance: none;
  -webkit-appearance: none;
  box-sizing: border-box;
  border: 0;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 9px 11px;
  margin: 0;
  border-radius: 8px;
  background-color: transparent;
  color: #CBD6E6;
  font-family: Manrope, system-ui, sans-serif;
  font-size: 13px;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
  transition: background-color 0.15s ease, color 0.15s ease;
}
#goin-homepage-root .goin-lang-option:hover {
  background-color: rgba(91, 155, 255, 0.14);
  color: #F5F8FD;
}
#goin-homepage-root .goin-lang-option.is-active {
  background-color: rgba(91, 155, 255, 0.2);
  color: #F5F8FD;
}
#goin-homepage-root .goin-lang-option-left {
  display: inline-flex;
  align-items: center;
  gap: 9px;
}
#goin-homepage-root .goin-lang-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 26px;
  height: 20px;
  padding: 0 5px;
  border-radius: 5px;
  background-color: rgba(143, 182, 242, 0.12);
  border: 1px solid rgba(143, 182, 242, 0.24);
  color: #9CCBFA;
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
}
#goin-homepage-root .goin-lang-option.is-active .goin-lang-badge {
  background-color: #5B9BFF;
  border-color: #5B9BFF;
  color: #061426;
}
@media (max-width: 720px) {
  #goin-homepage-root .goin-lang-menu {
    right: 0;
    left: auto;
  }
}
</style>`;

const HOMEPAGE_HEAD_HTML = { __html: HOMEPAGE_BASE_GUARD + INDEX_HEAD_STYLES };
const HOMEPAGE_BODY_HTML = { __html: INDEX_BODY_HTML };

export default function GoinHomePage() {
  const navigate = useNavigate();
  const isAuthenticated = useIsAuthenticated();
  const authUser = useAuthUser();

  const [lang, setLang] = useState(getInitialLanguage);
  const [langSlot, setLangSlot] = useState(null);
  const [langMenuOpen, setLangMenuOpen] = useState(false);
  const langDropdownRef = useRef(null);
  const originalTextMapRef = useRef(new WeakMap());
  const originalAriaMapRef = useRef(new WeakMap());

  const loggedIn = isAuthenticated();
  const currentUser = loggedIn ? authUser()?.user : null;

  const handleSelectLanguage = (nextLang) => {
    if (!HOME_META[nextLang]) return;
    setLang(nextLang);
    setLangMenuOpen(false);
    try {
      window.localStorage.setItem(LANG_STORAGE_KEY, nextLang);
    } catch {
      // ignore storage errors
    }
  };

  useEffect(() => {
    if (!langMenuOpen) return undefined;
    const handlePointerDown = (event) => {
      if (langDropdownRef.current && !langDropdownRef.current.contains(event.target)) {
        setLangMenuOpen(false);
      }
    };
    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        setLangMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [langMenuOpen]);

  useEffect(() => {
    const prevTitle = document.title;
    const prevLang = document.documentElement.lang;
    document.documentElement.classList.add("goin-homepage-active");

    return () => {
      document.title = prevTitle;
      document.documentElement.lang = prevLang;
      document.documentElement.classList.remove("goin-homepage-active");
    };
  }, []);

  useEffect(() => {
    const meta = HOME_META[lang] || HOME_META.en;
    document.title = meta.title;
    document.documentElement.lang = lang;
  }, [lang]);

  // Create a stable mount slot inside the homepage navbar for the language switcher
  useEffect(() => {
    const root = document.getElementById("goin-homepage-root");
    if (!root) return;

    const actionsContainer = root.querySelector("header nav > div:last-child");
    if (!actionsContainer) return;

    actionsContainer.style.alignItems = "center";

    let slot = actionsContainer.querySelector("[data-goin-lang-slot='1']");
    if (!slot) {
      slot = document.createElement("div");
      slot.setAttribute("data-goin-lang-slot", "1");
      slot.style.display = "inline-flex";
      slot.style.alignItems = "center";
      actionsContainer.appendChild(slot);
    }
    setLangSlot(slot);

    return () => {
      if (slot && slot.parentNode) {
        slot.parentNode.removeChild(slot);
      }
      setLangSlot(null);
    };
  }, []);

  // Apply homepage-only translations to all visible text nodes and aria-labels
  useEffect(() => {
    const root = document.getElementById("goin-homepage-root");
    if (!root) return;

    const textMap = originalTextMapRef.current;
    const ariaMap = originalAriaMapRef.current;

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        if (
          parent.closest("style, script, svg, [data-goin-lang-slot='1'], [data-goin-auth-link='1']")
        ) {
          return NodeFilter.FILTER_REJECT;
        }
        if (!node.nodeValue || !node.nodeValue.trim()) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      },
    });

    const textNodes = [];
    let current = walker.nextNode();
    while (current) {
      textNodes.push(current);
      current = walker.nextNode();
    }

    textNodes.forEach((node) => {
      if (!textMap.has(node)) {
        textMap.set(node, node.nodeValue);
      }
      const original = textMap.get(node);
      node.nodeValue = translateHomeString(original, lang);
    });

    root.querySelectorAll("[aria-label]").forEach((el) => {
      if (el.closest("svg, [data-goin-lang-slot='1']")) return;
      if (!ariaMap.has(el)) {
        ariaMap.set(el, el.getAttribute("aria-label") || "");
      }
      const originalAria = ariaMap.get(el);
      el.setAttribute("aria-label", translateHomeString(originalAria, lang));
    });
  }, [lang]);

  useEffect(() => {
    const root = document.getElementById("goin-homepage-root");
    if (!root) return;

    const meta = HOME_META[lang] || HOME_META.en;
    const isStaff =
      currentUser?.role === "superadmin" ||
      currentUser?.role === "admin" ||
      currentUser?.role === "subadmin";
    const targetPath = currentUser
      ? isStaff
        ? "/admin/dashboard"
        : "/dashboard"
      : "/auth/login";

    const loginLinks = Array.from(
      root.querySelectorAll('a[href="/login"], a[href="/auth/login"], a[data-goin-auth-link="1"]')
    );

    const cleanups = loginLinks.map((el) => {
      el.setAttribute("data-goin-auth-link", "1");
      el.setAttribute("href", targetPath);
      el.textContent = currentUser ? meta.dashboard : meta.login;

      const handleClick = (e) => {
        e.preventDefault();
        navigate(targetPath);
      };
      el.addEventListener("click", handleClick);
      return () => el.removeEventListener("click", handleClick);
    });

    root.querySelectorAll('a[href="/get-started"]').forEach((el) => {
      const handleGetStarted = (e) => {
        e.preventDefault();
        navigate("/get-started");
      };
      el.addEventListener("click", handleGetStarted);
      cleanups.push(() => el.removeEventListener("click", handleGetStarted));
    });

    return () => {
      cleanups.forEach((fn) => fn());
    };
  }, [currentUser, navigate, lang]);

  useEffect(() => {
    const root = document.getElementById("goin-homepage-root");
    if (!root) return;

    const reduceMotion =
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // 1. Vaultline reveal motion (matching kyc_data_collector HomepageClientInteractions)
    const revealTargets = root.querySelectorAll(
      "main section, x-dc section, section#services .vl-card, section#team .vl-card, #foundations > div, #press > div"
    );

    let revealObserver = null;
    if (!reduceMotion && "IntersectionObserver" in window) {
      revealTargets.forEach((el, index) => {
        if (!el.classList.contains("vl-reveal")) {
          el.classList.add("vl-reveal");
          el.style.setProperty("--vl-delay", (index % 4) * 85 + "ms");
        }
      });

      revealObserver = new IntersectionObserver(
        (entries, obs) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting) {
              entry.target.classList.add("vl-visible");
              obs.unobserve(entry.target);
            }
          });
        },
        { threshold: 0.12, rootMargin: "0px 0px -35px 0px" }
      );

      revealTargets.forEach((el) => revealObserver.observe(el));
    } else {
      revealTargets.forEach((el) => el.classList.add("vl-visible"));
    }

    // 2. Process section reveal motion
    const processSection = root.querySelector("section.vl-process-motion");
    let processObserver = null;
    if (processSection) {
      if (reduceMotion || !("IntersectionObserver" in window)) {
        processSection.classList.add("vl-process-visible");
      } else {
        processObserver = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              if (entry.isIntersecting) {
                processSection.classList.add("vl-process-visible");
                processObserver?.disconnect();
              }
            });
          },
          { threshold: 0.18 }
        );
        processObserver.observe(processSection);
      }
    }

    return () => {
      revealObserver?.disconnect();
      processObserver?.disconnect();
    };
  }, []);

  const meta = HOME_META[lang] || HOME_META.en;
  const currentLangItem =
    SUPPORTED_LANGUAGES.find((item) => item.code === lang) || SUPPORTED_LANGUAGES[0];

  return (
    <>
      <div dangerouslySetInnerHTML={HOMEPAGE_HEAD_HTML} />
      <div id="goin-homepage-root" dangerouslySetInnerHTML={HOMEPAGE_BODY_HTML} />
      {langSlot &&
        createPortal(
          <div className="goin-lang-dropdown" ref={langDropdownRef}>
            <button
              type="button"
              className="goin-lang-trigger"
              onClick={() => setLangMenuOpen((open) => !open)}
              aria-haspopup="listbox"
              aria-expanded={langMenuOpen}
              aria-label={meta.switcherAria}
              title={currentLangItem.name}
            >
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#69A5FF"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <circle cx="12" cy="12" r="10" />
                <path d="M2 12h20" />
                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
              </svg>
              <span>{currentLangItem.label}</span>
              <svg
                className="goin-lang-chevron"
                width="13"
                height="13"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.4"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>

            {langMenuOpen && (
              <div
                className="goin-lang-menu"
                role="listbox"
                aria-label={meta.switcherAria}
              >
                {SUPPORTED_LANGUAGES.map((item) => {
                  const isActive = lang === item.code;
                  return (
                    <button
                      key={item.code}
                      type="button"
                      role="option"
                      aria-selected={isActive}
                      className={`goin-lang-option${isActive ? " is-active" : ""}`}
                      onClick={() => handleSelectLanguage(item.code)}
                    >
                      <span className="goin-lang-option-left">
                        <span className="goin-lang-badge">{item.label}</span>
                        <span>{item.name}</span>
                      </span>
                      {isActive && (
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="#5B9BFF"
                          strokeWidth="2.6"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          aria-hidden="true"
                        >
                          <path d="M20 6L9 17l-5-5" />
                        </svg>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </div>,
          langSlot
        )}
    </>
  );
}
