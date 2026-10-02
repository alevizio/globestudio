import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { EmbedCode } from "./embed-code.jsx";
import { track } from "./analytics.jsx";
import { buildIframeSnippet, buildReactSnippet, buildWebComponentSnippet } from "../utils/embed-snippets.js";

vi.mock("./analytics.jsx", () => ({ track: vi.fn() }));

const CONFIG = '{"v":2,"density":60,"asciiSymbol":"\\"<&>"}';
const SHARE_URL = `https://globestudio.app/?c=${encodeURIComponent(CONFIG)}`;

afterEach(() => {
  delete navigator.clipboard;
  vi.mocked(track).mockClear();
});

const renderBlock = (props = {}) =>
  render(<EmbedCode getShareUrl={() => SHARE_URL} width={1200} height={800} {...props} />);

const shownCode = () => screen.getByRole("tabpanel").querySelector("code").textContent;

describe("EmbedCode", () => {
  it("is a section headed Embed code, with iframe, React and Web component to pick from", () => {
    renderBlock();
    expect(screen.getByRole("heading", { level: 3, name: "Embed code" })).toBeTruthy();
    const tablist = screen.getByRole("tablist", { name: "Embed code" });
    expect(tablist.className).toContain("segmented-toggle");
    expect(screen.getAllByRole("tab").map((tab) => tab.textContent)).toEqual(["iframe", "React", "Web component"]);
    expect(screen.getByRole("tab", { name: "iframe" }).getAttribute("aria-selected")).toBe("true");
  });

  it("shows the snippet for the chosen option, built from the current share config and size", () => {
    renderBlock();
    expect(shownCode()).toBe(buildIframeSnippet({ config: CONFIG, width: 1200, height: 800 }));
    fireEvent.click(screen.getByRole("tab", { name: "React" }));
    expect(shownCode()).toBe(buildReactSnippet({ config: CONFIG, width: 1200, height: 800 }));
    fireEvent.click(screen.getByRole("tab", { name: "Web component" }));
    expect(shownCode()).toBe(buildWebComponentSnippet({ config: CONFIG, height: 800 }));
  });

  it("names the panel after the selected tab", () => {
    renderBlock();
    fireEvent.click(screen.getByRole("tab", { name: "React" }));
    const tab = screen.getByRole("tab", { name: "React" });
    const panel = screen.getByRole("tabpanel", { name: "React" });
    expect(tab.getAttribute("aria-controls")).toBe(panel.id);
    expect(panel.getAttribute("aria-labelledby")).toBe(tab.id);
  });

  it("moves between options with the arrow keys, Home and End, taking focus along", () => {
    renderBlock();
    const iframe = screen.getByRole("tab", { name: "iframe" });
    const react = screen.getByRole("tab", { name: "React" });
    const element = screen.getByRole("tab", { name: "Web component" });
    iframe.focus();
    for (const [key, tab] of [
      ["ArrowRight", react],
      ["End", element],
      ["ArrowRight", iframe],
      ["ArrowLeft", element],
      ["Home", iframe],
    ]) {
      fireEvent.keyDown(document.activeElement, { key });
      expect(tab.getAttribute("aria-selected")).toBe("true");
      expect(document.activeElement).toBe(tab);
      expect(tab.tabIndex).toBe(0);
    }
    // Only the selected tab is a Tab stop.
    expect([react, element].map((tab) => tab.tabIndex)).toEqual([-1, -1]);
  });

  it("copies the snippet on show with the block's Copy button, and counts it as a share", async () => {
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    renderBlock();
    for (const [name, method, snippet] of [
      ["iframe", "iframe", buildIframeSnippet({ config: CONFIG, width: 1200, height: 800 })],
      ["React", "react", buildReactSnippet({ config: CONFIG, width: 1200, height: 800 })],
      ["Web component", "web-component", buildWebComponentSnippet({ config: CONFIG, height: 800 })],
    ]) {
      fireEvent.click(screen.getByRole("tab", { name }));
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Copy code to clipboard" }));
      });
      expect(writeText).toHaveBeenLastCalledWith(snippet);
      expect(track).toHaveBeenLastCalledWith("share_clicked", { method });
    }
    expect(track).toHaveBeenCalledTimes(3);
  });

  it("starts each option with a fresh Copy button", async () => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn(() => Promise.resolve()) },
    });
    renderBlock();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy code to clipboard" }));
    });
    expect(screen.getByRole("button", { name: "Copied" })).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: "React" }));
    // "Copied" was about the iframe snippet, not this one.
    expect(screen.queryByRole("button", { name: "Copied" })).toBeNull();
    expect(screen.getByRole("button", { name: "Copy code to clipboard" })).toBeTruthy();
  });

  it("counts nothing when the copy is refused", async () => {
    const writeText = vi.fn(() => Promise.reject(new Error("denied")));
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    renderBlock();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy code to clipboard" }));
    });
    expect(track).not.toHaveBeenCalled();
  });

  it("follows the design and the size as they change", () => {
    const { rerender } = renderBlock();
    const next = '{"v":2,"density":12}';
    rerender(
      <EmbedCode getShareUrl={() => `https://globestudio.app/?c=${encodeURIComponent(next)}`} width={640} height={480} />,
    );
    expect(shownCode()).toBe(buildIframeSnippet({ config: next, width: 640, height: 480 }));
  });

  it("still shows a snippet when there is no share link to read", () => {
    render(<EmbedCode width={640} height={480} />);
    expect(shownCode()).toBe(buildIframeSnippet({ config: null, width: 640, height: 480 }));
  });
});
