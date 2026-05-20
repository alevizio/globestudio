# Internal docs

Contributor-facing documentation that doesn't fit in the root-level
`README.md`, `ROADMAP.md`, `CONTRIBUTING.md`, or `CHANGELOG.md`.

Files here are working documents — research notes, planning specs, and
deep dives that drive shipping decisions. They are **not** user-facing
product docs (those go in the README) and **not** community policy
(that's the root markdown files).

## Folders

- **`research/`** — Topic-scoped research reports. Each file has its
  source list, confidence ratings, and is dated. Treat these as
  evidence — they're the "why" behind a decision.
- **`plans/`** — Execution plans drawn from the research. Phased,
  sprint-level, with explicit success criteria. Treat these as the
  "what we're doing next" — closer to a punch list than a roadmap.
- **`integrations/`** — User-facing how-to docs for embedding
  Globestudio in Webflow, Framer, Notion, plain HTML, etc. These ARE
  linked from the main README — they live here so the root stays
  uncluttered.

## When to add a doc here

- A research dive uncovered information worth keeping (cite the sources).
- A multi-step plan needs a single home so the implementation can refer
  back without re-deriving the rationale.
- Something is a "future Alejandro" note that doesn't belong in code
  comments or commit messages.

## When not to

- It's a one-line note → use a code comment or commit message.
- It's user-facing → README / ROADMAP.
- It's policy → CODE_OF_CONDUCT / GOVERNANCE / SECURITY at root.

Keep these files lean. Old research can be archived (move under
`research/archive/`) rather than deleted, so future searches still find
the citations.
