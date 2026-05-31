# Globestudio — Launch Playbook

> GTM, SEO, and ready-to-paste copy for the public launch. Companion to
> [STRATEGY.md](STRATEGY.md). Derived from 2026 launch/SEO research. Pre-launch
> state: a coming-soon teaser (gated by `VITE_TEASER`) is collecting an email
> waitlist; launch = delete the env var + run the plan below.

## Positioning

> **Globestudio is the no-code shader-lab for maps — it turns the Stripe/GitHub
> dot-globe aesthetic into an exportable, embeddable asset, without writing
> Three.js, opening After Effects, or signing up.**

Value props: (1) the look, without the build; (2) real, clean exports
(PNG/SVG/WebM/MP4/GIF + embeds); (3) lives where you work (React component, web
component, Figma plugin, MCP server) — open source, MIT, no signup.

"Isn't this just cobe?" → cobe is a 5 KB lib for devs who write code.
Globestudio is the layer above: a no-code studio where you *design* the look and
*export* it (or grab a component/plugin/MCP). cobe gives a canvas; Globestudio
gives a deliverable.

## GTM — channel plan (ranked)

Solo-maker reality: one anchor launch on each of HN + PH, plus 3–4 secondary
channels across the week. Don't work all channels at once.

| Rank | Channel | Why | Angle | Gotcha |
|---|---|---|---|---|
| 1 | **Show HN** | Highest ROI for the OSS/dev side; front page = thousands of devs + most launch-week stars | OSS + npm + MCP + "MIT, no signup, runs in browser". **No "Stripe globe" framing** | Zero popups/email-gates on the live app; no superlatives; reply as a human |
| 2 | **Product Hunt** | Best for designers + waitlist conversion; top-3 = 1–3k visits | "Stripe/GitHub dot-globe, free + no-code + exportable"; lead with a looping WebM | Reward is comments/time-on-page (2026); never beg upvotes |
| 3 | **Figma Community plugin** | Evergreen designer discovery | the plugin *is* the pitch | submit to review 1–2 wks before launch |
| 4 | **Twitter/X** | Owned momentum; connective tissue | post the *output* (10s record: generate → export); link in reply | links get throttled — video in-tweet |
| 5 | **r/SideProject** | friendly, self-promo OK | maker story | engage with others too |
| 6 | **r/threejs** | exact niche, good feedback/stars | technical (instancing, packages) | must be substantive |
| 7 | **three.js forum / Showcase** | can get picked for the three.js homepage | live demo + technique write-up | mod approval, not an ad |
| 8 | **r/InternetIsBeautiful / r/web_design** | r/IIB can spike if it lands | link to a beautiful live globe, no signup | r/IIB fussy; **skip r/graphic_design** (anti-promo) |
| 9–13 | dev.to (canonical→own blog), Indie Hackers, Lobsters (`authored` tag), Designer News, Discords (only where you're a member) | long-tail / community | story/tutorial framing | Discord cold-drops backfire |

## GTM — launch week (anchor: Tue Show HN, Thu Product Hunt)

- **T-14→T-7:** submit Figma plugin to review; kill all popups/gates on the
  cold-visitor path; prep PH assets (looping WebM, gallery, copy), HN
  title/first-comment, X thread + demo video; write warmup + launch emails;
  line up 20–50 first-hour PH supporters.
- **T-7→T-2:** warmup email #1 (a beautiful export), #2 (Figma plugin live);
  build-in-public teasers on X.
- **Mon:** soft prime — r/SideProject; "launching this week" tweet.
- **Tue — SHOW HN (anchor 1):** post ~14:00–15:00 UTC; thoughtful first comment
  (backstory + honest limits); reply for 4–6 h; tweet once it has traction;
  cross-post a *technical* version to r/threejs.
- **Wed — spread:** three.js Showcase; dev.to "how I built it" (canonical → own
  blog); Indie Hackers. **No PH today.**
- **Thu — PRODUCT HUNT (anchor 2):** 00:01 PST (09:01 CEST); send launch email
  to waitlist immediately; trigger first-hour supporters to *comment*; reply all
  day; X launch thread; "front-paged on HN this week"; r/web_design + r/IIB.
- **Fri:** Lobsters, Designer News, member Discords; PH "we hit #X" follow-up.
- **Wknd:** keep replying; pin feedback to the roadmap; UTM-tag everything for a
  data-driven next launch.

Don't split PH and HN onto the same day — each needs a full day of replies.

## Waitlist → conversion

40–60% of launch-day upvotes come from your own list. Send 1–2 build-in-public
emails before launch (don't go silent then surprise them). Launch-day email:
plain subject, one platform-matched ask ("we're live on PH — a comment about
what you'd build means more than an upvote"), link PH (designers) + repo (devs).

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
- [ ] `/compare/cobe` + `/compare/geolayers` (honest tables; clean HTML; FAQ JSON-LD for AI-Overview lift — rich snippets are deprecated but AI still parses it).
- [ ] **Gallery hub-and-spoke**: each `/looks/:id` carries ≥30% unique value (param config table + use-case + related looks) or it triggers the 2026 scaled-content penalty; otherwise `noindex` the thin ones.
- [ ] **Per-look OG images** (1200×630) — WebGL previews don't render in social/AI cards. (Static OG exists at `/og/{look}.png` — wire it per look.)
- [ ] `SoftwareApplication` + `isAccessibleForFree:true` + `offers:{price:0}`; `ImageObject` per look; `BreadcrumbList`.
- [ ] `/embed` `noindex` (thin; competes with canonical pages).
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

### Product Hunt
- **Tagline (≤60):** `The Stripe/GitHub dot-globe — free, no-code, exportable`
- **Description:** Globestudio turns the Stripe/GitHub dot-globe look into an asset you can ship — no Three.js, no After Effects, no signup. Tweak dots, projection, colors, and motion in the browser, then export clean PNG/SVG for stills, WebM/MP4/GIF for the rotating loop, or grab an embed. Need it in your app? Drop in the React component or the web component. Open source (MIT), with an MCP server and a Figma plugin so the globe lives wherever you work.
- **First comment:** the "I just want *that*, as a file" maker story → built a no-code shader-lab; every GIF/MP4 in the gallery was exported from the tool; React/web-component + MCP + Figma; MIT, no account to export; ask "what look are you missing?"
- **Media (order matters — #1 autoplays):** 1) rotating-globe loop (exported by the tool) · 2) the editor with controls open · 3) a 4-preset looks strip · 4) the export menu open · 5) "ships everywhere" split (React/web-component/Figma/MCP) · 6) a dotted flat map.

### Show HN
- **Title:** `Show HN: Globestudio – open-source dotted maps and 3D globes (React/Three.js)`
- **Body:** browser tool for the dotted-map/3D-globe look without Three.js or After Effects; tweak in a live preview, export PNG/SVG/WebM/MP4/GIF or an embed; React component + web component + MCP + Figma plugin; MIT, export without an account; offer to discuss the projection math / capture pipeline. Link: https://globestudio.app

### X thread (6)
1. "You've seen the Stripe globe. The GitHub globe… I made a free tool that exports that look as a file. No Three.js, no After Effects, no signup." [globe loop]
2. "Tweak it in the browser — dots, projection, color, motion — live." [slider GIF]
3. "Exports: PNG/SVG · WebM/MP4/GIF · embed. That clip in post 1? Exported from the tool."
4. "Ships where you work: React · web component · Figma plugin · MCP server."
5. "Open source, MIT. Free, forkable, export without an account."
6. "Try it → globestudio.app — tell me what look you want next."

### Waitlist launch email
- **Subject:** `It's live: make the Stripe globe yourself 🌍`
- **Body:** Globestudio is live. Open the editor, tweak it, export stills (PNG/SVG), the loop (WebM/MP4/GIF), or an embed/React/web-component. No account to export; MIT. Figma plugin + MCP server too. **[Open Globestudio →]**. "We're also live on Product Hunt today — a comment means a lot: [link]." — Alejandro

### LinkedIn
The "dotted globe" became the default tech-brand hero (Stripe/GitHub). Getting it usually means Three.js, After Effects, or a paid render. Globestudio: free, open-source, no-code → export cleanly (PNG/SVG/WebM/MP4/GIF/embed). React component, web component, Figma plugin, MCP server. No signup to export. The look without the shader. → globestudio.app
