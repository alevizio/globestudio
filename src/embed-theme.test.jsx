import { afterEach, describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Globe } from "../packages/react/src/index.tsx";
import "../packages/web-component/index.js";

// The light palette as a page asks for it: <Globe theme> and <globe-studio
// theme>. Each sends theme=light to /embed for "light" only, so every embed
// made before the option keeps its address.

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
