import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { ErrorBoundary } from "./error-boundary.jsx";

const Boom = () => {
  throw new Error("boom");
};

describe("ErrorBoundary", () => {
  it("renders children when no error", () => {
    render(
      <ErrorBoundary fallback={<div>fallback</div>}>
        <div>ok</div>
      </ErrorBoundary>,
    );
    expect(screen.getByText("ok")).toBeTruthy();
  });

  it("renders the fallback element when a child throws", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    render(
      <ErrorBoundary fallback={<div>fallback</div>}>
        <Boom />
      </ErrorBoundary>,
    );
    expect(screen.getByText("fallback")).toBeTruthy();
    consoleError.mockRestore();
  });

  it("supports a render-prop fallback that can reset", () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    let captured;
    render(
      <ErrorBoundary
        fallback={({ error, reset }) => {
          captured = { error, reset };
          return <button type="button" onClick={reset}>retry</button>;
        }}
      >
        <Boom />
      </ErrorBoundary>,
    );
    expect(captured.error).toBeInstanceOf(Error);
    expect(typeof captured.reset).toBe("function");
    expect(screen.getByText("retry")).toBeTruthy();
    consoleError.mockRestore();
  });

  it("calls onError when provided", () => {
    const onError = vi.fn();
    render(
      <ErrorBoundary fallback={<div>fallback</div>} onError={onError}>
        <Boom />
      </ErrorBoundary>,
    );
    expect(onError).toHaveBeenCalled();
    const [error] = onError.mock.calls[0];
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toBe("boom");
  });
});
