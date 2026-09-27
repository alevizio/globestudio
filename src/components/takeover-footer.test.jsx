import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TakeoverFooter } from "./takeover-footer.jsx";
import { comparisonSlugs } from "../data/comparisons.js";

describe("TakeoverFooter", () => {
  it("links the gallery and every compare page, which nothing else links", () => {
    render(<TakeoverFooter />);
    const hrefs = screen.getAllByRole("link").map((link) => link.getAttribute("href"));
    expect(hrefs).toContain("/gallery");
    expect(hrefs.filter((href) => href.startsWith("/compare/")).sort()).toEqual(
      comparisonSlugs.map((slug) => `/compare/${slug}`).sort(),
    );
  });
});
