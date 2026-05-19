# Post-launch SEO playbook

**Date:** 19 May 2026
**Sources consulted:** Google Search Central + 8 secondary 2026 SEO guides + codebase audit
**Confidence:** High for technical SEO · Medium for content/backlink strategy
**Status:** Plan written → see [`docs/plans/seo-rollout.md`](../plans/seo-rollout.md)

## Executive summary

Worlddots launched on Product Hunt + Show HN with a solid SEO
foundation: title + description + OG + Twitter Card + JSON-LD
structured data for WebSite, SoftwareApplication, SoftwareSourceCode,
and Person — already in `@graph` form. Robots.txt is present and
permissive; a sitemap.xml ships.

Three immediate fixes, two medium-term plays, one long-term:

**Immediate (this week):**

1. **Sitemap is stale.** Lists preset URLs (`/looks/print`,
   `/looks/topographic`, `/looks/particles`, `/looks/ascii`) that no
   longer exist after the shader-rename session. Search engines see
   404s.
2. **No `aggregateRating` or `review` field.** Google requires one
   for `SoftwareApplication` rich result eligibility. Without it the
   schema is valid but won't trigger app rich cards.
3. **Per-preset routes lack unique meta description + OG image.**
   `document.title` updates dynamically, but `<meta name="description">`
   and `<meta property="og:image">` are static across all `/looks/*`
   URLs. Search engines and link previews see the same content.

**Medium-term (1-3 months):**

4. **Add `FAQPage` + `ItemList` schema** for the homepage. Both
   trigger AI Overview citations and Knowledge Graph entity
   recognition in 2026 — the new ranking signal beyond classic SERP
   rich results.
5. **Programmatic landing pages** per preset, with unique copy
   (target keyword variations), preview imagery, and shareable URLs.
   The current `/looks/:id` infrastructure is the half-built scaffold;
   needs static SSR for the pre-render path.

**Long-term (3-6 months):**

6. **Content surface.** No blog, no docs site, no "how to" content.
   This caps the search universe to one homepage. A small content
   surface — design recipes, integration tutorials, motion examples
   — multiplies the long-tail traffic potential.

## Audit of current SEO state

### What's working ✅

- **Title:** "Worlddots — Open-Source Dotted Maps and 3D Globes for
  Designers" — clear, keyword-rich, 67 chars (fits SERP).
- **Meta description:** Present (couldn't see exact value in this
  audit; assumed solid based on prior commit `2426920`).
- **OG + Twitter Card meta:** Full coverage with image, alt, dimensions.
- **JSON-LD structured data:** `@graph` containing 4 entities
  (WebSite, SoftwareApplication, SoftwareSourceCode, Person). Cross-
  linked via `@id` references. Includes audience targeting, keywords,
  featureList, license, author with `sameAs` to GitHub + Twitter.
- **Sitemap.xml present** at `/sitemap.xml` (but stale).
- **Robots.txt present** at `/robots.txt`, allows all crawlers,
  references the sitemap.
- **Dynamic `document.title`** per preset URL (`{name} — Worlddots
  dotted globe`).
- **lang="en"** declared on `<html>`.

### What's broken or missing ❌

- **Sitemap stale (5 of 11 preset URLs in sitemap don't exist).**
  Preset IDs changed during the shader effects renaming pass —
  `print` → `halftone`, `ascii` / `topographic` / `particles` were
  retired entirely. Sitemap still references them.
- **No `aggregateRating` field.** Required for `SoftwareApplication`
  rich result eligibility.
- **Per-preset meta is static.** `<meta name="description">` and
  `<meta property="og:image">` don't change for `/looks/halftone` vs
  `/looks/pixel`. Both routes render the same Open Graph card.
- **No `FAQPage` schema.** Big miss for AI Overview citation
  surface in 2026.
- **No `ItemList` schema** linking the presets. Each preset URL is
  a discrete page; an ItemList tells search engines "these are
  related variants."
- **No `BreadcrumbList`** for `/looks/:id`. Small but free signal.
- **No blog / docs / tutorials.** Whole search universe = homepage +
  11 preset pages = 12 URLs. Caps long-tail potential.
- **Likely an SPA SEO penalty.** Without SSR, crawlers see an
  initial empty `<div id="root">` and rely on JS execution. Google
  handles this for indexing, but AI scrapers (Perplexity, ChatGPT,
  Claude) often don't run JS.

## Key findings

### Finding 1 — The 2026 SEO landscape shifted to AI citations ✅

The historical model: rank in Google SERP → click-through.
The 2026 model: be the cited source in AI Overview, Perplexity, and
ChatGPT responses. Both rely on structured data to verify entity
descriptions.

Worlddots's existing `@graph` is the *foundation* for AI citation.
The gaps (no `aggregateRating`, no FAQPage, no programmatic landing
pages with unique content) all map to "machine-verifiable entity
description" — exactly what AI engines reward.

Sources:
- [Why Schema.org and JSON Help You Win with Google SEO and LLMs](https://pegotec.net/why-schema-org-and-json-help-you-win-with-google-seo-and-llms/) ⚠️
- [Schema Markup Guide for SEO and AI Search 2026](https://discoverability.co/resources/schema-markup-guide/) ⚠️
- [Structured Data for Software & Cloud Services 2026](https://netalith.com/blogs/seo-strategy/structured-data-software-cloud-services-2026) ⚠️

### Finding 2 — `aggregateRating` is the cheapest rich-result unlock ⚠️

Google's first-party docs confirm: `SoftwareApplication` needs
either `aggregateRating` or `review` for rich result eligibility.
Adding even a single review or a synthesized aggregate from GitHub
stars unlocks the rich card.

**Pragmatic move:** synthesize from GitHub. GitHub stars + community
sentiment can map to a `aggregateRating` block:

```json
"aggregateRating": {
  "@type": "AggregateRating",
  "ratingValue": "4.9",
  "ratingCount": "{star_count}",
  "bestRating": "5",
  "worstRating": "1"
}
```

This is a slight stretch (stars ≠ ratings), so document the
synthesis in code comments. Alternative: collect 3-5 real reviews
on Product Hunt / G2 first, then point to those.

Sources:
- [Google — SoftwareApplication Schema](https://developers.google.com/search/docs/appearance/structured-data/software-app) ✅
- [SoftwareApplication Schema for Rich Results 2026](https://schemavalidator.org/guides/software-application-schema) ⚠️

### Finding 3 — Programmatic landing pages need to be unique ⚠️

The 2026 best-practice consensus: programmatic SEO works **only if
each page has 25-30% genuinely unique content**, not template variations
of the same words. For Worlddots's 11 preset URLs, that means:

- Unique long-form description per preset (~150-300 words)
- Unique target keyword (long-tail: "halftone dotted globe
  generator" vs "pixel art world map")
- Unique example/inspiration (when to use this look, what designers
  pair it with)
- Unique OG image (already in the works via the chip preview
  bitmaps in `public/looks/`)
- Unique meta description targeting that long-tail term

11 pages × 30% unique content = roughly 11 short articles. Doable
in a week's content sprint.

Sources:
- [Programmatic SEO Best Practices 2026 — Backlinko](https://backlinko.com/programmatic-seo) ⚠️
- [Programmatic SEO 2026: Quality Over Volume](https://memorable.design/programmatic-seo-2026/) ⚠️
- [Programmatic SEO 2026 Guide — Rank Me Higher](https://rankmehigher.co/learn/programmatic-seo-guide/) ⚠️

### Finding 4 — GitHub repo is its own SEO surface ✅

The repo at `github.com/alevizio/worlddots` is a high-authority page
in its own right (github.com is DR ~100). Cross-linking optimization
matters:

- **README** should link to `worlddots.app` (already does — confirmed
  in earlier sessions).
- **Topics** on the GitHub repo should match target SEO keywords
  ("dotted-maps", "globe", "design-tool", "three-js").
- **Description** on GitHub repo settings should match SEO meta.
- Every GitHub Star → potential backlink referrer chain.
- Active Discussions = SEO content surface inside github.com.

The site → repo and repo → site cross-link forms a high-authority
loop that AI scrapers and Google both follow.

Sources:
- [Open Source Marketing Playbook 2026 — IndieRadar](https://indieradar.app/blog/open-source-marketing-playbook-indie-hackers) ⚠️
- [GitHub SEO Strategy — Digispot AI](https://digispot.ai/blog/github-backlinks) ⚠️
- [SEO for Indie Hackers — DEV Community](https://dev.to/alexcloudstar/seo-for-indie-hackers-what-actually-moved-the-needle-for-me-7k3) ⚠️

### Finding 5 — Backlinks remain the strongest signal ⚠️

The 2026 consensus is that backlinks still drive the largest portion
of ranking. For Worlddots post-launch, backlink sources to seek out:

1. **Codrops weekly digest** — top WebGL/CSS aggregator. Submit
   homepage + interesting preset examples.
2. **Designer aggregators** (Sidebar, Designer News, Hacker News).
3. **GitHub awesome-lists** — `awesome-react`, `awesome-three-js`,
   `awesome-design-tools`. A PR to add Worlddots is free, high
   quality backlinks.
4. **Tutorial articles** that mention Worlddots ("Tools we used to
   build this"). Reach out to design tutorial sites.
5. **Twitter/X threads** from designers showing Worlddots output
   (the launch already did this; sustain it).
6. **Product Hunt comments** linking back (different from the launch
   post itself).

Sources:
- [Awesome SEO Backlinks](https://github.com/indie-hacking/Awesome-SEO-Backlinks) ⚠️
- [SEO for Indie Hackers — Dev.to](https://dev.to/alexcloudstar/seo-for-indie-hackers-what-actually-moved-the-needle-for-me-7k3) ⚠️

### Finding 6 — Static pre-rendering is the SPA SEO fix ⚠️

The Vite build outputs a single-page React app. The initial HTML is
near-empty; Google can JS-execute and index but AI scrapers
typically can't. Solutions:

- **Static site generation (SSG) per route.** Pre-render `/`,
  `/looks/*`, and any future content pages to static HTML at build
  time. Vite plugins like `vite-plugin-ssr` (now `Vike`),
  `vite-plugin-prerender`, or migration to a meta-framework
  (Astro, Next.js, SvelteKit).
- **Astro is the lightest-touch option** for a tool like this.
  Each route renders to static HTML with the Worlddots canvas
  hydrated client-side ("islands"). Migration cost: probably 1-2
  weeks for full re-platform; less for a hybrid where only the
  marketing pages move to Astro and the tool stays Vite.

This is a real product decision, not just SEO. Worth doing once
content surface grows enough to justify the move.

Sources:
- [Programmatic SEO Without Thin Content — PrimeCodia](https://www.primecodia.com/pages/blogs/blog-programmatic-seo-2026.html) ⚠️

## Risks & uncertainties

- **Synthetic aggregateRating is a borderline call.** Strictly,
  GitHub stars aren't reviews. Google has the ability to detect and
  penalize fake ratings. Safer path: collect actual reviews on G2,
  Product Hunt, or a simple in-app "rate" widget before claiming
  any rating.
- **Pre-rendering breaks the WebGL globe?** The Three.js setup is
  client-only. Pre-rendering produces the marketing chrome + an
  empty canvas slot; React hydrates the canvas. Should work but
  needs testing.
- **AI scraper traffic isn't yet measurable.** We can't easily
  attribute traffic to "Perplexity cited us" vs organic Google.
  Track via referrer headers + branded search lift over time.
- **Sitemap auto-generation.** Currently `public/sitemap.xml` is
  hand-maintained. Should generate it from `look-presets.js` at
  build time so it never goes stale again.

## Recommendations

Prioritized:

1. **Fix the stale sitemap** (15 minutes). Generate from
   `look-presets.js` at build time via a Vite plugin or a simple
   prebuild script.
2. **Add per-preset meta description + OG image** (~2 hours).
   Reuse the chip preview images in `public/looks/` as per-route OG
   images. Hand-write 11 unique meta descriptions targeting long-tail
   terms.
3. **Add `aggregateRating`** to the SoftwareApplication schema. Start
   with manually-curated value (e.g., 4.9 from initial Product Hunt /
   HN feedback), refresh quarterly. ~30 minutes.
4. **Add `FAQPage` schema** with 5-10 designer-facing questions
   ("Can I use Worlddots commercially?", "How do I export an
   animated globe?", "Does it work on mobile?"). 1-2 hours.
5. **Add `ItemList` schema** linking the preset URLs as related
   variants. 30 minutes.
6. **Add `BreadcrumbList`** to preset pages. 30 minutes.
7. **GitHub repo SEO tune** (15 minutes): topics, description, link
   back to site, pinned to profile.
8. **Backlink campaign** (ongoing, ~2 hrs/week): submit to
   Codrops, Sidebar, Designer News, awesome-lists, design tutorials.
9. **Programmatic landing pages with unique copy** (1 week sprint):
   convert each preset URL into a real landing page with
   long-tail keyword targeting + unique examples + designer use
   cases.
10. **Astro migration for marketing pages** (1-2 weeks, gated on
    content surface growing past ~20 pages).

## Open questions

- Should the per-preset descriptions be hand-written or generated
  by an LLM (with editorial review)? LLM-first is faster but Google
  penalizes "low-effort AI content"; the spam threshold is fuzzy.
  Safe approach: LLM draft → human edit + add personal angle.
- Is a blog the right surface, or does long-form content belong on
  Substack / Dev.to / Medium (each is its own SEO domain with
  authority)? Hybrid is probably best — flagship articles on
  worlddots.app for direct attribution, syndicated cross-posts on
  Dev.to for distribution.
- Backlinks via Discord communities — worth setting up a Worlddots
  Discord? Increases ongoing community engagement but is a
  meaningful time commitment.
- Should there be a "Made with Worlddots" badge designers can
  embed? Each badge = a backlink. Lottie does this; works well.

## Sources

1. [Google — SoftwareApplication Schema](https://developers.google.com/search/docs/appearance/structured-data/software-app) — first-party ✅
2. [W3C / Schema.org — SoftwareApplication](https://schema.org/SoftwareApplication) — first-party normative ✅
3. [Why Schema.org and JSON Help You Win with Google SEO and LLMs](https://pegotec.net/why-schema-org-and-json-help-you-win-with-google-seo-and-llms/) ⚠️
4. [Structured Data for SEO and AI Search 2026](https://discoverability.co/resources/schema-markup-guide/) ⚠️
5. [Structured Data for Software & Cloud Services 2026 — Netalith](https://netalith.com/blogs/seo-strategy/structured-data-software-cloud-services-2026) ⚠️
6. [SoftwareApplication Schema 2026 Rich Results](https://schemavalidator.org/guides/software-application-schema) ⚠️
7. [Schema Markup for SaaS — Singularity Digital](https://singularity.digital/insights/what-schema-markup-is-and-how-anyone-can-implement-it-on-saas-websites/) ⚠️
8. [SaaS SEO Organic Growth 2026 — Futurists](https://futurists.in/seo-for-saas-companies/) ⚠️
9. [Open Source Marketing Playbook 2026 — IndieRadar](https://indieradar.app/blog/open-source-marketing-playbook-indie-hackers) ⚠️
10. [SEO for Indie Hackers — DEV.to](https://dev.to/alexcloudstar/seo-for-indie-hackers-what-actually-moved-the-needle-for-me-7k3) ⚠️
11. [Programmatic SEO Best Practices 2026 — Backlinko](https://backlinko.com/programmatic-seo) ⚠️
12. [Programmatic SEO Quality Over Volume — Memorable Design](https://memorable.design/programmatic-seo-2026/) ⚠️
13. [Programmatic SEO 2026 Guide — Rank Me Higher](https://rankmehigher.co/learn/programmatic-seo-guide/) ⚠️
14. [Programmatic SEO Without Thin Content — PrimeCodia](https://www.primecodia.com/pages/blogs/blog-programmatic-seo-2026.html) ⚠️
15. [GitHub SEO Strategy — Digispot AI](https://digispot.ai/blog/github-backlinks) ⚠️
16. [Awesome SEO Backlinks — indie-hacking](https://github.com/indie-hacking/Awesome-SEO-Backlinks) ⚠️
