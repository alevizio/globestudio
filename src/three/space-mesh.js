import * as THREE from "three";

// Fullscreen quad rendered at the far plane, behind the globe. Because it lives
// inside the globe's scene, the post-effect chain (bloom, chromatic, CRT, etc.)
// naturally applies to the stars too — the bloom blooms the giants, chromatic
// fringes the limb, glitch glitches the field.

const VERTEX_SHADER = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    // Bypass camera matrices and pin to the far plane so this mesh always
    // covers the viewport regardless of camera position or zoom.
    gl_Position = vec4(position.xy, 1.0, 1.0);
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  // mediump is sufficient — the math operates on 0–1 UV ranges, small-magnitude
  // hash outputs, and bounded color values. Dropping from highp gives a real
  // perf win on mobile/integrated GPUs (MDN WebGL best-practices recommendation)
  // while being visually identical on desktop hardware that treats mediump
  // as highp anyway.
  precision mediump float;

  varying vec2 vUv;
  uniform vec2 uResolution;
  uniform float uTime;
  uniform float uDensity;
  uniform float uMotion;
  uniform float uNebula;
  uniform float uHue;
  uniform float uBrightness;

  float rand(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
  }
  float luma(vec3 c) { return dot(c, vec3(0.299, 0.587, 0.114)); }

  void main() {
    vec2 uv = vUv;
    float baseT = uTime;
    float t = baseT * mix(0.12, 1.4, uMotion);
    float aspect = uResolution.x / max(uResolution.y, 1.0);

    vec3 sky = vec3(0.0);

    // FAR LAYER — tiny dense pinpoints, no twinkle, no drift.
    {
      float density = mix(140.0, 260.0, uDensity);
      vec2 g = vec2(uv.x * aspect, uv.y) * density;
      vec2 cellId = floor(g);
      vec2 cellFrac = fract(g) - 0.5;
      float r1 = rand(cellId);
      float r2 = rand(cellId + vec2(1.7, 9.2));
      float alive = step(0.975, r1);
      float d2 = dot(cellFrac, cellFrac);
      float intensity = exp(-d2 * 120.0) * alive;
      intensity *= pow(r2, 2.5);
      vec3 tint = mix(vec3(0.92, 0.95, 1.0), vec3(1.0, 0.96, 0.88), r1);
      sky += tint * intensity * 0.85;
    }

    // MID LAYER — soft twinkling stars.
    {
      float density = mix(48.0, 110.0, uDensity);
      vec2 g = vec2(uv.x * aspect, uv.y) * density;
      vec2 cellId = floor(g);
      vec2 cellFrac = fract(g);
      for (int i = -1; i <= 1; i++) {
        for (int j = -1; j <= 1; j++) {
          vec2 nOff = vec2(float(i), float(j));
          vec2 nId = cellId + nOff;
          float r1 = rand(nId);
          float r2 = rand(nId + vec2(2.3, 0.7));
          float r3 = rand(nId + vec2(5.1, 8.9));
          float r4 = rand(nId + vec2(0.5, 3.2));
          float alive = step(0.66, r1);

          vec2 pPos = vec2(r2, r3) + vec2(
            sin(t * (0.2 + r3 * 0.4) + r1 * 6.28),
            cos(t * (0.18 + r2 * 0.3) + r4 * 6.28)
          ) * 0.06;

          vec2 dvec = cellFrac - nOff - pPos;
          float d2 = dot(dvec, dvec);

          float twinkleGate = step(0.4, r2);
          float twinkle = mix(0.9, 0.35 + 0.65 * pow(0.5 + 0.5 * sin(t * (0.5 + r4 * 1.2) + r1 * 6.28), 2.5), twinkleGate);

          float size = mix(0.04, 0.09, r4);
          float core = exp(-d2 / (size * size + 0.0003));
          float halo = exp(-d2 / (size * size * 4.0 + 0.0003)) * 0.25;
          float mag = pow(r3, 1.8);
          float intensity = (core + halo) * twinkle * alive * mag;

          vec3 cool = vec3(0.86, 0.92, 1.0);
          vec3 warm = vec3(1.0, 0.9, 0.75);
          vec3 blue = vec3(0.78, 0.86, 1.05);
          float warmth = clamp(0.5 + uHue * 0.5, 0.0, 1.0);
          vec3 tint = mix(cool, warm, smoothstep(0.55, 0.95, r3) * warmth);
          tint = mix(tint, blue, smoothstep(0.92, 1.0, r4) * (1.0 - warmth));

          sky += tint * intensity * 0.9;
        }
      }
    }

    // BRIGHT GIANT LAYER — sparse hero stars with diffraction cross.
    {
      float density = mix(11.0, 26.0, uDensity);
      vec2 g = vec2(uv.x * aspect, uv.y) * density;
      vec2 cellId = floor(g);
      vec2 cellFrac = fract(g);
      for (int i = -1; i <= 1; i++) {
        for (int j = -1; j <= 1; j++) {
          vec2 nOff = vec2(float(i), float(j));
          vec2 nId = cellId + nOff;
          float r1 = rand(nId + vec2(7.0, 11.0));
          float r2 = rand(nId + vec2(4.4, 3.3));
          float r3 = rand(nId + vec2(9.9, 1.1));
          float r4 = rand(nId + vec2(2.1, 6.6));
          float alive = step(0.88, r1);

          vec2 pPos = vec2(r2, r3);
          vec2 dvec = cellFrac - nOff - pPos;
          float d2 = dot(dvec, dvec);

          float twinkle = 0.6 + 0.4 * sin(t * (0.6 + r4 * 0.8) + r1 * 6.28);
          float size = mix(0.05, 0.1, r4);
          float core = exp(-d2 / (size * size + 0.0001));
          float halo = exp(-d2 / (size * size * 14.0 + 0.0001)) * 0.45;

          float mag = pow(r3, 1.5);
          float spikeH = exp(-abs(dvec.y) * 90.0) * exp(-abs(dvec.x) * 5.5) * 0.55 * mag;
          float spikeV = exp(-abs(dvec.x) * 90.0) * exp(-abs(dvec.y) * 5.5) * 0.55 * mag;

          float intensity = (core + halo + spikeH + spikeV) * twinkle * alive * (0.5 + mag);

          vec3 tint = mix(
            vec3(1.0, 0.88, 0.72),
            vec3(0.86, 0.95, 1.1),
            r3
          );
          sky += tint * intensity * 1.1;
        }
      }
    }

    // FAINT NEBULA — low-freq colored fog with slow drift.
    vec2 nebUv = uv * vec2(1.8, 1.3) + vec2(baseT * 0.005, 0.0);
    float n1 = sin(nebUv.x * 1.7 + sin(nebUv.y * 2.3) * 1.4) * 0.5 + 0.5;
    float n2 = sin(nebUv.y * 1.1 + cos(nebUv.x * 1.9) * 1.1) * 0.5 + 0.5;
    float nebMask = pow(n1 * n2, 3.5);
    vec3 coolNebula = mix(vec3(0.10, 0.05, 0.22), vec3(0.06, 0.10, 0.24), n1);
    vec3 warmNebula = mix(vec3(0.22, 0.06, 0.10), vec3(0.26, 0.12, 0.06), n1);
    vec3 nebColor = mix(coolNebula, warmNebula, clamp(uHue * 0.5 + 0.5, 0.0, 1.0));
    vec3 nebula = nebColor * nebMask * 0.5 * uNebula;

    float dust = pow(sin(uv.y * 3.14159 + sin(uv.x * 6.28) * 0.7) * 0.5 + 0.5, 6.0) * 0.15 * uNebula;
    nebula += nebColor * dust;

    vec3 base = vec3(0.012, 0.012, 0.024);
    vec3 final = base + sky * 0.95 * uBrightness + nebula;

    vec2 c = uv - 0.5;
    float vigDist = length(c * vec2(aspect, 1.0));
    final *= 1.0 - smoothstep(0.5, 1.15, vigDist) * 0.22;

    gl_FragColor = vec4(final, 1.0);
  }
`;

export const createSpaceBackgroundMesh = () => {
  const material = new THREE.ShaderMaterial({
    vertexShader: VERTEX_SHADER,
    fragmentShader: FRAGMENT_SHADER,
    uniforms: {
      uResolution: { value: new THREE.Vector2(1, 1) },
      uTime: { value: 0 },
      uDensity: { value: 0.65 },
      uMotion: { value: 0.35 },
      uNebula: { value: 0.55 },
      uHue: { value: 0 },
      uBrightness: { value: 1 },
    },
    depthTest: false,
    depthWrite: false,
    transparent: false,
  });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), material);
  mesh.frustumCulled = false;
  mesh.renderOrder = -1;
  mesh.visible = false;
  return mesh;
};
