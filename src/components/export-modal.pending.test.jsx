import { beforeAll, describe, expect, it, vi } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { ExportModal } from "./export-modal.jsx";

vi.mock("./analytics.jsx", () => ({ track: vi.fn() }));

// The MCP and Skill tabs' chunks, held back until a test lets them through.
// They have a file of their own because React.lazy loads a chunk once per
// module, and the other export-modal tests need the real blocks.
const chunks = vi.hoisted(() => {
  const held = () => {
    let arrive;
    const pending = new Promise((resolve) => {
      arrive = resolve;
    });
    return { pending, arrive };
  };
  return { mcp: held(), skill: held() };
});
vi.mock("./agent-share.jsx", () => chunks.mcp.pending);
vi.mock("./agent-skill.jsx", () => chunks.skill.pending);

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

const renderModal = () =>
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

describe("ExportModal, while the MCP tab's chunk loads", () => {
  it("holds the tab's place instead of leaving the pane empty, then shows the block", async () => {
    renderModal();
    fireEvent.click(screen.getByRole("tab", { name: "MCP" }));
    const pane = document.querySelector(".export-modal-pane");
    const placeholder = pane.querySelector(".export-modal-pending");
    expect(placeholder).not.toBeNull();
    expect(placeholder.getAttribute("aria-busy")).toBe("true");
    // Nothing to read yet, so nothing is announced.
    expect(placeholder.textContent).toBe("");

    await act(async () => {
      chunks.mcp.arrive({ AgentShare: () => <p>Agent block</p> });
    });
    expect(await screen.findByText("Agent block")).toBeTruthy();
    expect(pane.querySelector(".export-modal-pending")).toBeNull();
  });
});

describe("ExportModal, while the Skill tab's chunk loads", () => {
  it("holds the shorter Skill block's place, then shows the block", async () => {
    renderModal();
    fireEvent.click(screen.getByRole("tab", { name: "Skill" }));
    const pane = document.querySelector(".export-modal-pane");
    const placeholder = pane.querySelector(".export-modal-pending");
    expect(placeholder).not.toBeNull();
    // Sized for the Skill block (styles.css), not the MCP tab's.
    expect(placeholder.classList.contains("is-skill")).toBe(true);
    expect(placeholder.getAttribute("aria-busy")).toBe("true");
    expect(placeholder.textContent).toBe("");

    await act(async () => {
      chunks.skill.arrive({ AgentSkill: () => <p>Skill block</p> });
    });
    expect(await screen.findByText("Skill block")).toBeTruthy();
    expect(pane.querySelector(".export-modal-pending")).toBeNull();
  });
});
