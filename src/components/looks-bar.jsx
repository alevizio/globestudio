import { useEffect, useRef, useState } from "react";
import { lookPresets } from "../data/look-presets.js";
import { lookThumbProps } from "../utils/look-thumbs.js";

// Scroll-aware edge fade indicators so users know there are more looks to the
// right (the bar overflows by ~450px on a default panel width). The data
// attributes drive CSS masks: hide the left fade at the start, hide the right
// fade once scrolled to the end.
export const LooksBar = ({ onPick, appliedId = null, currentId = null }) => {
  const ref = useRef(null);
  const chipRefs = useRef(new Map());
  const [edges, setEdges] = useState({ atStart: true, atEnd: false });

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;
    const update = () => {
      const max = node.scrollWidth - node.clientWidth;
      setEdges({
        atStart: node.scrollLeft <= 1,
        atEnd: max <= 1 || node.scrollLeft >= max - 1,
      });
    };
    update();
    node.addEventListener("scroll", update, { passive: true });
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => {
      node.removeEventListener("scroll", update);
      observer.disconnect();
    };
  }, []);

  // Centre a chip by scrolling only the bar. scrollIntoView also scrolls
  // ancestors, and on a /looks/<id> load it ran while chip widths were still
  // settling (label font, thumbs), so late looks like Metal ended up off
  // screen: past the end on desktop, never scrolled inside the phone sheet.
  const centerChip = (id, behavior) => {
    const node = ref.current;
    const chip = id ? chipRefs.current.get(id) : null;
    if (!node || !chip) return;
    const chipBox = chip.getBoundingClientRect();
    const barBox = node.getBoundingClientRect();
    const target = node.scrollLeft + chipBox.left - barBox.left - (barBox.width - chipBox.width) / 2;
    const left = Math.max(0, Math.min(target, node.scrollWidth - node.clientWidth));
    if (typeof node.scrollTo === "function") node.scrollTo({ left, behavior });
    else node.scrollLeft = left;
  };

  // Show the page's look on arrival (a shared /looks/<id> link), again once
  // the label font has loaded and the widths are final.
  useEffect(() => {
    if (!currentId) return undefined;
    let cancelled = false;
    centerChip(currentId, "auto");
    document.fonts?.ready?.then(() => {
      if (!cancelled) centerChip(currentId, "auto");
    });
    return () => {
      cancelled = true;
    };
  }, [currentId]);

  // When the applied look changes (e.g. via Shuffle keyboard shortcut), scroll
  // its chip into view so the user sees which preset is now active. Without
  // this the chip can land off-screen and the change feels invisible.
  useEffect(() => {
    if (!appliedId) return;
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    centerChip(appliedId, reduce ? "auto" : "smooth");
  }, [appliedId]);

  return (
    <ul
      ref={ref}
      className="looks-bar"
      aria-label="Looks"
      data-at-start={edges.atStart ? "true" : "false"}
      data-at-end={edges.atEnd ? "true" : "false"}
    >
      {lookPresets.map((preset) => (
        <li key={preset.id} className="looks-item">
          <button
            ref={(node) => {
              if (node) chipRefs.current.set(preset.id, node);
              else chipRefs.current.delete(preset.id);
            }}
            type="button"
            className={`looks-chip ${appliedId === preset.id ? "is-applied" : ""} ${currentId === preset.id ? "is-current" : ""}`}
            data-tooltip={preset.blurb}
            onClick={() => onPick(preset)}
          >
            <span className="looks-chip-thumb" aria-hidden="true">
              {/* Eager, not lazy: lazy chips only start loading once scrolled
                  into the bar, so they popped in mid scroll. The whole thumb
                  set weighs less than one old 512 px PNG did on average. */}
              <img
                {...lookThumbProps(preset.id, "28px")}
                alt=""
                width={28}
                height={28}
                decoding="async"
                fetchPriority="low"
                draggable="false"
                onError={(event) => {
                  event.currentTarget.style.display = "none";
                }}
              />
            </span>
            <span className="looks-chip-label">{preset.name}</span>
          </button>
        </li>
      ))}
    </ul>
  );
};
