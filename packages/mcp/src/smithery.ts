/**
 * Globestudio MCP server — Smithery entry point.
 *
 * Smithery's `runtime: typescript` build imports this file (named by
 * package.json "module") and calls the default export to get a server it hosts
 * over streamable HTTP. The tools are identical to the stdio bin — both share
 * createServer() in ./server.ts.
 *
 * No per-session configuration is needed (the preset catalog ships embedded and
 * there are zero external API calls), so configSchema is empty.
 */

import { z } from "zod";
import { createServer } from "./server.js";

export const configSchema = z.object({});

export default function () {
  return createServer();
}
