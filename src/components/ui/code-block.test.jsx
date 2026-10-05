import { afterEach, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { CodeBlock } from "./code-block.jsx";

const COMMAND = "codex mcp add globestudio --url https://globestudio.app/mcp";

afterEach(() => {
  delete navigator.clipboard;
  delete document.execCommand;
  delete window.ResizeObserver;
  vi.restoreAllMocks();
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

  it("tells its caller once the code is copied, and not when the copy is refused", async () => {
    const onCopy = vi.fn();
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn(() => Promise.resolve()) },
    });
    const { unmount } = render(<CodeBlock language="Codex" onCopy={onCopy}>{COMMAND}</CodeBlock>);
    await copy();
    expect(onCopy).toHaveBeenCalledTimes(1);
    unmount();

    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn(() => Promise.reject(new Error("denied"))) },
    });
    render(<CodeBlock language="Codex" onCopy={onCopy}>{COMMAND}</CodeBlock>);
    await copy();
    expect(onCopy).toHaveBeenCalledTimes(1);
  });

  it("says when the copy is refused, out loud too, and goes back to Copy", async () => {
    vi.useFakeTimers();
    try {
      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: { writeText: vi.fn(() => Promise.reject(new Error("denied"))) },
      });
      render(<CodeBlock language="Codex">{COMMAND}</CodeBlock>);
      await copy();
      expect(screen.getByRole("button", { name: "Copy failed" }).textContent).toBe("Copy failed");
      expect(screen.getByRole("status").textContent).toBe("Copy failed");
      act(() => vi.advanceTimersByTime(3000));
      expect(screen.getByRole("button", { name: "Copy code to clipboard" }).textContent).toBe("Copy");
      expect(screen.getByRole("status").textContent).toBe("");
    } finally {
      vi.useRealTimers();
    }
  });

  it("reads out a copy that worked", async () => {
    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: { writeText: vi.fn(() => Promise.resolve()) },
    });
    render(<CodeBlock language="Codex">{COMMAND}</CodeBlock>);
    expect(screen.getByRole("status").textContent).toBe("");
    await copy();
    expect(screen.getByRole("status").textContent).toBe("Copied");
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

  describe("keyboardScroll", () => {
    // jsdom lays nothing out, so the widths and the observer are stood in.
    const layOut = ({ scrollWidth, clientWidth }) => {
      const widths = { scrollWidth, clientWidth };
      vi.spyOn(Element.prototype, "scrollWidth", "get").mockImplementation(() => widths.scrollWidth);
      vi.spyOn(Element.prototype, "clientWidth", "get").mockImplementation(() => widths.clientWidth);
      const observers = [];
      window.ResizeObserver = class {
        constructor(callback) {
          observers.push(callback);
        }
        observe() {}
        disconnect() {}
      };
      return {
        resize: (next) => {
          Object.assign(widths, next);
          act(() => observers.forEach((callback) => callback()));
        },
        // New widths with no resize: the text changed inside the same box.
        setWidths: (next) => Object.assign(widths, next),
      };
    };

    it("puts a snippet that runs past its box in the tab order, named by its label", () => {
      layOut({ scrollWidth: 242, clientWidth: 230 });
      const { container } = render(
        <CodeBlock language="mcp.json" keyboardScroll>
          {COMMAND}
        </CodeBlock>,
      );
      const pre = container.querySelector("pre");
      expect(pre.tabIndex).toBe(0);
      expect(screen.getByRole("group", { name: "mcp.json" })).toBe(pre);
    });

    it("leaves a snippet that fits out of the tab order, and follows a resize", () => {
      const { resize } = layOut({ scrollWidth: 230, clientWidth: 230 });
      const { container } = render(
        <CodeBlock language="mcp.json" keyboardScroll>
          {COMMAND}
        </CodeBlock>,
      );
      const pre = container.querySelector("pre");
      expect(pre.hasAttribute("tabindex")).toBe(false);
      expect(screen.queryByRole("group")).toBeNull();
      resize({ clientWidth: 190 });
      expect(pre.tabIndex).toBe(0);
      resize({ clientWidth: 260, scrollWidth: 260 });
      expect(pre.hasAttribute("tabindex")).toBe(false);
    });

    it("measures again once the code font loads, which moves the text but not the box", () => {
      const { setWidths } = layOut({ scrollWidth: 242, clientWidth: 230 });
      const fonts = new EventTarget();
      Object.defineProperty(document, "fonts", { configurable: true, value: fonts });
      try {
        const { container, unmount } = render(
          <CodeBlock language="Codex" wrap keyboardScroll>
            {COMMAND}
          </CodeBlock>,
        );
        const pre = container.querySelector("pre");
        // The fallback font ran past the box.
        expect(pre.tabIndex).toBe(0);
        // The narrower web font fits. The box kept its size, so only the
        // font event says so.
        setWidths({ scrollWidth: 230 });
        act(() => {
          fonts.dispatchEvent(new Event("loadingdone"));
        });
        expect(pre.hasAttribute("tabindex")).toBe(false);
        expect(screen.queryByRole("group")).toBeNull();
        const remove = vi.spyOn(fonts, "removeEventListener");
        unmount();
        expect(remove).toHaveBeenCalledWith("loadingdone", expect.any(Function));
      } finally {
        delete document.fonts;
      }
    });

    it("is off unless asked for, so the docs snippets keep their tab order", () => {
      layOut({ scrollWidth: 242, clientWidth: 230 });
      const { container } = render(<CodeBlock language="html">{COMMAND}</CodeBlock>);
      expect(container.querySelector("pre").hasAttribute("tabindex")).toBe(false);
    });
  });
});
