# @globestudio/mcp

Model Context Protocol server for [Globestudio](https://globestudio.app) — let any MCP-compatible AI assistant generate dotted-globe maps, build customized share URLs, and grab paste-ready embed snippets from chat.

## Install

For **Claude Code** users:

```bash
claude mcp add globestudio -- npx -y @globestudio/mcp
```

For **Claude Desktop**, add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

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

For **Cursor**, **Cody**, **Continue**, or any other MCP-over-stdio client: same shape — point them at `npx -y @globestudio/mcp`.

Restart your AI tool. Globestudio tools should now appear in its tool catalog.

## What it does

Five tools, no external API calls (preset catalog ships embedded):

| Tool | Purpose |
|---|---|
| `list_presets` | Every shipped look — id, name, blurb, vibe tags, thumbnail URL, embed URL. |
| `find_presets({ vibe })` | Fuzzy-find by aesthetic. `synthwave` → Vapor; `print` → Halftone / Risograph / Newsprint; `glow` → Aurora / Bloom. |
| `build_share_url({ look, selection?, dotColor?, ... })` | Build customized globe URLs: a `globestudio.app/looks/<id>?c=…` studio share URL + a `/embed?look=<id>&…` embed URL. |
| `embed_snippet({ look, framework })` | Paste-ready code: `iframe` HTML, `react` component, or `script-tag` loader. |
| `preview_url({ look })` | Canonical live `/embed` URL + PNG thumbnail URL for one preset. |

## Example prompts

> "Show me every Globestudio preset with a retro vibe."
> 
> "Make me a halftone globe of Japan with cyan dots — give me a share URL."
> 
> "Generate the React component for the Vapor preset at 1200×600."

## Source

This package is part of the [Globestudio monorepo](https://github.com/alevizio/globestudio). The preset catalog mirrors `src/data/look-presets.js` from the main app — when new presets ship in Globestudio, they get added here in the same release.

## License

MIT — see [LICENSE](https://github.com/alevizio/globestudio/blob/main/LICENSE).
