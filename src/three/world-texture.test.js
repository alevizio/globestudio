import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MAP_HEIGHT, MAP_WIDTH, STATE_MAP_PADDING } from "../config/constants.js";
import { createStateMapData } from "../utils/dot-generation.js";
import { createWorldTexture } from "./world-texture.js";

// jsdom has no 2D canvas, so this context keeps geometry instead of pixels:
// every fill and stroke records the points it paints and the clip regions
// active at that moment. A point shows when it is on the canvas and inside
// every active clip.
const recordingContext = (canvas) => {
  const ops = [];
  const stack = [];
  let path = [];
  let clips = [];
  const ctx = {
    canvas,
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1,
    lineJoin: "",
    lineCap: "",
    save: () => stack.push(clips),
    restore: () => {
      clips = stack.pop() ?? [];
    },
    beginPath: () => {
      path = [];
    },
    moveTo: (x, y) => path.push([[x, y]]),
    lineTo: (x, y) => (path.length ? path.at(-1).push([x, y]) : path.push([[x, y]])),
    closePath: () => {},
    arc: (x, y) => path.push([[x, y]]),
    fillRect: () => {},
    fill: () => ops.push({ style: ctx.fillStyle, path, clips }),
    stroke: () => ops.push({ style: ctx.strokeStyle, path, clips }),
    clip: (region) => {
      clips = [...clips, region ? region.subpaths : path];
    },
    isPointInPath: (region, x, y) => inside([x, y], region.subpaths),
    createLinearGradient: () => ({ addColorStop: () => {} }),
  };
  return { ctx, ops };
};

// jsdom has no Path2D either; this one keeps its subpaths the same way.
class RecordingPath2D {
  subpaths = [];

  moveTo(x, y) {
    this.subpaths.push([[x, y]]);
  }

  lineTo(x, y) {
    if (this.subpaths.length) this.subpaths.at(-1).push([x, y]);
    else this.moveTo(x, y);
  }

  closePath() {}

  arc(x, y) {
    this.moveTo(x, y);
  }
}

// Even-odd point in polygon over every subpath of a recorded path.
const inside = ([x, y], subpaths) => {
  let hit = false;
  subpaths.forEach((ring) => {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
      const [xi, yi] = ring[i];
      const [xj, yj] = ring[j];
      if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) hit = !hit;
    }
  });
  return hit;
};

const LAND = "#5a5a64";
const OVERLAYS = { riversColor: "#0000ff", citiesColor: "#ffff00", customColor: "#00ff00" };

// One square country (clockwise, as d3 and world-atlas wind it), plus
// overlays on it, off it inside the same box, and on the far side of the world.
const land = {
  type: "FeatureCollection",
  features: [{ type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [[[-70, -10], [-50, -10], [-50, -30], [-70, -30], [-70, -10]]] } }],
};
const line = (coordinates) => ({ type: "Feature", properties: {}, geometry: { type: "LineString", coordinates } });
const point = (coordinates, pop) => ({ type: "Feature", properties: { pop_max: pop }, geometry: { type: "Point", coordinates } });
const collection = (features) => ({ type: "FeatureCollection", features });
const rivers = collection([line([[-65, -15], [-55, -25]]), line([[-74, -6], [-72, -8]]), line([[31, 30], [32, 20]])]);
// The fourth city sits on the land just inside its east coast, the fifth just
// off it, like Lisbon off the 1:50m coastline.
const cities = collection([
  point([-60, -20], 1e6),
  point([-47, -8], 5e5),
  point([31.2, 30], 1.5e7),
  point([-50.4, -20], 1e6),
  point([-49.8, -24], 1e6),
]);
const custom = collection([point([-62, -18]), line([[2, 48], [13, 52]]), point([100, 30])]);
const region = { lat: { min: -35, max: -5 }, lng: { min: -75, max: -45 } };

let recorded;
beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(function getContext() {
    recorded = recordingContext(this);
    return recorded.ctx;
  });
  vi.stubGlobal("Path2D", RecordingPath2D);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const draw = (options) => {
  createWorldTexture(land, {
    ocean: "transparent",
    fill: LAND,
    strokeVisible: false,
    ...OVERLAYS,
    rivers,
    riversVisible: true,
    cities,
    citiesVisible: true,
    custom,
    customVisible: true,
    ...options,
  });
  const { ctx, ops } = recorded;
  const onCanvas = ([x, y]) => x >= 0 && y >= 0 && x <= ctx.canvas.width && y <= ctx.canvas.height;
  const landPath = ops.filter((op) => op.style === LAND).flatMap((op) => op.path);
  const shown = ops
    .filter((op) => Object.values(OVERLAYS).includes(op.style))
    .flatMap((op) => op.path.flat().filter((p) => onCanvas(p) && op.clips.every((clip) => inside(p, clip))));
  // City and custom dots: fills of one arc, which records a single point.
  const dots = ops.filter((op) => op.style !== LAND && op.path.length === 1 && op.path[0].length === 1);
  return {
    offLand: shown.filter((p) => !inside(p, landPath)),
    onLand: shown.filter((p) => inside(p, landPath)),
    dots,
    landPath,
  };
};

describe("createWorldTexture overlays", () => {
  it.each([
    ["globe", {}],
    ["flat map", { region, aspect: 1 }],
  ])("keeps a picked region's rivers, cities and custom data on its land (%s)", (_, view) => {
    const { offLand, onLand } = draw({ ...view, clipOverlays: true });
    expect(offLand).toEqual([]);
    expect(onLand.length).toBeGreaterThan(0);
  });

  it.each([
    ["globe", {}],
    ["flat map", { region, aspect: 1 }],
  ])("draws a picked region's dots centred on its land whole, so coastal cities stay round (%s)", (_, view) => {
    const { dots, landPath } = draw({ ...view, clipOverlays: true });
    const centred = dots.filter((op) => inside(op.path[0][0], landPath));
    const offLand = dots.filter((op) => !inside(op.path[0][0], landPath));
    expect(centred.length).toBeGreaterThan(0);
    expect(offLand.length).toBeGreaterThan(0);
    centred.forEach((op) => expect(op.clips).toEqual([]));
    // The rest keep only their part on the land.
    offLand.forEach((op) => expect(op.clips).toHaveLength(1));
  });

  it("draws every overlay for the world", () => {
    const { offLand } = draw({});
    expect(offLand.length).toBeGreaterThan(0);
  });
});

describe("createWorldTexture flat framing", () => {
  // Boxes dotted-map gives these picks, from small to the whole world, on both
  // sides of the equator and across the antimeridian.
  const boxes = {
    "the world": { lat: { min: -56, max: 71 }, lng: { min: -168, max: 168 } },
    Luxembourg: { lat: { min: 49.442667, max: 50.128052 }, lng: { min: 5.674052, max: 6.242751 } },
    Brazil: { lat: { min: -33.768378, max: 5.244486 }, lng: { min: -73.987235, max: -34.729993 } },
    "New Zealand": { lat: { min: -46.641235, max: -34.450662 }, lng: { min: 166.509144, max: 178.517094 } },
    "the United States with Alaska": { lat: { min: 18.91619, max: 71.357764 }, lng: { min: -171.791111, max: -66.96466 } },
    Russia: { lat: { min: 41.151416, max: 81.2504 }, lng: { min: -180, max: 180 } },
    Fiji: { lat: { min: -18.28799, max: -16.020882 }, lng: { min: -180, max: 180 } },
  };
  // The sheet's aspect, as dotted-map sizes it: the box's Mercator width over its height.
  const mercatorY = (lat) => Math.log(Math.tan(Math.PI / 4 + (lat * Math.PI) / 360));
  const mercatorAspect = (box) => (((box.lng.max - box.lng.min) * Math.PI) / 180) / (mercatorY(box.lat.max) - mercatorY(box.lat.min));
  // Points along the box's edges, about a degree apart.
  const edges = (box) => {
    const along = (min, max) => {
      const steps = Math.max(1, Math.ceil(max - min));
      return Array.from({ length: steps + 1 }, (_, i) => min + ((max - min) * i) / steps);
    };
    return [
      ...along(box.lng.min, box.lng.max).flatMap((lng) => [[lng, box.lat.min], [lng, box.lat.max]]),
      ...along(box.lat.min, box.lat.max).flatMap((lat) => [[box.lng.min, lat], [box.lng.max, lat]]),
    ];
  };
  // Where the box's edges land on the flat sheet, drawn as custom dots.
  const frame = (box, projection) => {
    createWorldTexture(collection([]), {
      ocean: "transparent",
      strokeVisible: false,
      region: box,
      aspect: mercatorAspect(box),
      projection,
      custom: collection(edges(box).map((coordinates) => point(coordinates))),
      customVisible: true,
      customColor: OVERLAYS.customColor,
    });
    const { ctx, ops } = recorded;
    const points = ops.filter((op) => op.style === OVERLAYS.customColor).map((op) => op.path[0][0]);
    const xs = points.map(([x]) => x);
    const ys = points.map(([, y]) => y);
    return {
      width: ctx.canvas.width,
      height: ctx.canvas.height,
      minX: Math.min(...xs),
      maxX: Math.max(...xs),
      minY: Math.min(...ys),
      maxY: Math.max(...ys),
    };
  };
  const expectFramed = ({ width, height, minX, maxX, minY, maxY }) => {
    // The box stays on the sheet and spans it along at least one side, as
    // fitExtent leaves any slack on the other side.
    expect(minX).toBeGreaterThan(-1);
    expect(minY).toBeGreaterThan(-1);
    expect(maxX).toBeLessThan(width + 1);
    expect(maxY).toBeLessThan(height + 1);
    expect(Math.max((maxX - minX) / width, (maxY - minY) / height)).toBeGreaterThan(0.99);
  };

  it.each(Object.entries(boxes))("fits the flat map to %s's box, as dotted-map frames its dots", (_, box) => {
    expectFramed(frame(box, "mercator"));
  });

  it.each(["equalEarth", "naturalEarth1", "winkel3", "robinson"])("fits the flat map to a picked country's box in %s too", (projection) => {
    expectFramed(frame(boxes.Brazil, projection));
  });
});

describe("createWorldTexture flat framing of a US state", () => {
  it("frames a picked state's flat map like its dots, which carry no region", () => {
    // A state shaped like Colorado's box, in 1 degree steps. Clockwise.
    const steps = (from, to) => Array.from({ length: Math.abs(to - from) + 1 }, (_, i) => from + Math.sign(to - from) * i);
    const ring = [
      ...steps(-109, -102).map((lng) => [lng, 41]),
      ...steps(41, 37).map((lat) => [-102, lat]),
      ...steps(-102, -109).map((lng) => [lng, 37]),
      ...steps(37, 41).map((lat) => [-109, lat]),
    ];
    const state = collection([{ type: "Feature", properties: {}, geometry: { type: "Polygon", coordinates: [ring] } }]);
    const { points: dots } = createStateMapData(state, 100, "Circle");

    createWorldTexture(state, { ocean: "transparent", fill: LAND, strokeVisible: false, usState: true, aspect: MAP_WIDTH / MAP_HEIGHT });
    const { ctx, ops } = recorded;
    // The land in the dots' units, a sheet MAP_WIDTH wide.
    const scale = MAP_WIDTH / ctx.canvas.width;
    const land = ops.filter((op) => op.style === LAND).flatMap((op) => op.path.flat()).map(([x, y]) => [x * scale, y * scale]);
    const box = (list) => ({
      minX: Math.min(...list.map(([x]) => x)),
      maxX: Math.max(...list.map(([x]) => x)),
      minY: Math.min(...list.map(([, y]) => y)),
      maxY: Math.max(...list.map(([, y]) => y)),
    });
    const landBox = box(land);
    const dotBox = box(dots.map(({ x, y }) => [x, y]));
    // Within the dots' margin, spanning it along one side, and around the dots
    // with at most a dot step to spare (6 at this density).
    expect(landBox.minX).toBeGreaterThan(STATE_MAP_PADDING - 1);
    expect(landBox.minY).toBeGreaterThan(STATE_MAP_PADDING - 1);
    expect(landBox.maxX).toBeLessThan(MAP_WIDTH - STATE_MAP_PADDING + 1);
    expect(landBox.maxY).toBeLessThan(MAP_HEIGHT - STATE_MAP_PADDING + 1);
    expect(Math.max(
      (landBox.maxX - landBox.minX) / (MAP_WIDTH - 2 * STATE_MAP_PADDING),
      (landBox.maxY - landBox.minY) / (MAP_HEIGHT - 2 * STATE_MAP_PADDING),
    )).toBeGreaterThan(0.99);
    [
      dotBox.minX - landBox.minX,
      landBox.maxX - dotBox.maxX,
      dotBox.minY - landBox.minY,
      landBox.maxY - dotBox.maxY,
    ].forEach((gap) => {
      expect(gap).toBeGreaterThan(-1);
      expect(gap).toBeLessThan(7);
    });
  });
});

describe("createWorldTexture colors", () => {
  const styles = (options) => {
    createWorldTexture(land, { ocean: "transparent", fill: "#373737", stroke: "#ff3700", strokeWidth: 1, ...options });
    return recorded.ops.map((op) => op.style);
  };

  it("draws old colors as they are", () => {
    expect(styles({})).toEqual(expect.arrayContaining(["#373737", "#ff3700"]));
  });

  it("draws hex colors as the old colors the texture's sRGB decode reads back as them", () => {
    const drawn = styles({ hexColors: true });
    expect(drawn).toEqual(expect.arrayContaining(["#808080", "#ff8000"]));
    expect(drawn).not.toContain("#373737");
  });
});
