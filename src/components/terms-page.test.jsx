import { beforeAll, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { TermsPage } from "./terms-page.jsx";
import { matchRoute } from "../utils/route-match.js";

beforeAll(() => {
  // The page nav hides its brand once the header scrolls away; jsdom lacks
  // the observer it uses.
  if (!window.IntersectionObserver) {
    window.IntersectionObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
});

describe("TermsPage", () => {
  it("renders the terms with a dated lede and sets the page title", () => {
    render(<TermsPage />);
    expect(screen.getByRole("heading", { level: 1, name: "Terms of use" })).toBeTruthy();
    expect(screen.getByText(/Last updated 5 October 2026/)).toBeTruthy();
    expect(document.title).toBe("Terms of use · Globestudio");
  });

  it("links the privacy page and the footer, and gives GitHub issues as the only contact", () => {
    const { container } = render(<TermsPage />);
    expect(screen.getByRole("link", { name: "privacy page" }).getAttribute("href")).toBe("/privacy");
    expect(screen.getByRole("link", { name: "github.com/alevizio/globestudio/issues" }).getAttribute("href")).toBe(
      "https://github.com/alevizio/globestudio/issues",
    );
    const footer = screen.getByRole("navigation", { name: "Site links" });
    expect(footer.querySelector('a[href="/terms"]')).toBeTruthy();
    expect(container.textContent).not.toMatch(/\S+@\S+\.\w+/);
    expect(container.querySelector('a[href^="mailto:"]')).toBeNull();
  });

  it("is a page the router serves", () => {
    expect(matchRoute("/terms")).toEqual({ page: "terms" });
  });
});
