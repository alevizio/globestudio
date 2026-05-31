// Globestudio Figma plugin — sandbox code.
//
// Architecture: the plugin UI is a single iframe pointing at
// globestudio.app/embed?plugin=figma. The embed renders the live globe
// with full preset/density/etc controls and exposes an "Insert" button
// at the bottom. When pressed, the embed captures its canvas as a PNG
// and postMessages the bytes back via the bridge in ui.html → here.
//
// This file's job:
//   1. Open the UI panel.
//   2. Receive { type: "insert", bytes, width, height } from the bridge.
//   3. Create a Figma Image from the bytes.
//   4. Place a rectangle at the viewport center (or update the
//      currently selected Globestudio frame in place).
//   5. Notify + close-or-stay-open.

figma.showUI(__html__, { width: 380, height: 620, themeColors: true });

// On launch, if there's exactly one selection AND it's a rectangle with
// a Globestudio plugin-data marker, we'll update that one in place when
// the user inserts. Otherwise we create new.
const findUpdateTarget = function () {
  const selection = figma.currentPage.selection;
  if (selection.length !== 1) return null;
  const node = selection[0];
  if (node.type !== "RECTANGLE") return null;
  if (node.getPluginData("globestudio") !== "1") return null;
  return node;
};

figma.ui.onmessage = async function (msg) {
  if (msg.type === "insert") {
    try {
      // Prefer EDITABLE VECTORS when the embed sent SVG — designers can
      // restyle the dots/background as real Figma layers (Background / Dots /
      // Effects groups) instead of a flat raster. Falls back to the PNG path
      // below if no SVG. NOTE: very dense maps become many vector nodes and
      // can lag Figma; a "rasterize if huge" guard is a future refinement.
      // Guard: a very dense map = thousands of vector nodes, which lags Figma.
      // Above the threshold, fall through to the PNG path (one image node).
      const dotCount = msg.svg ? (msg.svg.match(/data-dot-id=/g) || []).length : 0;
      if (msg.svg && dotCount <= 2500) {
        const node = figma.createNodeFromSvg(msg.svg);
        node.name = msg.presetName || "Globestudio";
        node.x = Math.round(figma.viewport.center.x - node.width / 2);
        node.y = Math.round(figma.viewport.center.y - node.height / 2);
        node.setPluginData("globestudio", "1");
        figma.currentPage.appendChild(node);
        figma.viewport.scrollAndZoomIntoView([node]);
        figma.currentPage.selection = [node];
        figma.notify("Globestudio inserted (editable vectors)");
        return;
      }

      // bytes arrives as a Uint8Array via structured clone. Some browsers/
      // versions may surface it as a plain object with numeric keys, so
      // normalize through Uint8Array.from to be safe.
      const bytes =
        msg.bytes instanceof Uint8Array
          ? msg.bytes
          : new Uint8Array(Object.values(msg.bytes));

      const image = figma.createImage(bytes);
      const width = Math.max(64, Math.round(msg.width || 1200));
      const height = Math.max(64, Math.round(msg.height || 675));

      const existing = findUpdateTarget();
      if (existing) {
        // In-place update — preserves the node's position, size, name,
        // and parent. Only the image fill changes.
        existing.fills = [
          { type: "IMAGE", scaleMode: "FILL", imageHash: image.hash },
        ];
        figma.notify("Globestudio updated");
      } else {
        const rect = figma.createRectangle();
        rect.name = msg.presetName || "Globestudio";
        rect.x = Math.round(figma.viewport.center.x - width / 2);
        rect.y = Math.round(figma.viewport.center.y - height / 2);
        rect.resize(width, height);
        rect.fills = [
          { type: "IMAGE", scaleMode: "FILL", imageHash: image.hash },
        ];
        // Plugin-data marker — lets us recognize this node next time the
        // plugin opens with it selected, so a second Insert updates it
        // in place rather than spawning duplicates.
        rect.setPluginData("globestudio", "1");
        figma.currentPage.appendChild(rect);
        figma.viewport.scrollAndZoomIntoView([rect]);
        figma.currentPage.selection = [rect];
        figma.notify("Globestudio inserted");
      }
    } catch (err) {
      figma.notify("Couldn't insert: " + (err && err.message ? err.message : "unknown error"), { error: true });
    }
  } else if (msg.type === "resize") {
    // The embed asks for a particular UI height. Clamp to a sensible
    // window so a runaway scrollHeight from inside the iframe doesn't
    // explode the panel.
    const height = Math.max(320, Math.min(900, Math.round(msg.height) || 620));
    figma.ui.resize(380, height);
  } else if (msg.type === "close") {
    figma.closePlugin();
  }
};
