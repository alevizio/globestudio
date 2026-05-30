import { useEffect, useRef } from "react";
import { DEFAULT_FLOW_SETTINGS } from "../../config/backgrounds.js";
import { FLOW_FRAGMENT_SHADER } from "../../three/flow-background-shader.js";
import { usePrefersReducedMotion } from "../../hooks/use-prefers-reduced-motion.js";

// A standalone, dependency-free (no THREE) renderer for the flow background.
// The /examples page embeds globes via iframe to keep THREE out of its bundle,
// so this draws the same flow shader with a few lines of raw WebGL instead of
// spinning up a second THREE renderer. It shares FLOW_FRAGMENT_SHADER with the
// in-app THREE mesh, so the look stays identical from one source.

const VERTEX_SHADER = `
  attribute vec2 aPos;
  varying vec2 vUv;
  void main() {
    vUv = aPos * 0.5 + 0.5;
    gl_Position = vec4(aPos, 0.0, 1.0);
  }
`;

const hexToRgb = (hex) => {
  const n = parseInt(hex.replace("#", ""), 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
};

const compile = (gl, type, src) => {
  const shader = gl.createShader(type);
  gl.shaderSource(shader, src);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error(gl.getShaderInfoLog(shader));
    return null;
  }
  return shader;
};

export const FlowBackdrop = ({ settings = DEFAULT_FLOW_SETTINGS, className, style }) => {
  const canvasRef = useRef(null);
  const reduceMotion = usePrefersReducedMotion();

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const gl = canvas.getContext("webgl", {
      antialias: false,
      alpha: true,
      depth: false,
      premultipliedAlpha: false,
      powerPreference: "low-power",
    });
    if (!gl) return undefined;

    const vs = compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FLOW_FRAGMENT_SHADER);
    if (!vs || !fs) return undefined;

    const prog = gl.createProgram();
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const u = (name) => gl.getUniformLocation(prog, name);
    const uResolution = u("uResolution");
    const uTime = u("uTime");

    gl.uniform1f(u("uMotion"), settings.motion / 100);
    gl.uniform1f(u("uTurbulence"), settings.turbulence / 100);
    gl.uniform1f(u("uGrain"), settings.grain / 100);
    gl.uniform1f(u("uScale"), settings.scale / 100);
    gl.uniform1f(u("uBrightness"), settings.brightness / 100);
    gl.uniform3fv(u("colorA"), hexToRgb(settings.colorA));
    gl.uniform3fv(u("colorB"), hexToRgb(settings.colorB));
    gl.uniform3fv(u("colorC"), hexToRgb(settings.colorC));

    const dpr = Math.min(window.devicePixelRatio || 1, 1.75);
    const resize = () => {
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
        gl.uniform2f(uResolution, w, h);
      }
    };

    let raf = 0;
    const start = performance.now();
    const drawStatic = () => {
      resize();
      gl.uniform1f(uTime, 6.0);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };
    const drawFrame = (now) => {
      resize();
      gl.uniform1f(uTime, (now - start) / 1000);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      raf = requestAnimationFrame(drawFrame);
    };

    if (reduceMotion) drawStatic();
    else raf = requestAnimationFrame(drawFrame);

    const ro = new ResizeObserver(() => {
      if (reduceMotion) drawStatic();
    });
    ro.observe(canvas);

    // NOTE: deliberately do NOT call WEBGL_lose_context here. Under React
    // StrictMode the effect mounts → cleans up → remounts on the same canvas;
    // a lost context can't be revived, so losing it would blank the panel in
    // dev. The context is reclaimed by GC when the canvas unmounts for real.
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [settings, reduceMotion]);

  return <canvas ref={canvasRef} className={className} style={style} aria-hidden="true" />;
};
