import { lookPresets } from "../data/look-presets.js";
import { areaOptionByValue } from "../data/geography.js";
import { clampNumber } from "./math.js";

// The Figma plugin's "Your colors" strip (figma-plugin/ui.html) applies a
// file color by reloading the embed with ?dotColor=. The look, region and
// density pickers live in React state, so that reload would reset them.
// sessionStorage carries them across it for the plugin session; when storage
// is blocked the pickers simply start from the URL again.
const PICKS_KEY = "globestudio:figma-picks";

// Each stored field is checked on the way back in, so a look or region that
// a later deploy renamed falls back to the URL value instead of rendering
// something the pickers can't show.
export const restoreFigmaPicks = (fromUrl, win = window) => {
  try {
    const stored = JSON.parse(win.sessionStorage.getItem(PICKS_KEY));
    if (!stored || typeof stored !== "object") return fromUrl;
    return {
      look: lookPresets.some((preset) => preset.id === stored.look) ? stored.look : fromUrl.look,
      selection: areaOptionByValue.has(stored.selection) ? stored.selection : fromUrl.selection,
      density: Number.isFinite(stored.density) ? clampNumber(stored.density, 1, 90) : fromUrl.density,
    };
  } catch {
    return fromUrl;
  }
};

export const saveFigmaPicks = (picks, win = window) => {
  try {
    win.sessionStorage.setItem(PICKS_KEY, JSON.stringify(picks));
  } catch {
    // Blocked or full storage: the pickers still work, they just reset on
    // the next color reload.
  }
};
