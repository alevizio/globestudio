import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SKILL_REFERENCES_DIR, buildSkillReferences } from "../scripts/skill-references.js";
import { AgentShare } from "./components/agent-share.jsx";
import { dotShapeOptions } from "./config/constants.js";
import { shaderEffectOptions } from "./config/shader-effects.js";
import { continentOptions, subregionOptions } from "./data/geography.js";
import { lookPresets } from "./data/look-presets.js";
import { MCP_URL } from "./utils/agent-prompt.js";
import { EMBED_URL_MAX } from "./utils/embed-snippets.js";
import { parseShareConfig } from "./utils/share-config.js";

// The agent skill in skills/globestudio states product facts that agents act
// on without checking, so each one is held to the code that defines it.

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(resolve(repoRoot, path), "utf8");
const schema = JSON.parse(read("public/schema/config.json"));
const MAX_POINTS = schema.properties.globeSettings.properties.dataPoints.maxItems;
const groupName = (option) => option.label.replace(/ \((Continent|Subregion)\)$/, "");
const SKILL_DIR = "skills/globestudio";
const LIMIT = `${EMBED_URL_MAX.toLocaleString("en-US")} characters`;

describe("the skill's reference files", () => {
  const built = buildSkillReferences();
  const reference = (name) => read(`${SKILL_REFERENCES_DIR}/${name}`);

  it.each(Object.keys(built))("references/%s matches a fresh build (npm run skill:references)", (name) => {
    expect(reference(name)).toBe(built[name]);
  });

  it("names every look by id and name, and Sonar by its id topographic", () => {
    const looks = reference("looks.md");
    for (const { id, name } of lookPresets) {
      expect(looks).toContain(`### ${id}\n\n${name}:`);
      expect(looks).toContain(`| \`${id}\` | ${name} |`);
    }
    expect(looks).toContain("| `topographic` | Sonar |");
  });

  it("lists the shapes, effects, continents and subregions the app offers", () => {
    const config = reference("config.md");
    for (const shape of dotShapeOptions) expect(config).toContain(`\`${shape}\``);
    for (const { value } of shaderEffectOptions) expect(config).toContain(`| \`${value}\` |`);
    const continents = continentOptions.map(groupName);
    expect(config).toContain(`${continents.length}: ${continents.map((name) => `\`${name}\``).join(", ")}.`);
    const subregions = subregionOptions.map(groupName);
    expect(config).toContain(`${subregions.length}: ${subregions.map((name) => `\`${name}\``).join(", ")}.`);
  });

  it("states the embed address limit and the data point cap", () => {
    const config = reference("config.md");
    expect(config).toContain(`under ${LIMIT}`);
    expect(config).toContain(`keeps the first ${MAX_POINTS} valid points`);
    expect(reference("embedding.md")).toContain(`under ${LIMIT}`);
  });

  it.each(Object.keys(built))("references/%s uses no em or en dashes", (name) => {
    expect(reference(name)).not.toMatch(/[\u2013\u2014]/);
  });
});

// SKILL.md's frontmatter: top-level keys, and one level under metadata.
// Double-quoted values are read as JSON strings, as YAML reads them.
const parseFrontmatter = (text) => {
  const fields = {};
  let parent = null;
  for (const line of text.split("\n")) {
    const [, indent, key, raw] = line.match(/^( *)([\w-]+):\s*(.*)$/);
    const value = raw.startsWith('"') ? JSON.parse(raw) : raw;
    if (indent) fields[parent][key] = value;
    else if (raw === "") fields[(parent = key)] = {};
    else fields[key] = value;
  }
  return fields;
};

// The commands each client tab of the export dialog's MCP tab shows.
const mcpTabCommands = () => {
  render(createElement(AgentShare, { getShareUrl: () => "https://globestudio.app/" }));
  const commands = [];
  for (const tab of screen.getAllByRole("tab")) {
    fireEvent.click(tab);
    for (const node of screen.getByRole("tabpanel").querySelectorAll("pre code")) commands.push(node.textContent);
  }
  cleanup();
  return commands;
};

const skill = read(`${SKILL_DIR}/SKILL.md`);
const [, frontmatter, body] = skill.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
const fields = parseFrontmatter(frontmatter);

describe("SKILL.md", () => {
  it("keeps to the six frontmatter fields every agent and claude.ai accept", () => {
    const allowed = ["name", "description", "license", "compatibility", "metadata", "allowed-tools"];
    for (const key of Object.keys(fields)) expect(allowed, key).toContain(key);
    expect(fields.license).toBe(JSON.parse(read("package.json")).license);
    expect(fields.metadata.version).toMatch(/^\d+\.\d+\.\d+$/);
  });

  it("is named after its folder, in the spec's characters", () => {
    expect(fields.name).toBe(SKILL_DIR.split("/").at(-1));
    expect(fields.name).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/);
    expect(fields.name.length).toBeLessThanOrEqual(64);
    expect(fields.name).not.toMatch(/claude|anthropic/);
  });

  it("describes itself in at most 1,024 characters, with no tags, and the look count", () => {
    // Quoted, and safe unquoted too: gh skill install writes it back
    // without the quotes, where ": " or " #" would break the YAML.
    expect(frontmatter).toMatch(/^description: "/m);
    expect(fields.description).not.toMatch(/: | #/);
    expect(fields.description.length).toBeGreaterThan(0);
    expect(fields.description.length).toBeLessThanOrEqual(1024);
    expect(fields.description).not.toMatch(/[<>]/);
    expect(fields.description).toContain(`${lookPresets.length} looks`);
  });

  it("keeps its body under 500 lines", () => {
    expect(body.split("\n").length).toBeLessThanOrEqual(500);
  });

  it("names every look with its id and the studio's name and blurb", () => {
    for (const { id, name, blurb } of lookPresets) expect(body).toContain(`| \`${id}\` | ${name} | ${blurb} |`);
    expect(body).toContain("`topographic` is the look people see as Sonar");
    for (const { id, settings } of lookPresets) {
      const effect = settings.shaderSettings.effect;
      if (effect && effect !== id) expect(body).toContain(`\`${id}\` runs \`${effect}\``);
    }
    for (const [, id] of body.matchAll(/\/looks\/([a-z]+)/g)) expect(lookPresets.map((look) => look.id)).toContain(id);
  });

  it("gives configs the app keeps whole", () => {
    const examples = [...body.matchAll(/```json\n([\s\S]*?)```/g)].map(([, text]) => JSON.parse(text));
    expect(examples.length).toBeGreaterThan(0);
    for (const example of examples) {
      const { v, ...config } = example;
      expect(v).toBe(2);
      expect(config).not.toHaveProperty("version");
      // {} keeps only the keys given, as the embed reads a config.
      expect(parseShareConfig(`?c=${encodeURIComponent(JSON.stringify(example))}`, {})).toMatchObject(config);
    }
  });

  it("lists the continents the app offers", () => {
    const names = continentOptions.map(groupName);
    expect(body).toContain(`Continents are ${names.slice(0, -1).join(", ")} and ${names.at(-1)}`);
  });

  it("states the embed address limit and the data point cap", () => {
    expect(body).toContain(`under ${LIMIT}`);
    expect(body).toContain(`Data points are at most ${MAX_POINTS}`);
  });

  it("connects the MCP server with the export dialog's own commands", () => {
    const tab = mcpTabCommands();
    const commands = (text) => [...text.matchAll(/`((?:claude|codex) mcp add [^`]+)`/g)].map(([, command]) => command);
    expect(commands(body).sort()).toEqual(tab.filter((command) => /^(claude|codex) mcp add /.test(command)).sort());
    expect(body).toContain(MCP_URL);
  });

  it.each(["SKILL.md", ...Object.keys(buildSkillReferences()).map((name) => `references/${name}`)])(
    "%s links only to files in the skill",
    (path) => {
      const text = read(`${SKILL_DIR}/${path}`);
      for (const [, target] of text.matchAll(/\]\(([^)]+)\)/g)) {
        if (/^(https?:|#)/.test(target)) continue;
        expect(existsSync(resolve(repoRoot, SKILL_DIR, dirname(path), target.split("#")[0])), target).toBe(true);
      }
    },
  );

  it("uses no em or en dashes", () => {
    expect(skill).not.toMatch(/[\u2013\u2014]/);
  });
});

describe("the Claude Code plugin", () => {
  // /plugin marketplace add alevizio/globestudio reads this file.
  const marketplace = JSON.parse(read(".claude-plugin/marketplace.json"));
  const [plugin] = marketplace.plugins;

  it("offers one plugin, installed as globestudio@globestudio", () => {
    expect(marketplace.plugins).toHaveLength(1);
    expect(plugin.name).toBe(fields.name);
    expect(marketplace.name).toBe(fields.name);
  });

  it("is the skill folder, with the skill's version", () => {
    expect(resolve(repoRoot, plugin.source)).toBe(resolve(repoRoot, SKILL_DIR));
    expect(plugin.skills).toEqual(["./"]);
    expect(plugin.version).toBe(fields.metadata.version);
    expect(plugin.license).toBe(fields.license);
    // Claude Code copies the plugin folder into its cache and runs npm
    // install there when it finds a package.json, and a plugin.json in a
    // skill folder turns every copied skill into a plugin.
    expect(existsSync(resolve(repoRoot, plugin.source, "package.json"))).toBe(false);
    expect(existsSync(resolve(repoRoot, plugin.source, ".claude-plugin"))).toBe(false);
  });

  it("bundles the hosted MCP server", () => {
    expect(plugin.mcpServers).toEqual({ globestudio: { type: "http", url: MCP_URL } });
  });
});

describe("the install commands", () => {
  const marketplace = JSON.parse(read(".claude-plugin/marketplace.json"));
  const [plugin] = marketplace.plugins;
  const repo = new URL(plugin.repository).pathname.slice(1);
  const npx = `npx skills add ${repo}`;
  const gh = `gh skill install ${repo} ${fields.name}`;
  const marketplaceAdd = `claude plugin marketplace add ${repo}`;
  const pluginInstall = `claude plugin install ${plugin.name}@${marketplace.name}`;

  it("point at this repo and this skill", () => {
    expect(repo).toBe("alevizio/globestudio");
  });

  it.each(["README.md", "src/components/docs-page.jsx", "src/components/integrations-page.jsx"])(
    "%s gives all three, and the telemetry opt out",
    (path) => {
      const text = read(path);
      for (const command of [npx, gh, marketplaceAdd, pluginInstall]) expect(text).toContain(command);
      expect(text).toContain("DISABLE_TELEMETRY=1");
    },
  );

  it("the export dialog's MCP tab gives the npx line", () => {
    expect(read("src/components/agent-share.jsx")).toContain(`"${npx}"`);
  });
});
