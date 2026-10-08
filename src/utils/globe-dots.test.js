import { describe, expect, it } from "vitest";
import { createCountryMapData } from "./dot-generation.js";
import { createGlobeDots, createGlobeLattice, createLandTest, globeDotStep, pairDots } from "./globe-dots.js";

const DEG = Math.PI / 180;
const unit = ({ lat, lng }) => [
  Math.cos(lat * DEG) * Math.cos(lng * DEG),
  Math.cos(lat * DEG) * Math.sin(lng * DEG),
  Math.sin(lat * DEG),
];
// Arc in degrees between two points on the sphere.
const arc = (a, b) => {
  const [ax, ay, az] = unit(a);
  const [bx, by, bz] = unit(b);
  return (2 * Math.asin(Math.min(1, Math.hypot(ax - bx, ay - by, az - bz) / 2))) / DEG;
};
// Each dot's arc to its nearest neighbour, in degrees.
const nearestGaps = (dots) => {
  const vectors = dots.map(unit);
  return vectors.map(([x, y, z], i) => {
    let best = Infinity;
    vectors.forEach(([ox, oy, oz], j) => {
      if (i !== j) best = Math.min(best, (ox - x) ** 2 + (oy - y) ** 2 + (oz - z) ** 2);
    });
    return (2 * Math.asin(Math.sqrt(best) / 2)) / DEG;
  });
};
const median = (values) => [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)];
const inBand = (dots, values, low, high) => values.filter((_, i) => dots[i].lat >= low && dots[i].lat < high);

const world = createCountryMapData([], 40);
const globeDots = (mapData) => mapData.globePoints.filter((dot) => dot.view !== "flat");
const BANDS = [[-56, -40], [-40, -15], [-15, 15], [15, 40], [40, 55], [55, 65], [65, 72]];

describe("the flat map's dots on the sphere", () => {
  it("sit cos(latitude) of a column apart, which crowds them toward the poles", () => {
    const column = (world.image.region.lng.max - world.image.region.lng.min) / world.image.width;
    const gaps = nearestGaps(world.points);
    for (const [low, high] of BANDS) {
      const ratios = inBand(world.points, gaps.map((gap, i) => gap / (column * Math.cos(world.points[i].lat * DEG))), low, high);
      expect(median(ratios), `${low}..${high}`).toBeCloseTo(1, 1);
    }
    // Half the equator's gap at 60°, a third at the world's top edge.
    const equator = median(inBand(world.points, gaps, -10, 10));
    expect(median(inBand(world.points, gaps, 58, 62)) / equator).toBeCloseTo(0.5, 1);
  });
});

describe("globe dots", () => {
  const globe = globeDots(world);
  const step = globeDotStep(world.points, world.image);

  it("keep one gap at every latitude", () => {
    const gaps = nearestGaps(globe);
    for (const [low, high] of BANDS) {
      const gap = median(inBand(globe, gaps, low, high)) / step;
      // Neighbouring rows fall in and out of step away from the middle
      // meridian, so the nearest dot is a row (√3/2 of a step) to a step away.
      expect(gap, `${low}..${high}`).toBeGreaterThan(0.85);
      expect(gap, `${low}..${high}`).toBeLessThan(1.02);
    }
  });

  it("put the same number of dots on every square degree of the sphere, up to 80°", () => {
    const lattice = createGlobeLattice(2, { lat: { min: -80, max: 80 }, lng: { min: -180, max: 180 } });
    const rowStep = 2 * (Math.sqrt(3) / 2);
    const even = 1 / (2 * rowStep);
    for (const lat of new Set(lattice.map((dot) => dot.lat))) {
      // A row's strip of the sphere: its circumference times the row step.
      const strip = 360 * Math.cos(lat * DEG) * rowStep;
      const count = lattice.filter((dot) => dot.lat === lat).length;
      expect(Math.abs(count / strip / even - 1), `${lat.toFixed(1)}°`).toBeLessThan(0.02);
    }
  });

  it("space rows evenly in latitude and fit each row's circumference", () => {
    const lattice = createGlobeLattice(5, { lat: { min: -90, max: 90 }, lng: { min: -180, max: 180 } });
    const rows = [...new Set(lattice.map((dot) => dot.lat))].sort((a, b) => a - b);
    rows.slice(1).forEach((lat, i) => expect(lat - rows[i]).toBeCloseTo(5 * (Math.sqrt(3) / 2), 9));
    for (const lat of [0, rows.find((value) => value > 59)]) {
      const row = lattice.filter((dot) => dot.lat === lat).sort((a, b) => a.lng - b.lng);
      expect(row).toHaveLength(Math.round((360 * Math.cos(lat * DEG)) / 5));
      expect(arc(row[0], row[1])).toBeCloseTo(5, 0);
    }
  });

  it("number about as many as the flat map's, so Density keeps its dot count", () => {
    for (const [codes, density] of [[["CAN"], 40], [["BRA"], 60], [["NOR"], 40], [["IDN"], 30]]) {
      const mapData = createCountryMapData(codes, density);
      const ratio = globeDots(mapData).length / mapData.points.length;
      expect(Math.abs(ratio - 1), `${codes.join()} at ${density}`).toBeLessThan(0.07);
    }
    expect(Math.abs(globe.length / world.points.length - 1)).toBeLessThan(0.02);
  });

  it("keep every flat dot's id and image point, and give the globe's own dots ids of their own", () => {
    const byId = (a, b) => (a.id < b.id ? -1 : 1);
    const flat = world.globePoints.filter((dot) => dot.view !== "globe");
    expect(flat.map(({ id, x, y }) => ({ id, x, y })).sort(byId)).toEqual(world.points.map(({ id, x, y }) => ({ id, x, y })).sort(byId));
    const ids = world.globePoints.map((dot) => dot.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("put the flat map's own dots last, so the globe can stop drawing before them", () => {
    const firstFlat = world.globePoints.findIndex((dot) => dot.view === "flat");
    expect(firstFlat).toBeGreaterThan(0);
    expect(world.globePoints.slice(firstFlat).every((dot) => dot.view === "flat")).toBe(true);
  });

  it("move a paired flat dot less than one step in the morph", () => {
    const byId = new Map(world.points.map((point) => [point.id, point]));
    const paired = world.globePoints.filter((dot) => !dot.view);
    expect(paired.length).toBeGreaterThan(world.points.length * 0.6);
    for (const dot of paired) expect(arc(dot, byId.get(dot.id))).toBeLessThanOrEqual(step + 1e-9);
  });

  it("draw the flat map's coastlines: each flat dot's own point is land, open sea is not", () => {
    const isLand = createLandTest(world.points, world.image);
    expect(world.points.every(isLand)).toBe(true);
    // The middle of the Pacific, south of Hawaii.
    expect(isLand({ x: ((-150 + 168) / 336) * world.image.width, y: world.image.height * 0.55 })).toBe(false);
  });
});

describe("pairDots", () => {
  it("pairs nearest first, each globe dot once, none beyond the reach", () => {
    const flat = [{ lat: 0, lng: 0 }, { lat: 0, lng: 0.4 }, { lat: 0, lng: 10 }];
    const globe = [{ lat: 0, lng: 0.5 }, { lat: 0, lng: 1.5 }];
    expect(Array.from(pairDots(flat, globe, 2))).toEqual([1, 0, -1]);
  });

  it("leaves the map as it is without a region to place globe dots in", () => {
    const points = [{ id: "a", x: 1, y: 1, lat: 0, lng: 0 }];
    expect(createGlobeDots(points, { width: 10, height: 5 })).toBe(points);
  });
});
