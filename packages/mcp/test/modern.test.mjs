// Clients on the 2026-07-28 protocol, driven by the v2 SDK's own client: no
// initialize, the version and capabilities travel in each request's _meta.
// http.test.mjs and stdio-contract.test.mjs keep covering 2025 clients.
//
// Until Nov 2026 the hosted server only knew 2025: these clients got a 400
// on their first request and had to retry the 2025 way.
//
// By default the HTTP handler runs in process. Set MCP_URL to run the HTTP
// checks against a live endpoint, as in http.test.mjs.
//
// Run `npm run build` first; this tests dist/, not src/.

import { test } from "node:test";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import { StdioClientTransport } from "@modelcontextprotocol/client/stdio";
import { handleMcpRequest } from "../dist/http.js";

const ENDPOINT = process.env.MCP_URL ?? "https://globestudio.app/mcp";
const SERVER_PATH = fileURLToPath(new URL("../dist/index.js", import.meta.url));
const TOOLS = ["build_share_url", "embed_snippet", "find_presets", "list_presets", "preview_url", "read_share_url"];

// Every HTTP exchange the client makes: the JSON-RPC method it sent and the
// status and headers it got back.
const recordingFetch = (exchanges) => async (url, init = {}) => {
  const response = process.env.MCP_URL ? await fetch(url, init) : await handleMcpRequest(new Request(url, init));
  let method = "";
  try {
    method = JSON.parse(init.body)?.method ?? "";
  } catch {
    // Not a JSON body (a GET or DELETE).
  }
  exchanges.push({ method, status: response.status, headers: response.headers });
  return response;
};

const connectHttp = async (mode) => {
  const exchanges = [];
  const client = new Client({ name: "modern-test", version: "0.0.0" }, { versionNegotiation: { mode } });
  await client.connect(new StreamableHTTPClientTransport(new URL(ENDPOINT), { fetch: recordingFetch(exchanges) }));
  return { client, exchanges };
};

const callJson = async (client, name, args) => {
  const result = await client.callTool({ name, arguments: args });
  assert.notEqual(result.isError, true, result.content?.[0]?.text);
  return JSON.parse(result.content[0].text);
};

test("a client that negotiates, as Claude and Copilot CLI do, gets 2026-07-28 with no 400 and no initialize", async () => {
  const { client, exchanges } = await connectHttp("auto");
  try {
    assert.equal(client.getProtocolEra(), "modern");
    assert.equal(client.getNegotiatedProtocolVersion(), "2026-07-28");
    const { tools } = await client.listTools();
    assert.deepEqual(tools.map((tool) => tool.name).sort(), TOOLS);
    const matches = await callJson(client, "find_presets", { vibe: "synthwave" });
    assert.equal(matches[0].id, "vapor");

    assert.ok(exchanges.length >= 3, `${exchanges.length} exchanges`);
    assert.deepEqual(exchanges.filter((e) => e.status >= 400).map((e) => `${e.method} ${e.status}`), []);
    assert.equal(exchanges.some((e) => e.method === "initialize"), false);
    for (const { method, headers } of exchanges) {
      assert.equal(headers.get("access-control-allow-origin"), "*", method);
      assert.equal(headers.get("cache-control"), "no-store", method);
    }
  } finally {
    await client.close();
  }
});

test("a client pinned to 2026-07-28 builds and reads links over HTTP", async () => {
  const { client } = await connectHttp({ pin: "2026-07-28" });
  try {
    const built = await callJson(client, "build_share_url", { look: "halftone", dotColor: "#ff0000" });
    assert.match(built.share_url, /^https:\/\/globestudio\.app\//);
    const read = await callJson(client, "read_share_url", { url: built.share_url });
    assert.equal(read.look, "halftone");
    assert.match(read.config.dotColor, /^#ff0000$/i);
  } finally {
    await client.close();
  }
});

test("browser clients may send the 2026-07-28 request headers", async () => {
  const response = process.env.MCP_URL
    ? await fetch(ENDPOINT, { method: "OPTIONS" })
    : await handleMcpRequest(new Request(ENDPOINT, { method: "OPTIONS" }));
  const allowed = response.headers.get("access-control-allow-headers") ?? "";
  for (const header of ["Mcp-Protocol-Version", "Mcp-Method", "Mcp-Name"]) assert.match(allowed, new RegExp(header));
});

test("the npx server speaks 2026-07-28 over stdio too", async () => {
  const client = new Client({ name: "modern-test", version: "0.0.0" }, { versionNegotiation: { mode: "auto" } });
  await client.connect(new StdioClientTransport({ command: process.execPath, args: [SERVER_PATH], stderr: "inherit" }));
  try {
    assert.equal(client.getProtocolEra(), "modern");
    const { tools } = await client.listTools();
    assert.deepEqual(tools.map((tool) => tool.name).sort(), TOOLS);
    const preview = await callJson(client, "preview_url", { look: "aurora" });
    assert.equal(preview.embed_url, "https://globestudio.app/embed?look=aurora");
  } finally {
    await client.close();
  }
});
