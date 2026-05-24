import { useEffect } from "react";

// The main canvas app needs body { overflow: hidden } so the page
// doesn't scroll behind the fixed-positioned panel + globe canvas.
// Static takeover pages (/docs, /brand, /404) need the opposite —
// they're tall content pages and the user expects ordinary window
// scroll. This hook adds a body class that unlocks scrolling for the
// lifetime of the page, then cleans up on unmount.
export const useBodyScrollable = () => {
  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    document.body.classList.add("is-body-scrollable");
    return () => {
      document.body.classList.remove("is-body-scrollable");
    };
  }, []);
};
