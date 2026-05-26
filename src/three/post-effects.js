import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { ShaderPass } from "three/addons/postprocessing/ShaderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";

export const EFFECT_INDEX = {
  none: 0,
  chromatic: 1,
  crt: 2,
  halftone: 3,
  pixel: 4,
  threshold: 5,
  glitch: 6,
  edge: 7,
  wave: 8,
  bloomEnhance: 9,
  metal: 10,
  pencil: 11,
  toon: 12,
  stripes: 13,
  badtv: 14,
  rgb: 15,
  chroma: 16,
  corrupt: 17,
  bayer: 18,
  iridescent: 19,
  risograph: 20,
  newsprint: 21,
  aurora: 22,
  atkinson: 23,
};

const VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  precision highp float;

  uniform sampler2D tDiffuse;
  uniform vec2 uResolution;
  uniform float uTime;
  uniform float uEffect;
  uniform float uIntensity;
  uniform float uSplit;
  uniform float uGrain;
  uniform float uScanlines;
  uniform float uCellSize;
  uniform float uThreshold;
  uniform float uWarp;
  uniform float uMotion;
  uniform vec3 uInk;
  uniform float uPreserveBg;
  // Bg-only texture sampled at the same uv as tDiffuse. Composited
  // behind the effect output via the mix at the end of main(). Lets
  // pattern shaders (halftone etc.) mark only the globe while the
  // starfield bg shows cleanly in the gaps.
  uniform sampler2D uBgTexture;

  varying vec2 vUv;

  const float PI = 3.14159265359;

  float rand(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }

  float random1d(float dt) {
    return fract(sin(mod(dt, 3.14)) * 43758.5453);
  }

  // 1-D smooth value noise — interpolates between random1d at integer
  // anchors via smoothstep. Used by the badtv pass for slow-amplitude
  // noise that drives the UV jitter.
  float noise1d(float value) {
    float i = floor(value);
    float f = fract(value);
    return mix(random1d(i), random1d(i + 1.0), smoothstep(0.0, 1.0, f));
  }

  float luma(vec3 c) {
    return dot(c, vec3(0.299, 0.587, 0.114));
  }

  // Smooth value noise — bilinear interpolation between hash-random
  // anchors at integer lattice points. Building block for FBM below.
  float valueNoise2(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = rand(i);
    float b = rand(i + vec2(1.0, 0.0));
    float c = rand(i + vec2(0.0, 1.0));
    float d = rand(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  // 4-octave FBM (fractal Brownian motion). Each octave doubles the
  // frequency and halves the amplitude, giving rich multi-scale texture
  // that reads as paper-fiber grain instead of uniform hash noise.
  // Same technique used by paper.design's paper-texture shader (with
  // hash-random instead of a noise-texture sample so we don't need an
  // extra texture upload).
  float fbm4(vec2 n) {
    float total = 0.0;
    float amp = 0.5;
    for (int i = 0; i < 4; i++) {
      total += valueNoise2(n) * amp;
      n *= 2.02;
      amp *= 0.55;
    }
    return total;
  }

  // Fibre-like streak noise — FBM sampled in an anisotropically
  // stretched coordinate space so the noise lobes elongate along a
  // direction, mimicking the fibres in pressed paper. Returns roughly
  // 0..1 with a soft bias toward the mid-range for natural grain.
  float fiberNoise(vec2 p) {
    vec2 stretched = vec2(p.x * 0.32, p.y * 2.8);
    float a = fbm4(stretched * 1.7);
    float b = fbm4(stretched.yx * 1.3 + 17.0);
    return mix(a, b, 0.45);
  }

  // Composite paper grain: combines fine multi-octave noise (the surface
  // tooth) with the fibre noise (directional streaks) for a tactile
  // pressed-paper look. Output centred at 0 with range ~[-0.5, 0.5].
  float paperGrain(vec2 uv, float scale) {
    vec2 p = uv * uResolution / max(scale, 2.0);
    float fine = fbm4(p * 2.3);
    float fiber = fiberNoise(p * 0.45);
    return mix(fine, fiber, 0.55) - 0.5;
  }

  vec2 rotateUv(vec2 uv, float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return mat2(c, -s, s, c) * uv;
  }

  vec4 sampleTex(vec2 uv) {
    if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) return vec4(0.0);
    return texture2D(tDiffuse, uv);
  }

  // Returns 1 inside a horizontal stroke of the given width centred at
  // yPos, smoothly anti-aliased over a 2-pixel feather. Lifted from the
  // canonical webgl-shaders pencil example.
  float horizontalLine(vec2 pixel, float yPos, float width) {
    return 1.0 - smoothstep(-1.0, 1.0, abs(pixel.y - yPos) - 0.5 * width);
  }

  vec2 barrelWarp(vec2 uv, float k) {
    vec2 c = uv * 2.0 - 1.0;
    float r2 = dot(c, c);
    c *= 1.0 + r2 * k;
    return c * 0.5 + 0.5;
  }

  vec4 chromaticPass(vec2 uv) {
    vec2 c = uv - 0.5;
    float d = length(c);
    vec2 dir = normalize(c + vec2(0.0001));
    float wave = sin((uv.y * 18.0 + uv.x * 7.0) + uTime * mix(0.4, 6.0, uMotion));
    vec2 warpedUv = uv + c * d * d * uWarp * uIntensity * 0.22;
    vec2 offset = dir * (uSplit * (0.6 + d * 2.4)) / max(uResolution, vec2(1.0));
    offset += vec2(-dir.y, dir.x) * wave * 0.25 * uSplit / max(uResolution, vec2(1.0));
    vec4 r = sampleTex(warpedUv + offset);
    vec4 g = sampleTex(warpedUv);
    vec4 b = sampleTex(warpedUv - offset);
    return vec4(r.r, g.g, b.b, max(max(r.a, g.a), b.a));
  }

  vec4 crtPass(vec2 uv) {
    vec2 warped = barrelWarp(uv, 0.04 + uWarp * uIntensity * 0.2);
    vec2 c = warped - 0.5;
    vec2 off = vec2(uSplit / max(uResolution.x, 1.0), 0.0);
    vec4 r = sampleTex(warped + off * 0.8);
    vec4 g = sampleTex(warped);
    vec4 b = sampleTex(warped - off * 0.8);
    vec3 color = vec3(r.r, g.g, b.b);

    float scan = 0.78 + 0.22 * sin(warped.y * uResolution.y * PI / max(uCellSize * 0.48, 1.0));
    color *= mix(1.0, scan, uScanlines);

    float stripe = mod(floor(warped.x * uResolution.x), 3.0);
    vec3 phosphor = stripe < 1.0
      ? vec3(1.18, 0.78, 0.78)
      : (stripe < 2.0 ? vec3(0.78, 1.16, 0.78) : vec3(0.78, 0.86, 1.2));
    color *= mix(vec3(1.0), phosphor, uScanlines * 0.55);

    float flicker = 1.0 + (rand(vec2(floor(uTime * mix(8.0, 34.0, uMotion)), 7.0)) - 0.5) * 0.12 * uIntensity;
    float vignette = smoothstep(0.86, 0.18, length(c * vec2(uResolution.x / max(uResolution.y, 1.0), 1.0)));
    color *= flicker * mix(0.42, 1.0, vignette);

    float alpha = max(max(r.a, g.a), b.a);
    float edgeAlpha = (1.0 - vignette) * (0.14 + uIntensity * 0.22);
    return vec4(color, clamp(max(alpha, edgeAlpha), 0.0, 1.0));
  }

  vec4 halftonePass(vec2 uv) {
    float cell = max(uCellSize, 3.0);
    vec2 grid = uv * uResolution / cell;
    vec2 rotated = rotateUv(grid, 0.49 + uTime * uMotion * 0.018);
    vec2 local = fract(rotated) - 0.5;
    // Average a small neighborhood so sparse content fills cells reliably.
    vec2 px = cell * 0.5 / max(uResolution, vec2(1.0));
    vec4 avg = (
      sampleTex(uv) * 0.4 +
      sampleTex(uv + vec2(px.x, 0.0)) * 0.15 +
      sampleTex(uv - vec2(px.x, 0.0)) * 0.15 +
      sampleTex(uv + vec2(0.0, px.y)) * 0.15 +
      sampleTex(uv - vec2(0.0, px.y)) * 0.15
    );
    float realSignal = max(luma(avg.rgb), avg.a);
    float density = clamp(realSignal * (1.2 + uIntensity * 1.0), 0.0, 1.0);
    // Radius scales linearly with density — at density 0, no dot at all.
    float radius = density * 0.5 * (0.85 + uIntensity * 0.35);
    float d = length(local);
    float edge = 0.04;
    // Proper inside-the-disc mask: 1 within radius, 0 outside, anti-aliased.
    float mask = 1.0 - smoothstep(max(radius - edge, 0.0), radius + edge, d);
    // Hard cutoff on the raw signal so atmosphere haze and outer-halo glow don't
    // produce a spurious dot grid across empty space.
    mask *= smoothstep(0.08, 0.2, realSignal);
    return vec4(uInk * mask, mask);
  }

  // Bayer ordered dither — classic-Mac aesthetic. Distinct from halftone:
  // halftone uses circular dots scaled by brightness, Bayer uses a fixed
  // 4x4 threshold matrix that produces a binary pixel pattern. Single pass,
  // <0.2ms at 4K. Cell size scales the matrix tile so designers can pick
  // tight (4px) or chunky (16px) look. Intensity blends with the original
  // colour so 0 = passthrough, 1 = pure binary dither.
  float bayer4(vec2 p) {
    int x = int(mod(p.x, 4.0));
    int y = int(mod(p.y, 4.0));
    // Recursive Bayer 4x4 matrix, flattened. Values 0-15 normalised to 0-1.
    int idx = x + y * 4;
    float v = 0.0;
    if (idx == 0) v = 0.0;
    else if (idx == 1) v = 8.0;
    else if (idx == 2) v = 2.0;
    else if (idx == 3) v = 10.0;
    else if (idx == 4) v = 12.0;
    else if (idx == 5) v = 4.0;
    else if (idx == 6) v = 14.0;
    else if (idx == 7) v = 6.0;
    else if (idx == 8) v = 3.0;
    else if (idx == 9) v = 11.0;
    else if (idx == 10) v = 1.0;
    else if (idx == 11) v = 9.0;
    else if (idx == 12) v = 15.0;
    else if (idx == 13) v = 7.0;
    else if (idx == 14) v = 13.0;
    else if (idx == 15) v = 5.0;
    return v / 16.0;
  }

  vec4 bayerPass(vec2 uv) {
    vec4 src = sampleTex(uv);
    // Cell size in pixels — defaults around 4 for the classic look.
    float cell = max(uCellSize * 0.5, 2.0);
    vec2 pixel = floor(uv * uResolution / cell);
    float threshold = bayer4(pixel);
    float lum = dot(src.rgb, vec3(0.299, 0.587, 0.114));
    float quantized = lum > threshold ? 1.0 : 0.0;
    // Use the brightest channel of src as the "ink" color so a coloured dot
    // field still produces a tinted dither (white dots → white pattern,
    // green dots → green pattern). Falls back to white when src is grey.
    vec3 ink = src.rgb / max(max(max(src.r, src.g), src.b), 0.0001);
    vec3 dithered = ink * quantized;
    // Intensity blends from passthrough (0) to pure dither (1).
    vec3 outRgb = mix(src.rgb, dithered, uIntensity);
    return vec4(outRgb, max(src.a, quantized * uIntensity));
  }

  // Atkinson dither — true Atkinson is error-diffusion (each pixel's
  // quantization error propagates to its neighbors), which can't run in a
  // single fragment pass. This shader produces the *visual character* of
  // Atkinson — clustered blobs, "crunchy" classic-Mac look — via a hash-
  // based threshold map that mimics blue-noise distribution.
  //
  // Compared to bayer (regular 4x4 grid), Atkinson uses a higher-frequency
  // hash that breaks up the regular grid pattern. The threshold curve is
  // shaped so dark regions cluster tightly (classic Atkinson trait) while
  // mid-tones spread evenly. Single-pass; identical perf to Bayer.
  //
  // Reference: https://en.wikipedia.org/wiki/Atkinson_dithering
  vec4 atkinsonPass(vec2 uv) {
    vec4 src = sampleTex(uv);
    float cell = max(uCellSize * 0.5, 2.0);
    vec2 pixel = floor(uv * uResolution / cell);
    // Two interleaved hashes at different scales — produces a clustered
    // blue-noise-like distribution that breaks up the regular grid.
    // Magic constants are sqrt(2) and sqrt(5)-ish to avoid axis-aligned
    // patterns. Combined hash hits the [0, 1] range with reasonable
    // blue-noise spectral character.
    float h1 = fract(sin(dot(pixel, vec2(12.9898, 78.233))) * 43758.5453);
    float h2 = fract(sin(dot(pixel * 1.7321, vec2(39.346, 11.135))) * 21421.6533);
    float threshold = mix(h1, h2, 0.55);
    // Reshape: dark regions cluster tighter (smoothstep curve pushes the
    // threshold distribution away from extremes for the characteristic
    // "blobby" Atkinson grain).
    threshold = smoothstep(0.1, 0.9, threshold);
    float lum = dot(src.rgb, vec3(0.299, 0.587, 0.114));
    float quantized = lum > threshold ? 1.0 : 0.0;
    // Same ink-preservation trick as Bayer — keep the source color's hue
    // while quantizing brightness.
    vec3 ink = src.rgb / max(max(max(src.r, src.g), src.b), 0.0001);
    vec3 dithered = ink * quantized;
    vec3 outRgb = mix(src.rgb, dithered, uIntensity);
    return vec4(outRgb, max(src.a, quantized * uIntensity));
  }

  // Iridescent / foil — Fresnel-driven HSV cycle plus procedural sparkle.
  // The "Fresnel" here is faked from screen-space luminance (dots far from
  // light = "thicker material" = more colour shift). Hue cycles over time
  // unless uTime is frozen by the reduced-motion gate. Single-pass; sparkle
  // is computed per-cell via rand() and a steep power curve so only the
  // brightest seeds survive.
  vec4 iridescentPass(vec2 uv) {
    vec4 src = sampleTex(uv);
    float lum = dot(src.rgb, vec3(0.299, 0.587, 0.114));
    // Mask the effect to the dot field so the ocean stays dark — without this
    // the entire background takes on the pearl colour and we lose the silhouette.
    float mask = smoothstep(0.06, 0.35, lum);
    float fresnel = 1.0 - lum;
    float t = uTime * mix(0.15, 0.6, uMotion);
    // Three sin waves at offsets 0/120/240° produce a smooth RGB cycle.
    vec3 hue = vec3(
      sin(fresnel * 6.28318 + t),
      sin(fresnel * 6.28318 + t + 2.09439),
      sin(fresnel * 6.28318 + t + 4.18879)
    ) * 0.5 + 0.5;
    // Procedural sparkle — only the brightest random seeds light up.
    float sparkleCell = max(uCellSize * 0.25, 2.0);
    vec2 sparkleSeed = floor(uv * uResolution / sparkleCell);
    float sparkle = pow(rand(sparkleSeed * 0.4), 14.0) * (0.6 + uGrain * 1.5);
    vec3 pearl = clamp(hue + sparkle, 0.0, 1.2);
    vec3 outRgb = mix(src.rgb, pearl, mask * uIntensity);
    return vec4(outRgb, src.a);
  }

  // Risograph — pink + cyan ink channels with misregistration offset and
  // paper grain. Designed to evoke the print press look that's everywhere
  // in 2025-2026 illustration. The two ink layers sample the source at
  // slightly different positions, quantise to 2-tone via the per-channel
  // luminance threshold, then composite as additive light on a paper
  // ground. Misregistration distance scales with uSplit (so designers can
  // tune from "perfectly registered" to "wildly off").
  vec4 risographPass(vec2 uv) {
    vec4 src = sampleTex(uv);
    // Each ink offsets in its own direction by uSplit pixels.
    vec2 pinkOff = vec2(uSplit, 0.0) / max(uResolution, vec2(1.0));
    vec2 cyanOff = vec2(-uSplit * 0.6, uSplit * 0.4) / max(uResolution, vec2(1.0));
    vec4 srcPink = sampleTex(uv + pinkOff);
    vec4 srcCyan = sampleTex(uv + cyanOff);
    // Quantise each ink layer — at 0.5 threshold it's hard binary, soften
    // a touch with smoothstep so very thin features (single-pixel strokes)
    // don't disappear entirely.
    float lumPink = dot(srcPink.rgb, vec3(0.299, 0.587, 0.114));
    float lumCyan = dot(srcCyan.rgb, vec3(0.299, 0.587, 0.114));
    float maskPink = smoothstep(0.18, 0.42, lumPink);
    float maskCyan = smoothstep(0.22, 0.46, lumCyan);
    // Classic riso "fluoro pink" + "federal blue" ink palette.
    vec3 pinkInk = vec3(1.0, 0.36, 0.62);
    vec3 cyanInk = vec3(0.25, 0.46, 0.95);
    // Multi-octave paper grain with fibre-like streaks. The old single-
    // octave hash noise gave a flat speckle that read as digital static;
    // this gives the press-paper "tooth" feel where the grain has
    // multiple scales of variation across the surface.
    float grain = paperGrain(uv, uCellSize * 0.6) * uGrain * 0.5;
    vec3 inked = pinkInk * maskPink + cyanInk * maskCyan + grain;
    // Where neither ink prints we keep the original colour (ocean stays
    // black for the dark theme). uIntensity blends toward full riso.
    float anyInk = max(maskPink, maskCyan);
    vec3 outRgb = mix(src.rgb, clamp(inked, 0.0, 1.0), anyInk * uIntensity);
    // The "src" alpha — keep what was there + boost where ink covers.
    return vec4(outRgb, max(srcPink.a, max(srcCyan.a, anyInk)));
  }

  // Newsprint — 4-channel CMYK halftone with each plate rotated at the
  // classic newspaper angles (C 15°, M 75°, Y 0°, K 45°). Unlike the
  // existing halftone pass (single rotation, single ink), this stacks all
  // four colour separations to produce the dotted multi-colour effect you
  // see in printed comics and old newspaper photos. cellSize controls the
  // halftone dot pitch; intensity blends from passthrough to full newsprint.
  // Helper: halftone dot mask at the supplied angle for the given lum.
  float halftoneDot(vec2 uv, float cell, float angleDeg, float lum) {
    float ang = radians(angleDeg);
    float ca = cos(ang);
    float sa = sin(ang);
    vec2 grid = uv * uResolution / max(cell, 2.0);
    vec2 rotated = vec2(grid.x * ca - grid.y * sa, grid.x * sa + grid.y * ca);
    vec2 local = fract(rotated) - 0.5;
    float density = clamp(lum * 1.1, 0.0, 1.0);
    float radius = density * 0.5;
    float d = length(local);
    return 1.0 - smoothstep(max(radius - 0.04, 0.0), radius + 0.04, d);
  }

  // Aurora — fullscreen post-effect adapting the atmosphere shader's
  // dual-sine wave math (see globe.js createAtmosphereMaterial) to a screen-
  // space pass. Produces flowing northern-lights bands modulated against the
  // dot field. Reduced-motion gated automatically because uTime is frozen
  // when prefers-reduced-motion is on (see globe-background.jsx ambientTime).
  vec4 auroraPass(vec2 uv) {
    vec4 src = sampleTex(uv);
    float realSignal = max(dot(src.rgb, vec3(0.299, 0.587, 0.114)), src.a);
    // Frequency scales with cellSize — bigger cell = wider bands.
    float freq = max(uCellSize, 4.0) * 0.18;
    // Two low-frequency sin waves crossing each other. Time scales with
    // motion. The 6.28 factor turns the [0,1] uv into [0, 6.28] phase space
    // so multiple bands fit on screen at typical freq values.
    float t = uTime * mix(0.18, 0.7, uMotion);
    float waveA = sin(uv.y * freq + t * 0.55) * 0.5 + 0.5;
    float waveB = sin(uv.x * freq * 0.78 - t * 0.31 + uv.y * freq * 0.46) * 0.5 + 0.5;
    float band = waveA * waveB;
    // Three-tone aurora palette: green core, cyan mid, magenta tip — classic
    // borealis colours. Mixed by band intensity.
    vec3 green = vec3(0.18, 0.95, 0.55);
    vec3 cyan = vec3(0.32, 0.84, 1.0);
    vec3 magenta = vec3(0.85, 0.42, 1.0);
    vec3 aurora = mix(green, cyan, smoothstep(0.2, 0.7, band));
    aurora = mix(aurora, magenta, smoothstep(0.65, 1.0, band));
    // Mask aurora to the dot field area so the bands appear to flow over
    // the land, not splash across empty ocean. Intensity controls overall
    // strength of the colour mix.
    float mask = smoothstep(0.04, 0.25, realSignal);
    vec3 outRgb = mix(src.rgb, src.rgb + aurora * band * 0.65, mask * uIntensity);
    return vec4(clamp(outRgb, 0.0, 1.0), src.a);
  }

  vec4 newsprintPass(vec2 uv) {
    vec4 src = sampleTex(uv);
    // Per-channel CMYK conversion. K (black) takes the min of (1-r, 1-g, 1-b);
    // each CMY is its complement minus K. Standard subtractive split.
    float k = 1.0 - max(max(src.r, src.g), src.b);
    float c = (1.0 - src.r - k) / max(1.0 - k, 0.0001);
    float m = (1.0 - src.g - k) / max(1.0 - k, 0.0001);
    float y = (1.0 - src.b - k) / max(1.0 - k, 0.0001);
    float cell = uCellSize;
    // Sample each plate at its canonical newspaper screen angle.
    float dotC = halftoneDot(uv, cell, 15.0, c);
    float dotM = halftoneDot(uv, cell, 75.0, m);
    float dotY = halftoneDot(uv, cell, 0.0, y);
    float dotK = halftoneDot(uv, cell, 45.0, k);
    // Composite over white paper. Each CMY ink subtracts from the paper;
    // K is straight black multiplication.
    vec3 paper = vec3(1.0);
    paper -= vec3(0.0, dotC, dotC) * 0.95; // cyan absorbs red
    paper -= vec3(dotM, 0.0, dotM) * 0.95; // magenta absorbs green
    paper -= vec3(dotY, dotY, 0.0) * 0.95; // yellow absorbs blue
    paper *= 1.0 - dotK * 0.95;
    paper = clamp(paper, 0.0, 1.0);
    // Hard-cutoff dim regions so the ocean stays dark instead of going to
    // white paper everywhere — only "land" pixels get the newsprint paper.
    float realSignal = max(dot(src.rgb, vec3(0.299, 0.587, 0.114)), src.a);
    float mask = smoothstep(0.05, 0.18, realSignal);
    vec3 outRgb = mix(src.rgb, paper, mask * uIntensity);
    return vec4(outRgb, max(src.a, mask * uIntensity));
  }

  vec4 pixelPass(vec2 uv) {
    float cell = max(uCellSize, 2.0);
    vec2 grid = max(uResolution / cell, vec2(1.0));
    vec2 pixUv = (floor(uv * grid) + 0.5) / grid;
    // Sample multiple subpixels and average for a clean pixel block (anti-aliased downsampling)
    vec2 px = 1.0 / max(uResolution, vec2(1.0));
    vec4 src = (
      sampleTex(pixUv) +
      sampleTex(pixUv + px * vec2(1.0, 0.0)) +
      sampleTex(pixUv - px * vec2(1.0, 0.0)) +
      sampleTex(pixUv + px * vec2(0.0, 1.0)) +
      sampleTex(pixUv - px * vec2(0.0, 1.0))
    ) * 0.2;
    float steps = mix(3.0, 9.0, uIntensity);
    vec3 col = floor(src.rgb * steps) / steps;
    vec2 local = abs(fract(uv * grid) - 0.5);
    float gridLine = smoothstep(0.48, 0.5, max(local.x, local.y));
    col -= vec3(0.04) * gridLine * src.a * uIntensity;
    return vec4(col, src.a);
  }

  vec4 thresholdPass(vec2 uv) {
    float t = uTime * mix(0.25, 4.5, uMotion);
    float drift = (rand(vec2(floor(uv.y * 32.0), floor(t * 16.0))) - 0.5) * uWarp * uIntensity * 0.04;
    vec2 warped = uv + vec2(drift, sin(uv.x * 20.0 + t) * uWarp * uIntensity * 0.005);
    vec4 src = sampleTex(warped);
    // Sample a small blurred neighborhood so even sparse dots accumulate a signal
    vec2 px = 2.5 / max(uResolution, vec2(1.0));
    float signal = max(
      max(luma(src.rgb), luma(sampleTex(warped + px).rgb)),
      max(luma(sampleTex(warped - px).rgb), luma(sampleTex(warped + vec2(px.x, -px.y)).rgb))
    );
    float alphaSignal = max(src.a, max(sampleTex(warped + px).a, sampleTex(warped - px).a));
    signal = max(signal, alphaSignal * 0.85);
    float g = (rand(uv * uResolution + floor(t * 30.0)) - 0.5) * uGrain * 0.65;
    float edge = mix(0.08, 0.02, uIntensity);
    float mask = smoothstep(uThreshold - edge, uThreshold + edge, signal + g);
    return vec4(uInk * mask, mask);
  }

  vec4 glitchPass(vec2 uv) {
    float t = uTime * mix(0.4, 8.0, uMotion);
    float seed = floor(t * 14.0);
    float bandCount = 28.0 + uIntensity * 80.0;
    float band = floor(uv.y * bandCount);
    float trigger = step(0.72 - uIntensity * 0.42, rand(vec2(seed, band)));
    float bigTrigger = step(0.94 - uIntensity * 0.2, rand(vec2(seed * 0.4, band * 0.7)));
    float shift = (rand(vec2(seed * 2.0, band)) - 0.5) * (0.06 + uIntensity * 0.24) * trigger;
    shift += (rand(vec2(seed * 3.1, band * 1.3)) - 0.5) * 0.6 * bigTrigger;
    float chromaShift = uSplit / max(uResolution.x, 1.0) * (0.8 + uIntensity * 2.4) * (0.7 + trigger);
    vec2 jUv = uv + vec2(shift, 0.0);
    vec4 r = sampleTex(jUv + vec2(chromaShift, 0.0));
    vec4 g = sampleTex(jUv);
    vec4 b = sampleTex(jUv - vec2(chromaShift, 0.0));
    vec3 color = vec3(r.r, g.g, b.b);

    // Rare full-frame inversion blip
    float inv = step(0.985, rand(vec2(seed * 0.13, 0.0))) * bigTrigger;
    color = mix(color, 1.0 - color, inv * uIntensity);

    float scanline = step(0.5, fract(uv.y * uResolution.y * 0.5));
    color *= mix(1.0, scanline * 0.55 + 0.45, uScanlines * 0.6);

    float noise = (rand(uv * uResolution + seed) - 0.5) * uGrain * 0.5;
    color += noise;

    float alpha = max(max(r.a, g.a), b.a);
    alpha = max(alpha, trigger * 0.04);
    return vec4(color, alpha);
  }

  vec4 edgePass(vec2 uv) {
    vec2 px = 1.0 / max(uResolution, vec2(1.0));
    float l = mix(0.8, 3.5, uIntensity);
    vec2 stepUv = px * l;

    // Sobel over both luma and alpha so sparse dots still produce edges
    float a0 = sampleTex(uv + vec2(-stepUv.x, -stepUv.y)).a;
    float a1 = sampleTex(uv + vec2(0.0, -stepUv.y)).a;
    float a2 = sampleTex(uv + vec2(stepUv.x, -stepUv.y)).a;
    float a3 = sampleTex(uv + vec2(-stepUv.x, 0.0)).a;
    float a5 = sampleTex(uv + vec2(stepUv.x, 0.0)).a;
    float a6 = sampleTex(uv + vec2(-stepUv.x, stepUv.y)).a;
    float a7 = sampleTex(uv + vec2(0.0, stepUv.y)).a;
    float a8 = sampleTex(uv + vec2(stepUv.x, stepUv.y)).a;

    float c0 = luma(sampleTex(uv + vec2(-stepUv.x, -stepUv.y)).rgb);
    float c2 = luma(sampleTex(uv + vec2(stepUv.x, -stepUv.y)).rgb);
    float c3 = luma(sampleTex(uv + vec2(-stepUv.x, 0.0)).rgb);
    float c5 = luma(sampleTex(uv + vec2(stepUv.x, 0.0)).rgb);
    float c6 = luma(sampleTex(uv + vec2(-stepUv.x, stepUv.y)).rgb);
    float c8 = luma(sampleTex(uv + vec2(stepUv.x, stepUv.y)).rgb);

    float lgx = -c0 - 2.0 * c3 - c6 + c2 + 2.0 * c5 + c8;
    float lgy = -c0 - 2.0 * a1 - c2 + c6 + 2.0 * a7 + c8;
    float agx = -a0 - 2.0 * a3 - a6 + a2 + 2.0 * a5 + a8;
    float agy = -a0 - 2.0 * a1 - a2 + a6 + 2.0 * a7 + a8;

    float lumaMag = sqrt(lgx * lgx + lgy * lgy);
    float alphaMag = sqrt(agx * agx + agy * agy);
    float mag = clamp(max(lumaMag, alphaMag) * (1.5 + uIntensity * 5.5), 0.0, 1.0);
    float edge = smoothstep(uThreshold - 0.04, uThreshold + 0.08, mag);

    return vec4(uInk * edge, edge);
  }

  vec4 bloomEnhancePass(vec2 uv) {
    // Input is already bloomed by UnrealBloomPass. Add a subtle anamorphic streak,
    // a touch of chromatic fringing on the brightest halos, and a creamy highlight tone.
    vec4 base = sampleTex(uv);
    float bright = luma(base.rgb);

    // Anamorphic horizontal streak — kept tight and additive only on highlights.
    float streakSpan = mix(0.012, 0.045, uIntensity);
    vec3 streak = vec3(0.0);
    float weightSum = 0.0;
    for (int i = -6; i <= 6; i++) {
      float t = float(i) / 6.0;
      float w = exp(-t * t * 2.8);
      vec3 tap = sampleTex(vec2(uv.x + t * streakSpan, uv.y)).rgb;
      streak += tap * w;
      weightSum += w;
    }
    streak /= max(weightSum, 0.0001);
    float streakLuma = luma(streak);
    // Streak only adds light where there's already a hot spot — avoids overall haze
    float streakGate = smoothstep(0.55, 0.92, streakLuma);
    vec3 streakLight = streak * streakGate * uIntensity * 0.32;
    streakLight *= vec3(0.96, 0.99, 1.04);

    // Subtle chromatic fringing on bright halos only
    vec2 c = uv - 0.5;
    vec2 dir = c / max(length(c), 0.0001);
    float chromaGate = smoothstep(0.45, 0.85, bright);
    float chromaAmt = (uSplit / max(uResolution.x, 1.0)) * chromaGate * (0.25 + uIntensity * 0.7);
    vec2 chromaOff = dir * chromaAmt;
    vec3 disp = vec3(
      sampleTex(uv + chromaOff).r,
      base.g,
      sampleTex(uv - chromaOff).b
    );

    // Soft warm bias on the hottest spots — a touch of incandescence
    vec3 hi = max(disp - 0.7, 0.0);
    vec3 warm = vec3(0.05, 0.025, -0.012) * hi * (0.4 + uIntensity);

    vec3 final = disp + streakLight + warm;
    return vec4(final, base.a);
  }

  // Chrome / metal — screen-space environment reflection. Instead of
  // remapping per-pixel luminance (which flattens on dot fields where
  // luma is mostly 0 or 1), this maps the dot's vertical screen position
  // to a 4-stop sky/horizon/ground gradient — so dots near the top of
  // the sphere reflect "sky", dots near the horizon line catch a bright
  // specular glint, and dots at the bottom reflect "ground". The result
  // reads as polished chrome catching an imaginary environment.
  vec4 metalPass(vec2 uv) {
    vec2 px = 1.0 / max(uResolution, vec2(1.0));
    vec4 src = sampleTex(uv);
    vec4 blur = (
      src * 0.4 +
      sampleTex(uv + vec2(px.x * 1.5, 0.0)) * 0.15 +
      sampleTex(uv - vec2(px.x * 1.5, 0.0)) * 0.15 +
      sampleTex(uv + vec2(0.0, px.y * 1.5)) * 0.15 +
      sampleTex(uv - vec2(0.0, px.y * 1.5)) * 0.15
    );
    float signal = max(luma(blur.rgb), blur.a);
    if (signal < 0.02) {
      return vec4(0.0, 0.0, 0.0, src.a);
    }

    // Animated env-map phase — slow vertical drift suggests the surface
    // (or our view of it) tilting through the reflected environment.
    float drift = uTime * mix(0.04, 0.22, uMotion);
    float v = fract(uv.y - drift);

    // 4-stop chrome environment:
    //   0.00 → 0.32  bright zenith sky (top)
    //   0.32 → 0.50  cool steel mid (deep reflection)
    //   0.50 → 0.62  bright horizon glint (the "polished" highlight)
    //   0.62 → 1.00  dark ground tone (bottom)
    vec3 zenith = vec3(0.94, 0.97, 1.05);
    vec3 mid = vec3(0.22, 0.28, 0.38);
    vec3 horizon = vec3(0.88, 0.92, 1.0);
    vec3 ground = vec3(0.08, 0.10, 0.16);

    vec3 env;
    if (v < 0.32) {
      env = mix(zenith, mid, smoothstep(0.0, 0.32, v));
    } else if (v < 0.5) {
      env = mix(mid, horizon, smoothstep(0.32, 0.5, v));
    } else if (v < 0.62) {
      env = mix(horizon, mid, smoothstep(0.5, 0.62, v));
    } else {
      env = mix(mid, ground, smoothstep(0.62, 1.0, v));
    }

    // Slight horizontal warp on the env so the reflection doesn't look
    // like a pure stripe — fakes the sphere's curvature.
    float curve = sin((uv.x - 0.5) * PI) * 0.04;
    env *= 1.0 + curve * uIntensity;

    // Boost the horizon glint a touch on the brightest source content.
    float spec = smoothstep(0.62, 1.0, signal) * smoothstep(0.46, 0.54, v);
    env += vec3(0.6, 0.65, 0.75) * spec * uIntensity * 0.45;

    vec3 metal = env * mix(0.55, 1.0, signal);
    return vec4(metal, max(src.a, signal));
  }

  // Pencil sketch — adapted from webgl-shaders.com/pencil-example.html.
  // Four cross-hatching line layers at 20° / 20° + half-step offset /
  // -30° / -30° + half-step offset (the second pair rotated -50° from
  // the first). The reference modulates line width by surface diffuse
  // factor (light direction). We don't have surface normals in the
  // post-process pass — but we do have the source content's
  // luminance, which acts as the "darkness factor" in our case: where
  // the dot field draws something, the cross-hatching kicks in. The
  // background is paper-white so it reads as a sketch on a page.
  // Single discrete pencil stroke with tapered pressure profile. p is
  // the pixel-space position to evaluate; the stroke runs from origin
  // along dir (unit) for len pixels with halfWidth * pressure visible
  // width. Returns 0..1 ink density with the classic light-at-ends,
  // heavy-in-middle pressure curve of a real pencil stroke. Slight
  // perpendicular wobble via FBM along the stroke makes each one look
  // hand-drawn vs machine-straight.
  float pencilStroke(vec2 p, vec2 origin, vec2 dir, float len, float halfWidth, float pressure) {
    vec2 d = p - origin;
    float along = dot(d, dir);
    if (along < -2.0 || along > len + 2.0) return 0.0;
    vec2 perpDir = vec2(-dir.y, dir.x);
    float perp = dot(d, perpDir);
    // Bigger tremor across the stroke length so individual strokes
    // bend visibly like a real hand drawing on paper rather than
    // straight-line math.
    float wobble = (valueNoise2(vec2(along * 0.06, origin.x * 0.01)) - 0.5) * 3.5;
    // Lower-frequency drift adds a slow curve on top of the tremor.
    float drift = (valueNoise2(vec2(along * 0.02, origin.y * 0.013)) - 0.5) * 2.5;
    perp += wobble + drift;
    // Tapered pressure profile — fades in over first 15% of length,
    // peaks in the middle, fades out over last 15%. Matches how a real
    // pencil starts light, presses heavier mid-stroke, lifts off.
    float tIn = smoothstep(0.0, len * 0.15, along);
    float tOut = 1.0 - smoothstep(len * 0.85, len, along);
    float taper = tIn * tOut;
    float w = halfWidth * pressure * (0.7 + 0.3 * taper);
    float edge = 1.0 - smoothstep(w * 0.55, w * 1.15, abs(perp));
    // Along-stroke tooth — graphite catches paper unevenly. Sample a
    // noise band tracking the stroke length and dim the stroke where
    // the paper grain "skips" the graphite. This is the signature
    // broken/dashed quality of real pencil on textured paper.
    float pathTooth = valueNoise2(origin * 0.03 + vec2(along * 0.18, 0.0));
    float skip = smoothstep(0.18, 0.62, pathTooth);
    return edge * taper * skip;
  }

  // A region of pencil strokes — divides screen into cells (~22px each),
  // each cell hosts ONE stroke whose origin/length/angle/pressure vary
  // by hash. Strokes only appear where the source content is dark
  // enough (densitySignal), giving the impression of an artist building
  // up tone exactly where the form needs shading. 3×3 neighbor sampling
  // lets strokes spill across cell boundaries for a natural look.
  float pencilHatch(vec2 pixelPos, float baseAngle, float angleJitter, float densitySignal, float cellSize, float strokeWidth) {
    if (densitySignal < 0.05) return 0.0;
    vec2 cell = floor(pixelPos / cellSize);
    float ink = 0.0;
    for (int j = -1; j <= 1; j++) {
      for (int i = -1; i <= 1; i++) {
        vec2 c = cell + vec2(float(i), float(j));
        // Per-cell density check — sparser cells in lighter regions.
        float drawChance = rand(c * 7.13 + baseAngle);
        if (drawChance > densitySignal * 1.15 + 0.02) continue;
        // Stroke origin: somewhere inside the cell.
        vec2 originOffset = vec2(rand(c * 3.17), rand(c * 5.71)) * cellSize;
        vec2 origin = c * cellSize + originOffset;
        // Slight angle jitter — each stroke isn't perfectly aligned to
        // the band angle, which is the cue that breaks "machine grid".
        float ang = baseAngle + (rand(c * 11.31) - 0.5) * angleJitter;
        vec2 dir = vec2(cos(ang), sin(ang));
        // Wider variation in stroke length (1.0× to 2.8× cell size) and
        // pressure (0.4–1.0) so adjacent strokes don't read as
        // mechanically uniform.
        float len = cellSize * (1.0 + rand(c * 13.79) * 1.8);
        float pressure = 0.4 + 0.6 * rand(c * 23.11);
        ink += pencilStroke(pixelPos, origin, dir, len, strokeWidth, pressure);
      }
    }
    return clamp(ink, 0.0, 1.0);
  }

  vec4 pencilPass(vec2 uv) {
    vec2 px = 1.0 / max(uResolution, vec2(1.0));
    vec4 src = sampleTex(uv);
    vec4 blur = (
      src * 0.4 +
      sampleTex(uv + vec2(px.x * 2.0, 0.0)) * 0.15 +
      sampleTex(uv - vec2(px.x * 2.0, 0.0)) * 0.15 +
      sampleTex(uv + vec2(0.0, px.y * 2.0)) * 0.15 +
      sampleTex(uv - vec2(0.0, px.y * 2.0)) * 0.15
    );
    float signal = max(luma(blur.rgb), blur.a);

    // Sobel-style edge magnitude on the source. Lets us darken
    // silhouettes with a confident outline stroke — the move every
    // sketch artist makes after the hatching is down.
    float cN = max(luma(sampleTex(uv + vec2(0.0, px.y * 2.0)).rgb), sampleTex(uv + vec2(0.0, px.y * 2.0)).a);
    float cS = max(luma(sampleTex(uv - vec2(0.0, px.y * 2.0)).rgb), sampleTex(uv - vec2(0.0, px.y * 2.0)).a);
    float cE = max(luma(sampleTex(uv + vec2(px.x * 2.0, 0.0)).rgb), sampleTex(uv + vec2(px.x * 2.0, 0.0)).a);
    float cW = max(luma(sampleTex(uv - vec2(px.x * 2.0, 0.0)).rgb), sampleTex(uv - vec2(px.x * 2.0, 0.0)).a);
    float edge = clamp(length(vec2(cE - cW, cN - cS)) * 2.4, 0.0, 1.0);

    // Pixel-space coords — strokes operate in actual pixels so cell
    // sizes read consistently across resolutions.
    vec2 pixelPos = uv * uResolution;

    // Variable graphite "pressure" across regions — slow FBM modulates
    // how heavily an artist would have shaded each area, so adjacent
    // strokes don't all read at the same tonal weight.
    float pressure = 0.7 + 0.6 * fbm4(uv * 4.0);
    float densitySignal = clamp(signal * pressure * (0.85 + uIntensity * 0.4), 0.0, 1.0);

    float strokeWidth = 1.6 + uIntensity * 0.8;
    // Smaller cells = more strokes per area. A real sketch has many
    // short overlapping marks rather than a few long ones; 18px gets
    // closer to that density.
    float cellSize = 18.0;

    // 4 layers of discrete strokes at different angles. Each cell hosts
    // ONE stroke (finite, tapered, slightly off-axis) rather than the
    // infinite parallel lines of a math hatch. This is the difference
    // between "shader pretending to be pencil" and "an artist's hand".
    // - Layer 1 (light tones): only the primary angle, sparse
    // - Layer 2 (mid tones): adds counter-angle cross
    // - Layer 3 (dark tones): adds steep diagonal
    // - Layer 4 (deep darks): adds horizontal accent
    // Stronger angle jitter so individual strokes within a layer don't
    // share the exact same axis — that uniformity was the biggest
    // "this is a shader" tell.
    float angleJitter = 0.6;
    float hatch1 = pencilHatch(pixelPos, radians(20.0), angleJitter, densitySignal, cellSize, strokeWidth);
    float hatch2 = pencilHatch(pixelPos, radians(-32.0), angleJitter, densitySignal * 0.85, cellSize * 1.05, strokeWidth);
    float hatch3 = pencilHatch(pixelPos, radians(70.0), angleJitter, densitySignal * 0.7, cellSize * 0.95, strokeWidth * 0.9);
    float hatch4 = pencilHatch(pixelPos, radians(0.0), angleJitter, densitySignal * 0.55, cellSize * 1.1, strokeWidth * 0.95);

    // Paper-tooth mask — graphite catches the raised fibres, skips the
    // recessed ones. The most distinctive cue of pencil-on-paper.
    float tooth = clamp(paperGrain(uv, 4.0) + 0.6, 0.0, 1.0);
    tooth = smoothstep(0.15, 0.85, tooth);
    float toothMix = mix(0.55, 1.0, tooth);

    // Threshold each layer by signal so light tones don't suddenly get
    // all 4 layers at once. Builds up tone gradually like a real sketch.
    float surface = 1.0;
    surface -= 0.55 * hatch1 * smoothstep(0.04, 0.25, signal) * toothMix;
    surface -= 0.55 * hatch2 * smoothstep(0.18, 0.42, signal) * toothMix;
    surface -= 0.55 * hatch3 * smoothstep(0.32, 0.6, signal) * toothMix;
    surface -= 0.55 * hatch4 * smoothstep(0.5, 0.75, signal) * toothMix;

    // Edge contour — the silhouette stroke every artist adds after the
    // hatching. Darker than the hatch lines, modulated by paper tooth
    // so it isn't a perfect mechanical outline.
    float contour = edge * smoothstep(0.08, 0.35, signal) * mix(0.7, 1.0, tooth);
    surface -= 0.6 * contour;
    surface = clamp(surface, 0.04, 1.0);

    // Sketchbook page vignette — corners read slightly darker than the
    // centre, like a real spread under directional light.
    vec2 vc = (uv - 0.5) * vec2(uResolution.x / max(uResolution.y, 1.0), 1.0);
    float vignette = 1.0 - 0.08 * dot(vc, vc);
    surface *= vignette;

    // Paper grain — multi-octave fibre noise sells the pressed-paper
    // feel, slightly stronger than before now that the hatching has
    // tooth-aware skipping.
    float grain = paperGrain(uv, 3.2) * 0.08;
    surface += grain;
    surface = clamp(surface, 0.0, 1.0);

    // Warm off-white paper tone, plus subtle warmth shift in dark
    // graphite zones where real pencil starts to read brown-grey from
    // the wax binder catching the light.
    vec3 paper = vec3(0.97, 0.94, 0.87);
    vec3 graphiteCool = vec3(0.10, 0.09, 0.08);
    vec3 graphiteWarm = vec3(0.16, 0.12, 0.08);
    vec3 graphite = mix(graphiteCool, graphiteWarm, 1.0 - surface);
    vec3 color = mix(graphite, paper, surface);

    return vec4(color, 1.0);
  }

  // Toon / cartoon — quantises source luminance into discrete bands for a
  // posterised cel-shaded look. Adapted from webgl-shaders.com/toon-
  // example.html — the reference uses surface diffuse factor as the
  // value to quantise; our post-process pass uses source signal
  // (max of luma and alpha) instead so the bands appear wherever the
  // dot field has content. Number of steps scales with uIntensity
  // (3 bands at min → 6 bands at max).
  vec4 toonPass(vec2 uv) {
    vec4 src = sampleTex(uv);
    vec2 px = 1.0 / max(uResolution, vec2(1.0));
    // Small blur so sparse dots get filled into the value ramp.
    vec4 blur = (
      src * 0.36 +
      sampleTex(uv + vec2(px.x * 1.5, 0.0)) * 0.16 +
      sampleTex(uv - vec2(px.x * 1.5, 0.0)) * 0.16 +
      sampleTex(uv + vec2(0.0, px.y * 1.5)) * 0.16 +
      sampleTex(uv - vec2(0.0, px.y * 1.5)) * 0.16
    );
    float signal = max(luma(blur.rgb), blur.a);

    float nSteps = 3.0 + floor(uIntensity * 3.5);
    float s = sqrt(signal) * nSteps;
    s = (floor(s) + smoothstep(0.45, 0.55, fract(s))) / nSteps;
    float shaded = s * s;

    return vec4(uInk * shaded, max(src.a, signal));
  }

  // Stripes — discards horizontal bands so the source content shows
  // through only between the strokes. Adapted from webgl-shaders.com/
  // stripes-example.html. Band frequency comes from uCellSize (wider
  // cellSize → fewer thicker stripes); animation speed from uMotion.
  vec4 stripesPass(vec2 uv) {
    vec4 src = sampleTex(uv);
    float t = uTime * mix(0.3, 3.5, uMotion);
    float bandSize = max(uCellSize * 0.6, 3.0);
    float stripe = cos(uv.y * uResolution.y / bandSize + t * 1.7);
    // Threshold edges with intensity so high-intensity = thicker stripes
    // (smaller gaps); low-intensity = thinner stripes (larger gaps).
    float gap = mix(0.05, -0.4, uIntensity);
    if (stripe < gap) {
      return vec4(0.0, 0.0, 0.0, 0.0);
    }
    return src;
  }

  // Bad TV / VHS — noise-driven UV jitter + line jumps + white-noise
  // grain. Adapted from webgl-shaders.com/badtv-example.html. The
  // reference takes its strength from mouse.x; we tie it to uIntensity
  // and uMotion instead so it sits in the slider grid.
  vec4 badtvPass(vec2 uv) {
    float t = uTime * mix(0.3, 4.0, uMotion);
    float strength = (0.3 + 0.7 * noise1d(0.3 * t)) * uIntensity;
    float jump = 500.0 * floor(0.3 * uIntensity * (t + noise1d(t)));

    vec2 distorted = uv;
    distorted.y += 0.2 * strength * (noise1d(5.0 * uv.y + 2.0 * t + jump) - 0.5);
    distorted.x += 0.1 * strength * (noise1d(100.0 * strength * distorted.y + 3.0 * t + jump) - 0.5);

    vec4 src = sampleTex(distorted);
    vec3 color = src.rgb;
    // Coarse white-noise overlay — looks like analog snow on top of the
    // distorted feed.
    color += vec3(5.0 * strength * (rand(uv + 1.133 * vec2(t, 1.13)) - 0.5));
    return vec4(color, src.a);
  }

  // RGB — chromatic aberration with the three channels offset along
  // axes rotating around the centre. Adapted from webgl-shaders.com/
  // rgb-example.html. Offset size grows with distance to the centre so
  // the fringing is strongest at the corners (just like the reference).
  vec4 rgbPass(vec2 uv) {
    float angle = uTime * mix(0.3, 2.4, uMotion);
    vec2 rOff = vec2(cos(angle), sin(angle));
    angle += radians(120.0);
    vec2 gOff = vec2(cos(angle), sin(angle));
    angle += radians(120.0);
    vec2 bOff = vec2(cos(angle), sin(angle));

    vec2 frag = uv * uResolution;
    float offsetSize = 0.08 * length(frag - 0.5 * uResolution) * uIntensity;

    float r = sampleTex(uv - offsetSize * rOff / uResolution).r;
    float g = sampleTex(uv - offsetSize * gOff / uResolution).g;
    float b = sampleTex(uv - offsetSize * bOff / uResolution).b;
    vec4 src = sampleTex(uv);
    return vec4(r, g, b, max(src.a, max(max(r, g), b)));
  }

  // Chroma — independent radial zoom per RGB channel from a centre point.
  // Adapted from VIDVOX / toneburst's "Chroma Zoom" ISF shader. Each
  // channel is sampled at a different scale around the centre so the
  // colours fan out radially toward the edges of the frame — distinct
  // from our directional chromatic and our rotating-axis rgb passes.
  // Alpha follows the master scale so the chip outline stays crisp.
  vec4 chromaPass(vec2 uv) {
    vec2 center = vec2(0.5);
    // Master zoom is essentially 1; tiny micro-scale wobble adds life.
    float t = uTime * mix(0.2, 2.0, uMotion);
    float master = 1.0 + sin(t) * 0.004 * uIntensity;
    // Spread between channels — bigger spread = stronger chromatic fan.
    float spread = uIntensity * 0.14;
    float rZoom = master * (1.0 - spread);
    float gZoom = master;
    float bZoom = master * (1.0 + spread);

    vec2 rUv = (uv - center) / rZoom + center;
    vec2 gUv = (uv - center) / gZoom + center;
    vec2 bUv = (uv - center) / bZoom + center;

    // Per-channel sample only the matching colour — same trick the
    // reference uses, gives the clean R/G/B separation.
    float r = sampleTex(rUv).r;
    float g = sampleTex(gUv).g;
    float b = sampleTex(bUv).b;

    vec2 aUv = (uv - center) / master + center;
    float a = sampleTex(aUv).a;
    return vec4(r, g, b, max(a, max(max(r, g), b)));
  }

  // Corrupt / datamosh — heavy channel-corruption look. Recipe:
  //   1. Coarse cell pixelation (uCellSize-driven, no anti-aliasing).
  //   2. Per-row horizontal shift (random per row, refreshes slowly).
  //   3. Rare large block jumps (every ~24 rows triggers a big slide).
  //   4. Per-channel chromatic offset — R drifts right, B drifts left,
  //      so the row-shift lands different colour channels on different
  //      pixels.
  //   5. Hard binary quantisation per channel — each of R, G, B
  //      becomes step(threshold, value), collapsing the palette to the
  //      8 primaries (K, R, G, B, Y, C, M, W).
  //   6. Subtle scanline modulation for the stripe pattern.
  // The pattern animates slowly with uMotion; uIntensity drives both
  // displacement amplitude and quantisation hardness.
  vec4 corruptPass(vec2 uv) {
    float t = uTime * mix(0.2, 2.5, uMotion);

    // Coarse cell pixelation — anchors sampling to a chunky grid so
    // the binary quantisation reads as blocks, not noise.
    float cellSize = max(uCellSize * 0.55, 2.0);
    vec2 grid = uResolution / cellSize;
    vec2 cellUv = (floor(uv * grid) + 0.5) / grid;

    // Per-row shift — random per row, refreshes on a slow time grid.
    float rowKey = floor(cellUv.y * uResolution.y / max(cellSize * 1.6, 4.0));
    float rowShift = (rand(vec2(rowKey * 0.13, floor(t * 0.6))) - 0.5)
      * 0.12 * uIntensity;

    // Big-block jump — triggers rarely, slides a whole band sideways.
    float blockKey = floor(cellUv.y * uResolution.y / 22.0);
    float blockTrigger = step(0.91 - uIntensity * 0.15,
      rand(vec2(blockKey, floor(t * 1.4))));
    float blockShift = (rand(vec2(blockKey * 1.7, floor(t * 1.9))) - 0.5)
      * 0.28 * blockTrigger * uIntensity;
    float xShift = rowShift + blockShift;

    // Per-channel chromatic offset — different drift per channel makes
    // the row-shift produce different colours on neighbouring pixels.
    float chroma = uIntensity * 0.012;
    vec2 rUv = vec2(cellUv.x + xShift + chroma * 1.4, cellUv.y);
    vec2 gUv = vec2(cellUv.x + xShift - chroma * 0.3, cellUv.y);
    vec2 bUv = vec2(cellUv.x + xShift - chroma * 1.6, cellUv.y);

    float r = sampleTex(rUv).r;
    float g = sampleTex(gUv).g;
    float b = sampleTex(bUv).b;

    // Hard binary quantisation per channel → 8-colour palette.
    // Threshold lowers with uIntensity so the corruption fills more
    // of the frame as intensity climbs.
    float threshold = mix(0.5, 0.14, uIntensity);
    vec3 quant = vec3(
      step(threshold, r),
      step(threshold, g),
      step(threshold, b)
    );

    // Subtle horizontal scanline darkening at high frequency — the
    // banded read on top of the binary blocks.
    float scan = 0.84 + 0.16 * cos(uv.y * uResolution.y * PI * 0.5);
    quant *= mix(1.0, scan, 0.55);

    // Alpha: keep the silhouette of either the original source or
    // anything that survived quantisation.
    vec4 src = sampleTex(uv);
    float anyChannel = max(quant.r, max(quant.g, quant.b));
    float alpha = max(src.a, anyChannel);
    return vec4(quant, alpha);
  }

  vec4 wavePass(vec2 uv) {
    float t = uTime * mix(0.3, 4.0, uMotion);
    float amp = uWarp * uIntensity * 0.05;
    vec2 warped = uv + vec2(
      sin(uv.y * 18.0 + t) * amp,
      cos(uv.x * 14.0 + t * 1.2) * amp
    );
    vec4 src = sampleTex(warped);
    float chroma = uSplit / max(uResolution.x, 1.0);
    vec4 r = sampleTex(warped + vec2(chroma, 0.0));
    vec4 b = sampleTex(warped - vec2(chroma, 0.0));
    return vec4(vec3(r.r, src.g, b.b), src.a);
  }

  void main() {
    vec4 color = sampleTex(vUv);

    if (uEffect > 0.5 && uEffect < 1.5) {
      color = chromaticPass(vUv);
    } else if (uEffect > 1.5 && uEffect < 2.5) {
      color = crtPass(vUv);
    } else if (uEffect > 2.5 && uEffect < 3.5) {
      color = halftonePass(vUv);
    } else if (uEffect > 3.5 && uEffect < 4.5) {
      color = pixelPass(vUv);
    } else if (uEffect > 4.5 && uEffect < 5.5) {
      color = thresholdPass(vUv);
    } else if (uEffect > 5.5 && uEffect < 6.5) {
      color = glitchPass(vUv);
    } else if (uEffect > 6.5 && uEffect < 7.5) {
      color = edgePass(vUv);
    } else if (uEffect > 7.5 && uEffect < 8.5) {
      color = wavePass(vUv);
    } else if (uEffect > 8.5 && uEffect < 9.5) {
      color = bloomEnhancePass(vUv);
    } else if (uEffect > 9.5 && uEffect < 10.5) {
      color = metalPass(vUv);
    } else if (uEffect > 10.5 && uEffect < 11.5) {
      color = pencilPass(vUv);
    } else if (uEffect > 11.5 && uEffect < 12.5) {
      color = toonPass(vUv);
    } else if (uEffect > 12.5 && uEffect < 13.5) {
      color = stripesPass(vUv);
    } else if (uEffect > 13.5 && uEffect < 14.5) {
      color = badtvPass(vUv);
    } else if (uEffect > 14.5 && uEffect < 15.5) {
      color = rgbPass(vUv);
    } else if (uEffect > 15.5 && uEffect < 16.5) {
      color = chromaPass(vUv);
    } else if (uEffect > 16.5 && uEffect < 17.5) {
      color = corruptPass(vUv);
    } else if (uEffect > 17.5 && uEffect < 18.5) {
      color = bayerPass(vUv);
    } else if (uEffect > 18.5 && uEffect < 19.5) {
      color = iridescentPass(vUv);
    } else if (uEffect > 19.5 && uEffect < 20.5) {
      color = risographPass(vUv);
    } else if (uEffect > 20.5 && uEffect < 21.5) {
      color = newsprintPass(vUv);
    } else if (uEffect > 21.5 && uEffect < 22.5) {
      color = auroraPass(vUv);
    } else if (uEffect > 22.5 && uEffect < 23.5) {
      color = atkinsonPass(vUv);
    }

    if (uEffect > 0.5 && uGrain > 0.0) {
      float n = rand(vUv * uResolution + floor(uTime * mix(8.0, 48.0, uMotion))) - 0.5;
      color.rgb += n * uGrain * uIntensity * 0.28;
    }

    // Composite the bg-only texture (stars / solid color / transparent)
    // behind the effect output. color.a is the effect's coverage —
    // halftone returns alpha=mask so dots are opaque and gaps are
    // transparent; CRT/chromatic/etc. return alpha=1 so they fully cover
    // the bg. When the bg target is transparent (solid-bg case), the
    // resulting canvas pixel stays transparent so the page-bg CSS color
    // shows through (matches the user's chosen solid color).
    vec4 bg = texture2D(uBgTexture, vUv);
    vec3 finalRgb = mix(bg.rgb, clamp(color.rgb, 0.0, 1.0), clamp(color.a, 0.0, 1.0));
    float finalAlpha = max(bg.a, clamp(color.a, 0.0, 1.0));
    gl_FragColor = vec4(finalRgb, finalAlpha);
  }
`;

export const createPostComposer = ({ renderer, scene, camera, width, height, pixelRatio, bgTexture }) => {
  const composer = new EffectComposer(renderer);
  composer.setPixelRatio(pixelRatio);
  composer.setSize(width, height);

  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  const bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), 0.6, 0.4, 0.85);
  bloomPass.enabled = false;
  composer.addPass(bloomPass);

  const customPass = new ShaderPass({
    uniforms: {
      tDiffuse: { value: null },
      uResolution: { value: new THREE.Vector2(width, height) },
      uTime: { value: 0 },
      uEffect: { value: 0 },
      uIntensity: { value: 0.45 },
      uSplit: { value: 7 },
      uGrain: { value: 0.08 },
      uScanlines: { value: 0.36 },
      uCellSize: { value: 14 },
      uThreshold: { value: 0.5 },
      uWarp: { value: 0.24 },
      uMotion: { value: 0.35 },
      // Theme-aware ink color for shaders that draw their own stylized
      // marks on top of the scene (halftone dots, newsprint CMYK plates,
      // pixel cells, dither thresholds). White in dark mode → dark in
      // light mode so the marks stay visible against the inverted bg.
      uInk: { value: new THREE.Vector3(1, 1, 1) },
      // Unused — kept for backwards compat. The bg composite happens via
      // uBgTexture now, not via per-shader mask logic.
      uPreserveBg: { value: 0 },
      // Bg-only render target sampled here, composited behind the effect
      // output. Allows pattern shaders (halftone etc.) to mark only the
      // globe while the bg (stars + nebula) shows cleanly behind in the
      // gaps. Set by the render loop; the bgTarget is updated each frame.
      uBgTexture: { value: bgTexture ?? null },
    },
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
  });
  composer.addPass(customPass);

  return {
    composer,
    bloomPass,
    customPass,
    setSize(nextWidth, nextHeight) {
      composer.setSize(nextWidth, nextHeight);
      bloomPass.setSize(nextWidth, nextHeight);
      customPass.uniforms.uResolution.value.set(nextWidth, nextHeight);
    },
    dispose() {
      bloomPass.dispose?.();
      composer.dispose?.();
    },
  };
};

const clamp01 = (v) => Math.max(0, Math.min(1, v));

export const updatePostEffects = (handle, shaderSettings, time, uiTheme = "dark") => {
  if (!handle) return;
  const effect = shaderSettings.effect || "none";
  const intensity = clamp01((shaderSettings.intensity ?? 45) / 100);

  if (effect === "bloom") {
    handle.bloomPass.enabled = true;
    // Softer, wider, more atmospheric bloom — each bright dot gets a creamy halo
    // without blowing out the underlying geometry.
    handle.bloomPass.strength = 0.25 + intensity * 0.85;
    handle.bloomPass.radius = 0.45 + intensity * 0.4;
    handle.bloomPass.threshold = Math.max(0.05, 0.55 - intensity * 0.35);
    handle.customPass.uniforms.uEffect.value = EFFECT_INDEX.bloomEnhance;
  } else {
    handle.bloomPass.enabled = false;
    handle.customPass.uniforms.uEffect.value = EFFECT_INDEX[effect] ?? 0;
  }

  const u = handle.customPass.uniforms;
  u.uTime.value = time;
  u.uIntensity.value = intensity;
  u.uSplit.value = shaderSettings.split ?? 7;
  u.uGrain.value = clamp01((shaderSettings.grain ?? 8) / 100);
  u.uScanlines.value = clamp01((shaderSettings.scanlines ?? 36) / 100);
  u.uCellSize.value = shaderSettings.cellSize ?? 14;
  u.uThreshold.value = clamp01((shaderSettings.threshold ?? 50) / 100);
  u.uWarp.value = clamp01((shaderSettings.warp ?? 24) / 100);
  u.uMotion.value = clamp01((shaderSettings.motion ?? 35) / 100);
  // Theme-aware ink color — graphite in light mode so the halftone /
  // newsprint / pixel / dither marks render visibly against the cream
  // canvas instead of disappearing as white-on-white.
  if (uiTheme === "light") {
    u.uInk.value.set(0.094, 0.090, 0.102); // #18171a in 0..1
  } else {
    u.uInk.value.set(1, 1, 1);
  }

  handle.customPass.enabled = effect !== "none";
};
