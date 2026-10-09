import { normalizeLongitude } from "./math.js";
import { latLngToImagePoint } from "./projection.js";

// The flat map's dots (dotted-map) sit on an even grid in Mercator, which
// is right for a flat map. On the sphere a Mercator step is cos(lat) as
// long, east-west and north-south alike, so that grid wrapped onto the
// globe crowds toward the poles: half the gap at 60°, a third at 71°, with
// every dot the same size. The globe gets dots of its own instead, evenly
// spaced on the sphere, and each one is paired with a flat dot where one is
// close, so the morph between the views still moves the same dots.

const DEG = Math.PI / 180;

// Squares tile the flat map's grid, and the square looks (Pixel, Bayer,
// Atkinson, Glitch, Bad TV, Corrupt, Threshold) are drawn on it: on the
// globe its columns run along the meridians and its rows along the
// parallels, so those looks keep it there too. Every other shape gets the
// globe's evenly spaced dots.
export const globeKeepsMapGrid = (shape) => shape === "Square";
// dotted-map's "diagonal" grid: rows √3/2 image px apart, even rows shifted
// half a column. The globe's rows keep the same hexagonal proportion.
const ROW_STEP = Math.sqrt(3) / 2;

// The arc, in degrees, between neighbouring globe dots that gives the globe
// as many dots as the flat map. A flat dot at latitude φ covers cos²(φ) of
// a flat grid cell's area on the sphere, so the land's area in globe cells
// is the sum of cos²(φ), and the step is the flat map's column step scaled
// by the root mean square of cos(φ). That keeps Density meaning the same
// dot count in both views.
export const globeDotStep = (points, image) => {
  const lngStep = (image.region.lng.max - image.region.lng.min) / image.width;
  const meanCos2 = points.reduce((sum, point) => sum + Math.cos(point.lat * DEG) ** 2, 0) / points.length;
  return lngStep * Math.sqrt(meanCos2);
};

// Rows evenly spaced in latitude, each holding as many dots as its
// circumference fits, alternate rows shifted half a step. Rows count from
// the equator and dots from the region's middle meridian, so the pattern is
// hexagonal there and the same arc apart everywhere. spans(lat), when
// given, keeps a row to those stretches of longitude, [from, to] in
// order, in the region's own degrees.
export const createGlobeLattice = (step, region, spans = () => [[region.lng.min, region.lng.max]]) => {
  const rowStep = step * ROW_STEP;
  const middle = (region.lng.min + region.lng.max) / 2;
  const lattice = [];
  for (let row = Math.ceil(region.lat.min / rowStep); row * rowStep <= region.lat.max; row += 1) {
    const lat = row * rowStep;
    const count = Math.max(1, Math.round((360 * Math.cos(lat * DEG)) / step));
    const lngStep = 360 / count;
    const shift = Math.abs(row) % 2 ? 0.5 : 0;
    const columnAt = (lng) => (lng - middle) / lngStep - shift;
    const first = Math.ceil(columnAt(region.lng.min));
    // A region all the way round takes each dot of the row once.
    const last = Math.min(first + count - 1, Math.floor(columnAt(region.lng.max)));
    let next = first;
    for (const [from, to] of spans(lat)) {
      const end = Math.min(last, Math.floor(columnAt(to)));
      for (let column = Math.max(next, Math.ceil(columnAt(from))); column <= end; column += 1) {
        lattice.push({ row, column, lat, lng: normalizeLongitude(middle + (column + shift) * lngStep) });
      }
      next = Math.max(next, end + 1);
    }
  }
  return lattice;
};

// Whether an image point is land, read off the flat map's own dots, so both
// views draw the same coastlines. Each grid point is 1 (a dot) or 0, and
// the point between them is land where the blend of its four neighbours
// reaches a half: the coast runs midway between a dot and an empty point.
export const createLandTest = (points, image) => {
  const columns = Math.ceil(image.width) + 1;
  const land = new Set(points.map((point) => Math.round(point.y / ROW_STEP) * columns + Math.floor(point.x)));
  const at = (row, column) => (row >= 0 && column >= 0 && column < columns && land.has(row * columns + column) ? 1 : 0);
  return ({ x, y }) => {
    const rowAt = y / ROW_STEP;
    const row = Math.floor(rowAt);
    const up = rowAt - row;
    const shift = row % 2 === 0 ? 0.5 : 0;
    const nextShift = 0.5 - shift;
    // Sheared so the next row's points line up with this row's columns.
    const across = x - shift - (nextShift - shift) * up;
    const column = Math.floor(across);
    const side = across - column;
    const value = (1 - side) * (1 - up) * at(row, column)
      + side * (1 - up) * at(row, column + 1)
      + (1 - side) * up * at(row + 1, column)
      + side * up * at(row + 1, column + 1);
    return value >= 0.5;
  };
};

// The stretches of a globe row where createLandTest can find land: within
// two columns of a flat dot in the image rows it blends. A lattice over a
// region's whole box costs as much as the box, which for an area that
// spans the antimeridian (Fiji) is all the way round the world.
export const createLandSpans = (points, image) => {
  const rows = new Map();
  points.forEach((point) => {
    const row = Math.round(point.y / ROW_STEP);
    if (!rows.has(row)) rows.set(row, []);
    rows.get(row).push(point.x);
  });
  const { lng } = image.region;
  const toLng = (x) => lng.min + (x / image.width) * (lng.max - lng.min);
  return (lat) => {
    const row = Math.floor(latLngToImagePoint(lat, lng.min, image).y / ROW_STEP);
    const xs = [...(rows.get(row) ?? []), ...(rows.get(row + 1) ?? [])].sort((a, b) => a - b);
    const spans = [];
    for (const x of xs) {
      const last = spans.at(-1);
      if (last && toLng(x - 2) <= last[1]) last[1] = toLng(x + 2);
      else spans.push([toLng(x - 2), toLng(x + 2)]);
    }
    return spans;
  };
};

const unitVector = ({ lat, lng }) => {
  const phi = lat * DEG;
  const lambda = lng * DEG;
  return [Math.cos(phi) * Math.cos(lambda), Math.cos(phi) * Math.sin(lambda), Math.sin(phi)];
};

// Dots on the unit sphere, each with a key (an index or an id), bucketed so
// the ones within maxArc degrees of a point come back without a walk over
// all of them.
const createNearby = (maxArc) => {
  const reach = 2 * Math.sin((maxArc * DEG) / 2);
  const cellOf = (value) => Math.floor(value / reach) + 1024;
  const keyOf = (x, y, z) => (x * 2048 + y) * 2048 + z;
  const cells = new Map();
  return {
    add(vector, key) {
      const cell = keyOf(cellOf(vector[0]), cellOf(vector[1]), cellOf(vector[2]));
      if (!cells.has(cell)) cells.set(cell, []);
      cells.get(cell).push({ vector, key });
    },
    // Each entry within reach, with its squared chord distance.
    near([x, y, z], visit) {
      const [cx, cy, cz] = [cellOf(x), cellOf(y), cellOf(z)];
      for (let dx = -1; dx <= 1; dx += 1) {
        for (let dy = -1; dy <= 1; dy += 1) {
          for (let dz = -1; dz <= 1; dz += 1) {
            for (const { vector, key } of cells.get(keyOf(cx + dx, cy + dy, cz + dz)) ?? []) {
              const distance = (vector[0] - x) ** 2 + (vector[1] - y) ** 2 + (vector[2] - z) ** 2;
              if (distance <= reach * reach) visit(key, distance);
            }
          }
        }
      }
    },
    // The key of the nearest entry within reach, or undefined.
    nearest(vector) {
      let best = Infinity;
      let found;
      this.near(vector, (key, distance) => {
        if (distance < best) {
          best = distance;
          found = key;
        }
      });
      return found;
    },
  };
};

// Pairs each flat dot with a distinct globe dot at most maxArc degrees
// away, nearest pairs first. Returns, for each flat dot, its globe dot's
// index or -1.
export const pairDots = (flatDots, globeDots, maxArc) => {
  const nearby = createNearby(maxArc);
  globeDots.forEach((dot, index) => nearby.add(unitVector(dot), index));
  const candidates = [];
  flatDots.forEach((dot, flatIndex) => {
    nearby.near(unitVector(dot), (globeIndex, distance) => candidates.push({ distance, flatIndex, globeIndex }));
  });
  candidates.sort((a, b) => a.distance - b.distance);
  const pairs = new Int32Array(flatDots.length).fill(-1);
  const taken = new Uint8Array(globeDots.length);
  for (const { flatIndex, globeIndex } of candidates) {
    if (pairs[flatIndex] >= 0 || taken[globeIndex]) continue;
    pairs[flatIndex] = globeIndex;
    taken[globeIndex] = 1;
  }
  return pairs;
};

// How many dots a view draws: the globe's own where it has them, else the
// flat map's.
export const viewDotCount = (mapData, view, shape) =>
  view === "globe" && !globeKeepsMapGrid(shape) && mapData.globePoints
    ? mapData.globePoints.filter((dot) => dot.view !== "flat").length
    : mapData.points.length;

// The id of a dot the globe draws and the flat map doesn't.
export const GLOBE_DOT_ID = "globe:";

// The dots the globe layer draws (three/globe.js). A flat dot paired with a
// globe dot keeps its id and image point and takes the globe dot's
// latitude and longitude: it shows in both views and moves a little in the
// morph. An unpaired flat dot shows only on the flat map (view "flat"), an
// unpaired globe dot only on the globe (view "globe"), at its own Mercator
// image point. Each of those has a twin, the id of the other view's
// nearest dot, which a click on it lights in that view (litDots). points:
// the flat map's dots, with lat and lng. The globe's dots come first.
//
// A flat dot with no globe dot within ALONE_REACH of a step stays on the
// globe where it is, so land smaller than the globe's step (an island, a
// small country at a low Density, the flat map's top row) never drops off
// the globe. A whole step would count a globe dot on the next coast, or in
// the sea beside it, as covering it.
const ALONE_REACH = 0.6;

export const createGlobeDots = (points, image) => {
  if (!points.length || !image?.region) return points;
  const step = globeDotStep(points, image);
  const isLand = createLandTest(points, image);
  const lattice = createGlobeLattice(step, image.region, createLandSpans(points, image))
    .map((dot) => ({ ...dot, ...latLngToImagePoint(dot.lat, dot.lng, image) }))
    .filter(isLand);
  const pairs = pairDots(points, lattice, step);
  // A lattice dot goes by its flat dot's id when it has one.
  const latticeIds = lattice.map(({ row, column }) => `${GLOBE_DOT_ID}${row}:${column}`);
  const paired = new Uint8Array(lattice.length);
  pairs.forEach((globeIndex, flatIndex) => {
    if (globeIndex < 0) return;
    latticeIds[globeIndex] = points[flatIndex].id;
    paired[globeIndex] = 1;
  });
  const onGlobe = createNearby(step * ALONE_REACH);
  lattice.forEach((dot, index) => onGlobe.add(unitVector(dot), latticeIds[index]));
  // Each flat dot keeps its place in the flat map's order (flatIndex), which
  // seeds its twinkle and Vary size (three/globe.js).
  const dots = points.map((point, flatIndex) => {
    const globeIndex = pairs[flatIndex];
    if (globeIndex >= 0) return { ...point, flatIndex, lat: lattice[globeIndex].lat, lng: lattice[globeIndex].lng };
    const vector = unitVector(point);
    const twin = onGlobe.nearest(vector);
    if (twin !== undefined) return { ...point, flatIndex, view: "flat", twin };
    onGlobe.add(vector, point.id);
    return { ...point, flatIndex };
  });
  // A globe dot passes the land test only within a cell of a flat dot, and
  // a cell spans at most a column and a row of the flat map.
  const onFlatMap = createNearby(1.5 * ((image.region.lng.max - image.region.lng.min) / image.width));
  points.forEach((point) => onFlatMap.add(unitVector(point), point.id));
  lattice.forEach(({ lat, lng, x, y }, index) => {
    if (paired[index]) return;
    const twin = onFlatMap.nearest(unitVector({ lat, lng }));
    dots.push({ id: latticeIds[index], x, y, lat, lng, view: "globe", ...(twin === undefined ? {} : { twin }) });
  });
  // The flat map's own dots go last, so the globe stops drawing before them
  // (three/globe.js) instead of drawing them at no size.
  return [...dots.filter((dot) => dot.view !== "flat"), ...dots.filter((dot) => dot.view === "flat")];
};

// The dots a selection lights in each view, as ids: { flat, globe }. A
// click stores the id of the dot it hit, a flat map dot's (a dot both views
// draw keeps it) or a globe dot's own. A dot that one view draws alone
// lights its twin in the other view, so a click shows in both, and the flat
// map and its exports light only the flat map's own dots.
export const litDots = (mapData, selectedDots) => {
  const flat = new Set();
  const globe = new Set();
  if (!selectedDots?.size) return { flat, globe };
  for (const dot of mapData.globePoints ?? mapData.points) {
    if (!selectedDots.has(dot.id)) continue;
    if (dot.view !== "globe") flat.add(dot.id);
    if (dot.view !== "flat") globe.add(dot.id);
    if (dot.twin !== undefined) (dot.view === "flat" ? globe : flat).add(dot.twin);
  }
  return { flat, globe };
};

const holdsGlobeDot = (selectedDots) => [...(selectedDots ?? [])].some((id) => id.startsWith(GLOBE_DOT_ID));

// The flat map's lit dots. Without a globe dot among them, the ones
// selected, so the flat map never builds the globe's dots for it.
export const litOnFlatMap = (mapData, selectedDots) =>
  holdsGlobeDot(selectedDots) ? litDots(mapData, selectedDots).flat : selectedDots ?? new Set();

// The selection after a click on the dot `id` in `view`, "flat" or "globe"
// (left out for a dot both views draw and light alike). A lit dot goes
// dark, with every selected id that lit it; a dark dot lights up.
export const toggleDot = (mapData, selectedDots, id, view) => {
  const lighting = selectedDots.has(id) ? [id] : [];
  if (view !== "flat" || holdsGlobeDot(selectedDots)) {
    for (const dot of mapData.globePoints ?? []) {
      // A flat map dot lights its twin on the globe, a globe dot on the flat map.
      if (dot.twin === id && dot.view !== view && selectedDots.has(dot.id)) lighting.push(dot.id);
    }
  }
  const next = new Set(selectedDots);
  if (lighting.length) lighting.forEach((lit) => next.delete(lit));
  else next.add(id);
  return next;
};
