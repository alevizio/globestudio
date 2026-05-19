export const clampNumber = (value, min, max) => Math.min(max, Math.max(min, Number(value)));

export const normalizeLongitude = (value) => ((((value + 180) % 360) + 360) % 360) - 180;

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;

export const degToRad = (deg) => deg * DEG_TO_RAD;
export const radToDeg = (rad) => rad * RAD_TO_DEG;

export const mercatorY = (lat) => {
  const rad = degToRad(clampNumber(lat, -85.05113, 85.05113));
  return Math.log(Math.tan(Math.PI / 4 + rad / 2));
};

export const inverseMercatorY = (y) => radToDeg(2 * Math.atan(Math.exp(y)) - Math.PI / 2);

export const easeInOutSine = (value) => {
  const t = clampNumber(value, 0, 1);
  return 0.5 - Math.cos(t * Math.PI) / 2;
};

// Smoother than easeInOutSine — lingers in motion through the middle of the
// curve, lands with confidence. Used for the flat↔globe morph so the
// transition feels like a single sustained gesture rather than a fast
// in / slow out.
export const easeInOutQuart = (value) => {
  const t = clampNumber(value, 0, 1);
  return t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2;
};

export const smoothStep = (edge0, edge1, value) => {
  const t = clampNumber((value - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
};

export const formatSvgNumber = (value, decimals = 3) => {
  const number = Number.isFinite(value) ? value : 0;
  return number.toFixed(decimals).replace(/\.?0+$/, "");
};

export const hashString = (input) => {
  const str = String(input);
  let hash = 5381;
  for (let i = 0; i < str.length; i += 1) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return hash >>> 0;
};
