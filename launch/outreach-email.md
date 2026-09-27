# Outreach email: template + recipient list

Email outreach is a force multiplier if you're targeted. **Send 10-15
personalized emails, not 100 mass blasts.** The mass blasts have a 0.5%
response rate and burn your reputation. The 10-15 personalized ones have a
20-40% response rate.

Send them on Wed 30 Sep, after the flip, so every link lands on the live app
(see the schedule in [`../LAUNCH.md`](../LAUNCH.md#schedule)). This file is
for press and communities only. The waitlist gets exactly one email, on
Product Hunt day; its text is in
[`../LAUNCH.md`](../LAUNCH.md#waitlist-one-email).

---

## Email template

Replace anything in `{curly braces}`. Keep the email under 200 words;
people skim.

```text
Subject: Globestudio: open-source dotted maps and 3D globes

Hi {Name},

I built Globestudio, a free, open-source tool for dotted maps and animated 3D globes. It went live this week, and it launches on Product Hunt on Thursday 1 October.

{ONE-SENTENCE PERSONAL HOOK, see the hooks library below}

What it does:
• Maps of the world, a continent, a country or a US state
• 12 dot shapes, plus your own SVG or PNG
• Gradients with per-stop opacity
• 21 looks built on 24 WebGL shader effects (halftone, riso, aurora, CRT, glitch, vapor, contour lines…)
• Your own data plotted as markers and arcs
• Exports: PNG up to 4x, SVG, WebM, MP4, GIF, JSON config, and live embeds
• MIT licensed, runs in the browser, no accounts

Live: https://globestudio.app
GitHub: https://github.com/alevizio/globestudio
Press kit (logo, share cards for all 21 looks, palette): https://globestudio.app/brand
Short demo: {link to a 20 s screen recording}

If this feels relevant for {their publication or audience}, I'd be grateful for a mention or a share. Happy to send assets, screenshots or a quote.

Either way, thanks for {the thing you genuinely appreciate about their work: specific, not flattery}.

Alejandro
{your email}
```

---

## Personal hooks library

Pick the closest one for each recipient; don't reuse the same hook across
multiple emails.

| Hook context | Sample sentence |
|---|---|
| They cover design tools | "It's an open-source, designer-first take on map styling, built for the deck slide rather than the GIS pipeline." |
| They cover dev tools | "It's a small case study in shared WebGL and SVG render math: the dot gradient uses the same function in both paths, so a gradient reads the same in the PNG and the SVG." |
| They cover open source | "It's MIT licensed with no accounts and cookieless, opt-out-friendly analytics, and the contribution docs make presets and examples first-class alongside code." |
| They run a design newsletter | "I think your readers will recognize the gap: you need a stylized map for a hero shot, and every library you reach for is built for a different job." |
| They run a dev newsletter | "It's React and Three.js: one InstancedMesh for every dot, a flat to globe morph that re-bakes instance matrices in chunks, adaptive DPR, and 24 post-processing shaders." |
| They make videos / motion content | "The WebM, MP4 and GIF exports were built for the kind of background loops you'd use in a launch teaser or a stream graphic." |
| They review brand systems | "It gives brand systems a consistent dotted globe or country mark, with gradients and per-stop opacity, exported as SVG or PNG." |

---

## Recipient shortlist

Each entry: who, why they'd care, the link to find their pitch form / email,
and a personalization note. **Personalize at least the first line**; they
can tell when it's a copy-paste.

### Design newsletters

| Outlet | Why they fit | Submit / contact |
|---|---|---|
| **Sidebar.io** | Daily design links curated by Sacha Greif. Open-source design tools fit well. | https://sidebar.io/submit |
| **Smashing Magazine: Smashing Newsletter** | Cory Schmitz / Vitaly Friedman. They feature small tools in their weekly. | hello@smashingmagazine.com, subject `Smashing Newsletter submission` |
| **CSS-Tricks** (now Codrops + CodePen orbit) | Less newsroom-y now, but Codrops blog still picks up creative-coding tools. | https://tympanus.net/codrops/contact/ |

### Dev newsletters

| Outlet | Why they fit | Submit / contact |
|---|---|---|
| **Bytes** (Tyler McGinnis) | JS-focused weekly, ~150K subs. Loves three.js + open source. | bytes@ui.dev |
| **JavaScript Weekly** | Peter Cooper. Covers JS libraries + tools. | https://cooperpress.com/contact/ |
| **Frontend Focus** | Same shop as JS Weekly, broader frontend focus. | https://cooperpress.com/contact/ |
| **Mobile Dev Weekly** | Less direct fit but if the mobile Safari perf is good, they list cross-platform web tools. | https://cooperpress.com/contact/ |

### Three.js / creative coding communities

| Outlet | Why they fit | Submit / contact |
|---|---|---|
| **three.js discourse: Showcase category** | Official three.js community. Posts that show technique get pinned. | https://discourse.threejs.org/c/showcase/ |
| **Codrops collective** | Featured links section for creative-coding tools. | https://tympanus.net/codrops/contact/ |
| **Awwwards: Tools** | Self-submit. Approval is curated. | https://www.awwwards.com/websites/tools/ |
| **OpenProcessing** | Creative coding community, more sketch-y but adjacent. | https://openprocessing.org/ |
| **Tiny Helpers** | Stefan Judis's curated list of small web dev tools. | https://github.com/stefanjudis/tiny-helpers (PR) |

### Design Twitter influencers (low effort, high signal)

You don't email these; you @ them on launch day with a personalized take.
Pick 3-5 you actually follow and engage with their work first.

| Handle | Why mention them | Genuine engagement hook |
|---|---|---|
| **@steveschoger** | Refactoring UI, Tailwind. Has shared open-source design tools before. | If your panel UX is genuinely good, he'll notice. Mention you took the Refactoring UI design principles to heart. |
| **@rauchg** | Vercel CEO, design-coded. Shares interesting indie tools. | Globestudio is hosted on Vercel; mention that, and frame it as the open-source, designer-first angle. |
| **@yangshunz** | Has written GreatFrontEnd. Notices solid frontend work. | Frame as "React + Three.js + open source." |
| **@bfischer** | Brian Lovin (formerly GitHub + Linear). Design-coded. | Frame as designer-developer tool, mention the keyboard system. |
| **@codrops** | The Codrops account. Active on X with creative-coding finds. | Just tag in the launch tweet. |

### People to NOT spam

- Anyone you've never interacted with who has a personal email
- People who said "no" or didn't reply last time you asked something
- Anyone whose newsletter is paid (their inbox is already saturated with paid pitches)

### Designer / community Slacks + Discords

These are softer touches: drop a link in the channel, don't DM:

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

> Thanks! Here's a one-paragraph blurb and three screenshots if they're useful
> for the post. If you want a quote, ping me; happy to write one to your
> length.
> [attach: blurb.txt + 3 PNGs]

**"Send me more info" →**

> Sure. Here's:
> • A 90-second demo: {link}
> • The press kit: https://globestudio.app/brand
> • Direct line: {your phone or Calendly} if it's easier to talk
> What angle is most useful for you?

**"Not a fit for us right now" →**

> Got it, thanks for the quick reply. If anything on the roadmap (animation
> timelines, multi-stop gradients, per-country fill) becomes a fit later,
> I'll circle back. Otherwise no pressure.

**No response →**

> One follow-up after 5 business days, max:
>
> "Quick bump. If it's not a fit, no need to reply and I'll cross you off.
> Otherwise here's the demo: {link}."

---

## Press kit

The `/brand` route on globestudio.app already serves the press kit:

- **DottedGlobe logo** (SVG, dark + light card preview, download link)
- **OG cards for all 21 looks** (1200×630, downloadable per preset)
- **Five-swatch palette** with hex codes tied to the design tokens
- **Four taglines** at varying lengths
- **Contact links** (GitHub, X, alevizio.com)

Live: https://globestudio.app/brand

To send to journalists who want assets, just link `/brand`. Anything they
need that's not there, ping me and I'll add it. Still owe before the emails
go out on Wed 30 Sep:

- [ ] 1 short demo video (20 to 30 s), recorded on Tue 29 Sep with QuickTime +
      ffmpeg compression (see the product-hunt.md gallery plan for the
      ffmpeg command)
- [ ] Founder photo + bio (3 sentences); maybe add to /brand if it
      becomes a frequent ask
