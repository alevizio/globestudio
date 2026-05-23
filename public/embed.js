/* Globestudio one-liner embed loader.
 *
 * Usage (Webflow, Squarespace, plain HTML, anywhere that allows a script
 * tag + a div):
 *
 *   <div data-globestudio data-look="halftone" data-density="50"
 *        style="width: 100%; height: 480px;"></div>
 *   <script async src="https://globestudio.app/embed.js"></script>
 *
 * The script scans for all elements carrying the `data-globestudio`
 * attribute and replaces their contents with an iframe pointing at the
 * matching /embed URL. Re-runs on DOMContentLoaded and again on a
 * MutationObserver tick so later-added elements pick it up too.
 *
 * Self-contained: no dependencies, no bundler, ~120 LOC including
 * comments. Designed to live in /public so it's served from the same
 * origin as the embed itself.
 */
(function () {
  "use strict";

  if (typeof window === "undefined" || typeof document === "undefined") return;

  var EMBED_ORIGIN = (function () {
    // Resolve the origin from the script's own src attribute so the
    // embed loader works from any host that mirrors this file. Falls
    // back to globestudio.app for inline / loaded-via-link cases.
    var current = document.currentScript;
    if (current && current.src) {
      try {
        return new URL(current.src).origin;
      } catch (e) {
        /* fall through */
      }
    }
    return "https://globestudio.app";
  })();

  // Maps a data-* attribute kebab-case key → the embed URL's camelCase
  // (or lower-case) query-string key. Anything not in this map is
  // ignored so typos don't pollute the URL.
  var ATTRIBUTE_MAP = {
    look: "look",
    density: "density",
    "dot-size": "dotSize",
    "dot-color": "dotColor",
    "world-fill": "worldFill",
    "render-mode": "renderMode",
    selection: "selection",
    motion: "motion",
    "tilt-x": "tiltX",
    "tilt-y": "tiltY",
    "auto-spin": "autoSpin",
    view: "view",
    static: "static",
    background: "background",
    transparent: "transparent",
  };

  // Build the embed URL from the element's data-* attributes. Color
  // values get their leading "#" stripped (the embed expects raw hex)
  // and booleans collapse to "0"/"1".
  function buildUrl(el) {
    var params = new URLSearchParams();
    var dataset = el.dataset || {};
    for (var dashed in ATTRIBUTE_MAP) {
      var camel = ATTRIBUTE_MAP[dashed];
      // dataset auto-converts kebab-case (data-dot-size) → camelCase
      // (dotSize), so look up via that.
      var datasetKey = dashed.replace(/-([a-z])/g, function (_, c) {
        return c.toUpperCase();
      });
      var value = dataset[datasetKey];
      if (value == null || value === "") continue;
      if (camel === "dotColor" || camel === "worldFill" || camel === "background") {
        value = String(value).replace(/^#/, "");
      } else if (camel === "autoSpin" || camel === "static" || camel === "transparent") {
        value = value === "true" || value === "1" ? "1" : "0";
      }
      params.set(camel, value);
    }
    params.set("source", dataset.source || "script-embed");
    return EMBED_ORIGIN + "/embed?" + params.toString();
  }

  // Listen for resize messages from any of our embeds. Match by source
  // (event.source === iframe.contentWindow) so multiple embeds on one
  // page can resize independently.
  var iframeRegistry = [];
  function onMessage(event) {
    if (!event.data || event.data.type !== "globestudio-resize") return;
    for (var i = 0; i < iframeRegistry.length; i++) {
      var entry = iframeRegistry[i];
      if (entry.iframe.contentWindow !== event.source) continue;
      // Only resize if the host element didn't pin an explicit height.
      // A consumer who set style="height: 480px" or class="h-96" knows
      // what they want and we shouldn't fight it.
      if (entry.respectHeight) continue;
      var h = Math.max(200, Math.min(1200, Number(event.data.height) || 0));
      if (h > 0) entry.iframe.style.height = h + "px";
      break;
    }
  }
  window.addEventListener("message", onMessage);

  function mount(el) {
    if (el.getAttribute("data-globestudio-mounted") === "1") return;
    el.setAttribute("data-globestudio-mounted", "1");
    el.innerHTML = "";

    var iframe = document.createElement("iframe");
    iframe.src = buildUrl(el);
    iframe.title = el.getAttribute("data-title") || "Globestudio dotted globe";
    iframe.style.cssText = [
      "width: 100%",
      "height: 100%",
      "border: 0",
      "display: block",
      "color-scheme: dark",
    ].join(";");
    iframe.setAttribute("loading", "lazy");
    iframe.setAttribute("allow", "autoplay");

    // If the host element has neither a CSS height nor a data-height,
    // give it a sensible default + let the embed's postMessage resize
    // adjust the height to fit the canvas's own ratio.
    var rect = el.getBoundingClientRect();
    var hostHasExplicitHeight = rect.height > 0;
    if (!hostHasExplicitHeight) {
      el.style.height = (el.getAttribute("data-height") || "420") + "px";
    }
    el.appendChild(iframe);

    iframeRegistry.push({
      iframe: iframe,
      // If consumer explicitly set height on the host, keep it. Otherwise
      // accept resize messages from the embed.
      respectHeight: hostHasExplicitHeight,
    });
  }

  function scan() {
    var elements = document.querySelectorAll("[data-globestudio]");
    for (var i = 0; i < elements.length; i++) mount(elements[i]);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scan, { once: true });
  } else {
    scan();
  }

  // Watch for elements added later (e.g. SPA route changes, dynamic
  // content). Cheap — only acts on mutations that include element
  // additions.
  if (typeof MutationObserver !== "undefined") {
    var observer = new MutationObserver(function (mutations) {
      for (var i = 0; i < mutations.length; i++) {
        var added = mutations[i].addedNodes;
        for (var j = 0; j < added.length; j++) {
          var node = added[j];
          if (node.nodeType !== 1) continue;
          if (node.matches && node.matches("[data-globestudio]")) mount(node);
          if (node.querySelectorAll) {
            var nested = node.querySelectorAll("[data-globestudio]");
            for (var k = 0; k < nested.length; k++) mount(nested[k]);
          }
        }
      }
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
  }
})();
