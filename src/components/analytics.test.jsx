// @vitest-environment-options {"url": "https://globestudio.app/"}
// (analytics is off on localhost, jsdom's default host)
import { describe, expect, it, vi } from "vitest";
import { track as vercelTrack } from "@vercel/analytics";
import { trackClientError } from "./analytics.jsx";

vi.mock("@vercel/analytics", () => ({ track: vi.fn() }));

describe("trackClientError", () => {
  it("sends a client_error event with where and a message capped at 200 characters", async () => {
    trackClientError("root", new Error("x".repeat(500)));
    await vi.waitFor(() => expect(vercelTrack).toHaveBeenCalledTimes(1));
    const [name, properties] = vercelTrack.mock.calls[0];
    expect(name).toBe("client_error");
    expect(Object.keys(properties)).toEqual(["where", "msg"]);
    expect(properties.where).toBe("root");
    expect(properties.msg).toBe("x".repeat(200));
  });

  it("sends nothing when the visitor opted out", async () => {
    vercelTrack.mockClear();
    window.localStorage.setItem("gs_optout", "true");
    trackClientError("webgl", "context lost");
    await new Promise((resolve) => setTimeout(resolve, 10));
    expect(vercelTrack).not.toHaveBeenCalled();
  });
});
