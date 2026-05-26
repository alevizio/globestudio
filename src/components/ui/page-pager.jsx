import { useEffect, useState } from "react";

// Bottom-of-page prev/next navigation across the takeover pages.
// Order mirrors the top nav: Docs → Changelog → Press kit → Privacy.
// Replaces the old TakeoverFooter so visitors are nudged to the
// next surface instead of hunting through a list of links.
//
// On the first page, prev is empty; on the last, next links back to
// the canvas. Reads window.location.pathname at mount to figure out
// where we are; SPA route changes remount the page so the new
// pathname is picked up automatically.

const PAGES = [
  { href: "/docs", label: "Docs" },
  { href: "/changelog", label: "Changelog" },
  { href: "/brand", label: "Press kit" },
  { href: "/privacy", label: "Privacy" },
];

const HOME = { href: "/", label: "Back to the canvas" };

export const PagePager = () => {
  const [pathname, setPathname] = useState("");
  useEffect(() => {
    setPathname(window.location.pathname);
  }, []);

  const index = PAGES.findIndex(
    (p) => pathname === p.href || pathname.startsWith(`${p.href}/`),
  );
  if (index === -1) return null;

  const prev = index > 0 ? PAGES[index - 1] : null;
  const next = index < PAGES.length - 1 ? PAGES[index + 1] : HOME;

  return (
    <nav className="page-pager" aria-label="Pages">
      {prev ? (
        <a className="page-pager-link page-pager-prev" href={prev.href}>
          <span className="page-pager-direction">← Previous</span>
          <span className="page-pager-label">{prev.label}</span>
        </a>
      ) : (
        <span aria-hidden="true" />
      )}
      <a className="page-pager-link page-pager-next" href={next.href}>
        <span className="page-pager-direction">Next →</span>
        <span className="page-pager-label">{next.label}</span>
      </a>
    </nav>
  );
};
