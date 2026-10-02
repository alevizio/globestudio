# Product Hunt: launch draft

> When: **Thu 1 Oct 2026, 00:01 PT (07:01 UTC)**, per the schedule in
> [`../LAUNCH.md`](../LAUNCH.md#schedule). Schedule it on Wed 30 Sep. The one
> waitlist email goes out right after the post is live.
>
> PH field limits and accepted media types were not verified for this draft.
> Check them in the PH form when scheduling.

---

## Fields

| Field | Max | Globestudio value |
|---|---|---|
| **Name** | 40 chars | `Globestudio` |
| **Tagline** | 60 chars | `Open-source dotted maps and 3D globes for designers` (51) |
| **Topics** | 4 | `Design Tools`, `Open Source`, `Developer Tools`, `Productivity` |
| **Gallery** | see below | See gallery plan below |
| **Pricing** | | `Free` (Open Source) |
| **Maker** | | `@alevizio` |
| **Website** | | `https://globestudio.app` |

One tagline, no alternates. It names no other company, on purpose.

---

## Description (254 characters, fits the 260 limit)

Approved by Ale on 29 Sep.

```text
A free, open-source studio for dotted maps and 3D globes. Pick the world or any country, choose one of 21 shader looks, tweak the dots, gradients and density, then export a PNG, SVG, WebM, MP4 or GIF, or embed it live. It's MIT licensed, with no account.
```

---

## Maker's first comment (post within the first 30 minutes)

```text
Hi Product Hunt! I'm Alejandro, a product designer who codes.

Every time I needed a dotted world map or a spinning globe for a landing page or a deck, I ended up screenshotting someone else's site or fighting a map library built for GIS work. So I built the tool I wanted, with presets, sliders and real exports.

What it does today:
• 21 looks, from clean cartography to halftone, risograph, dither, CRT, aurora and contour lines
• The world, a continent, a country or a US state, with 12 dot shapes or your own SVG or PNG
• Gradients with per-stop opacity on dots, land and borders
• Your own data (lat,lng,value or country,value) plotted as markers, joined by arcs if you want
• Exports: PNG up to 4x, SVG, WebM, MP4, GIF or a JSON config
• An iframe or script tag embed, a React component, a web component, a Figma plugin and an MCP server

It runs in your browser, you don't need an account, and the code is MIT on GitHub.

Two limits worth knowing: SVG export gives you clean vector dots, but most shader looks only show up in PNG and video. And the five flat projections are for solid maps, while dotted maps use Mercator.

What would help me most:
• If it lags, a performance report with your browser, OS and GPU: https://github.com/alevizio/globestudio/issues/new?template=performance-report.yml
• If you make a look you love, send it with the preset template: https://github.com/alevizio/globestudio/issues/new?template=preset-submission.yml
• And tell me what you'd make with it. I had hero sections, decks and launch teasers in mind.

https://globestudio.app
https://github.com/alevizio/globestudio
```

---

## Facts for replies

Accurate as of launch. Use these when a comment asks "can it do X?".

- Looks: 21 presets; each is dot and color settings plus at most one of 24 WebGL shader effects. One pass per look, not stackable.
- Geography: world, continent, subregion, country, US state. Country search works in English, Spanish, French, German, Chinese, Arabic and Portuguese.
- Dots: 12 shapes plus custom SVG/PNG upload or pasted SVG (200 KB cap).
- Solid mode: filled land and borders, rivers and cities overlays, pasted GeoJSON lines and points, and five flat projections (Mercator, Equal Earth, Natural Earth, Winkel Tripel, Robinson). Dotted maps use Mercator.
- Your data: paste `lat,lng,value` or `country,value`; markers are sized by value, with optional arcs.
- Export: PNG at 1x to 4x, saved or copied to the clipboard, SVG (clean vector dots; six effects approximated with SVG filters), WebM, MP4 (where the browser supports it), GIF, JSON config, and embed code for an iframe, React or a web component.
- Embed: `/embed` with URL params or a full `?c=` config, `embed.js` script tag, `@globestudio/react`, `@globestudio/element` web component, Figma plugin, WordPress via a Custom HTML embed, MCP server. Guides: https://globestudio.app/integrations
- Accessibility: built to WCAG 2.2 AA and self-audited; known gaps in ACCESSIBILITY.md.
- Privacy: no accounts; cookieless analytics that stay off under Do Not Track or GPC. Details: https://globestudio.app/privacy

---

## Gallery plan

Six assets. Motion first: people and the algorithm both reward it. Everything
shown must be exported from, or captured in, the live app after the flip.

| # | Asset | What it shows |
|---|---|---|
| 1 | **Looping export** (5 to 10 s) | A rotating globe exported by the tool itself (Aurora or Default on dark) |
| 2 | **The studio** | Editor with the control panel open on a country selection |
| 3 | **Looks strip** | Six looks side by side: Halftone, Risograph, Aurora, CRT, Topographic, Vapor |
| 4 | **Your data** | Pasted data points plotted as markers with arcs |
| 5 | **Export dialog** | Open on the PNG tab with the preview, taken after the launch fixes land |
| 6 | **Ships everywhere** | The /integrations page: embed, React, web component, Figma, MCP |

**Recording the demo video**: use macOS screen recording at 60fps
(Cmd+Shift+5 > Options > Movie). Trim to about 20 s. Compress to MP4 with
HandBrake or ffmpeg:

```bash
ffmpeg -i raw.mov -c:v libx264 -crf 22 -preset slow -movflags +faststart -vf "scale=1920:-2,fps=30" globestudio-demo.mp4
```

---

## Pre-launch checklist (Wed 30 Sep)

- [ ] The live site shows the studio in an incognito window (flip verified)
- [ ] All gallery assets uploaded to PH; the launch is scheduled for Thu 1 Oct, 00:01 PT
- [ ] Maker's first comment ready in a separate doc
- [ ] You're available from 07:01 UTC and through the US day for replies
- [ ] The waitlist Broadcast is drafted in Resend (text in [`../LAUNCH.md`](../LAUNCH.md#waitlist-one-email))
- [ ] Social posts queued (see `social-threads.md`)

## Launch day rules of engagement

- **Do** ask people to visit and try it; PH allows this
- **Don't** ask anyone to upvote. It's against PH rules and can get the post
  taken down
- **Do** reply to every comment in the first 6 hours, even one-word ones
- **Do** edit the description if a recurring confusion shows up in comments
- **Do** pin a comment with answers to the top 3 questions once they emerge

## Topics (in order of priority)

1. Design Tools
2. Open Source
3. Developer Tools
4. Productivity

(You can pick 4 max. Design Tools is the most important.)
