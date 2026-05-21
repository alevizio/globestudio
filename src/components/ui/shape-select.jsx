import { useEffect, useRef, useState } from "react";
import { ChevronDown } from "../icons.jsx";
import { ShapePreview } from "./shape-preview.jsx";

export const ShapeSelect = ({ value, onChange, options, asciiSymbol = "*", customShape = null, label = "Shape" }) => {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    const handlePointerDown = (event) => {
      if (!wrapperRef.current?.contains(event.target)) {
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
      {open && (
        <ul className="shape-select-menu" role="listbox" aria-label={label}>
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
        </ul>
      )}
    </div>
  );
};
