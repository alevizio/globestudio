import { useEffect, useState } from "react";
import { usePersistedState } from "../hooks/use-persisted-state.js";
import { KbdKey } from "./ui/kbd-key.jsx";

// One-shot hint for first-time visitors — surfaces the two highest-
// leverage shortcuts so people discover the keyboard interface
// without having to open the help dialog. Dismissed on the first
// interaction (any key/click/touch) or auto-clears after 12 s.
//
// Persisted via usePersistedState so a refresh during the same session
// doesn't re-surface it. Cleared once on dismiss; subsequent visits
// never see it. To reset for testing:
//   localStorage.removeItem("globestudio:hasSeenOnboarding")
export const OnboardingHint = () => {
  const [seen, setSeen] = usePersistedState("hasSeenOnboarding", false);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (seen) return undefined;
    // Wait for the globe entrance to settle before nudging the user.
    const showTimer = window.setTimeout(() => setVisible(true), 1400);
    return () => window.clearTimeout(showTimer);
  }, [seen]);

  useEffect(() => {
    if (!visible) return undefined;
    const dismiss = () => {
      setVisible(false);
      setSeen(true);
    };
    const autoTimer = window.setTimeout(dismiss, 12_000);
    const opts = { once: true, passive: true };
    window.addEventListener("keydown", dismiss, opts);
    window.addEventListener("mousedown", dismiss, opts);
    window.addEventListener("touchstart", dismiss, opts);
    return () => {
      window.clearTimeout(autoTimer);
      window.removeEventListener("keydown", dismiss, opts);
      window.removeEventListener("mousedown", dismiss, opts);
      window.removeEventListener("touchstart", dismiss, opts);
    };
  }, [visible, setSeen]);

  if (!visible) return null;

  return (
    <div className="onboarding-hint" role="status" aria-live="polite">
      <span>Press</span>
      <KbdKey>S</KbdKey>
      <span>to shuffle</span>
      <span className="onboarding-hint-sep" aria-hidden="true">·</span>
      <KbdKey>[</KbdKey>
      <KbdKey>]</KbdKey>
      <span>to cycle</span>
    </div>
  );
};
