import { useId, useMemo, useRef, useState } from "react";
import { CodeBlock } from "./ui/code-block.jsx";
import { track } from "./analytics.jsx";
import {
  buildCodePenData,
  buildIframeSnippet,
  buildReactSnippet,
  buildWebComponentSnippet,
} from "../utils/embed-snippets.js";

// The Share tab's embed code: the current design as an iframe, a React
// component or a web component, in a CodeBlock with its Copy button, and a
// button that opens the web component in a new pen on CodePen.
// Each `id` is also the share_clicked method its copy is counted under.
const KINDS = [
  { id: "iframe", label: "iframe", language: "html", build: buildIframeSnippet },
  { id: "react", label: "React", language: "jsx", build: buildReactSnippet },
  { id: "web-component", label: "Web component", language: "html", build: buildWebComponentSnippet },
];

export const EmbedCode = ({ getShareUrl, width, height }) => {
  const id = useId();
  const [kindId, setKindId] = useState(KINDS[0].id);
  const tabRefs = useRef(new Map());
  const activeIndex = KINDS.findIndex((kind) => kind.id === kindId);
  const kind = KINDS[activeIndex];

  // The share link's `?c=…` payload is the config every snippet embeds:
  // the JSON the packages' `config` takes, and what the embed route reads.
  const config = useMemo(() => {
    try {
      if (typeof getShareUrl !== "function") return null;
      return new URL(getShareUrl(), window.location.origin).searchParams.get("c");
    } catch {
      return null;
    }
  }, [getShareUrl]);

  // Tabs pattern, like the MCP tab's clients: arrows and Home/End move
  // selection and focus together.
  const onTabKeyDown = (event) => {
    const last = KINDS.length - 1;
    const next = {
      ArrowLeft: activeIndex === 0 ? last : activeIndex - 1,
      ArrowRight: activeIndex === last ? 0 : activeIndex + 1,
      Home: 0,
      End: last,
    }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    setKindId(KINDS[next].id);
    tabRefs.current.get(KINDS[next].id)?.focus();
  };

  // CodePen's prefill API is a form post with the pen as JSON in a `data`
  // field, so a form is made for the post and dropped again.
  const openInCodePen = () => {
    const form = document.createElement("form");
    form.method = "post";
    form.action = "https://codepen.io/pen/define";
    form.target = "_blank";
    form.setAttribute("rel", "noopener");
    const field = document.createElement("input");
    field.type = "hidden";
    field.name = "data";
    field.value = JSON.stringify(buildCodePenData({ config }));
    form.append(field);
    document.body.append(form);
    form.submit();
    form.remove();
    track("share_clicked", { method: "codepen" });
  };

  return (
    <section className="export-modal-group">
      <h3 id={`${id}-title`} className="export-modal-label">Embed code</h3>
      <div
        className="segmented-toggle"
        role="tablist"
        aria-labelledby={`${id}-title`}
        style={{ "--active-index": activeIndex, "--segment-count": KINDS.length }}
        onKeyDown={onTabKeyDown}
      >
        <span className="segmented-toggle-indicator" aria-hidden="true" />
        {KINDS.map((item) => {
          const active = item.id === kindId;
          return (
            <button
              key={item.id}
              ref={(node) => {
                if (node) tabRefs.current.set(item.id, node);
                else tabRefs.current.delete(item.id);
              }}
              type="button"
              role="tab"
              id={`${id}-tab-${item.id}`}
              aria-selected={active}
              aria-controls={`${id}-panel`}
              tabIndex={active ? 0 : -1}
              className={`segmented-toggle-button ${active ? "is-active" : ""}`}
              onClick={() => setKindId(item.id)}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      <div role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-tab-${kind.id}`}>
        {/* Keyed, so a "Copied" from one option doesn't carry over to the
            next. Counted only once the copy succeeds, like the share link. */}
        <CodeBlock
          key={kind.id}
          language={kind.language}
          keyboardScroll
          onCopy={() => track("share_clicked", { method: kind.id })}
        >
          {kind.build({ config, width, height })}
        </CodeBlock>
      </div>
      <button type="button" className="export-modal-cta is-secondary" onClick={openInCodePen}>
        <span>Open in CodePen</span>
      </button>
    </section>
  );
};
