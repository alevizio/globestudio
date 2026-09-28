import { beforeAll, describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LooksBar } from "./looks-bar.jsx";
import { lookPresets } from "../data/look-presets.js";

beforeAll(() => {
  // The bar watches its own width for the edge fades; jsdom lacks it.
  if (!window.ResizeObserver) {
    window.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
});

describe("LooksBar", () => {
  it("renders one chip per preset", () => {
    render(<LooksBar onPick={() => {}} />);
    expect(screen.getAllByRole("button")).toHaveLength(lookPresets.length);
  });

  it("draws each chip from the downsampled thumbs, sized and ready before scroll", () => {
    const { container } = render(<LooksBar onPick={() => {}} />);
    const images = container.querySelectorAll(".looks-chip-thumb img");
    expect(images).toHaveLength(lookPresets.length);
    images.forEach((img, index) => {
      const { id } = lookPresets[index];
      expect(img.getAttribute("src")).toBe(`/looks/thumbs/${id}@2x.webp`);
      expect(img.getAttribute("srcset")).toBe(
        `/looks/thumbs/${id}@2x.webp 56w, /looks/thumbs/${id}@3x.webp 84w`,
      );
      expect(img.getAttribute("sizes")).toBe("28px");
      expect(img.getAttribute("width")).toBe("28");
      expect(img.getAttribute("height")).toBe("28");
      expect(img.getAttribute("decoding")).toBe("async");
      // Lazy chips waited until scrolled into the bar, then popped in.
      expect(img.hasAttribute("loading")).toBe(false);
    });
  });

  it("applies the picked preset", async () => {
    const onPick = vi.fn();
    const user = userEvent.setup();
    render(<LooksBar onPick={onPick} />);
    await user.click(screen.getByRole("button", { name: "Risograph" }));
    expect(onPick).toHaveBeenCalledWith(lookPresets.find(({ id }) => id === "risograph"));
  });
});
