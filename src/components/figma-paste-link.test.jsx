import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import axe from "axe-core";
import { lookPresets } from "../data/look-presets.js";
import { FigmaPasteLink } from "./figma-paste-link.jsx";

const halftone = lookPresets.find((preset) => preset.id === "halftone");
const DESIGN = { selection: "country:JPN", density: 70 };
const LINK = `https://globestudio.app/looks/halftone?c=${encodeURIComponent(JSON.stringify(DESIGN))}&app=1`;

const renderField = () => {
  const onLoad = vi.fn();
  const onPagePaste = vi.fn();
  const utils = render(<FigmaPasteLink onLoad={onLoad} onPagePaste={onPagePaste} />);
  const field = screen.getByRole("textbox", { name: "Paste a share link" });
  return { onLoad, onPagePaste, field, ...utils };
};

describe("FigmaPasteLink", () => {
  it("renders a labeled field with an empty status line", () => {
    const { field } = renderField();
    expect(field.getAttribute("placeholder")).toBe("Paste a share link");
    expect(screen.getByRole("status").textContent).toBe("");
  });

  it("loads a link pasted into the field and empties it", async () => {
    const user = userEvent.setup();
    const { field, onLoad, onPagePaste } = renderField();
    await user.click(field);
    await user.paste(LINK);
    expect(onLoad).toHaveBeenCalledTimes(1);
    const [{ look, config }] = onLoad.mock.calls[0];
    expect(look).toBe(halftone);
    expect(config).toMatchObject(DESIGN);
    expect(screen.getByRole("status").textContent).toBe("Loaded the design from your link");
    expect(field.value).toBe("");
    expect(onPagePaste).not.toHaveBeenCalled();
  });

  it("keeps other text in the field and says it is not a link", async () => {
    const user = userEvent.setup();
    const { field, onLoad } = renderField();
    await user.click(field);
    await user.paste("https://example.com/?c=%7B%7D");
    expect(onLoad).not.toHaveBeenCalled();
    expect(screen.getByRole("status").textContent).toBe("That is not a Globestudio link");
    expect(field.value).toBe("https://example.com/?c=%7B%7D");
  });

  it("says when a Globestudio link carries no design", async () => {
    const user = userEvent.setup();
    const { field, onLoad } = renderField();
    await user.click(field);
    await user.paste("https://globestudio.app/docs");
    expect(onLoad).not.toHaveBeenCalled();
    expect(screen.getByRole("status").textContent).toBe("That link has no design in it");
  });

  it("loads a typed link on Enter, and clears the status while typing", async () => {
    const user = userEvent.setup();
    const { field, onLoad } = renderField();
    await user.type(field, "hello{Enter}");
    expect(screen.getByRole("status").textContent).toBe("That is not a Globestudio link");
    await user.clear(field);
    expect(screen.getByRole("status").textContent).toBe("");
    await user.type(field, "globestudio.app/looks/halftone{Enter}");
    expect(onLoad).toHaveBeenCalledWith({ look: halftone, config: null });
    expect(screen.getByRole("status").textContent).toBe("Loaded the design from your link");
  });

  it("loads a link pasted on the page and reports it there", async () => {
    const user = userEvent.setup();
    const { onLoad, onPagePaste } = renderField();
    document.body.focus();
    await user.paste(LINK);
    expect(onLoad).toHaveBeenCalledTimes(1);
    expect(onPagePaste).toHaveBeenCalledWith("Loaded the design from your link");
    await user.paste("just some text");
    expect(onLoad).toHaveBeenCalledTimes(1);
    expect(onPagePaste).toHaveBeenLastCalledWith("That is not a Globestudio link");
    // The page's own report stands in for the field's line.
    expect(screen.getByRole("status").textContent).toBe("");
  });

  it("loads a page paste while a button or slider has focus", async () => {
    const user = userEvent.setup();
    const onLoad = vi.fn();
    render(
      <>
        <FigmaPasteLink onLoad={onLoad} onPagePaste={vi.fn()} />
        <button type="button">Flat</button>
        <input type="range" aria-label="Density" />
      </>,
    );
    await user.click(screen.getByRole("button", { name: "Flat" }));
    await user.paste(LINK);
    screen.getByRole("slider", { name: "Density" }).focus();
    await user.paste(LINK);
    expect(onLoad).toHaveBeenCalledTimes(2);
  });

  it("leaves a paste in another text field alone", async () => {
    const user = userEvent.setup();
    const onLoad = vi.fn();
    const onPagePaste = vi.fn();
    render(
      <>
        <FigmaPasteLink onLoad={onLoad} onPagePaste={onPagePaste} />
        <input type="text" aria-label="Search countries" />
        <textarea aria-label="Paste SVG code" />
      </>,
    );
    for (const name of ["Search countries", "Paste SVG code"]) {
      const other = screen.getByRole("textbox", { name });
      await user.click(other);
      await user.paste(LINK);
      expect(other.value).toBe(LINK);
    }
    expect(onLoad).not.toHaveBeenCalled();
    expect(onPagePaste).not.toHaveBeenCalled();
  });

  it("stops listening to the page once it is gone", async () => {
    const user = userEvent.setup();
    const { onLoad, unmount } = renderField();
    unmount();
    document.body.focus();
    await user.paste(LINK);
    expect(onLoad).not.toHaveBeenCalled();
  });

  it("has no axe violations, with and without a status", async () => {
    const user = userEvent.setup();
    const { container, field } = renderField();
    expect((await axe.run(container, { rules: { region: { enabled: false } } })).violations).toEqual([]);
    await user.click(field);
    await user.paste("hello");
    expect((await axe.run(container, { rules: { region: { enabled: false } } })).violations).toEqual([]);
  });
});
