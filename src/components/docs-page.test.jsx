import { beforeAll, describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
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

  it("points a new React project at the starter, by degit or StackBlitz", () => {
    render(<DocsPage />);
    const block = screen.getByText("degit", { selector: ".code-block-language" }).closest(".code-block");
    expect(block.querySelector("pre").textContent).toBe("npx degit@3.10.0 alevizio/globestudio/examples/starter-react my-globe");
    expect(within(block).getByRole("button", { name: "Copy code to clipboard" })).toBeTruthy();
    const link = screen.getByRole("link", { name: "open it in StackBlitz" });
    expect(link.getAttribute("href")).toBe("https://stackblitz.com/github/alevizio/globestudio/tree/main/examples/starter-react");
    expect(link.closest("p").textContent).toContain("start from the React starter: a Vite app that shows a globe with @globestudio/react.");
  });
});
