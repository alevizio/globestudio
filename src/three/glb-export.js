import * as THREE from "three";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";

// The design as a GLB file: what the scene draws as geometry, in flat
// colors. components/globe-background.jsx loads this module on the first
// GLB export, so GLTFExporter stays out of the first load.
//
// The shader looks, post effects, the glow and everything that moves have
// no place in a GLB and stay out. The parts come out in the globe's own
// frame (Y up, the flat map facing +Z), without the view's spin, tilt or
// pan.

// The canvas shows each working-space color as is: there is no sRGB encode
// at the end of the effect chain (utils/color-space.js). A glTF viewer
// encodes, so each color goes in as the sRGB color the canvas shows.
const shownColor = (color) => new THREE.Color().setRGB(color.r, color.g, color.b, THREE.SRGBColorSpace);

// The same for a texture: the GPU decodes its sRGB pixels and the canvas
// shows the decoded values, so those become the pixels.
const SHOWN_BYTES = Array.from({ length: 256 }, (_, byte) => Math.round(255 * shownColor({ r: byte / 255, g: 0, b: 0 }).r));
const shownTexture = (texture) => {
  const canvas = document.createElement("canvas");
  canvas.width = texture.image.width;
  canvas.height = texture.image.height;
  const context = canvas.getContext("2d");
  context.drawImage(texture.image, 0, 0);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < pixels.data.length; i += 1) {
    if (i % 4 !== 3) pixels.data[i] = SHOWN_BYTES[pixels.data[i]];
  }
  context.putImageData(pixels, 0, 0);
  const shown = new THREE.CanvasTexture(canvas);
  shown.colorSpace = THREE.SRGBColorSpace;
  return shown;
};

// Unlit, like every material the scene draws these parts with
// (KHR_materials_unlit), at the part's own opacity: the globe body comes out
// see-through at its Surface opacity (alphaMode BLEND), opaque at 100.
// ASCII glyphs and custom shapes are cut from their texture at the scene's
// own cutoff (alphaMode MASK). The Solid style's land has no cutoff: it
// blends at the texture's alpha, as on the canvas, so a land color under
// 50% alpha stays (alphaMode BLEND).
const flatMaterial = (source) =>
  new THREE.MeshBasicMaterial({
    color: shownColor(source.color),
    opacity: source.opacity,
    transparent: source.opacity < 1 || Boolean(source.map && !source.alphaTest),
    map: source.map ? shownTexture(source.map) : null,
    alphaTest: source.map ? source.alphaTest : 0,
    side: source.side,
    vertexColors: source.vertexColors,
  });

const flatGeometry = (source, material) => {
  const geometry = new THREE.BufferGeometry();
  geometry.setIndex(source.index);
  geometry.setAttribute("position", source.getAttribute("position"));
  if (material.map) geometry.setAttribute("uv", source.getAttribute("uv"));
  if (material.vertexColors) {
    const colors = source.getAttribute("color").clone();
    const color = new THREE.Color();
    for (let i = 0; i < colors.count; i += 1) {
      const shown = shownColor(color.fromBufferAttribute(colors, i));
      colors.setXYZ(i, shown.r, shown.g, shown.b);
    }
    geometry.setAttribute("color", colors);
  }
  return geometry;
};

// Every dot in one mesh, each placed by its own copy of its layer's shape.
// A layer (the clicked dots, or one character of an ASCII symbol) keeps its
// own material as a primitive of its own. A layer without per-dot colors
// gets white ones, which leave its material's color as it is.
const mergeDots = (layers) => {
  const shapes = layers.map(({ geometry, matrices }) => ({
    position: geometry.getAttribute("position"),
    uv: geometry.getAttribute("uv"),
    index: geometry.index?.array ?? Array.from({ length: geometry.getAttribute("position").count }, (_, i) => i),
    dots: matrices.length,
  }));
  const total = shapes.reduce((sum, { position, dots }) => sum + dots * position.count, 0);
  const positions = new Float32Array(total * 3);
  const indices = new (total > 65535 ? Uint32Array : Uint16Array)(shapes.reduce((sum, { index, dots }) => sum + dots * index.length, 0));
  const uvs = shapes.some(({ uv }) => uv) ? new Float32Array(total * 2) : null;
  const vertexColors = layers.some(({ colors }) => colors) ? new Float32Array(total * 3).fill(1) : null;
  const merged = new THREE.BufferGeometry();
  const vertex = new THREE.Vector3();
  let first = 0;
  let start = 0;
  layers.forEach(({ matrices, colors }, layer) => {
    const { position, uv, index } = shapes[layer];
    const groupStart = start;
    matrices.forEach((matrix, dot) => {
      for (let v = 0; v < position.count; v += 1) {
        vertex.fromBufferAttribute(position, v).applyMatrix4(matrix).toArray(positions, (first + v) * 3);
        if (uv) uvs.set([uv.getX(v), uv.getY(v)], (first + v) * 2);
        if (colors) colors[dot].toArray(vertexColors, (first + v) * 3);
      }
      for (let k = 0; k < index.length; k += 1) indices[start + k] = index[k] + first;
      first += position.count;
      start += index.length;
    });
    merged.addGroup(groupStart, start - groupStart, layer);
  });
  merged.setIndex(new THREE.BufferAttribute(indices, 1));
  merged.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  if (uvs) merged.setAttribute("uv", new THREE.BufferAttribute(uvs, 2));
  if (vertexColors) merged.setAttribute("color", new THREE.BufferAttribute(vertexColors, 3));
  const materials = layers.map(({ material }) => material);
  for (const material of materials) material.vertexColors = Boolean(vertexColors);
  return new THREE.Mesh(merged, materials.length > 1 ? materials : materials[0]);
};

// A dot mesh of three/globe.js: its shape, material, and each dot's matrix
// and color.
const dotLayer = (mesh, sizeVary) => {
  const material = flatMaterial(mesh.material);
  const geometry = flatGeometry(mesh.geometry, material);
  const phases = mesh.geometry.getAttribute("aPhase");
  const matrices = [];
  const colors = mesh.instanceColor ? [] : null;
  for (let i = 0; i < mesh.count; i += 1) {
    const matrix = new THREE.Matrix4();
    mesh.getMatrixAt(i, matrix);
    // The vertex shader draws Vary size (wireTwinkleMaterial in globe.js),
    // so it goes into each dot's scale here.
    if (sizeVary) matrix.scale(new THREE.Vector3().setScalar(0.82 + 0.36 * phases.getX(i)));
    matrices.push(matrix);
    colors?.push(shownColor(mesh.getColorAt(i, new THREE.Color())));
  }
  return { material, geometry, matrices, colors };
};

// A dot layer as GPU instances. GLTFExporter marks EXT_mesh_gpu_instancing
// required, as the extension asks, since a viewer without it would draw
// one dot. Apple Preview does all the same.
const instancedDots = ({ material, geometry, matrices, colors }) => {
  const dots = new THREE.InstancedMesh(geometry, material, matrices.length);
  matrices.forEach((matrix, i) => dots.setMatrixAt(i, matrix));
  colors?.forEach((color, i) => dots.setColorAt(i, color));
  return dots;
};

// The network's pulse rings and the arcs' traveling heads only mean
// something in motion.
const moves = (object) => object.userData.role === "ring" || object.userData.role === "head" || Boolean(object.userData.routePoints);

// The glow's rings and decorative arcs (createBorderlessNetwork in
// globe.js) draw additively, which a GLB can't. Its atmosphere and halo
// are shaders, so they stay out already.
const glows = (object) => {
  for (let node = object; node; node = node.parent) if (node.userData.glow) return true;
  return false;
};

// globeGroup: the scene's globe group (components/globe-background.jsx).
// instanced: dots as GPU instances rather than one merged mesh.
// sizeVary: the design's Vary size.
export const buildGlbScene = (globeGroup, { instanced = false, sizeVary = false } = {}) => {
  const scene = new THREE.Scene();
  scene.name = "Globestudio";
  const dotLayers = [];
  globeGroup.updateMatrixWorld(true);
  globeGroup.traverseVisible((object) => {
    const { material } = object;
    if (!(object.isMesh || object.isLine) || material.isShaderMaterial || !material.colorWrite || moves(object) || glows(object)) return;
    // Placed within the globe group, which holds the view's spin and tilt.
    const matrix = object.matrix.clone();
    for (let parent = object.parent; parent !== globeGroup; parent = parent.parent) matrix.premultiply(parent.matrix);
    let part;
    if (object.isInstancedMesh) {
      // Only the dots themselves wear the twinkle hook. The other instanced
      // layers are the Bloom, CRT and Chromatic looks' halos.
      if (!material.userData.twinkleWired) return;
      const layer = dotLayer(object, sizeVary);
      if (!instanced) {
        for (const dot of layer.matrices) dot.premultiply(matrix);
        dotLayers.push(layer);
        return;
      }
      part = instancedDots(layer);
      part.name = "Dots";
    } else {
      const flat = flatMaterial(material);
      part = new (object.isLine ? THREE.Line : THREE.Mesh)(flatGeometry(object.geometry, flat), flat);
      part.name = object.name;
    }
    matrix.decompose(part.position, part.quaternion, part.scale);
    scene.add(part);
  });
  if (dotLayers.length) {
    const dots = mergeDots(dotLayers);
    dots.name = "Dots";
    scene.add(dots);
  }
  return scene;
};

// The GLB file's bytes.
export const exportGlb = (globeGroup, options) =>
  new GLTFExporter().parseAsync(buildGlbScene(globeGroup, options), { binary: true });
