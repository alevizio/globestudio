import { act, render } from "@testing-library/react";
import { useRef } from "react";
import { describe, expect, it, vi } from "vitest";
import { useTrackpadZoom } from "./use-trackpad-zoom.js";

const SHELL = { left: 0, top: 0, width: 1024, height: 768 };

// The app shell, wired as App.jsx wires it. `frame` is what the globe canvas
// reports while the map is drawn beside the open panel.
const Shell = ({ zoom, frame, setMapZoom, setMapOffset }) => {
  const mapZoomRef = useRef(zoom);
  const viewModeRef = useRef("flat");
  const canvasRef = useRef({ besidePanelFrame: () => frame });
  useTrackpadZoom({ mapZoomRef, viewModeRef, setMapZoom, setMapOffset, canvasRef });
  return <div className="app-shell" ref={(node) => node && (node.getBoundingClientRect = () => SHELL)} />;
};

// Where a point of the map lands on screen: the map's middle is the shell's
// middle moved by the frame's shift, and the offset and the zoom are in
// unframed px, which the frame scales (see utils/phone-frame.js).
const onScreen = ({ point, offset, zoom, frame: { scale = 1, shiftX = 0 } = {} }) =>
  SHELL.width / 2 + shiftX + scale * (offset.x + point * zoom);

// Scrolls the wheel over `pointerX` and returns how far the map point that
// was under the pointer has moved on screen.
const driftAfterWheel = ({ frame, pointerX }) => {
  const zoom = 0.8;
  const offset = { x: 12, y: 0 };
  const setMapZoom = vi.fn();
  const setMapOffset = vi.fn();
  const { container } = render(<Shell zoom={zoom} frame={frame} setMapZoom={setMapZoom} setMapOffset={setMapOffset} />);
  // The map point under the pointer before the zoom.
  const { scale = 1, shiftX = 0 } = frame ?? {};
  const point = ((pointerX - SHELL.width / 2 - shiftX) / scale - offset.x) / zoom;
  const wheel = new WheelEvent("wheel", { bubbles: true, cancelable: true, clientX: pointerX, clientY: 300, deltaY: -200 });
  act(() => {
    container.firstChild.dispatchEvent(wheel);
  });
  const nextZoom = setMapZoom.mock.calls[0][0];
  const nextOffset = setMapOffset.mock.calls[0][0](offset);
  expect(nextZoom).toBeGreaterThan(zoom);
  return onScreen({ point, offset: nextOffset, zoom: nextZoom, frame }) - pointerX;
};

// To half a px: the zoom is stored rounded to three decimals.
describe("useTrackpadZoom, zooming the flat map with the wheel", () => {
  it("keeps the point under the pointer in place", () => {
    expect(driftAfterWheel({ frame: undefined, pointerX: 700 })).toBeCloseTo(0, 0);
  });

  it("keeps it in place when the map is drawn beside the open panel", () => {
    expect(driftAfterWheel({ frame: { scale: 0.8, shiftX: 207 }, pointerX: 700 })).toBeCloseTo(0, 0);
  });
});
