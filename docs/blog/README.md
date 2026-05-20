# Globestudio blog

Long-form articles about dotted maps, design, and the tool itself.

Articles live as markdown files here (rendered by GitHub directly,
indexable by search engines). Each one targets a specific long-tail
search query a designer might actually type. The goal: real content
surface beyond the tool homepage + preset URLs.

When the count crosses ~5 articles, the plan is to migrate this into
a `/blog/` route on globestudio.app with proper SSG (likely Astro per
[`docs/plans/seo-rollout.md`](../plans/seo-rollout.md) Phase 7). For
now, github.com renders the markdown well enough — and the
github.com → globestudio.app cross-linking adds authority signal both
directions.

## Articles

| Date | Article | Target keyword |
|---|---|---|
| 2026-05 | [How to make a dotted world map in 2026](./2026-05-how-to-make-a-dotted-world-map.md) | "how to make a dotted world map" |

## Style guide

- **One target keyword per piece.** Surface it in the title, the first
  paragraph, the URL slug, and at least 2 H2 subheadings.
- **800-2500 words.** Long enough to rank, short enough to actually
  finish reading.
- **Hand-written, not LLM-generated.** Google penalizes "low-effort
  AI content." This isn't a hard rule — LLM-assisted is fine —
  but the final voice has to feel intentional.
- **Show, don't tell.** Embed Globestudio iframes (via `/embed`) where
  the article references a specific look or feature. Real examples
  beat described ones.
- **Linkable subheadings.** Use clear H2 + H3 hierarchy so people can
  cite specific sections.
- **Date format:** `YYYY-MM-DD` in the file name and frontmatter.

## Frontmatter

Each article should start with:

```markdown
---
title: "..."
slug: "url-slug-here"
description: "150-character SERP summary"
publishedAt: "2026-05-20"
targetKeyword: "..."
---
```

When the blog migrates to Astro, the frontmatter gets parsed natively.
Until then, it's just metadata for humans reading the repo.

## Drafts

Drop drafts as `DRAFT-*.md`. They're ignored by the table above until
they ship.
