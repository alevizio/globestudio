// End-to-end contract test: spawns the built stdio server (dist/index.js),
// drives it over JSON-RPC, and decodes every ?c= it produces with the APP'S
// OWN parser (src/utils/share-config.js) — so a drift between what the MCP
// emits and what globestudio.app actually accepts fails here, not in prod.
//
// Run `npm run build` first; this tests dist/, not src/.

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";

// The app-contract parser. Dev-time import from the monorepo — the published
// package never ships or loads app source at runtime.
const { parseShareConfig } = await import(
  new URL("../../../src/utils/share-config.js", import.meta.url).href
);

const SERVER_PATH = fileURLToPath(new URL("../dist/index.js", import.meta.url));

let child;
let nextId = 1;
const pending = new Map();

const send = (message) => child.stdin.write(`${JSON.stringify(message)}\n`);

const request = (method, params) =>
  new Promise((resolve, reject) => {
    const id = nextId++;
    pending.set(id, { resolve, reject });
    send({ jsonrpc: "2.0", id, method, params });
    setTimeout(() => {
      if (pending.delete(id)) reject(new Error(`Timed out waiting for ${method}`));
    }, 10_000).unref();
  });

const callTool = async (name, args) => {
  const result = await request("tools/call", { name, arguments: args });
  const text = result.content?.[0]?.text ?? "";
  return { isError: result.isError === true, text, json: result.isError ? null : JSON.parse(text) };
};

before(async () => {
  child = spawn(process.execPath, [SERVER_PATH], { stdio: ["pipe", "pipe", "inherit"] });
  createInterface({ input: child.stdout }).on("line", (line) => {
    let message;
    try {
      message = JSON.parse(line);
    } catch {
      return;
    }
    const waiter = pending.get(message.id);
    if (!waiter) return;
    pending.delete(message.id);
    if (message.error) waiter.reject(new Error(message.error.message));
    else waiter.resolve(message.result);
  });
  await request("initialize", {
    protocolVersion: "2024-11-05",
    capabilities: {},
    clientInfo: { name: "stdio-contract-test", version: "0.0.0" },
  });
  send({ jsonrpc: "2.0", method: "notifications/initialized" });
});

after(() => {
  child?.kill();
});

test("tools/list advertises the app's real shape enum (no Cross, all 12)", async () => {
  const { tools } = await request("tools/list", {});
  const buildTool = tools.find((t) => t.name === "build_share_url");
  const shapes = buildTool.inputSchema.properties.shape.enum;
  // Mirrors src/config/constants.js dotShapeOptions minus "Custom".
  assert.deepEqual(shapes, [
    "Circle", "Hexagon", "Triangle", "Pentagon", "Square", "Voxel",
    "Particle Grid", "Diamond", "Star", "Plus", "Ring", "ASCII",
  ]);
});

test("build_share_url emits URLs the app's own parser accepts", async () => {
  const { json } = await callTool("build_share_url", {
    look: "halftone",
    selection: "jp",
    dotColor: "#3df4ff",
    background: "#101418",
    density: 40,
    shape: "Ring",
  });

  // share_url: /looks/<id> applies the preset, ?c= carries the overrides.
  const shareUrl = new URL(json.share_url);
  assert.equal(shareUrl.pathname, "/looks/halftone");
  const shareConfig = parseShareConfig(shareUrl.search);
  assert.deepEqual(shareConfig, {
    selection: "country:JPN",
    dotColor: "#3df4ff",
    background: "#101418",
    density: 40,
    shape: "Ring",
  });
  assert.ok(!("look" in shareConfig), "'look' is not a valid ?c= key");

  // embed_url: dedicated params (hex without '#'), ?c= only for shape.
  const embedUrl = new URL(json.embed_url);
  assert.equal(embedUrl.pathname, "/embed");
  assert.equal(embedUrl.searchParams.get("look"), "halftone");
  assert.equal(embedUrl.searchParams.get("selection"), "country:JPN");
  assert.equal(embedUrl.searchParams.get("dotColor"), "3df4ff");
  assert.equal(embedUrl.searchParams.get("background"), "101418");
  assert.equal(embedUrl.searchParams.get("density"), "40");
  assert.deepEqual(parseShareConfig(embedUrl.search), { shape: "Ring" });
});

test("build_share_url normalizes user-friendly selections", async () => {
  const cases = [
    ["jpn", "country:JPN"],
    ["JP", "country:JPN"],
    ["japan", "country:JPN"],
    ["country:jpn", "country:JPN"],
    ["europe", "continent:Europe"],
    ["western europe", "subregion:Western Europe"],
  ];
  for (const [input, expected] of cases) {
    const { json } = await callTool("build_share_url", { look: "vapor", selection: input });
    assert.equal(json.config.selection, expected, `selection "${input}"`);
    assert.equal(parseShareConfig(new URL(json.share_url).search)?.selection, expected);
  }
});

test("build_share_url rejects unknown selections", async () => {
  const { isError, text } = await callTool("build_share_url", { look: "vapor", selection: "atlantis" });
  assert.ok(isError);
  assert.match(text, /Unknown selection/);
});

test("build_share_url without overrides is the preset URL with the teaser bypass", async () => {
  const { json } = await callTool("build_share_url", { look: "vapor" });
  assert.equal(json.share_url, "https://globestudio.app/looks/vapor?app=1");
  assert.equal(json.embed_url, "https://globestudio.app/embed?look=vapor");
});

test("embed_snippet validates the look id", async () => {
  const bad = await callTool("embed_snippet", { look: "not-a-real-look" });
  assert.ok(bad.isError);
  assert.match(bad.text, /Unknown preset "not-a-real-look"/);

  const good = await callTool("embed_snippet", { look: "halftone" });
  assert.ok(good.json.snippet.includes("https://globestudio.app/embed?look=halftone"));
});
