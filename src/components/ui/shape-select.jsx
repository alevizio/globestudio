import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "../icons.jsx";
import { ShapePreview } from "./shape-preview.jsx";

export const ShapeSelect = ({ value, onChange, options, asciiSymbol = "*", customShape = null, label = "Shape" }) => {
  const [open, setOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState(null);
  const wrapperRef = useRef(null);
  const menuRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const handlePointerDown = (event) => {
      const inTrigger = wrapperRef.current?.contains(event.target);
      const inMenu = menuRef.current?.contains(event.target);
      if (!inTrigger && !inMenu) {
        setOpen(false);
      }
    };
    const handleKey = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("pointerdown", handlePointerDown, true);
    window.addEventListener("keydown", handleKey);
    return () => {
      window.removeEventListener("pointerdown", handlePointerDown, true);
      window.removeEventListener("keydown", handleKey);
    };
  }, [open]);

  // Position the menu via `position: fixed` based on the trigger's
  // bounding rect, then portal it to <body>. Without this, the menu
  // sits inside the control-rail's stacking context (the rail itself
  // has backdrop-filter), which makes the menu's own backdrop-filter
  // see only the rail's content rather than the canvas behind — i.e.
  // no visible blur. Portaling escapes the context so the frosted
  // effect actually reads through to the canvas.
  useEffect(() => {
    if (!open || !wrapperRef.current) {
      setMenuStyle(null);
      return undefined;
    }
    const updatePosition = () => {
      const rect = wrapperRef.current?.getBoundingClientRect();
      if (!rect) return;
      const GAP = 4;
      const MAX_H = 240;
      const spaceBelow = window.innerHeight - rect.bottom - GAP;
      const spaceAbove = rect.top - GAP;
      const flipUp = spaceBelow < 160 && spaceAbove > spaceBelow;
      const maxHeight = Math.max(
        140,
        Math.min(MAX_H, flipUp ? spaceAbove : spaceBelow),
      );
      setMenuStyle({
        position: "fixed",
        left: `${rect.left}px`,
        width: `${rect.width}px`,
        ...(flipUp
          ? { bottom: `${window.innerHeight - rect.top + GAP}px` }
          : { top: `${rect.bottom + GAP}px` }),
        maxHeight: `${maxHeight}px`,
      });
    };
    updatePosition();
    window.addEventListener("scroll", updatePosition, true);
    window.addEventListener("resize", updatePosition);
    return () => {
      window.removeEventListener("scroll", updatePosition, true);
      window.removeEventListener("resize", updatePosition);
    };
  }, [open]);

  return (
    <div ref={wrapperRef} className="shape-select">
      <button
        type="button"
        className="shape-select-trigger"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        <ShapePreview shape={value} asciiSymbol={asciiSymbol} customShape={customShape} />
        <span className="shape-select-label">{value}</span>
        <ChevronDown size={14} />
      </button>
      {open && menuStyle && createPortal(
        <ul
          ref={menuRef}
          className="shape-select-menu"
          role="listbox"
          aria-label={label}
          style={menuStyle}
        >
          {options.map((option) => {
            const active = option === value;
            return (
              <li key={option} role="option" aria-selected={active}>
                <button
                  type="button"
                  className={`shape-select-option ${active ? "is-active" : ""}`}
                  onClick={() => {
                    onChange(option);
                    setOpen(false);
                  }}
                >
                  <ShapePreview shape={option} asciiSymbol={asciiSymbol} customShape={customShape} />
                  <span>{option}</span>
                </button>
              </li>
            );
          })}
        </ul>,
        document.body,
      )}
    </div>
  );
};
