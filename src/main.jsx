import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { Analytics } from "./components/analytics.jsx";
import { EmbedView } from "./components/embed-view.jsx";
import { RootErrorBoundary } from "./components/root-error-boundary.jsx";
import { consoleGreeting } from "./utils/console-greeting.js";
import { reloadOnceOnPreloadError } from "./utils/preload-recovery.js";
import "./styles.css";

// A lazy chunk from the previous deploy is gone: reload once to pick up the
// current build (see preload-recovery.js).
if (typeof window !== "undefined") {
  window.addEventListener("vite:preloadError", () => reloadOnceOnPreloadError());
}

// Embed mode — when the path starts with /embed, render a stripped view with
// just the canvas, no chrome. Driven by query-string params. The full app
// renders for every other path. See docs/plans/integrations-rollout.md Phase 0
// for the embed contract and the params it honors.
const isEmbed = typeof window !== "undefined" && window.location.pathname.startsWith("/embed");

// A small wave for devs who open the console. Skipped in /embed since hosts
// embedding Globestudio shouldn't see noise in their own console.
if (!isEmbed) consoleGreeting();

// Analytics mounts here, once, next to App: App returns early for the teaser
// and the static routes (/gallery, /compare/*, /docs, /privacy, 404...), so a
// mount inside it missed their pageviews. Never on /embed: a customer's
// iframe gets no analytics script.
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <RootErrorBoundary where={isEmbed ? "embed" : "root"}>
      {isEmbed ? (
        <EmbedView />
      ) : (
        <>
          <App />
          <Analytics />
        </>
      )}
    </RootErrorBoundary>
  </StrictMode>,
);
