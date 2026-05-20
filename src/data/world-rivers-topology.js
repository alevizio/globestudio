// Lazy loader for the slimmed Natural Earth 1:50m rivers + lake
// centerlines GeoJSON. Fetched on first toggle so the ~120KB gzipped
// payload doesn't block first paint. Cached for the session.
//
// Re-slim from upstream via `node scripts/simplify-rivers.js` (downloads
// from martynafford/natural-earth-geojson, strips properties, rounds
// coordinates to 2 decimal places).

let cached = null;
let pending = null;

export const loadWorldRivers = () => {
  if (cached) return Promise.resolve(cached);
  if (pending) return pending;
  pending = (async () => {
    const response = await fetch("/data/world-rivers.json");
    if (!response.ok) {
      pending = null;
      throw new Error(`Failed to load rivers data: ${response.status}`);
    }
    cached = await response.json();
    pending = null;
    return cached;
  })();
  return pending;
};

export const getCachedWorldRivers = () => cached;
