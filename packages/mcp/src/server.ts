/**
 * Globestudio MCP server factory.
 *
 * Builds a configured low-level MCP `Server` with all six tools registered.
 * Shared by the stdio entry point (index.ts: Claude Desktop/Code, Cursor, …),
 * the hosted endpoint (http.ts, served at https://globestudio.app/mcp) and the
 * Smithery entry point (smithery.ts), so all of them expose identical tools.
 * Pure factory: no transport, no side effects on import.
 *
 * Tools:
 *   list_presets()                   → every shipped look with name, blurb, thumbnail, vibe tags
 *   find_presets({ vibe })           → fuzzy-match presets by vibe (e.g. "synthwave", "print")
 *   build_share_url({ look | share_url, ... }) → studio URL + embed URL, new or changed from a link
 *   read_share_url({ url })          → the look + settings a Globestudio link carries
 *   embed_snippet({ look, framework}) → paste-ready code for iframe/react/script-tag
 *   preview_url({ look })            → live /embed?look=<id> URL + thumbnail URL
 */

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import {
  encodeShareConfig,
  isRecord,
  mergeConfig,
  NESTED_KEYS,
  normalizeConfig,
  parseShareConfig,
  type ShareConfig,
} from "./share-config.js";

// --- Constants ---------------------------------------------------------------

const SITE_URL = "https://globestudio.app";

/**
 * Hardcoded preset catalog. Mirrors src/data/look-presets.js + preset-tags.js
 * from the main app. Kept inline so the MCP package has zero runtime deps on
 * the app source (publishable to npm independently). If you add a preset to
 * the app, also add it here — they have to match for share URLs to resolve.
 * Names and blurbs are the app's word for word. Tags hold every app tag,
 * then a few more vibe words find_presets matches. The contract test checks
 * all three.
 */
const PRESETS = [
  { id: "default", name: "Default", blurb: "Clean cartography", tags: ["clean", "minimal", "neutral", "simple", "starter"] },
  { id: "halftone", name: "Halftone", blurb: "Newspaper print, browser-rendered", tags: ["print", "vintage", "editorial", "newspaper", "dots", "retro"] },
  { id: "risograph", name: "Risograph", blurb: "Pink + cyan ink, misregistered on purpose", tags: ["print", "pink", "cyan", "riso", "ink", "vibrant", "modern", "zine"] },
  { id: "newsprint", name: "Newsprint", blurb: "CMYK, four plates, rotated like the pros", tags: ["cmyk", "print", "newspaper", "editorial", "vintage", "magazine"] },
  { id: "aurora", name: "Aurora", blurb: "Northern-lights bands across the planet", tags: ["glow", "atmospheric", "soft", "dreamy", "blue", "green", "space", "night"] },
  { id: "pixel", name: "Pixel", blurb: "An 8-bit world atlas", tags: ["8-bit", "retro", "game", "blocky", "square", "low-fi", "nintendo"] },
  { id: "bayer", name: "Bayer", blurb: "Classic-Mac threshold dither", tags: ["dither", "retro", "mac", "classic", "ordered", "monochrome"] },
  { id: "atkinson", name: "Atkinson", blurb: "Atkinson dither, sparser than Bayer", tags: ["dither", "blue-noise", "mac", "classic", "monochrome", "apple"] },
  { id: "wireframe", name: "Wireframe", blurb: "Edge-traced, like a hand pulled print", tags: ["line", "outline", "edge", "technical", "sketch", "blueprint", "skeletal"] },
  { id: "crt", name: "CRT", blurb: "Cathode-ray phosphor glow", tags: ["retro", "scanline", "tv", "monitor", "phosphor", "vintage", "80s"] },
  { id: "glitch", name: "Glitch", blurb: "Signal break, RGB split", tags: ["broken", "distorted", "error", "datamosh", "harsh"] },
  { id: "badtv", name: "Bad TV", blurb: "Analog tape decay", tags: ["vhs", "analog", "distorted", "retro", "scanline", "tape"] },
  { id: "bloom", name: "Bloom", blurb: "Atmosphere on fire", tags: ["glow", "soft", "dreamy", "atmospheric", "warm", "halo"] },
  { id: "metal", name: "Metal", blurb: "Liquid chrome, soft reflections", tags: ["chrome", "shiny", "polished", "futuristic", "premium"] },
  { id: "iridescent", name: "Iridescent", blurb: "Holographic foil sticker", tags: ["holographic", "foil", "rainbow", "shimmer", "y2k", "sticker"] },
  { id: "pencil", name: "Pencil", blurb: "Pencil-traced continents", tags: ["sketch", "hatching", "drawn", "traditional", "illustration"] },
  { id: "corrupt", name: "Corrupt", blurb: "Datamosh corruption, on purpose", tags: ["glitch", "broken", "datamosh", "harsh", "experimental", "matrix", "terminal", "green", "code"] },
  { id: "toon", name: "Toon", blurb: "Cel-shaded pop-art world", tags: ["cartoon", "cel-shaded", "pop-art", "bold", "comic", "illustration", "flat", "anime"] },
  { id: "threshold", name: "Threshold", blurb: "Pure two-tone binary", tags: ["binary", "two-tone", "minimal", "editorial", "contrast", "stark", "poster", "monochrome", "bold", "noir"] },
  { id: "vapor", name: "Vapor", blurb: "Synthwave horizon, pastel split", tags: ["synthwave", "vaporwave", "retro", "neon", "pastel", "80s", "miami", "purple", "pink"] },
  { id: "topographic", name: "Sonar", blurb: "Rings on a sonar screen", tags: ["sonar", "radar", "rings", "signal", "green", "tech", "scifi"] },
];

/**
 * Dot shapes the app accepts. Mirrors src/config/constants.js dotShapeOptions
 * (minus "Custom", which needs an uploaded shape payload the MCP can't supply).
 * If you add a shape to the app, also add it here — they have to match for the
 * ?c= config to validate.
 */
const DOT_SHAPES = [
  "Circle",
  "Hexagon",
  "Triangle",
  "Pentagon",
  "Square",
  "Voxel",
  "Particle Grid",
  "Diamond",
  "Star",
  "Plus",
  "Ring",
  "ASCII",
] as const;

/**
 * Region lookup tables for selection normalization. Generated from the same
 * world-countries dataset the app consumes (src/data/geography.js), with the
 * app's filters applied (no Antarctic, no UNSUPPORTED_DOTTED_MAP_CODES). If
 * the app's geography data changes, regenerate — they have to match for
 * selections to resolve on the other end.
 */
const CONTINENTS = ["Africa", "Asia", "Europe", "North America", "Oceania", "South America"];

const SUBREGIONS = [
  "Australia and New Zealand", "Caribbean", "Central America", "Central Asia", "Central Europe",
  "Eastern Africa", "Eastern Asia", "Eastern Europe", "Melanesia", "Middle Africa", "North America",
  "Northern Africa", "Northern Europe", "South America", "South-Eastern Asia", "Southeast Europe",
  "Southern Africa", "Southern Asia", "Southern Europe", "Western Africa", "Western Asia",
  "Western Europe",
];

const ALPHA2_TO_ALPHA3: Record<string, string> = {
  "AE": "ARE", "AF": "AFG", "AL": "ALB", "AM": "ARM", "AO": "AGO", "AR": "ARG", "AT": "AUT",
  "AU": "AUS", "AZ": "AZE", "BA": "BIH", "BD": "BGD", "BE": "BEL", "BF": "BFA", "BG": "BGR",
  "BI": "BDI", "BJ": "BEN", "BM": "BMU", "BN": "BRN", "BO": "BOL", "BR": "BRA", "BS": "BHS",
  "BT": "BTN", "BW": "BWA", "BY": "BLR", "BZ": "BLZ", "CA": "CAN", "CD": "COD", "CF": "CAF",
  "CG": "COG", "CH": "CHE", "CI": "CIV", "CL": "CHL", "CM": "CMR", "CN": "CHN", "CO": "COL",
  "CR": "CRI", "CU": "CUB", "CY": "CYP", "CZ": "CZE", "DE": "DEU", "DJ": "DJI", "DK": "DNK",
  "DO": "DOM", "DZ": "DZA", "EC": "ECU", "EE": "EST", "EG": "EGY", "EH": "ESH", "ER": "ERI",
  "ES": "ESP", "ET": "ETH", "FI": "FIN", "FJ": "FJI", "FK": "FLK", "FR": "FRA", "GA": "GAB",
  "GB": "GBR", "GE": "GEO", "GF": "GUF", "GH": "GHA", "GL": "GRL", "GM": "GMB", "GN": "GIN",
  "GQ": "GNQ", "GR": "GRC", "GT": "GTM", "GW": "GNB", "GY": "GUY", "HN": "HND", "HR": "HRV",
  "HT": "HTI", "HU": "HUN", "ID": "IDN", "IE": "IRL", "IL": "ISR", "IN": "IND", "IQ": "IRQ",
  "IR": "IRN", "IS": "ISL", "IT": "ITA", "JM": "JAM", "JO": "JOR", "JP": "JPN", "KE": "KEN",
  "KG": "KGZ", "KH": "KHM", "KP": "PRK", "KR": "KOR", "KW": "KWT", "KZ": "KAZ", "LA": "LAO",
  "LB": "LBN", "LK": "LKA", "LR": "LBR", "LS": "LSO", "LT": "LTU", "LU": "LUX", "LV": "LVA",
  "LY": "LBY", "MA": "MAR", "MD": "MDA", "ME": "MNE", "MG": "MDG", "MK": "MKD", "ML": "MLI",
  "MM": "MMR", "MN": "MNG", "MR": "MRT", "MT": "MLT", "MW": "MWI", "MX": "MEX", "MY": "MYS",
  "MZ": "MOZ", "NA": "NAM", "NC": "NCL", "NE": "NER", "NG": "NGA", "NI": "NIC", "NL": "NLD",
  "NO": "NOR", "NP": "NPL", "NZ": "NZL", "OM": "OMN", "PA": "PAN", "PE": "PER", "PG": "PNG",
  "PH": "PHL", "PK": "PAK", "PL": "POL", "PR": "PRI", "PS": "PSE", "PT": "PRT", "PY": "PRY",
  "QA": "QAT", "RO": "ROU", "RS": "SRB", "RU": "RUS", "RW": "RWA", "SA": "SAU", "SB": "SLB",
  "SD": "SDN", "SE": "SWE", "SI": "SVN", "SK": "SVK", "SL": "SLE", "SN": "SEN", "SO": "SOM",
  "SR": "SUR", "SS": "SSD", "SV": "SLV", "SY": "SYR", "SZ": "SWZ", "TD": "TCD", "TG": "TGO",
  "TH": "THA", "TJ": "TJK", "TL": "TLS", "TM": "TKM", "TN": "TUN", "TR": "TUR", "TT": "TTO",
  "TW": "TWN", "TZ": "TZA", "UA": "UKR", "UG": "UGA", "US": "USA", "UY": "URY", "UZ": "UZB",
  "VE": "VEN", "VN": "VNM", "VU": "VUT", "YE": "YEM", "ZA": "ZAF", "ZM": "ZMB", "ZW": "ZWE",
};

const COUNTRY_NAME_TO_ALPHA3: Record<string, string> = {
  "afghanistan": "AFG", "albania": "ALB", "algeria": "DZA", "angola": "AGO", "argentina": "ARG",
  "armenia": "ARM", "australia": "AUS", "austria": "AUT", "azerbaijan": "AZE", "bahamas": "BHS",
  "bangladesh": "BGD", "belarus": "BLR", "belgium": "BEL", "belize": "BLZ", "benin": "BEN",
  "bermuda": "BMU", "bhutan": "BTN", "bolivia": "BOL", "bosnia and herzegovina": "BIH",
  "botswana": "BWA", "brazil": "BRA", "brunei": "BRN", "bulgaria": "BGR", "burkina faso": "BFA",
  "burundi": "BDI", "cambodia": "KHM", "cameroon": "CMR", "canada": "CAN",
  "central african republic": "CAF", "chad": "TCD", "chile": "CHL", "china": "CHN",
  "colombia": "COL", "costa rica": "CRI", "croatia": "HRV", "cuba": "CUB", "cyprus": "CYP",
  "czechia": "CZE", "denmark": "DNK", "djibouti": "DJI", "dominican republic": "DOM",
  "dr congo": "COD", "ecuador": "ECU", "egypt": "EGY", "el salvador": "SLV",
  "equatorial guinea": "GNQ", "eritrea": "ERI", "estonia": "EST", "eswatini": "SWZ",
  "ethiopia": "ETH", "falkland islands": "FLK", "fiji": "FJI", "finland": "FIN", "france": "FRA",
  "french guiana": "GUF", "gabon": "GAB", "gambia": "GMB", "georgia": "GEO", "germany": "DEU",
  "ghana": "GHA", "greece": "GRC", "greenland": "GRL", "guatemala": "GTM", "guinea": "GIN",
  "guinea-bissau": "GNB", "guyana": "GUY", "haiti": "HTI", "honduras": "HND", "hungary": "HUN",
  "iceland": "ISL", "india": "IND", "indonesia": "IDN", "iran": "IRN", "iraq": "IRQ",
  "ireland": "IRL", "israel": "ISR", "italy": "ITA", "ivory coast": "CIV", "jamaica": "JAM",
  "japan": "JPN", "jordan": "JOR", "kazakhstan": "KAZ", "kenya": "KEN", "kuwait": "KWT",
  "kyrgyzstan": "KGZ", "laos": "LAO", "latvia": "LVA", "lebanon": "LBN", "lesotho": "LSO",
  "liberia": "LBR", "libya": "LBY", "lithuania": "LTU", "luxembourg": "LUX", "madagascar": "MDG",
  "malawi": "MWI", "malaysia": "MYS", "mali": "MLI", "malta": "MLT", "mauritania": "MRT",
  "mexico": "MEX", "moldova": "MDA", "mongolia": "MNG", "montenegro": "MNE", "morocco": "MAR",
  "mozambique": "MOZ", "myanmar": "MMR", "namibia": "NAM", "nepal": "NPL", "netherlands": "NLD",
  "new caledonia": "NCL", "new zealand": "NZL", "nicaragua": "NIC", "niger": "NER",
  "nigeria": "NGA", "north korea": "PRK", "north macedonia": "MKD", "norway": "NOR", "oman": "OMN",
  "pakistan": "PAK", "palestine": "PSE", "panama": "PAN", "papua new guinea": "PNG",
  "paraguay": "PRY", "peru": "PER", "philippines": "PHL", "poland": "POL", "portugal": "PRT",
  "puerto rico": "PRI", "qatar": "QAT", "republic of the congo": "COG", "romania": "ROU",
  "russia": "RUS", "rwanda": "RWA", "saudi arabia": "SAU", "senegal": "SEN", "serbia": "SRB",
  "sierra leone": "SLE", "slovakia": "SVK", "slovenia": "SVN", "solomon islands": "SLB",
  "somalia": "SOM", "south africa": "ZAF", "south korea": "KOR", "south sudan": "SSD",
  "spain": "ESP", "sri lanka": "LKA", "sudan": "SDN", "suriname": "SUR", "sweden": "SWE",
  "switzerland": "CHE", "syria": "SYR", "taiwan": "TWN", "tajikistan": "TJK", "tanzania": "TZA",
  "thailand": "THA", "timor-leste": "TLS", "togo": "TGO", "trinidad and tobago": "TTO",
  "tunisia": "TUN", "türkiye": "TUR", "turkmenistan": "TKM", "uganda": "UGA", "ukraine": "UKR",
  "united arab emirates": "ARE", "united kingdom": "GBR", "united states": "USA", "uruguay": "URY",
  "uzbekistan": "UZB", "vanuatu": "VUT", "venezuela": "VEN", "vietnam": "VNM",
  "western sahara": "ESH", "yemen": "YEM", "zambia": "ZMB", "zimbabwe": "ZWE",
};

const COUNTRY_CODES = new Set(Object.values(ALPHA2_TO_ALPHA3));

/**
 * Normalize a user-friendly selection ("jpn", "JP", "Japan", "Europe") into
 * the canonical value both surfaces require — the app's ?c= config
 * (share-config.js selection regex) and the embed's ?selection= param
 * (embed-view.jsx findAreaIds) both match areaOptions values: "world",
 * "country:JPN", "continent:Europe", "subregion:Western Europe".
 */
const normalizeSelection = (raw: string): string => {
  const value = raw.trim();
  if (!value || value.toLowerCase() === "world") return "world";

  const resolveCountry = (input: string): string | undefined => {
    const code = input.trim().toUpperCase();
    if (/^[A-Z]{3}$/.test(code) && COUNTRY_CODES.has(code)) return `country:${code}`;
    if (/^[A-Z]{2}$/.test(code) && ALPHA2_TO_ALPHA3[code]) return `country:${ALPHA2_TO_ALPHA3[code]}`;
    const byName = COUNTRY_NAME_TO_ALPHA3[input.trim().toLowerCase()];
    return byName ? `country:${byName}` : undefined;
  };
  const resolveRegion = (kind: "continent" | "subregion", input: string): string | undefined => {
    const list = kind === "continent" ? CONTINENTS : SUBREGIONS;
    const match = list.find((name) => name.toLowerCase() === input.trim().toLowerCase());
    return match ? `${kind}:${match}` : undefined;
  };

  // Canonical "kind:value" forms pass through, with code/name casing fixed up.
  const prefixed = /^(country|continent|subregion):(.+)$/i.exec(value);
  const resolved = prefixed
    ? (prefixed[1].toLowerCase() === "country"
        ? resolveCountry(prefixed[2])
        : resolveRegion(prefixed[1].toLowerCase() as "continent" | "subregion", prefixed[2]))
    : resolveCountry(value) ?? resolveRegion("continent", value) ?? resolveRegion("subregion", value);
  if (resolved) return resolved;

  throw new Error(
    `Unknown selection "${raw}". Use 'world', an ISO country code ('JP', 'JPN'), a country name ('Japan'), a continent ('Europe'), or a subregion ('Western Europe').`,
  );
};

// --- Tool input schemas (Zod) ------------------------------------------------

const FindPresetsSchema = z.object({
  vibe: z.string().min(1).describe("Vibe / aesthetic / use-case keyword. Examples: 'synthwave', 'print', 'retro', 'minimal', 'glow'. Matches against preset name, blurb, and tags."),
});

const BuildShareUrlSchema = z.object({
  look: z.string().optional().describe("Preset id (use list_presets first to see options). Examples: 'halftone', 'aurora', 'vapor'. Required unless share_url is given."),
  share_url: z.string().min(1).optional().describe("A Globestudio link to change instead of starting from a preset. Everything it sets is kept unless overridden here."),
  selection: z.string().optional().describe("Country/region selection: 'world' (default), an ISO country code ('JP' or 'JPN'), a country name ('Japan'), a continent ('Europe'), or a subregion ('Western Europe')."),
  dotColor: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().describe("Hex color for the dots, e.g. '#3df4ff'."),
  background: z.string().regex(/^#[0-9a-fA-F]{6}$/).optional().describe("Background hex color."),
  density: z.number().int().min(10).max(100).optional().describe("Dot density 10-100 (lower = sparser)."),
  shape: z.enum(DOT_SHAPES).optional().describe("Dot shape."),
  config: z.record(z.unknown()).optional().describe("Any other setting, using the keys read_share_url returns in config."),
});

const ReadShareUrlSchema = z.object({
  url: z.string().min(1).describe("A Globestudio link: a studio share link (/?c=…), a look link (/looks/<id>, with or without ?c=…) or an embed URL (/embed?…)."),
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

const isPresetId = (id: string) => PRESETS.some((p) => p.id === id);

// --- Reading links -------------------------------------------------------------

type LinkKind = "studio" | "look" | "embed";

type ParsedLink = {
  kind: LinkKind;
  origin: string;
  /** Preset the link starts from; null for studio links (they carry every setting). */
  look: string | null;
  /** Every setting the link applies, in the app's ?c= vocabulary. */
  config: ShareConfig;
  /** Embed-only query params (theme, static, …), kept as they were. */
  embedOptions: Record<string, string>;
};

const describeUrl = (raw: string) => (raw.length > 80 ? `${raw.slice(0, 77)}...` : raw);

const toUrl = (raw: string): URL => {
  const text = raw.trim();
  try {
    if (text.startsWith("/")) return new URL(text, SITE_URL);
    if (/^https?:\/\//i.test(text)) return new URL(text);
    return new URL(`https://${text}`);
  } catch {
    throw new Error(`"${describeUrl(raw)}" is not a URL. Pass the full Globestudio link.`);
  }
};

// Query params the embed reads straight into settings (embed-view.jsx
// parseParams + buildSettings), translated to their ?c= keys with the embed's
// own parsing and clamping. Anything else except c, look and app is an
// embed-only option (theme, static, source, …) and rides along untouched.
const readEmbedParams = (params: URLSearchParams) => {
  const settings: ShareConfig = {};
  const options: Record<string, string> = {};
  const size = (value: string, min: number, max: number) => {
    const n = Number(value);
    return Number.isFinite(n) && n > 0 ? Math.min(max, Math.max(min, n)) : undefined;
  };
  const bool = (value: string) => value === "1" || value === "true";
  // The embed reads params.get(key): the first of repeated keys wins.
  const seen = new Set<string>();
  for (const [key, value] of params) {
    if (seen.has(key)) continue;
    seen.add(key);
    switch (key) {
      case "c":
      case "look":
      case "app":
        break;
      case "dotColor":
      case "worldFill":
      case "background":
        if (value) settings[key] = `#${value.replace(/^#/, "")}`;
        break;
      case "density":
        if (value) settings.density = size(value, 1, 90);
        break;
      case "dotSize":
        if (value) settings.dotSize = size(value, 0.1, 25);
        break;
      case "selection":
      case "renderMode":
        if (value) settings[key] = value;
        break;
      case "tiltX":
      case "tiltY": {
        const n = Number(value);
        if (value && Number.isFinite(n)) settings[key] = Math.min(45, Math.max(-45, n));
        break;
      }
      case "transparent":
        settings.transparent = bool(value);
        break;
      case "autoSpin":
        settings.globeSettings = { autoSpin: bool(value) };
        break;
      case "view":
        settings.viewMode = value === "flat" ? "flat" : "globe";
        break;
      default:
        options[key] = value;
    }
  }
  return { settings: normalizeConfig(settings), options };
};

const parseLink = (raw: string): ParsedLink => {
  const url = toUrl(raw);
  const path = url.pathname.replace(/\/+$/, "") || "/";
  const shared = parseShareConfig(url.search) ?? {};

  if (path === "/") {
    return { kind: "studio", origin: url.origin, look: null, config: shared, embedOptions: {} };
  }

  const lookMatch = /^\/looks\/([a-z0-9-]+)$/i.exec(path);
  if (lookMatch) {
    // The app matches preset ids exactly (use-route-look.js).
    if (!isPresetId(lookMatch[1])) {
      throw new Error(`Unknown look "${lookMatch[1]}" in that link. Use list_presets to see options.`);
    }
    return { kind: "look", origin: url.origin, look: lookMatch[1], config: shared, embedOptions: {} };
  }

  if (path === "/embed") {
    // The embed falls back to the first preset (Default) for a missing or
    // unknown look, and ?c= wins over the dedicated params.
    const requested = url.searchParams.get("look");
    const look = requested && isPresetId(requested) ? requested : "default";
    const { settings, options } = readEmbedParams(url.searchParams);
    return { kind: "embed", origin: url.origin, look, config: mergeConfig(settings, shared), embedOptions: options };
  }

  throw new Error(
    `"${describeUrl(raw)}" is not a Globestudio share link. Expected a studio link (https://globestudio.app/?c=…), a look link (/looks/<id>) or an embed URL (/embed?…).`,
  );
};

// --- Building links ------------------------------------------------------------

// Studio: /looks/<id> applies the preset and ?c= layers the settings on top
// (the app's share-config import wins over the route preset by design, see
// src/hooks/use-share-config-import.js); a studio link without a look lands
// on "/" and ?c= carries everything. app=1 is the app's non-persisting teaser
// bypass: while the pre-launch coming-soon gate is up, recipients without it
// land on the waitlist and the config is discarded. Harmless after launch
// (the param is ignored).
const studioUrl = (look: string | null, config: ShareConfig) => {
  const path = look ? `/looks/${look}` : "/";
  return Object.keys(config).length > 0
    ? `${SITE_URL}${path}?c=${encodeShareConfig(config)}&app=1`
    : `${SITE_URL}${path}?app=1`;
};

// Embed: dedicated query params where they exist (embed-view.jsx parseParams,
// hex colors WITHOUT the '#'), view=flat, which the embed reads ahead of
// the config's own view, then ?c= for everything else. The embed caps its
// density param at 90, so a higher density stays in ?c=.
const embedUrl = (look: string | null, config: ShareConfig, options: Record<string, string>) => {
  const params: string[] = look ? [`look=${look}`] : [];
  const rest: ShareConfig = { ...config };
  for (const key of ["selection", "dotColor", "background", "density"]) {
    const value = config[key];
    if (value === undefined) continue;
    if (key === "density" && (typeof value !== "number" || value > 90)) continue;
    const text = String(value);
    params.push(`${key}=${encodeURIComponent(key === "dotColor" || key === "background" ? text.slice(1) : text)}`);
    delete rest[key];
  }
  if (config.viewMode === "flat") params.push("view=flat");
  for (const [key, value] of Object.entries(options)) {
    params.push(`${encodeURIComponent(key)}=${encodeURIComponent(value)}`);
  }
  if (Object.keys(rest).length > 0) params.push(`c=${encodeShareConfig(rest)}`);
  return params.length > 0 ? `${SITE_URL}/embed?${params.join("&")}` : `${SITE_URL}/embed`;
};

const IGNORED_NOTE = "Globestudio does not accept these keys or values, so they were left out.";

const NESTED = new Set<string>(NESTED_KEYS);

// Keys (and nested keys) of a requested config the app would drop.
const ignoredKeys = (requested: Record<string, unknown>, kept: ShareConfig) => {
  const ignored: string[] = [];
  for (const [key, value] of Object.entries(requested)) {
    const keptValue = kept[key];
    if (keptValue === undefined) {
      ignored.push(key);
    } else if (NESTED.has(key) && isRecord(value) && isRecord(keptValue)) {
      for (const sub of Object.keys(value)) if (!(sub in keptValue)) ignored.push(`${key}.${sub}`);
    }
  }
  return ignored;
};

const buildShareUrl = (input: z.infer<typeof BuildShareUrlSchema>) => {
  if (input.look !== undefined && !isPresetId(input.look)) {
    throw new Error(`Unknown preset "${input.look}". Use list_presets to see options.`);
  }
  const base = input.share_url ? parseLink(input.share_url) : null;
  if (!base && input.look === undefined) {
    throw new Error("Pass look (a preset id from list_presets) or share_url (a Globestudio link to change).");
  }
  if (base?.kind === "studio" && input.look !== undefined) {
    throw new Error(
      "That link was copied from the studio and stores every setting, so a look would not change it. To switch looks, call build_share_url with look and without share_url, then pass the settings you want to keep.",
    );
  }

  // Requested changes: the free-form config first, the named fields win.
  // "look" is NOT a ?c= config key (the app's normalizeConfig silently drops
  // it); the preset rides on the URL instead: /looks/<id> path for the
  // studio, ?look=<id> for the embed.
  const requested: Record<string, unknown> = { ...(input.config ?? {}) };
  if (typeof requested.selection === "string") requested.selection = normalizeSelection(requested.selection);
  if (input.selection) requested.selection = normalizeSelection(input.selection);
  if (input.dotColor) requested.dotColor = input.dotColor;
  if (input.background) requested.background = input.background;
  if (input.density !== undefined) requested.density = input.density;
  if (input.shape) requested.shape = input.shape;
  const changes = normalizeConfig(requested);

  const look = input.look ?? base?.look ?? null;
  const config = mergeConfig(base?.config ?? {}, changes);
  const ignored = input.config ? ignoredKeys(input.config, changes) : [];

  return {
    share_url: studioUrl(look, config),
    embed_url: embedUrl(look, config, base?.embedOptions ?? {}),
    look,
    config,
    ...(ignored.length > 0 ? { ignored, ignored_note: IGNORED_NOTE } : {}),
  };
};

// The handful of settings that describe a globe at a glance.
const summarize = (look: string | null, config: ShareConfig) => {
  const shader = isRecord(config.shaderSettings) ? config.shaderSettings : undefined;
  const globe = isRecord(config.globeSettings) ? config.globeSettings : undefined;
  const summary: Record<string, unknown> = {
    look: look ?? undefined,
    selection: config.selection,
    view: config.viewMode,
    dotColor: config.dotColor,
    background: config.background,
    transparent: config.transparent,
    density: config.density,
    dotSize: config.dotSize,
    shape: config.shape,
    renderMode: config.renderMode,
    effect: shader?.effect,
    autoSpin: globe?.autoSpin,
  };
  return Object.fromEntries(Object.entries(summary).filter(([, value]) => value !== undefined));
};

const readShareUrl = (input: z.infer<typeof ReadShareUrlSchema>) => {
  const link = parseLink(input.url);
  const empty = Object.keys(link.config).length === 0;
  return {
    kind: link.kind,
    look: link.look,
    source_origin: link.origin,
    summary: summarize(link.look, link.config),
    config: link.config,
    ...(Object.keys(link.embedOptions).length > 0 ? { embed_options: link.embedOptions } : {}),
    share_url: studioUrl(link.look, link.config),
    embed_url: embedUrl(link.look, link.config, link.embedOptions),
    note: link.kind === "studio"
      ? (empty
          ? "This link carries no settings, so it opens the studio as it is."
          : "Studio links store every setting. To change some, call build_share_url with share_url set to this link and only the settings to change.")
      : `Settings not listed come from the ${link.look} look. To change some, call build_share_url with share_url set to this link and only the settings to change.`,
  };
};

const embedSnippet = (input: z.infer<typeof EmbedSnippetSchema>) => {
  // Unknown looks silently render the Default preset in the embed — fail
  // loudly here instead so the caller can correct the id.
  const preset = PRESETS.find((p) => p.id === input.look);
  if (!preset) {
    throw new Error(`Unknown preset "${input.look}". Use list_presets to see options.`);
  }
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

// --- Tool catalog (advertised to the client) ---------------------------------

const TOOL_DEFS = [
  {
    name: "list_presets",
    description: "List every Globestudio look preset with its id, name, blurb, vibe tags, thumbnail URL and embed URL. Call this first when the user asks about available looks.",
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
    description: "Build Globestudio URLs for a customized globe. Start from a preset (look) or change an existing link (share_url, e.g. one the user pasted): pass only the settings to change and everything else in the link is kept. Returns share_url (opens the studio with those settings) and embed_url (the bare canvas, for iframes).",
    inputSchema: {
      type: "object",
      properties: {
        look: { type: "string", description: "Preset id, e.g. 'halftone'. Required unless share_url is given." },
        share_url: { type: "string", description: "A Globestudio link to change instead of starting from a preset." },
        selection: { type: "string", description: "Region: 'world' (default), ISO country code ('JP' or 'JPN'), country name ('Japan'), continent ('Europe'), or subregion ('Western Europe')." },
        dotColor: { type: "string", description: "Hex color, e.g. '#3df4ff'.", pattern: "^#[0-9a-fA-F]{6}$" },
        background: { type: "string", description: "Background hex.", pattern: "^#[0-9a-fA-F]{6}$" },
        density: { type: "integer", minimum: 10, maximum: 100 },
        shape: { type: "string", enum: [...DOT_SHAPES] },
        config: {
          type: "object",
          description: "Any other setting, using the keys read_share_url returns in config, e.g. {\"viewMode\": \"flat\"} or {\"globeSettings\": {\"autoSpin\": false}}. Nested settings merge key by key; keys Globestudio does not accept come back in ignored.",
          additionalProperties: true,
        },
      },
      additionalProperties: false,
    },
  },
  {
    name: "read_share_url",
    description: "Decode a Globestudio link (a studio share link, a /looks/<id> link or an /embed URL) into the look and settings it carries. Use it when the user pastes a link, then pass the link as share_url to build_share_url with the changes they ask for.",
    inputSchema: {
      type: "object",
      properties: {
        url: { type: "string", description: "The Globestudio link, e.g. 'https://globestudio.app/?c=…'." },
      },
      required: ["url"],
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
];

// --- Factory -----------------------------------------------------------------

const INSTRUCTIONS = [
  "Globestudio makes dotted globe and map visuals. A link carries the whole design: /looks/<id> picks a preset look and ?c= carries the settings.",
  "To change a link the user pastes, call read_share_url, then build_share_url with share_url set to that link and only the settings to change.",
  "Every tool builds URLs locally: nothing is stored and no account is needed.",
  "A coding agent working in a project can also add the Globestudio skill, which teaches the link format and the embed packages: npx skills add alevizio/globestudio.",
].join(" ");

/** Build a fully-wired Globestudio MCP Server (no transport attached). */
export function createServer(): Server {
  const server = new Server(
    {
      name: "globestudio",
      version: "0.2.2",
    },
    {
      capabilities: {
        tools: {},
      },
      instructions: INSTRUCTIONS,
    },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOL_DEFS }));

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
        case "read_share_url":
          result = readShareUrl(ReadShareUrlSchema.parse(args));
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
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
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

  return server;
}
