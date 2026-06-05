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

import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createServer } from "./server.js";

const main = async () => {
  const server = createServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Stay alive — the MCP SDK keeps the process up via stdin reads.
};

main().catch((error) => {
  console.error("[globestudio-mcp] Fatal error:", error);
  process.exit(1);
});
