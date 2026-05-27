# Submitting Globestudio to Figma Community

Step-by-step walkthrough + ready-to-paste copy for the submission form.

## Prerequisites (~5 min)

- Figma desktop installed
- The plugin running locally via `Plugins → Development → Import plugin from manifest…` (see README)
- You're signed into your Figma account

## Generate the assets you'll need

### Plugin icon — 128 × 128 PNG
Reuse the existing `/favicon.svg` from the main repo, rasterized:

```bash
cd /Users/alevizio/Documents/GitHub/worlddots
npx @resvg/resvg-js-cli public/favicon.svg --width 128 --height 128 > figma-plugin/icon.png
```

(or open `public/favicon.svg` in Figma and export at 128 × 128)

### Cover image — 1920 × 960 PNG
The hero image shown on the plugin's Community page. Highest-impact spot. Two paths:

**Quick option:** reuse `/public/og/default.png` (1200 × 630). Resize to 1920 × 960 in Figma, add a "Insert dotted globes into Figma" line in big type.

**Proper option:** design a fresh cover in Figma. Show the plugin panel UI + a Figma frame with an inserted globe + a "Drop the world in your design files" tagline.

### Screenshots — 4-6, each 1280 × 800 PNG
Show:
1. Plugin panel open in Figma design with the live globe rendered
2. The Insert button highlighted
3. A Figma frame with an inserted globe at brand-blue tint
4. The preset picker showing thumbnails
5. (optional) FigJam board with a globe sticky
6. (optional) The update-in-place flow

Capture from the desktop app at 1× or 2× display, then resize to 1280 × 800.

## Submit to Figma Community

1. **Plugins → Development → Globestudio → Publish new release…**
   (right-click the plugin name in the dev menu)
2. Form opens in your browser. Fill in:

### Form fields — copy/paste

| Field | Value |
|---|---|
| **Plugin name** | `Globestudio` |
| **Tagline** (max 80 chars) | `Designer-first dotted globes and maps. 21 shader looks. No installs.` |
| **Description** (max 1000 chars) | (see below) |
| **Category** | `Design` (primary), `Productivity` (secondary) |
| **Tags** | `globe`, `map`, `data-viz`, `dots`, `cartography`, `embed`, `shader`, `aesthetic` |
| **Creator** | Your Figma profile |
| **Support contact** | `viziomas@gmail.com` |
| **Website** | `https://globestudio.app` |
| **Privacy policy** | `https://globestudio.app/privacy` |
| **Plugin code license** | `MIT` |

### Description (paste verbatim, edit to taste)

```
Drop a customized dotted globe or country map into your Figma file as a
high-resolution image. The plugin opens a panel with the full Globestudio
canvas — pick any of 21 shader looks (Halftone, Risograph, Aurora,
Vapor, CRT, Pixel, Bloom, Iridescent, and more), filter to any country
or region, customize colors and density, then press Insert.

What you get:
• 21 ready-made shader presets (halftone print, vinyl wave, holographic,
  CRT scanlines, hand-drawn pencil, more)
• Any country, region, or continent — 250+ pre-tagged selections
• Customize dot color, density, shape, background, glow
• 1200 × 675 PNG by default; insert at the viewport center
• Update-in-place: keep the existing rectangle selected and press Insert
  again to swap the image without spawning duplicates
• Works in Figma design files AND FigJam

How it works:
The plugin UI is a thin iframe over globestudio.app/embed — the same
canvas designers use on the web. Press Insert and the live frame
captures as a PNG and lands on your canvas. No extra service, no
account required, no exported assets to manage.

Open source MIT — github.com/alevizio/globestudio
```

### Network access reasoning (already in manifest)

If Figma asks why the plugin needs network access:

> The plugin UI is hosted at globestudio.app/embed — designers interact
> with the live Globestudio canvas inside the plugin panel and capture
> the resulting frame as a PNG to insert. No data is uploaded back to
> globestudio.app from the user's design.

## After submission

Figma review typically takes 1-2 weeks for a first-time submission and
1-3 days for subsequent versions. You'll get an email when it's live.

Once approved, the public URL will be:

```
https://www.figma.com/community/plugin/<plugin-id>/globestudio
```

**Action item once live:** swap the Figma card on `/integrations` to
link directly to the Community page instead of the FigJam embed note.
A future commit will add a `cta: { href, label }` field to the Figma
INTEGRATION entry pointing at the published plugin URL.

## Versioning

For subsequent releases:
1. Bump implied version in `manifest.json` (Figma's manifest doesn't have
   a version field but you can set one in `Plugins → Development → Manage`
   when publishing)
2. Right-click plugin in dev menu → **Publish new release…**
3. Write release notes in the form (what changed since last version)
4. Submit. Patch releases are usually approved within 1-3 days.

## Plugin ID

The `id` field in `manifest.json` (currently `globestudio-figma`) is your
private dev identifier. Figma assigns a separate public ID when published —
you'll see it in the Community URL above.
