import { beforeAll, describe, expect, it } from "vitest";
import { render } from "@testing-library/react";
import { DocsPage } from "./docs-page.jsx";
import { lookPresets } from "../data/look-presets.js";

beforeAll(() => {
  // The page nav hides its brand once the hero scrolls away; jsdom lacks
  // the observer it uses.
  if (!window.IntersectionObserver) {
    window.IntersectionObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
});

describe("DocsPage", () => {
  it("draws the preset catalog from the downsampled thumbs at 44 px", () => {
    const { container } = render(<DocsPage />);
    const images = container.querySelectorAll(".docs-preset-thumb img");
    expect(images).toHaveLength(lookPresets.length);
    images.forEach((img, index) => {
      const { id } = lookPresets[index];
      expect(img.getAttribute("src")).toBe(`/looks/thumbs/${id}@2x.webp`);
      expect(img.getAttribute("srcset")).toBe(
        `/looks/thumbs/${id}@2x.webp 56w, /looks/thumbs/${id}@3x.webp 84w`,
      );
      expect(img.getAttribute("sizes")).toBe("44px");
      expect(img.getAttribute("width")).toBe("44");
      expect(img.getAttribute("height")).toBe("44");
    });
  });

  it("shows a lat,lng,value line and the studio's example under Share URLs", () => {
    const { container } = render(<DocsPage />);
    const share = container.querySelector("#share").closest("section");
    const codes = [...share.querySelectorAll("code")].map((node) => node.textContent);
    expect(codes).toContain("lat,lng,value");
    expect(codes).toContain("35.68,139.69,37");
    expect(share.textContent).toContain("Try an example");
  });
});
