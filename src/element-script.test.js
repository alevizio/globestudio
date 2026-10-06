import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ELEMENT_SCRIPT } from "./utils/embed-snippets.js";

// The tag that loads <globe-studio> with no build step pins a version on
// jsDelivr and carries an integrity hash, so a browser runs only the file
// with that hash. jsDelivr serves the file npm published, so the hash must
// be that of packages/web-component/index.js and the version that of its
// package.json. A change to the element fails here until every copy of the
// tag below is updated, and the new version must reach npm before a page
// can load it.

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (path) => readFileSync(resolve(repoRoot, path), "utf8");

const { version } = JSON.parse(read("packages/web-component/package.json"));
const integrity = `sha384-${createHash("sha384")
  .update(readFileSync(resolve(repoRoot, "packages/web-component/index.js")))
  .digest("base64")}`;
const TAG = `<script type="module" src="https://cdn.jsdelivr.net/npm/@globestudio/element@${version}/index.js" integrity="${integrity}" crossorigin="anonymous"></script>`;

// Every file that shows the tag.
const FILES = ["src/utils/embed-snippets.js", "packages/web-component/README.md", "public/llms.txt"];

describe("the element's script tag", () => {
  it("is the one the export dialog writes", () => {
    expect(ELEMENT_SCRIPT).toBe(TAG);
  });

  it.each(FILES)("%s shows it with the element's version and the hash of its file", (path) => {
    const text = read(path);
    const tags = text.match(/<script\b[^>]*@globestudio\/element[^>]*><\/script>/g) ?? [];
    expect(tags.length).toBeGreaterThan(0);
    for (const tag of tags) expect(tag).toBe(TAG);
    for (const [, hash] of text.matchAll(/integrity="([^"]*)"/g)) expect(hash).toBe(integrity);
    for (const [, pinned] of text.matchAll(/@globestudio\/element@([^/"'\s`]+)/g)) expect(pinned).toBe(version);
    expect(text).not.toMatch(/esm\.sh/);
  });
});
