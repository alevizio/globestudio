# Accessibility

Globestudio targets WCAG 2.2 AA conformance. This document lists what's
shipped, how to use the tool with assistive technology, and how to report
issues.

If you find an accessibility problem we missed, [open an issue using the a11y
template](https://github.com/alevizio/globestudio/issues/new?template=accessibility-report.yml).
Accessibility regressions get the same priority as security bugs.

## Conformance level

WCAG 2.2 Level AA across the static UI (panel, modals, controls, looks
bar). The WebGL canvas itself is opaque to assistive tech by design (canvas
2D doesn't expose semantic content), so we ship a visually hidden DOM mirror
that describes the canvas state to screen readers. See [Screen reader support
](#screen-reader-support) below.

## What's shipped

| Area | Implementation |
|---|---|
| Skip link | The first Tab reveals "Skip to globe", which focuses the canvas wrapper |
| Keyboard shortcuts | Press `?` for the full list. `S` shuffle, `[`/`]` cycle, `D` export, `R` reset, `G` toggle view, `H` toggle panel |
| Focus trap on modals | Tab cycles inside dialogs, Escape closes, focus returns to the trigger on close. `inert` is applied to the background |
| Reduced motion | `prefers-reduced-motion: reduce` stops auto-spin, twinkle, the cinematic morph flourishes and time-driven shader effects |
| Color contrast | All meaningful text meets 4.5:1 against the background. `--muted` reaches 7.2:1 and `--dim` reaches 5.58:1 |
| Target sizing | All interactive elements are at least 24×24 CSS px (WCAG 2.5.8) |
| Color picker keyboard | The SV (saturation/value) square works from the keyboard. Arrow keys step ±1, Shift+Arrow ±10, Home/End jump saturation, PageUp/PageDown jump value |
| Status announcements | A polite `aria-live` region announces preset changes, view mode toggles, selections and export operations |
| Persistent state proxy | A hidden semantic mirror of the canvas: view mode, render mode, look preset, selection, dot count, density, effects and overlays. Screen readers can navigate it at any time |
| Semantic landmarks | `<main>`, `<nav>`, `<aside>`, `<section>` and `<header>` are all present, with `aria-label` where appropriate |
| CI check | `axe-core` runs in the test suite, and accessibility regressions fail CI |

## Screen reader support

When you focus the canvas or its surrounding region, you'll hear something
like:

> "Globe state region. World in globe view, dotted mode, Halftone preset.
> 6,200 dots at density 70. Region: World. View: Globe (3D sphere). Render
> mode: Dot field. Look preset: Halftone: newspaper print pattern. Dot
> count: 6,200. Density: 70 out of 90. Shader effect: Halftone."

State changes (e.g. picking a new preset, switching view, selecting a
country) are announced as polite updates so they don't interrupt anything
you're already hearing.

Tested with:
- VoiceOver (macOS Sequoia): full narration works
- NVDA (Windows 11): full narration works
- TalkBack (Android): works on the embed iframe path

If you use a different assistive tech and it doesn't narrate correctly,
please open an issue.

## Keyboard navigation

Every interactive element is reachable with Tab and Shift+Tab. Some examples:

- Skip link: the first Tab on the page
- Looks bar chips: Tab through the preset chips, Enter to apply
- View mode switch: Tab to the Flat/Globe toggle, Arrow keys to switch
- Range sliders: Arrow keys for ±1, Shift+Arrow for ±10
- Color picker square: Arrow keys for saturation/value, Home/End/PageUp/PageDown for the extremes
- Modals: Tab cycles inside, Escape closes
- Country search: type to filter, in other languages too (try "Espagne" or "Deutschland")

## Reduced motion

If your OS is set to "reduce motion" (System Settings → Accessibility on
macOS, or `prefers-reduced-motion: reduce` in CSS), Globestudio automatically:

- Pauses the auto-spin rotation
- Stops the twinkle effect on dots
- Freezes time-driven shader animations (Aurora bands, Iridescent hue cycle, etc.)
- Removes the cinematic morph flourishes (FOV punch, scale dip, Y kick, Z roll)

You get the same image, just without the motion.

## What we don't claim

- AAA conformance. In a creative tool the colors are the user's choice, so we
  don't block palettes on contrast ratios.
- A high-contrast theme beyond the existing dark and light themes. It could
  ship if there's demand.
- Speech control. Globestudio works with system voice control (macOS
  Voice Control, Windows Speech Recognition) through the standard ARIA
  attributes, but we haven't optimized for it.
- Mobile screen readers. They work through the embed iframe but haven't been
  tested much yet.

## Known gaps

- Pointer drag is the main way to use the color picker, with the keyboard as
  the alternative. WCAG 2.5.7 (Dragging Movements) is met through the
  keyboard. We don't yet ship a button-based "step S/V" control, which would
  be easier to find.
- Custom GeoJSON paste is a `<textarea>` with `aria-label`. Screen reader
  users get a basic text input, and the validation feedback could say more.

These are tracked in [`docs/plans/accessibility-rollout.md`](docs/plans/accessibility-rollout.md).

## How to report issues

[Open an a11y issue](https://github.com/alevizio/globestudio/issues/new?template=accessibility-report.yml)
with:

1. Your assistive tech and OS (e.g. "VoiceOver, macOS 15.4")
2. What you were trying to do
3. What happened vs what you expected
4. A code snippet or screenshot if applicable

Accessibility regressions are high priority and go ahead of feature work.

## Resources

- [Conformance details (audit)](docs/research/2026-05-accessibility-audit.md)
- [Rollout plan (track)](docs/plans/accessibility-rollout.md)
- [WCAG 2.2 spec](https://www.w3.org/TR/WCAG22/)
