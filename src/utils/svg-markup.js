import { CLICK_HIGHLIGHT } from "../config/constants.js";
import {
  DEFAULT_SHADER_SETTINGS,
  effectsWithScanlines,
} from "../config/shader-effects.js";
import { hexToRgb, rgbToHex } from "./color.js";
import { clampNumber, formatSvgNumber, hashString } from "./math.js";

// Mirrors three/globe.js's gradient sampler so the SVG export looks identical
// to the canvas. Each dot picks its color by projecting (x, y) onto the
// gradient's direction vector, normalized to the image's corner-to-corner span.
const buildSvgGradientSampler = (gradient, imageWidth, imageHeight) => {
  const angleRad = ((gradient.angle ?? 90) * Math.PI) / 180;
  const dirX = Math.sin(angleRad);
  const dirY = -Math.cos(angleRad);
  const corners = [
    [0, 0],
    [imageWidth, 0],
    [0, imageHeight],
    [imageWidth, imageHeight],
  ];
  let minProj = Infinity;
  let maxProj = -Infinity;
  corners.forEach(([x, y]) => {
    const p = x * dirX + y * dirY;
    if (p < minProj) minProj = p;
    if (p > maxProj) maxProj = p;
  });
  const range = Math.max(1e-6, maxProj - minProj);
  const from = hexToRgb(gradient.from);
  const to = hexToRgb(gradient.to);
  return (point) => {
    const proj = point.x * dirX + point.y * dirY;
    const t = Math.max(0, Math.min(1, (proj - minProj) / range));
    return rgbToHex({
      r: from.r + (to.r - from.r) * t,
      g: from.g + (to.g - from.g) * t,
      b: from.b + (to.b - from.b) * t,
    });
  };
};
import {
  createDiamondPoints,
  createHexagonPoints,
  createParticleGridOffsets,
  createPlusPointArray,
  createRegularPolygonPointArray,
  createStarPointArray,
  createVoxelFaces,
  formatPointList,
} from "./svg-shapes.js";
import { getDotRadius, getPointsBounds } from "./dot-generation.js";

const createShaderEffectAssets = ({
  shaderSettings = DEFAULT_SHADER_SETTINGS,
  viewX,
  viewY,
  viewWidth,
  viewHeight,
  dotColor,
}) => {
  const effect = shaderSettings.effect || DEFAULT_SHADER_SETTINGS.effect;
  const intensity = clampNumber(shaderSettings.intensity ?? DEFAULT_SHADER_SETTINGS.intensity, 0, 100) / 100;
  const grain = clampNumber(shaderSettings.grain ?? DEFAULT_SHADER_SETTINGS.grain, 0, 100) / 100;
  const scanlines = clampNumber(shaderSettings.scanlines ?? DEFAULT_SHADER_SETTINGS.scanlines, 0, 100) / 100;
  const threshold = clampNumber(shaderSettings.threshold ?? DEFAULT_SHADER_SETTINGS.threshold, 0, 100) / 100;
  const unit = Math.max(0.05, Math.max(viewWidth, viewHeight) / 1000);
  const split = clampNumber(shaderSettings.split ?? DEFAULT_SHADER_SETTINGS.split, 0, 30) * unit * (0.35 + intensity);
  const cell = Math.max(2 * unit, clampNumber(shaderSettings.cellSize ?? DEFAULT_SHADER_SETTINGS.cellSize, 4, 42) * unit);
  const glow = Math.max(0.25 * unit, (2 + intensity * 10) * unit);
  const filterId = "dots-shader-filter";
  const grainId = "dots-shader-grain";
  const scanlineId = "dots-shader-scanlines";
  const halftoneId = "dots-shader-halftone";
  const pixelGridId = "dots-shader-pixel-grid";
  const vignetteId = "dots-shader-vignette";
  const defs = [];
  const overlays = [];

  if (effect === "bloom") {
    defs.push(`<filter id="${filterId}" x="-30%" y="-30%" width="160%" height="160%" color-interpolation-filters="sRGB">
<feGaussianBlur in="SourceGraphic" stdDeviation="${formatSvgNumber(glow * 0.48)}" result="blur" />
<feColorMatrix in="blur" type="matrix" values="1.2 0 0 0 0 0 1.2 0 0 0 0 0 1.2 0 0 0 0 0 ${formatSvgNumber(0.4 + intensity * 0.55)} 0" result="glow" />
<feMerge>
<feMergeNode in="glow" />
<feMergeNode in="SourceGraphic" />
</feMerge>
</filter>`);
  }

  if (effect === "chromatic") {
    defs.push(`<filter id="${filterId}" x="-20%" y="-20%" width="140%" height="140%" color-interpolation-filters="sRGB">
<feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0" result="red" />
<feOffset in="red" dx="${formatSvgNumber(split)}" dy="0" result="redShift" />
<feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0 0 1 0 0 0 0 0 0 0 0 0 0 0 1 0" result="green" />
<feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 1 0" result="blue" />
<feOffset in="blue" dx="${formatSvgNumber(-split)}" dy="0" result="blueShift" />
<feBlend in="redShift" in2="green" mode="screen" result="redGreen" />
<feBlend in="redGreen" in2="blueShift" mode="screen" />
</filter>`);
  }

  if (effect === "crt") {
    defs.push(`<filter id="${filterId}" x="-24%" y="-24%" width="148%" height="148%" color-interpolation-filters="sRGB">
<feGaussianBlur in="SourceGraphic" stdDeviation="${formatSvgNumber(glow * 0.16)}" result="soft" />
<feColorMatrix in="SourceGraphic" type="matrix" values="1 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 1 0" result="red" />
<feOffset in="red" dx="${formatSvgNumber(split * 0.72)}" dy="0" result="redShift" />
<feColorMatrix in="SourceGraphic" type="matrix" values="0 0 0 0 0 0 0 0 0 0 0 0 1 0 0 0 0 0 1 0" result="blue" />
<feOffset in="blue" dx="${formatSvgNumber(-split * 0.72)}" dy="0" result="blueShift" />
<feBlend in="redShift" in2="SourceGraphic" mode="screen" result="redMix" />
<feBlend in="redMix" in2="blueShift" mode="screen" result="splitMix" />
<feMerge>
<feMergeNode in="soft" />
<feMergeNode in="splitMix" />
</feMerge>
</filter>`);
  }

  if (effect === "threshold") {
    const slope = 1 + intensity * 14;
    const intercept = 0.5 - threshold * slope;
    defs.push(`<filter id="${filterId}" color-interpolation-filters="sRGB">
<feColorMatrix in="SourceGraphic" type="saturate" values="${formatSvgNumber(1 - intensity * 0.9)}" result="desaturated" />
<feComponentTransfer in="desaturated">
<feFuncR type="linear" slope="${formatSvgNumber(slope)}" intercept="${formatSvgNumber(intercept)}" />
<feFuncG type="linear" slope="${formatSvgNumber(slope)}" intercept="${formatSvgNumber(intercept)}" />
<feFuncB type="linear" slope="${formatSvgNumber(slope)}" intercept="${formatSvgNumber(intercept)}" />
</feComponentTransfer>
</filter>`);
  }

  if (effect === "pixel") {
    const contrast = formatSvgNumber(1 + intensity * 2.8);
    defs.push(`<filter id="${filterId}" color-interpolation-filters="sRGB">
<feComponentTransfer>
<feFuncR type="linear" slope="${contrast}" intercept="${formatSvgNumber(-0.18 * intensity)}" />
<feFuncG type="linear" slope="${contrast}" intercept="${formatSvgNumber(-0.18 * intensity)}" />
<feFuncB type="linear" slope="${contrast}" intercept="${formatSvgNumber(-0.18 * intensity)}" />
</feComponentTransfer>
</filter>`);
  }

  if (effect === "halftone") {
    const contrast = formatSvgNumber(1 + intensity * 1.6);
    defs.push(`<filter id="${filterId}" color-interpolation-filters="sRGB">
<feComponentTransfer>
<feFuncR type="linear" slope="${contrast}" intercept="${formatSvgNumber(-0.08 * intensity)}" />
<feFuncG type="linear" slope="${contrast}" intercept="${formatSvgNumber(-0.08 * intensity)}" />
<feFuncB type="linear" slope="${contrast}" intercept="${formatSvgNumber(-0.08 * intensity)}" />
</feComponentTransfer>
</filter>`);
  }

  if (grain > 0 && effect !== "none") {
    const grainOpacity = grain * (0.06 + intensity * 0.16);
    defs.push(`<filter id="${grainId}" x="0" y="0" width="100%" height="100%" color-interpolation-filters="sRGB">
<feTurbulence type="fractalNoise" baseFrequency="${formatSvgNumber(0.62 + intensity * 0.35)}" numOctaves="2" seed="11" result="noise" />
<feColorMatrix in="noise" type="saturate" values="0" />
</filter>`);
    overlays.push(`<rect class="shader-overlay" pointer-events="none" x="${formatSvgNumber(viewX)}" y="${formatSvgNumber(viewY)}" width="${formatSvgNumber(viewWidth)}" height="${formatSvgNumber(viewHeight)}" filter="url(#${grainId})" opacity="${formatSvgNumber(grainOpacity)}" style="mix-blend-mode: screen" />`);
  }

  if (effectsWithScanlines.has(effect) && scanlines > 0) {
    const scanlineSpacing = Math.max(2 * unit, cell * (effect === "crt" ? 0.42 : 0.68));
    const scanlineHeight = Math.max(0.45 * unit, scanlineSpacing * 0.16);
    const scanlineOpacity = scanlines * (effect === "crt" ? 0.34 : 0.18) * (0.45 + intensity * 0.55);
    defs.push(`<pattern id="${scanlineId}" width="${formatSvgNumber(scanlineSpacing)}" height="${formatSvgNumber(scanlineSpacing)}" patternUnits="userSpaceOnUse">
<rect x="0" y="0" width="${formatSvgNumber(scanlineSpacing)}" height="${formatSvgNumber(scanlineHeight)}" fill="#000000" />
</pattern>`);
    overlays.push(`<rect class="shader-overlay" pointer-events="none" x="${formatSvgNumber(viewX)}" y="${formatSvgNumber(viewY)}" width="${formatSvgNumber(viewWidth)}" height="${formatSvgNumber(viewHeight)}" fill="url(#${scanlineId})" opacity="${formatSvgNumber(scanlineOpacity)}" />`);
  }

  if (effect === "halftone") {
    const dotRadius = Math.max(0.25 * unit, cell * (0.1 + intensity * 0.17));
    defs.push(`<pattern id="${halftoneId}" width="${formatSvgNumber(cell)}" height="${formatSvgNumber(cell)}" patternUnits="userSpaceOnUse" patternTransform="rotate(28)">
<circle cx="${formatSvgNumber(cell / 2)}" cy="${formatSvgNumber(cell / 2)}" r="${formatSvgNumber(dotRadius)}" fill="${dotColor}" />
</pattern>`);
    overlays.push(`<rect class="shader-overlay" pointer-events="none" x="${formatSvgNumber(viewX)}" y="${formatSvgNumber(viewY)}" width="${formatSvgNumber(viewWidth)}" height="${formatSvgNumber(viewHeight)}" fill="url(#${halftoneId})" opacity="${formatSvgNumber(0.1 + intensity * 0.22)}" style="mix-blend-mode: multiply" />`);
  }

  if (effect === "pixel") {
    const strokeWidth = Math.max(0.35 * unit, cell * 0.035);
    defs.push(`<pattern id="${pixelGridId}" width="${formatSvgNumber(cell)}" height="${formatSvgNumber(cell)}" patternUnits="userSpaceOnUse">
<path d="M ${formatSvgNumber(cell)} 0 H 0 V ${formatSvgNumber(cell)}" fill="none" stroke="${dotColor}" stroke-width="${formatSvgNumber(strokeWidth)}" stroke-opacity="${formatSvgNumber(0.22 + intensity * 0.3)}" />
</pattern>`);
    overlays.push(`<rect class="shader-overlay" pointer-events="none" x="${formatSvgNumber(viewX)}" y="${formatSvgNumber(viewY)}" width="${formatSvgNumber(viewWidth)}" height="${formatSvgNumber(viewHeight)}" fill="url(#${pixelGridId})" opacity="${formatSvgNumber(0.25 + intensity * 0.4)}" />`);
  }

  if (effect === "crt") {
    defs.push(`<radialGradient id="${vignetteId}" cx="50%" cy="50%" r="76%">
<stop offset="58%" stop-color="#000000" stop-opacity="0" />
<stop offset="100%" stop-color="#000000" stop-opacity="1" />
</radialGradient>`);
    overlays.push(`<rect class="shader-overlay" pointer-events="none" x="${formatSvgNumber(viewX)}" y="${formatSvgNumber(viewY)}" width="${formatSvgNumber(viewWidth)}" height="${formatSvgNumber(viewHeight)}" fill="url(#${vignetteId})" opacity="${formatSvgNumber(0.12 + intensity * 0.28)}" />`);
  }

  const hasFilter = defs.some((definition) => definition.includes(`id="${filterId}"`));
  return {
    defs: defs.length ? `<defs>\n${defs.join("\n")}\n</defs>` : "",
    groupAttributes: ` class="dots-effect dots-effect-${effect}"${hasFilter ? ` filter="url(#${filterId})"` : ""}`,
    overlays: overlays.join("\n"),
  };
};

const escapeXml = (value) =>
  String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");

const createDotMarkup = (point, radius, shape, color, selectedDots, asciiSymbol = "*", customShape = null, opacity = 1) => {
  const fill = selectedDots.has(point.id) ? CLICK_HIGHLIGHT : color;
  const op = opacity < 1 ? ` fill-opacity="${formatSvgNumber(opacity, 3)}"` : "";
  const data = `class="map-dot" data-dot-id="${point.id}" fill="${fill}"${op}`;
  const plainData = `class="map-dot" data-dot-id="${point.id}"${op}`;

  if (shape === "Custom" && customShape?.dataUrl) {
    const size = radius * 2.6;
    return `<image ${plainData} href="${customShape.dataUrl}" x="${formatSvgNumber(point.x - size / 2)}" y="${formatSvgNumber(point.y - size / 2)}" width="${formatSvgNumber(size)}" height="${formatSvgNumber(size)}" preserveAspectRatio="xMidYMid meet" />`;
  }

  if (shape === "ASCII") {
    const symbol = asciiSymbol && asciiSymbol.length > 0 ? asciiSymbol : "*";
    const chars = Array.from(symbol);
    const glyph = chars.length > 1 ? chars[hashString(point.id) % chars.length] : chars[0];
    const fontSize = radius * 3.55;
    return `<text ${data} x="${formatSvgNumber(point.x)}" y="${formatSvgNumber(point.y)}" text-anchor="middle" dominant-baseline="central" font-family="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', monospace" font-size="${formatSvgNumber(fontSize)}" font-weight="700">${escapeXml(glyph)}</text>`;
  }

  if (shape === "Square") {
    return `<rect ${data} x="${formatSvgNumber(point.x - radius)}" y="${formatSvgNumber(point.y - radius)}" width="${formatSvgNumber(radius * 2)}" height="${formatSvgNumber(radius * 2)}" />`;
  }

  if (shape === "Voxel") {
    const faces = createVoxelFaces(point.x, point.y, radius);
    const stroke = `stroke="#000000" stroke-opacity="0.16" stroke-width="${formatSvgNumber(Math.max(radius * 0.08, 0.025))}"`;
    return `<g ${data}>
<polygon points="${formatPointList(faces.left)}" fill="${fill}" fill-opacity="0.62" ${stroke} />
<polygon points="${formatPointList(faces.right)}" fill="${fill}" fill-opacity="0.82" ${stroke} />
<polygon points="${formatPointList(faces.top)}" fill="${fill}" fill-opacity="1" ${stroke} />
</g>`;
  }

  if (shape === "Particle Grid") {
    const particleRadius = Math.max(radius * 0.22, 0.025);
    const particles = createParticleGridOffsets(radius * 0.68)
      .map(([xOffset, yOffset]) => `<circle cx="${formatSvgNumber(point.x + xOffset)}" cy="${formatSvgNumber(point.y + yOffset)}" r="${formatSvgNumber(particleRadius)}" />`)
      .join("");
    return `<g ${data}>${particles}</g>`;
  }

  if (shape === "Triangle") {
    return `<polygon ${data} points="${formatPointList(createRegularPolygonPointArray(point.x, point.y, radius * 1.72, 3))}" />`;
  }

  if (shape === "Pentagon") {
    return `<polygon ${data} points="${formatPointList(createRegularPolygonPointArray(point.x, point.y, radius * 1.42, 5))}" />`;
  }

  if (shape === "Hexagon") {
    return `<polygon ${data} points="${createHexagonPoints(point.x, point.y, radius)}" />`;
  }

  if (shape === "Diamond") {
    return `<polygon ${data} points="${createDiamondPoints(point.x, point.y, radius * 1.35)}" />`;
  }

  if (shape === "Star") {
    return `<polygon ${data} points="${formatPointList(createStarPointArray(point.x, point.y, radius * 1.78, radius * 0.78))}" />`;
  }

  if (shape === "Plus") {
    return `<polygon ${data} points="${formatPointList(createPlusPointArray(point.x, point.y, radius))}" />`;
  }

  if (shape === "Ring") {
    return `<circle ${plainData} cx="${formatSvgNumber(point.x)}" cy="${formatSvgNumber(point.y)}" r="${formatSvgNumber(radius * 0.72)}" fill="none" stroke="${fill}" stroke-width="${formatSvgNumber(Math.max(radius * 0.42, 0.08))}" />`;
  }

  return `<circle ${data} cx="${formatSvgNumber(point.x)}" cy="${formatSvgNumber(point.y)}" r="${formatSvgNumber(radius)}" />`;
};

export const createDottedSvg = ({
  mapData,
  dotColor,
  dotSize,
  shape,
  asciiSymbol = "*",
  dotsVisible = true,
  background,
  transparent,
  selectedDots,
  mode,
  shaderSettings,
  sizeVary = false,
  customShape = null,
  dotGradient = null,
  dotColorAlpha = 1,
  includeSvgEffects = true,
  crop = false,
  scale = 1,
  label = "Dotted map",
}) => {
  const gradientSampler = dotGradient && dotGradient.from && dotGradient.to
    ? buildSvgGradientSampler(dotGradient, mapData.image.width, mapData.image.height)
    : null;
  // Per-dot alpha sampler — mirrors the color sampler so each dot gets the
  // interpolated opacity between the two stops. Solid mode emits a single
  // alpha for every dot.
  const alphaSampler = (() => {
    if (gradientSampler) {
      const fromA = dotGradient.fromAlpha ?? 1;
      const toA = dotGradient.toAlpha ?? 1;
      // Reuse projection math: build a tiny mirror that interpolates alpha.
      const angleRad = ((dotGradient.angle ?? 90) * Math.PI) / 180;
      const dirX = Math.sin(angleRad);
      const dirY = -Math.cos(angleRad);
      const corners = [
        [0, 0],
        [mapData.image.width, 0],
        [0, mapData.image.height],
        [mapData.image.width, mapData.image.height],
      ];
      let minProj = Infinity;
      let maxProj = -Infinity;
      corners.forEach(([x, y]) => {
        const p = x * dirX + y * dirY;
        if (p < minProj) minProj = p;
        if (p > maxProj) maxProj = p;
      });
      const range = Math.max(1e-6, maxProj - minProj);
      return (point) => {
        const t = Math.max(0, Math.min(1, (point.x * dirX + point.y * dirY - minProj) / range));
        return fromA + (toA - fromA) * t;
      };
    }
    return () => dotColorAlpha;
  })();
  const radius = getDotRadius(dotSize, mode);
  const bounds = crop
    ? getPointsBounds(mapData.points, radius, shape, mapData.image)
    : {
        minX: 0,
        minY: 0,
        maxX: mapData.image.width,
        maxY: mapData.image.height,
      };

  const rawWidth = bounds.maxX - bounds.minX;
  const rawHeight = bounds.maxY - bounds.minY;
  const padX = rawWidth * 0.02;
  const padY = rawHeight * 0.02;
  const viewX = bounds.minX - padX;
  const viewY = bounds.minY - padY;
  const viewWidth = rawWidth + padX * 2;
  const viewHeight = rawHeight + padY * 2;
  const aspect = viewWidth / viewHeight;
  const width = Math.round((aspect > 1 ? 1000 * scale : 1000 * aspect * scale) * 1000) / 1000;
  const height = Math.round((aspect > 1 ? (1000 / aspect) * scale : 1000 * scale) * 1000) / 1000;
  const backgroundColor = transparent ? "transparent" : background;
  // When sizeVary is on, jitter each dot's radius by ±18% using a stable
  // per-index seed so the SVG mirrors what the WebGL canvas shows.
  const dots = dotsVisible
    ? mapData.points
        .map((point, index) => {
          const r = sizeVary
            ? radius * (0.82 + 0.36 * ((index * 9301 + 49297) % 233280) / 233280)
            : radius;
          const fill = gradientSampler ? gradientSampler(point) : dotColor;
          const opacity = alphaSampler(point);
          return createDotMarkup(point, r, shape, fill, selectedDots, asciiSymbol, customShape, opacity);
        })
        .join("\n")
    : "";
  const backgroundRect = transparent
    ? ""
    : `<rect x="${viewX}" y="${viewY}" width="${viewWidth}" height="${viewHeight}" fill="${background}" />`;
  const effectAssets = includeSvgEffects
    ? createShaderEffectAssets({
        shaderSettings,
        viewX,
        viewY,
        viewWidth,
        viewHeight,
        dotColor,
      })
    : {
        defs: "",
        groupAttributes: ' class="dots-effect dots-effect-none"',
        overlays: "",
      };

  return {
    width,
    height,
    dotCount: dotsVisible ? mapData.points.length : 0,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" id="dots" class="dot-map" role="img" aria-label="${label}" width="${width}" height="${height}" viewBox="${viewX} ${viewY} ${viewWidth} ${viewHeight}" style="background-color: ${backgroundColor}">
${effectAssets.defs}
${backgroundRect}
<g${effectAssets.groupAttributes}>
${dots}
</g>
${effectAssets.overlays}
</svg>`,
  };
};
