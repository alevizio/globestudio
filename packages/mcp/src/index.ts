#!/usr/bin/env node
/**
 * Globestudio MCP server — stdio entry point.
 *
 * Works with Claude Desktop, Claude Code, Cursor, Cody, Continue — anything
 * that speaks MCP over stdio. All tools live in ./server.ts (createServer),
 * shared with the Smithery entry point (./smithery.ts).
 *
 * Install:
 *   claude mcp add globestudio -- npx -y @globestudio/mcp
 *
 * Source: https://github.com/alevizio/globestudio/tree/main/packages/mcp
 */

import { serveStdio } from "@modelcontextprotocol/server/stdio";
import { createServer } from "./server.js";

// The opening message picks the protocol: a 2025 client's initialize, or a
// 2026-07-28 client's first request with its version in _meta. One server
// from the factory then serves the connection, kept alive by stdin reads.
serveStdio(() => createServer(), {
  onerror: (error) => console.error("[globestudio-mcp]", error),
});
