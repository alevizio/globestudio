# Globestudio in Notion

Notion supports iframe embeds natively via the `/embed` slash command.

## Setup

1. In any Notion page, type `/embed` and select **Embed**.
2. Paste this URL:

   ```
   https://globestudio.app/embed?look=halftone&density=70&autoSpin=1&source=notion
   ```

3. Click **Embed link**. Notion will render the iframe inline.
4. Drag the embed corner to resize.

## Customizing

Edit the URL to change the look. See
[`docs/integrations/README.md#common-parameters`](./README.md#common-parameters)
for the full list of query parameters.

## Use cases

- **Team OKR docs** — embed a country-highlighted map next to a "Markets
  we serve" section.
- **Onboarding wiki** — a global team locator with `selection=` set per
  page.
- **Project briefs** — a brand-system showcase with the right preset
  per project.

## Limitations

- Notion's embed frame can be resized but doesn't auto-fit content. The
  postMessage resize protocol fires but Notion ignores it.
- Notion's PDF export rasterizes iframes as a static "embedded link"
  card — the globe doesn't render in exported PDFs.
- Notion's mobile app reduces iframe interactivity. The embed renders
  but auto-spin may be paused.

If any of these block your use case, [open a Discussion](https://github.com/alevizio/globestudio/discussions).
