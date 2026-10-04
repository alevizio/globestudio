/**
 * @globestudio/react
 *
 * React component that embeds a Globestudio dotted globe.
 *
 * The component is a styled iframe over globestudio.app/embed. Three.js,
 * the shaders and the country data all live on globestudio.app, so this
 * package is a small wrapper with no dependencies and TypeScript types.
 *
 * What the package adds over the copy-paste snippet:
 * - TypeScript types for `look` (autocomplete of every shipped preset)
 * - Versioning: pin a tested version and upgrade when you choose
 * - One-line install in SaaS templates that ship via npm
 * - Server-side rendering works as is (the iframe is plain HTML)
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
   * The design's share config as a JSON string, `JSON.stringify(design)`,
   * not URL encoded: the component encodes it for the embed address. The
   * app's Share tab writes one; from the MCP server's `build_share_url`,
   * stringify the `config` it returns. It is layered over `look` when you
   * pass both, so a config that holds only changes keeps the rest of that
   * look, and over Default when you pass it alone.
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
   * Optional `source` query param added to the embed URL. Use it to
   * see where embeds are coming from in Vercel Analytics.
   * Example: `source="my-saas-landing"`.
   */
  source?: string;
  /**
   * Fired when the iframe finishes loading. Forwarded.
   */
  onLoad?: React.IframeHTMLAttributes<HTMLIFrameElement>["onLoad"];
}

// With a config, the look is sent only when given: the embed layers the
// config over that look, or over Default without one.
const buildEmbedUrl = (props: Pick<GlobeProps, "look" | "config" | "source">) => {
  const params = new URLSearchParams();
  if (props.config) {
    if (props.look) params.set("look", props.look);
    params.set("c", props.config);
  } else {
    params.set("look", props.look ?? "halftone");
  }
  if (props.source) params.set("source", props.source);
  return `${SITE_URL}/embed?${params.toString()}`;
};

/**
 * <Globe />: the embed component.
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
 * URL-building helpers with the same logic `<Globe />` uses, for when
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
