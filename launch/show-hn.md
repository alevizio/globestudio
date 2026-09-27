# Show HN: launch draft

> HN is a different room than Product Hunt. The audience is more skeptical and
> more technical. The bar for the post is **"show me something interesting and
> tell me how it works"**, not marketing copy.
>
> When: **Tue 29 Sep 2026, 14:00 UTC (07:00 PT)**, per the schedule in
> [`../LAUNCH.md`](../LAUNCH.md#schedule). Only after the teaser flip has been
> verified. Don't post anything else from the account within a few hours of it.

---

## Title (HN strict: 80 chars max, no emoji)

> **Show HN: Globestudio, open-source dotted maps and 3D globes (React/Three.js)**

76 characters. One title, no variants.

---

## URL field

`https://globestudio.app/`

> If the site is down or still shows the teaser, don't post. Fix or roll back
> first (runbook in [`../LAUNCH.md`](../LAUNCH.md#flip-runbook)); there is no
> fallback URL.

---

## Post body (about 2,000 characters)

Paste as plain text. HN doesn't render Markdown, so the numbered notes stay as
typed.

```text
Globestudio is a browser tool for making dotted maps and 3D globes, the kind that sit behind landing page headlines, and taking them away as files or embeds. No signup, no API key, MIT.

Pick the world, a continent, a country or a US state. Choose one of 21 looks (halftone, risograph, dither, CRT, aurora, contour lines and more), tweak dots, gradients and density, then export PNG (1x to 4x), SVG, WebM, MP4, GIF or a JSON config. You can also paste lat,lng,value or country,value lines to plot your own data as markers, optionally joined by arcs.

To use it elsewhere there's an /embed route driven by URL params (or a full config via ?c=), a one-line script tag, @globestudio/react, a web component, a Figma plugin, and an MCP server so an assistant can build a globe and hand back a share link: https://globestudio.app/integrations

How it works:

1. The dot field comes from the dotted-map package and renders as one Three.js InstancedMesh. Switching between flat and globe re-bakes the instance matrices on the CPU along a flat, cylinder, sphere path and uploads them in chunks through updateRanges, so the morph never rebuilds the mesh.

2. A look is a preset: dot and color settings plus at most one post-processing pass from 24 shader effects. SVG export is different: dots come out as clean vectors, six effects are approximated with SVG filters, and the full shader look needs PNG or video.

3. Solid mode paints land with d3-geo, so it offers five flat projections (Mercator, Equal Earth, Natural Earth, Winkel Tripel, Robinson). Dotted maps stay on Mercator, which is what dotted-map generates.

4. The render loop averages FPS over 60 frames and steps the pixel ratio down by 0.25 below 50 fps, then back up once it recovers.

Rough edges: heavy looks at max density (90) drop frames on weaker GPUs, and accessibility is self-audited against WCAG 2.2 AA, with known gaps in ACCESSIBILITY.md.

Source: https://github.com/alevizio/globestudio

I'd love to hear how it runs on your hardware and which looks or exports you'd actually use.
```

---

## Prepared responses

These are the questions you'll get. Have them ready to paste; speed of response
matters on HN. Stay technical.

### "Why not just use [MapLibre / deck.gl / react-simple-maps]?"

> Those are great at what they do: interactive maps with real geographic data,
> tiles and big datasets. Globestudio solves a different problem. When a
> designer or a marketing site needs a stylized map as a still or an animated
> asset, those libraries are more power than the job needs and less styling
> than it wants. The output here isn't a webmap; it's a PNG, SVG or video that
> ships in a landing page or a deck, or a live embed. Different audience,
> different ergonomics.

### "Why not just use globe.gl (or cobe) and write the shaders yourself?"

> globe.gl is the engine; Globestudio is the GUI. globe.gl is the OSS gold
> standard for 3D globe rendering and I considered building on it. But the 21
> looks (halftone, riso, dither, glitch, CRT, aurora) are post-processing work
> most people won't spend a weekend on, and designers, the actual audience,
> don't `npm install`. What this adds: presets and sliders for people who don't
> want to write a fragment shader, PNG and video export with the shader look,
> and a web tool with no signup. If you'd rather code it from scratch, globe.gl
> and cobe are great.

### "Isn't this just cobe?"

> cobe is a 5 KB library for developers who write code, and it's lovely.
> Globestudio is the layer above it: a no-code studio where you design the look
> and export it, or grab a component, plugin or MCP server. cobe gives you a
> canvas; Globestudio gives you a deliverable. There's an honest comparison at
> https://globestudio.app/compare/cobe

### "Isn't amCharts Pixel Map Generator the same thing?"

> It's the closest analog on the dotted map side and it's good. The
> differences: Globestudio also does a 3D globe, applies shader looks, exports
> video, and is MIT licensed, so you can self-host or fork it.

### "Does the SVG keep the shader look?"

> Partly. SVG export gives you clean vector dots cropped to your selection. Six
> effects (bloom, chromatic, CRT, threshold, pixel, halftone) are approximated
> with SVG filters, plus grain and scanline overlays where a look uses them.
> The rest of the shader passes can't become vectors, so for the full look use
> PNG (up to 4x) or video.

### "Which projections?"

> Five flat projections for solid maps: Mercator, Equal Earth, Natural Earth,
> Winkel Tripel and Robinson, drawn with d3-geo. Dotted maps use Mercator,
> because that's what the dotted-map package generates. Reprojecting the dot
> field is on the roadmap.

### "It lags on my machine."

> Sorry about that. Could you file it here, with browser, OS and GPU?
> https://github.com/alevizio/globestudio/issues/new?template=performance-report.yml
>
> The render loop already steps the pixel ratio down when FPS drops, but heavy
> presets (Wireframe with the edge shader, Particle Grid with bloom) at high
> density push it harder than the throttle compensates for. Working on it.

### "Why dotted maps specifically?"

> Mostly aesthetic. The dotted style reads as "data" without committing to a
> chart, looks good at any density, and exports cleanly to SVG. There's also a
> Solid mode that renders filled land with borders, rivers and cities.

### "Is there a way to embed it?"

> Yes. Every look has an `/embed` route:
> `<iframe src="https://globestudio.app/embed?look=halftone">` works in any
> HTML page, Webflow, Framer or Notion, and there's a one-line script tag too.
> The embed takes about 19 URL params (look, selection, density, dotColor,
> view and more; the table is in the README), or a full config via `?c=`,
> which is what the Share dialog produces. Per-tool guides:
> https://globestudio.app/integrations

### "How is the SVG export so big / small?"

> If it's huge: high density plus many features (network arcs as paths, and
> per-dot fill-opacity for gradients with alpha). SVG path consolidation is on
> my list.
>
> If it's small: the export is cropped to the dots in your selection, so a
> single country only emits its own dots.

### "Telemetry?"

> Cookieless Vercel Web Analytics and Speed Insights, and they stay off when
> Do Not Track or Global Privacy Control is set, or when you opt out on
> /privacy. Besides page views there are a few events (look applied, export
> finished, share clicked, client errors) with no personal data. The page at
> https://globestudio.app/privacy lists them.

### "Is it accessible?"

> It's built to WCAG 2.2 AA: keyboard first, a screen reader proxy for the
> canvas state, and axe checks in CI. It's
> self-audited, not third-party audited, and ACCESSIBILITY.md lists the known
> gaps. Reports are very welcome.

### "License?"

> MIT. Use it, remix it, ship it. The geography data comes from world-atlas,
> us-atlas and world-countries, all permissive licenses.

### "How do you handle [obscure country / disputed border]?"

> The map data comes from world-atlas (ISO 3166-1 + UN reference). I don't
> override its geometry or political decisions; that's a deliberate choice to
> stay neutral. If an entity is missing or a region renders wrong, please file
> an issue.

### "Are you the only contributor?"

> Yes, for now. CONTRIBUTING.md and GOVERNANCE.md describe how to help, and
> presets have their own submission template. PRs welcome.

### "Why React + Three.js and not Svelte + WebGPU?"

> Familiarity for me and ecosystem maturity for the tool. Three.js's instanced
> mesh and post-processing pipeline did a lot of the heavy lifting. A WebGPU
> pipeline next to the WebGL one is parked on the roadmap.

---

## Don't do

- **Don't ask for upvotes.** HN moderators will penalize the post if they see
  this in comments or replies.
- **Don't argue with critics.** If someone says it's slow, thank them, ask for
  details, file the issue, move on. Defensive replies kill threads.
- **Don't link to Product Hunt in the post body.** HN dislikes cross-promo.
  Mention it in a reply if asked, not in the post.
- **Don't reply with marketing copy.** HN treats every reply as either
  technical content or marketing. Stay technical.

---

## Pre-launch checklist (T-2h)

- [ ] The flip is verified (runbook in `../LAUNCH.md`) and the live URL shows the studio in an incognito window
- [ ] GitHub repo is public and the README is current
- [ ] `v1.0.0` is tagged and released
- [ ] You're available for 6+ hours of replies
- [ ] You have a second screen with the prepared responses
- [ ] You've logged into HN from a clean profile (no link rings)
- [ ] The post body is in a text doc, copy-paste ready
- [ ] Phone has GitHub mobile installed for filing issues from comments
