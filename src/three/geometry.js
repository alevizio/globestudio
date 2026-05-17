import * as THREE from "three";
import {
  createPlusPointArray,
  createStarPointArray,
  createParticleGridOffsets,
} from "../utils/svg-shapes.js";

const createBarShape = (width, height, rotation = 0) => {
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const corners = [
    [-halfWidth, -halfHeight],
    [halfWidth, -halfHeight],
    [halfWidth, halfHeight],
    [-halfWidth, halfHeight],
  ].map(([x, y]) => [x * cos - y * sin, x * sin + y * cos]);

  const shape = new THREE.Shape();
  corners.forEach(([x, y], index) => {
    if (index === 0) shape.moveTo(x, y);
    else shape.lineTo(x, y);
  });
  shape.closePath();
  return shape;
};

const mergeGeometries = (geometries) => {
  const positions = [];
  const normals = [];

  geometries.forEach((geometry) => {
    const source = geometry.index ? geometry.toNonIndexed() : geometry.clone();
    const position = source.getAttribute("position");
    const normal = source.getAttribute("normal");

    for (let index = 0; index < position.count; index += 1) {
      positions.push(position.getX(index), position.getY(index), position.getZ(index));
      if (normal) normals.push(normal.getX(index), normal.getY(index), normal.getZ(index));
    }

    source.dispose();
  });

  const merged = new THREE.BufferGeometry();
  merged.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  if (normals.length === positions.length) {
    merged.setAttribute("normal", new THREE.Float32BufferAttribute(normals, 3));
  } else {
    merged.computeVertexNormals();
  }
  merged.computeBoundingBox();
  merged.computeBoundingSphere();
  return merged;
};

const createAsciiAsteriskGeometry = () => {
  // Flat asterisk — four crossing bars as a single ShapeGeometry. Stays
  // tangent to the sphere surface like all the other flat dot geometries.
  const bars = [
    createBarShape(0.22, 1.5, 0),
    createBarShape(0.22, 1.5, Math.PI / 4),
    createBarShape(0.22, 1.5, Math.PI / 2),
    createBarShape(0.22, 1.5, -Math.PI / 4),
  ];
  const geometry = new THREE.ShapeGeometry(bars);
  geometry.center();
  geometry.rotateX(-Math.PI / 2);
  return geometry;
};

const createVoxelGeometry = () => {
  const geometry = new THREE.BoxGeometry(1.08, 1.08, 1.08);
  geometry.translate(0, 0.34, 0);
  return geometry;
};

const createParticleGridGeometry = () => {
  const particle = new THREE.SphereGeometry(0.18, 7, 5);
  const geometries = createParticleGridOffsets(0.52).map(([x, z]) => {
    const geometry = particle.clone();
    geometry.translate(x, 0.14, z);
    return geometry;
  });
  const merged = mergeGeometries(geometries);
  particle.dispose();
  geometries.forEach((geometry) => geometry.dispose());
  return merged;
};

export const createAsciiCanvasTexture = (symbol) => {
  const text = symbol && symbol.length > 0 ? symbol : "*";
  const canvas = document.createElement("canvas");
  const size = 128;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  ctx.clearRect(0, 0, size, size);
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  const fontSize = text.length > 1
    ? Math.max(54, size / (text.length * 0.7))
    : 124;
  ctx.font = `700 ${Math.round(fontSize)}px ui-monospace, SFMono-Regular, Menlo, monospace`;
  ctx.fillText(text, size / 2, size / 2 + 4);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  texture.needsUpdate = true;
  return texture;
};

export const createAsciiPlaneGeometry = () => {
  const geometry = new THREE.PlaneGeometry(2.6, 2.6);
  geometry.rotateX(-Math.PI / 2);
  geometry.translate(0, 0.02, 0);
  return geometry;
};

// All dot geometries lie flat (tangent to the sphere). The instance-rotation logic
// aligns each geometry's local +Y with the sphere normal, so rotating each shape
// -PI/2 around X puts its surface in the XZ plane with +Y normal — flat against
// the sphere. Stripe-style painted-on dots, no 3D thickness.
const tangentFlat = (geometry) => {
  geometry.rotateX(-Math.PI / 2);
  return geometry;
};

export const createGlobeDotGeometry = (shape, asciiSymbol = "*") => {
  if (shape === "Triangle") return tangentFlat(new THREE.CircleGeometry(1.18, 3));
  if (shape === "Pentagon") return tangentFlat(new THREE.CircleGeometry(1.05, 5));
  if (shape === "Hexagon") return tangentFlat(new THREE.CircleGeometry(1, 6));
  if (shape === "Square") return tangentFlat(new THREE.PlaneGeometry(1.28, 1.28));
  if (shape === "Voxel") return createVoxelGeometry();
  if (shape === "Particle Grid") return createParticleGridGeometry();
  if (shape === "Diamond") {
    const geometry = new THREE.CircleGeometry(1, 4);
    geometry.rotateZ(Math.PI / 4);
    return tangentFlat(geometry);
  }
  if (shape === "ASCII") {
    if (!asciiSymbol || asciiSymbol === "*") return createAsciiAsteriskGeometry();
    return createAsciiPlaneGeometry();
  }
  if (shape === "Ring") {
    return tangentFlat(new THREE.RingGeometry(0.5, 1, 24));
  }
  if (shape === "Star" || shape === "Plus") {
    const points = shape === "Star"
      ? createStarPointArray(0, 0, 1.08, 0.48)
      : createPlusPointArray(0, 0, 0.9);
    const shapePath = new THREE.Shape();
    points.forEach(([x, y], index) => {
      if (index === 0) shapePath.moveTo(x, y);
      else shapePath.lineTo(x, y);
    });
    shapePath.closePath();
    const geometry = new THREE.ShapeGeometry(shapePath);
    geometry.center();
    return tangentFlat(geometry);
  }
  return tangentFlat(new THREE.CircleGeometry(1, 18));
};

export const disposeThreeObject = (object) => {
  object.traverse((child) => {
    child.geometry?.dispose?.();
    if (Array.isArray(child.material)) {
      child.material.forEach((material) => material.dispose?.());
    } else {
      child.material?.dispose?.();
    }
  });
};
