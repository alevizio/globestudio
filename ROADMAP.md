# Roadmap

What ships today and what we plan next. Updated when the direction changes;
last revised September 2026, for the 1.0.0 launch.

Plans here can change. If a feature on this list matters to you,
[open a Discussion](https://github.com/alevizio/globestudio/discussions/categories/ideas)
and it will count when we set priorities. For what changed and when, see the
[changelog](https://globestudio.app/changelog) and [CHANGELOG.md](CHANGELOG.md).

## Shipped

The version on `main` already does all of this.

### Studio

- Dotted maps of the world, a continent, a subregion, a country, or a US
  state, with country search in English, Spanish, French, German,
  Chinese, Arabic, and Portuguese
- Flat map and interactive 3D globe, with a morph between them
- 12 dot shapes (Circle, Hexagon, Triangle, Pentagon, Square, Voxel,
  Particle Grid, Diamond, Star, Plus, Ring, ASCII) plus custom SVG/PNG upload
  and pasted SVG
- Linear gradients with a midpoint and per-stop opacity on dots, land,
  and borders, in a draggable color picker (HEX/RGB/HSB/HSL)
- Solid mode: filled land and stroked borders, rivers and cities
  overlays, pasted GeoJSON lines and points, and 5 flat projections
  (Mercator, Equal Earth, Natural Earth, Winkel Tripel, Robinson). Dotted
  maps use Mercator
- Your own data: paste `lat,lng,value` or `country,value` lines and plot
  them as markers sized by value, optionally joined by arcs
- Animated network arcs, rotation, twinkle, and size jitter
- Cmd+K command palette and a full keyboard system (`S` shuffle,
  `[`/`]` cycle looks, `D` export, `R` reset, `G` toggle view, `H` toggle
  panel, `?` help)

### Looks

- 21 looks: Default, Halftone, Risograph, Newsprint, Aurora, Pixel,
  Bayer, Atkinson, Wireframe, CRT, Glitch, Bad TV, Bloom, Metal, Iridescent,
  Pencil, Corrupt, Toon, Threshold, Vapor, Topographic
- 24 WebGL shader effects behind them, at most one per look
- A page and share card per look at `/looks/:id`, and a `/gallery` of all 21

### Export and share

- PNG at 1x to 4x, SVG with clean vector dots (6 effects
  approximated with SVG filters), WebM, MP4 (where the browser
  supports it) and GIF video, and a JSON config with `$schema`
- Share links that carry your settings, and "Copy as React"

### Embeds and integrations

- `/embed` route with URL params or a full `?c=` config, and the
  `embed.js` one-line script tag
- `@globestudio/react`: a drop-in `<Globe />` component
- `@globestudio/element`: a framework-free `<globe-studio>` web component
- Figma plugin in the Figma Community
- WordPress block and `[globestudio]` shortcode (manual install), and
  any WordPress site via a Custom HTML embed
- `@globestudio/mcp`: an MCP server so AI assistants can build globes,
  share links, and embed snippets
- `/integrations`: copy-paste recipes per platform

### Site and project

- `/docs`, `/changelog` with RSS, `/brand` press kit, `/privacy`, `/examples`
- `/compare/cobe` and `/compare/geolayers`
- Per-route prerendered `<head>`, an auto-generated sitemap, `llms.txt`
- Public JSON Schemas for configs and presets; every shipped preset is
  validated against its schema in CI
- Per-chunk bundle budgets, Lighthouse CI, unit and e2e tests with axe
  accessibility checks
- A root error boundary and client error reporting

## Now: after launch (October 2026)

Fixes and polish that follow the 1.0.0 launch.

- Real HTML on look and compare pages. Today they share an empty body
  and some JSON-LD is only added client side.
- A real 404 and a sitemap with `lastmod`.
- Faster first load on mobile: server-render the headline, generate dots
  off the main thread, and stop redrawing when nothing changes.
- Keyboard polish: roving focus in the looks bar and focus that stays
  inside the export dialog.
- Security headers, starting with CSP in report-only mode.
- wordpress.org listing for the WordPress block.
- GitHub Sponsors enrollment.
- Codebase tidying. Some components are over 150 lines and need
  splitting per the design system rules in CONTRIBUTING.

## Soon: next 2 to 3 months

- Multi-stop gradients: gradients have two stops and a midpoint today;
  go to N stops with draggable positions on the track.
- Radial and conic gradients alongside linear.
- Per-country fill: solid mode uses one color for all selected
  countries. Add per-country palettes for data stories.
- Video crop and scale: square and vertical loops for social, with real
  quality and size controls on the Video tab.
- Animation timeline: keyframe rotation, zoom, and effect intensity for
  video export, so you don't have to record the live state.
- State-level solid rendering: US states work for dots; extend the same
  filter to the solid world texture.
- Other projections for dotted maps: reproject the dot field, so the 5
  flat projections work beyond solid mode.

## Later: 3 to 6 months

- More base map styles: bathymetry, topography, terrain shading as
  toggleable layers on the solid mode.
- Deeper data binding: bind dot color, size, or opacity to a CSV for
  choropleth-style stories without code. Markers from pasted data already
  ship.
- Time-based animation: animate the gradient angle, dot rotation, or
  shader intensity along a timeline.
- More languages for country search beyond the seven that ship.

## Maybe / parked

Ideas that have come up but aren't actively planned. Open a Discussion if
you'd vote one of these up:

- A native desktop wrapper (Tauri/Electron)
- Plugin system for third-party shader passes
- Server-rendered exports at higher fidelity than the browser can manage
- Print-ready CMYK output
- WebGPU pipeline alongside the WebGL one

## Won't do

Things we decided against, listed so contributors don't spend time on them:

- Generic GIS / map SDK functionality (geocoding, routing, tile servers).
  There are better libraries for that. Globestudio is a motion tool for
  designers.
- Closed-source / paid features. The whole product is MIT.
- 3rd-party data syncing / accounts. Exports go to the user's machine,
  and there is no server-side state.

If something here matters to you, the fastest way to move it up the list is
to [start a Discussion](https://github.com/alevizio/globestudio/discussions/new?category=ideas)
or open a PR with a small proof-of-concept.
