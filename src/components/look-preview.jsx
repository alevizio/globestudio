// Mini globe rendering inside each looks-chip — a small SVG silhouette of a
// globe with continent-shaped dot clusters in each preset's color palette
// and shape. Effect-specific accents (bloom halo, scanlines, glitch
// RGB-split, etc.) hint at the look. Sized to fill the 40×40 chip-preview
// square; the chip's overflow: hidden + 10px border-radius does the
// rounded-corner clipping so this SVG can render edge-to-edge.

import { useId } from "react";
import {
  createDiamondPoints,
  createHexagonPoints,
  createPlusPointArray,
  createRegularPolygonPointArray,
  createStarPointArray,
  formatPointList,
} from "../utils/svg-shapes.js";

// Dot positions in unit space (0–1). Loosely arranged to suggest the visible
// hemisphere of a globe (Eurasia + Africa + the Americas edge).
const GLOBE_DOTS = [
  // Eurasia
  [0.45, 0.36], [0.5, 0.32], [0.55, 0.34], [0.6, 0.38], [0.65, 0.42],
  [0.5, 0.4], [0.55, 0.42], [0.6, 0.45], [0.42, 0.45], [0.48, 0.48],
  // Africa
  [0.52, 0.55], [0.56, 0.6], [0.54, 0.68], [0.5, 0.62], [0.48, 0.7],
  // Americas edge
  [0.3, 0.4], [0.28, 0.5], [0.3, 0.6], [0.32, 0.7],
  // Asia / Australia
  [0.7, 0.5], [0.74, 0.55], [0.72, 0.65], [0.68, 0.62],
  // Scattered
  [0.4, 0.3], [0.62, 0.3], [0.45, 0.74], [0.6, 0.74],
];

const CONTINENT_PATH =
  "M 11 8 Q 13 6 16 7 Q 19 7 21 9 Q 22 12 20 14 Q 22 16 21 18 Q 19 20 16 19 Q 13 21 11 19 Q 8 17 9 14 Q 8 11 11 8 Z";

const dotIsInsideSphere = ([x, y]) => {
  const dx = x - 0.5;
  const dy = y - 0.5;
  return Math.sqrt(dx * dx + dy * dy) < 0.42;
};

const VISIBLE_DOTS = GLOBE_DOTS.filter(dotIsInsideSphere);

const renderShape = (cx, cy, shape, color, asciiSymbol, key) => {
  const r = 0.55;
  if (shape === "Square") {
    return <rect key={key} x={cx - r} y={cy - r} width={r * 2} height={r * 2} fill={color} />;
  }
  if (shape === "Hexagon") {
    return <polygon key={key} points={createHexagonPoints(cx, cy, r * 0.55)} fill={color} />;
  }
  if (shape === "Triangle") {
    return (
      <polygon
        key={key}
        points={formatPointList(createRegularPolygonPointArray(cx, cy, r * 1.1, 3))}
        fill={color}
      />
    );
  }
  if (shape === "Pentagon") {
    return (
      <polygon
        key={key}
        points={formatPointList(createRegularPolygonPointArray(cx, cy, r * 1.05, 5))}
        fill={color}
      />
    );
  }
  if (shape === "Diamond") {
    return <polygon key={key} points={createDiamondPoints(cx, cy, r)} fill={color} />;
  }
  if (shape === "Star") {
    return (
      <polygon
        key={key}
        points={formatPointList(createStarPointArray(cx, cy, r * 1.1, r * 0.52))}
        fill={color}
      />
    );
  }
  if (shape === "Plus") {
    return (
      <polygon key={key} points={formatPointList(createPlusPointArray(cx, cy, r * 0.85))} fill={color} />
    );
  }
  if (shape === "Ring") {
    return (
      <circle key={key} cx={cx} cy={cy} r={r * 0.78} fill="none" stroke={color} strokeWidth="0.22" />
    );
  }
  if (shape === "ASCII") {
    const ch = (asciiSymbol || "*").charAt(0);
    return (
      <text
        key={key}
        x={cx}
        y={cy + 0.5}
        fontSize="1.6"
        fontFamily="ui-monospace, Menlo, monospace"
        fontWeight="700"
        textAnchor="middle"
        fill={color}
      >
        {ch}
      </text>
    );
  }
  // Voxel and Particle Grid are too detailed to read at chip scale —
  // fall through to a clean circle so the preview stays legible.
  return <circle key={key} cx={cx} cy={cy} r={r} fill={color} />;
};

const Continent = ({ fill, stroke }) => (
  <path d={CONTINENT_PATH} fill={fill} stroke={stroke} strokeWidth="0.3" strokeLinejoin="round" />
);

// Tight grid of small dots with sizes that fall off toward the sphere's
// edge — the characteristic look of a halftone print plate. Iterates
// the full viewBox; the clipPath does the sphere-shape clipping so this
// works at any sphere position. Dot size still falls off radially from
// the sphere centre so the pattern reads as wrapping a curved surface.
const renderHalftonePattern = (clipId, color = "#ffffff", sphereCx = 22, sphereCy = 22, sphereR = 14) => {
  const dots = [];
  const spacing = 2.4;
  for (let row = 0; row < 14; row += 1) {
    for (let col = 0; col < 14; col += 1) {
      const x = 1.5 + col * spacing;
      const y = 1.5 + row * spacing;
      const dx = x - sphereCx;
      const dy = y - sphereCy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > sphereR) continue;
      // Larger dots toward the centre, smaller toward the silhouette.
      const r = 0.7 - (dist / sphereR) * 0.5;
      if (r < 0.1) continue;
      dots.push(
        <circle key={`h${row}-${col}`} cx={x} cy={y} r={r} fill={color} opacity="0.9" />,
      );
    }
  }
  return <g clipPath={`url(#${clipId})`}>{dots}</g>;
};

const renderEffectOverlay = (shaderEffect, clipId, dotColor) => {
  if (shaderEffect === "halftone") {
    return renderHalftonePattern(clipId, dotColor);
  }
  if (shaderEffect === "crt") {
    return (
      <g pointerEvents="none">
        {[5, 8, 11, 14, 17, 20, 23].map((y, i) => (
          <line key={i} x1="3" y1={y} x2="27" y2={y} stroke="rgba(255,255,255,0.18)" strokeWidth="0.6" />
        ))}
      </g>
    );
  }
  if (shaderEffect === "glitch") {
    return (
      <g pointerEvents="none">
        <rect x="3" y="11" width="24" height="1.2" fill="#ff5454" opacity="0.55" />
        <rect x="4" y="16" width="24" height="1.2" fill="#3aa9ff" opacity="0.55" />
      </g>
    );
  }
  if (shaderEffect === "wave") {
    return (
      <path
        d="M 2 15 Q 7 12 12 15 T 22 15 T 32 15"
        fill="none"
        stroke="rgba(255,255,255,0.28)"
        strokeWidth="0.6"
      />
    );
  }
  return null;
};

const renderStars = (count, seed) => {
  const stars = [];
  for (let i = 0; i < count; i++) {
    const k = seed + i;
    const x = Math.abs(Math.sin(k * 12.9898) * 43758.5453) % 1;
    const y = Math.abs(Math.sin(k * 78.233 + 1.3) * 43758.5453) % 1;
    const r = 0.15 + (Math.abs(Math.sin(k * 5.1) * 1000) % 1) * 0.25;
    const cx = x * 30;
    const cy = y * 30;
    const dx = cx - 15;
    const dy = cy - 15;
    if (Math.sqrt(dx * dx + dy * dy) < 13) continue;
    stars.push(<circle key={`s${i}`} cx={cx} cy={cy} r={r} fill="white" opacity="0.7" />);
  }
  return stars;
};

const renderContent = (preset, clipId) => {
  const { settings } = preset;
  const dotColor = settings.dotColor || "#ffffff";
  const shape = settings.shape || "Circle";
  const ascii = settings.asciiSymbol || "*";
  const renderMode = settings.renderMode || "dots";
  const shaderEffect = settings.shaderSettings?.effect;
  const isSpace = settings.backgroundStyle === "space";

  // Sphere shifted toward the bottom-right of the 30 × 30 viewBox so the
  // globe's lower-right quadrant extends past the visible area — the SVG
  // viewBox crops it cleanly, giving the chip a "this is a fragment of a
  // larger globe" feel rather than a centred miniature.
  const cx = 22;
  const cy = 22;
  const radius = 14;

  // Solid mode: filled continent
  if (renderMode === "solid") {
    return (
      <g>
        <circle cx={cx} cy={cy} r={radius} fill="rgba(0,0,0,0.18)" />
        <g transform={`translate(${cx - 15} ${cy - 15})`}>
          <Continent fill={settings.worldFill} stroke={settings.worldStroke} />
        </g>
      </g>
    );
  }

  // Dots mode: render dot pattern clipped to sphere — UNLESS the halftone
  // pass is on, in which case the halftone grid overlay replaces the
  // continent-shaped clusters so the preview reads as halftone print
  // rather than a halftone-tinted continent.
  const isHalftone = shaderEffect === "halftone";
  const dots = isHalftone
    ? null
    : VISIBLE_DOTS.map(([x, y], i) => {
        const px = cx + (x - 0.5) * radius * 2;
        const py = cy + (y - 0.5) * radius * 2;
        return renderShape(px, py, shape, dotColor, ascii, i);
      });

  return (
    <g>
      {isSpace && renderStars(14, 23)}
      {shaderEffect === "bloom" && (
        <circle cx={cx} cy={cy} r={radius + 4} fill={dotColor} opacity="0.18" />
      )}
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill="none"
        stroke={dotColor}
        strokeWidth="0.4"
        strokeOpacity="0.25"
      />
      {/* Latitude hint */}
      <ellipse
        cx={cx}
        cy={cy}
        rx={radius}
        ry={radius * 0.25}
        fill="none"
        stroke={dotColor}
        strokeWidth="0.3"
        strokeOpacity="0.18"
      />
      {dots && <g clipPath={`url(#${clipId})`}>{dots}</g>}
      {renderEffectOverlay(shaderEffect, clipId, dotColor)}
    </g>
  );
};

export const LookPreview = ({ preset }) => {
  // Each chip renders its own <clipPath>; without a unique id every chip on the
  // looks bar would share the same DOM id, so url(#…) refs resolve ambiguously.
  const reactId = useId();
  const clipId = `globeClip-${reactId.replace(/:/g, "")}`;

  // Outer frame uses the preset's primary fill (dotColor in dots mode,
  // worldFill in solid) — the coloured "card" backdrop the user asked
  // to keep, softened to a tint via color-mix. The inner globe SVG
  // renders on top of that tint with NO own background rect, so the
  // chip's tinted frame is what shows through behind the globe.
  const renderMode = preset.settings.renderMode || "dots";
  const frame = renderMode === "solid"
    ? preset.settings.worldFill || "#5a5a64"
    : preset.settings.dotColor || "#ffffff";

  const frameTint = `color-mix(in srgb, ${frame} 25%, transparent)`;

  return (
    <span
      className="looks-chip-preview"
      style={{ background: frameTint }}
      aria-hidden="true"
    >
      <svg
        className="looks-chip-preview-globe"
        viewBox="0 0 30 30"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <clipPath id={clipId}>
            <circle cx="22" cy="22" r="14" />
          </clipPath>
        </defs>
        {renderContent(preset, clipId)}
      </svg>
    </span>
  );
};
