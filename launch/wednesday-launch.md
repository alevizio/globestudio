# Wednesday relaunch — day-of checklist

A focused checklist for the **Wednesday, May 27 2026** push — also the
**Globestudio rebrand launch**. The original launch already ran under
the name *worlddots* (see [`README.md`](./README.md) for the from-scratch
playbook); this is a **wave-2 push** that doubles as a rename milestone.

**Why Wed May 27 specifically**: it's the peak engagement day for 4 of
the 5 top channels simultaneously (LinkedIn #1, X 9am PT peak, HN prime,
PH sweet spot). Friday loses PH's daily newsletter + weekly badge
eligibility. June 1+ is contaminated by WWDC pre-buzz (Apple keynote
June 8). Wed of a post-Memorial-Day short week is a competitive
arbitrage — full audience, fewer launches.

What changed since v1:
17 shader looks (up from 11), embed route, Framer reference component,
custom GeoJSON, rivers + cities overlays, WCAG 2.2 AA conformance,
fully-designed OG share cards, French country search — **and** the
project is now called Globestudio. The name is the story.

The rebrand narrative — "we outgrew worlddots, meet Globestudio" — frames
the second swing as a milestone, not a course-correction. People who
scrolled past last time now have *two* reasons to look again.

---

## 7-day pre-launch (Wed May 20 → Tue May 26)

### QA pass — half a day

- [ ] **Hit every preset URL on a real device.** Open each of the 17
      `/looks/:id` URLs on:
      - macOS Safari (latest)
      - macOS Chrome
      - iPhone Safari (real device, not simulator)
      - Android Chrome (Samsung phone if you can find one)
      Confirm each preset's distinct visual lands. Note any that look
      different from the OG card preview.
- [ ] **Test reduced-motion.** macOS → System Settings → Accessibility
      → Display → Reduce Motion. Reload `/looks/aurora` and confirm the
      aurora bands hold still + autoSpin pauses.
- [ ] **Keyboard-only walk-through.** Tab from the top of the page →
      verify skip link reveals → reach canvas → press `?` for shortcuts
      → press `S` to shuffle → press `D` for export modal → Escape to
      close → Tab cycles inside modals → Tab exits the modal back to
      where you were.
- [ ] **Color picker arrow keys.** Open the dotColor swatch → Tab into
      the SV square → arrow keys + Shift+Arrow + Home/End should move
      the cursor live. (If broken, blocks WCAG 2.5.7.)
- [ ] **Share preview check.** Slack-DM yourself `globestudio.app/looks/halftone`
      and a few other preset URLs. Confirm the new 1200×630 OG cards
      render. Try iMessage too — different cache, sometimes catches
      bugs Slack misses.
- [ ] **Embed route in Webflow.** Spin up a free Webflow project
      (or Codepen) and paste the embed snippet from
      [`docs/integrations/webflow.md`](../docs/integrations/webflow.md).
      Confirm the iframe renders and the resize protocol works.
- [ ] **Framer reference component.** Open Framer, create a code
      component, paste
      [`examples/framer-component/GlobestudioGlobe.tsx`](../examples/framer-component/GlobestudioGlobe.tsx),
      drag onto a frame, verify the property controls show up.
- [ ] **Run `npm test`** — confirm 125+ tests pass including the
      axe-core a11y guard.
- [ ] **Run `npm run build`** — confirm clean build, no warnings.
- [ ] **Lighthouse audit** on `globestudio.app` — note Performance,
      Accessibility, Best Practices, SEO scores. Don't fix anything
      below 90 unless it's a hard fail.

### GitHub housekeeping

- [ ] **Enable Discussions.** Settings → Features → ✓ Discussions.
      Create categories: Announcements, Ideas, Q&A, Show & Tell.
- [ ] **Enroll in GitHub Sponsors.** Account settings → Sponsors. Set
      up 4 tiers ($3 / $10 / $25 / $100). FUNDING.yml is already
      committed.
- [ ] **Pin the repo to your profile.** Profile → Customize your pins
      → check `globestudio`.
- [ ] **Verify topics + description** look right on the repo header.
      (Already updated via `gh repo edit` in commit 5fa700c.)

### Pre-write the launch posts

Use the new preset URLs — each one has a unique 1200×630 OG card now,
so threads with multiple preset links all get visual previews:

- [ ] **X / Twitter thread** (4-6 tweets). Use this structure:
      1. Hook tweet: "globestudio got a big upgrade — dotted maps and
         animated 3D globes, now with 17 looks." + the default OG card.
      2. "New look: Halftone — newspaper print pattern" + link to
         `/looks/halftone` (OG card unfurls).
      3. Same for Risograph, Aurora, Atkinson, Iridescent.
      4. "Embed it anywhere — paste this iframe into Webflow / Framer /
         any HTML page" + the `/embed?look=halftone` URL.
      5. CTA: "Free, open source, MIT. Star + comment if you make
         something with it."
- [ ] **LinkedIn post** (single post, more measured tone). Lead with
      what changed since v1, then the use-cases, then the link.
- [ ] **Mastodon post** (fosstodon.org + mastodon.design — cross-post).
      Tag #OpenSource #DesignTool.
- [ ] **Reddit drafts** (don't post yet). Target subs:
      - `/r/web_design` — emphasize the embed route + Framer/Webflow
      - `/r/javascript` — emphasize Three.js / shader pipeline
      - `/r/InternetIsBeautiful` — pure "look at this cool thing"
- [ ] **Designer News submission draft.** Title + 80-word description.

### Outreach timing — Memorial Day adjusted

Memorial Day (Mon May 25) sits in the middle of the pre-launch window,
which changes the standard T-3 outreach math:

- [ ] **Send outreach emails: Fri May 22** (5 days pre-launch). Lands in
      inbox before the long weekend; people who care will read Tue May 26
      morning and have a couple days to respond before launch.
- [ ] **Do NOT send Tue May 26** — every email sent that day is competing
      with 3 days of accumulated post-holiday inbox. Open rates crater.
- [ ] **Submit to Sidebar.io + Codrops weekly digest: Mon-Tue May 25-26**
      — gives editors time to include you in that week's roundup.

---

## Tuesday May 26 night (T-1)

- [ ] Don't push code. Even one-line fixes.
- [ ] Sleep early.
- [ ] Charge a backup laptop in case the primary acts up.
- [ ] Make sure `vercel deploy --prod` works from the backup laptop too
      (verify `.vercel/` link exists or re-link).
- [ ] Memorial Day was Mon May 25 — confirm no holiday-related disruption
      to your scheduler / Slack / email setup.

---

## Wednesday May 27 — launch run-of-show (all times PT)

| Time | Channel | Action |
|---|---|---|
| **7:00am** | Coffee + final check | Open `globestudio.app` on phone — confirm it loads. Check Vercel dashboard for any overnight errors. |
| **7:15am** | X / Twitter | Post the thread. Pin tweet 1. |
| **8:00am** | LinkedIn | Post the LinkedIn variant. |
| **8:30am** | Mastodon | Cross-post on fosstodon.org + mastodon.design. |
| **9:00am** | Designer News | Submit. Comment on submission with maker's note. |
| **9:30am** | Sidebar.io | Submit (no guarantee of selection, but free). |
| **10:00am** | Codrops weekly | Submit via their digest form. |
| **10:30am** | First comments wave | Reply to anyone who's responded to your posts. Be quick — first-hour responsiveness drives algorithm. |
| **11:00am** | Personal outreach | Email 5-10 people you actually know in design. Personal note, no template. |
| **12:30pm** | Lunch break | Step away from screen for 30 min. Algorithms keep running. |
| **1:00pm** | Reddit /r/web_design | Post. Title: "I made a dotted-map generator with shader effects + iframe embed". |
| **2:30pm** | Inbox / DMs | Reply to anyone who reached out. |
| **3:30pm** | Reddit /r/InternetIsBeautiful | Post if /r/web_design did well. Otherwise wait. |
| **4:30pm** | Status update | Post a "first day update" with a screenshot of GitHub stars + a thank-you. |
| **6:00pm** | Wrap up | Don't post anywhere new after 6pm. Reply to comments only. |
| **Evening** | Watch the dashboard | Vercel Analytics, GitHub Insights → Traffic. Note which sources drove most clicks. |

---

## What to monitor on launch day

Open these tabs at 7am and leave them open:

1. **Vercel Analytics** — `vercel.com/alevizio/globestudio/analytics`. Watch
   for traffic spikes, top referrers, conversion-equivalent metrics.
2. **GitHub Insights → Traffic** — `github.com/alevizio/globestudio/graphs/traffic`.
   Updates every ~2 hours. Watch for spikes after each post.
3. **GitHub stars** — refresh the repo page periodically. Don't obsess.
4. **The deployed site itself** — `globestudio.app`. Refresh once
   an hour to verify it's serving. Save the URL of `globestudio.app/api/...`
   somewhere visible for quick error checking.
5. **Twitter / LinkedIn notifications** — reply within 10 minutes when
   possible.
6. **GitHub Issues + Discussions** — anyone who files something gets
   acknowledged within the hour.

---

## Common issues — prepared responses

- **"Why not D3?"** — D3 is a great primitive. Globestudio is the curated
  motion-design layer on top — preset aesthetics, shader effects, easy
  embed. Not competing.
- **"Won't this break on Safari?"** — WCAG 2.2 AA conformant, tested on
  iOS Safari 15.4+, Android Chrome, Samsung Internet, desktop Firefox.
  Falls back gracefully when WebGL 2 is missing.
- **"It's just an iframe?"** — `/embed` is iframe-friendly because that's
  the universal embed contract. The core is React + Three.js — fork it,
  swap the panel out, build your own version. MIT.
- **"How do I get my own data in?"** — Custom GeoJSON paste (Solid mode
  → Custom data → paste a FeatureCollection). Supports LineString,
  MultiLineString, Point, MultiPoint.
- **"What about animations?"** — WebM export records the live state.
  Or use the embed route in a video host. Or animate via OBS / ScreenStudio.

---

## First 7 days — sustaining the wave

- **Daily**: respond to comments + GitHub Issues within 4 hours during
  US working hours. Post-launch attention drops fast; first-week
  responsiveness builds reputation.
- **Day 2**: Submit to one more channel. Awesome-three-js or
  awesome-design-tools PR.
- **Day 3**: Post a "what we learned" tweet — what people asked, what
  they made.
- **Day 4-5**: Reply to any pull requests, even speculative.
- **Day 7**: Post a "one week later" thread — stars, traffic, what's
  next. Use the data from Vercel + GitHub traffic insights.

---

## Reference

- Full launch playbook (T-7, T-3, T-1 days): [`./README.md`](./README.md)
- Product Hunt draft (if you do PH this round): [`./product-hunt.md`](./product-hunt.md)
- Show HN draft + responses: [`./show-hn.md`](./show-hn.md)
- Social thread drafts: [`./social-threads.md`](./social-threads.md)
- Outreach email template + list: [`./outreach-email.md`](./outreach-email.md)
- Per-tool integration guides for sharing: [`../docs/integrations/`](../docs/integrations/)
- What's new since v1 (commit log highlights):
  `git log --oneline 5fa700c..HEAD`
