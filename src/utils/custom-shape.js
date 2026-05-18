import { CUSTOM_SHAPE_MAX_BYTES } from "../config/constants.js";

const ALLOWED_MIME = new Set([
  "image/svg+xml",
  "image/png",
  "image/jpeg",
  "image/webp",
]);

// Strip script tags and on*= event-handler attributes from user-uploaded SVG
// before storing it. The data URL is later embedded into <image href> in the
// exported SVG, which already blocks script execution — but a sanitized source
// is the responsible thing to keep around.
const sanitizeSvgSource = (source) => {
  return source
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, "")
    .replace(/\son[a-z]+\s*=\s*'[^']*'/gi, "");
};

const encodeSvgAsDataUrl = (source) =>
  `data:image/svg+xml;charset=utf-8,${encodeURIComponent(source)}`;

// Accept raw SVG markup pasted by the user. Validates that it looks like
// an SVG document, sanitizes, and returns the same record shape that file
// uploads produce — so the rest of the pipeline (preview, render, export)
// doesn't care how the source arrived.
export const readCustomShapeText = (text) => {
  if (typeof text !== "string") throw new Error("Empty SVG");
  const trimmed = text.trim();
  if (!trimmed) throw new Error("Empty SVG");
  if (!/<svg[\s>]/i.test(trimmed)) {
    throw new Error("Not an SVG. Paste markup starting with <svg…>.");
  }
  const byteLength = new Blob([trimmed]).size;
  if (byteLength > CUSTOM_SHAPE_MAX_BYTES) {
    const kb = Math.round(CUSTOM_SHAPE_MAX_BYTES / 1024);
    throw new Error(`SVG too large. Keep it under ${kb}KB.`);
  }
  const sanitized = sanitizeSvgSource(trimmed);
  return {
    name: "Pasted SVG",
    type: "image/svg+xml",
    svgSource: sanitized,
    dataUrl: encodeSvgAsDataUrl(sanitized),
  };
};

const readFileAsText = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(reader.error || new Error("Read failed"));
  reader.readAsText(file);
});

const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(reader.result);
  reader.onerror = () => reject(reader.error || new Error("Read failed"));
  reader.readAsDataURL(file);
});

// Parse the uploaded file and return a serializable record we can persist:
//   { name, type, dataUrl, svgSource? }
// SVG sources are kept as a sanitized string so SVG export can inline them
// (cleaner than re-decoding a data URL).
export const readCustomShapeFile = async (file) => {
  if (!file) throw new Error("No file");
  if (!ALLOWED_MIME.has(file.type)) {
    throw new Error("Unsupported file type. Use SVG, PNG, JPG, or WebP.");
  }
  if (file.size > CUSTOM_SHAPE_MAX_BYTES) {
    const kb = Math.round(CUSTOM_SHAPE_MAX_BYTES / 1024);
    throw new Error(`File too large. Keep it under ${kb}KB.`);
  }
  if (file.type === "image/svg+xml") {
    const text = await readFileAsText(file);
    const sanitized = sanitizeSvgSource(text);
    return {
      name: file.name,
      type: file.type,
      svgSource: sanitized,
      dataUrl: encodeSvgAsDataUrl(sanitized),
    };
  }
  const dataUrl = await readFileAsDataUrl(file);
  return { name: file.name, type: file.type, dataUrl };
};
