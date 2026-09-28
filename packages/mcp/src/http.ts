/**
 * Globestudio MCP server over streamable HTTP, stateless.
 *
 * `handleMcpRequest` takes a Web Standard Request and returns a Response, so
 * any fetch-style host can serve it. The Vercel function api/mcp.ts exposes
 * it at https://globestudio.app/mcp. Every POST gets a fresh server and
 * transport (no sessions, nothing kept between requests) and a plain JSON
 * reply, which is all these tools need: they only build and read URLs.
 *
 * GET (a server-to-client event stream) and DELETE (ending a session) answer
 * 405, which the MCP spec allows for a server without sessions or streams.
 */

import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { createServer } from "./server.js";

/** Largest request body accepted. A share link with every setting is ~2.5 kB. */
export const MAX_BODY_BYTES = 128 * 1024;

/**
 * Most JSON-RPC messages in one batch (a JSON array body; protocol 2025-03-26
 * allows batches, later versions dropped them). Uncapped, one 128 KB body
 * holds ~1,600 list_presets calls: a 15 MB reply and ~200 ms of CPU from a
 * single request, which a per-request rate limit would not see.
 */
export const MAX_BATCH_MESSAGES = 10;

// Public and credential free, so any origin may call it: browser based MCP
// clients (the MCP Inspector, web agents) need these to reach it at all.
const RESPONSE_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Accept, Authorization, Mcp-Protocol-Version, Mcp-Session-Id, Last-Event-ID",
  "Access-Control-Expose-Headers": "Mcp-Protocol-Version, Mcp-Session-Id",
  "Access-Control-Max-Age": "86400",
  "Cache-Control": "no-store",
};

const withHeaders = (response: Response, extra: Record<string, string> = {}) => {
  const headers = new Headers(response.headers);
  for (const [key, value] of Object.entries({ ...RESPONSE_HEADERS, ...extra })) headers.set(key, value);
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
};

const jsonRpcError = (status: number, code: number, message: string, extra: Record<string, string> = {}) =>
  withHeaders(
    new Response(JSON.stringify({ jsonrpc: "2.0", error: { code, message }, id: null }), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
    extra,
  );

/** The body as text, or null once it passes MAX_BODY_BYTES (declared or streamed). */
const readBody = async (request: Request): Promise<string | null> => {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) return null;
  if (!request.body) return "";
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > MAX_BODY_BYTES) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
};

export const handleMcpRequest = async (request: Request): Promise<Response> => {
  if (request.method === "OPTIONS") {
    return withHeaders(new Response(null, { status: 204 }));
  }
  if (request.method !== "POST") {
    return jsonRpcError(
      405,
      -32000,
      "Method not allowed. This is the Globestudio MCP endpoint: add its URL to your AI tool as a remote MCP server. It takes POST only.",
      { Allow: "POST, OPTIONS" },
    );
  }

  const text = await readBody(request);
  if (text === null) {
    return jsonRpcError(413, -32600, `Request body is larger than ${MAX_BODY_BYTES / 1024} KB.`);
  }
  let parsedBody: unknown;
  try {
    parsedBody = JSON.parse(text);
  } catch {
    return jsonRpcError(400, -32700, "Parse error: the request body is not JSON.");
  }
  if (Array.isArray(parsedBody) && parsedBody.length > MAX_BATCH_MESSAGES) {
    return jsonRpcError(400, -32600, `A batch can hold up to ${MAX_BATCH_MESSAGES} messages.`);
  }

  const server = createServer();
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  });
  try {
    await server.connect(transport);
    // The JSON reply is complete once handleRequest resolves, so closing the
    // pair in finally never cuts a response short.
    return withHeaders(await transport.handleRequest(request, { parsedBody }));
  } catch {
    return jsonRpcError(500, -32603, "Internal error.");
  } finally {
    await transport.close();
    await server.close();
  }
};
