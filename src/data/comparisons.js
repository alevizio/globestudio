// Factual, neutral comparison content for /compare/:slug landing pages.
// Grounded in the 2026 competitive research. Tone is deliberately fair — each
// page includes an honest "when to use them instead" so it reads as a genuine
// decision aid (which is also what AI assistants cite), not a hit piece.
// Keep claims accurate; if a competitor's pricing/features change, update here.

export const comparisons = {
  cobe: {
    slug: "cobe",
    competitor: "cobe",
    title: "Globestudio vs cobe — dotted globe, no-code vs library",
    metaDescription:
      "cobe is a tiny code-only WebGL globe library. Globestudio is a no-code studio that also exports PNG/SVG/WebM/MP4/GIF and offers a React component, iframe embed, WordPress plugin, Figma plugin, and MCP server. Honest comparison.",
    tagline: "A no-code studio with exports vs. a tiny code-only library.",
    summary:
      "cobe is an excellent ~5 KB, zero-dependency WebGL globe you wire up in JavaScript — it powers the Vercel globe. Globestudio is the layer above: a no-code generator where you design the look in the browser and export it (PNG/SVG/WebM/MP4/GIF or an embed), with a React component, iframe embed, WordPress + Figma plugins, and an MCP server when you do want code. cobe gives you a canvas; Globestudio gives you a deliverable.",
    rows: [
      { dimension: "How you use it", globestudio: "No-code browser studio + optional components", them: "Write JavaScript / React" },
      { dimension: "Output", globestudio: "PNG, SVG, WebM, MP4, GIF, embed, live component", them: "A live canvas in your app" },
      { dimension: "Flat 2D maps", globestudio: "Yes (+ 5 projections)", them: "Globe only" },
      { dimension: "Looks / shaders", globestudio: "Many preset looks + shader effects", them: "One aesthetic, JS-tuned" },
      { dimension: "Data binding", globestudio: "Markers by lat/lng or country code + arcs", them: "Markers/arcs via code" },
      { dimension: "Bundle weight", globestudio: "Heavier (Three.js) — embed/component", them: "~5 KB" },
      { dimension: "License / price", globestudio: "MIT, free, no signup", them: "MIT, free" },
    ],
    whenThem:
      "Reach for cobe when you're a developer who wants the smallest possible dependency, you only need the globe (no flat maps, no export), and you're happy tuning it in code. It's the lightest way to put the globe in a React app.",
    faq: [
      {
        q: "Is Globestudio a cobe alternative?",
        a: "Yes — if you want the dotted-globe look without writing Three.js or cobe code. Globestudio is a no-code studio with exports; cobe is a code library. For a pure code dependency at minimum size, cobe is the better fit.",
      },
      {
        q: "Can Globestudio export an image or video like a static asset?",
        a: "Yes — PNG and SVG for stills, and WebM/MP4/GIF for the rotating loop. cobe renders a live canvas in your app and has no built-in export.",
      },
      { q: "Is Globestudio free?", a: "Yes — it's open source (MIT) and free, with no signup required to export." },
    ],
  },
  geolayers: {
    slug: "geolayers",
    competitor: "GEOlayers",
    title: "Globestudio vs GEOlayers — animated maps in the browser vs After Effects",
    metaDescription:
      "GEOlayers is a paid After Effects plugin for animated cartographic maps. Globestudio makes stylized dotted maps and 3D globes free in the browser and exports WebM/MP4/GIF. Honest comparison.",
    tagline: "Stylized maps in the browser vs. cartographic maps in After Effects.",
    summary:
      "GEOlayers 3 is the dominant pro tool for animated maps inside After Effects — real cartographic data, terrain, labels, and a keyframe timeline. It's a paid license, with basemap data coming from connected map services (e.g. MapTiler). Globestudio is a free, browser-based, no-code tool for the stylized dotted-map / 3D-globe aesthetic that exports WebM/MP4/GIF — no After Effects, no subscription. Different jobs: production cartographic motion vs. a fast, stylized, exportable globe.",
    rows: [
      { dimension: "Where it runs", globestudio: "Browser, no install", them: "Adobe After Effects plugin" },
      { dimension: "Price", globestudio: "Free (MIT, open source)", them: "Paid license + map-data services" },
      { dimension: "Style", globestudio: "Stylized dotted maps + 3D globes, shader looks", them: "Real cartographic basemaps, terrain, labels" },
      { dimension: "Animation control", globestudio: "Rotation, arcs, pulses (no timeline)", them: "Full AE keyframe timeline" },
      { dimension: "Export", globestudio: "WebM/MP4/GIF, PNG/SVG, embed", them: "AE render (ProRes/alpha, broadcast)" },
      { dimension: "Speed to a loop", globestudio: "Seconds, in the browser", them: "An AE project" },
    ],
    whenThem:
      "Use GEOlayers when you need real cartographic accuracy (actual streets, terrain, precise labels), frame-accurate keyframe control, or broadcast-grade output (ProRes/alpha) inside an After Effects pipeline. It's the professional choice for data-driven map sequences in video.",
    faq: [
      {
        q: "Is Globestudio a GEOlayers alternative?",
        a: "For a stylized, animated globe or dotted map you can make in seconds and export as WebM/MP4/GIF — yes, and it's free with no After Effects. For real cartographic maps with terrain, labels, and a keyframe timeline, GEOlayers is the right tool.",
      },
      {
        q: "Can I make an animated globe without After Effects?",
        a: "Yes — Globestudio runs in the browser: pick a look, enable rotation/arcs, and export an MP4, WebM, or GIF. No After Effects needed.",
      },
      { q: "Does Globestudio cost anything?", a: "No — it's open source (MIT) and free; GEOlayers is a paid After Effects plugin." },
    ],
  },
};

export const comparisonSlugs = Object.keys(comparisons);
