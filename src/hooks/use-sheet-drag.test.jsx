import { act, fireEvent, render } from "@testing-library/react";
import { useRef, useState } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resolveSheetSnap, useSheetDrag } from "./use-sheet-drag.js";

// A sheet like App.jsx's: a rail with a grabber and a list. Counts its own
// renders so the tests can check that a drag stays out of React.
let renders = 0;
const Sheet = ({ initialCollapsed = false }) => {
  renders += 1;
  const railRef = useRef(null);
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const { handleProps } = useSheetDrag({ railRef, panelCollapsed: collapsed, setPanelCollapsed: setCollapsed });
  return (
    <section ref={railRef} data-testid="rail" className={`control-rail ${collapsed ? "is-collapsed" : ""}`}>
      <button type="button" className="mobile-drag-handle" {...handleProps}>
        grab
      </button>
      <div data-testid="row">row</div>
      <input data-testid="slider" type="range" />
    </section>
  );
};

let now = 0;
let frames = [];
const flushFrames = () => {
  const pending = frames;
  frames = [];
  pending.forEach((callback) => callback(now));
};

beforeEach(() => {
  renders = 0;
  now = 1000;
  frames = [];
  vi.spyOn(performance, "now").mockImplementation(() => now);
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
    frames.push(callback);
    return frames.length;
  });
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation(() => {
    frames = [];
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

// jsdom has no Touch constructor, so touches ride on a plain Event.
const touch = (target, type, x, y) => {
  const event = new Event(type, { bubbles: true, cancelable: true });
  const point = { clientX: x, clientY: y };
  const list = type === "touchend" || type === "touchcancel" ? [] : [point];
  Object.defineProperty(event, "touches", { value: list });
  Object.defineProperty(event, "changedTouches", { value: [point] });
  act(() => {
    target.dispatchEvent(event);
  });
  return event;
};

// Moves a touch in `steps` equal parts, `stepMs` apart, and releases it.
const swipe = (target, dy, { steps = 10, stepMs = 30 } = {}) => {
  touch(target, "touchstart", 50, 300);
  const moves = [];
  for (let i = 1; i <= steps; i += 1) {
    now += stepMs;
    moves.push(touch(target, "touchmove", 50, 300 + (dy * i) / steps));
  }
  touch(target, "touchend", 50, 300 + dy);
  return moves;
};

const offset = (rail) => rail.style.getPropertyValue("--drag-offset");

describe("resolveSheetSnap", () => {
  it("follows a flick whatever the distance", () => {
    expect(resolveSheetSnap({ wasCollapsed: false, delta: 10, velocity: 0.8 })).toBe(true);
    expect(resolveSheetSnap({ wasCollapsed: true, delta: -10, velocity: -0.8 })).toBe(false);
  });

  it("goes by distance when the release is slow", () => {
    expect(resolveSheetSnap({ wasCollapsed: false, delta: 40, velocity: 0.1 })).toBe(false);
    expect(resolveSheetSnap({ wasCollapsed: false, delta: 90, velocity: 0.1 })).toBe(true);
    expect(resolveSheetSnap({ wasCollapsed: true, delta: -40, velocity: 0 })).toBe(true);
    expect(resolveSheetSnap({ wasCollapsed: true, delta: -90, velocity: 0 })).toBe(false);
  });

  it("lets a flick against the drag win", () => {
    expect(resolveSheetSnap({ wasCollapsed: false, delta: 200, velocity: -0.9 })).toBe(false);
  });
});

describe("useSheetDrag", () => {
  it("drags with the mouse without re-rendering and snaps closed on release", () => {
    const { getByTestId, getByRole } = render(<Sheet />);
    const rail = getByTestId("rail");
    // jsdom lays nothing out: give the sheet the iPhone SE open height.
    Object.defineProperty(rail, "offsetHeight", { value: 547 });
    rail.style.setProperty("--sheet-peek", "200px");
    const grabber = getByRole("button", { name: "grab" });
    const before = renders;
    fireEvent.pointerDown(grabber, { pointerId: 1, pointerType: "mouse", button: 0, clientY: 100 });
    for (let i = 1; i <= 20; i += 1) {
      now += 30;
      fireEvent.pointerMove(grabber, { pointerId: 1, pointerType: "mouse", clientY: 100 + i * 6 });
    }
    act(flushFrames);
    expect(offset(rail)).toBe("120px");
    expect(rail.classList.contains("is-dragging")).toBe(true);
    expect(renders).toBe(before);
    fireEvent.pointerUp(grabber, { pointerId: 1, pointerType: "mouse", clientY: 220 });
    expect(rail.classList.contains("is-collapsed")).toBe(true);
    expect(rail.classList.contains("is-dragging")).toBe(false);
    expect(offset(rail)).toBe("0px");
    // The click the browser sends after the drag must not toggle it back.
    fireEvent.click(grabber);
    expect(rail.classList.contains("is-collapsed")).toBe(true);
  });

  it("ignores a hover over the grabber with no button pressed", () => {
    const { getByTestId, getByRole } = render(<Sheet />);
    const grabber = getByRole("button", { name: "grab" });
    fireEvent.pointerDown(grabber, { pointerId: 1, pointerType: "mouse", button: 0, clientY: 470 });
    fireEvent.pointerUp(grabber, { pointerId: 1, pointerType: "mouse", clientY: 470 });
    fireEvent.pointerMove(grabber, { pointerId: 1, pointerType: "mouse", clientY: 120 });
    act(flushFrames);
    expect(offset(getByTestId("rail"))).toBe("0px");
  });

  it("toggles on a tap or click of the grabber", () => {
    const { getByTestId, getByRole } = render(<Sheet />);
    const rail = getByTestId("rail");
    fireEvent.click(getByRole("button", { name: "grab" }));
    expect(rail.classList.contains("is-collapsed")).toBe(true);
    now += 1000;
    fireEvent.click(getByRole("button", { name: "grab" }));
    expect(rail.classList.contains("is-collapsed")).toBe(false);
  });

  it("drags the open sheet down from the list while it is scrolled to the top", () => {
    const { getByTestId } = render(<Sheet />);
    const rail = getByTestId("rail");
    const moves = swipe(getByTestId("row"), 150);
    expect(moves.every((event) => event.defaultPrevented)).toBe(true);
    expect(rail.classList.contains("is-collapsed")).toBe(true);
  });

  it("leaves a downward swipe to the list once it is scrolled", () => {
    const { getByTestId } = render(<Sheet />);
    const rail = getByTestId("rail");
    rail.scrollTop = 120;
    const moves = swipe(getByTestId("row"), 150);
    act(flushFrames);
    expect(moves.some((event) => event.defaultPrevented)).toBe(false);
    expect(rail.classList.contains("is-collapsed")).toBe(false);
    expect(offset(rail)).toBe("");
  });

  it("leaves an upward swipe on the open list to the list", () => {
    const { getByTestId } = render(<Sheet />);
    const moves = swipe(getByTestId("row"), -150);
    expect(moves.some((event) => event.defaultPrevented)).toBe(false);
    expect(getByTestId("rail").classList.contains("is-collapsed")).toBe(false);
  });

  it("opens the peek from a vertical swipe anywhere on it", () => {
    const { getByTestId } = render(<Sheet initialCollapsed />);
    const moves = swipe(getByTestId("row"), -150);
    expect(moves.every((event) => event.defaultPrevented)).toBe(true);
    expect(getByTestId("rail").classList.contains("is-collapsed")).toBe(false);
  });

  it("closes on a short flick and stays open after a short slow drag", () => {
    const { getByTestId, getByRole } = render(<Sheet />);
    const rail = getByTestId("rail");
    const grabber = getByRole("button", { name: "grab" });
    swipe(grabber, 40, { steps: 20, stepMs: 20 });
    expect(rail.classList.contains("is-collapsed")).toBe(false);
    swipe(grabber, 40, { steps: 3, stepMs: 12 });
    expect(rail.classList.contains("is-collapsed")).toBe(true);
  });

  it("does not claim a swipe that starts on a slider", () => {
    const { getByTestId } = render(<Sheet />);
    const moves = swipe(getByTestId("slider"), 150);
    expect(moves.some((event) => event.defaultPrevented)).toBe(false);
    expect(getByTestId("rail").classList.contains("is-collapsed")).toBe(false);
  });
});
