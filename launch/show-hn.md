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

> **Show HN: Worlddots – Open-source dotted maps and 3D globes for designers**

Variants if the primary doesn't feel right on the morning of:

- `Show HN: Worlddots – Dotted maps and animated 3D globes in your browser`
- `Show HN: A designer-first map motion tool with shaders, gradients, exports`
- `Show HN: Worlddots – Stylized dotted maps and 3D globes (open source)`

---

## URL field

`https://worlddots.app/`

> If the live URL is rate-limited at launch time, fall back to:
> `https://alevizio.github.io/worlddots/`

---

## Post body (HN allows ~2000 chars in the post text)

> Hi HN — I built Worlddots, an open-source tool for making dotted maps and
> animated 3D globes in the browser. Source: https://github.com/alevizio/worlddots
>
> The angle: most open-source map tooling (MapLibre, deck.gl, react-simple-maps,
> Protomaps) is built for engineers — tile servers, vector tiles, large
> datasets. Worlddots is built for the designer half of the stack — the
> landing page hero, the deck slide, the launch teaser, the explainer scroll.
>
> What it does:
>
> - Maps for world, country, region, subregion, or US state
> - 12 dot shapes plus custom SVG/PNG upload + paste
> - Linear gradients with per-stop opacity on dots, land fill, and stroke
> - Shader effects: bloom, chromatic split, CRT, halftone, pixel, edge,
>   glitch, wave (all via WebGL post-processing)
> - 10+ presets, shareable at /looks/:id
> - Animated network arcs, twinkle, optional rotation
> - Exports: PNG (high-res via WebGL re-render at N× resolution), SVG (with
>   shader effects baked into <feFilter> when possible), WebM video, JSON
>   config
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
> geographic data, tiles, and big datasets. Worlddots is solving a different
> problem: when a designer or marketing site needs a stylized map visual as
> a static or animated asset, the existing libraries are over-powered and
> under-styled. The output isn't a webmap — it's a PNG / SVG / WebM that
> ships in a landing page or deck. Different audience, different ergonomics.

### "It lags on my machine."

> Sorry — file it here, please:
> https://github.com/alevizio/worlddots/issues/new?template=performance-report.yml
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

> Not yet. Embeddable mode (read-only iframe with a config JSON or look ID)
> is in the ROADMAP for the next 2-3 months. Vote it up:
> https://github.com/alevizio/worlddots/discussions/categories/ideas

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
