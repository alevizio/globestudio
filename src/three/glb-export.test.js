import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import validator from "gltf-validator";
import { describe, expect, it } from "vitest";
import { dotShapeOptions } from "../config/constants.js";
import { DEFAULT_GLOBE_SETTINGS, GLOBE_RADIUS } from "../config/globe-settings.js";
import { DEFAULT_SHADER_SETTINGS } from "../config/shader-effects.js";
import { createCountryMapData } from "../utils/dot-generation.js";
import { createGlobeDotGeometry } from "./geometry.js";
import { createGlobeNetwork, updateGlobeNetwork } from "./globe-network.js";
import { applyGlobeShellProgress, buildGlobeDotLayer, createAtmosphereMaterial, createGraticule } from "./globe.js";
import { exportGlb } from "./glb-export.js";

const world = createCountryMapData([], 30);
const chile = createCountryMapData(["CHL"], 40);

// The globe group the way components/globe-background.jsx assembles it,
// at the end of a morph to the globe (1) or the flat map (0).
const scene = ({ mapData = world, morph = 1, network = false, surfaceStrength = 30, ...dots } = {}) => {
  const globeGroup = new THREE.Group();
  const baseMaterial = new THREE.MeshBasicMaterial({ color: new THREE.Color("#18191d"), transparent: true });
  const globeMesh = new THREE.Mesh(new THREE.SphereGeometry(GLOBE_RADIUS, 96, 96), baseMaterial);
  globeMesh.name = "Globe";
  const atmosphereMaterial = createAtmosphereMaterial();
  const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(2.18, 16, 16), atmosphereMaterial);
  const graticule = createGraticule();
  const globeNetwork = createGlobeNetwork();
  globeGroup.add(globeMesh, atmosphere, graticule, globeNetwork);
  const refs = { globeGroup, baseMaterial, globeMesh, atmosphereMaterial, atmosphere, graticule, globeNetwork, atmosphereIntensity: 0.42 };
  const globeSettings = { ...DEFAULT_GLOBE_SETTINGS, network, surfaceStrength };
  applyGlobeShellProgress(refs, morph, globeSettings);
  updateGlobeNetwork(globeNetwork, 3);
  globeGroup.add(buildGlobeDotLayer({
    mapData,
    selectedDots: new Set(),
    dotColor: "#ffffff",
    dotSize: 10,
    shape: "Circle",
    shaderSettings: DEFAULT_SHADER_SETTINGS,
    globeSettings,
    morphProgress: morph,
    ...dots,
  }));
  // The view's spin and tilt, which the file leaves out.
  globeGroup.rotation.set(0.4, -1.2, 0);
  return globeGroup;
};

const parts = async (globeGroup, options) => {
  const glb = await exportGlb(globeGroup, options);
  const { issues } = await validator.validateBytes(new Uint8Array(glb));
  expect(issues.numErrors).toBe(0);
  expect(issues.numWarnings).toBe(0);
  const gltf = await new GLTFLoader().parseAsync(glb, "");
  const byName = (name) => gltf.scene.children.filter((child) => child.name === name);
  return { glb, gltf, byName, json: gltf.parser.json };
};

const dotPositions = (dots) =>
  Array.from({ length: dots.count }, (_, i) => {
    const matrix = new THREE.Matrix4();
    dots.getMatrixAt(i, matrix);
    return new THREE.Vector3().setFromMatrixPosition(matrix);
  });

describe("exportGlb", () => {
  it("writes a GLB with every dot of the map once, as GPU instances a viewer must support", async () => {
    const { glb, byName, json } = await parts(scene(), { instanced: true });
    const view = new DataView(glb);
    expect(view.getUint32(0, true)).toBe(0x46546c67); // "glTF"
    expect(view.getUint32(4, true)).toBe(2);
    expect(view.getUint32(16, true)).toBe(0x4e4f534a); // "JSON"
    const [dots] = byName("Dots");
    expect(dots.isInstancedMesh).toBe(true);
    expect(dots.count).toBe(world.points.length);
    expect(json.extensionsRequired).toEqual(["EXT_mesh_gpu_instancing"]);
  });

  it("merges the dots into one mesh that needs no extension, unless asked for instances", async () => {
    const { byName, json } = await parts(scene());
    const [dots] = byName("Dots");
    expect(dots.isInstancedMesh).toBeFalsy();
    const circle = createGlobeDotGeometry("Circle").getAttribute("position").count;
    expect(dots.geometry.getAttribute("position").count).toBe(world.points.length * circle);
    expect(json.extensionsRequired).toBeUndefined();
  });

  it("puts the dots on the globe, in its own frame and not the view's", async () => {
    const { byName } = await parts(scene(), { instanced: true });
    const radii = dotPositions(byName("Dots")[0]).map((position) => position.length());
    // The default dot lift raises them 0.018 off the surface.
    for (const radius of radii) expect(radius).toBeCloseTo(GLOBE_RADIUS + 0.018, 4);
    const [dots] = byName("Dots");
    expect(dots.position.length()).toBe(0);
    expect(dots.quaternion.equals(new THREE.Quaternion())).toBe(true);
  });

  it("lays a flat map's dots on a plane facing +Z, with no globe body or grid", async () => {
    const { byName, gltf } = await parts(scene({ mapData: chile, morph: 0 }), { instanced: true });
    const [dots] = byName("Dots");
    expect(dots.count).toBe(chile.points.length);
    const positions = dotPositions(dots);
    for (const position of positions) expect(position.z).toBeCloseTo(positions[0].z, 6);
    // Chile is tall and thin.
    const box = new THREE.Box3().setFromPoints(positions);
    expect(box.max.y - box.min.y).toBeGreaterThan(5 * (box.max.x - box.min.x));
    expect(byName("Globe")).toEqual([]);
    expect(gltf.scene.children.filter((child) => child.isLine)).toEqual([]);
  });

  // ASCII here is its default "*", a mesh of its own. Glyphs and custom
  // shapes are cut from textures, which need a 2D canvas that jsdom lacks:
  // tests/e2e/glb-export.spec.js exports those.
  it("keeps each dot shape's own geometry, so a circle stays a circle", async () => {
    for (const shape of dotShapeOptions.filter((name) => name !== "Custom")) {
      const { byName } = await parts(scene({ shape }), { instanced: true });
      const exported = byName("Dots")[0].geometry.getAttribute("position");
      const source = createGlobeDotGeometry(shape).getAttribute("position");
      expect(Array.from(exported.array), shape).toEqual(Array.from(source.array));
    }
  });

  it("paints the dots the color the canvas shows, unlit", async () => {
    const color = "#ff0066";
    const { json } = await parts(scene({ dotColor: color, hexColors: true }));
    const dots = json.materials[json.meshes[json.nodes.find((node) => node.name === "Dots").mesh].primitives[0].material];
    const expected = new THREE.Color(color).toArray();
    dots.pbrMetallicRoughness.baseColorFactor.slice(0, 3).forEach((value, i) => expect(value).toBeCloseTo(expected[i], 5));
    expect(dots.extensions.KHR_materials_unlit).toEqual({});
  });

  it("gives gradient dots a color each, instanced or merged", async () => {
    const dotGradient = { from: "#ff0000", to: "#0000ff", angle: 90 };
    const instanced = (await parts(scene({ dotGradient }), { instanced: true })).byName("Dots")[0];
    expect(instanced.instanceColor.count).toBe(world.points.length);
    const merged = (await parts(scene({ dotGradient }))).byName("Dots")[0];
    expect(merged.geometry.getAttribute("color").count).toBe(merged.geometry.getAttribute("position").count);
    const reds = Array.from({ length: instanced.count }, (_, i) => instanced.getColorAt(i, new THREE.Color()).r);
    expect(Math.max(...reds) - Math.min(...reds)).toBeGreaterThan(0.5);
  });

  it("bakes Vary size into each dot's scale", async () => {
    const scales = (dots) => dotPositions(dots).map((_, i) => {
      const matrix = new THREE.Matrix4();
      dots.getMatrixAt(i, matrix);
      return new THREE.Vector3().setFromMatrixScale(matrix).x;
    });
    const plain = scales((await parts(scene(), { instanced: true })).byName("Dots")[0]);
    const varied = scales((await parts(scene(), { instanced: true, sizeVary: true })).byName("Dots")[0]);
    expect(Math.max(...plain) - Math.min(...plain)).toBeCloseTo(0, 6);
    expect(Math.max(...varied) / Math.min(...varied)).toBeGreaterThan(1.3);
  });

  it("draws the globe body see-through at its Surface opacity, and opaque at 100", async () => {
    const material = (json, name) => json.materials[json.meshes[json.nodes.find((node) => node.name === name).mesh].primitives[0].material];
    // The default Surface opacity is 30.
    const body = material((await parts(scene())).json, "Globe");
    expect(body.alphaMode).toBe("BLEND");
    expect(body.pbrMetallicRoughness.baseColorFactor[3]).toBeCloseTo(0.3, 5);
    // The dots stay opaque, so no viewer sorts them behind the body.
    expect(material((await parts(scene())).json, "Dots").alphaMode).toBeUndefined();
    const opaque = material((await parts(scene({ surfaceStrength: 100 }))).json, "Globe");
    expect(opaque.alphaMode).toBeUndefined();
  });

  it("leaves out the glow, look halos and moving network parts", async () => {
    const globeGroup = scene({ network: true, shaderSettings: { ...DEFAULT_SHADER_SETTINGS, effect: "bloom" } });
    const { byName, gltf, json } = await parts(globeGroup);
    // One dot mesh: Bloom's halo layer stays out.
    expect(byName("Dots")).toHaveLength(1);
    expect(json.materials.every((material) => material.extensions?.KHR_materials_unlit)).toBe(true);
    // The grid, plus the network's arcs and hub cities; not its rings, heads
    // or trails.
    const network = globeGroup.children.find((child) => child.userData.routeGroup);
    const arcs = network.userData.routeGroup.children.filter((route) => route.visible).length;
    const hubs = network.userData.cityGroup.children.filter((city) => city.visible).length;
    const graticuleLines = globeGroup.children.find((child) => child.userData.gridSignature).children.length;
    expect(gltf.scene.children.filter((child) => child.isLine)).toHaveLength(graticuleLines + arcs);
    expect(gltf.scene.children.filter((child) => child.isMesh && !["Globe", "Dots"].includes(child.name))).toHaveLength(hubs);
  });
});
