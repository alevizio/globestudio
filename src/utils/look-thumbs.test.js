import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { lookPresets } from "../data/look-presets.js";
import { LOOK_THUMB_WIDTHS, lookThumbProps } from "./look-thumbs.js";

const thumbsDir = resolve(dirname(fileURLToPath(import.meta.url)), "../../public/looks/thumbs");
const stylesPath = resolve(dirname(fileURLToPath(import.meta.url)), "../styles.css");

// Lossless WebP (VP8L) keeps the 14-bit width and height, minus one, right
// after the 0x2f signature byte at offset 20.
const readWebpSize = (file) => {
  const bytes = readFileSync(file);
  expect(bytes.toString("ascii", 0, 4)).toBe("RIFF");
  expect(bytes.toString("ascii", 8, 12)).toBe("WEBP");
  expect(bytes.toString("ascii", 12, 16)).toBe("VP8L");
  expect(bytes[20]).toBe(0x2f);
  const [b0, b1, b2, b3] = bytes.subarray(21, 25);
  return {
    width: 1 + (((b1 & 0x3f) << 8) | b0),
    height: 1 + (((b3 & 0x0f) << 10) | (b2 << 2) | ((b1 & 0xc0) >> 6)),
  };
};

describe("look thumbnails", () => {
  it("has a lossless thumb on disk at every density for every preset", () => {
    // A missing file means `npm run thumbs:generate` was not re-run after a
    // preset was added. The chip would fall back to an empty square.
    for (const preset of lookPresets) {
      for (const [density, width] of Object.entries(LOOK_THUMB_WIDTHS)) {
        const file = join(thumbsDir, `${preset.id}@${density}.webp`);
        expect(readWebpSize(file), `${preset.id}@${density}`).toEqual({ width, height: width });
      }
    }
  });

  it("has a lossless 512 px gallery copy of every capture", () => {
    // gallery-page.jsx loads /looks/<id>.webp; a missing file hides the card.
    for (const preset of lookPresets) {
      const file = resolve(thumbsDir, "..", `${preset.id}.webp`);
      expect(readWebpSize(file), preset.id).toEqual({ width: 512, height: 512 });
    }
  });

  it("builds a width-described srcset the browser can pick from per slot size", () => {
    expect(lookThumbProps("halftone", "28px")).toEqual({
      src: "/looks/thumbs/halftone@2x.webp",
      srcSet: "/looks/thumbs/halftone@2x.webp 56w, /looks/thumbs/halftone@3x.webp 84w",
      sizes: "28px",
    });
  });

  it("lets the browser smooth the thumbs instead of pixelating them", () => {
    // image-rendering: pixelated on these slots is what turned the dot and
    // halftone looks into sparkle noise; the small thumbs need smoothing.
    const rules = [...readFileSync(stylesPath, "utf8").matchAll(/([^{}]+)\{([^{}]*)\}/g)].filter(
      ([, selector]) => /\.(looks-chip|command-palette|docs-preset)-thumb\b/.test(selector),
    );
    expect(rules.length).toBeGreaterThanOrEqual(6);
    for (const [, selector, body] of rules) {
      expect(body, selector.trim()).not.toMatch(/image-rendering/);
    }
  });
});
