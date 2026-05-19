# Growth rollout plan

**Status:** Draft
**Date opened:** 19 May 2026
**Owner:** Alejandro
**Research basis:**
- [`docs/research/2026-05-community-building.md`](../research/2026-05-community-building.md)
- [`docs/research/2026-05-examples-directory.md`](../research/2026-05-examples-directory.md)
- [`docs/research/2026-05-funding-sponsorship.md`](../research/2026-05-funding-sponsorship.md)
- [`docs/research/2026-05-designer-use-cases.md`](../research/2026-05-designer-use-cases.md)

## Goal

Build the post-launch community + content surface that sustains
Worlddots momentum past the initial Product Hunt / HN wave.
Three intertwined surfaces: **community** (GitHub Discussions,
later Discord), **examples** (production-quality use cases),
**funding** (GitHub Sponsors for signal + voluntary support).

## Non-goals

- **No Discord yet.** Empty Discord = abandoned signal.
- **No paid asset packs in v1.** Premature monetization, low
  revenue, high curation overhead.
- **No Open Collective in v1.** Solo maintainer; 10% fee not worth
  it.
- **No agency outreach.** Worlddots is designer-tool, not enterprise.

## Phases

---

### Phase 1 — GitHub Discussions setup (~30 min)

#### Tasks

- [ ] Enable Discussions on the repo (Settings → Features).
- [ ] Create 5 categories: Announcements, Ideas, Q&A, Show and Tell,
      Polls.
- [ ] Pin 5 seed discussions:
      - "Welcome — what are you using Worlddots for?"
      - "Roadmap discussion — what would unlock more use cases?"
      - "Help needed: testing on different hardware"
      - "Show your favorite preset + custom shape"
      - "Q&A: common questions"
- [ ] Add Discussions link to README + app footer (next to GitHub
      icon, bottom-right).

#### Acceptance

- Discussions tab visible on repo with 5 categories.
- 5 seed threads pinned.
- App footer links to Discussions.

---

### Phase 2 — GitHub Sponsors setup (~30 min)

#### Tasks

- [ ] Enable GitHub Sponsors in account settings.
- [ ] Set up 4 tiers ($3 / $10 / $25 / $100) with modest rewards.
- [ ] Create `.github/FUNDING.yml`:
      ```yaml
      github: alevizio
      ```
- [ ] Create `SPONSORS.md` (empty placeholder for now).
- [ ] Add ❤ Sponsor link to app footer next to GitHub.

#### Acceptance

- Sponsor button visible on repo.
- FUNDING.yml drives the button.
- App footer links to Sponsors.

---

### Phase 3 — 6 hand-built examples (~6 hours)

#### Tasks

For each of: landing-hero, conference-badge, annual-report-cover,
animated-reveal, country-highlight, embed-snippet —

- [ ] Configure Worlddots to produce a production-quality output.
- [ ] Capture screenshot at 1024px+ resolution.
- [ ] Write 100-word `README.md` explaining the use case +
      what each setting was tuned to.
- [ ] Save `config.json` (the export-config from the app).
- [ ] For `embed-snippet`, include a runnable `index.html`.

Then:

- [ ] Update `examples/README.md` index linking to all 6.
- [ ] Feature 3 examples in main `README.md` "What can you make"
      section.
- [ ] Link to relevant `/looks/:id` preset URL from each example.

#### Acceptance

- 6 examples in `examples/`, each with screenshot + README +
  config.
- Main README's "What can you make" section showcases 3.

---

### Phase 4 — Twitter cadence + content ratio (ongoing)

#### Tasks

- [ ] Schedule 2 posts/week:
      - One design showcase (preset of the week, user work, etc.)
      - One technical/community update (recent commits, roadmap,
        discussion highlight)
- [ ] Cross-link examples + presets in tweets.
- [ ] Use a free scheduling tool (Buffer free tier, Hypefury).

#### Acceptance

- Sustained 2 posts/week for 12 weeks post-launch.
- Cross-posts drive at least 10% of total worlddots.app traffic
  by week 12 (measurable via Vercel Analytics referrers).

---

### Phase 5 (gated) — Open the Discord (~2 hours setup)

Gated on Discussions reaching ~3 unsolicited "I love this" threads
per week, OR 500+ GitHub stars.

#### Tasks (gated)

- [ ] Create Worlddots Discord server.
- [ ] Channels: #welcome, #showcase, #ideas, #bugs, #general,
      #shaders, #integrations.
- [ ] Set up basic moderation (verified email, slow-mode in
      #general).
- [ ] Cross-link from app footer + README.
- [ ] Announce in next Twitter cadence.

#### Acceptance

- Discord linked from app + README.
- 10+ joined members within first week of announcing.

---

### Phase 6 (long-term) — Community examples submissions

Once 6 hand-built examples land + at least one organic user-submitted
piece exists, open community submissions.

#### Tasks (long-term)

- [ ] Create `examples/community/` subfolder.
- [ ] Write a `CONTRIBUTING-EXAMPLES.md` with submission template
      (screenshot ≥1024px, license attribution, config.json
      required).
- [ ] Add a Show & Tell category-bound flow that surfaces examples
      worth promoting.
- [ ] Quarterly: highlight top 3 community examples in main README
      + on Twitter.

#### Acceptance

- 10+ community-submitted examples within 6 months.
- Submission template doc clear enough that submissions don't
  bottleneck on review.

---

## Status log

- **2026-05-19** — Plan drafted. No code yet.
