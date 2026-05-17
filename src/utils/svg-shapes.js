import { formatSvgNumber } from "./math.js";

export const createRegularPolygonPointArray = (x, y, radius, sides, rotation = -Math.PI / 2) =>
  Array.from({ length: sides }, (_, index) => {
    const angle = rotation + (index / sides) * Math.PI * 2;
    return [x + Math.cos(angle) * radius, y + Math.sin(angle) * radius];
  });

export const createStarPointArray = (x, y, outerRadius, innerRadius, points = 5) =>
  Array.from({ length: points * 2 }, (_, index) => {
    const radius = index % 2 === 0 ? outerRadius : innerRadius;
    const angle = -Math.PI / 2 + (index / (points * 2)) * Math.PI * 2;
    return [x + Math.cos(angle) * radius, y + Math.sin(angle) * radius];
  });

export const createPlusPointArray = (x, y, radius) => {
  const arm = radius * 0.46;
  const long = radius * 1.38;
  return [
    [x - arm, y - long],
    [x + arm, y - long],
    [x + arm, y - arm],
    [x + long, y - arm],
    [x + long, y + arm],
    [x + arm, y + arm],
    [x + arm, y + long],
    [x - arm, y + long],
    [x - arm, y + arm],
    [x - long, y + arm],
    [x - long, y - arm],
    [x - arm, y - arm],
  ];
};

export const createParticleGridOffsets = (spacing) =>
  [-1, 0, 1].flatMap((row) => [-1, 0, 1].map((column) => [column * spacing, row * spacing]));

export const formatPointList = (points) =>
  points
    .map(([x, y]) => `${formatSvgNumber(x, 2)},${formatSvgNumber(y, 2)}`)
    .join(" ");

export const createHexagonPoints = (x, y, radius) => {
  const sqrt3radius = Math.sqrt(3) * radius;
  return formatPointList([
    [x + sqrt3radius, y - radius],
    [x + sqrt3radius, y + radius],
    [x, y + 2 * radius],
    [x - sqrt3radius, y + radius],
    [x - sqrt3radius, y - radius],
    [x, y - 2 * radius],
  ]);
};

export const createDiamondPoints = (x, y, radius) =>
  formatPointList([
    [x, y - radius],
    [x + radius, y],
    [x, y + radius],
    [x - radius, y],
  ]);

export const createVoxelFaces = (x, y, radius) => {
  const xRadius = radius * 1.28;
  const topY = y - radius * 1.38;
  const midY = y + radius * 0.04;
  const lowY = y + radius * 1.52;
  const shoulderY = y - radius * 0.64;
  const footY = y + radius * 0.82;

  return {
    left: [
      [x - xRadius, shoulderY],
      [x, midY],
      [x, lowY],
      [x - xRadius, footY],
    ],
    right: [
      [x + xRadius, shoulderY],
      [x, midY],
      [x, lowY],
      [x + xRadius, footY],
    ],
    top: [
      [x, topY],
      [x + xRadius, shoulderY],
      [x, midY],
      [x - xRadius, shoulderY],
    ],
  };
};
