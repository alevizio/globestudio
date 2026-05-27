# Contributing to Globestudio

Thanks for being here. Globestudio is a designer-first tool — that means
contributions aren't just code. **Visual presets, example projects,
documentation rewrites, bug reports, and screenshots are all first-class**.

This guide tells you what's most useful, how to set up your environment, and
how the code is organized so a non-code contribution doesn't require you to
read the whole engine.

---

## Quickest ways to help

If you don't want to read this whole guide, the three highest-leverage things
you can do are:

1. **Build something with it and share a screenshot/recording.** Open a
   [Show & Tell discussion](https://github.com/alevizio/globestudio/discussions)
   with what you made. We curate the best ones into the README and showcase.
2. **Submit a preset.** A preset is just a named JSON config — see
   [Preset submissions](#preset-submissions) below.
3. **Report a browser issue.** If it lags, freezes, or renders wrong, use
   the [Performance / Browser report](https://github.com/alevizio/globestudio/issues/new?template=performance-report.yml)
   template. Include your OS, browser, and GPU.

---

## Local setup

Requires **Node 20+** and **npm**.

```bash
git clone https://github.com/alevizio/globestudio
cd globestudio
npm install
npm run dev
```

That opens the app at `http://127.0.0.1:5173/` (or `:5191` if 5173 is in use).

Useful scripts:

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server with HMR |
| `npm test -- --run` | Run the full Vitest suite (152 tests across 24 files) |
| `npm run test:e2e` | Run Playwright smoke + accessibility checks |
| `npm run test:watch` | Vitest watch mode |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Serve the production build locally |

Tests should pass and the build should succeed before you open a PR.

---

## Project shape

```
src/
  App.jsx                   # Top-level state, prop wiring, keyboard shortcuts
  main.jsx                  # Entry point + console wave
  styles.css                # All styles. Token-driven (var(--accent), etc.)
  components/
    control-panel.jsx       # Right-hand settings panel
    globe-background.jsx    # Three.js scene + render loop
    export-modal.jsx        # PNG/SVG/WebM export UI
    looks-bar.jsx           # Preset chip bar
    look-preview.jsx        # Mini globe SVG inside each chip
    shortcuts-overlay.jsx   # ? overlay
    icons.jsx               # Re-exports lucide icons + custom marks
    ui/
      color-swatch.jsx      # The Color row trigger
      color-picker.jsx      # Card-style picker (Solid/Gradient + HEX/RGB/HSB/HSL)
      searchable-select.jsx # Country/region combobox
      shape-select.jsx      # Dot-shape selector
      range-control.jsx     # Slider primitive
      toggle-control.jsx    # Pill toggle primitive
      panel-section.jsx     # Collapsible section
      option-row.jsx        # Label + control row
      ...
  config/
    constants.js            # dotShapeOptions, US_COUNTRY_ID, etc.
    globe-settings.js       # Default globe settings + look options
    shader-effects.js       # Shader effect catalog + presets
  data/
    geography.js            # Country options + cca3↔ccn3 lookup
    look-presets.js         # The named presets in the looks bar
    us-states.js            # Loader for us-atlas state geometry
    world-countries-topology.js # Loader for world-atlas
  hooks/
    use-persisted-state.js  # localStorage-backed useState
    use-prefers-reduced-motion.js
  three/
    globe.js                # Three.js scene assembly, dot layer, shaders
    geometry.js             # Dot geometry builders, ASCII text texture
    globe-network.js        # Animated network arcs
    world-texture.js        # Solid mode Canvas2D world texture
    post-effects.js         # Post-processing composer
    space-mesh.js           # Animated space background
  utils/
    color.js                # hex/rgb/hsb/hsl conversion
    custom-shape.js         # SVG/PNG upload + SVG paste sanitizer
    dot-generation.js       # dotted-map wrapper + state dot generation
    export.js               # PNG / SVG / WebM export helpers
    svg-markup.js           # SVG export markup builder
    svg-shapes.js           # Shared shape point generators
    math.js, projection.js
```

Tests are co-located with their source as `*.test.{js,jsx}`.

---

## Design system rules

These are not negotiable in a PR review — they keep the panel feeling tight:

- **Tokens only for color/spacing.** Use `var(--field)`, `var(--border)`,
  `var(--text)`, `var(--muted)`, `var(--dim)`, `var(--panel)`, `var(--accent)`.
  No hard-coded hex.
- **Easing**: `var(--ease)` (`cubic-bezier(0.2, 0.7, 0.2, 1)`) for animations.
- **Durations**: `140ms / 180ms / 260ms` for small interactions,
  `420ms / 520ms / 620ms` for action feedback, `1400ms` for info display.
- **Border-radius scale**: `5 / 6 / 8 / 16 / 999px`.
- **State modifiers**: `.is-*` classes (e.g., `.is-applied`, `.is-rippling`).
- **Respect `prefers-reduced-motion: reduce`** for any new animation. The
  existing pattern is in `hooks/use-prefers-reduced-motion.js`.
- **Tailwind utility-first thinking, but write it in `styles.css`** — we don't
  ship Tailwind, but the discipline of single-purpose classes applies.

---

## Browser support

Target the latest two versions of:

- Chrome / Edge (Blink)
- Firefox
- Safari (macOS) + iOS Safari

WebGL 2 is required. The app degrades gracefully without dot animations when
`prefers-reduced-motion` is set.

---

## Performance budget

This is a graphics-heavy creative tool. Performance is a launch blocker, not a
polish issue.

- 60 fps on a 2020 MacBook Pro at the default look
- 30 fps minimum on a Pixel 6 in mobile Chrome at density 40, dot size 10
- Adaptive DPR is already wired in `globe-background.jsx` — don't fight it,
  hook into it if you add new GPU-heavy passes

Run the dev server, open Chrome's Performance tab, and record a 5-second trace
on the default look before submitting a PR that touches the render loop.

---

## Contribution types

### Bug reports

Use the [Bug report](https://github.com/alevizio/globestudio/issues/new?template=bug-report.yml)
template. The form asks for repro steps, browser/OS, and what you expected.
Screenshots and short screen recordings are gold.

### Feature requests

Open a [Discussion in Ideas](https://github.com/alevizio/globestudio/discussions/new?category=ideas)
first if it's open-ended. Use the [Feature request](https://github.com/alevizio/globestudio/issues/new?template=feature-request.yml)
issue template when the idea is concrete enough to scope.

### Preset submissions

Presets live in [src/data/look-presets.js](src/data/look-presets.js). To add
one:

1. Build the look in the live tool
2. Click Export → Share → Copy share link (or the export modal → Config → Export config)
3. Open the [Preset submission](https://github.com/alevizio/globestudio/issues/new?template=preset-submission.yml)
   issue with the resulting JSON
4. We'll merge it as a built-in preset and credit you

Good presets:
- Have a distinctive look (not "Default with red dots")
- Work at multiple densities
- Survive both globe and flat view

Preset entries are validated against
[`public/schema/look-preset.json`](public/schema/look-preset.json) by
`src/data/look-presets.test.js`. The schema is the public contract — `id`
must be kebab-case and unique, `name`/`blurb` have length limits, and
`settings` follows the main config schema. CI will reject PRs that
break the contract.

### Example projects

We want examples that prove the tool is useful in real product work:

- Landing page hero with a globe background
- Static SVG for a deck or print piece
- Animated WebM for a launch video
- Country-specific data story

Open a [Show & Tell discussion](https://github.com/alevizio/globestudio/discussions/new?category=show-and-tell)
with a link to your repo or a CodeSandbox.

### Documentation

The README and this guide are first-class code. Typo fixes, clarity passes,
broken-link reports — all welcome. Open a PR directly.

### Code

For non-trivial code changes, please open a Discussion or Issue first to align
on direction. Saves time on both sides.

---

## PR process

1. Fork the repo and create a branch off `main`. Branch names are loose —
   `fix/picker-overflow` or `feat/triangle-stops` are both fine.
2. Make your changes. Keep commits focused — atomic is better than perfect.
3. Run `npm test -- --run` and `npm run build`. Both should pass.
4. Open the PR using the [pull request template](.github/PULL_REQUEST_TEMPLATE.md).
   Include before/after screenshots for any visual change.
5. A maintainer will review within a few days. Expect feedback — please don't
   take it personally.

### Commit style

Conventional commits-ish, but light. Imperative, no enforcement:

- `feat: add gradient picker to dot color`
- `fix: solid mode honors area selection`
- `docs: clarify CONTRIBUTING setup`
- `refactor: extract gradient sampler`
- `test: cover empty-state fallback`

### Code style

- **TypeScript strict where present.** Most files are still `.jsx` — that's
  fine. New utilities are welcome in `.ts`.
- **Named exports**, not default.
- **Arrow function components**.
- **File naming**: `kebab-case.jsx` for files, `PascalCase` for components.
- **Destructure props** in parameters.
- **`cn()` for conditional classes** — never string concatenation.
- **No magic numbers** — token scale values or named constants.
- **Components under 150 lines.** Extract sub-components when larger.

---

## How decisions get made

Right now the project has a single maintainer (alevizio). Direction is set in
the [Roadmap](ROADMAP.md) and refined in
[Discussions](https://github.com/alevizio/globestudio/discussions). As the
contributor base grows, we'll formalize this in [GOVERNANCE.md](GOVERNANCE.md).

If you have a deeper question about scope, philosophy, or where the project
should go — start a Discussion.

---

## Recognition

Every merged contribution lands in the
[CHANGELOG](CHANGELOG.md), and consistent contributors get credited in the
README. If you want your work showcased differently, just tell us.

---

Thanks for being here.
