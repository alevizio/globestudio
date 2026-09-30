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
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// The app-contract parser. Dev-time import from the monorepo — the published
// package never ships or loads app source at runtime.
const appModule = (path) => import(new URL(`../../../src/${path}`, import.meta.url).href);
const { parseShareConfig, buildShareUrl: appBuildShareUrl } = await appModule("utils/share-config.js");
const { sanitizeSvgSource: appSanitizeSvgSource } = await appModule("utils/custom-shape.js");
const { lookPresets } = await appModule("data/look-presets.js");
const { DEFAULT_SHADER_SETTINGS } = await appModule("config/shader-effects.js");
const { DEFAULT_GLOBE_SETTINGS } = await appModule("config/globe-settings.js");
const { DEFAULT_SPACE_SETTINGS, DEFAULT_FLOW_SETTINGS } = await appModule("config/backgrounds.js");

// Real links copied from the running app (see the fixture's _comment).
const APP_LINKS = JSON.parse(readFileSync(new URL("./fixtures/app-links.json", import.meta.url), "utf8"));
const SITE = "https://globestudio.app";

// read_share_url lists only what a link carries; the app also fills the
// nested settings with its defaults. Merge those back in to compare.
const APP_NESTED_DEFAULTS = {
  shaderSettings: DEFAULT_SHADER_SETTINGS,
  globeSettings: DEFAULT_GLOBE_SETTINGS,
  spaceSettings: DEFAULT_SPACE_SETTINGS,
  flowSettings: DEFAULT_FLOW_SETTINGS,
};
const asAppApplies = (config) => {
  if (Object.keys(config).length === 0) return null;
  const out = { ...config };
  for (const [key, defaults] of Object.entries(APP_NESTED_DEFAULTS)) {
    if (out[key]) out[key] = { ...defaults, ...out[key] };
  }
  return out;
};
const appConfigOf = (url) => parseShareConfig(new URL(url).search);

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

test("list_presets matches the app's preset list, so link looks resolve", async () => {
  const { json } = await callTool("list_presets", {});
  assert.deepEqual(json.map((p) => p.id), lookPresets.map((p) => p.id));
});

// --- read_share_url: every link the app produces decodes to what the app applies.

test("read_share_url decodes real studio links copied from the app exactly as the app does", async () => {
  assert.ok(APP_LINKS.studio.length >= 8);
  for (const { from, url } of APP_LINKS.studio) {
    // As copied (local origin) and as they read on the live site.
    for (const link of [url, url.replace(/^https?:\/\/[^/]+/, SITE)]) {
      const { json, text } = await callTool("read_share_url", { url: link });
      assert.ok(json, `${from}: ${text}`);
      assert.equal(json.kind, "studio", from);
      assert.equal(json.look, null, from);
      assert.deepEqual(asAppApplies(json.config), appConfigOf(link), from);
      // The canonical link it hands back restores the same design.
      assert.deepEqual(appConfigOf(json.share_url), appConfigOf(link), `${from} share_url`);
      assert.equal(new URL(json.share_url).pathname, "/");
    }
  }
});

test("read_share_url decodes the app's own links for every preset: studio, /looks/<id>?c= and /embed?c=", async () => {
  for (const preset of lookPresets) {
    const config = { version: 1, ...preset.settings };
    const cases = [
      ["/", "studio", null],
      [`/looks/${preset.id}`, "look", preset.id],
      ["/embed", "embed", "default"],
    ];
    for (const [path, kind, look] of cases) {
      const link = appBuildShareUrl(config, SITE, path);
      const { json, text } = await callTool("read_share_url", { url: link });
      assert.ok(json, `${preset.id} ${path}: ${text}`);
      assert.equal(json.kind, kind);
      assert.equal(json.look, look);
      assert.deepEqual(asAppApplies(json.config), appConfigOf(link), `${preset.id} ${path}`);
    }
  }
});

test("read_share_url decodes the real /examples embed, keeping embed only options", async () => {
  const [{ url }] = APP_LINKS.embeds;
  const { json } = await callTool("read_share_url", { url });
  assert.equal(json.kind, "embed");
  assert.equal(json.look, "default");
  assert.deepEqual(asAppApplies(json.config), appConfigOf(url));
  assert.deepEqual(json.embed_options, { theme: "light", source: "examples-stripe" });
  const rebuilt = new URL(json.embed_url);
  assert.equal(rebuilt.searchParams.get("theme"), "light");
  assert.equal(rebuilt.searchParams.get("source"), "examples-stripe");
});

test("read_share_url reads embed query params the way the embed does", async () => {
  const { json } = await callTool("read_share_url", { url: `${SITE}/embed?look=halftone&density=60&autoSpin=1` });
  assert.equal(json.look, "halftone");
  assert.deepEqual(json.config, { density: 60, globeSettings: { autoSpin: true } });

  const flat = await callTool("read_share_url", {
    url: "globestudio.app/embed?look=vapor&dotColor=ff0000&view=flat&density=95&tiltX=80&theme=light",
  });
  assert.equal(flat.json.look, "vapor");
  // The embed clamps its own params: density to 90, tilt to 45.
  assert.deepEqual(flat.json.config, { dotColor: "#ff0000", density: 90, tiltX: 45, viewMode: "flat" });
  assert.deepEqual(flat.json.embed_options, { theme: "light" });
  assert.equal(new URL(flat.json.embed_url).searchParams.get("view"), "flat");

  // ?c= wins over the dedicated params, as in embed-view.jsx buildSettings.
  const c = encodeURIComponent(JSON.stringify({ v: 1, dotColor: "#00ff00" }));
  const both = await callTool("read_share_url", { url: `/embed?dotColor=ff0000&c=${c}` });
  assert.equal(both.json.config.dotColor, "#00ff00");
  // A missing or unknown look renders the Default preset.
  assert.equal(both.json.look, "default");
  const unknown = await callTool("read_share_url", { url: "/embed?look=nope" });
  assert.equal(unknown.json.look, "default");

  // Repeated params: the embed reads the first one, and so must the server.
  const repeated = await callTool("read_share_url", { url: "/embed?dotColor=ff0000&dotColor=00ff00&theme=light&theme=dark" });
  assert.equal(repeated.json.config.dotColor, "#ff0000");
  assert.deepEqual(repeated.json.embed_options, { theme: "light" });
});

test("read_share_url reads MCP look links and bare look links", async () => {
  const built = await callTool("build_share_url", { look: "risograph", selection: "Japan", shape: "Star" });
  const { json } = await callTool("read_share_url", { url: built.json.share_url });
  assert.equal(json.kind, "look");
  assert.equal(json.look, "risograph");
  assert.deepEqual(json.config, { selection: "country:JPN", shape: "Star" });
  assert.equal(json.summary.look, "risograph");

  const bare = await callTool("read_share_url", { url: `${SITE}/looks/aurora/` });
  assert.equal(bare.json.look, "aurora");
  assert.deepEqual(bare.json.config, {});
});

test("read_share_url rejects links that are not Globestudio share links", async () => {
  for (const [url, message] of [
    [`${SITE}/gallery`, /not a Globestudio share link/],
    [`${SITE}/looks/not-a-look`, /Unknown look "not-a-look"/],
    ["https://exa mple.com", /is not a URL/],
  ]) {
    const { isError, text } = await callTool("read_share_url", { url });
    assert.ok(isError, url);
    assert.match(text, message);
  }
});

test("read_share_url sanitizes custom SVG shapes exactly like the app, in linear time", async () => {
  const svgSource = `<svg viewBox="0 0 10 10"><script>bad()</script><SCRIPT type="x">worse()</ScRiPt><rect onclick="x()" onload='y()' width="10"/><script>unclosed</svg>`;
  const payload = { v: 1, shape: "Custom", customShape: { name: "Spark", type: "image/svg+xml", dataUrl: "data:image/svg+xml,x", svgSource } };
  const link = `${SITE}/?c=${encodeURIComponent(JSON.stringify(payload))}`;
  const { json } = await callTool("read_share_url", { url: link });
  assert.deepEqual(asAppApplies(json.config), appConfigOf(link));
  assert.equal(json.config.customShape.svgSource, appSanitizeSvgSource(svgSource));

  // Many unclosed "<script" openers: the app's regex rescans to the end from
  // each one; the server must not.
  const hostile = `<svg>${"<script".repeat(15_000)}</svg>`;
  const hostileLink = `${SITE}/?c=${encodeURIComponent(JSON.stringify({ v: 1, customShape: { type: "image/svg+xml", dataUrl: "data:image/svg+xml,x", svgSource: hostile } }))}`;
  const started = performance.now();
  const hostileResult = await callTool("read_share_url", { url: hostileLink });
  assert.ok(performance.now() - started < 1000, "decodes in well under a second");
  assert.equal(hostileResult.json.config.customShape.svgSource, hostile);
});

// --- build_share_url on a pasted link: change what was asked, keep the rest.

test("build_share_url with only share_url hands back an equivalent link", async () => {
  for (const { from, url } of APP_LINKS.studio) {
    const { json, text } = await callTool("build_share_url", { share_url: url });
    assert.ok(json, `${from}: ${text}`);
    assert.deepEqual(appConfigOf(json.share_url), appConfigOf(url), from);
  }
});

test("build_share_url changes a pasted studio link and keeps every other setting", async () => {
  const { url } = APP_LINKS.studio.find((link) => link.from === "/looks/vapor");
  const before = appConfigOf(url);
  const { json } = await callTool("build_share_url", {
    share_url: url,
    dotColor: "#ff0000",
    selection: "Europe",
    config: { viewMode: "flat", globeSettings: { autoSpin: false } },
  });
  assert.equal(json.look, null);
  assert.equal(new URL(json.share_url).pathname, "/");
  const after = appConfigOf(json.share_url);
  assert.deepEqual(after, {
    ...before,
    dotColor: "#ff0000",
    selection: "continent:Europe",
    viewMode: "flat",
    globeSettings: { ...before.globeSettings, autoSpin: false },
  });

  // The embed shows the same globe: dedicated params + view=flat + ?c=.
  const embed = new URL(json.embed_url);
  assert.equal(embed.pathname, "/embed");
  assert.equal(embed.searchParams.get("look"), null);
  assert.equal(embed.searchParams.get("view"), "flat");
  assert.equal(embed.searchParams.get("dotColor"), "ff0000");
  assert.equal(embed.searchParams.get("selection"), "continent:Europe");
  assert.deepEqual(appConfigOf(json.embed_url).shaderSettings, before.shaderSettings);
});

test("build_share_url layers changes on a look link and can switch its look", async () => {
  const first = await callTool("build_share_url", { look: "halftone", selection: "JP", density: 40 });
  const changed = await callTool("build_share_url", { share_url: first.json.share_url, shape: "Star" });
  assert.equal(new URL(changed.json.share_url).pathname, "/looks/halftone");
  assert.deepEqual(appConfigOf(changed.json.share_url), { selection: "country:JPN", density: 40, shape: "Star" });

  const switched = await callTool("build_share_url", { share_url: `${SITE}/embed?look=halftone&density=60&theme=light`, look: "vapor" });
  assert.equal(switched.json.look, "vapor");
  assert.equal(new URL(switched.json.share_url).pathname, "/looks/vapor");
  assert.deepEqual(appConfigOf(switched.json.share_url), { density: 60 });
  const embed = new URL(switched.json.embed_url);
  assert.equal(embed.searchParams.get("look"), "vapor");
  assert.equal(embed.searchParams.get("density"), "60");
  assert.equal(embed.searchParams.get("theme"), "light");
});

test("build_share_url refuses a look on a studio link, and needs a look or a link", async () => {
  const [{ url }] = APP_LINKS.studio;
  const withLook = await callTool("build_share_url", { share_url: url, look: "vapor" });
  assert.ok(withLook.isError);
  assert.match(withLook.text, /stores every setting/);

  const neither = await callTool("build_share_url", { dotColor: "#ffffff" });
  assert.ok(neither.isError);
  assert.match(neither.text, /Pass look/);
});

test("build_share_url reports config keys the app would drop", async () => {
  const { json } = await callTool("build_share_url", {
    look: "vapor",
    config: { bogus: 1, density: "lots", globeSettings: { autoSpin: false, nope: true } },
  });
  assert.deepEqual(json.ignored, ["bogus", "density", "globeSettings.nope"]);
  assert.deepEqual(appConfigOf(json.share_url), { globeSettings: { ...DEFAULT_GLOBE_SETTINGS, autoSpin: false } });
});

test("a % sign survives both ways: MCP links in the app, app links in the MCP", async () => {
  const svgSource = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><text>50%</text><circle cx="5" cy="5" r="5"/></svg>`;
  const customShape = {
    name: "Dot",
    type: "image/svg+xml",
    svgSource,
    dataUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svgSource)}`,
  };
  const carried = { shape: "Custom", customShape, asciiSymbol: "100%", stateSelection: "50% off %41" };

  // MCP -> app: build_share_url keeps every value, and the app opens it as is.
  const { json } = await callTool("build_share_url", { look: "default", dotColor: "#ff0000", config: carried });
  assert.equal(json.ignored, undefined);
  assert.deepEqual(json.config, { dotColor: "#ff0000", ...carried });
  assert.deepEqual(appConfigOf(json.share_url), { dotColor: "#ff0000", ...carried });
  assert.deepEqual(appConfigOf(json.embed_url), carried);

  // app -> MCP: read_share_url reads the app's own link the way the app does,
  // and the links it hands back open the same design.
  const link = appBuildShareUrl({ version: 1, ...carried }, SITE, "/");
  const read = await callTool("read_share_url", { url: link });
  assert.deepEqual(read.json.config, carried);
  assert.deepEqual(read.json.config, appConfigOf(link));
  assert.equal(read.json.ignored, undefined);
  assert.deepEqual(appConfigOf(read.json.share_url), carried);

  // A v1 link whose ?c= was encoded twice, as @globestudio/react passes a
  // copied token, still hands both parsers its "%".
  const twice = `${SITE}/?c=${encodeURIComponent(encodeURIComponent(JSON.stringify({ v: 1, asciiSymbol: "%", density: 55 })))}`;
  const doubled = await callTool("read_share_url", { url: twice });
  assert.deepEqual(doubled.json.config, { asciiSymbol: "%", density: 55 });
  assert.deepEqual(doubled.json.config, appConfigOf(twice));
  assert.deepEqual(appConfigOf(doubled.json.share_url), { asciiSymbol: "%", density: 55 });
});

test("a custom glow color survives both ways: MCP links in the app, app links in the MCP", async () => {
  const globeSettings = { glow: true, glowColor: "#ff00aa" };

  // MCP -> app: build_share_url keeps it, and the app opens it.
  const { json } = await callTool("build_share_url", { look: "default", config: { globeSettings } });
  assert.equal(json.ignored, undefined);
  assert.equal(appConfigOf(json.share_url).globeSettings.glowColor, "#ff00aa");

  // app -> MCP: read_share_url reads the app's own link the way the app does.
  const link = appBuildShareUrl({ version: 1, globeSettings }, SITE, "/");
  const read = await callTool("read_share_url", { url: link });
  assert.equal(read.json.config.globeSettings.glowColor, "#ff00aa");
  assert.deepEqual(asAppApplies(read.json.config), appConfigOf(link));
});

test("read_share_url reads every old v1 link the way the app does, and hands back an equivalent link", async () => {
  // Built by the app's encoder before v2 (see the fixture's _comment).
  const { links } = JSON.parse(readFileSync(new URL("../../../src/utils/fixtures/legacy-share-links.json", import.meta.url), "utf8"));
  assert.ok(links.length >= 50);
  for (const { name, url } of links) {
    const { json, text } = await callTool("read_share_url", { url });
    assert.ok(json, `${name}: ${text}`);
    const app = appConfigOf(url);
    assert.deepEqual(asAppApplies(json.config), app, name);
    if (app) assert.deepEqual(appConfigOf(json.share_url), app, `${name} share_url`);
  }
});
