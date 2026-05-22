// Pixel-aesthetic console greeting. Only fires once per session.
//
// Designers and engineers tend to open DevTools out of curiosity — give
// them a single tasteful frame with a dotted-globe silhouette, the repo
// link, and the keyboard shortcuts that aren't immediately discoverable
// in the UI. Cheap, fun, on-brand.

let greeted = false;

export const consoleGreeting = () => {
  if (greeted) return;
  greeted = true;
  if (typeof window === "undefined" || typeof console?.log !== "function") return;

  // Continent silhouettes on a dotted globe — ● is land, · is ocean.
  // Centered roughly on 0° longitude so Americas read as the left strip,
  // Africa + Europe as the right cluster, with a hint of Australia at
  // the bottom right. Hand-laid for monospace metrics; don't reflow
  // unless re-tuning per-row column counts.
  const globe = [
    "",
    "           · · · · · ·            ",
    "      · ● ● ● · · · · · · · ●     ",
    "   · · ● ● ● ● ● · · ● ● ● ● ● ·  ",
    "  · · · ● ● · · · · ● ● ● ● ● ● · ",
    " · · · ● ● · · · · · ● ● ● · ● ●  ",
    " · · · · ● · · · · · ● ● ● · · · ·",
    " · · · · ● · · · · · ● ● ● · · · ·",
    "  · · · ● · · · · · · ● ● · · ●   ",
    "   · · · ● · · · · · · ● · · ·    ",
    "     · · · · · · · · · · · ·      ",
    "        · · · · · · · ·           ",
    "",
  ].join("\n");

  const globeStyle =
    "font: 11px ui-monospace, SFMono-Regular, Menlo, monospace; color: #f6f2ea; line-height: 1.0; letter-spacing: 0;";
  const titleStyle =
    "font: 700 26px ui-monospace, SFMono-Regular, Menlo, monospace; color: #f6f2ea; letter-spacing: -0.02em; padding-top: 4px;";
  const subtitleStyle =
    "font: 12px ui-monospace, SFMono-Regular, Menlo, monospace; color: #888; line-height: 1.6; padding-bottom: 6px;";
  const tipsHeading =
    "font: 700 11px ui-monospace, SFMono-Regular, Menlo, monospace; color: #f6f2ea; letter-spacing: 0.06em; padding-top: 8px;";
  const tipLine =
    "font: 11px ui-monospace, SFMono-Regular, Menlo, monospace; color: #aaa; line-height: 1.8;";
  const kbd =
    "background:#23262d;color:#f6f2ea;padding:1px 6px;border-radius:3px;font:700 10px ui-monospace,SFMono-Regular,Menlo,monospace;";
  const dim = "color:#888;font:11px ui-monospace,SFMono-Regular,Menlo,monospace;";

  console.log(`%c${globe}`, globeStyle);
  console.log("%cglobestudio", titleStyle);
  console.log(
    "%cDotted maps, dotted globes, and a quiet starfield.\nBuilt with Three.js + React.  ·  Source: https://github.com/alevizio/globestudio",
    subtitleStyle,
  );
  console.log("%cKEYBOARD", tipsHeading);
  console.log(
    "  %c?%c shortcuts overlay   %cS%c shuffle preset   %cD%c export\n  %cG%c flat ⇄ globe        %cR%c reset everything %cH%c hide panel\n  %c[%c %c]%c cycle presets    %c+%c %c−%c zoom         %c0%c reset zoom",
    kbd,
    tipLine,
    kbd,
    tipLine,
    kbd,
    tipLine,
    kbd,
    tipLine,
    kbd,
    tipLine,
    kbd,
    tipLine,
    kbd,
    tipLine,
    kbd,
    tipLine,
    kbd,
    tipLine,
    kbd,
    tipLine,
    kbd,
    dim,
  );
};
