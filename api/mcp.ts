// POST /mcp (rewritten here by vercel.json): the public, stateless Globestudio
// MCP endpoint, so claude.ai connectors, Claude Code, Codex, Cursor and any
// other MCP client can connect by URL with nothing to install.
//
// The tools and the HTTP handling live in the npm package (packages/mcp), so
// the hosted server and `npx @globestudio/mcp` can never drift apart. No
// secrets, no storage, no user data: every tool only builds or reads URLs.

import { handleMcpRequest } from "../packages/mcp/src/http.js";

export default { fetch: handleMcpRequest };
