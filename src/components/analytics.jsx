import { useEffect, useState } from "react";
import { Analytics as VercelAnalytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";

// Privacy-respecting analytics layer. Loads Vercel Web Analytics +
// Speed Insights ONLY when:
//   1. The user hasn't set Do-Not-Track / Global Privacy Control, and
//   2. The user hasn't toggled the localStorage opt-out
//
// Both signals are checked on mount and cached. The localStorage key
// matches what /privacy documents so users can paste it into DevTools
// to opt out without finding a UI toggle.
//
// Vercel's analytics is cookieless — the visitor identity is a hash
// derived from the daily-rotating salt + user-agent. No PII, no
// fingerprinting, no third-party trackers.
const OPT_OUT_KEY = "gs_optout";

const isOptedOut = () => {
  if (typeof window === "undefined") return true;
  if (["localhost", "127.0.0.1", "::1"].includes(window.location.hostname)) return true;
  if (window.navigator.doNotTrack === "1") return true;
  // GPC is the W3C-standard signal modern privacy-conscious browsers use.
  if (window.navigator.globalPrivacyControl === true) return true;
  try {
    if (window.localStorage?.getItem(OPT_OUT_KEY) === "true") return true;
  } catch {
    // Storage blocked — treat as opt-out for safety.
    return true;
  }
  return false;
};

export const Analytics = () => {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    setEnabled(!isOptedOut());
  }, []);

  if (!enabled) return null;

  return (
    <>
      <VercelAnalytics />
      <SpeedInsights />
    </>
  );
};

// Programmatic event tracking — guarded by the same opt-out signals.
// Called from the action sites, always AFTER the action succeeds:
// applyLook fires preset_applied, the App.jsx export handlers fire
// export_completed (format + active look, no PII), the export modal's
// share tab fires share_clicked on copy. The event names here must stay
// in sync with what /privacy discloses (privacy-page.jsx).
export const track = (name, properties) => {
  if (isOptedOut()) return;
  // Lazy-load the track helper so importing it doesn't pull the
  // analytics bundle until the first event fires.
  import("@vercel/analytics")
    .then((mod) => mod.track(name, properties))
    .catch(() => {});
};
