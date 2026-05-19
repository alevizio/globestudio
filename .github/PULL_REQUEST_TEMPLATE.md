<!--
  Thanks for the PR!

  Keep this short. The checklist exists to save back-and-forth on review.
  If your PR is tiny or non-code (docs, typo, preset), feel free to delete
  sections that don't apply.
-->

## What this changes

<!-- One or two sentences. What is different in the product? -->

## Why

<!-- Linked issue, screenshot of the bug, or the conversation that prompted it. -->

Closes #

## How to test

<!--
  Step-by-step. Assume the reviewer has just cloned the repo.
  e.g. "Open the picker, switch to Gradient, drag the angle slider."
-->

## Before / after

<!--
  For any visual change: paste a before screenshot and an after screenshot.
  For interactions: a 5-second screen recording beats five paragraphs of prose.
  Animations are especially hard to review without video.
-->

## Checklist

- [ ] Tests pass locally (`npm test -- --run`)
- [ ] Production build succeeds (`npm run build`)
- [ ] No hardcoded colors / spacing — uses design tokens (`var(--accent)` etc.)
- [ ] Respects `prefers-reduced-motion` if I added a new animation
- [ ] `CHANGELOG.md` updated under `[Unreleased]` if this is user-visible
- [ ] If this changes the persisted state shape, I documented the migration

<!-- Anything reviewers should look at extra carefully? Flag it here. -->
