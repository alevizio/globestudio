# Outreach email — template + recipient list

Email outreach is a force multiplier if you're targeted. **Send 10-15
personalized emails, not 100 mass blasts.** The mass blasts have a 0.5%
response rate and burn your reputation. The 10-15 personalized ones have a
20-40% response rate.

Send 48-72 hours before launch day. Anything closer than that and people
won't have time to look at it.

---

## Email template

Replace anything in `{curly braces}`. Keep the email under 200 words —
people skim.

```text
Subject: Globestudio (was worlddots) — open-source dotted maps + 3D globes

Hi {Name},

I'm relaunching the project formerly known as *worlddots* under a new name:
**Globestudio**. Open-source tool for dotted maps and animated 3D globes
— it outgrew the old name when I shipped 17 shader looks, a 3D globe,
and an embed route since v1. Launching next {weekday}.

{ONE-SENTENCE PERSONAL HOOK — see hooks library below}

What it does:
• Maps for any country, region, or US state
• 12 dot shapes (plus custom SVG/PNG upload)
• Linear gradients with per-stop opacity
• Shader effects (bloom, chromatic, CRT, glitch, halftone…)
• Real exports: PNG (high-res), SVG, WebM video
• MIT-licensed, runs client-side, no accounts

Live: https://globestudio.app
GitHub: https://github.com/alevizio/globestudio
Short demo: {link to a 20s screen recording on Vimeo / YouTube / X}

If this feels relevant for {their publication / their audience}, I'd be
grateful for a mention or a share. Happy to send assets, screenshots, or a
quote.

Either way, thanks for {the thing you genuinely appreciate about their work
— specific, not flattery}.

— Alejandro
{your email}
```

---

## Personal hooks library

Pick the closest one for each recipient — don't reuse the same hook across
multiple emails.

| Hook context | Sample sentence |
|---|---|
| They cover design tools | "It's the open-source designer-first take on something like Mapbox's Studio — built for the deck slide, not the GIS pipeline." |
| They cover dev tools | "It's an interesting case study in shared WebGL/SVG render math — the gradient sampler runs identically in both paths so PNG and SVG agree pixel-for-pixel." |
| They cover open source | "MIT-licensed, no backend, no telemetry, and the contribution docs make presets and examples first-class alongside code." |
| They run a design newsletter | "I think your readers will recognize the gap — when you need a stylized map for a hero shot but every library you reach for is over-engineered for the job." |
| They run a dev newsletter | "Built with React + Three.js. The render pipeline has adaptive DPR, per-instance shader uniforms for opacity gradients, and a custom Canvas2D gradient sampler that mirrors the WebGL one for SVG export." |
| They make videos / motion content | "The WebM export was built for exactly the kind of background loops you'd use in a launch teaser or a podcast/stream graphic." |
| They review brand systems | "We added per-country fill with gradient + alpha specifically for brand systems that want a stylized regional emphasis without a third-party design tool." |

---

## Recipient shortlist

Each entry: who, why they'd care, the link to find their pitch form / email,
and a personalization note. **Personalize at least the first line** — they
can tell when it's a copy-paste.

### Design newsletters

| Outlet | Why they fit | Submit / contact |
|---|---|---|
| **Sidebar.io** | Daily design links curated by Sacha Greif. Open-source design tools fit well. | https://sidebar.io/submit |
| **Smashing Magazine — Smashing Newsletter** | Cory Schmitz / Vitaly Friedman. They feature small tools in their weekly. | hello@smashingmagazine.com — subject `Smashing Newsletter submission` |
| **CSS-Tricks** (now Codrops + CodePen orbit) | Less newsroom-y now, but Codrops blog still picks up creative-coding tools. | https://tympanus.net/codrops/contact/ |
| **Designer News** | Self-submit your own work. | https://www.designernews.co/ (logged in, submit story) |
| **Sidebar archive** has a /submit form — keep it short. | | |

### Dev newsletters

| Outlet | Why they fit | Submit / contact |
|---|---|---|
| **Bytes** (Tyler McGinnis) | JS-focused weekly, ~150K subs. Loves three.js + open source. | bytes@ui.dev |
| **JavaScript Weekly** | Peter Cooper. Covers JS libraries + tools. | https://cooperpress.com/contact/ |
| **Frontend Focus** | Same shop as JS Weekly, broader frontend focus. | https://cooperpress.com/contact/ |
| **Mobile Dev Weekly** | Less direct fit but if the mobile Safari perf is good, they list cross-platform web tools. | https://cooperpress.com/contact/ |
| **Console.dev** | Curated developer tools weekly. Specifically loves open source. | https://console.dev/submit-a-tool/ |

### Three.js / creative coding communities

| Outlet | Why they fit | Submit / contact |
|---|---|---|
| **three.js discourse — Showcase category** | Official three.js community. Posts that show technique get pinned. | https://discourse.threejs.org/c/showcase/ |
| **Codrops collective** | Featured links section for creative-coding tools. | https://tympanus.net/codrops/contact/ |
| **Awwwards — Tools and Resources** | Self-submit. Approval is curated. | https://www.awwwards.com/sites_of_the_day/ — they have a tools sub-section |
| **OpenProcessing** | Creative coding community, more sketch-y but adjacent. | https://openprocessing.org/ |
| **Tiny Helpers** | Stefan Judis's curated list of small web dev tools. | https://github.com/stefanjudis/tiny-helpers (PR) |

### Design Twitter influencers (low effort, high signal)

You don't email these — you @ them on launch day with a personalized take.
Pick 3-5 you actually follow and engage with their work first.

| Handle | Why mention them | Genuine engagement hook |
|---|---|---|
| **@steveschoger** | Refactoring UI, Tailwind. Has shared open-source design tools before. | If your panel UX is genuinely good, he'll notice. Mention you took the Refactoring UI design principles to heart. |
| **@rauchg** | Vercel CEO, design-coded. Shares interesting indie tools. | Mention if you used Next.js or Vercel hosting (you don't — skip if not). Otherwise frame as "open-source designer-first" angle. |
| **@yangshunz** | Has written GreatFrontEnd. Notices solid frontend work. | Frame as "React + Three.js + open source." |
| **@bfischer** | Brian Lovin (formerly GitHub + Linear). Design-coded. | Frame as designer-developer tool, mention the keyboard system. |
| **@codrops** | The Codrops account. Active on X with creative-coding finds. | Just tag in the launch tweet. |

### People to NOT spam

- Anyone you've never interacted with who has a personal email
- People who said "no" or didn't reply last time you asked something
- Anyone whose newsletter is paid (their inbox is already saturated with paid pitches)

### Designer / community Slacks + Discords

These are softer touches — drop a link in the channel, don't DM:

- **Design Tools Slack** (designtools.io)
- **Brand New Slack** (Under Consideration's community)
- **Three.js Discord** (#showcase channel)
- **r/web_design Discord**

---

## Tracking

Make a spreadsheet:

```
| Outlet | Person | Date sent | Response? | Coverage URL | Notes |
|---|---|---|---|---|---|
```

Don't follow up more than once. If they didn't respond in a week, they're
not going to. Move on. The two best signals of future coverage are:

1. They've featured something similar in the last 90 days
2. They responded to a previous email of yours (positive or negative)

---

## Reply playbook

When someone responds:

**"This looks cool, I'll share it" →**

> Thanks! Here's a 1-paragraph blurb and three screenshots if useful for the
> post. If you want a quote, ping me — happy to write one to your length.
> [attach: blurb.txt + 3 PNGs]

**"Send me more info" →**

> Sure. Here's:
> – A 90-second demo: {link}
> – The press kit: {link to /press on the site or a Notion page}
> – Direct line: {your phone or Calendly} if it's easier to talk
> What angle is most useful for you?

**"Not a fit for us right now" →**

> Got it — thanks for the quick reply. If anything in our roadmap (animation
> timelines, embeddable mode, data binding) becomes a fit later, I'll
> circle back. Otherwise no pressure.

**No response →**

> One follow-up after 5 business days, max:
>
> "Quick bump — sending {launch date} regardless. If it's not a fit no
> need to reply, I'll cross you off. Otherwise here's the demo {link}."

---

## Press kit (build this on a /press page or Notion link)

Have it ready before you send the first email.

- Logo + wordmark (PNG + SVG, on dark and light)
- 5 hero screenshots at 1920×1080
- 1 short demo video (20-30s) + 1 long demo (60-90s)
- One-paragraph description, one-sentence description, one-word category
- Founder photo + bio (3 sentences)
- A direct contact email
