import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { SearchableSelect } from "./searchable-select.jsx";

const options = [
  { value: "us", label: "United States" },
  { value: "uk", label: "United Kingdom" },
  { value: "br", label: "Brazil" },
  { value: "fr", label: "France" },
];

describe("SearchableSelect", () => {
  it("shows the current selection in the trigger", () => {
    render(<SearchableSelect label="Country" value="br" onChange={() => {}} options={options} />);
    expect(screen.getByRole("button", { name: "Country" }).textContent).toContain("Brazil");
  });

  it("falls back to placeholder when value is not in options", () => {
    render(
      <SearchableSelect
        label="Country"
        value="xx"
        onChange={() => {}}
        options={options}
        placeholder="Pick one"
      />,
    );
    expect(screen.getByRole("button", { name: "Country" }).textContent).toContain("Pick one");
  });

  it("opens the popover with all options on click", async () => {
    const user = userEvent.setup();
    render(<SearchableSelect label="Country" value="us" onChange={() => {}} options={options} />);

    await user.click(screen.getByRole("button", { name: "Country" }));
    expect(screen.getAllByRole("option")).toHaveLength(4);
  });

  it("filters options by typed query", async () => {
    const user = userEvent.setup();
    render(<SearchableSelect label="Country" value="us" onChange={() => {}} options={options} />);

    await user.click(screen.getByRole("button", { name: "Country" }));
    await user.type(screen.getByLabelText("Filter Country"), "united");
    expect(screen.getAllByRole("option")).toHaveLength(2);
  });

  it("shows an empty state when nothing matches", async () => {
    const user = userEvent.setup();
    render(<SearchableSelect label="Country" value="us" onChange={() => {}} options={options} />);

    await user.click(screen.getByRole("button", { name: "Country" }));
    await user.type(screen.getByLabelText("Filter Country"), "zzz");
    expect(screen.getByText("No matches")).toBeTruthy();
  });

  it("calls onChange with the option value when picked", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<SearchableSelect label="Country" value="us" onChange={onChange} options={options} />);

    await user.click(screen.getByRole("button", { name: "Country" }));
    await user.type(screen.getByLabelText("Filter Country"), "fra");
    await user.keyboard("{Enter}");
    expect(onChange).toHaveBeenCalledWith("fr");
  });

  it("closes on Escape without firing onChange", async () => {
    const onChange = vi.fn();
    const user = userEvent.setup();
    render(<SearchableSelect label="Country" value="us" onChange={onChange} options={options} />);

    await user.click(screen.getByRole("button", { name: "Country" }));
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("option")).toBeNull();
    expect(onChange).not.toHaveBeenCalled();
  });
});
