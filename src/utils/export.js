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
  return `worlddots-${slug}-${view}.${ext}`;
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
