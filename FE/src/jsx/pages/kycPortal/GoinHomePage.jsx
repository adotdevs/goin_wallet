import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthUser, useIsAuthenticated } from "react-auth-kit";
import { INDEX_HEAD_STYLES, INDEX_BODY_HTML } from "./goinLandingData";

const HOMEPAGE_BASE_GUARD = `<style id="goin-homepage-wallet-guard">
html.goin-homepage-active {
  font-size: 16px !important;
}
#goin-homepage-root {
  font-size: 16px;
  line-height: 1.5;
}
</style>`;

export default function GoinHomePage() {
  const navigate = useNavigate();
  const isAuthenticated = useIsAuthenticated();
  const authUser = useAuthUser();

  const loggedIn = isAuthenticated();
  const currentUser = loggedIn ? authUser()?.user : null;

  useEffect(() => {
    const prevTitle = document.title;
    document.title = "GOin SAS — Crypto investing, held securely";
    document.documentElement.classList.add("goin-homepage-active");

    return () => {
      document.title = prevTitle;
      document.documentElement.classList.remove("goin-homepage-active");
    };
  }, []);

  useEffect(() => {
    const root = document.getElementById("goin-homepage-root");
    if (!root) return;

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
      el.textContent = currentUser ? "Dashboard" : "Login";

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
  }, [currentUser, navigate]);

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

  return (
    <>
      <div
        dangerouslySetInnerHTML={{
          __html: HOMEPAGE_BASE_GUARD + INDEX_HEAD_STYLES,
        }}
      />
      <div
        id="goin-homepage-root"
        dangerouslySetInnerHTML={{
          __html: INDEX_BODY_HTML,
        }}
      />
    </>
  );
}
