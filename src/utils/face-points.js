// The latitude and longitude at the middle of a set of dots, so the globe can
// turn to face a selected country, continent or state. Averages unit vectors
// rather than raw degrees, so a selection across the antimeridian (Fiji,
// Russia) still lands in the right place.
export const centerOfPoints = (points) => {
  let x = 0;
  let y = 0;
  let z = 0;
  let count = 0;
  for (const point of points || []) {
    if (!Number.isFinite(point?.lat) || !Number.isFinite(point?.lng)) continue;
    const lat = (point.lat * Math.PI) / 180;
    const lng = (point.lng * Math.PI) / 180;
    x += Math.cos(lat) * Math.cos(lng);
    y += Math.cos(lat) * Math.sin(lng);
    z += Math.sin(lat);
    count += 1;
  }
  if (!count) return null;
  const length = Math.hypot(x, y, z);
  if (length < 1e-9) return null;
  return {
    lat: (Math.asin(z / length) * 180) / Math.PI,
    lng: (Math.atan2(y, x) * 180) / Math.PI,
  };
};
