import { describe, expect, it } from "vitest";
import { buildIframeSnippet, buildReactSnippet, buildWebComponentSnippet } from "./embed-snippets.js";
import { buildShareUrl, parseShareConfig } from "./share-config.js";
import { buildEmbedUrl } from "../../packages/web-component/index.js";

// A design whose values hold every character that needs escaping somewhere:
// quotes and angle brackets for HTML, a backslash for JS, "%" and "&" for
// the URL.
const DESIGN = {
  selection: "country:JPN",
  background: "#204060",
  density: 62,
  asciiSymbol: `"<&'>%\\`,
};
const SHARE_URL = buildShareUrl(DESIGN, "https://globestudio.app");
// What the Share tab reads from its link: the ?c= value, decoded once.
const CONFIG = new URL(SHARE_URL).searchParams.get("c");
const DECODED = parseShareConfig(new URL(SHARE_URL).search);

const parse = (html) => new DOMParser().parseFromString(html, "text/html");

describe("the design used by these tests", () => {
  it("survives its own share link, awkward characters included", () => {
    expect(DECODED).toMatchObject(DESIGN);
  });
});

describe("buildReactSnippet", () => {
  it("is the snippet Copy as React copied", () => {
    expect(buildReactSnippet({ config: CONFIG, width: 1200, height: 800 })).toBe(
      `import { Globe } from "@globestudio/react";\n\n<Globe\n  config={${JSON.stringify(CONFIG)}}\n  width={1200}\n  height={800}\n/>`,
    );
  });

  it("leaves the config prop out when there is no share config", () => {
    expect(buildReactSnippet({ config: null, width: 640, height: 480 })).toBe(
      `import { Globe } from "@globestudio/react";\n\n<Globe\n  width={640}\n  height={480}\n/>`,
    );
  });

  it("holds the config as a JS string that reads back unchanged", () => {
    const snippet = buildReactSnippet({ config: CONFIG, width: 1200, height: 800 });
    const literal = snippet.match(/config=\{(.*)\}\n {2}width/s)[1];
    expect(JSON.parse(literal)).toBe(CONFIG);
  });
});

describe("buildIframeSnippet", () => {
  const snippet = buildIframeSnippet({ config: CONFIG, width: 1200, height: 800 });
  const iframe = parse(snippet).querySelector("iframe");

  it("points an iframe at the embed route with the dialog's size", () => {
    const src = new URL(iframe.getAttribute("src"));
    expect(`${src.origin}${src.pathname}`).toBe("https://globestudio.app/embed");
    expect(iframe.getAttribute("src").startsWith("https://globestudio.app/embed?c=")).toBe(true);
    expect(iframe.getAttribute("width")).toBe("1200");
    expect(iframe.getAttribute("height")).toBe("800");
  });

  it("follows the docs page's iframe form", () => {
    expect(snippet.split("\n").map((line) => line.replace(/"[^"]*"/, '""'))).toEqual([
      "<iframe",
      '  src=""',
      '  width=""',
      '  height=""',
      '  style=""',
      '  loading=""',
      '  title=""',
      "></iframe>",
    ]);
    expect(iframe.getAttribute("style")).toBe("border: 0;");
    expect(iframe.getAttribute("loading")).toBe("lazy");
    expect(iframe.getAttribute("title")).toBe("Globestudio dotted globe");
  });

  it("carries the current design, encoded the way the share link is", () => {
    const src = iframe.getAttribute("src");
    expect(src.startsWith(SHARE_URL.replace("https://globestudio.app/?c=", "https://globestudio.app/embed?c="))).toBe(true);
    expect(new URL(src).searchParams.get("c")).toBe(CONFIG);
    expect(parseShareConfig(new URL(src).search)).toEqual(DECODED);
  });

  it("is the only element the snippet makes, whatever the design holds", () => {
    expect(parse(snippet).body.children).toHaveLength(1);
  });

  it("embeds the default look when there is no share config", () => {
    const bare = parse(buildIframeSnippet({ config: null, width: 640, height: 480 })).querySelector("iframe");
    expect(bare.getAttribute("src")).toBe("https://globestudio.app/embed");
  });

  // The embed route takes these two from the URL, not from the config.
  describe("what the embed route reads from the URL", () => {
    const paramsFor = (design) => {
      const config = JSON.stringify({ v: 2, ...design });
      const src = parse(buildIframeSnippet({ config, width: 640, height: 480 })).querySelector("iframe").getAttribute("src");
      const params = new URL(src).searchParams;
      expect(params.get("c")).toBe(config);
      params.delete("c");
      return Object.fromEntries(params);
    };

    it("asks for the Flat view when the design is flat", () => {
      expect(paramsFor({ viewMode: "flat", transparent: true })).toEqual({ view: "flat" });
      expect(paramsFor({ viewMode: "globe", transparent: true })).toEqual({});
    });

    it("asks for the page color of a Solid background", () => {
      expect(paramsFor({ background: "#7a1f1f", backgroundStyle: "solid", transparent: false })).toEqual({
        background: "7a1f1f",
      });
      expect(paramsFor({ viewMode: "flat", background: "#7A1F1F" })).toEqual({ view: "flat", background: "7A1F1F" });
    });

    it("asks for no page color when the design is Transparent, Space or Flow", () => {
      expect(paramsFor({ background: "#7a1f1f", transparent: true })).toEqual({});
      expect(paramsFor({ background: "#7a1f1f", backgroundStyle: "transparent" })).toEqual({});
      expect(paramsFor({ background: "#7a1f1f", backgroundStyle: "space" })).toEqual({});
      expect(paramsFor({ background: "#7a1f1f", backgroundStyle: "flow" })).toEqual({});
    });

    it("leaves out a color that isn't a hex, and anything else it can't read", () => {
      expect(paramsFor({ background: 'red" onload="x' })).toEqual({});
      expect(paramsFor({})).toEqual({});
      const src = parse(buildIframeSnippet({ config: "not json", width: 640, height: 480 }))
        .querySelector("iframe")
        .getAttribute("src");
      expect(src).toBe("https://globestudio.app/embed?c=not%20json");
    });
  });
});

describe("buildWebComponentSnippet", () => {
  const snippet = buildWebComponentSnippet({ config: CONFIG, height: 800 });
  const doc = parse(snippet);

  it("loads the element from esm.sh, with no build step", () => {
    const [first] = snippet.split("\n");
    expect(first).toBe('<script type="module" src="https://esm.sh/@globestudio/element"></script>');
  });

  it("adds a globe-studio element with the config and the height", () => {
    const [, second] = snippet.split("\n");
    expect(second).toMatch(/^<globe-studio config="[^"]*" height="800"><\/globe-studio>$/);
    expect(snippet.split("\n")).toHaveLength(2);
  });

  it("escapes the config for HTML, so the attribute reads back unchanged", () => {
    const element = doc.querySelector("globe-studio");
    expect(element.getAttribute("config")).toBe(CONFIG);
    expect(element.getAttribute("height")).toBe("800");
    // Nothing in the design closed the attribute or opened another element.
    expect(element.getAttributeNames()).toEqual(["config", "height"]);
    expect(doc.querySelectorAll("body *")).toHaveLength(1);
  });

  it("gives the element an embed URL that opens as the current design", () => {
    // The package's own URL builder, as <globe-studio> runs it.
    const url = buildEmbedUrl({ config: doc.querySelector("globe-studio").getAttribute("config") });
    expect(parseShareConfig(new URL(url).search)).toEqual(DECODED);
  });

  it("leaves the config attribute out when there is no share config", () => {
    const [, second] = buildWebComponentSnippet({ config: null, height: 480 }).split("\n");
    expect(second).toBe('<globe-studio height="480"></globe-studio>');
  });
});
