import { useCallback, useEffect, useRef, useState } from "react";
import * as THREE from "three";
import {
  DEFAULT_GLOBE_SETTINGS,
  GLOBE_CAMERA_DISTANCE,
  GLOBE_DEFAULT_GLOW,
  GLOBE_FLAT_FIT_ASPECT,
  GLOBE_INITIAL_ROTATION,
  GLOBE_MORPH_DURATION,
  GLOBE_RADIUS,
  GLOBE_ROUND_FIT_ASPECT,
} from "../config/globe-settings.js";
import { clampNumber, easeInOutQuart, smoothStep } from "../utils/math.js";
import { createCustomShapeTexture, disposeThreeObject } from "../three/geometry.js";
import {
  applyDotLayerMorph,
  applyDotLayerSpin,
  applyGlobeShellProgress,
  buildGlobeDotLayer,
  createAtmosphereMaterial,
  createBorderlessNetwork,
  createGraticule,
  createOuterHaloMaterial,
  twinkleUniforms,
  updateBorderlessNetworkMotion,
} from "../three/globe.js";
import { createGlobeNetwork, setNetworkColors, updateGlobeNetwork } from "../three/globe-network.js";
import { createSpaceBackgroundMesh } from "../three/space-mesh.js";
import { createWorldTexture } from "../three/world-texture.js";
import { createPostComposer, updatePostEffects } from "../three/post-effects.js";
import { loadWorldCountries } from "../data/world-countries-topology.js";
import { getCachedWorldRivers, loadWorldRivers } from "../data/world-rivers-topology.js";
import { getCachedWorldCities, loadWorldCities } from "../data/world-cities-topology.js";
import { cca3ToCcn3 } from "../data/geography.js";
import { PerfMonitor } from "./perf-monitor.jsx";

// Per-instance dot spin animation speed range. The user-facing
// shapeRotationSpeed slider maps 0-100 onto this range (linearly):
// 0 → 6 deg/s (~60s per turn, gentle drift),
// 50 → 30 deg/s (~12s per turn, the previous hardcoded default),
// 100 → 120 deg/s (~3s per turn, brisk spin).
const SPIN_MIN_DEG_PER_SEC = 6;
const SPIN_MAX_DEG_PER_SEC = 120;

const getClientPoint = (event) => {
  const touch = event.touches?.[0] || event.changedTouches?.[0];
  const x = touch?.clientX ?? event.clientX;
  const y = touch?.clientY ?? event.clientY;

  if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
  return { x, y };
};

export const GlobeBackground = ({
  mapData,
  selectedDots,
  dotColor,
  dotSize,
  shape,
  dotRotation = 0,
  // shapeRotationSpeed is a single 0–100 control: 0 = stopped, 100 =
  // brisk spin. The old separate rotateAnimating bool prop is gone —
  // gate is now implicit (speed > 0). App still passes 0 here when
  // motionFrozen so prefers-reduced-motion stays honored.
  shapeRotationSpeed = 0,
  sizeVary = false,
  asciiSymbol,
  customShape = null,
  dotGradient = null,
  dotColorAlpha = 1,
  renderMode = "dots",
  worldFill,
  worldFillAlpha = 1,
  worldFillGradient = null,
  worldFillVisible = true,
  worldStroke,
  worldStrokeAlpha = 1,
  worldStrokeGradient = null,
  worldStrokeVisible = true,
  worldStrokeWidth = 1.8,
  // Solid-mode flat-plane projection. Only affects the flat texture; sphere
  // always uses equirectangular. See FLAT_PROJECTION_OPTIONS in world-texture.js.
  flatProjection = "mercator",
  // Rivers overlay (Phase 4 of map-data-rollout). Lazy-loads ~120KB of slim
  // Natural Earth 1:50m river + lake centerlines on first toggle. Drawn into
  // the solid mode texture — does not affect dot mode in v1.
  riversVisible = false,
  riversColor = "rgba(120, 184, 220, 0.72)",
  riversWidth = 1.1,
  // Cities overlay (Phase 5 of map-data-rollout). Lazy-loads ~50KB of slim
  // Natural Earth populated places. citiesMinPop filters by pop_max so
  // designers can pick "all cities" or "major cities only".
  citiesVisible = false,
  citiesColor = "rgba(255, 220, 120, 0.86)",
  citiesMinPop = 0,
  // User-supplied custom topology — already-parsed FeatureCollection.
  // Validation happens upstream (in App.jsx) so this component just trusts
  // the data shape.
  customTopology = null,
  customTopologyVisible = false,
  customTopologyColor = "rgba(186, 232, 184, 0.84)",
  selectionCountryCodes = [],
  selectionCollection = null,
  dotsVisible,
  background,
  interactive = true,
  morphMode = "globe",
  morphTransition = null,
  transparent,
  mapOffset,
  setMapOffset,
  mapZoom,
  setMapZoom,
  mapDepth,
  tiltX,
  tiltY,
  setSelectedDots,
  shaderSettings,
  globeSettings,
  spaceSettings,
  backgroundStyle,
  shadeBackground = true,
  uiTheme = "dark",
  reducedMotion = false,
  label,
  canvasHandleRef,
  panelCollapsed,
}) => {
  const mountRef = useRef(null);
  const spaceSettingsRef = useRef(spaceSettings);
  const backgroundStyleRef = useRef(backgroundStyle);
  const shadeBackgroundRef = useRef(shadeBackground);
  const reducedMotionRef = useRef(reducedMotion);
  const shapeRotationSpeedRef = useRef(shapeRotationSpeed);
  const dotRotationRef = useRef(dotRotation);
  const spinAngleRef = useRef(0);
  const sizeVaryRef = useRef(sizeVary);
  // Dev-only perf metrics — written from the animate loop, polled by
  // <PerfMonitor>. Lives outside React state so per-frame updates don't
  // trigger re-renders. Vite's dead-code elimination removes the HUD entirely
  // in production builds (the mount is gated on `import.meta.env.DEV`).
  const perfMetricsRef = useRef({ fps: 60, calls: 0, geometries: 0, dots: 0 });
  spaceSettingsRef.current = spaceSettings;
  backgroundStyleRef.current = backgroundStyle;
  shadeBackgroundRef.current = shadeBackground;
  reducedMotionRef.current = reducedMotion;
  shapeRotationSpeedRef.current = shapeRotationSpeed;
  dotRotationRef.current = dotRotation;
  sizeVaryRef.current = sizeVary;
  const stateRef = useRef({
    active: false,
    baseOffsetX: 0,
    baseOffsetY: 0,
    currentX: GLOBE_INITIAL_ROTATION.x,
    currentY: GLOBE_INITIAL_ROTATION.y,
    dragMode: "rotate",
    lastX: 0,
    lastY: 0,
    moved: false,
    startX: 0,
    startY: 0,
    targetX: GLOBE_INITIAL_ROTATION.x,
    targetY: GLOBE_INITIAL_ROTATION.y,
  });
  const threeRef = useRef(null);
  const mapOffsetRef = useRef(mapOffset);
  const mapZoomRef = useRef(mapZoom);
  const morphModeRef = useRef(morphMode);
  const panelCollapsedRef = useRef(panelCollapsed);
  const initialMorphProgress = morphTransition === "to-globe" ? 0 : morphMode === "globe" ? 1 : 0;
  const morphRef = useRef({
    active: false,
    progress: initialMorphProgress,
    start: initialMorphProgress,
    startTime: 0,
    target: initialMorphProgress,
  });
  const settingsRef = useRef(shaderSettings);
  const globeSettingsRef = useRef(globeSettings);
  const uiThemeRef = useRef(uiTheme);
  const transformRef = useRef({ mapDepth, tiltX, tiltY });
  const [isDraggingGlobe, setIsDraggingGlobe] = useState(false);

  mapOffsetRef.current = mapOffset;
  mapZoomRef.current = mapZoom;
  morphModeRef.current = morphMode;
  panelCollapsedRef.current = panelCollapsed;
  settingsRef.current = shaderSettings;
  globeSettingsRef.current = globeSettings;
  uiThemeRef.current = uiTheme;
  transformRef.current = { mapDepth, tiltX, tiltY };

  const startDrag = useCallback((event) => {
    if (Number.isFinite(event.button) && event.button !== 0) return;

    const point = getClientPoint(event);
    if (!point) return;

    const shouldPanFlatMap = morphModeRef.current === "flat" && morphRef.current.progress < 0.35;
    const offset = mapOffsetRef.current || { x: 0, y: 0 };
    stateRef.current.active = true;
    stateRef.current.baseOffsetX = offset.x;
    stateRef.current.baseOffsetY = offset.y;
    stateRef.current.dragMode = shouldPanFlatMap ? "pan" : "rotate";
    stateRef.current.lastX = point.x;
    stateRef.current.lastY = point.y;
    stateRef.current.moved = false;
    stateRef.current.startX = point.x;
    stateRef.current.startY = point.y;
    setIsDraggingGlobe(true);
    if (event.pointerId !== undefined) {
      // Defensive release of any stale capture before claiming a new one.
      // Without this, a previous drag that ended via tab-focus-loss / JS
      // throw / etc. leaves the pointerId still owned by the canvas,
      // which then silently swallows every subsequent click anywhere
      // on the page — symptom: panel buttons stop responding (no hover
      // cursor, no click) until the page is reloaded.
      try {
        event.currentTarget.releasePointerCapture?.(event.pointerId);
      } catch {}
      event.currentTarget.setPointerCapture?.(event.pointerId);
    }
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

    if (state.dragMode === "pan") {
      const panX = point.x - state.startX;
      const panY = point.y - state.startY;
      if (Math.abs(panX) > 3 || Math.abs(panY) > 3) {
        state.moved = true;
      }
      setMapOffset({
        x: state.baseOffsetX + panX,
        y: state.baseOffsetY + panY,
      });
      event.preventDefault();
      return;
    }

    state.targetY += dx * 0.006;
    state.targetX = clampNumber(state.targetX + dy * 0.0045, -1.18, 1.18);
    state.moved = state.moved || Math.abs(dx) > 2 || Math.abs(dy) > 2;
    event.preventDefault();
  }, [setMapOffset]);

  const stopDrag = useCallback((event) => {
    if (!stateRef.current.active) return;
    stateRef.current.active = false;
    setIsDraggingGlobe(false);
    if (event.pointerId !== undefined) {
      try {
        event.currentTarget.releasePointerCapture?.(event.pointerId);
      } catch {}
    }
  }, []);

  // Window-level escape hatch: if a drag's pointer capture ever gets
  // stuck on the canvas (browser bug, tab focus change mid-drag, JS
  // error in dragGlobe), every subsequent click on the page routes to
  // the canvas and the panel goes dead. Releasing on any global
  // pointerup guarantees recovery on the very next mouse-up the browser
  // sees, anywhere on the page.
  useEffect(() => {
    const onWindowPointerUp = (event) => {
      const mount = mountRef.current;
      if (!mount) return;
      if (event.pointerId === undefined) return;
      if (mount.hasPointerCapture?.(event.pointerId)) {
        try {
          mount.releasePointerCapture(event.pointerId);
        } catch {}
      }
      // Also clear our own drag-active flag so a re-entry doesn't think
      // we're still dragging from a previous interaction.
      if (stateRef.current.active) {
        stateRef.current.active = false;
        setIsDraggingGlobe(false);
      }
    };
    window.addEventListener("pointerup", onWindowPointerUp);
    window.addEventListener("pointercancel", onWindowPointerUp);
    return () => {
      window.removeEventListener("pointerup", onWindowPointerUp);
      window.removeEventListener("pointercancel", onWindowPointerUp);
    };
  }, []);

  const handleGlobeKey = useCallback((event) => {
    // Keyboard rotation — accessibility win. Arrow keys rotate the globe in
    // 6° steps, Shift gives a coarser 18° leap. +/-/= zoom. Only fires when
    // the canvas itself has focus, so panel inputs still work normally.
    const step = (event.shiftKey ? 0.32 : 0.12);
    const state = stateRef.current;
    if (event.key === "ArrowLeft") {
      state.targetY -= step;
      event.preventDefault();
    } else if (event.key === "ArrowRight") {
      state.targetY += step;
      event.preventDefault();
    } else if (event.key === "ArrowUp") {
      state.targetX = clampNumber(state.targetX - step, -1.3, 1.3);
      event.preventDefault();
    } else if (event.key === "ArrowDown") {
      state.targetX = clampNumber(state.targetX + step, -1.3, 1.3);
      event.preventDefault();
    } else if (event.key === "+" || event.key === "=") {
      const next = clampNumber(mapZoomRef.current + 0.1, 0.5, 3);
      setMapZoom(Number(next.toFixed(2)));
      event.preventDefault();
    } else if (event.key === "-" || event.key === "_") {
      const next = clampNumber(mapZoomRef.current - 0.1, 0.5, 3);
      setMapZoom(Number(next.toFixed(2)));
      event.preventDefault();
    }
  }, [setMapZoom]);

  const zoomGlobe = useCallback((event) => {
    event.preventDefault();
    const intensity = event.ctrlKey ? 0.01 : 0.0018;
    const currentZoom = clampNumber(mapZoomRef.current, 0.5, 3);
    const nextZoom = clampNumber(currentZoom * Math.exp(-event.deltaY * intensity), 0.5, 3);

    if (morphModeRef.current === "flat" && morphRef.current.progress < 0.35) {
      const point = getClientPoint(event);
      const rect = event.currentTarget.getBoundingClientRect();
      if (point && rect.width && rect.height) {
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const pointerX = point.x - centerX;
        const pointerY = point.y - centerY;
        const zoomRatio = nextZoom / currentZoom;
        setMapOffset((offset) => ({
          x: pointerX - (pointerX - offset.x) * zoomRatio,
          y: pointerY - (pointerY - offset.y) * zoomRatio,
        }));
      }
    }

    setMapZoom(Number(nextZoom.toFixed(3)));
  }, [setMapOffset, setMapZoom]);

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

    // Space background lives in its OWN scene (bgScene), rendered to a
    // separate target each frame. The customPass receives that target as a
    // texture and composites it behind the effect output. Why split:
    // pattern post-effects (halftone, newsprint, bayer, threshold,
    // risograph, atkinson) replace the sampled scene with their own
    // mark wherever they see bright signal. With the space bg in the main
    // scene, stars would trigger those marks across the whole screen,
    // burying the globe pattern. With the bg outside the main scene, the
    // pattern shader only sees the globe and can fire dots cleanly on it,
    // while the bg is laid in behind via the composite step.
    const bgScene = new THREE.Scene();
    const spaceBackground = createSpaceBackgroundMesh();
    // Initial parent: when shadeBackground is true (default), space mesh
    // lives in the main scene so the active post-effect processes it
    // alongside the globe. When false, it lives in bgScene and is
    // composited behind the effect output by the customPass — keeps the
    // globe halftone readable on top of a clean starfield.
    if (shadeBackgroundRef.current) {
      scene.add(spaceBackground);
    } else {
      bgScene.add(spaceBackground);
    }

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      preserveDrawingBuffer: true,
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.setClearColor(0x000000, 0);
    // EffectComposer calls renderer.render multiple times per frame (one per
    // pass). With autoReset = true (default), info.render.calls gets zeroed
    // before each pass, so only the LAST pass's count survives — the dev HUD
    // reads "1" no matter how many draw calls actually happened. Switching
    // to manual reset gives us an accurate per-frame total; we reset once at
    // the start of each frame, right before the chunked update + render
    // section.
    renderer.info.autoReset = false;
    // Cap initial DPR — phones and high-DPI laptops are the perf cliff. The
    // adaptive loop below can step it down further if FPS slips.
    const isCoarsePointer = window.matchMedia?.("(pointer: coarse)")?.matches;
    const dprCap = isCoarsePointer ? 1.5 : 2;
    const initialDpr = Math.min(window.devicePixelRatio || 1, dprCap);
    renderer.setPixelRatio(initialDpr);
    mount.appendChild(renderer.domElement);

    // Make the canvas keyboard-focusable so arrow keys can rotate the globe.
    // The aria-label + role announce intent to screen readers; users who don't
    // want to engage can Tab past it.
    renderer.domElement.tabIndex = 0;
    renderer.domElement.setAttribute("role", "application");
    renderer.domElement.setAttribute("aria-label", label || "Interactive dotted globe");

    // WebGL context can be lost when the OS reclaims GPU resources (tab
    // backgrounded too long, GPU driver reset, mobile thermal throttle).
    // Three.js dispatches "webglcontextlost" — we cancel the animation loop
    // to avoid burning CPU on a dead context. On restore, we re-trigger a
    // full reload because rebuilding every material/geometry is more code
    // than this is worth at our complexity.
    const handleContextLost = (event) => {
      event.preventDefault();
      window.cancelAnimationFrame(frame);
      frame = 0;
      console.warn("WebGL context lost — pausing render loop");
    };
    const handleContextRestored = () => {
      console.warn("WebGL context restored — reloading to rebuild GPU resources");
      window.location.reload();
    };
    renderer.domElement.addEventListener("webglcontextlost", handleContextLost, false);
    renderer.domElement.addEventListener("webglcontextrestored", handleContextRestored, false);

    if (canvasHandleRef) {
      canvasHandleRef.current = renderer.domElement;
    }

    const globeGroup = new THREE.Group();
    scene.add(globeGroup);

    // Unlit base sphere so there's no directional-light terminator visible
    // through gaps in the dot field. Stripe-style flat shading on the ocean.
    // depthWrite defaults to true. With it on, the sphere properly z-occludes
    // back-hemisphere grid lines, dots, and network arcs at any non-zero
    // opacity → clean front-hemisphere view as the user rotates. The
    // alternative (depthWrite: false) lets back content show through but
    // produces a visual mess: transparent objects sort by bounding-sphere
    // center distance and the graticule lines + InstancedMesh dot layer
    // all share the globe origin as their center, so ordering becomes
    // non-deterministic — front and back lines/dots render in essentially
    // arbitrary order and overlap. The "see network through" escape hatch
    // is to drop Surface opacity to 0, which sets globeMesh.visible=false
    // so back content is fully revealed without ordering ambiguity.
    const baseMaterial = new THREE.MeshBasicMaterial({
      color: new THREE.Color("#18191d"),
      transparent: true,
      opacity: 0.28,
    });
    const globeMesh = new THREE.Mesh(new THREE.SphereGeometry(2, 96, 96), baseMaterial);
    globeGroup.add(globeMesh);

    // Flat solid plane — in solid render mode this displays the same world
    // texture as the sphere, but as a 2D map for the flat view. Sized to
    // match the flat dot field exactly (5.35 × 2.675 units at z=-0.18) so
    // it occupies the same screen real estate as the dots would. Opacity is
    // driven by (1 − shellProgress) in applyGlobeShellProgress, giving a
    // seamless cross-fade with the sphere during the flat ↔ globe morph.
    const flatSolidMaterial = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0,
      depthWrite: false,
      toneMapped: false,
    });
    const flatSolidMesh = new THREE.Mesh(
      new THREE.PlaneGeometry(5.35, 5.35 * 0.5),
      flatSolidMaterial,
    );
    flatSolidMesh.position.z = -0.18;
    flatSolidMesh.visible = false;
    flatSolidMesh.renderOrder = -1;
    globeGroup.add(flatSolidMesh);

    const atmosphereMaterial = createAtmosphereMaterial();
    const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(2 + 0.18, 96, 96), atmosphereMaterial);
    globeGroup.add(atmosphere);

    // Outer halo — wider, softer secondary atmosphere for deep cinematic glow.
    const outerHaloMaterial = createOuterHaloMaterial();
    const outerHalo = new THREE.Mesh(new THREE.SphereGeometry(2 + 0.55, 64, 64), outerHaloMaterial);
    globeGroup.add(outerHalo);

    const graticule = createGraticule();
    globeGroup.add(graticule);

    const borderlessNetwork = createBorderlessNetwork();
    globeGroup.add(borderlessNetwork);

    const globeNetwork = createGlobeNetwork();
    globeGroup.add(globeNetwork);

    // Slightly more directional lighting — a key light and a soft rim from the back
    // for atmospheric scattering depth.
    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(2.4, 1.9, 4);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0x88c8ff, 0.55);
    rimLight.position.set(-3, -0.6, -2.4);
    scene.add(rimLight);
    scene.add(new THREE.AmbientLight(0xffffff, 0.68));

    const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
    const initialRect = mount.getBoundingClientRect();
    const initialWidth = Math.max(1, Math.floor(initialRect.width));
    const initialHeight = Math.max(1, Math.floor(initialRect.height));
    // Off-screen target for the bg-only render. Each frame we render
    // bgScene (just the space mesh, or nothing for solid bg) here, then
    // pass the texture to the customPass for composite-behind-effect.
    const bgTarget = new THREE.WebGLRenderTarget(
      Math.round(initialWidth * pixelRatio),
      Math.round(initialHeight * pixelRatio),
      {
        depthBuffer: false,
        stencilBuffer: false,
      },
    );
    const postHandle = createPostComposer({
      renderer,
      scene,
      camera,
      width: initialWidth,
      height: initialHeight,
      pixelRatio,
      bgTexture: bgTarget.texture,
    });

    threeRef.current = {
      atmosphereMaterial,
      atmosphere,
      outerHaloMaterial,
      outerHalo,
      spaceBackground,
      bgScene,
      bgTarget,
      atmosphereIntensity: 0.42,
      baseDistance: GLOBE_CAMERA_DISTANCE,
      baseMaterial,
      baseOpacity: 0.3,
      borderlessNetwork,
      globeMesh,
      globeNetwork,
      camera,
      dotLayer: null,
      flatDistance: GLOBE_CAMERA_DISTANCE,
      flatSolidMaterial,
      flatSolidMesh,
      globeDistance: GLOBE_CAMERA_DISTANCE,
      globeGroup,
      graticule,
      graticuleOpacity: 0.13,
      postHandle,
      renderer,
      scene,
      setSelectedDots,
    };
    applyGlobeShellProgress(threeRef.current, morphRef.current.progress, globeSettingsRef.current);

    const resize = () => {
      const rect = mount.getBoundingClientRect();
      const width = Math.max(1, Math.floor(rect.width));
      const height = Math.max(1, Math.floor(rect.height));
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      const aspect = Math.max(camera.aspect, 0.1);
      const narrowFit = clampNumber((760 - width) / 260, 0, 1);
      const flatFitAspect = GLOBE_FLAT_FIT_ASPECT + narrowFit * 0.18;
      const globeFitAspect = GLOBE_ROUND_FIT_ASPECT + narrowFit * 0.32;
      threeRef.current.flatDistance = GLOBE_CAMERA_DISTANCE * Math.max(1, flatFitAspect / aspect);
      threeRef.current.globeDistance = GLOBE_CAMERA_DISTANCE * Math.max(1, globeFitAspect / aspect);
      threeRef.current.baseDistance = threeRef.current.globeDistance;
      // Cache canvas dimensions so the animate loop doesn't have to call
      // getBoundingClientRect every frame — that call forces a synchronous
      // layout flush, which at 60fps would be 60 forced reflows/sec on top
      // of whatever the rest of the page is doing. ResizeObserver fires
      // any time the mount node actually changes size, so this stays fresh.
      threeRef.current.canvasWidth = rect.width;
      threeRef.current.canvasHeight = rect.height;
      renderer.setSize(width, height, false);
      postHandle.setSize(width, height);
      // Bg-only target uses the device-pixel size so it samples 1:1
      // with the composer's read buffer. Without this resize, the bg
      // composite would stretch or look blurry after window resize.
      const dpr = renderer.getPixelRatio();
      bgTarget.setSize(
        Math.max(1, Math.round(width * dpr)),
        Math.max(1, Math.round(height * dpr)),
      );
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
      const currentGlobeSettings = { ...DEFAULT_GLOBE_SETTINGS, ...globeSettingsRef.current };
      // Auto-spin honours `prefers-reduced-motion`: long-running continuous
      // rotation is the canonical kind of animation that the OS-level pref
      // exists to silence. Speed is its own 0–100 setting (decoupled from
      // shader motion); the legacy `autoSpin: false` bool from older
      // saved configs is mapped to speed = 0 here.
      const legacyAutoSpinOff = currentGlobeSettings.autoSpin === false;
      const autoSpinSpeed = legacyAutoSpinOff
        ? 0
        : clampNumber(currentGlobeSettings.autoSpinSpeed ?? 35, 0, 100);
      const autoSpinAllowed = autoSpinSpeed > 0 && !reducedMotionRef.current;
      const spin = (autoSpinSpeed / 100) * 0.00043;
      const spinProgress = autoSpinAllowed ? smoothStep(0.28, 1, morphRef.current.progress) : 0;
      if (!state.active) {
        state.targetY += spin * delta * spinProgress;
      }

      state.currentX += (state.targetX - state.currentX) * 0.095;
      state.currentY += (state.targetY - state.currentY) * 0.095;

      const morph = morphRef.current;
      // Direction tracks whether this run is flat→globe (+1) or globe→flat
      // (−1). Captured before progress completes so the cinematic flourish
      // (extra roll + FOV punch) reads correctly in both directions.
      const morphDirection = morph.target >= morph.start ? 1 : -1;
      if (morph.active) {
        const elapsed = now - morph.startTime;
        const progress = easeInOutQuart(elapsed / GLOBE_MORPH_DURATION);
        morph.progress = morph.start + (morph.target - morph.start) * progress;
        if (progress >= 1) {
          morph.progress = morph.target;
          morph.active = false;
        }
      }

      // sin(πt) peaks at the morph midpoint — drives the dolly-zoom, scale
      // dip and Z roll so all three flourishes are perfectly in phase and
      // settle back to zero by the time the morph lands.
      const morphPulse = morph.active && !reducedMotionRef.current
        ? Math.sin(
            clampNumber(
              (now - morph.startTime) / GLOBE_MORPH_DURATION,
              0,
              1,
            ) * Math.PI,
          )
        : 0;

      const flatProgress = 1 - smoothStep(0.06, 0.82, morph.progress);
      const rotationProgress = smoothStep(0.18, 1, morph.progress);
      const transform = transformRef.current;
      // Mid-morph FOV breath: punch out ~5° at the peak then settle. Reads
      // as a subtle dolly-zoom through space without ever losing the
      // subject. Wider clamp (60) accommodates the punched peak.
      const fovPunch = morphPulse * 5;
      const targetFov = clampNumber(42 + (transform.mapDepth - 55) * 0.12 * flatProgress + fovPunch, 34, 60);
      const targetDistance = THREE.MathUtils.lerp(
        threeRef.current.flatDistance || threeRef.current.baseDistance,
        threeRef.current.globeDistance || threeRef.current.baseDistance,
        rotationProgress,
      );
      // Lerp factor lifts mid-morph so the FOV punch resolves quickly enough
      // to actually read — at the static 0.12 it would smear too much.
      const fovLerp = 0.12 + morphPulse * 0.18;
      camera.fov += (targetFov - camera.fov) * fovLerp;
      camera.position.z = targetDistance / clampNumber(mapZoomRef.current, 0.5, 3);
      camera.updateProjectionMatrix();

      // Pull cached dimensions written by `resize()` instead of calling
      // getBoundingClientRect — avoids a forced layout flush each frame.
      const rectWidth = threeRef.current.canvasWidth ?? renderer.domElement.clientWidth ?? 1;
      const rectHeight = threeRef.current.canvasHeight ?? renderer.domElement.clientHeight ?? 1;
      const visibleHeight = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2) * camera.position.z;
      const visibleWidth = visibleHeight * camera.aspect;
      const offset = mapOffsetRef.current || { x: 0, y: 0 };
      // narrow viewports + open desktop panel → shift the globe horizontally
      // so it sits in the dead area NEXT to the panel rather than half-
      // covered by it. On mobile (viewport ≤ 620px) the panel is a bottom
      // sheet, not a left-side rail, so this horizontal nudge is the wrong
      // axis and just shoves the globe off-center. Gate the nudge on a
      // desktop-only width check.
      const isMobileLayout = rectWidth <= 620;
      const narrowFocus = isMobileLayout ? 0 : clampNumber((760 - rectWidth) / 260, 0, 1);
      const panelFocusPixels = panelCollapsedRef.current ? 0 : narrowFocus * 104;
      const globeFocusOffset = (panelFocusPixels / Math.max(rectWidth, 1)) * visibleWidth;

      globeGroup.position.x = (offset.x / Math.max(rectWidth, 1)) * visibleWidth * flatProgress + globeFocusOffset * rotationProgress;
      globeGroup.position.y = (-offset.y / Math.max(rectHeight, 1)) * visibleHeight * flatProgress;
      globeGroup.position.z = 0;
      globeGroup.rotation.x = THREE.MathUtils.degToRad(transform.tiltX || 0) * flatProgress + state.currentX * rotationProgress;
      // Extra Z-axis roll mid-morph adds character — direction-aware so the
      // roll feels like an intentional cinematic flourish in both
      // directions, never a glitchy snap.
      globeGroup.rotation.z = morphPulse * 0.07 * morphDirection;
      // Cinematic Y kick: about 26° of extra spin at the peak, direction
      // aware, layered on top of the natural rotation so the world feels
      // like it's spinning into place.
      const cinematicSpin = morphPulse * 0.45 * morphDirection;
      globeGroup.rotation.y = THREE.MathUtils.degToRad(transform.tiltY || 0) * flatProgress + state.currentY * rotationProgress + cinematicSpin;
      // Scale dip — group contracts ~3% at the peak then rebounds. Combined
      // with the FOV punch this gives a subtle vertigo / "Hitchcock dolly"
      // feel without losing alignment with the projection.
      const breath = 1 - morphPulse * 0.03;
      if (Math.abs(globeGroup.scale.x - breath) > 0.0005) {
        globeGroup.scale.setScalar(breath);
      }

      if (threeRef.current.dotLayer) {
        const dotLayer = threeRef.current.dotLayer;
        const progressDelta = Math.abs((dotLayer.userData.morphProgress ?? -1) - morph.progress);
        const wasChunkingMorph = (dotLayer.userData.morphChunk ?? -1) >= 0;
        // Chunked re-bake while morph is active — only 1/3 of instances are
        // rewritten + uploaded per frame. When morph.active flips false we do
        // one full-update pass to flush any stragglers stuck a frame behind.
        if (progressDelta > 0.0005) {
          applyDotLayerMorph(dotLayer, morph.progress, morph.active);
        } else if (!morph.active && wasChunkingMorph) {
          applyDotLayerMorph(dotLayer, morph.progress, false);
        }
      }
      // Animated dot rotation. Advances spinAngleRef by elapsed time when
      // the user's speed slider is > 0; at 0 (or under prefers-reduced-
      // motion) we re-bake matrices once so dots return to the static
      // slider angle, then leave them alone.
      if (threeRef.current.dotLayer) {
        const rawSpeed = Math.max(0, Math.min(100, shapeRotationSpeedRef.current ?? 0));
        const animating = rawSpeed > 0 && !reducedMotionRef.current;
        if (animating) {
          // Map 1–100 onto degrees-per-second so the slider scales from a
          // gentle drift up to a brisk spin. (0 falls through to the
          // settle branch below.)
          const speedNormalized = rawSpeed / 100;
          const degreesPerSecond =
            SPIN_MIN_DEG_PER_SEC + speedNormalized * (SPIN_MAX_DEG_PER_SEC - SPIN_MIN_DEG_PER_SEC);
          spinAngleRef.current = (spinAngleRef.current + (delta / 1000) * degreesPerSecond) % 360;
          // Chunked while spinning — same logic as morph. Continuous rotation
          // tolerates 1-2 frame lag per dot just fine.
          applyDotLayerSpin(
            threeRef.current.dotLayer,
            (dotRotationRef.current + spinAngleRef.current) % 360,
            morph.progress,
            true,
          );
        } else if (spinAngleRef.current !== 0) {
          spinAngleRef.current = 0;
          // Final non-chunked settle so every dot lands at the slider angle.
          applyDotLayerSpin(threeRef.current.dotLayer, dotRotationRef.current, morph.progress, false);
        } else if ((threeRef.current.dotLayer.userData.spinChunk ?? -1) >= 0) {
          // Flush stale chunks left over from a previous spin session.
          applyDotLayerSpin(threeRef.current.dotLayer, dotRotationRef.current, morph.progress, false);
        }
      }
      applyGlobeShellProgress(threeRef.current, morph.progress, currentGlobeSettings);
      // Freeze the clock that drives long-running ambient motion when reduced
      // motion is preferred. The scene still renders, it just doesn't animate.
      const ambientTime = reducedMotionRef.current ? 0 : now / 1000;
      updateBorderlessNetworkMotion(threeRef.current.borderlessNetwork, reducedMotionRef.current ? 0 : now);
      updateGlobeNetwork(threeRef.current.globeNetwork, ambientTime);

      if (threeRef.current?.atmosphereMaterial?.uniforms?.uTime) {
        threeRef.current.atmosphereMaterial.uniforms.uTime.value = ambientTime;
      }
      if (threeRef.current?.outerHaloMaterial?.uniforms?.uTime) {
        threeRef.current.outerHaloMaterial.uniforms.uTime.value = ambientTime;
      }
      twinkleUniforms.uTime.value = ambientTime;
      twinkleUniforms.twinkleAmount.value = reducedMotionRef.current ? 0 : 0.18;
      twinkleUniforms.uSizeVary.value = sizeVaryRef.current ? 1 : 0;

      const sbg = threeRef.current?.spaceBackground;
      if (sbg) {
        const wantsSpace = backgroundStyleRef.current === "space";
        sbg.visible = wantsSpace;
        // Re-parent the space mesh on toggle change. Compared against
        // sbg.parent rather than a separate state ref so we react to
        // any external mutation (e.g., disposal logic) too.
        const wantShade = shadeBackgroundRef.current;
        const desiredParent = wantShade
          ? threeRef.current.scene
          : threeRef.current.bgScene;
        if (sbg.parent !== desiredParent && desiredParent) {
          sbg.parent?.remove(sbg);
          desiredParent.add(sbg);
        }
        if (wantsSpace) {
          const settings = spaceSettingsRef.current || {};
          // Reuse the cached dimensions captured by `resize()` rather than
          // forcing a per-frame layout flush.
          const sbgWidth = threeRef.current.canvasWidth ?? renderer.domElement.clientWidth ?? 1;
          const sbgHeight = threeRef.current.canvasHeight ?? renderer.domElement.clientHeight ?? 1;
          const u = sbg.material.uniforms;
          u.uTime.value = ambientTime;
          u.uResolution.value.set(Math.max(1, sbgWidth), Math.max(1, sbgHeight));
          u.uDensity.value = (settings.density ?? 65) / 100;
          u.uMotion.value = (settings.motion ?? 35) / 100;
          u.uNebula.value = (settings.nebula ?? 55) / 100;
          u.uHue.value = (settings.hue ?? 0) / 50;
          u.uBrightness.value = (settings.brightness ?? 100) / 100;
        }
        // Render the bg scene (just the space mesh, or empty for solid bg)
        // to its own target. The customPass samples this and composites it
        // behind the effect output so pattern shaders only mark the globe
        // and the bg shows through cleanly in the gaps. For solid bg we
        // still render the (empty / hidden mesh) scene to the target — the
        // clear color produced becomes the bg the customPass composites,
        // which gives the solid-bg case the same visual as before.
        const bgScene = threeRef.current?.bgScene;
        const bgTarget = threeRef.current?.bgTarget;
        if (bgScene && bgTarget) {
          const prevTarget = renderer.getRenderTarget();
          const prevAutoClear = renderer.autoClear;
          renderer.autoClear = true;
          renderer.setRenderTarget(bgTarget);
          renderer.render(bgScene, threeRef.current.camera);
          renderer.setRenderTarget(prevTarget);
          renderer.autoClear = prevAutoClear;
        }
      }

      // Uniform writes are cheap and keep the composer chain ready for an
      // instant switch when the user picks a non-default effect.
      updatePostEffects(threeRef.current?.postHandle, settingsRef.current, now / 1000, uiThemeRef.current);
      // Manual reset — accumulates draw call totals across the full
      // render path (composer or direct) for the dev HUD. See
      // `renderer.info.autoReset = false` at renderer init for context.
      renderer.info.reset();
      // Fast path: when no post-processing is active, skip the composer
      // entirely and call renderer.render directly. The composer chain in
      // the "none" case is renderPass + (disabled bloom) + customPass-as-
      // passthrough — that final passthrough shader is a full-screen
      // fragment job that does no useful work. Bypassing it saves ~1 ms
      // per frame on an iGPU at 1080p. The setRenderTarget(null) call is
      // defensive: composer.render may leave the target pointing at one
      // of its internal buffers depending on three.js version.
      // Always go through the composer now — the customPass's final step
      // composites the bg-only target behind the effect output, which is
      // how pattern shaders (halftone, newsprint, bayer, …) end up with
      // the starfield visible in the gaps. The old "no effect = bypass
      // composer" fast path would skip that composite, so the bg would
      // disappear when no effect is selected. The composer's chain in
      // the no-effect case still costs ~1ms, which is the price for
      // architectural simplicity here.
      const refsNow = threeRef.current;
      if (refsNow) {
        refsNow.postHandle?.composer.render();
      }

      // Dev-only perf HUD feed. Cheap: a few field writes per frame, no
      // allocation, no React touches. Vite strips the HUD mount in prod,
      // so these writes go nowhere there but cost nothing measurable.
      if (import.meta.env.DEV) {
        const instantFps = 1000 / Math.max(1, delta);
        const m = perfMetricsRef.current;
        // Exponential smoothing — α = 0.1 settles in ~10 frames, fast enough
        // to track real changes but stable enough to read at 4 Hz.
        m.fps = m.fps * 0.9 + instantFps * 0.1;
        const info = renderer.info;
        m.calls = info?.render?.calls ?? 0;
        m.geometries = info?.memory?.geometries ?? 0;
        m.dots = threeRef.current.dotLayer?.userData?.dotCount ?? 0;
      }

      // Adaptive DPR — track sustained FPS in a 60-frame window. When the
      // average drops below 50 FPS, step DPR down by 0.25; when it climbs
      // back above 58 FPS, allow it to recover up to the initial cap. Hold
      // 2.5s between adjustments so we don't oscillate.
      perfState.frames++;
      perfState.accum += delta;
      if (perfState.frames >= 60) {
        const fps = (perfState.frames * 1000) / Math.max(perfState.accum, 1);
        if (now - perfState.lastAdjustAt > 2500) {
          const currentPR = renderer.getPixelRatio();
          if (fps < 50 && currentPR > 1) {
            const next = Math.max(1, currentPR - 0.25);
            renderer.setPixelRatio(next);
            const w = renderer.domElement.clientWidth || renderer.domElement.width;
            const h = renderer.domElement.clientHeight || renderer.domElement.height;
            renderer.setSize(w, h, false);
            postHandle.setSize(w * next, h * next);
            perfState.lastAdjustAt = now;
          } else if (fps > 58 && currentPR < initialDpr - 0.001) {
            const next = Math.min(initialDpr, currentPR + 0.25);
            renderer.setPixelRatio(next);
            const w = renderer.domElement.clientWidth || renderer.domElement.width;
            const h = renderer.domElement.clientHeight || renderer.domElement.height;
            renderer.setSize(w, h, false);
            postHandle.setSize(w * next, h * next);
            perfState.lastAdjustAt = now;
          }
        }
        perfState.frames = 0;
        perfState.accum = 0;
      }

      frame = window.requestAnimationFrame(animate);
    };
    const perfState = { frames: 0, accum: 0, lastAdjustAt: 0 };
    frame = window.requestAnimationFrame(animate);

    // Pause the render loop when the tab is hidden. Saves CPU/GPU/battery and
    // prevents the requestAnimationFrame throttling from causing a backlog of
    // catch-up frames when the user returns. Resume cleanly on visibility change.
    const handleVisibility = () => {
      if (document.hidden) {
        window.cancelAnimationFrame(frame);
        frame = 0;
      } else if (!frame) {
        // Reset lastTime so the first delta after resume isn't a giant jump.
        lastTime = window.performance.now();
        frame = window.requestAnimationFrame(animate);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    // True high-res capture: pause animation, resize renderer + composer to N×
    // the display resolution, render one frame at that resolution, capture the
    // pixels via toBlob, then restore everything. Gives 2×/3×/4× output that's
    // genuinely higher resolution rather than a Canvas2D upscale.
    const captureAtScale = (scale) =>
      new Promise((resolve, reject) => {
        const refs = threeRef.current;
        if (!refs?.postHandle) {
          reject(new Error("Composer not ready"));
          return;
        }
        window.cancelAnimationFrame(frame);
        const originalPixelRatio = renderer.getPixelRatio();
        const rect = renderer.domElement.getBoundingClientRect();
        const displayW = Math.max(1, Math.floor(rect.width));
        const displayH = Math.max(1, Math.floor(rect.height));
        const targetPR = Math.max(1, scale);

        try {
          renderer.setPixelRatio(targetPR);
          renderer.setSize(displayW, displayH, false);
          refs.postHandle.setSize(displayW * targetPR, displayH * targetPR);
          if (refs.spaceBackground?.material?.uniforms?.uResolution) {
            refs.spaceBackground.material.uniforms.uResolution.value.set(
              displayW * targetPR,
              displayH * targetPR,
            );
          }
          refs.postHandle.composer.render();
          renderer.domElement.toBlob((blob) => {
            // Restore original render size regardless of toBlob outcome.
            renderer.setPixelRatio(originalPixelRatio);
            renderer.setSize(displayW, displayH, false);
            refs.postHandle.setSize(displayW * originalPixelRatio, displayH * originalPixelRatio);
            if (refs.spaceBackground?.material?.uniforms?.uResolution) {
              refs.spaceBackground.material.uniforms.uResolution.value.set(
                displayW * originalPixelRatio,
                displayH * originalPixelRatio,
              );
            }
            frame = window.requestAnimationFrame(animate);
            if (blob) resolve(blob);
            else reject(new Error("toBlob returned null"));
          }, "image/png");
        } catch (error) {
          renderer.setPixelRatio(originalPixelRatio);
          renderer.setSize(displayW, displayH, false);
          refs.postHandle.setSize(displayW * originalPixelRatio, displayH * originalPixelRatio);
          frame = window.requestAnimationFrame(animate);
          reject(error);
        }
      });

    if (canvasHandleRef) {
      renderer.domElement.captureAtScale = captureAtScale;
    }

    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("visibilitychange", handleVisibility);
      renderer.domElement.removeEventListener("webglcontextlost", handleContextLost);
      renderer.domElement.removeEventListener("webglcontextrestored", handleContextRestored);
      observer.disconnect();
      if (canvasHandleRef) {
        canvasHandleRef.current = null;
      }
      disposeThreeObject(scene);
      threeRef.current?.postHandle?.dispose?.();
      renderer.dispose();
      renderer.domElement.remove();
      threeRef.current = null;
    };
  }, [canvasHandleRef, setSelectedDots]);

  useEffect(() => {
    const refs = threeRef.current;
    if (!refs) return;

    // Solid mode has its own dedicated rendering path now — a textured
    // sphere in globe view and a textured flat plane in flat view, both
    // cross-faded by shellProgress during the morph. The dot field is
    // therefore strictly for dots-mode here; no fallback shenanigans.
    const showDots = renderMode === "dots" && dotsVisible;
    const effectiveDotColor = dotColor;

    if (!showDots) {
      if (refs.dotLayer) {
        refs.globeGroup.remove(refs.dotLayer);
        disposeThreeObject(refs.dotLayer);
        refs.dotLayer = null;
      }
      return undefined;
    }

    let cancelled = false;
    const swap = (customShapeTexture) => {
      if (cancelled) {
        customShapeTexture?.dispose?.();
        return;
      }
      const nextLayer = buildGlobeDotLayer({
        mapData,
        selectedDots,
        dotColor: effectiveDotColor,
        dotColorAlpha,
        dotGradient,
        dotSize,
        shape,
        dotRotation,
        asciiSymbol,
        shaderSettings,
        globeSettings,
        morphProgress: morphRef.current.progress,
        customShapeTexture,
      });

      if (refs.dotLayer) {
        refs.globeGroup.remove(refs.dotLayer);
        disposeThreeObject(refs.dotLayer);
      }

      refs.dotLayer = nextLayer;
      refs.globeGroup.add(nextLayer);
    };

    if (shape === "Custom" && customShape?.dataUrl) {
      createCustomShapeTexture(customShape.dataUrl).then(swap);
    } else {
      swap(null);
    }

    return () => {
      cancelled = true;
    };
  }, [asciiSymbol, customShape, dotColor, dotColorAlpha, dotGradient, dotRotation, dotSize, dotsVisible, globeSettings, mapData, renderMode, selectedDots, shaderSettings, shape]);

  useEffect(() => {
    const refs = threeRef.current;
    if (!refs?.baseMaterial) return undefined;

    if (renderMode !== "solid") {
      refs.baseMaterial.map = null;
      refs.baseMaterial.needsUpdate = true;
      refs.solidActive = false;
      if (refs.flatSolidMaterial) {
        refs.flatSolidMaterial.map = null;
        refs.flatSolidMaterial.needsUpdate = true;
      }
      applyGlobeShellProgress(refs, morphRef.current.progress, globeSettingsRef.current);
      return undefined;
    }

    let cancelled = false;

    // Mirror the dotted-map's exact framing for the flat plane. dotted-map
    // uses Mercator clipped to a region (DEFAULT_WORLD_REGION = lat [-56,71],
    // lng [-168,168] for the world; computeGeojsonBox(features) for any
    // country/region selection — see node_modules/dotted-map/dist/index.mjs).
    // Reading these straight from mapData.image guarantees the solid view
    // lines up pixel-for-pixel with the dot field.
    const mapImage = mapData?.image;
    const region = mapImage?.region ?? null;
    const aspect = mapImage?.width && mapImage?.height
      ? mapImage.width / mapImage.height
      : null;

    // Resize the flat plane to match the dotted-map's aspect exactly. The
    // flat width is the same 5.35 units the dot field uses in
    // pointToFlatVector3, so dots and plane share an identical bounding box.
    if (refs.flatSolidMesh && aspect && Number.isFinite(aspect)) {
      const flatWidth = 5.35;
      const flatHeight = flatWidth / aspect;
      refs.flatSolidMesh.geometry?.dispose?.();
      refs.flatSolidMesh.geometry = new THREE.PlaneGeometry(flatWidth, flatHeight);
    }

    const applySolid = (sphereTexture, flatTexture) => {
      if (cancelled || !threeRef.current) return;
      const liveRefs = threeRef.current;
      // Sphere texture — equirectangular full-world (the sphere geometry's
      // UVs assume a flat 2:1 lat/lng layout, anything else stretches at
      // the poles).
      liveRefs.solidTexture?.dispose?.();
      liveRefs.solidTexture = sphereTexture;
      liveRefs.baseMaterial.map = sphereTexture;
      liveRefs.baseMaterial.color.set("#ffffff");
      liveRefs.baseMaterial.metalness = 0;
      liveRefs.baseMaterial.roughness = 0.6;
      liveRefs.baseMaterial.needsUpdate = true;
      liveRefs.solidActive = true;
      liveRefs.baseOpacity = 1;
      // Flat plane texture — Mercator clipped to the dotted-map region so
      // the framing and aspect match the dot field exactly.
      liveRefs.flatSolidTexture?.dispose?.();
      liveRefs.flatSolidTexture = flatTexture;
      if (liveRefs.flatSolidMaterial) {
        liveRefs.flatSolidMaterial.map = flatTexture;
        liveRefs.flatSolidMaterial.needsUpdate = true;
      }
      applyGlobeShellProgress(liveRefs, morphRef.current.progress, globeSettingsRef.current);
    };

    // Kick off the rivers + cities fetches in parallel with the countries
    // fetch when they're requested. Each lazy loader caches after first hit
    // so toggling on/off doesn't refetch.
    const riversPromise = riversVisible ? loadWorldRivers().catch(() => null) : Promise.resolve(null);
    const citiesPromise = citiesVisible ? loadWorldCities().catch(() => null) : Promise.resolve(null);

    Promise.all([loadWorldCountries(), riversPromise, citiesPromise]).then(([countries, rivers, cities]) => {
      if (cancelled) return;
      // Mirror the dot-pipeline's filtering on the solid texture so the
      // selected region/country/state actually shows up here too.
      //   - state mode: use the state feature collection directly
      //   - country/region mode: keep only the atlas features whose
      //     un-padded ccn3 numeric id matches one of the selected cca3s
      //   - world: render the full atlas, minus Antarctica (id 10) — the
      //     dotted-map clips at lat -56, so this keeps the two views in
      //     agreement
      let featureCollection = countries;
      if (selectionCollection?.features?.length) {
        featureCollection = selectionCollection;
      } else if (selectionCountryCodes && selectionCountryCodes.length > 0) {
        const keepCcn3 = new Set(
          selectionCountryCodes
            .map((code) => cca3ToCcn3.get(code))
            .filter(Boolean),
        );
        featureCollection = {
          type: "FeatureCollection",
          features: countries.features.filter((feature) =>
            keepCcn3.has(String(parseInt(feature.id, 10))),
          ),
        };
      } else {
        featureCollection = {
          type: "FeatureCollection",
          features: countries.features.filter(
            (feature) => String(parseInt(feature.id, 10)) !== "10",
          ),
        };
      }
      const textureOptions = {
        // Transparent ocean — show only the land in solid mode, no
        // hardcoded water bg. The user's chosen Background (solid or
        // space) shows through where water used to paint.
        ocean: "transparent",
        fill: worldFill,
        fillAlpha: worldFillAlpha,
        fillGradient: worldFillGradient,
        fillVisible: worldFillVisible,
        stroke: worldStroke,
        strokeAlpha: worldStrokeAlpha,
        strokeGradient: worldStrokeGradient,
        strokeVisible: worldStrokeVisible,
        strokeWidth: worldStrokeWidth,
        rivers,
        riversVisible: riversVisible && Boolean(rivers),
        riversColor,
        riversWidth,
        cities,
        citiesVisible: citiesVisible && Boolean(cities),
        citiesColor,
        citiesMinPop,
        custom: customTopology,
        customVisible: customTopologyVisible && Boolean(customTopology),
        customColor: customTopologyColor,
      };
      const sphereTexture = createWorldTexture(featureCollection, textureOptions);
      const flatTexture = region && aspect
        ? createWorldTexture(featureCollection, {
            ...textureOptions,
            region,
            aspect,
            // Sphere always uses equirectangular; flat plane honors the user's
            // projection pick. Threaded only into the flat texture so the
            // sphere UV unwrap stays correct.
            projection: flatProjection,
          })
        : sphereTexture;
      if (sphereTexture) applySolid(sphereTexture, flatTexture);
    });

    return () => {
      cancelled = true;
    };
    // mapData isn't a dep — we only read region/aspect from it, both of
    // which are stable when the selection doesn't change. The selection
    // deps cover the only mutations that actually matter here, and
    // leaving mapData out avoids a texture rebuild every density slide.
  }, [renderMode, worldFill, worldFillAlpha, worldFillGradient, worldFillVisible, worldStroke, worldStrokeAlpha, worldStrokeGradient, worldStrokeVisible, worldStrokeWidth, selectionCountryCodes, selectionCollection, flatProjection, riversVisible, riversColor, riversWidth, citiesVisible, citiesColor, citiesMinPop, customTopology, customTopologyVisible, customTopologyColor]);

  useEffect(() => {
    const target = morphMode === "globe" ? 1 : 0;
    const morph = morphRef.current;
    if (Math.abs(morph.progress - target) < 0.001) {
      morph.progress = target;
      morph.target = target;
      morph.active = false;
      applyDotLayerMorph(threeRef.current?.dotLayer, target);
      applyGlobeShellProgress(threeRef.current, target, globeSettingsRef.current);
      return;
    }

    morph.start = morph.progress;
    morph.target = target;
    morph.startTime = window.performance.now();
    morph.active = true;
  }, [morphMode]);

  // Network color mode — flat ink vs polychrome. Walks the network tree
  // and rewrites each material's color; only re-runs when the toggle or
  // Apply user-picked arc + pulse colors to the network on settings
  // change. Either may be null, in which case the renderer falls back
  // to each route/hub's hardcoded polychrome originalColor. The
  // previous mono-vs-color toggle is gone — users now pick exactly
  // the two tints they want directly.
  useEffect(() => {
    const network = threeRef.current?.globeNetwork;
    if (!network) return;
    setNetworkColors(network, globeSettings?.arcColor ?? null, globeSettings?.pulseColor ?? null);
  }, [globeSettings?.arcColor, globeSettings?.pulseColor]);

  useEffect(() => {
    const refs = threeRef.current;
    if (!refs) return;

    const look = globeSettings?.look ?? DEFAULT_GLOBE_SETTINGS.look;
    const isBorderless = look === "borderless";
    const isLight = uiTheme === "light";
    // Theme-aware fallback chrome for the Three.js scene. Dark theme keeps
    // the cinematic-night palette (deep blue/violet glows, warm white halo);
    // light theme flips to a cream-and-graphite palette so the sphere and
    // glow read against the cream canvas instead of fighting it.
    const transparentFallback = isLight ? "#ebe7dc" : "#151517";
    const surfaceLerpTarget = isLight ? "#cfcabd" : "#23262d";
    const borderlessLerpTarget = isLight ? "#d9d4c4" : "#091326";
    const borderlessGlowFrom = isLight ? "#1f1d22" : "#7fe4ff";
    const borderlessGlowTo = isLight ? "#3a3742" : "#ac8cff";
    const defaultGlow = isLight ? "#3a3742" : GLOBE_DEFAULT_GLOW;
    // Solid mode used to hardcode white for the sphere. In light mode that
    // makes the "ocean" disappear into the cream canvas. Use the accent's
    // counterpart (dark in light, white in dark) so continents always
    // contrast with the sphere underneath them.
    const solidSphereColor = isLight ? "#18171a" : "#ffffff";
    const bgColor = new THREE.Color(transparent ? transparentFallback : background);
    // User override always wins; null falls back to the auto-derived
    // tint (cyan/violet for borderless, dot-color for classic).
    const userGlowColor = globeSettings?.glowColor ?? null;
    const glowColor = userGlowColor
      ? new THREE.Color(userGlowColor)
      : isBorderless
        ? new THREE.Color(borderlessGlowFrom).lerp(new THREE.Color(borderlessGlowTo), 0.28)
        : new THREE.Color(dotColor === "#ffffff" ? defaultGlow : dotColor);
    const intensity = clampNumber(shaderSettings.intensity ?? 45, 0, 100) / 100;

    const solidActive = refs.solidActive;
    // Surface color is now user-controlled via globeSettings.surfaceColor
    // + surfaceGradient (parallel to grid). The previous theme-derived
    // surfaceColor that lerped against the background is gone — it
    // would have stomped the user's picks the same way the grid color
    // override did. Solid render mode still uses a separate hardcoded
    // sphere color since the textured map needs guaranteed contrast.
    const userSurfaceColor = globeSettings?.surfaceColor ?? "#18191d";
    const userSurfaceGradient = globeSettings?.surfaceGradient ?? null;
    const useSurfaceGradient = !!(
      !solidActive &&
      userSurfaceGradient &&
      userSurfaceGradient.from &&
      userSurfaceGradient.to
    );
    if (useSurfaceGradient) {
      // Vertex-colors mode: paint each sphere vertex with a sample
      // from the 2-stop gradient, interpolated by latitude (south →
      // north). The material color is forced white so per-vertex
      // colors are multiplied by 1.0 (not tinted).
      refs.baseMaterial.color.set(0xffffff);
      if (!refs.baseMaterial.vertexColors) {
        refs.baseMaterial.vertexColors = true;
        refs.baseMaterial.needsUpdate = true;
      }
      const geom = refs.globeMesh?.geometry;
      const posAttr = geom?.attributes.position;
      if (posAttr) {
        let colorAttr = geom.getAttribute("color");
        if (!colorAttr || colorAttr.count !== posAttr.count) {
          colorAttr = new THREE.BufferAttribute(new Float32Array(posAttr.count * 3), 3);
          geom.setAttribute("color", colorAttr);
        }
        const from = new THREE.Color(userSurfaceGradient.from);
        const to = new THREE.Color(userSurfaceGradient.to);
        const tmp = new THREE.Color();
        for (let i = 0; i < posAttr.count; i++) {
          const y = posAttr.getY(i);
          const t = (y / GLOBE_RADIUS + 1) * 0.5;
          tmp.copy(from).lerp(to, Math.max(0, Math.min(1, t)));
          colorAttr.setXYZ(i, tmp.r, tmp.g, tmp.b);
        }
        colorAttr.needsUpdate = true;
      }
    } else {
      refs.baseMaterial.color.copy(
        solidActive ? new THREE.Color(solidSphereColor) : new THREE.Color(userSurfaceColor),
      );
      if (refs.baseMaterial.vertexColors) {
        refs.baseMaterial.vertexColors = false;
        refs.baseMaterial.needsUpdate = true;
      }
    }
    refs.baseMaterial.metalness = solidActive ? 0 : isBorderless ? 0.22 : 0.12;
    refs.baseMaterial.roughness = solidActive ? 0.92 : isBorderless ? 0.46 : 0.78;
    refs.baseOpacity = solidActive ? 1 : isBorderless ? (transparent ? 0.18 : 0.34) : (transparent ? 0.2 : 0.3);
    refs.atmosphereMaterial.uniforms.glowColor.value.copy(glowColor);
    refs.atmosphereIntensity = isBorderless ? 0.52 + intensity * 0.3 : 0.32 + intensity * 0.24;
    refs.graticuleOpacity = isBorderless ? 0.035 + intensity * 0.045 : 0.08 + intensity * 0.08;
    // Grid color is now user-controlled via globeSettings.gridColor +
    // gridGradient (see createGraticule). The theme-driven override
    // that used to live here would stomp the user's color pick on
    // every dependent change, making the swatch feel broken. If the
    // user wants the historical cyan tint for borderless mode, the
    // borderlessPreset seeds gridColor to "#7bdcff".
    applyGlobeShellProgress(refs, morphRef.current.progress, globeSettingsRef.current);
  }, [background, dotColor, globeSettings, renderMode, shaderSettings.intensity, transparent, uiTheme]);

  return (
    <div
      id="globe-canvas"
      ref={mountRef}
      className={`globe-background look-${globeSettings?.look ?? "classic"} effect-${shaderSettings.effect || "none"} ${
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
      onKeyDown={handleGlobeKey}
    >
      {import.meta.env.DEV ? <PerfMonitor metricsRef={perfMetricsRef} /> : null}
    </div>
  );
};
