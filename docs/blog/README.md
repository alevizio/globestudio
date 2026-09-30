# Globestudio blog

Long-form articles about dotted maps, design, and the tool itself.

Articles live here as markdown files, which GitHub renders and search
engines can index. Each one targets a specific long-tail search query a
designer might type, so the site has content beyond the homepage and the
preset pages.

Once there are about 5 articles, the plan is to move them to a `/blog/`
route on globestudio.app with static generation (likely Astro, per
[`docs/plans/seo-rollout.md`](../plans/seo-rollout.md) Phase 7). For
now, github.com renders the markdown well enough, and the links between
github.com and globestudio.app help both in search.

## Articles

| Date | Article | Target keyword |
|---|---|---|
| 2026-05 | [How to make a dotted world map in 2026](./2026-05-how-to-make-a-dotted-world-map.md) | "how to make a dotted world map" |

## Style guide

- One target keyword per piece. Use it in the title, the first
  paragraph, the URL slug and at least 2 H2 subheadings.
- 800 to 2500 words: long enough to rank and short enough to finish.
- Write in your own voice. Help from an LLM with a draft is fine, but
  the final text should read like you wrote it.
- Embed Globestudio iframes (via `/embed`) where the article mentions a
  specific look or feature. A live example says more than a description.
- Use a clear H2 and H3 hierarchy so people can link to and cite
  specific sections.
- Dates are `YYYY-MM-DD` in the file name and frontmatter.

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
