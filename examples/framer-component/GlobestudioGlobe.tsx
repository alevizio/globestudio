// Globestudio Framer code component (reference implementation).
//
// Paste into your Framer project at File → Insert → Code Component →
// New Code Component, name it "GlobestudioGlobe", replace the contents
// with this file's source.
//
// Iframe-bridged variant (Path B from the integrations research): the
// component is a thin wrapper around the hosted /embed route. Zero
// Three.js dependency at the Framer side, full feature parity with the
// hosted app, ships in ~50 lines. See
// docs/research/2026-05-framer-code-component.md for the design rationale
// and the alternative paths (native code component with bundled Three.js,
// slim-runtime).

import { addPropertyControls, ControlType, useIsStaticRenderer } from "framer"
import { useMemo } from "react"

type Look =
  | "default"
  | "halftone"
  | "risograph"
  | "newsprint"
  | "aurora"
  | "pixel"
  | "bayer"
  | "iridescent"
  | "atkinson"
  | "wireframe"
  | "crt"
  | "glitch"
  | "badtv"
  | "bloom"
  | "metal"
  | "pencil"
  | "corrupt"

interface Props {
  look: Look
  density: number
  dotColor: string
  worldFill: string
  renderMode: "dots" | "solid"
  motion: number
  enableAutoSpin: boolean
  selection: string
  background: string
  transparent: boolean
}

// Build the Globestudio embed URL from the current prop values. Strips the
// leading "#" from colors because the embed route expects hex without it.
const buildEmbedUrl = (props: Props, isStatic: boolean): string => {
  const params = new URLSearchParams()
  params.set("look", props.look)
  params.set("density", String(props.density))
  params.set("dotColor", props.dotColor.replace(/^#/, ""))
  params.set("worldFill", props.worldFill.replace(/^#/, ""))
  params.set("renderMode", props.renderMode)
  params.set("motion", String(props.motion))
  params.set("autoSpin", props.enableAutoSpin ? "1" : "0")
  params.set("selection", props.selection)
  if (props.background) params.set("background", props.background.replace(/^#/, ""))
  if (props.transparent) params.set("transparent", "1")
  // ?static=1 freezes all motion — used in Framer canvas mode so the
  // static preview doesn't burn frames. The hosted embed honors this.
  if (isStatic) params.set("static", "1")
  params.set("source", "framer")
  return `https://globestudio.app/embed?${params.toString()}`
}

export default function GlobestudioGlobe(props: Props) {
  // True in Framer's canvas (the editor) and in static export contexts.
  // We freeze motion in those modes so the canvas doesn't render an
  // animated globe behind every component instance.
  const isStatic = useIsStaticRenderer()
  const src = useMemo(() => buildEmbedUrl(props, isStatic), [props, isStatic])

  return (
    <iframe
      src={src}
      style={{
        width: "100%",
        height: "100%",
        border: 0,
        display: "block",
      }}
      title="Globestudio dotted globe"
      loading={isStatic ? "lazy" : "eager"}
      // Allow framer to load this on any origin — production embed already
      // sets frame-ancestors *.
      allow="autoplay"
    />
  )
}

// Default-when-dropped-on-canvas. Framer reads this for first render.
GlobestudioGlobe.defaultProps = {
  look: "default",
  density: 40,
  dotColor: "#ffffff",
  worldFill: "#5a5a64",
  renderMode: "dots",
  motion: 35,
  enableAutoSpin: true,
  selection: "world",
  background: "#0a0a0a",
  transparent: false,
}

// Property controls — the designer-facing UI in Framer's right panel.
// Each entry maps a prop to a control type. Conditional `hidden()`
// callbacks expand controls only when relevant (e.g. transparency is
// only meaningful when background is set).
addPropertyControls(GlobestudioGlobe, {
  look: {
    type: ControlType.Enum,
    title: "Look",
    defaultValue: "default",
    options: [
      "default",
      "halftone",
      "risograph",
      "newsprint",
      "aurora",
      "pixel",
      "bayer",
      "iridescent",
      "atkinson",
      "wireframe",
      "crt",
      "glitch",
      "badtv",
      "bloom",
      "metal",
      "pencil",
      "corrupt",
    ],
    optionTitles: [
      "Default",
      "Halftone",
      "Risograph",
      "Newsprint",
      "Aurora",
      "Pixel",
      "Bayer",
      "Iridescent",
      "Atkinson",
      "Wireframe",
      "CRT",
      "Glitch",
      "Bad TV",
      "Bloom",
      "Metal",
      "Pencil",
      "Corrupt",
    ],
  },
  selection: {
    type: ControlType.String,
    title: "Region",
    description: "Use `world`, `country:USA`, `region:Europe`, or `subregion:Southern Europe`.",
    defaultValue: "world",
  },
  renderMode: {
    type: ControlType.Enum,
    title: "Render mode",
    defaultValue: "dots",
    options: ["dots", "solid"],
    optionTitles: ["Dots", "Solid"],
  },
  density: {
    type: ControlType.Number,
    title: "Density",
    min: 10,
    max: 90,
    step: 1,
    defaultValue: 40,
  },
  dotColor: {
    type: ControlType.Color,
    title: "Dot color",
    defaultValue: "#ffffff",
  },
  worldFill: {
    type: ControlType.Color,
    title: "World fill",
    defaultValue: "#5a5a64",
    description: "Continent fill color when render mode is Solid.",
  },
  motion: {
    type: ControlType.Number,
    title: "Motion",
    min: 0,
    max: 100,
    step: 1,
    defaultValue: 35,
    description: "Speed of effect animations. Auto-frozen in canvas mode.",
  },
  enableAutoSpin: {
    type: ControlType.Boolean,
    title: "Auto-spin",
    defaultValue: true,
    description: "Continuous globe rotation. Honors prefers-reduced-motion.",
  },
  background: {
    type: ControlType.Color,
    title: "Background",
    defaultValue: "#0a0a0a",
    hidden(props) {
      return props.transparent
    },
  },
  transparent: {
    type: ControlType.Boolean,
    title: "Transparent BG",
    defaultValue: false,
    description: "Lets the Framer canvas show through behind the globe.",
  },
})
