import { useEffect } from "react";
import { useBodyScrollable } from "../hooks/use-body-scrollable.js";
import { DottedGlobe } from "./icons.jsx";
import { TakeoverFooter } from "./takeover-footer.jsx";
import { TakeoverNav } from "./ui/takeover-nav.jsx";
import { SectionHeading } from "./ui/section-heading.jsx";

// Terms of use. Anthropic's and OpenAI's plugin directories ask for a terms
// URL next to the privacy policy, so this page sits beside /privacy and
// borrows its styles. It isn't in the top nav or the prev/next pager: the
// footer, the About dialog and /privacy link it. Contact is GitHub issues
// only, with no email address.

export const TermsPage = () => {
  useBodyScrollable();
  useEffect(() => {
    document.title = "Terms of use · Globestudio";
    const description = document.querySelector('meta[name="description"]');
    if (description) {
      description.setAttribute(
        "content",
        "The terms for using Globestudio: the site, its embeds, the MCP server, the npm packages, the agent skill and the plugins.",
      );
    }
  }, []);

  return (
    <>
      <TakeoverNav />
      <main className="privacy-page">
        <header className="privacy-page-header">
          <a className="privacy-page-brand takeover-page-brand" href="/" aria-label="Globestudio home">
            <DottedGlobe size={56} />
          </a>
          <h1 className="privacy-page-title">Terms of use</h1>
          <p className="privacy-page-lede">
            These terms cover Globestudio: the site at globestudio.app, its
            embeds, the MCP server at globestudio.app/mcp, the npm packages,
            the agent skill and the plugins and extensions that bundle them.
            Globestudio is made by Alejandro Vizio. Last updated 5 October
            2026.
          </p>
        </header>

        <section className="privacy-section">
          <SectionHeading id="using" className="privacy-section-title">
            Using Globestudio
          </SectionHeading>
          <p>
            You can use Globestudio without an account, for personal or
            commercial work. Don't use it to break the law, to attack or
            overload the service, or to get around its limits.
          </p>
        </section>

        <section className="privacy-section">
          <SectionHeading id="what-you-make" className="privacy-section-title">
            What you make
          </SectionHeading>
          <p>
            The maps, globes, links, embeds and exports you make are yours.
            Globestudio claims no rights in them. You are responsible for what
            you put in them, such as data points, labels, logos and brand
            colors.
          </p>
        </section>

        <section className="privacy-section">
          <SectionHeading id="map-data" className="privacy-section-title">
            Map data
          </SectionHeading>
          <p>
            The maps are drawn from public atlases: world-atlas and us-atlas
            (ISC), world-countries (ODbL), dotted-map (MIT) and Natural Earth
            (public domain). See{" "}
            <a
              href="https://github.com/alevizio/globestudio/blob/main/NOTICE.md"
              target="_blank"
              rel="noreferrer noopener"
            >
              NOTICE.md
            </a>{" "}
            for the full list.
          </p>
        </section>

        <section className="privacy-section">
          <SectionHeading id="source-code" className="privacy-section-title">
            Source code
          </SectionHeading>
          <p>
            The code is open source under the{" "}
            <a
              href="https://github.com/alevizio/globestudio/blob/main/LICENSE"
              target="_blank"
              rel="noreferrer noopener"
            >
              MIT License
            </a>
            . The license, not these terms, covers copying, changing and
            sharing the code.
          </p>
        </section>

        <section className="privacy-section">
          <SectionHeading id="service" className="privacy-section-title">
            The service
          </SectionHeading>
          <p>
            Globestudio is provided as is, with no warranty of any kind. It
            can change, pause or stop at any time. Share links and embeds load
            from globestudio.app, so they work only while the site is up.
          </p>
        </section>

        <section className="privacy-section">
          <SectionHeading id="liability" className="privacy-section-title">
            Liability
          </SectionHeading>
          <p>
            To the extent the law allows, Alejandro Vizio is not liable for
            any loss or damage that comes from using Globestudio.
          </p>
        </section>

        <section className="privacy-section">
          <SectionHeading id="privacy" className="privacy-section-title">
            Privacy
          </SectionHeading>
          <p>
            The <a href="/privacy">privacy page</a> says what Globestudio
            collects and keeps.
          </p>
        </section>

        <section className="privacy-section">
          <SectionHeading id="changes" className="privacy-section-title">
            Changes
          </SectionHeading>
          <p>
            These terms can change. The date at the top shows the last
            change. Using Globestudio after a change means you accept the new
            terms.
          </p>
        </section>

        <section className="privacy-section">
          <SectionHeading id="contact" className="privacy-section-title">
            Contact
          </SectionHeading>
          <p>
            Open an issue at{" "}
            <a
              href="https://github.com/alevizio/globestudio/issues"
              target="_blank"
              rel="noreferrer noopener"
            >
              github.com/alevizio/globestudio/issues
            </a>
            .
          </p>
        </section>

        <TakeoverFooter />
      </main>
    </>
  );
};
