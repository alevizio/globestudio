// The hosted endpoint (src/http.ts, served at https://globestudio.app/mcp),
// driven by the SDK's own client over streamable HTTP.
//
// By default the handler runs in process (no network). Set MCP_URL to run the
// same checks against a live endpoint, e.g. a local `vercel dev`:
//   MCP_URL=http://127.0.0.1:6201/mcp node --test test/http.test.mjs
//
// Run `npm run build` first; this tests dist/, not src/.

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { handleMcpRequest, MAX_BATCH_MESSAGES, MAX_BODY_BYTES } from "../dist/http.js";

const { parseShareConfig } = await import(new URL("../../../src/utils/share-config.js", import.meta.url).href);
const APP_LINKS = JSON.parse(readFileSync(new URL("./fixtures/app-links.json", import.meta.url), "utf8"));

const ENDPOINT = process.env.MCP_URL ?? "https://globestudio.app/mcp";
const request = process.env.MCP_URL
  ? (init = {}) => fetch(ENDPOINT, init)
  : (init = {}) => handleMcpRequest(new Request(ENDPOINT, init));

let client;

before(async () => {
  client = new Client({ name: "http-test", version: "0.0.0" });
  const transport = new StreamableHTTPClientTransport(new URL(ENDPOINT), {
    fetch: process.env.MCP_URL ? undefined : (url, init) => handleMcpRequest(new Request(url, init)),
  });
  await client.connect(transport);
});

after(async () => {
  await client?.close();
});

const call = async (name, args) => {
  const result = await client.callTool({ name, arguments: args });
  assert.notEqual(result.isError, true, result.content?.[0]?.text);
  return JSON.parse(result.content[0].text);
};

test("initialize reports the server and its usage instructions", () => {
  assert.equal(client.getServerVersion()?.name, "globestudio");
  assert.match(client.getInstructions() ?? "", /read_share_url/);
});

test("tools/list shows all six tools", async () => {
  const { tools } = await client.listTools();
  assert.deepEqual(tools.map((t) => t.name).sort(), [
    "build_share_url", "embed_snippet", "find_presets", "list_presets", "preview_url", "read_share_url",
  ]);
});

test("find_presets, build_share_url and read_share_url work over HTTP", async () => {
  const found = await call("find_presets", { vibe: "print" });
  assert.ok(found.some((p) => p.id === "halftone"));

  const built = await call("build_share_url", { look: "vapor", selection: "Japan", dotColor: "#3df4ff" });
  assert.deepEqual(parseShareConfig(new URL(built.share_url).search), { selection: "country:JPN", dotColor: "#3df4ff" });

  const { url } = APP_LINKS.studio.find((link) => link.from === "/looks/vapor");
  const read = await call("read_share_url", { url });
  assert.equal(read.kind, "studio");
  assert.equal(read.summary.effect, "chromatic");

  const changed = await call("build_share_url", { share_url: url, dotColor: "#ff0000" });
  assert.equal(parseShareConfig(new URL(changed.share_url).search).dotColor, "#ff0000");
});

test("every reply is uncached and open to browser clients", async () => {
  const preflight = await request({ method: "OPTIONS", headers: { Origin: "https://example.com", "Access-Control-Request-Method": "POST" } });
  assert.ok(preflight.status === 204 || preflight.status === 200, `preflight ${preflight.status}`);
  assert.equal(preflight.headers.get("access-control-allow-origin"), "*");
  assert.match(preflight.headers.get("access-control-allow-headers") ?? "", /Mcp-Protocol-Version/);

  const post = await request({
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json, text/event-stream" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "ping" }),
  });
  assert.equal(post.status, 200);
  assert.equal(post.headers.get("cache-control"), "no-store");
  assert.equal(post.headers.get("access-control-allow-origin"), "*");
  assert.deepEqual(await post.json(), { jsonrpc: "2.0", id: 1, result: {} });
});

test("GET and DELETE answer 405: no sessions, no server stream", async () => {
  for (const method of ["GET", "DELETE"]) {
    const response = await request({ method, headers: { Accept: "text/event-stream" } });
    assert.equal(response.status, 405, method);
    assert.equal(response.headers.get("allow"), "POST, OPTIONS");
    assert.equal(response.headers.get("cache-control"), "no-store");
    const body = await response.json();
    assert.equal(body.error.code, -32000);
  }
});

test("oversized and malformed bodies are refused before any tool runs", async () => {
  const headers = { "Content-Type": "application/json", Accept: "application/json, text/event-stream" };
  const big = JSON.stringify({ jsonrpc: "2.0", id: 1, method: "ping", params: { pad: "x".repeat(MAX_BODY_BYTES) } });
  const tooBig = await request({ method: "POST", headers, body: big });
  assert.equal(tooBig.status, 413);

  const broken = await request({ method: "POST", headers, body: "{not json" });
  assert.equal(broken.status, 400);
  assert.equal((await broken.json()).error.code, -32700);

  // One body must not fan out into many tool calls.
  const ping = (id) => ({ jsonrpc: "2.0", id, method: "ping" });
  const small = await request({ method: "POST", headers, body: JSON.stringify([ping(1), ping(2)]) });
  assert.equal(small.status, 200);
  assert.equal((await small.json()).length, 2);
  const flood = Array.from({ length: MAX_BATCH_MESSAGES + 1 }, (_, i) => ping(i + 1));
  const tooMany = await request({ method: "POST", headers, body: JSON.stringify(flood) });
  assert.equal(tooMany.status, 400);
  assert.equal((await tooMany.json()).error.code, -32600);
});
