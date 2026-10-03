import { useEffect, useRef } from "react";
import {
  clearShareConfigFromUrl,
  parseShareConfig,
} from "../utils/share-config.js";

// Reads `?c=…` from the URL on first mount and applies that share config.
// Strips the param afterwards so subsequent edits don't accumulate stale
// state. Declared by App after the /looks/:id route effect so the share
// config wins when both are present (e.g. /looks/halftone?c=…) — the
// share URL encodes a more specific intent than the preset route.
export const useShareConfigImport = (importConfig, setStatusMessage) => {
  // The config the page opened with. In dev, StrictMode runs both effects
  // twice, and the route effect's second run applies the look again after
  // ?c= has left the address. Applying the same config again keeps it on
  // top, as in production, where each effect runs once.
  const sharedRef = useRef(undefined);
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sharedRef.current === undefined) sharedRef.current = parseShareConfig(window.location.search);
    const config = sharedRef.current;
    if (!config) return;
    importConfig(config);
    clearShareConfigFromUrl();
    setStatusMessage("Loaded shared configuration");
    // importConfig + setStatusMessage are stable in App; depend on identity
    // at mount only so a re-render doesn't re-apply the share config.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
};
