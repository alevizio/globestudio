// Automated a11y regression guard. Runs axe-core against the static
// rendering of components that don't depend on WebGL. The full <App /> can't
// be axe-tested directly because GlobeBackground lazy-loads Three.js which
// won't run in jsdom — but the chrome (modals, panel, looks bar, color
// picker) IS testable and that's where most a11y regressions land.
//
// Failures here block CI. Run locally via:
//   npm test
//
// To investigate a violation, the axe report includes a `help` URL pointing
// at the WCAG criterion and a `nodes` array showing which DOM elements
// triggered the rule.
//
// See docs/research/2026-05-accessibility-audit.md for the WCAG 2.2 AA
// criteria this guard backs up.

import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import axe from "axe-core";
import { ShortcutsOverlay } from "../components/shortcuts-overlay.jsx";
import { ColorSwatch } from "../components/ui/color-swatch.jsx";
import { CanvasA11yProxy } from "../components/canvas-a11y-proxy.jsx";

// Rules we explicitly *don't* care about for a designer-tool canvas:
// - canvas image-alt: the canvas IS aria-labeled but axe still warns. The
//   proxy DOM is the actual content surface for assistive tech.
// - region: top-level landmarks are owned by App.jsx; component-level tests
//   shouldn't have to wrap each piece in a fake <main>.
const RULE_EXCLUDES = ["region", "image-alt", "landmark-one-main"];

const runAxe = async (container) => {
  const results = await axe.run(container, {
    rules: Object.fromEntries(RULE_EXCLUDES.map((id) => [id, { enabled: false }])),
  });
  return results.violations;
};

describe("Accessibility (axe-core)", () => {
  it("ShortcutsOverlay has no violations when open", async () => {
    const { container } = render(<ShortcutsOverlay open={true} onClose={() => {}} />);
    const violations = await runAxe(container);
    if (violations.length > 0) {
      console.error("axe violations:", JSON.stringify(violations, null, 2));
    }
    expect(violations).toHaveLength(0);
  });

  it("ColorSwatch trigger has no violations", async () => {
    const { container } = render(
      <ColorSwatch value="#5a5a64" onChange={() => {}} label="Test color" />,
    );
    const violations = await runAxe(container);
    if (violations.length > 0) {
      console.error("axe violations:", JSON.stringify(violations, null, 2));
    }
    expect(violations).toHaveLength(0);
  });

  it("CanvasA11yProxy renders a labeled live region", async () => {
    const { container } = render(
      <CanvasA11yProxy
        viewMode="globe"
        renderMode="dots"
        selection={{ mode: "country", label: "World" }}
        lookId="halftone"
        lookName="Halftone"
        density={70}
        dotCount={6200}
        effect="halftone"
        flatProjection="mercator"
        riversVisible={false}
        citiesVisible={false}
      />,
    );
    // Sanity: the proxy is a region with the right label.
    const region = container.querySelector('[role="region"][aria-label="Globe state"]');
    expect(region).toBeTruthy();
    expect(region.getAttribute("aria-live")).toBe("polite");
    // Then axe pass.
    const violations = await runAxe(container);
    if (violations.length > 0) {
      console.error("axe violations:", JSON.stringify(violations, null, 2));
    }
    expect(violations).toHaveLength(0);
  });
});
