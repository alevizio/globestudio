import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { PACKAGES_FLOOR, lookDotColor } from "../scripts/skill-references.js";
import { lookPresets } from "./data/look-presets.js";
import { STARTER_DEGIT, STARTER_PATH, STARTER_STACKBLITZ } from "./data/starter-react.js";
import { parseShareConfig } from "./utils/share-config.js";

// The React starter in examples/starter-react is copied out of the repo by
// degit and run on its own, so nothing here builds or tests it. This holds
// it to the facts it states instead: the package it needs, the looks it
// names, and the commands the docs give for it.

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const starter = resolve(repoRoot, STARTER_PATH);
const read = (path) => readFileSync(resolve(starter, path), "utf8");
const pkg = JSON.parse(read("package.json"));
const app = read("src/App.jsx");
const readme = read("README.md");

// The files the starter ships. No lockfile: a copy resolves the current
// versions on its first install.
const FILES = [".gitignore", "README.md", "index.html", "package.json", "vite.config.js", "src/App.jsx", "src/main.jsx", "src/styles.css"];

const parts = (version) => version.split(".").map(Number);
// Whether version is at least floor, both plain x.y.z.
const atLeast = (version, floor) => {
  const [a, b] = [parts(version), parts(floor)];
  const diff = a.findIndex((part, index) => part !== b[index]);
  return diff === -1 || a[diff] > b[diff];
};
// Whether a caret range takes version: same major, or same minor under 1.0.0.
const caretTakes = (range, version) => {
  const base = range.slice(1);
  const [major, minor] = parts(base);
  const [vMajor, vMinor] = parts(version);
  return atLeast(version, base) && vMajor === major && (major > 0 || vMinor === minor);
};

describe("examples/starter-react", () => {
  it("is a Vite and React project with dev, build and preview", () => {
    expect(pkg.private).toBe(true);
    expect(pkg.type).toBe("module");
    expect(pkg.scripts).toEqual({ dev: "vite", build: "vite build", preview: "vite preview" });
    expect(Object.keys(pkg.dependencies).sort()).toEqual(["@globestudio/react", "react", "react-dom"]);
    expect(Object.keys(pkg.devDependencies).sort()).toEqual(["@vitejs/plugin-react", "vite"]);
    for (const range of [...Object.values(pkg.dependencies), ...Object.values(pkg.devDependencies)]) {
      expect(range).toMatch(/^\^\d+\.\d+\.\d+$/);
    }
    expect(read("vite.config.js")).toContain("plugins: [react()]");
  });

  it("asks for a @globestudio/react with the look and config fix, and takes this repo's version", () => {
    const range = pkg.dependencies["@globestudio/react"];
    expect(atLeast(range.slice(1), PACKAGES_FLOOR)).toBe(true);
    const { version } = JSON.parse(readFileSync(resolve(repoRoot, "packages/react/package.json"), "utf8"));
    expect(caretTakes(range, version), `${range} should take ${version}`).toBe(true);
  });

  it("mounts App from index.html through src/main.jsx", () => {
    const html = read("index.html");
    expect(html).toContain('<div id="root"></div>');
    expect(html).toContain('<script type="module" src="/src/main.jsx"></script>');
    const main = read("src/main.jsx");
    expect(main).toContain('import { App } from "./App.jsx";');
    expect(main).toContain('import "./styles.css";');
    expect(main).toContain('createRoot(document.getElementById("root"))');
    expect(app).toContain("export const App = ");
  });

  it("names a shipped look and a title in every Globe, and a dot color only on a look that keeps it", () => {
    const globes = [...app.matchAll(/<Globe\b([\s\S]*?)\/>/g)].map(([, props]) => props);
    expect(globes.length).toBeGreaterThan(1);
    for (const props of globes) {
      const id = props.match(/look="([a-z]+)"/)?.[1];
      const look = lookPresets.find((preset) => preset.id === id);
      expect(look, props).toBeDefined();
      expect(props).toMatch(/title="[^"]+"/);
      const name = props.match(/config=\{JSON\.stringify\((\w+)\)\}/)?.[1];
      if (!name) continue;
      // The constant, an object literal with bare keys.
      const literal = app.match(new RegExp(`^const ${name} = (\\{.*\\});$`, "m"))[1];
      const json = literal.replace(/([{,]\s*)(\w+):/g, '$1"$2":');
      const { v, ...config } = JSON.parse(json);
      expect(v).toBe(2);
      // {} keeps only the keys given, as the embed reads a config.
      expect(parseShareConfig(`?c=${encodeURIComponent(json)}`, {})).toMatchObject(config);
      if ("dotColor" in config) expect(lookDotColor(look), id).toBe("kept");
    }
  });

  it("gives the three ways in that /docs and /integrations offer", () => {
    expect(STARTER_DEGIT).toBe("npx degit alevizio/globestudio/examples/starter-react my-globe");
    expect(STARTER_STACKBLITZ).toBe("https://stackblitz.com/github/alevizio/globestudio/tree/main/examples/starter-react");
    expect(readme).toContain(STARTER_DEGIT);
    expect(readme).toContain(`(${STARTER_STACKBLITZ})`);
    expect(readme).toContain("git clone --depth 1 https://github.com/alevizio/globestudio.git");
    expect(readme).toContain(`cd globestudio/${STARTER_PATH}`);
  });

  it("links only to full addresses, since degit copies the README out of the repo", () => {
    const targets = [...readme.matchAll(/\]\(([^)]+)\)/g)].map(([, target]) => target);
    expect(targets.length).toBeGreaterThan(0);
    for (const target of targets) expect(target).toMatch(/^https:\/\//);
  });

  it("keeps installs and builds out of git", () => {
    const ignored = read(".gitignore").split("\n");
    expect(ignored).toContain("node_modules");
    expect(ignored).toContain("dist");
  });

  it("ships its files with no em or en dashes", () => {
    for (const file of FILES) {
      expect(existsSync(resolve(starter, file)), file).toBe(true);
      expect(read(file), file).not.toMatch(/[\u2013\u2014]/);
    }
  });
});
