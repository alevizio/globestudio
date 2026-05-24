# Social launch threads

Three channels, three voices. Schedule all three for the same 6-hour window
on launch day (start with X 30 minutes after Product Hunt goes live, then
Mastodon, then LinkedIn an hour later).

---

## X (Twitter) — main thread

Post one tweet every ~15 seconds. Each tweet should stand alone if quoted in
isolation. Attach the visual asset described in `[asset: …]` to that tweet.

---

**1/9** (hook — pin this if you can)

> remember worlddots? i renamed it.
>
> meet globestudio — open-source dotted maps and animated 3D globes for
> designers, animators, and creative developers. v1 was just dots. v2 is
> 21 shader looks, a 3D globe, a cmd+k palette, embed anywhere.
>
> built with three.js + react. MIT.
>
> live: https://globestudio.app
> source: https://github.com/alevizio/globestudio
>
> here's what changed 🧵
>
> *[asset: 20s demo video — pick country → cycle presets → tweak gradient → export]*

**2/9** (the gap it fills)

> most open-source map tools are built for engineers — tile servers, vector
> tiles, big data
>
> globestudio is built for the design half of the stack:
> – the landing page hero
> – the deck slide
> – the launch teaser
> – the explainer scroll
>
> *[asset: side-by-side: "what other tools give you" (developer-y) vs "what globestudio gives you" (stylized)]*

**3/9** (12 shapes + custom upload)

> 12 dot shapes built in — circle, hexagon, triangle, pentagon, square,
> diamond, star, plus, ring, voxel, particle grid, ASCII glyphs
>
> + upload your own SVG/PNG or paste raw SVG markup. the dot is whatever
> you want it to be
>
> *[asset: grid screenshot of all 12 shapes + a custom logo as a dot]*

**4/9** (gradients + alpha)

> every color (dots, land, country stroke) supports linear gradients with
> per-stop opacity
>
> the angle slider is a live preview — the gradient bar rotates as you
> drag it. wysiwyg
>
> *[asset: gradient picker, gif of the angle sweeping 0 → 360]*

**5/9** (shaders)

> 24 webgl shader effects baked in: halftone, riso, newsprint, aurora,
> pixel, bayer, atkinson, edge, crt, glitch, badtv, bloom, metal, pencil,
> iridescent, corrupt, toon, threshold, chromatic, wave, stripes, +more
>
> stack them with 21 presets. my favorites: vapor (synthwave RGB split) and
> topographic (warped contour cartography). both new this week.
>
> *[asset: 6 presets side by side, animated]*

**6/9** (real exports)

> export goes 3 ways:
>
> – PNG: high-res webgl re-render at N× resolution
> – SVG: vector with shader effects baked in
> – WebM: video for launch teasers and stream backgrounds
>
> drops straight into figma, keynote, premiere, your landing page
>
> *[asset: export modal screenshot with the SVG tab open]*

**6.5/9** (cmd+k palette — fits well anywhere)

> hit ⌘K. type "synthwave" → vapor. type "retro" → crt, badtv, pixel.
> type "print" → halftone, risograph, newsprint. natural-language search
> over all 21 presets + every action (shuffle, export, switch view…)
>
> no api key. no LLM. just tags + fuzzy match
>
> *[asset: cmd+k palette open, with "synthwave" typed showing Vapor at top]*

**7/9** (motion that respects motion preferences)

> live animations are on by default — twinkle, network arcs, optional rotation
>
> all of it respects `prefers-reduced-motion`. if your OS asks for less
> motion, the tool listens. accessibility is in the design, not added later
>
> *[asset: gif of the network arcs animating, then a still where they freeze]*

**8/9** (the why)

> i kept hitting the same problem: needed a stylized map for a landing or a
> deck, ended up screenshotting stripe's homepage or fighting a library not
> made for visuals
>
> so i made the version i wanted. presets, sliders, exports. nothing more
> nothing less

**9/9** (call to action)

> if you build something with it — please share it.
> if it lags on your device — please file a bug.
> if you want to add a preset — there's a template for that.
>
> 🌐 https://globestudio.app
> ⭐ https://github.com/alevizio/globestudio
>
> proud of this one 🤍

---

### Follow-up tweets (post a few hours later, separately, not in the thread)

These keep the post in feed without spamming the thread.

> tip: in globestudio you can share a look as a URL — every preset has its own
> /looks/:id route
>
> https://globestudio.app/looks/glitch
> https://globestudio.app/looks/crt
> https://globestudio.app/looks/wireframe
>
> drop the link in a slack and your team sees the exact same scene

> nerd corner: the per-dot gradient color is computed at instance-buffer build
> time using sin/-cos projection onto the image's corner-to-corner span.
> means the SVG export and the webgl render produce pixel-identical colors
> for the same look. /pleased emoji

> (also btw the color picker is draggable — header has a grip handle. drag
> it wherever feels good. i didn't want yet another modal that anchors to the
> wrong corner of the screen)

---

## Mastodon (post on `fosstodon.org` or `mastodon.design`)

Single longer post. Mastodon is chronological — no algorithmic boost, so a
thread isn't as helpful as one substantial post.

```
🌐 Shipped Globestudio — an open-source tool for making dotted maps and
animated 3D globes in the browser.

Built for the design half of the stack: landing page heroes, deck slides,
launch teasers, explainer scrolls. The kind of thing where you don't need
a full mapping library, you need a stylized visual you can export and ship.

What's inside:
- Maps for any country, region, or US state
- 12 dot shapes + custom SVG/PNG upload + paste
- Linear gradients with per-stop opacity
- 21 WebGL shader looks (halftone, risograph, aurora, vapor, topographic, …)
- 21 presets with shareable URLs at /looks/:id
- Cmd+K command palette with fuzzy search by name or vibe
- Exports: PNG (high-res), SVG, WebM video
- Full keyboard shortcuts + reduced-motion respect

No backend, no accounts, no cookies, no fingerprinting. Source on GitHub
under MIT.

Built with React + Three.js. Honored to share it with this community.

Live: https://globestudio.app
Source: https://github.com/alevizio/globestudio

#WebDev #OpenSource #ThreeJS #DataViz #Maps #DesignTools #CreativeCoding

[attach: 20s demo video]
```

### Mastodon follow-ups (separate posts, hours later)

```
Mastodon, what use case for a designer-first map tool am I missing?

So far the obvious ones I had in mind:
- landing page hero visuals
- launch teaser videos
- decks + reports with a regional focus
- per-country SVGs for brand systems

What else would you reach for it for?
```

```
Tech detail for the curious:

Globestudio uses a single Three.js InstancedMesh that morphs between flat 2D
and 3D globe positions. The per-instance buffer holds both target positions
and a per-vertex morph lerps between them, so switching views is free —
no rebuild, no allocation.

Was fun to write.

#ThreeJS #WebGL #CreativeCoding
```

---

## LinkedIn

More professional voice. Single longer post — LinkedIn rewards depth over
threads.

```
I just open-sourced Globestudio — a designer-first tool for creating dotted
maps and animated 3D globes in the browser.

The gap I wanted to fill: most open-source map tooling is built for
engineers — tile servers, vector tiles, large datasets. There wasn't a
mature open-source tool for the *other* common need: a stylized map visual
that drops into a landing page, deck, or launch video.

Globestudio is built around that workflow:
• Maps for world, country, region, or US state
• 12 dot shapes (plus custom SVG/PNG upload)
• Linear gradients with per-stop opacity on dots, land, and stroke
• 24 WebGL shader effects — bloom, chromatic, CRT, halftone, glitch, edge, +18 more
• 21 named presets with shareable URLs (/looks/:id) and per-preset OG cards
• Cmd+K command palette with fuzzy search by name or vibe
• Real exports: PNG (high-res), SVG (with effects baked in), WebM video
• Full keyboard shortcuts and accessibility (reduced-motion respect, WCAG 2.2 AA)

It's MIT-licensed, runs entirely client-side, and is built with React +
Three.js. No backend, no accounts, no cookies, no fingerprinting.

If you build landing pages, brand systems, design decks, or motion content
that touches geography — I'd love your feedback. And if you build something
with it, please share. The repo has a Show & Tell discussion specifically
for this.

🌐 https://globestudio.app
📦 https://github.com/alevizio/globestudio

#OpenSource #DesignTools #WebDevelopment #DataVisualization #ThreeJS #CreativeTechnology
```

---

## Reddit posts (separate, post one per community per day)

### `r/web_design` — "I open-sourced a designer-first tool for dotted maps and 3D globes"

> Hi r/web_design — sharing something I built and just open-sourced.
>
> Globestudio: dotted maps and animated 3D globes designed for landing pages,
> decks, and launches rather than for GIS workflows. Pick a country, tweak
> dot shapes / gradients / shaders, export PNG, SVG, or WebM.
>
> Live: https://globestudio.app
> Source: https://github.com/alevizio/globestudio — MIT
>
> It's react + three.js, runs entirely in the browser, and has 21 presets,
> a Cmd+K command palette, per-stop opacity gradients, and a full keyboard
> system. The thing I'm most curious about: what use cases am I missing?
> I had hero shots, deck visuals, and country-specific brand assets in
> mind — what else would you reach for it for?
>
> Genuine feedback welcome, performance bugs especially.

### `r/javascript` — focus on the tech

> Show /r/js: Globestudio — open-source dotted maps and 3D globes built with
> three.js
>
> Source: https://github.com/alevizio/globestudio
> Live: https://globestudio.app
>
> A couple of implementation notes:
> - Single InstancedMesh morphs between flat 2D and 3D globe positions
>   (per-vertex lerp on a morphProgress uniform). View switch is free.
> - Per-instance gradient color via Three's instanceColor attribute. The
>   angle projection math (sin/-cos onto the image corner-to-corner span)
>   is shared between WebGL and SVG export so they agree exactly.
> - Adaptive DPR — 60-frame FPS window, steps pixel ratio down by 0.25
>   when below 50fps for ~2.5s. Recovers cleanly.
> - Custom shape upload: SVG sanitized (strip script tags + on*= handlers),
>   rasterized to a CanvasTexture at 256², applied via MeshBasicMaterial
>   onBeforeCompile.
>
> MIT. PRs welcome.

### `r/dataisbeautiful` — angle: open tool

> [OC] I built an open-source tool for dotted-style maps and animated
> globes — Globestudio
>
> Live: https://globestudio.app
> Source: https://github.com/alevizio/globestudio
>
> The aesthetic is similar to Stripe's homepage globe but you can pick any
> country/region, tweak the dot style and density, layer shader effects,
> and export PNG/SVG/WebM. MIT licensed. I'd love to see what people make
> with it.

---

## Designer News

Subject: `Globestudio — open-source dotted maps and 3D globes for designers`
URL: `https://globestudio.app/`
Description:

> A designer-first open-source tool for making dotted maps and animated 3D
> globes. Custom shapes, gradients with per-stop opacity, WebGL shader
> effects, and exports to PNG, SVG, and WebM. Built with React + Three.js,
> MIT licensed.

---

## Timing reminder

Best launch sequence (single day, all times PT):

| Time | Channel | Why |
|---|---|---|
| 12:01am | Product Hunt | PH launches run 24h from midnight PT |
| 6:00am | Show HN | HN morning shift, high engagement |
| 8:30am | X (thread) | Wake-up for US East coast |
| 9:30am | LinkedIn | Office-hours engagement |
| 10:00am | Mastodon | Less time-sensitive, but mornings are decent |
| 11:00am | Designer News | DN has steady weekday traffic |
| Afternoon | Reddit | Stagger one per day to avoid spam-trap |

Don't try to do all of these in 60 minutes. Pace yourself for the day.
