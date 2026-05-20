import * as THREE from "three";
// geoEqualEarth + geoNaturalEarth1 live in d3-geo core; geoWinkel3 +
// geoRobinson are in the heavier d3-geo-projection extension package.
import { geoEqualEarth, geoEquirectangular, geoMercator, geoNaturalEarth1, geoPath } from "d3-geo";
import { geoRobinson, geoWinkel3 } from "d3-geo-projection";
import { hexToRgb, rgbToHex } from "../utils/color.js";

// Alternative flat-plane projections beyond Mercator. Sphere texture stays
// equirectangular always — that's the natural UV unwrap for a sphere geometry,
// not a designer choice.
//
// - mercator: default, matches dotted-map's internal projection so dots
//   align pixel-for-pixel with the texture
// - equalEarth: modern (2018) equal-area, designer-loved. Best replacement
//   for Mercator's well-known size distortion.
// - winkel3: National Geographic standard since 1998 (Winkel Tripel).
//   Compromise that balances area, direction, and distance distortion.
// - robinson: pre-1998 NatGeo standard. Compromise, looks "natural" to
//   anyone who learned geography before 2000.
//
// When a non-Mercator projection is picked AND dots are visible, the dots
// will misalign with the texture (dotted-map only knows Mercator). The UI
// gates the projection picker to Solid mode for this reason.
const FLAT_PROJECTIONS = {
  mercator: geoMercator,
  equalEarth: geoEqualEarth,
  naturalEarth1: geoNaturalEarth1,
  winkel3: geoWinkel3,
  robinson: geoRobinson,
};

export const FLAT_PROJECTION_OPTIONS = [
  { value: "mercator", label: "Mercator" },
  { value: "equalEarth", label: "Equal Earth" },
  { value: "naturalEarth1", label: "Natural Earth" },
  { value: "winkel3", label: "Winkel Tripel" },
  { value: "robinson", label: "Robinson" },
];

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
    // Projection only matters for the flat plane texture (when region is
    // supplied). Sphere always uses equirectangular regardless. Default is
    // mercator to match dotted-map's internal projection.
    projection: projectionKey = "mercator",
    // Optional rivers + lake centerlines overlay. Pass a FeatureCollection
    // of Line/MultiLine features in WGS84. Drawn after country fills but
    // before country strokes so they don't obscure the political borders.
    rivers = null,
    riversVisible = false,
    riversColor = "rgba(120, 184, 220, 0.72)",
    riversWidth = 1.1,
    // Optional populated places (cities) overlay. Pass a FeatureCollection
    // of Point features with pop_max in properties. Drawn last so dots sit
    // on top of country fills + strokes + rivers. citiesMinPop filters out
    // smaller cities — useful for "major cities only" mode.
    cities = null,
    citiesVisible = false,
    citiesColor = "rgba(255, 220, 120, 0.86)",
    citiesMinPop = 0,
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
    // Flat plane texture: honor the selected projection. Falls back to
    // Mercator if the key is unknown.
    const factory = FLAT_PROJECTIONS[projectionKey] ?? FLAT_PROJECTIONS.mercator;
    projection = factory();
    projection.fitExtent([[0, 0], [width, height]], regionExtentFeature(region));
  } else {
    // Sphere texture path — always equirectangular for natural UV unwrap.
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

  // Rivers + lake centerlines draw between fill and country stroke so the
  // political borders read on top. Lazy-loaded; only present when caller
  // passes a FeatureCollection AND riversVisible is on. River scalerank
  // (1 = major like Amazon/Nile, 9 = small tributary) scales the line
  // width so important rivers read first.
  if (riversVisible && rivers?.features?.length) {
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.strokeStyle = riversColor;
    rivers.features.forEach((feature) => {
      const scaleRank = feature.properties?.scalerank ?? 5;
      // Major rivers (low scalerank) draw thicker. Range ~0.5x to ~1.4x.
      ctx.lineWidth = riversWidth * (1.4 - Math.min(8, scaleRank) * 0.11);
      ctx.beginPath();
      path(feature);
      ctx.stroke();
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

  // Cities overlay — drawn last so each city dot sits on top of country fill,
  // stroke, and any river polylines. Radius scales with pop_max via a log
  // curve so a 30M-person megacity reads bigger than a 500k regional capital
  // without dwarfing it entirely. citiesMinPop filters out smaller cities
  // for "major cities only" mode. Uses projection.invert via path.pointRadius
  // — but we draw direct circles for finer control.
  if (citiesVisible && cities?.features?.length) {
    ctx.fillStyle = citiesColor;
    cities.features.forEach((feature) => {
      const pop = feature.properties?.pop_max ?? 0;
      if (pop < citiesMinPop) return;
      const coords = feature.geometry?.coordinates;
      if (!coords) return;
      const projected = projection(coords);
      if (!projected || !Number.isFinite(projected[0]) || !Number.isFinite(projected[1])) return;
      // Log scale: 100k city ≈ 1px, 1M city ≈ 1.6px, 10M city ≈ 2.6px, 30M ≈ 3.0px.
      // Scaled up x2 for visibility at the 2048-wide texture.
      const radius = Math.max(1.2, Math.min(5, 1 + Math.log10(Math.max(pop, 1) / 1e5)) * 2);
      ctx.beginPath();
      ctx.arc(projected[0], projected[1], radius, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 8;
  texture.needsUpdate = true;
  return texture;
};
