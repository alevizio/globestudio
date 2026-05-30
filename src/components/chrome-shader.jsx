import { useRef, useEffect, useCallback } from "react";

// Canvas chrome / prismatic shader (provided by Alejandro; ported from TSX
// to JS and adapted to render contained + transparent so it works as a logo
// rather than a fullscreen background). The per-pixel shading math is kept
// verbatim — only sizing, mouse mapping, and transparency were changed.

const DEFAULT_CONFIG = {
  roughness: 0.15,
  specular: 2.7,
  fresnel: 0.55,
  flowSpeed: 0.5,
  distortion: 0.6,
  dispersion: 0.1,
  iridescence: 0.8,
  brushAngle: 2.2,
  tonemap: 0.4,
};

// Fit the SVG shape into the canvas (contain) and centre it.
function getLogoTransform(w, h, svgScale, svgWidth, svgHeight) {
  const fit = Math.min(w / svgWidth, h / svgHeight);
  const scale = fit * svgScale;
  const offsetX = (w - svgWidth * scale) / 2;
  const offsetY = (h - svgHeight * scale) / 2;
  return { scale, offsetX, offsetY };
}

export const ChromeShader = ({
  config = DEFAULT_CONFIG,
  svgScale = 0.92,
  theme = "dark",
  svgPath,
  svgWidth,
  svgHeight,
  solid = false,
}) => {
  const canvasRef = useRef(null);
  const rafRef = useRef(0);
  const configRef = useRef(config);
  const svgScaleRef = useRef(svgScale);
  const mouseRef = useRef({ x: -9999, y: -9999 });
  const shadeCanvasRef = useRef(null);
  const maskCanvasRef = useRef(null);
  const envRRef = useRef(null);
  const envGRef = useRef(null);
  const envBRef = useRef(null);
  const maskPixelsRef = useRef(null);
  const blurPixelsRef = useRef(null);
  const sizeRef = useRef({ w: 0, h: 0, dpr: 1, renderScale: 1 });
  const needsRebuildRef = useRef(true);
  const themeRef = useRef(theme);
  const svgPathRef = useRef(svgPath);
  const svgWidthRef = useRef(svgWidth);
  const svgHeightRef = useRef(svgHeight);
  const solidRef = useRef(solid);
  const startTimeRef = useRef(null);

  configRef.current = config;
  svgScaleRef.current = svgScale;
  themeRef.current = theme;
  svgPathRef.current = svgPath;
  svgWidthRef.current = svgWidth;
  svgHeightRef.current = svgHeight;
  solidRef.current = solid;

  /* Build separate R, G, B environment maps with chromatic offset */
  const buildEnvMaps = useCallback(() => {
    const size = 1024;
    const r = new Uint8ClampedArray(size);
    const g = new Uint8ClampedArray(size);
    const b = new Uint8ClampedArray(size);

    for (let i = 0; i < size; i++) {
      const t = i / size;

      let base = 18;
      base += 255 * Math.exp(-((t - 0.46) ** 2) / 0.002);
      base += 180 * Math.exp(-((t - 0.22) ** 2) / 0.004);
      base += 200 * Math.exp(-((t - 0.74) ** 2) / 0.005);
      base += 50 * Math.exp(-((t - 0.35) ** 2) / 0.02);
      base += 45 * Math.exp(-((t - 0.62) ** 2) / 0.015);
      base += 70 * Math.exp(-((t - 0.06) ** 2) / 0.003);
      base += 65 * Math.exp(-((t - 0.92) ** 2) / 0.004);

      const rShift = 0.012;
      const bShift = -0.012;
      const tR = (((t + rShift) % 1) + 1) % 1;
      const tB = (((t + bShift) % 1) + 1) % 1;

      let rVal = 18;
      rVal += 255 * Math.exp(-((tR - 0.46) ** 2) / 0.002);
      rVal += 180 * Math.exp(-((tR - 0.22) ** 2) / 0.004);
      rVal += 200 * Math.exp(-((tR - 0.74) ** 2) / 0.005);
      rVal += 50 * Math.exp(-((tR - 0.35) ** 2) / 0.02);
      rVal += 45 * Math.exp(-((tR - 0.62) ** 2) / 0.015);
      rVal += 70 * Math.exp(-((tR - 0.06) ** 2) / 0.003);
      rVal += 65 * Math.exp(-((tR - 0.92) ** 2) / 0.004);
      rVal *= 1.05;

      let bVal = 18;
      bVal += 255 * Math.exp(-((tB - 0.46) ** 2) / 0.002);
      bVal += 180 * Math.exp(-((tB - 0.22) ** 2) / 0.004);
      bVal += 200 * Math.exp(-((tB - 0.74) ** 2) / 0.005);
      bVal += 50 * Math.exp(-((tB - 0.35) ** 2) / 0.02);
      bVal += 45 * Math.exp(-((tB - 0.62) ** 2) / 0.015);
      bVal += 70 * Math.exp(-((tB - 0.06) ** 2) / 0.003);
      bVal += 65 * Math.exp(-((tB - 0.92) ** 2) / 0.004);
      bVal *= 1.08;

      r[i] = Math.min(255, rVal | 0);
      g[i] = Math.min(255, base | 0);
      b[i] = Math.min(255, bVal | 0);
    }

    envRRef.current = r;
    envGRef.current = g;
    envBRef.current = b;
  }, []);

  const buildMask = useCallback(() => {
    const w = sizeRef.current.w;
    const h = sizeRef.current.h;
    const renderScale = sizeRef.current.renderScale;
    const sw = Math.round(w * renderScale);
    const sh = Math.round(h * renderScale);
    if (w === 0 || h === 0 || !svgPathRef.current) return;

    if (!maskCanvasRef.current) maskCanvasRef.current = document.createElement("canvas");
    const mc = maskCanvasRef.current;
    mc.width = sw;
    mc.height = sh;

    const { scale, offsetX, offsetY } = getLogoTransform(
      w,
      h,
      svgScaleRef.current,
      svgWidthRef.current,
      svgHeightRef.current,
    );
    const path2d = new Path2D(svgPathRef.current);

    const mctx = mc.getContext("2d");
    mctx.fillStyle = "#000";
    mctx.fillRect(0, 0, sw, sh);
    mctx.save();
    mctx.translate(offsetX * renderScale, offsetY * renderScale);
    mctx.scale(scale * renderScale, scale * renderScale);
    mctx.fillStyle = "#fff";
    if (solidRef.current) {
      // Solid mode: visibility = the whole globe silhouette (one chrome
      // object, no wireframe gaps).
      mctx.beginPath();
      mctx.ellipse(
        svgWidthRef.current / 2,
        svgHeightRef.current / 2,
        svgWidthRef.current / 2,
        svgHeightRef.current / 2,
        0,
        0,
        Math.PI * 2,
      );
      mctx.fill();
    } else {
      mctx.fill(path2d);
    }
    mctx.restore();
    maskPixelsRef.current = mctx.getImageData(0, 0, sw, sh).data;

    // Shading domain: a SOLID orb over the globe's bounds, then blurred.
    // The surface normals (derived from this blur) sweep smoothly across
    // the whole mark, so the chrome reads as one continuous curved surface
    // rather than lighting each wireframe segment on its own. Visibility
    // still uses the wireframe mask above, so the grid shows through.
    const oc = document.createElement("canvas");
    oc.width = sw;
    oc.height = sh;
    const octx = oc.getContext("2d");
    octx.fillStyle = "#000";
    octx.fillRect(0, 0, sw, sh);
    octx.save();
    octx.translate(offsetX * renderScale, offsetY * renderScale);
    octx.scale(scale * renderScale, scale * renderScale);
    octx.fillStyle = "#fff";
    octx.beginPath();
    octx.ellipse(
      svgWidthRef.current / 2,
      svgHeightRef.current / 2,
      svgWidthRef.current / 2,
      svgHeightRef.current / 2,
      0,
      0,
      Math.PI * 2,
    );
    octx.fill();
    octx.restore();

    const bc = document.createElement("canvas");
    bc.width = sw;
    bc.height = sh;
    const bctx = bc.getContext("2d");
    bctx.filter = `blur(${Math.round(9 * renderScale)}px)`;
    bctx.drawImage(oc, 0, 0);
    blurPixelsRef.current = bctx.getImageData(0, 0, sw, sh).data;

    needsRebuildRef.current = false;
  }, []);

  const init = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const parent = canvas.parentElement;
    const dpr = window.devicePixelRatio || 1;
    const rect = parent ? parent.getBoundingClientRect() : { width: 200, height: 120 };
    const w = Math.max(1, Math.round(rect.width));
    const h = Math.max(1, Math.round(rect.height));
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const renderScale = Math.min(dpr, 1.5);
    sizeRef.current = { w, h, dpr, renderScale };
    needsRebuildRef.current = true;
    startTimeRef.current = null;

    const sw = Math.round(w * renderScale);
    const sh = Math.round(h * renderScale);
    if (!shadeCanvasRef.current) shadeCanvasRef.current = document.createElement("canvas");
    shadeCanvasRef.current.width = sw;
    shadeCanvasRef.current.height = sh;

    if (!envRRef.current) buildEnvMaps();
  }, [buildEnvMaps]);

  useEffect(() => {
    init();
    const parent = canvasRef.current?.parentElement;
    let ro;
    if (parent && "ResizeObserver" in window) {
      ro = new ResizeObserver(() => init());
      ro.observe(parent);
    } else {
      window.addEventListener("resize", init);
    }
    return () => {
      if (ro) ro.disconnect();
      else window.removeEventListener("resize", init);
    };
  }, [init]);

  useEffect(() => {
    // Mouse mapped relative to the canvas, so the specular highlight tracks
    // the cursor over the logo (and fades out when it's far away).
    const toLocal = (clientX, clientY) => {
      const c = canvasRef.current;
      if (!c) return;
      const r = c.getBoundingClientRect();
      mouseRef.current = { x: clientX - r.left, y: clientY - r.top };
    };
    const onMouse = (e) => toLocal(e.clientX, e.clientY);
    const onTouch = (e) => {
      const touch = e.touches[0];
      if (touch) toLocal(touch.clientX, touch.clientY);
    };
    window.addEventListener("mousemove", onMouse);
    window.addEventListener("touchstart", onTouch, { passive: true });
    window.addEventListener("touchmove", onTouch, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMouse);
      window.removeEventListener("touchstart", onTouch);
      window.removeEventListener("touchmove", onTouch);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return undefined;

    let outImg = null;
    let lastSw = 0;
    let lastSh = 0;

    const tonemapLUT = new Uint8Array(256);
    let lastTonemap = -1;

    let glowPath = null;
    let lastGlowSvg = "";

    let lastBrushAngle = -999;
    let brushCos = 1;
    let brushSin = 0;

    const animate = (timestamp) => {
      if (startTimeRef.current === null) startTimeRef.current = timestamp;
      const introElapsed = (timestamp - startTimeRef.current) * 0.001;
      const introDuration = 2.0;

      if (needsRebuildRef.current) buildMask();

      const cfg = configRef.current;
      const dpr = sizeRef.current.dpr;
      const w = sizeRef.current.w;
      const h = sizeRef.current.h;
      const time = timestamp * 0.001;
      const mouse = mouseRef.current;
      const envR = envRRef.current;
      const envG = envGRef.current;
      const envB = envBRef.current;
      const mask = maskPixelsRef.current;
      const blur = blurPixelsRef.current;
      const shadeCanvas = shadeCanvasRef.current;

      if (!envR || !envG || !envB || !mask || !blur || !shadeCanvas || w === 0) {
        rafRef.current = requestAnimationFrame(animate);
        return;
      }

      const renderScale = sizeRef.current.renderScale;
      const sw = Math.round(w * renderScale);
      const sh = Math.round(h * renderScale);

      const sctx = shadeCanvas.getContext("2d");
      if (!outImg || sw !== lastSw || sh !== lastSh) {
        outImg = sctx.createImageData(sw, sh);
        lastSw = sw;
        lastSh = sh;
      }
      const out = outImg.data;
      const isLight = themeRef.current === "light";
      // Transparent outside the shape (logo mode) — was an opaque bg fill.
      for (let i = 0, len = out.length; i < len; i += 4) {
        out[i] = 0;
        out[i + 1] = 0;
        out[i + 2] = 0;
        out[i + 3] = 0;
      }

      const stride = sw * 4;
      const envLen = 1024;

      if (cfg.tonemap !== lastTonemap) {
        lastTonemap = cfg.tonemap;
        if (cfg.tonemap === 1.0) {
          for (let i = 0; i < 256; i++) tonemapLUT[i] = i;
        } else {
          const invTone = 1 / cfg.tonemap;
          for (let i = 0; i < 256; i++) {
            tonemapLUT[i] = (255 * Math.pow(i / 255, invTone)) | 0;
          }
        }
      }

      if (cfg.brushAngle !== lastBrushAngle) {
        lastBrushAngle = cfg.brushAngle;
        brushCos = Math.cos(cfg.brushAngle);
        brushSin = Math.sin(cfg.brushAngle);
      }

      const mx = mouse.x / w;
      const my = mouse.y / h;

      const cfgRoughness = cfg.roughness;
      const cfgFlowSpeed = cfg.flowSpeed;
      const cfgDistortion = cfg.distortion;
      const cfgFresnel = cfg.fresnel;
      const cfgSpecular = cfg.specular;
      const cfgBrushAngle = cfg.brushAngle;
      const cfgIridescence = cfg.iridescence;
      const cfgDispersion = cfg.dispersion;
      const chromaticSpread = cfgDispersion * 0.06;

      const t11 = time * cfgFlowSpeed * 1.1;
      const t07 = time * cfgFlowSpeed * 0.7;
      const t04 = time * cfgFlowSpeed * 0.4;
      const t16 = time * cfgFlowSpeed * 1.6;
      const tEnv = time * cfgFlowSpeed * 0.03;
      const tIrid = time * cfgFlowSpeed * 0.15;

      const invSw = 1 / sw;
      const invSh = 1 / sh;

      for (let y = 1; y < sh - 1; y++) {
        const yOff = y * stride;
        const py = y * invSh;

        for (let x = 1; x < sw - 1; x++) {
          const idx = yOff + x * 4;
          if (mask[idx] < 128) continue;

          const left = blur[idx - 4];
          const right = blur[idx + 4];
          const up = blur[idx - stride];
          const down = blur[idx + stride];

          let nx = (right - left) / 510;
          let ny = (down - up) / 510;

          const px = x * invSw;

          const r1 =
            Math.sin(px * 20 * cfgRoughness + t11) *
            Math.cos(py * 16 * cfgRoughness + t07) *
            0.22 *
            cfgDistortion;
          const r2 = Math.sin((px + py) * 24 * cfgRoughness - t04) * 0.14 * cfgDistortion;
          const r3 = Math.cos(px * 32 * cfgRoughness + py * 12 - t16) * 0.09 * cfgDistortion;

          nx += r1 + r2;
          ny += r3 + r1 * 0.6;

          const baseCoord = (nx + r2) * 4 + px * 2 + tEnv;

          let envUR = (baseCoord + chromaticSpread) % 1;
          if (envUR < 0) envUR += 1;
          let envUG = baseCoord % 1;
          if (envUG < 0) envUG += 1;
          let envUB = (baseCoord - chromaticSpread) % 1;
          if (envUB < 0) envUB += 1;

          const envIdxR = (envUR * (envLen - 1)) | 0;
          const envIdxG = (envUG * (envLen - 1)) | 0;
          const envIdxB = (envUB * (envLen - 1)) | 0;

          let cr = envR[envIdxR];
          let cg = envG[envIdxG];
          let cb = envB[envIdxB];

          let envU2 = (envUG + 0.35 + ny * 2.5) % 1;
          if (envU2 < 0) envU2 += 1;
          const envIdx2R = (((envU2 + chromaticSpread) % 1) * (envLen - 1)) | 0;
          const envIdx2G = (envU2 * (envLen - 1)) | 0;
          const envIdx2B = (((((envU2 - chromaticSpread) % 1) + 1) % 1) * (envLen - 1)) | 0;

          cr = (cr * 0.6 + envR[envIdx2R] * 0.4) | 0;
          cg = (cg * 0.6 + envG[envIdx2G] * 0.4) | 0;
          cb = (cb * 0.6 + envB[envIdx2B] * 0.4) | 0;

          cr = ((cr * (cr + 50)) / 305) | 0;
          cg = ((cg * (cg + 50)) / 305) | 0;
          cb = ((cb * (cb + 50)) / 305) | 0;

          if (isLight) {
            cr = 255 - cr;
            cg = 255 - cg;
            cb = 255 - cb;
            if (cr > 220) cr = 220;
            if (cg > 220) cg = 220;
            if (cb > 218) cb = 218;
          } else {
            if (cr < 25) cr = 25;
            if (cg < 25) cg = 25;
            if (cb < 28) cb = 28;
          }

          if (cfgIridescence > 0.01) {
            const angle = Math.atan2(ny + r1, nx + r2) + tIrid;
            const hue = ((angle / Math.PI) * 0.5 + 0.5) % 1;
            const h6 = hue * 6;
            const sector = h6 | 0;
            const frac = h6 - sector;
            let ir = 0;
            let ig = 0;
            let ib = 0;
            switch (sector % 6) {
              case 0: ir = 1; ig = frac; ib = 0; break;
              case 1: ir = 1 - frac; ig = 1; ib = 0; break;
              case 2: ir = 0; ig = 1; ib = frac; break;
              case 3: ir = 0; ig = 1 - frac; ib = 1; break;
              case 4: ir = frac; ig = 0; ib = 1; break;
              case 5: ir = 1; ig = 0; ib = 1 - frac; break;
              default: break;
            }
            const iFactor = cfgIridescence * 0.35;
            const brightness = (cr + cg + cb) / 765;
            const edgeFade = brightness * 3 < 1 ? brightness * 3 : 1;
            const inject = 120 * iFactor * edgeFade;
            cr = (cr + ir * inject) | 0;
            cg = (cg + ig * inject) | 0;
            cb = (cb + ib * inject) | 0;
          }

          const minEdge =
            left < right
              ? left < up
                ? left < down
                  ? left
                  : down
                : up < down
                  ? up
                  : down
              : right < up
                ? right < down
                  ? right
                  : down
                : up < down
                  ? up
                  : down;
          const edgeness = 1 - minEdge / 255;
          if (edgeness > 0.02) {
            const f = edgeness * edgeness * cfgFresnel;
            cr = (cr + f * 180) | 0;
            cg = (cg + f * 200) | 0;
            cb = (cb + f * 240) | 0;
          }

          const ldx = px - mx;
          const ldy = py - my;
          const ld2 = ldx * ldx + ldy * ldy;
          if (ld2 < 0.15) {
            const sx = ldx + nx * 0.4;
            const sy = ldy + ny * 0.4;
            const sd = Math.sqrt(sx * sx + sy * sy);
            const sp = 1 - sd * 4;
            if (sp > 0) {
              const sp2 = sp * sp;
              const spow = sp2 * sp2 * sp * cfgSpecular;
              cr = (cr + spow * 255) | 0;
              cg = (cg + spow * 245) | 0;
              cb = (cb + spow * 260) | 0;
            }
          }

          if (cfgBrushAngle > 0.01) {
            const bc2 = px * brushCos + py * brushSin;
            const br = Math.sin(bc2 * 400 * cfgRoughness + nx * 20) * 0.5 + 0.5;
            const bfx = br * 0.12 + 0.88;
            cr = (cr * bfx) | 0;
            cg = (cg * bfx) | 0;
            cb = (cb * bfx) | 0;
          }

          out[idx] = tonemapLUT[cr > 255 ? 255 : cr < 0 ? 0 : cr];
          out[idx + 1] = tonemapLUT[cg > 255 ? 255 : cg < 0 ? 0 : cg];
          out[idx + 2] = tonemapLUT[cb > 255 ? 255 : cb < 0 ? 0 : cb];
          out[idx + 3] = 255;
        }
      }

      sctx.putImageData(outImg, 0, 0);

      const introFade =
        introElapsed >= introDuration ? 1 : Math.pow(Math.min(introElapsed / introDuration, 1), 2);

      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.globalAlpha = introFade;
      ctx.drawImage(shadeCanvas, 0, 0, sw, sh, 0, 0, canvas.width, canvas.height);
      ctx.globalAlpha = 1;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const { scale: lScale, offsetX: lOx, offsetY: lOy } = getLogoTransform(
        w,
        h,
        svgScaleRef.current,
        svgWidthRef.current,
        svgHeightRef.current,
      );
      const curSvg = svgPathRef.current;
      if (curSvg !== lastGlowSvg) {
        glowPath = new Path2D(curSvg);
        lastGlowSvg = curSvg;
      }
      ctx.save();
      ctx.globalCompositeOperation = isLight ? "multiply" : "screen";
      ctx.filter = `blur(${14 + Math.sin(time * 0.25) * 4}px)`;
      ctx.globalAlpha = 0.08 * cfgFresnel * introFade;
      ctx.translate(lOx, lOy);
      ctx.scale(lScale, lScale);

      const glowHue = (time * 0.1) % 1;
      const glowR = Math.sin(glowHue * Math.PI * 2) * 0.5 + 0.5;
      const glowG = Math.sin((glowHue + 0.33) * Math.PI * 2) * 0.5 + 0.5;
      const glowB = Math.sin((glowHue + 0.66) * Math.PI * 2) * 0.5 + 0.5;

      if (isLight) {
        ctx.fillStyle = `rgb(${(80 + glowR * 60) | 0}, ${(80 + glowG * 60) | 0}, ${(80 + glowB * 60) | 0})`;
      } else {
        ctx.fillStyle = `rgb(${(180 + glowR * 75) | 0}, ${(180 + glowG * 75) | 0}, ${(200 + glowB * 55) | 0})`;
      }
      if (glowPath) ctx.fill(glowPath);
      ctx.restore();

      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  }, [buildMask]);

  return <canvas ref={canvasRef} style={{ display: "block", width: "100%", height: "100%" }} />;
};
