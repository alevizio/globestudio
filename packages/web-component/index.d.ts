export interface GlobeStudioOptions {
  /** Look preset id (e.g. "aurora"). Ignored when `config` is set. */
  look?: string;
  /** Pre-built share config payload (the `?c=` value). Overrides `look`. */
  config?: string;
  /** Optional analytics attribution tag. */
  source?: string;
}

/** Build the embed URL from a look preset or a pre-built share `config`. */
export declare function buildEmbedUrl(opts?: GlobeStudioOptions): string;

/** The `<globe-studio>` custom element. */
export declare class GlobeStudioElement extends HTMLElement {
  static readonly observedAttributes: string[];
  connectedCallback(): void;
  attributeChangedCallback(): void;
}

/** Register the element (default tag `globe-studio`). Safe to call repeatedly. */
export declare function defineGlobeStudio(tag?: string): string;

declare global {
  interface HTMLElementTagNameMap {
    "globe-studio": GlobeStudioElement;
  }
}
