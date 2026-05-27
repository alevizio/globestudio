import { useEffect, useRef, useState } from "react";
import { Check, Clipboard } from "../icons.jsx";

// Reusable <pre> wrapper with a click-to-copy button. Used in /docs for
// the iframe / React / script-tag snippets. The button shows a check
// glyph for 1.5s after a successful copy, then resets. Falls back to
// document.execCommand on browsers without the async clipboard API
// (rare in 2026 but cheap to support — covers locked-down corp Macs).

export const CodeBlock = ({ children, language, className = "" }) => {
  const [copied, setCopied] = useState(false);
  const timerRef = useRef(0);

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
    } catch {
      // Clipboard write blocked — fail silently; the snippet is still
      // selectable.
    }
  };

  return (
    <div className={`code-block ${className}`.trim()} data-language={language}>
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
      <pre className="code-block-pre">
        <code>{children}</code>
      </pre>
    </div>
  );
};
