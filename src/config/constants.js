export const MAP_WIDTH = 1000;
export const MAP_HEIGHT = 620;
export const US_COUNTRY_ID = "USA";

// The phone layout (bottom sheet, no hover tooltips): narrow screens, plus
// phones held sideways, which are wide but short and touch driven. Keep in
// step with the @media blocks in styles.css that use the same query.
export const PHONE_LAYOUT_QUERY = "(max-width: 620px), (pointer: coarse) and (max-height: 500px)";

// The zoom a first load and Reset start from. Desktop frames the world at
// 0.8. Phones held upright open the globe at 2.2 so it fills the width; on
// the phone layout globe-background.jsx sizes the flat map to fit the width
// at that same zoom, so switching views keeps one zoom value.
export const PHONE_MAP_ZOOM = 2.2;
export const DESKTOP_MAP_ZOOM = 0.8;
export const defaultMapZoom = () =>
  typeof window !== "undefined" && window.innerWidth < 620 ? PHONE_MAP_ZOOM : DESKTOP_MAP_ZOOM;
export const CLICK_HIGHLIGHT = "#ffffff";

export const TRACKPAD_ZOOM_IGNORE_SELECTOR = [
  ".control-rail",
  ".top-actions",
  ".view-mode-switch",
  ".map-zoom-controls",
  "a",
  "button",
  "input",
  "select",
  "textarea",
  "[role='button']",
  "[role='switch']",
].join(", ");

export const dotShapeOptions = [
  "Circle",
  "Hexagon",
  "Triangle",
  "Pentagon",
  "Square",
  "Voxel",
  "Particle Grid",
  "Diamond",
  "Star",
  "Plus",
  "Ring",
  "ASCII",
  "Custom",
];

// Cap stored custom-shape data URLs so we don't blow past the ~5MB localStorage
// budget. SVG icons are usually <10KB; PNG icons under 200KB is generous.
export const CUSTOM_SHAPE_MAX_BYTES = 200 * 1024;

export const UNSUPPORTED_DOTTED_MAP_CODES = new Set([
  "ABW",
  "AIA",
  "ALA",
  "AND",
  "ASM",
  "ATG",
  "BES",
  "BHR",
  "BLM",
  "BRB",
  "CCK",
  "COK",
  "COM",
  "CPV",
  "CUW",
  "CXR",
  "CYM",
  "DMA",
  "FRO",
  "FSM",
  "GGY",
  "GIB",
  "GLP",
  "GRD",
  "GUM",
  "HKG",
  "IMN",
  "IOT",
  "JEY",
  "KIR",
  "KNA",
  "LCA",
  "LIE",
  "MAC",
  "MAF",
  "MCO",
  "MDV",
  "MHL",
  "MNP",
  "MSR",
  "MTQ",
  "MUS",
  "MYT",
  "NFK",
  "NIU",
  "NRU",
  "PCN",
  "PLW",
  "PYF",
  "REU",
  "SGP",
  "SHN",
  "SJM",
  "SMR",
  "SPM",
  "STP",
  "SXM",
  "SYC",
  "TCA",
  "TKL",
  "TON",
  "TUV",
  "UMI",
  "UNK",
  "VAT",
  "VCT",
  "VGB",
  "VIR",
  "WLF",
  "WSM",
]);
