// Pixelarticons by Gerrit Halfmann — MIT licensed.
// Source: https://github.com/halfmage/pixelarticons
// SVG paths are normalized to absolute commands for readability but render
// the same rectangles as the upstream SVGs.
// All icons are 24×24 grid with rect-based pixel art, fill currentColor so
// they inherit theme color in light + dark modes.
// Brand marks (DottedGlobe) and the Twitter fallback are hand-authored
// below the generated section. The Pixelarticons MIT license is reproduced
// in NOTICE.md at the repo root, as required by the MIT terms.

export const Check = ({ size = 22, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    focusable="false"
    {...props}
  >
    <path d="M10 18H8V16H10V18ZM8 16H6V14H8V16ZM12 14V16H10V14H12ZM6 14H4V12H6V14ZM14 14H12V12H14V14ZM16 12H14V10H16V12ZM18 10H16V8H18V10ZM20 8H18V6H20V8Z"/>
  </svg>
);

export const ChevronDown = ({ size = 22, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    focusable="false"
    {...props}
  >
    <path d="M13 16H11V14H13V16ZM11 14H9V12H11V14ZM15 14H13V12H15V14ZM9 12H7V10H9V12ZM17 12H15V10H17V12ZM7 10H5V8H7V10ZM19 10H17V8H19V10Z"/>
  </svg>
);

export const Clipboard = ({ size = 22, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    focusable="false"
    {...props}
  >
    <rect x="4" y="6" width="2" height="14"/>
    <rect x="6" y="20" width="12" height="2"/>
    <rect x="18" y="6" width="2" height="14"/>
    <rect x="6" y="4" width="2" height="2"/>
    <rect x="16" y="4" width="2" height="2"/>
    <rect x="10" y="2" width="4" height="2"/>
    <rect x="10" y="6" width="4" height="2"/>
    <rect x="8" y="2" width="2" height="6"/>
    <rect x="14" y="2" width="2" height="6"/>
  </svg>
);

export const X = ({ size = 22, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    focusable="false"
    {...props}
  >
    <path d="M7 19H5V17H7V19ZM19 19H17V17H19V19ZM9 15V17H7V15H9ZM17 17H15V15H17V17ZM11 15H9V13H11V15ZM15 15H13V13H15V15ZM13 13H11V11H13V13ZM11 11H9V9H11V11ZM15 11H13V9H15V11ZM9 9H7V7H9V9ZM17 9H15V7H17V9ZM7 7H5V5H7V7ZM19 7H17V5H19V7Z"/>
  </svg>
);

// Pixelarticons "eye" + "eye-off" — paths are the canonical SVGs from
// the upstream MIT-licensed library
// (github.com/halfmage/pixelarticons/blob/master/svg/eye.svg + eye-off.svg).
// Used by the PanelSection layer-visibility button.
export const Eye = ({ size = 22, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    focusable="false"
    {...props}
  >
    <path d="M16 20H8v-2h8v2Zm-8-2H4v-2h4v2Zm12 0h-4v-2h4v2ZM4 16H2v-2h2v2Zm10-6h-2v2h2v-2h2v4h-2v2h-4v-2H8v-4h2V8h4v2Zm8 6h-2v-2h2v2ZM2 14H0v-4h2v4Zm22 0h-2v-4h2v4ZM4 10H2V8h2v2Zm18 0h-2V8h2v2ZM8 8H4V6h4v2Zm12 0h-4V6h4v2Zm-4-2H8V4h8v2Z"/>
  </svg>
);

export const EyeOff = ({ size = 22, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    focusable="false"
    {...props}
  >
    <path d="M0 10h2v4H0zm24 0h-2v4h2zm-8 0h-2v2h2zm-6 0H8v4h2zM2 8h2v2H2zm0 8h2v-2H2zm20-8h-2v2h2zm0 8h-2v-2h2zM4 6h4v2H4zm0 12h4v-2H4zM20 6h-4v2h4zM10 4h6v2h-6zM8 20h8v-2H8zm4-12h2v2h-2zm-2 6h4v2h-4zM8 8h2v2H8zm2 2h2v4h-2zm2 2h2v2h-2z"/>
    <path d="M6 6h2v2H6zM4 4h2v2H4zM2 2h2v2H2zm12 12h2v2h-2zm2 2h2v2h-2zm2 2h2v2h-2zm2 2h2v2h-2z"/>
  </svg>
);

export const Download = ({ size = 22, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    focusable="false"
    {...props}
  >
    <rect x="21" y="15" width="4" height="2" transform="rotate(90 21 15)"/>
    <rect x="19" y="19" width="2" height="14" transform="rotate(90 19 19)"/>
    <rect x="5" y="15" width="4" height="2" transform="rotate(90 5 15)"/>
    <rect x="13" y="3.00006" width="14" height="2" transform="rotate(90 13 3.00006)"/>
    <rect width="2" height="10" transform="matrix(-4.37114e-08 1 1 4.37114e-08 7 11)"/>
    <rect width="2" height="2" transform="matrix(-4.37114e-08 1 1 4.37114e-08 9 13)"/>
    <rect width="2" height="2" transform="matrix(-4.37114e-08 1 1 4.37114e-08 13 13)"/>
    <rect width="2" height="2" transform="matrix(-4.37114e-08 1 1 4.37114e-08 15 11)"/>
  </svg>
);

export const Globe = ({ size = 22, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    focusable="false"
    {...props}
  >
    <rect x="6" y="2" width="12" height="2"/>
    <rect x="6" y="20" width="12" height="2"/>
    <rect x="4" y="4" width="2" height="2"/>
    <rect x="9" y="4" width="2" height="2"/>
    <rect x="9" y="18" width="2" height="2"/>
    <rect x="13" y="18" width="2" height="2"/>
    <rect x="7" y="6" width="2" height="12"/>
    <rect x="15" y="6" width="2" height="12"/>
    <rect x="13" y="4" width="2" height="2"/>
    <rect width="2" height="2" transform="matrix(-1 0 0 1 20 4)"/>
    <rect x="2" y="6" width="2" height="12"/>
    <rect width="2" height="12" transform="matrix(-1 0 0 1 22 6)"/>
    <rect x="4" y="18" width="2" height="2"/>
    <rect width="2" height="2" transform="matrix(-1 0 0 1 20 18)"/>
    <rect x="3" y="11" width="18" height="2"/>
  </svg>
);

export const Globe2 = ({ size = 22, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    focusable="false"
    {...props}
  >
    <rect x="6" y="2" width="12" height="2"/>
    <rect x="6" y="20" width="12" height="2"/>
    <rect x="4" y="4" width="2" height="2"/>
    <rect x="9" y="4" width="2" height="2"/>
    <rect x="9" y="18" width="2" height="2"/>
    <rect x="13" y="18" width="2" height="2"/>
    <rect x="7" y="6" width="2" height="12"/>
    <rect x="15" y="6" width="2" height="12"/>
    <rect x="13" y="4" width="2" height="2"/>
    <rect width="2" height="2" transform="matrix(-1 0 0 1 20 4)"/>
    <rect x="2" y="6" width="2" height="12"/>
    <rect width="2" height="12" transform="matrix(-1 0 0 1 22 6)"/>
    <rect x="4" y="18" width="2" height="2"/>
    <rect width="2" height="2" transform="matrix(-1 0 0 1 20 18)"/>
    <rect x="3" y="11" width="18" height="2"/>
  </svg>
);

export const Info = ({ size = 22, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    focusable="false"
    {...props}
  >
    {/* Outer rounded square frame — matches the chamfered-corner style
        the Keyboard icon uses (top/bottom bars inset by 2px from the
        side bars, so corner pixels stay empty). */}
    <rect x="5" y="3" width="14" height="2" />
    <rect x="5" y="19" width="14" height="2" />
    <rect x="3" y="5" width="2" height="14" />
    <rect x="19" y="5" width="2" height="14" />
    {/* "i" glyph — dot near top + stem below */}
    <rect x="11" y="7" width="2" height="2" />
    <rect x="11" y="11" width="2" height="6" />
  </svg>
);

export const Keyboard = ({ size = 22, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    focusable="false"
    {...props}
  >
    <rect x="5" y="7" width="2" height="2"/>
    <rect x="9" y="7" width="2" height="2"/>
    <rect x="13" y="7" width="2" height="2"/>
    <rect x="17" y="7" width="2" height="2"/>
    <rect x="15" y="11" width="2" height="2"/>
    <rect x="11" y="11" width="2" height="2"/>
    <rect x="7" y="11" width="2" height="2"/>
    <rect x="6" y="15" width="12" height="2"/>
    <rect x="3" y="3" width="18" height="2"/>
    <rect x="3" y="19" width="18" height="2"/>
    <rect x="1" y="5" width="2" height="14"/>
    <rect x="21" y="5" width="2" height="14"/>
  </svg>
);

export const MapIcon = ({ size = 22, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    focusable="false"
    {...props}
  >
    <rect x="2" y="6" width="2" height="16"/>
    <rect x="14" y="6" width="2" height="16"/>
    <rect x="8" y="2" width="2" height="16"/>
    <rect x="20" y="2" width="2" height="16"/>
    <rect x="4" y="4" width="2" height="2"/>
    <rect x="16" y="4" width="2" height="2"/>
    <rect x="12" y="6" width="2" height="2"/>
    <rect x="12" y="18" width="2" height="2"/>
    <rect x="10" y="4" width="2" height="2"/>
    <rect x="10" y="16" width="2" height="2"/>
    <rect x="4" y="20" width="2" height="2"/>
    <rect x="16" y="20" width="2" height="2"/>
    <rect x="6" y="2" width="2" height="2"/>
    <rect x="18" y="2" width="2" height="2"/>
    <rect x="6" y="18" width="2" height="2"/>
    <rect x="18" y="18" width="2" height="2"/>
  </svg>
);

// Pixel 2×2 grid — used to label the /examples page in the takeover
// nav and page-pager. Four squares with a 1-px gutter, sized on the
// same 24×24 viewBox as the rest of the Pixelarticons-style set.
export const LayoutGrid = ({ size = 22, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    focusable="false"
    {...props}
  >
    <rect x="3" y="3" width="8" height="8"/>
    <rect x="13" y="3" width="8" height="8"/>
    <rect x="3" y="13" width="8" height="8"/>
    <rect x="13" y="13" width="8" height="8"/>
  </svg>
);

export const Minus = ({ size = 22, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    focusable="false"
    {...props}
  >
    <rect x="4" y="11" width="16" height="2"/>
  </svg>
);

export const Moon = ({ size = 22, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    focusable="false"
    {...props}
  >
    <path d="M18 22H8V20H18V22ZM8 20H6V18H8V20ZM20 20H18V18H20V20ZM6 18H4V16H6V18ZM22 18H20V14H18V12H20V10H22V18ZM4 16H2V6H4V16ZM18 16H12V14H18V16ZM12 14H10V12H12V14ZM10 12H8V6H10V12ZM6 6H4V4H6V6ZM14 4H12V6H10V4H6V2H14V4Z"/>
  </svg>
);

export const GripHorizontal = ({ size = 22, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    focusable="false"
    {...props}
  >
    <rect x="3" y="9" width="2" height="2"/>
    <rect x="11" y="9" width="2" height="2"/>
    <rect x="19" y="9" width="2" height="2"/>
    <rect x="1" y="11" width="2" height="2"/>
    <rect x="9" y="11" width="2" height="2"/>
    <rect x="17" y="11" width="2" height="2"/>
    <rect x="3" y="13" width="2" height="2"/>
    <rect x="11" y="13" width="2" height="2"/>
    <rect x="19" y="13" width="2" height="2"/>
    <rect x="5" y="11" width="2" height="2"/>
    <rect x="13" y="11" width="2" height="2"/>
    <rect x="21" y="11" width="2" height="2"/>
  </svg>
);

export const GripVertical = ({ size = 22, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    focusable="false"
    {...props}
  >
    <rect x="15" y="3" width="2" height="2" transform="rotate(90 15 3)"/>
    <rect x="15" y="11" width="2" height="2" transform="rotate(90 15 11)"/>
    <rect x="15" y="19" width="2" height="2" transform="rotate(90 15 19)"/>
    <rect x="13" y="1" width="2" height="2" transform="rotate(90 13 1)"/>
    <rect x="13" y="9" width="2" height="2" transform="rotate(90 13 9)"/>
    <rect x="13" y="17" width="2" height="2" transform="rotate(90 13 17)"/>
    <rect x="11" y="3" width="2" height="2" transform="rotate(90 11 3)"/>
    <rect x="11" y="11" width="2" height="2" transform="rotate(90 11 11)"/>
    <rect x="11" y="19" width="2" height="2" transform="rotate(90 11 19)"/>
    <rect x="13" y="5" width="2" height="2" transform="rotate(90 13 5)"/>
    <rect x="13" y="13" width="2" height="2" transform="rotate(90 13 13)"/>
    <rect x="13" y="21" width="2" height="2" transform="rotate(90 13 21)"/>
  </svg>
);

export const Move = ({ size = 22, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    focusable="false"
    {...props}
  >
    <rect x="11" y="2" width="2" height="2"/>
    <rect x="11" y="2" width="2" height="2"/>
    <rect x="11" y="20" width="2" height="2"/>
    <rect x="7" y="4" width="10" height="2"/>
    <rect x="9" y="2" width="6" height="2"/>
    <rect x="9" y="20" width="6" height="2"/>
    <rect x="7" y="18" width="10" height="2"/>
    <rect x="2" y="11" width="2" height="2"/>
    <rect width="2" height="2" transform="matrix(-1 0 0 1 22 11)"/>
    <rect x="2" y="9" width="2" height="6"/>
    <rect x="4" y="7" width="2" height="10"/>
    <rect width="2" height="10" transform="matrix(-1 0 0 1 20 7)"/>
    <rect width="2" height="6" transform="matrix(-1 0 0 1 22 9)"/>
    <rect y="11" width="24" height="2"/>
    <rect x="11" y="6" width="2" height="3"/>
    <rect x="11" width="2" height="24"/>
  </svg>
);

export const PanelLeftClose = ({ size = 22, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    focusable="false"
    {...props}
  >
    <rect x="4" y="4" width="16" height="2" transform="rotate(90 4 4)"/>
    <rect x="22" y="11" width="2" height="16" transform="rotate(90 22 11)"/>
    <rect x="10" y="13" width="2" height="2" transform="rotate(90 10 13)"/>
    <rect x="12" y="15" width="2" height="2" transform="rotate(90 12 15)"/>
    <rect x="14" y="17" width="2" height="2" transform="rotate(90 14 17)"/>
    <rect x="10" y="9" width="2" height="2" transform="rotate(90 10 9)"/>
    <rect x="12" y="7" width="2" height="2" transform="rotate(90 12 7)"/>
    <rect x="14" y="5" width="2" height="2" transform="rotate(90 14 5)"/>
  </svg>
);

export const PanelLeftOpen = ({ size = 22, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    focusable="false"
    {...props}
  >
    <rect x="4" y="4" width="16" height="2" transform="rotate(90 4 4)"/>
    <rect x="22" y="11" width="2" height="16" transform="rotate(90 22 11)"/>
    <rect x="10" y="13" width="2" height="2" transform="rotate(90 10 13)"/>
    <rect x="12" y="15" width="2" height="2" transform="rotate(90 12 15)"/>
    <rect x="14" y="17" width="2" height="2" transform="rotate(90 14 17)"/>
    <rect x="10" y="9" width="2" height="2" transform="rotate(90 10 9)"/>
    <rect x="12" y="7" width="2" height="2" transform="rotate(90 12 7)"/>
    <rect x="14" y="5" width="2" height="2" transform="rotate(90 14 5)"/>
  </svg>
);

export const Plus = ({ size = 22, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    focusable="false"
    {...props}
  >
    <path d="M13 11H20V13H13V20H11V13H4V11H11V4H13V11Z"/>
  </svg>
);

export const RotateCcw = ({ size = 22, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    focusable="false"
    {...props}
  >
    <rect x="16" y="4" width="2" height="6"/>
    <rect x="14" y="2" width="2" height="2"/>
    <rect x="14" y="4" width="2" height="8"/>
    <rect width="2" height="5" transform="matrix(-1 0 0 1 4 8)"/>
    <rect x="4" y="6" width="16" height="2"/>
    <rect x="8" y="20" width="2" height="6" transform="rotate(180 8 20)"/>
    <rect x="10" y="22" width="2" height="2" transform="rotate(180 10 22)"/>
    <rect x="10" y="20" width="2" height="8" transform="rotate(180 10 20)"/>
    <rect width="2" height="5" transform="matrix(1 0 0 -1 20 16)"/>
    <rect x="20" y="18" width="16" height="2" transform="rotate(180 20 18)"/>
  </svg>
);

export const Shuffle = ({ size = 22, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    focusable="false"
    {...props}
  >
    <path d="M10 19H2V17H10V19ZM22 19H14V17H22V19ZM12 17H10V11H12V17ZM18 7H20V9H22V11H20V13H18V15H16V11H12V9H16V5H18V7ZM8 11H2V9H8V11Z"/>
  </svg>
);

export const Sun = ({ size = 22, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    focusable="false"
    {...props}
  >
    <rect x="9" y="7" width="6" height="2"/>
    <rect x="7" y="9" width="2" height="6"/>
    <rect x="9" y="15" width="6" height="2"/>
    <rect x="15" y="9" width="2" height="6"/>
    <rect x="11" y="2" width="2" height="3"/>
    <rect x="11" y="19" width="2" height="3"/>
    <rect x="2" y="11" width="3" height="2"/>
    <rect x="19" y="11" width="3" height="2"/>
    <rect x="17" y="5" width="2" height="2"/>
    <rect x="5" y="5" width="2" height="2"/>
    <rect x="5" y="17" width="2" height="2"/>
    <rect x="17" y="17" width="2" height="2"/>
  </svg>
);

export const Upload = ({ size = 22, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    focusable="false"
    {...props}
  >
    <path d="M19 21.0001H5V19.0001H19V21.0001ZM5 19.0001H3V15.0001H5V19.0001ZM21 19.0001H19V15.0001H21V19.0001ZM13 5.00006H15V7.00006H17V9.00006H13V17.0001H11V9.00006H7V7.00006H9V5.00006H11V3.00006H13V5.00006Z"/>
  </svg>
);

export const ZoomIn = ({ size = 22, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    focusable="false"
    {...props}
  >
    <path d="M22 22H20V20H22V22ZM20 20H18V18H20V20ZM14 18H6V16H14V18ZM18 18H16V16H18V18ZM6 16H4V14H6V16ZM16 16H14V14H16V16ZM4 14H2V6H4V14ZM11 9H14V11H11V14H9V11H6V9H9V6H11V9ZM18 14H16V6H18V14ZM6 6H4V4H6V6ZM16 6H14V4H16V6ZM14 4H6V2H14V4Z"/>
  </svg>
);

export const ZoomOut = ({ size = 22, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    focusable="false"
    {...props}
  >
    <path d="M22 22H20V20H22V22ZM20 20H18V18H20V20ZM14 18H6V16H14V18ZM18 18H16V16H18V18ZM6 16H4V14H6V16ZM16 16H14V14H16V16ZM4 14H2V6H4V14ZM18 14H16V6H18V14ZM14 9V11H6V9H14ZM6 6H4V4H6V6ZM16 6H14V4H16V6ZM14 4H6V2H14V4Z"/>
  </svg>
);

export const Share2 = ({ size = 22, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    focusable="false"
    {...props}
  >
    <path d="M20 22H4V20H20V22ZM4 20H2V14H4V20ZM22 20H20V14H22V20ZM13 4H15V6H17V8H13V18H11V8H7V6H9V4H11V2H13V4ZM9 14H4V12H9V14ZM20 14H15V12H20V14Z"/>
  </svg>
);

export const Github = ({ size = 22, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    focusable="false"
    {...props}
  >
    <path d="M5 2H9V4H7V6H5V2Z"/>
    <path d="M5 12H3V6H5V12Z"/>
    <path d="M7 14H5V12H7V14Z"/>
    <path fillRule="evenodd" clipRule="evenodd" d="M9 16V14H7V16H3V14H1V16H3V18H7V22H9V18H11V16H9ZM9 16V18H7V16H9Z"/>
    <path d="M15 4V6H9V4H15Z"/>
    <path d="M19 6H17V4H15V2H19V6Z"/>
    <path d="M19 12V6H21V12H19Z"/>
    <path d="M17 14V12H19V14H17Z"/>
    <path d="M15 16V14H17V16H15Z"/>
    <path d="M15 18H13V16H15V18Z"/>
    <path d="M15 18H17V22H15V18Z"/>
  </svg>
);

export const Bug = ({ size = 22, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    focusable="false"
    {...props}
  >
    <rect x="2" y="5" width="2" height="4"/>
    <rect width="2" height="4" transform="matrix(-1 0 0 1 22 5)"/>
    <rect x="4" y="9" width="2" height="2"/>
    <rect width="2" height="2" transform="matrix(-1 0 0 1 20 9)"/>
    <rect x="2" y="13" width="4" height="2"/>
    <rect width="4" height="2" transform="matrix(-1 0 0 1 22 13)"/>
    <rect x="4" y="17" width="2" height="2"/>
    <rect width="2" height="2" transform="matrix(-1 0 0 1 20 17)"/>
    <rect x="2" y="19" width="2" height="2"/>
    <rect width="2" height="2" transform="matrix(-1 0 0 1 22 19)"/>
    <rect x="6" y="11" width="12" height="2"/>
    <rect x="6" y="7" width="2" height="12"/>
    <rect x="16" y="7" width="2" height="12"/>
    <rect x="8" y="19" width="8" height="2"/>
    <rect x="8" y="5" width="8" height="2"/>
    <rect x="11" y="15" width="2" height="6"/>
    <rect x="8" y="1" width="2" height="6"/>
    <rect x="14" y="1" width="2" height="6"/>
  </svg>
);

// --- Brand + fallback marks ---

// Brand mark — Globestudio wordmark glyph (a horizontal-banded globe
// silhouette). Mirrors the favicon at /public/favicon.svg + the OG
// card. Source SVG is 915×523 landscape; letterboxed into a 915×915
// square viewBox so consumers can keep using `size={N}` for a square
// icon footprint without layout shifting.
//   square padding = (915 − 523) / 2 = 196
// Intentionally NOT a pixel-art icon — this is the wordmark glyph.
export const DottedGlobe = ({ size = 22, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 915 915"
    fill="currentColor"
    aria-hidden="true"
    focusable="false"
    {...props}
  >
    <g transform="translate(0, 196)">
      <path d="M457.415 0C577.077 0 687.642 25.3348 769.933 68.4814C850.058 110.493 914.83 176.387 914.83 261.239C914.83 346.091 850.059 411.986 769.933 453.998C687.642 497.145 577.076 522.479 457.415 522.479C337.754 522.478 227.188 497.145 144.897 453.998C64.7716 411.986 0 346.091 0 261.239C4.95911e-05 176.387 64.7719 110.493 144.897 68.4814C227.188 25.3348 337.753 2.28882e-05 457.415 0ZM457.415 30C341.604 30 236.013 54.5808 158.828 95.0508C82.3501 135.15 30 193.157 30 261.239C30 329.321 82.35 387.329 158.828 427.429C236.013 467.899 341.604 492.478 457.415 492.479C573.226 492.479 678.817 467.899 756.002 427.429C832.48 387.329 884.83 329.321 884.83 261.239C884.83 193.157 832.48 135.15 756.002 95.0508C678.817 54.5808 573.226 30 457.415 30ZM447.762 379.399C448.207 385.1 448.416 390.819 448.416 396.496V462.225C393.093 459.109 343.637 427.435 312.534 379.399H447.762ZM602.297 379.399C573.461 423.933 528.851 454.403 478.416 461.092V396.495C478.416 390.818 478.626 385.099 479.071 379.399H602.297ZM277.807 379.399C290.681 403.351 307.364 424.569 326.986 441.969C296.377 431.761 268.782 418.103 245.271 401.813C235.114 394.776 225.762 387.283 217.272 379.399H277.807ZM697.559 379.399C689.069 387.283 679.717 394.776 669.56 401.813C646.049 418.103 618.453 431.761 587.842 441.969C607.465 424.569 624.149 403.351 637.024 379.399H697.559ZM175.928 379.399C189.539 395.616 205.789 410.449 224.119 423.605C205.747 416.765 188.567 409.148 172.759 400.859C159.8 394.065 147.882 386.891 137.044 379.399H175.928ZM777.786 379.399C766.948 386.891 755.03 394.065 742.071 400.859C726.264 409.148 709.083 416.764 690.712 423.604C709.042 410.448 725.293 395.616 738.903 379.399H777.786ZM130.606 271.081C132.238 298.946 140.758 325.294 154.762 349.399H102.487V350.88C77.6296 325.983 63.2504 298.815 60.4912 271.081H130.606ZM854.339 271.081C851.58 298.814 837.201 325.982 812.344 350.879V349.399H760.069C774.073 325.294 782.593 298.946 784.225 271.081H854.339ZM248.657 271.081C249.707 298.614 255.138 325.02 264.234 349.399H190.517C173.029 325.271 162.667 298.726 160.673 271.081H248.657ZM334.331 271.081C354.515 271.081 375.013 273.327 392.854 282.765C395.181 283.995 397.477 285.281 399.739 286.62C423.013 300.39 436.294 323.473 442.929 349.399H296.469C286.157 325.652 279.875 299.2 278.681 271.081H334.331ZM636.15 271.081C634.956 299.2 628.673 325.652 618.361 349.399H483.903C490.538 323.47 503.821 300.385 527.098 286.615C529.358 285.278 531.651 283.994 533.975 282.765C551.816 273.328 572.314 271.081 592.497 271.081H636.15ZM754.158 271.081C752.164 298.726 741.802 325.271 724.314 349.399H650.597C659.693 325.02 665.124 298.614 666.174 271.081H754.158ZM161.177 162.763C145.3 186.682 134.92 213.045 131.53 241.081H62.0566C67.6616 213.644 84.6358 186.976 111.855 162.763H161.177ZM268.353 162.763C258.051 186.955 251.434 213.376 249.259 241.081H161.811C165.958 213.195 178.644 186.623 198.55 162.763H268.353ZM443.129 162.763C436.563 189.009 423.25 212.422 399.741 226.332C398.682 226.959 397.615 227.574 396.542 228.177C378.028 238.58 356.428 241.081 335.191 241.081H279.352C281.843 212.721 289.534 186.243 301.286 162.763H443.129ZM613.544 162.763C625.296 186.243 632.988 212.721 635.479 241.081H591.638C570.401 241.081 548.801 238.58 530.287 228.177C529.216 227.575 528.152 226.962 527.096 226.337C503.584 212.427 490.268 189.012 483.702 162.763H613.544ZM716.281 162.763C736.187 186.623 748.873 213.195 753.021 241.081H665.572C663.397 213.376 656.781 186.955 646.479 162.763H716.281ZM802.975 162.763C830.194 186.976 847.169 213.644 852.773 241.081H783.301C779.911 213.045 769.531 186.682 753.654 162.763H802.975ZM224.114 98.876C209.747 109.189 196.658 120.531 185.115 132.763H152.99C159.282 128.948 165.874 125.23 172.759 121.62C188.565 113.332 205.744 105.717 224.114 98.876ZM326.986 80.5088C310.229 95.3673 295.617 113.011 283.688 132.763H229.15C234.271 128.598 239.648 124.562 245.271 120.665C268.782 104.376 296.376 90.7163 326.986 80.5088ZM448.416 116.456C448.416 121.871 448.227 127.324 447.823 132.763H319.678C350.932 90.5437 397.157 63.1396 448.416 60.2529V116.456ZM478.416 61.3857C524.855 67.5446 566.357 93.8659 595.152 132.763H479.009C478.605 127.325 478.416 121.872 478.416 116.457V61.3857ZM587.842 80.5088C618.453 90.7164 646.049 104.375 669.56 120.665C675.183 124.562 680.56 128.598 685.681 132.763H631.143C619.214 113.01 604.599 95.3675 587.842 80.5088ZM690.717 98.876C709.086 105.716 726.265 113.332 742.071 121.62C748.957 125.23 755.548 128.948 761.84 132.763H729.716C718.173 120.531 705.084 109.189 690.717 98.876Z" />
    </g>
  </svg>
);

// Twitter / X — kept as a fallback because pixelarticons has no twitter
// equivalent. Not currently rendered anywhere in-app but exported for
// completeness so external integrations can still import it.
export const Twitter = ({ size = 24, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    focusable="false"
    {...props}
  >
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

// Instagram — pixel-art camera glyph (Pixelarticons-style). A simple
// 24x24 grid of rects: rounded body, lens disc, top viewfinder dot.
export const Instagram = ({ size = 22, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    focusable="false"
    {...props}
  >
    {/* body */}
    <path d="M6 3h12v2h2v2h2v12h-2v2h-2v2H6v-2H4v-2H2V7h2V5h2z" />
    {/* hollow interior */}
    <path fill="#000" d="M6 5h12v14H6z" />
    {/* lens ring */}
    <path d="M8 10h2v4H8zm6 0h2v4h-2zm-4-2h4v2h-4zm0 6h4v2h-4z" />
    {/* viewfinder dot */}
    <path d="M16 7h2v1h-2z" />
  </svg>
);
