import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, resolve } from "node:path";
import { describe, expect, it } from "vitest";

// analytics.jsx asks that /privacy discloses exactly the events the app
// sends. Compare the event names in track("…") calls across src with the
// <code>event_name</code> entries on the privacy page.
const srcDir = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const sourceFiles = readdirSync(srcDir, { recursive: true })
  .filter((file) => /\.jsx?$/.test(file) && !/\.test\.jsx?$/.test(file))
  .map((file) => readFileSync(join(srcDir, file), "utf8"));

const firedEvents = new Set(
  sourceFiles.flatMap((source) =>
    [...source.matchAll(/\btrack\(\s*"([a-z_]+)"/g)].map((match) => match[1]),
  ),
);
const privacySource = readFileSync(join(srcDir, "components/privacy-page.jsx"), "utf8");
const disclosedEvents = new Set(
  [...privacySource.matchAll(/<code>([a-z]+(?:_[a-z]+)+)<\/code>/g)].map((match) => match[1]),
);

describe("privacy page", () => {
  it("finds the app's analytics events", () => {
    expect(firedEvents).toContain("export_completed");
    expect(firedEvents).toContain("client_error");
  });

  it("discloses exactly the events the app sends", () => {
    expect([...disclosedEvents].sort()).toEqual([...firedEvents].sort());
  });
});
