# Globestudio React starter

A small Vite and React app with a [Globestudio](https://globestudio.app)
globe on the page, drawn by
[`@globestudio/react`](https://www.npmjs.com/package/@globestudio/react).
It has a hero with the Halftone look and one design of your own on the CRT
look.

## Start

There are three ways in. Each needs Node 20.19 or later, except StackBlitz.

### degit

```bash
npx degit alevizio/globestudio/examples/starter-react my-globe
cd my-globe
npm install
npm run dev
```

degit copies this folder without the rest of the repo or its git history.

### StackBlitz

[Open in StackBlitz](https://stackblitz.com/github/alevizio/globestudio/tree/main/examples/starter-react)
to run it in the browser, with nothing to install.

### Clone

```bash
git clone --depth 1 https://github.com/alevizio/globestudio.git
cd globestudio/examples/starter-react
npm install
npm run dev
```

Then open http://localhost:5173.

## What's inside

| File | What it does |
|---|---|
| `src/App.jsx` | The page: a hero globe and a globe with your own design |
| `src/main.jsx` | Mounts the app |
| `src/styles.css` | A dark page in the Halftone look's background color |
| `index.html` | The page Vite serves |
| `vite.config.js` | Vite with the React plugin |

## Make it yours

- Change the look. `look` takes any look id, such as `aurora`, `risograph`
  or `vapor`. See them all in the [gallery](https://globestudio.app/gallery).
- Use your own design. Make one at [globestudio.app](https://globestudio.app),
  press D, and copy the React code from the Share tab. Its `config` holds the
  whole design, so it needs no `look`.
- Or change the `EUROPE` constant in `src/App.jsx`. With a look, the config
  holds only what changes. The keys are in the
  [config schema](https://globestudio.app/schema/config.json).
- Set the size. The globe fills its container's width and is 480 px tall
  unless you pass `height`. Numbers are pixels; strings take any CSS unit.
- Give every globe a `title` that says what it shows, for screen readers.
- Keep the default `loading="lazy"` for a globe below the fold. The hero
  uses `"eager"` so it starts at once.

## Build

```bash
npm run build
npm run preview
```

`build` writes the site to `dist/`, and `preview` serves it at
http://localhost:4173. The globe renders on globestudio.app inside an
iframe, so your bundle adds no three.js and no map data.

## More

- [`@globestudio/react`](https://github.com/alevizio/globestudio/tree/main/packages/react):
  every prop and the URL helpers
- [Integrations](https://globestudio.app/integrations): Webflow, Framer,
  Figma, Notion, WordPress, plain HTML and AI agents
- [Docs](https://globestudio.app/docs)
