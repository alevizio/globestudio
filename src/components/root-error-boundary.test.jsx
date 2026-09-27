import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { trackClientError } from "./analytics.jsx";
import { RootErrorBoundary } from "./root-error-boundary.jsx";

vi.mock("./analytics.jsx", () => ({ trackClientError: vi.fn() }));

const Boom = () => {
  throw new Error("boom");
};

describe("RootErrorBoundary", () => {
  it("renders the app when nothing throws", () => {
    render(
      <RootErrorBoundary>
        <main>studio</main>
      </RootErrorBoundary>,
    );
    expect(screen.getByText("studio")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("shows a visible error with a Reload button instead of a blank page", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <RootErrorBoundary>
        <Boom />
      </RootErrorBoundary>,
    );
    expect(screen.getByRole("alert").textContent).toContain("Something went wrong.");
    expect(screen.getByRole("button", { name: "Reload" })).toBeTruthy();
    consoleError.mockRestore();
  });

  it("reports the crash as a client_error tagged with where it happened", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <RootErrorBoundary where="embed">
        <Boom />
      </RootErrorBoundary>,
    );
    expect(trackClientError).toHaveBeenCalledWith("embed", expect.objectContaining({ message: "boom" }));
    consoleError.mockRestore();
  });
});
