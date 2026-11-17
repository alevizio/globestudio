// The lost context's client_error message: when the canvas lost it, in a
// few spans, whether the tab was in view, and the look. The weekly digest
// reads these spans back, so they are pinned here.

import { describe, expect, it } from "vitest";
import { contextLostMessage, lostAfterLabel } from "./globe-background.jsx";

describe("lostAfterLabel", () => {
  it.each([
    [0, "in the first 10 s"],
    [9_999, "in the first 10 s"],
    [10_000, "10 to 60 s in"],
    [59_999, "10 to 60 s in"],
    [60_000, "1 to 10 min in"],
    [599_999, "1 to 10 min in"],
    [600_000, "after 10 min"],
    [86_400_000, "after 10 min"],
  ])("%i ms is %s", (ms, label) => {
    expect(lostAfterLabel(ms)).toBe(label);
  });
});

describe("contextLostMessage", () => {
  it("says when, whether the tab was in view, and the look", () => {
    expect(contextLostMessage({ again: false, elapsedMs: 3_000, hidden: false, lookId: "halftone" })).toBe(
      "context lost in the first 10 s, tab in view, look halftone",
    );
  });

  it("marks a loss on a canvas built after an earlier one, and a hidden tab", () => {
    expect(contextLostMessage({ again: true, elapsedMs: 120_000, hidden: true, lookId: "default" })).toBe(
      "context lost again 1 to 10 min in, tab hidden, look default",
    );
  });

  it("leaves the look out when none is on screen", () => {
    expect(contextLostMessage({ again: false, elapsedMs: 700_000, hidden: false, lookId: null })).toBe(
      "context lost after 10 min, tab in view",
    );
  });

  it("starts with \"context lost\", which the digest filters on", () => {
    for (const again of [false, true]) {
      expect(contextLostMessage({ again, elapsedMs: 0, hidden: false, lookId: "metal" })).toMatch(/^context lost/);
    }
  });
});
