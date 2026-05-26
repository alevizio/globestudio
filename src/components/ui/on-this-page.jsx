import { useEffect, useRef, useState } from "react";

// Sticky right-rail table of contents. Two responsibilities:
//   1) Mark the section the user is currently reading as active.
//   2) Smooth-scroll to a section when its link is clicked.
//
// We use scroll position rather than IntersectionObserver because the
// observer-based approach gets stuck when the user is mid-section — no
// heading is in the viewport, so nothing fires. Reading scroll position
// + heading.getBoundingClientRect() means there's always exactly one
// "active" section: the last heading whose top has crossed an upper
// threshold (~80px below the sticky nav). Listener is passive + we
// throttle via rAF so it's free at 60fps.
//
// `sections` is an array of { id, label } in document order.

const ACTIVE_OFFSET = 96; // px below the sticky nav where "reading" begins

export const OnThisPage = ({ sections, title = "On this page" }) => {
  const [activeId, setActiveId] = useState(sections[0]?.id ?? "");
  // When the user clicks a link, we kick off a smooth scroll AND want
  // the active highlight to jump straight to the destination — not
  // flash through every intermediate section as the scroll passes
  // them. We lock the scroll-based active update for ~700 ms until the
  // smooth scroll settles.
  const lockUntilRef = useRef(0);

  useEffect(() => {
    if (!sections.length || typeof window === "undefined") return undefined;

    let rafId = 0;
    const pickActive = () => {
      rafId = 0;
      if (Date.now() < lockUntilRef.current) return;
      // Walk top-to-bottom; the last heading whose top is at or above
      // the offset line is the section we're currently reading.
      let current = sections[0]?.id ?? "";
      for (const s of sections) {
        const el = document.getElementById(s.id);
        if (!el) continue;
        const top = el.getBoundingClientRect().top;
        if (top <= ACTIVE_OFFSET) {
          current = s.id;
        } else {
          break;
        }
      }
      setActiveId(current);
    };

    const onScroll = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(pickActive);
    };

    pickActive();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [sections]);

  const handleClick = (event, id) => {
    event.preventDefault();
    const el = document.getElementById(id);
    if (!el) return;
    // Lock scroll-based active updates while the smooth scroll runs so
    // the highlight jumps directly to the destination instead of
    // sweeping through intermediate sections.
    lockUntilRef.current = Date.now() + 700;
    setActiveId(id);
    // Honor reduced-motion preference — instant jump if requested,
    // smooth scroll otherwise.
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)")
      ?.matches;
    const top =
      el.getBoundingClientRect().top + window.scrollY - ACTIVE_OFFSET + 16;
    window.scrollTo({ top, behavior: reduce ? "auto" : "smooth" });
    // Keep the URL hash in sync without triggering another (instant) jump.
    window.history.replaceState(null, "", `#${id}`);
  };

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
              onClick={(event) => handleClick(event, s.id)}
            >
              {s.label}
            </a>
          </li>
        ))}
      </ul>
    </aside>
  );
};
