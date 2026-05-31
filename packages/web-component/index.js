// @globestudio/element — framework-agnostic <globe-studio> custom element.
//
// A zero-dependency wrapper over globestudio.app/embed: the heavy lifting
// (Three.js, shaders, country data) runs on the embed origin, so this stays a
// tiny element that works anywhere custom elements do — vanilla, Svelte, Vue,
// Solid, Astro, Webflow, Framer. The URL logic intentionally mirrors
// @globestudio/react so embed / React / web-component / MCP all speak the same
// config API.

const SITE_URL = "https://globestudio.app";

/** Build the embed URL from a look preset or a pre-built share `config`. */
export const buildEmbedUrl = ({ look, config, source } = {}) => {
  const params = new URLSearchParams();
  if (config) {
    params.set("c", config);
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
