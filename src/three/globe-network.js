import * as THREE from "three";
import { GLOBE_RADIUS } from "../config/globe-settings.js";
import { latLngToVector3 } from "./coordinates.js";

// Major hub cities anchored to lat/lng. Picked for global coverage and
// recognizable silhouettes. Each carries a color that biases the pulse tone.
// Listed in priority order — the Pulses slider reveals these front-to-back,
// so the most visually anchoring hubs (SF / NYC / LDN / Tokyo) appear at
// lower values and the deeper-coverage cities fill in as it climbs.
const HUB_CITIES = [
  { id: "sf", lat: 37.7749, lng: -122.4194, color: "#7edfff" },
  { id: "nyc", lat: 40.7128, lng: -74.006, color: "#ffffff" },
  { id: "ldn", lat: 51.5074, lng: -0.1278, color: "#bfa3ff" },
  { id: "hnd", lat: 35.6762, lng: 139.6503, color: "#b7ffef" },
  { id: "sgp", lat: 1.3521, lng: 103.8198, color: "#6be7ff" },
  { id: "syd", lat: -33.8688, lng: 151.2093, color: "#9ad7ff" },
  { id: "sao", lat: -23.5505, lng: -46.6333, color: "#ff9ef3" },
  { id: "ber", lat: 52.52, lng: 13.405, color: "#ffd58a" },
  { id: "bom", lat: 19.076, lng: 72.8777, color: "#ff9ef3" },
  { id: "mex", lat: 19.4326, lng: -99.1332, color: "#ffd58a" },
  { id: "dxb", lat: 25.2048, lng: 55.2708, color: "#ffd58a" },
  { id: "hkg", lat: 22.3193, lng: 114.1694, color: "#7edfff" },
  { id: "lax", lat: 34.0522, lng: -118.2437, color: "#ff9ef3" },
  { id: "yyz", lat: 43.6532, lng: -79.3832, color: "#bfa3ff" },
  { id: "par", lat: 48.8566, lng: 2.3522, color: "#ffffff" },
  { id: "cpt", lat: -33.9249, lng: 18.4241, color: "#9adfff" },
  { id: "ist", lat: 41.0082, lng: 28.9784, color: "#ffd58a" },
  { id: "icn", lat: 37.5665, lng: 126.978, color: "#b7ffef" },
  { id: "akl", lat: -36.8485, lng: 174.7633, color: "#7edfff" },
  { id: "nbo", lat: -1.2921, lng: 36.8219, color: "#ff9ef3" },
];

// Curated route pairs — designed so arcs cross hemispheres without overlapping
// too much, giving the globe a natural transactional density. Ordered so the
// Arcs slider reveals long, distinctive trans-oceanic routes first, then
// fills in regional connectors as the value climbs.
const ROUTE_PAIRS = [
  { from: "sf", to: "ldn", color: "#9adfff", lift: 0.55 },
  { from: "nyc", to: "hnd", color: "#ffd58a", lift: 0.68 },
  { from: "ldn", to: "sgp", color: "#bfa3ff", lift: 0.42 },
  { from: "mex", to: "sao", color: "#9adfff", lift: 0.32 },
  { from: "syd", to: "hnd", color: "#b7ffef", lift: 0.4 },
  { from: "sao", to: "ldn", color: "#ffd58a", lift: 0.46 },
  { from: "ber", to: "bom", color: "#ff9ef3", lift: 0.44 },
  { from: "sgp", to: "ber", color: "#7edfff", lift: 0.48 },
  { from: "lax", to: "hnd", color: "#bfa3ff", lift: 0.6 },
  { from: "dxb", to: "ldn", color: "#9adfff", lift: 0.34 },
  { from: "hkg", to: "sf", color: "#7edfff", lift: 0.58 },
  { from: "par", to: "nyc", color: "#ffffff", lift: 0.5 },
  { from: "yyz", to: "par", color: "#bfa3ff", lift: 0.36 },
  { from: "cpt", to: "ldn", color: "#9adfff", lift: 0.48 },
  { from: "ist", to: "bom", color: "#ffd58a", lift: 0.3 },
  { from: "icn", to: "sf", color: "#b7ffef", lift: 0.62 },
  { from: "akl", to: "syd", color: "#7edfff", lift: 0.18 },
  { from: "nbo", to: "dxb", color: "#ff9ef3", lift: 0.26 },
  { from: "hkg", to: "syd", color: "#b7ffef", lift: 0.36 },
  { from: "sao", to: "nbo", color: "#ffd58a", lift: 0.38 },
  { from: "lax", to: "mex", color: "#ff9ef3", lift: 0.16 },
  { from: "ist", to: "par", color: "#ffd58a", lift: 0.22 },
  { from: "icn", to: "sgp", color: "#7edfff", lift: 0.28 },
  { from: "dxb", to: "hkg", color: "#9adfff", lift: 0.32 },
];

const MAX_CITIES = HUB_CITIES.length;
const MAX_ROUTES = ROUTE_PAIRS.length;

// Map a 0-100 slider value (or legacy bool) to a visible-count from a pool
// of `max` items. The renderer pre-builds the full pool once; the slider
// only flips per-child visibility, which avoids any GC churn on drag.
const levelToCount = (level, max) => {
  if (level === true) return max;
  if (level === false) return 0;
  const numeric = typeof level === "number" ? level : 70;
  const clamped = Math.max(0, Math.min(100, numeric));
  return Math.round((clamped / 100) * max);
};

const ARC_SEGMENTS = 96;

// Great-circle slerp between two unit-length vectors anchored on the sphere.
// Lifts the midpoint above the surface so the arc bows away from the globe.
const greatCircleArc = (start, end, lift, segments = ARC_SEGMENTS) => {
  const startUnit = start.clone().normalize();
  const endUnit = end.clone().normalize();
  const angle = startUnit.angleTo(endUnit);
  const sinAngle = Math.sin(angle);
  const points = [];

  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    let point;
    if (sinAngle < 1e-5) {
      point = startUnit.clone();
    } else {
      const a = Math.sin((1 - t) * angle) / sinAngle;
      const b = Math.sin(t * angle) / sinAngle;
      point = new THREE.Vector3().addScaledVector(startUnit, a).addScaledVector(endUnit, b);
      point.normalize();
    }
    const bow = Math.sin(t * Math.PI);
    point.multiplyScalar(GLOBE_RADIUS + 0.012 + bow * lift);
    points.push(point);
  }
  return points;
};

// City anchor: tiny bright core + two staggered shockwave spheres that
// inflate and fade on a loop. Stripe-style pulsing node.
const createCityAnchor = (city, index) => {
  const group = new THREE.Group();
  const position = latLngToVector3(city.lat, city.lng, GLOBE_RADIUS + 0.018);
  group.position.copy(position);
  group.lookAt(0, 0, 0);

  const color = new THREE.Color(city.color);

  const coreMaterial = new THREE.MeshBasicMaterial({
    color: color.clone(),
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  // Stash the original tint so toggling networkMono off can restore it
  // without re-creating the material.
  coreMaterial.userData.originalColor = color.clone();
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.022, 14, 10), coreMaterial);
  core.userData.role = "core";
  core.userData.basePulse = 0.55 + (index % 3) * 0.15;
  group.add(core);

  for (let i = 0; i < 2; i++) {
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: color.clone(),
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    ringMaterial.userData.originalColor = color.clone();
    const ring = new THREE.Mesh(new THREE.SphereGeometry(0.024, 16, 12), ringMaterial);
    ring.userData.role = "ring";
    ring.userData.phase = (index * 0.43 + i * 0.5) % 1;
    ring.userData.speed = 0.32 + i * 0.04;
    ring.userData.maxScale = 3.6 + i * 1.4;
    group.add(ring);
  }

  return group;
};

// Animated route: subtle constant line + bright traveling head + fading trail.
const createRoute = (route, cityMap, index) => {
  const a = cityMap.get(route.from);
  const b = cityMap.get(route.to);
  if (!a || !b) return null;

  const start = latLngToVector3(a.lat, a.lng, GLOBE_RADIUS);
  const end = latLngToVector3(b.lat, b.lng, GLOBE_RADIUS);
  const points = greatCircleArc(start, end, route.lift);

  const group = new THREE.Group();
  group.userData.routePoints = points;
  group.userData.travelOffset = (index * 0.37) % 1;
  group.userData.travelSpeed = 0.13 + (index % 4) * 0.022;

  const color = new THREE.Color(route.color);

  // Base line — always visible but very subtle.
  const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
  const lineMaterial = new THREE.LineBasicMaterial({
    color: color.clone(),
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  lineMaterial.userData.originalColor = color.clone();
  const line = new THREE.Line(lineGeometry, lineMaterial);
  line.userData.role = "line";
  line.userData.baseOpacity = 0.32;
  group.add(line);

  // Animated trail — a sliding window of vertices visible at full brightness.
  const trailGeometry = new THREE.BufferGeometry();
  const trailLength = Math.floor(points.length * 0.32);
  const positionBuffer = new Float32Array(trailLength * 3);
  const opacityBuffer = new Float32Array(trailLength);
  trailGeometry.setAttribute("position", new THREE.BufferAttribute(positionBuffer, 3));
  trailGeometry.setAttribute("aOpacity", new THREE.BufferAttribute(opacityBuffer, 1));
  const trailMaterial = new THREE.ShaderMaterial({
    uniforms: {
      color: { value: color.clone() },
      uOpacity: { value: 0 },
    },
    vertexShader: `
      attribute float aOpacity;
      varying float vAlpha;
      void main() {
        vAlpha = aOpacity;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 color;
      uniform float uOpacity;
      varying float vAlpha;
      void main() {
        gl_FragColor = vec4(color, vAlpha * uOpacity);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  trailMaterial.userData.originalColor = color.clone();
  const trail = new THREE.Line(trailGeometry, trailMaterial);
  trail.userData.role = "trail";
  trail.userData.trailLength = trailLength;
  group.add(trail);

  // Traveling head pulse — a bright glowing sphere riding the curve.
  const headMaterial = new THREE.MeshBasicMaterial({
    color: color.clone(),
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  headMaterial.userData.originalColor = color.clone();
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.024, 14, 10), headMaterial);
  head.userData.role = "head";
  group.add(head);

  return group;
};

export const createGlobeNetwork = () => {
  const root = new THREE.Group();
  root.visible = false;
  root.userData.opacity = 0;

  const cityGroup = new THREE.Group();
  const cityMap = new Map();
  HUB_CITIES.forEach((city, i) => {
    cityMap.set(city.id, city);
    cityGroup.add(createCityAnchor(city, i));
  });
  root.add(cityGroup);
  root.userData.cityGroup = cityGroup;

  const routeGroup = new THREE.Group();
  ROUTE_PAIRS.forEach((route, i) => {
    const r = createRoute(route, cityMap, i);
    if (r) routeGroup.add(r);
  });
  root.add(routeGroup);
  root.userData.routeGroup = routeGroup;

  return root;
};

const setTrailVertices = (trail, points, headIndex, length) => {
  const positionAttr = trail.geometry.attributes.position;
  const opacityAttr = trail.geometry.attributes.aOpacity;
  for (let i = 0; i < length; i++) {
    const idx = headIndex - (length - 1 - i);
    const safeIdx = ((idx % points.length) + points.length) % points.length;
    const p = points[safeIdx];
    const baseOffset = i * 3;
    positionAttr.array[baseOffset] = p.x;
    positionAttr.array[baseOffset + 1] = p.y;
    positionAttr.array[baseOffset + 2] = p.z;
    // Fade from 0 at tail to 1 at head, with a slight curve so the head feels hot.
    const t = i / (length - 1);
    opacityAttr.array[i] = Math.pow(t, 1.4);
  }
  positionAttr.needsUpdate = true;
  opacityAttr.needsUpdate = true;
};

// Applies user-picked colors to the network. Two roles, two pickers:
//   - Arcs (line / trail / head)  →  arcColor
//   - Pulses (core / ring)        →  pulseColor
// Either may be null/undefined, in which case the material falls back
// to its hardcoded originalColor (the polychrome variety baked at
// build time). Called on settings or theme change, not per-frame.
// The old `mono` arg + networkMono setting are gone — instead of a
// polychrome-vs-mono toggle, users now pick exactly the two tints
// they want directly.
export const setNetworkColors = (root, arcColor = null, pulseColor = null) => {
  if (!root) return;
  const arc = arcColor ? new THREE.Color(arcColor) : null;
  const pulse = pulseColor ? new THREE.Color(pulseColor) : null;
  const colorForRole = (role) => {
    if (role === "line" || role === "trail" || role === "head") return arc;
    if (role === "core" || role === "ring") return pulse;
    return null;
  };
  const apply = (material, role) => {
    if (!material) return;
    const override = colorForRole(role);
    if (material.uniforms?.color?.value) {
      // ShaderMaterial (the route trail). Its color uniform is the
      // tint; copy the user override or restore the original.
      const original = material.userData.originalColor;
      const target = override ?? original;
      if (target) material.uniforms.color.value.copy(target);
      return;
    }
    if (!material.color) return;
    const original = material.userData.originalColor;
    const target = override ?? original;
    if (target) material.color.copy(target);
  };
  root.traverse((node) => {
    if (node.material) apply(node.material, node.userData.role);
  });
};

export const updateGlobeNetwork = (root, nowSeconds) => {
  if (!root) return;
  const visible = root.userData.opacity > 0.001;
  root.visible = visible;
  if (!visible) return;

  const opacity = root.userData.opacity;
  const pulseCount = levelToCount(root.userData.pulses, MAX_CITIES);
  const arcCount = levelToCount(root.userData.arcs, MAX_ROUTES);
  const showArcs = arcCount > 0;
  const showPulses = pulseCount > 0;

  // Toggle sub-group visibility based on the individual levels.
  if (root.userData.cityGroup) root.userData.cityGroup.visible = showPulses;
  if (root.userData.routeGroup) root.userData.routeGroup.visible = showArcs;

  // Per-child visibility: reveal the first N from each pool. Since the
  // pools are pre-built and ordered by visual priority, the slider scales
  // smoothly from "headline hubs only" to "full mesh" without rebuilding
  // geometry.
  if (root.userData.cityGroup) {
    root.userData.cityGroup.children.forEach((child, i) => {
      child.visible = i < pulseCount;
    });
  }
  if (root.userData.routeGroup) {
    root.userData.routeGroup.children.forEach((child, i) => {
      child.visible = i < arcCount;
    });
  }

  // City pulse nodes — animate shockwave rings (skip math if hidden).
  if (showPulses) root.userData.cityGroup?.children.forEach((cityGroup) => {
    if (!cityGroup.visible) return;
    cityGroup.children.forEach((child) => {
      if (child.userData.role === "core") {
        const base = child.userData.basePulse;
        const shimmer = 0.7 + 0.3 * Math.sin(nowSeconds * 1.4 + base * 4);
        child.material.opacity = 0.95 * opacity * shimmer;
      } else if (child.userData.role === "ring") {
        const speed = child.userData.speed;
        const phase = child.userData.phase;
        const t = (nowSeconds * speed + phase) % 1;
        const scale = 1 + t * (child.userData.maxScale - 1);
        child.scale.setScalar(scale);
        const ringOpacity = Math.pow(1 - t, 1.6) * 0.6;
        child.material.opacity = ringOpacity * opacity;
      }
    });
  });

  // Routes — sliding trail along great-circle, traveling head, faint baseline.
  if (showArcs) root.userData.routeGroup?.children.forEach((routeGroup) => {
    if (!routeGroup.visible) return;
    const points = routeGroup.userData.routePoints;
    if (!points) return;
    const speed = routeGroup.userData.travelSpeed;
    const offset = routeGroup.userData.travelOffset;
    const cycle = (nowSeconds * speed + offset) % 1;
    // 0–0.85: traveling. 0.85–1: rest. Smooth ease via sin curve.
    const travel = cycle < 0.85 ? cycle / 0.85 : 1;
    const headIndex = Math.min(points.length - 1, Math.floor(travel * (points.length - 1)));

    routeGroup.children.forEach((child) => {
      if (child.userData.role === "line") {
        child.material.opacity = (child.userData.baseOpacity ?? 0.3) * opacity;
      } else if (child.userData.role === "trail") {
        const trailLength = child.userData.trailLength;
        setTrailVertices(child, points, headIndex, trailLength);
        // Fade out during the rest phase.
        const restFade = cycle < 0.85 ? 1 : 1 - (cycle - 0.85) / 0.15;
        child.material.uniforms.uOpacity.value = 0.9 * opacity * restFade;
      } else if (child.userData.role === "head") {
        child.position.copy(points[headIndex]);
        const restFade = cycle < 0.85 ? 1 : 1 - (cycle - 0.85) / 0.15;
        const flicker = 0.8 + 0.2 * Math.sin(nowSeconds * 6 + offset * 4);
        child.material.opacity = opacity * restFade * flicker;
      }
    });
  });
};
