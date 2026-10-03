# Changelog

All notable changes to Globestudio are tracked here. Format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versioning follows
[Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Copy image, next to Export PNG. It puts the same PNG on the clipboard,
  with the aspect, size and quality you picked, ready to paste into Figma,
  Slides, Slack or Notion. Browsers that can't write images to the clipboard
  don't show the button.
- A Figma tab in the export dialog, after SVG. Copy as vectors and Copy as
  image put the design on the clipboard to paste into a Figma file, and a
  link opens the Community plugin. The tab is left out on a phone, where the
  tab row has no room for a sixth tab.
- Open in CodePen, under the Share tab's embed code. It opens a new tab with
  a pen that shows the design through the web component, on a page with no
  margin and the design's background.

### Changed

- The Share tab's Copy as React button is now an Embed code section. Pick
  iframe, React or Web component and copy the snippet for the design on
  screen, full width at the height the globe has on screen. A design too large for an embed URL, which takes a custom shape
  file of a few dozen kB or a long list of data points, gets a line saying
  so in place of the code.
- The export dialog has an MCP tab, last in the row. It holds what sat at
  the bottom of the Share tab: the commands that connect Claude, Codex and
  Cursor come first, then Copy for AI. On a phone the tabs share the row, so
  the last one no longer runs past the dialog's edge.
- `/privacy` says `share_clicked` records which share button you used. It
  said the event never records where a share goes, and Open in CodePen is
  counted under its own name.

### Fixed

- A look link that sets only some of the shader, globe, Space or Flow
  settings, as MCP links and hand written links do, keeps the rest of the
  look, in the studio and in embeds. A Sonar link with data points used to
  bring back the glow and grid Sonar turns off, and a link that changed one
  shader setting turned the look's shader off. Links copied from the app
  open as before.
- The config schema at `/schema/config.json` matches what the app reads.
  `shape` takes `Particle Grid`, the effect list has `ascii`, and
  `viewMode`, the `warp` knob, `dotLift`, `gridLift`, `gridSize`, `routes`,
  `routesStrength`, gradient opacities and the custom shape's fields are
  documented. It no longer lists `preset`, which the app never read, or
  `rotateAnimating`, which it stopped reading when shape rotation became a
  single speed slider, or requires `version`. A test now checks the schema
  against the parser key by key.
- A link can name a US state by its postal code (`CA`) as well as by the
  FIPS code the studio stores (`06`). A state the app doesn't know is
  dropped, where the studio used to show Alabama, the first state in its
  list. Embeds draw the state a config names, as the studio does, where
  they showed the whole country. The MCP server reads states the same way;
  `@globestudio/mcp` 0.2.1 needs an npm publish for local installs.
- `<Globe look config>` from `@globestudio/react` and `<globe-studio look
  config>` from `@globestudio/element` layer the config over the look you
  name. They dropped the look whenever a config was set, so a config that
  holds only changes, like the `c` of an MCP look link, embedded over
  Default. A config alone still embeds over Default. `@globestudio/react`
  0.1.1 and `@globestudio/element` 0.1.1 need an npm publish.
- The MCP server describes each look in the app's words: `list_presets`
  and `find_presets` return the names and one line blurbs the studio shows
  (Bloom was "Soft glowing aurora"), and `find_presets` matches every tag
  the studio's command palette searches by. In `@globestudio/mcp` 0.2.1.
- `llms-full.txt` no longer lists Antarctica, which the app doesn't offer
  as a continent. It and the config schema now say that an embed address
  must stay under 32,000 characters and that a config keeps at most 250
  data points.
- An embed that gets only a share config, which is all `@globestudio/react`
  and `@globestudio/element` send, shows the config's Flat view and its
  Solid background color. It used to show a globe on the default dark page
  unless the address also had `view` and `background`.
- An embed draws more of its share config: a design with its animations off
  holds still, a custom shape shows in place of squares, and dot and land
  opacity, gradients, hidden dots or land, outline width, the flat
  projection, rivers, cities and depth match the studio.
- In the export dialog, focus stays on Copy SVG, Copy as vectors and Export
  PNG after you press them, so the next Tab goes on from there. It used to
  jump back to the dialog itself. The other dialogs get the same fix.
- A code block's Copy button says Copy failed for a moment when the browser
  refuses the clipboard, where it used to stay on Copy. A screen reader hears
  the result of each copy.
- Picking a look changes the styling only: the region you chose and the
  data you pasted stay. A `/looks/<id>` link keeps a returning visitor's
  saved region and data too; a first visit still opens on World.
- Share links, JSON imports and the MCP server keep a custom glow color.
  The `/examples` globes now show the glow colors their configs set, and
  the config schema documents `glowColor`.
- Screen readers name the view switch "Flat view" and "Globe view", apart
  from the Globe panel section.
- A PNG exported during the Flat/Globe switch waits for it to land and
  saves the settled view. A double click on Export PNG no longer leaves the
  preview rendering at the export's resolution.
- In Solid mode with a region picked, rivers, cities and pasted GeoJSON
  stay on that region's land on the globe, on the flat map and in PNG
  exports. They used to show for the whole world.
- The studio runs faster on computers that draw the globe in software,
  such as an old laptop without a working graphics driver, or below 12 fps.
  It turns off the glow halo around the globe, previews at one device pixel
  and says so in a notice that can turn the effects back on. Designs and
  share links are unchanged.
- Bad TV's static is about a third as strong, so the map shows through it.
  It used to cover the whole globe.
- Topographic is now called Sonar, which is what it looks like. Its address
  stays /looks/topographic, so links and embeds keep working.
- On a tablet or a narrow laptop window, the globe sits in the space beside
  the open panel, and so do the Flat/Globe switch, the keyboard hint and the
  zoom buttons. The panel used to cover part of the globe, the switch or the
  hint covered the panel's Export button, and the bug report icon sat on the
  panel's last rows. Phones and windows 1280 px and wider are unchanged.
- In the export dialog the arrow keys, Home and End move focus along with
  the selected tab. Focus used to stay on the tab you started from.

## [1.0.0] - 2026-09-28

The first public release. This section sums up everything that ships in
1.0.0; the detailed May 2026 notes further down are part of it too.

### Added

- 21 looks: Default, Halftone, Risograph, Newsprint, Aurora, Pixel,
  Bayer, Atkinson, Wireframe, CRT, Glitch, Bad TV, Bloom, Metal, Iridescent,
  Pencil, Corrupt, Toon, Threshold, Vapor, Topographic. Each applies at most
  one of 24 WebGL shader effects.
- Exports: PNG at 1x to 4x, SVG with clean vector dots (6 effects
  approximated with SVG filters), WebM, MP4 (where the browser supports it),
  GIF, JSON config with `$schema`, and "Copy as React".
- Your own data: paste `lat,lng,value` or `country,value` lines to plot
  markers sized by value, optionally joined by arcs.
- Solid mode: rivers and cities overlays, pasted GeoJSON lines and
  points, and 5 flat projections (Mercator, Equal Earth, Natural Earth,
  Winkel Tripel, Robinson). Dotted maps use Mercator.
- Country search in English, Spanish, French, German, Chinese, Arabic, and
  Portuguese.
- Embeds and integrations: the `/embed` route and `embed.js` script tag,
  `@globestudio/react`, the `@globestudio/element` web component, the Figma
  plugin, a WordPress block and `[globestudio]` shortcode (manual install),
  the `@globestudio/mcp` MCP server, and `/integrations` with copy-paste
  recipes per platform.
- Site: `/gallery`, `/examples`, `/compare/cobe`, `/compare/geolayers`,
  per-route prerendered `<head>` tags, a sitemap generated from the preset
  list, `llms.txt` and `llms-full.txt`, and a robots.txt that allows AI
  crawlers.
- A root error boundary with a visible fallback, and a `client_error`
  analytics event for render crashes and lost WebGL contexts (disclosed on
  `/privacy`).
- A tab that loads a chunk from an older deploy reloads once instead of
  breaking.
- Figma plugin: the full studio runs inside the plugin, with every look
  and control. Insert places an image at the crop and quality you pick, or
  the flat map as editable vector dots, and a click on one of the file's
  color variables sets the dot color.
- `favicon.ico`, `apple-touch-icon.png`, and a shared footer that links
  `/gallery` and the compare pages.
- Use with AI: the Share tab copies a ready-to-paste prompt for any
  agent, and shows how to connect Claude, Codex and Cursor. The MCP server is
  hosted at `https://globestudio.app/mcp` (streamable HTTP, no install), and
  `@globestudio/mcp` 0.2.0 adds `read_share_url` so an agent can open a link
  you paste, change it, and hand back a new one.
- Transparent backgrounds: Background is Solid, Space or Transparent,
  with a checkerboard that follows the UI theme. PNG, SVG and WebM keep the
  transparency, GIF keeps it with hard edges, and MP4 says it can't.
  `/embed?background=transparent` works.
- Data section: pasted data points have their own section with an eye
  that hides the markers and arcs without clearing them.

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
- README rewritten for designers
- `SoftwareApplication` JSON-LD structured data and tightened SEO meta on the
  homepage
- `public/schema/look-preset.json`: a public JSON Schema for community
  preset submissions, plus a CI test (`src/data/look-presets.test.js`)
  that validates every shipped preset against it. It locks the
  `look-presets.js` shape so PRs can't drift from the documented contract
- `NOTICE.md`: third-party attribution for Pixelarticons (MIT) and the
  geographic atlases the tool depends on, as the MIT license of those
  bundled assets requires
- `docs/performance.md`: documents the v1 runtime floor (60fps desktop,
  30fps mobile) and the per-chunk bundle-size budget
- `scripts/check-bundle-size.js`: enforces per-chunk gzip and raw budgets
  against the dist build, and lists chunks that have no budget so new bloat
  gets noticed. Runs as `npm run check:bundle`
- `.github/workflows/ci.yml`: runs the tests, the build and the bundle-budget
  check on every PR and push to main, plus a Lighthouse CI job that asserts
  LCP ≤ 2.5s, CLS ≤ 0.1, performance ≥ 0.85, accessibility ≥ 0.95
- `.lighthouserc.json`: Lighthouse CI config (desktop preset, 3 runs)
- Toon and Threshold presets, taking the catalog from 17 to 19 shipped
  looks. Toon is a cel-shaded pop-art pass on cyan dots; Threshold is
  a two-tone binary look
- Cmd+K command palette: a search-driven action menu in the style of
  Linear, Stripe and Vercel, covering all 19 presets plus shuffle, reset,
  view toggle, panel, export and shortcuts. It has fuzzy matching and arrow-key
  navigation, and preset rows carry a `LookPreview` thumbnail.
  (`src/components/command-palette.jsx`)
- First-visit onboarding hint (`src/components/onboarding-hint.jsx`):
  a pill at top center that shows "Press S to shuffle · [ ] to cycle" on
  the first visit. It goes away on any interaction or after 12 s, and is
  remembered via `globestudio:hasSeenOnboarding`
- `/docs` route (`src/components/docs-page.jsx`): single-page docs
  with the iframe, React and script-tag embed snippets, a share-URL
  explainer, the full keyboard-shortcut table, a preset catalog grid and
  schema references
- `/brand` press kit (`src/components/brand-page.jsx`) for journalists
  and bloggers covering the launch: a logo card (dark and light
  backgrounds), OG card thumbnails with download links, palette swatches,
  taglines and contact links
- `/404` catch-all (`src/components/not-found-page.jsx`): a centered
  page for unknown routes with `noindex,follow` meta and four
  links back (home, docs, brand, try a preset)
- `usePrefetchHeavyChunks` (`src/hooks/use-prefetch-heavy-chunks.js`):
  on the first user-intent event, schedules an idle-callback prefetch
  of the `countries-50m` and `states-10m` atlases and the `globe-background`
  module, so the toggle and picker swaps feel instant
- App.jsx mount smoke test (`src/__tests__/app-smoke.test.jsx`): catches
  TDZ-style first-render crashes that the build and lint would miss
- Brand-icon ripple on preset apply (a scale pulse and an expanding accent ring)
- Globe canvas entrance animation: 780 ms blur(8 → 0) + opacity fade
  when the lazy `GlobeBackground` resolves
- Coordinated panel slide-in 120 ms after the canvas entrance starts
- Preset crossfade: applying a preset fades the canvas opacity 1 → 0.4
  → 1 over 460 ms so the swap reads as a deliberate transition
- Looks-bar hover lift, accent ring and sheen sweep on the current chip
- Modal frosted-glass: card-only `backdrop-filter`
  blur (28 / 36 px), card opacity 0.62 so the blur reads against the
  live canvas behind
- Export modal: sliding tab indicator (CSS vars driven by refs) and a
  cross-fade of the body content on each tab switch
- About overlay: large left-aligned `DottedGlobe` logo at the top of
  the body; in-app links to `/docs` and `/brand`

### Changed

- `src/components/icons.jsx` header comment now credits Pixelarticons
  (Gerrit Halfmann, MIT) directly instead of the prior iconjar mirror URL
- Tightened the homepage FAQ JSON-LD and the `svg-country-pack` example
  README: MIT requires preserving `LICENSE` and `NOTICE` when redistributing
  source/builds. The exported PNG/SVG/WebM/JSON artifacts remain
  attribution-free
- `cssMinify: false` in `vite.config.js`. The build's CSS minifier was
  dropping `-webkit-backdrop-filter` / `backdrop-filter` pairs as
  duplicates, which broke the frosted-glass effect across browsers (Chrome,
  Firefox and Edge need the unprefixed one, Safari 15 to 17 needs the prefix)
- Ambient mode merged into the panel-collapsed state: collapsing the
  panel (`H`) now hides the looks bar, view-mode switch, zoom controls,
  and social links alongside it. The dedicated `B` shortcut, Maximize
  button, and exit chip were removed
- `.looks-bar` overflow switched to `overflow-y: clip` with
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

## Recent product history

The version history below is reconstructed from `main` commits. Versions are
inferred, since earlier work didn't carry version tags.

### Solid mode upgrades

- Solid render now honors the area selection (was always rendering the full
  world atlas regardless of dropdown)
- Visibility toggles for Land and Stroke
- Stroke width slider (0.1 to 8 px)
- Linear gradient and per-stop opacity on Land and Stroke
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

- Map area is a single dropdown, without a nested expand-collapse
- "Show map" toggle replaces the old "Dots" label
- Wider toggle pill (40×18 with adjusted knob travel)
- Mouse-following tooltip on panel-header actions and social links
- Improved toggle contrast (dark track + dim knob OFF, accent track + dark
  knob ON)
- More room around section titles (`.option-content` padding 6 → 14)

### Earlier polish (pre-launch report)

- Searchable country picker for 250+ areas
- Full keyboard system, `?` help overlay and key-hint toast
- Solid mode network arcs split into sub-toggles
- Looks bar with scroll-aware edge fades and auto-scroll on shuffle
- Export modal with PNG/SVG/WebM tabs and shareable look URLs
- DottedGlobe brand mark mirroring the favicon

Releases are tagged on GitHub starting with `v1.0.0`. New work goes under
Unreleased until the next tag.
