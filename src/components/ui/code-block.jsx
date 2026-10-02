import { Fragment, useEffect, useRef, useState } from "react";
import { Check, Clipboard } from "../icons.jsx";

// Reusable <pre> wrapper with a click-to-copy button. Used in /docs for
// the iframe / React / script-tag snippets. The button shows a check
// glyph for 1.5s after a successful copy, then resets. Falls back to
// document.execCommand on browsers without the async clipboard API
// (rare in 2026 but cheap to support — covers locked-down corp Macs).
// `wrap` is for one-line commands: on a phone they wrap between arguments
// instead of scrolling sideways, and no argument breaks inside itself
// (Chrome would split "--url" after its dashes). Copy still writes the
// plain string.
// `keyboardScroll` is for snippets that can still run past a narrow box:
// while one scrolls sideways it joins the tab order, named by its language
// label, so the arrow keys can scroll it.
// `onCopy` is called after a copy that worked.

const Args = ({ text }) =>
  text.split(" ").map((arg, index) => (
    <Fragment key={index}>
      {index > 0 && " "}
      <span className="code-block-arg">{arg}</span>
    </Fragment>
  ));

export const CodeBlock = ({ children, language, className = "", wrap = false, keyboardScroll = false, onCopy: onCopied }) => {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef(0);
  const preRef = useRef(null);
  const [scrolls, setScrolls] = useState(false);

  useEffect(() => {
    const pre = preRef.current;
    if (!keyboardScroll || !pre || typeof ResizeObserver === "undefined") return undefined;
    const measure = () => setScrolls(pre.scrollWidth > pre.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(pre);
    return () => observer.disconnect();
  }, [keyboardScroll, children]);

  useEffect(
    () => () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    },
    [],
  );

  const onCopy = async () => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(children);
      } else {
        const ta = document.createElement("textarea");
        ta.value = children;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      }
      setCopied(true);
      timerRef.current = window.setTimeout(() => setCopied(false), 1500);
      onCopied?.();
    } catch {
      // Clipboard write blocked — fail silently; the snippet is still
      // selectable.
    }
  };

  return (
    <div className={`code-block ${wrap ? "is-wrap " : ""}${className}`.trim()} data-language={language}>
      <div className="code-block-header">
        {language && (
          <span className="code-block-language">{language}</span>
        )}
        <button
          type="button"
          className="code-block-copy"
          onClick={onCopy}
          aria-label={copied ? "Copied" : "Copy code to clipboard"}
        >
          {copied ? (
            <Check size={12} aria-hidden="true" />
          ) : (
            <Clipboard size={12} aria-hidden="true" />
          )}
          <span>{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
      <pre
        className="code-block-pre"
        ref={preRef}
        {...(scrolls && { tabIndex: 0, role: "group", "aria-label": language })}
      >
        <code>{wrap ? <Args text={children} /> : children}</code>
      </pre>
    </div>
  );
};
