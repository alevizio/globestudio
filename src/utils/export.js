export const exportScaleValue = (canvasScale) => Number(canvasScale.replace("x", "")) || 1;

export const downloadBlob = (blob, filename) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
};

// Decode a data: URL into a Blob. Used for the PNG export fallback: the async
// canvas.toBlob callback can be starved by the render loop under software
// WebGL and never fire, so we encode synchronously via toDataURL (which always
// returns) and rebuild a Blob here for a uniform download path.
export const dataUrlToBlob = (dataUrl) => {
  const [header, data] = String(dataUrl).split(",");
  if (!data) return null;
  const mime = header.match(/data:([^;]+)/)?.[1] ?? "image/png";
  const binary = atob(data);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], { type: mime });
};

export const copyTextToClipboard = async (text) => {
  try {
    if (!navigator.clipboard?.writeText) throw new Error("Clipboard API unavailable");
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "0";
    textarea.style.left = "-9999px";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.focus({ preventScroll: true });
    textarea.select();
    textarea.setSelectionRange(0, text.length);
    const copied = document.execCommand("copy");
    textarea.remove();
    if (!copied) throw new Error("Copy command failed");
    return true;
  }
};

export const buildExportFilename = (label, ext, viewMode) => {
  const slug = (label || "world")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32) || "world";
  const view = viewMode === "globe" ? "globe" : "map";
  return `globestudio-${slug}-${view}.${ext}`;
};

// Choose the best supported video MIME type for canvas recording. WebM is the
// only format browsers reliably encode in MediaRecorder — VP9 if available,
// fall back to VP8, then default WebM.
export const pickVideoMimeType = () => {
  if (typeof MediaRecorder === "undefined") return null;
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
  ];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || null;
};

// Record a canvas for `durationMs` milliseconds and return a Blob.
// Uses the browser's MediaRecorder pulling frames at `fps` from the canvas
// stream. Bitrate is generous so the post-effects (bloom, chromatic, twinkle)
// don't get smeared by compression.
export const recordCanvasToVideoBlob = (canvas, { durationMs = 4000, fps = 60, bitsPerSecond = 12_000_000, onProgress } = {}) => {
  return new Promise((resolve, reject) => {
    const mimeType = pickVideoMimeType();
    if (!mimeType) {
      reject(new Error("Browser doesn't support video recording"));
      return;
    }
    const stream = canvas.captureStream?.(fps);
    if (!stream) {
      reject(new Error("Canvas can't be captured as stream"));
      return;
    }
    const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: bitsPerSecond });
    const chunks = [];
    recorder.ondataavailable = (event) => {
      if (event.data?.size > 0) chunks.push(event.data);
    };
    recorder.onerror = (event) => reject(event.error || new Error("MediaRecorder error"));
    recorder.onstop = () => {
      const blob = new Blob(chunks, { type: mimeType });
      resolve(blob);
    };

    const start = performance.now();
    let interval = null;
    if (onProgress) {
      interval = window.setInterval(() => {
        onProgress(Math.min(1, (performance.now() - start) / durationMs));
      }, 100);
    }

    recorder.start();
    window.setTimeout(() => {
      if (interval) window.clearInterval(interval);
      try {
        recorder.stop();
      } catch (error) {
        reject(error);
      }
    }, durationMs);
  });
};

// Record the canvas as an animated GIF by sampling frames across `durationMs`
// and encoding with gifenc. GIF plays everywhere WebM doesn't — Slack, X,
// Keynote, iOS Safari, docs. gifenc is dynamically imported so it only loads
// when a GIF export is actually requested (stays off the initial bundle).
export const recordCanvasToGifBlob = async (
  canvas,
  { durationMs = 4000, fps = 15, maxSize = 640, onProgress } = {},
) => {
  const { GIFEncoder, quantize, applyPalette } = await import("gifenc");
  const scale = Math.min(1, maxSize / Math.max(canvas.width, canvas.height));
  const w = Math.max(2, Math.round(canvas.width * scale));
  const h = Math.max(2, Math.round(canvas.height * scale));
  const off = document.createElement("canvas");
  off.width = w;
  off.height = h;
  const ctx = off.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new Error("Can't get a 2D context for GIF capture");
  const encoder = GIFEncoder();
  const frameCount = Math.max(1, Math.round((durationMs / 1000) * fps));
  const delay = Math.round(1000 / fps);
  for (let i = 0; i < frameCount; i += 1) {
    const tick = performance.now();
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(canvas, 0, 0, w, h);
    const { data } = ctx.getImageData(0, 0, w, h);
    const palette = quantize(data, 256);
    const index = applyPalette(data, palette);
    encoder.writeFrame(index, w, h, { palette, delay });
    onProgress?.((i + 1) / frameCount);
    // Space captures across real time so the GIF samples the live animation.
    const elapsed = performance.now() - tick;
    if (i < frameCount - 1 && elapsed < delay) {
      await new Promise((resolve) => window.setTimeout(resolve, delay - elapsed));
    }
  }
  encoder.finish();
  return new Blob([encoder.bytesView()], { type: "image/gif" });
};

// MP4 export plays where WebM doesn't (Safari/iOS, social, Keynote). Requires
// WebCodecs (Chrome/Edge, Safari 16.4+). Encodes H.264 via VideoEncoder and
// muxes with mp4-muxer (both dynamic-imported -> their own lazy chunk).
export const supportsMp4Export = () =>
  typeof window !== "undefined" && typeof window.VideoEncoder !== "undefined";

export const recordCanvasToMp4Blob = async (
  canvas,
  { durationMs = 4000, fps = 30, bitrate = 12_000_000, maxSize = 1024, onProgress } = {},
) => {
  if (!supportsMp4Export()) {
    throw new Error("This browser can't encode MP4 (no WebCodecs). Try WebM or GIF.");
  }
  const { Muxer, ArrayBufferTarget } = await import("mp4-muxer");
  // Capture from an offscreen canvas: H.264 needs even dimensions, and a
  // capped size keeps the frame within H.264 level 4.0 limits on any aspect.
  const scale = Math.min(1, maxSize / Math.max(canvas.width, canvas.height));
  const width = Math.max(2, Math.round((canvas.width * scale) / 2) * 2);
  const height = Math.max(2, Math.round((canvas.height * scale) / 2) * 2);
  const off = document.createElement("canvas");
  off.width = width;
  off.height = height;
  const ctx = off.getContext("2d");
  if (!ctx) throw new Error("Can't get a 2D context for MP4 capture");

  const muxer = new Muxer({
    target: new ArrayBufferTarget(),
    video: { codec: "avc", width, height },
    fastStart: "in-memory",
  });
  let encodeError = null;
  const encoder = new window.VideoEncoder({
    output: (chunk, meta) => muxer.addVideoChunk(chunk, meta),
    error: (err) => {
      encodeError = err;
    },
  });
  encoder.configure({
    codec: "avc1.420028", // H.264 baseline, level 4.0 — broad playback + ≤1024px
    width,
    height,
    bitrate,
    framerate: fps,
  });

  const frameCount = Math.max(1, Math.round((durationMs / 1000) * fps));
  const frameDurUs = 1_000_000 / fps;
  const targetMs = 1000 / fps;
  for (let i = 0; i < frameCount; i += 1) {
    if (encodeError) throw encodeError;
    const tick = performance.now();
    ctx.clearRect(0, 0, width, height);
    ctx.drawImage(canvas, 0, 0, width, height);
    const frame = new window.VideoFrame(off, {
      timestamp: Math.round(i * frameDurUs),
      duration: Math.round(frameDurUs),
    });
    encoder.encode(frame, { keyFrame: i % fps === 0 });
    frame.close();
    onProgress?.((i + 1) / frameCount);
    const elapsed = performance.now() - tick;
    if (i < frameCount - 1 && elapsed < targetMs) {
      await new Promise((resolve) => window.setTimeout(resolve, targetMs - elapsed));
    }
  }
  await encoder.flush();
  encoder.close();
  if (encodeError) throw encodeError;
  muxer.finalize();
  return new Blob([muxer.target.buffer], { type: "video/mp4" });
};
