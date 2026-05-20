# Product Hunt — launch draft

> Save this until you're ready to launch. Product Hunt's official guidance says
> launching is a single 24-hour PT event — pick the date deliberately. Don't
> launch on a Monday (US holidays) or Friday (low traffic).
>
> **Best windows in 2026**: a Tuesday or Wednesday at 12:01am PT, mid-month.

---

## Hard limits (fill these exactly)

| Field | Max | Globestudio value |
|---|---|---|
| **Name** | 40 chars | `Globestudio` |
| **Tagline** | 60 chars | `Open-source dotted maps and 3D globes for designers` |
| **Topics** | 4 | `Design Tools`, `Open Source`, `Developer Tools`, `Productivity` |
| **Gallery** | 6 assets | See gallery plan below |
| **Pricing** | — | `Free` (Open Source) |
| **Maker** | — | `@alevizio` |

---

## Description (PH "post" body)

> **Make a Stripe-style globe (or a riso-printed Mercator) in 30 seconds.**
> Open source, designer-first, no signup, no API key, no code.
>
> Globestudio turns the planet into a hero visual. Pick any country, region,
> or US state, customize dot shapes, gradients, and shader effects, then
> export PNG, SVG, or animated WebM.
>
> Built for **designers, animators, and creative developers** who want
> map-based visuals for landing pages, decks, OG cards, and launch teasers
> — without needing GIS workflow, npm install, or a $5/1k-loads bill.
>
> What's inside:
> - 12 dot shapes + custom SVG/PNG upload + paste
> - Linear gradients with per-stop opacity on dots, land, and stroke
> - **17 stackable shader looks** — Halftone, Risograph, Aurora, Bayer +
>   Atkinson dither, CRT, Glitch, BadTV, Bloom, Metal, Pencil, Iridescent,
>   Wireframe, Pixel, Corrupt, Newsprint, and the default
> - 5 projections: Mercator, Equal Earth, Winkel Tripel, Robinson, sphere
> - Custom GeoJSON upload, rivers + cities overlays
> - **`/embed` route** + Framer code component + Webflow integration docs
> - Shareable preset URLs at `/looks/:id` with hand-designed OG cards
> - Live animations with `prefers-reduced-motion` support
> - Full keyboard system (`S` shuffle, `[`/`]` cycle presets, `D` export…)
> - Exports: PNG (WebGL re-render at any scale), SVG (shaders baked in),
>   WebM video, JSON config
> - No backend, no accounts, no telemetry — everything in your browser
>
> MIT licensed. Built with React + Three.js. WCAG 2.2 AA conformant.

---

## Maker's first comment (post this within the first 30 minutes)

> Hi PH 👋 — Alejandro here.
>
> Globestudio started as a small experiment called *worlddots* — literally
> just dotted maps. Over the last few months it grew up: 17 shader looks
> (halftone, risograph, aurora, dither, foil), a 3D globe, an embed route,
> a Framer reference component, Webflow docs. The name stopped fitting.
> So I renamed it Globestudio — the proper name for what it actually does.
>
> I built it because every time I needed a stylized world map or animated
> globe for a landing page or deck, I'd either reach for a paid design tool,
> screenshot something off Stripe's homepage, or fight with a generic map
> library that wasn't built for visuals.
>
> So I made the designer-first version: presets, sliders, shader effects,
> and exports that drop straight into Figma, Keynote, or a launch video. The
> whole thing runs client-side and the source is on GitHub under MIT.
>
> The new color picker landed last week — gradients with per-stop opacity,
> live angle preview, HEX/RGB/HSB/HSL — and the solid mode now properly
> honors country selection (an embarrassing bug I shipped two days ago,
> already fixed).
>
> A few things I'd love your help on:
> - **Performance reports.** It's graphics-heavy. If it lags on your device,
>   please file a [performance report](https://github.com/alevizio/globestudio/issues/new?template=performance-report.yml)
>   with your browser + OS + GPU. I'm treating perf as a launch blocker.
> - **Preset submissions.** If you build a look you like, the
>   [preset submission template](https://github.com/alevizio/globestudio/issues/new?template=preset-submission.yml)
>   makes it easy to ship it as a built-in.
> - **Use cases I haven't thought of.** I have hero sections, decks, and
>   launch teasers in mind. What would you use it for?
>
> Live: https://globestudio.app/
> GitHub: https://github.com/alevizio/globestudio
>
> Happy to answer anything in the comments.

---

## Gallery plan

Six assets. Prioritize **video first** — Product Hunt's algorithm and humans
both reward motion in the gallery.

| # | Asset | What it shows | Format |
|---|---|---|---|
| 1 | **Demo video** (15-25s) | Open tool → pick country → cycle 3 presets → tweak gradient → export PNG | MP4, 1920×1080, no sound or subtle ambient |
| 2 | **Hero shot** | Default preset, globe with network arcs, panel visible | PNG, 1920×1080 |
| 3 | **Preset gallery** | Side-by-side: Default, Wireframe, CRT, Glitch, Bloom, Pixel, ASCII | PNG, 1920×1080 |
| 4 | **Gradient + opacity** | Picker open with gradient editor mid-edit, checkerboard visible | PNG, 1920×1080 |
| 5 | **Country selection** | Brazil-only view, both globe and flat side-by-side | PNG, 1920×1080 |
| 6 | **Export modal** | Export modal open on the SVG tab with the preview | PNG, 1920×1080 |

**Recording the demo video**: use macOS screen recording at 60fps (Cmd+Shift+5 → Options → Movie). Trim to ~20s. Compress to MP4 with HandBrake or ffmpeg:

```bash
ffmpeg -i raw.mov -c:v libx264 -crf 22 -preset slow -movflags +faststart -vf "scale=1920:-2,fps=30" globestudio-demo.mp4
```

---

## Pre-launch checklist (T-24h)

- [ ] Live site responds 200 and the picker still works
- [ ] `npm test -- --run` passes locally
- [ ] All gallery assets uploaded to PH
- [ ] Maker's first comment drafted in a separate doc, ready to paste
- [ ] You're available 6am–11pm PT on launch day for replies
- [ ] Social posts queued (see `social-threads.md`)
- [ ] Outreach emails sent (see `outreach-email.md`) — 48h before
- [ ] Backup plan if PH is rate-limited: schedule Show HN for the same morning

## Launch day rules of engagement

- **Do** ask people to "visit and try it" — PH allows this
- **Don't** ask anyone to upvote — explicitly against PH rules; can get the
  post taken down
- **Do** reply to every comment in the first 6 hours, even one-word ones
- **Do** edit the description if a recurring confusion shows up in comments
- **Do** pin a comment with answers to the top 3 questions once they emerge

## Topics (in order of priority)

1. Design Tools
2. Open Source
3. Developer Tools
4. Productivity

(You can pick 4 max. Design Tools is the most important.)

---

## Alternative tagline options (in case the primary lands wrong)

- `Open-source dotted maps and 3D globes for designers` ← primary (51 chars)
- `Designer-first dotted maps and 3D globes. Open source.` (54 chars)
- `Build dotted maps and animated 3D globes in your browser` (56 chars)
- `Stylized maps and globes for the design half of the stack` (57 chars)
