import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { useModalA11y } from "../hooks/use-modal-a11y.js";
import { Check, Clipboard, Download, Share2, Upload, X } from "./icons.jsx";
import { track } from "./analytics.jsx";
import { ErrorBoundary } from "./error-boundary.jsx";
import { EmbedCode } from "./embed-code.jsx";
import { canCopyImageToClipboard } from "../utils/export.js";

// The MCP tab's content (client commands, prompt builder and its CSS) loads
// only when that tab opens. Until it arrives an empty stand-in holds the
// tab's height. If the chunk fails, the tab stays empty and the rest of the
// dialog still works.
const AgentShare = lazy(() =>
  import("./agent-share.jsx").then((m) => ({ default: m.AgentShare })),
);
// The Skill tab's install commands load the same way, in a chunk of their own.
const AgentSkill = lazy(() =>
  import("./agent-skill.jsx").then((m) => ({ default: m.AgentSkill })),
);

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

// The tab row's phone form, which leaves the Figma tab out. In styles.css
// the tabs share the row up to 564px, as six don't fit at their desktop
// padding below 565px.
const PHONE_TABS_QUERY = "(max-width: 540px)";
// The Skill tab, the seventh, shows from 688px, where the dialog has its
// full 640px. Below that, seven tabs end in the row's side padding or past
// the dialog's edge in some engines and fonts: up to 669px wide in WebKit
// when the web font has not loaded.
const SKILL_TABS_QUERY = "(max-width: 687px)";
const FIGMA_PLUGIN_URL = "https://www.figma.com/community/plugin/1641603648370488902/globestudio";

const FPS_OPTIONS = [24, 30, 60];
const DURATION_OPTIONS = [3, 5, 8, 12];

// Whether a media query matches, kept up to date as the window changes.
const useMediaQuery = (query) => {
  const [matches, setMatches] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia(query).matches;
  });
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return undefined;
    const mq = window.matchMedia(query);
    const onChange = (event) => setMatches(event.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [query]);
  return matches;
};

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

const Tabs = ({ tab, setTab, hasVideo, hasFigma, hasSkill, figmaPlugin = false }) => {
  // Inside the Figma plugin only what can land on the canvas: an image or
  // editable vectors.
  const tabs = [
    { id: "image", label: "Image" },
    hasVideo && !figmaPlugin && { id: "video", label: "Video" },
    { id: "svg", label: "SVG" },
    hasFigma && { id: "figma", label: "Figma" },
    !figmaPlugin && { id: "share", label: "Share" },
    !figmaPlugin && { id: "mcp", label: "MCP" },
    hasSkill && { id: "skill", label: "Skill" },
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
      // The underline stops 12px short of the tab's sides. On a phone the
      // tabs drop their side padding, and it runs the tab's full width.
      const inset = Math.min(12, parseFloat(getComputedStyle(node).paddingLeft) || 0);
      setIndicator({
        left: tabRect.left - listRect.left + inset,
        width: tabRect.width - inset * 2,
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
  // ends. We wrap around so power users can hold the arrow key. Focus goes
  // with the selection, so the ring and the next Tab start from the tab shown.
  const onKeyDown = (event) => {
    const currentIndex = tabs.findIndex((t) => t.id === tab);
    if (currentIndex < 0) return;
    const select = (index) => {
      event.preventDefault();
      setTab(tabs[index].id);
      tabRefs.current.get(tabs[index].id)?.focus();
    };
    if (event.key === "ArrowLeft") {
      select((currentIndex - 1 + tabs.length) % tabs.length);
    } else if (event.key === "ArrowRight") {
      select((currentIndex + 1) % tabs.length);
    } else if (event.key === "Home") {
      select(0);
    } else if (event.key === "End") {
      select(tabs.length - 1);
    }
  };

  return (
    <nav
      ref={listRef}
      className={`export-modal-tabs ${figmaPlugin ? "" : "is-crowded"}`}
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
  figmaPlugin = false,
  initialAspect = "original",
  canvasWidth,
  canvasHeight,
  exportPng,
  copyPng,
  pngStatus,
  exportSvg,
  svgStatus,
  copySvg,
  copyStatus,
  exportVideo,
  mp4Supported = false,
  // The background is Transparent: MP4 can't keep it and GIF keeps it with
  // hard edges, so both say so.
  transparent = false,
  videoStatus,
  videoProgress,
  videoDurationMs,
  setVideoDurationMs,
  videoSupported,
  exportConfig,
  importConfig,
  getShareUrl,
  lookName,
  isLookEdited,
  regionName,
}) => {
  const [selectedTab, setTab] = useState("image");
  // Six tabs don't fit the tab row's phone form, so the Figma tab is left
  // out of it there, and inside the Figma plugin. The Skill tab, the
  // seventh, is left out of those and of a row too narrow for seven. If a
  // tab goes while it is selected (a window made narrow, a phone turned
  // upright), Image shows.
  const phoneTabs = useMediaQuery(PHONE_TABS_QUERY);
  const narrowTabs = useMediaQuery(SKILL_TABS_QUERY);
  const hasFigma = !figmaPlugin && !phoneTabs;
  const hasSkill = hasFigma && !narrowTabs;
  const tab = (selectedTab === "figma" && !hasFigma) || (selectedTab === "skill" && !hasSkill) ? "image" : selectedTab;
  const [aspect, setAspect] = useState(initialAspect);
  // In the Figma plugin each opening starts from the crop that fits the
  // current view (square globe, wide flat map).
  useEffect(() => {
    if (open && figmaPlugin) setAspect(initialAspect);
  }, [open, figmaPlugin, initialAspect]);
  const [quality, setQuality] = useState("standard");
  const [fps, setFps] = useState(60);
  const [videoFormat, setVideoFormat] = useState("webm");
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
      // Only after the clipboard write succeeds — the manual-copy
      // fallback isn't a share yet. `method` says which button, never
      // where the link goes (matches what /privacy documents).
      track("share_clicked", { method: "link" });
      window.setTimeout(() => setLinkStatus("idle"), 1800);
    } catch {
      setLinkStatus("manual");
      window.setTimeout(() => setLinkStatus("idle"), 3000);
    }
  };
  const [imageCopyStatus, setImageCopyStatus] = useState("idle");
  const fileInputRef = useRef(null);
  const dialogRef = useRef(null);
  const [importFailed, setImportFailed] = useState(false);
  // A failed import from an earlier visit shouldn't greet the next one.
  useEffect(() => {
    if (!open) setImportFailed(false);
  }, [open]);

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

  // Copy image puts the PNG that Export PNG would save on the clipboard.
  // The button is left out where the browser can't write images there, and
  // inside the Figma plugin, which inserts on the canvas instead.
  const canCopyImage = !figmaPlugin && canCopyImageToClipboard();
  const handleCopyImage = async () => {
    try {
      await copyPng?.({ scale, width, height, aspect });
      setImageCopyStatus("copied");
      window.setTimeout(() => setImageCopyStatus("idle"), 1800);
    } catch {
      setImageCopyStatus("failed");
      window.setTimeout(() => setImageCopyStatus("idle"), 3000);
    }
  };

  const handleVideo = () => {
    setVideoDurationMs?.(videoSeconds * 1000);
    exportVideo?.({ fps, durationMs: videoSeconds * 1000, format: videoFormat });
  };

  // Malformed JSON, or JSON with nothing usable in it (importConfig returns
  // false), shows a message by the drop zone instead of failing silently.
  const importFile = (file) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      let parsed;
      try {
        parsed = JSON.parse(String(e.target?.result || "{}"));
      } catch (error) {
        console.warn("Failed to import config", error);
        setImportFailed(true);
        return;
      }
      setImportFailed(importConfig?.(parsed) === false);
    };
    // A file that can't be read (moved or deleted after picking) fails too.
    reader.onerror = () => setImportFailed(true);
    reader.readAsText(file);
  };

  const handleFileImport = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    importFile(file);
    event.target.value = "";
  };

  const handleDrop = (event) => {
    event.preventDefault();
    const file = event.dataTransfer?.files?.[0];
    if (!file) return;
    importFile(file);
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

        <Tabs
          tab={tab}
          setTab={setTab}
          hasVideo={videoSupported}
          hasFigma={hasFigma}
          hasSkill={hasSkill}
          figmaPlugin={figmaPlugin}
        />

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
            </>
          )}

          {tab === "video" && videoSupported && (
            <>
              <PillRow
                label="Format"
                options={[
                  { id: "webm", label: "WebM" },
                  ...(mp4Supported ? [{ id: "mp4", label: "MP4" }] : []),
                  { id: "gif", label: "GIF" },
                ]}
                value={videoFormat}
                onChange={setVideoFormat}
              />
              {videoFormat === "gif" && (
                <p className="export-modal-caption">
                  GIF plays everywhere (Slack, X, Keynote, iOS). Capped to ~20fps and 640px so the file stays light.
                </p>
              )}
              {videoFormat === "gif" && transparent && (
                <p className="export-modal-caption">GIF transparency has hard edges. Use WebM or PNG for soft ones.</p>
              )}
              {videoFormat === "mp4" && (
                <p className="export-modal-caption">
                  MP4 (H.264) plays everywhere WebM can't: Safari/iOS, social, Keynote. Capped to 1024px.
                </p>
              )}
              {videoFormat === "mp4" && transparent && (
                <p className="export-modal-caption">MP4 has no transparency. Use WebM or PNG.</p>
              )}
              {/* No Aspect, Quality or size controls here: every video
                  format records the live canvas frame (MP4 and GIF then cap
                  its size), so those controls would do nothing. */}
              {videoFormat === "webm" && (
                <p className="export-modal-caption">Records the globe at its size on screen.</p>
              )}
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
            </>
          )}

          {tab === "svg" && (
            <>
              <p className="export-modal-caption">Vector export: dot positions, shapes, and colors. Effects and atmosphere are not applied (post-effects can't be rasterized into vectors).</p>
              <button
                type="button"
                className={`export-modal-cta ${svgStatus === "saved" ? "is-success" : ""}`}
                onClick={exportSvg}
              >
                {svgStatus === "saved" ? <Check size={17} /> : <Download size={17} />}
                <span>{figmaPlugin
                  ? svgStatus === "saved" ? "Inserted" : "Insert vectors into Figma"
                  : svgStatus === "saved" ? "SVG saved" : "Download SVG"}</span>
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

          {tab === "figma" && (
            <>
              <section className="export-modal-group">
                <h3 className="export-modal-label">Paste into Figma</h3>
                <p className="export-modal-caption">Copy the design, then paste it into a Figma file.</p>
                <button
                  type="button"
                  className={`export-modal-cta ${copyStatus === "copied" ? "is-success" : ""}`}
                  onClick={copySvg}
                >
                  {copyStatus === "copied" ? <Check size={17} /> : <Clipboard size={17} />}
                  <span>
                    {copyStatus === "copied"
                      ? "Vectors copied to clipboard"
                      : copyStatus === "manual"
                        ? "Copy failed. Try again"
                        : "Copy as vectors"}
                  </span>
                </button>
                {/* Each button has its own status line, so one copy's
                    result is never read out as the other's. */}
                <p className="visually-hidden" role="status">
                  {copyStatus === "copied" ? "Vectors copied to clipboard" : copyStatus === "manual" ? "Copy failed" : ""}
                </p>
                <p className="export-modal-caption">
                  Vectors keep dot positions, shapes, and colors. Effects and atmosphere are not applied.
                </p>
                {canCopyImage && (
                  <>
                    <button
                      type="button"
                      className={`export-modal-cta is-secondary ${imageCopyStatus === "copied" ? "is-success" : ""}`}
                      onClick={handleCopyImage}
                    >
                      {imageCopyStatus === "copied" ? <Check size={17} /> : <Clipboard size={17} />}
                      <span>
                        {imageCopyStatus === "copied"
                          ? "Image copied to clipboard"
                          : imageCopyStatus === "failed"
                            ? "Copy failed. Try again"
                            : "Copy as image"}
                      </span>
                    </button>
                    <p className="visually-hidden" role="status">
                      {imageCopyStatus === "copied"
                        ? "Image copied to clipboard"
                        : imageCopyStatus === "failed"
                          ? "Copy failed"
                          : ""}
                    </p>
                  </>
                )}
              </section>
              <section className="export-modal-group">
                <h3 className="export-modal-label">Or design inside Figma</h3>
                <p className="export-modal-caption">
                  The Globestudio plugin runs the full studio inside Figma and inserts the result on your canvas.
                  Paste the share link from the Share tab into it to open this design there.
                </p>
                <a className="export-modal-cta is-secondary" href={FIGMA_PLUGIN_URL} target="_blank" rel="noopener">
                  <span>Open the Figma plugin</span>
                </a>
              </section>
            </>
          )}

          {tab === "share" && (
            <>
              <p className="export-modal-caption">
                Copy the current URL. Anyone who opens it lands on the same look. For exact
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
              {/* Full width at the canvas's height on screen: the Image
                  tab's size is a PNG size, often twice the window. */}
              <EmbedCode getShareUrl={getShareUrl} width="100%" height={Math.round(canvasHeight || 480)} />
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
              {importFailed && (
                <p className="export-modal-error" role="alert">
                  That file isn't a Globestudio configuration. Choose a .json file exported from this tab.
                </p>
              )}
            </>
          )}

          {tab === "mcp" && (
            <ErrorBoundary fallback={null}>
              <Suspense fallback={<div className="export-modal-pending" aria-busy="true" />}>
                <AgentShare
                  getShareUrl={getShareUrl}
                  lookName={lookName}
                  isLookEdited={isLookEdited}
                  regionName={regionName}
                />
              </Suspense>
            </ErrorBoundary>
          )}

          {tab === "skill" && (
            <ErrorBoundary fallback={null}>
              <Suspense fallback={<div className="export-modal-pending is-skill" aria-busy="true" />}>
                <AgentSkill />
              </Suspense>
            </ErrorBoundary>
          )}
        </div>
        </div>

        {/* The Image and Video CTAs sit below the scrolling body, so they
            stay on screen when the options overflow a short phone screen. */}
        {tab === "image" && (
          <footer className="export-modal-footer">
            {pngStatus === "error" && (
              <p className="export-modal-error" role="alert">
                Export failed. Try again, or pick a lower quality.
              </p>
            )}
            <button
              type="button"
              className={`export-modal-cta ${pngStatus === "saved" ? "is-success" : ""}`}
              onClick={handlePng}
            >
              {pngStatus === "saved" ? <Check size={17} /> : <Download size={17} />}
              <span>{figmaPlugin
                ? pngStatus === "saved" ? "Inserted" : "Insert into Figma"
                : pngStatus === "saved" ? "PNG saved" : "Export PNG"}</span>
            </button>
            {canCopyImage && (
              <>
                <button
                  type="button"
                  className={`export-modal-cta is-secondary ${imageCopyStatus === "copied" ? "is-success" : ""}`}
                  onClick={handleCopyImage}
                >
                  {imageCopyStatus === "copied" ? <Check size={17} /> : <Clipboard size={17} />}
                  <span>
                    {imageCopyStatus === "copied"
                      ? "Image copied to clipboard"
                      : imageCopyStatus === "failed"
                        ? "Copy failed. Try again"
                        : "Copy image"}
                  </span>
                </button>
                <p className="visually-hidden" role="status">
                  {imageCopyStatus === "copied"
                    ? "Image copied to clipboard"
                    : imageCopyStatus === "failed"
                      ? "Copy failed"
                      : ""}
                </p>
              </>
            )}
          </footer>
        )}
        {tab === "video" && videoSupported && (
          <footer className="export-modal-footer">
            {isRecording && (
              <div className="export-modal-progress" aria-hidden="true">
                <div className="export-modal-progress-fill" style={{ width: `${recordingPct}%` }} />
              </div>
            )}
            {videoStatus === "error" && (
              <p className="export-modal-error" role="alert">
                Export failed. Try again, or pick another format.
              </p>
            )}
            <button
              type="button"
              className={`export-modal-cta ${isRecording ? "is-recording" : ""}`}
              onClick={handleVideo}
              disabled={isRecording}
            >
              <Download size={17} />
              <span>
                {isRecording
                  ? `Recording… ${recordingPct}%`
                  : `Export ${{ webm: "WebM", mp4: "MP4", gif: "GIF" }[videoFormat]}`}
              </span>
            </button>
          </footer>
        )}
      </div>
    </div>
  );
};
