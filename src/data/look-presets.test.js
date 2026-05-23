import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { lookPresets } from "./look-presets.js";
import { presetSeo } from "./preset-seo.js";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..", "..");

const loadSchema = (name) =>
  JSON.parse(readFileSync(resolve(repoRoot, "public", "schema", name), "utf8"));

const lookPresetSchema = loadSchema("look-preset.json");
const configSchema = loadSchema("config.json");

const ID_PATTERN = new RegExp(lookPresetSchema.properties.id.pattern);

describe("look-presets contract", () => {
  it("schema is self-consistent", () => {
    expect(lookPresetSchema.$id).toBe(
      "https://globestudio.app/schema/look-preset.json",
    );
    expect(lookPresetSchema.required).toEqual(["id", "name", "blurb", "settings"]);
  });

  it("every preset has the required top-level fields", () => {
    for (const preset of lookPresets) {
      for (const field of lookPresetSchema.required) {
        expect(preset, `preset ${preset.id ?? "<missing id>"}.${field}`).toHaveProperty(field);
      }
    }
  });

  it("preset ids match the kebab-case pattern", () => {
    for (const preset of lookPresets) {
      expect(preset.id, `preset ${preset.id}`).toMatch(ID_PATTERN);
    }
  });

  it("preset ids are unique", () => {
    const seen = new Set();
    for (const preset of lookPresets) {
      expect(seen.has(preset.id), `duplicate id: ${preset.id}`).toBe(false);
      seen.add(preset.id);
    }
  });

  it("preset ids are a subset of the config schema `preset` enum", () => {
    const allowed = new Set(configSchema.properties.preset.enum);
    for (const preset of lookPresets) {
      expect(allowed.has(preset.id), `preset id ${preset.id} missing from config.json#properties.preset.enum`).toBe(true);
    }
  });

  it("name + blurb fit within the documented length budget", () => {
    const nameMax = lookPresetSchema.properties.name.maxLength;
    const blurbMax = lookPresetSchema.properties.blurb.maxLength;
    for (const preset of lookPresets) {
      expect(preset.name.length, `${preset.id}.name`).toBeLessThanOrEqual(nameMax);
      expect(preset.blurb.length, `${preset.id}.blurb`).toBeLessThanOrEqual(blurbMax);
      expect(preset.blurb.endsWith("."), `${preset.id}.blurb has trailing period`).toBe(false);
    }
  });

  it("previewImage (when present) is a valid path/url", () => {
    const pattern = new RegExp(lookPresetSchema.properties.previewImage.pattern);
    for (const preset of lookPresets) {
      if (preset.previewImage === undefined) continue;
      expect(preset.previewImage, `${preset.id}.previewImage`).toMatch(pattern);
    }
  });

  it("settings.shaderSettings.effect (when set) is in the config schema enum", () => {
    const allowedEffects = new Set(
      configSchema.properties.shaderSettings.properties.effect.enum,
    );
    for (const preset of lookPresets) {
      const effect = preset.settings?.shaderSettings?.effect;
      if (effect === undefined) continue;
      expect(allowedEffects.has(effect), `${preset.id}: effect "${effect}" not in schema enum`).toBe(true);
    }
  });

  it("every preset has matching SEO copy", () => {
    for (const preset of lookPresets) {
      expect(presetSeo, `presetSeo missing entry for ${preset.id}`).toHaveProperty(preset.id);
    }
  });
});
