# Changelog

All notable changes to Globestudio are tracked here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versioning follows
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Open-source community files: `LICENSE` (MIT), `CONTRIBUTING.md`,
  `CODE_OF_CONDUCT.md`, `SECURITY.md`, `SUPPORT.md`, `GOVERNANCE.md`,
  `ROADMAP.md`
- GitHub issue templates (bug, feature, performance, preset submission) and
  a pull request template
- Designer-first README rewrite
- `SoftwareApplication` JSON-LD structured data and tightened SEO meta on the
  homepage
- `public/schema/look-preset.json` — public JSON Schema for community
  preset submissions, plus a CI test (`src/data/look-presets.test.js`)
  that validates every shipped preset against it. Locks the
  `look-presets.js` shape so PRs can't drift from the documented contract
- `NOTICE.md` — third-party attribution for Pixelarticons (MIT) and the
  geographic atlases the tool depends on. Required by the MIT license
  of those bundled assets
- `docs/performance.md` — documents the v1 runtime floor (60fps desktop,
  30fps mobile) and the per-chunk bundle-size budget
- `scripts/check-bundle-size.js` — enforces per-chunk gzip + raw budgets
  against the dist build; surfaces unbudgeted chunks so new bloat can't
  slip in unwatched. Wired up as `npm run check:bundle`
- `.github/workflows/ci.yml` — runs tests + build + bundle-budget gate
  on every PR and push to main, plus a Lighthouse CI job that asserts
  LCP ≤ 2.5s, CLS ≤ 0.1, performance ≥ 0.85, accessibility ≥ 0.95
- `.lighthouserc.json` — Lighthouse CI config (desktop preset, 3 runs)
- **Toon** and **Threshold** presets — catalog goes from 17 → 19 shipped
  looks. Toon is a cel-shaded pop-art pass on cyan dots; Threshold is
  the editorial-minimalism two-tone binary look
- **Cmd+K command palette** — Linear / Stripe / Vercel-style search-driven
  action menu covering all 19 presets + shuffle / reset / view toggle /
  panel / export / shortcuts. Fuzzy match, arrow-key nav. Preset rows
  carry a `LookPreview` thumbnail. (`src/components/command-palette.jsx`)
- **First-visit onboarding hint** (`src/components/onboarding-hint.jsx`)
  — pill at top-center surfacing "Press S to shuffle · [ ] to cycle" on
  first visit, dismissed on any interaction or after 12 s, persisted
  via `globestudio:hasSeenOnboarding`
- **`/docs` route** (`src/components/docs-page.jsx`) — single-page docs
  with the iframe / React / script-tag embed snippets, share-URL
  explainer, full keyboard-shortcut table, preset catalog grid, and
  schema references
- **`/brand` press kit** (`src/components/brand-page.jsx`) — logo card
  (dark + light bg), OG card thumbnails with download links, palette
  swatches, taglines, contact links — for journalists + bloggers
  covering the launch
- **`/404` catch-all** (`src/components/not-found-page.jsx`) — centered
  takeover for unknown routes with `noindex,follow` meta and four
  jump-back links (home / docs / brand / try-a-preset)
- `usePrefetchHeavyChunks` (`src/hooks/use-prefetch-heavy-chunks.js`) —
  on the first user-intent event, schedules an idle-callback prefetch
  for `countries-50m` / `states-10m` atlases and the `globe-background`
  module so the toggle / picker swap feels instant
- App.jsx mount smoke test (`src/__tests__/app-smoke.test.jsx`) — catches
  TDZ-style first-render crashes that build + lint would miss
- Brand-icon ripple on preset apply (scale pulse + expanding accent ring)
- Globe canvas entrance animation: 780 ms blur(8 → 0) + opacity fade
  when the lazy `GlobeBackground` resolves
- Coordinated panel slide-in 120 ms after the canvas entrance starts
- Preset crossfade: applying a preset fades the canvas opacity 1 → 0.4
  → 1 over 460 ms so the swap reads as a deliberate transition
- Looks-bar hover lift + accent ring + sheen sweep on the current chip
- Modal frosted-glass: backdrop wash + card-only `backdrop-filter`
  blur (28 / 36 px), card opacity 0.62 so the blur reads against the
  live canvas behind
- Export modal: sliding tab indicator (CSS vars driven by refs) + body
  content cross-fade on each tab switch
- About overlay: large left-aligned `DottedGlobe` logo at the top of
  the body; in-app links to `/docs` and `/brand`

### Changed

- `src/components/icons.jsx` header comment now credits Pixelarticons
  (Gerrit Halfmann, MIT) directly instead of the prior iconjar mirror URL
- Tightened the homepage FAQ JSON-LD and the `svg-country-pack` example
  README: MIT requires preserving `LICENSE` + `NOTICE` when redistributing
  source/builds. The exported PNG/SVG/WebM/JSON artifacts remain
  attribution-free
- Modal backdrop wash removed; cards drop to 0.62 alpha so the
  `backdrop-filter` blur reads against the canvas behind
- `cssMinify: false` in `vite.config.js` — the build's CSS minifier was
  dropping `-webkit-backdrop-filter` / `backdrop-filter` pairs as
  duplicates, breaking the frosted-glass effect across browsers (Chrome
  / Firefox / Edge need unprefixed, Safari 15–17 needs the prefix)
- Ambient mode merged into panel-collapsed state — collapsing the
  panel (`H`) now hides the looks bar, view-mode switch, zoom controls,
  and social links alongside it. The dedicated `B` shortcut, Maximize
  button, and exit chip were removed
- `.looks-bar` overflow switched to `overflow-y: clip` +
  `overflow-clip-margin: 24px` so the chip's hover shadow renders
  past the bar's vertical bounds without being truncated

### Refactored

- App.jsx down 1545 → 1290 lines (-255, -16.5%). Six hooks extracted
  to `src/hooks/`: `use-route-look`, `use-share-config-import`,
  `use-us-states-loader`, `use-sheet-drag`, `use-trackpad-zoom`,
  `use-keyboard-shortcuts`. URL + SEO + meta side-effects pulled out
  of `applyLook` into `src/utils/preset-route.js`

### Fixed

- TDZ on first render: `useRouteLook(applyLook)` and
  `useShareConfigImport(importConfig, …)` were called before their
  arguments were declared. Hook calls moved below their dependencies;
  smoke test (`src/__tests__/app-smoke.test.jsx`) guards against
  the class of bug going forward
- Color-picker hue + alpha thumbs no longer extend past the track's
  rounded corners at value extremes (input inset by half the thumb
  width on each side)
- Control-rail bottom padding bumped from 10 → 18 px so focus outlines
  + native hover shadows don't get clipped against the rail's inner edge

---

## Recent product history

The version history below is reconstructed from `main` commits. Versions are
inferred — earlier work didn't carry version tags.

### Solid mode upgrades

- Solid render now honors the area selection (was always rendering the full
  world atlas regardless of dropdown)
- Visibility toggles for Land and Stroke
- Stroke width slider (0.1–8 px)
- Linear gradient + per-stop opacity on Land and Stroke
- Canvas2D gradient sampler shares math with the dot-color sampler, so the
  same angle reads identically on the solid sphere and the dot field

### Color picker rebuild

- Draggable card layout with grip handle (GripVertical), title, and close button
- Side-positioning relative to the swatch via React portal so the panel's
  `backdrop-filter` doesn't capture `position: fixed`
- HEX / RGB / HSB / HSL mode tabs styled to match the Flat/Globe toggle
- Solid / Gradient fill toggle
- Linear gradient editor with on-track stops, angle slider, and live preview
  that rotates with the angle
- Per-stop opacity slider with checkerboard backdrop
- Scrollable body when content overflows the viewport
- JetBrains Mono for hex codes and numeric readouts

### Dot rendering

- Position-based linear gradients for dot color (each dot picks its color
  by projecting its `(x, y)` onto the angle vector)
- "Vary size" toggle gating the per-instance ±18% size jitter (off by default)
- "Animate rotation" toggle (~30°/s, gated by `prefers-reduced-motion`)
- Custom dot shape via SVG/PNG upload or pasted SVG markup, sanitized and
  rasterized to a Three.js CanvasTexture

### Panel UX

- Map area is a single dropdown (no nested expand-collapse)
- "Show map" toggle replaces the old "Dots" label
- Wider toggle pill (40×18 with adjusted knob travel)
- Mouse-following tooltip on panel-header actions and social links
- Improved toggle contrast (dark track + dim knob OFF, accent track + dark
  knob ON)
- Section title breathing room (`.option-content` padding 6 → 14)

### Earlier polish (pre-launch report)

- Searchable country picker for 250+ areas
- Full keyboard system + `?` help overlay + key-hint toast
- Solid mode network arcs split into sub-toggles
- Looks bar with scroll-aware edge fades + auto-scroll on shuffle
- Export modal with PNG/SVG/WebM tabs and shareable look URLs
- DottedGlobe brand mark mirroring the favicon

---

Releases tagged on GitHub will populate this file going forward. Until then,
treat the **Unreleased** section as the source of truth.
