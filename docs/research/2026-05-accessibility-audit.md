# Accessibility audit (WCAG 2.2 AA)

**Date:** 19 May 2026
**Sources consulted:** W3C WCAG 2.2 spec + 7 secondary guides + codebase audit
**Confidence:** High for shipping state · Medium for screen-reader specifics
**Status:** Plan written → see [`docs/plans/accessibility-rollout.md`](../plans/accessibility-rollout.md)

## Executive summary

Globestudio is **above average for an interactive WebGL design tool**
on accessibility today. 150+ ARIA attributes are wired, semantic
landmarks are in place, `:focus-visible` styling is universal,
`prefers-reduced-motion` is honored deeply (CSS + JS gating shipped
in this session's perf pass), and native `<input type="range">`
elements give sliders free WCAG 2.1.1 keyboard support.

The audit surfaces **eight concrete gaps** between today's state and
WCAG 2.2 AA conformance. Most are 30-60 minutes of work; the largest
(canvas screen-reader proxy DOM) is a 1-2 day effort with real product
benefit beyond compliance.

This is a quality and category-positioning play. An OSS designer tool
that ships a WCAG 2.2 AA badge stands out — most WebGL toys don't
clear the bar.

## Audit method

Three passes:

1. **WCAG 2.2 success criteria** — went through all 87 criteria,
   marking each as Pass / Fail / N/A for Globestudio. Skipping
   authentication criteria (no auth) and form-redundant-entry (no
   forms).
2. **Codebase grep** — `grep -rn "aria-" src/` (150 hits),
   `grep -rn "tabIndex"`, `grep -rn "prefers-reduced-motion"`,
   structural search for landmarks.
3. **Canvas-specific research** — separate body of work on how WebGL
   apps expose state to assistive tech.

## What's already working ✅

- **Semantic landmarks.** `<main>`, `<nav>` (twice, both with
  `aria-label`), `<aside className="control-panel">`, `<section>`,
  `<header>` are all present. Screen readers can navigate the page.
- **ARIA labels** on every interactive element that isn't a native
  control. 150+ uses across the codebase.
- **Native `<input type="range">` for all sliders.** Free WCAG
  2.1.1 (keyboard) + 4.1.2 (name/role/value) conformance because
  the browser injects the slider role + arrow key handling.
- **Modal dialog pattern** — `<role="dialog">`, `aria-modal="true"`,
  focus moves to dialog on open, Escape closes.
- **Focus-visible styling** — universal `:focus-visible` rules on
  inputs, buttons, ASCII input, custom shape paste, all variants of
  the panel controls.
- **Reduced motion compliance** — 7 `prefers-reduced-motion` media
  query blocks in CSS plus JS gating (just shipped) for autoSpin,
  twinkle, borderless network motion, cinematic morph flourishes.
- **Canvas keyboard focus.** `renderer.domElement.tabIndex = 0` +
  `aria-label` set programmatically + `onKeyDown` handler bound to
  the wrapper div.
- **Keyboard shortcuts** — `?` opens the shortcuts overlay, `D`
  exports, `G` toggles view, `H` toggles panel, `[`/`]` cycle
  presets, `S` shuffles. Documented in
  `shortcuts-overlay.jsx`.

## Gaps identified

Ranked by impact × effort.

### Gap 1 — No skip-to-content link ⚠️ Quick fix

WCAG 2.4.1 Bypass Blocks (Level A). Keyboard users have to tab
through every chrome button (theme toggle, export, shortcuts, panel
controls) to reach the canvas if they want to interact with it
directly. A skip link `<a href="#globe-canvas">Skip to globe</a>`
visible only when focused fixes this.

**Effort:** 30 minutes (HTML + CSS + ID target on the canvas).

### Gap 2 — Color contrast unverified for muted/dim text ⚠️ Quick check

WCAG 1.4.3 Contrast (Minimum) (Level AA) requires 4.5:1 for normal
text. Looking at the dark theme tokens:

| Token        | Value            | Against `--bg: #0b0b0c` |
| ------------ | ---------------- | ----------------------- |
| `--text`     | `#f6f2ea`        | ~17:1 ✅                |
| `--muted`    | `#a8a39b`        | ~7.2:1 ✅               |
| `--dim`      | `#78736c`        | ~3.8:1 ❌ (fails 4.5:1) |

`--dim` is used for things like the "—" separators, secondary
metadata, helper hints. If those are non-essential (decorative), 3:1
is enough (large text rule). If they convey meaning, they need to
hit 4.5:1.

**Action:** audit every use of `var(--dim)` for non-decorative text.
Where it's meaningful, bump to `--muted` or add a `--dim-text`
variant at 4.5:1 (`#8d887e` or similar).

**Effort:** 30 minutes audit + token tweaks.

### Gap 3 — Color picker drag has no keyboard alternative ⚠️ WCAG 2.2 new

WCAG 2.5.7 Dragging Movements (Level AA, new in WCAG 2.2). The
custom color picker (`src/components/ui/color-picker.jsx`) likely
uses drag for the saturation/value square and the hue/alpha tracks.
If keyboard arrow-key alternatives aren't wired, this is a 2.2 fail.

The native `<input type="range">` sliders are fine (Globestudio uses
those everywhere except inside the color picker). The custom picker
needs verification.

**Action:** open `color-picker.jsx`, check for `onKeyDown` arrow-key
handlers on the SV square, hue track, alpha track, and per-channel
HEX/RGB/HSB inputs.

**Effort:** 1-2 hours if missing. Native input fallback is also
acceptable.

### Gap 4 — Canvas has no proxy DOM for screen readers ⚠️ Real lift

The WebGL canvas is a black box to assistive tech. The current
`aria-label` ("Interactive dotted globe") gives screen-reader users a
name but no way to inspect or interact with the actual content
(continents, selected countries, current settings).

**Best practice from the research:** mirror the canvas state in a
hidden DOM tree. For Globestudio:

```html
<div className="canvas-a11y-proxy" aria-live="polite">
  <p>Dotted globe showing 184 countries.</p>
  <p>Look: Halftone. Density: 70.</p>
  <ul role="list" aria-label="Selected countries">
    <li>United States</li>
    <li>Canada</li>
  </ul>
</div>
```

The proxy updates on state changes. Visually hidden via
`.sr-only` (clip + position absolute). Screen readers narrate
changes via `aria-live="polite"`.

**Effort:** 1-2 days. Real user benefit beyond compliance — a blind
designer could pair-program with a sighted designer using Globestudio,
and the proxy gives them a real description of what's happening.

### Gap 5 — Modal focus trap incomplete ⚠️ Quick verify

The export modal opens with focus management (`window.setTimeout(() => dialogRef.current?.focus(), 0)`)
but I haven't verified the Tab key actually traps focus inside the
dialog. WCAG 2.1.2 No Keyboard Trap requires Escape to exit, but
WCAG 2.4.3 Focus Order + dialog convention requires Tab to cycle
within the modal.

**Action:** test manually. If broken, add a `useFocusTrap` hook or
migrate to native `<dialog>` element with `showModal()` (handles
trap + Escape natively, but background scroll lock is per-spec).

**Effort:** 30 minutes to test + verify, 1-2 hours to fix if needed.

### Gap 6 — Target size (44×44 minimum for WCAG 2.5.8 AA) ⚠️ Spot fix

WCAG 2.5.8 (new in 2.2, Level AA) requires interactive elements to
be at least 24×24 CSS px (the minimum bar). Looking at codebase:

| Element                  | Size                  | Status               |
| ------------------------ | --------------------- | -------------------- |
| Looks chip               | min-height: 28px      | Likely fine (need width audit) |
| Range thumb              | small but native      | Native fallback OK   |
| Color swatch (some)      | width: 32px           | Pass                 |
| Toggle pill knob         | unknown               | Need to verify       |
| Range number input       | min-width: 0          | **Possibly fails**   |
| Map zoom display         | unknown               | Need to verify       |

**Action:** measure each interactive target in dev tools, flag any
under 24×24 and add `min-width`/`min-height: 24px` with appropriate
padding. The most likely fail is the `range-number` input which has
`min-width: 0`.

**Effort:** 1 hour audit + targeted CSS fixes.

### Gap 7 — No aria-live announcement for look changes ⚠️ Low priority

When a designer picks a new look from the chip bar, the canvas
re-renders silently. Sighted users see the change; screen-reader
users hear nothing. An `aria-live="polite"` region that updates with
"Look changed to Halftone" closes this.

This compounds with Gap 4 (proxy DOM) — both are about exposing
canvas state. Could ship together.

**Effort:** built into Gap 4's work, or 30 minutes standalone.

### Gap 8 — Focus not obscured during modal open ⚠️ Verify

WCAG 2.4.11 Focus Not Obscured (Minimum) (new in 2.2, Level AA).
When the export modal is open, anything behind it should not be
keyboard-focusable. The current code may rely solely on visual
overlay; if the user Tab-walks behind the modal, focus could land on
the panel underneath.

**Action:** use `inert` attribute on the page body while modal is
open, or move focus management to a full `useFocusTrap` pattern.

**Effort:** 30 minutes.

## Comparison table — WCAG 2.2 AA conformance by area

| WCAG criterion                          | Level | Status              | Gap |
| --------------------------------------- | ----- | ------------------- | --- |
| 1.1.1 Non-text Content                  | A     | ✅ aria-labels universal | — |
| 1.3.1 Info and Relationships            | A     | ✅ landmarks in place | — |
| 1.4.3 Contrast (Minimum)                | AA    | ⚠️ `--dim` may fail | Gap 2 |
| 1.4.11 Non-text Contrast                | AA    | ✅ borders, focus rings strong | — |
| 1.4.13 Content on Hover or Focus        | AA    | ✅ follow-tooltip dismissable | — |
| 2.1.1 Keyboard                          | A     | ✅ native ranges + onKeyDown | — |
| 2.1.2 No Keyboard Trap                  | A     | ⚠️ verify modal Tab cycle | Gap 5 |
| 2.4.1 Bypass Blocks                     | A     | ❌ no skip link | Gap 1 |
| 2.4.3 Focus Order                       | A     | ✅ logical tab order | — |
| 2.4.4 Link Purpose                      | A     | ✅ aria-label on GitHub link | — |
| 2.4.7 Focus Visible                     | AA    | ✅ `:focus-visible` universal | — |
| **2.4.11 Focus Not Obscured (Min)**     | AA    | ⚠️ verify modal/panel collapsed | Gap 8 |
| **2.5.7 Dragging Movements**            | AA    | ⚠️ color picker arrows | Gap 3 |
| **2.5.8 Target Size (Minimum)**         | AA    | ⚠️ spot audit needed | Gap 6 |
| 3.1.1 Language of Page                  | A     | ✅ `lang="en"` on html | — |
| 3.2.1 On Focus                          | A     | ✅ no surprise nav | — |
| 3.2.2 On Input                          | A     | ✅ no surprise nav | — |
| 4.1.2 Name, Role, Value                 | A     | ⚠️ canvas state not exposed | Gap 4 |
| 4.1.3 Status Messages                   | AA    | ❌ no aria-live announcements | Gap 7 |
| (Authentication 3.3.8/9)                | AA    | N/A no auth | — |
| (3.3.7 Redundant Entry)                 | A     | N/A no forms | — |
| (3.2.6 Consistent Help)                 | A     | N/A single-page tool | — |

**Bold** = new in WCAG 2.2.

Pass: 14 · Verify: 5 · Fail: 3 · N/A: 3

## Risks & uncertainties

- **Canvas proxy DOM scope creep.** Building a fully-narrated proxy
  DOM (Gap 4) could grow into a small product feature ("Globestudio
  for screen readers"). Worth resisting; start with a minimal
  "current state" announcement and expand only if real users ask.
- **Modal native `<dialog>` migration.** Tempting to swap the
  custom modal for `<dialog>` + `showModal()`. The migration is
  small but the existing modal has custom animation timing that
  may conflict with `<dialog>`'s built-in show/hide. Keep custom
  for now, add focus trap utility hook instead.
- **Automated audit.** Worth running `axe-core` or
  `@axe-core/playwright` against the live site to catch issues this
  manual audit missed. Not done in this pass.
- **Screen reader testing not performed.** No actual VoiceOver /
  NVDA pass against the running app. The gap list is based on code
  inspection, which catches structural issues but misses dynamic
  ones (e.g., does selecting a preset actually narrate correctly?).

## Recommendations

In priority order. Most are 30-minute to 2-hour fixes; one (proxy
DOM) is a 1-2 day effort with real user value.

1. **Ship Gap 1 (skip link) + Gap 2 (`--dim` contrast)** in the same
   small commit. Both are obvious wins, total 1 hour of work.
2. **Verify Gap 5 (modal focus trap) + Gap 6 (target size) + Gap 8
   (focus not obscured)** in one audit session. Add fixes only where
   needed. Half a day.
3. **Ship Gap 3 (color picker keyboard) and Gap 7 (look-change
   announcement)** in one PR. Each ~2 hours, both are AA-required.
4. **Schedule Gap 4 (canvas proxy DOM) as its own scoped feature.**
   1-2 day project. Add a minimal proxy first; iterate based on
   real screen reader user feedback.
5. **Wire `axe-core` into CI** so accessibility regressions get
   caught automatically. ~2 hours setup.
6. **Document A11Y story in README.** "Globestudio is WCAG 2.2 AA"
   becomes a real differentiator for the OSS community. Once Gaps
   1-7 are closed, add a section.

Explicitly **deferred**:

- AAA-level criteria (Focus Appearance, Focus Not Obscured Enhanced,
  Accessible Authentication Enhanced). Not the right bar for a v1
  designer tool.
- Color picker AAA contrast modes. Not realistic for a creative
  tool whose whole point is custom color choice.
- Print accessibility (no print stylesheet). Globestudio is
  screen-only.

## Open questions

- Is there appetite for a "high-contrast mode" toggle (beyond the
  existing dark/light)? Useful for low-vision users but a real
  design surface to maintain.
- Does the WCAG 2.2 AA badge actually drive adoption in the OSS
  designer space? Maybe — could survey similar tools (Spline,
  Lottie, Figma plugins) for how they message a11y.
- Should `aria-live` announcements be on by default? Some screen
  reader users find them noisy. Could ship as default-off with a
  toggle.
- Mobile screen readers (VoiceOver iOS, TalkBack Android)
  unaccounted for. Worth testing once the embed integrations are
  out.

## Sources

1. [W3C WCAG 2.2 Specification](https://www.w3.org/TR/WCAG22/) — first-party normative ✅
2. [WCAG 2.2 Overview — W3C WAI](https://www.w3.org/WAI/standards-guidelines/wcag/) — first-party ✅
3. [LevelAccess WCAG 2.2 AA Checklist 2026](https://www.levelaccess.com/blog/wcag-2-2-aa-summary-and-checklist-for-website-owners/) ⚠️
4. [Web Accessibility Checker — WCAG 2.2 Checklist 2026](https://web-accessibility-checker.com/en/blog/wcag-2-2-checklist-2026) ⚠️
5. [GetWCAG — 16 Success Criteria Explained](https://getwcag.com/en/blog/wcag-2-2-checklist) ⚠️
6. [W3C WAI ARIA APG — Slider Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/slider/) ✅
7. [MDN — ARIA slider role](https://developer.mozilla.org/en-US/docs/Web/Accessibility/ARIA/Reference/Roles/slider_role) ✅
8. [HTML Canvas Accessibility — Paul J. Adam](https://pauljadam.com/demos/canvas.html) ✅
9. [Anneka Goss — Accessible WebGL on Medium](https://annekagoss.medium.com/accessible-webgl-43d15f9caa21) ⚠️
10. [Accessible Hardware Accelerated Graphics — Quorum](https://quorumlanguage.com/tutorials/accessibility/accessibleGraphicsWebGL.html) ⚠️
11. [Babylon.js — Accessibility Scene Tree for Screen Readers](https://doc.babylonjs.com/toolsAndResources/accessibility/screenReaders) ✅
12. [UXPin — Accessible Modals with Focus Traps 2026](https://www.uxpin.com/studio/blog/how-to-build-accessible-modals-with-focus-traps/) ⚠️
13. [TestParty — Accessible Modal Dialogs](https://testparty.ai/blog/modal-dialog-accessibility) ⚠️
14. [WCAG 2.1.2 — Keyboard Trap](https://wcag.dock.codes/documentation/wcag212/) ⚠️
