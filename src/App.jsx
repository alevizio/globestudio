import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronDown,
  Check,
  Clipboard,
  Download,
  Globe2,
  Map as MapIcon,
  Minus,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  RotateCcw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import * as THREE from "three";
import DottedMapEngine from "dotted-map";
import { geoAlbersUsa, geoContains, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import statesTopology from "us-atlas/states-10m.json";
import countryData from "world-countries";

const MAP_WIDTH = 1000;
const MAP_HEIGHT = 620;
const DEFAULT_STATE_PADDING = 1;
const US_COUNTRY_ID = "USA";
const CLICK_HIGHLIGHT = "#d6ff79";
const UNSUPPORTED_DOTTED_MAP_CODES = new Set([
  "ABW",
  "AIA",
  "ALA",
  "AND",
  "ASM",
  "ATG",
  "BES",
  "BHR",
  "BLM",
  "BRB",
  "CCK",
  "COK",
  "COM",
  "CPV",
  "CUW",
  "CXR",
  "CYM",
  "DMA",
  "FRO",
  "FSM",
  "GGY",
  "GIB",
  "GLP",
  "GRD",
  "GUM",
  "HKG",
  "IMN",
  "IOT",
  "JEY",
  "KIR",
  "KNA",
  "LCA",
  "LIE",
  "MAC",
  "MAF",
  "MCO",
  "MDV",
  "MHL",
  "MNP",
  "MSR",
  "MTQ",
  "MUS",
  "MYT",
  "NFK",
  "NIU",
  "NRU",
  "PCN",
  "PLW",
  "PYF",
  "REU",
  "SGP",
  "SHN",
  "SJM",
  "SMR",
  "SPM",
  "STP",
  "SXM",
  "SYC",
  "TCA",
  "TKL",
  "TON",
  "TUV",
  "UMI",
  "UNK",
  "VAT",
  "VCT",
  "VGB",
  "VIR",
  "WLF",
  "WSM",
]);

const stateFeatureCollection = feature(
  statesTopology,
  statesTopology.objects.states,
);

const countries = countryData
  .filter(
    (country) =>
      country.cca3 &&
      country.region !== "Antarctic" &&
      !UNSUPPORTED_DOTTED_MAP_CODES.has(country.cca3),
  )
  .map((country) => ({
    _id: country.cca3,
    _displayName: country.name?.common || country.cca3,
    _region: country.region || "Other",
    _subregion: country.subregion || "",
  }))
  .sort((a, b) => a._displayName.localeCompare(b._displayName));

const mappableCountries = countries;

const usStates = stateFeatureCollection.features
  .map((item) => ({
    ...item,
    _id: String(item.id),
    _displayName: item.properties?.name || String(item.id),
  }))
  .sort((a, b) => a._displayName.localeCompare(b._displayName));

function buildGroupedOptions(field, typeLabel) {
  const groups = new Map();
  mappableCountries.forEach((item) => {
    const value = item[field];
    if (!value || value === "Other") return;
    const list = groups.get(value) || [];
    list.push(item._id);
    groups.set(value, list);
  });

  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, ids]) => ({
      value: `${typeLabel}:${name}`,
      label: `${name} (${typeLabel === "region" ? "Region" : "Subregion"})`,
      ids,
    }));
}

const regionOptions = buildGroupedOptions("_region", "region");
const subregionOptions = buildGroupedOptions("_subregion", "subregion");

const areaOptions = [
  { value: "world", label: "World", ids: [] },
  ...mappableCountries.map((item) => ({
    value: `country:${item._id}`,
    label: item._displayName,
    ids: [item._id],
  })),
  ...regionOptions,
  ...subregionOptions,
];

const areaOptionByValue = new Map(areaOptions.map((option) => [option.value, option]));

const DEFAULT_SHADER_SETTINGS = {
  effect: "none",
  intensity: 45,
  split: 7,
  grain: 8,
  scanlines: 36,
  cellSize: 14,
  threshold: 50,
  warp: 24,
  motion: 35,
};

const shaderEffectOptions = [
  { value: "none", label: "None" },
  { value: "bloom", label: "Bloom" },
  { value: "chromatic", label: "Chromatic" },
  { value: "crt", label: "CRT" },
  { value: "halftone", label: "Halftone" },
  { value: "pixel", label: "Pixel" },
  { value: "threshold", label: "Threshold" },
];

const effectsWithSplit = new Set(["chromatic", "crt"]);
const effectsWithScanlines = new Set(["crt", "pixel", "halftone"]);
const effectsWithCellSize = new Set(["pixel", "halftone", "crt"]);
const effectsWithWarp = new Set(["bloom", "chromatic", "crt", "threshold"]);
const effectsWithMotion = new Set(["bloom", "chromatic", "crt", "halftone", "threshold"]);
const shaderEffectValue = {
  none: 0,
  bloom: 1,
  chromatic: 2,
  crt: 3,
  halftone: 4,
  pixel: 5,
  threshold: 6,
};

const GLOBE_RADIUS = 2;
const GLOBE_CAMERA_DISTANCE = 7.35;
const GLOBE_INITIAL_ROTATION = { x: -0.14, y: -0.9 };
const GLOBE_MORPH_DURATION = 1150;

function makeFeatureCollection(features) {
  return {
    type: "FeatureCollection",
    features,
  };
}

function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, Number(value)));
}

function normalizeLongitude(value) {
  return ((((value + 180) % 360) + 360) % 360) - 180;
}

function pointToGlobeCoordinate(point, image) {
  const lng = Number.isFinite(point.lng)
    ? point.lng
    : normalizeLongitude((point.x / image.width) * 360 - 180);
  const lat = Number.isFinite(point.lat)
    ? point.lat
    : 90 - (point.y / image.height) * 180;

  return {
    lat: clampNumber(lat, -90, 90),
    lng: normalizeLongitude(lng),
  };
}

function latLngToVector3(lat, lng, radius = GLOBE_RADIUS) {
  const phi = THREE.MathUtils.degToRad(90 - lat);
  const theta = THREE.MathUtils.degToRad(lng + 180);

  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta),
  );
}

function pointToFlatVector3(point, image, radiusOffset = 0) {
  const flatWidth = 5.35 + radiusOffset * 12;
  const flatHeight = flatWidth * (image.height / image.width);

  return new THREE.Vector3(
    (point.x / image.width - 0.5) * flatWidth,
    (0.5 - point.y / image.height) * flatHeight,
    -0.18 + radiusOffset * 0.5,
  );
}

function easeInOutCubic(value) {
  const t = clampNumber(value, 0, 1);
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function smoothStep(edge0, edge1, value) {
  const t = clampNumber((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

function formatSvgNumber(value, decimals = 3) {
  const number = Number.isFinite(value) ? value : 0;
  return number.toFixed(decimals).replace(/\.?0+$/, "");
}

function createHexagonPoints(x, y, radius) {
  const sqrt3radius = Math.sqrt(3) * radius;
  return [
    [x + sqrt3radius, y - radius],
    [x + sqrt3radius, y + radius],
    [x, y + 2 * radius],
    [x - sqrt3radius, y + radius],
    [x - sqrt3radius, y - radius],
    [x, y - 2 * radius],
  ]
    .map((point) => point.join(","))
    .join(" ");
}

function createDiamondPoints(x, y, radius) {
  return [
    `${x.toFixed(2)},${(y - radius).toFixed(2)}`,
    `${(x + radius).toFixed(2)},${y.toFixed(2)}`,
    `${x.toFixed(2)},${(y + radius).toFixed(2)}`,
    `${(x - radius).toFixed(2)},${y.toFixed(2)}`,
  ].join(" ");
}

function generateDots({ collection, density, padding, shape }) {
  const paddingPx = 28 + padding * 13;
  const projection = geoAlbersUsa();
  projection.fitExtent(
    [
      [paddingPx, paddingPx],
      [MAP_WIDTH - paddingPx, MAP_HEIGHT - paddingPx],
    ],
    collection,
  );

  const path = geoPath(projection);
  const bounds = path.bounds(collection);
  const minX = Math.max(0, Number.isFinite(bounds[0][0]) ? bounds[0][0] : paddingPx);
  const maxX = Math.min(MAP_WIDTH, Number.isFinite(bounds[1][0]) ? bounds[1][0] : MAP_WIDTH);
  const minY = Math.max(0, Number.isFinite(bounds[0][1]) ? bounds[0][1] : paddingPx);
  const maxY = Math.min(MAP_HEIGHT, Number.isFinite(bounds[1][1]) ? bounds[1][1] : MAP_HEIGHT);
  const spacing = Math.max(4, 23 - density * 0.17);
  const ySpacing = shape === "Hexagon" ? spacing * 0.88 : spacing;
  const dots = [];
  let row = 0;

  for (let y = minY; y <= maxY; y += ySpacing) {
    const offset = row % 2 === 0 ? 0 : spacing / 2;
    for (let x = minX + offset; x <= maxX; x += spacing) {
      const coordinates = projection.invert?.([x, y]);
      if (!coordinates) continue;
      if (geoContains(collection, coordinates)) {
        const [lng, lat] = coordinates;
        dots.push({
          id: `${Math.round(x * 10)}-${Math.round(y * 10)}`,
          lat,
          lng,
          x,
          y,
        });
      }
    }
    row += 1;
  }

  return dots;
}

function createCountryMapData(countryCodes, density) {
  const map = new DottedMapEngine({
    height: density,
    grid: "diagonal",
    ...(countryCodes.length ? { countries: countryCodes } : {}),
  });

  return {
    image: map.image,
    points: map.getPoints().map((point, index) => ({
      ...point,
      id: `${point.x}:${point.y}:${index}`,
    })),
  };
}

function createStateMapData(collection, density, padding, shape) {
  const points = generateDots({
    collection,
    density,
    padding,
    shape,
  }).map((point, index) => ({
    ...point,
    id: `${point.x}:${point.y}:${index}`,
  }));

  return {
    image: { width: MAP_WIDTH, height: MAP_HEIGHT },
    points,
  };
}

function getDotRadius(dotSize, mode) {
  return mode === "state" ? Math.max(1.2, dotSize * 0.42) : dotSize / 100;
}

function getShapeBounds(point, radius, shape) {
  if (shape === "Hexagon") {
    const xRadius = Math.sqrt(3) * radius;
    return {
      minX: point.x - xRadius,
      maxX: point.x + xRadius,
      minY: point.y - 2 * radius,
      maxY: point.y + 2 * radius,
    };
  }

  const shapeRadius = shape === "Diamond" ? radius * 1.35 : radius;
  return {
    minX: point.x - shapeRadius,
    maxX: point.x + shapeRadius,
    minY: point.y - shapeRadius,
    maxY: point.y + shapeRadius,
  };
}

function getPointsBounds(points, radius, shape, image) {
  if (!points.length) {
    return {
      minX: 0,
      minY: 0,
      maxX: image.width,
      maxY: image.height,
    };
  }

  return points.reduce(
    (bounds, point) => {
      const pointBounds = getShapeBounds(point, radius, shape);
      return {
        minX: Math.min(bounds.minX, pointBounds.minX),
        minY: Math.min(bounds.minY, pointBounds.minY),
        maxX: Math.max(bounds.maxX, pointBounds.maxX),
        maxY: Math.max(bounds.maxY, pointBounds.maxY),
      };
    },
    { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity },
  );
}

function createGlobeDotGeometry(shape) {
  if (shape === "Hexagon") return new THREE.CylinderGeometry(1, 1, 0.36, 6, 1);
  if (shape === "Square") return new THREE.BoxGeometry(1.28, 0.32, 1.28);
  if (shape === "Diamond") return new THREE.OctahedronGeometry(1, 0);
  return new THREE.SphereGeometry(1, 9, 7);
}

function createGraticule(radius = GLOBE_RADIUS + 0.006) {
  const group = new THREE.Group();
  const material = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.13,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });

  for (let lat = -60; lat <= 60; lat += 30) {
    const points = [];
    for (let lng = -180; lng <= 180; lng += 4) {
      points.push(latLngToVector3(lat, lng, radius));
    }
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material));
  }

  for (let lng = -180; lng < 180; lng += 30) {
    const points = [];
    for (let lat = -82; lat <= 82; lat += 4) {
      points.push(latLngToVector3(lat, lng, radius));
    }
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material));
  }

  return group;
}

function createAtmosphereMaterial() {
  return new THREE.ShaderMaterial({
    vertexShader: `
      varying vec3 vNormal;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 glowColor;
      uniform float intensity;
      varying vec3 vNormal;
      void main() {
        float rim = pow(0.72 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.0);
        gl_FragColor = vec4(glowColor, clamp(rim * intensity, 0.0, 0.62));
      }
    `,
    uniforms: {
      glowColor: { value: new THREE.Color(CLICK_HIGHLIGHT) },
      intensity: { value: 0.9 },
    },
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false,
  });
}

function disposeThreeObject(object) {
  object.traverse((child) => {
    child.geometry?.dispose?.();
    if (Array.isArray(child.material)) {
      child.material.forEach((material) => material.dispose?.());
    } else {
      child.material?.dispose?.();
    }
  });
}

function buildGlobePoints(mapData, selectedDots) {
  return mapData.points
    .map((point) => ({
      ...point,
      ...pointToGlobeCoordinate(point, mapData.image),
      selected: selectedDots.has(point.id),
    }))
    .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng));
}

function applyDotInstances(mesh, points, image, scale, radiusOffset = 0, morphProgress = 1) {
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const flatQuaternion = new THREE.Quaternion();
  const globeQuaternion = new THREE.Quaternion();
  const normal = new THREE.Vector3();
  const position = new THREE.Vector3();
  const flatPosition = new THREE.Vector3();
  const globePosition = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const depth = new THREE.Vector3(0, 0, 1);
  const size = new THREE.Vector3(scale, scale, scale);

  points.forEach((point, index) => {
    flatPosition.copy(pointToFlatVector3(point, image, radiusOffset));
    globePosition.copy(latLngToVector3(point.lat, point.lng, GLOBE_RADIUS + radiusOffset));
    position.copy(flatPosition).lerp(globePosition, morphProgress);

    normal.copy(globePosition).normalize();
    globeQuaternion.setFromUnitVectors(up, normal);
    flatQuaternion.setFromUnitVectors(up, depth);
    quaternion.copy(flatQuaternion).slerp(globeQuaternion, morphProgress);

    matrix.compose(position, quaternion, size);
    mesh.setMatrixAt(index, matrix);
  });

  mesh.instanceMatrix.needsUpdate = true;
}

function createInstancedDotMesh(points, image, geometry, material, scale, radiusOffset, morphProgress) {
  if (!points.length) return null;
  const mesh = new THREE.InstancedMesh(geometry, material, points.length);
  mesh.frustumCulled = false;
  mesh.userData.pointIds = points.map((point) => point.id);
  mesh.userData.points = points;
  mesh.userData.image = image;
  mesh.userData.scale = scale;
  mesh.userData.radiusOffset = radiusOffset;
  applyDotInstances(mesh, points, image, scale, radiusOffset, morphProgress);
  return mesh;
}

function applyDotLayerMorph(group, morphProgress) {
  if (!group) return;
  group.children.forEach((child) => {
    if (!child.isInstancedMesh || !child.userData.points) return;
    applyDotInstances(
      child,
      child.userData.points,
      child.userData.image,
      child.userData.scale,
      child.userData.radiusOffset,
      morphProgress,
    );
  });
  group.userData.morphProgress = morphProgress;
}

function buildGlobeDotLayer({ mapData, selectedDots, dotColor, dotSize, shape, shaderSettings, morphProgress = 1 }) {
  const group = new THREE.Group();
  const points = buildGlobePoints(mapData, selectedDots);
  const normalPoints = points.filter((point) => !point.selected);
  const selectedPoints = points.filter((point) => point.selected);
  const effect = shaderSettings.effect || "none";
  const intensity = clampNumber(shaderSettings.intensity ?? 45, 0, 100) / 100;
  const geometry = createGlobeDotGeometry(shape);
  const size = 0.009 + clampNumber(dotSize, 1, 25) * 0.00172;
  const color = new THREE.Color(dotColor);
  const accentColor = new THREE.Color(CLICK_HIGHLIGHT);
  const emissiveBoost = effect === "none" ? 0.22 : 0.5 + intensity * 0.85;
  const baseMaterial = new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: emissiveBoost,
    metalness: 0,
    roughness: 0.62,
  });
  const selectedMaterial = new THREE.MeshStandardMaterial({
    color: accentColor,
    emissive: accentColor,
    emissiveIntensity: 1.2,
    metalness: 0,
    roughness: 0.5,
  });

  const normalMesh = createInstancedDotMesh(normalPoints, mapData.image, geometry, baseMaterial, size, 0.018, morphProgress);
  const selectedMesh = createInstancedDotMesh(
    selectedPoints,
    mapData.image,
    geometry.clone(),
    selectedMaterial,
    size * 1.18,
    0.026,
    morphProgress,
  );

  if (normalMesh) group.add(normalMesh);
  if (selectedMesh) group.add(selectedMesh);

  if (effect === "bloom" || effect === "crt") {
    const glowGeometry = createGlobeDotGeometry("Circle");
    const glowMaterial = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.11 + intensity * 0.14,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const glowMesh = createInstancedDotMesh(
      points,
      mapData.image,
      glowGeometry,
      glowMaterial,
      size * (2.25 + intensity),
      0.034,
      morphProgress,
    );
    if (glowMesh) group.add(glowMesh);
  }

  if (effect === "chromatic") {
    const split = clampNumber(shaderSettings.split ?? 7, 0, 30) * 0.06;
    const chromaGeometry = createGlobeDotGeometry("Circle");
    [
      { offset: -split, color: "#ff3c94" },
      { offset: split, color: "#40e0ff" },
    ].forEach((layer) => {
      const chromaPoints = points.map((point) => ({
        ...point,
        lng: normalizeLongitude(point.lng + layer.offset),
      }));
      const material = new THREE.MeshBasicMaterial({
        color: new THREE.Color(layer.color),
        transparent: true,
        opacity: 0.34 + intensity * 0.22,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });
      const mesh = createInstancedDotMesh(
        chromaPoints,
        mapData.image,
        chromaGeometry.clone(),
        material,
        size * 1.2,
        0.032,
        morphProgress,
      );
      if (mesh) group.add(mesh);
    });
  }

  if (effect === "threshold") {
    group.scale.setScalar(1 + intensity * 0.018);
  }

  group.userData.dotCount = points.length;
  group.userData.morphProgress = morphProgress;
  return group;
}

function applyGlobeShellProgress(refs, morphProgress) {
  if (!refs) return;
  const shellProgress = smoothStep(0.18, 0.92, morphProgress);

  refs.baseMaterial.opacity = refs.baseOpacity * shellProgress;
  refs.atmosphereMaterial.uniforms.intensity.value = refs.atmosphereIntensity * shellProgress;
  refs.graticule.children.forEach((line) => {
    line.material.opacity = refs.graticuleOpacity * shellProgress;
  });
}

function createShaderEffectAssets({
  shaderSettings = DEFAULT_SHADER_SETTINGS,
  viewX,
  viewY,
  viewWidth,
  viewHeight,
  dotColor,
}) {
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
}

function createDotMarkup(point, radius, shape, color, selectedDots) {
  const fill = selectedDots.has(point.id) ? CLICK_HIGHLIGHT : color;
  const data = `class="map-dot" data-dot-id="${point.id}" fill="${fill}"`;

  if (shape === "Square") {
    return `<rect ${data} x="${point.x - radius}" y="${point.y - radius}" width="${
      radius * 2
    }" height="${radius * 2}" />`;
  }

  if (shape === "Hexagon") {
    return `<polyline ${data} points="${createHexagonPoints(point.x, point.y, radius)}" />`;
  }

  if (shape === "Diamond") {
    return `<polyline ${data} points="${createDiamondPoints(point.x, point.y, radius * 1.35)}" />`;
  }

  return `<circle ${data} cx="${point.x}" cy="${point.y}" r="${radius}" />`;
}

function createDottedSvg({
  mapData,
  dotColor,
  dotSize,
  shape,
  background,
  transparent,
  selectedDots,
  mode,
  shaderSettings,
  includeSvgEffects = true,
  crop = false,
  scale = 1,
  label = "Dotted map",
}) {
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
  const padX = crop ? rawWidth * 0.02 : rawWidth * 0.02;
  const padY = crop ? rawHeight * 0.02 : rawHeight * 0.02;
  const viewX = bounds.minX - padX;
  const viewY = bounds.minY - padY;
  const viewWidth = rawWidth + padX * 2;
  const viewHeight = rawHeight + padY * 2;
  const aspect = viewWidth / viewHeight;
  const width = Math.round((aspect > 1 ? 1000 * scale : 1000 * aspect * scale) * 1000) / 1000;
  const height = Math.round((aspect > 1 ? (1000 / aspect) * scale : 1000 * scale) * 1000) / 1000;
  const backgroundColor = transparent ? "transparent" : background;
  const dots = mapData.points
    .map((point) => createDotMarkup(point, radius, shape, dotColor, selectedDots))
    .join("\n");
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
    dotCount: mapData.points.length,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" id="dots" class="dot-map" role="img" aria-label="${label}" width="${width}" height="${height}" viewBox="${viewX} ${viewY} ${viewWidth} ${viewHeight}" style="background-color: ${backgroundColor}">
${effectAssets.defs}
${backgroundRect}
<g${effectAssets.groupAttributes}>
${dots}
</g>
${effectAssets.overlays}
</svg>`,
  };
}

const SHADER_VERTEX_SOURCE = `
attribute vec2 a_position;
varying vec2 v_uv;

void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}
`;

const SHADER_FRAGMENT_SOURCE = `
precision highp float;

uniform sampler2D u_texture;
uniform vec2 u_resolution;
uniform float u_time;
uniform float u_effect;
uniform float u_intensity;
uniform float u_split;
uniform float u_grain;
uniform float u_scanlines;
uniform float u_cellSize;
uniform float u_threshold;
uniform float u_warp;
uniform float u_motion;
varying vec2 v_uv;

const float PI = 3.14159265359;

float random(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float luma(vec3 color) {
  return dot(color, vec3(0.299, 0.587, 0.114));
}

vec2 rotateUv(vec2 uv, float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return mat2(c, -s, s, c) * uv;
}

vec4 mapSample(vec2 uv) {
  if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) {
    return vec4(0.0);
  }

  return texture2D(u_texture, uv);
}

vec4 blurMap(vec2 uv, float radiusPx) {
  vec2 px = radiusPx / max(u_resolution, vec2(1.0));
  vec4 color = mapSample(uv) * 0.2;
  color += mapSample(uv + vec2(px.x, 0.0)) * 0.12;
  color += mapSample(uv - vec2(px.x, 0.0)) * 0.12;
  color += mapSample(uv + vec2(0.0, px.y)) * 0.12;
  color += mapSample(uv - vec2(0.0, px.y)) * 0.12;
  color += mapSample(uv + px) * 0.08;
  color += mapSample(uv - px) * 0.08;
  color += mapSample(uv + vec2(px.x, -px.y)) * 0.08;
  color += mapSample(uv + vec2(-px.x, px.y)) * 0.08;
  return color;
}

vec2 barrelWarp(vec2 uv, float amount) {
  vec2 centered = uv * 2.0 - 1.0;
  float radius = dot(centered, centered);
  centered *= 1.0 + radius * amount;
  return centered * 0.5 + 0.5;
}

vec4 bloomPass(vec2 uv) {
  float pulse = 0.5 + 0.5 * sin(u_time * mix(0.4, 2.8, u_motion) + uv.x * 5.0 + uv.y * 3.0);
  float warp = (pulse - 0.5) * u_warp * u_intensity * 0.018;
  vec2 warpedUv = uv + vec2(warp * (uv.y - 0.5), -warp * (uv.x - 0.5));
  vec4 source = mapSample(warpedUv);
  vec4 glowA = blurMap(warpedUv, mix(5.0, 34.0, u_intensity));
  vec4 glowB = blurMap(warpedUv, mix(20.0, 80.0, u_intensity));
  vec3 halo = glowA.rgb * (0.9 + u_intensity * 2.2) + glowB.rgb * (0.3 + u_intensity * 1.4);
  vec3 color = source.rgb + halo + vec3(0.14, 0.38, 0.08) * glowB.a * pulse * u_intensity;
  float alpha = clamp(source.a + glowA.a * (0.5 + u_intensity) + glowB.a * u_intensity * 0.75, 0.0, 1.0);
  return vec4(color, alpha);
}

vec4 chromaticPass(vec2 uv) {
  vec2 centered = uv - 0.5;
  float dist = length(centered);
  vec2 dir = normalize(centered + vec2(0.0001));
  vec2 tangent = vec2(-dir.y, dir.x);
  float wave = sin((uv.y * 18.0 + uv.x * 7.0) + u_time * mix(0.3, 6.0, u_motion));
  vec2 warpedUv = uv + centered * dist * dist * u_warp * u_intensity * 0.22;
  vec2 offset = (dir + tangent * wave * 0.34) * (u_split * (0.8 + dist * 1.8)) / max(u_resolution, vec2(1.0));
  vec4 red = mapSample(warpedUv + offset);
  vec4 green = mapSample(warpedUv);
  vec4 blue = mapSample(warpedUv - offset);
  vec4 glow = blurMap(warpedUv, 8.0 + u_split * 1.4);
  vec3 color = vec3(red.r, green.g, blue.b) + glow.rgb * glow.a * u_intensity * 0.8;
  float alpha = clamp(max(max(red.a, green.a), blue.a) + glow.a * u_intensity * 0.4, 0.0, 1.0);
  return vec4(color, alpha);
}

vec4 crtPass(vec2 uv) {
  vec2 warpedUv = barrelWarp(uv, 0.04 + u_warp * u_intensity * 0.2);
  vec2 centered = warpedUv - 0.5;
  vec2 offset = vec2(u_split / max(u_resolution.x, 1.0), 0.0);
  vec4 red = mapSample(warpedUv + offset * 0.8);
  vec4 green = mapSample(warpedUv);
  vec4 blue = mapSample(warpedUv - offset * 0.8);
  vec4 glow = blurMap(warpedUv, 4.0 + u_intensity * 18.0);
  vec3 color = vec3(red.r, green.g, blue.b) + glow.rgb * glow.a * (0.7 + u_intensity * 1.7);
  float alpha = clamp(max(max(red.a, green.a), blue.a) + glow.a * (0.3 + u_intensity * 0.6), 0.0, 1.0);

  float scan = 0.82 + 0.18 * sin(warpedUv.y * u_resolution.y * PI / max(u_cellSize * 0.48, 1.0));
  color *= mix(1.0, scan, u_scanlines);

  float stripe = mod(floor(warpedUv.x * u_resolution.x), 3.0);
  vec3 phosphor = stripe < 1.0 ? vec3(1.16, 0.78, 0.78) : (stripe < 2.0 ? vec3(0.8, 1.12, 0.8) : vec3(0.78, 0.86, 1.18));
  color *= mix(vec3(1.0), phosphor, u_scanlines * 0.5);

  float flicker = 1.0 + (random(vec2(floor(u_time * mix(8.0, 34.0, u_motion)), 7.0)) - 0.5) * 0.1 * u_intensity;
  float vignette = smoothstep(0.86, 0.18, length(centered * vec2(u_resolution.x / max(u_resolution.y, 1.0), 1.0)));
  float edgeAlpha = (1.0 - vignette) * (0.14 + u_intensity * 0.22);
  color *= flicker * mix(0.45, 1.0, vignette);
  return vec4(color, clamp(max(alpha, edgeAlpha), 0.0, 1.0));
}

vec4 halftonePass(vec2 uv) {
  float cell = max(u_cellSize, 3.0);
  vec2 gridUv = uv * u_resolution / cell;
  vec2 rotated = rotateUv(gridUv, 0.49 + u_time * u_motion * 0.015);
  vec2 local = fract(rotated) - 0.5;
  vec4 source = mapSample(uv);
  vec4 densitySample = blurMap(uv, cell * (0.7 + u_intensity * 1.6));
  float density = clamp(max(source.a, densitySample.a * (1.2 + u_intensity)), 0.0, 1.0);
  float radius = mix(0.08, 0.48, density) * (0.85 + u_intensity * 0.35);
  float dotMask = smoothstep(radius, radius - 0.08, length(local));

  vec2 cLocal = fract(rotateUv(gridUv + vec2(0.18, 0.08), 0.26)) - 0.5;
  vec2 mLocal = fract(rotateUv(gridUv + vec2(-0.11, 0.16), 1.31)) - 0.5;
  float cyan = smoothstep(radius * 0.9, radius * 0.9 - 0.08, length(cLocal));
  float magenta = smoothstep(radius * 0.82, radius * 0.82 - 0.08, length(mLocal));

  vec3 base = max(source.rgb, densitySample.rgb);
  vec3 printColor = base * (0.35 + dotMask * 1.3);
  printColor += vec3(cyan * 0.06, magenta * 0.03, dotMask * 0.12) * density * u_intensity;
  float alpha = clamp((dotMask + cyan * 0.22 + magenta * 0.18) * density, 0.0, 1.0);
  return vec4(printColor, alpha);
}

vec4 pixelPass(vec2 uv) {
  float cell = max(u_cellSize, 2.0);
  vec2 grid = max(u_resolution / cell, vec2(1.0));
  vec2 pixelUv = (floor(uv * grid) + 0.5) / grid;
  vec4 source = mapSample(pixelUv);
  vec4 glow = blurMap(pixelUv, cell * 0.7);
  float steps = mix(3.0, 9.0, u_intensity);
  vec3 color = floor((source.rgb + glow.rgb * glow.a * u_intensity) * steps) / steps;
  vec2 local = abs(fract(uv * grid) - 0.5);
  float gridLine = smoothstep(0.48, 0.5, max(local.x, local.y));
  color += vec3(0.12, 0.18, 0.08) * gridLine * source.a * u_intensity;
  float alpha = clamp(source.a + glow.a * u_intensity * 0.35, 0.0, 1.0);
  return vec4(color, alpha);
}

vec4 thresholdPass(vec2 uv) {
  float t = u_time * mix(0.25, 4.5, u_motion);
  float drift = (random(vec2(floor(uv.y * 32.0), floor(t * 16.0))) - 0.5) * u_warp * u_intensity * 0.035;
  vec2 warpedUv = uv + vec2(drift, sin(uv.x * 20.0 + t) * u_warp * u_intensity * 0.004);
  vec4 source = mapSample(warpedUv);
  vec4 glow = blurMap(warpedUv, 5.0 + u_intensity * 22.0);
  float signal = max(source.a, glow.a * 0.72);
  float grain = (random(uv * u_resolution + floor(t * 30.0)) - 0.5) * u_grain * 0.65;
  float mask = smoothstep(u_threshold - 0.12, u_threshold + 0.12, signal + grain);
  vec3 ink = mix(vec3(0.0), vec3(0.84, 1.0, 0.36), mask);
  ink += vec3(0.1, 0.7, 1.0) * glow.a * u_intensity * 0.45;
  return vec4(ink, clamp(mask * max(signal, source.a), 0.0, 1.0));
}

void main() {
  vec4 color = mapSample(v_uv);

  if (u_effect > 0.5 && u_effect < 1.5) {
    color = bloomPass(v_uv);
  } else if (u_effect < 2.5 && u_effect > 1.5) {
    color = chromaticPass(v_uv);
  } else if (u_effect < 3.5 && u_effect > 2.5) {
    color = crtPass(v_uv);
  } else if (u_effect < 4.5 && u_effect > 3.5) {
    color = halftonePass(v_uv);
  } else if (u_effect < 5.5 && u_effect > 4.5) {
    color = pixelPass(v_uv);
  } else if (u_effect < 6.5 && u_effect > 5.5) {
    color = thresholdPass(v_uv);
  }

  if (u_effect > 0.5 && u_grain > 0.0) {
    float grain = random(v_uv * u_resolution + floor(u_time * mix(8.0, 48.0, u_motion))) - 0.5;
    color.rgb += grain * u_grain * u_intensity * 0.28;
  }

  gl_FragColor = vec4(clamp(color.rgb, 0.0, 1.0), clamp(color.a, 0.0, 1.0));
}
`;

function compileShader(gl, type, source) {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    const error = gl.getShaderInfoLog(shader) || "Shader compilation failed";
    gl.deleteShader(shader);
    throw new Error(error);
  }

  return shader;
}

function createShaderProgram(gl) {
  const vertexShader = compileShader(gl, gl.VERTEX_SHADER, SHADER_VERTEX_SOURCE);
  const fragmentShader = compileShader(gl, gl.FRAGMENT_SHADER, SHADER_FRAGMENT_SOURCE);
  const program = gl.createProgram();
  gl.attachShader(program, vertexShader);
  gl.attachShader(program, fragmentShader);
  gl.linkProgram(program);
  gl.deleteShader(vertexShader);
  gl.deleteShader(fragmentShader);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    const error = gl.getProgramInfoLog(program) || "Shader link failed";
    gl.deleteProgram(program);
    throw new Error(error);
  }

  return program;
}

function ShaderCanvas({ svgMarkup, width, height, shaderSettings, canvasHandleRef }) {
  const canvasRef = useRef(null);
  const stateRef = useRef(null);
  const settingsRef = useRef(shaderSettings);
  settingsRef.current = shaderSettings;
  const setCanvasNode = useCallback((node) => {
    canvasRef.current = node;
    if (canvasHandleRef) {
      canvasHandleRef.current = node;
    }
  }, [canvasHandleRef]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const gl = canvas.getContext("webgl", {
      alpha: true,
      antialias: false,
      depth: false,
      premultipliedAlpha: false,
      preserveDrawingBuffer: true,
      stencil: false,
    });

    if (!gl) return undefined;

    const program = createShaderProgram(gl);
    const positionBuffer = gl.createBuffer();
    const texture = gl.createTexture();
    const positions = new Float32Array([-1, -1, 1, -1, -1, 1, -1, 1, 1, -1, 1, 1]);
    const locations = {
      position: gl.getAttribLocation(program, "a_position"),
      texture: gl.getUniformLocation(program, "u_texture"),
      resolution: gl.getUniformLocation(program, "u_resolution"),
      time: gl.getUniformLocation(program, "u_time"),
      effect: gl.getUniformLocation(program, "u_effect"),
      intensity: gl.getUniformLocation(program, "u_intensity"),
      split: gl.getUniformLocation(program, "u_split"),
      grain: gl.getUniformLocation(program, "u_grain"),
      scanlines: gl.getUniformLocation(program, "u_scanlines"),
      cellSize: gl.getUniformLocation(program, "u_cellSize"),
      threshold: gl.getUniformLocation(program, "u_threshold"),
      warp: gl.getUniformLocation(program, "u_warp"),
      motion: gl.getUniformLocation(program, "u_motion"),
    };

    gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, positions, gl.STATIC_DRAW);
    gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);

    stateRef.current = {
      frame: 0,
      gl,
      drawOnce: null,
      loaded: false,
      locations,
      positionBuffer,
      program,
      texture,
    };

    const render = (now) => {
      const state = stateRef.current;
      if (!state) return;

      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
      const nextWidth = Math.max(1, Math.floor(canvas.clientWidth * pixelRatio));
      const nextHeight = Math.max(1, Math.floor(canvas.clientHeight * pixelRatio));
      if (canvas.width !== nextWidth || canvas.height !== nextHeight) {
        canvas.width = nextWidth;
        canvas.height = nextHeight;
      }

      gl.viewport(0, 0, canvas.width, canvas.height);
      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      if (state.loaded) {
        const current = settingsRef.current;
        const effect = shaderEffectValue[current.effect] ?? 0;
        const intensity = clampNumber(current.intensity, 0, 100) / 100;

        gl.useProgram(program);
        gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
        gl.enableVertexAttribArray(locations.position);
        gl.vertexAttribPointer(locations.position, 2, gl.FLOAT, false, 0, 0);
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, texture);
        gl.uniform1i(locations.texture, 0);
        gl.uniform2f(locations.resolution, canvas.width, canvas.height);
        gl.uniform1f(locations.time, now / 1000);
        gl.uniform1f(locations.effect, effect);
        gl.uniform1f(locations.intensity, intensity);
        gl.uniform1f(locations.split, clampNumber(current.split, 0, 30) * (0.8 + intensity * 2.8));
        gl.uniform1f(locations.grain, clampNumber(current.grain, 0, 100) / 100);
        gl.uniform1f(locations.scanlines, clampNumber(current.scanlines, 0, 100) / 100);
        gl.uniform1f(locations.cellSize, clampNumber(current.cellSize, 4, 42) * pixelRatio);
        gl.uniform1f(locations.threshold, clampNumber(current.threshold, 0, 100) / 100);
        gl.uniform1f(locations.warp, clampNumber(current.warp, 0, 100) / 100);
        gl.uniform1f(locations.motion, clampNumber(current.motion, 0, 100) / 100);
        gl.drawArrays(gl.TRIANGLES, 0, 6);
      }
    };

    const draw = (now) => {
      render(now);
      const state = stateRef.current;
      if (!state) return;

      state.frame = window.requestAnimationFrame(draw);
    };

    stateRef.current.drawOnce = () => render(window.performance.now());
    stateRef.current.drawOnce();
    stateRef.current.frame = window.requestAnimationFrame(draw);

    return () => {
      const state = stateRef.current;
      if (!state) return;
      window.cancelAnimationFrame(state.frame);
      gl.deleteBuffer(positionBuffer);
      gl.deleteTexture(texture);
      gl.deleteProgram(program);
      stateRef.current = null;
    };
  }, []);

  useEffect(() => {
    const state = stateRef.current;
    if (!state) return undefined;

    let cancelled = false;
    const { gl, texture } = state;
    const url = URL.createObjectURL(new Blob([svgMarkup], { type: "image/svg+xml;charset=utf-8" }));
    const image = new Image();

    image.onload = () => {
      if (cancelled) return;
      gl.bindTexture(gl.TEXTURE_2D, texture);
      gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
      state.loaded = true;
      state.drawOnce?.();
      URL.revokeObjectURL(url);
    };

    image.onerror = () => {
      state.loaded = false;
      URL.revokeObjectURL(url);
    };

    image.src = url;

    return () => {
      cancelled = true;
      URL.revokeObjectURL(url);
    };
  }, [svgMarkup]);

  return (
    <canvas
      ref={setCanvasNode}
      className="shader-canvas"
      aria-hidden="true"
      style={{ aspectRatio: `${width} / ${height}` }}
    />
  );
}

function IconButton({ children, title, onClick, className = "", active = false }) {
  return (
    <button
      type="button"
      className={`button ${active ? "button-active" : ""} ${className}`}
      onClick={onClick}
      title={title}
    >
      {children}
    </button>
  );
}

function PanelSection({ title, children, icon }) {
  const [isOpen, setIsOpen] = useState(true);

  return (
    <details className="option-block" open={isOpen} onToggle={(event) => setIsOpen(event.currentTarget.open)}>
      <summary>
        {icon}
        <span>{title}</span>
        <ChevronDown size={15} />
      </summary>
      <div className="option-content">{children}</div>
    </details>
  );
}

function OptionRow({ label, value, children }) {
  return (
    <div className="option-row">
      <label>
        <span>{label}</span>
        {value !== undefined && <output>{value}</output>}
      </label>
      <div className="option-control">{children}</div>
    </div>
  );
}

function SelectControl({ value, onChange, options, label }) {
  return (
    <select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)}>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function RangeControl({ value, min, max, step = 1, onChange, label }) {
  const updateValue = (nextValue) => {
    if (!Number.isFinite(Number(nextValue))) return;
    onChange(clampNumber(nextValue, min, max));
  };

  return (
    <div className="range-control">
      <input
        aria-label={label}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => updateValue(event.target.value)}
      />
      <input
        className="range-number"
        aria-label={`${label} value`}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => updateValue(event.target.value)}
      />
    </div>
  );
}

function MapZoomControls({ value, onChange }) {
  const updateZoom = (nextValue) => {
    if (!Number.isFinite(Number(nextValue))) return;
    onChange(Number(clampNumber(nextValue, 0.5, 3).toFixed(2)));
  };

  return (
    <div className="map-zoom-controls" aria-label="Map zoom controls">
      <button
        type="button"
        className="step-button map-zoom-button"
        onClick={() => updateZoom(Number((value - 0.1).toFixed(2)))}
        aria-label="Zoom out"
        title="Zoom out"
      >
        <ZoomOut size={15} />
      </button>
      <input
        className="map-zoom-input"
        aria-label="Map zoom value"
        type="number"
        inputMode="decimal"
        min={0.5}
        max={3}
        step={0.05}
        value={value}
        onChange={(event) => updateZoom(event.target.value)}
      />
      <output>{Math.round(value * 100)}%</output>
      <button
        type="button"
        className="step-button map-zoom-button"
        onClick={() => updateZoom(Number((value + 0.1).toFixed(2)))}
        aria-label="Zoom in"
        title="Zoom in"
      >
        <ZoomIn size={15} />
      </button>
    </div>
  );
}

function ViewModeSwitch({ viewMode, setViewMode }) {
  const modes = [
    { value: "flat", label: "Flat", icon: MapIcon },
    { value: "globe", label: "Globe", icon: Globe2 },
  ];

  return (
    <div className="view-mode-switch" aria-label="View mode">
      {modes.map((mode) => {
        const Icon = mode.icon;
        const active = viewMode === mode.value;
        return (
          <button
            key={mode.value}
            type="button"
            className={`view-mode-button ${active ? "is-active" : ""}`}
            onClick={() => setViewMode(mode.value)}
            aria-pressed={active}
          >
            <Icon size={15} />
            {mode.label}
          </button>
        );
      })}
    </div>
  );
}

function TiltControl({ value, onChange, label }) {
  const updateTilt = (nextValue) => {
    if (!Number.isFinite(Number(nextValue))) return;
    onChange(clampNumber(nextValue, -45, 45));
  };

  return (
    <div className="tilt-control">
      <button
        type="button"
        className="step-button"
        onClick={() => updateTilt(value - 1)}
        aria-label={`${label} decrease`}
        title={`${label} decrease`}
      >
        <Minus size={15} />
      </button>
      <input
        aria-label={label}
        type="range"
        min={-45}
        max={45}
        step={1}
        value={value}
        onChange={(event) => updateTilt(event.target.value)}
      />
      <input
        className="range-number"
        aria-label={`${label} value`}
        type="number"
        inputMode="numeric"
        min={-45}
        max={45}
        step={1}
        value={value}
        onChange={(event) => updateTilt(event.target.value)}
      />
      <button
        type="button"
        className="step-button"
        onClick={() => updateTilt(value + 1)}
        aria-label={`${label} increase`}
        title={`${label} increase`}
      >
        <Plus size={15} />
      </button>
    </div>
  );
}

function DepthControl({ value, onChange }) {
  const updateDepth = (nextValue) => {
    if (!Number.isFinite(Number(nextValue))) return;
    onChange(clampNumber(nextValue, 0, 100));
  };

  return (
    <div className="depth-control">
      <button
        type="button"
        className="step-button"
        onClick={() => updateDepth(value - 5)}
        aria-label="Depth decrease"
        title="Depth decrease"
      >
        <Minus size={15} />
      </button>
      <input
        aria-label="Depth"
        type="range"
        min={0}
        max={100}
        step={5}
        value={value}
        onChange={(event) => updateDepth(event.target.value)}
      />
      <input
        className="range-number"
        aria-label="Depth value"
        type="number"
        inputMode="numeric"
        min={0}
        max={100}
        step={1}
        value={value}
        onChange={(event) => updateDepth(event.target.value)}
      />
      <button
        type="button"
        className="step-button"
        onClick={() => updateDepth(value + 5)}
        aria-label="Depth increase"
        title="Depth increase"
      >
        <Plus size={15} />
      </button>
    </div>
  );
}

function ColorSwatch({ value, onChange, label }) {
  return (
    <div className="color-control">
      <button
        type="button"
        className="color-swatch"
        style={{ backgroundColor: value === "transparent" ? "#18171a" : value }}
        aria-label={label}
        title={label}
      >
        {value === "transparent" && <span className="transparent-grid" />}
      </button>
      <input
        type="color"
        value={value === "transparent" ? "#18171a" : value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={label}
      />
    </div>
  );
}

function ControlPanel({
  selection,
  setSelection,
  stateSelection,
  setStateSelection,
  background,
  setBackground,
  transparent,
  setTransparent,
  mapDepth,
  setMapDepth,
  tiltX,
  setTiltX,
  tiltY,
  setTiltY,
  density,
  setDensity,
  dotSize,
  setDotSize,
  dotColor,
  setDotColor,
  shape,
  setShape,
  shaderSettings,
  setShaderSettings,
  viewMode,
}) {
  const selectedCountryId = selection.startsWith("country:") ? selection.replace("country:", "") : "";
  const showStates = selectedCountryId === US_COUNTRY_ID;
  const shaderEffect = shaderSettings.effect;
  const updateShaderSetting = (key, value) => {
    setShaderSettings((settings) => ({
      ...settings,
      [key]: value,
    }));
  };

  return (
    <aside className="control-panel">
      <PanelSection title="Map">
        <OptionRow label="Area">
          <SelectControl
            label="Country or region"
            value={selection}
            onChange={(value) => {
              setSelection(value);
              if (value !== `country:${US_COUNTRY_ID}`) setStateSelection("all");
            }}
            options={areaOptions}
          />
        </OptionRow>
        {showStates && (
          <OptionRow label="State">
            <SelectControl
              label="State"
              value={stateSelection}
              onChange={setStateSelection}
              options={[
                { value: "all", label: "All States" },
                ...usStates.map((state) => ({
                  value: state._id,
                  label: state._displayName,
                })),
              ]}
            />
          </OptionRow>
        )}
      </PanelSection>

      <PanelSection title="Dots">
        <OptionRow label="Shape">
          <SelectControl
            label="Dot shape"
            value={shape}
            onChange={setShape}
            options={["Circle", "Hexagon", "Square", "Diamond"].map((item) => ({
              value: item,
              label: item,
            }))}
          />
        </OptionRow>
        <OptionRow label="Density" value={density}>
          <RangeControl
            label="Density"
            min={1}
            max={100}
            value={density}
            onChange={setDensity}
          />
        </OptionRow>
        <OptionRow label="Size" value={dotSize}>
          <RangeControl
            label="Size"
            min={1}
            max={25}
            value={dotSize}
            onChange={setDotSize}
          />
        </OptionRow>
        <OptionRow label="Color">
          <ColorSwatch value={dotColor} onChange={setDotColor} label="Select dot color" />
        </OptionRow>
      </PanelSection>

      <PanelSection title="Canvas">
        <OptionRow label="Background">
          <div className="background-control">
            <ColorSwatch value={background} onChange={setBackground} label="Select background color" />
            <button
              type="button"
              className={`transparent-toggle ${transparent ? "is-active" : ""}`}
              onClick={() => setTransparent((value) => !value)}
            >
              {transparent ? "Transparent" : "Solid"}
            </button>
          </div>
        </OptionRow>
        {viewMode === "flat" ? (
          <>
            <OptionRow label="Tilt X" value={`${tiltX} deg`}>
              <TiltControl label="Tilt X" value={tiltX} onChange={setTiltX} />
            </OptionRow>
            <OptionRow label="Tilt Y" value={`${tiltY} deg`}>
              <TiltControl label="Tilt Y" value={tiltY} onChange={setTiltY} />
            </OptionRow>
            <OptionRow label="Depth" value={`${mapDepth}%`}>
              <DepthControl value={mapDepth} onChange={setMapDepth} />
            </OptionRow>
          </>
        ) : (
          <OptionRow label="Spin" value={shaderSettings.motion}>
            <RangeControl
              label="Globe spin"
              min={0}
              max={100}
              value={shaderSettings.motion}
              onChange={(value) => updateShaderSetting("motion", value)}
            />
          </OptionRow>
        )}
      </PanelSection>

      <PanelSection title="Effects">
        <OptionRow label="Pass">
          <SelectControl
            label="Shader effect"
            value={shaderEffect}
            onChange={(value) => updateShaderSetting("effect", value)}
            options={shaderEffectOptions}
          />
        </OptionRow>
        {shaderEffect !== "none" && (
          <>
            <OptionRow label="Intensity" value={shaderSettings.intensity}>
              <RangeControl
                label="Effect intensity"
                min={0}
                max={100}
                value={shaderSettings.intensity}
                onChange={(value) => updateShaderSetting("intensity", value)}
              />
            </OptionRow>
            {effectsWithSplit.has(shaderEffect) && (
              <OptionRow label="Split" value={`${shaderSettings.split}px`}>
                <RangeControl
                  label="Chromatic split"
                  min={0}
                  max={30}
                  value={shaderSettings.split}
                  onChange={(value) => updateShaderSetting("split", value)}
                />
              </OptionRow>
            )}
            {effectsWithCellSize.has(shaderEffect) && (
              <OptionRow label="Cell Size" value={shaderSettings.cellSize}>
                <RangeControl
                  label="Effect cell size"
                  min={4}
                  max={42}
                  value={shaderSettings.cellSize}
                  onChange={(value) => updateShaderSetting("cellSize", value)}
                />
              </OptionRow>
            )}
            {effectsWithScanlines.has(shaderEffect) && (
              <OptionRow label="Scanlines" value={shaderSettings.scanlines}>
                <RangeControl
                  label="Scanline strength"
                  min={0}
                  max={100}
                  value={shaderSettings.scanlines}
                  onChange={(value) => updateShaderSetting("scanlines", value)}
                />
              </OptionRow>
            )}
            {shaderEffect === "threshold" && (
              <OptionRow label="Threshold" value={shaderSettings.threshold}>
                <RangeControl
                  label="Threshold"
                  min={0}
                  max={100}
                  value={shaderSettings.threshold}
                  onChange={(value) => updateShaderSetting("threshold", value)}
                />
              </OptionRow>
            )}
            {effectsWithWarp.has(shaderEffect) && (
              <OptionRow label="Warp" value={shaderSettings.warp}>
                <RangeControl
                  label="Shader warp"
                  min={0}
                  max={100}
                  value={shaderSettings.warp}
                  onChange={(value) => updateShaderSetting("warp", value)}
                />
              </OptionRow>
            )}
            {effectsWithMotion.has(shaderEffect) && (
              <OptionRow label="Motion" value={shaderSettings.motion}>
                <RangeControl
                  label="Shader motion"
                  min={0}
                  max={100}
                  value={shaderSettings.motion}
                  onChange={(value) => updateShaderSetting("motion", value)}
                />
              </OptionRow>
            )}
            <OptionRow label="Grain" value={shaderSettings.grain}>
              <RangeControl
                label="Grain"
                min={0}
                max={100}
                value={shaderSettings.grain}
                onChange={(value) => updateShaderSetting("grain", value)}
              />
            </OptionRow>
          </>
        )}
      </PanelSection>

    </aside>
  );
}

function DottedMapBackground({
  svgMarkup,
  svgWidth,
  svgHeight,
  interactive = true,
  mapZoom,
  setMapZoom,
  mapOffset,
  setMapOffset,
  setSelectedDots,
  label,
  shaderEffect,
  shaderSettings,
  shaderCanvasRef,
}) {
  const dragState = useRef({
    active: false,
    baseX: 0,
    baseY: 0,
    moved: false,
    startX: 0,
    startY: 0,
  });
  const [isDraggingMap, setIsDraggingMap] = useState(false);

  const getClientPoint = (event) => {
    const touch = event.touches?.[0] || event.changedTouches?.[0];
    const x = touch?.clientX ?? event.clientX;
    const y = touch?.clientY ?? event.clientY;

    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    return { x, y };
  };

  const startDrag = useCallback((event) => {
    if (Number.isFinite(event.button) && event.button !== 0) return;

    const point = getClientPoint(event);
    if (!point) return;

    dragState.current = {
      active: true,
      baseX: mapOffset.x,
      baseY: mapOffset.y,
      moved: false,
      startX: point.x,
      startY: point.y,
    };
    setIsDraggingMap(true);
    if (event.pointerId !== undefined) {
      event.currentTarget.setPointerCapture?.(event.pointerId);
    }
  }, [mapOffset.x, mapOffset.y]);

  const dragMap = useCallback((event) => {
    const state = dragState.current;
    if (!state.active) return;

    const point = getClientPoint(event);
    if (!point) return;

    const nextX = state.baseX + point.x - state.startX;
    const nextY = state.baseY + point.y - state.startY;

    if (Math.abs(point.x - state.startX) > 3 || Math.abs(point.y - state.startY) > 3) {
      state.moved = true;
    }

    event.preventDefault();
    setMapOffset({ x: nextX, y: nextY });
  }, [setMapOffset]);

  const stopDrag = useCallback((event) => {
    if (!dragState.current.active) return;

    dragState.current.active = false;
    setIsDraggingMap(false);
    if (event.pointerId !== undefined) {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    }
  }, []);

  const zoomMap = useCallback((event) => {
    const point = getClientPoint(event);
    if (!point) return;

    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const pointerX = point.x - centerX;
    const pointerY = point.y - centerY;
    const intensity = event.ctrlKey ? 0.01 : 0.0018;
    const nextZoom = clampNumber(mapZoom * Math.exp(-event.deltaY * intensity), 0.5, 3);
    const zoomRatio = nextZoom / mapZoom;

    setMapZoom(Number(nextZoom.toFixed(3)));
    setMapOffset((offset) => ({
      x: pointerX - (pointerX - offset.x) * zoomRatio,
      y: pointerY - (pointerY - offset.y) * zoomRatio,
    }));
  }, [mapZoom, setMapOffset, setMapZoom]);

  const toggleDot = useCallback((event) => {
    if (dragState.current.moved) {
      dragState.current.moved = false;
      return;
    }

    const target = event.target.closest?.(".map-dot");
    const dotId = target?.dataset?.dotId;
    if (!dotId) return;

    setSelectedDots((current) => {
      const next = new Set(current);
      if (next.has(dotId)) next.delete(dotId);
      else next.add(dotId);
      return next;
    });
  }, [setSelectedDots]);

  const hasWebglShader = shaderEffect && shaderEffect !== "none";

  return (
    <div
      className={`map-background effect-${shaderEffect || "none"} ${hasWebglShader ? "has-webgl-shader" : ""} ${
        isDraggingMap ? "is-dragging" : ""
      } ${
        interactive ? "" : "is-passive"
      }`}
      aria-label={label}
      onPointerDown={startDrag}
      onPointerMove={dragMap}
      onPointerUp={stopDrag}
      onPointerCancel={stopDrag}
      onMouseDown={startDrag}
      onMouseMove={dragMap}
      onMouseUp={stopDrag}
      onMouseLeave={stopDrag}
      onTouchStart={startDrag}
      onTouchMove={dragMap}
      onTouchEnd={stopDrag}
      onTouchCancel={stopDrag}
      onWheel={zoomMap}
      onClick={toggleDot}
    >
      <div className="map-svg-layer" dangerouslySetInnerHTML={{ __html: svgMarkup }} />
      {hasWebglShader && (
        <ShaderCanvas
          svgMarkup={svgMarkup}
          width={svgWidth}
          height={svgHeight}
          shaderSettings={shaderSettings}
          canvasHandleRef={shaderCanvasRef}
        />
      )}
    </div>
  );
}

function GlobeBackground({
  mapData,
  selectedDots,
  dotColor,
  dotSize,
  shape,
  background,
  interactive = true,
  morphMode = "globe",
  morphTransition = null,
  transparent,
  mapZoom,
  setMapZoom,
  setSelectedDots,
  shaderSettings,
  label,
  canvasHandleRef,
}) {
  const mountRef = useRef(null);
  const stateRef = useRef({
    active: false,
    currentX: GLOBE_INITIAL_ROTATION.x,
    currentY: GLOBE_INITIAL_ROTATION.y,
    lastX: 0,
    lastY: 0,
    moved: false,
    targetX: GLOBE_INITIAL_ROTATION.x,
    targetY: GLOBE_INITIAL_ROTATION.y,
  });
  const threeRef = useRef(null);
  const mapZoomRef = useRef(mapZoom);
  const initialMorphProgress = morphTransition === "to-globe" ? 0 : morphMode === "globe" ? 1 : 0;
  const morphRef = useRef({
    active: false,
    progress: initialMorphProgress,
    start: initialMorphProgress,
    startTime: 0,
    target: initialMorphProgress,
  });
  const settingsRef = useRef(shaderSettings);
  const [isDraggingGlobe, setIsDraggingGlobe] = useState(false);

  mapZoomRef.current = mapZoom;
  settingsRef.current = shaderSettings;

  const getClientPoint = (event) => {
    const touch = event.touches?.[0] || event.changedTouches?.[0];
    const x = touch?.clientX ?? event.clientX;
    const y = touch?.clientY ?? event.clientY;

    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    return { x, y };
  };

  const startDrag = useCallback((event) => {
    if (Number.isFinite(event.button) && event.button !== 0) return;

    const point = getClientPoint(event);
    if (!point) return;

    stateRef.current.active = true;
    stateRef.current.lastX = point.x;
    stateRef.current.lastY = point.y;
    stateRef.current.moved = false;
    setIsDraggingGlobe(true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  }, []);

  const dragGlobe = useCallback((event) => {
    const state = stateRef.current;
    if (!state.active) return;

    const point = getClientPoint(event);
    if (!point) return;

    const dx = point.x - state.lastX;
    const dy = point.y - state.lastY;
    state.lastX = point.x;
    state.lastY = point.y;
    state.targetY += dx * 0.006;
    state.targetX = clampNumber(state.targetX + dy * 0.0045, -1.18, 1.18);
    state.moved = state.moved || Math.abs(dx) > 2 || Math.abs(dy) > 2;
    event.preventDefault();
  }, []);

  const stopDrag = useCallback((event) => {
    if (!stateRef.current.active) return;
    stateRef.current.active = false;
    setIsDraggingGlobe(false);
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  }, []);

  const zoomGlobe = useCallback((event) => {
    event.preventDefault();
    const intensity = event.ctrlKey ? 0.01 : 0.0018;
    const nextZoom = clampNumber(mapZoom * Math.exp(-event.deltaY * intensity), 0.5, 3);
    setMapZoom(Number(nextZoom.toFixed(3)));
  }, [mapZoom, setMapZoom]);

  const toggleNearestDot = useCallback((event) => {
    if (stateRef.current.moved) {
      stateRef.current.moved = false;
      return;
    }

    const refs = threeRef.current;
    if (!refs?.camera || !refs?.renderer || !refs?.dotLayer) return;

    const rect = refs.renderer.domElement.getBoundingClientRect();
    const pointer = new THREE.Vector2(
      ((event.clientX - rect.left) / rect.width) * 2 - 1,
      -((event.clientY - rect.top) / rect.height) * 2 + 1,
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(pointer, refs.camera);
    const hits = raycaster.intersectObjects(refs.dotLayer.children, true);
    const instanceId = hits[0]?.instanceId;
    const pointMap = hits[0]?.object?.userData?.pointIds;
    const dotId = Array.isArray(pointMap) ? pointMap[instanceId] : null;
    if (!dotId) return;

    refs.setSelectedDots?.((current) => {
      const next = new Set(current);
      if (next.has(dotId)) next.delete(dotId);
      else next.add(dotId);
      return next;
    });
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return undefined;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
    camera.position.set(0, 0, GLOBE_CAMERA_DISTANCE);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    mount.appendChild(renderer.domElement);

    if (canvasHandleRef) {
      canvasHandleRef.current = renderer.domElement;
    }

    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    const baseMaterial = new THREE.MeshStandardMaterial({
      color: new THREE.Color("#18191d"),
      metalness: 0.12,
      roughness: 0.78,
      transparent: true,
      opacity: 0.28,
    });
    const globeMesh = new THREE.Mesh(new THREE.SphereGeometry(GLOBE_RADIUS, 96, 96), baseMaterial);
    globeGroup.add(globeMesh);

    const atmosphereMaterial = createAtmosphereMaterial();
    const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(GLOBE_RADIUS + 0.18, 96, 96), atmosphereMaterial);
    globeGroup.add(atmosphere);

    const graticule = createGraticule();
    globeGroup.add(graticule);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.1);
    keyLight.position.set(2.2, 1.8, 4);
    scene.add(keyLight);
    scene.add(new THREE.AmbientLight(0xffffff, 0.76));

    threeRef.current = {
      atmosphereMaterial,
      atmosphereIntensity: 0.9,
      baseDistance: GLOBE_CAMERA_DISTANCE,
      baseMaterial,
      baseOpacity: 0.3,
      camera,
      dotLayer: null,
      globeGroup,
      graticule,
      graticuleOpacity: 0.13,
      renderer,
      scene,
      setSelectedDots,
    };
    applyGlobeShellProgress(threeRef.current, morphRef.current.progress);

    const resize = () => {
      const rect = mount.getBoundingClientRect();
      const width = Math.max(1, Math.floor(rect.width));
      const height = Math.max(1, Math.floor(rect.height));
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      threeRef.current.baseDistance = GLOBE_CAMERA_DISTANCE * Math.max(1, 0.78 / Math.max(camera.aspect, 0.1));
      renderer.setSize(width, height, false);
    };

    const observer = new ResizeObserver(resize);
    observer.observe(mount);
    resize();

    let frame = 0;
    let lastTime = window.performance.now();
    const animate = (now) => {
      const delta = Math.min(48, now - lastTime);
      lastTime = now;
      const state = stateRef.current;
      const settings = settingsRef.current;
      const effectMotion = clampNumber(settings.motion ?? 35, 0, 100);
      const spin = 0.00008 + effectMotion * 0.0000035;

      if (!state.active) {
        state.targetY += spin * delta;
      }

      state.currentX += (state.targetX - state.currentX) * 0.095;
      state.currentY += (state.targetY - state.currentY) * 0.095;

      const morph = morphRef.current;
      if (morph.active) {
        const elapsed = now - morph.startTime;
        const progress = easeInOutCubic(elapsed / GLOBE_MORPH_DURATION);
        morph.progress = morph.start + (morph.target - morph.start) * progress;
        if (progress >= 1) {
          morph.progress = morph.target;
          morph.active = false;
        }
      }

      const rotationProgress = smoothStep(0.08, 1, morph.progress);
      globeGroup.rotation.x = state.currentX * rotationProgress;
      globeGroup.rotation.y = state.currentY * rotationProgress;

      if (threeRef.current.dotLayer) {
        applyDotLayerMorph(threeRef.current.dotLayer, morph.progress);
      }
      applyGlobeShellProgress(threeRef.current, morph.progress);

      camera.position.z = threeRef.current.baseDistance / clampNumber(mapZoomRef.current, 0.5, 3);
      camera.updateProjectionMatrix();
      renderer.render(scene, camera);
      frame = window.requestAnimationFrame(animate);
    };
    frame = window.requestAnimationFrame(animate);

    return () => {
      window.cancelAnimationFrame(frame);
      observer.disconnect();
      if (canvasHandleRef) {
        canvasHandleRef.current = null;
      }
      disposeThreeObject(scene);
      renderer.dispose();
      renderer.domElement.remove();
      threeRef.current = null;
    };
  }, [canvasHandleRef, setSelectedDots]);

  useEffect(() => {
    const refs = threeRef.current;
    if (!refs) return;

    const nextLayer = buildGlobeDotLayer({
      mapData,
      selectedDots,
      dotColor,
      dotSize,
      shape,
      shaderSettings,
      morphProgress: morphRef.current.progress,
    });

    if (refs.dotLayer) {
      refs.globeGroup.remove(refs.dotLayer);
      disposeThreeObject(refs.dotLayer);
    }

    refs.dotLayer = nextLayer;
    refs.globeGroup.add(nextLayer);
  }, [dotColor, dotSize, mapData, selectedDots, shaderSettings, shape]);

  useEffect(() => {
    const target = morphMode === "globe" ? 1 : 0;
    const morph = morphRef.current;
    if (Math.abs(morph.progress - target) < 0.001) {
      morph.progress = target;
      morph.target = target;
      morph.active = false;
      applyDotLayerMorph(threeRef.current?.dotLayer, target);
      applyGlobeShellProgress(threeRef.current, target);
      return;
    }

    morph.start = morph.progress;
    morph.target = target;
    morph.startTime = window.performance.now();
    morph.active = true;
  }, [morphMode]);

  useEffect(() => {
    const refs = threeRef.current;
    if (!refs) return;

    const bgColor = new THREE.Color(transparent ? "#151517" : background);
    const surfaceColor = bgColor.clone().lerp(new THREE.Color("#23262d"), transparent ? 0.52 : 0.36);
    const glowColor = new THREE.Color(dotColor === "#ffffff" ? CLICK_HIGHLIGHT : dotColor);
    const intensity = clampNumber(shaderSettings.intensity ?? 45, 0, 100) / 100;

    refs.baseMaterial.color.copy(surfaceColor);
    refs.baseOpacity = transparent ? 0.2 : 0.3;
    refs.atmosphereMaterial.uniforms.glowColor.value.copy(glowColor);
    refs.atmosphereIntensity = 0.72 + intensity * 0.64;
    refs.graticuleOpacity = 0.08 + intensity * 0.08;
    refs.graticule.children.forEach((line) => {
      line.material.color.copy(glowColor.clone().lerp(new THREE.Color("#ffffff"), 0.62));
    });
    applyGlobeShellProgress(refs, morphRef.current.progress);
  }, [background, dotColor, shaderSettings.intensity, transparent]);

  return (
    <div
      ref={mountRef}
      className={`globe-background effect-${shaderSettings.effect || "none"} ${
        isDraggingGlobe ? "is-dragging" : ""
      } ${
        interactive ? "" : "is-passive"
      }`}
      aria-label={label}
      onPointerDown={startDrag}
      onPointerMove={dragGlobe}
      onPointerUp={stopDrag}
      onPointerCancel={stopDrag}
      onMouseDown={startDrag}
      onMouseMove={dragGlobe}
      onMouseUp={stopDrag}
      onMouseLeave={stopDrag}
      onTouchStart={startDrag}
      onTouchMove={dragGlobe}
      onTouchEnd={stopDrag}
      onTouchCancel={stopDrag}
      onWheel={zoomGlobe}
      onClick={toggleNearestDot}
    />
  );
}

function ExportMenu({ canvasScale, setCanvasScale, copyStatus, copySvg, svgMarkup, exportPng, exportSvg }) {
  const [open, setOpen] = useState(false);
  const runExport = (exportFile) => {
    exportFile();
    setOpen(false);
  };

  return (
    <div className="export-menu">
      <button
        type="button"
        className={`button export-menu-button ${open ? "button-active" : ""}`}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Download size={15} />
        Export
        <ChevronDown size={15} />
      </button>

      {open && (
        <div className="export-popover" role="menu">
          <div className="export-scale-group" aria-label="Export scale">
            <span>Scale</span>
            <div className="export-scale-options">
              {["1x", "2x", "3x", "4x"].map((scale) => (
                <button
                  key={scale}
                  type="button"
                  className={`export-scale-option ${canvasScale === scale ? "is-active" : ""}`}
                  onClick={() => setCanvasScale(scale)}
                  aria-pressed={canvasScale === scale}
                >
                  {scale}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            className={`export-menu-item ${copyStatus === "copied" ? "is-success" : ""} ${
              copyStatus === "manual" ? "is-manual" : ""
            }`}
            onClick={copySvg}
            role="menuitem"
          >
            {copyStatus === "copied" ? <Check size={15} /> : <Clipboard size={15} />}
            {copyStatus === "copied" ? "Copied SVG" : copyStatus === "manual" ? "Select SVG" : "Copy SVG"}
          </button>
          {copyStatus === "manual" && (
            <div className="copy-fallback-group">
              <span>Clipboard blocked. Select the SVG code below.</span>
              <textarea
                className="copy-fallback"
                aria-label="SVG code"
                readOnly
                value={svgMarkup}
                onFocus={(event) => event.target.select()}
                onClick={(event) => event.currentTarget.select()}
              />
            </div>
          )}
          <button type="button" className="export-menu-item" onClick={() => runExport(exportPng)} role="menuitem">
            <Download size={15} />
            PNG
          </button>
          <button type="button" className="export-menu-item" onClick={() => runExport(exportSvg)} role="menuitem">
            <Download size={15} />
            SVG
          </button>
        </div>
      )}
    </div>
  );
}

function TopActions({
  canvasScale,
  setCanvasScale,
  copyStatus,
  copySvg,
  svgMarkup,
  panelCollapsed,
  setPanelCollapsed,
  exportPng,
  exportSvg,
}) {
  return (
    <div className="top-actions">
      <ExportMenu
        canvasScale={canvasScale}
        setCanvasScale={setCanvasScale}
        copyStatus={copyStatus}
        copySvg={copySvg}
        svgMarkup={svgMarkup}
        exportPng={exportPng}
        exportSvg={exportSvg}
      />
      <IconButton
        title={panelCollapsed ? "Show panel" : "Hide panel"}
        onClick={() => setPanelCollapsed((value) => !value)}
      >
        {panelCollapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
        {panelCollapsed ? "Show Panel" : "Hide Panel"}
      </IconButton>
    </div>
  );
}

function exportScaleValue(canvasScale) {
  return Number(canvasScale.replace("x", "")) || 1;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function copyTextToClipboard(text) {
  try {
    if (!navigator.clipboard?.writeText) throw new Error("Clipboard API unavailable");
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "0";
    textarea.style.left = "-9999px";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus({ preventScroll: true });
    textarea.select();
    textarea.setSelectionRange(0, text.length);
    const copied = document.execCommand("copy");
    textarea.remove();
    if (!copied) throw new Error("Copy command failed");
    return true;
  }
}

function App() {
  const shaderCanvasRef = useRef(null);
  const globeCanvasRef = useRef(null);
  const [selection, setSelection] = useState("world");
  const [stateSelection, setStateSelection] = useState("all");
  const [canvasScale, setCanvasScale] = useState("1x");
  const [background, setBackground] = useState("#0a0a0a");
  const [transparent, setTransparent] = useState(false);
  const [viewMode, setViewMode] = useState("globe");
  const [viewTransition, setViewTransition] = useState(null);
  const viewTransitionTimeoutRef = useRef(0);
  const [mapZoom, setMapZoom] = useState(1);
  const [mapOffset, setMapOffset] = useState({ x: 0, y: 0 });
  const [mapDepth, setMapDepth] = useState(55);
  const [tiltX, setTiltX] = useState(0);
  const [tiltY, setTiltY] = useState(0);
  const [density, setDensity] = useState(40);
  const [dotSize, setDotSize] = useState(10);
  const [dotColor, setDotColor] = useState("#ffffff");
  const [shape, setShape] = useState("Circle");
  const [shaderSettings, setShaderSettings] = useState(() => ({ ...DEFAULT_SHADER_SETTINGS }));
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [copyStatus, setCopyStatus] = useState("idle");
  const [selectedDots, setSelectedDots] = useState(new Set());

  const selected = useMemo(() => {
    const selectedCountryId = selection.startsWith("country:") ? selection.replace("country:", "") : "";
    const shouldUseState = selectedCountryId === US_COUNTRY_ID && stateSelection !== "all";

    if (shouldUseState) {
      const selectedState = usStates.find((item) => item._id === stateSelection) || usStates[0];
      return {
        mode: "state",
        label: selectedState._displayName,
        collection: makeFeatureCollection([selectedState]),
        countryCodes: [],
      };
    }

    const option = areaOptionByValue.get(selection) || areaOptions[0];

    return {
      mode: "country",
      label: option.label.replace(" (Region)", "").replace(" (Subregion)", ""),
      countryCodes: option.ids,
      collection: null,
    };
  }, [selection, stateSelection]);

  const mapData = useMemo(() => {
    if (selected.mode === "state") {
      return createStateMapData(selected.collection, density, DEFAULT_STATE_PADDING, shape);
    }

    return createCountryMapData(selected.countryCodes, density);
  }, [density, selected, shape]);

  const displaySvg = useMemo(
    () =>
      createDottedSvg({
        mapData,
        dotColor,
        dotSize,
        shape,
        background,
        transparent: true,
        selectedDots,
        mode: selected.mode,
        shaderSettings,
        includeSvgEffects: false,
        crop: false,
        label: `${selected.label} dotted map`,
      }),
    [background, dotColor, dotSize, mapData, selected.label, selected.mode, selectedDots, shaderSettings, shape],
  );

  const exportSvgData = useMemo(
    () =>
      createDottedSvg({
        mapData,
        dotColor,
        dotSize,
        shape,
        background,
        transparent,
        selectedDots,
        mode: selected.mode,
        shaderSettings,
        crop: true,
        scale: exportScaleValue(canvasScale),
        label: `${selected.label} dotted map`,
      }),
    [
      background,
      canvasScale,
      dotColor,
      dotSize,
      mapData,
      selected.label,
      selected.mode,
      selectedDots,
      shaderSettings,
      shape,
      transparent,
    ],
  );

  const reset = () => {
    setSelection("world");
    setStateSelection("all");
    setCanvasScale("1x");
    setBackground("#0a0a0a");
    setTransparent(false);
    setViewMode("globe");
    setViewTransition(null);
    window.clearTimeout(viewTransitionTimeoutRef.current);
    setMapZoom(1);
    setMapOffset({ x: 0, y: 0 });
    setMapDepth(55);
    setTiltX(0);
    setTiltY(0);
    setDensity(40);
    setDotSize(10);
    setDotColor("#ffffff");
    setShape("Circle");
    setShaderSettings({ ...DEFAULT_SHADER_SETTINGS });
    setPanelCollapsed(false);
    setSelectedDots(new Set());
  };

  const changeViewMode = useCallback((nextMode) => {
    if (nextMode === viewMode) return;

    window.clearTimeout(viewTransitionTimeoutRef.current);
    setViewTransition(nextMode === "globe" ? "to-globe" : "to-flat");
    setViewMode(nextMode);
    viewTransitionTimeoutRef.current = window.setTimeout(() => {
      setViewTransition(null);
    }, GLOBE_MORPH_DURATION + 80);
  }, [viewMode]);

  useEffect(() => () => window.clearTimeout(viewTransitionTimeoutRef.current), []);

  const exportSvg = () => {
    downloadBlob(new Blob([exportSvgData.svg], { type: "image/svg+xml;charset=utf-8" }), "scaled_map.svg");
  };

  const copySvg = useCallback(async () => {
    try {
      await copyTextToClipboard(exportSvgData.svg);
      setCopyStatus("copied");
      window.setTimeout(() => setCopyStatus("idle"), 1800);
      return true;
    } catch {
      setCopyStatus("manual");
      return false;
    }
  }, [exportSvgData.svg]);

  const exportPng = () => {
    const activeGlobeCanvas = viewMode === "globe" ? globeCanvasRef.current : null;
    if (activeGlobeCanvas?.width && activeGlobeCanvas?.height) {
      const scale = exportScaleValue(canvasScale);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(activeGlobeCanvas.width * scale);
      canvas.height = Math.round(activeGlobeCanvas.height * scale);
      const context = canvas.getContext("2d");
      if (!context) return;
      if (!transparent) {
        context.fillStyle = background;
        context.fillRect(0, 0, canvas.width, canvas.height);
      }
      context.imageSmoothingEnabled = true;
      context.imageSmoothingQuality = "high";
      context.drawImage(activeGlobeCanvas, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((pngBlob) => {
        if (pngBlob) downloadBlob(pngBlob, "world-in-dots-globe.png");
      }, "image/png");
      return;
    }

    const activeShaderCanvas = shaderSettings.effect !== "none" ? shaderCanvasRef.current : null;

    if (activeShaderCanvas?.width && activeShaderCanvas?.height) {
      const canvas = document.createElement("canvas");
      canvas.width = activeShaderCanvas.width;
      canvas.height = activeShaderCanvas.height;
      const context = canvas.getContext("2d");
      if (!context) return;
      if (!transparent) {
        context.fillStyle = background;
        context.fillRect(0, 0, canvas.width, canvas.height);
      }
      context.drawImage(activeShaderCanvas, 0, 0);
      canvas.toBlob((pngBlob) => {
        if (pngBlob) downloadBlob(pngBlob, "world-in-dots-shader.png");
      }, "image/png");
      return;
    }

    const blob = new Blob([exportSvgData.svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const image = new Image();

    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(exportSvgData.width);
      canvas.height = Math.round(exportSvgData.height);
      const context = canvas.getContext("2d");
      if (!transparent) {
        context.fillStyle = background;
        context.fillRect(0, 0, canvas.width, canvas.height);
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((pngBlob) => {
        if (pngBlob) downloadBlob(pngBlob, "world-in-dots.png");
        URL.revokeObjectURL(url);
      }, "image/png");
    };

    image.src = url;
  };

  const isViewTransitioning = Boolean(viewTransition);
  const showFlatBackground = viewMode === "flat" && !isViewTransitioning;
  const showGlobeBackground = viewMode === "globe" || isViewTransitioning;

  return (
    <main
      className={`app-shell ${viewMode === "globe" ? "is-globe-mode" : "is-flat-mode"} ${
        transparent ? "is-transparent-preview" : ""
      } ${
        panelCollapsed ? "is-panel-collapsed" : ""
      } ${
        viewTransition ? `is-view-transitioning is-${viewTransition}` : ""
      }`}
      style={{
        "--preview-bg": transparent ? "#171717" : background,
        "--map-offset-x": `${mapOffset.x}px`,
        "--map-offset-y": `${mapOffset.y}px`,
        "--map-perspective": `${1800 - mapDepth * 14}px`,
        "--map-zoom": mapZoom,
        "--shader-glow": `${Math.max(0, shaderSettings.intensity * 0.16)}px`,
        "--shader-glow-wide": `${Math.max(0, shaderSettings.intensity * 0.32)}px`,
        "--shader-intensity": shaderSettings.intensity / 100,
        "--shader-split": `${shaderSettings.split}px`,
        "--shader-split-neg": `${-shaderSettings.split}px`,
        "--tilt-x": `${tiltX}deg`,
        "--tilt-y": `${tiltY}deg`,
      }}
    >
      {showGlobeBackground && (
        <GlobeBackground
          mapData={mapData}
          selectedDots={selectedDots}
          dotColor={dotColor}
          dotSize={dotSize}
          shape={shape}
          background={background}
          transparent={transparent}
          morphMode={viewMode === "globe" ? "globe" : "flat"}
          morphTransition={viewTransition}
          interactive={viewMode === "globe" && !isViewTransitioning}
          mapZoom={mapZoom}
          setMapZoom={setMapZoom}
          setSelectedDots={setSelectedDots}
          shaderSettings={shaderSettings}
          canvasHandleRef={globeCanvasRef}
          label={`${selected.label} dotted globe background`}
        />
      )}
      {showFlatBackground && (
        <DottedMapBackground
          svgMarkup={displaySvg.svg}
          svgWidth={displaySvg.width}
          svgHeight={displaySvg.height}
          interactive={viewMode === "flat" && !isViewTransitioning}
          mapZoom={mapZoom}
          setMapZoom={setMapZoom}
          mapOffset={mapOffset}
          setMapOffset={setMapOffset}
          setSelectedDots={setSelectedDots}
          shaderEffect={shaderSettings.effect}
          shaderSettings={shaderSettings}
          shaderCanvasRef={shaderCanvasRef}
          label={`${selected.label} dotted map background`}
        />
      )}

      <TopActions
        canvasScale={canvasScale}
        setCanvasScale={setCanvasScale}
        copyStatus={copyStatus}
        copySvg={copySvg}
        svgMarkup={exportSvgData.svg}
        panelCollapsed={panelCollapsed}
        setPanelCollapsed={setPanelCollapsed}
        exportPng={exportPng}
        exportSvg={exportSvg}
      />

      <ViewModeSwitch viewMode={viewMode} setViewMode={changeViewMode} />
      <MapZoomControls value={mapZoom} onChange={setMapZoom} />

      {!panelCollapsed && (
        <section className="control-rail">
          <div className="panel-header">
            <div className="panel-meta">
              <span>{selected.label}</span>
              <span>{displaySvg.dotCount.toLocaleString()} dots</span>
            </div>
            <IconButton title="Reset view" onClick={reset} className="panel-reset-button">
              <RotateCcw size={15} />
              Reset
            </IconButton>
          </div>

          <ControlPanel
            selection={selection}
            setSelection={(value) => {
              setSelection(value);
              setSelectedDots(new Set());
            }}
            stateSelection={stateSelection}
            setStateSelection={(value) => {
              setStateSelection(value);
              setSelectedDots(new Set());
            }}
            background={background}
            setBackground={setBackground}
            transparent={transparent}
            setTransparent={setTransparent}
            mapDepth={mapDepth}
            setMapDepth={setMapDepth}
            tiltX={tiltX}
            setTiltX={setTiltX}
            tiltY={tiltY}
            setTiltY={setTiltY}
            density={density}
            setDensity={setDensity}
            dotSize={dotSize}
            setDotSize={setDotSize}
            dotColor={dotColor}
            setDotColor={setDotColor}
            shape={shape}
            setShape={setShape}
            shaderSettings={shaderSettings}
            setShaderSettings={setShaderSettings}
            viewMode={viewMode}
          />
        </section>
      )}
    </main>
  );
}

export default App;
