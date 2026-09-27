// Share cards (public/og/*.png) and the alt text that describes each one, in
// one place so a card and its alt can't drift apart. The build reads these
// (the teaser swap in vite.config.js, scripts/prerender.js). index.html
// repeats the product card values for crawlers that don't run JS, and
// site-facts.test.js keeps it in step.

// og/default.png: the home product card. It also serves /looks/default, so
// there is no separate Default-look card.
export const PRODUCT_CARD_ALT =
  "A dotted 3D globe beside the Globestudio headline: Render the world. Halftone. Risograph. Cartography, restyled.";

// og/teaser.png: the pre-launch coming-soon card.
export const TEASER_CARD_ALT =
  "A glitching CRT globe below the Globestudio headline: Something worldly is coming.";

// Alt for the card a /looks/:id route shares.
export const lookCardAlt = (preset) =>
  preset.id === "default"
    ? PRODUCT_CARD_ALT
    : `A dotted globe in the Globestudio ${preset.name} look, captioned: ${preset.blurb}.`;

// VITE_TEASER=1 builds: the index IS the coming-soon teaser, so links preview
// as og/teaser.png. Swaps the image URLs (og:image, twitter:image and the
// JSON-LD image, keeping the ?v= cache-buster) and both alt tags, which would
// otherwise still describe the product card. Reverts once VITE_TEASER=0.
export const swapInTeaserCard = (html) =>
  html
    .replace(/og\/default\.png/g, "og/teaser.png")
    .replace(
      /(<meta\s+(?:property="og:image:alt"|name="twitter:image:alt")\s+content=")[^"]*(")/g,
      (_, open, close) => `${open}${TEASER_CARD_ALT}${close}`,
    );
