// The first release of each package that fixes the security advisories
// reported against this package's lockfile. All of them come in through
// @modelcontextprotocol/sdk (hono, @hono/node-server, ajv's fast-uri,
// express-rate-limit's ip-address, express's body-parser and qs). A lockfile
// refresh or a revert that brings back an older copy fails here.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const FLOORS = {
  hono: "4.13.7",
  "@hono/node-server": "1.19.15",
  "fast-uri": "3.1.8",
  "ip-address": "10.7.1",
  qs: "6.16.0",
  "body-parser": "2.3.0",
};

const lock = JSON.parse(readFileSync(new URL("../package-lock.json", import.meta.url), "utf8"));

const parts = (version) => version.split(".").map(Number);
const atLeast = (have, floor) => {
  for (const [index, part] of have.entries()) if (part !== floor[index]) return part > floor[index];
  return true;
};

for (const [name, floor] of Object.entries(FLOORS)) {
  test(`the lockfile installs ${name} ${floor} or later`, () => {
    const copies = Object.entries(lock.packages).filter(([path]) => path.endsWith(`node_modules/${name}`));
    for (const [path, { version }] of copies) {
      assert.ok(atLeast(parts(version), parts(floor)), `${path} ${version}`);
    }
  });
}
