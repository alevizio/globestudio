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

const T0 = 1_790_000_000_000;

describe("reloadOnceOnPreloadError", () => {
  it("reloads the first time a chunk fails to load", () => {
    const win = createWindow();
    expect(reloadOnceOnPreloadError(win, T0)).toBe(true);
    expect(win.location.reload).toHaveBeenCalledTimes(1);
  });

  it("does not reload again right after a reload, so a missing chunk can't loop", () => {
    const win = createWindow();
    reloadOnceOnPreloadError(win, T0);
    expect(reloadOnceOnPreloadError(win, T0 + 5_000)).toBe(false);
    expect(win.location.reload).toHaveBeenCalledTimes(1);
  });

  it("recovers again on a later deploy in the same tab", () => {
    const win = createWindow();
    reloadOnceOnPreloadError(win, T0);
    expect(reloadOnceOnPreloadError(win, T0 + 2 * 24 * 60 * 60 * 1000)).toBe(true);
    expect(win.location.reload).toHaveBeenCalledTimes(2);
  });

  it("does not reload when sessionStorage is blocked", () => {
    const win = {
      get sessionStorage() {
        throw new Error("SecurityError");
      },
      location: { reload: vi.fn() },
    };
    expect(reloadOnceOnPreloadError(win, T0)).toBe(false);
    expect(win.location.reload).not.toHaveBeenCalled();
  });

  it("flags the pending reload so the error it causes isn't reported", async () => {
    vi.resetModules();
    const recovery = await import("./preload-recovery.js");
    expect(recovery.isReloadingForStaleChunk()).toBe(false);
    recovery.reloadOnceOnPreloadError(createWindow(), T0);
    expect(recovery.isReloadingForStaleChunk()).toBe(true);
  });
});
