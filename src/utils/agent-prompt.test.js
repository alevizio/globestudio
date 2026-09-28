import { describe, expect, it } from "vitest";
import { AGENT_PROMPT_BUDGET, MCP_URL, buildAgentPrompt, describeDesign } from "./agent-prompt.js";
import { buildShareUrl, parseShareConfig } from "./share-config.js";
import { lookPresets } from "../data/look-presets.js";

// A busy design: gradient dots, an effect, a long region name, so the
// summary is as long as it gets.
const busyConfig = {
  ...lookPresets.find((preset) => preset.id === "risograph").settings,
  selection: "subregion:South-Eastern Asia",
  dotGradient: { from: "#ff5ea8", to: "#2fd3ff", angle: 90 },
  shape: "Particle Grid",
  density: 72,
  backgroundStyle: "flow",
};

const promptFor = (config, extra = {}) => {
  const shareUrl = buildShareUrl(config, "https://globestudio.app", "/");
  const prompt = buildAgentPrompt({
    shareUrl,
    lookName: "Risograph",
    regionName: "South-Eastern Asia",
    config: parseShareConfig(new URL(shareUrl).search),
    ...extra,
  });
  return { shareUrl, prompt };
};

describe("buildAgentPrompt", () => {
  it("carries the share link as its own line, so an agent can open it", () => {
    const { shareUrl, prompt } = promptFor(busyConfig);
    expect(prompt.split("\n")).toContain(`Link: ${shareUrl}`);
  });

  it("names the look and the key settings", () => {
    const { prompt } = promptFor(busyConfig);
    expect(prompt).toContain("Look: Risograph");
    expect(prompt).toContain("Region: South-Eastern Asia");
    expect(prompt).toContain("Dots: Particle Grid, #ff5ea8 to #2fd3ff gradient, density 72");
    expect(prompt).toContain("Background: flow gradient");
    expect(prompt).toContain("Effect: Risograph");
  });

  it("says where the design started once it has been edited from the look", () => {
    const { prompt } = promptFor(busyConfig, { lookEdited: true });
    expect(prompt).toContain("Started from: Risograph");
    expect(prompt).not.toContain("Look: Risograph");
    expect(promptFor(busyConfig, { lookEdited: false }).prompt).toContain("Look: Risograph");
  });

  it("says what the agent can do and where the MCP server is", () => {
    const { prompt } = promptFor(busyConfig);
    expect(prompt).toMatch(/1\. Edit the design and give me a new link\./);
    expect(prompt).toMatch(/2\. Embed it in my site with @globestudio\/react .* iframe/);
    expect(prompt).toMatch(/3\. Help me export it/);
    expect(prompt).toContain(`Connect the Globestudio MCP server for full control: ${MCP_URL}`);
    expect(MCP_URL).toBe("https://globestudio.app/mcp");
  });

  it("keeps the words around the link under the budget", () => {
    const { shareUrl, prompt } = promptFor(busyConfig, { lookEdited: true });
    expect(prompt.length - shareUrl.length).toBeLessThanOrEqual(AGENT_PROMPT_BUDGET);
  });

  it("uses no dashes as punctuation", () => {
    const { shareUrl, prompt } = promptFor(busyConfig);
    const words = prompt.replace(shareUrl, "");
    expect(words).not.toMatch(/[‒–—―]/);
    expect(words).not.toMatch(/\s-\s|^-\s/m);
  });

  it("still reads when there is no config or look to describe", () => {
    const prompt = buildAgentPrompt({ shareUrl: "https://globestudio.app/" });
    expect(prompt).toContain("Link: https://globestudio.app/");
    expect(prompt).toContain("View: 3D globe");
    expect(prompt).not.toContain("Look:");
    expect(prompt).not.toContain("undefined");
  });
});

describe("describeDesign", () => {
  it("describes a transparent solid flat map", () => {
    expect(
      describeDesign({
        config: { viewMode: "flat", renderMode: "solid", worldFill: "#5a5a64", transparent: true },
      }),
    ).toEqual(["View: flat map", "Map: solid, #5a5a64", "Background: transparent"]);
  });

  it("says when dots are hidden and skips an effect of none", () => {
    expect(
      describeDesign({ config: { dotsVisible: false, background: "#0a0a0a", shaderSettings: { effect: "none" } } }),
    ).toEqual(["View: 3D globe", "Dots: hidden", "Background: #0a0a0a"]);
  });
});
