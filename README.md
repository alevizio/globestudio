# Worlddots

A personal, developer-friendly dotted map generator for making clean SVG and PNG map assets.

Worlddots lets you build dotted maps for the world, countries, regions, subregions, and US states. It is intentionally focused on quick visual iteration and easy export for use in apps, websites, decks, docs, and design systems.

## Features

- Generate dotted world, country, region, subregion, and US state maps.
- Adjust dot shape, density, size, foreground color, and background color.
- Preview with zoom, pan, tilt, and depth controls for a more spatial composition.
- Export production-ready SVG or PNG files.
- Copy generated SVG markup directly from the export menu.
- Use transparent backgrounds for compositing in other tools.

## Local Development

```bash
npm install
npm run dev
```

Open the local URL shown by Vite, usually:

```text
http://127.0.0.1:5173/
```

## Build

```bash
npm run build
```

## GitHub Pages

This repo deploys to GitHub Pages with GitHub Actions.

Live site:

```text
https://alevizio.github.io/worlddots/
```

## Tech Stack

- React
- Vite
- dotted-map
- d3-geo
- topojson-client
- world-countries
- lucide-react
