import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
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
    clip: () => {
      clips = [...clips, path];
    },
    createLinearGradient: () => ({ addColorStop: () => {} }),
  };
  return { ctx, ops };
};

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
const cities = collection([point([-60, -20], 1e6), point([-47, -8], 5e5), point([31.2, 30], 1.5e7)]);
const custom = collection([point([-62, -18]), line([[2, 48], [13, 52]]), point([100, 30])]);
const region = { lat: { min: -35, max: -5 }, lng: { min: -75, max: -45 } };

let recorded;
beforeEach(() => {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(function getContext() {
    recorded = recordingContext(this);
    return recorded.ctx;
  });
});
afterEach(() => vi.restoreAllMocks());

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
  return {
    offLand: shown.filter((p) => !inside(p, landPath)),
    onLand: shown.filter((p) => inside(p, landPath)),
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

  it("draws every overlay for the world", () => {
    const { offLand } = draw({});
    expect(offLand.length).toBeGreaterThan(0);
  });
});
