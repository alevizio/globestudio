#!/usr/bin/env node
// Writes the agent skill's reference files (skills/globestudio/references/)
// from the app's own sources: npm run skill:references. Run it after changing
// a look, the config schema, the region lists, a limit or an embed package;
// src/skill-facts.test.js fails until the files match.
//
// The builder (scripts/skill-references.js) imports geography.js, which reads
// the countries through the slim-countries Vite plugin, so it loads through
// a Vite server with the project's config rather than plain Node.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const server = await createServer({
  root,
  configFile: resolve(root, "vite.config.js"),
  appType: "custom",
  logLevel: "warn",
  server: { middlewareMode: true, hmr: false, ws: false },
});

try {
  const { buildSkillReferences, SKILL_REFERENCES_DIR } = await server.ssrLoadModule("/scripts/skill-references.js");
  const dir = resolve(root, SKILL_REFERENCES_DIR);
  mkdirSync(dir, { recursive: true });
  for (const [name, text] of Object.entries(buildSkillReferences())) {
    writeFileSync(resolve(dir, name), text);
    console.log(`Wrote ${SKILL_REFERENCES_DIR}/${name}`);
  }
} finally {
  await server.close();
}
