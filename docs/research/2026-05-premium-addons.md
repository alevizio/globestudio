# Premium addons without violating MIT

**Date:** 19 May 2026
**Sources consulted:** 6 OSS business-model articles + Wikipedia
**Confidence:** High for legal mechanics · Medium for revenue potential
**Status:** No plan — recommendations live in this doc

## Executive summary

Globestudio is MIT, will stay MIT. ROADMAP.md's "Won't do" list
explicitly closes the door on "Closed-source / paid features."

However, **adjacent paid offerings** are compatible with MIT and
have established precedent in the OSS-tool space:

1. **Premium asset packs** (LUTs, palette presets, hand-tuned look
   bundles) — sold as separate downloads, the tool reads them.
2. **Pro features on the Figma plugin** — high-res exports, vector
   SVG, animation frame sequence. The plugin code can stay MIT;
   the Pro tier is server-mediated.
3. **Custom shader marketplace** — once Globestudio supports
   third-party shader passes (parked in ROADMAP as "Plugin system"),
   third parties sell shaders. Globestudio takes 0% or a small cut.
4. **Hosted SaaS** — a separately-paid hosted service that uses the
   open-source tool as its core. Common pattern (Ghost, Mattermost).
   Probably overkill for Globestudio.
5. **Design consulting / sponsored projects** — the maintainer
   personally sells design work that uses Globestudio. Not a product,
   a service.

Worth noting: the simplest play is **none of the above**, just
sponsorship via GitHub Sponsors (covered in
[funding research](2026-05-funding-sponsorship.md)). Premium addons
add maintenance burden — only worth it if the project has crossed
a "real demand" threshold.

## Key findings

### Finding 1 — MIT lets you sell anything alongside the core ✅

MIT only requires that the licensed code remain free. It says
*nothing* about what you do with adjacent, independent products.
You can:

- Sell premium asset packs that the tool consumes
- Sell a paid hosted version
- Sell consulting / training / merch
- Sell a Pro tier of an *adjacent* tool (e.g., a Figma plugin)
- Run a paid commercial offering that uses the OSS core

What MIT *doesn't* let you do:

- License the core under different terms to different people
- Withhold core features behind a paywall ("open core" is a separate
  model that requires a different license, not MIT)
- Rebrand the core as a closed product

Sources:
- [Open Source Initiative — MIT License](https://opensource.org/license/mit) ✅
- [Open Source Licenses Explained 2026](https://www.opensourcealternatives.to/blog/open-source-license-guide) ⚠️

### Finding 2 — "Asset packs" are the lowest-friction monetization ✅

Asset packs work because they're data, not code. Globestudio could ship:

- **Curated palette packs** ("Risograph palettes", "Pantone 2026")
- **Look presets** (designer-curated bundles of density / shape /
  shader / colors that produce a specific aesthetic)
- **Custom shape libraries** (icon sets, dingbat fonts, branded
  shape collections)

Pricing: $5-25 per pack. Sold via Gumroad / Lemon Squeezy / Polar.
The tool stays MIT; the user downloads the JSON and imports it.

Risk: requires ongoing curation to feel fresh. If a pack stays
static for 6 months, it dies. Worth committing to a quarterly
release cadence or skipping.

Sources:
- [How to Monetize an Open Source Project — DEV](https://dev.to/whoffagents/how-to-monetize-an-open-source-project-freemium-open-core-and-license-gating-4il6) ⚠️
- [Business models for open-source software — Wikipedia](https://en.wikipedia.org/wiki/Business_models_for_open-source_software) ✅

### Finding 3 — Pro tier on the Figma plugin is the cleanest paid surface ✅

The Figma plugin (per [integrations plan](../plans/integrations-rollout.md)
Phase 3) is its own product. It can be MIT in its source code but
have a Pro tier server-mediated. Examples of Pro features:

- High-res exports (4K, 8K)
- Vector SVG export from the plugin
- Animation frame sequences (multi-PNG export)
- Larger custom shape uploads
- Saved look library that syncs across Figma files
- White-label support (no Globestudio watermark)

Pricing: $5-10/month or $50/year. The plugin core remains free;
Pro features require an account.

This works because Figma plugins are independent products from the
Globestudio core. A paid Figma plugin doesn't make the OSS Globestudio
"non-free" — it's its own monetization surface.

Sources:
- [Business models for open-source software — Wikipedia](https://en.wikipedia.org/wiki/Business_models_for_open-source_software) ✅

### Finding 4 — Shader marketplace requires the plugin system first ⚠️

The ROADMAP parks "Plugin system for third-party shader passes" as
maybe / future. Once that lands, third-party creators can sell
shader passes, similar to Framer's marketplace. Globestudio takes
0-20% cut.

This is a 6-12 month horizon. Not v1.

### Finding 5 — Hosted SaaS is overkill for Globestudio ❌

A hosted SaaS makes sense when the OSS tool has self-hosting
overhead (databases, queues, infrastructure). Globestudio is a static
web app with no server-side state. There's nothing to host.

Could pivot to a paid API for batch exports? Maybe — but the demand
isn't there yet and it's a real engineering project.

### Finding 6 — Design consulting is the maintainer's own choice 💼

If the maintainer (Alejandro) wants to monetize their *time* via
design consulting using Globestudio as a portfolio piece, that's
fine — it's a service, not a product. Doesn't affect MIT.

Examples:
- Custom dotted-map design for $500-2000 per project
- Sponsored work for tech companies' annual reports
- "Globestudio designed for you" service

This is the most reliable revenue but doesn't scale.

## Recommendations

In order of likely-revenue × least-friction:

1. **GitHub Sponsors as the v1.** Already in
   [funding research](2026-05-funding-sponsorship.md). Zero ongoing
   work. Some signal value.
2. **Defer all paid addons until traction signals justify them.**
   No paid addon makes sense at 0-100 weekly active users. The
   curation overhead exceeds the revenue at that scale.
3. **If/when traction justifies:** start with one curated palette
   pack (~10 palettes for $9). Sells via Gumroad. Test demand
   before doing more.
4. **Pro Figma plugin tier** is the highest-revenue play but blocked
   on the [integrations plan](../plans/integrations-rollout.md)
   Phase 3 landing first.
5. **Personal consulting** if the maintainer wants. Doesn't
   conflict with anything. Free choice.

## Open questions

- What threshold = "traction signals justify paid addons"?
  Probably 1k+ weekly actives + 500+ GitHub stars + sustained
  organic signups for the (eventual) email list.
- Would a "Globestudio Pro" subscription that funds the maintainer's
  full-time work be premature? Yes — too early. Could revisit at
  10k+ weekly actives.
- Is there appetite for accepting commission work for specific
  countries / regions / styles? Maybe — but it's a different
  business than the product.

## Sources

1. [Open Source Initiative — MIT License](https://opensource.org/license/mit) ✅
2. [Open Source Licenses Explained 2026 — Open Source Alternatives](https://www.opensourcealternatives.to/blog/open-source-license-guide) ⚠️
3. [How to Monetize an Open Source Project — DEV.to](https://dev.to/whoffagents/how-to-monetize-an-open-source-project-freemium-open-core-and-license-gating-4il6) ⚠️
4. [Business models for open-source software — Wikipedia](https://en.wikipedia.org/wiki/Business_models_for_open-source_software) ✅
5. [Open Source Licenses Comparison 2026 — DEV.to](https://dev.to/juanisidoro/open-source-licenses-which-one-should-you-pick-mit-gpl-apache-agpl-and-more-2026-guide-p90) ⚠️
6. [Rive Pricing — Open Source case study](https://www.spotsaas.com/product/rive/pricing) ⚠️
