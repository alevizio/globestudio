import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";

// The first release of each package that fixes the security advisories
// reported against package-lock.json, one per major line in use (undici has
// a 6.x copy under @vercel/blob and a 7.x copy under jsdom). The MCP SDK
// here is the one the hosted server at /mcp runs. A lockfile refresh or a
// revert that brings back an older copy fails here.
const FLOORS = {
  undici: ["6.28.1", "7.29.1"],
  vite: ["8.0.16"],
  postcss: ["8.5.23"],
  vitest: ["4.1.11"],
  "@vitest/mocker": ["4.1.11"],
  fflate: ["0.7.5"],
  nanoid: ["3.3.18"],
  "@modelcontextprotocol/sdk": ["1.31.0"],
  "source-map-js": ["1.2.2"],
};

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const lock = JSON.parse(readFileSync(resolve(repoRoot, "package-lock.json"), "utf8"));

const parts = (version) => version.split(".").map(Number);
const atLeast = (have, floor) => {
  for (const [index, part] of have.entries()) if (part !== floor[index]) return part > floor[index];
  return true;
};
// At or above the floor of its own major line, or on a newer major than any.
const patched = (version, floors) => {
  const have = parts(version);
  const floor = floors.map(parts).find(([major]) => major === have[0]);
  return floor ? atLeast(have, floor) : floors.every((each) => have[0] > parts(each)[0]);
};

describe("package-lock.json", () => {
  for (const [name, floors] of Object.entries(FLOORS)) {
    it(`installs ${name} at a patched release`, () => {
      const copies = Object.entries(lock.packages).filter(([path]) => path.endsWith(`node_modules/${name}`));
      for (const [path, { version }] of copies) {
        expect(patched(version, floors), `${path} ${version}`).toBe(true);
      }
    });
  }
});
