/**
 * Globestudio block editor registration.
 *
 * Uses WordPress's wp.* globals (provided by the editor at runtime via
 * the dependency list in our wp_register_script call) so we don't need
 * a JS bundler. Single ESM file, no build step, easy to audit.
 *
 * The editor preview is the same iframe the front-end renders — that
 * way "what you see in Gutenberg" is identical to "what shows up on the
 * published page". The InspectorControls sidebar exposes the preset
 * dropdown and a height slider; both update the iframe URL live.
 */
(function () {
  const { registerBlockType } = wp.blocks;
  const { createElement: el, Fragment } = wp.element;
  const { useBlockProps, InspectorControls } = wp.blockEditor;
  const { PanelBody, SelectControl, RangeControl } = wp.components;
  const { __ } = wp.i18n;

  // Keep in sync with src/data/look-presets.js in the main repo. When a
  // new preset ships in Globestudio, append it here in the same release.
  const PRESETS = [
    { value: "default", label: "Default" },
    { value: "halftone", label: "Halftone — newspaper print" },
    { value: "risograph", label: "Risograph — two-ink print" },
    { value: "newsprint", label: "Newsprint — CMYK halftone" },
    { value: "aurora", label: "Aurora — soft glowing bands" },
    { value: "pixel", label: "Pixel — 8-bit blocky" },
    { value: "bayer", label: "Bayer — ordered dither" },
    { value: "atkinson", label: "Atkinson — Mac dither" },
    { value: "wireframe", label: "Wireframe — technical" },
    { value: "crt", label: "CRT — scanlines + phosphor" },
    { value: "glitch", label: "Glitch — datamosh" },
    { value: "badtv", label: "Bad TV — VHS noise" },
    { value: "bloom", label: "Bloom — soft glowing" },
    { value: "metal", label: "Metal — polished chrome" },
    { value: "iridescent", label: "Iridescent — holographic" },
    { value: "pencil", label: "Pencil — hand-sketched" },
    { value: "corrupt", label: "Corrupt — terminal green" },
    { value: "toon", label: "Toon — cel-shaded" },
    { value: "threshold", label: "Threshold — high-contrast B&W" },
    { value: "vapor", label: "Vapor — synthwave" },
    { value: "topographic", label: "Topographic — contour lines" },
  ];

  registerBlockType("globestudio/embed", {
    edit: function Edit(props) {
      const { attributes, setAttributes } = props;
      const { look, height } = attributes;
      const blockProps = useBlockProps();
      const src =
        "https://globestudio.app/embed?source=wordpress-editor&look=" +
        encodeURIComponent(look || "halftone");

      return el(
        Fragment,
        null,
        el(
          InspectorControls,
          null,
          el(
            PanelBody,
            { title: __("Globestudio", "globestudio"), initialOpen: true },
            el(SelectControl, {
              label: __("Look", "globestudio"),
              value: look,
              options: PRESETS,
              onChange: (value) => setAttributes({ look: value }),
              help: __(
                "21 shipped presets. Preview updates live.",
                "globestudio",
              ),
            }),
            el(RangeControl, {
              label: __("Height (px)", "globestudio"),
              value: height,
              min: 200,
              max: 1200,
              step: 20,
              onChange: (value) => setAttributes({ height: value }),
            }),
          ),
        ),
        el(
          "div",
          blockProps,
          el("iframe", {
            src: src,
            width: "100%",
            height: height || 480,
            style: { border: 0, display: "block" },
            loading: "lazy",
            title: __("Globestudio dotted globe", "globestudio"),
          }),
        ),
      );
    },
    // Saving is handled by the PHP render callback (see block.json
    // "render" → render.php). Returning null in save() means Gutenberg
    // serializes the block as a comment-delimited attribute block and
    // calls the server renderer at output time.
    save: function Save() {
      return null;
    },
  });
})();
