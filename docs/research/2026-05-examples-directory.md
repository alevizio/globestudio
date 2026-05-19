# Examples directory strategy

**Date:** 19 May 2026
**Sources consulted:** OSS Gallery + 4 examples-pattern references + codebase audit
**Confidence:** High for pattern conventions · Medium for content priorities
**Status:** Plan written → see [`docs/plans/growth-rollout.md`](../plans/growth-rollout.md)

## Executive summary

The `examples/` folder was scaffolded during launch (task #12) but
is essentially empty — a placeholder README and not much else. Real
examples drive three downstream wins: marketing (designers see what's
possible), SEO (each example is an indexable page), and contributor
onboarding (each example is a code reference for "how do I do X").

The 2026 pattern for OSS designer-tool examples is roughly:
**4-8 hand-built reference examples** showing distinct use cases,
each in its own subfolder with a screenshot + 100-word README +
the exact config JSON to reproduce. Lottie, Three.js, and tldraw
all follow this model.

For Worlddots, the right v1 is **6 example folders**:

1. Landing page hero (animated globe in marketing hero)
2. Conference badge (PNG export of a single country dotted map)
3. Annual report cover (Solid mode + dramatic projection)
4. Animated reveal (WebM export, scroll-driven)
5. Country highlight (focused on a single region, with selection)
6. Embed snippet (the iframe approach from the integrations plan)

Each subfolder: `screenshot.png`, `README.md`, `config.json` (the
exact preset to reproduce), `index.html` if it's a runnable example.

## Key findings

### Finding 1 — Examples directory should be production-quality ✅

Half-built examples actively hurt — they signal "this project is
abandoned." The Three.js examples list is the gold standard: every
entry is genuinely runnable, screenshot-perfect, and used in real
projects.

For Worlddots, that means each example needs:

- A real production-quality screenshot (not a placeholder)
- Clear narrative ("this is what designer X built for client Y")
- The exact preset/config to reproduce
- Optional: a runnable `index.html` if it can embed Worlddots inline

Sources:
- [OSS Gallery — Open-Source Projects](https://oss.gallery/) ✅
- [SustainOSS — Tools for OSS Designers](https://sustainoss.org/design/designers/tools/) ✅

### Finding 2 — Each example doubles as an SEO landing page ✅

Per the [SEO research](2026-05-seo-playbook.md), Worlddots needs
more indexable surface beyond the homepage + 11 preset pages.
Examples are the natural expansion. Each example URL
(`/examples/landing-hero`, `/examples/annual-report`) targets a
distinct designer search intent.

This compounds with Phase 4 of the SEO plan (programmatic landing
pages) — examples and preset pages cross-link, building internal
authority.

Sources:
- [Programmatic SEO 2026 — Backlinko](https://backlinko.com/programmatic-seo) ⚠️

### Finding 3 — User submissions are the long-term flywheel ⚠️

The strongest examples directories grow from user submissions, not
hand-curation. Lottie's discover gallery, Tailwind UI's components
inspiration page, Spline's community page — all are user-submitted.

For v1 Worlddots needs hand-built seeds. By v2-v3 (6+ months), open
the directory to user PRs via a `examples/community/` subfolder
with submission guidelines (screenshot ≥1024px, license attribution,
config.json required).

## Recommendations

1. **Pick 6 example archetypes** that cover distinct designer
   workflows (landing hero, badge, report cover, animated reveal,
   country highlight, embed).
2. **Hand-build each example** to production quality — real
   screenshots, real narrative. ~1 hour per example = 6 hours total.
3. **Cross-link from README** — feature 3 examples prominently in
   the README's "What can you make with this?" section.
4. **Cross-link to presets** — each example mentions which preset
   it builds on, with a deep link to `/looks/<preset>`.
5. **Reserve a `community/` subfolder** for v2 user submissions,
   with a `CONTRIBUTING.md` for the examples directory specifically.

## Sources

1. [OSS Gallery — open-source project showcase](https://oss.gallery/) ✅
2. [Toolfolio — Curated Showcase of Open Source](https://toolfolio.io/blog/a-curated-showcase-of-trending-open-source-software) ⚠️
3. [SustainOSS — Tools for OSS Designers](https://sustainoss.org/design/designers/tools/) ✅
4. [SustainOSS — Case studies of design in OSS](https://sustainoss.org/design/examples/case-studies/) ✅
5. [Programmatic SEO 2026 — Backlinko](https://backlinko.com/programmatic-seo) ⚠️
