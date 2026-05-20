# OSS community building

**Date:** 19 May 2026
**Sources consulted:** 6 OSS community articles + codebase audit
**Confidence:** High for platform tradeoffs · Medium for sustaining tactics
**Status:** Plan written → see [`docs/plans/growth-rollout.md`](../plans/growth-rollout.md)

## Executive summary

Globestudio launched but hasn't yet built a community surface. The
2026 OSS community wisdom: **use both GitHub Discussions and Discord,
they're complementary, not competing**. GitHub Discussions for
permanent, searchable, code-adjacent threads. Discord for live
chat, casual feature ideation, and a "lurkable" newcomer space
that doesn't feel as official as opening a GitHub issue.

For Globestudio specifically, the right v1 community surface is:

1. **GitHub Discussions** — already free, already linked to repo.
   Enable categories (Ideas, Q&A, Show & Tell, Announcements).
2. **Twitter/X presence** as the syndication layer — auto-cross-post
   highlights from the repo + showcase.
3. **NO Discord yet.** Wait until there's enough activity that a
   Discord doesn't feel like an empty room. Maybe at 500+ stars or
   when 3+ unsolicited "I love this" mentions come in per week.

## Key findings

### Finding 1 — GitHub Discussions is the right v1 ✅

GitHub Discussions ships free with every repo. Permanent, searchable,
threaded. Categories give structure:

- **Announcements** — releases, major changes
- **Ideas** — feature requests (avoids the "bug or feature?" issue confusion)
- **Q&A** — markable as answered, builds a self-serve knowledge base
- **Show and Tell** — community showcase of work made with the tool
- **Polls** — feature prioritization

Sources:
- [GitHub Discussions vs Discord — community discussion](https://github.com/orgs/community/discussions/176166) ✅
- [Why Discord is a Must-Have for OSS — DEV Community](https://dev.to/appwrite/why-discord-is-a-must-have-for-oss-2jpj) ⚠️

### Finding 2 — Discord is high-engagement but high-maintenance ⚠️

Discord servers can help with collecting feedback, providing quick
support, building new contributor relationships, getting releases
tested. The catch: an empty Discord server is worse than no Discord.
Below ~100 active members, the channel reads as abandoned.

**Heuristic:** open a Discord when there's enough organic chatter
in Discussions that a faster-paced room makes sense. Until then,
Discussions is enough.

Sources:
- [Building open-source design tools to improve Discord's design workflow](https://discord.com/blog/building-open-source-design-tools-to-improve-discords-design-workflow) ✅

### Finding 3 — Examples / showcase is its own engagement loop ✅

A "Show and Tell" category (or dedicated showcase page) where users
post what they built drives ongoing community engagement. Tools that
do this well: Lottie's discover gallery, Spline's community page,
threejs.org's examples list.

For Globestudio, this is twin to the
[examples directory research](2026-05-examples-directory.md) — a
public showcase that doubles as marketing + design inspiration.

## Recommendations

1. **Turn on GitHub Discussions today.** Configure 5 categories
   (Announcements, Ideas, Q&A, Show and Tell, Polls). ~15 min work.
2. **Seed 5 initial discussion threads** so the surface doesn't
   feel empty:
   - "Welcome — what are you using Globestudio for?"
   - "Roadmap discussion — what would unlock more use cases?"
   - "Help needed: testing on different hardware"
   - "Show your favorite preset + custom shape"
   - "Q&A: common questions"
3. **Pin the Show and Tell** thread on the repo homepage.
4. **Cross-link from the app:** add a footer link "Join the
   discussion →" pointing at the Discussions URL.
5. **Hold off on Discord** until engagement organically demands it.
6. **Twitter/X cadence:** post 2x/week — one design showcase, one
   technical/community update. Sustain energy past the launch wave.

## Sources

1. [GitHub Discussions vs Discord community thread](https://github.com/orgs/community/discussions/176166) ✅
2. [Why Discord is a Must-Have for OSS](https://dev.to/appwrite/why-discord-is-a-must-have-for-oss-2jpj) ⚠️
3. [Building open-source design tools — Discord blog](https://discord.com/blog/building-open-source-design-tools-to-improve-discords-design-workflow) ✅
4. [Top open-source Discord alternatives 2026](https://openaltfinder.com/blog/open-source-discord-alternatives) ⚠️
5. [9 Best Open Source Discord Alternatives 2026](https://openalternative.co/alternatives/discord) ⚠️
6. [SustainOSS — Tools for OSS Designers](https://sustainoss.org/design/designers/tools/) ✅
