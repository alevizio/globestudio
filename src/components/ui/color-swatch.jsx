import { useLayoutEffect, useRef, useState } from "react";
import { ColorPicker } from "./color-picker.jsx";

const PICKER_WIDTH = 398;
const PICKER_HEIGHT = 460;
const VIEWPORT_PAD = 16;
const SWATCH_GAP = 14;

// Convert a 0–1 alpha into a 2-char hex suffix so we can build #RRGGBBAA
// CSS color strings for the swatch preview without parsing the base color.
const alphaToHex = (a) =>
  Math.round(Math.max(0, Math.min(1, a)) * 255).toString(16).padStart(2, "0");

export const ColorSwatch = ({
  value,
  onChange,
  label,
  alpha = 1,
  onAlphaChange,
  gradient = undefined,
  onGradientChange,
}) => {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const swatchRef = useRef(null);
  // Gradient mode is opt-in per call site: only color rows that pass an
  // onGradientChange handler expose the Solid/Gradient toggle in the picker.
  const supportsGradient = typeof onGradientChange === "function";
  const supportsAlpha = typeof onAlphaChange === "function";
  const stopAlpha = (a) => Math.max(0, Math.min(1, a ?? 1));
  const swatchStyle = supportsGradient && gradient
    ? {
        background: `linear-gradient(${gradient.angle ?? 90}deg, ${gradient.from}${gradient.fromAlpha != null ? alphaToHex(gradient.fromAlpha) : ""}, ${gradient.to}${gradient.toAlpha != null ? alphaToHex(gradient.toAlpha) : ""})`,
      }
    : { backgroundColor: value === "transparent" ? "#18171a" : value, opacity: supportsAlpha ? stopAlpha(alpha) : 1 };

  useLayoutEffect(() => {
    if (!open || !swatchRef.current) return undefined;
    const place = () => {
      const swatch = swatchRef.current;
      if (!swatch) return;
      const rect = swatch.getBoundingClientRect();
      // Measure the actual picker dimensions once it's in the DOM.
      const picker = document.querySelector(".color-picker");
      const height = picker?.offsetHeight || PICKER_HEIGHT;
      const width = picker?.offsetWidth || PICKER_WIDTH;
      const vh = window.innerHeight;
      const vw = window.innerWidth;

      // Prefer to the right of the swatch (the panel sits on the left, so
      // the picker reads as a "card next to the edit row"). Flip to the left
      // if there isn't room, then below/above as fallbacks.
      const spaceRight = vw - rect.right - VIEWPORT_PAD;
      const spaceLeft = rect.left - VIEWPORT_PAD;
      let left;
      if (spaceRight >= width + SWATCH_GAP) {
        left = rect.right + SWATCH_GAP;
      } else if (spaceLeft >= width + SWATCH_GAP) {
        left = rect.left - SWATCH_GAP - width;
      } else {
        // Last resort: clamp horizontally and let the vertical alignment
        // sit it as best it can.
        left = vw - VIEWPORT_PAD - width;
      }
      left = Math.max(VIEWPORT_PAD, Math.min(left, vw - VIEWPORT_PAD - width));

      // Vertically center the card on the swatch, then clamp to viewport.
      let top = rect.top + rect.height / 2 - height / 2;
      top = Math.max(VIEWPORT_PAD, Math.min(top, vh - VIEWPORT_PAD - height));

      setPosition({ top, left });
    };
    place();
    // Second pass after the picker mounts so we use its real measured height.
    const frame = requestAnimationFrame(place);
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  return (
    <div className="color-control">
      <button
        ref={swatchRef}
        type="button"
        className="color-swatch"
        style={swatchStyle}
        aria-label={label}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {value === "transparent" && !gradient && <span className="transparent-grid" />}
      </button>
      {open && (
        <ColorPicker
          value={value}
          onChange={onChange}
          alpha={alpha}
          onAlphaChange={onAlphaChange}
          supportsAlpha={supportsAlpha}
          gradient={supportsGradient ? gradient : undefined}
          onGradientChange={onGradientChange}
          supportsGradient={supportsGradient}
          onClose={() => setOpen(false)}
          position={position}
        />
      )}
      {/* Hidden native input for accessibility tooling + keyboard users who
          prefer the OS picker. Keeps the existing test contract intact. */}
      <input
        type="color"
        className="color-control-fallback"
        value={value === "transparent" ? "#18171a" : value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={label}
        tabIndex={-1}
      />
    </div>
  );
};
