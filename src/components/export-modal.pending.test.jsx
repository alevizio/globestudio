import { beforeAll, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { ExportModal } from "./export-modal.jsx";

vi.mock("./analytics.jsx", () => ({ track: vi.fn() }));

// The MCP tab's chunk, held back until the test lets it through. It has a
// file of its own because React.lazy loads a chunk once per module, and the
// other export-modal tests need the real block.
const chunk = vi.hoisted(() => {
  let arrive;
  const pending = new Promise((resolve) => {
    arrive = resolve;
  });
  return { pending, arrive };
});
vi.mock("./agent-share.jsx", () => chunk.pending);

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

describe("ExportModal, while the MCP tab's chunk loads", () => {
  it("holds the tab's place instead of leaving the pane empty, then shows the block", async () => {
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
      />,
    );
    fireEvent.click(screen.getByRole("tab", { name: "MCP" }));
    const pane = document.querySelector(".export-modal-pane");
    const placeholder = pane.querySelector(".export-modal-pending");
    expect(placeholder).not.toBeNull();
    expect(placeholder.getAttribute("aria-busy")).toBe("true");
    // Nothing to read yet, so nothing is announced.
    expect(placeholder.textContent).toBe("");

    await act(async () => {
      chunk.arrive({ AgentShare: () => <p>Agent block</p> });
    });
    expect(await screen.findByText("Agent block")).toBeTruthy();
    expect(pane.querySelector(".export-modal-pending")).toBeNull();
  });
});
