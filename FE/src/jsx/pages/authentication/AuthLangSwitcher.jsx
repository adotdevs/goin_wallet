import React, { useEffect, useRef, useState } from "react";
import { Globe, ChevronDown, Check } from "lucide-react";
import { AUTH_KYC_LANGUAGES } from "./authKycI18n";
import styles from "./AuthLangSwitcher.module.css";

export default function AuthLangSwitcher({
  lang,
  onChange,
  ariaLabel = "Choisir la langue",
  dark = false,
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  const current =
    AUTH_KYC_LANGUAGES.find((item) => item.code === lang) || AUTH_KYC_LANGUAGES[0];

  useEffect(() => {
    if (!open) return undefined;
    const handlePointerDown = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  return (
    <div
      ref={containerRef}
      data-no-translate="1"
      className={`${styles.wrapper} ${dark ? styles.dark : ""}`}
    >
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={ariaLabel}
        title={current.name}
        className={`${styles.trigger} ${open ? styles.triggerOpen : ""}`}
      >
        <Globe className={styles.globe} />
        <span className={styles.triggerLabel}>{current.name}</span>
        <ChevronDown className={styles.chevron} />
      </button>

      {open && (
        <div role="listbox" aria-label={ariaLabel} className={styles.menu}>
          {AUTH_KYC_LANGUAGES.map((item) => {
            const active = item.code === lang;
            return (
              <button
                key={item.code}
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => {
                  onChange(item.code);
                  setOpen(false);
                }}
                className={`${styles.option} ${active ? styles.optionActive : ""}`}
              >
                <span className={styles.optionLeft}>
                  <span className={styles.badge}>{item.label}</span>
                  <span>{item.name}</span>
                </span>
                {active && <Check className={styles.check} />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
