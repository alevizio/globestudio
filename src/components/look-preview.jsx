// Tiny preview shown inside each looks-chip. A flat horizontal bar coloured
// with the preset's primary fill (dotColor in dots mode, worldFill in solid
// mode) — communicates the look's palette at a glance without the visual
// noise of a thumbnail-sized rendered scene.

export const LookPreview = ({ preset }) => {
  const { settings } = preset;
  const renderMode = settings.renderMode || "dots";
  const color = renderMode === "solid"
    ? settings.worldFill || "#5a5a64"
    : settings.dotColor || "#ffffff";

  return (
    <span
      className="looks-chip-preview"
      aria-hidden="true"
      style={{ background: color }}
    />
  );
};
