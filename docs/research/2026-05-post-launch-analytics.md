# Post-Launch Analytics for Globestudio

**Status:** Decision-grade research
**Date:** 2026-05-24
**Author:** Research assistant (for alevizio)
**Launch context:** Globestudio v1.0 ships Wed May 27, 2026 at `globestudio.app` (React 19 + Vite 8 + Three.js, deployed to Vercel, MIT).

---

## TL;DR

**Pick Vercel Web Analytics + Vercel Speed Insights, with a Plausible Cloud upgrade option if you outgrow the Hobby tier.** Vercel Web Analytics is cookieless, GDPR-compatible by design, ships zero-config from a project you already own, and the Hobby tier gives 50,000 events/month for free — enough headroom for a fresh OSS launch. Speed Insights ($10/mo, Pro only) is optional but the cleanest way to track Core Web Vitals for a Three.js-heavy app over time.

The "no signup, no API key" pitch survives intact: visitors are hashed (not cookied), no fingerprinting, no third-party domain. The privacy page just needs one honest paragraph. Don't ship GA4.

---

## 1. The 2026 privacy-analytics landscape

### Comparison table

| Tool | Free tier (cloud) | Self-host | Cookies | Custom events | Vite/React setup | Dashboard depth | Notes |
|---|---|---|---|---|---|---|---|
| **Vercel Web Analytics** | 50k events/mo (Hobby), 1-month window | No | No (hashed visitor ID) | Pro plan only ($20/mo) | One `<Analytics />` component | Light, but adequate | Already in your stack. No DNS/script-block headaches. |
| **Vercel Speed Insights** | Pro plan required ($10/mo add-on) | No | No | n/a | One `<SpeedInsights />` component | RUM-grade Web Vitals | Best-in-class for Core Web Vitals trend lines. |
| **Plausible Cloud** | None — $9/mo starter (10k pv/mo) | Yes (AGPL-3.0 CE) | No | Yes (`window.plausible(...)`) | 1KB script tag | Clean, focused, 80% of what you need | Excalidraw-style fit. Great public-stats option. |
| **Plausible Self-Host (CE)** | Free + infra (~$5-12/mo VPS) | Yes | No | Yes | Same script tag, different host | Same as cloud | Adds ops burden a solo maintainer doesn't want at launch. |
| **PostHog Cloud** | 1M events/mo free | Yes (MIT) | Optional (off by default for web) | Yes, with feature flags & funnels | `posthog-js` package | Deep: funnels, retention, cohorts, replay | Overkill at launch; great when you start running experiments. |
| **Umami Cloud** | 100k events/mo (Hobby, 3 sites) | Yes (MIT) | No | Yes | Script tag | Light, very clean UI | Best self-host story if you ever leave Vercel. |
| **Fathom** | None — $15/mo entry | No | No | Yes | Script tag | Focused, simple | Closed-source. No edge over Plausible for OSS positioning. |
| **Simple Analytics** | $0 (5 sites, 1-month history, no events) | No | No | Paid tiers only ($15+) | Script tag | Minimalist, no bounce rate | What Excalidraw uses for the marketing site. Free tier is real but capped. |
| **GA4** | Free | No | Yes (cross-site identifiers, ad-tech) | Yes | gtag.js | Vast but hostile UX | **Do not ship.** Betrays the pitch and forces a consent banner in EU. Photopea is the cautionary tale here. |
| **Vercel access logs + awk** | Free with your plan | n/a | No | Server-side only | Zero JS | Zero — you'd build it | Truly zero-overhead, but no Web Vitals, no SPA route tracking (everything is `/`). Useful only as a referrer-counter fallback. |

### Why Vercel Web Analytics wins for Globestudio

1. **Pitch-compatible.** No cookies, no fingerprinting, IP hashed in-memory. Confirmed in Vercel's official docs: visitors are identified by a hash derived from the request, not stored client-side. No consent banner required in EU under current GDPR interpretation.
2. **Zero infra surface.** You're already deployed there. No second vendor, no second DNS record, no script blocked by uBlock Origin/Brave Shields (well, less than `plausible.io` is — see "Caveats").
3. **Free tier is real.** 50,000 events/month covers ~1,500/day, which is plenty for a launch-week-to-month-three OSS tool. If you hit it, the Hobby tier pauses collection rather than billing you.
4. **Speed Insights** is the trump card: nothing else gives you cleaner Real User Monitoring for Core Web Vitals on a Three.js app, where field data (not lab) is what reveals the GPU-bound jank.

### When you'd switch

- **You hit 50k events/mo and don't want to pay Vercel Pro ($20/mo + $3 per 100k events).** → Move to **Plausible Cloud ($9/mo Starter, 10k pageviews)** or **Umami Cloud ($0 up to 100k events)**.
- **You start running A/B tests or want funnels deeper than "page A → page B".** → Layer **PostHog** on top (free tier is generous, EU-hosted available).
- **You want a public stats page** (the "we are transparent about our numbers" move popularized by Plausible and DHH). → Switch to **Plausible**, which has a one-click public dashboard.

### Caveats worth knowing

- Vercel Web Analytics is blocked by some adblockers (the `/_vercel/insights/*` path is in EasyPrivacy). Plausible self-hosted is the only way to fully sidestep this; even Plausible Cloud is blocked by default ublocking lists. Expect 10-25% undercount on a developer-heavy audience. This is fine — the trend is what you care about.
- Custom events on Vercel require Pro. If you want to track "preset applied" or "export clicked" on the Hobby tier, you either upgrade or supplement with Plausible.

---

## 2. What Globestudio should actually measure

A tracking plan is only valuable if you'd act on each event. Below, every event has a reason.

### Page views (automatic — no work needed)

Vercel Web Analytics auto-tracks SPA route changes via History API. You'll see:

- `/` (home / canvas)
- `/looks/:id` (preset detail) — **the one you care most about**
- `/embed?look=...` (referrer-only, see below)
- `/docs`, `/brand`, `/changelog`
- `/privacy`

### Custom events (Pro tier or via Plausible)

| Event name | Properties | Why |
|---|---|---|
| `preset_viewed` | `look_id` | Confirms `/looks/:id` referral traffic. |
| `preset_applied` | `look_id`, `surface` ("looks-bar" \| "deep-link") | The #1 product question: **which presets actually get used vs just visited**. |
| `export_started` | `format` ("png" \| "svg" \| "webm"), `dimensions` | The activation event. If this rate is low, the export UX is broken. |
| `export_completed` | `format`, `duration_ms` | Diff against `export_started` to find drop-off (large WebM exports stall). |
| `share_clicked` | `target` ("copy-link" \| "twitter" \| "native") | The viral coefficient input. |
| `embed_view` | `referrer_host` | The only signal that `/embed?look=...` is being used in the wild. Vercel auto-captures referrer. |
| `docs_visited` | `section` | Tells you which docs sections need work (high views + high bounce = confusion). |
| `webgl_unsupported` | `gpu_renderer` (truncated) | Critical for the mobile Safari WebGL audit you already have queued. |
| `figma_plugin_clicked` | `surface` | Cross-funnel signal: web → Figma plugin. |

**Skip:** session replay, user IDs, fingerprinting, third-party ad pixels, anything that needs a consent banner. These betray the pitch.

### Funnel to instrument (one funnel only at launch)

```
land (any route) → interact (preset_applied OR canvas dwell >30s)
                 → export_started
                 → export_completed
                 → share_clicked
```

If you only watch one number weekly, watch **land → export_completed** conversion. That's the product activation rate.

### Retention (do this at month 3, not at launch)

A weekly cohort retention curve (W1, W2, W4, W8) on a stable visitor hash (Vercel provides one) is enough. Don't build cohort dashboards before you have cohorts.

### Dimensions to keep on dashboards

- Geographic distribution (country level only — no city)
- Device split (mobile / tablet / desktop)
- Top referrers (designer Twitter/Bluesky, ProductHunt, HN, dev.to)
- Core Web Vitals (LCP, INP, CLS) trend lines by week (Speed Insights)

---

## 3. How the "no signup, no tracking" pitch survives

### Vercel Web Analytics specifically

- **No cookies.** Visitor ID is a hash of `(daily_salt + IP + user_agent)`, rotated daily, never stored client-side. Source: [Vercel Web Analytics docs](https://vercel.com/docs/analytics).
- **No personal data.** No name, no email, no fingerprint vector beyond country (derived from IP at the edge, then IP is discarded).
- **No consent banner required.** GDPR-compatible because no PII is processed. CNIL (the French data authority) explicitly exempts this class of analytics.
- **Aggregated reporting only.** No row-per-user log you could subpoena.

Plausible is equivalent on every dimension — both meet the bar.

### What Globestudio's /privacy page should say

One paragraph. Paste this verbatim:

> **Privacy.** Globestudio is free, open source, and built so you never need an account. We use Vercel Web Analytics to count anonymous page views and a few product events (preset applied, export started, export completed). No cookies, no fingerprinting, no personal data, no third-party advertisers, no session replay. Your IP address is hashed and discarded at the edge — we cannot identify you, and neither can Vercel. To opt out entirely, block requests to `/_vercel/insights/` in your browser or use any standard adblocker. The full source is at [github.com/alevizio/globestudio](https://github.com/alevizio/globestudio).

### Making opt-out visible

Two reasonable patterns:

1. **Honor Do-Not-Track / Global Privacy Control by default.** Wrap the `<Analytics />` mount: don't render it if `navigator.doNotTrack === "1"` or `navigator.globalPrivacyControl === true`. Five lines of code. Most ethical default; near-zero cost to your data.
2. **Visible footer toggle.** A "Analytics: on / off" link in the footer that writes `localStorage.gs_optout = "1"` and is read on every page load. Add to your existing footer component.

Recommend **both**. Together they signal that the privacy claim is structural, not marketing.

---

## 4. Case studies — how peer OSS tools handle this

### Excalidraw
- **Marketing site (excalidraw.com):** SimpleAnalytics (cookieless, GDPR-compliant cloud).
- **In-app:** self-hosted Umami.
- **Privacy posture:** end-to-end encryption for collab rooms (room ID + key in URL fragment, never sent to server). The analytics choice mirrors this — both tools are cookieless by design.
- **Lesson:** the marketing site and the app can use different stacks. You can do the same: Vercel WA for the marketing surfaces (`/`, `/docs`, `/brand`) and skip the in-app canvas if you ever feel the events are noisy.

### tldraw
- Built `@tldraw/analytics` — an in-house wrapper that provides a cookie consent banner with explicit opt-in/opt-out, plus a global `openPrivacySettings()` function. Wraps multiple providers behind a consent gate.
- **Lesson:** if you ever bring in a tool that does use cookies, build a consent gate, don't add the cookie. For Globestudio, you don't need this layer — pick cookieless tooling and the consent question disappears.

### Photopea
- Uses Google Analytics + Google Tag Manager. Premium users have complained for years that they can't disable analytics (open issue #4448).
- **Lesson — the anti-pattern.** Photopea's privacy posture is weaker than its product deserves. Don't repeat this. Photopea is in the Ghostery WhoTracksMe database; Globestudio shouldn't be.

### Tally.so
- EU-hosted, no cookie tracking on the marketing site, in-product "Form Insights" use aggregate-only data (visit duration, traffic source, device, country). Offers GA / Meta Pixel as opt-in integrations for users' embedded forms.
- **Lesson:** the maintainer's privacy posture and the **embedder's** privacy posture are different. Globestudio's `/embed?look=...` should not load analytics scripts — let the embedder decide. (Vercel WA only loads on your origin; embeds are typically iframes which inherit your origin's analytics — review and confirm before launch.)

### Synthesis
Three of four peers ship a privacy-first stack. The fourth (Photopea) is the cautionary tale. The privacy-first stack is the OSS-design-tool default in 2026, and Globestudio should match it.

---

## 5. Implementation playbook (Vercel Web Analytics + Speed Insights)

### Step 1 — Install

```bash
npm install @vercel/analytics @vercel/speed-insights
```

### Step 2 — Mount once in your app root

In your main React entry (likely `src/main.tsx` or your root `App` component):

```tsx
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";

const dnt =
  typeof navigator !== "undefined" &&
  (navigator.doNotTrack === "1" ||
    // @ts-expect-error — non-standard, supported in Brave/Firefox
    navigator.globalPrivacyControl === true ||
    window.localStorage?.getItem("gs_optout") === "1");

export const App = () => (
  <>
    {/* …your routes… */}
    {!dnt && (
      <>
        <Analytics />
        <SpeedInsights />
      </>
    )}
  </>
);
```

That's the whole installation. No script tag in `index.html`. No environment variables. No DNS changes. Page views are automatically tracked across React Router / your SPA history transitions.

### Step 3 — Track custom events (Pro tier)

```tsx
import { track } from "@vercel/analytics";

// In your "Apply preset" handler:
track("preset_applied", { look_id: look.id, surface: "looks-bar" });

// In your export handler:
const t0 = performance.now();
track("export_started", { format, dimensions: `${w}x${h}` });
// …after export resolves…
track("export_completed", { format, duration_ms: Math.round(performance.now() - t0) });
```

Custom event property values are stringified; keep them low-cardinality (don't pass a unique ID per export). Hobby tier doesn't accept custom events — they get silently dropped. Either upgrade to Pro or use Plausible for custom events while keeping Vercel for pageviews.

### Step 4 — Enable in dashboard

1. Vercel dashboard → your `globestudio` project → **Analytics** tab → **Enable**.
2. Same for **Speed Insights** (requires Pro plan; skip at launch if you want to defer the $20/mo).

### Step 5 — Add the privacy page

Create a `/privacy` route with the one-paragraph copy from §3 above. Link it from the footer and from your `index.html` meta. That's it — no Cookiebot, no OneTrust, no consent banner.

### Step 6 — The maintainer's weekly ritual

Open this URL each Monday:

```
https://vercel.com/<your-team>/globestudio/analytics
```

What to look at (5 minutes total):
- **Top pages** — confirm `/looks/:id` traffic is healthy; the top 3 presets should be obvious.
- **Top referrers** — where the launch ripples are reaching.
- **Country split** — sanity-check the designer-audience hypothesis.
- **Devices** — desktop dominance expected; if mobile share is climbing, prioritize the mobile Safari WebGL work.
- **Speed Insights → INP, LCP** — week-over-week trend. Any sudden 50%+ regression is a recent commit, not noise.

### Cost projection — 100k pageviews/month scenario

| Component | Hobby | Pro |
|---|---|---|
| Web Analytics events (100k pageviews + ~50k custom events) | Capped at 50k, paused after that | $3 × 1 (100k overage) = **$3/mo** + Pro base $20/mo |
| Speed Insights | Unavailable | Included in Pro |
| Custom events | Unavailable | Included in Pro |
| **Total annual** | **$0** (with collection gaps) | **~$276/yr** ($23/mo) |

If you stay on Hobby and want full event tracking, layer **Plausible Cloud at $9/mo (10k pageviews) or $19/mo (100k pageviews)** for custom events, and keep Vercel for the pageview + Speed Insights baseline only if you go Pro. Two tools, both cookieless, both ~$25/mo. Or just go Plausible-only and skip Speed Insights — you can always add it later.

---

## 6. Decision summary

| Scenario | Pick |
|---|---|
| **Launch day → month 3 (most likely)** | Vercel Web Analytics on Hobby. $0. Honor DNT/GPC. Privacy paragraph published. |
| **Month 3 — you want custom events and Web Vitals** | Upgrade to Vercel Pro ($20/mo + ~$3 overage). Add Speed Insights. ~$25/mo all-in. |
| **Month 6 — you want a public stats page or experiments** | Switch to Plausible Cloud ($19/mo, 100k pv) or layer PostHog (free up to 1M events) for funnels. |
| **You hate vendor lock-in** | Plausible Community Edition, self-hosted on a $5/mo VPS. AGPL-3.0. ~1-3 hrs/mo ops. |

**Ship recommendation:** Vercel Web Analytics on Hobby with the DNT/GPC + localStorage opt-out from §5. Add Speed Insights when you upgrade to Pro for any other reason. Revisit at 50k events/mo.

---

## Sources

- [Vercel Web Analytics docs](https://vercel.com/docs/analytics)
- [Vercel Web Analytics — Limits and Pricing](https://vercel.com/docs/analytics/limits-and-pricing)
- [Vercel Web Analytics — Quickstart](https://vercel.com/docs/analytics/quickstart)
- [Vercel Web Analytics — Custom events](https://vercel.com/docs/analytics/custom-events)
- [Vercel Speed Insights overview](https://vercel.com/docs/speed-insights)
- [Vercel Speed Insights — Limits and Pricing](https://vercel.com/docs/speed-insights/limits-and-pricing)
- [@vercel/analytics on npm](https://www.npmjs.com/package/@vercel/analytics)
- [Plausible Analytics — GitHub](https://github.com/plausible/analytics)
- [Plausible — SPA support](https://plausible.io/docs/spa-support)
- [Plausible — Custom event goals](https://plausible.io/docs/custom-event-goals)
- [Plausible — Outbound link tracking](https://plausible.io/docs/outbound-link-click-tracking)
- [Plausible — File downloads tracking](https://plausible.io/docs/file-downloads-tracking)
- [Plausible — Self-hosted](https://plausible.io/self-hosted-web-analytics)
- [PostHog pricing](https://posthog.com/pricing)
- [PostHog — Self-host docs](https://posthog.com/docs/self-host)
- [Umami pricing](https://umami.is/pricing)
- [Fathom Analytics pricing](https://usefathom.com/pricing)
- [Simple Analytics — Review 2026 (Prettyinsights)](https://prettyinsights.com/simple-analytics-review/)
- [Excalidraw — Security and compliance](https://plus.excalidraw.com/security-and-compliance)
- [Excalidraw — Privacy policy](https://plus.excalidraw.com/privacy-policy)
- [tldraw — analytics workspace writeup (dev.to)](https://dev.to/ramunarasinga-11/analytics-workspace-in-tldraw-codebase-1ik4)
- [Photopea — Privacy policy](https://www.photopea.com/privacy.html)
- [Photopea issue #4448 — disable analytics for premium](https://github.com/photopea/photopea/issues/4448)
- [Tally — Privacy policy](https://tally.so/help/privacy-policy)
- [Tally — Form insights](https://tally.so/help/form-insights)
- [Self-Hosted Web Analytics 2026 — Plausible vs Matomo vs Umami vs OpenPanel (OpenPanel)](https://openpanel.dev/articles/self-hosted-web-analytics)
- [Web Analytics Pricing 2026: Plausible vs Fathom vs Matomo vs Mixpanel vs PostHog (StackScored)](https://www.stackscored.com/pricing/analytics/)
