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

### Changed

- `src/components/icons.jsx` header comment now credits Pixelarticons
  (Gerrit Halfmann, MIT) directly instead of the prior iconjar mirror URL
- Tightened the homepage FAQ JSON-LD and the `svg-country-pack` example
  README: MIT requires preserving `LICENSE` + `NOTICE` when redistributing
  source/builds. The exported PNG/SVG/WebM/JSON artifacts remain
  attribution-free

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
