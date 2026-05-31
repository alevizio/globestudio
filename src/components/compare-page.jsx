import { comparisons } from "../data/comparisons.js";
import "./compare-page.css";

// Lazy takeover route for /compare/:slug — a factual decision-aid comparison.
// Includes FAQPage JSON-LD (deprecated for Google rich snippets but still
// parsed by AI assistants) and a real HTML table (AI parses tables well).
export const ComparePage = () => {
  const slug =
    typeof window !== "undefined"
      ? window.location.pathname.replace(/\/+$/, "").split("/").pop()
      : "";
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

  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: data.faq.map((f) => ({
      "@type": "Question",
      name: f.q,
      acceptedAnswer: { "@type": "Answer", text: f.a },
    })),
  };

  return (
    <main className="compare-page">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }} />
      <header className="compare-header">
        <a className="compare-back" href="/">← Globestudio</a>
        <h1 className="compare-title">Globestudio vs {data.competitor}</h1>
        <p className="compare-tagline">{data.tagline}</p>
        <p className="compare-summary">{data.summary}</p>
        <a className="compare-cta" href="/">Open Globestudio — free →</a>
      </header>

      <div className="compare-table-wrap">
        <table className="compare-table">
          <thead>
            <tr>
              <th scope="col"></th>
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

      <a className="compare-cta" href="/">Try Globestudio — free, no signup →</a>
    </main>
  );
};
