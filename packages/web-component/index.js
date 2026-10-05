// @globestudio/element — framework-agnostic <globe-studio> custom element.
//
// A zero-dependency wrapper over globestudio.app/embed: the heavy lifting
// (Three.js, shaders, country data) runs on the embed origin, so this stays a
// tiny element that works anywhere custom elements do — vanilla, Svelte, Vue,
// Solid, Astro, Webflow, Framer. The URL logic intentionally mirrors
// @globestudio/react so embed / React / web-component / MCP all speak the same
// config API.

const SITE_URL = "https://globestudio.app";

// A share link or its query passed as config ("https://globestudio.app/?c=…&app=1",
// "?c=…", "c=…") gives its c param, as written: whatever follows the token
// (app=1 on older links, other params, a #hash) is not part of it, and left
// in, the config failed to parse. A JSON config or a token passes through.
const configToken = (config) => {
  if (/^\s*\{/.test(config)) return config;
  const q = config.indexOf("?");
  const query = q >= 0 ? config.slice(q + 1) : config.startsWith("c=") ? config : "";
  const param = query.split("#")[0].split("&").find((part) => part.startsWith("c="));
  return param === undefined ? config : param.slice(2);
};

/**
 * Build the embed URL from a look preset, a pre-built share `config`, or
 * both: the embed layers the config over the look, or over Default when
 * only a config is given.
 */
export const buildEmbedUrl = ({ look, config, source } = {}) => {
  const params = new URLSearchParams();
  if (config) {
    if (look) params.set("look", look);
    params.set("c", configToken(String(config)));
  } else {
    params.set("look", look || "halftone");
  }
  if (source) params.set("source", source);
  return `${SITE_URL}/embed?${params.toString()}`;
};

const OBSERVED = ["look", "config", "source", "width", "height", "title", "loading"];

// SSR-safe base: `HTMLElement` is undefined on the server (Next.js, Astro,
// Remix). Extending a stub there means a bare `import "@globestudio/element"`
// won't throw during SSR; defineGlobeStudio() still no-ops without
// customElements, and the real element registers on the client.
const ElementBase = typeof HTMLElement !== "undefined" ? HTMLElement : class {};

export class GlobeStudioElement extends ElementBase {
  #iframe = null;

  static get observedAttributes() {
    return OBSERVED;
  }

  connectedCallback() {
    this.#render();
  }

  attributeChangedCallback() {
    if (this.isConnected) this.#render();
  }

  #render() {
    if (!this.#iframe) {
      this.#iframe = document.createElement("iframe");
      this.#iframe.style.border = "0";
      this.#iframe.style.display = "block";
      this.appendChild(this.#iframe);
    }
    const iframe = this.#iframe;
    iframe.src = buildEmbedUrl({
      look: this.getAttribute("look") || undefined,
      config: this.getAttribute("config") || undefined,
      source: this.getAttribute("source") || undefined,
    });
    iframe.setAttribute("width", this.getAttribute("width") || "100%");
    iframe.setAttribute("height", this.getAttribute("height") || "480");
    iframe.title = this.getAttribute("title") || "Globestudio dotted globe";
    iframe.loading = this.getAttribute("loading") || "lazy";
  }
}

/** Register the element (default tag `globe-studio`). Safe to call repeatedly. */
export const defineGlobeStudio = (tag = "globe-studio") => {
  if (typeof customElements !== "undefined" && !customElements.get(tag)) {
    customElements.define(tag, GlobeStudioElement);
  }
  return tag;
};

// Auto-register on import so `<globe-studio look="aurora">` works after a bare
// `import "@globestudio/element"`. (sideEffects: true in package.json keeps
// bundlers from tree-shaking this away.)
defineGlobeStudio();
