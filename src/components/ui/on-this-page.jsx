import { useEffect, useState } from "react";

// Sticky right-rail table of contents. Watches all headings with the
// given ids via IntersectionObserver and marks the topmost-visible
// section as active. Hidden under 1080px (CSS) so the layout collapses
// to a single column on narrow screens — the in-page anchor links
// remain reachable via the section headings themselves.
//
// `sections` is an array of { id, label } in document order.

export const OnThisPage = ({ sections, title = "On this page" }) => {
  const [activeId, setActiveId] = useState(sections[0]?.id ?? "");

  useEffect(() => {
    if (!sections.length || typeof window === "undefined") return undefined;
    const elements = sections
      .map((s) => document.getElementById(s.id))
      .filter(Boolean);
    if (!elements.length) return undefined;

    // Track which entries are intersecting. On any change, pick the
    // top-most visible heading — index 0 in document order. This avoids
    // the "second section flashes active while first is still on-screen"
    // bug a naive `entry.isIntersecting → set active` would have.
    const visible = new Set();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) visible.add(entry.target.id);
          else visible.delete(entry.target.id);
        }
        const topmost = sections.find((s) => visible.has(s.id));
        if (topmost) setActiveId(topmost.id);
      },
      // Trigger when a heading crosses 20% from the top — feels right
      // for "I'm reading this section now" without lagging behind.
      { rootMargin: "-20% 0px -65% 0px", threshold: 0 },
    );
    for (const el of elements) observer.observe(el);
    return () => observer.disconnect();
  }, [sections]);

  if (!sections.length) return null;

  return (
    <aside className="on-this-page" aria-label={title}>
      <p className="on-this-page-title">{title}</p>
      <ul className="on-this-page-list">
        {sections.map((s) => (
          <li key={s.id}>
            <a
              href={`#${s.id}`}
              className={`on-this-page-link${activeId === s.id ? " is-active" : ""}`}
              aria-current={activeId === s.id ? "true" : undefined}
            >
              {s.label}
            </a>
          </li>
        ))}
      </ul>
    </aside>
  );
};
