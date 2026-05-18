import * as THREE from "three";
import { CLICK_HIGHLIGHT } from "../config/constants.js";
import {
  BORDERLESS_ROUTE_PATHS,
  DEFAULT_GLOBE_SETTINGS,
  GLOBE_DEFAULT_GLOW,
  GLOBE_RADIUS,
} from "../config/globe-settings.js";
import { clampNumber, hashString, normalizeLongitude, smoothStep } from "../utils/math.js";
import { pointToGlobeCoordinate } from "../utils/projection.js";
import { latLngToVector3, pointToFlatVector3 } from "./coordinates.js";
import { createAsciiCanvasTexture, createGlobeDotGeometry, disposeThreeObject } from "./geometry.js";

const getGridSettingsSignature = (settings = DEFAULT_GLOBE_SETTINGS) => {
  const gridSize = clampNumber(settings.gridSize ?? DEFAULT_GLOBE_SETTINGS.gridSize, 12, 60);
  const gridLift = clampNumber(settings.gridLift ?? DEFAULT_GLOBE_SETTINGS.gridLift, 0, 100);
  return `${gridSize}:${gridLift}`;
};

export const createGraticule = (settings = DEFAULT_GLOBE_SETTINGS) => {
  const gridSize = clampNumber(settings.gridSize ?? DEFAULT_GLOBE_SETTINGS.gridSize, 12, 60);
  const gridLift = clampNumber(settings.gridLift ?? DEFAULT_GLOBE_SETTINGS.gridLift, 0, 100);
  const radius = GLOBE_RADIUS + 0.004 + gridLift * 0.0024;
  const sampleStep = Math.max(2, Math.min(6, gridSize / 6));
  const group = new THREE.Group();
  const material = new THREE.LineBasicMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.13,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  group.userData.gridSignature = getGridSettingsSignature({ gridSize, gridLift });

  for (let lat = -90 + gridSize; lat < 90; lat += gridSize) {
    const points = [];
    for (let lng = -180; lng <= 180; lng += sampleStep) {
      points.push(latLngToVector3(lat, lng, radius));
    }
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material));
  }

  for (let lng = -180; lng < 180; lng += gridSize) {
    const points = [];
    for (let lat = -82; lat <= 82; lat += sampleStep) {
      points.push(latLngToVector3(lat, lng, radius));
    }
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), material));
  }

  return group;
};

export const syncGraticule = (refs, settings) => {
  if (!refs?.globeGroup) return;
  const signature = getGridSettingsSignature(settings);
  if (refs.graticule?.userData?.gridSignature === signature) return;

  const nextGraticule = createGraticule(settings);
  if (refs.graticule) {
    refs.globeGroup.remove(refs.graticule);
    disposeThreeObject(refs.graticule);
  }
  refs.graticule = nextGraticule;
  refs.globeGroup.add(nextGraticule);
};

const createBorderlessRoutePoints = ([fromLat, fromLng], [toLat, toLng], lift = 0.42, segments = 96) => {
  const start = latLngToVector3(fromLat, fromLng, GLOBE_RADIUS + 0.055);
  const end = latLngToVector3(toLat, toLng, GLOBE_RADIUS + 0.055);
  const mid = start.clone().add(end).normalize().multiplyScalar(GLOBE_RADIUS + lift);
  return new THREE.QuadraticBezierCurve3(start, mid, end).getPoints(segments);
};

export const createBorderlessNetwork = () => {
  const group = new THREE.Group();
  group.visible = false;

  BORDERLESS_ROUTE_PATHS.forEach((route, index) => {
    const points = createBorderlessRoutePoints(route.from, route.to, route.lift);
    const color = new THREE.Color(route.color);
    const lineMaterial = new THREE.LineBasicMaterial({
      color,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), lineMaterial);
    line.userData.baseOpacity = route.opacity;
    group.add(line);

    const pulseMaterial = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const pulse = new THREE.Mesh(new THREE.SphereGeometry(0.03, 18, 12), pulseMaterial);
    pulse.userData.baseOpacity = 0.92;
    pulse.userData.offset = index / BORDERLESS_ROUTE_PATHS.length;
    pulse.userData.routePoints = points;
    group.add(pulse);
  });

  [
    { rotation: [0.25, 0.5, -0.12], color: "#6be7ff", opacity: 0.2 },
    { rotation: [0.92, -0.32, 0.34], color: "#b793ff", opacity: 0.18 },
    { rotation: [-0.38, 0.85, 0.72], color: "#ffffff", opacity: 0.12 },
  ].forEach((ring) => {
    const geometry = new THREE.TorusGeometry(GLOBE_RADIUS + 0.075, 0.0038, 8, 180);
    const material = new THREE.MeshBasicMaterial({
      color: new THREE.Color(ring.color),
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.set(...ring.rotation);
    mesh.userData.baseOpacity = ring.opacity;
    group.add(mesh);
  });

  return group;
};

export const updateBorderlessNetworkMotion = (group, now) => {
  if (!group?.visible) return;
  const opacity = group.userData.opacity ?? 0;
  group.rotation.z = Math.sin(now * 0.00018) * 0.018;
  group.children.forEach((child) => {
    const points = child.userData.routePoints;
    if (!points?.length || !child.material) return;

    const travel = (now * 0.00016 + child.userData.offset) % 1;
    const pointIndex = Math.min(points.length - 1, Math.floor(travel * (points.length - 1)));
    const shimmer = 0.56 + Math.sin(travel * Math.PI * 2) * 0.28;
    child.position.copy(points[pointIndex]);
    child.material.opacity = (child.userData.baseOpacity ?? 0.8) * opacity * shimmer;
  });
};

export const createOuterHaloMaterial = () =>
  new THREE.ShaderMaterial({
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vObjectPos;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vObjectPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 haloColor;
      uniform float intensity;
      uniform float uTime;
      varying vec3 vNormal;
      varying vec3 vObjectPos;
      void main() {
        // Wide, soft rim that bleeds far from the silhouette. Sharp falloff so
        // the halo is concentrated near the edge but extends visibly outward.
        float rim = pow(max(0.0, 0.6 - dot(vNormal, vec3(0.0, 0.0, 1.0))), 4.6);
        // Slow breathing — the deep halo expands/contracts gently.
        float breath = 0.88 + 0.12 * sin(uTime * 0.22);
        gl_FragColor = vec4(haloColor, clamp(rim * intensity * breath, 0.0, 0.10));
      }
    `,
    uniforms: {
      haloColor: { value: new THREE.Color("#4c8bff") },
      intensity: { value: 0.4 },
      uTime: { value: 0 },
    },
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false,
  });

export const createAtmosphereMaterial = () =>
  new THREE.ShaderMaterial({
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vObjectPos;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vObjectPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 glowColor;
      uniform vec3 limbColor;
      uniform float intensity;
      uniform float uTime;
      varying vec3 vNormal;
      varying vec3 vObjectPos;

      void main() {
        // Original rim formula — strong at the silhouette, fading inward.
        float rim = pow(max(0.0, 0.66 - dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.25);

        // Aurora-like undulating bands — two low-frequency sinusoids in object space.
        // Object-space coordinates rotate with the globe so the bands feel anchored
        // to the sphere instead of skidding across the screen.
        float waveA = sin(vObjectPos.y * 1.7 + uTime * 0.55) * 0.5 + 0.5;
        float waveB = sin(vObjectPos.x * 1.3 - uTime * 0.31 + vObjectPos.z * 0.8) * 0.5 + 0.5;
        float aurora = waveA * waveB;

        // Two-tone atmosphere: warm core glow → cool limb tint, modulated by aurora.
        // The aurora factor only nudges hue, not opacity, so we keep the rim shape clean.
        vec3 baseTint = mix(glowColor, limbColor, 0.32);
        vec3 color = mix(baseTint, limbColor, aurora * 0.7);

        gl_FragColor = vec4(color, clamp(rim * intensity, 0.0, 0.32));
      }
    `,
    uniforms: {
      glowColor: { value: new THREE.Color(GLOBE_DEFAULT_GLOW) },
      limbColor: { value: new THREE.Color("#6cb6ff") },
      intensity: { value: 0.42 },
      uTime: { value: 0 },
    },
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    transparent: true,
    depthWrite: false,
  });

const buildGlobePoints = (mapData, selectedDots) =>
  mapData.points
    .map((point) => ({
      ...point,
      ...pointToGlobeCoordinate(point, mapData.image),
      selected: selectedDots.has(point.id),
    }))
    .filter((point) => Number.isFinite(point.lat) && Number.isFinite(point.lng));

const applyDotInstances = (mesh, points, image, scale, radiusOffset = 0, morphProgress = 1, dotRotation = 0) => {
  const matrix = new THREE.Matrix4();
  const quaternion = new THREE.Quaternion();
  const spinQuaternion = new THREE.Quaternion();
  const cylinderQuaternion = new THREE.Quaternion();
  const flatQuaternion = new THREE.Quaternion();
  const globeQuaternion = new THREE.Quaternion();
  const cylinderPosition = new THREE.Vector3();
  const cylinderNormal = new THREE.Vector3();
  const normal = new THREE.Vector3();
  const position = new THREE.Vector3();
  const flatPosition = new THREE.Vector3();
  const globePosition = new THREE.Vector3();
  const up = new THREE.Vector3(0, 1, 0);
  const depth = new THREE.Vector3(0, 0, 1);
  const size = new THREE.Vector3(scale, scale, scale);
  // Spin each instance around its local up-axis (which the orientation logic
  // below aligns to the sphere normal). Lets users rotate every dot uniformly.
  const rotationRadians = (dotRotation * Math.PI) / 180;
  spinQuaternion.setFromAxisAngle(up, rotationRadians);
  const wrapProgress = smoothStep(0.02, 0.7, morphProgress);
  const sphereProgress = smoothStep(0.24, 1, morphProgress);
  const targetRadius = GLOBE_RADIUS + radiusOffset;

  points.forEach((point, index) => {
    flatPosition.copy(pointToFlatVector3(point, image, radiusOffset));
    globePosition.copy(latLngToVector3(point.lat, point.lng, GLOBE_RADIUS + radiusOffset));
    normal.copy(globePosition).normalize();

    cylinderNormal.set(normal.x, 0, normal.z);
    if (cylinderNormal.lengthSq() < 0.000001) {
      cylinderNormal.copy(depth);
    } else {
      cylinderNormal.normalize();
    }

    cylinderPosition.copy(cylinderNormal).multiplyScalar(targetRadius);
    cylinderPosition.y = THREE.MathUtils.lerp(flatPosition.y, globePosition.y, sphereProgress * 0.72);
    position.copy(flatPosition).lerp(cylinderPosition, wrapProgress).lerp(globePosition, sphereProgress);

    globeQuaternion.setFromUnitVectors(up, normal);
    flatQuaternion.setFromUnitVectors(up, depth);
    cylinderQuaternion.setFromUnitVectors(up, cylinderNormal);
    quaternion.copy(flatQuaternion).slerp(cylinderQuaternion, wrapProgress).slerp(globeQuaternion, sphereProgress);
    // Apply the uniform rotation in the geometry's local frame (around up-axis)
    // before the orientation quaternion rotates it into world space.
    quaternion.multiply(spinQuaternion);

    matrix.compose(position, quaternion, size);
    mesh.setMatrixAt(index, matrix);
  });

  mesh.instanceMatrix.needsUpdate = true;
};

// Shared per-frame uniform so every dot material twinkles in sync against the same clock.
// Set in the animation loop via twinkleUniforms.uTime.value = now / 1000.
export const twinkleUniforms = {
  uTime: { value: 0 },
  twinkleAmount: { value: 0.18 },
  twinkleRate: { value: 1.3 },
};

// Attach the twinkle hook to a material: injects per-instance phase + sine modulation
// of diffuse color so each dot pulses on its own clock. Works on both
// MeshStandardMaterial (replaces <emissivemap_fragment>) and MeshBasicMaterial
// (replaces <color_fragment>) — checked per material type. Safe to call multiple
// times — Three.js caches the compiled program by customProgramCacheKey.
const wireTwinkleMaterial = (material, cacheKey) => {
  if (material.userData?.twinkleWired) return material;
  material.userData = { ...(material.userData || {}), twinkleWired: true };
  const isBasic = material.isMeshBasicMaterial === true;

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = twinkleUniforms.uTime;
    shader.uniforms.uTwinkleAmount = twinkleUniforms.twinkleAmount;
    shader.uniforms.uTwinkleRate = twinkleUniforms.twinkleRate;

    shader.vertexShader = `
      attribute float aPhase;
      varying float vTwinkle;
      uniform float uTime;
      uniform float uTwinkleAmount;
      uniform float uTwinkleRate;
      ${shader.vertexShader}
    `.replace(
      "#include <begin_vertex>",
      `
      #include <begin_vertex>
      float twPhase = aPhase * 6.2831853;
      vTwinkle = (1.0 - uTwinkleAmount) + uTwinkleAmount * (0.5 + 0.5 * sin(uTime * uTwinkleRate + twPhase));
      // Subtle per-instance size variation (0.82 → 1.18) so the dot field doesn't
      // look mechanically uniform. Static per dot, reads as organic density.
      float sizeJitter = 0.82 + 0.36 * aPhase;
      transformed *= sizeJitter;
      `,
    );

    if (isBasic) {
      shader.fragmentShader = `
        varying float vTwinkle;
        ${shader.fragmentShader}
      `.replace(
        "#include <color_fragment>",
        `
        #include <color_fragment>
        diffuseColor.rgb *= vTwinkle;
        `,
      );
    } else {
      shader.fragmentShader = `
        varying float vTwinkle;
        ${shader.fragmentShader}
      `.replace(
        "#include <emissivemap_fragment>",
        `
        #include <emissivemap_fragment>
        totalEmissiveRadiance *= vTwinkle;
        diffuseColor.rgb *= vTwinkle;
        `,
      );
    }
  };

  material.customProgramCacheKey = () => `twinkle:${cacheKey}`;
  return material;
};

const attachPhaseAttribute = (geometry, instanceCount, seed = 0) => {
  if (geometry.getAttribute("aPhase")?.count === instanceCount) return;
  const phases = new Float32Array(instanceCount);
  // Stable per-mesh random so the twinkle pattern is reproducible across re-renders.
  let s = seed * 9301 + 49297;
  for (let i = 0; i < instanceCount; i++) {
    s = (s * 9301 + 49297) % 233280;
    phases[i] = s / 233280;
  }
  geometry.setAttribute("aPhase", new THREE.InstancedBufferAttribute(phases, 1));
};

const createInstancedDotMesh = (points, image, geometry, material, scale, radiusOffset, morphProgress, dotRotation = 0) => {
  if (!points.length) return null;
  attachPhaseAttribute(geometry, points.length, points.length + Math.round(scale * 1000));
  const mesh = new THREE.InstancedMesh(geometry, material, points.length);
  mesh.frustumCulled = false;
  mesh.userData.pointIds = points.map((point) => point.id);
  mesh.userData.points = points;
  mesh.userData.image = image;
  mesh.userData.scale = scale;
  mesh.userData.radiusOffset = radiusOffset;
  mesh.userData.dotRotation = dotRotation;
  applyDotInstances(mesh, points, image, scale, radiusOffset, morphProgress, dotRotation);
  return mesh;
};

export const applyDotLayerMorph = (group, morphProgress) => {
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
      child.userData.dotRotation ?? 0,
    );
  });
  group.userData.morphProgress = morphProgress;
};

export const buildGlobeDotLayer = ({
  mapData,
  selectedDots,
  dotColor,
  dotSize,
  shape,
  dotRotation = 0,
  asciiSymbol = "*",
  shaderSettings,
  globeSettings,
  morphProgress = 1,
}) => {
  const group = new THREE.Group();
  const points = buildGlobePoints(mapData, selectedDots);
  const normalPoints = points.filter((point) => !point.selected);
  const selectedPoints = points.filter((point) => point.selected);
  const effect = shaderSettings.effect || "none";
  const intensity = clampNumber(shaderSettings.intensity ?? 45, 0, 100) / 100;
  const look = globeSettings?.look ?? DEFAULT_GLOBE_SETTINGS.look;
  const isBorderless = look === "borderless";
  const isAsciiText = shape === "ASCII" && asciiSymbol && asciiSymbol !== "*";
  const asciiChars = isAsciiText ? Array.from(asciiSymbol) : [];
  const isAsciiRandom = asciiChars.length > 1;
  const geometry = createGlobeDotGeometry(shape, asciiSymbol);
  const size = 0.004 + clampNumber(dotSize, 0.1, 25) * 0.0022;
  const dotLift = clampNumber(globeSettings?.dotLift ?? DEFAULT_GLOBE_SETTINGS.dotLift, 0, 100) / 100;
  const baseRadiusOffset = 0.006 + dotLift * 0.08;
  const color = isBorderless && dotColor === "#ffffff" ? new THREE.Color("#f5fbff") : new THREE.Color(dotColor);
  const emissiveColor = isBorderless ? new THREE.Color("#7edfff").lerp(color, 0.48) : color;
  const accentColor = new THREE.Color(CLICK_HIGHLIGHT);
  const emissiveBoost = isBorderless ? 0.7 + intensity * 0.7 : effect === "none" ? 0.22 : 0.5 + intensity * 0.85;

  const makeAsciiMaterial = (texture, materialColor) =>
    wireTwinkleMaterial(
      new THREE.MeshBasicMaterial({
        color: materialColor,
        map: texture,
        transparent: true,
        alphaTest: 0.18,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
      "ascii",
    );

  // Flat, unlit dots — Stripe-style. MeshBasicMaterial ignores scene lighting so
  // each dot reads as a uniform painted shape rather than a tiny lit hemisphere.
  // The color carries both the chosen dot color and a slight brightening for
  // borderless mode that the old emissive path used to do.
  const flatColor = isBorderless
    ? color.clone().lerp(new THREE.Color("#ffffff"), 0.18)
    : color;
  const standardMaterial = wireTwinkleMaterial(
    new THREE.MeshBasicMaterial({
      color: flatColor,
      transparent: true,
      opacity: 1,
    }),
    `flat:${isBorderless ? "b" : "c"}`,
  );
  const standardSelectedMaterial = wireTwinkleMaterial(
    new THREE.MeshBasicMaterial({
      color: accentColor,
      transparent: true,
      opacity: 1,
    }),
    "flat:sel",
  );

  const addAsciiMeshes = (groupPoints, materialColor, instanceSize, radiusOffset) => {
    if (isAsciiRandom) {
      const charBuckets = new Map();
      asciiChars.forEach((char) => charBuckets.set(char, []));
      groupPoints.forEach((point) => {
        const char = asciiChars[hashString(point.id) % asciiChars.length];
        charBuckets.get(char).push(point);
      });
      charBuckets.forEach((bucketPoints, char) => {
        if (!bucketPoints.length) return;
        const texture = createAsciiCanvasTexture(char);
        const material = makeAsciiMaterial(texture, materialColor);
        const mesh = createInstancedDotMesh(
          bucketPoints,
          mapData.image,
          geometry.clone(),
          material,
          instanceSize,
          radiusOffset,
          morphProgress,
          dotRotation,
        );
        if (mesh) group.add(mesh);
      });
      return;
    }

    const texture = createAsciiCanvasTexture(asciiChars[0]);
    const material = makeAsciiMaterial(texture, materialColor);
    const mesh = createInstancedDotMesh(
      groupPoints,
      mapData.image,
      geometry.clone(),
      material,
      instanceSize,
      radiusOffset,
      morphProgress,
      dotRotation,
    );
    if (mesh) group.add(mesh);
  };

  if (isAsciiText) {
    addAsciiMeshes(normalPoints, color, size, baseRadiusOffset);
    addAsciiMeshes(selectedPoints, accentColor, size * 1.18, baseRadiusOffset + 0.01);
  } else {
    const normalMesh = createInstancedDotMesh(
      normalPoints,
      mapData.image,
      geometry,
      standardMaterial,
      size,
      baseRadiusOffset,
      morphProgress,
      dotRotation,
    );
    const selectedMesh = createInstancedDotMesh(
      selectedPoints,
      mapData.image,
      geometry.clone(),
      standardSelectedMaterial,
      size * 1.18,
      baseRadiusOffset + 0.01,
      morphProgress,
      dotRotation,
    );
    if (normalMesh) group.add(normalMesh);
    if (selectedMesh) group.add(selectedMesh);
  }

  if (isBorderless || effect === "bloom" || effect === "crt") {
    const glowGeometry = createGlobeDotGeometry("Circle");
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: isBorderless ? new THREE.Color("#8ddfff") : color,
      transparent: true,
      opacity: isBorderless ? 0.075 + intensity * 0.055 : 0.11 + intensity * 0.14,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const glowMesh = createInstancedDotMesh(
      points,
      mapData.image,
      glowGeometry,
      glowMaterial,
      size * (isBorderless ? 2.05 + intensity * 0.35 : 2.25 + intensity),
      baseRadiusOffset + (isBorderless ? 0.024 : 0.02),
      morphProgress,
      dotRotation,
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
        baseRadiusOffset + 0.018,
        morphProgress,
        dotRotation,
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
};

export const applyGlobeShellProgress = (refs, morphProgress, globeSettings = DEFAULT_GLOBE_SETTINGS) => {
  if (!refs) return;
  const settings = { ...DEFAULT_GLOBE_SETTINGS, ...globeSettings };
  syncGraticule(refs, settings);
  const shellProgress = smoothStep(0.18, 0.92, morphProgress);
  const glowStrength = settings.glow ? clampNumber(settings.glowStrength, 0, 100) / 100 : 0;
  const gridStrength = settings.grid ? clampNumber(settings.gridStrength, 0, 100) / 100 : 0;
  const surfaceStrength = settings.surface ? clampNumber(settings.surfaceStrength, 0, 100) / 100 : 0;
  const routeStrength = settings.look === "borderless" && settings.routes
    ? clampNumber(settings.routesStrength, 0, 100) / 100
    : 0;

  refs.baseMaterial.opacity = refs.baseOpacity * shellProgress * surfaceStrength;
  refs.atmosphereMaterial.uniforms.intensity.value = refs.atmosphereIntensity * shellProgress * glowStrength;
  if (refs.outerHaloMaterial) {
    refs.outerHaloMaterial.uniforms.intensity.value = 0.5 * shellProgress * glowStrength;
  }
  refs.graticule.children.forEach((line) => {
    line.material.opacity = refs.graticuleOpacity * shellProgress * gridStrength;
  });
  // Hard-hide the sphere meshes when we're effectively in flat mode. Even with
  // opacity 0 + transparent: true, three.js still issues draw calls for the
  // mesh — combined with the world texture in solid mode that can leave a
  // visible "black circle" artifact in the middle of the flat map.
  const sphereVisible = shellProgress > 0.005;
  if (refs.globeMesh) refs.globeMesh.visible = sphereVisible && surfaceStrength > 0.001;
  if (refs.atmosphere) refs.atmosphere.visible = sphereVisible && glowStrength > 0.001;
  if (refs.outerHalo) refs.outerHalo.visible = sphereVisible && glowStrength > 0.001;
  if (refs.graticule) refs.graticule.visible = sphereVisible && gridStrength > 0.001;
  if (refs.borderlessNetwork) {
    const routeOpacity = shellProgress * routeStrength;
    refs.borderlessNetwork.visible = routeOpacity > 0.001;
    refs.borderlessNetwork.userData.opacity = routeOpacity;
    refs.borderlessNetwork.traverse((child) => {
      if (!child.material || child.userData.routePoints) return;
      child.material.opacity = (child.userData.baseOpacity ?? 0.3) * routeOpacity;
    });
  }
  if (refs.globeNetwork) {
    const networkStrength = settings.network ? clampNumber(settings.networkStrength, 0, 100) / 100 : 0;
    refs.globeNetwork.userData.opacity = shellProgress * networkStrength;
    refs.globeNetwork.userData.arcs = settings.networkArcs ?? true;
    refs.globeNetwork.userData.pulses = settings.networkPulses ?? true;
  }
};
