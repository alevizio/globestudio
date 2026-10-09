import * as THREE from "three";
import { WebGLRenderList } from "three/src/renderers/webgl/WebGLRenderLists.js";
import { describe, expect, it } from "vitest";
import { DEFAULT_GLOBE_SETTINGS, GLOBE_CAMERA_DISTANCE, GLOBE_RADIUS } from "../config/globe-settings.js";
import { DEFAULT_SHADER_SETTINGS } from "../config/shader-effects.js";
import { createCountryMapData } from "../utils/dot-generation.js";
import { latLngToImagePoint } from "../utils/projection.js";
import { latLngToVector3 } from "./coordinates.js";
import { createGlobeDotGeometry } from "./geometry.js";
import {
  applyDotLayerMorph,
  buildGlobeDotLayer,
  createAtmosphereMaterial,
  createOuterHaloMaterial,
  northUpQuaternion,
} from "./globe.js";

const world = createCountryMapData([], 30);

// The globe group the way components/globe-background.jsx assembles it: the
// see-through sphere (Surface 30), the rim glows and a dot layer, seen by
// the studio's camera.
const globeScene = (dots) => {
  const globeGroup = new THREE.Group();
  const globeMesh = new THREE.Mesh(
    new THREE.SphereGeometry(GLOBE_RADIUS, 96, 96),
    new THREE.MeshBasicMaterial({ color: new THREE.Color("#18191d"), transparent: true, opacity: 0.3 }),
  );
  const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(2.18, 16, 16), createAtmosphereMaterial());
  const outerHalo = new THREE.Mesh(new THREE.SphereGeometry(2.55, 16, 16), createOuterHaloMaterial());
  const dotLayer = buildGlobeDotLayer({
    mapData: world,
    selectedDots: new Set(),
    dotColor: "#ffffff",
    dotSize: 10,
    shape: "Circle",
    shaderSettings: DEFAULT_SHADER_SETTINGS,
    globeSettings: DEFAULT_GLOBE_SETTINGS,
    ...dots,
  });
  globeGroup.add(globeMesh, atmosphere, outerHalo, dotLayer);
  const scene = new THREE.Scene();
  scene.add(globeGroup);
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  camera.position.set(0, 0, GLOBE_CAMERA_DISTANCE);
  camera.updateMatrixWorld(true);
  return { scene, camera, globeGroup, sphereParts: [globeMesh, atmosphere, outerHalo], dotLayer };
};

// The order three's WebGLRenderer draws a scene's transparent objects in.
// Its projectObject hands the render list the nearest group's renderOrder,
// the object's own renderOrder and the clip-space depth of its bounding
// sphere's centre (an InstancedMesh's own sphere, around its instances);
// three's own render list sorts them.
const transparentDrawOrder = (scene, camera) => {
  scene.updateMatrixWorld(true);
  const toClip = new THREE.Matrix4().multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse);
  const point = new THREE.Vector4();
  const list = new WebGLRenderList();
  list.init();
  const project = (object, groupOrder) => {
    if (!object.visible) return;
    const order = object.isGroup ? object.renderOrder : groupOrder;
    if (object.isMesh && object.material.transparent) {
      if (object.isInstancedMesh && object.boundingSphere === null) object.computeBoundingSphere();
      if (!object.isInstancedMesh && object.geometry.boundingSphere === null) object.geometry.computeBoundingSphere();
      const { center } = object.isInstancedMesh ? object.boundingSphere : object.geometry.boundingSphere;
      point.set(center.x, center.y, center.z, 1).applyMatrix4(object.matrixWorld).applyMatrix4(toClip);
      list.push(object, object.geometry, object.material, order, point.z, null);
    }
    object.children.forEach((child) => project(child, order));
  };
  project(scene, 0);
  list.sort();
  return list.transparent.map(({ object }) => object);
};

// Every north-south tilt the drag allows (about ±68 degrees) in half-degree
// steps, at every 15 degrees of spin.
const eachAngle = (callback) => {
  for (let tilt = -68; tilt <= 68; tilt += 0.5) {
    for (let spin = 0; spin < 360; spin += 15) callback(tilt, spin);
  }
};

describe("buildGlobeDotLayer draw order", () => {
  // Voxel boxes and Particle Grid spheres show their far side, and ASCII
  // glyphs are double-sided, so the far side's land shows through the
  // sphere only while the dots draw first. Sorted by distance, the layer's
  // sort point sat north of the globe's centre, so near level a half-degree
  // tilt drew the sphere first and its depth hid all of that land.
  it.each([
    ["Voxel", {}],
    ["Particle Grid", {}],
    ["ASCII", { asciiSymbol: "x" }],
  ])("draws %s dots before the see-through sphere at every tilt and spin", (shape, dots) => {
    const { scene, camera, globeGroup, sphereParts, dotLayer } = globeScene({ shape, ...dots });
    const hidden = [];
    eachAngle((tilt, spin) => {
      globeGroup.rotation.set(THREE.MathUtils.degToRad(tilt), THREE.MathUtils.degToRad(spin), 0);
      const order = transparentDrawOrder(scene, camera);
      const firstSpherePart = Math.min(...sphereParts.map((part) => order.indexOf(part)));
      const lastDots = Math.max(...dotLayer.children.map((mesh) => order.indexOf(mesh)));
      if (lastDots > firstSpherePart) hidden.push(`tilt ${tilt} spin ${spin}`);
    });
    expect(hidden).toEqual([]);
  });

  // The glow (CRT) and colour-split (Vapor) layers add light under the
  // dots at the default tilt. Sorted by distance they flipped over the dots
  // at the same angle as the sphere and brightened the land in one frame.
  it.each([
    ["CRT glow", { shape: "ASCII", asciiSymbol: "█", shaderSettings: { ...DEFAULT_SHADER_SETTINGS, effect: "crt" } }],
    ["colour split", { shape: "Diamond", shaderSettings: { ...DEFAULT_SHADER_SETTINGS, effect: "chromatic" } }],
  ])("keeps the %s layers under the dots at every tilt and spin", (name, dots) => {
    const { scene, camera, globeGroup, dotLayer } = globeScene(dots);
    const glow = dotLayer.children.filter((mesh) => mesh.material.blending === THREE.AdditiveBlending);
    const land = dotLayer.children.filter((mesh) => mesh.material.blending !== THREE.AdditiveBlending);
    expect(glow.length).toBeGreaterThan(0);
    expect(land.length).toBeGreaterThan(0);
    const over = [];
    eachAngle((tilt, spin) => {
      globeGroup.rotation.set(THREE.MathUtils.degToRad(tilt), THREE.MathUtils.degToRad(spin), 0);
      const order = transparentDrawOrder(scene, camera);
      const lastGlow = Math.max(...glow.map((mesh) => order.indexOf(mesh)));
      const firstLand = Math.min(...land.map((mesh) => order.indexOf(mesh)));
      if (lastGlow > firstLand) over.push(`tilt ${tilt} spin ${spin}`);
    });
    expect(over).toEqual([]);
  });

  // On the flat map those layers draw over the dots, as they always have
  // there (CRT's white phosphor, Vapor's white and cyan), and the order
  // follows the morph between the two views.
  it.each([
    ["CRT glow", { shape: "ASCII", asciiSymbol: "█", shaderSettings: { ...DEFAULT_SHADER_SETTINGS, effect: "crt" } }],
    ["colour split", { shape: "Diamond", shaderSettings: { ...DEFAULT_SHADER_SETTINGS, effect: "chromatic" } }],
  ])("draws the %s layers over the dots on the flat map", (name, dots) => {
    const lightOverDots = ({ scene, camera, dotLayer }) => {
      const order = transparentDrawOrder(scene, camera);
      const glow = dotLayer.children.filter((mesh) => mesh.material.blending === THREE.AdditiveBlending);
      const land = dotLayer.children.filter((mesh) => mesh.material.blending !== THREE.AdditiveBlending);
      return Math.min(...glow.map((mesh) => order.indexOf(mesh))) > Math.max(...land.map((mesh) => order.indexOf(mesh)));
    };
    expect(lightOverDots(globeScene({ ...dots, morphProgress: 0 }))).toBe(true);
    const morphed = globeScene(dots);
    expect(lightOverDots(morphed)).toBe(false);
    applyDotLayerMorph(morphed.dotLayer, 0);
    expect(lightOverDots(morphed)).toBe(true);
    applyDotLayerMorph(morphed.dotLayer, 1);
    expect(lightOverDots(morphed)).toBe(false);
  });

  it("keeps flat shapes facing outward, so the looks that hide the far side still cull it", () => {
    for (const shape of ["Circle", "Square", "Triangle", "Star", "Diamond", "Ring"]) {
      const { dotLayer } = globeScene({ shape });
      for (const mesh of dotLayer.children) expect(mesh.material.side).toBe(THREE.FrontSide);
    }
  });

  // CRT's and Pencil's glyphs: drawn before the sphere, they write depth so
  // the sphere leaves the near side's glyphs undimmed and they still show at
  // Surface 100. The alpha test keeps a glyph's empty corners from hiding
  // what is behind them, and the far side's glyphs still show through.
  it.each([
    ["ASCII", { asciiSymbol: "x" }],
    ["ASCII", { asciiSymbol: "█x" }],
    ["Custom", { customShapeTexture: new THREE.Texture() }],
  ])("draws %s glyphs solid: they write depth, cut at their alpha test, both sides", (shape, dots) => {
    const { dotLayer } = globeScene({ shape, ...dots });
    const glyphs = dotLayer.children.filter((mesh) => mesh.material.customProgramCacheKey() === "twinkle:ascii");
    expect(glyphs.length).toBeGreaterThan(0);
    for (const { material } of glyphs) {
      expect(material.depthWrite).toBe(true);
      expect(material.alphaTest).toBeGreaterThan(0);
      expect(material.transparent).toBe(true);
      expect(material.side).toBe(THREE.DoubleSide);
    }
  });
});

describe("buildGlobeDotLayer dot turn", () => {
  const layer = (dots) =>
    buildGlobeDotLayer({
      mapData: world,
      selectedDots: new Set(),
      dotColor: "#ffffff",
      dotSize: 10,
      shape: "Triangle",
      shaderSettings: DEFAULT_SHADER_SETTINGS,
      globeSettings: DEFAULT_GLOBE_SETTINGS,
      ...dots,
    }).children[0];
  // Instance matrices are 32-bit floats.
  const DEGREES = 1e-3;
  const poseOf = (mesh, index) => {
    const matrix = new THREE.Matrix4();
    mesh.getMatrixAt(index, matrix);
    const position = new THREE.Vector3();
    const quaternion = new THREE.Quaternion();
    matrix.decompose(position, quaternion, new THREE.Vector3());
    return { position, quaternion };
  };
  // The triangle's tip: its vertex furthest along local +X.
  const triangle = createGlobeDotGeometry("Triangle").getAttribute("position");
  const tip = new THREE.Vector3();
  for (let i = 0; i < triangle.count; i += 1) {
    if (triangle.getX(i) > tip.x) tip.fromBufferAttribute(triangle, i);
  }
  // Degrees clockwise from north. On the flat map north is up the screen
  // (+Y) and east is right (+X); on the globe they are read off the
  // sphere's own latitude and longitude lines.
  const flatBearing = (vector) => THREE.MathUtils.radToDeg(Math.atan2(vector.x, vector.y));
  const globeBearing = (vector, { lat, lng }) => {
    const step = 1e-4;
    const north = latLngToVector3(lat + step, lng, 1).sub(latLngToVector3(lat - step, lng, 1)).normalize();
    const east = latLngToVector3(lat, lng + step, 1).sub(latLngToVector3(lat, lng - step, 1)).normalize();
    return THREE.MathUtils.radToDeg(Math.atan2(vector.dot(east), vector.dot(north)));
  };
  const places = [];
  for (const lat of [-80, -45, 0, 30, 70, 89]) {
    for (const lng of [-170, -90, -30, 0, 20, 80, 150]) places.push({ lat, lng });
  }
  const placesMap = {
    image: world.image,
    points: places.map(({ lat, lng }, index) => ({ id: `p${index}`, lat, lng, ...latLngToImagePoint(lat, lng, world.image) })),
  };

  // The globe turned each shape by the shortest arc from +Y to the
  // sphere's normal, a degree per degree of longitude, so a triangle
  // pointed up over the Americas and sideways over Africa.
  it.each([0, 25])("points a triangle's tip where the flat map points it at every latitude and longitude (Rotation %i)", (dotRotation) => {
    const flat = layer({ mapData: placesMap, dotRotation, morphProgress: 0 });
    const globe = layer({ mapData: placesMap, dotRotation });
    const wrong = [];
    places.forEach((place, index) => {
      const flatTip = flatBearing(tip.clone().applyQuaternion(poseOf(flat, index).quaternion));
      const { position, quaternion } = poseOf(globe, index);
      const globeTip = globeBearing(tip.clone().applyQuaternion(quaternion), place);
      const outward = new THREE.Vector3(0, 1, 0).applyQuaternion(quaternion).dot(position.normalize());
      if (Math.abs(globeTip - flatTip) > DEGREES || Math.abs(outward - 1) > 1e-6) {
        wrong.push(`${place.lat},${place.lng}: tip ${globeTip.toFixed(2)} vs ${flatTip.toFixed(2)}, outward ${outward}`);
      }
    });
    expect(wrong).toEqual([]);
    // The tip of the flat map's triangle points east, less the Rotation.
    expect(Math.abs(flatBearing(tip.clone().applyQuaternion(poseOf(flat, 0).quaternion)) - (90 - dotRotation))).toBeLessThan(DEGREES);
  });

  it("points every dot the world shows on the globe the same way", () => {
    const mesh = layer();
    // The flat map's own dots are scaled to nothing on the globe.
    const bearings = mesh.userData.points
      .map((point, index) => (point.view === "flat" ? null : globeBearing(tip.clone().applyQuaternion(poseOf(mesh, index).quaternion), point)))
      .filter((bearing) => bearing !== null);
    expect(bearings.length).toBeGreaterThan(500);
    expect(Math.abs(Math.min(...bearings) - 90)).toBeLessThan(DEGREES);
    expect(Math.abs(Math.max(...bearings) - 90)).toBeLessThan(DEGREES);
  });

  it("keeps a dot's turn defined at the poles, along its meridian over the top", () => {
    for (const [pole, near] of [[90, 89.9999], [-90, -89.9999]]) {
      for (const lng of [-150, 0, 45, 180]) {
        const atPole = northUpQuaternion(pole, lng);
        expect([atPole.x, atPole.y, atPole.z, atPole.w].every(Number.isFinite)).toBe(true);
        expect(atPole.angleTo(northUpQuaternion(near, lng))).toBeLessThan(1e-5);
        expect(new THREE.Vector3(0, 1, 0).applyQuaternion(atPole).y).toBeCloseTo(Math.sign(pole), 9);
      }
    }
  });
});

describe("buildGlobeDotLayer dot grid", () => {
  const layer = (shape) =>
    buildGlobeDotLayer({
      mapData: world,
      selectedDots: new Set(),
      dotColor: "#ffffff",
      dotSize: 10,
      shape,
      shaderSettings: DEFAULT_SHADER_SETTINGS,
      globeSettings: DEFAULT_GLOBE_SETTINGS,
    }).children[0];

  it("keeps the flat map's grid for squares, dot for dot", () => {
    const mesh = layer("Square");
    expect(mesh.userData.pointIds).toEqual(world.points.map((point) => point.id));
    expect(mesh.count).toBe(world.points.length);
    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const off = [];
    world.points.forEach((point, index) => {
      mesh.getMatrixAt(index, matrix);
      position.setFromMatrixPosition(matrix).normalize();
      if (position.distanceTo(latLngToVector3(point.lat, point.lng, 1)) > 1e-6) off.push(point.id);
    });
    expect(off).toEqual([]);
  });

  it("spaces every other shape's dots evenly on the sphere", () => {
    for (const shape of ["Circle", "Triangle", "Star"]) {
      expect(layer(shape).userData.pointIds, shape).toEqual(world.globePoints.map((point) => point.id));
    }
  });
});
