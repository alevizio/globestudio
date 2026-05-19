import * as THREE from "three";
import { geoEquirectangular, geoMercator, geoPath } from "d3-geo";
import { hexToRgb, rgbToHex } from "../utils/color.js";

// Build a Canvas2D linear gradient that spans the full texture along the
// supplied angle. Matches the dot-color gradient math so a single gradient
// reads the same on both the dot field and the solid landmass.
const buildCanvasGradient = (ctx, width, height, gradient) => {
  const angleRad = ((gradient.angle ?? 90) * Math.PI) / 180;
  const dirX = Math.sin(angleRad);
  const dirY = -Math.cos(angleRad);
  // Project corners to find extent, then derive start/end coordinates.
  const corners = [
    [0, 0],
    [width, 0],
    [0, height],
    [width, height],
  ];
  let minProj = Infinity;
  let maxProj = -Infinity;
  corners.forEach(([x, y]) => {
    const p = x * dirX + y * dirY;
    if (p < minProj) minProj = p;
    if (p > maxProj) maxProj = p;
  });
  const cx = width / 2;
  const cy = height / 2;
  const center = cx * dirX + cy * dirY;
  const startScalar = minProj - center;
  const endScalar = maxProj - center;
  const x0 = cx + dirX * startScalar;
  const y0 = cy + dirY * startScalar;
  const x1 = cx + dirX * endScalar;
  const y1 = cy + dirY * endScalar;
  const canvasGradient = ctx.createLinearGradient(x0, y0, x1, y1);
  const fromAlpha = gradient.fromAlpha != null ? alphaHex(gradient.fromAlpha) : "";
  const toAlpha = gradient.toAlpha != null ? alphaHex(gradient.toAlpha) : "";
  canvasGradient.addColorStop(0, `${gradient.from}${fromAlpha}`);
  // When a midpoint is specified, insert a third stop at that position with
  // the 50/50 mix of from and to. Canvas linearly interpolates between
  // adjacent stops, so this reproduces CSS color-hint behaviour exactly:
  // two linear segments meeting at midpoint.
  if (
    gradient.midpoint != null
    && gradient.midpoint > 0
    && gradient.midpoint < 1
    && gradient.midpoint !== 0.5
  ) {
    const fromRgb = hexToRgb(gradient.from);
    const toRgb = hexToRgb(gradient.to);
    const midRgb = {
      r: (fromRgb.r + toRgb.r) / 2,
      g: (fromRgb.g + toRgb.g) / 2,
      b: (fromRgb.b + toRgb.b) / 2,
    };
    const midAlphaValue =
      gradient.fromAlpha != null || gradient.toAlpha != null
        ? ((gradient.fromAlpha ?? 1) + (gradient.toAlpha ?? 1)) / 2
        : null;
    const midAlphaSuffix = midAlphaValue != null ? alphaHex(midAlphaValue) : "";
    canvasGradient.addColorStop(gradient.midpoint, `${rgbToHex(midRgb)}${midAlphaSuffix}`);
  }
  canvasGradient.addColorStop(1, `${gradient.to}${toAlpha}`);
  return canvasGradient;
};

const alphaHex = (a) =>
  Math.round(Math.max(0, Math.min(1, a)) * 255).toString(16).padStart(2, "0");

const applyAlphaToHex = (hex, alpha) => {
  if (alpha == null || alpha >= 1) return hex;
  return `${hex}${alphaHex(alpha)}`;
};

// Synthetic feature carrying just the lat/lng bounding box of the dotted-map
// region. Fed to projection.fitExtent so the Mercator transform pins exactly
// to dotted-map's framing (e.g. world: lat [-56, 71], lng [-168, 168]) instead
// of defaulting to the geojson's full extent (which would include Antarctica
// and chop the Arctic differently than dotted-map does).
const regionExtentFeature = (region) => ({
  type: "Feature",
  properties: {},
  geometry: {
    type: "Polygon",
    coordinates: [
      [
        [region.lng.min, region.lat.min],
        [region.lng.max, region.lat.min],
        [region.lng.max, region.lat.max],
        [region.lng.min, region.lat.max],
        [region.lng.min, region.lat.min],
      ],
    ],
  },
});

export const createWorldTexture = (countriesFeatureCollection, options = {}) => {
  const {
    region = null,
    aspect = null,
    targetWidth = 2048,
    ocean = "#0a0a0c",
    fill = "#5a5a64",
    fillAlpha = 1,
    fillGradient = null,
    fillVisible = true,
    stroke = "rgba(246, 242, 234, 0.78)",
    strokeAlpha = 1,
    strokeGradient = null,
    strokeVisible = true,
    strokeWidth = 1.8,
  } = options;

  // Resolve canvas dimensions. When the caller supplies an aspect (from the
  // dotted-map's image.width / image.height), the texture matches the flat
  // plane and dot field pixel-for-pixel. Falls back to a flat 2:1 sheet for
  // the legacy globe-only path that has no dotted-map context yet.
  const width = targetWidth;
  const height = aspect && Number.isFinite(aspect) && aspect > 0
    ? Math.round(width / aspect)
    : 1024;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = ocean;
  ctx.fillRect(0, 0, width, height);

  // Match dotted-map's projection / framing when a region is supplied.
  // Mercator + fitExtent to the region's bounding box reproduces exactly
  // what the dotted-map library does internally (see node_modules/
  // dotted-map/dist/index.mjs — DEFAULT_PROJECTION is "mercator", and the
  // map is auto-sized from the projected bounds of the region). Without a
  // region we keep the previous equirectangular full-world behaviour for
  // backward compatibility.
  let projection;
  if (region?.lat && region?.lng) {
    projection = geoMercator();
    projection.fitExtent([[0, 0], [width, height]], regionExtentFeature(region));
  } else {
    projection = geoEquirectangular()
      .scale(width / (2 * Math.PI))
      .translate([width / 2, height / 2]);
  }
  const path = geoPath(projection, ctx);

  if (fillVisible) {
    ctx.fillStyle = fillGradient && fillGradient.from && fillGradient.to
      ? buildCanvasGradient(ctx, width, height, fillGradient)
      : applyAlphaToHex(fill, fillAlpha);
    countriesFeatureCollection.features.forEach((feature) => {
      ctx.beginPath();
      path(feature);
      ctx.fill();
    });
  }

  if (strokeVisible && strokeWidth > 0) {
    ctx.strokeStyle = strokeGradient && strokeGradient.from && strokeGradient.to
      ? buildCanvasGradient(ctx, width, height, strokeGradient)
      : applyAlphaToHex(stroke, strokeAlpha);
    ctx.lineWidth = strokeWidth;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    countriesFeatureCollection.features.forEach((feature) => {
      ctx.beginPath();
      path(feature);
      ctx.stroke();
    });
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
};
