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
const renderHalftonePattern = (clipId, color = "#ffffff", sphereCx = 30, sphereCy = 15, sphereR = 18) => {
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

// Pencil sketch — two sets of crossing diagonal strokes clipped to the
// sphere, drawn in graphite tones on a paper-white background. Matches
// the cross-hatching aesthetic of the pencil shader.
const renderPencilHatch = (clipId) => {
  const lines = [];
  // First set: ~20° angle, denser
  for (let i = -8; i < 16; i += 1) {
    const y = i * 2.4;
    lines.push(
      <line
        key={`p1-${i}`}
        x1="-4"
        y1={y}
        x2="34"
        y2={y + 14}
        stroke="rgba(28, 22, 18, 0.55)"
        strokeWidth="0.5"
        strokeLinecap="round"
      />,
    );
  }
  // Second set: ~-30° angle, slightly less dense, lighter
  for (let i = -8; i < 16; i += 1) {
    const y = i * 2.8 + 4;
    lines.push(
      <line
        key={`p2-${i}`}
        x1="-4"
        y1={y}
        x2="34"
        y2={y - 18}
        stroke="rgba(28, 22, 18, 0.35)"
        strokeWidth="0.4"
        strokeLinecap="round"
      />,
    );
  }
  return (
    <>
      {/* Paper-white sphere underneath the hatching */}
      <circle cx="22" cy="15" r="14" fill="rgba(248, 244, 232, 0.95)" />
      <g clipPath={`url(#${clipId})`} pointerEvents="none">
        {lines}
      </g>
    </>
  );
};

// Metal / chrome — three horizontal layered bands across the sphere that
// suggest a polished reflective surface catching light. Clipped to the
// sphere so the bands wrap with the silhouette. Bright top, cool mid,
// dark bottom — the same metal ramp the GLSL pass uses.
const renderMetalSheen = (clipId) => (
  <g clipPath={`url(#${clipId})`} pointerEvents="none">
    <rect x="-2" y="-2" width="34" height="34" fill="rgba(220, 232, 245, 0.32)" />
    <rect x="-2" y="9" width="34" height="9" fill="rgba(110, 130, 160, 0.55)" />
    <rect x="-2" y="18" width="34" height="14" fill="rgba(20, 26, 38, 0.7)" />
    <rect x="-2" y="4" width="34" height="1.2" fill="rgba(255, 255, 255, 0.45)" />
    <rect x="-2" y="14" width="34" height="0.8" fill="rgba(255, 255, 255, 0.25)" />
  </g>
);

const renderEffectOverlay = (shaderEffect, clipId, dotColor) => {
  if (shaderEffect === "halftone") {
    return renderHalftonePattern(clipId, dotColor);
  }
  if (shaderEffect === "metal") {
    return renderMetalSheen(clipId);
  }
  if (shaderEffect === "pencil") {
    return renderPencilHatch(clipId);
  }
  if (shaderEffect === "crt") {
    // Scanlines across the full cell + a subtle vignette ring so the
    // chip reads as a CRT phosphor scan, not just a striped overlay.
    return (
      <g pointerEvents="none">
        {[3, 6, 9, 12, 15, 18, 21, 24, 27].map((y, i) => (
          <line key={i} x1="-2" y1={y} x2="32" y2={y} stroke="rgba(255,255,255,0.22)" strokeWidth="0.5" />
        ))}
      </g>
    );
  }
  if (shaderEffect === "glitch") {
    // Two bars of RGB split across the sphere band, plus a thin chroma
    // shift on the silhouette so the dots underneath read as misaligned.
    return (
      <g pointerEvents="none">
        <rect x="-2" y="10.5" width="34" height="1.2" fill="#ff5454" opacity="0.7" />
        <rect x="-2" y="18" width="34" height="1.2" fill="#3aa9ff" opacity="0.7" />
        <rect x="-2" y="13.5" width="34" height="0.5" fill="#ffffff" opacity="0.35" />
      </g>
    );
  }
  if (shaderEffect === "wave") {
    return (
      <path
        d="M -2 15 Q 4 12 10 15 T 22 15 T 34 15"
        fill="none"
        stroke="rgba(255,255,255,0.32)"
        strokeWidth="0.7"
      />
    );
  }
  return null;
};

// Bloom: oversized soft halo behind the sphere — rendered at a low
// opacity in the dot colour so it reads as a glowing aurora at the
// chip's scale. Separate from renderEffectOverlay because it draws
// underneath the dots, not above them.
const renderBloomHalo = (cx, cy, radius, dotColor) => (
  <g pointerEvents="none">
    <circle cx={cx} cy={cy} r={radius + 6} fill={dotColor} opacity="0.12" />
    <circle cx={cx} cy={cy} r={radius + 3} fill={dotColor} opacity="0.22" />
  </g>
);

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

  // Sphere shifted to the right side of the 30 × 30 viewBox so the
  // globe's right edge bleeds further off the cell while the left side
  // shows the limb curving in. y stays centred; radius still oversized
  // so all edges crop.
  const cx = 30;
  const cy = 15;
  const radius = 18;

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
  // continent-shaped clusters. For the edge / wireframe pass, dots
  // render as open ring outlines (no fill) so the chip reads as a
  // wire-traced surface rather than filled landmasses.
  const isHalftone = shaderEffect === "halftone";
  const isEdge = shaderEffect === "edge";
  const dots = isHalftone
    ? null
    : VISIBLE_DOTS.map(([x, y], i) => {
        const px = cx + (x - 0.5) * radius * 2;
        const py = cy + (y - 0.5) * radius * 2;
        if (isEdge) {
          // Open ring — outlined dot with no fill. Communicates the
          // edge-traced character at chip scale.
          return (
            <circle
              key={i}
              cx={px}
              cy={py}
              r={0.62}
              fill="none"
              stroke={dotColor}
              strokeWidth="0.32"
              strokeOpacity="0.95"
            />
          );
        }
        return renderShape(px, py, shape, dotColor, ascii, i);
      });

  // Latitude hint stroke is heavier on the wireframe preset so the chip
  // reads as a hatched / wire-traced globe rather than a faint sphere
  // outline with dots.
  const latStrokeOpacity = isEdge ? 0.42 : 0.18;
  const sphereStrokeOpacity = isEdge ? 0.55 : 0.25;

  return (
    <g>
      {isSpace && renderStars(14, 23)}
      {shaderEffect === "bloom" && renderBloomHalo(cx, cy, radius, dotColor)}
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill="none"
        stroke={dotColor}
        strokeWidth="0.4"
        strokeOpacity={sphereStrokeOpacity}
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
        strokeOpacity={latStrokeOpacity}
      />
      {/* Wireframe-only: extra meridian hint so it reads as a
          wire-traced surface. */}
      {isEdge && (
        <ellipse
          cx={cx}
          cy={cy}
          rx={radius * 0.45}
          ry={radius}
          fill="none"
          stroke={dotColor}
          strokeWidth="0.3"
          strokeOpacity={latStrokeOpacity}
        />
      )}
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

  return (
    <span className="looks-chip-preview" aria-hidden="true">
      <svg
        className="looks-chip-preview-globe"
        viewBox="0 0 30 30"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <clipPath id={clipId}>
            <circle cx="30" cy="15" r="18" />
          </clipPath>
        </defs>
        {renderContent(preset, clipId)}
      </svg>
    </span>
  );
};
