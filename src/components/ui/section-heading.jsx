import { useState } from "react";

// Section heading with a hover-revealed deep-link anchor. Click the
// anchor → copies the full URL with #id to the clipboard so the user
// can paste it elsewhere. Renders <h2> by default; pass `as="h3"` for
// subsection titles. The `id` lands on the heading itself so the
// browser-native scroll-to-fragment finds it.

export const SectionHeading = ({
  id,
  children,
  as: Tag = "h2",
  className = "",
}) => {
  const [copied, setCopied] = useState(false);

  const onCopyLink = (event) => {
    event.preventDefault();
    const url = `${window.location.origin}${window.location.pathname}#${id}`;
    // Update the address bar without scrolling — keeps the URL shareable.
    window.history.replaceState(null, "", `#${id}`);
    try {
      navigator.clipboard?.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1200);
    } catch {
      // Ignore — the URL bar is updated either way.
    }
  };

  return (
    <Tag id={id} className={`section-heading ${className}`.trim()}>
      <span className="section-heading-text">{children}</span>
      <a
        href={`#${id}`}
        className="section-heading-anchor"
        onClick={onCopyLink}
        aria-label={`Copy link to ${typeof children === "string" ? children : "section"}`}
      >
        {copied ? "✓" : "#"}
      </a>
    </Tag>
  );
};
