import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const projectDir = dirname(fileURLToPath(import.meta.url));

// Priority locales for the country search. Each adds ~5KB raw to the slim
// bundle. Picked from largest non-English designer audiences. Add more here
// when analytics justify; remove any to trim bundle size.
const I18N_LOCALES = ["spa", "fra", "deu", "zho", "ara", "por"];

const slimCountries = JSON.parse(
  readFileSync(resolve(projectDir, "node_modules/world-countries/countries.json"), "utf8"),
).map((country) => {
  // Pick just the `common` field from each priority translation. Drops the
  // `official` form to keep the slim bundle, well, slim.
  const translations = {};
  if (country.translations) {
    for (const locale of I18N_LOCALES) {
      const t = country.translations[locale];
      if (t?.common) translations[locale] = t.common;
    }
  }
  return {
    cca3: country.cca3,
    // ccn3 is the numeric ISO 3166-1 code. world-atlas keys its features by the
    // same numeric (un-padded). We need it to filter the solid-mode texture
    // down to the user's selected countries.
    ccn3: country.ccn3,
    name: { common: country.name?.common },
    translations,
    region: country.region,
    subregion: country.subregion,
  };
});

const slimCountriesPlugin = () => {
  const virtualId = "virtual:slim-countries";
  const resolvedId = `\0${virtualId}`;
  return {
    name: "slim-countries",
    resolveId(id) {
      if (id === virtualId) return resolvedId;
      return null;
    },
    load(id) {
      if (id !== resolvedId) return null;
      return `export default ${JSON.stringify(slimCountries)};`;
    },
  };
};

export default defineConfig({
  base: process.env.GITHUB_ACTIONS ? "/globestudio/" : "/",
  plugins: [react(), slimCountriesPlugin()],
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{js,jsx}"],
    setupFiles: ["./src/test-setup.js"],
  },
  build: {
    // Rolldown's default CSS minifier drops `-webkit-backdrop-filter`
    // when an unprefixed `backdrop-filter` exists (or vice versa),
    // breaking the modal frosted-glass effect in Chrome/Firefox/Edge
    // (which need the unprefixed form) AND iOS 15–17 / macOS Sonoma
    // Safari (which need the `-webkit-` prefix). Disabling CSS minify
    // preserves both. The CSS gzip size is ~3 kB heavier; well worth
    // it for cross-browser blur.
    cssMinify: false,
    // The default modulePreload behavior emits <link rel="modulepreload">
    // for every dynamic import target — meaning the lazy `three`,
    // `dotted-map`, and `globe-background` chunks (which usePrefetchHeavy
    // Chunks already warms on first user gesture) get preloaded during
    // the critical-path HTML parse, stealing mobile bandwidth from the
    // render-blocking CSS + the React entry chunk. That gates the
    // .map-background-placeholder LCP element on slow networks.
    //
    // resolveDependencies returns only entry-essential deps for the
    // initial bundle. The heavy lazy chunks still load on demand via
    // their normal dynamic-import flow (and via usePrefetchHeavyChunks
    // on the first mouse/key event) — they just no longer compete for
    // the initial network budget.
    modulePreload: {
      resolveDependencies: (filename, deps) =>
        deps.filter((dep) => {
          if (/[/\\]three[-.]/.test(dep)) return false;
          if (/[/\\]dotted-map[-.]/.test(dep)) return false;
          if (/[/\\]globe-background[-.]/.test(dep)) return false;
          if (/[/\\]countries-50m[-.]/.test(dep)) return false;
          if (/[/\\]states-10m[-.]/.test(dep)) return false;
          return true;
        }),
    },
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (!id.includes("node_modules")) return undefined;
          if (
            id.includes("/us-atlas/") ||
            id.includes("/world-atlas/") ||
            id.includes("/topojson-client/")
          )
            return undefined;
          if (id.includes("/three/")) return "three";
          if (id.includes("/dotted-map/")) return "dotted-map";
          if (id.includes("/d3-geo/") || id.includes("/d3-array/")) return "geo";
          if (id.includes("/react/") || id.includes("/react-dom/") || id.includes("/scheduler/")) return "react";
          return "vendor";
        },
      },
    },
  },
});
