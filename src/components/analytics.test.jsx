// @vitest-environment-options {"url": "https://globestudio.app/"}
// (analytics is off on localhost, jsdom's default host)
import { beforeEach, describe, expect, it, vi } from "vitest";
import { inject, track as vercelTrack } from "@vercel/analytics";
import { isReloadingForStaleChunk } from "../utils/preload-recovery.js";
import { render } from "@testing-library/react";
import { Analytics, track, trackClientError } from "./analytics.jsx";

// inject() stands up the window.va queue like the real one does.
vi.mock("@vercel/analytics", () => ({
  track: vi.fn(),
  inject: vi.fn(() => {
    window.va = () => {};
  }),
}));

vi.mock("../utils/preload-recovery.js", () => ({ isReloadingForStaleChunk: vi.fn(() => false) }));

const settle = () => new Promise((resolve) => setTimeout(resolve, 10));

describe("trackClientError", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete window.va;
    window.history.replaceState(null, "", "/");
  });

  it("sends a client_error event with where and a message capped at 200 characters", async () => {
    trackClientError("root", new Error("x".repeat(500)));
    await vi.waitFor(() => expect(vercelTrack).toHaveBeenCalledTimes(1));
    const [name, properties] = vercelTrack.mock.calls[0];
    expect(name).toBe("client_error");
    expect(Object.keys(properties)).toEqual(["where", "msg"]);
    expect(properties.where).toBe("root");
    expect(properties.msg).toBe("x".repeat(200));
  });

  it("injects the analytics script before tracking when <Analytics /> never mounted", async () => {
    // A first-render crash unmounts <Analytics /> before its effect runs: no
    // window.va yet, so a bare track() would drop the event.
    trackClientError("root", new Error("Failed to fetch dynamically imported module"));
    await vi.waitFor(() => expect(vercelTrack).toHaveBeenCalledTimes(1));
    expect(inject).toHaveBeenCalledTimes(1);
    expect(inject).toHaveBeenCalledWith({ framework: "react" });
    expect(inject.mock.invocationCallOrder[0]).toBeLessThan(vercelTrack.mock.invocationCallOrder[0]);
  });

  it("does not inject a second script when analytics is already loaded", async () => {
    window.va = vi.fn();
    trackClientError("globe", new Error("boom"));
    await vi.waitFor(() => expect(vercelTrack).toHaveBeenCalledTimes(1));
    expect(inject).not.toHaveBeenCalled();
  });

  it("sends nothing and injects nothing on /embed", async () => {
    window.history.replaceState(null, "", "/embed?look=halftone");
    trackClientError("webgl", "context lost");
    trackClientError("embed", new Error("boom"));
    await settle();
    expect(inject).not.toHaveBeenCalled();
    expect(vercelTrack).not.toHaveBeenCalled();
    expect(window.va).toBeUndefined();
  });

  it("does not report a stale chunk that already triggered a reload", async () => {
    isReloadingForStaleChunk.mockReturnValueOnce(true);
    trackClientError("root", new Error("Failed to fetch dynamically imported module"));
    await settle();
    expect(inject).not.toHaveBeenCalled();
    expect(vercelTrack).not.toHaveBeenCalled();
  });

  it("sends nothing and injects nothing in the Figma plugin, as /privacy promises", async () => {
    window.history.replaceState(null, "", "/?plugin=figma&app=1");
    trackClientError("globe", new Error("boom"));
    track("preset_applied", { look: "halftone" });
    await settle();
    expect(inject).not.toHaveBeenCalled();
    expect(vercelTrack).not.toHaveBeenCalled();
    const { container } = render(<Analytics />);
    await settle();
    expect(container.innerHTML).toBe("");
  });

  it("sends nothing when the visitor opted out", async () => {
    window.localStorage.setItem("gs_optout", "true");
    trackClientError("webgl", "context lost");
    await settle();
    expect(inject).not.toHaveBeenCalled();
    expect(vercelTrack).not.toHaveBeenCalled();
  });
});
