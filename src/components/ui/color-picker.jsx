import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "../icons.jsx";
import {
  hexToRgb,
  hsbToRgb,
  hslToRgb,
  isValidHex,
  normalizeHex,
  rgbToHex,
  rgbToHsb,
  rgbToHsl,
} from "../../utils/color.js";

const MODES = ["HEX", "RGB", "HSB", "HSL"];

const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

// 0–1 alpha → 2-char hex byte for #RRGGBBAA strings.
const alphaToHexByte = (a) =>
  Math.round(Math.max(0, Math.min(1, a ?? 1)) * 255).toString(16).padStart(2, "0");

// Checkerboard tile painted behind any color/gradient preview that can be
// semi-transparent. Reads as the canonical "this area is transparent" cue.
const CHECKERBOARD_PATTERN =
  "conic-gradient(rgba(255, 255, 255, 0.7) 25%, rgba(150, 150, 150, 0.7) 0 50%, rgba(255, 255, 255, 0.7) 0 75%, rgba(150, 150, 150, 0.7) 0)";

export const ColorPicker = ({
  value,
  onChange,
  onClose,
  position = null,
  supportsAlpha = false,
  alpha = 1,
  onAlphaChange,
  supportsGradient = false,
  gradient = null,
  onGradientChange,
}) => {
  const initialHex = value && value !== "transparent" ? normalizeHex(value) : "#ffffff";
  const [hsb, setHsb] = useState(() => rgbToHsb(hexToRgb(initialHex)));
  const [hex, setHex] = useState(initialHex);
  const [mode, setMode] = useState("HEX");
  // When the picker is opened on a gradient-capable swatch, the user can flip
  // between "Solid" (paints the regular dotColor) and "Gradient" (writes to
  // the separate dotGradient prop). The currently-edited stop is tracked so
  // the SV grid / sliders edit the right end of the gradient.
  const [fillMode, setFillMode] = useState(supportsGradient && gradient ? "gradient" : "solid");
  const [activeStop, setActiveStop] = useState("from");
  const popoverRef = useRef(null);
  const svRef = useRef(null);
  const draggingRef = useRef(false);
  // Card position. Initialized from the parent-provided `position` (computed
  // relative to the swatch) and then becomes user-controlled once they drag
  // the header. Stored locally so a drag survives unrelated re-renders.
  const [dragPosition, setDragPosition] = useState(position);
  const dragStateRef = useRef(null);
  useEffect(() => {
    if (!dragStateRef.current && position) setDragPosition(position);
  }, [position]);

  // Source of truth for what the SV grid + hue slider edit. In gradient mode
  // this is the currently-active stop's color; in solid mode it's the
  // dotColor itself.
  const editedHex = fillMode === "gradient" && gradient
    ? normalizeHex(gradient[activeStop] || "#ffffff")
    : hex;

  // Sync local hex/hsb when (a) the parent solid value changes externally
  // (preset click, shuffle), or (b) the user switches gradient stops.
  useEffect(() => {
    const next = editedHex;
    if (!next) return;
    if (next === hex) return;
    setHex(next);
    setHsb(rgbToHsb(hexToRgb(next)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editedHex]);

  const commit = useCallback((nextHsb) => {
    const rgb = hsbToRgb(nextHsb);
    const nextHex = rgbToHex(rgb);
    setHsb(nextHsb);
    setHex(nextHex);
    if (fillMode === "gradient" && gradient && onGradientChange) {
      onGradientChange({ ...gradient, [activeStop]: nextHex });
    } else {
      onChange(nextHex);
    }
  }, [activeStop, fillMode, gradient, onChange, onGradientChange]);

  const updateFromPointer = useCallback((event) => {
    const node = svRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const x = clamp(event.clientX - rect.left, 0, rect.width);
    const y = clamp(event.clientY - rect.top, 0, rect.height);
    const s = Math.round((x / rect.width) * 100);
    const v = Math.round(100 - (y / rect.height) * 100);
    commit({ ...hsb, s, v });
  }, [commit, hsb]);

  const handlePointerDown = (event) => {
    event.preventDefault();
    draggingRef.current = true;
    svRef.current?.setPointerCapture?.(event.pointerId);
    updateFromPointer(event);
  };

  const handlePointerMove = (event) => {
    if (!draggingRef.current) return;
    updateFromPointer(event);
  };

  const handlePointerUp = (event) => {
    draggingRef.current = false;
    svRef.current?.releasePointerCapture?.(event.pointerId);
  };

  // Keyboard alternative for the 2D saturation/value square (WCAG 2.5.7
  // Dragging Movements + 2.1.1 Keyboard). Arrow keys step ±1, Shift+Arrow
  // steps ±10, Home/End jump to saturation min/max, PageUp/PageDown jump
  // to value min/max. The aria-valuetext on the container announces the
  // current S/V as a percent so screen readers narrate changes live.
  const handleSvKeyDown = (event) => {
    const big = event.shiftKey ? 10 : 1;
    let { s, v } = hsb;
    let handled = true;
    switch (event.key) {
      case "ArrowLeft": s = Math.max(0, s - big); break;
      case "ArrowRight": s = Math.min(100, s + big); break;
      case "ArrowUp": v = Math.min(100, v + big); break;
      case "ArrowDown": v = Math.max(0, v - big); break;
      case "Home": s = 0; break;
      case "End": s = 100; break;
      case "PageUp": v = 100; break;
      case "PageDown": v = 0; break;
      default: handled = false;
    }
    if (handled) {
      event.preventDefault();
      commit({ ...hsb, s, v });
    }
  };

  useEffect(() => {
    const onKey = (event) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose?.();
      }
    };
    const onPointerDown = (event) => {
      if (!popoverRef.current?.contains(event.target)) {
        onClose?.();
      }
    };
    window.addEventListener("keydown", onKey);
    // Defer to next tick so the click that opened the picker doesn't
    // immediately close it.
    const id = window.setTimeout(() => {
      window.addEventListener("mousedown", onPointerDown, true);
    }, 0);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("mousedown", onPointerDown, true);
      window.clearTimeout(id);
    };
  }, [onClose]);

  const emitColor = (nextHex) => {
    if (fillMode === "gradient" && gradient && onGradientChange) {
      onGradientChange({ ...gradient, [activeStop]: nextHex });
    } else {
      onChange(nextHex);
    }
  };

  const onHexInput = (event) => {
    const next = event.target.value;
    setHex(next.startsWith("#") ? next : `#${next}`);
    if (isValidHex(next)) {
      const normalized = normalizeHex(next);
      const nextHsb = rgbToHsb(hexToRgb(normalized));
      setHsb(nextHsb);
      emitColor(normalized);
    }
  };

  const rgb = hsbToRgb(hsb);
  const hsl = rgbToHsl(rgb);

  const updateRgb = (key, raw) => {
    const n = clamp(parseInt(raw, 10) || 0, 0, 255);
    const next = { ...rgb, [key]: n };
    const nextHex = rgbToHex(next);
    setHex(nextHex);
    setHsb(rgbToHsb(next));
    emitColor(nextHex);
  };

  const updateHsbField = (key, raw) => {
    const max = key === "h" ? 360 : 100;
    const n = clamp(parseInt(raw, 10) || 0, 0, max);
    commit({ ...hsb, [key]: n });
  };

  const updateHsl = (key, raw) => {
    const max = key === "h" ? 360 : 100;
    const n = clamp(parseInt(raw, 10) || 0, 0, max);
    const next = { ...hsl, [key]: n };
    const nextRgb = hslToRgb(next);
    const nextHex = rgbToHex(nextRgb);
    setHex(nextHex);
    setHsb(rgbToHsb(nextRgb));
    emitColor(nextHex);
  };

  const hueColor = `hsl(${hsb.h}, 100%, 50%)`;
  const svCursorLeft = `${hsb.s}%`;
  const svCursorTop = `${100 - hsb.v}%`;

  const body = typeof document !== "undefined" ? document.body : null;

  const enterGradientMode = () => {
    if (!onGradientChange) return;
    const next = gradient || {
      from: hex,
      to: rgbToHex(hsbToRgb({ h: (hsb.h + 180) % 360, s: hsb.s, v: hsb.v })),
      angle: 90,
    };
    onGradientChange(next);
    setFillMode("gradient");
    setActiveStop("from");
  };

  const exitGradientMode = () => {
    if (onGradientChange) onGradientChange(null);
    setFillMode("solid");
  };

  const updateGradientAngle = (raw) => {
    if (!gradient || !onGradientChange) return;
    const n = clamp(parseInt(raw, 10) || 0, 0, 360);
    onGradientChange({ ...gradient, angle: n });
  };

  // Midpoint shifts the 50/50 mix point of from/to along the gradient.
  // Stored as a 0–1 fraction (defaults to 0.5, identical to no midpoint).
  // Slider value is exposed as a 0–100 integer percentage for ergonomics.
  const updateGradientMidpoint = (raw) => {
    if (!gradient || !onGradientChange) return;
    const n = clamp(parseInt(raw, 10), 0, 100);
    onGradientChange({ ...gradient, midpoint: n / 100 });
  };

  // Alpha for the currently-edited target (solid color, or the active
  // gradient stop). Gradient alphas live on the gradient object, so each
  // stop has its own opacity that's interpolated per dot at render time.
  const editedAlpha = fillMode === "gradient" && gradient
    ? (activeStop === "from" ? (gradient.fromAlpha ?? 1) : (gradient.toAlpha ?? 1))
    : alpha;

  const updateAlpha = (next) => {
    const n = clamp(typeof next === "number" ? next : parseFloat(next) || 0, 0, 1);
    if (fillMode === "gradient" && gradient && onGradientChange) {
      const key = activeStop === "from" ? "fromAlpha" : "toAlpha";
      onGradientChange({ ...gradient, [key]: n });
    } else if (onAlphaChange) {
      onAlphaChange(n);
    }
  };

  // Drag the card around. Snapshot the cursor + current position on
  // pointerdown, then track deltas on move. Constrains to the viewport so
  // users can't lose the card off-screen.
  const handleHeaderPointerDown = (event) => {
    if (event.button !== 0) return;
    if (event.target.closest("button")) return;
    event.preventDefault();
    const start = dragPosition || { top: 0, left: 0 };
    const node = popoverRef.current;
    const rect = node?.getBoundingClientRect();
    dragStateRef.current = {
      startX: event.clientX,
      startY: event.clientY,
      startLeft: start.left,
      startTop: start.top,
      width: rect?.width || 0,
      height: rect?.height || 0,
    };
    document.body.style.userSelect = "none";
  };

  useEffect(() => {
    const onMove = (event) => {
      const state = dragStateRef.current;
      if (!state) return;
      const dx = event.clientX - state.startX;
      const dy = event.clientY - state.startY;
      const pad = 8;
      const left = clamp(
        state.startLeft + dx,
        pad,
        Math.max(pad, window.innerWidth - state.width - pad),
      );
      const top = clamp(
        state.startTop + dy,
        pad,
        Math.max(pad, window.innerHeight - state.height - pad),
      );
      setDragPosition({ top, left });
    };
    const onUp = () => {
      dragStateRef.current = null;
      document.body.style.userSelect = "";
    };
    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
    };
  }, []);

  const activePos = dragPosition || position;
  const content = (
    <div
      ref={popoverRef}
      className="color-picker"
      role="dialog"
      aria-label="Color picker"
      style={activePos ? { position: "fixed", top: activePos.top, left: activePos.left, right: "auto" } : undefined}
    >
      <header
        className="color-picker-header"
        onPointerDown={handleHeaderPointerDown}
        aria-label="Drag to move"
      >
        <span className="color-picker-grip" aria-hidden="true">
          <span /><span /><span /><span /><span /><span />
        </span>
        <h2 className="color-picker-title">
          {supportsGradient && fillMode === "gradient" ? "Gradient" : "Color"}
        </h2>
        <button
          type="button"
          className="color-picker-close"
          onClick={onClose}
          aria-label="Close color picker"
        >
          <X size={14} />
        </button>
      </header>
      <div className="color-picker-body">
      {supportsGradient && (
        <div
          className="color-picker-fill"
          role="tablist"
          aria-label="Fill type"
          data-active={fillMode}
        >
          <span className="color-picker-fill-indicator" aria-hidden="true" />
          <button
            type="button"
            role="tab"
            aria-selected={fillMode === "solid"}
            className={`color-picker-fill-tab ${fillMode === "solid" ? "is-active" : ""}`}
            onClick={exitGradientMode}
          >
            Solid
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={fillMode === "gradient"}
            className={`color-picker-fill-tab ${fillMode === "gradient" ? "is-active" : ""}`}
            onClick={enterGradientMode}
          >
            Gradient
          </button>
        </div>
      )}

      {fillMode === "gradient" && gradient && (() => {
        // Compose the live track preview with alpha-aware stops + a
        // checkerboard backdrop so transparency reads visually. When the
        // gradient has a midpoint, CSS color-hint syntax (a percentage
        // between two colors) shifts the transition's 50/50 mix point.
        const fromHex = `${gradient.from}${alphaToHexByte(gradient.fromAlpha ?? 1)}`;
        const toHex = `${gradient.to}${alphaToHexByte(gradient.toAlpha ?? 1)}`;
        const midpointPct = Math.round((gradient.midpoint ?? 0.5) * 100);
        const stops = midpointPct === 50
          ? `${fromHex}, ${toHex}`
          : `${fromHex}, ${midpointPct}%, ${toHex}`;
        const trackStyle = {
          backgroundImage: `linear-gradient(${gradient.angle ?? 90}deg, ${stops}), ${CHECKERBOARD_PATTERN}`,
          backgroundSize: "100% 100%, 12px 12px",
        };
        return (
          <div className="color-picker-gradient">
            <div
              className="color-picker-gradient-track"
              style={trackStyle}
              aria-hidden="true"
            />
            <div className="color-picker-stops" role="tablist" aria-label="Gradient stops">
              <button
                type="button"
                role="tab"
                className={`color-picker-stop ${activeStop === "from" ? "is-active" : ""}`}
                aria-selected={activeStop === "from"}
                onClick={() => setActiveStop("from")}
              >
                <span
                  className="color-picker-stop-swatch"
                  style={{
                    backgroundImage: `linear-gradient(${gradient.from}${alphaToHexByte(gradient.fromAlpha ?? 1)}, ${gradient.from}${alphaToHexByte(gradient.fromAlpha ?? 1)}), ${CHECKERBOARD_PATTERN}`,
                    backgroundSize: "100% 100%, 8px 8px",
                  }}
                  aria-hidden="true"
                />
                <span className="color-picker-stop-meta">
                  <span className="color-picker-stop-label">From</span>
                  <span className="color-picker-stop-value">{gradient.from}</span>
                </span>
              </button>
              <button
                type="button"
                role="tab"
                className={`color-picker-stop ${activeStop === "to" ? "is-active" : ""}`}
                aria-selected={activeStop === "to"}
                onClick={() => setActiveStop("to")}
              >
                <span
                  className="color-picker-stop-swatch"
                  style={{
                    backgroundImage: `linear-gradient(${gradient.to}${alphaToHexByte(gradient.toAlpha ?? 1)}, ${gradient.to}${alphaToHexByte(gradient.toAlpha ?? 1)}), ${CHECKERBOARD_PATTERN}`,
                    backgroundSize: "100% 100%, 8px 8px",
                  }}
                  aria-hidden="true"
                />
                <span className="color-picker-stop-meta">
                  <span className="color-picker-stop-label">To</span>
                  <span className="color-picker-stop-value">{gradient.to}</span>
                </span>
              </button>
            </div>
            <label className="color-picker-angle">
              <span>Angle</span>
              {/* These ranges share the global slider styles which paint
                  the track via a --fill CSS var (set by RangeControl
                  elsewhere). When --fill isn't set the track falls back
                  to a 50/50 gradient, so the filled segment looked
                  disconnected from the thumb at any non-50% value.
                  Setting --fill inline = thumb%-of-range fixes it. */}
              <input
                className="slider"
                type="range"
                min={0}
                max={360}
                step={1}
                value={gradient.angle ?? 90}
                style={{ "--fill": `${((gradient.angle ?? 90) / 360) * 100}%` }}
                aria-label="Gradient angle"
                onChange={(event) => updateGradientAngle(event.target.value)}
              />
              <output>{gradient.angle ?? 90}°</output>
            </label>
            <label className="color-picker-angle">
              <span>Midpoint</span>
              <input
                className="slider"
                type="range"
                min={0}
                max={100}
                step={1}
                value={midpointPct}
                style={{ "--fill": `${midpointPct}%` }}
                aria-label="Gradient midpoint"
                onChange={(event) => updateGradientMidpoint(event.target.value)}
              />
              <output>{midpointPct}%</output>
            </label>
          </div>
        );
      })()}

      <div
        ref={svRef}
        className="color-picker-sv"
        style={{ background: `linear-gradient(to top, #000, transparent), linear-gradient(to right, #fff, ${hueColor})` }}
        role="application"
        tabIndex={0}
        aria-label="Saturation and value. Arrow keys adjust, Shift for large steps."
        aria-valuetext={`Saturation ${hsb.s}%, value ${hsb.v}%`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onKeyDown={handleSvKeyDown}
      >
        <div
          className="color-picker-sv-cursor"
          style={{ left: svCursorLeft, top: svCursorTop, background: hex }}
        />
      </div>

      <div className="color-picker-hue">
        <input
          type="range"
          min={0}
          max={360}
          step={1}
          value={hsb.h}
          aria-label="Hue"
          onChange={(event) => commit({ ...hsb, h: Number(event.target.value) })}
        />
      </div>

      {(supportsAlpha || (fillMode === "gradient" && gradient)) && (
        <div
          className="color-picker-alpha"
          style={{
            // Color stripe under the slider — transparent on the left, opaque
            // on the right, atop a checkerboard so semi-transparent feels
            // real to the user.
            "--alpha-color": editedHex,
          }}
        >
          <input
            type="range"
            min={0}
            max={1}
            step={0.01}
            value={editedAlpha}
            aria-label="Opacity"
            onChange={(event) => updateAlpha(event.target.value)}
          />
        </div>
      )}

      <div className="color-picker-modes" role="tablist">
        {MODES.map((m) => (
          <button
            key={m}
            type="button"
            role="tab"
            aria-selected={mode === m}
            className={`color-picker-mode ${mode === m ? "is-active" : ""}`}
            onClick={() => setMode(m)}
          >
            {m}
          </button>
        ))}
      </div>

      <div className="color-picker-fields">
        {mode === "HEX" && (
          <label className="color-picker-field is-wide is-bare">
            <input
              type="text"
              value={hex}
              spellCheck={false}
              onChange={onHexInput}
              aria-label="Hex value"
            />
          </label>
        )}
        {mode === "RGB" && (
          <>
            <label className="color-picker-field">
              <span>R</span>
              <input type="number" min={0} max={255} value={rgb.r} onChange={(e) => updateRgb("r", e.target.value)} aria-label="Red 0-255" />
            </label>
            <label className="color-picker-field">
              <span>G</span>
              <input type="number" min={0} max={255} value={rgb.g} onChange={(e) => updateRgb("g", e.target.value)} aria-label="Green 0-255" />
            </label>
            <label className="color-picker-field">
              <span>B</span>
              <input type="number" min={0} max={255} value={rgb.b} onChange={(e) => updateRgb("b", e.target.value)} aria-label="Blue 0-255" />
            </label>
          </>
        )}
        {mode === "HSB" && (
          <>
            <label className="color-picker-field">
              <span>H</span>
              <input type="number" min={0} max={360} value={hsb.h} onChange={(e) => updateHsbField("h", e.target.value)} aria-label="Hue 0-360" />
            </label>
            <label className="color-picker-field">
              <span>S</span>
              <input type="number" min={0} max={100} value={hsb.s} onChange={(e) => updateHsbField("s", e.target.value)} aria-label="Saturation 0-100" />
            </label>
            <label className="color-picker-field">
              <span>B</span>
              <input type="number" min={0} max={100} value={hsb.v} onChange={(e) => updateHsbField("v", e.target.value)} aria-label="Brightness 0-100" />
            </label>
          </>
        )}
        {mode === "HSL" && (
          <>
            <label className="color-picker-field">
              <span>H</span>
              <input type="number" min={0} max={360} value={hsl.h} onChange={(e) => updateHsl("h", e.target.value)} aria-label="Hue 0-360" />
            </label>
            <label className="color-picker-field">
              <span>S</span>
              <input type="number" min={0} max={100} value={hsl.s} onChange={(e) => updateHsl("s", e.target.value)} aria-label="Saturation 0-100" />
            </label>
            <label className="color-picker-field">
              <span>L</span>
              <input type="number" min={0} max={100} value={hsl.l} onChange={(e) => updateHsl("l", e.target.value)} aria-label="Lightness 0-100" />
            </label>
          </>
        )}
      </div>

      </div>
    </div>
  );

  return body ? createPortal(content, body) : content;
};
