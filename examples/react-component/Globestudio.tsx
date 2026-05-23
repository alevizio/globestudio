// Globestudio — drop-in React component for Next.js / Vite / Remix /
// any React 18+ tree.
//
// Wraps the hosted /embed route as an iframe, with strongly-typed props
// for every embed param. Auto-resizes height when the host doesn't pin
// one explicitly. SSR-safe — no `window` access at render time, no
// useEffect runs on the server.
//
// Drop this file in directly (copy-paste, no `npm install`), or import
// from your own monorepo. The component is intentionally
// dependency-free: just React.
//
// Usage:
//
//   import { Globestudio } from "./Globestudio";
//
//   <Globestudio
//     look="halftone"
//     density={50}
//     selection="continent:Europe"
//     style={{ width: "100%", height: 480 }}
//   />

import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties, IframeHTMLAttributes } from "react";

export type GlobestudioLook =
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
  | "corrupt";

export type GlobestudioProjection =
  | "mercator"
  | "equirectangular"
  | "equal-earth"
  | "winkel-tripel"
  | "robinson";

export interface GlobestudioProps {
  /** Preset look — 17 options. Default: "default". */
  look?: GlobestudioLook;

  /** Dot density across the visible area. 1–100. Default: 40. */
  density?: number;

  /** Dot radius. Default: 10. */
  dotSize?: number;

  /** Dot color — hex. Default: preset's. */
  dotColor?: string;

  /** Continent fill color (solid mode). Default: preset's. */
  worldFill?: string;

  /** "dots" or "solid". Default: preset's. */
  renderMode?: "dots" | "solid";

  /**
   * Geographic selection. Examples:
   *   - "world"               (default)
   *   - "country:USA"         (3-letter ISO 3166-1 code)
   *   - "continent:Europe"
   *   - "subregion:Western Europe"
   */
  selection?: string;

  /** Animation speed of effects. 0–100. Default: 35. */
  motion?: number;

  /** Globe tilt (degrees). */
  tiltX?: number;
  tiltY?: number;

  /** Continuous globe rotation. Default: true. */
  autoSpin?: boolean;

  /** "flat" or "globe". Default: "globe". */
  view?: "flat" | "globe";

  /** Page background — hex. */
  background?: string;

  /** Transparent background (overrides `background`). */
  transparent?: boolean;

  /**
   * Freeze all motion. Use when rendering server-side or in a Framer
   * canvas — preserves CPU/GPU on inactive surfaces.
   */
  staticMode?: boolean;

  /**
   * Pass a Globestudio share-config token (the blob after `?c=` in a
   * share URL). The shared config layers on top of the other props —
   * any explicit prop wins over a matching field in the shared config.
   */
  shareToken?: string;

  /**
   * Analytics tag — surfaces in Vercel Analytics so traffic from this
   * embed is attributable. Defaults to "react-component".
   */
  source?: string;

  /** Standard React iframe pass-throughs. */
  className?: string;
  style?: CSSProperties;
  title?: string;
  loading?: IframeHTMLAttributes<HTMLIFrameElement>["loading"];

  /** Origin override — if you're self-hosting the embed. */
  origin?: string;
}

const stripHash = (color: string | undefined) =>
  color ? color.replace(/^#/, "") : undefined;

const DEFAULT_ORIGIN = "https://globestudio.app";

const buildSrc = (props: GlobestudioProps): string => {
  const origin = (props.origin ?? DEFAULT_ORIGIN).replace(/\/+$/, "");
  const params = new URLSearchParams();
  if (props.look) params.set("look", props.look);
  if (props.density != null) params.set("density", String(props.density));
  if (props.dotSize != null) params.set("dotSize", String(props.dotSize));
  const dotColor = stripHash(props.dotColor);
  if (dotColor) params.set("dotColor", dotColor);
  const worldFill = stripHash(props.worldFill);
  if (worldFill) params.set("worldFill", worldFill);
  if (props.renderMode) params.set("renderMode", props.renderMode);
  if (props.selection) params.set("selection", props.selection);
  if (props.motion != null) params.set("motion", String(props.motion));
  if (props.tiltX != null) params.set("tiltX", String(props.tiltX));
  if (props.tiltY != null) params.set("tiltY", String(props.tiltY));
  if (props.autoSpin != null) params.set("autoSpin", props.autoSpin ? "1" : "0");
  if (props.view) params.set("view", props.view);
  const background = stripHash(props.background);
  if (background) params.set("background", background);
  if (props.transparent) params.set("transparent", "1");
  if (props.staticMode) params.set("static", "1");
  if (props.shareToken) params.set("c", props.shareToken.replace(/^\??c=/, ""));
  params.set("source", props.source ?? "react-component");
  return `${origin}/embed?${params.toString()}`;
};

export const Globestudio = (props: GlobestudioProps) => {
  const src = useMemo(
    () => buildSrc(props),
    // We want every prop change to rebuild the src — listing them
    // explicitly keeps the dep array stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      props.look, props.density, props.dotSize, props.dotColor, props.worldFill,
      props.renderMode, props.selection, props.motion, props.tiltX, props.tiltY,
      props.autoSpin, props.view, props.background, props.transparent,
      props.staticMode, props.shareToken, props.source, props.origin,
    ],
  );

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const [autoHeight, setAutoHeight] = useState<number | null>(null);
  const hostHasFixedHeight = useMemo(() => {
    const h = props.style?.height;
    return h != null && h !== "auto" && h !== "100%";
  }, [props.style?.height]);

  // Listen for resize messages from the embed and auto-adjust iframe
  // height if the host didn't pin one explicitly. SSR-safe — the
  // effect only runs after mount.
  useEffect(() => {
    if (hostHasFixedHeight) return;
    if (typeof window === "undefined") return;
    const onMessage = (event: MessageEvent) => {
      const data = event.data as { type?: string; height?: number } | undefined;
      if (!data || data.type !== "globestudio-resize") return;
      if (event.source !== iframeRef.current?.contentWindow) return;
      const h = Number(data.height);
      if (!Number.isFinite(h)) return;
      const clamped = Math.max(200, Math.min(1200, Math.round(h)));
      setAutoHeight(clamped);
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [hostHasFixedHeight]);

  return (
    <iframe
      ref={iframeRef}
      src={src}
      title={props.title ?? "Globestudio dotted globe"}
      loading={props.loading ?? "lazy"}
      allow="autoplay"
      className={props.className}
      style={{
        width: "100%",
        height: hostHasFixedHeight ? undefined : autoHeight ?? 420,
        border: 0,
        display: "block",
        colorScheme: "dark",
        ...props.style,
      }}
    />
  );
};

export default Globestudio;
