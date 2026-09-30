import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { AboutOverlay } from "./about-overlay.jsx";
import { lookPresets } from "../data/look-presets.js";
import { matchRoute } from "../utils/route-match.js";

describe("AboutOverlay", () => {
  it("counts the looks that actually ship and scopes the projection claim", () => {
    render(<AboutOverlay open={true} onClose={() => {}} />);
    const blurb = screen.getByText(/dotted maps use Mercator/).textContent;
    // "looks", not "shader looks": Default has no shader effect.
    expect(blurb).toContain(`with ${lookPresets.length} looks`);
    expect(blurb).not.toMatch(/shader looks/);
    expect(blurb).toContain("5 flat projections; dotted maps use Mercator");
  });

  it("links the site's pages from the studio, Gallery first", () => {
    // The panel has no link row, so this is how someone in the studio
    // reaches the rest of the site.
    render(<AboutOverlay open={true} onClose={() => {}} />);
    const internal = screen
      .getAllByRole("link")
      .filter((link) => link.getAttribute("href").startsWith("/"));
    expect(internal.map((link) => [link.textContent, link.getAttribute("href")])).toEqual([
      ["→Gallery", "/gallery"],
      ["→Docs", "/docs"],
      ["→Integrations", "/integrations"],
      ["→Examples", "/examples"],
      ["→Changelog", "/changelog"],
      ["→Press kit", "/brand"],
      ["→Privacy", "/privacy"],
    ]);
    for (const link of internal) {
      // Same tab, like every other internal link, and to a page that exists.
      expect(link.hasAttribute("target"), link.textContent).toBe(false);
      expect(matchRoute(link.getAttribute("href")).page, link.textContent).not.toMatch(/not-found|redirect/);
    }
  });
});
