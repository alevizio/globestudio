# Launch: prepared assets

Everything you need for launch week, parked. Each file is a fully drafted
asset; the day-of work is mostly **pasting, sending, and replying to comments**.

**The schedule lives in one place: [`../LAUNCH.md`](../LAUNCH.md#schedule).**
The files below hold copy only and point back to it for dates and times.

## Index

| File | What it is |
|---|---|
| [`product-hunt.md`](./product-hunt.md) | Product Hunt post (tagline, description, gallery plan, maker's first comment, topics) |
| [`show-hn.md`](./show-hn.md) | Show HN post (title, body, prepared responses to expected criticism) |
| [`social-threads.md`](./social-threads.md) | X thread, Mastodon, LinkedIn, Reddit, three.js forum and Lobsters drafts |
| [`outreach-email.md`](./outreach-email.md) | Outreach email template + curated recipient list (newsletters, communities) |
| [`labels.sh`](./labels.sh) | Bash script to create the GitHub label set (matches issue templates) |
| [`archive/`](./archive/) | Old plans kept for reference only, not for this launch |

The waitlist gets exactly one email, on Product Hunt day. Its text is in
[`../LAUNCH.md`](../LAUNCH.md#waitlist-one-email).

The example projects referenced in social/outreach copy live in [`../examples/`](../examples/).

---

## Before launch week

- [ ] Run `./launch/labels.sh` to create the GitHub label set
- [ ] Draft the Announcements discussion to pin on Show HN morning
- [ ] Re-read `show-hn.md` prepared responses so you can paste them under pressure
- [ ] Final smoke test of the live site on mobile (Safari + Chrome) after the flip

## Launch day, every hour

- [ ] Refresh Product Hunt comments and reply to everything new (even thanks)
- [ ] Refresh the HN post: reply to technical comments, file issues for bug reports
- [ ] Check the live site is still up (globestudio.app might rate-limit)
- [ ] Watch `gh issue list` for fresh bug reports
- [ ] Don't refresh more than once per hour. The metric anxiety is real.

---

## Post-launch: T+1 day

- [ ] Capture metrics: PH rank, HN points + comments, X impressions, GitHub
      stars + clones, site traffic (if you have analytics)
- [ ] Triage every bug filed in the first 24h: at minimum label and acknowledge
- [ ] Write a "Thanks" post on X / Mastodon summarizing the launch
- [ ] Email anyone who covered you to thank them
- [ ] Tag a release on GitHub: `v1.0.0` if you didn't already

## Post-launch: T+1 week

- [ ] Ship at least one patch release addressing the most-reported bug
- [ ] Featured the best community Show & Tell submission in a follow-up
      social post
- [ ] Review every PR + issue, close stale or obviously-wrong ones
- [ ] Update the README with any post-launch coverage links
- [ ] Decide whether to do a v1.1 push or let things breathe; you can
      always do a Show HN follow-up at v1.2 with major new features

## Post-launch: T+1 month

- [ ] Tag a `good first issue` push: refresh which issues are friendly to
      new contributors
- [ ] Promote the most consistent commenter to **Triage** role if it
      makes sense (see `../GOVERNANCE.md`)
- [ ] Plan the v1.1 release notes
- [ ] Decide if a follow-up Show HN / PH launch is warranted (Globestudio is
      eligible for one re-launch per year on PH)

---

## What success looks like (90-day targets)

These are **planning targets, not promises**. Adjust to your tolerance.

- 1 healthy v1 release
- 300 to 1,000 GitHub stars
- 10+ external preset / example submissions
- 5+ first-time code contributors
- 1 visible showcase gallery with community-made work
- Discussions activity > 1 substantive post per week
- Site traffic baseline established (whatever your analytics shows)

If you hit 3 of those 7, the launch was a win. Don't measure yourself against
viral comparisons; this is a niche tool with a high-quality audience.

---

## Drift detection: keep these in sync

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
