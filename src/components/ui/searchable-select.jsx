import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown } from "../icons.jsx";

// Combobox-style select with type-to-filter. Native <select> with 250+ country
// entries forces users to scroll endlessly or stab at the first letter; this
// gives them search + arrow-key navigation while keeping the visual language
// of the rest of the panel.
export const SearchableSelect = ({ value, onChange, options, label, placeholder = "Search…" }) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const containerRef = useRef(null);
  const listRef = useRef(null);
  const inputRef = useRef(null);

  const current = options.find((option) => option.value === value);
  const currentLabel = current?.label ?? placeholder;

  const filtered = useMemo(() => {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return options;
    return options.filter((option) => {
      if (option.label.toLowerCase().includes(trimmed)) return true;
      // searchTokens is a per-option array of additional strings the filter
      // should match against (e.g. localized country names for i18n search).
      // Already lowercased upstream by the option builder.
      if (option.searchTokens) {
        for (const token of option.searchTokens) {
          if (token.includes(trimmed)) return true;
        }
      }
      return false;
    });
  }, [options, query]);

  // Floating popover positioning — read the trigger's viewport rect and
  // decide whether to anchor the popover below it (default) or flip up
  // (when there isn't enough room below). Recompute on scroll/resize so
  // it follows the trigger if the rail scrolls under it.
  const [popoverStyle, setPopoverStyle] = useState(null);
  useEffect(() => {
    if (!open || !containerRef.current) {
      setPopoverStyle(null);
      return undefined;
    }
    const updatePosition = () => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const POPOVER_MAX_H = 320;
      const GAP = 4;
      const spaceBelow = window.innerHeight - rect.bottom - GAP;
      const spaceAbove = rect.top - GAP;
      const flipUp = spaceBelow < 200 && spaceAbove > spaceBelow;
      const maxHeight = Math.max(160, Math.min(POPOVER_MAX_H, flipUp ? spaceAbove : spaceBelow));
      setPopoverStyle({
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

  // Reset query + scroll-active when the popover closes.
  useEffect(() => {
    if (!open) {
      setQuery("");
      setActiveIndex(0);
      return undefined;
    }
    // Two-frame focus so the trigger's outline doesn't steal focus on the
    // same tick. requestAnimationFrame is more reliable than setTimeout(0)
    // here — the input has just mounted and needs one paint to settle.
    const frame = window.requestAnimationFrame(() => {
      inputRef.current?.focus();
    });
    const currentIndex = filtered.findIndex((o) => o.value === value);
    if (currentIndex >= 0) setActiveIndex(currentIndex);
    return () => window.cancelAnimationFrame(frame);
  }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

  // Keep the active item visible during keyboard nav.
  useEffect(() => {
    if (!open || !listRef.current) return;
    const node = listRef.current.children[activeIndex];
    // JSDOM doesn't implement scrollIntoView; guard so unit tests don't crash.
    if (node && typeof node.scrollIntoView === "function") {
      node.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex, open]);

  // Click outside closes. The popover is portaled to body, so we keep a
  // ref to it and also exclude clicks inside the portaled element.
  const popoverRef = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (event) => {
      const inTrigger = containerRef.current?.contains(event.target);
      const inPopover = popoverRef.current?.contains(event.target);
      if (!inTrigger && !inPopover) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const pickOption = (option) => {
    onChange(option.value);
    setOpen(false);
  };

  const handleKey = (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((index) => Math.min(filtered.length - 1, index + 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((index) => Math.max(0, index - 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const option = filtered[activeIndex];
      if (option) pickOption(option);
    } else if (event.key === "Escape") {
      event.preventDefault();
      setOpen(false);
    }
  };

  return (
    <div className={`searchable-select ${open ? "is-open" : ""}`} ref={containerRef}>
      <button
        type="button"
        className="searchable-select-trigger"
        aria-label={label}
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="searchable-select-value">{currentLabel}</span>
        <ChevronDown size={16} />
      </button>
      {open && popoverStyle && createPortal(
        <div
          ref={popoverRef}
          className="searchable-select-popover"
          role="dialog"
          style={popoverStyle}
        >
          <input
            ref={inputRef}
            type="text"
            className="searchable-select-search"
            placeholder={placeholder}
            value={query}
            autoFocus
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={handleKey}
            aria-label={`Filter ${label}`}
          />
          <ul ref={listRef} className="searchable-select-list" role="listbox">
            {filtered.length === 0 && (
              <li className="searchable-select-empty">No matches</li>
            )}
            {filtered.map((option, index) => {
              const isActive = index === activeIndex;
              const isSelected = option.value === value;
              return (
                <li
                  key={option.value}
                  role="option"
                  aria-selected={isSelected}
                  className={`searchable-select-option ${isActive ? "is-active" : ""} ${
                    isSelected ? "is-selected" : ""
                  }`}
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseDown={(event) => {
                    // Prevent the input from blurring before the click registers.
                    event.preventDefault();
                    pickOption(option);
                  }}
                >
                  {option.label}
                </li>
              );
            })}
          </ul>
        </div>,
        document.body
      )}
    </div>
  );
};
