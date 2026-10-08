import * as THREE from "three";
import { WebGLRenderList } from "three/src/renderers/webgl/WebGLRenderLists.js";
import { describe, expect, it } from "vitest";
import { DEFAULT_GLOBE_SETTINGS, GLOBE_CAMERA_DISTANCE, GLOBE_RADIUS } from "../config/globe-settings.js";
import { DEFAULT_SHADER_SETTINGS } from "../config/shader-effects.js";
import { createCountryMapData } from "../utils/dot-generation.js";
import { applyDotLayerMorph, buildGlobeDotLayer, createAtmosphereMaterial, createOuterHaloMaterial } from "./globe.js";

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
});
