import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { GalleryPage } from "./gallery-page.jsx";
import { lookPresets } from "../data/look-presets.js";

describe("GalleryPage", () => {
  it("shows every look as a WebP card, first row eager and the rest lazy", () => {
    render(<GalleryPage />);
    const images = screen.getAllByRole("img");
    expect(images).toHaveLength(lookPresets.length);
    images.forEach((image, index) => {
      expect(image.getAttribute("src")).toBe(`/looks/${lookPresets[index].id}.webp`);
      expect(image.getAttribute("loading")).toBe(index < 4 ? "eager" : "lazy");
    });
  });
});
