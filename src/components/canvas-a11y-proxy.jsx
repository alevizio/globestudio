import { formatGlobeStatus } from "../utils/a11y-status.js";

// Visually-hidden DOM mirror of canvas state. Screen readers + voice-control
// assistive tech treat this as the "real" content — the WebGL canvas itself
// is opaque to them. So when a blind user lands on Globestudio they hear:
//
//   "Globe state region. World in globe view, dotted mode, Halftone preset.
//    6,200 dots at density 70. Region: World. View: Globe (3D sphere). ..."
//
// Driven by the same App state that drives the canvas, so it stays in sync
// automatically. WCAG 4.1.2 (Name, Role, Value) — the proxy provides the
// machine-readable equivalent of the canvas's visual content.
//
// Updates as a region with aria-live="polite" so changes get announced
// without spam — assistive tech naturally throttles polite updates.
//
// See docs/research/2026-05-accessibility-audit.md Finding 4 + Gap 4 for
// the rationale.
export const CanvasA11yProxy = (props) => {
  const { summary, details } = formatGlobeStatus(props);
  return (
    <section
      className="canvas-a11y-proxy visually-hidden"
      role="region"
      aria-label="Globe state"
      aria-live="polite"
    >
      <p>{summary}</p>
      <dl>
        {details.map(([label, value]) => (
          <div key={label}>
            <dt>{label}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
};
