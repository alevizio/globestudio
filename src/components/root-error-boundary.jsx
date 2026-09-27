import { ErrorBoundary } from "./error-boundary.jsx";

// Last-resort boundary around the whole app and /embed. The globe canvas has
// its own boundary in App.jsx; without this one, any other render error (or
// a lazy chunk that fails to load) unmounts the root and leaves a blank page,
// or a blank iframe on a customer's site.
export const RootErrorBoundary = ({ children }) => (
  <ErrorBoundary
    fallback={
      <div className="map-background-error" role="alert">
        <p>Something went wrong.</p>
        <button type="button" className="button" onClick={() => window.location.reload()}>
          Reload
        </button>
      </div>
    }
  >
    {children}
  </ErrorBoundary>
);
