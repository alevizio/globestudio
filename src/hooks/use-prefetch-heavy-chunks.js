import { useEffect } from "react";

// Pre-warms the largest lazy chunks (countries-50m atlas, us-states
// atlas, the globe-background module) once the user has shown intent
// — first mousemove, keydown, scroll, or touchstart. Each chunk is
// only imported lazily today: countries-50m on `renderMode: "solid"`,
// states-10m on `country:USA`, globe-background on Suspense mount.
// By the time the user clicks the toggle / picks the country / lands
// from a /looks/:id URL, the network round-trip is already done and
// the swap feels instant.
//
// Uses `requestIdleCallback` so the prefetch never competes with
// frame budget on slow devices. Falls back to a small setTimeout on
// browsers that don't support it (Safari pre-17).
//
// Loaders catch their own errors — the atlas is a JSON import, the
// failure path is "the feature it powers doesn't render", which the
// rest of the app already handles gracefully.
export const usePrefetchHeavyChunks = () => {
  useEffect(() => {
    if (typeof window === "undefined") return undefined;

    let fired = false;
    const fire = () => {
      if (fired) return;
      fired = true;
      const schedule =
        window.requestIdleCallback?.bind(window) ||
        ((cb) => window.setTimeout(cb, 250));
      schedule(() => {
        // globe-background is already on the Suspense path — importing
        // it again here is a no-op once it's in module cache, but for
        // a user who landed on /looks/:id with the canvas already
        // mounting this just hits the cache. Cheap insurance.
        import("../components/globe-background.jsx").catch(() => {});
        // countries-50m: the 756 kB atlas that's only loaded when the
        // user switches renderMode to "solid". Prefetch so the toggle
        // feels instant.
        import("world-atlas/countries-50m.json").catch(() => {});
        // states-10m: the 114 kB atlas that's loaded when the user
        // picks country:USA. Smaller win but same reasoning.
        import("us-atlas/states-10m.json").catch(() => {});
      });
    };

    const opts = { once: true, passive: true };
    window.addEventListener("mousemove", fire, opts);
    window.addEventListener("keydown", fire, opts);
    window.addEventListener("touchstart", fire, opts);
    window.addEventListener("scroll", fire, opts);

    return () => {
      window.removeEventListener("mousemove", fire, opts);
      window.removeEventListener("keydown", fire, opts);
      window.removeEventListener("touchstart", fire, opts);
      window.removeEventListener("scroll", fire, opts);
    };
  }, []);
};
