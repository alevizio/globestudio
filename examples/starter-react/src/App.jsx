import { Globe } from "@globestudio/react";

// A config layered over a look holds only what changes. For a design you
// made at globestudio.app, press D and copy the React code from the Share
// tab: its config holds the whole design, so it needs no look.
const EUROPE = { v: 3, selection: "continent:Europe", dotColor: "#7dd3fc" };

export const App = () => (
  <main>
    <section className="hero">
      <div>
        <h1>A globe for your next project</h1>
        <p>
          This is the Globestudio React starter. Edit <code>src/App.jsx</code>{" "}
          and the page reloads as you save.
        </p>
      </div>
      <Globe look="halftone" height={520} loading="eager" title="Spinning dotted globe" />
    </section>

    <section className="design">
      <h2>Your own design</h2>
      <p>
        A look plus a config. This one keeps the CRT look and draws Europe in
        light blue. Make yours at <a href="https://globestudio.app">globestudio.app</a>.
      </p>
      <Globe look="crt" config={JSON.stringify(EUROPE)} height={420} title="Dotted globe of Europe" />
    </section>
  </main>
);
