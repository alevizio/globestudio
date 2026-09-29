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

> **Show HN: Globestudio, dotted maps and 3D globes for landing pages (open source)**

79 characters. One title, no variants.

---

## URL field

`https://globestudio.app/`

> If the site is down or still shows the teaser, don't post. Fix or roll back
> first (runbook in [`../LAUNCH.md`](../LAUNCH.md#flip-runbook)); there is no
> fallback URL.

---

## Post body (about 2,350 characters)

Paste as plain text. HN doesn't render Markdown, so the numbered notes stay as
typed.

```text
Hi HN, I'm Alejandro, a product designer who codes.

I kept needing dotted world maps and spinning globes for landing pages and decks. Every time, I ended up screenshotting someone else's site or fighting a map library built for GIS work, so I built the tool I wanted.

You pick the world, a continent, a country or a US state, choose one of 21 looks (halftone, risograph, dither, CRT, aurora, contour lines and more), adjust the dots, colors and density, and export a PNG (up to 4x), SVG, WebM or MP4 video, GIF, JSON config or an embed. You can also paste lat,lng,value or country,value lines to plot your own data as markers, joined by arcs if you want. It's free and MIT licensed, with no signup or API key.

If you want it inside something else, there's an /embed route driven by URL params (or a full config via ?c=), a one-line script tag, @globestudio/react, a web component, a Figma plugin that runs the whole studio, and an MCP server so an assistant can build a globe and hand you back a share link: https://globestudio.app/integrations

A few notes on how it works:

1. The dots come from the dotted-map package and render as one Three.js InstancedMesh. Switching between the flat map and the globe re-bakes the instance matrices on the CPU along a flat, cylinder, sphere path and uploads them in chunks through updateRanges, so the morph never rebuilds the mesh.

2. A look is a preset: dot and color settings plus at most one post-processing pass out of 24 shader effects. SVG can't carry most of those, so SVG export gives you clean vector dots and approximates six effects with SVG filters. For the full look you need PNG or video.

3. Solid mode draws land with d3-geo, which gives it five projections (Mercator, Equal Earth, Natural Earth, Winkel Tripel, Robinson). Dotted maps stay on Mercator because that's what dotted-map generates.

4. While you drag or zoom, the render loop watches the frame rate and lowers the pixel ratio a step when it drops under 50 fps, then raises it again once it recovers.

What isn't great yet: heavy looks at max density drop frames on weaker GPUs, and the accessibility work is self-audited against WCAG 2.2 AA, with the known gaps listed in ACCESSIBILITY.md.

Code: https://github.com/alevizio/globestudio

I'd like to hear how it runs on your machine and which looks or exports you'd actually use.
```

---

## Prepared responses

These are the questions you'll get. Have them ready to paste; speed of response
matters on HN. Stay technical. The replies are plain text, since HN doesn't
render Markdown.

### "Why not just use [MapLibre / deck.gl / react-simple-maps]?"

> Those are great for interactive maps with real geographic data, tiles and big
> datasets. I wanted something smaller: a stylized map for a landing page or a
> deck, as a PNG, SVG, video or live embed. For that job they felt like a lot of
> setup and not enough control over the look.

### "Why not just use globe.gl (or cobe) and write the shaders yourself?"

> globe.gl is great and I thought about building on it. The 21 looks (halftone,
> riso, dither, glitch, CRT, aurora) are post-processing work most people won't
> spend a weekend on, and the designers I built this for don't run npm install.
> So Globestudio adds presets and sliders instead of fragment shaders, PNG and
> video export that keep the shader look, and a web tool with no signup. If
> you'd rather write it yourself, globe.gl and cobe are both good places to
> start.

### "Isn't this just cobe?"

> cobe is a lovely 5 KB library for developers who write code. Globestudio is a
> studio: you design the look without code and export it, or use it through a
> component, the Figma plugin or the MCP server. I wrote an honest comparison
> here: https://globestudio.app/compare/cobe

### "Isn't amCharts Pixel Map Generator the same thing?"

> It's the closest thing on the dotted map side, and it's good. Globestudio also
> does a 3D globe, shader looks and video export, and it's MIT licensed, so you
> can self-host or fork it.

### "Does the SVG keep the shader look?"

> Partly. SVG export gives you clean vector dots cropped to your selection. Six
> effects (bloom, chromatic, CRT, threshold, pixel, halftone) are approximated
> with SVG filters, plus grain and scanline overlays where a look uses them.
> The other shader passes can't become vectors, so for the full look use PNG
> (up to 4x) or video.

### "Which projections?"

> Five flat projections for solid maps: Mercator, Equal Earth, Natural Earth,
> Winkel Tripel and Robinson, drawn with d3-geo. Dotted maps use Mercator
> because that's what the dotted-map package generates. Reprojecting the dot
> field is on the roadmap.

### "It lags on my machine."

> Sorry about that. Could you file it with your browser, OS and GPU?
> https://github.com/alevizio/globestudio/issues/new?template=performance-report.yml
>
> Turning Glow off (in the Globe section) helps the most. The glow is the most
> expensive thing on screen right now, and rebuilding it as a much cheaper blur
> is next on my list. The render loop also lowers the pixel ratio when the
> frame rate drops while you interact, but heavy combinations, like Wireframe
> with its edge shader or the Particle Grid dot shape with Bloom at high
> density, can still push a weaker GPU too hard.

### "Why dotted maps specifically?"

> Mostly because I like how they look. A dotted map reads as data without being
> a chart, holds up at any density and exports cleanly to SVG. There's also a
> Solid mode with filled land, borders, rivers and cities.

### "Is there a way to embed it?"

> Yes. Every look has an /embed route, so
> <iframe src="https://globestudio.app/embed?look=halftone"> works in any HTML
> page, Webflow, Framer or Notion, and there's a one-line script tag too. It
> takes about 19 URL params (look, selection, density, dotColor, view and more;
> the table is in the README), or a full config via ?c=, which is what the Share
> dialog makes. Guides per tool: https://globestudio.app/integrations

### "How is the SVG export so big / small?"

> If it's huge: high density plus a lot of features (network arcs as paths, and
> per-dot fill-opacity for gradients with alpha). Merging paths is on my list.
>
> If it's small: the export is cropped to the dots in your selection, so a
> single country only includes its own dots.

### "Telemetry?"

> Cookieless Vercel Web Analytics and Speed Insights. They stay off when Do Not
> Track or Global Privacy Control is set, or when you opt out on /privacy.
> Besides page views there are a few events (look applied, export finished,
> share clicked, client errors) with no personal data, listed at
> https://globestudio.app/privacy

### "Is it accessible?"

> I built it against WCAG 2.2 AA: it works from the keyboard, a screen reader
> proxy describes the canvas state, and CI runs axe checks. It's self-audited,
> not audited by a third party, and ACCESSIBILITY.md lists the gaps I know
> about. Reports are very welcome.

### "License?"

> MIT, so do what you like with it. The geography comes from world-atlas,
> us-atlas and world-countries, which are all permissively licensed.

### "How do you handle [obscure country / disputed border]?"

> The map data comes from world-atlas (ISO 3166-1 plus the UN reference). I
> don't change its geometry or its political choices, on purpose, so the tool
> stays out of those calls. If something is missing or renders wrong, please
> file an issue.

### "Are you the only contributor?"

> Yes, for now. CONTRIBUTING.md and GOVERNANCE.md describe how to help, and
> presets have their own submission template. PRs welcome.

### "Why React + Three.js and not Svelte + WebGPU?"

> I know React well, and Three.js's instanced meshes and post-processing did a
> lot of the heavy lifting. I tried a WebGPU version of the glow this week. It
> was much cheaper, but almost all of the gain came from a better blur, which
> works in WebGL too, so WebGPU is parked for now.

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
