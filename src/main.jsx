import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./styles.css";

// A small wave for devs who open the console. Designers and engineers tend to
// open DevTools out of curiosity — give them a single tasteful frame.
if (typeof window !== "undefined" && typeof console !== "undefined") {
  // Dot-sphere — rows go 5→9→11→13→14→14→14→13→11→9→5 to suggest spherical
  // curvature. Outer rows are the "limb" of the globe; middle rows the equator.
  // Single en-space between dots keeps the silhouette circular at the console's
  // default monospace metrics.
  const globe = [
    "",
    "             · · · · ·            ",
    "         · · · · · · · · ·        ",
    "       · · · · · · · · · · ·      ",
    "     · · · · · · · · · · · · ·    ",
    "    · · · · · · · · · · · · · ·   ",
    "    · · · · · · · · · · · · · ·   ",
    "    · · · · · · · · · · · · · ·   ",
    "     · · · · · · · · · · · · ·    ",
    "       · · · · · · · · · · ·      ",
    "         · · · · · · · · ·        ",
    "             · · · · ·            ",
    "",
  ].join("\n");
  const globeStyle =
    "font: 11px ui-monospace, SFMono-Regular, Menlo, monospace; color: #f6f2ea; line-height: 1.0; letter-spacing: 0;";
  const title = "%cworlddots";
  const titleStyle =
    "font: 700 26px ui-monospace, SFMono-Regular, Menlo, monospace; color: #f6f2ea; letter-spacing: -0.02em; padding-top: 4px;";
  const subtitle =
    "%cDotted maps, dotted globes, and a quiet starfield.\nBuilt with Three.js + React.  ·  Source: https://github.com/alevizio/worlddots";
  const subtitleStyle =
    "font: 12px ui-monospace, SFMono-Regular, Menlo, monospace; color: #888; line-height: 1.6; padding-bottom: 6px;";
  console.log(`%c${globe}`, globeStyle);
  console.log(title, titleStyle);
  console.log(subtitle, subtitleStyle);
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
