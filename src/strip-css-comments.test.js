import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { stripCssComments } from "../scripts/strip-css-comments.js";

const styles = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), "styles.css"), "utf8");

describe("stripCssComments", () => {
  it("drops a comment on its own line with its line break", () => {
    expect(stripCssComments("a{}\n  /* note */\nb{}\n")).toBe("a{}\nb{}\n");
    expect(stripCssComments("  /* two\n     lines */\n  b{}")).toBe("  b{}");
  });

  it("cuts an inline comment and keeps the declaration", () => {
    expect(stripCssComments("a {\n  min-height: 100vh; /* fallback */\n}")).toBe("a {\n  min-height: 100vh; \n}");
    expect(stripCssComments("a{b:c}/**/d{e:f}")).toBe("a{b:c}d{e:f}");
  });

  it("leaves comment markers inside quoted strings alone", () => {
    const css = `a{content:"/* kept */"}\nb{background:url('x/*y*/z.png')}\nc{content:"\\"/*"}`;
    expect(stripCssComments(css)).toBe(css);
  });

  it("keeps every rule of the app stylesheet", () => {
    const stripped = stripCssComments(styles);
    const withoutComments = styles
      .replace(/\/\*[\s\S]*?\*\//g, "")
      .split("\n")
      .filter((line) => line.trim() !== "");
    expect(stripped).not.toContain("/*");
    expect(stripped.split("\n").filter((line) => line.trim() !== "")).toEqual(withoutComments);
    expect(stripped.match(/-webkit-backdrop-filter:/g)?.length).toBe(
      styles.replace(/\/\*[\s\S]*?\*\//g, "").match(/-webkit-backdrop-filter:/g)?.length,
    );
  });
});
