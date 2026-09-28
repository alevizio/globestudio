import { FLOW_BACKGROUND_BASE, SPACE_BACKGROUND_BASE } from "../config/backgrounds.js";

// The UI theme's canvas color, the same value as --bg in styles.css. The
// light theme shows it under a Solid look instead of the background color,
// and both themes show it under the Transparent checkerboard.
export const THEME_CANVAS_COLORS = { dark: "#0b0b0c", light: "#f4f1ea" };

// Which background the preview shows. Space and Flow win over the
// transparent flag, and the flag wins over Solid: a look can pair
// transparent: true with the solid style, and the panel reads it as
// Transparent.
export const backgroundKind = ({ backgroundStyle, transparent }) => {
  if (backgroundStyle === "space" || backgroundStyle === "flow") return backgroundStyle;
  return transparent || backgroundStyle === "transparent" ? "transparent" : "solid";
};

// The color the studio preview shows behind its see-through WebGL canvas.
// The preview's --preview-bg and every export read it from here, so an
// exported file looks like the preview.
export const previewBackground = ({ background, backgroundStyle, transparent, uiTheme }) => {
  const kind = backgroundKind({ backgroundStyle, transparent });
  if (kind === "space") return SPACE_BACKGROUND_BASE;
  if (kind === "flow") return FLOW_BACKGROUND_BASE;
  const themeCanvas = uiTheme === "light" ? THEME_CANVAS_COLORS.light : THEME_CANVAS_COLORS.dark;
  return kind === "transparent" || uiTheme === "light" ? themeCanvas : background;
};

// The color an export paints under the canvas ("png", "svg", "webm", "gif"
// or "mp4"), or null to paint none.
// - Solid: the color the preview shows, in every format.
// - Transparent: none, so the file keeps its alpha. MP4 has no alpha, so it
//   gets the theme canvas the checkerboard sits on instead of black.
// - Space and Flow: none, the canvas draws them. The SVG has no Space or
//   Flow, so it keeps the stored color unless the look is transparent.
export const exportBackground = (format, settings) => {
  const kind = backgroundKind(settings);
  if (kind === "space" || kind === "flow") {
    return format === "svg" && !settings.transparent ? settings.background : null;
  }
  if (kind === "transparent" && format !== "mp4") return null;
  return previewBackground(settings);
};
