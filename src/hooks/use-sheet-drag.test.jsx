import { fireEvent, render } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { useSheetDrag } from "./use-sheet-drag.js";

const Sheet = () => {
  const [collapsed, setCollapsed] = useState(true);
  const { dragOffset, handlers } = useSheetDrag(collapsed, setCollapsed);
  return (
    <section data-testid="rail" data-offset={dragOffset} data-collapsed={collapsed}>
      <button type="button" {...handlers}>
        grab
      </button>
    </section>
  );
};

describe("useSheetDrag", () => {
  it("ignores a pointer passing over the grabber with no button pressed", () => {
    const { getByRole, getByTestId } = render(<Sheet />);
    const grabber = getByRole("button", { name: "grab" });
    // Opened from the peek: pressed and released at the peek's grabber.
    fireEvent.pointerDown(grabber, { pointerId: 1, button: 0, clientY: 473 });
    fireEvent.pointerUp(grabber, { pointerId: 1, clientY: 473 });
    fireEvent.click(grabber);
    expect(getByTestId("rail").dataset.collapsed).toBe("false");
    // Then the pointer passes over the open grabber, 347 px higher.
    fireEvent.pointerMove(grabber, { pointerId: 1, clientY: 126 });
    fireEvent.pointerUp(grabber, { pointerId: 1, clientY: 126 });
    expect(getByTestId("rail").dataset.offset).toBe("0");
    expect(getByTestId("rail").dataset.collapsed).toBe("false");
  });
});
