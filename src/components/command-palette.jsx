import { useEffect, useMemo, useRef, useState } from "react";
import { useModalA11y } from "../hooks/use-modal-a11y.js";
import { X } from "./icons.jsx";

// Cmd+K command palette. A flat list of every meaningful action in the
// app — apply a preset, shuffle, reset, toggle ambient/view/panel,
// export, help — with a fuzzy search box at the top and arrow-key
// navigation. Modeled after the patterns Linear / Stripe / Vercel use:
// one tap to open, one keystroke per action.
//
// The `actions` array carries everything callers want exposed; the
// component handles filtering, keyboard nav, and execution. Each entry:
//   { id, label, kbd?, group?, run }
// `kbd` is an optional inline shortcut hint shown on the right side.
// `group` lets the list be split visually; it's purely cosmetic.

// Lightweight fuzzy match — returns a score (lower is better) or -1 for
// no match. Subsequence match: every char of `query` must appear in
// `text` in order, ignoring case. Score rewards contiguous matches and
// early hits. Good enough for ~30 commands without pulling fuse.js in.
const fuzzyScore = (text, query) => {
  if (!query) return 0;
  const t = text.toLowerCase();
  const q = query.toLowerCase();
  let ti = 0;
  let score = 0;
  let lastMatchedAt = -2;
  for (const c of q) {
    const nextAt = t.indexOf(c, ti);
    if (nextAt === -1) return -1;
    // Gap penalty: characters with intervening misses cost more.
    score += nextAt - ti;
    // Contiguity bonus: zero-gap match adjacent to the last is cheap.
    if (nextAt !== lastMatchedAt + 1) score += 2;
    lastMatchedAt = nextAt;
    ti = nextAt + 1;
  }
  return score;
};

export const CommandPalette = ({ open, onClose, actions }) => {
  const inputRef = useRef(null);
  const dialogRef = useRef(null);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);

  useModalA11y({
    open,
    onClose,
    containerRef: dialogRef,
    backdropSelector: ".command-palette-backdrop",
  });

  // Reset on open so the user always lands in an empty search.
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      // Focus the input shortly after mount so the modal-a11y focus
      // restore doesn't immediately steal it back to the dialog.
      const id = window.setTimeout(() => inputRef.current?.focus(), 30);
      return () => window.clearTimeout(id);
    }
    return undefined;
  }, [open]);

  const filtered = useMemo(() => {
    if (!query) return actions;
    return actions
      .map((action) => {
        const labelScore = fuzzyScore(action.label, query);
        const groupScore = action.group ? fuzzyScore(action.group, query) : -1;
        const score =
          labelScore === -1 && groupScore === -1
            ? -1
            : Math.min(
                labelScore === -1 ? Number.POSITIVE_INFINITY : labelScore,
                groupScore === -1 ? Number.POSITIVE_INFINITY : groupScore + 6,
              );
        return { action, score };
      })
      .filter(({ score }) => score !== -1)
      .sort((a, b) => a.score - b.score)
      .map(({ action }) => action);
  }, [query, actions]);

  // Clamp the selection when the filtered list shrinks below it.
  useEffect(() => {
    if (selectedIndex >= filtered.length) setSelectedIndex(0);
  }, [filtered.length, selectedIndex]);

  const onKeyDown = (event) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedIndex((i) => (filtered.length === 0 ? 0 : (i + 1) % filtered.length));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedIndex((i) => (filtered.length === 0 ? 0 : (i - 1 + filtered.length) % filtered.length));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const action = filtered[selectedIndex];
      if (action) {
        action.run();
        onClose();
      }
    }
  };

  if (!open) return null;

  return (
    <div className="command-palette-backdrop" role="presentation" onClick={onClose}>
      <div
        ref={dialogRef}
        className="command-palette"
        role="dialog"
        aria-modal="true"
        aria-label="Command palette"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="command-palette-header">
          <input
            ref={inputRef}
            type="text"
            className="command-palette-input"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Type to find a preset or action…"
            aria-label="Search commands"
            spellCheck="false"
            autoComplete="off"
          />
          <button
            type="button"
            className="command-palette-close"
            onClick={onClose}
            aria-label="Close command palette"
          >
            <X size={14} />
          </button>
        </div>
        <ul className="command-palette-list" role="listbox" aria-label="Commands">
          {filtered.length === 0 ? (
            <li className="command-palette-empty">No matches</li>
          ) : (
            filtered.map((action, index) => (
              <li
                key={action.id}
                role="option"
                aria-selected={index === selectedIndex}
                className={`command-palette-row ${index === selectedIndex ? "is-selected" : ""}`}
                onMouseEnter={() => setSelectedIndex(index)}
                onClick={() => {
                  action.run();
                  onClose();
                }}
              >
                {action.group && (
                  <span className="command-palette-group">{action.group}</span>
                )}
                <span className="command-palette-label">{action.label}</span>
                {action.kbd && (
                  <kbd className="command-palette-kbd">{action.kbd}</kbd>
                )}
              </li>
            ))
          )}
        </ul>
        <div className="command-palette-footer">
          <span>
            <kbd>↑↓</kbd> navigate
          </span>
          <span>
            <kbd>↵</kbd> run
          </span>
          <span>
            <kbd>esc</kbd> close
          </span>
        </div>
      </div>
    </div>
  );
};
