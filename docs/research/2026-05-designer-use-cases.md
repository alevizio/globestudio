# Designer use-case stories

**Date:** 19 May 2026
**Sources consulted:** Dribbble search results + design pattern surveys
**Confidence:** Medium · much of this is inference from adjacent tools; Worlddots-specific user data doesn't yet exist
**Status:** Feeds into [SEO Phase 4](../plans/seo-rollout.md) (programmatic landing pages) and [examples directory](2026-05-examples-directory.md)

## Executive summary

Worlddots is newly-launched, so empirical user-case data is sparse.
But the broader design pattern of "dotted maps + globes" has a deep
public showcase: Dribbble alone has 41,000+ map designs, 300+ world
maps, and a dedicated `dotted_world` tag. Patterns across that
corpus suggest **6 dominant designer use cases**:

1. **Tech company global presence** — "We operate in 47 countries"
   slides, landing pages, deck headers.
2. **Conference / event** — region-specific maps for badges, signage,
   talk slides.
3. **Annual report / data story** — dotted maps that bind data points
   (revenue, users, climate) to geography.
4. **Personal portfolio / about page** — designer's location, project
   distribution, travel record.
5. **Editorial / journalism** — illustrated infographics for news
   features.
6. **Motion / animated reveal** — globe rotating into frame as a
   transition or hero animation.

Each of these maps to a *specific* Worlddots feature combination,
and each should be a hand-built example in the
[`examples/` directory](2026-05-examples-directory.md). They also
become the long-tail keyword anchors for the
[programmatic landing page strategy](2026-05-seo-playbook.md).

## Key findings

### Finding 1 — "Tech company global presence" is the largest use case ✅

The single most common dotted-map use case across Dribbble + design
blogs is the "we are global" slide / landing-page section. Companies
from startups to enterprises lean on this visual. The pattern:

- World map (or region map) with countries of operation highlighted
- Often paired with stats: "47 countries", "20M users", "$2B raised"
- Usually solid mode + accent color on selected countries

Worlddots's Solid mode + country selection is built for this exactly.

### Finding 2 — Conferences / events drive seasonal demand ⚠️

Every quarter, conference designers need region-specific maps for
badges, signage, talk slides. Patterns:

- One-country focus (e.g., "Korea Summit", "Austin Tech Week")
- Often tied to a specific aesthetic (CRT for retro tech events,
  Halftone for design conferences)
- PNG export at high resolution for print

Worlddots covers this entirely. Worth featuring as an example.

### Finding 3 — Animated reveals are an emerging pattern ✅

Scroll-triggered globe animations on landing pages — globe rotates
into view, country highlights pulse, then settles. This pattern
shows up on awwwards-featured sites for tech/SaaS. Requires:

- WebM or GIF export (Worlddots has WebM)
- Auto-spin + smooth morph capability (Worlddots has)
- Easily embeddable (the integrations plan addresses this)

### Finding 4 — Personal / portfolio use is high-volume but low-impact ⚠️

Designers use dotted maps for "about" pages — "Here's where I've
worked" or "Here's my travel". High volume per individual but each
designer makes one map. Discovery happens via personal blog posts +
Twitter shares.

For Worlddots, this is the long-tail. Worth one example targeting
the "personal portfolio" intent.

### Finding 5 — Editorial / journalism use is rare but high-status ⚠️

Major outlets (NYT, Bloomberg, FT) use custom-built maps, not
general-purpose tools. But indie publications and Substack-tier
writers reach for tools like Worlddots. Less volume, more credibility.

If a major editorial usage happens, it's a high-status backlink + a
case study worth promoting. Hard to engineer; happens organically.

## Recommendations

In priority order, feeds directly into other plans:

1. **6 use-case examples in `examples/`** — one per finding above,
   plus the embed snippet from the integrations plan. Already
   captured in the [examples directory research](2026-05-examples-directory.md).
2. **6 unique landing-page descriptions** per use case, used as the
   target meta description for the matching `/looks/*` route or a
   new `/use-cases/*` route. Feeds the SEO Phase 4 plan.
3. **Reach out to 5 conference designers** (Tech, Adobe, Config,
   designer-conference circuit) offering Worlddots for their next
   event signage. Free in exchange for credit + a case study.
4. **Reach out to 3 Substack-tier publications** that already use
   maps in their reporting. Pitch Worlddots as their tool for the
   next year. Hard to do but high payoff if it lands.
5. **Track usage organically** via the `?source=` analytics tags
   from the integrations plan — once 50+ real users have made
   things, harvest their work (with permission) for a community
   showcase.
6. **Build a "Made with Worlddots" badge** designers can embed on
   their own portfolios — each badge is a backlink + a referral
   driver. Already mentioned in the SEO research as a future
   feature.

## Open questions

- No real user data yet — these recommendations are inferences from
  adjacent design tools' communities. Worth revisiting in 6 months
  with actual Worlddots usage patterns.
- Are there use cases I'm missing? Climate/scientific visualization,
  shipping/logistics, real-estate? Probably yes — survey would
  surface them.
- Is the "tech company global presence" use case big enough to
  justify a dedicated B2B sales motion? Probably not at Worlddots's
  stage; the indie SEO approach is enough.

## Sources

1. [Dribbble — Dotted Map search](https://dribbble.com/search/dotted-map) ✅
2. [Dribbble — Globe tag](https://dribbble.com/tags/globe) ✅
3. [Dribbble — World Map tag](https://dribbble.com/tags/world-map) ✅
4. [Dribbble — Dotted World tag](https://dribbble.com/tags/dotted_world) ✅
5. [Dribbble — 3D Globe search](https://dribbble.com/search/3d-globe) ✅
