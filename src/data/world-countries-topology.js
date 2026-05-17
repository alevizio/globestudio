let cached = null;
let pending = null;

export const loadWorldCountries = () => {
  if (cached) return Promise.resolve(cached);
  if (pending) return pending;
  pending = (async () => {
    const [{ feature }, topologyModule] = await Promise.all([
      import("topojson-client"),
      import("world-atlas/countries-110m.json"),
    ]);
    const topology = topologyModule.default;
    cached = feature(topology, topology.objects.countries);
    pending = null;
    return cached;
  })();
  return pending;
};

export const getCachedWorldCountries = () => cached;
