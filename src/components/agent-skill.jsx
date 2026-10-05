import { useId, useRef, useState } from "react";
import { CodeBlock } from "./ui/code-block.jsx";

// The export dialog's Skill tab: the commands that add the Globestudio agent
// skill (skills/globestudio) to a coding agent. Lazy loaded by
// export-modal.jsx, so it stays out of first paint. It needs no CSS of its
// own: the group, toggle and code block styles are the dialog's.
//
// The same commands, labels and telemetry note as the docs' Agent skill
// section. The Claude Code plugin adds the hosted MCP server too.
// The skill's page on skills.sh: the rendered SKILL.md, installs and audits.
export const SKILL_PAGE_URL = "https://skills.sh/alevizio/globestudio/globestudio";

const OPTIONS = [
  { id: "npx", label: "npx skills", language: "npx skills", code: "npx skills add alevizio/globestudio" },
  {
    id: "claude",
    label: "Claude Code",
    language: "Claude Code plugin",
    code: "claude plugin marketplace add alevizio/globestudio && claude plugin install globestudio@globestudio",
  },
  { id: "gh", label: "GitHub", language: "GitHub CLI", code: "gh skill install alevizio/globestudio globestudio" },
];

export const AgentSkill = () => {
  const id = useId();
  const [optionId, setOptionId] = useState(OPTIONS[0].id);
  const tabRefs = useRef(new Map());
  const activeIndex = OPTIONS.findIndex((option) => option.id === optionId);
  const option = OPTIONS[activeIndex];

  // Tabs pattern, like the MCP tab's clients: arrows and Home/End move
  // selection and focus together.
  const onTabKeyDown = (event) => {
    const last = OPTIONS.length - 1;
    const next = {
      ArrowLeft: activeIndex === 0 ? last : activeIndex - 1,
      ArrowRight: activeIndex === last ? 0 : activeIndex + 1,
      Home: 0,
      End: last,
    }[event.key];
    if (next === undefined) return;
    event.preventDefault();
    setOptionId(OPTIONS[next].id);
    tabRefs.current.get(OPTIONS[next].id)?.focus();
  };

  return (
    <section className="export-modal-group">
      <h3 id={`${id}-title`} className="export-modal-label">Teach your coding agent Globestudio</h3>
      <p className="export-modal-caption">
        The skill shows Claude Code, Codex, Cursor and other coding agents how to add and edit Globestudio globes and
        maps in your project.
      </p>
      <div
        className="segmented-toggle"
        role="tablist"
        aria-labelledby={`${id}-title`}
        style={{ "--active-index": activeIndex, "--segment-count": OPTIONS.length }}
        onKeyDown={onTabKeyDown}
      >
        <span className="segmented-toggle-indicator" aria-hidden="true" />
        {OPTIONS.map((item) => {
          const active = item.id === optionId;
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
              onClick={() => setOptionId(item.id)}
            >
              {item.label}
            </button>
          );
        })}
      </div>
      <div role="tabpanel" id={`${id}-panel`} aria-labelledby={`${id}-tab-${option.id}`}>
        {/* Keyed, so a "Copied" from one option doesn't carry over to the
            next. One-line commands wrap between arguments on a phone. */}
        <CodeBlock key={option.id} language={option.language} wrap keyboardScroll>
          {option.code}
        </CodeBlock>
      </div>
      <p className="export-modal-caption">
        npx skills sends anonymous install data to skills.sh unless you set DISABLE_TELEMETRY=1.{" "}
        <a href={SKILL_PAGE_URL} target="_blank" rel="noopener">
          See the skill on skills.sh
        </a>
      </p>
    </section>
  );
};
