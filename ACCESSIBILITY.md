# Accessibility

Worlddots targets **WCAG 2.2 AA conformance**. This document outlines what's
shipped, how to use the tool with assistive technology, and how to report
issues.

If you find an accessibility problem we missed, [open an issue using the a11y
template](https://github.com/alevizio/worlddots/issues/new?template=accessibility-report.yml)
— accessibility regressions are prioritized like security bugs.

## Conformance level

**WCAG 2.2 Level AA** across the static UI (panel, modals, controls, looks
bar). The WebGL canvas itself is opaque to assistive tech by design (canvas
2D doesn't expose semantic content), so we ship a visually-hidden DOM mirror
that narrates canvas state for screen readers — see [Screen reader support
](#screen-reader-support) below.

## What's shipped

| Area | Implementation |
|---|---|
| **Skip link** | First-Tab reveals "Skip to globe" → focuses the canvas wrapper |
| **Keyboard shortcuts** | Press `?` for the full list. `S` shuffle, `[`/`]` cycle, `D` export, `R` reset, `G` toggle view, `H` toggle panel |
| **Focus trap on modals** | Tab cycles inside dialogs, Escape closes, focus restored to trigger on close. `inert` applied to background |
| **Reduced motion** | `prefers-reduced-motion: reduce` halts auto-spin, twinkle, cinematic morph flourishes, and time-driven shader effects |
| **Color contrast** | All meaningful text meets 4.5:1 against background. `--muted` clears 7.2:1; `--dim` clears 5.58:1 |
| **Target sizing** | All interactive elements ≥ 24×24 CSS px (WCAG 2.5.8) |
| **Color picker keyboard** | The SV (saturation/value) square is fully keyboard-controllable. Arrow keys step ±1, Shift+Arrow ±10, Home/End jump saturation, PageUp/PageDown jump value |
| **Status announcements** | Polite `aria-live` region narrates preset changes, view mode toggles, selections, export operations |
| **Persistent state proxy** | Hidden semantic mirror of the canvas — view mode, render mode, look preset, selection, dot count, density, effects, overlays. Screen readers can navigate this at any time |
| **Semantic landmarks** | `<main>`, `<nav>`, `<aside>`, `<section>`, `<header>` all present with `aria-label` where appropriate |
| **CI guard** | `axe-core` runs in the test suite — accessibility regressions block CI |

## Screen reader support

When you focus the canvas or its surrounding region, you'll hear something
like:

> "Globe state region. World in globe view, dotted mode, Halftone preset.
> 6,200 dots at density 70. Region: World. View: Globe (3D sphere). Render
> mode: Dot field. Look preset: Halftone — newspaper print pattern. Dot
> count: 6,200. Density: 70 out of 90. Shader effect: Halftone."

State changes (e.g. picking a new preset, switching view, selecting a
country) are announced as polite updates so they don't interrupt anything
you're already hearing.

Tested with:
- **VoiceOver** (macOS Sequoia) — full narration works
- **NVDA** (Windows 11) — full narration works
- **TalkBack** (Android) — works on the embed iframe path

If you use a different assistive tech and it doesn't narrate correctly,
please open an issue.

## Keyboard navigation

Every interactive element is reachable via Tab + Shift+Tab. Some highlights:

- **Skip link** — first Tab on the page
- **Looks bar chips** — Tab through preset chips, Enter to apply
- **View mode switch** — Tab to the Flat/Globe toggle, Arrow keys to switch
- **Range sliders** — Arrow keys for ±1, Shift+Arrow for ±10
- **Color picker square** — Arrow keys for saturation/value, Home/End/PageUp/PageDown for extremes
- **Modals** — Tab cycles inside; Escape closes
- **Country search** — Type to filter (with i18n support — try "Espagne" or "Deutschland")

## Reduced motion

If your OS is set to "reduce motion" (System Settings → Accessibility on
macOS, or `prefers-reduced-motion: reduce` in CSS), Worlddots automatically:

- Pauses the auto-spin rotation
- Stops the twinkle effect on dots
- Freezes time-driven shader animations (Aurora bands, Iridescent hue cycle, etc.)
- Removes the cinematic morph flourishes (FOV punch, scale dip, Y kick, Z roll)

The static result is still designer-quality — just calm instead of animated.

## What we don't claim

- **AAA conformance** — not the right bar for a creative tool where color
  choice is the product. We don't gate users' palette decisions on contrast
  ratios.
- **High-contrast theme** — beyond the existing dark/light theme. Could
  ship if there's demand.
- **Speech control** — Worlddots works with system voice control (macOS
  Voice Control, Windows Speech Recognition) via the standard ARIA surface,
  but we haven't optimized specifically for it.
- **Mobile screen readers** — works via the embed iframe but not yet
  extensively tested.

## Known gaps

- **Color picker pointer drag** is the primary interaction, with keyboard as
  alternative. WCAG 2.5.7 (Dragging Movements) compliance is via the keyboard
  alt — we don't yet ship a button-based "step S/V" UI which would be more
  discoverable.
- **Custom GeoJSON paste** is a `<textarea>` with `aria-label`. Screen reader
  users get the basic text-input experience; validation feedback could be
  more verbose.

These are tracked in [`docs/plans/accessibility-rollout.md`](docs/plans/accessibility-rollout.md).

## How to report issues

[Open an a11y issue](https://github.com/alevizio/worlddots/issues/new?template=accessibility-report.yml)
with:

1. Your assistive tech + OS (e.g. "VoiceOver, macOS 15.4")
2. What you were trying to do
3. What happened vs what you expected
4. A code snippet or screenshot if applicable

We treat accessibility regressions as **high priority** — they go ahead of
feature work.

## Resources

- [Conformance details (audit)](docs/research/2026-05-accessibility-audit.md)
- [Rollout plan (track)](docs/plans/accessibility-rollout.md)
- [WCAG 2.2 Spec](https://www.w3.org/TR/WCAG22/)
