import * as THREE from "three";
import { describe, expect, it } from "vitest";
import { DEFAULT_GLOBE_SETTINGS, GLOBE_CAMERA_DISTANCE, GLOBE_RADIUS } from "../config/globe-settings.js";
import { createGlobeNetwork, setNetworkColors, updateGlobeNetwork } from "./globe-network.js";
import { createGraticule, syncGraticule } from "./globe.js";
import { latLngToVector3 } from "./coordinates.js";
import { cutAtHorizon, HORIZON_ORDER, splitAtHorizon } from "./horizon.js";

// The shader's test (three/horizon.js) in view space, the camera at the
// origin: a point is on the near side when dot(c - p, c) > r * r.
const nearSide = (point, centre, radius) => centre.clone().sub(point).dot(centre) > radius * radius;

describe("the cut at the horizon", () => {
  // The lines sit at or above the sphere: the grid from its surface up to
  // full Grid lift, the arcs up to their highest bow. From the closest zoom
  // to the farthest, a point the cut puts on the near side is never behind
  // the sphere, and one it puts on the far side is behind the sphere or
  // past its outline, never in front of it.
  it.each([3.2, GLOBE_CAMERA_DISTANCE, 14])("splits every point outside the sphere exactly, the camera %f away", (distance) => {
    const centre = new THREE.Vector3(0, 0, -distance);
    const sphere = new THREE.Sphere(centre, GLOBE_RADIUS);
    const counts = { near: 0, far: 0 };
    const wrong = [];
    for (const height of [0.004, 0.05, 0.244, 0.7]) {
      for (let lat = -88; lat <= 88; lat += 4) {
        for (let lng = -180; lng < 180; lng += 4) {
          const point = latLngToVector3(lat, lng, GLOBE_RADIUS + height).add(centre);
          const ray = new THREE.Ray(new THREE.Vector3(), point.clone().normalize());
          const hit = ray.intersectSphere(sphere, new THREE.Vector3());
          const behind = hit !== null && hit.length() < point.length() - 1e-9;
          if (nearSide(point, centre, GLOBE_RADIUS)) {
            counts.near += 1;
            if (behind) wrong.push(`near but behind: ${lat}, ${lng} at ${height}`);
          } else {
            counts.far += 1;
            // In front of the sphere inside its outline: the ray meets the
            // sphere only past the point.
            if (hit !== null && !behind) wrong.push(`far but in front: ${lat}, ${lng} at ${height}`);
          }
        }
      }
    }
    expect(wrong).toEqual([]);
    expect(counts.near).toBeGreaterThan(0);
    expect(counts.far).toBeGreaterThan(0);
  });

  // three's own shaders for the lines (LineBasicMaterial draws with the
  // basic shader) and the arcs' trail shader both take the cut, and the two
  // halves compile apart.
  it("puts the cut into the lines' shaders, near and far halves apart", () => {
    const trail = createGlobeNetwork().userData.routeGroup.children[0].children.find((child) => child.userData.role === "trail");
    const sources = [
      { vertexShader: THREE.ShaderLib.basic.vertexShader, fragmentShader: THREE.ShaderLib.basic.fragmentShader },
      { vertexShader: trail.material.vertexShader, fragmentShader: trail.material.fragmentShader },
    ];
    for (const source of sources) {
      const compiled = {};
      for (const half of ["near", "far"]) {
        const material = cutAtHorizon(new THREE.LineBasicMaterial(), half);
        const shader = { ...source, uniforms: {} };
        material.onBeforeCompile(shader);
        compiled[half] = { shader, key: material.customProgramCacheKey() };
        expect(shader.vertexShader.match(/void main\(\) \{/g)).toHaveLength(1);
        expect(shader.vertexShader).toContain("vHorizon = dot(horizonCentre - horizonPoint, horizonCentre)");
        expect(shader.fragmentShader).toContain("varying float vHorizon;");
      }
      expect(compiled.near.shader.fragmentShader).toContain("if (vHorizon <= 0.0) discard;");
      expect(compiled.far.shader.fragmentShader).toContain("if (vHorizon > 0.0) discard;");
      expect(compiled.near.key).not.toBe(compiled.far.key);
    }
  });
});

describe("splitAtHorizon", () => {
  const route = () => {
    const root = createGlobeNetwork();
    root.userData.opacity = 1;
    root.userData.arcs = 100;
    root.userData.pulses = 0;
    const [first] = root.userData.routeGroup.children;
    const byRole = (role) => first.children.find((child) => child.userData.role === role);
    return { root, line: byRole("line"), trail: byRole("trail") };
  };

  it("draws the far half as a copy of the line, before the sphere, on the line's own geometry", () => {
    const { line } = route();
    const [far] = line.children;
    expect(far.userData.farHalf).toBe(true);
    expect(far.geometry).toBe(line.geometry);
    expect(far.renderOrder).toBe(HORIZON_ORDER.far);
    expect(line.renderOrder).toBe(HORIZON_ORDER.near);
    expect(far.material.userData.horizon).toBe("far");
    expect(line.material.userData.horizon).toBe("near");
  });

  // The network sets the arcs' opacity each frame and their colors when the
  // design picks them. The far half follows the line at each draw.
  it("keeps the far half in the line's color and opacity", () => {
    const { root, line, trail } = route();
    setNetworkColors(root, "#ff0066", null);
    updateGlobeNetwork(root, 1);
    const [far] = line.children;
    far.onBeforeRender();
    expect(far.material.opacity).toBe(line.material.opacity);
    expect(far.material.opacity).toBeGreaterThan(0);
    expect(far.material.color.equals(line.material.color)).toBe(true);
    // The trail's color and fade are uniforms, shared with its far half.
    expect(trail.children[0].material.uniforms).toBe(trail.material.uniforms);
    // Back to each arc's own color: the far half keeps a real color.
    setNetworkColors(root, null, null);
    far.onBeforeRender();
    expect(far.material.color.equals(line.material.color)).toBe(true);
    expect(far.material.color.toArray().every(Number.isFinite)).toBe(true);
  });

  it("copies a line whatever its kind", () => {
    const segments = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ transparent: true }));
    expect(splitAtHorizon(segments).children[0].isLineSegments).toBe(true);
  });
});

describe("createGraticule far half", () => {
  it("holds every segment of every line, with its colors", () => {
    const grid = createGraticule({ ...DEFAULT_GLOBE_SETTINGS, gridSize: 30, gridGradient: { from: "#ff0000", to: "#0000ff" } });
    const lines = grid.children.filter((line) => !line.userData.farHalf);
    const [far] = grid.children.filter((line) => line.userData.farHalf);
    expect(far.isLineSegments).toBe(true);
    expect(far.renderOrder).toBe(HORIZON_ORDER.far);
    const segments = lines.reduce((sum, line) => sum + line.geometry.getAttribute("position").count - 1, 0);
    expect(far.geometry.getAttribute("position").count).toBe(segments * 2);
    expect(far.geometry.getAttribute("color").count).toBe(segments * 2);
    // The first segment is the first line's first two points.
    const first = lines[0].geometry.getAttribute("position");
    const copied = far.geometry.getAttribute("position");
    expect([copied.getX(1), copied.getY(1), copied.getZ(1)]).toEqual([first.getX(1), first.getY(1), first.getZ(1)]);
    for (const line of lines) expect(line.renderOrder).toBe(HORIZON_ORDER.near);
  });

  it("starts both halves at the grid's opacity when the grid is rebuilt", () => {
    const globeGroup = new THREE.Group();
    const refs = { globeGroup, graticule: null };
    syncGraticule(refs, { ...DEFAULT_GLOBE_SETTINGS, grid: true, gridStrength: 64 });
    const materials = new Set(refs.graticule.children.map((line) => line.material));
    expect(materials.size).toBe(2);
    for (const material of materials) expect(material.opacity).toBe(0.64);
  });

  it("is empty with the grid off", () => {
    expect(createGraticule({ ...DEFAULT_GLOBE_SETTINGS, gridSize: 0 }).children).toEqual([]);
  });
});
