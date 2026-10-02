import { describe, expect, it } from "vitest";
import { besidePanelFrame, frameViewOffset } from "./phone-frame.js";

// Where a point of the unframed picture lands on screen under a view offset
// (PerspectiveCamera.setViewOffset draws the sub-rectangle x, y, w, h of the
// full picture over the whole canvas).
const onScreen = ([fullWidth, , x, y, w], point) => ({
  x: ((point.x - x) * fullWidth) / w,
  y: ((point.y - y) * fullWidth) / w,
});

describe("frameViewOffset", () => {
  it("keeps the phone frame's numbers when no horizontal shift is given", () => {
    expect(frameViewOffset({ width: 390, height: 844, scale: 0.8, shiftY: -100 })).toEqual([
      390,
      844,
      390 / 2 - 390 / 1.6,
      844 / 2 - (844 / 2 - 100) / 0.8,
      390 / 0.8,
      844 / 0.8,
    ]);
  });

  it("moves the middle of the picture right by shiftX px", () => {
    const view = frameViewOffset({ width: 1024, height: 600, scale: 0.9, shiftX: 207, shiftY: 0 });
    const middle = onScreen(view, { x: 512, y: 300 });
    expect(middle.x).toBeCloseTo(512 + 207, 6);
    expect(middle.y).toBeCloseTo(300, 6);
  });
});

describe("besidePanelFrame", () => {
  // The panel ends 414 px from the left edge (16 px inset + 398 px wide).
  const panelRight = 414;

  it("centres the picture on the space right of the panel", () => {
    const frame = besidePanelFrame({ width: 1024, panelRight, content: { width: 350, height: 350 }, globeProgress: 1 });
    const view = frameViewOffset({ width: 1024, height: 600, ...frame });
    expect(onScreen(view, { x: 512, y: 300 }).x).toBeCloseTo((panelRight + 1024) / 2, 6);
    expect(frame.shiftY).toBe(0);
  });

  it("keeps a globe that fits beside the panel at its size", () => {
    const frame = besidePanelFrame({ width: 1024, panelRight, content: { width: 350, height: 350 }, globeProgress: 1 });
    expect(frame.scale).toBe(1);
  });

  it("shrinks a picture wider than the space beside the panel to fit it", () => {
    const width = 700;
    const content = { width: 400, height: 400 };
    const globe = besidePanelFrame({ width, panelRight, content, globeProgress: 1 });
    expect(globe.scale).toBeLessThan(1);
    expect(content.width * globe.scale).toBeLessThan(width - panelRight);
    // The flat map sits closer to the edges than the globe, as on phones.
    const flat = besidePanelFrame({ width, panelRight, content, globeProgress: 0 });
    expect(flat.scale).toBeGreaterThan(globe.scale);
    expect(content.width * flat.scale).toBeLessThan(width - panelRight);
  });
});
