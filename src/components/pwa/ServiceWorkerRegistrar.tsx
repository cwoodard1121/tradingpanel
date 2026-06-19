"use client";

import { useEffect } from "react";

/**
 * Registers the service worker on the client, after mount. Renders nothing.
 * Guarded so it never touches browser globals during SSR/render, and silently
 * tolerates environments where service workers are unavailable or blocked.
 */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        /* registration failed (private mode, blocked, etc.) — ignore */
      });
    };

    // Wait until the page has loaded to avoid contending with first paint.
    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}

export default ServiceWorkerRegistrar;
