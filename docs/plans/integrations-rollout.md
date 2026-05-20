# Integrations rollout plan

**Status:** Draft
**Date opened:** 19 May 2026
**Owner:** Alejandro
**Research basis:**
- [`docs/research/2026-05-integrations.md`](../research/2026-05-integrations.md)
- [`docs/research/2026-05-framer-code-component.md`](../research/2026-05-framer-code-component.md)
- [`docs/research/2026-05-webflow-devlink.md`](../research/2026-05-webflow-devlink.md)

## Goal

Make Globestudio available *inside* the tools designers already use —
Framer, Webflow, Figma — without forcing them to leave and re-import.
Treat each integration as a discrete shippable unit; do not block
later phases on earlier ones working.

## Non-goals

- Not building a full design tool. Globestudio is a single aesthetic
  (dotted maps + globes); generalizing kills the brand.
- Not building a 50-layout library to satisfy Webflow's public
  Marketplace gate. Distribution via npm package is fine.
- Not pursuing a Designer App for Webflow (Path B in the Webflow
  research) until proven demand.
- Not building a generic SDK or `.worlddot` portable format until
  multiple integrations validate the shape.

## Phases

Each phase is independently shippable and produces a public artifact.

---

### Phase 0 — Embed route (this week, ~6 hours)

**The foundation everything else builds on.** A single hosted URL
that renders just the canvas, fully driven by query string.

#### Tasks

- [ ] Create `/embed` route alongside the main app. Same React tree,
      but no control panel, no looks bar, no top nav, no GitHub link.
- [ ] Wire query string params:
      `look`, `density`, `dotSize`, `dotColor`, `worldFill`,
      `renderMode`, `selection`, `motion`, `tilt`, `autoSpin`,
      `static` (single-frame mode for Framer canvas).
- [ ] Wire `postMessage` resize protocol — embed reports its desired
      height to the parent so iframe height can adapt.
- [ ] Add `?source=` analytics tag so we can attribute traffic per
      integration (`?source=framer`, `?source=webflow`, `?source=figma`).
- [ ] Lock CORS headers — embed should be iframable from any origin
      (X-Frame-Options omitted, CSP `frame-ancestors *`).
- [ ] Add a tiny fallback: if WebGL is unavailable, render a static
      SVG preview of the look. Don't show a broken canvas.
- [ ] Document the embed URL in README.md as a copy-paste snippet.

#### Acceptance

- Paste `<iframe src="https://globestudio.vercel.app/embed?look=halftone&density=70">` into a CodePen and the dotted halftone globe renders.
- Query-string changes hot-reload the canvas (in-page) and update on a fresh load.
- Embed works on Webflow, Framer, plain HTML.
- Analytics show source attribution for each test embed.

---

### Phase 1 — Webflow story v0 (parallel with Phase 0, ~2 hours after embed lands)

Drop documentation showing Webflow users how to use the embed. No
new code beyond what Phase 0 ships.

#### Tasks

- [ ] Write `docs/integrations/webflow.md` — step-by-step "paste this
      in a Code Embed block" with screenshots.
- [ ] Add a "Use in Webflow" call-out on the Globestudio site.
- [ ] Watch analytics for 2-4 weeks. If `?source=webflow` shows
      meaningful volume, advance to Phase 4.

#### Acceptance

- Documentation page live.
- A Webflow site successfully embeds Globestudio (test internally).
- Analytics tagging works end-to-end.

---

### Phase 2 — Framer code component (1–2 days work, then 14-day review)

The highest-leverage integration per the research. Iframe-bridged
component (Path B from the Framer deep dive) → ships fast, no
Three.js bundling worries.

#### Tasks

- [ ] Create new Framer project, add a code component with the prop
      surface in [`2026-05-framer-code-component.md`](../research/2026-05-framer-code-component.md#property-control-map-for-globestudio).
- [ ] Implement the component as an `<iframe>` pointing at
      `globestudio.vercel.app/embed?` with query string built from
      props. ~50 lines of code.
- [ ] Use `useIsStaticRenderer()` to send `?static=1` when in canvas
      mode — embed honors this by rendering a single still frame.
- [ ] Test in canvas / preview / live modes. Confirm canvas mode
      doesn't trigger autoSpin or expensive animations.
- [ ] Take 3 preview screenshots / a short video clip showing
      different presets.
- [ ] Submit to Framer Marketplace as **free**. Component name:
      "Globestudio Globe". Description: emphasize "interactive dotted
      globe, 11 presets, no setup."
- [ ] Wait 14 days for review.

#### Acceptance

- Component is discoverable in Framer Marketplace.
- Default look renders correctly when dragged onto a Framer canvas.
- Changing the Look enum or Density slider in the right-hand panel
  updates the canvas in real time.
- Static mode (canvas) doesn't burn frames.
- Component description links back to globestudio.vercel.app.

---

### Phase 3 — Figma plugin (1–2 weeks, can run parallel to Phase 2 review)

"Export from Globestudio → into Figma frame" plugin. Uses the
`figma.createImage()` flow documented in the research. No SDK
extraction needed — the plugin embeds the same Globestudio iframe in
its UI panel.

#### Tasks

- [ ] Scaffold Figma plugin via Figma's Plugin Quickstart. Manifest
      with `editorType: ["figma"]`, network access whitelist
      `globestudio.vercel.app`.
- [ ] Plugin UI: an iframe pointing at
      `globestudio.vercel.app/embed?plugin=figma` — the embed shows
      basic preset picker + density slider; on "Insert", the embed
      captures the canvas at 2x and `postMessage`s the PNG bytes
      back to the plugin.
- [ ] Plugin code: receives bytes, calls `figma.createImage(bytes)`,
      creates a frame with that image as fill, places it at the
      cursor.
- [ ] Add "Update selected" command — re-render in place when the
      user has an existing Globestudio-generated frame selected.
- [ ] Test free-tier plugin permissions (no payment integration).
- [ ] Submit to Figma Community.

#### Acceptance

- Plugin opens, shows globe inside the panel.
- Insert places a static dotted-globe image at the cursor.
- Update re-generates the image with new parameters in place.
- Plugin manifest passes Figma's review.

---

### Phase 4 — Webflow Code Component v1 (gated on Phase 1 analytics)

**Only ship this if Phase 1 analytics show meaningful Webflow
traffic.** Per the Webflow research, Marketplace distribution is
gated behind 50-layout minimums, so distribution is npm package +
DevLink workspace install. Worth doing only if there's a real
audience.

#### Tasks (gated)

- [ ] Scaffold `@globestudio/webflow-component` as a separate npm
      package in the repo monorepo (or sibling repo).
- [ ] Implement `WorldGlobe.tsx` + `WorldGlobe.webflow.tsx` per the
      [Webflow research's API map](../research/2026-05-webflow-devlink.md#component-shape).
- [ ] Confirm SSR works (no `window` references at top level, Three.js
      gated behind `useEffect`).
- [ ] Run `webflow devlink import` to test in our own Workspace.
- [ ] Document the install flow (`npm install`, `webflow devlink
      import`, designer opens Libraries panel) in
      `docs/integrations/webflow.md`.
- [ ] Publish package to npm with versioning aligned to the main repo.

#### Acceptance

- A Webflow CMS-plan user can run two commands and have Globestudio
  components in their Libraries panel.
- Component renders SSR-clean (no hydration errors).
- Props match the Framer component's surface as closely as Webflow's
  prop types allow.

---

### Phase 5 — `.worlddot` portable format spec (background, no deadline)

**Long-term play.** Define a single JSON schema that any tool can
render, plus a `@globestudio/player` JS runtime that mounts a `.worlddot`
file into any DOM element. Models after `.lottie`.

This is exploratory until we have multiple integrations actually
shipping. The state shape in `look-presets.js` + `globe-settings.js`
is 95% of what we need.

#### Tasks (exploratory)

- [ ] Sketch the schema: `version`, `look`, `density`, `dotSize`,
      `dotColor`, `worldFill`, `selection`, `shaderSettings`,
      `globeSettings`, `spaceSettings`.
- [ ] Versioning rules: semver, with `version: "1.0.0"` baked in
      every file. Player rejects unknown major versions.
- [ ] Compression: investigate dotLottie's gzip+container approach.
- [ ] Prototype `@globestudio/player`: a 50KB JS runtime that takes
      a `.worlddot` + DOM element + (optional) config overrides and
      renders. Internally just instantiates the existing canvas code.

#### Acceptance (eventual)

- Open spec doc in `docs/spec/worlddot-file-format.md`.
- Reference player implementation in `packages/player/`.
- All existing integrations (Framer, Figma, Webflow) can ingest a
  `.worlddot` file as an alternative input.

---

## Open questions

- **Pricing.** All integrations are free in v1. When (if ever) do we
  add paid tiers? Plausible candidates: high-res Figma exports, vector
  SVG export, custom shape upload via the plugin/component. Decide
  when one integration crosses 1,000 active users.
- **Analytics infrastructure.** The `?source=` tags assume we have
  analytics on the embed route. Current Globestudio site likely uses
  Vercel Analytics — confirm it captures query params.
- **Webflow App (Path B).** When does it become worthwhile? Probably
  when Webflow embed traffic exceeds ~5% of total, AND we have
  someone willing to learn the Webflow Designer Extension API. Not
  a fast lift.
- **iOS Safari / mobile WebGL compatibility.** Untested. Worth a
  separate research pass before integrations go wide — embedded
  iframes hit mobile a lot.
- **Cold-start latency for the iframe approach.** Vercel cold-start
  + Three.js parse is ~800ms. Worth measuring. If it's too slow,
  prefetch the embed URL via `<link rel="prefetch">` in the host
  document.

## Status log

> Append-only. Newer entries at the top.

- **2026-05-19** — Plan drafted from research. No code yet.
