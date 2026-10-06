import { useEffect } from "react";
import { lookPresets } from "../data/look-presets.js";
import { STARTER_DEGIT, STARTER_STACKBLITZ } from "../data/starter-react.js";
import { lookThumbProps } from "../utils/look-thumbs.js";
import { useBodyScrollable } from "../hooks/use-body-scrollable.js";
import { PagePager } from "./ui/page-pager.jsx";
import { DottedGlobe, Github } from "./icons.jsx";
import { KbdKey } from "./ui/kbd-key.jsx";
import { TakeoverNav } from "./ui/takeover-nav.jsx";
import { CodeBlock } from "./ui/code-block.jsx";
import { SectionHeading } from "./ui/section-heading.jsx";
import { OnThisPage } from "./ui/on-this-page.jsx";

const EMBED_SNIPPET = `<iframe
  src="https://globestudio.app/embed?look=halftone"
  width="640"
  height="480"
  style="border: 0;"
  loading="lazy"
  title="Globestudio dotted globe"
></iframe>`;

const REACT_SNIPPET = `// Drop-in React component. No install, just paste.
export const Globe = ({ look = "halftone", width = 640, height = 480 }) => (
  <iframe
    src={\`https://globestudio.app/embed?look=\${look}\`}
    width={width}
    height={height}
    style={{ border: 0 }}
    loading="lazy"
    title="Globestudio dotted globe"
  />
);

// Use it:
<Globe look="aurora" width={800} height={600} />`;

const SCRIPT_SNIPPET = `<!-- One-line script-tag loader. Drops a div anywhere on the page
     and reads data-look / data-config attributes from it. -->
<div data-globestudio data-look="risograph" style="height:480px"></div>
<script src="https://globestudio.app/embed.js" async></script>`;

// Each installs skills/globestudio. The plugin adds the MCP server too.
const SKILL_COMMANDS = {
  npx: "npx skills add alevizio/globestudio",
  gh: "gh skill install alevizio/globestudio globestudio",
  plugin: "claude plugin marketplace add alevizio/globestudio && claude plugin install globestudio@globestudio",
};

const SHORTCUTS = [
  { keys: ["S"], label: "Shuffle to a random look" },
  { keys: ["[", "]"], label: "Cycle preset (prev / next)" },
  { keys: ["+", "−", "0"], label: "Zoom in / out / reset" },
  { keys: ["G"], label: "Toggle globe ↔ flat view" },
  { keys: ["H"], label: "Hide or show the control panel" },
  { keys: ["D"], label: "Open the export dialog" },
  { keys: ["R"], label: "Reset to defaults" },
  { keys: ["⌘K"], label: "Open the command palette" },
  { keys: ["?"], label: "Show keyboard shortcuts dialog" },
  { keys: ["Esc"], label: "Close popovers and dialogs" },
];

const TOC = [
  { id: "embed", label: "Embed" },
  { id: "share", label: "Share URLs" },
  { id: "agent-skill", label: "Agent skill" },
  { id: "shortcuts", label: "Keyboard shortcuts" },
  { id: "presets", label: "Preset catalog" },
  { id: "schema", label: "Config schema" },
  { id: "source", label: "Source" },
];

export const DocsPage = () => {
  useBodyScrollable();
  useEffect(() => {
    document.title = "Docs · Globestudio";
    const setMeta = (selector, content) => {
      const el = document.querySelector(selector);
      if (el) el.setAttribute("content", content);
    };
    setMeta(
      'meta[name="description"]',
      "Globestudio documentation: embed snippet, shareable config URLs, keyboard shortcuts, preset catalog, JSON schema.",
    );
  }, []);

  return (
    <>
      <TakeoverNav />
      <main className="docs-page">
        <header className="docs-page-header">
        <a className="docs-page-brand takeover-page-brand" href="/" aria-label="Globestudio home">
          <DottedGlobe size={56} />
        </a>
        <h1 className="docs-page-title">Docs</h1>
        <p className="docs-page-lede">
          What Globestudio is, how to embed it, and the API surface for
          customizing it.
        </p>
      </header>

      <div className="docs-page-content">
        <section className="docs-section">
          <SectionHeading id="embed" className="docs-section-title">
            Embed
          </SectionHeading>
          <p>
            Drop a dotted globe into any web page with an iframe. The{" "}
            <code>/embed</code> route is the canvas-only build: no panel, no
            chrome, no marketing nav. Sized to whatever wrapper you put it in.
          </p>
          <CodeBlock language="html">{EMBED_SNIPPET}</CodeBlock>
          <p>
            Pick any preset by id (<code>halftone</code>, <code>aurora</code>,{" "}
            <code>risograph</code>…) or pass a full config via{" "}
            <code>?c=&lt;URL-encoded JSON&gt;</code> for a customized embed.
          </p>
          <p>
            On a light page, add <code>theme=light</code> to a globe the page
            shows through, like Wireframe. Its white ink turns graphite, and
            the glow and grid switch to a palette for light pages. Halftone,
            Toon and Threshold paint a dark page of their own, so add{" "}
            <code>transparent=1</code> as well. The React and web component
            packages take it as{" "}
            <code>theme="light"</code>, the script-tag loader as{" "}
            <code>data-theme="light"</code>.
          </p>

          <SectionHeading
            id="react-component"
            as="h3"
            className="docs-subsection-title"
          >
            React component
          </SectionHeading>
          <p>
            No install. Paste it into any React/Next.js/Astro/Remix project:
          </p>
          <CodeBlock language="jsx">{REACT_SNIPPET}</CodeBlock>
          <p>
            For a new project, start from the React starter: a Vite app that
            shows a globe with <code>@globestudio/react</code>. Copy it with
            degit, or{" "}
            <a href={STARTER_STACKBLITZ} target="_blank" rel="noreferrer noopener">
              open it in StackBlitz
            </a>
            .
          </p>
          <CodeBlock language="degit" wrap keyboardScroll>{STARTER_DEGIT}</CodeBlock>

          <SectionHeading
            id="script-tag-loader"
            as="h3"
            className="docs-subsection-title"
          >
            Script-tag loader
          </SectionHeading>
          <p>
            For Webflow, Framer, plain HTML, anywhere you can drop
            a <code>&lt;script&gt;</code> tag:
          </p>
          <CodeBlock language="html">{SCRIPT_SNIPPET}</CodeBlock>

          <p>
            Step-by-step setup for Webflow, Framer, Figma, Notion, WordPress
            and more lives on the <a href="/integrations">Integrations</a>{" "}
            page. For Figma, the export dialog (<KbdKey>D</KbdKey>) also has a
            Figma tab: it copies the design as vectors or as an image, ready
            to paste into a file. When the look has an effect the vectors
            can't keep, such as scanlines or a glow, the Figma and SVG tabs
            name it and point to the image. In the Figma plugin, paste a share
            link to open that exact design there.
          </p>
        </section>

        <section className="docs-section">
          <SectionHeading id="share" className="docs-section-title">
            Share URLs
          </SectionHeading>
          <p>
            Every customization can be encoded into a URL. From the export
            dialog (<KbdKey>D</KbdKey>), the Share tab gives you a{" "}
            <code>?c=&lt;encoded&gt;</code> link that restores your exact canvas
            state on someone else's machine.
          </p>
          <p>
            Your data travels in the link too. In the Data section, paste one{" "}
            <code>lat,lng,value</code> line per point, like{" "}
            <code>35.68,139.69,37</code>, or press Try an example.
          </p>
          <p>
            The Figma plugin opens these links too. Paste one into its Paste
            a share link field, or anywhere in the plugin outside a text
            field, and the design loads, ready to insert. Look links
            (<code>/looks/halftone</code>) and embed links work the same way.
          </p>
          <p>
            The Share tab also has an Embed code section. It shows the design on
            screen as an iframe, a <code>@globestudio/react</code> snippet or
            a <code>@globestudio/element</code> web component, each with a
            Copy button. Open in CodePen puts the design in a new pen, ready
            to edit.
          </p>
          <p>
            The encoded payload follows the{" "}
            <a href="/schema/config.json" target="_blank" rel="noreferrer">
              config JSON schema
            </a>
            , so it's autocomplete-friendly in any editor that respects{" "}
            <code>$schema</code>.
          </p>
        </section>

        <section className="docs-section">
          <SectionHeading id="agent-skill" className="docs-section-title">
            Agent skill
          </SectionHeading>
          <p>
            Ask your coding agent for a globe and get one that fits the page:
            the Globestudio skill teaches Claude Code, Codex, Cursor and other
            agents how a design travels in a link, how to embed one and which
            look fits a brief. Add it with any of these:
          </p>
          <CodeBlock language="npx skills" wrap>{SKILL_COMMANDS.npx}</CodeBlock>
          <CodeBlock language="GitHub CLI" wrap>{SKILL_COMMANDS.gh}</CodeBlock>
          <CodeBlock language="Claude Code plugin" wrap>{SKILL_COMMANDS.plugin}</CodeBlock>
          <p>
            The Claude Code plugin also connects the hosted MCP server. In
            Gemini CLI, run{" "}
            <code>gemini extensions install https://github.com/alevizio/globestudio</code>.
            In the Claude app, download{" "}
            <a href="https://github.com/alevizio/globestudio/releases/latest/download/globestudio-skill.zip">globestudio-skill.zip</a>{" "}
            from the latest release and upload it in Settings, Capabilities,
            Skills. <code>npx skills</code> sends anonymous install data to
            skills.sh unless you set <code>DISABLE_TELEMETRY=1</code>.
          </p>
          <p>
            The skill has a page on{" "}
            <a href="https://skills.sh/alevizio/globestudio/globestudio">skills.sh</a>{" "}
            with its installs and security audits, and its source is in{" "}
            <a href="https://github.com/alevizio/globestudio/tree/main/skills/globestudio">skills/globestudio</a>{" "}
            on GitHub.
          </p>
          <p>
            The <a href="/privacy#ai-tools">privacy page</a> says what the
            hosted MCP server receives and keeps, and the{" "}
            <a href="/terms">terms of use</a> cover the server, the skill and
            the plugins.
          </p>
        </section>

        <section className="docs-section">
          <SectionHeading id="shortcuts" className="docs-section-title">
            Keyboard shortcuts
          </SectionHeading>
          <ul className="docs-shortcuts">
            {SHORTCUTS.map((row) => (
              <li key={row.keys.join("-")} className="docs-shortcut-row">
                <span className="docs-shortcut-keys">
                  {row.keys.map((key) => (
                    <KbdKey key={key}>{key}</KbdKey>
                  ))}
                </span>
                <span>{row.label}</span>
              </li>
            ))}
          </ul>
        </section>

        <section className="docs-section">
          <SectionHeading id="presets" className="docs-section-title">
            Preset catalog
          </SectionHeading>
          <p>
            {lookPresets.length} looks ship in the box. Each has its own{" "}
            <code>/looks/:id</code> route with a dedicated OG card and SEO
            copy.
          </p>
          <ul className="docs-preset-grid">
            {lookPresets.map((preset) => (
              <li key={preset.id}>
                <a className="docs-preset-link" href={`/looks/${preset.id}`}>
                  <span
                    className="docs-preset-thumb"
                    aria-hidden="true"
                  >
                    <img
                      {...lookThumbProps(preset.id, "44px")}
                      alt=""
                      width={44}
                      height={44}
                      loading="lazy"
                      decoding="async"
                      draggable="false"
                      onError={(event) => {
                        event.currentTarget.style.display = "none";
                      }}
                    />
                  </span>
                  <span className="docs-preset-text">
                    <strong>{preset.name}</strong>
                    <span>{preset.blurb}</span>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section className="docs-section">
          <SectionHeading id="schema" className="docs-section-title">
            Config schema
          </SectionHeading>
          <p>
            Exported config files (and the{" "}
            <code>?c=…</code> share encoding) follow the JSON Schema published
            at{" "}
            <a
              href="https://globestudio.app/schema/config.json"
              target="_blank"
              rel="noreferrer noopener"
            >
              globestudio.app/schema/config.json
            </a>
            . VS Code, Cursor, and WebStorm read the <code>$schema</code> field
            and provide autocomplete + validation when you open a downloaded
            config.
          </p>
          <p>
            The look-preset shape (for community preset PRs) has a separate
            schema at{" "}
            <a
              href="https://globestudio.app/schema/look-preset.json"
              target="_blank"
              rel="noreferrer noopener"
            >
              globestudio.app/schema/look-preset.json
            </a>
            , enforced by{" "}
            <code>src/data/look-presets.test.js</code> in CI.
          </p>
        </section>

        <section className="docs-section">
          <SectionHeading id="source" className="docs-section-title">
            Source
          </SectionHeading>
          <p>
            Globestudio is MIT-licensed open source. Code, issues, discussions,
            and the full roadmap live on GitHub.
          </p>
          <div className="docs-section-links">
            <a
              className="docs-link"
              href="https://github.com/alevizio/globestudio"
              target="_blank"
              rel="noreferrer noopener"
            >
              <Github size={14} />
              <span>github.com/alevizio/globestudio</span>
            </a>
            <a
              className="docs-link"
              href="https://github.com/alevizio/globestudio/blob/main/CONTRIBUTING.md"
              target="_blank"
              rel="noreferrer noopener"
            >
              <span aria-hidden="true">→</span>
              <span>CONTRIBUTING.md</span>
            </a>
            <a
              className="docs-link"
              href="https://github.com/alevizio/globestudio/blob/main/ROADMAP.md"
              target="_blank"
              rel="noreferrer noopener"
            >
              <span aria-hidden="true">→</span>
              <span>ROADMAP.md</span>
            </a>
          </div>
        </section>
      </div>

        <OnThisPage sections={TOC} />

        <PagePager />
      </main>
    </>
  );
};
