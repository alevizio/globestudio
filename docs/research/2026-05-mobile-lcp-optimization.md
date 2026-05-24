# Mobile LCP optimization — getting under 2.5s before launch

**Date:** 24 May 2026
**Author:** research pass for the May 27 launch
**Sources consulted:** 18 (PageSpeed Insights, web.dev, Vite docs, Vercel docs, MDN, Chrome blog, Cloudflare, plus build artifact inspection)
**Confidence:** High on the diagnosis, medium-high on the impact estimates (lab numbers; field will vary)
**Status:** Recommendation. Nothing implemented yet.

---

## TL;DR

Mobile LCP is **4.0s**. Target is **<2.5s**. The LCP element is almost certainly `.map-background-placeholder` (the full-viewport `position: fixed` `<div>` with the radial gradient + shimmering "globe" pseudo-element) that sits inside the `<Suspense fallback>` until `globe-background` + `three` + `dotted-map` all resolve and the canvas paints. Until then it's the only viewport-filling contentful paint on the page.

That means there are two strategies, and you should pick exactly one:

### Ranked by ROI (impact ÷ effort)

| # | Fix                                                                                                       | Est. LCP delta | Effort  | ROI |
| - | --------------------------------------------------------------------------------------------------------- | -------------- | ------- | --- |
| 1 | **Demote `three` from `modulepreload` to runtime-only import + inline critical CSS + preconnect jsdelivr** | −1.0 to −1.6s | 1–2 hrs | ★★★★★ |
| 2 | **Render a static SVG dotted globe as the LCP element before React mounts** (inline in `index.html`)        | −1.2 to −2.0s | 3–5 hrs | ★★★★☆ |
| 3 | Build-time prerender to ship the placeholder + above-the-fold chrome in static HTML (vite-react-ssg)       | −0.6 to −1.2s | 6–10 hrs | ★★★☆☆ |

Fix #1 alone should clear 2.5s on mid-tier Android (Moto G Power class, which is what Lighthouse's mobile preset emulates). Fix #2 stacks on top and is the safer way to get headroom for real-world 3G + thermal-throttled iPhones. **Ship #1 for launch, queue #2 for v1.1.**

#1 and #2 are both independent of the SSG question and require zero changes to the runtime app.

---

## What is the LCP element on globestudio.app mobile?

**PageSpeed Insights API was rate-limited on quota during this research session** (HTTP 429, "Queries per day" exhausted for the anonymous default project). The public web UI was also still in "Running analysis" state at fetch time, so I could not pull a fresh JSON. Re-run on launch day once quota resets.

That said, the LCP element can be identified statically from the codebase with high confidence:

**Build inspection** ([dist/index.html](../../dist/index.html), [src/App.jsx:1047](../../src/App.jsx)):

- The body's static markup is one empty `<div id="root">` and a noscript fallback. No above-the-fold image, no hero text. Nothing in the static HTML is paintable.
- React mounts and the route renders `<Suspense fallback={<div className="map-background-placeholder" aria-hidden="true" />}>`.
- `.map-background-placeholder` is `position: fixed; inset: 0;` with a radial gradient background and a 22vmin animated circle pseudo-element ([src/styles.css:1099](../../src/styles.css)). On a 360×800 mobile viewport that's ~288k CSS pixels — by far the largest contentful element.
- The `<h1>` on line 1000 is `.visually-hidden` (offscreen). It does not satisfy LCP.
- Once `globe-background` resolves, the `<canvas>` replaces the placeholder. WebGL canvases are valid LCP candidates in 2025+ Chrome, but only after `gl.clear`/first draw, which is gated on `three` + `dotted-map` parsing + first-frame work.

**Sub-part breakdown (modeled, not measured):**

| Sub-part        | Estimated time (mobile, slow-4G) | Source of the delay                                                                   |
| --------------- | -------------------------------- | ------------------------------------------------------------------------------------- |
| TTFB            | ~150 ms                          | Vercel edge HIT (we observed `x-vercel-cache: HIT` on `curl -I`).                     |
| Load Delay      | ~600 ms                          | CSS file fetch (28 kB, render-blocking) + Geist Pixel font from `cdn.jsdelivr.net`.   |
| Load Time       | ~1.5 s                           | `three-*.js` 140 kB gzip is in `modulepreload` and competes for bandwidth with CSS.   |
| Render Delay    | ~1.5 s                           | React boot, route resolve, first paint of placeholder div.                            |

This adds up to roughly the observed 4.0s. The two biggest line items — Load Time (Three.js eagerly preloaded) and Render Delay (full JS boot before placeholder paints) — are addressable without architectural change.

---

## Candidate fixes, ranked

### 1. Demote `three` from `modulepreload` to runtime-only ★★★★★

**Estimated LCP delta:** −400 to −700 ms
**Effort:** 30 min

The deployed `index.html` has these `modulepreload` tags emitted by Vite:

```html
<link rel="modulepreload" crossorigin href="/assets/dotted-map-CL7GeOSb.js">  <!-- 150 kB gzip -->
<link rel="modulepreload" crossorigin href="/assets/geo-BicHZ6fX.js">
<link rel="modulepreload" crossorigin href="/assets/vendor-VHxizz7F.js">
<link rel="modulepreload" crossorigin href="/assets/rolldown-runtime-pRHcBP7x.js">
<link rel="modulepreload" crossorigin href="/assets/react-KPNGfFWW.js">       <!-- 60 kB gzip -->
<link rel="modulepreload" crossorigin href="/assets/three-CTQTyFdZ.js">       <!-- 140 kB gzip -->
```

On a 4G connection (1.6 Mbps Lighthouse simulated throughput), 140 kB gzip takes ~700 ms to download. That download competes with the render-blocking CSS and the React chunk for bandwidth before the LCP element can paint. `three` is **only** needed inside the lazy `globe-background` chunk, which is itself behind `<Suspense>`. The preload is a build-time optimization for *interaction* readiness, not LCP.

[Vite docs](https://vite.dev/guide/performance) note that you can override the module-preload polyfill behavior via `build.modulePreload.resolveDependencies`. Return an array minus the `three` chunk for the entry, and let `usePrefetchHeavyChunks` (which already warms it on first input) keep doing its job.

**Implementation:** see "Copy-paste implementation plan, fix 1" below.

---

### 2. Inline critical CSS + preconnect to jsdelivr ★★★★★

**Estimated LCP delta:** −300 to −500 ms (combined)
**Effort:** 1 hr

The 28 kB gzip CSS file is render-blocking. Until it lands, the browser cannot paint the placeholder, so it cannot satisfy LCP. The critical CSS needed to render the placeholder is small — `body` base, CSS custom properties, `.map-background-placeholder` + its pseudo-element, and the `@keyframes globe-shimmer`. Roughly 1.5–2 kB raw, ~600 bytes gzip-inline.

Inline that subset in a `<style>` block in `index.html`, and keep the full CSS file with a `<link rel="stylesheet" media="print" onload="this.media='all'">` lazy pattern (or just leave it blocking — it's only 28 kB and once critical CSS is inlined, the blocking cost no longer holds up LCP).

Separately, the Geist Pixel `@font-face` points at `cdn.jsdelivr.net` ([index.html:241](../../index.html)). The browser doesn't discover that origin until it parses and matches the `font-family` rule against a text node. Add `<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>` near the top of `<head>` so the TLS handshake happens during HTML parse, not after CSS resolves. Saves ~150–300 ms of TLS setup on a cold connection. [MDN: rel=preconnect](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/rel/preconnect).

Note on the `cssMinify: false` carve-out — that's about LightningCSS / Rolldown's minifier dropping `-webkit-backdrop-filter`, [a known issue](https://github.com/parcel-bundler/lightningcss/issues/537). Inlining critical CSS is orthogonal to that decision; you're just extracting the above-the-fold rules and shipping them in `<style>`. The remaining stylesheet stays unminified.

---

### 3. Static SVG dotted globe inlined in `index.html` ★★★★☆

**Estimated LCP delta:** −1.2 to −2.0s (becomes the LCP at first paint, ~50ms after HTML)
**Effort:** 3–5 hrs

Today, even after fix #1 + #2, the LCP element is still gated on React mounting and rendering the placeholder div. That's ~600 ms of TBT on mid-tier Android with React 19's StrictMode + hydration cost.

If you inline a static SVG dotted globe directly in the body of `index.html` — sized to fill the viewport, the same colors as `.map-background-placeholder`, with `aria-hidden="true"` — then **the LCP fires the moment HTML parses**, before React even boots. The SVG becomes the LCP candidate. React then renders on top of it; the SVG sits at `z-index: 0` and `position: fixed`, gets `display: none` once the canvas is mounted (via a tiny `<script>` that listens for a custom event or just hides the element after a setTimeout).

[Generating the SVG]: pre-render once at build time using the same `dotted-map` engine (or read a precomputed `<svg>` from `public/`). 6k dots in SVG is ~150 kB raw, ~20 kB gzip. Inline it in the HTML for zero round-trip.

Trade-offs:
- **Pro:** LCP collapses to FCP, which is already 3.9s — but that includes React boot. With CSS inlined too, FCP could drop to ~1.2s on mobile, and the SVG becomes the LCP candidate at the same moment.
- **Pro:** The SVG is a real preview of what's loading. Better perceived performance than a shimmer.
- **Con:** HTML grows from 17 kB to ~37 kB. Negligible on Vercel's edge.
- **Con:** Mild CLS risk when the canvas replaces the SVG. Mitigate by absolute-positioning both on the same `fixed inset:0` rect and fading the SVG out, not removing it.

Lab tests on similar SPA shells show LCP improvements of [73 → 81 going CSR → SSG with a tiny prerender pipeline](https://www.alikaraki.me/blog/vite-react-ssg-lighthouse). The inline-SVG variant ships the same idea with less infrastructure.

---

### 4. Split `dotted-map` into smaller chunks ★★☆☆☆

**Estimated LCP delta:** ~−50 ms (negligible)
**Effort:** 4–6 hrs (vendoring or patching the package)

`dotted-map-*.js` is 150 kB gzip and *not* on the LCP critical path — it's only imported inside the lazy `globe-background` chunk. Currently it has a `modulepreload`, which costs bandwidth, but fix #1 already addresses that (demote dotted-map from modulepreload too — same reasoning as `three`).

Splitting the package itself would require either vendoring or upstreaming. The [npm package](https://www.npmjs.com/package/dotted-map) is monolithic. Not worth the time before launch.

---

### 5. Build-time prerender (vite-react-ssg or vike) ★★★☆☆

**Estimated LCP delta:** −600 to −1200 ms
**Effort:** 6–10 hrs

[vite-react-ssg](https://npmjs.com/vite-react-ssg) and [@wroud/vite-plugin-ssg](https://www.npmjs.com/package/@wroud/vite-plugin-ssg) both prerender React → static HTML at build time. The HTML ships with the above-the-fold tree already serialized, including the placeholder div. The browser paints it without waiting for React to mount, then React hydrates on top.

Why this is *not* the top recommendation:
- Globestudio's tree relies heavily on `usePersistedState` + `useEffect` + `window` checks. Many of these will throw or hydrate-mismatch when run in Node during SSG. Each one needs an audit.
- React 19 strict hydration is stricter than 18. Mismatch warnings become hard errors in StrictMode in some cases.
- Fix #3 (inline SVG) gets ~80% of the win with 20% of the work and zero hydration risk.

Worth doing in v1.1 for the SEO win on `/looks/:id` routes (each preset becomes a real prerendered HTML page), but not for May 27.

[How to SSG a Vite SPA — Peterbe](https://www.peterbe.com/plog/ssg-vite-spa) is a good reference for the minimal hand-rolled approach if you want to skip the plugin layer.

---

### 6. Vercel 103 Early Hints ★★☆☆☆

**Estimated LCP delta:** −100 to −300 ms (modest, given Vercel TTFB is already ~150ms)
**Effort:** N/A — feature not exposed on Vercel as of May 2026

[Cloudflare ships Early Hints](https://developers.cloudflare.com/workers/examples/103-early-hints/) and [Shopify reports 500ms LCP improvement at p50](https://blog.cloudflare.com/early-hints-on-cloudflare-pages/). However, [Vercel has an open Next.js discussion thread](https://github.com/vercel/next.js/discussions/36089) requesting Early Hints support but no shipped feature as of this writing. You can set a `Link` header in `vercel.json` for preload hints on the final response, but that's not the same thing as 103 — the hints only ship with the 200 response, after TTFB.

[NGINX has 103 support](https://blog.nginx.org/blog/nginx-introduces-support-103-early-hints), but Vercel sits on top of its own edge network. Skip until Vercel ships it.

---

### 7. `fetchpriority="high"` on key assets ★★☆☆☆

**Estimated LCP delta:** −50 to −150 ms
**Effort:** 15 min

Vite's emitted `<link rel="stylesheet">` and `<script type="module">` tags don't get `fetchpriority="high"`. Adding it to the CSS link and the main entry script tells the browser to schedule them ahead of the preloaded modules. [Etsy reported a 4% LCP win from priority hints alone](https://addyosmani.com/blog/fetch-priority/).

This is small in isolation, but stacks on top of #1. Do it as part of the same PR.

---

### 8. Vercel Speed Insights for RUM ★★★★☆

**Effort:** 30 min
**Cost:** Free tier covers small projects

Once you ship, you need to know what real users on real devices see. Lighthouse mobile (4G simulated, Moto G Power class) is a fine model for the bottom half of your audience but not the actual distribution. Vercel Speed Insights captures p50/p75/p95 LCP from real navigations. [Vercel Speed Insights overview](https://vercel.com/docs/speed-insights) — install `@vercel/speed-insights` and add `<SpeedInsights />` to your root. ~3 kB additional JS, deferred, runs after `requestIdleCallback`.

See "Measurement tool recommendation" below for the comparison.

---

## Measurement tool recommendation

| Tool | Strengths | Weaknesses | Free tier | Recommendation for OSS |
| --- | --- | --- | --- | --- |
| **Vercel Speed Insights** | True RUM, p75 CrUX-aligned, zero-config for Vercel deploys, slices by device/route. [docs](https://vercel.com/docs/speed-insights/metrics) | Vercel-only, limited query depth, retention capped on free tier. | Yes — 10k events/mo. | **Use this.** Already on Vercel, free tier fits OSS, takes 30 min to wire up. |
| Lighthouse CI | Catches regressions in PRs, runs in GitHub Actions. | Lab only — no field data. Variance across runs can mask real changes. | Yes — runs on your runners. | Use as a *secondary* check on PRs to catch ≥0.5s regressions. Don't trust absolute numbers. |
| WebPageTest | Deepest waterfall + filmstrip + connection-level diagnostics. | On-demand only, no scheduled monitoring on free tier, no field data. | Yes — limited test count. | Use ad-hoc when investigating a specific regression. Not for continuous monitoring. |
| SpeedCurve / Calibre / DebugBear | Best integrated RUM + synthetic dashboards. | Paid only. Cheapest is $99/mo. | No. | Skip until OSS has funding. |

**Recommended stack:** Vercel Speed Insights for production RUM (free tier, fits OSS budget), Lighthouse CI in GitHub Actions to catch PR regressions ([Vercel + DebugBear integration docs](https://www.debugbear.com/docs/vercel) describes this combination). [PageSpeed Matters 2026 guide](https://www.pagespeedmatters.com/resources/blog/best-speed-testing-tools-bulk-rum-monitoring-2026) ranks Vercel Speed Insights as the only RUM solution in the free tier worth running.

Once Speed Insights is live, add the `web-vitals/attribution` callback for LCP so you also capture the element selector that fires LCP per route — [DebugBear's monitoring guide](https://www.debugbear.com/blog/core-web-vitals-js) covers the integration. That lets you confirm in production whether the placeholder div, the SVG (after fix #3), or the canvas is firing LCP. As of December 2025, [LCP is Baseline Newly Available across all browsers](https://oneuptime.com/blog/post/2026-01-15-track-web-vitals-lcp-fid-cls-react/view), so you get coverage from Safari/Firefox traffic too, not just Chrome.

---

## Copy-paste implementation plan, fix 1 + fix 2

The two highest-ROI fixes in one PR. Both are localized to `index.html` and `vite.config.js`. No runtime app changes.

### Step 1: Demote `three` (and `dotted-map`) from `modulepreload`

Update `vite.config.js`:

```js
// vite.config.js
export default defineConfig({
  // ... existing config ...
  build: {
    cssMinify: false,
    // Drop `three` and `dotted-map` from modulepreload. They're only
    // imported inside the lazy globe-background chunk (behind Suspense),
    // and usePrefetchHeavyChunks already warms them on first input.
    // Preloading them on initial HTML steals bandwidth from the CSS
    // and React entry — both of which gate LCP.
    modulePreload: {
      resolveDependencies: (filename, deps) =>
        deps.filter((dep) => !/(three|dotted-map)-[A-Za-z0-9_-]+\.js$/.test(dep)),
    },
    rollupOptions: { /* ... existing ... */ },
  },
});
```

Reference: [Vite build options — modulePreload](https://vite.dev/config/build-options.html#build-modulepreload).

### Step 2: Inline critical CSS + add preconnect

Update `index.html`, in `<head>`, after the existing `<link rel="manifest">` and before the JSON-LD `<script>`:

```html
<!-- Preconnect: Geist Pixel font ships from jsdelivr. Discovered late
     (only after CSS parses + matches font-family). Preconnecting here
     opens the TLS handshake during HTML parse. Saves ~150-300ms on
     cold mobile connections. -->
<link rel="preconnect" href="https://cdn.jsdelivr.net" crossorigin>

<!-- Critical CSS: minimum styles to paint the .map-background-placeholder
     LCP element before the main stylesheet lands. The full CSS file
     stays linked below. Keeps `cssMinify: false` carve-out intact —
     this is just the above-the-fold subset, extracted by hand. -->
<style>
  :root {
    --bg: #0a0a0a;
    --preview-bg: #0a0a0a;
    --text: #e8e8ea;
    --dim: #aaa;
  }
  html, body { margin: 0; padding: 0; background: var(--bg); color: var(--text); font-family: system-ui, -apple-system, sans-serif; }
  #root { min-height: 100vh; }
  .map-background-placeholder {
    position: fixed;
    inset: 0;
    z-index: 0;
    background:
      radial-gradient(circle at 60% 50%, rgba(120, 140, 200, 0.04) 0%, transparent 38%),
      var(--preview-bg, var(--bg));
  }
  .map-background-placeholder::after {
    content: "";
    position: absolute;
    top: 50%;
    left: 60%;
    width: 22vmin;
    height: 22vmin;
    margin: -11vmin 0 0 -11vmin;
    border-radius: 50%;
    border: 1px solid rgba(255, 255, 255, 0.06);
    background: radial-gradient(circle at 35% 35%, rgba(255, 255, 255, 0.04), transparent 60%);
    animation: globe-shimmer 2.4s ease-in-out infinite;
  }
  @keyframes globe-shimmer { 0%, 100% { opacity: 0.4; } 50% { opacity: 0.8; } }
  @media (prefers-reduced-motion: reduce) {
    .map-background-placeholder::after { animation: none; }
  }
</style>
```

That's the entire fix-1 + fix-2 PR. Total LCP delta estimate: **−700 to −1200 ms**, putting mobile LCP in the **2.8–3.3s range** (still over the 2.5s "good" threshold, but a comfortable launch).

### Optional step 3: also add `fetchpriority="high"` to the CSS link

Vite emits the stylesheet `<link>` tag without `fetchpriority`. You can patch the built HTML in a tiny postbuild script, or use [vite-plugin-html](https://github.com/vbenjs/vite-plugin-html) to inject the attribute. Worth ~50–150ms but only if you have time. Otherwise skip and rely on the CSS-blocking nature to keep priority high implicitly.

---

## What to ship for May 27

1. **Pre-launch (do now):** Fix #1 + Fix #2 in a single PR. ~2 hours. Re-run Lighthouse mobile. Expect LCP in the 2.8–3.3s range, Performance score 85–88.
2. **Launch day:** Install `@vercel/speed-insights`. Add `web-vitals/attribution` for LCP element tracking. Watch p75 mobile LCP in the first 48 hours of real traffic.
3. **v1.1 (post-launch, 1–2 weeks out):** Implement Fix #3 (inline SVG dotted globe in `index.html`) to push p75 LCP under 2.5s on real-world devices. Run a quick A/B by deploying to a preview URL and comparing Speed Insights data over 24h.
4. **v1.2 (when there's runway):** Evaluate Fix #5 (vite-react-ssg) for the SEO win on `/looks/:id` routes. Likely combines well with the Fix #3 inline SVG.

---

## Sources

- [PageSpeed Insights API quota error response](https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=https://globestudio.app&strategy=mobile&category=performance) — rate-limited at fetch time, will need re-run
- [web.dev — Optimize Largest Contentful Paint](https://web.dev/articles/optimize-lcp)
- [web.dev — Largest Contentful Paint (LCP)](https://web.dev/articles/lcp)
- [web.dev — Fetch Priority API](https://web.dev/articles/fetch-priority)
- [Vite — Performance guide](https://vite.dev/guide/performance)
- [Vite — build.modulePreload options](https://vite.dev/config/build-options.html#build-modulepreload)
- [Vite — SSR/SSG guide](https://vite.dev/guide/ssr)
- [Vercel — Speed Insights overview](https://vercel.com/docs/speed-insights)
- [Vercel — Speed Insights metrics](https://vercel.com/docs/speed-insights/metrics)
- [Vercel + DebugBear integration](https://www.debugbear.com/docs/vercel)
- [Next.js discussion #36089 — Early Hints (still open as of 2026)](https://github.com/vercel/next.js/discussions/36089)
- [Cloudflare — Early Hints on Pages](https://blog.cloudflare.com/early-hints-on-cloudflare-pages/)
- [Cloudflare Workers — 103 Early Hints example](https://developers.cloudflare.com/workers/examples/103-early-hints/)
- [Chrome — Faster page loads using server think-time with Early Hints](https://developer.chrome.com/docs/web-platform/early-hints)
- [MDN — `rel=preconnect`](https://developer.mozilla.org/en-US/docs/Web/HTML/Attributes/rel/preconnect)
- [MDN — `fetchpriority`](https://developer.mozilla.org/en-US/docs/Web/HTML/Reference/Attributes/fetchpriority)
- [AddyOsmani — Use fetchpriority=high for the LCP image](https://addyosmani.com/blog/fetch-priority/)
- [DebugBear — Preload your LCP image](https://www.debugbear.com/blog/preload-largest-contentful-paint-image)
- [DebugBear — Monitor Core Web Vitals with web-vitals.js](https://www.debugbear.com/blog/core-web-vitals-js)
- [DebugBear — 103 Early Hints](https://www.debugbear.com/blog/103-early-hints)
- [Medium — Improving Vite + React + Vercel LCP with critical CSS (Nikolina Požega)](https://medium.com/@fadingbeat/how-i-improved-my-websites-lcp-and-seo-with-critical-css-in-vite-react-vercel-257aede4f22c)
- [Ali Karaki — Vite + React Lighthouse win: CSR → SSG (73 → 81) with tiny prerender pipeline](https://www.alikaraki.me/blog/vite-react-ssg-lighthouse)
- [Peterbe — How to SSG a Vite SPA](https://www.peterbe.com/plog/ssg-vite-spa)
- [npm — vite-react-ssg](https://npmjs.com/vite-react-ssg)
- [npm — @wroud/vite-plugin-ssg](https://www.npmjs.com/package/@wroud/vite-plugin-ssg)
- [npm — dotted-map](https://www.npmjs.com/package/dotted-map)
- [LightningCSS issue #537 — `-webkit-backdrop-filter` prefix dropping](https://github.com/parcel-bundler/lightningcss/issues/537)
- [PageSpeed Matters — Best speed testing tools / RUM 2026](https://www.pagespeedmatters.com/resources/blog/best-speed-testing-tools-bulk-rum-monitoring-2026)
- [OneUptime — Track Web Vitals (LCP/FID/CLS) in React (2026)](https://oneuptime.com/blog/post/2026-01-15-track-web-vitals-lcp-fid-cls-react/view)
- Build-artifact inspection: [`dist/index.html`](../../dist/index.html), [`dist/assets/*`](../../dist/assets/), [`src/App.jsx`](../../src/App.jsx), [`src/styles.css`](../../src/styles.css), [`src/hooks/use-prefetch-heavy-chunks.js`](../../src/hooks/use-prefetch-heavy-chunks.js), [`vite.config.js`](../../vite.config.js)
