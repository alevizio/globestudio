import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { CodeBlock } from "./code-block.jsx";

const COMMAND = "codex mcp add globestudio --url https://globestudio.app/mcp";

afterEach(() => {
  delete navigator.clipboard;
  delete document.execCommand;
});

const copy = async () => {
  await act(async () => {
    fireEvent.click(screen.getByRole("button", { name: "Copy code to clipboard" }));
  });
};

describe("CodeBlock", () => {
  it("renders the code under its language label", () => {
    const { container } = render(<CodeBlock language="html">{"<iframe></iframe>"}</CodeBlock>);
    expect(screen.getByText("html")).toBeTruthy();
    expect(container.querySelector("code").textContent).toBe("<iframe></iframe>");
    expect(container.querySelector(".code-block-arg")).toBeNull();
  });

  it("copies the code and confirms", async () => {
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    render(<CodeBlock language="Codex">{COMMAND}</CodeBlock>);
    await copy();
    expect(writeText).toHaveBeenCalledWith(COMMAND);
    expect(screen.getByRole("button", { name: "Copied" })).toBeTruthy();
  });

  it("falls back to execCommand without the Clipboard API", async () => {
    document.execCommand = vi.fn(() => true);
    render(<CodeBlock language="Codex">{COMMAND}</CodeBlock>);
    await copy();
    expect(document.execCommand).toHaveBeenCalledWith("copy");
    expect(document.querySelector("textarea")).toBeNull();
  });

  it("wraps a command between whole arguments and still copies the plain string", async () => {
    const writeText = vi.fn(() => Promise.resolve());
    Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
    const { container } = render(
      <CodeBlock language="Codex" wrap className="extra">
        {COMMAND}
      </CodeBlock>,
    );
    expect(container.firstChild.className).toBe("code-block is-wrap extra");
    const args = [...container.querySelectorAll(".code-block-arg")].map((span) => span.textContent);
    expect(args).toEqual(COMMAND.split(" "));
    expect(container.querySelector("code").textContent).toBe(COMMAND);
    await copy();
    expect(writeText).toHaveBeenCalledWith(COMMAND);
  });
});
