import { useEffect, useRef, useState } from "react";
import { lookPresets } from "../data/look-presets.js";

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

  // When the applied look changes (e.g. via Shuffle keyboard shortcut), scroll
  // its chip into view so the user sees which preset is now active. Without
  // this the chip can land off-screen and the change feels invisible.
  useEffect(() => {
    if (!appliedId) return;
    const chip = chipRefs.current.get(appliedId);
    if (chip && typeof chip.scrollIntoView === "function") {
      chip.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
    }
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
              <img
                src={`/looks/${preset.id}.png`}
                alt=""
                loading="lazy"
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
