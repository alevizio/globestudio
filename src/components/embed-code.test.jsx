import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { EmbedCode } from "./embed-code.jsx";
import { track } from "./analytics.jsx";
import {
  buildCodePenData,
  buildIframeSnippet,
  buildReactSnippet,
  buildWebComponentSnippet,
} from "../utils/embed-snippets.js";

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

  describe("Open in CodePen", () => {
    // jsdom can't submit a form. This keeps what the form looked like when
    // it was sent.
    const catchSubmit = () => {
      const sent = [];
      vi.spyOn(HTMLFormElement.prototype, "submit").mockImplementation(function submit() {
        sent.push({
          action: this.action,
          method: this.method,
          target: this.target,
          rel: this.getAttribute("rel"),
          inDocument: this.isConnected,
          fields: [...this.elements].map((field) => ({ type: field.type, name: field.name, value: field.value })),
        });
      });
      return sent;
    };

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it("is a secondary button under the snippet, in the same section", () => {
      const { container } = renderBlock();
      const button = screen.getByRole("button", { name: "Open in CodePen" });
      expect(button.className).toContain("export-modal-cta");
      expect(button.className).toContain("is-secondary");
      expect(button.closest("section")).toBe(container.querySelector("section"));
      const follows = (a, b) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
      expect(follows(screen.getByRole("tabpanel"), button)).toBe(true);
    });

    it("posts a prefilled pen to CodePen in a new tab", () => {
      const sent = catchSubmit();
      renderBlock();
      fireEvent.click(screen.getByRole("button", { name: "Open in CodePen" }));
      expect(sent).toHaveLength(1);
      const [form] = sent;
      expect(form.action).toBe("https://codepen.io/pen/define");
      expect(form.method).toBe("post");
      expect(form.target).toBe("_blank");
      expect(form.rel).toBe("noopener");
      expect(form.inDocument).toBe(true);
      expect(form.fields.map(({ type, name }) => ({ type, name }))).toEqual([{ type: "hidden", name: "data" }]);
      expect(JSON.parse(form.fields[0].value)).toEqual(buildCodePenData({ config: CONFIG }));
      // The form is only there for the post.
      expect(document.querySelector("form")).toBeNull();
    });

    it("sends the web component pen whichever option is on show", () => {
      const sent = catchSubmit();
      renderBlock();
      fireEvent.click(screen.getByRole("tab", { name: "React" }));
      fireEvent.click(screen.getByRole("button", { name: "Open in CodePen" }));
      expect(JSON.parse(sent[0].fields[0].value).html).toBe(buildWebComponentSnippet({ config: CONFIG, height: "100%" }));
    });

    it("counts it as a share", () => {
      catchSubmit();
      renderBlock();
      fireEvent.click(screen.getByRole("button", { name: "Open in CodePen" }));
      expect(track).toHaveBeenCalledTimes(1);
      expect(track).toHaveBeenCalledWith("share_clicked", { method: "codepen" });
    });
  });

  it("follows the design and the size as they change", () => {
    const { rerender } = renderBlock();
    const next = '{"v":2,"density":12}';
    rerender(
      <EmbedCode getShareUrl={() => `https://globestudio.app/?c=${encodeURIComponent(next)}`} width={640} height={480} />,
    );
    expect(shownCode()).toBe(buildIframeSnippet({ config: next, width: 640, height: 480 }));
  });

  // A custom shape's file travels in the config, and a few dozen kB of it
  // make an address the site turns down. So do pasted data points, which
  // the app does not cap.
  const TOO_LARGE =
    "This design is too large to embed, because its URL would be too long. Try a smaller custom shape file or fewer data points.";

  it("says so when the design is too large to embed, in place of the code and Open in CodePen", () => {
    const dataUrl = `data:image/png;base64,${"A".repeat(40_000)}`;
    const large = JSON.stringify({ v: 2, customShape: { name: "logo.png", type: "image/png", dataUrl } });
    renderBlock({ getShareUrl: () => `https://globestudio.app/?c=${encodeURIComponent(large)}` });
    expect(screen.getByRole("heading", { level: 3, name: "Embed code" })).toBeTruthy();
    expect(screen.getByText(TOO_LARGE)).toBeTruthy();
    expect(screen.queryByRole("tablist")).toBeNull();
    expect(screen.queryByRole("tabpanel")).toBeNull();
    expect(screen.queryByRole("button", { name: "Copy code to clipboard" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Open in CodePen" })).toBeNull();
  });

  it("says the same for a design made large by data points alone", () => {
    const dataPoints = Array.from({ length: 1000 }, (_, i) => ({ lat: (i % 180) - 89.5, lng: (i % 360) - 179.5, value: i }));
    const large = JSON.stringify({ v: 2, globeSettings: { dataPoints } });
    renderBlock({ getShareUrl: () => `https://globestudio.app/?c=${encodeURIComponent(large)}` });
    expect(screen.getByText(TOO_LARGE)).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Open in CodePen" })).toBeNull();
  });

  it("still shows a snippet when there is no share link to read", () => {
    render(<EmbedCode width={640} height={480} />);
    expect(shownCode()).toBe(buildIframeSnippet({ config: null, width: 640, height: 480 }));
  });
});
