import * as THREE from "three";
import { GLOBE_RADIUS } from "../config/globe-settings.js";
import { latLngToVector3 } from "./coordinates.js";

// Major hub cities anchored to lat/lng. Picked for global coverage and
// recognizable silhouettes. Each carries a color that biases the pulse tone.
const HUB_CITIES = [
  { id: "sf", lat: 37.7749, lng: -122.4194, color: "#7edfff" },
  { id: "nyc", lat: 40.7128, lng: -74.006, color: "#ffffff" },
  { id: "ldn", lat: 51.5074, lng: -0.1278, color: "#bfa3ff" },
  { id: "ber", lat: 52.52, lng: 13.405, color: "#ffd58a" },
  { id: "bom", lat: 19.076, lng: 72.8777, color: "#ff9ef3" },
  { id: "sgp", lat: 1.3521, lng: 103.8198, color: "#6be7ff" },
  { id: "hnd", lat: 35.6762, lng: 139.6503, color: "#b7ffef" },
  { id: "syd", lat: -33.8688, lng: 151.2093, color: "#9ad7ff" },
  { id: "sao", lat: -23.5505, lng: -46.6333, color: "#ff9ef3" },
  { id: "mex", lat: 19.4326, lng: -99.1332, color: "#ffd58a" },
];

// Curated route pairs — designed so arcs cross hemispheres without overlapping
// too much, giving the globe a natural transactional density.
const ROUTE_PAIRS = [
  { from: "sf", to: "ldn", color: "#9adfff", lift: 0.55 },
  { from: "nyc", to: "hnd", color: "#ffd58a", lift: 0.68 },
  { from: "ldn", to: "sgp", color: "#bfa3ff", lift: 0.42 },
  { from: "ber", to: "bom", color: "#ff9ef3", lift: 0.44 },
  { from: "mex", to: "sao", color: "#9adfff", lift: 0.32 },
  { from: "syd", to: "hnd", color: "#b7ffef", lift: 0.4 },
  { from: "sgp", to: "ber", color: "#7edfff", lift: 0.48 },
  { from: "sao", to: "ldn", color: "#ffd58a", lift: 0.46 },
];

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
    color,
    transparent: true,
    opacity: 0.9,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  const core = new THREE.Mesh(new THREE.SphereGeometry(0.022, 14, 10), coreMaterial);
  core.userData.role = "core";
  core.userData.basePulse = 0.55 + (index % 3) * 0.15;
  group.add(core);

  for (let i = 0; i < 2; i++) {
    const ringMaterial = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
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
    color,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
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
      color: { value: color },
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
  const trail = new THREE.Line(trailGeometry, trailMaterial);
  trail.userData.role = "trail";
  trail.userData.trailLength = trailLength;
  group.add(trail);

  // Traveling head pulse — a bright glowing sphere riding the curve.
  const headMaterial = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity: 0,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
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

export const updateGlobeNetwork = (root, nowSeconds) => {
  if (!root) return;
  const visible = root.userData.opacity > 0.001;
  root.visible = visible;
  if (!visible) return;

  const opacity = root.userData.opacity;

  // City pulse nodes — animate shockwave rings.
  root.userData.cityGroup?.children.forEach((cityGroup) => {
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
  root.userData.routeGroup?.children.forEach((routeGroup) => {
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
