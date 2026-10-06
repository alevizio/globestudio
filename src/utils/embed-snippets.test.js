import { describe, expect, it } from "vitest";
import {
  buildCodePenData,
  buildIframeSnippet,
  buildReactSnippet,
  buildWebComponentSnippet,
  ELEMENT_SCRIPT,
  fitsEmbedUrl,
} from "./embed-snippets.js";
import { buildShareUrl, parseShareConfig } from "./share-config.js";
import { buildEmbedUrl } from "../../packages/web-component/index.js";
import { globestudio } from "../../packages/react/src/index.tsx";

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

  it("writes a string size as a JSX string", () => {
    expect(buildReactSnippet({ config: null, width: "100%", height: 480 })).toBe(
      `import { Globe } from "@globestudio/react";\n\n<Globe\n  width="100%"\n  height={480}\n/>`,
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

  // The embed route reads the view and the page color from the config, as
  // it does for the two packages, which send nothing else.
  it("puts the config in the address and nothing else, whatever the design", () => {
    for (const design of [
      { viewMode: "flat", background: "#7a1f1f", backgroundStyle: "solid", transparent: false },
      { viewMode: "globe", background: "#7a1f1f", transparent: true },
      { background: "#7a1f1f", backgroundStyle: "space" },
      {},
    ]) {
      const config = JSON.stringify({ v: 2, ...design });
      const src = parse(buildIframeSnippet({ config, width: 640, height: 480 })).querySelector("iframe").getAttribute("src");
      expect(Object.fromEntries(new URL(src).searchParams)).toEqual({ c: config });
    }
  });

  it("passes on a config it can't read as it is", () => {
    const src = parse(buildIframeSnippet({ config: "not json", width: 640, height: 480 }))
      .querySelector("iframe")
      .getAttribute("src");
    expect(src).toBe("https://globestudio.app/embed?c=not%20json");
  });
});

describe("buildWebComponentSnippet", () => {
  const snippet = buildWebComponentSnippet({ config: CONFIG, height: 800 });
  const doc = parse(snippet);

  it("loads the element with no build step, pinned and checked by its integrity hash", () => {
    const [first] = snippet.split("\n");
    expect(first).toBe(ELEMENT_SCRIPT);
    const script = parse(first).querySelector("script");
    expect(script.getAttribute("type")).toBe("module");
    expect(script.getAttribute("src")).toMatch(/^https:\/\/cdn\.jsdelivr\.net\/npm\/@globestudio\/element@\d+\.\d+\.\d+\/index\.js$/);
    expect(script.getAttribute("integrity")).toMatch(/^sha384-[A-Za-z0-9+/]{64}$/);
    expect(script.getAttribute("crossorigin")).toBe("anonymous");
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

describe("the embed URL the packages build", () => {
  const builders = {
    "@globestudio/element": buildEmbedUrl,
    "@globestudio/react": (options) => globestudio.embedUrl(options),
  };
  for (const [name, build] of Object.entries(builders)) {
    it(`${name} sends the look with a config, so the embed layers the config over that look`, () => {
      const url = new URL(build({ look: "topographic", config: CONFIG, source: "site" }));
      expect(url.searchParams.get("look")).toBe("topographic");
      expect(url.searchParams.get("c")).toBe(CONFIG);
      expect(url.searchParams.get("source")).toBe("site");
      expect(parseShareConfig(url.search)).toEqual(DECODED);
    });

    it(`${name} sends no look with a config alone, which the embed layers over Default as before`, () => {
      expect(new URL(build({ config: CONFIG })).searchParams.has("look")).toBe(false);
    });

    it(`${name} reads the config out of a share link pasted in its place`, () => {
      // The token as it reads in the link, still URL encoded. Links the MCP
      // server built ended in &app=1, the old teaser bypass.
      const token = SHARE_URL.split("?c=")[1].split("&")[0];
      for (const pasted of [
        `https://globestudio.app/looks/halftone?c=${token}&app=1`,
        `?c=${token}&app=1`,
        `c=${token}`,
        `https://globestudio.app/embed?look=vapor&c=${token}&theme=light#top`,
      ]) {
        const url = new URL(build({ config: pasted }));
        expect(parseShareConfig(url.search), pasted).toEqual(DECODED);
        expect(url.searchParams.has("app")).toBe(false);
      }
    });

    it(`${name} passes a JSON config through as written, even one holding a ? and c=`, () => {
      const json = JSON.stringify({ v: 2, asciiSymbol: "?", selection: "country:JPN", customShape: { name: "?a=1&c=2" } });
      expect(new URL(build({ config: json })).searchParams.get("c")).toBe(json);
    });

    it(`${name} keeps a JSON config written out after ?c= or c= whole`, () => {
      // Not URL encoded, so the "#" of a color, an "&" and a "?" are part of it.
      const json = JSON.stringify({ v: 2, dotColor: "#ff3366", shape: "ASCII", asciiSymbol: "&?" });
      for (const pasted of [`?c=${json}`, `c=${json}`, `https://globestudio.app/?c=${json}`]) {
        expect(new URL(build({ config: pasted })).searchParams.get("c"), pasted).toBe(json);
      }
    });

    it(`${name} builds a URL from a config that is not a string, as before`, () => {
      // A JavaScript caller can pass the design object itself. That never
      // opened the design, but it must not throw and take the page down.
      expect(() => build({ config: { density: 40 } })).not.toThrow();
    });

    it(`${name} embeds Halftone, or the look given, without a config`, () => {
      expect(build({})).toBe("https://globestudio.app/embed?look=halftone");
      expect(build({ look: "aurora", source: "site" })).toBe("https://globestudio.app/embed?look=aurora&source=site");
    });

    it(`${name} asks the embed for its light palette when the theme is light`, () => {
      expect(build({ look: "wireframe", theme: "light" })).toBe("https://globestudio.app/embed?look=wireframe&theme=light");
      expect(build({ look: "wireframe", theme: "light", source: "site" })).toBe(
        "https://globestudio.app/embed?look=wireframe&theme=light&source=site",
      );
      const url = new URL(build({ look: "topographic", config: CONFIG, theme: "light" }));
      expect(url.searchParams.get("theme")).toBe("light");
      expect(parseShareConfig(url.search)).toEqual(DECODED);
    });

    it(`${name} leaves the address as it was for a dark, missing or unknown theme`, () => {
      for (const options of [{}, { look: "aurora", source: "site" }, { look: "topographic", config: CONFIG }]) {
        for (const theme of [undefined, "", "dark", "Light", "sepia", 1]) {
          expect(build({ ...options, theme })).toBe(build(options));
        }
      }
    });
  }
});

describe("buildCodePenData", () => {
  const data = buildCodePenData({ config: CONFIG });

  it("has the four fields CodePen's prefill API reads: title, html, css and js", () => {
    expect(Object.keys(data)).toEqual(["title", "html", "css", "js"]);
    expect(data.title).toBe("Globestudio embed");
    expect(data.js).toBe("");
  });

  it("shows the design with the web component, as tall as the pen's page", () => {
    expect(data.html).toBe(buildWebComponentSnippet({ config: CONFIG, height: "100%" }));
    expect(parse(data.html).querySelector("globe-studio").getAttribute("height")).toBe("100%");
  });

  it("puts it on a full height page with no margin and the design's background", () => {
    expect(data.css).toBe("html,\nbody {\n  height: 100%;\n  margin: 0;\n  background: #204060;\n}");
  });

  it("uses the color the studio shows behind a Space, Flow or Transparent design", () => {
    const cssFor = (design) => buildCodePenData({ config: JSON.stringify({ v: 2, ...design }) }).css;
    expect(cssFor({ background: "#204060", backgroundStyle: "space" })).toContain("background: #03030a;");
    expect(cssFor({ background: "#204060", backgroundStyle: "flow" })).toContain("background: #080714;");
    // The dark canvas the studio's checkerboard sits on.
    expect(cssFor({ background: "#204060", transparent: true })).toContain("background: #0b0b0c;");
  });

  it("sets no background it can't read as a hex color", () => {
    const bare = "html,\nbody {\n  height: 100%;\n  margin: 0;\n}";
    expect(buildCodePenData({ config: null }).css).toBe(bare);
    expect(buildCodePenData({ config: "not json" }).css).toBe(bare);
    const unsafe = JSON.stringify({ v: 2, background: "red; } body::after { content: 'x'" });
    expect(buildCodePenData({ config: unsafe }).css).toBe(bare);
  });

  it("survives the trip through the form's JSON field with the config intact", () => {
    // What CodePen does with the field: parse the JSON, then render the html.
    const received = JSON.parse(JSON.stringify(data));
    const element = parse(received.html).querySelector("globe-studio");
    expect(element.getAttribute("config")).toBe(CONFIG);
    expect(parseShareConfig(new URL(buildEmbedUrl({ config: element.getAttribute("config") })).search)).toEqual(DECODED);
  });
});

describe("fitsEmbedUrl", () => {
  const iframeUrl = (config) =>
    parse(buildIframeSnippet({ config, width: 640, height: 480 })).querySelector("iframe").getAttribute("src");
  // A config whose iframe address is exactly `length` characters long.
  const configFor = (length) => {
    const config = (pad) => JSON.stringify({ v: 2, asciiSymbol: "a".repeat(pad) });
    return config(length - iframeUrl(config(0)).length);
  };

  it("takes an everyday design, and no design at all", () => {
    expect(fitsEmbedUrl(CONFIG)).toBe(true);
    expect(fitsEmbedUrl(null)).toBe(true);
  });

  // The site answers 414 a little under 32,800 characters.
  it("stops at 32,000 characters of address", () => {
    expect(iframeUrl(configFor(32_000))).toHaveLength(32_000);
    expect(fitsEmbedUrl(configFor(32_000))).toBe(true);
    expect(fitsEmbedUrl(configFor(32_001))).toBe(false);
  });

  it("turns down a design with a custom shape file of a few dozen kB", () => {
    const dataUrl = `data:image/png;base64,${"A".repeat(40_000)}`;
    expect(fitsEmbedUrl(JSON.stringify({ v: 2, customShape: { name: "logo.png", type: "image/png", dataUrl } }))).toBe(false);
  });

  it("measures the address the packages build, which can be the longer one", () => {
    // URLSearchParams escapes "(" and encodeURIComponent leaves it.
    const config = JSON.stringify({ v: 2, asciiSymbol: "(".repeat(15_000) });
    expect(iframeUrl(config).length).toBeLessThan(32_000);
    expect(buildEmbedUrl({ config }).length).toBeGreaterThan(32_000);
    expect(fitsEmbedUrl(config)).toBe(false);
  });
});
