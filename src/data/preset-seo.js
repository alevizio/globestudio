// Per-preset SEO copy + use cases. Kept separate from look-presets.js so the
// shipped preset definitions stay focused on rendering settings and this file
// holds the long-form content that drives:
//   1. The per-preset <meta name="description"> (SERP snippet) — picked up in
//      App.jsx's applyLook effect.
//   2. The visible <PresetDetail> section rendered below the canvas on
//      preset routes, which gives each /looks/:id URL ~200+ words of
//      designer-facing unique content. Per SEO Phase 4 (docs/plans/
//      seo-rollout.md), this lifts every preset URL above the "thin content"
//      threshold AND positions each as a search landing page for its
//      specific aesthetic.
//   3. The "When to use this" suggestion bullets, which double as social-
//      proof signals for AI Overview citations.
//
// Each entry targets one long-tail keyword that a designer would actually
// type ("halftone dotted map generator" rather than "halftone style").
// Descriptions are hand-written, not LLM-generated, so they pass Google's
// "low-effort AI content" filters.

export const presetSeo = {
  default: {
    targetKeyword: "dotted map generator",
    metaDescription:
      "Dotted map and 3D globe generator with white dots on a dark background, slow rotation and no shader effect. Export PNG, SVG, WebM, MP4 or GIF.",
    longDescription:
      "The Default look is the unstyled starting point: white dots arranged across the world map, rotating slowly on a dark background, with no shader effect, overlay or print texture. It reads as plain geographic data visualization, which makes it a safe choice for landing pages, headers and decks where the globe sits behind the headline. Change density, dot shape and color from here to make your own variation, or use it as is.",
    useCases: [
      "Landing-page hero behind a headline",
      "Conference slide background where attention belongs elsewhere",
      "Brand system base that designers customize per project",
    ],
  },
  halftone: {
    targetKeyword: "halftone dotted map generator",
    metaDescription:
      "Halftone dotted globe generator: circular print-style dots that scale by brightness, like newspaper print. Export PNG, SVG or video.",
    longDescription:
      "Halftone is the print preset. Circular dots scale by brightness, like mid-century newspaper photos and magazine spreads where a black-and-white image was screened down to a grid of dots of different sizes. Use Halftone when you want the globe to look printed. The cellSize control sets the dot pitch (a smaller cell gives a finer, denser pattern), and intensity goes from a soft halftone to a hard binary pattern that gets close to Bayer at the maximum.",
    useCases: [
      "Magazine spread or editorial header where print feel matters",
      "Annual report covers and section dividers",
      "Vinyl sleeve or risograph-adjacent print collateral",
    ],
  },
  risograph: {
    targetKeyword: "risograph map generator",
    metaDescription:
      "Risograph dotted globe: pink and cyan ink with misregistration offset and paper grain. Works with any country.",
    longDescription:
      "Risograph imitates a two-ink riso print: fluorescent pink and federal blue layers offset by a few pixels for the misregistration glow, plus a paper-grain noise overlay that breaks up the flat areas. It gives you the slightly off look of a riso print without a riso machine. The split control sets how far off register the layers are (zero is a clean two-color print, higher values look wildly off-register), and intensity goes from a soft riso toward full saturation. Use the flat view for editorial spreads or the globe view for headers and section openers.",
    useCases: [
      "Indie magazine and zine layouts",
      "Print-adjacent merch (posters, stickers, lookbooks)",
      "Editorial illustration headers in design newsletters",
    ],
  },
  newsprint: {
    targetKeyword: "newsprint map generator",
    metaDescription:
      "Newsprint dotted map with CMYK halftone: four-channel screen rotated like a real newspaper press. Export PNG and SVG of any country.",
    longDescription:
      "Newsprint is the four-channel CMYK halftone. Each color plate (Cyan, Magenta, Yellow, Black) is screened at its standard newspaper angle (15°, 75°, 0°, 45°) and composited into the multi-color dot pattern of printed comics, mid-century newspaper photos and pulp paperback inserts. Halftone uses one rotation and one ink; Newsprint stacks all four separations, so the four plates make a real CMYK moiré. Use the cellSize control to set the dot pitch: wider for a chunky retro-comic look, finer for crisp magazine print. Combine it with a country or region to make editorial visuals for each market.",
    useCases: [
      "Comic-style infographics and explainer panels",
      "Pulp / retro magazine pastiches",
      "Editorial section dividers in print-feel digital articles",
    ],
  },
  aurora: {
    targetKeyword: "aurora globe animation",
    metaDescription:
      "Aurora dotted globe: flowing northern-lights bands in green, cyan, and magenta over the dot field. Live animation, prefers-reduced-motion aware.",
    longDescription:
      "Aurora lays flowing northern-lights bands over the dot field: green, cyan and magenta hues that move in two crossing sine waves, modulated by screen-space luminance so the bands follow the land. cellSize controls band frequency (wider bands at lower cellSize), and motion controls flow speed. The effect pauses automatically for users with prefers-reduced-motion enabled. It also works as a still.",
    useCases: [
      "Tech / SaaS landing hero with subtle continuous motion",
      "Conference reveal sequence into a static logo lockup",
      "Stream / podcast graphic background that doesn't compete with the talent",
    ],
  },
  pixel: {
    targetKeyword: "pixel art dotted globe",
    metaDescription:
      "Pixel-art dotted globe generator: 8-bit blocky pixelation with chunky square dots, like an indie game. Export PNG or animated WebM, MP4 or GIF.",
    longDescription:
      "Pixel is the 8-bit look: chunky square dots on a coarse grid, like early arcade games, indie pixel-art games and early-90s software. Density and dotSize together set the pixel scale: lower density with a larger dotSize gives an NES-style chunky map, and higher density gets closer to Game Boy resolution. The square dot shape is locked for this preset. Combine Pixel with a country to make splash screens for indie games, retro-themed marketing pages, or any product that wants an 8-bit feel.",
    useCases: [
      "Indie game studio website hero",
      "Retro-themed conference branding",
      "Pixel-art marketing pages for nostalgia-led products",
    ],
  },
  bayer: {
    targetKeyword: "bayer dither map",
    metaDescription:
      "Bayer dither dotted globe: classic-Mac binary 4×4 ordered dither pattern. Single-pass shader, exports to PNG and SVG.",
    longDescription:
      "Bayer is the classic-Mac dither preset: a 4×4 ordered threshold matrix that turns continuous brightness into binary on/off pixels in a geometric grid. It looks like early Mac, early console and 1980s software graphics. Unlike Halftone's round dots, the Bayer grid is square and axis aligned. cellSize controls the matrix tile pitch (4 to 16 pixels), and intensity goes from passthrough toward pure binary.",
    useCases: [
      "Retro-tech product launches and nostalgia-driven brand systems",
      `Software and SaaS pages with an "early Mac" look`,
      "Game studio sites for pixel-art or 1-bit games",
    ],
  },
  atkinson: {
    targetKeyword: "atkinson dither generator",
    metaDescription:
      "Atkinson dither dotted globe: the crunchy, blobby classic-Mac pattern. Blue-noise distribution, single-pass shader, PNG and SVG export.",
    longDescription:
      "Atkinson is Bayer's cousin, named after Bill Atkinson's Macintosh dithering algorithm. True Atkinson is error diffusion (each pixel's quantization error spreads to its neighbors). This preset gets Atkinson's clustered, blobby pixel groups from a single-pass blue-noise hash-threshold approximation instead. The result is crunchier and less regular than Bayer's even grid, with dark regions clustering tighter, which is Atkinson's defining trait. It looks closer to early HyperCard, MacPaint and System 6 graphics than Bayer does.",
    useCases: [
      "Mac-nostalgic indie software product pages",
      "Vintage computing meetup branding",
      "Print-feel illustration for retrospective design articles",
    ],
  },
  wireframe: {
    targetKeyword: "wireframe globe map",
    metaDescription:
      "Wireframe dotted globe: edge-traced outlines on a grid with hexagonal dots. Looks like a technical drawing. Export PNG and SVG.",
    longDescription:
      "Wireframe reduces the globe to its lines: edge-detected outlines traced over a hexagonal dot grid, with the graticule showing at higher intensity. It looks like a technical drawing. The edge threshold controls outline sensitivity (lower gives thicker, bolder outlines; higher gives finer, sketchier lines). Use the flat view for technical documents and infrastructure-as-code visuals, or the globe view for engineering and science launches.",
    useCases: [
      "Developer-tool product pages",
      "Architecture and engineering portfolio sites",
      "Scientific / research publication headers",
    ],
  },
  crt: {
    targetKeyword: "crt scanline globe",
    metaDescription:
      "CRT dotted globe with scanlines, phosphor glow, and screen curvature. Retro display aesthetic, animated. PNG and WebM export.",
    longDescription:
      "CRT renders the globe through a simulated cathode-ray phosphor display: horizontal scanlines, screen curvature, color bleed and the soft bloom of a 70s or 80s television. scanlines controls line density, intensity controls how strongly the phosphor glow blooms, and warp adds the barrel distortion. Combine it with the Bloom-style glow settings for conference openers, retro-tech product pages or anything that wants an 80s computer look.",
    useCases: [
      "80s-aesthetic product launches",
      "Retro-gaming and synthwave brand systems",
      "Conference / podcast intro graphics",
    ],
  },
  glitch: {
    targetKeyword: "glitch dotted globe",
    metaDescription:
      "Glitch dotted globe with horizontal slice displacement, channel splits and scanline tears, like a broken signal. Animated, with PNG and WebM export.",
    longDescription:
      "Glitch breaks the signal: horizontal slice displacement, RGB channel splits, scanline tears and random grain. It looks like a broken video signal. split controls how far the channels separate, motion controls how fast the artifacts shift over time, and scanlines adds the tear lines. It suits one-off launch graphics better than long-running backgrounds.",
    useCases: [
      "Music / record label sites for electronic genres",
      "Launch teasers and pre-reveal mystery graphics",
      "Cyberpunk-aesthetic conference branding",
    ],
  },
  badtv: {
    targetKeyword: "vhs analog distortion globe",
    metaDescription:
      "Bad TV dotted globe with VHS analog distortion, grain, and motion roll. Retro-tape aesthetic. Export PNG, SVG, WebM, MP4 or GIF.",
    longDescription:
      "Bad TV imitates a worn-out VHS tape: heavy analog grain, soft motion roll, channel ghosting and the color shift you get when the heads need cleaning. It differs from CRT, which imitates the screen, and Glitch, which imitates digital errors. grain controls noise density and motion controls roll speed. It pairs well with a country selection for retro tourism-board pastiches and mockumentary openers.",
    useCases: [
      "Mockumentary and faux-archival video opener graphics",
      "Vaporwave / retro music project branding",
      "Lo-fi podcast cover art and stream backgrounds",
    ],
  },
  bloom: {
    targetKeyword: "glowing globe animation",
    metaDescription:
      "Bloom dotted globe with a soft aurora glow over the dots. Animated, with PNG and WebM export.",
    longDescription:
      "Bloom adds an Unreal-style bloom pass over the dot field: every bright dot gets a soft halo, the brightness lifts the whole image, and the atmosphere shader paints a wide aurora glow around the sphere. It suits SaaS landing pages and product hero graphics in fintech, healthtech and consumer products. intensity controls overall bloom strength, and warp softens the edges.",
    useCases: [
      "SaaS landing-page hero graphics",
      "Consumer product launches in fintech, healthtech, or wellness",
      "Investor deck closers and final-slide visuals",
    ],
  },
  metal: {
    targetKeyword: "chrome metallic globe",
    metaDescription:
      "Metal dotted globe with polished chrome reflections and screen-space environment. Hexagonal dots. PNG and WebM.",
    longDescription:
      "Metal renders each dot as a chrome reflection sample: screen-space environment mapping fakes a four-stop sky-to-ground gradient and projects it onto every dot, so the sphere looks like polished metal. The hexagonal dot shape is locked for this preset. Use it for hardware, car or electronics product pages. motion slowly animates the reflection so static screenshots look less artificial.",
    useCases: [
      "Consumer-electronics product launches",
      "Automotive and engineering brand systems",
      "Conference branding for hardware-focused events",
    ],
  },
  pencil: {
    targetKeyword: "pencil sketch globe",
    metaDescription:
      "Pencil-sketch dotted globe: cross-hatched outlines in four layers at 20° and -30° angles. Looks hand drawn. Export PNG and SVG.",
    longDescription:
      "Pencil renders the globe as a cross-hatched sketch: four layers of hatching at offset angles (20°, -30°) imitate a real pencil's directional strokes, with the dot field giving the underlying form. It looks hand drawn. Use Pencil for design content (blog posts, design book covers, illustrator portfolios), for editorial features that should feel less digital, and for craft or handmade brands. intensity controls hatching density, and cellSize adjusts the pencil-stroke pitch.",
    useCases: [
      "Editorial illustration in design publications",
      "Craft / handmade brand systems",
      "Travel-feature article headers and section dividers",
    ],
  },
  iridescent: {
    targetKeyword: "iridescent foil map",
    metaDescription:
      "Iridescent foil dotted globe: Fresnel-driven HSV cycle with procedural sparkle. Pearlescent material, animated. Export PNG and WebM.",
    longDescription:
      "Iridescent applies a Fresnel-driven HSV cycle across the dot field, with procedural sparkle on top. Depending on the motion setting it looks like holographic foil, pearlescent paint or fish-scale shimmer. The same foil look shows up in Y2K-revival branding and credit-card marketing. The hue cycles over time (paused under prefers-reduced-motion), and cellSize sets the sparkle density. Use it with the globe view for hero graphics.",
    useCases: [
      "Y2K-revival fashion and lifestyle brand systems",
      "Membership and credit-card product pages",
      "Conference branding for design and creative-tech events",
    ],
  },
  corrupt: {
    targetKeyword: "datamosh globe generator",
    metaDescription:
      "Corrupt dotted globe with 8-color binary RGB quantization and channel-corrupted datamosh. Glitchy art-school aesthetic. PNG and WebM exports.",
    longDescription:
      "Corrupt quantizes the dot field to an 8-color binary RGB palette (pure red, green, blue, cyan, magenta, yellow, white and black), then adds channel-corruption artifacts on top: column-shifted color planes, vertical bands of misapplied chroma, and the datamosh smearing of compression artifacts gone wrong. It's the harshest preset in the library, made for glitch-art and noise-music projects. cellSize controls the band width, and motion controls how fast the corruption animates.",
    useCases: [
      "Electronic-music album art and label sites",
      "Glitch-art exhibition catalog covers",
      "Anti-corporate / critical-design publication headers",
    ],
  },
  toon: {
    targetKeyword: "cel shaded map generator",
    metaDescription:
      "Toon dotted globe: cel-shaded pop-art pass with bright cyan dots, a soft glow, and a flat blue ground. Comic-book aesthetic, exportable.",
    longDescription:
      "Toon flattens the dot-field shading into a couple of discrete tonal bands, the same trick cel-shaded animation uses so it looks drawn. With a saturated cyan dot color and a glowing globe shell, the result sits somewhere between a Roy Lichtenstein panel and a Saturday-morning cartoon establishing shot. It fits pop-art editorial work, brand systems with an animated character, and layouts that already use bold flat colors and high-contrast outlines. intensity sets the tonal banding, from subtle (almost a soft posterize) to a hard cel-shaded look.",
    useCases: [
      "Pop-art editorial and zine covers",
      "Animated brand-system spots with a cartoon character voice",
      "Children's-book or YA publication interior spreads",
    ],
  },
  threshold: {
    targetKeyword: "two tone dotted map generator",
    metaDescription:
      "Threshold dotted globe: a black and white binary print look with paper grain. Export PNG and SVG.",
    longDescription:
      "Threshold puts every dot in one of two states, on or off, based on a luminance cutoff, then adds a fine paper grain across the field so the flat areas don't look digital. The result is a stark print look, closer to a screen-printed black-and-white poster than to a photo. Magazines use this look when an image sits next to heavy type. The threshold control shifts the cutoff (lower values keep more of the field on, higher values give sparser, more graphic images). Use the flat view for newsprint-style spreads or the globe view for stark cover artwork.",
    useCases: [
      "Editorial magazine covers and section openers",
      "Black-and-white screen-print poster design",
      "Minimalist annual report dividers",
    ],
  },
  vapor: {
    targetKeyword: "synthwave dotted globe generator",
    metaDescription:
      "Vapor dotted globe: pastel pink dots with RGB chromatic aberration on a deep purple ground. Synthwave / vaporwave aesthetic, exportable.",
    longDescription:
      "Vapor takes the chromatic-aberration RGB split of 2020s vaporwave and synthwave design and lays it across the dot field: pastel pink dots on a deep midnight-purple ground, split a few pixels into red and blue channels. It looks like a still from a Miami Vice title card, or a 1985 album cover left out in the sun. Use it for synthwave EP covers, late-night brands and gaming product launches. split sets how far the colors separate, and intensity controls how much of the original dot color shows through underneath.",
    useCases: [
      "Synthwave / vaporwave EP and album art",
      "Late-night SaaS or gaming product launches",
      "Cyberpunk-adjacent editorial spreads and zines",
    ],
  },
  topographic: {
    targetKeyword: "sonar dotted globe",
    metaDescription:
      "Sonar dotted globe: ring-shaped dots in phosphor green on a near-black screen, bent into waves with a red and blue fringe. Export PNG, SVG, WebM, MP4 or GIF.",
    longDescription:
      "Sonar draws every dot as a ring and runs the wave shader over the globe, so the rings ripple like the blips on a sonar or radar screen, with the red and blue channels pulled off to each side. The background stays near black, so the green reads like an old phosphor display. Use it for security and monitoring products, tracking and signal stories, or sci-fi interfaces. warp sets how far the rings bend, split sets the color fringe, and motion sets how fast the waves move.",
    useCases: [
      "Security, monitoring and network product launches",
      "Maritime, aviation and tracking data stories",
      "Sci-fi interfaces and game backgrounds",
    ],
  },
};

export const getPresetSeo = (presetId) => presetSeo[presetId] || null;

// The page's one H1: the look's name on /looks/:id, the generator pitch on
// "/". App.jsx renders it visually hidden over the canvas, so each look page
// gets its own H1 instead of sharing the home one.
export const pageHeading = (preset) =>
  preset
    ? `${preset.name} dotted map and 3D globe look`
    : "Free dotted map and 3D globe generator with PNG, SVG, WebM, MP4, GIF and embed export";
