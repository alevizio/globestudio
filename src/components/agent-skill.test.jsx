import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { AgentSkill, SKILL_PAGE_URL } from "./agent-skill.jsx";
import { track } from "./analytics.jsx";

vi.mock("./analytics.jsx", () => ({ track: vi.fn() }));

// The docs' Agent skill section gives the same three.
const NPX = "npx skills add alevizio/globestudio";
const PLUGIN = "claude plugin marketplace add alevizio/globestudio && claude plugin install globestudio@globestudio";
const GH = "gh skill install alevizio/globestudio globestudio";

afterEach(() => {
  delete navigator.clipboard;
});

const shownCode = () => screen.getByRole("tabpanel").querySelector("pre").textContent;

describe("AgentSkill", () => {
  it("gives the heading, what the skill does, the three ways to add it, then the telemetry note", () => {
    const { container } = render(<AgentSkill />);
    const outline = [...container.querySelectorAll("h3, p:not(.visually-hidden), [role='tab'], pre")].map((node) => [
      node.getAttribute("role") ?? node.tagName.toLowerCase(),
      node.textContent,
    ]);
    expect(outline).toEqual([
      ["h3", "Teach your coding agent Globestudio"],
      [
        "p",
        "The skill shows Claude Code, Codex, Cursor and other coding agents how to add and edit Globestudio globes and maps in your project.",
      ],
      ["tab", "npx skills"],
      ["tab", "Claude Code"],
      ["tab", "GitHub"],
      ["pre", NPX],
      ["p", "npx skills sends anonymous install data to skills.sh unless you set DISABLE_TELEMETRY=1. See the skill on skills.sh"],
    ]);
    expect(container.querySelector("h3").className).toBe("export-modal-label");
  });

  it("links the skill's page on skills.sh, in a new tab", () => {
    render(<AgentSkill />);
    const link = screen.getByRole("link", { name: "See the skill on skills.sh" });
    expect(link.getAttribute("href")).toBe(SKILL_PAGE_URL);
    expect(link.getAttribute("target")).toBe("_blank");
    expect(link.getAttribute("rel")).toContain("noopener");
  });

  it("uses the dialog's segmented toggle, named by the heading", () => {
    render(<AgentSkill />);
    const options = screen.getByRole("tablist", { name: "Teach your coding agent Globestudio" });
    expect(options.className).toContain("segmented-toggle");
    expect(options.querySelector(".segmented-toggle-indicator").getAttribute("aria-hidden")).toBe("true");
    expect(options.style.getPropertyValue("--segment-count")).toBe("3");
    expect(options.style.getPropertyValue("--active-index")).toBe("0");
    const npx = screen.getByRole("tab", { name: "npx skills" });
    expect(npx.getAttribute("aria-selected")).toBe("true");
    expect(npx.tabIndex).toBe(0);
    expect(screen.getByRole("tab", { name: "GitHub" }).tabIndex).toBe(-1);
    const panel = screen.getByRole("tabpanel");
    expect(npx.getAttribute("aria-controls")).toBe(panel.id);
    expect(panel.getAttribute("aria-labelledby")).toBe(npx.id);
    // No region named after the heading: the tablist carries the name.
    expect(screen.queryByRole("region")).toBeNull();
  });

  it("shows each option's command, labelled the way the docs label it", () => {
    render(<AgentSkill />);
    const label = () => screen.getByRole("tabpanel").querySelector(".code-block-language").textContent;
    expect([label(), shownCode()]).toEqual(["npx skills", NPX]);
    fireEvent.click(screen.getByRole("tab", { name: "Claude Code" }));
    expect([label(), shownCode()]).toEqual(["Claude Code plugin", PLUGIN]);
    expect(screen.getByRole("tablist").style.getPropertyValue("--active-index")).toBe("1");
    fireEvent.click(screen.getByRole("tab", { name: "GitHub" }));
    expect([label(), shownCode()]).toEqual(["GitHub CLI", GH]);
  });

  it("copies the exact command, and counts nothing", async () => {
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    render(<AgentSkill />);
    for (const [name, command] of [
      ["npx skills", NPX],
      ["Claude Code", PLUGIN],
      ["GitHub", GH],
    ]) {
      fireEvent.click(screen.getByRole("tab", { name }));
      const panel = screen.getByRole("tabpanel");
      await act(async () => {
        fireEvent.click(within(panel).getByRole("button", { name: "Copy code to clipboard" }));
      });
      expect(writeText).toHaveBeenLastCalledWith(command);
      expect(within(panel).getByRole("status").textContent).toBe("Copied");
    }
    expect(track).not.toHaveBeenCalled();
  });

  it("starts the next option's Copy afresh", async () => {
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText: vi.fn(() => Promise.resolve()) } });
    render(<AgentSkill />);
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy code to clipboard" }));
    });
    expect(screen.getByRole("button", { name: "Copied" })).toBeTruthy();
    fireEvent.click(screen.getByRole("tab", { name: "GitHub" }));
    expect(within(screen.getByRole("tabpanel")).getByRole("button", { name: "Copy code to clipboard" })).toBeTruthy();
  });

  it("moves between options with the arrow keys, Home and End, taking focus along", () => {
    render(<AgentSkill />);
    const tab = (name) => screen.getByRole("tab", { name });
    tab("npx skills").focus();
    for (const [key, name, command] of [
      ["ArrowRight", "Claude Code", PLUGIN],
      ["ArrowRight", "GitHub", GH],
      ["ArrowRight", "npx skills", NPX],
      ["ArrowLeft", "GitHub", GH],
      ["Home", "npx skills", NPX],
      ["End", "GitHub", GH],
    ]) {
      fireEvent.keyDown(document.activeElement, { key });
      expect(tab(name).getAttribute("aria-selected")).toBe("true");
      expect(document.activeElement).toBe(tab(name));
      expect(document.activeElement.tabIndex).toBe(0);
      expect(shownCode()).toBe(command);
    }
    // Other keys are left alone.
    const event = new KeyboardEvent("keydown", { key: "a", bubbles: true, cancelable: true });
    document.activeElement.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    expect(tab("GitHub").getAttribute("aria-selected")).toBe("true");
  });
});
