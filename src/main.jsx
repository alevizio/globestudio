import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import { EmbedView } from "./components/embed-view.jsx";
import { consoleGreeting } from "./utils/console-greeting.js";
import "./styles.css";

// Embed mode — when the path starts with /embed, render a stripped view with
// just the canvas, no chrome. Driven by query-string params. The full app
// renders for every other path. See docs/plans/integrations-rollout.md Phase 0
// for the embed contract and the params it honors.
const isEmbed = typeof window !== "undefined" && window.location.pathname.startsWith("/embed");

// A small wave for devs who open the console. Skipped in /embed since hosts
// embedding Globestudio shouldn't see noise in their own console.
if (!isEmbed) consoleGreeting();

createRoot(document.getElementById("root")).render(
  <StrictMode>
    {isEmbed ? <EmbedView /> : <App />}
  </StrictMode>,
);
