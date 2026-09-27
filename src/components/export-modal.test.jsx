import { beforeAll, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { ExportModal } from "./export-modal.jsx";

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

  it("says so when a PNG export fails, next to the button that retries it", () => {
    const exportPng = vi.fn();
    renderModal({ exportPng, pngStatus: "error" });
    expect(screen.getByRole("alert").textContent).toMatch(/Export failed/);
    fireEvent.click(screen.getByRole("button", { name: /Export PNG/ }));
    expect(exportPng).toHaveBeenCalledTimes(1);
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

    it("stays quiet when the import is applied", async () => {
      const importConfig = vi.fn(() => true);
      const { container } = renderModal({ importConfig });
      importText(container, '{"density":60}');
      await waitFor(() => expect(importConfig).toHaveBeenCalledWith({ density: 60 }));
      expect(screen.queryByRole("alert")).toBeNull();
    });
  });
});
