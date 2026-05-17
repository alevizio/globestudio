import DottedMapEngine from "dotted-map";
import { geoAlbersUsa, geoContains, geoPath } from "d3-geo";
import { MAP_HEIGHT, MAP_WIDTH } from "../config/constants.js";
import { pointToGlobeCoordinate } from "./projection.js";

export const makeFeatureCollection = (features) => ({
  type: "FeatureCollection",
  features,
});

const generateDots = ({ collection, density, shape }) => {
  const paddingPx = 28;
  const projection = geoAlbersUsa();
  projection.fitExtent(
    [
      [paddingPx, paddingPx],
      [MAP_WIDTH - paddingPx, MAP_HEIGHT - paddingPx],
    ],
    collection,
  );

  const path = geoPath(projection);
  const bounds = path.bounds(collection);
  const minX = Math.max(0, Number.isFinite(bounds[0][0]) ? bounds[0][0] : paddingPx);
  const maxX = Math.min(MAP_WIDTH, Number.isFinite(bounds[1][0]) ? bounds[1][0] : MAP_WIDTH);
  const minY = Math.max(0, Number.isFinite(bounds[0][1]) ? bounds[0][1] : paddingPx);
  const maxY = Math.min(MAP_HEIGHT, Number.isFinite(bounds[1][1]) ? bounds[1][1] : MAP_HEIGHT);
  const spacing = Math.max(4, 23 - density * 0.17);
  const ySpacing = shape === "Hexagon" ? spacing * 0.88 : spacing;
  const dots = [];
  let row = 0;

  for (let y = minY; y <= maxY; y += ySpacing) {
    const offset = row % 2 === 0 ? 0 : spacing / 2;
    for (let x = minX + offset; x <= maxX; x += spacing) {
      const coordinates = projection.invert?.([x, y]);
      if (!coordinates) continue;
      if (geoContains(collection, coordinates)) {
        const [lng, lat] = coordinates;
        dots.push({
          id: `${Math.round(x * 10)}-${Math.round(y * 10)}`,
          lat,
          lng,
          x,
          y,
        });
      }
    }
    row += 1;
  }

  return dots;
};

export const createCountryMapData = (countryCodes, density) => {
  const map = new DottedMapEngine({
    height: density,
    grid: "diagonal",
    ...(countryCodes.length ? { countries: countryCodes } : {}),
  });
  const image = map.image;

  return {
    image,
    points: map.getPoints().map((point, index) => ({
      ...point,
      ...pointToGlobeCoordinate(point, image),
      id: `${point.x}:${point.y}:${index}`,
    })),
  };
};

export const createStateMapData = (collection, density, shape) => {
  const points = generateDots({
    collection,
    density,
    shape,
  }).map((point, index) => ({
    ...point,
    id: `${point.x}:${point.y}:${index}`,
  }));

  return {
    image: { width: MAP_WIDTH, height: MAP_HEIGHT },
    points,
  };
};

export const getDotRadius = (dotSize, mode) =>
  mode === "state" ? Math.max(0.15, dotSize * 0.42) : dotSize / 100;

export const getShapeBounds = (point, radius, shape) => {
  if (shape === "Triangle" || shape === "Pentagon") {
    const shapeRadius = shape === "Triangle" ? radius * 1.72 : radius * 1.42;
    return {
      minX: point.x - shapeRadius,
      maxX: point.x + shapeRadius,
      minY: point.y - shapeRadius,
      maxY: point.y + shapeRadius,
    };
  }

  if (shape === "Hexagon") {
    const xRadius = Math.sqrt(3) * radius;
    return {
      minX: point.x - xRadius,
      maxX: point.x + xRadius,
      minY: point.y - 2 * radius,
      maxY: point.y + 2 * radius,
    };
  }

  const shapeRadius = {
    ASCII: 1.8,
    Diamond: 1.35,
    Plus: 1.38,
    "Particle Grid": 1.12,
    Ring: 1.08,
    Star: 1.78,
    Voxel: 1.62,
  }[shape] ?? 1;
  const scaledRadius = radius * shapeRadius;
  return {
    minX: point.x - scaledRadius,
    maxX: point.x + scaledRadius,
    minY: point.y - scaledRadius,
    maxY: point.y + scaledRadius,
  };
};

export const getPointsBounds = (points, radius, shape, image) => {
  if (!points.length) {
    return {
      minX: 0,
      minY: 0,
      maxX: image.width,
      maxY: image.height,
    };
  }

  return points.reduce(
    (bounds, point) => {
      const pointBounds = getShapeBounds(point, radius, shape);
      return {
        minX: Math.min(bounds.minX, pointBounds.minX),
        minY: Math.min(bounds.minY, pointBounds.minY),
        maxX: Math.max(bounds.maxX, pointBounds.maxX),
        maxY: Math.max(bounds.maxY, pointBounds.maxY),
      };
    },
    { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity },
  );
};
