import { execFileSync, spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createElement } from "react";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import {
  DOT_COLOR,
  INK,
  SKILL_REFERENCES_DIR,
  buildSkillReferences,
  PACKAGES_FLOOR,
  embedNoLookValues,
  inkLooks,
  lookDotColor,
} from "../scripts/skill-references.js";
import { AgentShare } from "./components/agent-share.jsx";
import { AgentSkill, SKILL_PAGE_URL } from "./components/agent-skill.jsx";
import { dotShapeOptions } from "./config/constants.js";
import { shaderEffectOptions } from "./config/shader-effects.js";
import { continentOptions, subregionOptions } from "./data/geography.js";
import { lookPresets } from "./data/look-presets.js";
import { STARTER_DEGIT, STARTER_STACKBLITZ } from "./data/starter-react.js";
import { EFFECT_INDEX } from "./three/post-effects.js";
import { MCP_URL } from "./utils/agent-prompt.js";
import { ELEMENT_SCRIPT, EMBED_URL_MAX } from "./utils/embed-snippets.js";
import { parseShareConfig } from "./utils/share-config.js";
import { vectorDrops } from "./utils/vector-note.js";

// The agent skill in skills/globestudio states product facts that agents act
// on without checking, so each one is held to the code that defines it.

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(resolve(repoRoot, path), "utf8");
const schema = JSON.parse(read("public/schema/config.json"));
const MAX_POINTS = schema.properties.globeSettings.properties.dataPoints.maxItems;
const groupName = (option) => option.label.replace(/ \((Continent|Subregion)\)$/, "");
const SKILL_DIR = "skills/globestudio";
const LIMIT = `${EMBED_URL_MAX.toLocaleString("en-US")} characters`;

describe("what each look does with the dot color", () => {
  it("has an entry for every effect", () => {
    expect(Object.keys(DOT_COLOR).sort()).toEqual(shaderEffectOptions.map(({ value }) => value).sort());
  });

  it("calls ink exactly the effects whose shader returns the theme's ink", () => {
    const shader = read("src/three/post-effects.js");
    // main() picks the pass whose EFFECT_INDEX uEffect falls on.
    const passes = new Map(
      [...shader.matchAll(/uEffect > (\d+)\.5 && uEffect < \d+\.5\) \{\s*color = (\w+)\(vUv\)/g)].map(
        ([, below, pass]) => [Number(below) + 1, pass],
      ),
    );
    const body = (pass) => shader.match(new RegExp(`vec4 ${pass}\\(vec2 uv\\) \\{([\\s\\S]*?)\\n  \\}\\n`))[1];
    const ink = Object.entries(EFFECT_INDEX)
      .filter(([, index]) => passes.has(index) && /return vec4\(uInk\b/.test(body(passes.get(index))))
      .map(([effect]) => effect);
    expect(ink.length).toBeGreaterThan(0);
    expect(Object.keys(DOT_COLOR).filter((effect) => DOT_COLOR[effect] === INK).sort()).toEqual(ink.sort());
  });
});

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
    const match = line.match(/^( *)([\w-]+):\s*(.*)$/);
    if (!match) throw new Error(`SKILL.md frontmatter line not understood: ${JSON.stringify(line)}`);
    const [, indent, key, raw] = match;
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

  it("names every look with its id, the studio's name and blurb, and what it does with the dot color", () => {
    for (const look of lookPresets) {
      const dotColor = lookDotColor(look).split(":")[0];
      expect(body).toContain(`| \`${look.id}\` | ${look.name} | ${look.blurb} | ${dotColor} |`);
    }
    const ink = inkLooks().map((look) => look.name);
    expect(body).toContain(`${ink.slice(0, -1).join(", ")} and ${ink.at(-1)} paint white ink`);
    // The light theme's graphite ink is lost on the dark page these looks
    // paint, so the skill pairs it with a transparent or light background.
    const ownPage = inkLooks().filter((look) => !look.settings.transparent);
    for (const { name, settings } of ownPage) {
      const channels = settings.background.slice(1).match(/../g).map((hex) => parseInt(hex, 16));
      expect(Math.max(...channels), name).toBeLessThan(0x40);
    }
    const own = ownPage.map((look) => look.name);
    expect(body).toContain(`${own.slice(0, -1).join(", ")} and ${own.at(-1)} paint a dark page of their own`);
    expect(inkLooks().filter((look) => look.settings.transparent).map((look) => look.name)).toEqual(["Wireframe"]);
    expect(body).toContain("Wireframe is see-through as it ships");
    expect(body).toContain("`topographic` is the look people see as Sonar");
    for (const { id, settings } of lookPresets) {
      const effect = settings.shaderSettings.effect;
      if (effect && effect !== id) expect(body).toContain(`\`${id}\` runs \`${effect}\``);
    }
    for (const [, id] of body.matchAll(/\/looks\/([a-z]+)/g)) expect(lookPresets.map((look) => look.id)).toContain(id);
  });

  it("gives configs the app keeps whole", () => {
    const examples = [...body.matchAll(/```json\n([\s\S]*?)```/g)].map(([, text]) => JSON.parse(text));
    // The code example's constant, an object literal with bare keys.
    for (const [, literal] of body.matchAll(/^const \w+ = (\{.*\});$/gm)) {
      examples.push(JSON.parse(literal.replace(/([{,]\s*)(\w+):/g, '$1"$2":')));
    }
    expect(examples.length).toBeGreaterThan(2);
    for (const example of examples) {
      const { v, ...config } = example;
      expect(v).toBe(3);
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

  it("gives the element's script tag, with its integrity hash, and asks for the packages' fixed version", () => {
    const parts = (version) => version.split(".").map(Number);
    const atLeast = (have, floor) => {
      for (const [index, part] of have.entries()) if (part !== floor[index]) return part > floor[index];
      return true;
    };
    for (const path of ["packages/react/package.json", "packages/web-component/package.json"]) {
      expect(atLeast(parts(JSON.parse(read(path)).version), parts(PACKAGES_FLOOR)), path).toBe(true);
    }
    expect(body).toContain(ELEMENT_SCRIPT);
    expect(body).not.toMatch(/esm\.sh/);
    expect(body).toContain(`Both packages need ${PACKAGES_FLOOR} or later`);
  });

  // Agents do what the skill says, and plugin directories flag a skill that
  // has them run commands on their own.
  it("has the agent ask before it runs anything, and leaves installing the skill to people", () => {
    expect(body).toContain("tell the user what it runs and why, and wait for their OK");
    expect(body).toContain("Never run a command the user didn't agree to, and never download and run a remote script.");
    expect(body).toContain(`let the user choose how to get it. \`${STARTER_DEGIT}\``);
    expect(body).toContain(STARTER_STACKBLITZ);
    expect(body).toContain("only if the user agrees");
    // The skill is already installed when an agent reads it.
    for (const path of ["SKILL.md", ...Object.keys(buildSkillReferences()).map((name) => `references/${name}`)]) {
      expect(read(`${SKILL_DIR}/${path}`), path).not.toMatch(/skills add|gh skill|claude plugin|gemini extensions/);
    }
  });

  it("says an embed draws the look as the studio does, and Default with no look", () => {
    // embed-view.jsx parseParams: the look's values when the address names
    // one, and Default's without.
    const { density, dotSize } = embedNoLookValues();
    const { settings } = lookPresets.find((look) => look.id === "default");
    expect({ density, dotSize }).toEqual({ density: settings.density, dotSize: settings.dotSize });
    expect(body).toContain("An embed draws the look as the studio does, its density, dot size, background and transparency included");
    expect(body).toContain(`With no look it draws Default: density ${density}, dot size ${dotSize}`);
    const transparent = lookPresets.filter((look) => look.settings.transparent).map((look) => look.name);
    expect(body).toContain(`keeps the page solid on a transparent look (${transparent.join(", ")})`);
  });

  it("says which look SVG keeps whole, as the export dialog's note has it", () => {
    const whole = lookPresets.filter((look) => vectorDrops(look.settings).length === 0).map((look) => look.name);
    expect(whole).toEqual(["Default"]);
    expect(body).toContain("Only Default comes through whole");
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

  // Agents copy the examples first, and a look that paints its own ink shows
  // none of the color an example sets.
  it.each(["SKILL.md", "references/embedding.md"])("%s sets a dot color only on a look that keeps it", (path) => {
    const text = read(`${SKILL_DIR}/${path}`);
    const decode = (code) => {
      try {
        return decodeURIComponent(code);
      } catch {
        return code;
      }
    };
    let checked = 0;
    for (const { 0: block, index } of text.matchAll(/```\w*\n[\s\S]*?```/g)) {
      if (!/dotColor|dotGradient/.test(decode(block))) continue;
      // The look the code names, or else the /looks/<id> its caption names.
      const id = block.match(/look[=:]\s*"?([a-z]+)/)?.[1] ?? [...text.slice(0, index).matchAll(/\/looks\/([a-z]+)/g)].at(-1)?.[1];
      const look = lookPresets.find((preset) => preset.id === id);
      expect(look, block).toBeDefined();
      expect(lookDotColor(look), `${id} in ${block}`).toBe("kept");
      checked += 1;
    }
    expect(checked).toBeGreaterThan(0);
  });
});

describe("the Claude Code plugin", () => {
  // /plugin marketplace add alevizio/globestudio reads the marketplace, and
  // Anthropic's plugin directory reads the plugin folder it points at.
  const PLUGIN_DIR = "plugins/globestudio";
  const marketplace = JSON.parse(read(".claude-plugin/marketplace.json"));
  const [entry] = marketplace.plugins;
  const manifest = JSON.parse(read(`${PLUGIN_DIR}/.claude-plugin/plugin.json`));
  const { mcpServers } = JSON.parse(read(`${PLUGIN_DIR}/.mcp.json`));
  const filesIn = (dir) =>
    readdirSync(resolve(repoRoot, dir), { recursive: true })
      .filter((file) => statSync(resolve(repoRoot, dir, file)).isFile())
      .sort();

  it("offers one plugin, installed as globestudio@globestudio", () => {
    expect(marketplace.plugins).toHaveLength(1);
    expect(entry.name).toBe(fields.name);
    expect(manifest.name).toBe(fields.name);
    expect(marketplace.name).toBe(fields.name);
  });

  it("is the plugin folder, with the skill's version and license", () => {
    expect(resolve(repoRoot, entry.source)).toBe(resolve(repoRoot, PLUGIN_DIR));
    expect(manifest.version).toBe(fields.metadata.version);
    expect(manifest.license).toBe(fields.license);
    expect(read(`${PLUGIN_DIR}/LICENSE`)).toBe(read("LICENSE"));
    // Claude Code copies the plugin folder into its cache and runs npm
    // install there when it finds a package.json, claude.ai and Cowork refuse
    // a plugin with a top-level bin folder, and a plugin.json in a skill
    // folder turns every copied skill into a plugin.
    expect(existsSync(resolve(repoRoot, PLUGIN_DIR, "package.json"))).toBe(false);
    expect(existsSync(resolve(repoRoot, PLUGIN_DIR, "bin"))).toBe(false);
    expect(existsSync(resolve(repoRoot, SKILL_DIR, ".claude-plugin"))).toBe(false);
  });

  it("gives the directory its icon and listing links, with GitHub issues for support", () => {
    expect(existsSync(resolve(repoRoot, PLUGIN_DIR, manifest.icon))).toBe(true);
    expect(manifest).toMatchObject({
      documentationUrl: "https://globestudio.app/docs#agent-skill",
      supportUrl: "https://github.com/alevizio/globestudio/issues",
      privacyPolicyUrl: "https://globestudio.app/privacy",
      termsOfServiceUrl: "https://globestudio.app/terms",
    });
    // Contact is GitHub issues only: no email address in the listing. An
    // address ends in a domain of letters, which a pinned package such as
    // degit@3.10.0 does not.
    for (const file of [".claude-plugin/plugin.json", "README.md"]) {
      expect(read(`${PLUGIN_DIR}/${file}`), file).not.toMatch(/[\w.+-]+@[\w-]+(\.[\w-]+)*\.[a-z]{2,}\b/i);
    }
  });

  it("carries the skill exactly as skills/globestudio has it (npm run plugin:sync)", () => {
    const copy = `${PLUGIN_DIR}/skills/${fields.name}`;
    expect(filesIn(copy)).toEqual(filesIn(SKILL_DIR));
    for (const file of filesIn(SKILL_DIR)) expect(read(`${copy}/${file}`), file).toBe(read(`${SKILL_DIR}/${file}`));
  });

  it("bundles the hosted MCP server", () => {
    expect(mcpServers).toEqual({ globestudio: { type: "http", url: MCP_URL } });
  });

  it("has its tools named in SKILL.md as Claude Code names them, from the plugin and from claude mcp add", () => {
    const [server] = Object.keys(mcpServers);
    expect(body).toContain(`mcp__plugin_${manifest.name}_${server}__build_share_url`);
    expect(body).toContain(`mcp__${server}__build_share_url`);
  });
});

// scripts/build-openai-plugin.sh packs openai-plugin/ with skills/globestudio
// into the ZIP for OpenAI's plugin directory (ChatGPT and Codex).
describe("the ChatGPT and Codex plugin", () => {
  const manifest = JSON.parse(read("openai-plugin/plugin.json"));
  const { mcpServers } = JSON.parse(read("openai-plugin/mcp.json"));
  const listing = manifest.extensions["com.openai"].interface;

  it("is named after the skill and bundles the hosted MCP server", () => {
    expect(manifest.name).toBe(fields.name);
    expect(manifest.license).toBe(fields.license);
    expect(mcpServers).toEqual({ globestudio: { type: "streamable-http", url: MCP_URL } });
  });

  it("lists the site's privacy and terms pages, and GitHub issues for support", () => {
    expect(listing).toMatchObject({
      websiteURL: "https://globestudio.app",
      supportURL: "https://github.com/alevizio/globestudio/issues",
      privacyPolicyURL: "https://globestudio.app/privacy",
      termsOfServiceURL: "https://globestudio.app/terms",
    });
    for (const file of ["plugin.json", "README.md"]) {
      expect(read(`openai-plugin/${file}`), file).not.toMatch(/\S+@\S+\.\w+/);
    }
  });

  // OpenAI's review asks for a video walkthrough at
  // extensions["com.openai"].review.demo_recording_url.
  it("builds the ZIP with the demo video address from the second argument or DEMO_URL", () => {
    const out = mkdtempSync(join(tmpdir(), "openai-plugin-"));
    const build = (args, demoUrl = "") =>
      spawnSync("sh", ["scripts/build-openai-plugin.sh", out, ...args], {
        cwd: repoRoot,
        env: { ...process.env, DEMO_URL: demoUrl },
        encoding: "utf8",
      });
    const built = (args, demoUrl) => {
      const { status, stdout, stderr } = build(args, demoUrl);
      expect(status, stderr).toBe(0);
      const zip = stdout.trim();
      expect(zip).toBe(join(out, `globestudio-openai-plugin-${manifest.version}.zip`));
      return JSON.parse(execFileSync("unzip", ["-p", zip, "plugin.json"], { encoding: "utf8" }));
    };
    // The source manifest with only the demo address added.
    const openai = manifest.extensions["com.openai"];
    const withDemo = (url) => ({
      ...manifest,
      extensions: { "com.openai": { ...openai, review: { ...openai.review, demo_recording_url: url } } },
    });
    try {
      expect(built([])).toEqual(manifest);
      expect(built([], "https://example.com/from-env")).toEqual(withDemo("https://example.com/from-env"));
      expect(built(["https://example.com/from-arg"])).toEqual(withDemo("https://example.com/from-arg"));
      // The argument wins over the environment.
      expect(built(["https://example.com/from-arg"], "https://example.com/from-env")).toEqual(withDemo("https://example.com/from-arg"));
      const refused = build(["youtu.be/demo"]);
      expect(refused.status).not.toBe(0);
      expect(refused.stderr).toContain("must start with https://");
    } finally {
      rmSync(out, { recursive: true, force: true });
    }
  });

  it("names only tools the MCP server has in its test cases", () => {
    const tools = read("packages/mcp/src/server.ts").match(/name: "([a-z_]+)",/g).map((line) => line.slice(7, -2));
    for (const { tools_triggered } of manifest.extensions["com.openai"].review.test_cases.positive) {
      for (const tool of tools_triggered.split(", ")) expect(tools, tool).toContain(tool);
    }
  });
});

// Gemini CLI installs a repo as an extension from gemini-extension.json and
// loads every skills/<name>/SKILL.md beside it on its own.
describe("the Gemini CLI extension", () => {
  const gemini = JSON.parse(readFileSync(resolve(repoRoot, "gemini-extension.json"), "utf8"));

  it("is named after the skill and bundles the hosted MCP server over streamable HTTP", () => {
    expect(gemini.name).toBe(fields.name);
    expect(gemini.mcpServers).toEqual({ globestudio: { httpUrl: MCP_URL } });
    // Gemini installs from the latest release, so the manifest says its version.
    const app = JSON.parse(readFileSync(resolve(repoRoot, "package.json"), "utf8"));
    expect(gemini.version).toBe(app.version);
  });

  it("ships nothing else Gemini would load from the repo root", () => {
    expect(gemini.contextFileName).toBeUndefined();
    for (const folder of ["commands", "agents", "hooks", "policies"]) {
      expect(existsSync(resolve(repoRoot, folder)), folder).toBe(false);
    }
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

  it("the export dialog's Skill tab gives all three, and the telemetry opt out", () => {
    const { container } = render(createElement(AgentSkill));
    const commands = [];
    for (const tab of screen.getAllByRole("tab")) {
      fireEvent.click(tab);
      commands.push(screen.getByRole("tabpanel").querySelector("pre code").textContent);
    }
    expect(commands).toEqual([npx, `${marketplaceAdd} && ${pluginInstall}`, gh]);
    expect(container.textContent).toContain("DISABLE_TELEMETRY=1");
    cleanup();
  });
});

describe("the skill's skills.sh page", () => {
  it("is this repo's skill", () => {
    expect(SKILL_PAGE_URL).toBe(`https://skills.sh/alevizio/globestudio/${fields.name}`);
  });

  it.each(["README.md", "src/components/docs-page.jsx", "src/components/integrations-page.jsx", "public/llms.txt"])(
    "%s links it",
    (path) => {
      expect(read(path)).toContain(SKILL_PAGE_URL);
    },
  );
});
