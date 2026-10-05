import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Globe } from "../packages/react/src/index.tsx";
import "../packages/web-component/index.js";

// The light palette as a page asks for it: <Globe theme>, <globe-studio
// theme> and embed.js data-theme. Each sends theme=light to /embed for
// "light" only, so every embed made before the option keeps its address.

const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const iframeSrc = (host) => host.querySelector("iframe").getAttribute("src");

describe("<Globe theme>", () => {
  it("embeds the light palette for theme=\"light\"", () => {
    render(<Globe look="wireframe" theme="light" title="Dotted globe" />);
    expect(screen.getByTitle("Dotted globe").getAttribute("src")).toBe(
      "https://globestudio.app/embed?look=wireframe&theme=light",
    );
  });

  it("keeps the address it had for dark or no theme", () => {
    render(<Globe look="wireframe" title="No theme" />);
    render(<Globe look="wireframe" theme="dark" title="Dark" />);
    for (const title of ["No theme", "Dark"]) {
      expect(screen.getByTitle(title).getAttribute("src")).toBe("https://globestudio.app/embed?look=wireframe");
    }
  });
});

describe("<globe-studio theme>", () => {
  afterEach(() => document.body.replaceChildren());

  it("embeds the light palette for theme=\"light\", and follows the attribute as it changes", () => {
    const element = document.createElement("globe-studio");
    element.setAttribute("look", "wireframe");
    element.setAttribute("theme", "light");
    document.body.append(element);
    expect(iframeSrc(element)).toBe("https://globestudio.app/embed?look=wireframe&theme=light");

    element.setAttribute("theme", "dark");
    expect(iframeSrc(element)).toBe("https://globestudio.app/embed?look=wireframe");
    element.setAttribute("theme", "light");
    element.removeAttribute("theme");
    expect(iframeSrc(element)).toBe("https://globestudio.app/embed?look=wireframe");
  });

  it("ignores a theme it doesn't know", () => {
    const element = document.createElement("globe-studio");
    element.setAttribute("look", "wireframe");
    element.setAttribute("theme", "sepia");
    document.body.append(element);
    expect(iframeSrc(element)).toBe("https://globestudio.app/embed?look=wireframe");
  });
});

describe("embed.js data-theme", () => {
  beforeAll(() => {
    // The loader as a page runs it: a classic script, mounting what is on
    // the page and, through its observer, what is added later.
    const script = document.createElement("script");
    script.textContent = readFileSync(resolve(repoRoot, "public/embed.js"), "utf8");
    document.head.append(script);
  });

  afterEach(() => document.body.replaceChildren());

  const mount = async (theme) => {
    const element = document.createElement("div");
    element.setAttribute("data-globestudio", "");
    element.setAttribute("data-look", "wireframe");
    if (theme !== undefined) element.setAttribute("data-theme", theme);
    document.body.append(element);
    await new Promise((done) => setTimeout(done));
    return iframeSrc(element);
  };

  it("embeds the light palette for data-theme=\"light\"", async () => {
    expect(await mount("light")).toBe("https://globestudio.app/embed?look=wireframe&theme=light&source=script-embed");
  });

  it("keeps the address it had for dark, empty, unknown or no data-theme", async () => {
    for (const theme of [undefined, "dark", "", "sepia"]) {
      expect(await mount(theme)).toBe("https://globestudio.app/embed?look=wireframe&source=script-embed");
    }
  });
});
