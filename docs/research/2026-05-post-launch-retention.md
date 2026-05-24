# Post-launch retention loops for Globestudio

**Date:** 24 May 2026
**Author:** Solo-maintainer research brief
**Launch target:** Wed 27 May 2026 (HN / PH / Twitter)
**Status:** Decision-grade — execute week-of-launch
**Sources consulted:** 24 (case studies, vendor docs, OSS maintainer accounts)
**Confidence:** High for tactic ranking · Medium for 12-month roadmap pacing

---

## TL;DR

The launch-day-spike-then-flat-line failure mode is the default for free
tools with no signup. The fix is not a single big retention mechanic — it's
a low-frequency content rhythm that keeps the URL in designers' mental
orbit, paired with a community contribution surface that turns one-time
users into recurring stakeholders.

For a solo maintainer with < 4 hours/week of recurring time and a
$20/month budget, three tactics carry almost all the ROI:

1. **Public changelog + RSS feed + auto-cross-post to Twitter/X.** One
   write, three channels, zero recurring cost. Mirrors how
   [tldraw](https://tldraw.dev/blog) and
   [Excalidraw](https://plus.excalidraw.com/blog/excalidraw-in-2024)
   broadcast every meaningful change. **Highest ROI.** Setup: ~3 hours
   once. Recurring: 20 min per release.
2. **Preset PRs as a recurring community ritual.** Every accepted preset
   PR ships in a release, gets a tweet, credits the designer, and is
   featured in the [Excalidraw Libraries](https://libraries.excalidraw.com/)
   style showcase. This is the single best mechanism for turning users
   into contributors — it's exactly how Excalidraw turned a whiteboard
   tool into an
   [open-source flywheel](https://github.com/excalidraw/excalidraw-libraries).
3. **"Made with Globestudio" showcase page** with weekly hero rotation.
   Same surface serves three jobs: social proof for new visitors,
   recurring reason for past users to return (to check if they got
   featured), and SEO backlink magnet for designers who embed.

Skip Discord at launch (per existing
[community building research](2026-05-community-building.md)). Skip
newsletter v1 in favor of RSS — designers and devs read RSS, and
RSS doesn't require a signup that contradicts the brand pitch.

---

## Why this matters

The Globestudio pitch — "no signup, no API key, runs in your browser" — is
exactly the framing that maximizes launch-day clicks and minimizes
retention. Indie Hackers and HN postmortems repeatedly find the same
pattern: "Launch traffic on Hacker News validates curiosity much faster
than it validates retention — people will try almost anything once from
HN if the framing is sharp, but they only come back if the pain is
very specific and keeps showing up in their workflow"
([Indie Hackers postmortem](https://www.indiehackers.com/post/launched-on-hackernews-what-happened-and-what-i-learned-nflqqZoHttex6HhKkKTH)).

Globestudio's job-to-be-done — designing a dotted globe for a deck,
landing page, or marketing asset — is intermittent. A designer needs it
maybe once a month, maybe once a quarter. That's structurally similar to
[Coolors](https://coolors.co/), [Haikei](https://haikei.app/), and
[Photopea](https://www.photopea.com/) — all tools where the user
typically dips in for a single task. The retention question for
intermittent tools is not "how do we get DAUs?" but "how do we make sure
we're top-of-mind on the day the next need arises?"

---

## Case studies

### 1. Excalidraw — community libraries as a contribution flywheel

Excalidraw is the closest analog to Globestudio: free, open source,
no-signup-required, browser-based design tool, MIT licensed.

**Retention tactics in use:**

- **Excalidraw Libraries** — a public directory at
  [libraries.excalidraw.com](https://libraries.excalidraw.com/) where
  designers submit reusable element packs via GitHub PR. Each accepted
  PR credits the designer and produces a permanent gallery entry. The
  [contribution guide](https://github.com/excalidraw/excalidraw-libraries)
  enforces quality bars (not personal-use-only, not trivially
  recreatable, not republished from elsewhere) so the curation effort
  scales.
- **Excalinews** — a monthly LinkedIn newsletter recap of changes and
  community work
  ([source](https://plus.excalidraw.com/community)).
- **Annual recap blog posts** that consolidate the year — see
  ["Excalidraw in 2024"](https://plus.excalidraw.com/blog/excalidraw-in-2024)
  — used for a once-a-year viral re-emergence on HN / Reddit.
- **30k+ on X, 4k on LinkedIn, 2k on YouTube** built via consistent
  release-driven posts, not paid acquisition.

**What's portable to Globestudio:** the libraries model is *exactly* the
preset-PR pattern proposed below. Globestudio has presets (globe styles,
dot configurations, animation easings) — same primitive as Excalidraw
libraries.

### 2. tldraw — release rhythm + viral micro-product strategy

tldraw is now a $10M-funded company, but its early retention loop was
pure content rhythm: ship constantly, announce loudly, ride the wave of
each release through HN and X.

**Retention tactics in use:**

- **Public blog with categorized release notes** at
  [tldraw.dev/blog](https://tldraw.dev/blog) — every release gets a post,
  every post is RSS-syndicated, every post gets a Twitter thread.
- **"What's new in tldraw" recap posts** every 3-6 months
  ([March 2025 recap](https://tldraw.dev/blog/whats-new-2025)) that
  consolidate small changes into a single re-launchable artifact.
- **Viral micro-products** — Make Real and tldraw computer were built
  inside the existing tool and went viral on X in November 2023, dragging
  the parent tool back into the conversation
  ([source](https://gitnation.com/contents/make-real-tldraws-accidental-ai-play)).
- **67k+ X followers and 8k Discord members** — but the Discord came
  *after* the audience existed, not before.

**What's portable to Globestudio:** the release-as-content rhythm. Every
preset added, every shape added, every export format added is a tweetable
beat. A solo maintainer who ships one tweetable change per month stays
visible.

### 3. Photopea — ad-monetized, no-signup, 1M DAU on a one-person team

Photopea is the existence proof that a no-signup browser tool can sustain
itself indefinitely on a solo team. Ivan Kuckir grew it from 20 visitors/day
to **1M daily** users with zero paid acquisition
([Failory interview](https://www.failory.com/interview/photopea),
[byvi.co profile](https://byvi.co/2024/03/31/photopea/)).

**Retention tactics in use:**

- **No retention loop in the traditional sense** — instead, *be the
  default* for the category. Photopea ranks for "free photoshop online,"
  "open psd in browser," etc. SEO is the retention loop.
- **Subreddit as customer service** —
  [r/photopea](https://www.reddit.com/r/photopea) grew to 23k members
  organically; power users answer questions, reducing maintainer load.
- **Premium tier exists but is opt-in** — $5/month removes ads.
  90% revenue from ads, 10% from Premium.
- **Feature focus over engagement engineering** — Kuckir explicitly
  says "focusing on fun features boosted retention" — i.e., they don't
  do growth hacks, they ship features users tell their friends about.

**What's portable to Globestudio:** the SEO-as-retention insight is huge.
If Globestudio ranks #1-3 for "dotted map generator," "3D globe generator,"
"animated globe maker," intermittent users come back via Google, not via
email. That's the
[SEO playbook](2026-05-seo-playbook.md) doing double duty as retention.

### 4. Coolors — trending feed + community palettes

[Coolors](https://coolors.co/) is intermittent like Globestudio (designers
generate a palette, save it, move on) but maintains massive retention
through a few specific moves.

**Retention tactics in use:**

- **Trending palettes feed** at
  [coolors.co/palettes/trending](https://coolors.co/palettes/trending) —
  user-submitted palettes, ranked by likes, browsable by tag. Doubles as
  inspiration and as a return-visit hook.
- **Sub-routes per use case** (`/trending/ui`, `/trending/cool`,
  `/trending.Large`) for SEO surface area.
- **Account is *optional* but rewarded** with save/like — the
  "no-signup-required" guarantee is preserved for first-time users but
  there's a clear progression to investment.

**What's portable to Globestudio:** a "Featured presets" or "Community
presets" route that's browsable without login. Even a static page that
updates weekly via merged PRs would do the job.

### 5. Haikei — newsletter for new generators

[Haikei](https://haikei.app/) is the closest analog in spirit — free
SVG asset generator, intermittent use case, designer audience.

**Retention tactics in use:**

- **Email newsletter** announcing new generators
  ([source](https://haikei.app/blog/welcome-to-haikei/)). Opt-in, not
  required for use.
- **Pro tier** in development (signaled publicly, not yet shipped) —
  the email list will be the warm audience for that launch.
- **Generator-per-blog-post** content cadence — each new generator gets
  a dedicated post that ranks for "SVG [pattern type] generator."

**What's portable to Globestudio:** newsletter is *optional* and
single-purpose ("get notified when new presets drop"). That framing
defuses the "no-signup" tension.

### 6. Stripe globe — viral design content as awareness retention

Not a tool but instructive.
[Stripe's globe blog post](https://stripe.com/blog/globe) (Sept 2020)
spawned an entire genre. GitHub's
[similar post](https://news.ycombinator.com/item?id=25584720) compounded
the effect. Both companies were on the HN front page repeatedly for
*how* they built the globe, not the product behind it.

**What's portable to Globestudio:** the maintainer should write 2-3
deep technical posts in the first 6 months — "How we render 50k dots at
60fps," "Why we picked icosahedron distribution," "The math of dot
placement on a sphere." Each one is a HN repost opportunity that drags
the tool back into the spotlight.

---

## Brainstormed tactic list — scoring matrix

Scale: **Impact** (1-5), **$ Cost** (annual), **Time** (hours/week
recurring), **Risk** of chore-becoming-abandoned (1-5, higher = worse).
Sorted by score: `impact * 10 - time * 5 - risk * 3 - (cost / 20)`.

| # | Tactic | Impact | $/yr | hrs/wk | Risk | Score | Verdict |
|---|---|---|---|---|---|---|---|
| 1 | Public changelog + RSS feed (auto-cross-posted) | 5 | 0 | 0.5 | 1 | **44.5** | Ship week 1 |
| 2 | Preset PR ritual + accepted-PR tweets | 5 | 0 | 1 | 2 | **39** | Ship week 1 |
| 3 | "Made with Globestudio" showcase page | 4 | 0 | 0.5 | 2 | **31.5** | Ship week 2 |
| 4 | Deep technical blog posts (2-3 in 6mo) | 5 | 0 | 0.5 (avg) | 2 | **41.5** | Ship month 1-3 |
| 5 | SEO investment (per existing playbook) | 5 | 0 | 1 (avg) | 1 | **42** | Already planned |
| 6 | Twitter/X account with 2x/week cadence | 4 | 0 | 1 | 3 | **26** | Cautious yes |
| 7 | Opt-in "new presets" newsletter (Buttondown) | 3 | 0–108 | 0.5 | 3 | **15.6** | Month 3+ |
| 8 | "Look of the week" rotating hero | 3 | 0 | 0.25 | 2 | **22.75** | Ship month 1 |
| 9 | Discord community | 4 | 0 | 4 | 5 | **0** | **Skip until 500★** |
| 10 | Weekly design challenge ("design a globe for X") | 3 | 0 | 2 | 5 | **5** | Skip — too chore-y |
| 11 | Browser extension | 2 | 0 | 0.25 setup | 1 | **15.75** | Maybe month 6+ |
| 12 | Embeddable widget gallery | 4 | 0 | 0.5 | 2 | **31.5** | Tie with #3 |
| 13 | Reddit / r/dataisbeautiful seeding | 3 | 0 | 0.5 | 2 | **21.5** | Opportunistic |
| 14 | Annual recap blog (Excalidraw model) | 4 | 0 | 0.1 (concentrated) | 1 | **36.5** | Year 1 anniversary |

**Cost annotation:** Buttondown is free up to 100 subscribers, ~$9/mo
above ([Buttondown vs Mailchimp](https://buttondown.com/comparisons/mailchimp)).
Mailchimp explicitly disqualified — one user paid
~$15k over six years on Mailchimp before switching
([lethain.com](https://lethain.com/newsletter-mailchimp-to-buttondown/)).

**Risk annotation:** Discord scores risk=5 because solo-maintainer
Discords either (a) sit empty and signal abandonment or (b) consume
4+ hrs/week on moderation. The
[existing community research](2026-05-community-building.md) already
flagged the "wait until 500★" heuristic. Weekly design challenges
score risk=5 because they require *content production by users on a
schedule the maintainer doesn't control* — when nobody submits in week
3, the maintainer either fakes engagement or admits failure publicly.

---

## Recommended retention stack — week of launch

The minimum viable retention surface to set up *before* launch day:

### Set up by Mon May 25 (T-2)

1. **GitHub releases with RSS feed.** GitHub auto-generates an RSS feed
   at `https://github.com/<org>/<repo>/releases.atom` — zero config.
   Add a footer link on globestudio.app: "Subscribe to updates → RSS".
   Add the feed URL to the README.
2. **`/changelog` page on globestudio.app.** Pull from
   `CHANGELOG.md` (already exists per `ls -la` output). Render as a
   static route. Add `<link rel="alternate" type="application/rss+xml">`
   pointing at the GitHub releases.atom.
3. **CONTRIBUTING-PRESETS.md.** A clearly-titled subdocument under
   `CONTRIBUTING.md` that walks through "How to contribute a preset" —
   the JSON schema, the screenshot requirement, the naming convention.
   Pattern copied directly from
   [Excalidraw Libraries contribution guide](https://github.com/excalidraw/excalidraw-libraries).
4. **Twitter/X account (@globestudio_app or similar)** with bio linking
   to the tool, a pinned tweet showing the best 8-second demo loop, and
   an avatar that matches the brand. No content yet — just claim the
   handle.
5. **"Featured presets" route or section** — even an empty placeholder
   that says "Coming soon: community presets" with a "Submit yours via
   PR →" CTA.

### Set up by Wed May 27 (launch day, alongside the
[wednesday-launch.md](../../launch/wednesday-launch.md) plan)

6. **First Twitter thread = changelog of launch.** Use it to set the
   precedent: "Every release gets a thread."
7. **First preset PR opened by the maintainer** to seed the contribution
   pattern. Title it `feat(presets): Add 'Aurora' preset` to model the
   convention.

### Set up by Wed Jun 3 (T+1 week)

8. **First "Made with Globestudio" entry** — even if it's the
   maintainer's own use case, just to populate the gallery surface.
9. **Privacy-friendly analytics** —
   [Plausible](https://plausible.io/) (~$9/mo) or self-hosted
   [Umami](https://umami.is/). Already implied by the brand stance.
   This is the only way to read retention signal given no accounts.

That's the entire week-of-launch retention stack. Setup time: ~6-8 hours
distributed across the week. Recurring time after launch: ~2 hrs/week
for the first month, dropping to ~1 hr/week steady state.

---

## Retention without metrics

Globestudio has no signup, no accounts, and a privacy stance that
precludes user-level tracking. Standard retention metrics — DAU/MAU,
cohort curves, D7/D30 — are unavailable.

What you *can* measure (proxy signals):

| Signal | What it tells you | How to read it |
|---|---|---|
| **Unique weekly visitors** (Plausible) | Top-of-funnel awareness | Flat ≠ failure if total stays above launch baseline. Watch for the slope of the post-spike decay — < 50% week-over-week drop = healthy. |
| **Returning vs new visitor ratio** (Plausible) | Crude retention proxy | A healthy intermittent tool sits at 25-40% returning. Below 15% = the tool is one-shot. Above 50% = you have power users. |
| **RSS subscriber count** (GitHub releases.atom — query via API) | Engaged-audience proxy | Even 50 subscribers = 50 designers who self-identified as caring. Track weekly. |
| **Twitter/X follower count + impressions per post** | Brand awareness | Less about absolute numbers, more about per-post engagement rate. > 2% engagement = the audience is right. |
| **GitHub stars/week** (after launch spike normalizes) | Steady demand | The post-spike decay slope matters far more than peak. 5-10 stars/week after month 1 = the SEO and word-of-mouth flywheel is turning. |
| **Preset PRs opened/week** | Community contribution health | The single most important number. 1+ external preset PR per month by month 3 = the contribution loop works. |
| **"Made with" gallery submissions** | High-intent retention | Even 1-2 submissions/month = designers using it for real work. |
| **Direct traffic share** (Plausible Sources tab) | Top-of-mind proxy | Above 30% direct traffic = the URL is in designers' bookmarks/memory, which *is* the retention loop for an intermittent tool. |
| **Branded search volume** (Google Search Console, free) | Mindshare | "globestudio" searches > "dotted map maker" searches by month 6 = you own the category. |

Anti-pattern to avoid: **don't fall in love with traffic graphs.** The HN
spike will look like a heartbeat on a flatline. The right way to read
the chart is to slice off the launch week and look at the slope of the
*next* 8 weeks. That slope, not the peak, is the retention signal.

---

## 12-month roadmap of recurring touchpoints

Conservative pacing for a solo maintainer. Each entry should take 1-3
hours unless noted.

### Phase 1: Launch + stabilize (Weeks 1-4)

- **Week 1 (May 27 launch week):** Ship launch, set up RSS, ship first
  changelog entry, seed first preset PR, post first Twitter thread.
- **Week 2 (Jun 3-10):** "How to contribute a preset" tweet thread.
  Open `good-first-issue: preset` labels on GitHub. First "Made with"
  showcase entry (maintainer's own).
- **Week 3 (Jun 10-17):** Patch release with bug fixes from launch
  feedback → first proof of "we ship every week" rhythm.
- **Week 4 (Jun 17-24):** First external contribution merge ceremony —
  whoever opens the first community preset PR gets a thank-you tweet,
  a credit in the README, and the preset shipped in the next release.

### Phase 2: Establish rhythm (Months 2-3, Jul-Aug 2026)

- **Month 2:** First deep technical blog post ("How we distribute 50k
  dots on a sphere"). Re-submit to HN with a delay (HN's posting
  rules allow this for substantively different submissions). Target:
  one front-page reappearance.
- **Month 2 mid:** "Look of the week" rotation on homepage hero —
  cycle through 4 community presets that month, one per Monday. Tweet
  the new hero every Monday.
- **Month 3:** Second technical post or a "1000 stars, here's what
  we built" recap (if metrics support). Open Buttondown newsletter
  signup *only if* organic asks have come in for it; don't pre-empt.

### Phase 3: Community formalization (Months 4-6, Sep-Nov 2026)

- **Month 4:** Decide on Discord per the
  [community building research](2026-05-community-building.md)
  heuristic (500+ stars or 3+/week unsolicited mentions). If yes, open
  Discord with seeded channels (#showcase, #help, #presets, #general).
  If no, double down on GitHub Discussions activity.
- **Month 5:** First "designer spotlight" — a short blog post
  featuring one designer who shipped a Globestudio-powered visual in
  production (landing page, deck, marketing asset). Pattern lifted
  from [tldraw's case studies](https://tldraw.dev/blog).
- **Month 6:** Half-year recap post (the
  [Excalidraw model](https://plus.excalidraw.com/blog/excalidraw-in-2024)).
  Consolidate every release into a single re-launchable artifact.
  Cross-post to HN, Reddit, Twitter. Target: second front-page
  reappearance.

### Phase 4: Compounding (Months 7-12, Dec 2026-May 2027)

- **Month 7-8:** Embeddable widget gallery — a `/embeds` route where
  designers register the URL they embedded Globestudio output on,
  get a backlink in return. Mutual SEO benefit, durable engagement.
- **Month 9:** Second "designer spotlight" + the first signs of a
  small "made with Globestudio" badge ecosystem (opt-in CSS class
  that designers add to their pages).
- **Month 10-11:** First annual challenge or open call — "Design a
  globe for the [specific upcoming theme: World Cup, COP, election,
  whatever's seasonally relevant]." Run as a Twitter/Discussions thread,
  NOT as a weekly recurring chore. One-and-done.
- **Month 12 (anniversary, May 2027):** Year-in-review blog post.
  Numbers, top community presets, contributor thank-you. Open-source
  flywheel as story arc. This is the artifact you re-post every
  anniversary — it becomes the project's annual ritual, like
  [Excalidraw's "in YYYY" posts](https://plus.excalidraw.com/blog/excalidraw-in-2024).

---

## Tactics explicitly rejected (and why)

- **Mailchimp / Substack newsletter** — cost and ergonomics worse than
  Buttondown for a solo maintainer; Mailchimp is also a UX disaster for
  Markdown-native writers ([lethain.com](https://lethain.com/newsletter-mailchimp-to-buttondown/)).
- **Weekly design challenges** — too chore-y, fail loudly when
  participation dips, and require *external* content production on the
  maintainer's schedule. High abandonment risk. Save the energy for
  one-off seasonal challenges instead.
- **Discord at launch** — empty Discord servers actively damage brand
  perception. Wait for organic demand
  ([existing community research recommendation](2026-05-community-building.md)).
- **Desktop app / Electron wrapper** — high maintenance cost, low
  retention lift for an already-fast browser tool. Skip indefinitely
  unless an offline use case emerges from user feedback.
- **In-app modal asking "stay updated?"** — directly contradicts the
  "no signup, no email" brand pitch. The RSS link in the footer carries
  the same load with zero friction.
- **Push notifications via Web Push API** — same brand contradiction;
  designers will read this as "this tool wants to spam me."

---

## The single most important takeaway

For an intermittent-use design tool, retention is not a daily-engagement
problem. It's a **top-of-mind problem on the day the next need arises.**

Three artifacts solve that:

1. **The URL the designer bookmarked** — make sure they can find it
   again (memorable domain ✅ already done).
2. **The Google result they re-search for** — invest in SEO
   (per [SEO playbook](2026-05-seo-playbook.md)).
3. **The occasional reminder they didn't ask for but appreciated** —
   ship a release, write a blog post, tweet a community preset. Don't
   spam. Don't gate. Just stay visible.

Everything else in this report is a way to make those three things
happen on a cadence a solo maintainer can sustain for two years without
hating their life.

---

## Sources

### Case studies
- [tldraw blog (release rhythm)](https://tldraw.dev/blog) ✅
- [tldraw "What's new" March 2025 (recap post pattern)](https://tldraw.dev/blog/whats-new-2025) ✅
- [tldraw Series A announcement](https://tldraw.dev/blog/announcing-tldraw-series-a) ✅
- [Make Real / tldraw Computer GitNation talk](https://gitnation.com/contents/make-real-tldraws-accidental-ai-play) ✅
- [Excalidraw Libraries — community contribution model](https://github.com/excalidraw/excalidraw-libraries) ✅
- [Excalidraw Libraries directory](https://libraries.excalidraw.com/) ✅
- [Excalidraw community page](https://plus.excalidraw.com/community) ✅
- [Excalidraw in 2024 (annual recap pattern)](https://plus.excalidraw.com/blog/excalidraw-in-2024) ✅
- [Excalidraw libraries contributing docs](https://deepwiki.com/excalidraw/excalidraw-libraries/5-contributing-to-excalidraw-libraries) ✅
- [Photopea founder profile (byvi.co)](https://byvi.co/2024/03/31/photopea/) ✅
- [Photopea Failory interview ($100k/mo solo)](https://www.failory.com/interview/photopea) ✅
- [Photopea Indie Hackers thread ($3M/yr)](https://www.indiehackers.com/post/tech/making-3m-per-year-with-a-free-product-axW4u1vB6C8f91Z3Lxu5) ✅
- [Coolors trending palettes feed](https://coolors.co/palettes/trending) ✅
- [Haikei welcome / newsletter announcement](https://haikei.app/blog/welcome-to-haikei/) ✅
- [Vectary community page](https://community.vectary.com/3d-design-tool/) ⚠️ (commercial — partial comparison only)
- [Vercel OG Image Playground](https://og-playground.vercel.app/) ⚠️ (no formal retention loop observed; functions as a static utility)
- [Stripe globe blog post](https://stripe.com/blog/globe) ✅
- [GitHub globe HN thread (Stripe globe follow-up)](https://news.ycombinator.com/item?id=25584720) ✅

### Retention strategy & tooling
- [Indie Hackers — Launched on HackerNews, what happened](https://www.indiehackers.com/post/launched-on-hackernews-what-happened-and-what-i-learned-nflqqZoHttex6HhKkKTH) ✅
- [Buttondown vs Mailchimp comparison](https://buttondown.com/comparisons/mailchimp) ✅
- [Lethain — Moved newsletter from Mailchimp to Buttondown](https://lethain.com/newsletter-mailchimp-to-buttondown/) ✅
- [Building a Public Changelog That Converts (resizemyimg)](https://resizemyimg.com/blog/building-a-public-changelog-that-converts/) ✅
- [Plausible Analytics](https://plausible.io/) ✅
- [Socket.dev — The Unpaid Backbone of Open Source (solo maintainer burnout)](https://socket.dev/blog/the-unpaid-backbone-of-open-source) ✅
- [OpenSauced — Lonely Journey of OSS Maintainers](https://opensauced.pizza/blog/the-lonely-journey-of-open-source-maintainers) ✅

### Internal references
- [2026-05-community-building.md](2026-05-community-building.md) — GitHub Discussions / Discord decision
- [2026-05-seo-playbook.md](2026-05-seo-playbook.md) — SEO-as-retention loop
- [2026-05-examples-directory.md](2026-05-examples-directory.md) — examples gallery (related to "Made with" showcase)
- [launch/wednesday-launch.md](../../launch/wednesday-launch.md) — launch-day plan
