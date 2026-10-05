import { useEffect, useRef, useState } from "react";
import { readDesignLink } from "../utils/design-link.js";

const LOADED = "Loaded the design from your link";
const NOT_A_LINK = "That is not a Globestudio link";
const NO_DESIGN = "That link has no design in it";

// Fields a paste lands in as text. A paste anywhere else is the page's.
const TEXT_TYPES = new Set(["text", "search", "url", "email", "tel", "password", "number"]);
const isTextField = (node) =>
  node instanceof HTMLElement &&
  (node.isContentEditable || node.tagName === "TEXTAREA" || (node.tagName === "INPUT" && TEXT_TYPES.has(node.type)));

// "Paste a share link" in the Figma plugin (App.jsx renders it, lazily, for
// ?plugin=figma only). A Globestudio link pasted into the field, typed and
// sent with Enter, or pasted anywhere on the page while focus is not in a
// text field loads that design through onLoad({ look, config }). Only the
// paste event's own data is read: Figma's iframe doesn't grant clipboard
// read, so navigator.clipboard.readText would be refused there. A paste
// outside the field reports through onPagePaste, since the field can sit
// in the closed phone sheet where its status line isn't seen.
export const FigmaPasteLink = ({ onLoad, onPagePaste }) => {
  const [value, setValue] = useState("");
  const [status, setStatus] = useState("");

  const load = (text) => {
    const design = readDesignLink(text, window.location.host);
    if (design?.look || design?.config) {
      onLoad(design);
      return LOADED;
    }
    return design ? NO_DESIGN : NOT_A_LINK;
  };

  // The page listener binds once and reads the latest props from here.
  const latest = useRef(null);
  latest.current = { load, onPagePaste };
  useEffect(() => {
    const onPaste = (event) => {
      if (event.defaultPrevented || isTextField(event.target)) return;
      const text = event.clipboardData?.getData("text");
      if (!text) return;
      event.preventDefault();
      setStatus("");
      latest.current.onPagePaste(latest.current.load(text));
    };
    document.addEventListener("paste", onPaste);
    return () => document.removeEventListener("paste", onPaste);
  }, []);

  // A loaded link clears the field for the next one; anything else stays
  // in it to fix.
  const submit = (text) => {
    const message = load(text);
    setStatus(message);
    setValue(message === LOADED ? "" : text);
  };

  return (
    <form
      className="paste-link"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        submit(value);
      }}
    >
      <input
        type="url"
        className="paste-link-input"
        aria-label="Paste a share link"
        placeholder="Paste a share link"
        value={value}
        autoComplete="off"
        spellCheck={false}
        onChange={(event) => {
          setValue(event.target.value);
          setStatus("");
        }}
        onPaste={(event) => {
          // No text to read: let the paste land, and Enter loads it.
          const text = event.clipboardData?.getData("text");
          if (!text) return;
          event.preventDefault();
          submit(text);
        }}
      />
      <p className="paste-link-status" role="status">{status}</p>
    </form>
  );
};
