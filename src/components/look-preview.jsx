// Mini globe rendering inside each looks-chip — a small SVG silhouette of a
// globe with continent-shaped dot clusters in each preset's color palette
// and shape. Effect-specific accents (bloom halo, scanlines, glitch
// RGB-split, etc.) hint at the look. Sized to fill the 40×40 chip-preview
// square; the chip's overflow: hidden + 10px border-radius does the
// rounded-corner clipping so this SVG can render edge-to-edge.

import { memo, useId } from "react";
import {
  createDiamondPoints,
  createHexagonPoints,
  createPlusPointArray,
  createRegularPolygonPointArray,
  createStarPointArray,
  formatPointList,
} from "../utils/svg-shapes.js";

// Dot positions in unit space (0–1) — hand-placed continent silhouettes
// viewed from roughly 0° longitude, so the chip reads as a recognisable
// globe rather than a generic dot blob. Coverage is dense enough that
// even at the chip's tiny rendered size (30 × 30 viewBox scaled into a
// 40 × 40 cell, ≈1.33×) the continent shapes are legible.
const GLOBE_DOTS = [
  // ─── Eurasia (top-right swath) ───
  // Europe
  [0.46, 0.32], [0.5, 0.31], [0.53, 0.32], [0.48, 0.34], [0.51, 0.34], [0.54, 0.35],
  // Russia / North Asia
  [0.56, 0.3], [0.6, 0.3], [0.64, 0.31], [0.68, 0.33], [0.72, 0.36],
  [0.58, 0.33], [0.62, 0.33], [0.66, 0.34], [0.7, 0.37], [0.74, 0.39],
  // China / Mongolia
  [0.6, 0.38], [0.64, 0.38], [0.68, 0.4], [0.72, 0.42],
  [0.62, 0.42], [0.66, 0.43], [0.7, 0.45],
  // Middle East
  [0.54, 0.4], [0.56, 0.42], [0.58, 0.44],
  // India
  [0.6, 0.46], [0.62, 0.48], [0.58, 0.48],
  // Southeast Asia
  [0.66, 0.48], [0.68, 0.5], [0.7, 0.52], [0.72, 0.5],

  // ─── Africa (vertical strip in centre) ───
  // North Africa
  [0.5, 0.45], [0.52, 0.45], [0.54, 0.46],
  [0.5, 0.48], [0.52, 0.48], [0.54, 0.48],
  // Sahara / Sahel
  [0.48, 0.5], [0.5, 0.5], [0.52, 0.51], [0.55, 0.52],
  // Equatorial / Central
  [0.49, 0.54], [0.51, 0.54], [0.53, 0.55],
  [0.48, 0.57], [0.5, 0.58], [0.52, 0.58],
  // Southern Africa
  [0.5, 0.62], [0.52, 0.63], [0.49, 0.65], [0.51, 0.66],
  [0.5, 0.69],
  // Madagascar
  [0.55, 0.62],

  // ─── Americas (thin curve down the left) ───
  // North America (broad top)
  [0.22, 0.32], [0.25, 0.32], [0.28, 0.32], [0.31, 0.34],
  [0.24, 0.35], [0.27, 0.35], [0.3, 0.36],
  [0.25, 0.38], [0.28, 0.38], [0.3, 0.4],
  [0.27, 0.41], [0.29, 0.42], [0.31, 0.43],
  [0.3, 0.45], [0.32, 0.46],
  // Central America (thin)
  [0.31, 0.49], [0.33, 0.5],
  // South America (tapering)
  [0.31, 0.54], [0.33, 0.55],
  [0.32, 0.58], [0.34, 0.59],
  [0.32, 0.62], [0.34, 0.64],
  [0.33, 0.66], [0.34, 0.69], [0.33, 0.72],

  // ─── Australia + Oceania ───
  [0.7, 0.62], [0.74, 0.62], [0.72, 0.64], [0.76, 0.64], [0.74, 0.66],
  // New Zealand
  [0.78, 0.68],

  // ─── Antarctica edge along the bottom ───
  [0.42, 0.78], [0.48, 0.79], [0.54, 0.79], [0.6, 0.78],
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
  // Slightly larger than the original 0.55 so the dots stay visible at
  // the chip's actual rendered size (≈1.33 viewBox units per CSS pixel).
  const r = 0.7;
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

// Halftone — uniform grid of dots covering the entire sphere edge-to-
// edge with NO opacity falloff. Matches the actual halftone pass which
// downsamples to a constant-radius dot grid regardless of surface
// curvature. The clipPath does the sphere-shape clipping; everything
// inside reads as a flat halftone plate, just like the still.
const renderHalftonePattern = (clipId, color = "#ffffff", sphereCx = 15, sphereCy = 15, sphereR = 13) => {
  const dots = [];
  const spacing = 1.4;
  const dotR = 0.48;
  for (let row = 0; row < 26; row += 1) {
    for (let col = 0; col < 26; col += 1) {
      const x = col * spacing;
      const y = row * spacing;
      const dx = x - sphereCx;
      const dy = y - sphereCy;
      if (Math.sqrt(dx * dx + dy * dy) > sphereR) continue;
      dots.push(
        <circle
          key={`h${row}-${col}`}
          cx={x.toFixed(2)}
          cy={y.toFixed(2)}
          r={dotR}
          fill={color}
          opacity="0.92"
        />,
      );
    }
  }
  return <g clipPath={`url(#${clipId})`}>{dots}</g>;
};

// Pixel — coarse square cells where the lit cells trace the continent
// shapes (using the VISIBLE_DOTS pattern as a hit-test) instead of a
// uniform "everything's lit" grid. Matches how the actual pixel pass
// preserves the underlying dot field's geometry while downsampling to
// chunky squares. Ocean cells stay empty / very dim so the continent
// silhouette pops.
const renderPixelGrid = (clipId, color = "#ffffff", sphereCx = 15, sphereCy = 15, sphereR = 13) => {
  const cells = [];
  const cellSize = 1.3;
  const gap = 0.14;
  // Pre-convert VISIBLE_DOTS to viewBox-space points centred on the
  // sphere so the hit-test below can match them quickly.
  const landPts = VISIBLE_DOTS.map(([x, y]) => [
    sphereCx + (x - 0.5) * sphereR * 2,
    sphereCy + (y - 0.5) * sphereR * 2,
  ]);
  for (let row = -2; row < 25; row += 1) {
    for (let col = -2; col < 25; col += 1) {
      const x = col * cellSize;
      const y = row * cellSize;
      const cx = x + cellSize * 0.5;
      const cy = y + cellSize * 0.5;
      const dx = cx - sphereCx;
      const dy = cy - sphereCy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > sphereR) continue;
      // Squared distance to the nearest continent dot. Threshold of 3.3
      // (≈ 1.8 viewBox units) so cells "between" two adjacent continent
      // dots are still counted as land — gives a much fuller continent
      // silhouette than a tighter threshold would.
      let nearest = Infinity;
      for (let i = 0; i < landPts.length; i += 1) {
        const lx = landPts[i][0] - cx;
        const ly = landPts[i][1] - cy;
        const d = lx * lx + ly * ly;
        if (d < nearest) nearest = d;
      }
      const isLand = nearest < 3.3;
      const opacity = isLand ? 0.96 : 0.2;
      cells.push(
        <rect
          key={`px${row}-${col}`}
          x={x.toFixed(2)}
          y={y.toFixed(2)}
          width={cellSize - gap}
          height={cellSize - gap}
          fill={color}
          opacity={opacity}
        />,
      );
    }
  }
  return (
    <g clipPath={`url(#${clipId})`} pointerEvents="none">
      {cells}
    </g>
  );
};

// Corrupt — primary-palette blocks with horizontal row shifts. Matches
// the 8-colour binary-quantised look of the corrupt shader (K, R, G, B,
// Y, C, M, W). Weighted heavily toward blue + black to echo the
// reference screenshot. Per-row x-offset gives the sliced /
// displaced read; cell sizes are uniform.
const CORRUPT_PALETTE = [
  null,         // K — transparent so the chip's frame background shows
  "#ff3030",    // R
  "#39ff14",    // G
  "#1e7bff",    // B
  "#ffe800",    // Y
  "#00f3ff",    // C
  "#ff5cff",    // M
  "#ffffff",    // W
];

// Deterministic pseudo-random in [0, 1) for stable preview rendering.
const corruptHash = (n) => {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
};

const renderCorruptBlocks = (clipId, sphereCx = 15, sphereCy = 15, sphereR = 13) => {
  const cells = [];
  // Smaller blocks + horizontal streaks: every ~3rd row gets a wider
  // cascading streak to mimic the actual corrupt shader's row-shift
  // smearing seen in the reference still. Block height stays small so
  // we get many bands of colour rather than chunky squares.
  const blockH = 1.1;
  const baseW = 1.6;
  for (let row = -3; row < 28; row += 1) {
    const rowSeed = corruptHash(row * 17.3);
    const rowShift = (rowSeed - 0.5) * 3.6;
    // Every few rows: a horizontal cascade — many narrow horizontally-
    // adjacent cells get the SAME colour, smearing the row.
    const cascade = corruptHash(row * 9.97) > 0.78;
    let runColor = null;
    let runRemaining = 0;
    for (let col = -3; col < 28; col += 1) {
      const x = col * baseW + rowShift;
      const y = row * blockH;
      const cxCell = x + baseW * 0.5;
      const cyCell = y + blockH * 0.5;
      const dx = cxCell - sphereCx;
      const dy = cyCell - sphereCy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > sphereR) continue;

      const seed = corruptHash(row * 31.71 + col * 53.13);
      let fill;
      if (cascade && runRemaining > 0) {
        // Continue the cascade run with the same colour.
        fill = runColor;
        runRemaining -= 1;
      } else {
        // Palette weighting — heavy on blue + black + white, rest thin
        // across the primaries. Matches the deep-blue-dominant
        // reference still.
        let idx;
        if (seed < 0.42) idx = 3;        // B
        else if (seed < 0.6) idx = 0;    // K
        else if (seed < 0.72) idx = 7;   // W
        else if (seed < 0.82) idx = 1;   // R
        else if (seed < 0.9) idx = 4;    // Y
        else if (seed < 0.95) idx = 2;   // G
        else if (seed < 0.98) idx = 5;   // C
        else idx = 6;                     // M
        fill = CORRUPT_PALETTE[idx];
        if (cascade && fill) {
          // Start a 3–6 cell horizontal run with this colour.
          runColor = fill;
          runRemaining = 2 + Math.floor(corruptHash(row * 7 + col) * 4);
        }
      }
      if (!fill) continue;
      cells.push(
        <rect
          key={`co${row}-${col}`}
          x={x.toFixed(2)}
          y={y.toFixed(2)}
          width={baseW - 0.12}
          height={blockH - 0.12}
          fill={fill}
        />,
      );
    }
  }
  // Subtle scanline darkening on top of the blocks.
  const scans = [];
  for (let y = 0; y < 30; y += 2.2) {
    scans.push(
      <rect key={`cs${y}`} x="-4" y={y} width="40" height="0.5" fill="rgba(0, 0, 0, 0.32)" />,
    );
  }
  return (
    <g clipPath={`url(#${clipId})`} pointerEvents="none">
      {cells}
      {scans}
    </g>
  );
};

// Bad TV — analog VHS distortion. Two horizontal "tear" bands (where
// the noise-driven UV jitter from the shader would be at its strongest)
// + a layer of white-noise specks scattered across the sphere
// (the "snow" the shader's random1d-driven grain overlay paints on
// the actual canvas). Sits on TOP of the regular continent dots so
// the underlying globe still reads through the noise — same as the
// shader, which distorts the source rather than replacing it.
const renderBadTvOverlay = (clipId) => {
  const speckles = [];
  // 90 speckles spread across the full 30 × 30 viewBox — the clipPath
  // crops them to the sphere. Mix of white + faint chroma (red / cyan)
  // for analog colour-noise variety.
  for (let i = 0; i < 90; i += 1) {
    const h1 = corruptHash(i * 7.13);
    const h2 = corruptHash(i * 13.97);
    const h3 = corruptHash(i * 23.71);
    const x = h1 * 30;
    const y = h2 * 30;
    const size = 0.32 + h3 * 0.45;
    const opacity = 0.38 + h3 * 0.5;
    // Most speckles white; ~15 % drift toward red, ~15 % toward cyan
    // for that VHS chroma-noise feel.
    let fill = "#ffffff";
    if (h3 < 0.15) fill = "#ff7878";
    else if (h3 < 0.3) fill = "#78d8ff";
    speckles.push(
      <rect
        key={`bt${i}`}
        x={x.toFixed(2)}
        y={y.toFixed(2)}
        width={size.toFixed(2)}
        height={size.toFixed(2)}
        fill={fill}
        opacity={opacity.toFixed(2)}
      />,
    );
  }
  return (
    <g clipPath={`url(#${clipId})`} pointerEvents="none">
      {/* Two horizontal tear bands where the UV-jitter would smear the
          image — bright white seam plus a wider dimmer band that
          suggests a vertical hold problem. */}
      <rect x="-2" y="9.2" width="34" height="1.1" fill="rgba(255, 255, 255, 0.55)" />
      <rect x="-2" y="10.5" width="34" height="0.4" fill="rgba(0, 0, 0, 0.45)" />
      <rect x="-2" y="19.5" width="34" height="0.8" fill="rgba(255, 255, 255, 0.4)" />
      {speckles}
      {/* Faint scanline lattice on top of everything else. */}
      {[4, 7, 10, 13, 16, 19, 22, 25].map((y, i) => (
        <line key={`bts${i}`} x1="-2" y1={y} x2="32" y2={y} stroke="rgba(255, 255, 255, 0.08)" strokeWidth="0.4" />
      ))}
    </g>
  );
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
      <circle cx="15" cy="15" r="13" fill="rgba(248, 244, 232, 0.95)" />
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
  if (shaderEffect === "pixel") {
    return renderPixelGrid(clipId, dotColor);
  }
  if (shaderEffect === "corrupt") {
    return renderCorruptBlocks(clipId);
  }
  if (shaderEffect === "badtv") {
    return renderBadTvOverlay(clipId);
  }
  if (shaderEffect === "metal") {
    return renderMetalSheen(clipId);
  }
  if (shaderEffect === "pencil") {
    return renderPencilHatch(clipId);
  }
  if (shaderEffect === "crt") {
    // Dense scanlines (every 1.4 viewBox units, matches the still's tube
    // texture) + RGB chromatic ghost on the actual continent dots (not
    // just the sphere silhouette) + radial vignette darkening the limb.
    // The continent ghosts use VISIBLE_DOTS so each dot gets a red copy
    // shifted right and a cyan copy shifted left — the same trinitron
    // shadow-mask fringe the canvas pass produces.
    const lines = [];
    for (let y = 1; y < 30; y += 1.4) {
      lines.push(
        <line
          key={`crts${y.toFixed(1)}`}
          x1="-2"
          y1={y}
          x2="32"
          y2={y}
          stroke="rgba(255,255,255,0.28)"
          strokeWidth="0.45"
        />,
      );
    }
    const ghosts = VISIBLE_DOTS.map(([ux, uy], i) => {
      const px = 15 + (ux - 0.5) * 26;
      const py = 15 + (uy - 0.5) * 26;
      return (
        <g key={`crtg${i}`}>
          <circle cx={px + 0.7} cy={py} r="0.55" fill="#ff3838" opacity="0.85" />
          <circle cx={px - 0.7} cy={py} r="0.55" fill="#34d0ff" opacity="0.85" />
        </g>
      );
    });
    return (
      <g pointerEvents="none">
        <radialGradient id={`crtVig-${clipId}`} cx="0.5" cy="0.5" r="0.55">
          <stop offset="0.45" stopColor="rgba(0,0,0,0)" />
          <stop offset="1" stopColor="rgba(0,0,0,0.55)" />
        </radialGradient>
        <circle cx="15" cy="15" r="13" fill={`url(#crtVig-${clipId})`} />
        <g clipPath={`url(#${clipId})`}>{ghosts}</g>
        {lines}
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

// Bloom: dramatic layered halo — five concentric glow rings + an inner
// hot rim, all in dot colour, so the chip reads as the strong aurora
// the still shows. Drawn underneath the dots so the dots themselves
// punch through brightly.
const renderBloomHalo = (cx, cy, radius, dotColor) => (
  <g pointerEvents="none">
    <circle cx={cx} cy={cy} r={radius + 16} fill={dotColor} opacity="0.04" />
    <circle cx={cx} cy={cy} r={radius + 11} fill={dotColor} opacity="0.08" />
    <circle cx={cx} cy={cy} r={radius + 7} fill={dotColor} opacity="0.16" />
    <circle cx={cx} cy={cy} r={radius + 4} fill={dotColor} opacity="0.28" />
    <circle cx={cx} cy={cy} r={radius + 1.5} fill={dotColor} opacity="0.42" />
    {/* Inner bright rim — sits just inside the silhouette so the
        sphere edge itself has a hot glowing band. */}
    <circle
      cx={cx}
      cy={cy}
      r={radius - 0.8}
      fill="none"
      stroke={dotColor}
      strokeWidth="1.6"
      strokeOpacity="0.32"
    />
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

  // Sphere centred in the 30 × 30 viewBox with breathing room on every
  // side. Matches how the actual canvas renders the globe (centred with
  // halo / vignette around it), so the chip reads as a true miniature
  // of the rendered scene rather than a cropped fragment.
  const cx = 15;
  const cy = 15;
  const radius = 13;

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
  // or pixel pass is on, in which case the dedicated grid overlay
  // replaces the continent-shaped clusters. For the edge / wireframe
  // pass, dots render as open ring outlines (no fill) so the chip reads
  // as a wire-traced surface rather than filled landmasses.
  const isHalftone = shaderEffect === "halftone";
  const isPixel = shaderEffect === "pixel";
  const isCorrupt = shaderEffect === "corrupt";
  const isEdge = shaderEffect === "edge";
  const dots = (isHalftone || isPixel || isCorrupt)
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

  // Stroke opacity for the sphere outline + graticule. Bumped for the
  // wireframe pass (so the chip reads as a wire-traced globe), kept
  // subtle elsewhere so the dots / shader overlay remain the focus.
  // The graticule (equator + tropics + central meridian) is skipped
  // entirely under "replacement" shader passes (halftone, pixel, corrupt,
  // metal, pencil) because those fill the sphere on their own and the
  // extra lines would just compete with the shader.
  const latStrokeOpacity = isEdge ? 0.46 : 0.16;
  const sphereStrokeOpacity = isEdge ? 0.55 : 0.22;
  const showGraticule =
    !isHalftone && !isPixel && !isCorrupt && shaderEffect !== "metal" && shaderEffect !== "pencil";

  return (
    <g className="globe-preview-content">
      {isSpace && renderStars(14, 23)}
      {/* Subtle radial shading on the sphere — bright at the upper-left,
          fading to a tiny shadow at the lower-right. Sells the volume
          without any 3D lighting. */}
      <radialGradient
        id={`globeShade-${clipId}`}
        cx="0.32"
        cy="0.3"
        r="0.85"
        fx="0.32"
        fy="0.3"
      >
        <stop offset="0" stopColor={dotColor} stopOpacity="0.14" />
        <stop offset="0.55" stopColor={dotColor} stopOpacity="0.04" />
        <stop offset="1" stopColor="#000000" stopOpacity="0.45" />
      </radialGradient>
      <circle cx={cx} cy={cy} r={radius} fill={`url(#globeShade-${clipId})`} />

      {shaderEffect === "bloom" && renderBloomHalo(cx, cy, radius, dotColor)}

      {/* Sphere silhouette */}
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill="none"
        stroke={dotColor}
        strokeWidth="0.4"
        strokeOpacity={sphereStrokeOpacity}
      />

      {showGraticule && (
        <g className="globe-preview-graticule" pointerEvents="none">
          {/* Tropic of Cancer (~23°N) */}
          <ellipse
            cx={cx}
            cy={cy - radius * 0.42}
            rx={radius * 0.91}
            ry={radius * 0.17}
            fill="none"
            stroke={dotColor}
            strokeWidth="0.28"
            strokeOpacity={latStrokeOpacity * 0.7}
          />
          {/* Equator */}
          <ellipse
            cx={cx}
            cy={cy}
            rx={radius}
            ry={radius * 0.26}
            fill="none"
            stroke={dotColor}
            strokeWidth="0.3"
            strokeOpacity={latStrokeOpacity}
          />
          {/* Tropic of Capricorn (~23°S) */}
          <ellipse
            cx={cx}
            cy={cy + radius * 0.42}
            rx={radius * 0.91}
            ry={radius * 0.17}
            fill="none"
            stroke={dotColor}
            strokeWidth="0.28"
            strokeOpacity={latStrokeOpacity * 0.7}
          />
          {/* Central meridian — vertical ellipse running pole to pole */}
          <ellipse
            cx={cx}
            cy={cy}
            rx={radius * 0.38}
            ry={radius}
            fill="none"
            stroke={dotColor}
            strokeWidth="0.28"
            strokeOpacity={latStrokeOpacity * 0.8}
          />
        </g>
      )}

      {/* Wireframe-only extra meridian for a denser wire-traced look. */}
      {isEdge && (
        <ellipse
          cx={cx}
          cy={cy}
          rx={radius * 0.72}
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

// Wrapped in React.memo because chip presets are module-scoped (defined in
// look-presets.js) — every render passes the exact same preset reference,
// so shallow equality short-circuits every re-render the looks bar would
// otherwise propagate when an unrelated piece of app state changes. With 11
// chips visible at once and the surrounding control panel re-rendering on
// every slider tick, this is a big React-side win.
const LookPreviewInner = ({ preset }) => {
  // Each chip renders its own <clipPath>; without a unique id every chip on the
  // looks bar would share the same DOM id, so url(#…) refs resolve ambiguously.
  const reactId = useId();
  const clipId = `globeClip-${reactId.replace(/:/g, "")}`;

  // If the preset carries a `previewImage` path, render that bitmap
  // instead of the SVG approximation — pixel-perfect representation of
  // an actual canvas screenshot. Falls back to the SVG render below if
  // the field is missing or the image fails to load.
  if (preset.previewImage) {
    return (
      <span className="looks-chip-preview" aria-hidden="true">
        <img
          className="looks-chip-preview-image"
          src={preset.previewImage}
          alt=""
          loading="lazy"
          draggable="false"
          // If a file is missing the image stays invisible (alt="" means
          // no broken-image text) — the chip falls back to just its
          // black backdrop. Replace the path or remove the field in
          // look-presets.js to switch back to the SVG render.
          onError={(event) => {
            // Hide the broken-image icon so the chip doesn't show a
            // grey placeholder when the file isn't found.
            event.currentTarget.style.display = "none";
          }}
        />
      </span>
    );
  }

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
            <circle cx="15" cy="15" r="13" />
          </clipPath>
        </defs>
        {renderContent(preset, clipId)}
      </svg>
    </span>
  );
};

export const LookPreview = memo(LookPreviewInner);
