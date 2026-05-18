import * as THREE from "three";
import { geoEquirectangular, geoPath } from "d3-geo";

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
  canvasGradient.addColorStop(1, `${gradient.to}${toAlpha}`);
  return canvasGradient;
};

const alphaHex = (a) =>
  Math.round(Math.max(0, Math.min(1, a)) * 255).toString(16).padStart(2, "0");

const applyAlphaToHex = (hex, alpha) => {
  if (alpha == null || alpha >= 1) return hex;
  return `${hex}${alphaHex(alpha)}`;
};

export const createWorldTexture = (countriesFeatureCollection, options = {}) => {
  const {
    width = 2048,
    height = 1024,
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

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  ctx.fillStyle = ocean;
  ctx.fillRect(0, 0, width, height);

  const projection = geoEquirectangular()
    .scale(width / (2 * Math.PI))
    .translate([width / 2, height / 2]);
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
