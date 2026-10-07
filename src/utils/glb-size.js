// The Export dialog's 3D tab: the GLB's size for the Dots picked, and when
// Merged makes a large file, a line suggesting Instanced (export-modal.jsx).
// The sizes come from estimateGlbBytes in three/glb-export.js.

// Over 20 MB, Merged suggests Instanced: over it as the size line shows
// it, from "About 21 MB" up, so "About 20 MB" never shows both with the
// suggestion and without it. Sizes count 1 MB as 1,000,000 bytes, as macOS
// and iOS do.
export const GLB_LARGE_MB = 20;

// A size of 1 MB or more, in MB as the size line shows it.
const shownMegabytes = (bytes) => Number((bytes / 1e6).toPrecision(2));

// Two significant figures, as the estimate is close but not exact: 786 KB
// reads "790 KB", 38.97 MB "39 MB". inMegabytes keeps a size under 1 MB in
// MB, to one decimal, to set beside one in MB.
export const formatGlbSize = (bytes, { inMegabytes = false } = {}) => {
  const kilobytes = Number((bytes / 1e3).toPrecision(2));
  if (kilobytes < 1000 && !inMegabytes) return `${kilobytes} KB`;
  const megabytes = bytes / 1e6;
  if (megabytes < 1) return `${Math.max(0.1, Math.round(megabytes * 10) / 10)} MB`;
  return `${shownMegabytes(bytes)} MB`;
};

// estimate: { merged, instanced } in bytes. dots: "merged" or "instanced".
// size is the line for the Dots picked. instancedSize is Instanced's size
// for the line suggesting it, while Merged makes a large file, else null:
// the dialog sets it in its sentence, on one line with its unit.
export const glbSizeNote = (estimate, dots) => {
  const instanced = dots === "instanced";
  const large = !instanced && shownMegabytes(estimate.merged) > GLB_LARGE_MB;
  return {
    size: `About ${formatGlbSize(instanced ? estimate.instanced : estimate.merged)}`,
    instancedSize: large ? formatGlbSize(estimate.instanced, { inMegabytes: true }) : null,
  };
};
