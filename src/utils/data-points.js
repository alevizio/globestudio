// Parse pasted/CSV data into geo points for the data-markers layer.
// Accepts lines of "lat,lng" or "lat,lng,value" (comma / tab / multi-space
// separated). Skips blanks, "#" comments, and a header row (non-numeric lat).

export const parseDataPoints = (text) => {
  if (typeof text !== "string") return [];
  const points = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const cells = line
      .split(/[,\t]|\s{2,}/)
      .map((c) => c.trim())
      .filter(Boolean);
    if (cells.length < 2) continue;
    const lat = Number(cells[0]);
    const lng = Number(cells[1]);
    // Non-numeric first cell (e.g. a "lat,lng" header) or out-of-range → skip.
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) continue;
    const parsedValue = Number(cells[2]);
    const value = cells.length > 2 && Number.isFinite(parsedValue) ? parsedValue : 1;
    points.push({ lat, lng, value });
  }
  return points;
};

// Map a value to a marker radius between rMin/rMax, sqrt-scaled so the marker's
// AREA (not radius) reads proportional to the value. Returns the mid radius
// when every value is equal.
export const valueToRadius = (value, valueMin, valueMax, rMin = 0.012, rMax = 0.05) => {
  if (!Number.isFinite(value)) return rMin;
  if (valueMax <= valueMin) return (rMin + rMax) / 2;
  const t = Math.sqrt((value - valueMin) / (valueMax - valueMin));
  return rMin + (rMax - rMin) * Math.max(0, Math.min(1, t));
};
