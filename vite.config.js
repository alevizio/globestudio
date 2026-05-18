import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const projectDir = dirname(fileURLToPath(import.meta.url));

const slimCountries = JSON.parse(
  readFileSync(resolve(projectDir, "node_modules/world-countries/countries.json"), "utf8"),
).map((country) => ({
  cca3: country.cca3,
  // ccn3 is the numeric ISO 3166-1 code. world-atlas keys its features by the
  // same numeric (un-padded). We need it to filter the solid-mode texture
  // down to the user's selected countries.
  ccn3: country.ccn3,
  name: { common: country.name?.common },
  region: country.region,
  subregion: country.subregion,
}));

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
  base: process.env.GITHUB_ACTIONS ? "/worlddots/" : "/",
  plugins: [react(), slimCountriesPlugin()],
  test: {
    environment: "jsdom",
    include: ["src/**/*.test.{js,jsx}"],
    setupFiles: ["./src/test-setup.js"],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (!id.includes("node_modules")) return undefined;
          if (id.includes("/us-atlas/") || id.includes("/topojson-client/")) return undefined;
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
