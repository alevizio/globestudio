import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { SKILL_REFERENCES_DIR, buildSkillReferences } from "../scripts/skill-references.js";
import { dotShapeOptions } from "./config/constants.js";
import { shaderEffectOptions } from "./config/shader-effects.js";
import { continentOptions, subregionOptions } from "./data/geography.js";
import { lookPresets } from "./data/look-presets.js";
import { EMBED_URL_MAX } from "./utils/embed-snippets.js";

// The agent skill in skills/globestudio states product facts that agents act
// on without checking, so each one is held to the code that defines it.

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(resolve(repoRoot, path), "utf8");
const schema = JSON.parse(read("public/schema/config.json"));
const MAX_POINTS = schema.properties.globeSettings.properties.dataPoints.maxItems;
const groupName = (option) => option.label.replace(/ \((Continent|Subregion)\)$/, "");

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
    expect(config).toContain(`under ${EMBED_URL_MAX.toLocaleString("en-US")} characters`);
    expect(config).toContain(`keeps the first ${MAX_POINTS} valid points`);
    expect(reference("embedding.md")).toContain(`under ${EMBED_URL_MAX.toLocaleString("en-US")} characters`);
  });

  it.each(Object.keys(built))("references/%s uses no em or en dashes", (name) => {
    expect(reference(name)).not.toMatch(/[–—]/);
  });
});
