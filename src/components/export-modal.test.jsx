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

  describe("the MCP tab", () => {
    const SHARE_URL = "https://globestudio.app/?c=%7B%22v%22%3A1%2C%22density%22%3A60%7D";
    // The dialog's own row. The MCP tab holds a second tablist, for the clients.
    const exportTabs = () => within(screen.getByRole("tablist", { name: "Export type" }));
    const tabNames = () => exportTabs().getAllByRole("tab").map((tab) => tab.textContent);
    const selectedTab = () => exportTabs().getByRole("tab", { selected: true }).textContent;

    afterEach(() => {
      delete navigator.clipboard;
    });

    it("comes last in the row, after Image, Video, SVG and Share", () => {
      renderModal();
      expect(tabNames()).toEqual(["Image", "Video", "SVG", "Share", "MCP"]);
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
      expect(screen.getByRole("button", { name: /Copy as React/ })).toBeTruthy();
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

    it("is reached with the arrow keys, Home and End, across all five tabs", () => {
      renderModal();
      const tablist = screen.getByRole("tablist", { name: "Export type" });
      const visited = [selectedTab()];
      for (let i = 0; i < 5; i += 1) {
        fireEvent.keyDown(tablist, { key: "ArrowRight" });
        visited.push(selectedTab());
      }
      // Wraps from MCP back to Image.
      expect(visited).toEqual(["Image", "Video", "SVG", "Share", "MCP", "Image"]);
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
