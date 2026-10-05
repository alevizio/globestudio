import * as THREE from "three";
import { storedRgb } from "../utils/color-space.js";

// A color from settings (a pick, a look, a default the panel shows) as the
// THREE.Color the scene draws it with. With hex colors (utils/color-space.js)
// its working-space value IS the hex: the canvas has no sRGB encode at the
// end of the effect chain, so that is what makes a pick render as its own
// hex, the same as the SVG export and the CSS background. Without them it
// goes through THREE.Color's sRGB-to-linear conversion, as every color did
// before, and renders exactly as it always has.
//
// new THREE.Color(hex) is still right for the built-in constants (halo,
// limb, network polychrome, theme glows) and for the sphere and glow
// colors: they were tuned through that conversion.
export const sceneColor = (hex, hexColors = false) => setSceneColor(new THREE.Color(), hex, hexColors);

// The same, written into an existing THREE.Color (a shader uniform).
export const setSceneColor = (color, hex, hexColors = false) => {
  const rgb = hexColors ? storedRgb(hex) : null;
  return rgb ? color.setRGB(rgb[0], rgb[1], rgb[2]) : color.set(hex);
};
