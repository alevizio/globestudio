/**
 * @globestudio/react
 *
 * Drop-in React component for embedding Globestudio dotted globes.
 *
 * The component is intentionally trivial — it's a styled iframe over
 * globestudio.app/embed. The complexity (Three.js, shaders, country
 * data) all lives on globestudio.app, so this package stays a tiny
 * zero-dep wrapper with a sensible TypeScript surface.
 *
 * Why a package and not a copy-paste snippet?
 * - TypeScript types for `look` (autocomplete of every shipped preset)
 * - Versioning — pin to a tested version, upgrade deliberately
 * - One-line install in SaaS templates that ship via npm
 * - Server-side render friendly out of the box (iframe is just HTML)
 */
import { forwardRef, type CSSProperties, type Ref } from "react";

const SITE_URL = "https://globestudio.app";

/**
 * Every preset id shipped by Globestudio as of this package version.
 * Kept inline so the type is autocomplete-friendly without a runtime
 * fetch. If the main app ships a new preset, this list gets updated
 * in the same release (PR review enforces).
 */
export type LookId =
  | "default"
  | "halftone"
  | "risograph"
  | "newsprint"
  | "aurora"
  | "pixel"
  | "bayer"
  | "atkinson"
  | "wireframe"
  | "crt"
  | "glitch"
  | "badtv"
  | "bloom"
  | "metal"
  | "iridescent"
  | "pencil"
  | "corrupt"
  | "toon"
  | "threshold"
  | "vapor"
  | "topographic";

export interface GlobeProps {
  /**
   * Look preset id. `LookId` autocompletes every value Globestudio ships.
   * Defaults to `"halftone"`.
   */
  look?: LookId;
  /**
   * Width in CSS units. Numbers become pixels; pass strings for `%`,
   * `vw`, etc. Defaults to `"100%"` so the iframe fills its container.
   */
  width?: number | string;
  /**
   * Height in CSS units. Defaults to `480` (px).
   */
  height?: number | string;
  /**
   * Pre-built share config — when you've used `build_share_url` (e.g.
   * via the MCP server) or the app's Share modal, pass the encoded
   * payload here and it takes precedence over `look`.
   */
  config?: string;
  /**
   * Accessible title for the embedded iframe. Required for AT/SR.
   * Defaults to `"Globestudio dotted globe"`.
   */
  title?: string;
  /**
   * Forwarded `className` for the iframe.
   */
  className?: string;
  /**
   * Forwarded `style` for the iframe. Merged after the component's
   * default `border: 0` so callers can override anything.
   */
  style?: CSSProperties;
  /**
   * `loading` attribute. Defaults to `"lazy"` so off-screen embeds
   * don't fire WebGL until they're scrolled near.
   */
  loading?: "lazy" | "eager";
  /**
   * Optional `source` query param tagged on the embed URL — useful when
   * you want to track where embeds are coming from in Vercel Analytics.
   * Example: `source="my-saas-landing"`.
   */
  source?: string;
  /**
   * Fired when the iframe finishes loading. Forwarded.
   */
  onLoad?: React.IframeHTMLAttributes<HTMLIFrameElement>["onLoad"];
}

const buildEmbedUrl = (props: Pick<GlobeProps, "look" | "config" | "source">) => {
  const params = new URLSearchParams();
  if (props.config) {
    params.set("c", props.config);
  } else {
    params.set("look", props.look ?? "halftone");
  }
  if (props.source) params.set("source", props.source);
  return `${SITE_URL}/embed?${params.toString()}`;
};

/**
 * <Globe /> — drop-in embed component.
 *
 * @example
 * ```tsx
 * import { Globe } from "@globestudio/react";
 *
 * // Simplest usage:
 * <Globe />
 *
 * // Pick a preset:
 * <Globe look="aurora" />
 *
 * // Fixed size:
 * <Globe look="vapor" width={800} height={600} />
 *
 * // From a share URL's config:
 * <Globe config={searchParams.get("c") ?? undefined} />
 * ```
 */
export const Globe = forwardRef<HTMLIFrameElement, GlobeProps>(function Globe(
  props,
  ref: Ref<HTMLIFrameElement>,
) {
  const {
    look,
    width = "100%",
    height = 480,
    config,
    title = "Globestudio dotted globe",
    className,
    style,
    loading = "lazy",
    source,
    onLoad,
  } = props;

  const src = buildEmbedUrl({ look, config, source });

  return (
    <iframe
      ref={ref}
      src={src}
      width={width}
      height={height}
      style={{ border: 0, ...style }}
      className={className}
      title={title}
      loading={loading}
      onLoad={onLoad}
    />
  );
});

/**
 * URL-building helpers — same logic as `<Globe />` exposes, useful if
 * you need the URL directly (Next.js `<Image src>`, SSR markup, etc.).
 */
export const globestudio = {
  embedUrl(opts: Pick<GlobeProps, "look" | "config" | "source"> = {}) {
    return buildEmbedUrl(opts);
  },
  thumbnailUrl(look: LookId) {
    return `${SITE_URL}/looks/${look}.png`;
  },
  shareUrl(config: string) {
    return `${SITE_URL}/?c=${config}`;
  },
};
