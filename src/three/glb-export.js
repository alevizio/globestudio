import * as THREE from "three";
import { GLTFExporter } from "three/addons/exporters/GLTFExporter.js";
import { mergeVertices } from "three/addons/utils/BufferGeometryUtils.js";

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
const shownCanvas = (image) => {
  const canvas = document.createElement("canvas");
  canvas.width = image.width;
  canvas.height = image.height;
  const context = canvas.getContext("2d");
  context.drawImage(image, 0, 0);
  const pixels = context.getImageData(0, 0, canvas.width, canvas.height);
  for (let i = 0; i < pixels.data.length; i += 1) {
    if (i % 4 !== 3) pixels.data[i] = SHOWN_BYTES[pixels.data[i]];
  }
  context.putImageData(pixels, 0, 0);
  return canvas;
};
const shownTexture = (texture) => {
  const shown = new THREE.CanvasTexture(shownCanvas(texture.image));
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
//
// Particle Grid's shape comes unindexed: 1,512 vertices, one per triangle
// corner, for 270 points. Indexed first, each dot it copies has 270
// vertices for the same triangles.
const mergeDots = (layers) => {
  const shapes = layers.map(({ geometry, matrices }) => {
    const shape = geometry.index ? geometry : mergeVertices(geometry);
    return { position: shape.getAttribute("position"), uv: shape.getAttribute("uv"), index: shape.index.array, dots: matrices.length };
  });
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

// The dots a mesh of three/globe.js shows. The flat map and the globe each
// have dots of their own, and the other view's dots sit in the same mesh
// scaled to nothing.
const shownDots = (mesh) => mesh.userData.shownCount ?? mesh.count;

// A dot mesh of three/globe.js: its shape, material, and each shown dot's
// matrix and color.
const dotLayer = (mesh, sizeVary) => {
  const material = flatMaterial(mesh.material);
  const geometry = flatGeometry(mesh.geometry, material);
  const phases = mesh.geometry.getAttribute("aPhase");
  const matrices = [];
  const colors = mesh.instanceColor ? [] : null;
  for (let i = 0; i < mesh.count; i += 1) {
    const matrix = new THREE.Matrix4();
    mesh.getMatrixAt(i, matrix);
    if (matrix.determinant() === 0) continue;
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

// The parts of the globe group that go into a GLB: its visible meshes and
// lines, without the shader parts, the depth-only ones, the moving ones or
// the glow. Of the instanced layers, only the dots themselves wear the
// twinkle hook. The others are the Bloom, CRT and Chromatic looks' halos.
// The grid's lines and the arcs go in whole, so the copies that draw their
// far half on the canvas stay out (three/horizon.js).
const eachPart = (globeGroup, visit) =>
  globeGroup.traverseVisible((object) => {
    const { material } = object;
    if (!(object.isMesh || object.isLine) || material.isShaderMaterial || !material.colorWrite || moves(object) || glows(object)) return;
    if (object.userData.farHalf) return;
    if (object.isInstancedMesh && !material.userData.twinkleWired) return;
    visit(object);
  });

// globeGroup: the scene's globe group (components/globe-background.jsx).
// instanced: dots as GPU instances rather than one merged mesh.
// sizeVary: the design's Vary size.
export const buildGlbScene = (globeGroup, { instanced = false, sizeVary = false } = {}) => {
  const scene = new THREE.Scene();
  scene.name = "Globestudio";
  const dotLayers = [];
  globeGroup.updateMatrixWorld(true);
  eachPart(globeGroup, (object) => {
    // Placed within the globe group, which holds the view's spin and tilt.
    const matrix = object.matrix.clone();
    for (let parent = object.parent; parent !== globeGroup; parent = parent.parent) matrix.premultiply(parent.matrix);
    let part;
    if (object.isInstancedMesh) {
      const layer = dotLayer(object, sizeVary);
      if (!layer.matrices.length) return;
      if (!instanced) {
        for (const dot of layer.matrices) dot.premultiply(matrix);
        dotLayers.push(layer);
        return;
      }
      part = instancedDots(layer);
      part.name = "Dots";
    } else {
      const flat = flatMaterial(object.material);
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

// What a GLB of the design weighs, worked out from the parts buildGlbScene
// takes, without building it: GLTFExporter writes each attribute and index
// once, however many parts share it, in a buffer view of its own padded to
// 4 bytes, with a vertex's stride rounded up to 4 bytes too.
const padded = (bytes) => Math.ceil(bytes / 4) * 4;
const vertexBytes = (attribute) => padded(attribute.count * padded(attribute.itemSize * attribute.array.BYTES_PER_ELEMENT));
const indexBytes = (index) => padded(index.count * index.array.BYTES_PER_ELEMENT);

// The JSON chunk, at what each entry takes on average in the files the app
// writes: a node with its mesh; a primitive with its material; an accessor
// with its min, max and buffer view; a texture with its image and sampler;
// a dot layer's instancing extension.
const JSON_BYTES = { file: 160, node: 110, primitive: 220, accessor: 230, texture: 110, instancing: 110 };

// Each texture's PNG as the file holds it, in the shown colors
// (shownTexture), kept per texture: the browser converts and encodes it
// once, the first time an estimate needs it. The source's own PNG ran up
// to 30% over on a dark one, as the shown colors bunch dark values
// together. Where the browser can't encode, a guess from the size.
const pngSizes = new WeakMap();
const pngBytes = (texture) => {
  const { image } = texture;
  const guess = Math.round(image.width * image.height * 0.1);
  if (pngSizes.get(texture)?.version !== texture.version) {
    const bytes = new Promise((resolve) => {
      try {
        shownCanvas(image).toBlob((blob) => resolve(blob?.size ?? guess), "image/png");
      } catch {
        resolve(guess);
      }
    });
    pngSizes.set(texture, { version: texture.version, bytes });
  }
  return pngSizes.get(texture).bytes;
};

// The JSON and BIN bytes of some parts. add counts an accessor once for
// each attribute, however many parts share it. An attribute of null is one
// a part makes for itself.
const tally = () => {
  const written = new Set();
  const sum = { json: 0, bin: 0 };
  const add = (attribute, bytes) => {
    if (written.has(attribute)) return;
    if (attribute) written.add(attribute);
    sum.json += JSON_BYTES.accessor;
    sum.bin += bytes;
  };
  return { sum, add };
};

// A part's shape as flatGeometry keeps it: its points, its texture
// coordinates when it has a texture, its colors when it has its own (made
// anew for each part), and its index.
const addShape = (add, geometry, material) => {
  const position = geometry.getAttribute("position");
  add(position, vertexBytes(position));
  if (material.map) add(geometry.getAttribute("uv"), vertexBytes(geometry.getAttribute("uv")));
  if (material.vertexColors) add(null, vertexBytes(geometry.getAttribute("color")));
  if (geometry.index) add(geometry.index, indexBytes(geometry.index));
};

// Merged (mergeDots): one mesh, with a primitive and an index accessor for
// each layer, and each dot a copy of its layer's shape once indexed.
const mergedDotBytes = (layers) => {
  if (!layers.length) return { json: 0, bin: 0 };
  const shapes = layers.map((mesh) => {
    const geometry = flatGeometry(mesh.geometry, mesh.material);
    const shape = geometry.index ? geometry : mergeVertices(geometry);
    return { dots: shownDots(mesh), vertices: shape.getAttribute("position").count, indices: shape.index.count };
  });
  const vertices = shapes.reduce((sum, { dots, vertices: count }) => sum + dots * count, 0);
  const uv = layers.some((mesh) => mesh.material.map);
  const colors = layers.some((mesh) => mesh.instanceColor);
  const indexSize = vertices > 65535 ? 4 : 2;
  return {
    json: JSON_BYTES.node + layers.length * (JSON_BYTES.primitive + JSON_BYTES.accessor) + (1 + uv + colors) * JSON_BYTES.accessor,
    bin: padded(vertices * 12) + (uv ? padded(vertices * 8) : 0) + (colors ? padded(vertices * 12) : 0)
      + shapes.reduce((sum, { dots, indices }) => sum + padded(dots * indices * indexSize), 0),
  };
};

// Instanced (instancedDots): each layer's shape as it is, then a
// translation, rotation and scale for each dot, and a color when the dots
// have their own.
const instancedDotBytes = (layers) => {
  const { sum, add } = tally();
  for (const mesh of layers) {
    addShape(add, mesh.geometry, mesh.material);
    const colors = mesh.instanceColor ? 1 : 0;
    sum.json += JSON_BYTES.node + JSON_BYTES.primitive + JSON_BYTES.instancing + (3 + colors) * JSON_BYTES.accessor;
    sum.bin += padded(shownDots(mesh) * 12) * (2 + colors) + padded(shownDots(mesh) * 16);
  }
  return sum;
};

// globeGroup as for buildGlbScene. Resolves to the file's bytes saved each
// way: { merged, instanced }. Nothing here walks the dots one by one, so it
// takes about a millisecond on the densest design.
export const estimateGlbBytes = async (globeGroup) => {
  // Everything but the dots, the same either way.
  const { sum, add } = tally();
  sum.json += JSON_BYTES.file;
  const layers = [];
  const textures = [];
  eachPart(globeGroup, (object) => {
    const { geometry, material } = object;
    if (material.map) textures.push(material.map);
    if (object.isInstancedMesh) {
      if (shownDots(object)) layers.push(object);
      return;
    }
    sum.json += JSON_BYTES.node + JSON_BYTES.primitive;
    addShape(add, geometry, material);
  });
  // flatMaterial gives each part a texture of its own.
  sum.json += textures.length * JSON_BYTES.texture;
  sum.bin += (await Promise.all(textures.map(pngBytes))).reduce((total, bytes) => total + padded(bytes), 0);
  // A 12-byte header, then the JSON and BIN chunks, each after 8 bytes of its own.
  const file = (dots) => 12 + 8 + padded(sum.json + dots.json) + 8 + sum.bin + dots.bin;
  return { merged: file(mergedDotBytes(layers)), instanced: file(instancedDotBytes(layers)) };
};

// The GLB file's bytes.
export const exportGlb = (globeGroup, options) =>
  new GLTFExporter().parseAsync(buildGlbScene(globeGroup, options), { binary: true });
