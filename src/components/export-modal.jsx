import { useEffect, useMemo, useRef, useState } from "react";
import { useModalA11y } from "../hooks/use-modal-a11y.js";
import { Check, Clipboard, Download, Share2, Upload, X } from "./icons.jsx";

const ASPECT_OPTIONS = [
  { id: "original", label: "Original", ratio: null },
  { id: "1:1", label: "1:1", ratio: 1 },
  { id: "4:5", label: "4:5", ratio: 4 / 5 },
  { id: "16:9", label: "16:9", ratio: 16 / 9 },
  { id: "9:16", label: "9:16", ratio: 9 / 16 },
];

const QUALITY_OPTIONS = [
  { id: "draft", label: "Draft", scale: 1 },
  { id: "standard", label: "Standard", scale: 2 },
  { id: "high", label: "High", scale: 3 },
  { id: "ultra", label: "Ultra", scale: 4 },
];

const FPS_OPTIONS = [24, 30, 60];
const DURATION_OPTIONS = [3, 5, 8, 12];

const computeDimensions = (baseW, baseH, aspectId, scale) => {
  const aspect = ASPECT_OPTIONS.find((a) => a.id === aspectId)?.ratio ?? null;
  if (!aspect) {
    return {
      width: Math.round(baseW * scale),
      height: Math.round(baseH * scale),
    };
  }
  const baseAspect = baseW / Math.max(baseH, 1);
  let w;
  let h;
  if (baseAspect >= aspect) {
    // Source is wider than target — crop sides, full height.
    h = baseH;
    w = baseH * aspect;
  } else {
    // Source is taller than target — crop top/bottom, full width.
    w = baseW;
    h = baseW / aspect;
  }
  return { width: Math.round(w * scale), height: Math.round(h * scale) };
};

const Tabs = ({ tab, setTab, hasVideo }) => {
  const tabs = [
    { id: "image", label: "Image" },
    hasVideo && { id: "video", label: "Video" },
    { id: "svg", label: "SVG" },
    { id: "share", label: "Share" },
  ].filter(Boolean);

  // Refs to each tab button so we can measure the active one and slide
  // a single underline indicator to its position. Keyed by tab id so the
  // map survives re-renders without churn.
  const listRef = useRef(null);
  const tabRefs = useRef(new Map());
  const [indicator, setIndicator] = useState({ left: 0, width: 0, visible: false });

  useEffect(() => {
    const list = listRef.current;
    const node = tabRefs.current.get(tab);
    if (!list || !node) return undefined;
    const measure = () => {
      const listRect = list.getBoundingClientRect();
      const tabRect = node.getBoundingClientRect();
      setIndicator({
        left: tabRect.left - listRect.left + 12,
        width: tabRect.width - 24,
        visible: true,
      });
    };
    measure();
    // Re-measure when fonts settle / the panel resizes — both can shift
    // tab widths after the first paint.
    const observer = new ResizeObserver(measure);
    observer.observe(list);
    return () => observer.disconnect();
  }, [tab]);

  // ARIA tablist convention: ArrowLeft/Right move selection, Home/End jump to
  // ends. We wrap around so power users can hold the arrow key.
  const onKeyDown = (event) => {
    const currentIndex = tabs.findIndex((t) => t.id === tab);
    if (currentIndex < 0) return;
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      setTab(tabs[(currentIndex - 1 + tabs.length) % tabs.length].id);
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      setTab(tabs[(currentIndex + 1) % tabs.length].id);
    } else if (event.key === "Home") {
      event.preventDefault();
      setTab(tabs[0].id);
    } else if (event.key === "End") {
      event.preventDefault();
      setTab(tabs[tabs.length - 1].id);
    }
  };

  return (
    <nav
      ref={listRef}
      className="export-modal-tabs"
      role="tablist"
      aria-label="Export type"
      onKeyDown={onKeyDown}
      style={{
        "--tab-indicator-left": `${indicator.left}px`,
        "--tab-indicator-width": `${indicator.width}px`,
        "--tab-indicator-opacity": indicator.visible ? 1 : 0,
      }}
    >
      {tabs.map((t) => (
        <button
          key={t.id}
          ref={(node) => {
            if (node) tabRefs.current.set(t.id, node);
            else tabRefs.current.delete(t.id);
          }}
          type="button"
          role="tab"
          aria-selected={tab === t.id}
          tabIndex={tab === t.id ? 0 : -1}
          className={`export-modal-tab ${tab === t.id ? "is-active" : ""}`}
          onClick={() => setTab(t.id)}
        >
          {t.label}
        </button>
      ))}
    </nav>
  );
};

const PillRow = ({ label, options, value, onChange, getKey = (o) => o.id, getLabel = (o) => o.label }) => (
  <div className="export-modal-field">
    <label className="export-modal-label">{label}</label>
    <div className="export-modal-pills">
      {options.map((option) => {
        const key = getKey(option);
        return (
          <button
            key={key}
            type="button"
            className={`export-modal-pill ${value === key ? "is-active" : ""}`}
            onClick={() => onChange(key)}
          >
            {getLabel(option)}
          </button>
        );
      })}
    </div>
  </div>
);

const DimensionInputs = ({ width, height, onWidth, onHeight }) => (
  <div className="export-modal-dimensions">
    <div className="export-modal-dimension">
      <label className="export-modal-label">Width</label>
      <input
        type="number"
        className="export-modal-input"
        aria-label="Export width"
        value={width}
        min={64}
        max={8192}
        onChange={(event) => onWidth(Math.max(64, Math.min(8192, Number(event.target.value) || 0)))}
      />
    </div>
    <div className="export-modal-dimension">
      <label className="export-modal-label">Height</label>
      <input
        type="number"
        className="export-modal-input"
        aria-label="Export height"
        value={height}
        min={64}
        max={8192}
        onChange={(event) => onHeight(Math.max(64, Math.min(8192, Number(event.target.value) || 0)))}
      />
    </div>
  </div>
);

export const ExportModal = ({
  open,
  onClose,
  canvasWidth,
  canvasHeight,
  exportPng,
  pngStatus,
  exportSvg,
  svgStatus,
  copySvg,
  copyStatus,
  exportVideo,
  videoStatus,
  videoProgress,
  videoDurationMs,
  setVideoDurationMs,
  videoSupported,
  exportConfig,
  importConfig,
  getShareUrl,
}) => {
  const [tab, setTab] = useState("image");
  const [aspect, setAspect] = useState("original");
  const [quality, setQuality] = useState("standard");
  const [fps, setFps] = useState(60);
  const [videoSeconds, setVideoSeconds] = useState(Math.round((videoDurationMs ?? 5000) / 1000));
  const [linkStatus, setLinkStatus] = useState("idle");
  const handleCopyLink = async () => {
    // Prefer the full-config share URL when the parent provides one
    // — it encodes the user's customizations in a `?c=…` param so the
    // recipient lands on the exact same look, not just the base preset.
    // Falls back to window.location.href for callers that haven't
    // wired the share-URL builder (back-compat).
    const url =
      typeof getShareUrl === "function"
        ? getShareUrl()
        : window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      setLinkStatus("copied");
      window.setTimeout(() => setLinkStatus("idle"), 1800);
    } catch {
      setLinkStatus("manual");
      window.setTimeout(() => setLinkStatus("idle"), 3000);
    }
  };
  const [reactStatus, setReactStatus] = useState("idle");
  const handleCopyReact = async () => {
    // Build a ready-to-paste @globestudio/react snippet from the current
    // share config. getShareUrl()'s `?c=…` payload is exactly what the
    // component's `config` prop expects (it re-encodes via URLSearchParams).
    let configValue = null;
    try {
      if (typeof getShareUrl === "function") {
        configValue = new URL(getShareUrl(), window.location.origin).searchParams.get("c");
      }
    } catch {
      configValue = null;
    }
    const snippet = `import { Globe } from "@globestudio/react";\n\n<Globe\n${
      configValue ? `  config={${JSON.stringify(configValue)}}\n` : ""
    }  width={${width}}\n  height={${height}}\n/>`;
    try {
      await navigator.clipboard.writeText(snippet);
      setReactStatus("copied");
      window.setTimeout(() => setReactStatus("idle"), 1800);
    } catch {
      setReactStatus("manual");
      window.setTimeout(() => setReactStatus("idle"), 3000);
    }
  };
  const fileInputRef = useRef(null);
  const dialogRef = useRef(null);

  const baseDims = useMemo(() => {
    const baseW = Math.max(1, canvasWidth || 1);
    const baseH = Math.max(1, canvasHeight || 1);
    const scale = QUALITY_OPTIONS.find((q) => q.id === quality)?.scale ?? 1;
    return computeDimensions(baseW, baseH, aspect, scale);
  }, [canvasWidth, canvasHeight, aspect, quality]);

  const [width, setWidth] = useState(baseDims.width);
  const [height, setHeight] = useState(baseDims.height);
  const [manualDims, setManualDims] = useState(false);

  // When aspect or quality changes, recompute the suggested dimensions.
  // User can still override via the inputs (sets manualDims).
  useEffect(() => {
    if (manualDims) return;
    setWidth(baseDims.width);
    setHeight(baseDims.height);
  }, [baseDims.width, baseDims.height, manualDims]);

  // Reset to suggested whenever aspect/quality changes.
  useEffect(() => {
    setManualDims(false);
  }, [aspect, quality]);

  // Sync videoSeconds with videoDurationMs and vice versa.
  useEffect(() => {
    setVideoSeconds(Math.round((videoDurationMs ?? 5000) / 1000));
  }, [videoDurationMs]);

  // Accessibility plumbing — Escape to close, focus moves into dialog, inert
  // applied to siblings so Tab can't escape behind the modal. See
  // src/hooks/use-modal-a11y.js for the full implementation and the WCAG
  // criteria this satisfies (2.1.2, 2.4.11, dialog pattern).
  useModalA11y({
    open,
    onClose,
    containerRef: dialogRef,
    backdropSelector: ".export-modal-backdrop",
  });

  if (!open) return null;

  const scale = QUALITY_OPTIONS.find((q) => q.id === quality)?.scale ?? 1;

  const handlePng = () => {
    exportPng?.({ scale, width, height, aspect });
  };

  const handleVideo = () => {
    setVideoDurationMs?.(videoSeconds * 1000);
    exportVideo?.({ scale, fps, durationMs: videoSeconds * 1000 });
  };

  const handleFileImport = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(String(e.target?.result || "{}"));
        importConfig?.(parsed);
      } catch (error) {
        console.warn("Failed to import config", error);
      }
    };
    reader.readAsText(file);
    event.target.value = "";
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(String(e.target?.result || "{}"));
        importConfig?.(parsed);
      } catch (error) {
        console.warn("Failed to import config", error);
      }
    };
    reader.readAsText(file);
  };

  const isRecording = videoStatus === "recording";
  const recordingPct = Math.round((videoProgress || 0) * 100);

  return (
    <div className="export-modal-backdrop" onClick={onClose} role="presentation">
      <div
        className="export-modal"
        role="dialog"
        aria-modal="true"
        aria-label="Export"
        tabIndex={-1}
        ref={dialogRef}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="export-modal-header">
          <h2 className="export-modal-title">Export</h2>
          <button
            type="button"
            className="export-modal-close"
            onClick={onClose}
            aria-label="Close export dialog"
          >
            <X size={18} />
          </button>
        </header>

        <Tabs tab={tab} setTab={setTab} hasVideo={videoSupported} />

        <div className="export-modal-body">
        <div key={tab} className="export-modal-pane">
          {tab === "image" && (
            <>
              <PillRow label="Aspect" options={ASPECT_OPTIONS} value={aspect} onChange={setAspect} />
              <PillRow label="Quality" options={QUALITY_OPTIONS} value={quality} onChange={setQuality} />
              <DimensionInputs
                width={width}
                height={height}
                onWidth={(value) => {
                  setManualDims(true);
                  setWidth(value);
                }}
                onHeight={(value) => {
                  setManualDims(true);
                  setHeight(value);
                }}
              />
              <p className="export-modal-caption">Uses the current globe frame at export time.</p>
              <button
                type="button"
                className={`export-modal-cta ${pngStatus === "saved" ? "is-success" : ""}`}
                onClick={handlePng}
              >
                {pngStatus === "saved" ? <Check size={17} /> : <Download size={17} />}
                <span>{pngStatus === "saved" ? "PNG saved" : "Export PNG"}</span>
              </button>
            </>
          )}

          {tab === "video" && videoSupported && (
            <>
              <PillRow label="Aspect" options={ASPECT_OPTIONS} value={aspect} onChange={setAspect} />
              <PillRow label="Quality" options={QUALITY_OPTIONS} value={quality} onChange={setQuality} />
              <DimensionInputs
                width={width}
                height={height}
                onWidth={(value) => {
                  setManualDims(true);
                  setWidth(value);
                }}
                onHeight={(value) => {
                  setManualDims(true);
                  setHeight(value);
                }}
              />
              <div className="export-modal-row">
                <PillRow
                  label="FPS"
                  options={FPS_OPTIONS.map((value) => ({ id: value, label: String(value) }))}
                  value={fps}
                  onChange={setFps}
                />
                <div className="export-modal-field">
                  <label className="export-modal-label" htmlFor="export-duration">Duration (s)</label>
                  <div className="export-modal-pills">
                    {DURATION_OPTIONS.map((seconds) => (
                      <button
                        key={seconds}
                        type="button"
                        className={`export-modal-pill ${videoSeconds === seconds ? "is-active" : ""}`}
                        onClick={() => setVideoSeconds(seconds)}
                      >
                        {seconds}s
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              {isRecording && (
                <div className="export-modal-progress" aria-hidden="true">
                  <div className="export-modal-progress-fill" style={{ width: `${recordingPct}%` }} />
                </div>
              )}
              <button
                type="button"
                className={`export-modal-cta ${isRecording ? "is-recording" : ""}`}
                onClick={handleVideo}
                disabled={isRecording}
              >
                <Download size={17} />
                <span>{isRecording ? `Recording… ${recordingPct}%` : "Export WebM"}</span>
              </button>
            </>
          )}

          {tab === "svg" && (
            <>
              <p className="export-modal-caption">Vector export — dot positions, shapes, and colors. Effects and atmosphere are not applied (post-effects can't be rasterized into vectors).</p>
              <button
                type="button"
                className={`export-modal-cta ${svgStatus === "saved" ? "is-success" : ""}`}
                onClick={exportSvg}
              >
                {svgStatus === "saved" ? <Check size={17} /> : <Download size={17} />}
                <span>{svgStatus === "saved" ? "SVG saved" : "Download SVG"}</span>
              </button>
              <button
                type="button"
                className={`export-modal-cta is-secondary ${copyStatus === "copied" ? "is-success" : ""}`}
                onClick={copySvg}
              >
                {copyStatus === "copied" ? <Check size={17} /> : <Clipboard size={17} />}
                <span>
                  {copyStatus === "copied"
                    ? "SVG copied to clipboard"
                    : copyStatus === "manual"
                      ? "Select SVG code"
                      : "Copy SVG to clipboard"}
                </span>
              </button>
            </>
          )}

          {tab === "share" && (
            <>
              <p className="export-modal-caption">
                Copy the current URL — anyone who opens it lands on the same look. For exact
                customizations beyond a preset, export the configuration as JSON below.
              </p>
              <button
                type="button"
                className={`export-modal-cta ${linkStatus === "copied" ? "is-success" : ""}`}
                onClick={handleCopyLink}
              >
                {linkStatus === "copied" ? <Check size={17} /> : <Clipboard size={17} />}
                <span>
                  {linkStatus === "copied"
                    ? "Link copied to clipboard"
                    : linkStatus === "manual"
                      ? "Copy the address bar URL"
                      : "Copy share link"}
                </span>
              </button>
              <button
                type="button"
                className={`export-modal-cta is-secondary ${reactStatus === "copied" ? "is-success" : ""}`}
                onClick={handleCopyReact}
              >
                {reactStatus === "copied" ? <Check size={17} /> : <Clipboard size={17} />}
                <span>
                  {reactStatus === "copied"
                    ? "React snippet copied"
                    : reactStatus === "manual"
                      ? "Copy failed — try again"
                      : "Copy as React (@globestudio/react)"}
                </span>
              </button>
              <button
                type="button"
                className="export-modal-cta is-secondary"
                onClick={exportConfig}
              >
                <Share2 size={17} />
                <span>Export configuration</span>
              </button>
              <div
                className="export-modal-dropzone"
                onDragOver={(event) => event.preventDefault()}
                onDrop={handleDrop}
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                onClick={() => fileInputRef.current?.click()}
              >
                <Upload size={20} />
                <div className="export-modal-dropzone-text">
                  <strong>Import .json configuration</strong>
                  <span>Drag & drop or click to choose a file.</span>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="application/json,.json"
                  hidden
                  onChange={handleFileImport}
                />
              </div>
            </>
          )}
        </div>
        </div>
      </div>
    </div>
  );
};
