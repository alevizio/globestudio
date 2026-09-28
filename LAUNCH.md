# Globestudio launch playbook

> GTM, SEO, and ready-to-paste copy for the first public launch, week of
> Mon 28 Sep to Sun 4 Oct 2026. Companion to [STRATEGY.md](STRATEGY.md).
> Derived from 2026 launch/SEO research. Pre-launch state: a coming-soon
> teaser (gated by `VITE_TEASER`) is collecting an email waitlist; launch = set
> `VITE_TEASER=0` (1 = teaser) on Production, redeploy, then run the plan
> below. The paste-ready copy lives in [`launch/`](launch/).

## Schedule

This is the only launch schedule. The files in `launch/` point here instead
of restating dates. Times are UTC first, then Pacific (PDT, UTC−7).

| Day | UTC | PT | What |
|---|---|---|---|
| Mon 28 Sep | by 14:00 | by 07:00 | Merge the launch fixes; publish `@globestudio/mcp` 0.1.1 and `@globestudio/element` 0.1.0 from one npm session |
| Mon 28 Sep | by 15:00 | by 08:00 | **Flip the teaser** ([runbook](#flip-runbook)); check in an incognito window |
| Mon 28 Sep | after the flip | | Search Console: resubmit the sitemap, request indexing for /, /gallery, /compare/cobe, /compare/geolayers. Bing import. LinkedIn Post Inspector and the Facebook debugger on /. Upload the GitHub social preview |
| Mon 28 Sep | evening | | Soft launch on r/SideProject with a UTM link |
| Tue 29 Sep | 13:30 | 06:30 | `git tag v1.0.0`, `gh release create v1.0.0` with the [CHANGELOG](CHANGELOG.md) 1.0.0 notes; pin an Announcements discussion |
| Tue 29 Sep | **14:00** | **07:00** | **Show HN** ([`launch/show-hn.md`](launch/show-hn.md)); stay in the thread for 4 to 6 hours |
| Tue 29 Sep | once HN has traction | | X thread and Mastodon ([`launch/social-threads.md`](launch/social-threads.md)); record the 20 to 30 s demo and 3 export GIFs |
| Wed 30 Sep | | | three.js forum Showcase and r/threejs; final waitlist export, junk review, Resend import, Broadcast draft; schedule Product Hunt; send the outreach emails ([`launch/outreach-email.md`](launch/outreach-email.md)) |
| Wed 30 Sep | by 20:00 | by 13:00 | One deploy with the week's fixes, checked on its preview first. |
| Thu 1 Oct | **07:01** | **00:01** | **Product Hunt** goes live ([`launch/product-hunt.md`](launch/product-hunt.md)); post the maker comment; send the [one waitlist email](#waitlist-one-email) |
| Thu 1 Oct | during the day | | LinkedIn post; answer every PH comment |
| Fri 2 Oct | | | Lobsters (if invited); r/web_design and r/InternetIsBeautiful, one post each; follow-ups |
| Sat 3 to Sun 4 Oct | | | Keep replying; triage issues and Discussions; review visits, exports, stars and npm installs |

Rules for the week:

- No outreach or preview links before the flip. Pre-flip links land on the
  teaser.
- Show HN and Product Hunt stay on different days; each needs a full day of
  replies.
- No code pushes on Tue 29 Sep or Thu 1 Oct unless something is broken. Fixes
  go out in the single Wednesday deploy.
- UTM-tag every link you post so the next launch can be data-driven.

## Flip runbook

Mon 28 Sep, by 15:00 UTC (hard stop Tue 29 Sep 10:00 UTC).

1. Note the current production deployment in Vercel (the teaser build). That
   is the rollback target.
2. Vercel > globestudio > Settings > Environment Variables: set `VITE_TEASER`
   to exactly `0` on Production (and on Preview, so previews show launch
   mode). Do not delete it and do not use `false`.
3. Deployments > newest Production deployment > Redeploy. Vite bakes the value
   in at build time, so nothing changes until a new build runs.
4. Verify:

   ```
   curl -s https://globestudio.app/sitemap.xml | grep -c '<loc>'            # expect 31
   curl -s https://globestudio.app/ | grep -o 'og/[a-z]*\.png' | sort -u    # no teaser.png
   curl -s https://globestudio.app/looks/halftone | grep -c noindex         # expect 0
   ```

5. In an incognito window (a normal profile may carry `gs_preview=1` and
   always shows the app): `/` shows the studio with no email inputs, and
   `/embed?look=halftone` renders.

Rollback: Instant Rollback to the teaser deployment from step 1.

Hotfixes during launch week: push to a branch, check its Vercel preview, then
merge. A push to `main` deploys to production straight away. Keep the Vercel
Logs tab open while HN and PH are live; logs are only kept for a short time.

## Positioning

> **Globestudio is a free, open-source studio for dotted maps and 3D globes.
> It turns the dotted globe look you see on tech landing pages into a file or
> an embed, without writing Three.js, opening After Effects, or signing up.**

Value props: (1) the look, without the build; (2) real, clean exports (PNG,
SVG, WebM, MP4, GIF, JSON config) and embeds; (3) it lives where you work
(React component, web component, Figma plugin, MCP server). Open source, MIT,
no signup.

"Isn't this just cobe?" cobe is a 5 KB library for developers who write code.
Globestudio is the layer above: a no-code studio where you design the look and
export it (or grab a component, plugin or MCP server). cobe gives you a canvas;
Globestudio gives you a deliverable.

Headline copy never leans on other companies' names or trademarks (no "Stripe
globe" or "GitHub globe" framing). Comparison pages may name tools factually.

## GTM: channel plan (ranked)

Solo-maker reality: one anchor launch on each of HN and PH, plus a few
secondary channels across the week. Dates are in the [schedule](#schedule).

| Rank | Channel | Why | Angle | Gotcha |
|---|---|---|---|---|
| 1 | **Show HN** | Highest ROI for the OSS/dev side; front page = thousands of devs + most launch-week stars | OSS + npm + MCP + "MIT, no signup, runs in the browser" | Zero popups or email gates on the live app; no superlatives; reply as a human |
| 2 | **Product Hunt** | Best for designers; top-3 = 1 to 3k visits | "Open-source dotted maps and 3D globes for designers"; lead with a looping export | Reward is comments and time on page; never ask for upvotes |
| 3 | **Figma Community plugin** | Evergreen designer discovery; already live | The plugin is the pitch | The listing must match what the plugin does |
| 4 | **X** | Owned momentum; connective tissue | Post the output (a 10 s clip: generate, export); link in a reply | Links get throttled, so the video goes in the post |
| 5 | **r/SideProject** | Friendly, self-promo OK | Maker story | Engage with other posts too |
| 6 | **r/threejs + three.js forum Showcase** | Exact niche, good feedback and stars; the forum can feature it on threejs.org | Technical (instancing, morph, post-processing) | Must be substantive; the forum needs mod approval |
| 7 | **r/web_design, r/InternetIsBeautiful** | r/IIB can spike if it lands | A beautiful live globe, no signup | r/IIB is fussy; skip r/graphic_design (anti-promo) |
| 8 to 11 | dev.to (canonical to own blog), Indie Hackers, Lobsters (`show` tag, needs an invite), Discords where you're a member | Long tail / community | Story or tutorial framing | Discord cold-drops backfire |

## Waitlist: one email

The teaser promised "one email when we launch". Send exactly that one: Thu 1
Oct, right after Product Hunt goes live, as a Resend Broadcast from a verified
sending domain (DKIM, SPF, DMARC), with an unsubscribe link and a postal
address. No warmups before it, no follow-up after it. `/api/subscribe`
is retired and answers 410 Gone, so the list does not grow.

**Subject:** `Globestudio is live`

```text
Hi,

You joined the Globestudio waitlist, and I promised one email when it launched. This is that email, and the only one you'll get from this list.

Globestudio is live: a free, open-source studio for dotted maps and 3D globes. Pick a look, tweak it in your browser, and export PNG, SVG, WebM, MP4 or GIF, or embed it live. No account needed.

Open it: https://globestudio.app

It's also on Product Hunt today. If you try it, a comment there about what you'd make with it helps more than anything: {Product Hunt link}

The code is MIT on GitHub: https://github.com/alevizio/globestudio

Thanks for waiting,
Alejandro

{unsubscribe link}
{postal address}
```

## Partnerships: GlobeKit handoff (warm, orphaned audience)

GlobeKit (Rally Interactive, 2017 to about 2020) was a **paid WebAssembly +
WebGL globe SDK**, used by PayPal, GitHub and Hertz and honored by Awwwards
and FWA, now **discontinued**. It's the commercial, code-SDK ancestor of
Globestudio; Globestudio is the free, OSS, designer-accessible successor. A
discontinued tool = an **orphaned audience of exactly our users**. Asymmetric
bet: about 15 min to write, near-zero downside.

Unverified as of 27 Sep 2026: the old case study at rallyinteractive.com no
longer resolves (DNS failure). Confirm GlobeKit's status and find a current
contact before sending anything.

Prizes, ranked:
| # | Ask | Value |
|---|---|---|
| 1 | **"Recommended successor" line / redirect on the GlobeKit page** | Years of backlinks (Awwwards, FWA, Comm Arts, Dribbble, One Page Love) + ranks for "interactive globe" → warm targeted traffic + link equity. The big one. |
| 2 | **Their war stories: why it didn't sustain commercially** | Priceless GTM intel, esp. before betting on any paid tier. The sunset itself signals a paid globe SDK is hard to keep alive. |
| 3 | **Endorsement / nod from the GlobeKit team** | Launch-day social proof with the design crowd. |
| 4 | **@GlobeKit handle / domain** (if truly dead) | Bigger ask; save for later. |

Approach (it's a design studio; they judge on taste):
- Lead with **specific admiration**, frame around **their users, not our growth**. First ask tiny (feedback), not the big one (redirect).
- Show the **real app** (after the flip), not the teaser.
- Find a **founder/principal**, not a generic inbox.
- Time it **with launch**: the link is live + impressive; open with "you'd be among the first to see it."
- **Honesty:** Globestudio is free/OSS, not a supported commercial SDK (some GlobeKit customers paid for SLAs), so lean into "free, open, designer-first" as the different thing. Don't imply a fork; it's our own Three.js build, parallel evolution.

Draft email (designer-to-designer, about 150 words):

```text
Subject: A spiritual successor to GlobeKit (and a thank you)

Hi {name},

GlobeKit was one of my favorite tools. The six-globe showcase, the Founders Grotesk anchor, the NatGeo origin story: it set the bar for what a data globe could feel like.

I was sad to see it wind down, so I built something in its spirit. Globestudio is a free, open-source globe editor for designers: no-code styling, PNG, SVG, MP4 and GIF export, embeds, even a Figma plugin. It's the successor I wished existed when GlobeKit went away: https://globestudio.app

Two things, no pressure. (1) I'd value your honest read, since you know this space better than anyone. (2) If GlobeKit users ever ask you for an alternative, I'd be honored to be where you point them.

Either way, thank you for GlobeKit. It mattered.

Alejandro
```

The one-liner to offer them for the GlobeKit page: "GlobeKit is no longer
maintained. For a free, open-source alternative, we recommend
[Globestudio](https://globestudio.app)."

## SEO — keyword clusters → pages

| Cluster | Intent | Terms | Page |
|---|---|---|---|
| **Generator** (franchise) | transactional | dotted (world) map generator, globe generator, map to globe | **Home as generator** + `/dotted-map-generator`, `/globe-generator` |
| **Aesthetic** | "want that look" | stripe globe, github globe, dotted map design | **/gallery** hub + **/looks/:id** spokes |
| **Dev/component** | wants code | world map react component, cobe alternative | **/integrations**, **/docs**, a **/react** landing |
| **Comparison (BOFU)** | evaluating — highest AI-citation value | vs cobe / vs GEOlayers / vs worldindots, free generator no watermark | **/compare/:competitor** |
| **Motion/AE** | animators | animated globe after effects, geolayers alternative | export docs + "globe animation without After Effects" |
| **Tutorial** | learning (→ product) | how to make a github/stripe globe | tutorial articles ending in "…or 30s in Globestudio" |
| **Platform embed** | "globe in X" | notion/webflow/framer/figma globe | **/integrations/:platform** |

**Content roadmap (ranked):** 1) home-as-generator · 2) /compare/cobe · 3)
/compare/geolayers · 4) /dotted-map-generator + /globe-generator · 5) "build a
GitHub globe (hard way + 30s way)" · 6) "recreate the Stripe globe" · 7) /react ·
8) /free-dotted-map-generator-no-watermark · 9) platform embed pages · 10) AE
alternative article.

## SEO — technical checklist

- [ ] Home H1 leads with the job ("free, no-watermark, export …").
- [x] `/compare/cobe` + `/compare/geolayers` (honest tables; clean HTML; FAQ JSON-LD for AI-Overview lift; rich snippets are deprecated but AI still parses it). Shipped; the FAQ JSON-LD is still added client side.
- [ ] **Gallery hub-and-spoke**: each `/looks/:id` carries ≥30% unique value (param config table + use-case + related looks) or it triggers the 2026 scaled-content penalty; otherwise `noindex` the thin ones.
- [x] **Per-look OG images** (1200×630): WebGL previews don't render in social/AI cards. (Static OG exists at `/og/{look}.png`; wire it per look.) Shipped: every `/looks/:id` uses its own card.
- [x] `SoftwareApplication` + `isAccessibleForFree:true` + `offers:{price:0}`; `ImageObject` per look; `BreadcrumbList`. Shipped except `ImageObject` per look; `BreadcrumbList` is added client side.
- [x] `/embed` `noindex` (thin; competes with canonical pages). Shipped as an `X-Robots-Tag` header in `vercel.json`.
- [ ] Looks pages SSR/200 with real HTML + in sitemap with `lastmod`; param permutations canonicalize to the clean tool page.
- [ ] CWV for the Three.js home: SSR the headline/CTA as LCP, mount WebGL *after* first paint; reserve canvas dimensions (CLS); chunk globe init (INP <200 ms).

## AEO / LLM visibility

- `llms.txt` is plumbing, not a citation lever — keep it accurate (done).
- Win citations with **answer-first, structured** docs + **comparison pages**
  (the top AI-cited surface); format headings as the questions people ask.
- The **MCP server** is a real discovery surface (assistants can *use* it) — list
  it in MCP directories + "awesome" lists where cobe/react-globe.gl appear.
- Keep facts consistent across home/llms.txt/docs/schema (free, MIT, formats).
- **Attribution caveat:** keep "no watermark / no attribution" copy scoped to the
  *output*, not the UI (icons are Pixelarticons-MIT → attribution required).

## Ready-to-paste copy

Each channel has one draft, in one file. Dates and times are in the
[schedule](#schedule).

| Channel | Draft |
|---|---|
| Show HN (title, body, prepared answers) | [`launch/show-hn.md`](launch/show-hn.md) |
| Product Hunt (tagline, description, maker comment, gallery) | [`launch/product-hunt.md`](launch/product-hunt.md) |
| X thread, Mastodon, LinkedIn, Reddit, three.js forum, Lobsters | [`launch/social-threads.md`](launch/social-threads.md) |
| Outreach to newsletters and communities | [`launch/outreach-email.md`](launch/outreach-email.md) |
| Waitlist (one email) | [above](#waitlist-one-email) |
| GlobeKit | [above](#partnerships-globekit-handoff-warm-orphaned-audience) |
