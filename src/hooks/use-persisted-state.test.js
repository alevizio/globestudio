import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";
import {
  clearPersistedState,
  holdPersistedState,
  isPersistedStateHeld,
  releasePersistedState,
  usePersistedState,
} from "./use-persisted-state.js";

const PREFIX = "globestudio:";

describe("usePersistedState", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });
  afterEach(() => {
    window.localStorage.clear();
  });

  it("returns the default value when nothing is stored", () => {
    const { result } = renderHook(() => usePersistedState("density", 40));
    expect(result.current[0]).toBe(40);
  });

  it("reads the stored value on mount", () => {
    window.localStorage.setItem(`${PREFIX}density`, JSON.stringify(73));
    const { result } = renderHook(() => usePersistedState("density", 40));
    expect(result.current[0]).toBe(73);
  });

  it("writes updates to localStorage", () => {
    const { result } = renderHook(() => usePersistedState("density", 40));
    act(() => result.current[1](55));
    expect(window.localStorage.getItem(`${PREFIX}density`)).toBe("55");
  });

  it("supports object values via JSON serialization", () => {
    const { result } = renderHook(() => usePersistedState("settings", { a: 1 }));
    act(() => result.current[1]({ a: 2, b: 3 }));
    expect(JSON.parse(window.localStorage.getItem(`${PREFIX}settings`))).toEqual({ a: 2, b: 3 });
  });

  it("falls back to default when stored JSON is corrupt", () => {
    window.localStorage.setItem(`${PREFIX}density`, "not-json");
    const { result } = renderHook(() => usePersistedState("density", 40));
    expect(result.current[0]).toBe(40);
  });

  it("namespaces keys under 'globestudio:'", () => {
    const { result } = renderHook(() => usePersistedState("shape", "Circle"));
    act(() => result.current[1]("Hexagon"));
    expect(window.localStorage.getItem(`${PREFIX}shape`)).toBe(`"Hexagon"`);
  });
});

describe("clearPersistedState", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });
  afterEach(() => {
    window.localStorage.clear();
  });

  it("removes only globestudio-namespaced keys", () => {
    window.localStorage.setItem(`${PREFIX}density`, "40");
    window.localStorage.setItem(`${PREFIX}shape`, `"Circle"`);
    window.localStorage.setItem("other-app", "untouched");

    clearPersistedState();

    expect(window.localStorage.getItem(`${PREFIX}density`)).toBeNull();
    expect(window.localStorage.getItem(`${PREFIX}shape`)).toBeNull();
    expect(window.localStorage.getItem("other-app")).toBe("untouched");
  });
});

describe("holdPersistedState", () => {
  afterEach(() => {
    releasePersistedState();
    window.localStorage.clear();
  });

  it("doesn't save the keys it holds, and saves the rest", () => {
    const { result } = renderHook(() => ({
      density: usePersistedState("density", 40),
      theme: usePersistedState("uiTheme", "dark"),
    }));
    holdPersistedState(["density"]);
    act(() => {
      result.current.density[1](77);
      result.current.theme[1]("light");
    });
    expect(result.current.density[0]).toBe(77);
    expect(window.localStorage.getItem(`${PREFIX}density`)).toBeNull();
    expect(window.localStorage.getItem(`${PREFIX}uiTheme`)).toBe(`"light"`);
  });

  it("saves each held key as it stands on release, and every change after", () => {
    window.localStorage.setItem(`${PREFIX}shape`, `"Hexagon"`);
    const { result } = renderHook(() => ({
      density: usePersistedState("density", 40),
      shape: usePersistedState("shape", "Circle"),
    }));
    holdPersistedState(["density", "shape"]);
    act(() => result.current.density[1](77));
    act(() => result.current.shape[1]("Square"));
    expect(window.localStorage.getItem(`${PREFIX}shape`)).toBe(`"Hexagon"`);

    act(() => releasePersistedState());
    expect(isPersistedStateHeld()).toBe(false);
    expect(window.localStorage.getItem(`${PREFIX}density`)).toBe("77");
    expect(window.localStorage.getItem(`${PREFIX}shape`)).toBe(`"Square"`);
    act(() => result.current.density[1](20));
    expect(window.localStorage.getItem(`${PREFIX}density`)).toBe("20");
  });

  it("ends without saving what it held", () => {
    window.localStorage.setItem(`${PREFIX}density`, "55");
    const { result } = renderHook(() => usePersistedState("density", 40));
    const endHold = holdPersistedState(["density"]);
    act(() => result.current[1](77));
    endHold();
    expect(isPersistedStateHeld()).toBe(false);
    expect(window.localStorage.getItem(`${PREFIX}density`)).toBe("55");
  });
});
