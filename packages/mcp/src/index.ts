#!/usr/bin/env node
/**
 * Globestudio MCP server — exposes preset data + share-URL building +
 * embed-snippet generation so any MCP-compatible AI assistant can drive
 * Globestudio from chat.
 *
 * Tools exposed:
 *   list_presets()                  → every shipped look with name, blurb, thumbnail URL, vibe tags
 *   find_presets({ vibe })          → fuzzy-match presets by vibe (e.g. "synthwave", "print", "retro")
 *   build_share_url({ look, ... })  → returns globestudio.app/?c=<base64> for the given config
 *   embed_snippet({ look, framework }) → returns paste-ready code for iframe/react/html-script
 *   preview_url({ look })           → returns the live /embed?look=<id> URL + thumbnail URL
 *
 * Transport: stdio (works with Claude Desktop, Claude Code, Cursor,
 * Cody, Continue, etc. — anything that speaks MCP over stdio).
 *
 * Install:
 *   npm install -g @globestudio/mcp
 *   # then in your AI tool's config:
 *   claude mcp add globestudio -- npx -y @globestudio/mcp
 *
 * Source: https://github.com/alevizio/globestudio/tree/main/packages/mcp
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

// --- Constants ---------------------------------------------------------------

const SITE_URL = "https://globestudio.app";

/**
 * Hardcoded preset catalog. Mirrors src/data/look-presets.js + preset-tags.js
 * from the main app. Kept inline so the MCP package has zero runtime deps on
 * the app source (publishable to npm independently). If you add a preset to
 * the app, also add it here — they have to match for share URLs to resolve.
 */
const PRESETS = [
  { id: "default", name: "Default", blurb: "Clean cartography", tags: ["clean", "minimal", "neutral", "simple", "starter"] },
  { id: "halftone", name: "Halftone", blurb: "Newspaper print, browser-rendered", tags: ["print", "vintage", "editorial", "newspaper", "dots", "retro"] },
  { id: "risograph", name: "Risograph", blurb: "Two-ink print, slightly off-register", tags: ["print", "pink", "cyan", "riso", "ink", "vibrant", "modern", "zine"] },
  { id: "newsprint", name: "Newsprint", blurb: "CMYK process color halftone", tags: ["cmyk", "print", "newspaper", "editorial", "vintage", "magazine"] },
  { id: "aurora", name: "Aurora", blurb: "Soft glowing bands across the globe", tags: ["glow", "atmospheric", "soft", "dreamy", "blue", "green", "space", "night"] },
  { id: "pixel", name: "Pixel", blurb: "8-bit blocky dot grid", tags: ["8-bit", "retro", "game", "blocky", "square", "low-fi", "nintendo"] },
  { id: "bayer", name: "Bayer", blurb: "Ordered-dither monochrome", tags: ["dither", "retro", "mac", "classic", "ordered", "monochrome"] },
  { id: "atkinson", name: "Atkinson", blurb: "Original Mac dither pattern", tags: ["dither", "blue-noise", "mac", "classic", "monochrome", "apple"] },
  { id: "wireframe", name: "Wireframe", blurb: "Edge-traced technical drawing", tags: ["line", "outline", "edge", "technical", "sketch", "blueprint", "skeletal"] },
  { id: "crt", name: "CRT", blurb: "Cathode-ray scanlines + phosphor glow", tags: ["retro", "scanline", "tv", "monitor", "phosphor", "vintage", "80s"] },
  { id: "glitch", name: "Glitch", blurb: "Datamosh, broken signal", tags: ["broken", "distorted", "error", "datamosh", "harsh"] },
  { id: "badtv", name: "Bad TV", blurb: "VHS noise, analog distortion", tags: ["vhs", "analog", "distorted", "retro", "scanline", "tape"] },
  { id: "bloom", name: "Bloom", blurb: "Soft glowing aurora", tags: ["glow", "soft", "dreamy", "atmospheric", "warm", "halo"] },
  { id: "metal", name: "Metal", blurb: "Polished chrome reflection", tags: ["chrome", "shiny", "polished", "futuristic", "premium"] },
  { id: "iridescent", name: "Iridescent", blurb: "Holographic shimmer", tags: ["holographic", "foil", "rainbow", "shimmer", "y2k", "sticker"] },
  { id: "pencil", name: "Pencil", blurb: "Hand-sketched hatching", tags: ["sketch", "hatching", "drawn", "traditional", "illustration"] },
  { id: "corrupt", name: "Corrupt", blurb: "Memory-corruption green glitch", tags: ["broken", "matrix", "terminal", "green", "code"] },
  { id: "toon", name: "Toon", blurb: "Flat cel-shaded comic colors", tags: ["cartoon", "comic", "flat", "anime", "bold"] },
  { id: "threshold", name: "Threshold", blurb: "Hard high-contrast B&W", tags: ["monochrome", "contrast", "bold", "minimal", "noir"] },
  { id: "vapor", name: "Vapor", blurb: "Synthwave purple-pink gradient", tags: ["synthwave", "vaporwave", "80s", "retro", "neon", "purple", "pink"] },
  { id: "topographic", name: "Topographic", blurb: "Contour-line elevation map", tags: ["contour", "map", "cartography", "elevation", "lines"] },
];

// --- Tool input schemas (Zod) ------------------------------------------------

const FindPresetsSchema = z.object({
  vibe: z.string().min(1).describe("Vibe / aesthetic / use-case keyword. Examples: 'synthwave', 'print', 'retro', 'minimal', 'glow'. Matches against preset name, blurb, and tags."),
});

const BuildShareUrlSchema = z.object({
  look: z.string().describe("Preset id (use list_presets first to see options). Examples: 'halftone', 'aurora', 'vapor'."),
  selection: z.string().optional().describe("Country/region selection ISO code or name. 'world' for the whole globe, 'jpn' for Japan, etc. Defaults to 'world'."),
  dotColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().describe("Hex color for the dots, e.g. '#3df4ff'."),
  background: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().describe("Background hex color."),
  density: z.number().int().min(10).max(100).optional().describe("Dot density 10-100 (lower = sparser)."),
  shape: z.enum(["Circle", "Square", "Triangle", "Diamond", "Plus", "Cross", "Star"]).optional().describe("Dot shape."),
});

const EmbedSnippetSchema = z.object({
  look: z.string().describe("Preset id."),
  framework: z.enum(["iframe", "react", "script-tag"]).default("iframe").describe("Which embed flavor to generate. 'iframe' = raw HTML iframe (Webflow, Notion, WordPress). 'react' = drop-in component. 'script-tag' = vanilla JS loader."),
  width: z.union([z.number(), z.string()]).default(640).describe("Width: number (pixels) or string like '100%'."),
  height: z.union([z.number(), z.string()]).default(480).describe("Height: number (pixels) or string."),
});

const PreviewUrlSchema = z.object({
  look: z.string().describe("Preset id."),
});

// --- Tool implementations ----------------------------------------------------

const listPresets = () => {
  return PRESETS.map((p) => ({
    id: p.id,
    name: p.name,
    blurb: p.blurb,
    tags: p.tags,
    thumbnail_url: `${SITE_URL}/looks/${p.id}.png`,
    preview_url: `${SITE_URL}/embed?look=${p.id}`,
    detail_url: `${SITE_URL}/looks/${p.id}`,
  }));
};

const findPresets = (vibe: string) => {
  const q = vibe.toLowerCase().trim();
  const scored = PRESETS.map((p) => {
    const haystack = [p.id, p.name.toLowerCase(), p.blurb.toLowerCase(), ...p.tags].join(" ");
    if (haystack.includes(q)) {
      // Score: exact tag match > name match > blurb match
      let score = 0;
      if (p.tags.includes(q)) score += 10;
      if (p.name.toLowerCase() === q) score += 8;
      if (p.id === q) score += 8;
      if (p.tags.some((t) => t.includes(q))) score += 4;
      if (p.name.toLowerCase().includes(q)) score += 3;
      if (p.blurb.toLowerCase().includes(q)) score += 1;
      return { p, score };
    }
    return null;
  }).filter((x): x is { p: typeof PRESETS[number]; score: number } => x !== null);
  scored.sort((a, b) => b.score - a.score);
  return scored.map(({ p }) => ({
    id: p.id,
    name: p.name,
    blurb: p.blurb,
    tags: p.tags,
    thumbnail_url: `${SITE_URL}/looks/${p.id}.png`,
    preview_url: `${SITE_URL}/embed?look=${p.id}`,
  }));
};

const buildShareUrl = (input: z.infer<typeof BuildShareUrlSchema>) => {
  const preset = PRESETS.find((p) => p.id === input.look);
  if (!preset) {
    throw new Error(`Unknown preset "${input.look}". Use list_presets to see options.`);
  }
  // Build a partial config object. The main app's normalizeConfig will
  // fill in defaults for everything we omit, so we only need to set
  // the user-customized fields here.
  const config: Record<string, unknown> = { look: input.look };
  if (input.selection) config.selection = input.selection;
  if (input.dotColor) config.dotColor = input.dotColor;
  if (input.background) config.background = input.background;
  if (input.density !== undefined) config.density = input.density;
  if (input.shape) config.shape = input.shape;

  // base64url-encode (URL-safe variant, no padding) to match the app's encoder.
  const json = JSON.stringify(config);
  const base64 = Buffer.from(json, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  return {
    share_url: `${SITE_URL}/?c=${base64}`,
    embed_url: `${SITE_URL}/embed?c=${base64}`,
    config,
  };
};

const embedSnippet = (input: z.infer<typeof EmbedSnippetSchema>) => {
  const url = `${SITE_URL}/embed?look=${input.look}`;
  const w = typeof input.width === "number" ? `${input.width}` : input.width;
  const h = typeof input.height === "number" ? `${input.height}` : input.height;

  switch (input.framework) {
    case "react":
      return {
        framework: "react",
        snippet: `export const Globe = ({ look = "${input.look}", width = ${typeof input.width === "number" ? input.width : `"${input.width}"`}, height = ${typeof input.height === "number" ? input.height : `"${input.height}"`} }) => (
  <iframe
    src={\`https://globestudio.app/embed?look=\${look}\`}
    width={width}
    height={height}
    style={{ border: 0 }}
    loading="lazy"
    title="Globestudio dotted globe"
  />
);`,
      };
    case "script-tag":
      return {
        framework: "script-tag",
        snippet: `<div data-globestudio data-look="${input.look}" style="height:${h}${typeof input.height === "number" ? "px" : ""}"></div>
<script src="https://globestudio.app/embed.js" async></script>`,
      };
    case "iframe":
    default:
      return {
        framework: "iframe",
        snippet: `<iframe
  src="${url}"
  width="${w}"
  height="${h}"
  style="border:0"
  loading="lazy"
  title="Globestudio dotted globe"
></iframe>`,
      };
  }
};

const previewUrl = (look: string) => {
  const preset = PRESETS.find((p) => p.id === look);
  if (!preset) {
    throw new Error(`Unknown preset "${look}". Use list_presets to see options.`);
  }
  return {
    preset: { id: preset.id, name: preset.name, blurb: preset.blurb },
    embed_url: `${SITE_URL}/embed?look=${preset.id}`,
    thumbnail_url: `${SITE_URL}/looks/${preset.id}.png`,
    detail_url: `${SITE_URL}/looks/${preset.id}`,
  };
};

// --- MCP server wiring -------------------------------------------------------

const server = new Server(
  {
    name: "globestudio",
    version: "0.1.0",
  },
  {
    capabilities: {
      tools: {},
    },
  },
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "list_presets",
      description: "List every Globestudio look preset — id, name, blurb, vibe tags, thumbnail URL, embed URL. Call this first when the user asks about available looks.",
      inputSchema: { type: "object", properties: {}, additionalProperties: false },
    },
    {
      name: "find_presets",
      description: "Fuzzy-find presets by vibe / aesthetic / use-case keyword. Examples: 'synthwave' → Vapor; 'print' → Halftone, Risograph, Newsprint; 'retro' → CRT, BadTV, Pixel; 'glow' → Aurora, Bloom. Returns ranked matches.",
      inputSchema: {
        type: "object",
        properties: {
          vibe: { type: "string", description: "Vibe keyword. Single word or short phrase." },
        },
        required: ["vibe"],
        additionalProperties: false,
      },
    },
    {
      name: "build_share_url",
      description: "Build a Globestudio share URL for a customized globe (look + optional country/region, dot color, background, density, shape). Returns a URL the user can paste into a browser or embed.",
      inputSchema: {
        type: "object",
        properties: {
          look: { type: "string", description: "Preset id, e.g. 'halftone'." },
          selection: { type: "string", description: "Region: 'world', country code like 'jpn', or named region." },
          dotColor: { type: "string", description: "Hex color, e.g. '#3df4ff'.", pattern: "^#[0-9a-fA-F]{6}$" },
          background: { type: "string", description: "Background hex.", pattern: "^#[0-9a-fA-F]{6}$" },
          density: { type: "integer", minimum: 10, maximum: 100 },
          shape: { type: "string", enum: ["Circle", "Square", "Triangle", "Diamond", "Plus", "Cross", "Star"] },
        },
        required: ["look"],
        additionalProperties: false,
      },
    },
    {
      name: "embed_snippet",
      description: "Generate paste-ready embed code for any preset. Choose 'iframe' (HTML for Webflow / Notion / WordPress), 'react' (drop-in component), or 'script-tag' (vanilla JS loader).",
      inputSchema: {
        type: "object",
        properties: {
          look: { type: "string", description: "Preset id." },
          framework: { type: "string", enum: ["iframe", "react", "script-tag"], default: "iframe" },
          width: { description: "Number of pixels OR string like '100%'." },
          height: { description: "Number of pixels OR string." },
        },
        required: ["look"],
        additionalProperties: false,
      },
    },
    {
      name: "preview_url",
      description: "Get the canonical live embed URL + thumbnail PNG URL for a single preset. Useful when you want to render an inline preview without building a full share URL.",
      inputSchema: {
        type: "object",
        properties: {
          look: { type: "string", description: "Preset id." },
        },
        required: ["look"],
        additionalProperties: false,
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    let result: unknown;
    switch (name) {
      case "list_presets":
        result = listPresets();
        break;
      case "find_presets":
        result = findPresets(FindPresetsSchema.parse(args).vibe);
        break;
      case "build_share_url":
        result = buildShareUrl(BuildShareUrlSchema.parse(args));
        break;
      case "embed_snippet":
        result = embedSnippet(EmbedSnippetSchema.parse(args));
        break;
      case "preview_url":
        result = previewUrl(PreviewUrlSchema.parse(args).look);
        break;
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(result, null, 2),
        },
      ],
    };
  } catch (error) {
    return {
      content: [
        {
          type: "text",
          text: `Error: ${error instanceof Error ? error.message : String(error)}`,
        },
      ],
      isError: true,
    };
  }
});

// --- Entry point -------------------------------------------------------------

const main = async () => {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Stay alive — the MCP SDK keeps the process up via stdin reads.
};

main().catch((error) => {
  console.error("[globestudio-mcp] Fatal error:", error);
  process.exit(1);
});
