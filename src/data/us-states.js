let cached = null;
let pending = null;

export const loadUsStates = () => {
  if (cached) return Promise.resolve(cached);
  if (pending) return pending;
  pending = (async () => {
    const [{ feature }, statesModule] = await Promise.all([
      import("topojson-client"),
      import("us-atlas/states-10m.json"),
    ]);
    const statesTopology = statesModule.default;
    const stateFeatureCollection = feature(
      statesTopology,
      statesTopology.objects.states,
    );
    cached = stateFeatureCollection.features
      .map((item) => ({
        ...item,
        _id: String(item.id),
        _displayName: item.properties?.name || String(item.id),
      }))
      .sort((a, b) => a._displayName.localeCompare(b._displayName));
    pending = null;
    return cached;
  })();
  return pending;
};

export const getCachedUsStates = () => cached;
