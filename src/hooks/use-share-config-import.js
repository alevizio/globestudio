import { useEffect, useRef } from "react";
import { parseShareConfig } from "../utils/share-config.js";
import { lookFromPath } from "./use-route-look.js";

// Reads `?c=…` from the URL on first mount and applies that share config.
// The param stays in the address while the link's design is on screen, so
// a reload opens it again: App strips it at the first edit, when the design
// is saved as the visitor's own. Declared by App after the /looks/:id route
// effect so the share config wins when both are present (e.g.
// /looks/halftone?c=…) — the share URL encodes a more specific intent than
// the preset route.
export const useShareConfigImport = (importConfig, setStatusMessage) => {
  // The config the page opened with. In dev, StrictMode runs both effects
  // twice, and the route effect's second run applies the look again.
  // Applying the same config again keeps it on top, as in production, where
  // each effect runs once.
  const sharedRef = useRef(undefined);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sharedRef.current === undefined) {
      // On /looks/:id a nested object the config gives in part keeps the
      // look's other values, the ones the route effect has just applied.
      const look = lookFromPath(window.location.pathname);
      sharedRef.current = parseShareConfig(window.location.search, look?.settings);
    }
    const config = sharedRef.current;
    if (!config) return;
    importConfig(config);
    setStatusMessage("Loaded shared configuration");
    // importConfig + setStatusMessage are stable in App; depend on identity
    // at mount only so a re-render doesn't re-apply the share config.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};
