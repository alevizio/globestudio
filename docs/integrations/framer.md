# Globestudio in Framer

Two paths, depending on how much you want to customize.

## Path 1: Code component (recommended)

Drop Globestudio into Framer as a real component with property controls
(Look dropdown, density slider, color pickers, etc.). Designers can
tune it visually from the right panel just like a native Framer
component.

1. Open the Framer file, click **Insert → Code → New Code Component**.
2. Copy the contents of [`examples/framer-component/GlobestudioGlobe.tsx`](../../examples/framer-component/GlobestudioGlobe.tsx)
   into the editor.
3. Save. Drag the new "GlobestudioGlobe" component onto any frame.
4. Configure via the right-panel property controls.

Full install + customization guide:
[`examples/framer-component/README.md`](../../examples/framer-component/README.md)

## Path 2: Plain iframe (zero setup)

If you just want a hero globe without touching code, use the
[Framer Embed component](https://www.framer.com/help/articles/how-to-embed-content/):

1. Insert an **Embed** element onto your frame.
2. Set the URL to:

   ```
   https://globestudio.app/embed?look=halftone&density=70&autoSpin=1&source=framer
   ```

3. Resize the embed frame to the desired dimensions.

This works but doesn't give you property controls — every tweak means
editing the URL.

## Picking a look

Same preset list as the [Webflow guide](./webflow.md#picking-a-look).

## Reduced motion

Both paths honor the user's `prefers-reduced-motion: reduce` setting
automatically. Auto-spin pauses, time-driven shaders freeze, the
cinematic morph flourishes don't fire.

If you specifically want a static preview (no motion at all, even
without the user pref), use `?static=1`.

## Canvas mode performance

The code component automatically sends `?static=1` when Framer is in
canvas (editor) mode via `useIsStaticRenderer`, so multi-component
edits don't burn frames. In Preview and Live modes the globe runs at
full quality.

## Why no Framer Marketplace listing?

Marketplace submission is a 14-day review. The reference component
above is what we'd submit anyway — paste it now, no waiting. If
Globestudio crosses ~1,000 Framer installs, marketplace submission
becomes worthwhile for discoverability.
