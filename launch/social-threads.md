# Social launch posts

One draft per channel. Dates and times are in the schedule in
[`../LAUNCH.md`](../LAUNCH.md#schedule): X and Mastodon on Tue 29 Sep once
Show HN has traction, the three.js forum and r/threejs on Wed 30 Sep, LinkedIn
on Thu 1 Oct with Product Hunt, Lobsters and the remaining subreddits on Fri 2
Oct. r/SideProject gets the soft launch on Mon 28 Sep after the flip.

Add a UTM tag to every link you post, for example
`https://globestudio.app/?utm_source=reddit&utm_medium=social&utm_campaign=launch`.

---

## X thread (6 posts)

Attach the asset in `[asset: …]` to its post. The link goes in a reply to post
1, since X throttles posts with links.

**1/6** (hook, pin it)

```text
I made a free, open-source tool for dotted maps and 3D globes.

Pick a look, tweak it in the browser, export PNG, SVG, MP4 or GIF. No signup.
```

[asset: looping export of a rotating globe, made in the tool]

Reply to 1/6: `https://globestudio.app` and `https://github.com/alevizio/globestudio`

**2/6**

```text
21 looks: halftone, risograph, dither, CRT, aurora, contour lines and more.

Most are a WebGL shader pass over the dots, and you can tweak them live.
```

[asset: six looks cycling, as a GIF]

**3/6**

```text
Bring your own data: paste lat,lng,value or country,value and get markers sized by value, joined by arcs if you want.
```

[asset: data points with arcs on the flat map]

**4/6**

```text
Exports: PNG up to 4x, SVG with clean vector dots, WebM, MP4 and GIF loops, and a JSON config.

The clip in the first post came straight out of the tool.
```

[asset: export dialog on the PNG tab]

**5/6**

```text
It lives where you work: an iframe or one script tag, a React component, a web component, a Figma plugin, and an MCP server your AI assistant can call.
```

**6/6**

```text
MIT on GitHub, and it runs in your browser.

Tell me which look you want next.
```

### Follow-up posts (a few hours later, separately, not in the thread)

```text
tip: every look in Globestudio has its own URL

https://globestudio.app/looks/glitch
https://globestudio.app/looks/crt
https://globestudio.app/looks/wireframe

drop one in a Slack and your team opens the same scene
```

```text
nerd corner: a gradient on the dots is computed per instance by projecting each dot onto the gradient angle, and the SVG export runs the same math, so a gradient reads the same in WebGL and in the vector file
```

```text
also: the color picker is a card you can drag anywhere by its grip handle. I didn't want yet another popover anchored to the wrong corner of the screen
```

---

## Mastodon (fosstodon.org or mastodon.design)

Single longer post. Mastodon is chronological, so one substantial post beats a
thread.

```text
Globestudio is live: a free, open-source tool for making dotted maps and 3D globes in the browser.

It's built for the design half of the stack: landing page heroes, deck slides, launch teasers. You don't need a mapping library, you need a stylized visual you can export and ship.

What's in it:
• Any country, continent or US state, or the whole world
• 12 dot shapes plus your own SVG/PNG
• Gradients with per-stop opacity
• 21 looks built on WebGL shaders (halftone, risograph, aurora, CRT, contour lines…)
• Your own data as markers and arcs
• Export PNG, SVG, WebM, MP4, GIF or a JSON config, or embed it live
• A React component, a web component, a Figma plugin and an MCP server

No accounts. Cookieless analytics that stay off under Do Not Track or GPC. MIT.

Live: https://globestudio.app
Source: https://github.com/alevizio/globestudio

#WebDev #OpenSource #ThreeJS #DataViz #Maps #DesignTools #CreativeCoding
```

[attach: 20 s demo video]

### Mastodon follow-ups (separate posts, hours later)

```text
Mastodon, what use case for a designer-first map tool am I missing?

The ones I had in mind:
• landing page hero visuals
• launch teaser videos
• decks and reports with a regional focus
• per-country SVGs for brand systems

What else would you reach for it for?
```

```text
Tech detail for the curious:

Globestudio draws every dot with one Three.js InstancedMesh. Switching between the flat map and the globe re-bakes the instance matrices on the CPU along a flat, cylinder, sphere path, and uploads them to the GPU in chunks with updateRanges. The mesh is never rebuilt.

Was fun to write.

#ThreeJS #WebGL #CreativeCoding
```

---

## LinkedIn

More professional voice. One longer post.

```text
Globestudio is live: a free, open-source tool for making dotted maps and 3D globes in the browser.

The gap I wanted to fill: most open-source map tooling is built for engineers, with tile servers, vector tiles and large datasets. There wasn't a mature open-source tool for the other common need: a stylized map visual that drops into a landing page, a deck or a launch video.

Globestudio is built around that workflow:
• Maps of the world, a continent, a country or a US state
• 12 dot shapes, plus your own SVG or PNG
• Gradients with per-stop opacity on dots, land and borders
• 21 looks built on 24 WebGL shader effects: halftone, risograph, CRT, aurora, contour lines and more
• Your own data plotted as markers and arcs
• Exports: PNG up to 4x, SVG with clean vector dots, WebM, MP4, GIF
• Embeds, a React component, a web component, a Figma plugin and an MCP server
• Keyboard first, built to WCAG 2.2 AA (self-audited)

It's MIT licensed, runs in your browser, and needs no account.

We're also on Product Hunt today: {Product Hunt link}

If you build landing pages, brand systems, decks or motion content that touches geography, I'd love your feedback. And if you make something with it, please share it in the repo's Show and tell discussions.

https://globestudio.app
https://github.com/alevizio/globestudio

#OpenSource #DesignTools #WebDevelopment #DataVisualization #ThreeJS
```

---

## Reddit (one community per day)

### r/SideProject (Mon 28 Sep, after the flip)

Title: `I built a free, open-source tool for dotted maps and 3D globes`

```text
Hi r/SideProject. I'm a product designer who codes, and I kept needing dotted world maps and spinning globes for landing pages and decks. Every time, I ended up screenshotting someone else's site or fighting a map library built for GIS.

So I built Globestudio: pick the world or a country, choose one of 21 looks (halftone, risograph, CRT, aurora…), tweak it in the browser, and export PNG, SVG, WebM, MP4 or GIF, or embed it live. No signup, MIT licensed.

Live: {UTM link to https://globestudio.app}
Source: https://github.com/alevizio/globestudio

It launches on Show HN tomorrow. I'd love feedback before then, especially on performance on your device and on what you'd use it for.
```

### r/threejs (Wed 30 Sep) and three.js forum Showcase

The same text works for both. On the forum, post in Showcase and lead with a
screenshot.

Title: `Globestudio: open-source dotted maps and 3D globes built on Three.js`

```text
Globestudio is an open-source studio for dotted maps and 3D globes, built with React and Three.js. You style a map in the browser and export PNG, SVG, video or an embed.

Live: https://globestudio.app
Source: https://github.com/alevizio/globestudio (MIT)

A few implementation notes:

1. Every dot is an instance of one InstancedMesh. Switching between the flat map and the globe re-bakes the instance matrices on the CPU along a flat, cylinder, sphere path and uploads them in chunks through updateRanges, so the morph never rebuilds the mesh.

2. Per-instance gradient color goes through instanceColor. The gradient math is shared with the SVG export path, so a gradient reads the same in both.

3. Looks are post-processing: each look applies at most one pass from 24 fragment shader effects (halftone, riso, Bayer and Atkinson dither, CRT, aurora and more).

4. Adaptive DPR: the loop averages FPS over 60 frames and steps the pixel ratio down by 0.25 below 50 fps, then back up when it recovers.

5. Custom dot shapes: uploaded SVGs are sanitized, then rasterized to a CanvasTexture.

Happy to go deeper on any of it. Feedback on performance with your GPU is especially welcome.
```

### r/web_design (Fri 2 Oct)

Title: `I made an open-source tool for designing dotted maps and 3D globes`

```text
Hi r/web_design. Globestudio makes dotted maps and animated 3D globes for landing pages, decks and launches rather than GIS work. Pick a country, tweak dot shapes, gradients and one of 21 looks, then export PNG, SVG, WebM, MP4 or GIF, or embed it with an iframe or a script tag.

Live: {UTM link to https://globestudio.app}
Source: https://github.com/alevizio/globestudio (MIT)

It runs in the browser, needs no account, and has a Cmd+K palette and a full keyboard system. What I'm most curious about: what would you use it for that I haven't thought of?
```

### r/InternetIsBeautiful (Fri 2 Oct)

Title only, link post. Read the subreddit rules the same day; they change.

Title: `A free tool for making dotted maps and 3D globes in your browser`

Link: `{UTM link to https://globestudio.app}`

---

## Lobsters (Fri 2 Oct, only if you have an invite)

- Title: `Globestudio: open-source dotted maps and 3D globes (React, Three.js)`
- URL: `https://globestudio.app/`
- Tags: `show`, and check the "I am the author" box
- If you add text, reuse the r/threejs implementation notes above.
