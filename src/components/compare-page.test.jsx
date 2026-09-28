import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { ComparePage } from "./compare-page.jsx";

describe("ComparePage", () => {
  it("renders the comparison for a known slug", () => {
    render(<ComparePage slug="cobe" />);
    expect(screen.getByRole("heading", { level: 1, name: "Globestudio vs cobe" })).toBeTruthy();
  });
});
