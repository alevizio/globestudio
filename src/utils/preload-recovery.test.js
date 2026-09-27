import { describe, expect, it, vi } from "vitest";
import { reloadOnceOnPreloadError } from "./preload-recovery.js";

const createWindow = () => {
  const store = new Map();
  return {
    sessionStorage: {
      getItem: (key) => store.get(key) ?? null,
      setItem: (key, value) => store.set(key, String(value)),
    },
    location: { reload: vi.fn() },
  };
};

describe("reloadOnceOnPreloadError", () => {
  it("reloads the first time a chunk fails to load", () => {
    const win = createWindow();
    expect(reloadOnceOnPreloadError(win)).toBe(true);
    expect(win.location.reload).toHaveBeenCalledTimes(1);
  });

  it("does not reload again in the same session, so a missing chunk can't loop", () => {
    const win = createWindow();
    reloadOnceOnPreloadError(win);
    expect(reloadOnceOnPreloadError(win)).toBe(false);
    expect(win.location.reload).toHaveBeenCalledTimes(1);
  });

  it("does not reload when sessionStorage is blocked", () => {
    const win = {
      get sessionStorage() {
        throw new Error("SecurityError");
      },
      location: { reload: vi.fn() },
    };
    expect(reloadOnceOnPreloadError(win)).toBe(false);
    expect(win.location.reload).not.toHaveBeenCalled();
  });
});
