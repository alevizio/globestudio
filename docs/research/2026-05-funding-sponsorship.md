# Funding / sponsorship paths

**Date:** 19 May 2026
**Sources consulted:** GitHub Sponsors docs + Open Collective docs + Polar + 4 secondary articles
**Confidence:** High for platform mechanics · Medium for actual revenue potential
**Status:** Plan written → see [`docs/plans/growth-rollout.md`](../plans/growth-rollout.md)

## Executive summary

Globestudio is MIT-forever per the ROADMAP. Direct monetization of the
tool itself is off the table, but **voluntary funding** is not.
Three credible platforms in 2026: **GitHub Sponsors** (the easiest
to set up, ships with the repo), **Open Collective** (transparent
finances, fiscal sponsorship layer), and **Polar.sh** (newer, more
indie-developer-aligned).

For Globestudio's stage (just-launched, ~1 person), the right v1 is
**GitHub Sponsors + a `FUNDING.yml` file**. Zero ongoing maintenance
beyond setup. Open Collective is worth adding if/when funding crosses
a threshold that justifies the fiscal-sponsorship overhead (~$100/mo
sustained). Polar.sh is interesting but adds complexity for a small
indie project at launch.

Realistic funding outcomes: most OSS designer tools at Globestudio's
stage raise $0-$200/month from voluntary sponsorship in year 1.
The value isn't the money — it's the signal that users care enough
to pay, which compounds with the existence of a "Sponsor" button on
the repo (drives perception of legitimacy and active development).

## Key findings

### Finding 1 — GitHub Sponsors is the cheapest setup ✅

Free to set up. Lives on the repo page as a "Sponsor" button. Funds
go directly to the maintainer's bank account (via Stripe) with no
platform fee through April 2030 (GitHub absorbs the cut).

Setup: enable Sponsors in account settings → fill out tier
descriptions → add a `.github/FUNDING.yml` to the repo with
`github: alevizio`.

Tiers can be one-time or monthly. Recommended starting structure:

| Tier        | Monthly | What sponsors get                              |
| ----------- | ------- | ---------------------------------------------- |
| Pixel       | $3      | Name in `SPONSORS.md`                          |
| Cluster     | $10     | Above + private updates                        |
| Constellation | $25  | Above + early access to new features           |
| Galaxy      | $100    | Above + 1hr/mo of design consultation          |

Sources:
- [Open Source Collective — GitHub Sponsors](https://docs.oscollective.org/campaigns-and-partnerships/github-sponsors) ✅
- [Setting up GitHub Sponsors via Open Collective](https://docs.opencollective.com/oceurope/how-it-works/financial-contributions-how-to-donate/setting-up-github-sponsors) ✅

### Finding 2 — Open Collective adds transparency + fiscal sponsorship ⚠️

Open Collective publishes every dollar in/out publicly. Adds a 10%
admin fee. Worth it when:

- Multiple maintainers split funds
- You want conference / hardware / meetup reimbursement
- You want the credibility of a fiscal host

For a solo Globestudio maintainer, this is overkill at launch. Revisit
if the project grows multiple maintainers or starts running real
events.

Sources:
- [On GitHub Sponsors — Open Collective blog](https://blog.opencollective.com/on-github-sponsors/) ⚠️

### Finding 3 — Polar.sh is the developer-aligned alternative ⚠️

Polar is positioned for indie OSS developers — issue funding,
subscriptions, donations all in one platform. Supported in
`FUNDING.yml` via the `polar` key. Pulls slightly less mainstream
funding than GitHub Sponsors but has more flexible monetization
primitives (e.g., "pay $X for me to prioritize this issue").

Add as a secondary channel later. Not v1.

Sources:
- [Polar.sh — Open Collective](https://opencollective.com/polar-sh) ⚠️
- [10 Best GitHub Sponsors Alternatives 2026](https://donatr.ee/blog/github-sponsors-alternatives/) ⚠️

### Finding 4 — Funding is signal more than revenue ⚠️

Across OSS-tool case studies, voluntary funding at the indie-launch
stage rarely pays the maintainer's rent. Most tools at Globestudio's
scale raise $0-200/month. The real value:

- A "Sponsor" button signals an active project (vs abandoned)
- Sponsors → testimonials and "we use this" social proof
- Sponsors → early bug reports + feedback loops
- Sponsors → recurring contributors who feel invested

Sources:
- [Business models for open-source software — Wikipedia](https://en.wikipedia.org/wiki/Business_models_for_open-source_software) ✅

## Recommendations

1. **Enable GitHub Sponsors today.** 15-minute setup.
2. **Add `.github/FUNDING.yml`** with the `github` key. Drives the
   "Sponsor" button on the repo page.
3. **Define 3-4 sponsor tiers** ($3 / $10 / $25 / $100) with
   modest, realistic rewards. No tier should require ongoing work
   beyond a Discord mention (and we don't have Discord yet).
4. **Add a `SPONSORS.md`** with the running list of sponsors,
   updated quarterly.
5. **Link from the app footer** — small "❤ Sponsor Globestudio" link
   next to GitHub. Discoverability > polite invisibility.
6. **Hold off on Open Collective** until multi-maintainer or
   meaningful spend justifies the 10% fee.
7. **Hold off on Polar.sh** until v2 if at all — secondary platform
   adds clutter.

## Sources

1. [GitHub Sponsors — Open Collective](https://opencollective.com/github-sponsors) ✅
2. [Setting up GitHub Sponsors — Open Collective Docs](https://docs.opencollective.com/oceurope/how-it-works/financial-contributions-how-to-donate/setting-up-github-sponsors) ✅
3. [On GitHub Sponsors — Open Collective blog](https://blog.opencollective.com/on-github-sponsors/) ⚠️
4. [Polar.sh — Open Collective](https://opencollective.com/polar-sh) ⚠️
5. [10 Best GitHub Sponsors Alternatives 2026](https://donatr.ee/blog/github-sponsors-alternatives/) ⚠️
6. [Business models for open-source software — Wikipedia](https://en.wikipedia.org/wiki/Business_models_for_open-source_software) ✅
