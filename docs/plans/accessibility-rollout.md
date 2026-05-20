# Accessibility rollout plan

**Status:** Draft
**Date opened:** 19 May 2026
**Owner:** Alejandro
**Research basis:** [`docs/research/2026-05-accessibility-audit.md`](../research/2026-05-accessibility-audit.md)

## Goal

Move Globestudio from "above-average for an interactive WebGL tool" to
**fully WCAG 2.2 AA conformant**. Use the audit's gap list as the
punchlist. Eight gaps total; the largest (canvas proxy DOM) gets its
own dedicated phase because it has real user value beyond compliance.

## Non-goals

- **Not chasing AAA conformance.** Wrong bar for a creative tool
  where color choice is the product.
- **Not migrating off the custom modal** to native `<dialog>`. The
  custom animation timing is worth preserving; instead patch focus
  trap into the existing component.
- **Not building a high-contrast theme.** Mentioned as an open
  question — defer until users ask.
- **Not running every page through axe-core in v1.** Add CI hookup
  later; the manual audit catches the structural issues today.

## Phases

Each phase produces a single PR + commit. Phases are mostly
independent.

---

### Phase 1 — Quick wins batch (~1 hour total)

The two cheapest wins, shipped together to keep velocity up.

#### Tasks

- [ ] **Skip link.** Add a visually-hidden-until-focused
      `<a href="#globe-canvas" className="skip-link">Skip to globe</a>`
      as the first child of `<main>`. Style with the standard
      "absolute, top: -40px, focus: top: 8px" pattern.
- [ ] **Canvas anchor.** Add `id="globe-canvas"` to the
      `globe-background` mount div so the skip link has somewhere to
      land. Confirm it's keyboard-focusable (already `tabIndex={0}`
      via `renderer.domElement` — but the WRAPPER div needs the id).
- [ ] **`--dim` contrast audit.** Search every `var(--dim)` usage.
      Where text is non-decorative (meaningful), bump to `--muted`
      or add a `--dim-text` variant with sufficient contrast
      (`#8d887e` against `--bg: #0b0b0c` = 4.6:1).
- [ ] Light-theme `--dim` (`#6d6962` against `#fcfaf6`) — verify
      contrast meets 4.5:1 too. Current ratio is ~5.8:1, probably
      passes.
- [ ] Commit + test that screen reader announces the skip link on
      first Tab.

#### Acceptance

- First Tab on the page reveals "Skip to globe" link.
- Activating the link focuses the canvas (Enter / Space).
- No text using `var(--dim)` is below 4.5:1 contrast (or has been
  reassigned to a higher-contrast token).
- `npm test` + `npm run build` clean.

---

### Phase 2 — Verification audit (~3 hours)

Walks the codebase and dev tools to confirm three "verify" gaps from
the research. Fix any that fail.

#### Tasks

- [ ] **Modal focus trap.** Open the export modal, Tab through every
      element, confirm Tab cycles inside the dialog (doesn't escape
      to the underlying panel). If broken, add a `useFocusTrap` hook
      that:
      - Captures focusable elements on open
      - Cycles Tab / Shift+Tab inside that set
      - Returns focus to the trigger on close
- [ ] **Focus not obscured.** Verify when the panel is collapsed
      and the modal is open, no Tab path lands behind the modal. If
      it does, set `inert` on `<main>` (excluding the modal) while
      open.
- [ ] **Target size 24×24.** Measure each interactive target in
      Chrome DevTools. Confirmed candidates:
      - `.range-number` input — `min-width: 0` is suspicious
      - `.toggle-control` knob — confirm
      - `.looks-chip` — `min-height: 28px` passes height; width
        depends on content
      - `.map-zoom-display` — verify
      - `.color-swatch-trigger` — confirm
- [ ] Fix any element below 24×24 by adding
      `min-width: 24px; min-height: 24px` with appropriate padding.
      Use the spacing convention of the design system, not bare
      pixel values.

#### Acceptance

- Modal Tab cycle stays inside dialog.
- `inert` (or equivalent) applied behind modal/panel-collapsed states.
- No interactive element below 24×24 CSS px.
- No visible layout regressions (`npm test` covers visual snapshot
  if any).

---

### Phase 3 — Color picker keyboard alternative (~2 hours)

WCAG 2.5.7 (new in 2.2) requires drag operations to have a single-
pointer alternative. The custom color picker is the likely violator.

#### Tasks

- [ ] Open `src/components/ui/color-picker.jsx`. Identify the
      saturation/value square, hue track, alpha track, and any
      gradient-stop drag targets.
- [ ] Add `onKeyDown` handlers to each draggable:
      - Arrow keys: step the value by 1 unit (1% saturation, 1° hue,
        1% alpha)
      - Shift+Arrow: step by 10 units
      - Home/End: jump to min/max
- [ ] Ensure each draggable is focusable (`tabIndex={0}`) and has a
      visible focus ring.
- [ ] Set proper `role="slider"` + `aria-valuemin`, `aria-valuemax`,
      `aria-valuenow`, `aria-valuetext` on each non-native draggable.
- [ ] Add an `aria-label` describing what the slider controls
      ("Saturation/Value", "Hue", "Alpha").

#### Acceptance

- Each color picker control reachable by keyboard via Tab.
- Arrow keys change the value live.
- Screen reader announces value changes as user adjusts.
- Visual drag interaction unchanged.

---

### Phase 4 — Status announcements (~2 hours)

WCAG 4.1.3 requires that status messages be programmatically
exposed. The current Globestudio silently re-renders on look changes.

#### Tasks

- [ ] Add a `<div role="status" aria-live="polite" className="sr-only" />`
      near the root of `<App>`.
- [ ] Wire it to update on:
      - Look preset change ("Look changed to Halftone.")
      - Render mode toggle ("Switched to flat view." / "Switched
        to globe view.")
      - Selection change ("Selected United States." /
        "Cleared selection.")
- [ ] Throttle updates to avoid spamming under rapid changes (e.g.,
      shuffle key). Use a 500ms debounce.
- [ ] Verify with VoiceOver (macOS) that announcements happen and
      don't interrupt the user.

#### Acceptance

- VoiceOver announces preset / view / selection changes within
  500ms of the user action.
- Rapid changes don't trigger announcement spam.
- The sr-only region is invisible visually but present in DOM.

---

### Phase 5 — Canvas proxy DOM (~1-2 days)

The largest item. Beyond compliance, this gives blind users a real
description of what the WebGL canvas is rendering. Worth doing well.

#### Tasks

- [ ] Design the proxy schema. Minimum fields:
      - Map mode (world / region / country / state)
      - Selected items (list)
      - Active look
      - Render mode (dots / solid)
      - Dot count, density
- [ ] Add a hidden DOM tree below the canvas div:
      ```jsx
      <div
        className="canvas-a11y-proxy sr-only"
        role="region"
        aria-label="Globe state"
        aria-live="polite"
      >
        <p>{statusSentence}</p>
        <ul aria-label="Selected items">
          {selectedDots.map(id => <li key={id}>{labelFor(id)}</li>)}
        </ul>
      </div>
      ```
- [ ] Build a `formatGlobeStatus(state)` utility in
      `src/utils/a11y.js` that produces a screen-reader-friendly
      sentence.
- [ ] Test with VoiceOver: navigate the page, reach the canvas,
      confirm the description reads correctly. Make a change to a
      preset, confirm the proxy updates.
- [ ] Document the proxy schema in `docs/research/2026-05-accessibility-audit.md`
      so future contributors don't accidentally break it.

#### Acceptance

- A blind designer can pair-program with Globestudio and understand
  what's rendering without seeing the canvas.
- The proxy stays in sync with the canvas state (no stale data).
- VoiceOver / NVDA narration is coherent ("Dotted world globe with
  Halftone effect, 184 countries shown, density 70.").

---

### Phase 6 — CI hookup with axe-core (~2 hours)

Automate regression detection so accessibility gains don't erode.

#### Tasks

- [ ] Add `@axe-core/playwright` (or similar) as a dev dependency.
- [ ] Add a Playwright test that loads the homepage, runs `axe.run()`,
      and fails the build on any new violations.
- [ ] Configure rule overrides for known-acceptable cases (e.g.,
      canvas without text alternative is intentionally a proxy DOM
      situation).
- [ ] Run on every PR via GitHub Actions.

#### Acceptance

- CI fails when a new ARIA violation is introduced.
- Baseline of zero violations on the main branch.
- The proxy DOM and the canvas pass together.

---

### Phase 7 — Documentation (~30 minutes)

Translate the work into a story for users.

#### Tasks

- [ ] Add a "Accessibility" section to README.md describing the
      tool's WCAG 2.2 AA conformance.
- [ ] Add `ACCESSIBILITY.md` at repo root explaining:
      - Conformance level
      - Keyboard shortcuts
      - Screen reader support (the proxy DOM)
      - Reduced motion behavior
      - How to report a11y issues (link to GitHub Issues template)
- [ ] Add a GitHub issue template specifically for a11y bug reports.

#### Acceptance

- README mentions WCAG 2.2 AA.
- Standalone ACCESSIBILITY.md exists, linked from README and
  CONTRIBUTING.
- Issue template for a11y bugs exists.

---

## Open questions

- **Native `<dialog>` migration.** Tempting for v2 but not blocking
  any of these phases. Keep custom modal for now.
- **Mobile screen readers.** Should test VoiceOver iOS + TalkBack
  Android once integrations ship. The embed iframe inherits the
  parent's a11y story, so this is a "later" concern.
- **i18n.** All ARIA labels and the proxy DOM are English. If
  Globestudio ever translates, the a11y strings need i18n keys too.
- **High-contrast theme.** Could pair with the existing
  light/dark toggle. Defer until requested.
- **WCAG badge / certification.** Self-attestation is easy.
  Third-party certification (Deque, Level Access) is several
  thousand dollars and probably not worth it for an OSS tool.

## Status log

- **2026-05-19** — Plan drafted from audit. No code yet.
