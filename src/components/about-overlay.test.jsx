import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AboutOverlay } from "./about-overlay.jsx";
import { lookPresets } from "../data/look-presets.js";

describe("AboutOverlay", () => {
  it("counts the looks that actually ship and scopes the projection claim", () => {
    render(<AboutOverlay open={true} onClose={() => {}} />);
    const blurb = screen.getByText(/shader looks/).textContent;
    expect(blurb).toContain(`${lookPresets.length} shader looks`);
    expect(blurb).toContain("5 flat projections; dotted maps use Mercator");
  });
});
