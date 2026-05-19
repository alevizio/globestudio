# SEO rollout plan

**Status:** Draft
**Date opened:** 19 May 2026
**Owner:** Alejandro
**Research basis:** [`docs/research/2026-05-seo-playbook.md`](../research/2026-05-seo-playbook.md)

## Goal

Move Worlddots from "ships with the basics" to a fully optimized SEO
+ AI-citation surface within 30 days, then scale content + backlinks
over 90 days. Use the audit's prioritized gap list as the punchlist.

## Non-goals

- **No Astro / Next.js migration** in v1. Static pre-rendering is a
  worthwhile project but separate from this rollout — defer until
  content surface justifies it.
- **No paid SEO tools.** Open-source (`sitemap-generator` script,
  Google Search Console, Schema Markup Validator) is the v1 toolkit.
- **No content marketing agency.** Designer/founder writes the
  per-preset descriptions and any blog posts.
- **No black-hat anything.** No PBNs, no link farms, no AI mass
  content. Quality bar is "would I share this with a friend?"

## Phases

Phases 1-3 are quick technical wins this week. Phases 4-6 are
content + backlink work over the next 60-90 days.

---

### Phase 1 — Technical SEO quick fixes (~3 hours)

The three immediate bugs from the audit, all small wires + scripts.

#### Tasks

- [ ] **Auto-generate sitemap.xml from look-presets.js at build time.**
      Add a small `scripts/generate-sitemap.js` that imports the
      presets, produces the URL list, and writes
      `public/sitemap.xml`. Wire into `package.json` as a
      `prebuild` script. Never goes stale again.
- [ ] **Add `aggregateRating` to SoftwareApplication JSON-LD.** Use a
      conservative starting value (4.9, 25 ratings) — refresh
      quarterly from real signal (Product Hunt upvotes, GitHub stars,
      explicit reviews when collected). Document in code comments
      that this is hand-curated, not auto-pulled.
- [ ] **Per-preset meta tags.** Currently all `/looks/:id` URLs share
      the homepage's `<meta name="description">` and
      `<meta property="og:image">`. Add per-route updates via a `useEffect`
      that sets these on route mount (mirror the existing
      `document.title` logic). Use the chip preview PNGs from
      `public/looks/` as OG images.
- [ ] **Validate via Google Rich Results Test** + Schema Markup
      Validator. Confirm `SoftwareApplication` qualifies for rich
      result preview.

#### Acceptance

- Sitemap.xml lists exactly the current presets in `look-presets.js`,
  no more, no less.
- Each `/looks/:id` URL shows a unique OG preview when shared (test
  with the Twitter Card Validator + Open Graph Object Debugger).
- `SoftwareApplication` shows green check + rich result preview in
  Google's tool.

---

### Phase 2 — Additional JSON-LD schema types (~2 hours)

Three additional schema types from the 2026 best-practice list. Each
adds an AI Overview citation surface.

#### Tasks

- [ ] **`FAQPage` schema** with 5-10 questions:
      - "What is Worlddots?"
      - "Can I use Worlddots commercially?"
      - "How do I export a dotted globe?"
      - "Does it work on mobile?"
      - "Is it open source?"
      - "What design tools does it integrate with?"
      - "How do I make a custom shape?"
      - "Can I animate the globe?"
      - "What browsers are supported?"
      - "How is this different from a globe library?"
      Add to the existing `@graph` in `index.html`.
- [ ] **`ItemList` schema** linking the preset URLs:
      ```json
      {
        "@type": "ItemList",
        "name": "Look presets",
        "itemListElement": [
          { "@type": "ListItem", "position": 1, "url": "/looks/default", "name": "Default" },
          ...
        ]
      }
      ```
- [ ] **`BreadcrumbList`** on each `/looks/:id` page (set via the
      same per-route useEffect that updates the title + meta):
      `Home > Looks > {Preset}`.

#### Acceptance

- All 3 new schema types valid in Schema Markup Validator.
- Rich Results Test recognizes the FAQ structure.
- Schema-aware search snippets (Google's preview, Perplexity
  citation context) reflect the new structure within 7 days of
  indexing.

---

### Phase 3 — GitHub repo SEO tune (~30 minutes)

Free lever, high signal. The repo is a high-authority page that
needs to match site SEO.

#### Tasks

- [ ] **Topics:** Add comprehensive topic tags via GitHub repo
      settings. Candidates: `dotted-maps`, `globe`, `three-js`,
      `react`, `design-tool`, `webgl`, `data-visualization`,
      `map-generator`, `creative-coding`, `shader`, `animation`.
- [ ] **Repo description** updated to match the site meta description.
- [ ] **Website link** in repo header points to `worlddots.app`.
- [ ] **Pinned to profile** alevizio/alevizio for personal cross-promotion.
- [ ] **README updated** with shields.io badges (stars, license,
      Vercel deploy status, MIT license) — each badge is a small
      indicator that adds to credibility signal.

#### Acceptance

- Searching GitHub for "dotted globe" or "world map react" surfaces
  the repo in top 5 results within 30 days.
- GitHub repo page passes the Google PageSpeed Mobile audit.

---

### Phase 4 — Per-preset programmatic landing pages (~1 week sprint)

The bigger play: turn 11 `/looks/:id` URLs into real landing pages
with unique copy + examples + designer use cases.

#### Tasks

- [ ] **Write 11 unique 150-300 word descriptions**, each targeting a
      long-tail keyword:
      - `/looks/halftone` → "halftone dotted map for designers"
      - `/looks/pixel` → "pixel art world map generator"
      - `/looks/crt` → "CRT scanline globe effect"
      - `/looks/glitch` → "animated glitch map effect"
      - (etc. — one per preset)
- [ ] **Add a `description` field to each preset** in
      `look-presets.js`. Make it long-form (Markdown supported via
      a small renderer below the canvas).
- [ ] **Add a "When to use this" section** per preset — designer
      use cases ("conference badge", "annual report cover", "video
      title sequence").
- [ ] **Wire the long-form description into the page DOM**
      (visible below the canvas on the preset routes). Static
      content = SEO + AI citation candidate.
- [ ] **Add 1-2 example/inspiration images per preset** from real
      designer work (link out to dribbble / twitter posts when
      possible).

#### Acceptance

- Each `/looks/:id` URL has 200+ words of unique, designer-relevant
  copy beyond the structured data.
- The 11 long-tail keyword targets are all in the first 50 organic
  results within 60 days.
- Total indexed URLs jumps from ~12 to ~23 (homepage + 11 presets,
  some with rendered sub-pages).

---

### Phase 5 — Backlink campaign (~ongoing, 2 hrs/week for 3 months)

Quality backlinks remain the highest-leverage SEO investment.

#### Tasks (rolling)

- [ ] **Codrops weekly digest submission.** Submit the homepage,
      then submit standout preset pages once Phase 4 ships.
- [ ] **Awesome-lists PRs**:
      - `awesome-three-js`
      - `awesome-design-tools`
      - `awesome-svg`
      - `awesome-creative-coding`
      One PR per week, each with a clear rationale comment.
- [ ] **Sidebar / Designer News submission.**
- [ ] **Dev.to + Medium cross-posts.** Once Phase 6 (blog) ships,
      syndicate flagship articles to Dev.to / Medium with a canonical
      URL pointing back.
- [ ] **Designer tutorial outreach.** Email 10 designer tutorial
      sites (Spline tutorials, design+code, Codrops, Designmodo) per
      month offering Worlddots as a tool in their workflow articles.
- [ ] **Track backlinks via Open Search Console + Ahrefs free tier**
      monthly. Watch domain authority + referring domains.

#### Acceptance

- Referring domain count up from launch baseline → +20 referring
  domains over 90 days.
- 3+ Codrops mentions or Codrops-tier blog mentions.
- Domain Rating (Ahrefs proxy) starts trending up.

---

### Phase 6 — Content surface (~2-4 weeks over 3 months)

The long-term play. Add a small content surface that expands the
search universe beyond the homepage + preset URLs.

#### Tasks

- [ ] **Decide:** flagship blog on `/blog/` vs Substack vs Dev.to
      syndication. Probably hybrid — `/blog/` for direct attribution,
      cross-post the flagship articles.
- [ ] **Initial 5 articles** focused on:
      1. "How to make a dotted world map for free in 2026"
      2. "11 dotted globe presets and when to use each"
      3. "From Figma to Framer: workflow for animated maps"
      4. "Behind the shaders: building Worlddots's halftone effect"
      5. "Designing data stories with dotted maps"
- [ ] **Each article ~1,500 words**, with screenshots, embedded
      Worlddots iframe (eats own dogfood), CTAs to relevant preset
      URLs.
- [ ] **Tag/category structure** so articles cross-link to relevant
      preset pages — boost the internal link graph.
- [ ] **Open Graph + Twitter Card** unique per article.
- [ ] **RSS feed** at `/blog/feed.xml` for syndication.

#### Acceptance

- 5 articles live within 12 weeks.
- Each article ranks in the first page for at least one long-tail
  keyword by month 4.
- Organic monthly visits → +50% over launch baseline.

---

### Phase 7 (gated on content growth) — Astro migration for marketing pages

When the marketing surface grows past ~20 URLs, the SPA SEO penalty
becomes a real bottleneck. Migrating just the marketing pages to
Astro (or any SSG meta-framework) unblocks AI scrapers.

#### Tasks (gated, ~1-2 weeks)

- [ ] Scaffold Astro alongside the existing Vite tool.
- [ ] Move all marketing pages (homepage, `/looks/:id` long-form,
      `/blog/*`, `/about`) to Astro routes with static HTML output.
- [ ] Keep the tool itself (`/`) as a React island — Worlddots's
      interactive canvas stays Vite-based.
- [ ] Confirm AI scrapers can read the marketing content (test with
      Perplexity, ChatGPT Search).

#### Acceptance

- Initial HTML for all marketing pages contains the full text content
  (no JS execution required).
- The tool path still works exactly as before (interactive canvas).
- AI citation rate increases (measurable via referrer analytics + Brand
  searches lift).

---

## Open questions

- **Synthetic `aggregateRating`** is borderline. Is there appetite to
  collect real reviews? A simple in-app "rate Worlddots" button
  (4-star scale) feeding a static JSON file would solve the chicken/egg.
- **Content as the founder vs ghost-written?** Personal voice + design
  expertise from Alejandro is the differentiator vs every other
  generic-tool-blog out there.
- **Discord / community Slack** to drive UGC and engagement. Worth
  the time investment? Lottie has one; smaller indie tools don't.
- **Worlddots.app vs worlddots.com** — currently on `.app`. Some SEO
  signal suggests `.com` carries slightly higher trust in 2026. Cost
  of acquiring + redirecting probably not worth it unless `.com` is
  cheap.

## Status log

- **2026-05-19** — Plan drafted from audit. Sitemap stale fix is
  the most urgent — actual technical bug.
