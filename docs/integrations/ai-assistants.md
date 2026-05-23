# Globestudio for AI assistants (Claude / ChatGPT / Codex / Cursor)

Globestudio is intentionally **URL-driven** — every visual decision
can be expressed as a query string. That makes it a natural fit for
AI assistants that need to produce a "show me a dotted map of X"
artifact without leaving the chat / IDE.

## The simplest path: an embed URL

Build a URL like this:

```
https://globestudio.app/embed?look=halftone&density=50&selection=continent:Europe&autoSpin=1
```

Drop into:

- An `<iframe>` in the user's app (web)
- An `<img src>` after a headless-browser screenshot (for static deck slides)
- A live preview link (chat / docs)

The full parameter reference is at
[`docs/integrations/README.md#common-parameters`](./README.md#common-parameters).
A JSON Schema is at <https://globestudio.app/schema/config.json> for
file-mode configs.

## Discovery for AI tools

Globestudio publishes a [`llms.txt`](https://globestudio.app/llms.txt)
following the [llmstxt.org](https://llmstxt.org/) convention.
Pointing an assistant at that file is enough to brief it on the
embed contract, preset IDs, and selection prefixes.

## Anthropic Claude

### Claude.ai / Anthropic console

If a user pastes Globestudio's URL into Claude with attached files,
Claude can read [`llms.txt`](https://globestudio.app/llms.txt) and
the [JSON Schema](https://globestudio.app/schema/config.json) to
produce valid configs without round-tripping.

### Claude Code / Claude Agent SDK

The schema makes Globestudio a natural **tool definition** target:

```js
// In Claude Code, define a tool whose input matches the JSON Schema:
{
  name: "create_globestudio_embed",
  description: "Produces an iframable Globestudio embed URL for the given config.",
  input_schema: { $ref: "https://globestudio.app/schema/config.json" },
}
```

Then the agent can call the tool and you handle it by building the
embed URL via the [reference React component](../../examples/react-component/Globestudio.tsx)
or any of the integration helpers.

### MCP servers (future)

A Globestudio MCP server is on the [roadmap](../../ROADMAP.md). It
will expose `globestudio.create_embed`, `globestudio.list_presets`,
`globestudio.preview` as MCP tools so any MCP-compatible client
(Claude desktop, Cursor, Windsurf, etc.) can drive it without code.

Until then, the [JSON Schema](https://globestudio.app/schema/config.json)
+ the embed URL contract are enough to wire it up by hand in any
agent framework.

## OpenAI ChatGPT / Codex

### ChatGPT (web + Apps)

ChatGPT can read the public [`llms.txt`](https://globestudio.app/llms.txt)
on demand and produce embed URLs in answers. For a deeper integration:

- **Custom GPT** with `globestudio.app/schema/config.json` referenced
  in the GPT's "Knowledge" — gives the assistant grounded config
  validation.
- **Action**: an OpenAPI-described action that produces embed URLs.

### Codex / OpenAI agents

Codex CLI and the OpenAI agents framework both consume tool
descriptions in OpenAPI / JSON Schema format. Use the same
[JSON Schema](https://globestudio.app/schema/config.json) as the
input contract for an `embed_config` tool.

For programmatic image production:

```
# Pseudocode for a Codex / agents tool implementation
async def embed_config(config: dict) -> str:
    # Validate config against /schema/config.json
    # Build the embed URL using urllib.parse
    # Return the URL — the agent / user can iframe or screenshot it
    return f"https://globestudio.app/embed?{urlencode(flatten(config))}"
```

## Cursor / Windsurf / Continue.dev

These IDE assistants read the JSON Schema automatically when a user
opens a Globestudio `.json` config — `$schema` resolution + inline
docs work out of the box. No setup needed.

For agentic workflows in these tools:

1. Reference [`llms.txt`](https://globestudio.app/llms.txt) in the
   project's `.cursorrules` / `.windsurfrules` / similar.
2. Let the agent build embed URLs as needed.

## GitHub Copilot

Copilot picks up the JSON Schema via `$schema` references inside
`.json` files in a workspace. For workspace-level autocomplete on
embed URLs, drop a snippet like this in a `.github/copilot/embed-url.md`
note:

```
The Globestudio embed format is:
  https://globestudio.app/embed?look=<preset>&density=<1-100>&selection=<world|country:ISO3|continent:Name>&autoSpin=<0|1>
Preset IDs: default, halftone, risograph, newsprint, aurora, pixel,
bayer, atkinson, wireframe, crt, glitch, badtv, bloom, metal,
iridescent, pencil, corrupt.
```

## Common AI-friendly patterns

### Generate a per-country pack

```
Goal: produce a dotted map per country for a 50-country brand system.
Approach: iterate ISO 3166-1 alpha-3 codes, build embed URL with
  ?selection=country:<code>&look=wireframe, point a headless browser
  at each URL, capture canvas → PNG.
Schema: /schema/config.json validates each config before request.
```

### "Match my brand"

```
Goal: take a brand color and produce a Globestudio config that
  layers it on top of a clean preset.
Approach: build URL with ?look=default&dotColor=<hex>. If the brand
  is "muted", swap to look=newsprint or look=halftone for tonal
  variation.
```

### "Animate this scene for a launch teaser"

```
Goal: produce a WebM of a globe with chained shader looks.
Approach: not yet — server-side WebM isn't exposed. Suggest
  client-side: load the embed, use the in-app Export → WebM, save.
  Or use a headless browser with MediaRecorder.
```

## See also

- [JSON Schema](https://globestudio.app/schema/config.json) — IDE-validated config
- [`llms.txt`](https://globestudio.app/llms.txt) — AI-tool index file
- [`/embed` reference](./embed.md) — every query parameter
- [Roadmap](../../ROADMAP.md) — MCP server + server-side rendering plans
