# Show HN — launch draft

> HN is a different room than Product Hunt. The audience is more skeptical and
> more technical. The bar for the post is **"show me something interesting and
> tell me how it works"** — not marketing copy.
>
> Best windows: **Tuesday or Wednesday, 8–10am ET**. Avoid Mondays, Fridays,
> weekends, and US holidays. Don't launch within 3-4 hours of another launch
> from your account.

---

## Title (HN strict — 80 chars max, no emoji)

> **Show HN: Globestudio – Open-source dotted maps and 3D globes for designers**

Variants if the primary doesn't feel right on the morning of:

- `Show HN: Globestudio – Dotted maps and animated 3D globes in your browser`
- `Show HN: A designer-first map motion tool with shaders, gradients, exports`
- `Show HN: Globestudio (was worlddots) – Stylized maps + 3D globes, open source`

The rename angle is a strong title for a re-launch — it signals "we shipped
v1 and learned what this actually is." Use it if traffic from v1 still
remembers worlddots.

---

## URL field

`https://globestudio.app/`

> If the live URL is rate-limited at launch time, fall back to:
> `https://alevizio.github.io/globestudio/`

---

## Post body (HN allows ~2000 chars in the post text)

> Hi HN — I built Globestudio, an open-source tool for making dotted maps and
> animated 3D globes in the browser. Source: https://github.com/alevizio/globestudio
>
> Quick context for anyone who recognizes the v1: this used to be called
> *worlddots*. The original launch was a single-feature thing — dotted maps.
> Since then it's grown into 17 shader looks (halftone, risograph, aurora,
> dither, CRT, glitch, foil), a 3D globe, embed route, Framer reference
> component, and Webflow docs. "Dots" stopped describing it. Globestudio
> is the proper name for what it actually is now.
>
> The angle: open-source map tooling splits into two camps — engineering
> libraries (MapLibre, deck.gl, react-simple-maps, Protomaps) built for
> tile servers and big datasets, and globe libraries (globe.gl, COBE,
> three-globe, github-globe) that ship as code-in-code-out building
> blocks. Globestudio is neither. It's the **designer-facing GUI** on
> top of that conceptual space — presets, sliders, hex pickers, instant
> export. The output isn't a webmap; it's a stylized PNG/SVG/WebM that
> ships in a landing page, deck slide, OG card, or launch teaser.
>
> What's in it:
>
> - Maps: world, country, region, subregion, US state
> - 12 dot shapes + custom SVG/PNG upload + paste
> - Linear gradients with per-stop opacity on dots, land fill, stroke
> - **17 stackable shader looks**: Halftone, Risograph, Newsprint, Aurora,
>   Pixel, Bayer dither, Atkinson dither, Wireframe, CRT, Glitch, BadTV,
>   Bloom, Metal, Pencil, Iridescent, Corrupt, default. All WebGL
>   post-processing — this is the wedge no other map tool ships.
> - 5 projections: Mercator, Equal Earth, Winkel Tripel, Robinson, sphere
> - Custom GeoJSON upload, rivers + cities overlays, French country search
> - **`/embed` route** for iframe-ing into Webflow / Framer / Notion / HTML
> - Framer code component reference + Webflow integration docs
> - Animated network arcs, twinkle, optional rotation
> - Exports: PNG (WebGL re-render at any scale), SVG (with shaders baked
>   in), WebM video, JSON config
> - **No signup, no API key, no telemetry. MIT.**
>
> Some implementation notes that might be interesting:
>
> 1. Dot fields come from the dotted-map package, then live as instanced
>    meshes in Three.js. The flat 2D view and the 3D globe are the same
>    InstancedMesh — a single morph progress lerps between two pre-computed
>    positions per dot, so view-switching is "free."
>
> 2. Per-instance gradient color uses Three.js's instanceColor attribute,
>    with the angle math (sin/-cos projection onto the image's corner-to-
>    corner span) shared between the WebGL path and the SVG export path so
>    a PNG and an SVG of the same look agree pixel-for-pixel.
>
> 3. Adaptive DPR — the render loop tracks 60-frame FPS windows and steps
>    pixel ratio down by 0.25 if it drops below 50fps for ~2.5s. Recovers
>    when FPS climbs back. Keeps the experience usable on weaker GPUs
>    without a quality dropdown.
>
> 4. No backend, no accounts, no telemetry. Everything client-side; presets
>    live in src/data/look-presets.js.
>
> MIT. Built with React + Three.js + Vite.
>
> Known rough edges:
> - Performance dips on very high density (90+) with heavy shaders. Working
>   on it.
> - Custom shape upload caps at 200KB; some SVG icons need optimization first.
> - Mobile Safari occasionally drops frames on the network arc animation —
>   I'd love bug reports if you hit it.
>
> Feedback welcome — especially on browser/perf issues, missing features
> you'd actually use, and use cases I haven't thought of.

---

## Prepared responses

These are the questions you'll get. Have them ready to paste — speed of
response matters on HN.

### "Why not just use [MapLibre / deck.gl / react-simple-maps]?"

> Those are great for what they do — interactive map rendering with real
> geographic data, tiles, and big datasets. Globestudio is solving a different
> problem: when a designer or marketing site needs a stylized map visual as
> a static or animated asset, the existing libraries are over-powered and
> under-styled. The output isn't a webmap — it's a PNG / SVG / WebM that
> ships in a landing page or deck. Different audience, different ergonomics.

### "Why not just use globe.gl (or COBE) and write the shaders yourself?"

> globe.gl is the engine; Globestudio is the GUI. globe.gl is the OSS gold
> standard for 3D globe rendering — I considered building on it. But the
> 17 shader looks (halftone, riso, dither, glitch, CRT, aurora) aren't in
> globe.gl — that's net-new WebGL post-processing work most people won't
> spend a weekend on. And designers (the actual audience) can't `npm
> install`. The wedge is: presets and sliders for the people who don't
> want to write a fragment shader, video/SVG export with shaders baked in,
> and a no-signup web tool. If you're a dev who'd rather code it from
> scratch — go for it, globe.gl is great. I'm aiming at the other 95%
> of the audience.

### "Isn't amCharts Pixel Map Generator the same thing?"

> amCharts is the closest analog on the dotted-map dimension and it's
> genuinely good — 90+ projections, free with their branding link. The
> differences: (a) no 3D globe, (b) no shader-style looks, (c) older
> design language, (d) proprietary, paid for the unbranded export.
> Globestudio is MIT, ships the 3D globe and the 17 shader looks, and
> the GUI is a 2026-era designer tool. Different shelf.

### "It lags on my machine."

> Sorry — file it here, please:
> https://github.com/alevizio/globestudio/issues/new?template=performance-report.yml
>
> I treat perf as a launch blocker. The render loop has adaptive DPR that
> should already kick in, but heavy presets (Wireframe + edge shader,
> Particle Grid + bloom) push it harder than the throttle compensates for.
> Working on it.

### "Why dotted maps specifically?"

> Mostly aesthetic. The dotted style reads as "data" without committing to
> a chart, looks good at any density, and exports cleanly to SVG. There's
> also a path to non-dotted (Solid mode renders a filled landmass), and the
> roadmap has more raster/raster-hybrid options.

### "Is there a way to embed it?"

> Yes — every preset URL has a matching `/embed` route. Drop
> `<iframe src="https://globestudio.app/embed?look=halftone">` into any
> HTML page, Webflow, or Framer site. Query string accepts all the same
> controls as the main app (look, density, dotColor, view, motion, etc.)
> so you can configure the embed without forking the source. Per-tool
> integration guides live at /docs/integrations/.

### "How is the SVG export so big / small?"

> If it's huge: high density + many features (network arcs as paths +
> per-dot fill-opacity for gradients with alpha). Looking at SVG path
> consolidation for v2.
>
> If it's small: most of the math runs at export time and only the visible
> dots get emitted (we crop to the visible region by default — turn off
> `crop` in the export modal to get the full world).

### "License?"

> MIT. Use it, remix it, ship it. The included geography data comes from
> world-atlas + us-atlas + world-countries — all permissive licenses.

### "How do you handle [obscure country / disputed border]?"

> The map data comes from world-atlas (ISO 3166-1 + UN reference). I don't
> override their geometry or political decisions — that's a deliberate
> choice to stay neutral. If there's a specific entity missing or the
> rendering is wrong for a region you care about, please file an issue.

### "Are you the only contributor?"

> Yes, currently. The repo just got the CONTRIBUTING / GOVERNANCE files
> needed to scale beyond one person — PRs welcome.

### "Why React + Three.js and not Svelte + WebGPU?"

> Familiarity for me + ecosystem maturity for the tool. Three.js's instanced
> mesh + post-processing pipeline did a lot of the heavy lifting. A WebGPU
> pipeline alongside the WebGL one is parked on the roadmap.

---

## Don't do

- ❌ **Don't ask for upvotes.** HN moderators will hit the post if they see
  this in comments or replies.
- ❌ **Don't argue with critics.** If someone says it's slow, thank them,
  ask for details, file the issue, move on. Defensive replies kill threads.
- ❌ **Don't link to Product Hunt in the post body.** HN dislikes cross-promo.
  Mention it in a comment reply if asked, not in the post.
- ❌ **Don't reply with marketing copy.** HN treats every reply as either
  technical content or marketing — there's no in-between. Stay technical.

---

## Pre-launch checklist (T-2h)

- [ ] Live URL is up
- [ ] GitHub repo is public and the README is current
- [ ] You're available for 6+ hours of replies
- [ ] You have a second screen with the prepared responses
- [ ] You've logged into HN from a clean profile (no link rings)
- [ ] The post body is in a text doc, copy-paste ready
- [ ] Phone has GitHub mobile installed for filing issues from comments
