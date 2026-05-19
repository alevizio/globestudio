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
    return vec4(vec3(mask), mask);
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
    return vec4(vec3(mask), mask);
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

    return vec4(vec3(edge), edge);
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

    // Pixel-space coords centred — line spacing reads consistently across
    // resolutions because we work in actual pixels, not normalised uv.
    vec2 pos = (uv - 0.5) * uResolution;

    // Line width grows with signal (more content → darker → thicker
    // strokes), tuned via uIntensity. +0.5 keeps the lightest areas
    // still showing a faint trace.
    float lineWidth = (5.0 + uIntensity * 6.0) * signal + 0.5;

    // First group: 20°, spacing 16px
    pos = rotateUv(pos, radians(20.0));
    float linesSep1 = 16.0;
    vec2 gridPos = vec2(pos.x, mod(pos.y, linesSep1));
    float line1 = horizontalLine(gridPos, linesSep1 * 0.5, lineWidth);
    gridPos.y = mod(pos.y + linesSep1 * 0.5, linesSep1);
    float line2 = horizontalLine(gridPos, linesSep1 * 0.5, lineWidth);

    // Second group: another -50° (= 20° + -50° = -30° absolute), spacing 12px
    pos = rotateUv(pos, radians(-50.0));
    float linesSep2 = 12.0;
    gridPos = vec2(pos.x, mod(pos.y, linesSep2));
    float line3 = horizontalLine(gridPos, linesSep2 * 0.5, lineWidth);
    gridPos.y = mod(pos.y + linesSep2 * 0.5, linesSep2);
    float line4 = horizontalLine(gridPos, linesSep2 * 0.5, lineWidth);

    // Paper-white base, then each line layer kicks in at a progressively
    // higher signal threshold — same pattern as the reference shader,
    // gives the layered cross-hatching effect (light fills get one layer,
    // mid-tones two, dark zones all four).
    float surface = 1.0;
    surface -= 0.8 * line1 * smoothstep(0.04, 0.25, signal);
    surface -= 0.8 * line2 * smoothstep(0.12, 0.35, signal);
    surface -= 0.8 * line3 * smoothstep(0.22, 0.5, signal);
    surface -= 0.8 * line4 * smoothstep(0.35, 0.65, signal);
    surface = clamp(surface, 0.06, 1.0);

    // Very subtle paper grain — sells the sketched feel without
    // overpowering the line work.
    float grain = (rand(uv * uResolution * 0.5) - 0.5) * 0.04;
    surface += grain;
    surface = clamp(surface, 0.0, 1.0);

    // Warm off-white paper tone instead of pure 1.0 grey.
    vec3 paper = vec3(0.97, 0.94, 0.88);
    vec3 graphite = vec3(0.12, 0.10, 0.08);
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

    return vec4(vec3(shaded), max(src.a, signal));
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
    }

    if (uEffect > 0.5 && uGrain > 0.0) {
      float n = rand(vUv * uResolution + floor(uTime * mix(8.0, 48.0, uMotion))) - 0.5;
      color.rgb += n * uGrain * uIntensity * 0.28;
    }

    gl_FragColor = vec4(clamp(color.rgb, 0.0, 1.0), clamp(color.a, 0.0, 1.0));
  }
`;

export const createPostComposer = ({ renderer, scene, camera, width, height, pixelRatio }) => {
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

export const updatePostEffects = (handle, shaderSettings, time) => {
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

  handle.customPass.enabled = effect !== "none";
};
