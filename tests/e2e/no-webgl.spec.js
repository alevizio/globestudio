import { expect, test } from "@playwright/test";

// A WebGL context three.js can't start on is no WebGL at all: the studio
// shows its still fallback and /embed its no WebGL message, the same as
// when hasWebGL() finds nothing, never the "Couldn't load the globe view"
// card, whose Reload fails the same way again. Launch week reports had both
// cases below.
const CANVAS_TIMEOUT = process.env.CI ? 40_000 : 20_000;
const NO_WEBGL = "WebGL is needed for the live globe";
const EMBED_NO_WEBGL = "This browser doesn't support WebGL 2.";

// What some privacy extensions and locked down browsers hand back: a WebGL 2
// context with getParameter (so the hasWebGL() probe passes) but without the
// getShaderPrecisionFormat that three.js calls while creating its renderer.
const stubShaderPrecision = () => {
  delete WebGL2RenderingContext.prototype.getShaderPrecisionFormat;
};

// The probe's context works, the renderer's never comes: three.js throws
// "Error creating WebGL context." after hasWebGL() said yes.
const failAfterProbe = () => {
  const getContext = HTMLCanvasElement.prototype.getContext;
  let probed = false;
  HTMLCanvasElement.prototype.getContext = function (kind, ...rest) {
    if (kind !== "webgl2") return getContext.call(this, kind, ...rest);
    if (probed) return null;
    probed = true;
    return getContext.call(this, kind, ...rest);
  };
};

const collectPageErrors = (page) => {
  const errors = [];
  page.on("pageerror", (error) => errors.push(error.message));
  return errors;
};

for (const [name, script] of [
  ["a context without getShaderPrecisionFormat", stubShaderPrecision],
  ["a renderer that gets no context", failAfterProbe],
]) {
  test(`${name} shows the no WebGL fallback in the studio`, async ({ page }) => {
    const errors = collectPageErrors(page);
    await page.addInitScript(script);
    await page.goto("/");
    await expect(page.getByRole("alert").filter({ hasText: NO_WEBGL })).toBeVisible({ timeout: CANVAS_TIMEOUT });
    await expect(page.locator("body")).toHaveClass(/is-no-webgl/);
    await expect(page.getByText("Couldn’t load the globe view.")).toHaveCount(0);
    await expect(page.locator(".globe-background canvas")).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test(`${name} shows the no WebGL message in /embed`, async ({ page }) => {
    const errors = collectPageErrors(page);
    await page.addInitScript(script);
    await page.goto("/embed?look=default");
    await expect(page.getByText(EMBED_NO_WEBGL)).toBeVisible({ timeout: CANVAS_TIMEOUT });
    await expect(page.getByText("Something went wrong.")).toHaveCount(0);
    expect(errors).toEqual([]);
  });
}
