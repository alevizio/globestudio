import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { ExportModal } from "./export-modal.jsx";
import { track } from "./analytics.jsx";

vi.mock("./analytics.jsx", () => ({ track: vi.fn() }));

beforeAll(() => {
  // The tab strip measures itself with ResizeObserver, which jsdom lacks.
  if (!window.ResizeObserver) {
    window.ResizeObserver = class {
      observe() {}
      unobserve() {}
      disconnect() {}
    };
  }
});

const renderModal = (props = {}) =>
  render(
    <ExportModal
      open
      onClose={vi.fn()}
      canvasWidth={1200}
      canvasHeight={800}
      exportPng={vi.fn()}
      exportVideo={vi.fn()}
      videoSupported
      videoStatus="idle"
      videoProgress={0}
      videoDurationMs={5000}
      setVideoDurationMs={vi.fn()}
      {...props}
    />,
  );

describe("ExportModal", () => {
  it("keeps Aspect, Quality and size controls on the Image tab", () => {
    renderModal();
    expect(screen.getByText("Aspect")).toBeTruthy();
    expect(screen.getByText("Quality")).toBeTruthy();
    expect(screen.getByLabelText("Export width")).toBeTruthy();
  });

  it("hides Aspect, Quality and size controls on the Video tab, where they do nothing", () => {
    const exportVideo = vi.fn();
    renderModal({ exportVideo });
    fireEvent.click(screen.getByRole("tab", { name: "Video" }));
    expect(screen.queryByText("Aspect")).toBeNull();
    expect(screen.queryByText("Quality")).toBeNull();
    expect(screen.queryByLabelText("Export width")).toBeNull();
    expect(screen.queryByLabelText("Export height")).toBeNull();
    expect(screen.getByText("FPS")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Export WebM/ }));
    expect(exportVideo).toHaveBeenCalledWith({ fps: 60, durationMs: 5000, format: "webm" });
  });

  it("says so when a video export fails, instead of resetting silently", () => {
    const { rerender } = renderModal();
    fireEvent.click(screen.getByRole("tab", { name: "Video" }));
    expect(screen.queryByRole("alert")).toBeNull();
    rerender(
      <ExportModal
        open
        onClose={vi.fn()}
        canvasWidth={1200}
        canvasHeight={800}
        exportVideo={vi.fn()}
        videoSupported
        videoStatus="error"
        videoProgress={0}
        videoDurationMs={5000}
        setVideoDurationMs={vi.fn()}
      />,
    );
    expect(screen.getByRole("alert").textContent).toMatch(/Export failed/);
    // The button stays usable so the user can retry.
    expect(screen.getByRole("button", { name: /Export WebM/ }).disabled).toBe(false);
  });

  it("says MP4 can't keep a transparent background, and only then", () => {
    const note = "MP4 has no transparency. Use WebM or PNG.";
    const { rerender } = renderModal({ mp4Supported: true, transparent: true });
    fireEvent.click(screen.getByRole("tab", { name: "Video" }));
    expect(screen.queryByText(note)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "MP4" }));
    expect(screen.getByText(note)).toBeTruthy();

    rerender(
      <ExportModal
        open
        onClose={vi.fn()}
        canvasWidth={1200}
        canvasHeight={800}
        exportVideo={vi.fn()}
        mp4Supported
        transparent={false}
        videoSupported
        videoStatus="idle"
        videoProgress={0}
        videoDurationMs={5000}
        setVideoDurationMs={vi.fn()}
      />,
    );
    expect(screen.queryByText(note)).toBeNull();
  });

  it("says GIF transparency has hard edges, only for a Transparent background", () => {
    const note = "GIF transparency has hard edges. Use WebM or PNG for soft ones.";
    const { rerender } = renderModal({ transparent: true });
    fireEvent.click(screen.getByRole("tab", { name: "Video" }));
    expect(screen.queryByText(note)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "GIF" }));
    expect(screen.getByText(note)).toBeTruthy();

    rerender(
      <ExportModal
        open
        onClose={vi.fn()}
        canvasWidth={1200}
        canvasHeight={800}
        exportVideo={vi.fn()}
        transparent={false}
        videoSupported
        videoStatus="idle"
        videoProgress={0}
        videoDurationMs={5000}
        setVideoDurationMs={vi.fn()}
      />,
    );
    expect(screen.queryByText(note)).toBeNull();
  });

  it("says so when a PNG export fails, next to the button that retries it", () => {
    const exportPng = vi.fn();
    renderModal({ exportPng, pngStatus: "error" });
    expect(screen.getByRole("alert").textContent).toMatch(/Export failed/);
    fireEvent.click(screen.getByRole("button", { name: /Export PNG/ }));
    expect(exportPng).toHaveBeenCalledTimes(1);
  });

  describe("Copy image", () => {
    // jsdom can't write images to the clipboard. These stand in for a
    // browser that can.
    const allowImageCopy = () => {
      globalThis.ClipboardItem = class {};
      Object.defineProperty(navigator, "clipboard", { configurable: true, value: { write: vi.fn() } });
    };

    afterEach(() => {
      delete globalThis.ClipboardItem;
      delete navigator.clipboard;
    });

    it("sits after Export PNG as a secondary button", () => {
      allowImageCopy();
      renderModal({ copyPng: vi.fn() });
      const footer = document.querySelector(".export-modal-footer");
      const buttons = within(footer).getAllByRole("button").map((button) => button.textContent);
      expect(buttons).toEqual(["Export PNG", "Copy image"]);
      expect(screen.getByRole("button", { name: "Copy image" }).className).toContain("is-secondary");
    });

    it("is left out where the browser can't write images to the clipboard", () => {
      renderModal({ copyPng: vi.fn() });
      expect(screen.getByRole("button", { name: "Export PNG" })).toBeTruthy();
      expect(screen.queryByRole("button", { name: "Copy image" })).toBeNull();
      expect(screen.queryByRole("status")).toBeNull();
    });

    it("is left out inside the Figma plugin", () => {
      allowImageCopy();
      renderModal({ copyPng: vi.fn(), figmaPlugin: true });
      expect(screen.getByRole("button", { name: "Insert into Figma" })).toBeTruthy();
      expect(screen.queryByRole("button", { name: "Copy image" })).toBeNull();
    });

    it("copies the PNG the export would save, with the same aspect, size and quality", async () => {
      allowImageCopy();
      const copyPng = vi.fn(() => Promise.resolve());
      const exportPng = vi.fn();
      renderModal({ copyPng, exportPng });
      fireEvent.click(screen.getByRole("button", { name: "16:9" }));
      fireEvent.click(screen.getByRole("button", { name: "High" }));
      fireEvent.click(screen.getByRole("button", { name: "Export PNG" }));
      await act(async () => {
        fireEvent.click(screen.getByRole("button", { name: "Copy image" }));
      });
      expect(copyPng).toHaveBeenCalledTimes(1);
      expect(copyPng.mock.calls[0][0]).toEqual(exportPng.mock.calls[0][0]);
      expect(copyPng.mock.calls[0][0]).toEqual({ scale: 3, width: 3600, height: 2025, aspect: "16:9" });
      // Nothing is downloaded by the copy.
      expect(exportPng).toHaveBeenCalledTimes(1);
    });

    it("confirms on the button and in a status line, then goes back", async () => {
      vi.useFakeTimers();
      try {
        allowImageCopy();
        renderModal({ copyPng: vi.fn(() => Promise.resolve()) });
        const button = screen.getByRole("button", { name: "Copy image" });
        expect(screen.getByRole("status").textContent).toBe("");
        await act(async () => {
          fireEvent.click(button);
        });
        expect(screen.getByRole("button", { name: "Image copied to clipboard" })).toBe(button);
        expect(button.className).toContain("is-success");
        expect(screen.getByRole("status").textContent).toBe("Image copied to clipboard");
        act(() => {
          vi.advanceTimersByTime(1800);
        });
        expect(screen.getByRole("button", { name: "Copy image" })).toBe(button);
        expect(screen.getByRole("status").textContent).toBe("");
      } finally {
        vi.useRealTimers();
      }
    });

    it("says so when the copy fails, and can be tried again", async () => {
      allowImageCopy();
      const copyPng = vi.fn(() => Promise.reject(new Error("denied")));
      renderModal({ copyPng });
      const button = screen.getByRole("button", { name: "Copy image" });
      await act(async () => {
        fireEvent.click(button);
      });
      expect(screen.getByRole("button", { name: "Copy failed. Try again" })).toBe(button);
      expect(button.className).not.toContain("is-success");
      expect(screen.getByRole("status").textContent).toBe("Copy failed");
      // The PNG's own error line is for a failed export, not a failed copy.
      expect(screen.queryByRole("alert")).toBeNull();
      await act(async () => {
        fireEvent.click(button);
      });
      expect(copyPng).toHaveBeenCalledTimes(2);
    });
  });

  describe("the Share tab's embed code", () => {
    const CONFIG = '{"v":2,"density":60}';
    const SHARE_URL = `https://globestudio.app/?c=${encodeURIComponent(CONFIG)}`;
    const shownCode = () => screen.getByRole("tabpanel").querySelector("code").textContent;

    it("takes the place of the Copy as React button, between the link and the JSON export", () => {
      renderModal({ getShareUrl: () => SHARE_URL });
      fireEvent.click(screen.getByRole("tab", { name: "Share" }));
      expect(screen.queryByRole("button", { name: /Copy as React/ })).toBeNull();
      const follows = (a, b) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
      const link = screen.getByRole("button", { name: /Copy share link/ });
      const heading = screen.getByRole("heading", { name: "Embed code" });
      const config = screen.getByRole("button", { name: /Export configuration/ });
      expect(follows(link, heading)).toBe(true);
      expect(follows(screen.getByRole("tabpanel"), config)).toBe(true);
    });

    it("is full width at the canvas's height on screen, whatever the export size", () => {
      renderModal({ getShareUrl: () => SHARE_URL });
      // An export size is a PNG size, often twice the screen. The embed
      // code ignores it.
      fireEvent.change(screen.getByLabelText("Export width"), { target: { value: "2400" } });
      fireEvent.change(screen.getByLabelText("Export height"), { target: { value: "1600" } });
      fireEvent.click(screen.getByRole("tab", { name: "Share" }));
      expect(shownCode()).toContain('width="100%"');
      expect(shownCode()).toContain('height="800"');
      fireEvent.click(screen.getByRole("tab", { name: "React" }));
      expect(shownCode()).toBe(
        `import { Globe } from "@globestudio/react";\n\n<Globe\n  config={${JSON.stringify(CONFIG)}}\n  width="100%"\n  height={800}\n/>`,
      );
      fireEvent.click(screen.getByRole("tab", { name: "Web component" }));
      expect(shownCode()).toContain('height="800"');
    });
  });

  describe("the Figma tab", () => {
    const exportTabs = () => within(screen.getByRole("tablist", { name: "Export type" }));
    const tabNames = () => exportTabs().getAllByRole("tab").map((tab) => tab.textContent);
    const selectedTab = () => exportTabs().getByRole("tab", { selected: true }).textContent;
    const follows = (a, b) => Boolean(a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING);
    const openFigmaTab = (props) => {
      const view = renderModal(props);
      fireEvent.click(screen.getByRole("tab", { name: "Figma" }));
      return view;
    };
    // jsdom can't write images to the clipboard. These stand in for a
    // browser that can.
    const allowImageCopy = () => {
      globalThis.ClipboardItem = class {};
      Object.defineProperty(navigator, "clipboard", { configurable: true, value: { write: vi.fn() } });
    };
    // The tab row's phone form, which jsdom has no media queries for.
    const stubPhoneTabs = (matches) => {
      const listeners = new Set();
      const query = {
        matches,
        addEventListener: (_type, listener) => listeners.add(listener),
        removeEventListener: (_type, listener) => listeners.delete(listener),
      };
      window.matchMedia = vi.fn(() => query);
      return {
        listeners,
        set: (next) => {
          query.matches = next;
          act(() => listeners.forEach((listener) => listener({ matches: next })));
        },
      };
    };

    afterEach(() => {
      delete globalThis.ClipboardItem;
      delete navigator.clipboard;
      delete window.matchMedia;
    });

    it("sits after SVG, before Share and MCP", () => {
      renderModal();
      expect(tabNames()).toEqual(["Image", "Video", "SVG", "Figma", "Share", "MCP"]);
    });

    it("is left out inside the Figma plugin, which still shows only Image and SVG", () => {
      renderModal({ figmaPlugin: true });
      expect(tabNames()).toEqual(["Image", "SVG"]);
    });

    it("is left out when the tab row is in its phone form, where six tabs don't fit", () => {
      stubPhoneTabs(true);
      renderModal();
      expect(window.matchMedia).toHaveBeenCalledWith("(max-width: 540px)");
      expect(tabNames()).toEqual(["Image", "Video", "SVG", "Share", "MCP"]);
    });

    it("falls back to Image when the tab disappears under a dialog left on Figma", () => {
      const phone = stubPhoneTabs(false);
      openFigmaTab();
      expect(selectedTab()).toBe("Figma");
      expect(screen.getByRole("heading", { name: "Paste into Figma" })).toBeTruthy();

      phone.set(true);
      expect(tabNames()).toEqual(["Image", "Video", "SVG", "Share", "MCP"]);
      expect(selectedTab()).toBe("Image");
      expect(screen.queryByRole("heading", { name: "Paste into Figma" })).toBeNull();
      expect(screen.getByLabelText("Export width")).toBeTruthy();
      expect(screen.getByRole("button", { name: "Export PNG" })).toBeTruthy();
      // The arrow keys start from the tab that is shown.
      fireEvent.keyDown(screen.getByRole("tablist", { name: "Export type" }), { key: "ArrowRight" });
      expect(selectedTab()).toBe("Video");
    });

    it("stops listening for the phone form when the dialog goes away", () => {
      const phone = stubPhoneTabs(false);
      const { unmount } = renderModal();
      expect(phone.listeners.size).toBe(1);
      unmount();
      expect(phone.listeners.size).toBe(0);
    });

    it("puts pasting first, then the plugin", () => {
      allowImageCopy();
      openFigmaTab({ copySvg: vi.fn(), copyPng: vi.fn() });
      const pane = document.querySelector(".export-modal-pane");
      const outline = [...pane.querySelectorAll("h3, p:not(.visually-hidden), button, a")].map((node) => [
        node.tagName.toLowerCase(),
        node.textContent,
      ]);
      expect(outline).toEqual([
        ["h3", "Paste into Figma"],
        ["p", "Copy the design, then paste it into a Figma file."],
        ["button", "Copy as vectors"],
        ["p", "Vectors keep dot positions, shapes, and colors. Effects and atmosphere are not applied."],
        ["button", "Copy as image"],
        ["h3", "Or design inside Figma"],
        ["p", "The Globestudio plugin runs the full studio inside Figma and inserts the result on your canvas."],
        ["a", "Open the Figma plugin"],
      ]);
      expect(screen.getByRole("button", { name: "Copy as vectors" }).className).not.toContain("is-secondary");
      expect(screen.getByRole("button", { name: "Copy as image" }).className).toContain("is-secondary");
      // Like Share and MCP, the tab has no footer: its actions sit in the body.
      expect(document.querySelector(".export-modal-footer")).toBeNull();
    });

    it("links to the plugin on Figma Community in a new tab, styled as a secondary button", () => {
      openFigmaTab();
      const link = screen.getByRole("link", { name: "Open the Figma plugin" });
      expect(link.getAttribute("href")).toBe("https://www.figma.com/community/plugin/1641603648370488902/globestudio");
      expect(link.getAttribute("target")).toBe("_blank");
      expect(link.getAttribute("rel")).toBe("noopener");
      expect(link.className).toContain("export-modal-cta");
      expect(link.className).toContain("is-secondary");
    });

    it("copies vectors the way Copy SVG does, and confirms", () => {
      const copySvg = vi.fn();
      const { rerender } = openFigmaTab({ copySvg });
      const button = screen.getByRole("button", { name: "Copy as vectors" });
      // No image clipboard in jsdom, so this is the only status line here.
      expect(screen.getByRole("status").textContent).toBe("");
      fireEvent.click(button);
      expect(copySvg).toHaveBeenCalledTimes(1);

      const withStatus = (copyStatus) =>
        rerender(
          <ExportModal
            open
            onClose={vi.fn()}
            canvasWidth={1200}
            canvasHeight={800}
            copySvg={copySvg}
            copyStatus={copyStatus}
            videoSupported
            videoStatus="idle"
            videoProgress={0}
            videoDurationMs={5000}
            setVideoDurationMs={vi.fn()}
          />,
        );
      withStatus("copied");
      expect(screen.getByRole("button", { name: "Vectors copied to clipboard" })).toBe(button);
      expect(button.className).toContain("is-success");
      expect(screen.getByRole("status").textContent).toBe("Vectors copied to clipboard");
      withStatus("manual");
      expect(screen.getByRole("button", { name: "Copy failed. Try again" })).toBe(button);
      expect(screen.getByRole("status").textContent).toBe("Copy failed");
    });

    it("copies the image the way Copy image does, with the Image tab's settings", async () => {
      allowImageCopy();
      const copyPng = vi.fn(() => Promise.resolve());
      renderModal({ copyPng });
      fireEvent.click(screen.getByRole("button", { name: "1:1" }));
      fireEvent.click(screen.getByRole("button", { name: "Draft" }));
      fireEvent.click(screen.getByRole("tab", { name: "Figma" }));
      const button = screen.getByRole("button", { name: "Copy as image" });
      await act(async () => {
        fireEvent.click(button);
      });
      expect(copyPng).toHaveBeenCalledWith({ scale: 1, width: 800, height: 800, aspect: "1:1" });
      expect(screen.getByRole("button", { name: "Image copied to clipboard" })).toBe(button);
      // Each button has its own status line. Only the image's one speaks.
      expect(screen.getAllByRole("status").map((line) => line.textContent)).toEqual(["", "Image copied to clipboard"]);
    });

    it("says so when the image copy fails", async () => {
      allowImageCopy();
      openFigmaTab({ copyPng: vi.fn(() => Promise.reject(new Error("denied"))) });
      const button = screen.getByRole("button", { name: "Copy as image" });
      await act(async () => {
        fireEvent.click(button);
      });
      expect(screen.getByRole("button", { name: "Copy failed. Try again" })).toBe(button);
      expect(screen.getAllByRole("status").map((line) => line.textContent)).toEqual(["", "Copy failed"]);
    });

    it("leaves Copy as image out where the browser can't write images to the clipboard", () => {
      openFigmaTab({ copySvg: vi.fn(), copyPng: vi.fn() });
      expect(screen.getByRole("button", { name: "Copy as vectors" })).toBeTruthy();
      expect(screen.queryByRole("button", { name: "Copy as image" })).toBeNull();
      expect(follows(screen.getByRole("button", { name: "Copy as vectors" }), screen.getByRole("link"))).toBe(true);
    });
  });

  describe("the MCP tab", () => {
    const SHARE_URL = "https://globestudio.app/?c=%7B%22v%22%3A1%2C%22density%22%3A60%7D";
    // The dialog's own row. The MCP tab holds a second tablist, for the clients.
    const exportTabs = () => within(screen.getByRole("tablist", { name: "Export type" }));
    const tabNames = () => exportTabs().getAllByRole("tab").map((tab) => tab.textContent);
    const selectedTab = () => exportTabs().getByRole("tab", { selected: true }).textContent;

    afterEach(() => {
      delete navigator.clipboard;
    });

    it("comes last in the row, after Image, Video, SVG, Figma and Share", () => {
      renderModal();
      expect(tabNames()).toEqual(["Image", "Video", "SVG", "Figma", "Share", "MCP"]);
    });

    it("is left out inside the Figma plugin, like Share", () => {
      renderModal({ figmaPlugin: true });
      expect(tabNames()).toEqual(["Image", "SVG"]);
    });

    it("loads the block with the connection first, then Copy for AI", async () => {
      renderModal({ getShareUrl: () => SHARE_URL });
      fireEvent.click(screen.getByRole("tab", { name: "MCP" }));
      const connect = await screen.findByRole("heading", { name: "Connect your agent" });
      const once = screen.getByRole("heading", { name: "Or send this design once" });
      expect(connect.compareDocumentPosition(once) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
      expect(screen.getByRole("tab", { name: "Claude" }).getAttribute("aria-selected")).toBe("true");
      // The tab has no footer of its own: like Share, its actions sit in the body.
      expect(document.querySelector(".export-modal-footer")).toBeNull();
      // The Share tab's own controls stay on the Share tab.
      expect(screen.queryByRole("button", { name: /Copy share link/ })).toBeNull();
      expect(screen.queryByText("Import .json configuration")).toBeNull();
    });

    it("leaves the Share tab with its link, embed code and JSON, and no AI block", async () => {
      renderModal({ getShareUrl: () => SHARE_URL });
      // Load the lazy block first, so its absence below isn't just a chunk
      // that has not arrived yet.
      fireEvent.click(screen.getByRole("tab", { name: "MCP" }));
      await screen.findByRole("button", { name: /Copy for AI/ });
      fireEvent.click(screen.getByRole("tab", { name: "Share" }));
      expect(screen.getByRole("button", { name: /Copy share link/ })).toBeTruthy();
      expect(screen.getByRole("heading", { name: "Embed code" })).toBeTruthy();
      expect(screen.getByRole("button", { name: /Export configuration/ })).toBeTruthy();
      expect(screen.getByText("Import .json configuration")).toBeTruthy();
      expect(screen.queryByRole("button", { name: /Copy for AI/ })).toBeNull();
      expect(screen.queryByRole("heading", { name: "Connect your agent" })).toBeNull();
      expect(screen.queryByRole("heading", { name: "Or send this design once" })).toBeNull();
      expect(screen.queryByRole("tab", { name: "Claude" })).toBeNull();
    });

    it("still copies the prompt with Copy for AI", async () => {
      const writeText = vi.fn(() => Promise.resolve());
      Object.defineProperty(navigator, "clipboard", { configurable: true, value: { writeText } });
      renderModal({ getShareUrl: () => SHARE_URL, lookName: "Halftone", regionName: "Europe" });
      fireEvent.click(screen.getByRole("tab", { name: "MCP" }));
      const button = await screen.findByRole("button", { name: /Copy for AI/ });
      await act(async () => {
        fireEvent.click(button);
      });
      const prompt = writeText.mock.calls[0][0];
      expect(prompt).toContain(`Link: ${SHARE_URL}`);
      expect(prompt).toContain("Look: Halftone");
      expect(prompt).toContain("https://globestudio.app/mcp");
      expect(screen.getByRole("button", { name: /Prompt copied to clipboard/ })).toBeTruthy();
      expect(track).toHaveBeenCalledWith("share_clicked", { method: "ai" });
    });

    it("is reached with the arrow keys, Home and End, across all six tabs", () => {
      renderModal();
      const tablist = screen.getByRole("tablist", { name: "Export type" });
      const visited = [selectedTab()];
      for (let i = 0; i < 6; i += 1) {
        fireEvent.keyDown(tablist, { key: "ArrowRight" });
        visited.push(selectedTab());
      }
      // Wraps from MCP back to Image.
      expect(visited).toEqual(["Image", "Video", "SVG", "Figma", "Share", "MCP", "Image"]);
      fireEvent.keyDown(tablist, { key: "ArrowLeft" });
      expect(selectedTab()).toBe("MCP");
      fireEvent.keyDown(tablist, { key: "ArrowLeft" });
      expect(selectedTab()).toBe("Share");
      fireEvent.keyDown(tablist, { key: "Home" });
      expect(selectedTab()).toBe("Image");
      fireEvent.keyDown(tablist, { key: "End" });
      expect(selectedTab()).toBe("MCP");
    });

    it("moves focus with the selection, so the ring sits on the tab that is shown", () => {
      renderModal();
      const tablist = screen.getByRole("tablist", { name: "Export type" });
      const focusedTab = () => document.activeElement.textContent;
      exportTabs().getByRole("tab", { name: "Image" }).focus();
      for (const [key, name] of [
        ["ArrowRight", "Video"],
        ["End", "MCP"],
        ["ArrowRight", "Image"],
        ["ArrowLeft", "MCP"],
        ["Home", "Image"],
      ]) {
        fireEvent.keyDown(tablist, { key });
        expect(selectedTab()).toBe(name);
        expect(focusedTab()).toBe(name);
        expect(document.activeElement.tabIndex).toBe(0);
      }
    });
  });

  describe("importing a configuration file", () => {
    const importText = (container, text) => {
      fireEvent.click(screen.getByRole("tab", { name: "Share" }));
      const input = container.querySelector('input[type="file"]');
      fireEvent.change(input, { target: { files: [new File([text], "config.json", { type: "application/json" })] } });
    };

    it("says so when the file isn't valid JSON", async () => {
      const importConfig = vi.fn();
      const { container } = renderModal({ importConfig });
      importText(container, "{not json");
      expect((await screen.findByRole("alert")).textContent).toMatch(/isn't a Globestudio configuration/);
      expect(importConfig).not.toHaveBeenCalled();
    });

    it("says so when the JSON holds nothing the app can use", async () => {
      const importConfig = vi.fn(() => false);
      const { container } = renderModal({ importConfig });
      importText(container, '{"hello":"world"}');
      expect((await screen.findByRole("alert")).textContent).toMatch(/isn't a Globestudio configuration/);
    });

    it("says so when the file can't be read", async () => {
      const original = window.FileReader;
      window.FileReader = class {
        readAsText() {
          queueMicrotask(() => this.onerror?.(new ProgressEvent("error")));
        }
      };
      try {
        const importConfig = vi.fn();
        const { container } = renderModal({ importConfig });
        importText(container, "{}");
        expect((await screen.findByRole("alert")).textContent).toMatch(/isn't a Globestudio configuration/);
        expect(importConfig).not.toHaveBeenCalled();
      } finally {
        window.FileReader = original;
      }
    });

    it("stays quiet when the import is applied", async () => {
      const importConfig = vi.fn(() => true);
      const { container } = renderModal({ importConfig });
      importText(container, '{"density":60}');
      await waitFor(() => expect(importConfig).toHaveBeenCalledWith({ density: 60 }));
      expect(screen.queryByRole("alert")).toBeNull();
    });
  });
});
