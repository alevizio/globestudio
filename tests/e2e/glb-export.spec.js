import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";

const CANVAS_TIMEOUT = process.env.CI ? 40_000 : 20_000;
const EXPORT_TIMEOUT = process.env.CI ? 45_000 : 20_000;

test("exports the design as a GLB from the 3D tab", async ({ page }) => {
  // Glow off, as in the MCP tab tests: under software compositing the
  // glowing globe repaints behind the dialog for seconds per frame, and a
  // click then waits for the button to hold still. A GLB leaves the glow out.
  await page.goto(`/?c=${encodeURIComponent(JSON.stringify({ v: 1, globeSettings: { glow: false } }))}`);
  const canvas = page.locator(".globe-background canvas");
  await expect(canvas).toBeVisible({ timeout: CANVAS_TIMEOUT });
  await expect
    .poll(() => canvas.evaluate((node) => typeof node.exportGlb === "function"), { timeout: CANVAS_TIMEOUT })
    .toBe(true);
  await page.keyboard.press("d");
  const dialog = page.getByRole("dialog", { name: /export/i });
  await dialog.getByRole("tab", { name: "3D" }).click();
  await expect(dialog.getByRole("tab", { name: "3D" })).toHaveAccessibleDescription("GLB");
  await expect(dialog.getByText("Shader looks, effects and animation can't go into a GLB, only shapes and colors.")).toBeVisible();

  // Merged first, then Instanced.
  const save = async () => {
    const downloading = page.waitForEvent("download", { timeout: EXPORT_TIMEOUT });
    await dialog.getByRole("button", { name: /Export GLB|GLB saved/ }).click();
    const download = await downloading;
    expect(download.suggestedFilename()).toBe("globestudio-world-globe.glb");
    await expect(dialog.getByRole("button", { name: "GLB saved" })).toBeVisible();
    const bytes = await readFile(await download.path());
    expect(bytes.toString("latin1", 0, 4)).toBe("glTF");
    expect(bytes.readUInt32LE(4)).toBe(2);
    expect(bytes.readUInt32LE(8)).toBe(bytes.length);
    expect(bytes.toString("latin1", 16, 20)).toBe("JSON");
    const json = JSON.parse(bytes.toString("utf8", 20, 20 + bytes.readUInt32LE(12)));
    // The Default design: the dots, the globe body, 17 grid lines, and the
    // network's 14 arcs and 10 hub cities.
    expect(json.nodes).toHaveLength(2 + 17 + 14 + 10);
    return { json, dots: json.nodes.find((node) => node.name === "Dots") };
  };

  // The whole world at Density 40 is 1,365 dots of 20 vertices each.
  const merged = await save();
  const mesh = merged.json.meshes[merged.dots.mesh];
  expect(merged.json.accessors[mesh.primitives[0].attributes.POSITION].count).toBe(1365 * 20);
  expect(merged.json.extensionsRequired).toBeUndefined();

  await dialog.getByRole("button", { name: "Instanced" }).click();
  const instanced = await save();
  const instances = instanced.json.accessors[instanced.dots.extensions.EXT_mesh_gpu_instancing.attributes.TRANSLATION];
  expect(instances.count).toBe(1365);
  expect(instanced.json.extensionsRequired).toEqual(["EXT_mesh_gpu_instancing"]);
});
