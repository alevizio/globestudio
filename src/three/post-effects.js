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
