// Lazy loader for the slimmed Natural Earth 1:50m populated_places_simple
// GeoJSON. Fetched on first toggle so the ~50KB gzipped payload doesn't
// block first paint. Cached for the session.
//
// Re-slim from upstream via `node scripts/simplify-cities.js` (downloads
// from martynafford/natural-earth-geojson, strips properties, keeps just
// name + pop_max + scalerank + coordinates).

let cached = null;
let pending = null;

export const loadWorldCities = () => {
  if (cached) return Promise.resolve(cached);
  if (pending) return pending;
  pending = (async () => {
    const response = await fetch("/data/world-cities.json");
    if (!response.ok) {
      pending = null;
      throw new Error(`Failed to load cities data: ${response.status}`);
    }
    cached = await response.json();
    pending = null;
    return cached;
  })();
  return pending;
};

export const getCachedWorldCities = () => cached;
