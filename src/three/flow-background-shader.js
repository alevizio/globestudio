// Shared GLSL for the flow background. Kept dependency-free (no THREE import)
// so it has a single source of truth across two renderers:
//   - createFlowBackgroundMesh() in flow-background-mesh.js (THREE, full-app)
//   - <FlowBackdrop/> in components/ui/flow-backdrop.jsx (raw WebGL, /examples)
// Tune the look here once and both stay in sync.

export const FLOW_VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 1.0, 1.0);
  }
`;

export const FLOW_FRAGMENT_SHADER = /* glsl */ `
  precision mediump float;

  varying vec2 vUv;
  uniform vec2 uResolution;
  uniform float uTime;
  uniform float uMotion;
  uniform float uTurbulence;
  uniform float uGrain;
  uniform float uScale;
  uniform float uBrightness;
  uniform vec3 colorA;
  uniform vec3 colorB;
  uniform vec3 colorC;

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);

    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));

    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  float fbm(vec2 p) {
    float value = 0.0;
    float amplitude = 0.5;
    mat2 rot = mat2(0.8, -0.6, 0.6, 0.8);

    for (int i = 0; i < 4; i++) {
      value += amplitude * noise(p);
      p = rot * p * 2.03 + 17.13;
      amplitude *= 0.52;
    }

    return value;
  }

  float stripeBand(vec2 p, float offset) {
    float wave = sin(p.x * 1.25 + p.y * 0.82 + offset);
    float folded = 1.0 - abs(wave);
    return smoothstep(0.16, 0.88, folded);
  }

  void main() {
    vec2 uv = vUv;
    float aspect = uResolution.x / max(uResolution.y, 1.0);
    vec2 p = (uv - 0.5) * vec2(aspect, 1.0);

    float t = uTime * mix(0.015, 0.18, uMotion);
    float scale = mix(1.35, 3.25, uScale);
    float turbulence = mix(0.35, 1.65, uTurbulence);

    vec2 domain = p * scale;
    vec2 drift = vec2(t * 0.9, -t * 0.55);
    vec2 q = vec2(
      fbm(domain + drift + vec2(0.0, 1.7)),
      fbm(domain - drift.yx + vec2(5.2, 2.1))
    );
    vec2 r = vec2(
      fbm(domain + q * (1.6 * turbulence) + vec2(1.7, 9.2) + t),
      fbm(domain - q * (1.25 * turbulence) + vec2(8.3, 2.8) - t * 0.75)
    );

    float flow = fbm(domain + r * (2.25 * turbulence) + vec2(t * 0.35, t * 0.18));
    float silk = fbm(domain * 0.58 + q * 1.15 - vec2(t * 0.22, t * 0.1));
    float roseVeil = fbm(domain * 0.72 - r * 0.85 + vec2(3.4 - t * 0.45, -1.8 + t * 0.28));
    float diagonal = stripeBand(p * vec2(2.1, 1.35) + r * 0.55, t * 2.2);

    vec3 base = mix(colorA, colorB, smoothstep(0.08, 0.88, flow));
    base = mix(base, colorC, smoothstep(0.22, 0.9, silk) * 0.72);
    base = mix(base, colorC, smoothstep(0.34, 0.96, roseVeil) * 0.38);
    float roseRibbon = smoothstep(-0.15, 0.72, p.x - p.y * 0.55 + silk * 0.62);
    base = mix(base, colorC, roseRibbon * 0.24);

    vec3 warmLift = vec3(1.0, 0.62, 0.24);
    float highlight = smoothstep(0.72, 1.0, diagonal * 0.7 + flow * 0.45);
    base += warmLift * highlight * 0.24;

    float depth = smoothstep(0.12, 0.96, flow * 0.62 + silk * 0.38);
    vec3 shadow = vec3(0.018, 0.014, 0.045);
    vec3 color = mix(shadow, base, 0.56 + depth * 0.5);

    float lightSweep = smoothstep(0.28, 0.9, 1.0 - abs((uv.x + uv.y * 0.42) - 0.96));
    color += mix(colorB, colorC, flow) * lightSweep * 0.08;

    vec2 vignettePoint = (uv - 0.5) * vec2(aspect, 1.0);
    float edge = smoothstep(0.42, 1.18, length(vignettePoint));
    color *= 1.0 - edge * 0.28;

    float grain = hash(uv * uResolution + floor(uTime * 18.0)) - 0.5;
    color += grain * uGrain * 0.06;
    color *= uBrightness;

    gl_FragColor = vec4(clamp(color, 0.0, 1.0), 1.0);
  }
`;
