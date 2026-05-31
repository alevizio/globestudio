export const GLOBE_RADIUS = 2;
export const GLOBE_CAMERA_DISTANCE = 7.35;
export const GLOBE_FLAT_FIT_ASPECT = 0.96;
export const GLOBE_ROUND_FIT_ASPECT = 1.45;
export const GLOBE_INITIAL_ROTATION = { x: -0.14, y: -0.9 };
export const GLOBE_MORPH_DURATION = 1700;
export const GLOBE_DEFAULT_GLOW = "#e9e4d8";

export const DEFAULT_GLOBE_SETTINGS = {
  // Auto spin is exposed as a single 0–100 slider: 0 = no spin, 100 =
  // max. The legacy `autoSpin` bool is kept for import compatibility
  // with older shared URLs / saved configs — if explicitly set to
  // false on an incoming config the renderer treats it as speed = 0.
  autoSpin: true,
  autoSpinSpeed: 35,
  // Data-binding: optional [{ lat, lng, value }] rendered as an additive
  // markers layer (size ∝ value). Set via the panel's Data section.
  dataPoints: [],
  dataMarkerColor: null,
  dataArcs: false,
  dotLift: 15,
  glow: true,
  glowStrength: 58,
  glowSpread: 50,
  // Glow color override. `null` means use the theme-derived cyan/violet
  // halo (look=borderless) or the dot color (look=classic) — the
  // original auto-behavior. Setting an explicit hex tints BOTH the
  // shader atmosphere AND the CSS canvas drop-shadow halo to match.
  glowColor: null,
  grid: true,
  // Grid color. Plain hex string. The opacity is the gridStrength
  // slider below — keeping them separate matches the dot pattern
  // (color picker + alpha slider).
  gridColor: "#ffffff",
  // Grid gradient — null means use solid gridColor. When set with
  // { from, to }, vertex colors interpolate by latitude (south →
  // north), so parallels each get a solid tint from the gradient
  // and meridians sweep through the whole range top-to-bottom.
  gridGradient: null,
  gridLift: 1,
  gridSize: 30,
  // gridStrength is now LITERAL opacity (0–100 → 0–1 line alpha).
  // Default 45 puts the grid at a clearly visible (but not loud)
  // intensity out of the box — the old derived ~0.1 was technically
  // correct but read as "barely there" because WebGL line width
  // can't go above 1px on most drivers. Push to 100 for max
  // visibility; drop to 0 to hide. The bool `grid` field is
  // retained for backwards compat with saved configs — false on
  // import coerces gridStrength to 0.
  gridStrength: 45,
  look: "classic",
  network: true,
  networkStrength: 70,
  // Arcs / Pulses are 0–100 levels: 0 hides that layer entirely, 100
  // reveals the full curated pool of routes / hub cities. Legacy bool
  // values from older saved configs are coerced at render time
  // (true → ~default level, false → 0) by the network renderer.
  networkArcs: 60,
  networkPulses: 50,
  // Network arc + pulse colors. Both null by default → the renderer
  // falls back to each route/hub's hardcoded polychrome originalColor
  // (the Stripe-style varied palette). A non-null value tints ALL
  // arcs (or pulses) uniformly. Set both to taste in the panel.
  arcColor: null,
  pulseColor: null,
  // Deprecated, kept for backwards compat with saved configs / shared
  // URLs that used the old Color/Mono toggle. Ignored by the renderer
  // — users now pick arc and pulse colors directly via arcColor /
  // pulseColor above.
  networkMono: true,
  routes: true,
  routesStrength: 82,
  // surfaceStrength is now LITERAL opacity (0–100 → 0–1 material
  // alpha). The default 30 reproduces the old Stripe-style subtle
  // dark-fill look (old effective opacity was baseOpacity 0.30 × 100).
  // Crank to 100 for a fully opaque sphere that hides the network
  // behind; drop to 0 to make the sphere fade out completely.
  surface: true,
  surfaceStrength: 30,
  // Surface (base sphere) color. The old hardcoded #18191d is kept
  // as the default so existing visuals don't shift. Optional 2-stop
  // gradient applies as per-vertex colors interpolated by latitude
  // (south → north), same idiom used by the grid.
  surfaceColor: "#18191d",
  surfaceGradient: null,
};

// The historical `look` field on globeSettings retains its values
// ("classic" / "borderless") for backwards-compat with saved configs
// and shared URLs. The user-facing control collapsed into the Glow
// segmented toggle in control-panel.jsx — "Glow" applies the
// borderlessPreset (look=borderless + rings + cyan halo); "No glow"
// reverts to look=classic with glow disabled.

export const BORDERLESS_ROUTE_PATHS = [
  { from: [37.7749, -122.4194], to: [51.5074, -0.1278], color: "#8fdcff", lift: 0.42, opacity: 0.68 },
  { from: [40.7128, -74.006], to: [35.6762, 139.6503], color: "#b793ff", lift: 0.58, opacity: 0.64 },
  { from: [1.3521, 103.8198], to: [25.2048, 55.2708], color: "#6be7ff", lift: 0.36, opacity: 0.56 },
  { from: [-23.5505, -46.6333], to: [19.4326, -99.1332], color: "#ff9ef3", lift: 0.33, opacity: 0.54 },
  { from: [52.52, 13.405], to: [28.6139, 77.209], color: "#9ad7ff", lift: 0.45, opacity: 0.58 },
  { from: [-33.8688, 151.2093], to: [34.6937, 135.5023], color: "#b7ffef", lift: 0.34, opacity: 0.52 },
];
