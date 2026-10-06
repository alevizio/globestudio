// Embed code for the current design, as the export dialog's Share tab shows
// it. Every builder takes `config`: the design's share config as JSON, which
// is the ?c= value of a share link, decoded once. Without one the snippet
// leaves it out and embeds a default look.

import { previewBackground } from "./canvas-background.js";

const SITE_URL = "https://globestudio.app";
const HEX_RE = /^#[0-9a-f]{3,8}$/i;

// The config as an object, or an empty one when it can't be read.
const readDesign = (config) => {
  try {
    return JSON.parse(config) ?? {};
  } catch {
    return {};
  }
};

// The site answers 414 for an address a little under 32,800 characters
// long. The config travels in the address, and the file of a custom shape
// can take it past that. This leaves some room.
export const EMBED_URL_MAX = 32_000;

// Whether the design fits in an embed address. The packages encode the
// config with URLSearchParams, which can come out longer than the iframe's
// encodeURIComponent.
export const fitsEmbedUrl = (config) => {
  if (!config) return true;
  const encoded = Math.max(encodeURIComponent(config).length, new URLSearchParams({ c: config }).toString().length - 2);
  return `${SITE_URL}/embed?c=`.length + encoded <= EMBED_URL_MAX;
};

// The docs page's iframe form, pointed at the embed route. The config is
// encoded the way the share link encodes it, and nothing encodeURIComponent
// leaves behind can end a double-quoted attribute.
export const buildIframeSnippet = ({ config, width, height }) =>
  `<iframe
  src="${SITE_URL}/embed${config ? `?c=${encodeURIComponent(config)}` : ""}"
  width="${width}"
  height="${height}"
  style="border: 0;"
  loading="lazy"
  title="Globestudio dotted globe"
></iframe>`;

// A number is a JSX expression, a size like "100%" a JSX string.
const jsxValue = (value) => (typeof value === "number" ? `{${value}}` : JSON.stringify(String(value)));

// <Globe> takes the JSON as it is and encodes it for the embed URL itself.
export const buildReactSnippet = ({ config, width, height }) =>
  `import { Globe } from "@globestudio/react";\n\n<Globe\n${
    config ? `  config={${JSON.stringify(config)}}\n` : ""
  }  width=${jsxValue(width)}\n  height=${jsxValue(height)}\n/>`;

const escapeAttribute = (value) =>
  value.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

// The tag that loads <globe-studio> with no build step. jsDelivr serves the
// file npm published for that version, and the integrity hash lets the
// browser run only those bytes. element-script.test.js recomputes the hash
// from packages/web-component/index.js and reads the version from its
// package.json, so a change to the element fails until this tag, and the
// copies it lists, are updated.
export const ELEMENT_SCRIPT =
  '<script type="module" src="https://cdn.jsdelivr.net/npm/@globestudio/element@0.2.0/index.js" integrity="sha384-aHQOT3XnyObS+Dk0lMsAKS3J7YeIz8VRlHconYo2YYtEy7UqCytVre6dLWPYxKqM" crossorigin="anonymous"></script>';

// <globe-studio> takes the same JSON, here inside an HTML attribute.
export const buildWebComponentSnippet = ({ config, height }) =>
  `${ELEMENT_SCRIPT}
<globe-studio${config ? ` config="${escapeAttribute(config)}"` : ""} height="${height}"></globe-studio>`;

// A pen for CodePen's prefill API (https://blog.codepen.io/documentation/prefill/):
// the web component filling a page with no margin and the design's
// background, which is the color the studio's dark theme shows behind the
// design. The dialog's height is an export size, taller than most pens, so
// the pen's own height is used instead.
export const buildCodePenData = ({ config }) => {
  const background = previewBackground({ ...readDesign(config), uiTheme: "dark" });
  return {
    title: "Globestudio embed",
    html: buildWebComponentSnippet({ config, height: "100%" }),
    css: `html,\nbody {\n  height: 100%;\n  margin: 0;\n${HEX_RE.test(background) ? `  background: ${background};\n` : ""}}`,
    js: "",
  };
};
