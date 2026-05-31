import { clampNumber, inverseMercatorY, mercatorY, normalizeLongitude } from "./math.js";

// Inverse of pointToGlobeCoordinate: lat/lng → dotted-map image (x,y), using
// the same Mercator + region clipping as the dots. Lets a marker land on the
// flat plane in lock-step with the dot field.
export const latLngToImagePoint = (lat, lng, image) => {
  const region = image.region;
  if (region?.lat && region?.lng) {
    const lngRange = region.lng.max - region.lng.min;
    const yMax = mercatorY(region.lat.max);
    const yMin = mercatorY(region.lat.min);
    const x = ((normalizeLongitude(lng) - region.lng.min) / lngRange) * image.width;
    // Clamp away from the poles where Mercator diverges.
    const y = ((yMax - mercatorY(clampNumber(lat, -85, 85))) / (yMax - yMin)) * image.height;
    return { x, y };
  }
  return {
    x: ((normalizeLongitude(lng) + 180) / 360) * image.width,
    y: ((90 - clampNumber(lat, -90, 90)) / 180) * image.height,
  };
};

export const pointToGlobeCoordinate = (point, image) => {
  if (Number.isFinite(point.lat) && Number.isFinite(point.lng)) {
    return {
      lat: clampNumber(point.lat, -90, 90),
      lng: normalizeLongitude(point.lng),
    };
  }

  const region = image.region;
  if (region?.lat && region?.lng) {
    const lngRange = region.lng.max - region.lng.min;
    const yMax = mercatorY(region.lat.max);
    const yMin = mercatorY(region.lat.min);
    const lng = region.lng.min + (point.x / image.width) * lngRange;
    const projectedY = yMax - (point.y / image.height) * (yMax - yMin);

    return {
      lat: clampNumber(inverseMercatorY(projectedY), -90, 90),
      lng: normalizeLongitude(lng),
    };
  }

  const lng = Number.isFinite(point.lng)
    ? point.lng
    : normalizeLongitude((point.x / image.width) * 360 - 180);
  const lat = Number.isFinite(point.lat)
    ? point.lat
    : 90 - (point.y / image.height) * 180;

  return {
    lat: clampNumber(lat, -90, 90),
    lng: normalizeLongitude(lng),
  };
};
