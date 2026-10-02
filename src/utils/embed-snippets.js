// Embed code for the current design, as the export dialog's Share tab shows
// it. Every builder takes `config`: the design's share config as JSON, which
// is the ?c= value of a share link, decoded once. Without one the snippet
// leaves it out and embeds a default look.

import { backgroundKind } from "./canvas-background.js";

const SITE_URL = "https://globestudio.app";
const HEX_RE = /^#[0-9a-f]{3,8}$/i;

// Two things the embed route takes from the URL and not from the config:
// the Flat view, and the page color behind a Solid background. Without
// them a flat map embeds as a globe, on the embed's own dark page.
const embedParams = (config) => {
  let design;
  try {
    design = JSON.parse(config);
  } catch {
    return "";
  }
  const view = design?.viewMode === "flat" ? "&view=flat" : "";
  const solid = backgroundKind(design ?? {}) === "solid" && HEX_RE.test(design?.background);
  return `${view}${solid ? `&background=${design.background.slice(1)}` : ""}`;
};

// The docs page's iframe form, pointed at the embed route. The config is
// encoded the way the share link encodes it, and nothing encodeURIComponent
// leaves behind can end a double-quoted attribute.
export const buildIframeSnippet = ({ config, width, height }) =>
  `<iframe
  src="${SITE_URL}/embed${config ? `?c=${encodeURIComponent(config)}${embedParams(config)}` : ""}"
  width="${width}"
  height="${height}"
  style="border: 0;"
  loading="lazy"
  title="Globestudio dotted globe"
></iframe>`;

// <Globe> takes the JSON as it is and encodes it for the embed URL itself.
export const buildReactSnippet = ({ config, width, height }) =>
  `import { Globe } from "@globestudio/react";\n\n<Globe\n${
    config ? `  config={${JSON.stringify(config)}}\n` : ""
  }  width={${width}}\n  height={${height}}\n/>`;

const escapeAttribute = (value) =>
  value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// <globe-studio> takes the same JSON, here inside an HTML attribute. The
// element loads from esm.sh, so the snippet needs no build step.
export const buildWebComponentSnippet = ({ config, height }) =>
  `<script type="module" src="https://esm.sh/@globestudio/element"></script>
<globe-studio${config ? ` config="${escapeAttribute(config)}"` : ""} height="${height}"></globe-studio>`;
