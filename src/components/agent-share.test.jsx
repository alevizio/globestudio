import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { AgentShare } from "./agent-share.jsx";
import { track } from "./analytics.jsx";

vi.mock("./analytics.jsx", () => ({ track: vi.fn() }));

const SHARE_URL = "https://globestudio.app/?c=%7B%22v%22%3A1%2C%22density%22%3A60%7D";

const stubClipboard = (writeText) => {
  Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
};

afterEach(() => {
  delete navigator.clipboard;
  delete document.execCommand;
});

const renderBlock = (props = {}) =>
  render(<AgentShare getShareUrl={() => SHARE_URL} lookName="Halftone" regionName="Europe" {...props} />);

describe("AgentShare", () => {
  it("renders under a Use with AI heading", () => {
    renderBlock();
    expect(screen.getByRole("heading", { name: "Use with AI" })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Copy for AI/ })).toBeTruthy();
  });

  it("copies a prompt with the current share link, then confirms", async () => {
    const writeText = vi.fn(() => Promise.resolve());
    stubClipboard(writeText);
    renderBlock();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Copy for AI/ }));
    });
    const prompt = writeText.mock.calls[0][0];
    expect(prompt).toContain(`Link: ${SHARE_URL}`);
    expect(prompt).toContain("Look: Halftone");
    expect(prompt).toContain("Region: Europe");
    expect(prompt).toContain("density 60");
    expect(prompt).toContain("https://globestudio.app/mcp");
    const button = screen.getByRole("button", { name: /Prompt copied to clipboard/ });
    expect(screen.getByRole("status").textContent).toBe("Prompt copied to clipboard");
    // The button stays mounted, so keyboard focus stays where it was.
    expect(button).toBeTruthy();
  });

  it("says Started from when the design was edited after the look applied", async () => {
    const writeText = vi.fn(() => Promise.resolve());
    stubClipboard(writeText);
    const isLookEdited = vi.fn(() => true);
    renderBlock({ isLookEdited });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Copy for AI/ }));
    });
    // Asked at click time, so the label matches the canvas right then.
    expect(isLookEdited).toHaveBeenCalledTimes(1);
    const prompt = writeText.mock.calls[0][0];
    expect(prompt).toContain("Started from: Halftone");
    expect(prompt).not.toContain("Look: Halftone");
    expect(track).toHaveBeenCalledWith("share_clicked", { method: "ai" });
  });

  it("falls back to execCommand without the Clipboard API, keeping focus on the button", async () => {
    let copied = "";
    document.execCommand = vi.fn(() => {
      copied = document.querySelector("textarea").value;
      return true;
    });
    renderBlock();
    const button = screen.getByRole("button", { name: /Copy for AI/ });
    button.focus();
    await act(async () => {
      fireEvent.click(button);
    });
    expect(document.execCommand).toHaveBeenCalledWith("copy");
    expect(copied).toContain(`Link: ${SHARE_URL}`);
    expect(document.querySelector("textarea")).toBeNull();
    expect(document.activeElement).toBe(button);
    expect(screen.getByRole("status").textContent).toBe("Prompt copied to clipboard");
  });

  it("falls back when the Clipboard API refuses", async () => {
    stubClipboard(vi.fn(() => Promise.reject(new Error("denied"))));
    document.execCommand = vi.fn(() => true);
    renderBlock();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Copy for AI/ }));
    });
    expect(document.execCommand).toHaveBeenCalledWith("copy");
    expect(screen.getByRole("button", { name: /Prompt copied to clipboard/ })).toBeTruthy();
  });

  it("says so when both routes fail", async () => {
    stubClipboard(vi.fn(() => Promise.reject(new Error("denied"))));
    document.execCommand = vi.fn(() => false);
    renderBlock();
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: /Copy for AI/ }));
    });
    expect(screen.getByRole("button", { name: /Copy failed\. Try again/ })).toBeTruthy();
    expect(screen.getByRole("status").textContent).toBe("Copy failed");
  });

  it("shows the Claude Code command and the Claude app steps first", () => {
    renderBlock();
    const tab = screen.getByRole("tab", { name: "Claude" });
    expect(tab.getAttribute("aria-selected")).toBe("true");
    const panel = screen.getByRole("tabpanel");
    expect(panel.textContent).toContain("claude mcp add --transport http globestudio https://globestudio.app/mcp");
    expect(panel.textContent).toContain("Customize, then Connectors");
    expect(panel.textContent).toContain("Add custom connector");
  });

  it("moves between clients with the arrow keys, taking focus along", () => {
    renderBlock();
    const claude = screen.getByRole("tab", { name: "Claude" });
    claude.focus();
    fireEvent.keyDown(claude, { key: "ArrowRight" });
    const codex = screen.getByRole("tab", { name: "Codex" });
    expect(codex.getAttribute("aria-selected")).toBe("true");
    expect(document.activeElement).toBe(codex);
    expect(screen.getByRole("tabpanel").textContent).toContain("codex mcp add globestudio --url https://globestudio.app/mcp");

    fireEvent.keyDown(codex, { key: "End" });
    const cursor = screen.getByRole("tab", { name: "Cursor" });
    expect(document.activeElement).toBe(cursor);
    fireEvent.keyDown(cursor, { key: "ArrowRight" });
    expect(document.activeElement).toBe(claude);
  });

  it("gives Cursor an install link that carries the hosted server URL", () => {
    renderBlock();
    fireEvent.click(screen.getByRole("tab", { name: "Cursor" }));
    const link = screen.getByRole("link", { name: /Add to Cursor/ });
    const href = new URL(link.getAttribute("href"));
    expect(`${href.protocol}//${href.host}${href.pathname}`).toBe("cursor://anysphere.cursor-deeplink/mcp/install");
    expect(href.searchParams.get("name")).toBe("globestudio");
    expect(JSON.parse(atob(href.searchParams.get("config")))).toEqual({ url: "https://globestudio.app/mcp" });
    expect(screen.getByRole("tabpanel").textContent).toContain('"url": "https://globestudio.app/mcp"');
  });
});
