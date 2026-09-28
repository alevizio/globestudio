// The "Copy for AI" prompt in the export dialog's Share tab: a plain-text
// brief any agent (Claude, ChatGPT, Codex, Cursor...) can act on without
// knowing Globestudio. It carries the share link, a readable summary of the
// design, what the agent can do with it, and the hosted MCP server.
//
// Only the lazy agent-share chunk imports this module, so none of it weighs
// on first paint.

import { shaderEffectOptions } from "../config/shader-effects.js";

export const MCP_URL = "https://globestudio.app/mcp";

// Characters around the link. The link itself grows with the design (a
// full ?c= config runs well past a thousand characters), so it is left out
// of the count: the budget keeps the words short, not the payload.
export const AGENT_PROMPT_BUDGET = 900;

const EFFECT_LABELS = new Map(shaderEffectOptions.map((option) => [option.value, option.label]));

const describeDots = (config) => {
  if (config.dotsVisible === false) return "hidden";
  const color = config.dotGradient
    ? `${config.dotGradient.from} to ${config.dotGradient.to} gradient`
    : config.dotColor;
  const density = config.density === undefined ? undefined : `density ${config.density}`;
  return [config.shape, color, density].filter(Boolean).join(", ");
};

const describeBackground = (config) => {
  if (config.transparent) return "transparent";
  if (config.backgroundStyle === "space") return "space";
  if (config.backgroundStyle === "flow") return "flow gradient";
  return config.background;
};

// Short "Label: value" lines, one per setting a person would name when
// describing the design. Settings the config doesn't carry are skipped.
// A look the design has been edited away from is where it started, not
// what it is, so the agent doesn't rebuild the plain look.
export const describeDesign = ({ lookName, lookEdited = false, regionName, config = {} }) => {
  const lines = [];
  if (lookName) lines.push(`${lookEdited ? "Started from" : "Look"}: ${lookName}`);
  if (regionName) lines.push(`Region: ${regionName}`);
  lines.push(`View: ${config.viewMode === "flat" ? "flat map" : "3D globe"}`);
  if (config.renderMode === "solid") {
    lines.push(`Map: solid${config.worldFill ? `, ${config.worldFill}` : ""}`);
  } else {
    const dots = describeDots(config);
    if (dots) lines.push(`Dots: ${dots}`);
  }
  const background = describeBackground(config);
  if (background) lines.push(`Background: ${background}`);
  const effect = config.shaderSettings?.effect;
  if (effect && effect !== "none") lines.push(`Effect: ${EFFECT_LABELS.get(effect) ?? effect}`);
  return lines;
};

export const buildAgentPrompt = ({ shareUrl, lookName, lookEdited, regionName, config }) =>
  [
    "I made this globe with Globestudio (globestudio.app), an open source tool for dotted maps and 3D globes.",
    "",
    `Link: ${shareUrl}`,
    "",
    ...describeDesign({ lookName, lookEdited, regionName, config }),
    "",
    "The link opens this exact design. Its c parameter is URL encoded JSON that follows globestudio.app/schema/config.json.",
    "",
    "You can:",
    "1. Edit the design and give me a new link.",
    "2. Embed it in my site with @globestudio/react (pass the c value as config) or an iframe of globestudio.app/embed with the same c parameter.",
    "3. Help me export it as PNG, SVG, video or JSON.",
    "",
    `Connect the Globestudio MCP server for full control: ${MCP_URL}`,
  ].join("\n");
