import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TakeoverFooter } from "./takeover-footer.jsx";
import { comparisonSlugs } from "../data/comparisons.js";

describe("TakeoverFooter", () => {
  it("links every site page and every compare page", () => {
    render(<TakeoverFooter />);
    const hrefs = screen.getAllByRole("link").map((link) => link.getAttribute("href"));
    for (const page of ["/gallery", "/docs", "/integrations", "/examples", "/changelog", "/brand", "/privacy", "/terms"]) {
      expect(hrefs).toContain(page);
    }
    expect(hrefs.filter((href) => href.startsWith("/compare/")).sort()).toEqual(
      comparisonSlugs.map((slug) => `/compare/${slug}`).sort(),
    );
  });
});
