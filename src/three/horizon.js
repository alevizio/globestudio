import * as THREE from "three";
import { GLOBE_RADIUS } from "../config/globe-settings.js";

// Lines that wrap round the globe, its grid and the network's arcs, draw in
// two halves cut at the globe's horizon as the camera sees it: the far half
// before the see-through sphere, so the body dims it the same way at every
// angle, and the near half after the sphere, over the body. Sorted by
// distance alone, a whole line drew before or after the sphere by where its
// middle was. A parallel's middle is on the globe's axis, so tilting the
// globe past level hid the far half of every northern parallel in one frame
// and showed the southern ones', and an arc flipped as the spin carried its
// middle past the sphere's.
//
// The cut is the plane through the horizon circle: with c the globe's
// centre in view space (the camera at the origin) and r its radius there, a
// point p is on the near side when dot(c - p, c) > r * r. For any point
// outside the sphere the cut is exact: a point on the near side is never
// behind the sphere, and one on the far side is either behind it, where the
// body dims it, or past its outline, where nothing covers it. The lines'
// own origin and scale are the globe's (they sit in the globe group with no
// transform of their own), so the shader reads c and r from the
// modelViewMatrix.
const HORIZON_VERTEX = `
varying float vHorizon;
void main() {
  vec3 horizonCentre = (modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
  vec3 horizonPoint = (modelViewMatrix * vec4(position, 1.0)).xyz;
  float horizonRadius = ${GLOBE_RADIUS.toFixed(4)} * length(modelViewMatrix[0].xyz);
  vHorizon = dot(horizonCentre - horizonPoint, horizonCentre) - horizonRadius * horizonRadius;
`;

const HORIZON_FRAGMENT = {
  near: `
varying float vHorizon;
void main() {
  if (vHorizon <= 0.0) discard;
`,
  far: `
varying float vHorizon;
void main() {
  if (vHorizon > 0.0) discard;
`,
};

// When each half draws: the far half before the sphere, the near half after
// it (and after the rim glows, which draw at 0 with the sphere).
export const HORIZON_ORDER = { far: -1, near: 1 };

// Keep only one half ("near" or "far") of what `material` draws. Works on
// the built-in materials and on a ShaderMaterial alike: both have one
// `void main() {` in each shader.
export const cutAtHorizon = (material, half) => {
  material.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace("void main() {", HORIZON_VERTEX);
    shader.fragmentShader = shader.fragmentShader.replace("void main() {", HORIZON_FRAGMENT[half]);
  };
  material.customProgramCacheKey = () => `horizon:${half}`;
  material.userData.horizon = half;
  return material;
};

// `line` (or a ring's mesh) draws its near half; a copy of it, added as its
// child, draws the far half. The copy shares the line's geometry and follows
// its color and opacity (and a ShaderMaterial's uniforms) as they change. A
// GLB export leaves the copy out (three/glb-export.js).
export const splitAtHorizon = (line) => {
  const { material } = line;
  const farMaterial = material.clone();
  // A fresh userData: a clone turns a Color kept there into a number.
  farMaterial.userData = {};
  if (material.uniforms) farMaterial.uniforms = material.uniforms;
  cutAtHorizon(farMaterial, "far");
  cutAtHorizon(material, "near");
  const Part = line.isMesh ? THREE.Mesh : line.isLineSegments ? THREE.LineSegments : THREE.Line;
  const far = new Part(line.geometry, farMaterial);
  far.userData.farHalf = true;
  far.renderOrder = HORIZON_ORDER.far;
  far.onBeforeRender = () => {
    farMaterial.opacity = material.opacity;
    if (material.color) farMaterial.color.copy(material.color);
  };
  line.renderOrder = HORIZON_ORDER.near;
  line.add(far);
  return line;
};
