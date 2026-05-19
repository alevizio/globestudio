# Governance

This document describes how decisions are made on Worlddots. It's intentionally
small — the project is small. As the contributor base grows, this will grow
with it.

## Today

**Maintainer**: [@alevizio](https://github.com/alevizio)

The maintainer makes all final decisions on:

- Direction (what's in [ROADMAP.md](ROADMAP.md), what's not)
- API surface (props, exports, persisted state keys)
- Design system (tokens, easing, radii — anything in `styles.css`)
- Releases and version numbers
- Adding or removing presets
- Code of conduct enforcement

The maintainer **delegates** review and triage to anyone with the Triage role
(see below) but reserves merge rights on `main`.

## Roles

We use the GitHub permission tiers as our role model.

| Role | What it means | How you get it |
|---|---|---|
| **Contributor** | You've opened a PR, issue, or discussion | Just show up |
| **Triage** | You can label issues, close duplicates, and respond officially in discussions | Demonstrate good judgment on 3-5 issues, then ask |
| **Write** | You can push branches, review and approve PRs | Land 5+ substantive PRs and be active for a few months |
| **Maintain** | You can manage the repo settings, releases, and other contributors | Invited by the current maintainer |

There's no application form. The path is: keep showing up, keep being helpful,
and the role will get offered to you when the work warrants it.

## How decisions are made

For most things, decisions are made on the issue or PR itself. A maintainer
will merge if the change:

1. Solves a real problem (linked issue or clear rationale in the PR)
2. Doesn't break tests or the build
3. Doesn't violate the design system rules in [CONTRIBUTING.md](CONTRIBUTING.md)
4. Reads as something the project would want long-term

For larger or more controversial changes — adding a new mode, renaming a
public API, changing the persisted state shape — open a Discussion first.
Anyone can weigh in. The maintainer will summarize the discussion and make a
call, ideally within two weeks of the original post.

## Disagreements

If a PR review or issue thread becomes unproductive, the maintainer can:

- Pause the discussion and ask for it to resume in a Discussion thread
- Close the PR and explain why
- Hand the decision to a different reviewer (once Triage/Write roles exist)

If you believe the maintainer's decision was wrong, you can:

- Open a Discussion in the **Meta** category making the case
- Email `viziomas@gmail.com` for a private second pass

You will not be retaliated against for disagreeing. You may, however, be told
"no" with finality.

## Code of Conduct

This project is governed by [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md).
Enforcement decisions sit with the maintainer. Severe or repeated violations
result in a permanent ban from all project surfaces.

## Changing this document

Open a PR. Substantive changes require a Discussion first.
