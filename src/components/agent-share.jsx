import { Fragment, useId, useRef, useState } from "react";
import { Check, Clipboard, Plus } from "./icons.jsx";
import { CodeBlock } from "./ui/code-block.jsx";
import { track } from "./analytics.jsx";
import { parseShareConfig } from "../utils/share-config.js";
import { MCP_URL, buildAgentPrompt } from "../utils/agent-prompt.js";
import "./agent-share.css";

// "Use with AI" in the export dialog's Share tab. Lazy loaded by
// export-modal.jsx, so this file and its CSS stay out of first paint.
//
// Every command and menu path below comes from the client's own docs:
//   Claude Code  https://code.claude.com/docs/en/mcp
//   Claude app   https://support.claude.com/en/articles/11175166
//   Codex        https://developers.openai.com/codex/mcp
//   Cursor       https://cursor.com/docs/mcp and https://cursor.com/docs/mcp/install-links
// Cursor's install link carries the mcp.json server entry as base64 JSON.
const CURSOR_INSTALL_URL = `cursor://anysphere.cursor-deeplink/mcp/install?name=globestudio&config=${btoa(
  JSON.stringify({ url: MCP_URL }),
)}`;

const CLIENTS = [
  {
    id: "claude",
    label: "Claude",
    steps: [
      { label: "Claude Code", code: `claude mcp add --transport http globestudio ${MCP_URL}` },
      {
        label: "Claude app",
        note: "In the Claude app, open Customize, then Connectors. Press + and choose Add custom connector, then paste this URL.",
        code: MCP_URL,
      },
    ],
  },
  {
    id: "codex",
    label: "Codex",
    steps: [
      {
        label: "Codex CLI",
        note: "The Codex CLI, IDE extension and ChatGPT desktop app share this setup in ~/.codex/config.toml.",
        code: `codex mcp add globestudio --url ${MCP_URL}`,
      },
    ],
  },
  {
    id: "cursor",
    label: "Cursor",
    install: CURSOR_INSTALL_URL,
    steps: [
      {
        label: "mcp.json",
        note: "Or add this to ~/.cursor/mcp.json.",
        code: JSON.stringify({ mcpServers: { globestudio: { url: MCP_URL } } }, null, 2),
      },
    ],
  },
];

// One-line commands wrap only between arguments. Left alone, a phone would
// break "--url" after its dashes and the command would read wrong.
const Args = ({ text }) =>
  text.split(" ").map((arg, index) => (
    <Fragment key={index}>
      {index > 0 && " "}
      <span className="agent-share-arg">{arg}</span>
    </Fragment>
  ));

const readConfig = (shareUrl) => {
  try {
    return parseShareConfig(new URL(shareUrl, window.location.origin).search) ?? undefined;
  } catch {
    return undefined;
  }
};

export const AgentShare = ({ getShareUrl, lookName, regionName }) => {
  const id = useId();
  const [status, setStatus] = useState("idle");
  const [clientId, setClientId] = useState(CLIENTS[0].id);
  const tabRefs = useRef(new Map());
  const activeIndex = CLIENTS.findIndex((client) => client.id === clientId);
  const client = CLIENTS[activeIndex];

  const handleCopy = async () => {
    // Same link the Copy share link button copies, read at click time so
    // the prompt always matches what is on screen.
    const shareUrl = typeof getShareUrl === "function" ? getShareUrl() : window.location.href;
    const prompt = buildAgentPrompt({ shareUrl, lookName, regionName, config: readConfig(shareUrl) });
    try {
      await navigator.clipboard.writeText(prompt);
      setStatus("copied");
      track("share_clicked", { method: "ai" });
      window.setTimeout(() => setStatus("idle"), 1800);
    } catch {
      setStatus("manual");
      window.setTimeout(() => setStatus("idle"), 3000);
    }
  };

  // Tabs pattern: arrows and Home/End move selection and focus together.
  const onTabKeyDown = (event) => {
    const last = CLIENTS.length - 1;
    const next = {
      ArrowLeft: activeIndex === 0 ? last : activeIndex - 1,
      ArrowRight: activeIndex === last ? 0 : activeIndex + 1,
      Home: 0,
      End: last,
    }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    setClientId(CLIENTS[next].id);
    tabRefs.current.get(CLIENTS[next].id)?.focus();
  };

  return (
    <section className="agent-share" aria-labelledby={`${id}-title`}>
      <h3 id={`${id}-title`} className="export-modal-label">Use with AI</h3>
      <p className="export-modal-caption">
        Copy a prompt with this link and its settings, ready to paste into Claude, ChatGPT, Codex or any agent.
      </p>
      <button
        type="button"
        className={`export-modal-cta ${status === "copied" ? "is-success" : ""}`}
        onClick={handleCopy}
      >
        {status === "copied" ? <Check size={17} /> : <Clipboard size={17} />}
        <span>
          {status === "copied"
            ? "Prompt copied to clipboard"
            : status === "manual"
              ? "Copy failed. Try again"
              : "Copy for AI"}
        </span>
      </button>
      <p className="visually-hidden" role="status">
        {status === "copied" ? "Prompt copied to clipboard" : status === "manual" ? "Copy failed" : ""}
      </p>

      <p id={`${id}-connect`} className="export-modal-label agent-share-connect-label">
        Connect the MCP server
      </p>
      <p className="export-modal-caption">
        Your agent can then build links, pick looks and write embed code on its own.
      </p>
      <div
        className="segmented-toggle agent-share-clients"
        role="tablist"
        aria-labelledby={`${id}-connect`}
        style={{ "--active-index": activeIndex }}
        onKeyDown={onTabKeyDown}
      >
        <span className="segmented-toggle-indicator" aria-hidden="true" />
        {CLIENTS.map((item) => {
          const active = item.id === clientId;
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
              onClick={() => setClientId(item.id)}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      <div
        className="agent-share-panel"
        role="tabpanel"
        id={`${id}-panel`}
        aria-labelledby={`${id}-tab-${client.id}`}
      >
        {client.install && (
          <a className="export-modal-cta is-secondary" href={client.install}>
            <Plus size={17} />
            <span>Add to {client.label}</span>
          </a>
        )}
        {client.steps.map((step) => (
          <div key={step.label} className="agent-share-step">
            {step.note && <p className="export-modal-caption">{step.note}</p>}
            <CodeBlock language={step.label} copyText={step.code}>
              {step.code.includes("\n") ? step.code : <Args text={step.code} />}
            </CodeBlock>
          </div>
        ))}
      </div>
    </section>
  );
};
