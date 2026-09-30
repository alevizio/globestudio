import { comparisons } from "../data/comparisons.js";
import { TakeoverFooter } from "./takeover-footer.jsx";
import "./compare-page.css";

const slugFromLocation = () =>
  typeof window !== "undefined"
    ? window.location.pathname.replace(/\/+$/, "").split("/").pop()
    : "";

// Lazy takeover route for /compare/:slug — a factual decision-aid comparison,
// with a real HTML table (AI parses tables well). Its FAQPage JSON-LD is in
// the prerendered <head> (scripts/prerender.js), so crawlers that don't run
// JS get it and the page carries one FAQPage, not two.
// The router only renders it for known slugs (src/utils/route-match.js).
export const ComparePage = ({ slug = slugFromLocation() }) => {
  const data = comparisons[slug];

  if (!data) {
    return (
      <main className="compare-page">
        <a className="compare-back" href="/">← Globestudio</a>
        <h1 className="compare-title">Comparison not found</h1>
        <p className="compare-summary">That comparison doesn’t exist yet.</p>
      </main>
    );
  }

  return (
    <main className="compare-page">
      <header className="compare-header">
        <a className="compare-back" href="/">← Globestudio</a>
        <h1 className="compare-title">Globestudio vs {data.competitor}</h1>
        <p className="compare-tagline">{data.tagline}</p>
        <p className="compare-summary">{data.summary}</p>
        <a className="compare-cta" href="/">Open Globestudio →</a>
      </header>

      {/* The wrapper scrolls sideways on phones, so it takes focus (arrow
          keys scroll it) and is named after the table it holds. */}
      <div className="compare-table-wrap" tabIndex={0} role="region" aria-labelledby="compare-table-caption">
        <table className="compare-table">
          <caption id="compare-table-caption" className="visually-hidden">
            Globestudio vs {data.competitor}, feature by feature
          </caption>
          <thead>
            <tr>
              <th scope="col"><span className="visually-hidden">Feature</span></th>
              <th scope="col">Globestudio</th>
              <th scope="col">{data.competitor}</th>
            </tr>
          </thead>
          <tbody>
            {data.rows.map((r) => (
              <tr key={r.dimension}>
                <th scope="row">{r.dimension}</th>
                <td>{r.globestudio}</td>
                <td>{r.them}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <section className="compare-section">
        <h2>When to use {data.competitor} instead</h2>
        <p>{data.whenThem}</p>
      </section>

      <section className="compare-section compare-faq">
        <h2>FAQ</h2>
        <dl>
          {data.faq.map((f) => (
            <div key={f.q} className="compare-faq-item">
              <dt>{f.q}</dt>
              <dd>{f.a}</dd>
            </div>
          ))}
        </dl>
      </section>

      <a className="compare-cta" href="/">Open Globestudio →</a>
      <TakeoverFooter />
    </main>
  );
};
