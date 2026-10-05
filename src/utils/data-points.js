// Parse pasted/CSV data into geo points for the data-markers layer.
// Accepts lines of "lat,lng" or "lat,lng,value" (comma / tab / multi-space
// separated). Skips blanks, "#" comments, and a header row (non-numeric lat).

// Two line formats, auto-detected:
//   • Coordinates: "lat,lng" or "lat,lng,value"
//   • Country:     "<code-or-name>,value"  (needs `countryIndex` — a Map of
//     lowercased cca2/cca3/name → {lat,lng}; resolves to the country centroid)
export const parseDataPoints = (text, countryIndex = null) => {
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
    const isCoord =
      Number.isFinite(lat) && Number.isFinite(lng) &&
      lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
    if (isCoord) {
      const parsedValue = Number(cells[2]);
      const value = cells.length > 2 && Number.isFinite(parsedValue) ? parsedValue : 1;
      points.push({ lat, lng, value });
    } else if (countryIndex) {
      // Country mode: cells[0] = code/name, cells[1] = value.
      const centroid = countryIndex.get(cells[0].toLowerCase());
      if (!centroid) continue; // unknown code / header row → skip
      const parsedValue = Number(cells[1]);
      points.push({
        lat: centroid.lat,
        lng: centroid.lng,
        value: Number.isFinite(parsedValue) ? parsedValue : 1,
      });
    }
  }
  return points;
};

// The Data section's "Try an example": eight world cities as lat,lng,value,
// the value a rough metro population in millions.
export const DATA_POINTS_EXAMPLE = [
  "40.71,-74.01,19", // New York
  "19.43,-99.13,22", // Mexico City
  "-23.55,-46.63,22", // São Paulo
  "51.51,-0.13,9", // London
  "6.52,3.38,14", // Lagos
  "19.08,72.88,20", // Mumbai
  "35.68,139.69,37", // Tokyo
  "-33.87,151.21,5", // Sydney
].join("\n");

// The paste box text for a set of points: one "lat,lng,value" line each,
// which parseDataPoints reads back as the same points.
export const serializeDataPoints = (points) =>
  Array.isArray(points) ? points.map((p) => [p.lat, p.lng, p.value].join(",")).join("\n") : "";

// Map a value to a marker radius between rMin/rMax, sqrt-scaled so the marker's
// AREA (not radius) reads proportional to the value. Returns the mid radius
// when every value is equal.
export const valueToRadius = (value, valueMin, valueMax, rMin = 0.012, rMax = 0.05) => {
  if (!Number.isFinite(value)) return rMin;
  if (valueMax <= valueMin) return (rMin + rMax) / 2;
  const t = Math.sqrt((value - valueMin) / (valueMax - valueMin));
  return rMin + (rMax - rMin) * Math.max(0, Math.min(1, t));
};

// The points the markers layer should draw: none while the Data section eye
// is off (settings.data === false). dataPoints stays as pasted, so turning
// the eye back on brings the same markers back.
export const visibleDataPoints = (settings) =>
  settings?.data !== false && Array.isArray(settings?.dataPoints) ? settings.dataPoints : [];
