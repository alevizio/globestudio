import { readFile } from "node:fs/promises";
import { expect, test } from "@playwright/test";
import validator from "gltf-validator";

const CANVAS_TIMEOUT = process.env.CI ? 40_000 : 20_000;
const EXPORT_TIMEOUT = process.env.CI ? 45_000 : 20_000;
// Solid land comes after the 1:50m atlas loads, which on a cold CI dev
// server took about 66 s (flat-solid-framing.spec.js).
const TEXTURE_TIMEOUT = process.env.CI ? 150_000 : 30_000;

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

test.describe("the GLB of a design", () => {
  // Opens a design, with the glow off as above.
  const openDesign = async (page, config) => {
    const globeSettings = { glow: false, ...config.globeSettings };
    await page.goto(`/?c=${encodeURIComponent(JSON.stringify({ v: 1, ...config, globeSettings }))}`);
    const canvas = page.locator(".globe-background canvas");
    await expect(canvas).toBeVisible({ timeout: CANVAS_TIMEOUT });
    await expect
      .poll(() => canvas.evaluate((node) => typeof node.exportGlb === "function"), { timeout: CANVAS_TIMEOUT })
      .toBe(true);
    return canvas;
  };

  // The canvas's GLB: its glTF JSON and bytes, and for each embedded image
  // the number of pixels that are see-through under half, read in the page.
  const exportGlb = async (canvas, { instanced = false } = {}) => {
    const { json, faint, base64 } = await canvas.evaluate(async (node, asInstances) => {
      const buffer = await node.exportGlb({ instanced: asInstances });
      const jsonLength = new DataView(buffer).getUint32(12, true);
      const gltf = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 20, jsonLength)));
      const binStart = 20 + jsonLength + 8;
      const faintPixels = await Promise.all((gltf.images ?? []).map(async (image) => {
        const view = gltf.bufferViews[image.bufferView];
        const bytes = new Uint8Array(buffer, binStart + (view.byteOffset ?? 0), view.byteLength);
        const bitmap = await createImageBitmap(new Blob([bytes], { type: image.mimeType }));
        const context = new OffscreenCanvas(bitmap.width, bitmap.height).getContext("2d");
        context.drawImage(bitmap, 0, 0);
        const { data } = context.getImageData(0, 0, bitmap.width, bitmap.height);
        let count = 0;
        for (let i = 3; i < data.length; i += 4) if (data[i] > 0 && data[i] < 128) count += 1;
        return count;
      }));
      const all = new Uint8Array(buffer);
      let binary = "";
      for (let i = 0; i < all.length; i += 0x8000) binary += String.fromCharCode(...all.subarray(i, i + 0x8000));
      return { json: gltf, faint: faintPixels, base64: btoa(binary) };
    }, instanced);
    const bytes = Buffer.from(base64, "base64");
    const { issues } = await validator.validateBytes(new Uint8Array(bytes));
    expect(issues.numErrors).toBe(0);
    expect(issues.numWarnings).toBe(0);
    return { json, faint, bytes };
  };

  // The materials the dots are drawn with, over every Dots primitive.
  const dotMaterials = (json) =>
    json.nodes
      .filter((node) => node.name === "Dots")
      .flatMap((node) => json.meshes[node.mesh].primitives.map((primitive) => json.materials[primitive.material]));

  // An accessor's values, one array per element, from the BIN chunk.
  const readAccessor = (bytes, json, index) => {
    const accessor = json.accessors[index];
    const view = json.bufferViews[accessor.bufferView];
    const size = { SCALAR: 1, VEC2: 2, VEC3: 3, VEC4: 4 }[accessor.type];
    const start = 20 + bytes.readUInt32LE(12) + 8 + (view.byteOffset ?? 0) + (accessor.byteOffset ?? 0);
    const stride = view.byteStride ?? size * 4;
    return Array.from({ length: accessor.count }, (_, i) =>
      Array.from({ length: size }, (__, k) => bytes.readFloatLE(start + i * stride + k * 4)));
  };

  test("saves spinning dots at the design's own Rotation", async ({ page }) => {
    // Flat, where each Square dot's turn is an angle about Z. Shape
    // rotation at full speed turns a third of the dots each frame.
    const canvas = await openDesign(page, { viewMode: "flat", shape: "Square", dotRotation: 20, shapeRotationSpeed: 100 });
    const { json, bytes } = await exportGlb(canvas, { instanced: true });
    const dots = json.nodes.find((node) => node.name === "Dots");
    const rotations = readAccessor(bytes, json, dots.extensions.EXT_mesh_gpu_instancing.attributes.ROTATION);
    const angles = new Set(rotations.map(([, , z, w]) => Math.round((2 * Math.atan2(z, w) * 180) / Math.PI)));
    expect([...angles]).toEqual([20]);
  });

  test("blends Solid land at its own alpha, so a land color under 50% alpha stays", async ({ page }) => {
    const canvas = await openDesign(page, { renderMode: "solid", worldFillAlpha: 0.4 });
    // The land arrives with the atlas.
    let glb;
    await expect
      .poll(async () => {
        glb = await exportGlb(canvas);
        return glb.json.images?.length ?? 0;
      }, { timeout: TEXTURE_TIMEOUT })
      .toBe(1);
    const land = glb.json.materials.find((material) => material.pbrMetallicRoughness.baseColorTexture);
    expect(land.alphaMode).toBe("BLEND");
    expect(land.alphaCutoff).toBeUndefined();
    // The land is drawn at 40%, which a cutoff of 0.5 would drop.
    expect(glb.faint[0]).toBeGreaterThan(10_000);
  });

  test("cuts ASCII glyphs from their textures, one per character", async ({ page }) => {
    const canvas = await openDesign(page, { shape: "ASCII", asciiSymbol: "AB" });
    const { json } = await exportGlb(canvas);
    expect(json.images).toHaveLength(2);
    // Merged: one mesh, with a primitive for each character.
    expect(json.nodes.filter((node) => node.name === "Dots")).toHaveLength(1);
    const materials = dotMaterials(json);
    expect(materials).toHaveLength(2);
    for (const material of materials) {
      expect(material.pbrMetallicRoughness.baseColorTexture).toBeDefined();
      expect(material.alphaMode).toBe("MASK");
      expect(material.alphaCutoff).toBeCloseTo(0.18, 5);
      expect(material.doubleSided).toBe(true);
    }
  });

  test("cuts a custom shape from its texture", async ({ page }) => {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 10 10"><path d="M5 0 10 10H0z" fill="#fff"/></svg>';
    const dataUrl = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    const canvas = await openDesign(page, { shape: "Custom", customShape: { name: "triangle.svg", type: "image/svg+xml", dataUrl } });
    // The shape's texture comes once the SVG has decoded.
    let glb;
    await expect
      .poll(async () => {
        glb = await exportGlb(canvas);
        return glb.json.images?.length ?? 0;
      }, { timeout: CANVAS_TIMEOUT })
      .toBe(1);
    const [material] = dotMaterials(glb.json);
    expect(material.alphaMode).toBe("MASK");
    expect(material.alphaCutoff).toBeCloseTo(0.18, 5);
  });
  // The 3D tab of the Export dialog, opened with D.
  const openGlbTab = async (page) => {
    await page.keyboard.press("d");
    const dialog = page.getByRole("dialog", { name: /export/i });
    await dialog.getByRole("tab", { name: "3D" }).click();
    return dialog;
  };

  test("shows the file's size, and suggests Instanced while Merged is over 20 MB", async ({ page }) => {
    // Aurora's dots: Particle Grid at Density 70, about 39 MB merged.
    await openDesign(page, { shape: "Particle Grid", density: 70 });
    const dialog = await openGlbTab(page);
    const size = dialog.getByRole("status");
    const suggestion = dialog.getByText(/^Large file\. Instanced saves this design at about 0\.\d MB\.$/);
    await expect(size).toContainText(/^About \d+ MB/, { timeout: CANVAS_TIMEOUT });
    await expect(suggestion).toBeVisible();
    await expect(dialog.getByRole("button", { name: "Export GLB" })).toHaveAccessibleDescription(
      /^About \d+ MB Large file\. Instanced saves this design at about 0\.\d MB\.$/,
    );

    await dialog.getByRole("button", { name: "Instanced" }).click();
    await expect(size).toHaveText(/^About \d+ KB$/);
    await expect(suggestion).toHaveCount(0);
    await dialog.getByRole("button", { name: "Merged" }).click();
    await expect(suggestion).toBeVisible();
  });

  test("suggests nothing for the Default design, and follows a change made with the dialog open", async ({ page }) => {
    await openDesign(page, {});
    const dialog = await openGlbTab(page);
    const size = dialog.getByRole("status");
    // The world on the globe, with its body, grid and network.
    await expect(size).toHaveText(/^About \d+ KB$/, { timeout: CANVAS_TIMEOUT });
    const onGlobe = await size.textContent();
    await expect(dialog.getByText(/Large file/)).toHaveCount(0);
    // G turns the flat map, which drops the body, grid and network.
    await page.keyboard.press("g");
    await expect(size).not.toHaveText(onGlobe, { timeout: CANVAS_TIMEOUT });
    await expect(size).toHaveText(/^About \d+ KB$/);
  });

  // Each design's estimate against the files it saves, Merged and Instanced.
  // The geometry is worked out exactly and textures are encoded as the
  // exporter encodes them, so the estimates land within 1%. The bar is 15%.
  const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 10 10"><path d="M5 0 10 10H0z" fill="#fff"/></svg>';
  const designs = [
    { name: "the Default world", design: {} },
    { name: "Italy on the flat map", design: { selection: "country:ITA", viewMode: "flat" } },
    { name: "Aurora", design: "/looks/aurora" },
    { name: "Particle Grid at Density 100", design: { shape: "Particle Grid", density: 100 } },
    // A layer and a texture for each character.
    { name: "ASCII AB", design: { shape: "ASCII", asciiSymbol: "AB" }, layers: 2, images: 2 },
    // The land is a texture on the body, and the dots are off.
    { name: "Solid land", design: { renderMode: "solid" }, layers: 0, images: 1 },
    // Square dots at Density 100 overlap, so a click on Brazil hits one.
    {
      name: "clicked dots",
      design: { selection: "country:BRA", viewMode: "flat", shape: "Square", density: 100, dotSize: 25 },
      click: true,
      layers: 2,
    },
    {
      name: "a custom shape",
      design: { shape: "Custom", customShape: { name: "triangle.svg", type: "image/svg+xml", dataUrl: `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}` } },
      layers: 1,
      images: 1,
    },
  ];
  for (const { name, design, click = false, layers, images = 0 } of designs) {
    test(`estimates the GLB of ${name} within 15%`, async ({ page }) => {
      let canvas;
      if (typeof design === "string") {
        await page.goto(design);
        canvas = page.locator(".globe-background canvas");
        await expect
          .poll(() => canvas.evaluate((node) => typeof node.estimateGlb === "function"), { timeout: CANVAS_TIMEOUT })
          .toBe(true);
      } else {
        canvas = await openDesign(page, design);
      }
      if (click) await canvas.click();
      // Textures arrive once their atlas or image has loaded, and the
      // clicked dot's layer after the click.
      if (click || images) {
        await expect
          .poll(() => canvas.evaluate(async (node) => {
            const buffer = await node.exportGlb({ instanced: false });
            const gltf = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 20, new DataView(buffer).getUint32(12, true))));
            const dots = gltf.nodes.find((node) => node.name === "Dots");
            return [dots ? gltf.meshes[dots.mesh].primitives.length : 0, gltf.images?.length ?? 0];
          }), { timeout: TEXTURE_TIMEOUT })
          .toEqual([layers, images]);
      }
      const result = await canvas.evaluate(async (node) => ({
        estimate: await node.estimateGlb(),
        files: {
          merged: (await node.exportGlb({ instanced: false })).byteLength,
          instanced: (await node.exportGlb({ instanced: true })).byteLength,
        },
      }));
      for (const mode of ["merged", "instanced"]) {
        const error = Math.abs(result.estimate[mode] - result.files[mode]) / result.files[mode];
        expect(error, `${mode}: ${result.estimate[mode]} for ${result.files[mode]} bytes`).toBeLessThan(0.15);
      }
    });
  }
});
