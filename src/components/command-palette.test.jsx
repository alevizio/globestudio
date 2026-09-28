import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CommandPalette } from "./command-palette.jsx";

const presetAction = (preset) => ({
  id: `preset-${preset.id}`,
  label: preset.name,
  group: "Look",
  preset,
  run: vi.fn(),
});

const thumbFor = (container, index) =>
  container.querySelectorAll(".command-palette-row")[index].querySelector("img");

describe("CommandPalette", () => {
  it("renders nothing when closed", () => {
    const { container } = render(<CommandPalette open={false} onClose={() => {}} actions={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("shows preset rows with the same downsampled thumbs as the looks bar", () => {
    const { container } = render(
      <CommandPalette
        open
        onClose={() => {}}
        actions={[
          presetAction({ id: "default", name: "Default" }),
          // Pointing previewImage at the default path still uses the thumbs.
          presetAction({ id: "halftone", name: "Halftone", previewImage: "/looks/halftone.png" }),
        ]}
      />,
    );
    for (const [index, id] of ["default", "halftone"].entries()) {
      const img = thumbFor(container, index);
      expect(img.getAttribute("src")).toBe(`/looks/thumbs/${id}@2x.webp`);
      expect(img.getAttribute("srcset")).toBe(
        `/looks/thumbs/${id}@2x.webp 56w, /looks/thumbs/${id}@3x.webp 84w`,
      );
      expect(img.getAttribute("sizes")).toBe("28px");
      expect(img.getAttribute("width")).toBe("28");
    }
  });

  it("keeps a custom previewImage as is and drops the thumb for null", () => {
    const { container } = render(
      <CommandPalette
        open
        onClose={() => {}}
        actions={[
          presetAction({ id: "custom", name: "Custom", previewImage: "https://example.com/custom.png" }),
          presetAction({ id: "none", name: "None", previewImage: null }),
          { id: "export", label: "Export", run: vi.fn() },
        ]}
      />,
    );
    const custom = thumbFor(container, 0);
    expect(custom.getAttribute("src")).toBe("https://example.com/custom.png");
    expect(custom.hasAttribute("srcset")).toBe(false);
    expect(thumbFor(container, 1)).toBeNull();
    expect(thumbFor(container, 2)).toBeNull();
  });

  it("runs the clicked action and closes", async () => {
    const onClose = vi.fn();
    const action = presetAction({ id: "risograph", name: "Risograph" });
    const user = userEvent.setup();
    render(<CommandPalette open onClose={onClose} actions={[action]} />);
    await user.click(screen.getByText("Risograph"));
    expect(action.run).toHaveBeenCalledTimes(1);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
