// @vitest-environment node
import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { sitemapEntries } from "../scripts/generate-sitemap.js";

// Builds the launch site into a throwaway folder and reads what crawlers
// that don't run JS get: before prerender wrote static bodies, all 31 pages
// shipped the same empty #root, and their only H1 sat inside <noscript>.

const root = fileURLToPath(new URL("..", import.meta.url));
const SITE = "https://globestudio.app";
let outDir;

const run = (args, env = {}) => {
  // Drop vitest's NODE_ENV=test and VITEST flags so this is a real
  // production build, and pin launch mode (1 = teaser).
  const { NODE_ENV: _mode, VITEST: _vitest, ...base } = process.env;
  execFileSync(process.execPath, args, {
    cwd: root,
    env: { ...base, NODE_ENV: "production", VITE_TEASER: "0", ...env },
    stdio: "pipe",
  });
};

const read = (path) =>
  readFileSync(join(outDir, path === "/" ? "index.html" : `${path.slice(1)}/index.html`), "utf8");

const staticBody = (html) => html.match(/<div id="gs-static">([\s\S]*)<\/div><\/div>\s*<\/body>/)?.[1] ?? "";

const words = (html) =>
  staticBody(html)
    .replace(/<(script|style|noscript)\b[\s\S]*?<\/\1>/g, " ")
    .replace(/<[^>]+>/g, " ")
    .split(/\s+/)
    .filter(Boolean);

const h1s = (html) => [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/g)].map((m) => m[1].replace(/<[^>]+>/g, ""));

beforeAll(() => {
  outDir = mkdtempSync(join(tmpdir(), "globestudio-prerender-"));
  run(["node_modules/vite/bin/vite.js", "build", "--outDir", outDir, "--emptyOutDir", "--logLevel", "error"]);
  run(["scripts/prerender.js"], { PRERENDER_DIST_DIR: outDir });
}, 180_000);

afterAll(() => {
  if (outDir) rmSync(outDir, { recursive: true, force: true });
});

describe("prerendered static bodies", () => {
  const paths = sitemapEntries().map(({ loc }) => loc.slice(SITE.length));

  it("give every sitemap page one H1 of its own", () => {
    const headings = paths.map((path) => {
      const found = h1s(read(path));
      expect(found, path).toHaveLength(1);
      return found[0];
    });
    expect(new Set(headings).size).toBe(paths.length);
  });

  it("give every sitemap page more than 100 words of its own content", () => {
    for (const path of paths) expect(words(read(path)).length, path).toBeGreaterThan(100);
  });

  it("put the look's copy and links to other looks on a look page", () => {
    const html = read("/looks/halftone");
    expect(staticBody(html)).toContain("Halftone is the print-aesthetic preset.");
    expect(staticBody(html)).toContain('href="/gallery"');
    expect(staticBody(html)).toContain('href="/looks/risograph"');
  });

  it("put the comparison table and FAQ on a compare page", () => {
    const body = staticBody(read("/compare/cobe"));
    expect(body).toContain("<table");
    expect(body).toContain("Is Globestudio a cobe alternative?");
  });

  it("link every other sitemap page from the home page's raw HTML", () => {
    const body = staticBody(read("/"));
    for (const path of paths.filter((path) => path !== "/")) expect(body, path).toContain(`href="${path}"`);
  });

  it("hide the static body once JS runs and keep the noscript notice", () => {
    const html = read("/docs");
    expect(html).toContain('document.documentElement.setAttribute("data-js", "")');
    expect(html).toContain("html[data-js] #gs-static { display: none; }");
    expect(staticBody(html)).toContain("<noscript>");
    expect(staticBody(html)).not.toMatch(/<(svg|img|iframe|button|canvas)\b/);
  });

  it("writes a noindexed 404 page with the not-found copy", () => {
    const html = readFileSync(join(outDir, "404.html"), "utf8");
    expect(html).toContain('<meta name="robots" content="noindex" />');
    expect(h1s(html)).toEqual(["Page not found"]);
  });

  it("leaves the /embed shell exactly as vite built it", () => {
    const html = read("/embed");
    expect(html).not.toContain("gs-static");
    expect(html).not.toContain("data-js");
  });
});
