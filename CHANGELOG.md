# Changelog

All notable changes to Globestudio are tracked here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versioning follows
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

Nothing yet.

## [1.0.0] - 2026-09-28

The first public release. This section sums up everything that ships in
1.0.0; the detailed May 2026 notes further down are part of it too.

### Added

- **21 looks**: Default, Halftone, Risograph, Newsprint, Aurora, Pixel,
  Bayer, Atkinson, Wireframe, CRT, Glitch, Bad TV, Bloom, Metal, Iridescent,
  Pencil, Corrupt, Toon, Threshold, Vapor, Topographic. Each applies at most
  one of 24 WebGL shader effects.
- **Exports**: PNG at 1x to 4x, SVG with clean vector dots (6 effects
  approximated with SVG filters), WebM, MP4 (where the browser supports it),
  GIF, JSON config with `$schema`, and "Copy as React".
- **Your own data**: paste `lat,lng,value` or `country,value` lines to plot
  markers sized by value, optionally joined by arcs.
- **Solid mode**: rivers and cities overlays, pasted GeoJSON lines and
  points, and 5 flat projections (Mercator, Equal Earth, Natural Earth,
  Winkel Tripel, Robinson). Dotted maps use Mercator.
- Country search in English, Spanish, French, German, Chinese, Arabic, and
  Portuguese.
- **Globestudio everywhere**: the `/embed` route and `embed.js` script tag,
  `@globestudio/react`, the `@globestudio/element` web component, the Figma
  plugin, a WordPress block and `[globestudio]` shortcode (manual install),
  the `@globestudio/mcp` MCP server, and `/integrations` with copy-paste
  recipes per platform.
- **Site**: `/gallery`, `/examples`, `/compare/cobe`, `/compare/geolayers`,
  per-route prerendered `<head>` tags, a sitemap generated from the preset
  list, `llms.txt` and `llms-full.txt`, and a robots.txt that welcomes AI
  crawlers.
- A root error boundary with a visible fallback, and a `client_error`
  analytics event for render crashes and lost WebGL contexts (disclosed on
  `/privacy`).
- A tab that loads a chunk from an older deploy reloads once instead of
  breaking.
- **Figma plugin**: the full studio runs inside the plugin, with every look
  and control. Insert places an image at the crop and quality you pick, or
  the flat map as editable vector dots, and a click on one of the file's
  color variables sets the dot color.
- `favicon.ico`, `apple-touch-icon.png`, and a shared footer that links
  `/gallery` and the compare pages.
- **Use with AI**: the Share tab copies a ready-to-paste prompt for any
  agent, and shows how to connect Claude, Codex and Cursor. The MCP server is
  hosted at `https://globestudio.app/mcp` (streamable HTTP, no install), and
  `@globestudio/mcp` 0.2.0 adds `read_share_url` so an agent can open a link
  you paste, change it, and hand back a new one.
- **Transparent backgrounds**: Background is Solid, Space or Transparent,
  with a checkerboard that follows the UI theme. PNG, SVG and WebM keep the
  transparency, GIF keeps it with hard edges, and MP4 says it can't.
  `/embed?background=transparent` works.
- **Data section**: pasted data points have their own section with an eye
  that hides the markers and arcs without clearing them.
- The studio panel links every page of the site.

### Changed

- The pre-launch teaser is on only when `VITE_TEASER` is `"1"`; unset and
  `"0"` both serve the studio.
- `/embed` sends an `X-Robots-Tag: noindex` header, hashed `/assets/` files
  are cached for a year, and missing chunks return a real 404 instead of the
  app shell.
- CI builds and tests the npm packages, and Lighthouse CI audits the studio
  instead of the teaser.
- The home descriptions, structured data, the web manifest and `llms.txt`
  name every export format (PNG, SVG, WebM, MP4, GIF, JSON, embed) and all
  21 looks, and the home page's list of looks is built from the presets.
- New share cards for every look, each under 300 KB and served with
  `?v=2`. Every prerendered route has its own `twitter:description` and
  image alt text.
- `/privacy` covers the launch waitlist, the analytics events that fire,
  and the font CDNs.
- `/examples` uses made-up logos and Inter.
- The Video tab no longer shows Aspect, Quality and size controls, which
  never changed the recording.
- Analytics loads on every page except `/embed`.
- Look chips use downsampled thumbnails: smooth at every screen density,
  72 KB for the whole bar instead of 3.5 MB.
- Phones: the globe stays whole above the controls, the sheet has two
  heights (looks only, or options at about half the screen), and Flat/Globe
  and Export sit in a top bar. The page no longer scrolls behind the editor, the sheet drags
  without re-rendering the app and a tap on its grabber opens or closes it,
  landscape phones get the phone layout, tap targets are 44 px, and the
  notch and home indicator are respected.
- Exports use the background the preview shows, including the light
  theme's cream.
- Every page ships its own content in the HTML for crawlers that don't run
  JavaScript, unknown URLs return a real 404, duplicate URLs redirect to
  the canonical one, and subpages carry breadcrumbs.
- Shipped CSS drops its comments, 60 KB lighter.
- Lighter on the GPU: with Animations off or reduced motion the globe draws
  no frames, the glow halo is skipped where it can't show, and the space
  background skips empty star cells. Every look renders exactly as before.
- README, ROADMAP, and launch docs rewritten to match what ships.

### Fixed

- Share links keep every setting when a value contains `%` (custom SVG dot
  shapes, `%` as the symbol); they used to lose all of them. Links made
  before the fix open exactly as before.
- Data points loaded from a share link or a JSON file show up in the paste
  box instead of being overwritten by the next edit.
- With a Solid background, WebM, GIF and MP4 exports use its color, and
  share links keep the Transparent style.
- A `/looks/<id>` link shows its look in the looks bar, even late in the list.
- Picking a country, continent or state turns the globe to face it, from the
  panel, a share link or an agent; before, a place on the far side looked empty.
- Shader-on-background composite paints instead of sampling transparent
  black in every "Skip" state.
- PNG export composites the solid background and honors aspect and size.
- Share links carry view mode, rivers, and cities.
- Embed params clamp to the studio's ranges, and `?background=` works.
- MCP share and embed URLs decode in the app, checked by a contract test.
- Mobile: the looks bar shows in the collapsed-sheet peek, and iOS no
  longer zooms on focus.
- Off-screen shader backdrops pause, and animated chrome respects
  `prefers-reduced-motion`.
- Shader effects, Glitch, Bad TV and Aurora included, hold still under
  `prefers-reduced-motion`.
- Phones: the collapsed control sheet stays in the accessibility tree,
  Export PNG stays on screen in an opaque export dialog, and the canvas
  halo is skipped on DPR 3 and touch screens, where it could blank the
  globe.
- Keyboard and screen readers: faded-out controls leave the Tab order,
  region picks are announced by name, focus returns to the country picker
  after a keyboard pick, and the compare table has a name and scrolls with
  the keyboard.
- Exports: hi-res PNGs keep the preview's pattern size. A failed PNG or
  video export shows a message and sends `client_error`, an empty WebM or
  MP4 no longer downloads, and MP4 is offered only where H.264 encoding
  works. A bad or unreadable config file shows an import message.
- Share links keep all 5 flat projections, and the config schema lists
  the right projection ids.
- The Metal look's blurb is no longer cut off.

## Pre-1.0 detail (May 2026, part of 1.0.0)

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
- Modal frosted-glass: card-only `backdrop-filter`
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
  and native hover shadows don't get clipped against the rail's inner edge

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

Releases are tagged on GitHub starting with `v1.0.0`. New work goes under
**Unreleased** until the next tag.
