# Plans

Execution plans drawn from `docs/research/`. Each plan should have:

1. **Header** — date, owner, status (draft / in-progress / shipped /
   abandoned), and the research doc(s) it's based on.
2. **Goal and non-goals** — what success looks like and what we are
   explicitly NOT trying to do.
3. **Phased breakdown** — split work into milestones small enough to
   ship independently. Each milestone has acceptance criteria.
4. **Open questions** — anything that needs an answer before
   implementation can finish. Keep them visible so they don't get
   forgotten.
5. **Status log** — append-only diary of what's been done. Newer
   entries at the top.

## Naming

`topic-slug.md` — no date prefix (plans evolve in place). Status moves
through the header; the diary captures the history.

## When a plan ships

Mark status: `shipped`, add a line to the diary, and update
`docs/research/README.md` if the underlying research moved from "Plan
written" to "Implemented."

## When a plan is abandoned

Mark status: `abandoned`, append a "why" note in the diary, and leave
the file in place. Future-us will thank you for not having to redo the
research.

## Index

| Plan | Status |
|---|---|
| [Integrations rollout](integrations-rollout.md) | Draft |
| [Shader effects rollout](shader-effects-rollout.md) | Draft |
| [Accessibility rollout](accessibility-rollout.md) | Draft |
| [SEO rollout](seo-rollout.md) | Draft |
| [Map data rollout](map-data-rollout.md) | Draft |
| [Growth rollout (community + funding + examples)](growth-rollout.md) | Draft |
| [Internationalization rollout](i18n-rollout.md) | Draft |
