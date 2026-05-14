import { useCallback, useMemo, useRef, useState } from "react";
import {
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ArrowUp,
  ChevronDown,
  Check,
  Clipboard,
  Download,
  Minus,
  Move,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  RotateCcw,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import DottedMapEngine from "dotted-map";
import { geoAlbersUsa, geoContains, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import statesTopology from "us-atlas/states-10m.json";
import countryData from "world-countries";

const MAP_WIDTH = 1000;
const MAP_HEIGHT = 620;
const DEFAULT_STATE_PADDING = 1;
const US_COUNTRY_ID = "USA";
const CLICK_HIGHLIGHT = "#d6ff79";
const UNSUPPORTED_DOTTED_MAP_CODES = new Set([
  "ABW",
  "AIA",
  "ALA",
  "AND",
  "ASM",
  "ATG",
  "BES",
  "BHR",
  "BLM",
  "BRB",
  "CCK",
  "COK",
  "COM",
  "CPV",
  "CUW",
  "CXR",
  "CYM",
  "DMA",
  "FRO",
  "FSM",
  "GGY",
  "GIB",
  "GLP",
  "GRD",
  "GUM",
  "HKG",
  "IMN",
  "IOT",
  "JEY",
  "KIR",
  "KNA",
  "LCA",
  "LIE",
  "MAC",
  "MAF",
  "MCO",
  "MDV",
  "MHL",
  "MNP",
  "MSR",
  "MTQ",
  "MUS",
  "MYT",
  "NFK",
  "NIU",
  "NRU",
  "PCN",
  "PLW",
  "PYF",
  "REU",
  "SGP",
  "SHN",
  "SJM",
  "SMR",
  "SPM",
  "STP",
  "SXM",
  "SYC",
  "TCA",
  "TKL",
  "TON",
  "TUV",
  "UMI",
  "UNK",
  "VAT",
  "VCT",
  "VGB",
  "VIR",
  "WLF",
  "WSM",
]);

const stateFeatureCollection = feature(
  statesTopology,
  statesTopology.objects.states,
);

const countries = countryData
  .filter(
    (country) =>
      country.cca3 &&
      country.region !== "Antarctic" &&
      !UNSUPPORTED_DOTTED_MAP_CODES.has(country.cca3),
  )
  .map((country) => ({
    _id: country.cca3,
    _displayName: country.name?.common || country.cca3,
    _region: country.region || "Other",
    _subregion: country.subregion || "",
  }))
  .sort((a, b) => a._displayName.localeCompare(b._displayName));

const mappableCountries = countries;

const usStates = stateFeatureCollection.features
  .map((item) => ({
    ...item,
    _id: String(item.id),
    _displayName: item.properties?.name || String(item.id),
  }))
  .sort((a, b) => a._displayName.localeCompare(b._displayName));

function buildGroupedOptions(field, typeLabel) {
  const groups = new Map();
  mappableCountries.forEach((item) => {
    const value = item[field];
    if (!value || value === "Other") return;
    const list = groups.get(value) || [];
    list.push(item._id);
    groups.set(value, list);
  });

  return [...groups.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([name, ids]) => ({
      value: `${typeLabel}:${name}`,
      label: `${name} (${typeLabel === "region" ? "Region" : "Subregion"})`,
      ids,
    }));
}

const regionOptions = buildGroupedOptions("_region", "region");
const subregionOptions = buildGroupedOptions("_subregion", "subregion");

const areaOptions = [
  { value: "world", label: "World", ids: [] },
  ...mappableCountries.map((item) => ({
    value: `country:${item._id}`,
    label: item._displayName,
    ids: [item._id],
  })),
  ...regionOptions,
  ...subregionOptions,
];

const areaOptionByValue = new Map(areaOptions.map((option) => [option.value, option]));

function makeFeatureCollection(features) {
  return {
    type: "FeatureCollection",
    features,
  };
}

function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, Number(value)));
}

function createHexagonPoints(x, y, radius) {
  const sqrt3radius = Math.sqrt(3) * radius;
  return [
    [x + sqrt3radius, y - radius],
    [x + sqrt3radius, y + radius],
    [x, y + 2 * radius],
    [x - sqrt3radius, y + radius],
    [x - sqrt3radius, y - radius],
    [x, y - 2 * radius],
  ]
    .map((point) => point.join(","))
    .join(" ");
}

function createDiamondPoints(x, y, radius) {
  return [
    `${x.toFixed(2)},${(y - radius).toFixed(2)}`,
    `${(x + radius).toFixed(2)},${y.toFixed(2)}`,
    `${x.toFixed(2)},${(y + radius).toFixed(2)}`,
    `${(x - radius).toFixed(2)},${y.toFixed(2)}`,
  ].join(" ");
}

function generateDots({ collection, density, padding, shape }) {
  const paddingPx = 28 + padding * 13;
  const projection = geoAlbersUsa();
  projection.fitExtent(
    [
      [paddingPx, paddingPx],
      [MAP_WIDTH - paddingPx, MAP_HEIGHT - paddingPx],
    ],
    collection,
  );

  const path = geoPath(projection);
  const bounds = path.bounds(collection);
  const minX = Math.max(0, Number.isFinite(bounds[0][0]) ? bounds[0][0] : paddingPx);
  const maxX = Math.min(MAP_WIDTH, Number.isFinite(bounds[1][0]) ? bounds[1][0] : MAP_WIDTH);
  const minY = Math.max(0, Number.isFinite(bounds[0][1]) ? bounds[0][1] : paddingPx);
  const maxY = Math.min(MAP_HEIGHT, Number.isFinite(bounds[1][1]) ? bounds[1][1] : MAP_HEIGHT);
  const spacing = Math.max(4, 23 - density * 0.17);
  const ySpacing = shape === "Hexagon" ? spacing * 0.88 : spacing;
  const dots = [];
  let row = 0;

  for (let y = minY; y <= maxY; y += ySpacing) {
    const offset = row % 2 === 0 ? 0 : spacing / 2;
    for (let x = minX + offset; x <= maxX; x += spacing) {
      const coordinates = projection.invert?.([x, y]);
      if (!coordinates) continue;
      if (geoContains(collection, coordinates)) {
        dots.push({
          id: `${Math.round(x * 10)}-${Math.round(y * 10)}`,
          x,
          y,
        });
      }
    }
    row += 1;
  }

  return dots;
}

function createCountryMapData(countryCodes, density) {
  const map = new DottedMapEngine({
    height: density,
    grid: "diagonal",
    ...(countryCodes.length ? { countries: countryCodes } : {}),
  });

  return {
    image: map.image,
    points: map.getPoints().map((point, index) => ({
      ...point,
      id: `${point.x}:${point.y}:${index}`,
    })),
  };
}

function createStateMapData(collection, density, padding, shape) {
  const points = generateDots({
    collection,
    density,
    padding,
    shape,
  }).map((point, index) => ({
    ...point,
    id: `${point.x}:${point.y}:${index}`,
  }));

  return {
    image: { width: MAP_WIDTH, height: MAP_HEIGHT },
    points,
  };
}

function getDotRadius(dotSize, mode) {
  return mode === "state" ? Math.max(1.2, dotSize * 0.42) : dotSize / 100;
}

function getShapeBounds(point, radius, shape) {
  if (shape === "Hexagon") {
    const xRadius = Math.sqrt(3) * radius;
    return {
      minX: point.x - xRadius,
      maxX: point.x + xRadius,
      minY: point.y - 2 * radius,
      maxY: point.y + 2 * radius,
    };
  }

  const shapeRadius = shape === "Diamond" ? radius * 1.35 : radius;
  return {
    minX: point.x - shapeRadius,
    maxX: point.x + shapeRadius,
    minY: point.y - shapeRadius,
    maxY: point.y + shapeRadius,
  };
}

function getPointsBounds(points, radius, shape, image) {
  if (!points.length) {
    return {
      minX: 0,
      minY: 0,
      maxX: image.width,
      maxY: image.height,
    };
  }

  return points.reduce(
    (bounds, point) => {
      const pointBounds = getShapeBounds(point, radius, shape);
      return {
        minX: Math.min(bounds.minX, pointBounds.minX),
        minY: Math.min(bounds.minY, pointBounds.minY),
        maxX: Math.max(bounds.maxX, pointBounds.maxX),
        maxY: Math.max(bounds.maxY, pointBounds.maxY),
      };
    },
    { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity },
  );
}

function createDotMarkup(point, radius, shape, color, selectedDots) {
  const fill = selectedDots.has(point.id) ? CLICK_HIGHLIGHT : color;
  const data = `class="map-dot" data-dot-id="${point.id}" fill="${fill}"`;

  if (shape === "Square") {
    return `<rect ${data} x="${point.x - radius}" y="${point.y - radius}" width="${
      radius * 2
    }" height="${radius * 2}" />`;
  }

  if (shape === "Hexagon") {
    return `<polyline ${data} points="${createHexagonPoints(point.x, point.y, radius)}" />`;
  }

  if (shape === "Diamond") {
    return `<polyline ${data} points="${createDiamondPoints(point.x, point.y, radius * 1.35)}" />`;
  }

  return `<circle ${data} cx="${point.x}" cy="${point.y}" r="${radius}" />`;
}

function createDottedSvg({
  mapData,
  dotColor,
  dotSize,
  shape,
  background,
  transparent,
  selectedDots,
  mode,
  crop = false,
  scale = 1,
  label = "Dotted map",
}) {
  const radius = getDotRadius(dotSize, mode);
  const bounds = crop
    ? getPointsBounds(mapData.points, radius, shape, mapData.image)
    : {
        minX: 0,
        minY: 0,
        maxX: mapData.image.width,
        maxY: mapData.image.height,
      };

  const rawWidth = bounds.maxX - bounds.minX;
  const rawHeight = bounds.maxY - bounds.minY;
  const padX = crop ? rawWidth * 0.02 : rawWidth * 0.02;
  const padY = crop ? rawHeight * 0.02 : rawHeight * 0.02;
  const viewX = bounds.minX - padX;
  const viewY = bounds.minY - padY;
  const viewWidth = rawWidth + padX * 2;
  const viewHeight = rawHeight + padY * 2;
  const aspect = viewWidth / viewHeight;
  const width = Math.round((aspect > 1 ? 1000 * scale : 1000 * aspect * scale) * 1000) / 1000;
  const height = Math.round((aspect > 1 ? (1000 / aspect) * scale : 1000 * scale) * 1000) / 1000;
  const backgroundColor = transparent ? "transparent" : background;
  const dots = mapData.points
    .map((point) => createDotMarkup(point, radius, shape, dotColor, selectedDots))
    .join("\n");
  const backgroundRect = transparent
    ? ""
    : `<rect x="${viewX}" y="${viewY}" width="${viewWidth}" height="${viewHeight}" fill="${background}" />`;

  return {
    width,
    height,
    dotCount: mapData.points.length,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" id="dots" class="dot-map" role="img" aria-label="${label}" width="${width}" height="${height}" viewBox="${viewX} ${viewY} ${viewWidth} ${viewHeight}" style="background-color: ${backgroundColor}">
${backgroundRect}
<g>
${dots}
</g>
</svg>`,
  };
}

function IconButton({ children, title, onClick, className = "", active = false }) {
  return (
    <button
      type="button"
      className={`button ${active ? "button-active" : ""} ${className}`}
      onClick={onClick}
      title={title}
    >
      {children}
    </button>
  );
}

function PanelSection({ title, children, icon }) {
  return (
    <section className="option-block">
      <header>
        {icon}
        <span>{title}</span>
      </header>
      {children}
    </section>
  );
}

function OptionRow({ label, value, children }) {
  return (
    <div className="option-row">
      <label>
        <span>{label}</span>
        {value !== undefined && <output>{value}</output>}
      </label>
      <div className="option-control">{children}</div>
    </div>
  );
}

function SelectControl({ value, onChange, options, label }) {
  return (
    <select aria-label={label} value={value} onChange={(event) => onChange(event.target.value)}>
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

function RangeControl({ value, min, max, step = 1, onChange, label }) {
  const updateValue = (nextValue) => {
    if (!Number.isFinite(Number(nextValue))) return;
    onChange(clampNumber(nextValue, min, max));
  };

  return (
    <div className="range-control">
      <input
        aria-label={label}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => updateValue(event.target.value)}
      />
      <input
        className="range-number"
        aria-label={`${label} value`}
        type="text"
        inputMode="numeric"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => updateValue(event.target.value)}
      />
    </div>
  );
}

function ZoomControl({ value, onChange }) {
  const updateZoom = (nextValue) => onChange(clampNumber(nextValue, 0.5, 3));

  return (
    <div className="zoom-control">
      <button
        type="button"
        className="step-button"
        onClick={() => updateZoom(Number((value - 0.1).toFixed(2)))}
        aria-label="Zoom out"
        title="Zoom out"
      >
        <ZoomOut size={15} />
      </button>
      <input
        aria-label="Map zoom"
        type="range"
        min={0.5}
        max={3}
        step={0.05}
        value={value}
        onChange={(event) => updateZoom(event.target.value)}
      />
      <button
        type="button"
        className="step-button"
        onClick={() => updateZoom(Number((value + 0.1).toFixed(2)))}
        aria-label="Zoom in"
        title="Zoom in"
      >
        <ZoomIn size={15} />
      </button>
    </div>
  );
}

function TiltControl({ value, onChange, label }) {
  const updateTilt = (nextValue) => onChange(clampNumber(nextValue, -45, 45));

  return (
    <div className="tilt-control">
      <button
        type="button"
        className="step-button"
        onClick={() => updateTilt(value - 1)}
        aria-label={`${label} decrease`}
        title={`${label} decrease`}
      >
        <Minus size={15} />
      </button>
      <input
        aria-label={label}
        type="range"
        min={-45}
        max={45}
        step={1}
        value={value}
        onChange={(event) => updateTilt(event.target.value)}
      />
      <button
        type="button"
        className="step-button"
        onClick={() => updateTilt(value + 1)}
        aria-label={`${label} increase`}
        title={`${label} increase`}
      >
        <Plus size={15} />
      </button>
    </div>
  );
}

function DepthControl({ value, onChange }) {
  const updateDepth = (nextValue) => onChange(clampNumber(nextValue, 0, 100));

  return (
    <div className="depth-control">
      <button
        type="button"
        className="step-button"
        onClick={() => updateDepth(value - 5)}
        aria-label="Depth decrease"
        title="Depth decrease"
      >
        <Minus size={15} />
      </button>
      <input
        aria-label="Depth"
        type="range"
        min={0}
        max={100}
        step={5}
        value={value}
        onChange={(event) => updateDepth(event.target.value)}
      />
      <button
        type="button"
        className="step-button"
        onClick={() => updateDepth(value + 5)}
        aria-label="Depth increase"
        title="Depth increase"
      >
        <Plus size={15} />
      </button>
    </div>
  );
}

function PanControl({ onPan, onReset }) {
  return (
    <div className="pan-control" aria-label="Map pan controls">
      <span className="pan-spacer" />
      <button type="button" className="step-button" onClick={() => onPan(0, -30)} aria-label="Pan up" title="Pan up">
        <ArrowUp size={15} />
      </button>
      <span className="pan-spacer" />
      <button type="button" className="step-button" onClick={() => onPan(-30, 0)} aria-label="Pan left" title="Pan left">
        <ArrowLeft size={15} />
      </button>
      <button type="button" className="step-button" onClick={onReset} aria-label="Center map" title="Center map">
        <Move size={15} />
      </button>
      <button type="button" className="step-button" onClick={() => onPan(30, 0)} aria-label="Pan right" title="Pan right">
        <ArrowRight size={15} />
      </button>
      <span className="pan-spacer" />
      <button
        type="button"
        className="step-button"
        onClick={() => onPan(0, 30)}
        aria-label="Pan down"
        title="Pan down"
      >
        <ArrowDown size={15} />
      </button>
      <span className="pan-spacer" />
    </div>
  );
}

function ColorSwatch({ value, onChange, label }) {
  return (
    <div className="color-control">
      <button
        type="button"
        className="color-swatch"
        style={{ backgroundColor: value === "transparent" ? "#18171a" : value }}
        aria-label={label}
        title={label}
      >
        {value === "transparent" && <span className="transparent-grid" />}
      </button>
      <input
        type="color"
        value={value === "transparent" ? "#18171a" : value}
        onChange={(event) => onChange(event.target.value)}
        aria-label={label}
      />
    </div>
  );
}

function ControlPanel({
  selection,
  setSelection,
  stateSelection,
  setStateSelection,
  background,
  setBackground,
  transparent,
  setTransparent,
  mapZoom,
  setMapZoom,
  mapOffset,
  setMapOffset,
  mapDepth,
  setMapDepth,
  tiltX,
  setTiltX,
  tiltY,
  setTiltY,
  density,
  setDensity,
  dotSize,
  setDotSize,
  dotColor,
  setDotColor,
  shape,
  setShape,
}) {
  const selectedCountryId = selection.startsWith("country:") ? selection.replace("country:", "") : "";
  const showStates = selectedCountryId === US_COUNTRY_ID;
  const panMap = (x, y) => {
    setMapOffset((offset) => ({
      x: offset.x + x,
      y: offset.y + y,
    }));
  };

  return (
    <aside className="control-panel">
      <PanelSection title="Map">
        <OptionRow label="Area">
          <SelectControl
            label="Country or region"
            value={selection}
            onChange={(value) => {
              setSelection(value);
              if (value !== `country:${US_COUNTRY_ID}`) setStateSelection("all");
            }}
            options={areaOptions}
          />
        </OptionRow>
        {showStates && (
          <OptionRow label="State">
            <SelectControl
              label="State"
              value={stateSelection}
              onChange={setStateSelection}
              options={[
                { value: "all", label: "All States" },
                ...usStates.map((state) => ({
                  value: state._id,
                  label: state._displayName,
                })),
              ]}
            />
          </OptionRow>
        )}
      </PanelSection>

      <PanelSection title="Canvas">
        <OptionRow label="Background">
          <div className="background-control">
            <ColorSwatch value={background} onChange={setBackground} label="Select background color" />
            <button
              type="button"
              className={`transparent-toggle ${transparent ? "is-active" : ""}`}
              onClick={() => setTransparent((value) => !value)}
            >
              {transparent ? "Transparent" : "Solid"}
            </button>
          </div>
        </OptionRow>
        <OptionRow label="Zoom" value={`${Math.round(mapZoom * 100)}%`}>
          <ZoomControl value={mapZoom} onChange={setMapZoom} />
        </OptionRow>
        <OptionRow label="Pan" value={`${Math.round(mapOffset.x)}, ${Math.round(mapOffset.y)}`}>
          <PanControl onPan={panMap} onReset={() => setMapOffset({ x: 0, y: 0 })} />
        </OptionRow>
        <OptionRow label="Tilt X" value={`${tiltX} deg`}>
          <TiltControl label="Tilt X" value={tiltX} onChange={setTiltX} />
        </OptionRow>
        <OptionRow label="Tilt Y" value={`${tiltY} deg`}>
          <TiltControl label="Tilt Y" value={tiltY} onChange={setTiltY} />
        </OptionRow>
        <OptionRow label="Depth" value={`${mapDepth}%`}>
          <DepthControl value={mapDepth} onChange={setMapDepth} />
        </OptionRow>
      </PanelSection>

      <PanelSection title="Dots">
        <OptionRow label="Shape">
          <SelectControl
            label="Dot shape"
            value={shape}
            onChange={setShape}
            options={["Circle", "Hexagon", "Square", "Diamond"].map((item) => ({
              value: item,
              label: item,
            }))}
          />
        </OptionRow>
        <OptionRow label="Density" value={density}>
          <RangeControl
            label="Density"
            min={1}
            max={100}
            value={density}
            onChange={setDensity}
          />
        </OptionRow>
        <OptionRow label="Size" value={dotSize}>
          <RangeControl
            label="Size"
            min={1}
            max={25}
            value={dotSize}
            onChange={setDotSize}
          />
        </OptionRow>
        <OptionRow label="Color">
          <ColorSwatch value={dotColor} onChange={setDotColor} label="Select dot color" />
        </OptionRow>
      </PanelSection>
    </aside>
  );
}

function DottedMapBackground({
  svgMarkup,
  mapOffset,
  setMapOffset,
  setSelectedDots,
  label,
}) {
  const dragState = useRef({
    active: false,
    baseX: 0,
    baseY: 0,
    moved: false,
    startX: 0,
    startY: 0,
  });
  const [isDraggingMap, setIsDraggingMap] = useState(false);

  const getClientPoint = (event) => {
    const touch = event.touches?.[0] || event.changedTouches?.[0];
    const x = touch?.clientX ?? event.clientX;
    const y = touch?.clientY ?? event.clientY;

    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    return { x, y };
  };

  const startDrag = useCallback((event) => {
    if (Number.isFinite(event.button) && event.button !== 0) return;

    const point = getClientPoint(event);
    if (!point) return;

    dragState.current = {
      active: true,
      baseX: mapOffset.x,
      baseY: mapOffset.y,
      moved: false,
      startX: point.x,
      startY: point.y,
    };
    setIsDraggingMap(true);
    if (event.pointerId !== undefined) {
      event.currentTarget.setPointerCapture?.(event.pointerId);
    }
  }, [mapOffset.x, mapOffset.y]);

  const dragMap = useCallback((event) => {
    const state = dragState.current;
    if (!state.active) return;

    const point = getClientPoint(event);
    if (!point) return;

    const nextX = state.baseX + point.x - state.startX;
    const nextY = state.baseY + point.y - state.startY;

    if (Math.abs(point.x - state.startX) > 3 || Math.abs(point.y - state.startY) > 3) {
      state.moved = true;
    }

    event.preventDefault();
    setMapOffset({ x: nextX, y: nextY });
  }, [setMapOffset]);

  const stopDrag = useCallback((event) => {
    if (!dragState.current.active) return;

    dragState.current.active = false;
    setIsDraggingMap(false);
    if (event.pointerId !== undefined) {
      event.currentTarget.releasePointerCapture?.(event.pointerId);
    }
  }, []);

  const toggleDot = useCallback((event) => {
    if (dragState.current.moved) {
      dragState.current.moved = false;
      return;
    }

    const target = event.target.closest?.(".map-dot");
    const dotId = target?.dataset?.dotId;
    if (!dotId) return;

    setSelectedDots((current) => {
      const next = new Set(current);
      if (next.has(dotId)) next.delete(dotId);
      else next.add(dotId);
      return next;
    });
  }, [setSelectedDots]);

  return (
    <div
      className={`map-background ${isDraggingMap ? "is-dragging" : ""}`}
      aria-label={label}
      onPointerDown={startDrag}
      onPointerMove={dragMap}
      onPointerUp={stopDrag}
      onPointerCancel={stopDrag}
      onMouseDown={startDrag}
      onMouseMove={dragMap}
      onMouseUp={stopDrag}
      onMouseLeave={stopDrag}
      onTouchStart={startDrag}
      onTouchMove={dragMap}
      onTouchEnd={stopDrag}
      onTouchCancel={stopDrag}
      onClick={toggleDot}
      dangerouslySetInnerHTML={{ __html: svgMarkup }}
    />
  );
}

function ExportMenu({ canvasScale, setCanvasScale, copyStatus, copySvg, svgMarkup, exportPng, exportSvg }) {
  const [open, setOpen] = useState(false);
  const runExport = (exportFile) => {
    exportFile();
    setOpen(false);
  };

  return (
    <div className="export-menu">
      <button
        type="button"
        className={`button export-menu-button ${open ? "button-active" : ""}`}
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <Download size={15} />
        Export
        <ChevronDown size={15} />
      </button>

      {open && (
        <div className="export-popover" role="menu">
          <div className="export-scale-group" aria-label="Export scale">
            <span>Scale</span>
            <div className="export-scale-options">
              {["1x", "2x", "3x", "4x"].map((scale) => (
                <button
                  key={scale}
                  type="button"
                  className={`export-scale-option ${canvasScale === scale ? "is-active" : ""}`}
                  onClick={() => setCanvasScale(scale)}
                  aria-pressed={canvasScale === scale}
                >
                  {scale}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            className={`export-menu-item ${copyStatus === "copied" ? "is-success" : ""} ${
              copyStatus === "manual" ? "is-manual" : ""
            }`}
            onClick={copySvg}
            role="menuitem"
          >
            {copyStatus === "copied" ? <Check size={15} /> : <Clipboard size={15} />}
            {copyStatus === "copied" ? "Copied SVG" : copyStatus === "manual" ? "Select SVG" : "Copy SVG"}
          </button>
          {copyStatus === "manual" && (
            <div className="copy-fallback-group">
              <span>Clipboard blocked. Select the SVG code below.</span>
              <textarea
                className="copy-fallback"
                aria-label="SVG code"
                readOnly
                value={svgMarkup}
                onFocus={(event) => event.target.select()}
                onClick={(event) => event.currentTarget.select()}
              />
            </div>
          )}
          <button type="button" className="export-menu-item" onClick={() => runExport(exportPng)} role="menuitem">
            <Download size={15} />
            PNG
          </button>
          <button type="button" className="export-menu-item" onClick={() => runExport(exportSvg)} role="menuitem">
            <Download size={15} />
            SVG
          </button>
        </div>
      )}
    </div>
  );
}

function TopActions({
  canvasScale,
  setCanvasScale,
  copyStatus,
  copySvg,
  svgMarkup,
  panelCollapsed,
  setPanelCollapsed,
  exportPng,
  exportSvg,
}) {
  return (
    <div className="top-actions">
      <ExportMenu
        canvasScale={canvasScale}
        setCanvasScale={setCanvasScale}
        copyStatus={copyStatus}
        copySvg={copySvg}
        svgMarkup={svgMarkup}
        exportPng={exportPng}
        exportSvg={exportSvg}
      />
      <IconButton
        title={panelCollapsed ? "Show panel" : "Hide panel"}
        onClick={() => setPanelCollapsed((value) => !value)}
      >
        {panelCollapsed ? <PanelLeftOpen size={15} /> : <PanelLeftClose size={15} />}
        {panelCollapsed ? "Show Panel" : "Hide Panel"}
      </IconButton>
    </div>
  );
}

function exportScaleValue(canvasScale) {
  return Number(canvasScale.replace("x", "")) || 1;
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function copyTextToClipboard(text) {
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
}

function App() {
  const [selection, setSelection] = useState("world");
  const [stateSelection, setStateSelection] = useState("all");
  const [canvasScale, setCanvasScale] = useState("1x");
  const [background, setBackground] = useState("#0a0a0a");
  const [transparent, setTransparent] = useState(false);
  const [mapZoom, setMapZoom] = useState(1);
  const [mapOffset, setMapOffset] = useState({ x: 0, y: 0 });
  const [mapDepth, setMapDepth] = useState(55);
  const [tiltX, setTiltX] = useState(0);
  const [tiltY, setTiltY] = useState(0);
  const [density, setDensity] = useState(40);
  const [dotSize, setDotSize] = useState(10);
  const [dotColor, setDotColor] = useState("#ffffff");
  const [shape, setShape] = useState("Circle");
  const [panelCollapsed, setPanelCollapsed] = useState(false);
  const [copyStatus, setCopyStatus] = useState("idle");
  const [selectedDots, setSelectedDots] = useState(new Set());

  const selected = useMemo(() => {
    const selectedCountryId = selection.startsWith("country:") ? selection.replace("country:", "") : "";
    const shouldUseState = selectedCountryId === US_COUNTRY_ID && stateSelection !== "all";

    if (shouldUseState) {
      const selectedState = usStates.find((item) => item._id === stateSelection) || usStates[0];
      return {
        mode: "state",
        label: selectedState._displayName,
        collection: makeFeatureCollection([selectedState]),
        countryCodes: [],
      };
    }

    const option = areaOptionByValue.get(selection) || areaOptions[0];

    return {
      mode: "country",
      label: option.label.replace(" (Region)", "").replace(" (Subregion)", ""),
      countryCodes: option.ids,
      collection: null,
    };
  }, [selection, stateSelection]);

  const mapData = useMemo(() => {
    if (selected.mode === "state") {
      return createStateMapData(selected.collection, density, DEFAULT_STATE_PADDING, shape);
    }

    return createCountryMapData(selected.countryCodes, density);
  }, [density, selected, shape]);

  const displaySvg = useMemo(
    () =>
      createDottedSvg({
        mapData,
        dotColor,
        dotSize,
        shape,
        background,
        transparent: true,
        selectedDots,
        mode: selected.mode,
        crop: false,
        label: `${selected.label} dotted map`,
      }),
    [background, dotColor, dotSize, mapData, selected.label, selected.mode, selectedDots, shape],
  );

  const exportSvgData = useMemo(
    () =>
      createDottedSvg({
        mapData,
        dotColor,
        dotSize,
        shape,
        background,
        transparent,
        selectedDots,
        mode: selected.mode,
        crop: true,
        scale: exportScaleValue(canvasScale),
        label: `${selected.label} dotted map`,
      }),
    [
      background,
      canvasScale,
      dotColor,
      dotSize,
      mapData,
      selected.label,
      selected.mode,
      selectedDots,
      shape,
      transparent,
    ],
  );

  const reset = () => {
    setSelection("world");
    setStateSelection("all");
    setCanvasScale("1x");
    setBackground("#0a0a0a");
    setTransparent(false);
    setMapZoom(1);
    setMapOffset({ x: 0, y: 0 });
    setMapDepth(55);
    setTiltX(0);
    setTiltY(0);
    setDensity(40);
    setDotSize(10);
    setDotColor("#ffffff");
    setShape("Circle");
    setPanelCollapsed(false);
    setSelectedDots(new Set());
  };

  const exportSvg = () => {
    downloadBlob(new Blob([exportSvgData.svg], { type: "image/svg+xml;charset=utf-8" }), "scaled_map.svg");
  };

  const copySvg = useCallback(async () => {
    try {
      await copyTextToClipboard(exportSvgData.svg);
      setCopyStatus("copied");
      window.setTimeout(() => setCopyStatus("idle"), 1800);
      return true;
    } catch {
      setCopyStatus("manual");
      return false;
    }
  }, [exportSvgData.svg]);

  const exportPng = () => {
    const blob = new Blob([exportSvgData.svg], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const image = new Image();

    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(exportSvgData.width);
      canvas.height = Math.round(exportSvgData.height);
      const context = canvas.getContext("2d");
      if (!transparent) {
        context.fillStyle = background;
        context.fillRect(0, 0, canvas.width, canvas.height);
      }
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((pngBlob) => {
        if (pngBlob) downloadBlob(pngBlob, "world-in-dots.png");
        URL.revokeObjectURL(url);
      }, "image/png");
    };

    image.src = url;
  };

  return (
    <main
      className={`app-shell ${panelCollapsed ? "is-panel-collapsed" : ""}`}
      style={{
        "--preview-bg": transparent ? "#0b0b0c" : background,
        "--map-offset-x": `${mapOffset.x}px`,
        "--map-offset-y": `${mapOffset.y}px`,
        "--map-perspective": `${1800 - mapDepth * 14}px`,
        "--map-zoom": mapZoom,
        "--tilt-x": `${tiltX}deg`,
        "--tilt-y": `${tiltY}deg`,
      }}
    >
      <DottedMapBackground
        svgMarkup={displaySvg.svg}
        mapOffset={mapOffset}
        setMapOffset={setMapOffset}
        setSelectedDots={setSelectedDots}
        label={`${selected.label} dotted map background`}
      />

      <TopActions
        canvasScale={canvasScale}
        setCanvasScale={setCanvasScale}
        copyStatus={copyStatus}
        copySvg={copySvg}
        svgMarkup={exportSvgData.svg}
        panelCollapsed={panelCollapsed}
        setPanelCollapsed={setPanelCollapsed}
        exportPng={exportPng}
        exportSvg={exportSvg}
      />

      {!panelCollapsed && (
        <section className="control-rail">
          <div className="panel-header">
            <div className="panel-meta">
              <span>{selected.label}</span>
              <span>{displaySvg.dotCount.toLocaleString()} dots</span>
            </div>
            <IconButton title="Reset view" onClick={reset} className="panel-reset-button">
              <RotateCcw size={15} />
              Reset
            </IconButton>
          </div>

          <ControlPanel
            selection={selection}
            setSelection={(value) => {
              setSelection(value);
              setSelectedDots(new Set());
            }}
            stateSelection={stateSelection}
            setStateSelection={(value) => {
              setStateSelection(value);
              setSelectedDots(new Set());
            }}
            background={background}
            setBackground={setBackground}
            transparent={transparent}
            setTransparent={setTransparent}
            mapZoom={mapZoom}
            setMapZoom={setMapZoom}
            mapOffset={mapOffset}
            setMapOffset={setMapOffset}
            mapDepth={mapDepth}
            setMapDepth={setMapDepth}
            tiltX={tiltX}
            setTiltX={setTiltX}
            tiltY={tiltY}
            setTiltY={setTiltY}
            density={density}
            setDensity={setDensity}
            dotSize={dotSize}
            setDotSize={setDotSize}
            dotColor={dotColor}
            setDotColor={setDotColor}
            shape={shape}
            setShape={setShape}
          />
        </section>
      )}
    </main>
  );
}

export default App;
