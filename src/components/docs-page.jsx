import { useEffect } from "react";
import { lookPresets } from "../data/look-presets.js";
import { useBodyScrollable } from "../hooks/use-body-scrollable.js";
import { TakeoverFooter } from "./takeover-footer.jsx";
import { DottedGlobe, Github } from "./icons.jsx";

// Single-page documentation route. Pulls the most-asked questions
// from the README + the docs/ folder into one place so users don't
// have to navigate the GitHub tree.
//
// Sections:
//   1. Embed snippet (the headline use case)
//   2. Share URL pattern (?c=… encoding)
//   3. Keyboard shortcuts
//   4. Preset catalog with direct /looks/:id links
//   5. Config JSON schema reference
//   6. Where to look in the repo (deep links)
//
// All copy is hand-authored — kept short on purpose. For the full
// long-form coverage of each preset, the /looks/:id route itself
// renders PresetDetail with ~200 words of designer-facing content.

const EMBED_SNIPPET = `<iframe
  src="https://globestudio.app/embed?look=halftone"
  width="640"
  height="480"
  style="border: 0;"
  loading="lazy"
  title="Globestudio dotted globe"
></iframe>`;

const REACT_SNIPPET = `// Drop-in React component — no install, just paste.
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

export const DocsPage = () => {
  useBodyScrollable();
  useEffect(() => {
    document.title = "Docs — Globestudio";
    const setMeta = (selector, content) => {
      const el = document.querySelector(selector);
      if (el) el.setAttribute("content", content);
    };
    setMeta(
      'meta[name="description"]',
      "Globestudio documentation — embed snippet, shareable config URLs, keyboard shortcuts, preset catalog, JSON schema.",
    );
  }, []);

  return (
    <main className="docs-page">
      <header className="docs-page-header">
        <a className="docs-page-brand" href="/" aria-label="Globestudio home">
          <DottedGlobe size={40} />
          <span>Globestudio</span>
        </a>
        <h1 className="docs-page-title">Docs</h1>
        <p className="docs-page-lede">
          What Globestudio is, how to embed it, and the API surface for
          customizing it.
        </p>
      </header>

      <section className="docs-section" id="embed">
        <h2 className="docs-section-title">Embed</h2>
        <p>
          Drop a dotted globe into any web page with an iframe. The{" "}
          <code>/embed</code> route is the canvas-only build — no panel, no
          chrome, no marketing nav. Sized to whatever wrapper you put it in.
        </p>
        <pre className="docs-code">{EMBED_SNIPPET}</pre>
        <p>
          Pick any preset by id (<code>halftone</code>, <code>aurora</code>,{" "}
          <code>risograph</code>…) or pass a full config via{" "}
          <code>?c=&lt;base64&gt;</code> for a customized embed.
        </p>

        <h3 className="docs-subsection-title">React component</h3>
        <p>
          No install. Paste it into any React/Next.js/Astro/Remix project:
        </p>
        <pre className="docs-code">{REACT_SNIPPET}</pre>

        <h3 className="docs-subsection-title">Script-tag loader</h3>
        <p>
          For Webflow, Framer, Notion, plain HTML — anywhere you can drop
          a <code>&lt;script&gt;</code> tag:
        </p>
        <pre className="docs-code">{SCRIPT_SNIPPET}</pre>

        <p>
          Detailed recipes for{" "}
          <a
            href="https://github.com/alevizio/globestudio/blob/main/docs/integrations/webflow.md"
            target="_blank"
            rel="noreferrer noopener"
          >
            Webflow
          </a>
          ,{" "}
          <a
            href="https://github.com/alevizio/globestudio/blob/main/docs/integrations/framer.md"
            target="_blank"
            rel="noreferrer noopener"
          >
            Framer
          </a>
          , and{" "}
          <a
            href="https://github.com/alevizio/globestudio/blob/main/docs/integrations/figma.md"
            target="_blank"
            rel="noreferrer noopener"
          >
            Figma
          </a>{" "}
          live in <code>docs/integrations/</code>.
        </p>
      </section>

      <section className="docs-section" id="share">
        <h2 className="docs-section-title">Share URLs</h2>
        <p>
          Every customization can be encoded into a URL. From the export
          dialog (<kbd>D</kbd>), the Share tab gives you a{" "}
          <code>?c=&lt;encoded&gt;</code> link that restores your exact canvas
          state on someone else's machine.
        </p>
        <p>
          The encoded payload follows the{" "}
          <a href="/schema/config.json" target="_blank" rel="noreferrer">
            config JSON schema
          </a>
          {" "}— so it's autocomplete-friendly in any editor that respects{" "}
          <code>$schema</code>.
        </p>
      </section>

      <section className="docs-section" id="shortcuts">
        <h2 className="docs-section-title">Keyboard shortcuts</h2>
        <ul className="docs-shortcuts">
          {SHORTCUTS.map((row) => (
            <li key={row.keys.join("-")} className="docs-shortcut-row">
              <span className="docs-shortcut-keys">
                {row.keys.map((key) => (
                  <kbd key={key}>{key}</kbd>
                ))}
              </span>
              <span>{row.label}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="docs-section" id="presets">
        <h2 className="docs-section-title">Preset catalog</h2>
        <p>
          {lookPresets.length} looks ship in the box. Each has its own{" "}
          <code>/looks/:id</code> route with a dedicated OG card and SEO
          copy.
        </p>
        <ul className="docs-preset-grid">
          {lookPresets.map((preset) => (
            <li key={preset.id}>
              <a className="docs-preset-link" href={`/looks/${preset.id}`}>
                <strong>{preset.name}</strong>
                <span>{preset.blurb}</span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      <section className="docs-section" id="schema">
        <h2 className="docs-section-title">Config schema</h2>
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
          {" "}— enforced by{" "}
          <code>src/data/look-presets.test.js</code> in CI.
        </p>
      </section>

      <section className="docs-section" id="source">
        <h2 className="docs-section-title">Source</h2>
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

      <TakeoverFooter />
    </main>
  );
};
