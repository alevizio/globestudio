let cached = null;
let pending = null;

// 1:50m country data from Natural Earth (via world-atlas package). Roughly 5×
// more detail than the previous 1:110m tier — coastlines show fjords, small
// archipelagos render as distinct islands, Italy's boot has a real toe.
// Bundle cost: ~+150KB gzipped, lazy-loaded so it doesn't block first paint.
// Rejected the 1:10m tier (+1.5MB) — overkill once dotted at typical density.
// See docs/research/2026-05-map-data-alternatives.md for the analysis.
export const loadWorldCountries = () => {
  if (cached) return Promise.resolve(cached);
  if (pending) return pending;
  pending = (async () => {
    const [{ feature }, topologyModule] = await Promise.all([
      import("topojson-client"),
      import("world-atlas/countries-50m.json"),
    ]);
    const topology = topologyModule.default;
    cached = feature(topology, topology.objects.countries);
    pending = null;
    return cached;
  })();
  return pending;
};

export const getCachedWorldCountries = () => cached;
