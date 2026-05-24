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
      "Clean dotted map and 3D globe generator. White dots on dark background, smooth rotation, no shader effects. Export PNG, SVG, or WebM.",
    longDescription:
      "The Default look is the unstyled starting point — white dots arranged across the world map, rotating gently on a dark background. No shader effects, no overlays, no print aesthetics. It reads as a neutral piece of geographic data visualization rather than a styled treatment, which is why it works as the safe default for landing pages, headers, and decks where the dotted globe is supporting the story rather than being the story. Tweak density, dot shape, and color from here to find your own variation, or use it as-is for a clean motion-design moment that respects the rest of your composition.",
    useCases: [
      "Landing-page hero behind a headline",
      "Conference slide background where attention belongs elsewhere",
      "Brand system base that designers customize per project",
    ],
  },
  halftone: {
    targetKeyword: "halftone dotted map generator",
    metaDescription:
      "Halftone dotted globe generator — circular print-style dots that scale by brightness. Newspaper aesthetic with one-click export. Free, open source.",
    longDescription:
      "Halftone is the print-aesthetic preset. Circular dots scale by brightness, evoking the look of mid-century newspaper photo reproduction and magazine spreads where a black-and-white image was screened down to a grid of varying dots. The pattern reads as deliberate and tactile — a designed choice rather than an unfiltered render. Use Halftone when you want the globe to feel like it could have come out of a printer. The cellSize control adjusts the dot pitch (smaller cell = finer halftone, denser pattern), and intensity blends from a soft Halftone toward an aggressive binary pattern that approaches Bayer territory at the maximum.",
    useCases: [
      "Magazine spread or editorial header where print feel matters",
      "Annual report covers and section dividers",
      "Vinyl sleeve or risograph-adjacent print collateral",
    ],
  },
  risograph: {
    targetKeyword: "risograph map generator",
    metaDescription:
      "Risograph dotted globe — pink + cyan ink with misregistration offset and paper grain. The 2025 illustration trend, generated from any country.",
    longDescription:
      `Risograph captures the look of a two-ink riso print: fluorescent pink and federal blue layers offset by a few pixels for the classic misregistration glow, plus a paper-grain noise overlay that breaks up the flats. It's the 2025-2026 illustration trend rendered live — designed for projects that want the tactile, slightly-imperfect feel of analog print without committing to a real riso machine. The split control tunes how aggressive the misregistration is (zero is a clean two-color print, higher values produce the "wildly off-register" look). intensity blends from soft riso toward full saturation. Pair with the flat view for editorial spreads or the globe view for spread headers and section openers.`,
    useCases: [
      "Indie magazine and zine layouts",
      "Print-adjacent merch (posters, stickers, lookbooks)",
      "Editorial illustration headers in design newsletters",
    ],
  },
  newsprint: {
    targetKeyword: "newsprint map generator",
    metaDescription:
      "Newsprint dotted map with CMYK halftone — four-channel screen rotated like a real newspaper press. Export PNG and SVG of any country.",
    longDescription:
      "Newsprint is the four-channel CMYK halftone — each color plate (Cyan, Magenta, Yellow, Black) is screened at its canonical newspaper rotation (15°, 75°, 0°, 45°) and composited into the dotted multi-color pattern you'd find in printed comics, mid-century newspaper photos, and pulp paperback inserts. Unlike Halftone (single rotation, single ink), Newsprint stacks all four separations so you get the real CMYK moiré rather than a stylized approximation. Use the cellSize control to set the dot pitch — wider for chunky retro-comic feel, finer for crisp magazine-quality reproduction. Pair with country or region selection to build per-market editorial visuals that feel hand-crafted.",
    useCases: [
      "Comic-style infographics and explainer panels",
      "Pulp / retro magazine pastiches",
      "Editorial section dividers in print-feel digital articles",
    ],
  },
  aurora: {
    targetKeyword: "aurora globe animation",
    metaDescription:
      "Aurora dotted globe — flowing northern-lights bands in green, cyan, and magenta over the dot field. Live animation, prefers-reduced-motion aware.",
    longDescription:
      `Aurora layers flowing northern-lights bands over the dot field — green, cyan, and magenta hues that move in two crossing sinusoidal waves, modulated by screen-space luminance so the bands appear to track the land rather than splashing across empty ocean. It's the atmospheric, "feel" preset: the globe stays anchored as the design element while the aurora handles motion. cellSize controls band frequency (wider bands at lower cellSize), motion controls flow speed. The whole effect automatically pauses for users with prefers-reduced-motion enabled — Aurora is calibrated to look interesting both animated and still, which is rare for a motion-heavy preset.`,
    useCases: [
      "Tech / SaaS landing hero with subtle continuous motion",
      "Conference reveal sequence into a static logo lockup",
      "Stream / podcast graphic background that doesn't compete with the talent",
    ],
  },
  pixel: {
    targetKeyword: "pixel art dotted globe",
    metaDescription:
      "Pixel-art dotted globe generator — 8-bit blocky pixelation with chunky square dots. Indie game aesthetic, exportable as PNG or animated WebM.",
    longDescription:
      "Pixel is the 8-bit treatment — chunky square dots arranged at a coarse grid, evoking the look of early arcade games, indie pixel-art studios, and early-90s software UI. Density and dotSize together control the pixelation scale: lower density with larger dotSize produces the iconic NES-style chunky map, while higher density approaches a Game Boy resolution. Square dot shape is locked in to maintain the aesthetic. Pair Pixel with the country selection to build per-market splash screens for indie games, retro-themed marketing pages, or any product that wants to lean into 8-bit nostalgia without committing to a full pixel-art design system.",
    useCases: [
      "Indie game studio website hero",
      "Retro-themed conference branding",
      "Pixel-art marketing pages for nostalgia-led products",
    ],
  },
  bayer: {
    targetKeyword: "bayer dither map",
    metaDescription:
      "Bayer dither dotted globe — classic-Mac binary 4×4 ordered dither pattern. Single-pass shader, exportable, perfect for retro-tech aesthetics.",
    longDescription:
      `Bayer is the classic-Mac dither preset — a 4×4 ordered threshold matrix that converts continuous brightness into binary on/off pixels with a distinctive geometric grid pattern. Designed for retro-tech aesthetics, Bayer reads instantly as "early Macintosh," "early console game," or "1980s-90s software UI." The pattern is fundamentally different from Halftone's circular dots — Bayer's grid is square and visibly axis-aligned, which gives it the "crunchy" digital character that designers reach for when they want a specifically retro-computing visual. cellSize controls the matrix tile pitch (4-16 pixels), and intensity blends from passthrough toward pure binary.`,
    useCases: [
      "Retro-tech product launches and nostalgia-driven brand systems",
      `Software / SaaS pages that lean into the "early Mac" aesthetic`,
      "Game studio sites for pixel-art or 1-bit games",
    ],
  },
  atkinson: {
    targetKeyword: "atkinson dither generator",
    metaDescription:
      "Atkinson dither dotted globe — the iconic 'crunchy' classic-Mac blobby pattern. Blue-noise distribution, single-pass shader, exportable PNG/SVG.",
    longDescription:
      `Atkinson is the cousin of Bayer, named after Bill Atkinson's iconic Macintosh dithering algorithm. While true Atkinson is error-diffusion (each pixel's quantization error propagates to its neighbors), this preset produces Atkinson's signature visual character — clustered blobby pixel groupings — via a single-pass blue-noise hash-threshold approximation. The result reads as the crunchier, more organic cousin of Bayer's even grid, with dark regions clustering tighter (Atkinson's defining trait). For designers building products with a Mac-classic aesthetic, this captures the specific "feel" of early HyperCard, MacPaint, and System 6 graphics that Bayer alone doesn't quite reach.`,
    useCases: [
      "Mac-nostalgic indie software product pages",
      "Vintage computing meetup branding",
      "Print-feel illustration for retrospective design articles",
    ],
  },
  wireframe: {
    targetKeyword: "wireframe globe map",
    metaDescription:
      "Wireframe dotted globe — edge-traced outlines on a grid with hexagonal dots. Schematic, technical, blueprint-aesthetic. Export PNG and SVG.",
    longDescription:
      "Wireframe strips the globe down to its essential lines — edge-detected outlines traced over a hexagonal dot grid, with the underlying graticule visible at higher intensity. The effect reads as technical, schematic, blueprint-aesthetic. Use Wireframe when the design needs to feel engineered or architectural rather than illustrated. The edge threshold controls outline sensitivity (lower = thicker, more confident outlines; higher = finer, more sketch-like lines). Pair with the flat view for technical documents and infrastructure-as-code visuals, or the globe view for product launches positioning around precision, engineering, or scientific themes.",
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
      `CRT renders the globe through a simulated cathode-ray phosphor display — horizontal scanlines, screen curvature, color bleed, and the subtle bloom you'd see on a 70s or 80s television. The effect is calibrated to look genuinely "retro" rather than the cartoon-CRT pastiche common in style libraries. scanlines controls line density, intensity controls how aggressively the phosphor glow blooms, and warp adds the characteristic barrel distortion. Pair with the Bloom-adjacent glow settings to build conference openers, retro-tech product pages, or any visual that wants to evoke the 80s computer aesthetic without dropping into outright cliché.`,
    useCases: [
      "80s-aesthetic product launches",
      "Retro-gaming and synthwave brand systems",
      "Conference / podcast intro graphics",
    ],
  },
  glitch: {
    targetKeyword: "glitch dotted globe",
    metaDescription:
      "Glitch dotted globe — horizontal slice displacement, channel splits, scanline tears. Broken-signal aesthetic, animated, PNG and WebM exports.",
    longDescription:
      `Glitch breaks the signal — horizontal slice displacement, RGB channel splits, scanline tears, and random grain. The preset reads as "broken transmission," "data corruption mid-render," or "VHS tracking error" depending on how the controls are tuned. split controls how aggressive the channel separation is, motion controls how fast the glitch artifacts shift over time, and scanlines adds the tear lines that complete the "broken video signal" character. Use Glitch sparingly — it's a high-impact preset that works best as a punctuation moment in a campaign or a one-off launch graphic rather than a long-running background.`,
    useCases: [
      "Music / record label sites for electronic genres",
      "Launch teasers and pre-reveal mystery graphics",
      "Cyberpunk-aesthetic conference branding",
    ],
  },
  badtv: {
    targetKeyword: "vhs analog distortion globe",
    metaDescription:
      "Bad TV dotted globe with VHS analog distortion, grain, and motion roll. Retro-tape aesthetic. Export PNG, SVG, or WebM.",
    longDescription:
      "Bad TV simulates the look of a worn-out VHS tape — heavy analog grain, soft motion roll, channel ghosting, and the kind of color shift you'd see when the heads need cleaning. It's a related but distinct aesthetic from CRT (which is about the display) and Glitch (which is about digital corruption) — Bad TV is about the tape itself. grain controls noise density, motion controls roll speed. The preset pairs well with the country selection for retro tourism-board pastiches, mockumentary openers, and any project where the design wants to feel like it was rescued from an attic of unmarked cassettes.",
    useCases: [
      "Mockumentary and faux-archival video opener graphics",
      "Vaporwave / retro music project branding",
      "Lo-fi podcast cover art and stream backgrounds",
    ],
  },
  bloom: {
    targetKeyword: "glowing globe animation",
    metaDescription:
      "Bloom dotted globe with soft glowing aurora over the dot field. Atmospheric, brand-friendly, animated. Export PNG and WebM.",
    longDescription:
      `Bloom adds an Unreal-style bloom pass over the dot field — every bright dot gets a creamy halo, the brightness lifts the whole composition, and the atmosphere shader paints a wide aurora glow around the sphere. It's the "premium / brand-friendly" preset — the one that reads as polished marketing material rather than experimental design. Bloom is the right starting point for SaaS landing pages, fintech / healthtech / consumer product hero graphics, and any context where the globe needs to feel inviting rather than gritty. intensity controls overall bloom strength, warp softens the edges.`,
    useCases: [
      "SaaS landing-page hero graphics",
      "Consumer product launches in fintech, healthtech, or wellness",
      "Investor deck closers and final-slide visuals",
    ],
  },
  metal: {
    targetKeyword: "chrome metallic globe",
    metaDescription:
      "Metal dotted globe with polished chrome reflections and screen-space environment. Hexagonal dots, premium material aesthetic. PNG and WebM.",
    longDescription:
      `Metal renders each dot as a chrome reflection sample — screen-space environment mapping fakes a four-stop sky-to-ground gradient and projects it onto every dot, producing the look of a polished metal sphere. The hexagonal dot shape (locked in for this preset) enhances the "machined surface" character. Use Metal for premium-tech brand systems, luxury product pages, automotive launches, and any context where the design needs to feel engineered and reflective. motion gently animates the reflection over time so static screenshots feel less artificial.`,
    useCases: [
      "Premium consumer-electronics product launches",
      "Automotive and engineering brand systems",
      "Conference branding for hardware-focused events",
    ],
  },
  pencil: {
    targetKeyword: "pencil sketch globe",
    metaDescription:
      "Pencil-sketch dotted globe — cross-hatched outlines in four layers at 20°/-30° angles. Hand-drawn aesthetic, exportable PNG and SVG.",
    longDescription:
      "Pencil renders the globe as a cross-hatched sketch — four layers of hatching at offset angles (20°, -30°) approximate a real pencil's directional strokes, with the dot field providing the underlying form. The effect reads as hand-drawn, illustrative, editorial. Use Pencil for design content (blog posts, design book covers, illustrator portfolios), for editorial features that need to feel less digital, and for products positioning around craft, slowness, or analog warmth. intensity controls hatching density, and the cellSize control adjusts the pencil-stroke pitch.",
    useCases: [
      "Editorial illustration in design publications",
      "Craft / handmade brand systems",
      "Travel-feature article headers and section dividers",
    ],
  },
  iridescent: {
    targetKeyword: "iridescent foil map",
    metaDescription:
      "Iridescent foil dotted globe — Fresnel-driven HSV cycle with procedural sparkle. Pearlescent material, animated. Export PNG and WebM.",
    longDescription:
      "Iridescent applies a Fresnel-driven HSV cycle across the dot field, with procedural sparkle layered on top — the result reads as holographic foil, pearlescent paint, or fish-scale shimmer depending on the motion setting. It's the awwwards-2026 darling — the same general aesthetic showing up across modern product launches, Y2K-revival brand systems, and credit-card / membership-card marketing. The hue cycles over time (paused under prefers-reduced-motion), and the cellSize control tunes sparkle density. Pair Iridescent with the globe view for hero graphics that feel premium and contemporary.",
    useCases: [
      "Y2K-revival fashion and lifestyle brand systems",
      "Premium membership / credit-card product pages",
      "Conference branding for design and creative-tech events",
    ],
  },
  corrupt: {
    targetKeyword: "datamosh globe generator",
    metaDescription:
      "Corrupt dotted globe with 8-color binary RGB quantization and channel-corrupted datamosh. Glitchy art-school aesthetic. PNG and WebM exports.",
    longDescription:
      `Corrupt quantizes the dot field to an 8-color binary RGB palette — pure red, green, blue, cyan, magenta, yellow, white, and black — then layers channel-corruption artifacts on top: column-shifted color planes, vertical bands of mis-applied chroma, and the characteristic "datamosh" smearing of compression artifacts gone wrong. It's the most aggressive preset in the library, designed for projects that want to lean fully into the glitch-art / breakcore / harsh-noise aesthetic rather than just nodding at it. cellSize controls the band width, motion controls how fast the corruption animates. Use sparingly.`,
    useCases: [
      "Electronic-music album art and label sites",
      "Glitch-art exhibition catalog covers",
      "Anti-corporate / critical-design publication headers",
    ],
  },
  toon: {
    targetKeyword: "cel shaded map generator",
    metaDescription:
      "Toon dotted globe — cel-shaded pop-art pass with bright cyan dots, a soft glow, and a flat blue ground. Comic-book aesthetic, exportable.",
    longDescription:
      "Toon flattens the dot-field shading into a couple of discrete tonal bands — the same trick a cel-shaded animation cel pulls to read as 'drawn' instead of 'rendered.' Paired with a saturated cyan dot color and a glow-true globe shell, the result lands somewhere between a Roy Lichtenstein panel and a Saturday-morning cartoon establishing shot. Use Toon when you want the globe to feel illustrated rather than photographed — it slots cleanly into pop-art editorial work, brand systems with an animated character, and any layout that already leans into bold flats and high-contrast outlines. Adjust intensity to dial the tonal banding from subtle (almost a soft posterize) toward the most aggressive cel-shaded read.",
    useCases: [
      "Pop-art editorial and zine covers",
      "Animated brand-system spots with a cartoon character voice",
      "Children's-book or YA publication interior spreads",
    ],
  },
  threshold: {
    targetKeyword: "two tone dotted map generator",
    metaDescription:
      "Threshold dotted globe — pure black and white binary print look with paper grain. Editorial minimalism, exportable to PNG and SVG.",
    longDescription:
      "Threshold drops every dot into one of exactly two states — on or off — based on a luminance cutoff, then sprinkles a fine paper grain across the field so the flats don't read as digital. The effect is an extreme minimalist print look, closer to a screen-printed black-and-white poster than to a photo. It's the aesthetic that magazines reach for when an image needs to feel reduced to its essence: high editorial impact, no color noise, no shading to argue with the type. Tune the threshold control to shift the cutoff (lower values keep more of the field 'on', higher values produce sparser, more graphic compositions). Pair with the flat view for newsprint-style spreads or the globe view for stark cover artwork.",
    useCases: [
      "Editorial magazine covers and section openers",
      "Black-and-white screen-print poster design",
      "Minimalist annual report dividers",
    ],
  },
  vapor: {
    targetKeyword: "synthwave dotted globe generator",
    metaDescription:
      "Vapor dotted globe — pastel pink dots with RGB chromatic aberration on a deep purple ground. Synthwave / vaporwave aesthetic, exportable.",
    longDescription:
      "Vapor takes the chromatic-aberration RGB split that defines 2020s vaporwave / synthwave design and lays it across the dot field. Pastel pink dots on a deep midnight-purple ground, separated by a few pixels into red and blue channels — the result reads as a still frame from a Miami Vice title card or a 1985 album cover that's been left out in the sun. Use Vapor for projects that want to lean fully into the retrowave aesthetic: synthwave EP covers, late-night brand systems, gaming-adjacent product launches, anything that asks for a neon-on-night-sky mood. Tune split for how aggressive the chromatic separation is; intensity controls how much of the original dot color comes through underneath.",
    useCases: [
      "Synthwave / vaporwave EP and album art",
      "Late-night SaaS or gaming product launches",
      "Cyberpunk-adjacent editorial spreads and zines",
    ],
  },
  topographic: {
    targetKeyword: "topographic dotted map generator",
    metaDescription:
      "Topographic dotted globe — warped contour-line cartography in sage on a deep teal ground. Hiking-map aesthetic, exportable to PNG and SVG.",
    longDescription:
      "Topographic uses the wave-distortion shader to push the dot field into rolling concentric ridges, evoking the contour lines of a USGS hiking map. Sage-green dots on a deep teal-black ground, with the distortion strong enough to read as terrain but soft enough to keep the underlying geographic shapes legible. Use Topographic for outdoor brands, hiking / adventure publications, climate-data storytelling, any project where the globe should feel like a relief map rather than a flat dot field. Tune warp for how dramatic the contours are; motion controls the animation speed if you want the ridges to drift slowly.",
    useCases: [
      "Outdoor / hiking / adventure brand systems",
      "Climate and earth-science data storytelling",
      "Wilderness photography portfolios and editorial",
    ],
  },
};

export const getPresetSeo = (presetId) => presetSeo[presetId] || null;
