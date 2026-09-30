# @globestudio/mcp

Model Context Protocol server for [Globestudio](https://globestudio.app). It lets an MCP-compatible AI assistant make dotted-globe maps, build share URLs and get embed snippets from chat.

## Connect by URL (no install)

Globestudio hosts this server at `https://globestudio.app/mcp` (streamable HTTP). You don't need to install anything, and there is no account or API key.

**Claude Code**

```bash
claude mcp add --transport http globestudio https://globestudio.app/mcp
```

**Claude (claude.ai and Claude Desktop):** open Customize, then Connectors, click **+**, then **Add custom connector**. Paste `https://globestudio.app/mcp` and click **Add**. Custom connectors work on Free (one connector), Pro, Max, Team and Enterprise plans; on Team and Enterprise an Owner adds it first.

**Codex**

```bash
codex mcp add globestudio --url https://globestudio.app/mcp
```

Or add it to `~/.codex/config.toml`:

```toml
[mcp_servers.globestudio]
url = "https://globestudio.app/mcp"
```

**Cursor:** add it to `~/.cursor/mcp.json` (every project) or `.cursor/mcp.json` (one project):

```json
{
  "mcpServers": {
    "globestudio": {
      "url": "https://globestudio.app/mcp"
    }
  }
}
```

Or install it in one click by opening this link:

```text
cursor://anysphere.cursor-deeplink/mcp/install?name=globestudio&config=eyJ1cmwiOiJodHRwczovL2dsb2Jlc3R1ZGlvLmFwcC9tY3AifQ==
```

**Any other MCP client:** add `https://globestudio.app/mcp` as a remote server using the streamable HTTP transport.

The hosted server is stateless: every request gets a fresh server, nothing is stored between requests, and replies are plain JSON. It takes POST only (GET and DELETE answer 405), requests up to 128 KB and batches of up to 10 messages.

## Run it locally (stdio)

For Claude Code:

```bash
claude mcp add globestudio -- npx -y @globestudio/mcp
```

For Claude Desktop, add this to `~/Library/Application Support/Claude/claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "globestudio": {
      "command": "npx",
      "args": ["-y", "@globestudio/mcp"]
    }
  }
}
```

For Cursor, Cody, Continue or any other MCP-over-stdio client: point it at `npx -y @globestudio/mcp` the same way.

Restart your AI tool. Globestudio tools should now appear in its tool catalog.

## What it does

Six tools. None of them call an external API, because the preset catalog ships inside the package:

| Tool | Purpose |
|---|---|
| `list_presets` | Every shipped look: id, name, blurb, vibe tags, thumbnail URL, embed URL. |
| `find_presets({ vibe })` | Fuzzy-find by aesthetic. `synthwave` → Vapor; `print` → Halftone / Risograph / Newsprint; `glow` → Aurora / Bloom. |
| `build_share_url({ look?, share_url?, selection?, dotColor?, ..., config? })` | Build globe URLs: a studio share URL and an `/embed` URL. Start from a look, or pass a link as `share_url` and only the settings to change; everything else in the link is kept. |
| `read_share_url({ url })` | Decode a Globestudio link (studio share link, `/looks/<id>` link or `/embed` URL) into its look and settings, so an assistant can change a link you paste. |
| `embed_snippet({ look, framework })` | Paste-ready code: `iframe` HTML, `react` component, or `script-tag` loader. |
| `preview_url({ look })` | The canonical live `/embed` URL and a PNG thumbnail URL for one preset. |

## Example prompts

> "Show me every Globestudio preset with a retro vibe."
> 
> "Make me a clean dotted globe with cyan dots and give me a share URL."
> 
> "Generate the React component for the Vapor preset at 1200×600."
>
> "Here is my globe: https://globestudio.app/?c=… Make the dots red and show only Europe."

## Source

This package is part of the [Globestudio monorepo](https://github.com/alevizio/globestudio). The preset catalog mirrors `src/data/look-presets.js` from the main app. New presets are added here in the same release.

## License

MIT. See [LICENSE](https://github.com/alevizio/globestudio/blob/main/LICENSE).
