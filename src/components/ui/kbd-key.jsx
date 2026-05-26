// Pixel-cornered key + a real 3D "thickness band" rendered as its
// own element directly below the <kbd>. We tried filter:drop-shadow
// first but the page bg is near-black (#0b0b0c), so any black shadow
// composites to invisible and a semi-transparent white drop-shadow
// reads as a faint glow at best. A real painted span guarantees
// the band shows up at full chosen opacity.
//
// `className` passes through to the inner <kbd> for size/color variants
// like .shortcuts-overlay-key, .command-palette-kbd, .keyboard-hint-key.

export const KbdKey = ({ children, className = "" }) => (
  <span className="kbd-frame">
    <kbd className={className}>{children}</kbd>
    <span className="kbd-shadow" aria-hidden="true" />
  </span>
);
