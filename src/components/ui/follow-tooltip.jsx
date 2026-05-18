import { useEffect, useRef, useState } from "react";

// Single fixed-position tooltip that follows the cursor. Listens at the
// document level for any element carrying `data-tooltip="…"`, so callers
// opt in by adding the attribute instead of importing a wrapper. The
// content reads from the attribute on each mouseover so it updates if the
// label changes (e.g. when a toggle's role flips between "Hide" / "Show").
export const FollowTooltip = () => {
  const ref = useRef(null);
  const rafRef = useRef(0);
  const [content, setContent] = useState("");
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return undefined;

    const updatePosition = (clientX, clientY) => {
      // Position 14/16px below-right of the cursor. Flip to above-left if
      // the tooltip would overflow the viewport edge.
      const offsetX = 14;
      const offsetY = 16;
      const rect = node.getBoundingClientRect();
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      let x = clientX + offsetX;
      let y = clientY + offsetY;
      if (x + rect.width + 8 > vw) x = clientX - rect.width - offsetX;
      if (y + rect.height + 8 > vh) y = clientY - rect.height - offsetY;
      node.style.transform = `translate(${Math.max(8, x)}px, ${Math.max(8, y)}px)`;
    };

    const onOver = (event) => {
      const target = event.target instanceof Element
        ? event.target.closest("[data-tooltip]")
        : null;
      if (!target) return;
      const text = target.getAttribute("data-tooltip");
      if (!text) return;
      setContent(text);
      setVisible(true);
      updatePosition(event.clientX, event.clientY);
    };

    const onMove = (event) => {
      const target = event.target instanceof Element
        ? event.target.closest("[data-tooltip]")
        : null;
      if (!target) {
        if (visibleRef.current) setVisible(false);
        return;
      }
      // Refresh content if the label changed mid-hover (e.g. toggle state).
      const text = target.getAttribute("data-tooltip");
      if (text !== contentRef.current) setContent(text);
      if (!visibleRef.current) setVisible(true);
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(() => {
        updatePosition(event.clientX, event.clientY);
      });
    };

    const onOut = (event) => {
      const next = event.relatedTarget instanceof Element
        ? event.relatedTarget.closest("[data-tooltip]")
        : null;
      if (!next) setVisible(false);
    };

    const onScroll = () => setVisible(false);

    document.addEventListener("mouseover", onOver, true);
    document.addEventListener("mousemove", onMove, true);
    document.addEventListener("mouseout", onOut, true);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mouseover", onOver, true);
      document.removeEventListener("mousemove", onMove, true);
      document.removeEventListener("mouseout", onOut, true);
      window.removeEventListener("scroll", onScroll, true);
      cancelAnimationFrame(rafRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Refs that mirror state so the event handlers (registered once) see the
  // current values without re-binding on every render.
  const visibleRef = useRef(visible);
  const contentRef = useRef(content);
  visibleRef.current = visible;
  contentRef.current = content;

  return (
    <div
      ref={ref}
      className={`follow-tooltip ${visible ? "is-visible" : ""}`}
      role="tooltip"
      aria-hidden={!visible}
    >
      {content}
    </div>
  );
};
