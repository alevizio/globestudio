import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ComparePage } from "./compare-page.jsx";

describe("ComparePage", () => {
  it("renders the comparison for a known slug", () => {
    render(<ComparePage slug="cobe" />);
    expect(screen.getByRole("heading", { level: 1, name: "Globestudio vs cobe" })).toBeTruthy();
  });

  it("renders the noindexed 404 page for an unknown slug", () => {
    render(<ComparePage slug="nope" />);
    expect(screen.getByRole("heading", { level: 1, name: "Page not found" })).toBeTruthy();
    expect(document.head.querySelector('meta[name="robots"]').getAttribute("content")).toBe("noindex,follow");
  });
});
