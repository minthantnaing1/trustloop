"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";

const SHOW_DELAY_MS = 800; // show overlay only for slow navigations
const TRANSITION_MS = 500; // fade/scale duration

export default function LoadingOverlay() {
  const pathname = usePathname();

  const [visible, setVisible] = useState(false); // whether overlay is shown
  const pendingRef = useRef(false); // a navigation is in progress (from click)
  const showTimerRef = useRef(null);
  const hideTimerRef = useRef(null);

  // Prevent body scroll while visible
  useEffect(() => {
    if (visible) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
  }, [visible]);

  // Allow programmatic show/hide (for router.push redirects etc.)
  useEffect(() => {
    const show = () => setVisible(true);
    const hide = () => setVisible(false);
    window.addEventListener("overlay:show", show);
    window.addEventListener("overlay:hide", hide);
    return () => {
      window.removeEventListener("overlay:show", show);
      window.removeEventListener("overlay:hide", hide);
    };
  }, []);

  // Capture internal link clicks to know "navigation intent" start
  useEffect(() => {
    function findAnchor(el) {
      while (el && el !== document.body) {
        if (el.tagName === "A") return el;
        el = el.parentElement;
      }
      return null;
    }

    function isModifiedEvent(e) {
      return e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0;
    }

    function isSameOrigin(href) {
      try {
        const u = new URL(href, window.location.href);
        return u.origin === window.location.origin;
      } catch {
        return false;
      }
    }

    function onClickCapture(e) {
      if (e.defaultPrevented) return;

      const path = typeof e.composedPath === "function" ? e.composedPath() : [];
      if (
        path &&
        path.some(
          (el) => el && el.dataset && el.dataset.suppressOverlay === "true"
        )
      ) {
        return;
      }

      if (isModifiedEvent(e)) return;

      const a = findAnchor(e.target);
      if (!a || !a.href) return;

      const href = a.getAttribute("href") || "";
      const isBlob = href.startsWith("blob:");
      const isDownload = a.hasAttribute("download");
      const isBlank = a.getAttribute("target") === "_blank";
      if (isBlob || isDownload || isBlank) return;

      if (
        a.dataset &&
        (a.dataset.suppressOverlay === "true" ||
          a.getAttribute("role") === "button")
      ) {
        return;
      }

      if (!isSameOrigin(a.href)) return;
      const dest = new URL(a.href, window.location.href);
      const nextPath = dest.pathname + dest.search + dest.hash;
      const currPath =
        window.location.pathname +
        window.location.search +
        window.location.hash;
      if (nextPath === currPath) return;

      pendingRef.current = true;

      if (showTimerRef.current) clearTimeout(showTimerRef.current);
      showTimerRef.current = setTimeout(() => {
        if (pendingRef.current) setVisible(true);
      }, SHOW_DELAY_MS);
    }

    document.addEventListener("click", onClickCapture, { capture: true });
    return () =>
      document.removeEventListener("click", onClickCapture, { capture: true });
  }, []);

  // When pathname changes, navigation completed => hide overlay
  useEffect(() => {
    pendingRef.current = false;

    if (showTimerRef.current) {
      clearTimeout(showTimerRef.current);
      showTimerRef.current = null;
    }

    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    setVisible(false);

    // Always release scroll lock
    document.body.style.overflow = "";

    // Safety: clear again after transition
    hideTimerRef.current = setTimeout(() => {
      document.body.style.overflow = "";
    }, 600);
  }, [pathname]);

  // Extra safety: release scroll when tab regains focus
  useEffect(() => {
    function onVis() {
      if (document.visibilityState === "visible" && !visible) {
        document.body.style.overflow = "";
      }
    }
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, [visible]);

  return (
    <div
      className={`fixed inset-0 z-[50000] flex items-center justify-center
                  transition-opacity duration-[${TRANSITION_MS}ms]
                  ${
                    visible
                      ? "opacity-100 pointer-events-auto"
                      : "opacity-0 pointer-events-none"
                  }`}
      aria-hidden={!visible}
      role="status"
    >
      <div className="absolute inset-0 bg-black/25 backdrop-blur-[1.5px]" />

      <div
        className={`relative flex flex-col items-center gap-3
                    transition-transform duration-[${TRANSITION_MS}ms]
                    ${visible ? "scale-100" : "scale-95"}`}
      >
        <div className="h-12 w-12 rounded-full border-4 border-white/30 border-t-white animate-spin" />
        <div className="text-white/90 text-sm font-medium tracking-wide">
          Loading…
        </div>
      </div>
    </div>
  );
}
