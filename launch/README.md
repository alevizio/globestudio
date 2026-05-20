# Launch — prepared assets

Everything you need on launch day, parked. Each file is a fully-drafted
asset; the day-of work is mostly **pasting, sending, and replying to comments**.

## Index

| File | What it is |
|---|---|
| [`product-hunt.md`](./product-hunt.md) | Product Hunt post (title, tagline, description, gallery plan, maker's first comment, topics) |
| [`show-hn.md`](./show-hn.md) | Show HN post (title, body, prepared responses to expected criticism) |
| [`social-threads.md`](./social-threads.md) | X thread, Mastodon post, LinkedIn post, Reddit drafts, Designer News draft |
| [`outreach-email.md`](./outreach-email.md) | Email template + curated recipient list (newsletters, communities) |
| [`labels.sh`](./labels.sh) | Bash script to create the GitHub label set (matches issue templates) |
| [`friday-relaunch.md`](./friday-relaunch.md) | **Wave-2 launch checklist** — pre-flight QA, run-of-show, monitoring, prepared responses |

The example projects referenced in social/outreach copy live in [`../examples/`](../examples/).

---

## Pre-launch — T-7 days

- [ ] Pick the launch date (Tuesday or Wednesday, avoid US holidays)
- [ ] Confirm the date isn't blocked by anything bigger in adjacent
      communities (Vercel ship week, React conf, etc.)
- [ ] Block your calendar 6am–11pm PT on launch day. Trade away meetings.
- [ ] Record the 20-second demo video (see `product-hunt.md` for ffmpeg specs)
- [ ] Take the 5 hero screenshots (see `product-hunt.md` gallery plan)
- [ ] Run `./launch/labels.sh` to create the GitHub label set
- [ ] Enable GitHub Discussions on the repo:
      `https://github.com/alevizio/worlddots/settings#discussions`
- [ ] Create the 4 starter Discussion categories: Q&A, Ideas, Show & Tell, Meta
- [ ] Verify the live site responds 200 and the picker still works
- [ ] Run `npm test -- --run` and `npm run build` — both clean

## Pre-launch — T-3 days

- [ ] Send 10-15 personalized outreach emails (see `outreach-email.md`)
- [ ] Submit to Sidebar.io, Console.dev, Tiny Helpers (these have approval queues)
- [ ] Schedule X / LinkedIn / Mastodon posts in your scheduler of choice
- [ ] Build the press kit page (logo + screenshots + blurbs)
- [ ] Re-read `show-hn.md` prepared responses — internalize them so you can
      paste from muscle memory under pressure
- [ ] Pin the FAQ doc somewhere so you can reference it during the launch

## Pre-launch — T-1 day

- [ ] Final tests + build pass
- [ ] Final smoke test of the live site on mobile (Safari + Chrome)
- [ ] Sleep early. Don't push code on launch day.

---

## Launch day — run of show (all times PT)

| Time | Channel | Action |
|---|---|---|
| 12:01am | **Product Hunt** | Post goes live. PH counts the next 24h from this minute. |
| 12:30am | **Product Hunt comments** | Post your maker's first comment (drafted in `product-hunt.md`) |
| 6:00am | **Show HN** | Post Show HN (drafted in `show-hn.md`) |
| 6:00am | **Inbox check** | Reply to early PH commenters before HN takes attention |
| 8:30am | **X (Twitter)** | Drop the thread from `social-threads.md` |
| 9:30am | **LinkedIn** | Post the LinkedIn variant |
| 10:00am | **Mastodon** | Post on fosstodon.org or mastodon.design |
| 11:00am | **Designer News** | Submit the DN entry |
| Afternoon | **Reddit** (1 per day) | Start with `/r/web_design`. `/r/javascript` tomorrow. `/r/dataisbeautiful` day 3. |
| Evening | **Email follow-up** | Reply to anyone who emailed back. Don't push more outreach today. |

## Launch day — every hour

- [ ] Refresh Product Hunt comments — reply to everything new (even thanks)
- [ ] Refresh HN post — reply to technical comments, file issues for bug reports
- [ ] Check the live site is still up (worlddots.app might rate-limit)
- [ ] Watch `gh issue list` for fresh bug reports
- [ ] Don't refresh more than once per hour. The metric anxiety is real.

---

## Post-launch — T+1 day

- [ ] Capture metrics: PH rank, HN points + comments, X impressions, GitHub
      stars + clones, site traffic (if you have analytics)
- [ ] Triage every bug filed in the first 24h — at minimum label and acknowledge
- [ ] Write a "Thanks" post on X / Mastodon summarizing the launch
- [ ] Email anyone who covered you to thank them
- [ ] Tag a release on GitHub: `v1.0.0` if you didn't already

## Post-launch — T+1 week

- [ ] Ship at least one patch release addressing the most-reported bug
- [ ] Featured the best community Show & Tell submission in a follow-up
      social post
- [ ] Review every PR + issue, close stale or obviously-wrong ones
- [ ] Update the README with any post-launch coverage links
- [ ] Decide whether to do a v1.1 push or let things breathe — you can
      always do a Show HN follow-up at v1.2 with major new features

## Post-launch — T+1 month

- [ ] Tag a `good first issue` push — refresh which issues are friendly to
      new contributors
- [ ] Promote the most consistent commenter to **Triage** role if it
      makes sense (see `../GOVERNANCE.md`)
- [ ] Plan the v1.1 release notes
- [ ] Decide if a follow-up Show HN / PH launch is warranted (Worlddots is
      eligible for one re-launch per year on PH)

---

## What success looks like (90-day targets)

These are **planning targets, not promises**. Adjust to your tolerance.

- 1 healthy v1 release
- 300–1,000 GitHub stars
- 10+ external preset / example submissions
- 5+ first-time code contributors
- 1 visible showcase gallery with community-made work
- Discussions activity > 1 substantive post per week
- Site traffic baseline established (whatever your analytics shows)

If you hit 3 of those 7, the launch was a win. Don't measure yourself against
viral comparisons — this is a niche tool with a high-quality audience.

---

## Drift detection — keep these in sync

When you ship a major new feature, the assets here need updates:

| Change | Files to update |
|---|---|
| New shader effect | `product-hunt.md` features list, `show-hn.md` body, `../README.md` features |
| New export format | All of the above + `../ROADMAP.md` if it was queued |
| New preset | `../CHANGELOG.md`, social threads (mention it as a launch beat) |
| Removed feature | `../CHANGELOG.md` (under Removed) + roadmap update |
| Performance breakthrough | `show-hn.md` (the perf paragraph is the most-read) |

If you're shipping daily and these files drift more than a sprint, prune them.
Out-of-date launch copy is worse than no launch copy.
