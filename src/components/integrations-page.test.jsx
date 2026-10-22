import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { IntegrationsPage } from "./integrations-page.jsx";

const DEGIT = "npx degit@3.10.0 alevizio/globestudio/examples/starter-react my-globe";
const STACKBLITZ = "https://stackblitz.com/github/alevizio/globestudio/tree/main/examples/starter-react";

beforeAll(() => {
  // The page nav hides its brand once the hero scrolls away; jsdom lacks
  // the observer it uses.
  if (!window.IntersectionObserver) {
    window.IntersectionObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
});

afterEach(() => {
  delete navigator.clipboard;
});

const card = (name) => screen.getByRole("heading", { name: new RegExp(`^${name}`) }).closest("section");
const reactCard = () => card("React / Next\\.js");
// The links under a card, leaving out its heading's own #anchor.
const cardLinks = (section) =>
  within(section)
    .getAllByRole("link")
    .filter((link) => !link.getAttribute("href").startsWith("#"));

describe("IntegrationsPage", () => {
  it("offers the React starter on the React card: the degit command, then npm and StackBlitz links", () => {
    render(<IntegrationsPage />);
    const react = reactCard();
    const blocks = [...react.querySelectorAll(".code-block")].map((block) => [
      block.querySelector(".code-block-language")?.textContent,
      block.querySelector("pre").textContent,
    ]);
    expect(blocks.at(-1)).toEqual(["Starter project", DEGIT]);
    const links = cardLinks(react).map((link) => [link.textContent, link.getAttribute("href"), link.getAttribute("target")]);
    expect(links).toEqual([
      ["View on npm →", "https://www.npmjs.com/package/@globestudio/react", "_blank"],
      ["Open the starter in StackBlitz →", STACKBLITZ, "_blank"],
    ]);
  });

  it("copies the exact degit command", async () => {
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    render(<IntegrationsPage />);
    const block = within(reactCard()).getByText("Starter project").closest(".code-block");
    await act(async () => {
      fireEvent.click(within(block).getByRole("button", { name: "Copy code to clipboard" }));
    });
    expect(writeText).toHaveBeenLastCalledWith(DEGIT);
    expect(within(block).getByRole("status").textContent).toBe("Copied");
  });

  it("links Claude's connector directory first on the MCP card, then ChatGPT, then npm", () => {
    render(<IntegrationsPage />);
    const mcp = card("AI agents / MCP");
    const links = cardLinks(mcp).map((link) => [link.textContent, link.getAttribute("href"), link.getAttribute("target")]);
    expect(links).toEqual([
      ["Open in Claude's connector directory →", "https://claude.ai/directory/connectors/globestudio", "_blank"],
      ["Open in ChatGPT →", "https://chatgpt.com/plugins/plugin_asdk_app_6ac545c64d148191b3a72b4a5c5dd293", "_blank"],
      ["View on npm →", "https://www.npmjs.com/package/@globestudio/mcp", "_blank"],
    ]);
    // The blurb gives the directory first and the custom connector as the fallback.
    expect(
      within(mcp).getByText(
        /In the Claude app, open Globestudio in Claude's connector directory, or paste this URL under Customize, Connectors, Add custom connector\. In ChatGPT, install the Globestudio plugin\./,
      ),
    ).toBeTruthy();
  });
});
