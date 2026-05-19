export const GLOBE_RADIUS = 2;
export const GLOBE_CAMERA_DISTANCE = 7.35;
export const GLOBE_FLAT_FIT_ASPECT = 0.96;
export const GLOBE_ROUND_FIT_ASPECT = 1.45;
export const GLOBE_INITIAL_ROTATION = { x: -0.14, y: -0.9 };
export const GLOBE_MORPH_DURATION = 1700;
export const GLOBE_DEFAULT_GLOW = "#e9e4d8";

export const DEFAULT_GLOBE_SETTINGS = {
  autoSpin: true,
  dotLift: 15,
  glow: true,
  glowStrength: 58,
  glowSpread: 50,
  grid: true,
  gridLift: 1,
  gridSize: 30,
  gridStrength: 82,
  look: "classic",
  network: true,
  networkStrength: 70,
  networkArcs: true,
  networkPulses: true,
  routes: true,
  routesStrength: 82,
  surface: true,
  surfaceStrength: 100,
};

export const globeLookOptions = [
  { value: "classic", label: "Classic" },
  { value: "borderless", label: "Borderless" },
];

export const BORDERLESS_ROUTE_PATHS = [
  { from: [37.7749, -122.4194], to: [51.5074, -0.1278], color: "#8fdcff", lift: 0.42, opacity: 0.68 },
  { from: [40.7128, -74.006], to: [35.6762, 139.6503], color: "#b793ff", lift: 0.58, opacity: 0.64 },
  { from: [1.3521, 103.8198], to: [25.2048, 55.2708], color: "#6be7ff", lift: 0.36, opacity: 0.56 },
  { from: [-23.5505, -46.6333], to: [19.4326, -99.1332], color: "#ff9ef3", lift: 0.33, opacity: 0.54 },
  { from: [52.52, 13.405], to: [28.6139, 77.209], color: "#9ad7ff", lift: 0.45, opacity: 0.58 },
  { from: [-33.8688, 151.2093], to: [34.6937, 135.5023], color: "#b7ffef", lift: 0.34, opacity: 0.52 },
];
