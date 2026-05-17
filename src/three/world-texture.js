import * as THREE from "three";
import { geoEquirectangular, geoPath } from "d3-geo";

export const createWorldTexture = (countriesFeatureCollection, options = {}) => {
  const {
    width = 2048,
    height = 1024,
    ocean = "#0a0a0c",
    fill = "#5a5a64",
    stroke = "rgba(246, 242, 234, 0.78)",
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

  ctx.fillStyle = fill;
  countriesFeatureCollection.features.forEach((feature) => {
    ctx.beginPath();
    path(feature);
    ctx.fill();
  });

  ctx.strokeStyle = stroke;
  ctx.lineWidth = strokeWidth;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  countriesFeatureCollection.features.forEach((feature) => {
    ctx.beginPath();
    path(feature);
    ctx.stroke();
  });

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
};
