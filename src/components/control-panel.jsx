import { useRef, useState } from "react";
// Smooth enter/exit for sections that appear/disappear when the user
// flips between Flat and Globe modes. Uses the modern grid-template-rows
// 0fr → 1fr animation so the container can grow to fit its child's
// natural height without us having to measure it.
const Collapsible = ({ open, children }) => (
  <div className={`collapsible-section ${open ? "is-open" : ""}`} aria-hidden={!open}>
    <div className="collapsible-section-inner">{children}</div>
  </div>
);
import { US_COUNTRY_ID, dotShapeOptions } from "../config/constants.js";
import { readCustomShapeFile, readCustomShapeText } from "../utils/custom-shape.js";
import {
  effectsWithCellSize,
  effectsWithMotion,
  effectsWithScanlines,
  effectsWithSplit,
  effectsWithThreshold,
  effectsWithWarp,
  presetForEffect,
  shaderEffectOptions,
} from "../config/shader-effects.js";
import { areaOptions } from "../data/geography.js";
import { FLAT_PROJECTION_OPTIONS } from "../three/world-texture.js";
import { formatSvgNumber } from "../utils/math.js";
import { ColorSwatch } from "./ui/color-swatch.jsx";
import { DepthControl } from "./ui/depth-control.jsx";
import { OptionRow } from "./ui/option-row.jsx";
import { PanelSection } from "./ui/panel-section.jsx";
import { RangeControl } from "./ui/range-control.jsx";
import { SearchableSelect } from "./ui/searchable-select.jsx";
import { SegmentedControl } from "./ui/segmented-control.jsx";
import { SegmentedToggle } from "./ui/segmented-toggle.jsx";
import { SelectControl } from "./ui/select-control.jsx";
import { ShapeSelect } from "./ui/shape-select.jsx";
import { TiltControl } from "./ui/tilt-control.jsx";
import { ToggleControl } from "./ui/toggle-control.jsx";

// Networks formerly used bool toggles for Arcs / Pulses; they're now
// 0–100 density sliders. Pass the raw setting and a default — legacy
// bools coerce to (`true` → default, `false` → 0) so old saved
// configs and shared URLs keep displaying without a migration step.
const networkLevelDisplay = (raw, fallback) => {
  if (raw === true) return fallback;
  if (raw === false) return 0;
  if (typeof raw === "number") return Math.max(0, Math.min(100, Math.round(raw)));
  return fallback;
};

const borderlessPreset = {
  glow: true,
  glowStrength: 78,
  grid: true,
  gridLift: 8,
  gridSize: 42,
  gridStrength: 46,
  look: "borderless",
  routes: true,
  routesStrength: 88,
  surface: true,
  surfaceStrength: 82,
};

export const ControlPanel = ({
  selection,
  setSelection,
  stateSelection,
  setStateSelection,
  background,
  setBackground,
  transparent,
  setTransparent,
  backgroundStyle,
  setBackgroundStyle,
  spaceSettings,
  setSpaceSettings,
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
  dotColorAlpha = 1,
  setDotColorAlpha,
  dotGradient = null,
  setDotGradient,
  shape,
  setShape,
  dotRotation,
  setDotRotation,
  shapeRotationSpeed = 0,
  setShapeRotationSpeed,
  sizeVary = false,
  setSizeVary,
  customShape = null,
  setCustomShape,
  asciiSymbol,
  setAsciiSymbol,
  renderMode,
  setRenderMode,
  worldFill,
  setWorldFill,
  worldFillAlpha = 1,
  setWorldFillAlpha,
  worldFillGradient = null,
  setWorldFillGradient,
  worldFillVisible = true,
  setWorldFillVisible,
  worldStroke,
  setWorldStroke,
  worldStrokeAlpha = 1,
  setWorldStrokeAlpha,
  worldStrokeGradient = null,
  setWorldStrokeGradient,
  worldStrokeVisible = true,
  setWorldStrokeVisible,
  worldStrokeWidth = 1.8,
  setWorldStrokeWidth,
  flatProjection = "mercator",
  setFlatProjection,
  riversVisible = false,
  setRiversVisible,
  citiesVisible = false,
  setCitiesVisible,
  citiesMinPop = 0,
  setCitiesMinPop,
  customTopologyRaw = "",
  setCustomTopologyRaw,
  customTopology = null,
  customTopologyVisible = false,
  setCustomTopologyVisible,
  dotsVisible,
  setDotsVisible,
  shaderSettings,
  setShaderSettings,
  globeSettings,
  setGlobeSettings,
  animationsEnabled = true,
  setAnimationsEnabled,
  viewMode,
  usStates,
}) => {
  const selectedCountryId = selection.startsWith("country:") ? selection.replace("country:", "") : "";
  const showStates = selectedCountryId === US_COUNTRY_ID && usStates.length > 0;
  const shaderEffect = shaderSettings.effect;

  const updateShaderSetting = (key, value) => {
    setShaderSettings((settings) => ({
      ...settings,
      [key]: value,
    }));
  };

  const updateGlobeSetting = (key, value) => {
    setGlobeSettings((settings) => ({
      ...settings,
      [key]: value,
    }));
  };

  const updateGlobeLook = (value) => {
    setGlobeSettings((settings) => {
      if (value !== "borderless") return { ...settings, look: value };
      return { ...settings, ...borderlessPreset };
    });
  };

  const customShapeInputRef = useRef(null);
  const [customShapeError, setCustomShapeError] = useState("");
  const [pastedSvg, setPastedSvg] = useState("");
  const handleCustomShapeFile = async (file) => {
    setCustomShapeError("");
    if (!file) return;
    try {
      const next = await readCustomShapeFile(file);
      setCustomShape?.(next);
      setPastedSvg("");
    } catch (error) {
      setCustomShapeError(error?.message || "Couldn’t load that file.");
    }
  };
  const handleApplyPastedSvg = () => {
    setCustomShapeError("");
    try {
      const next = readCustomShapeText(pastedSvg);
      setCustomShape?.(next);
      setPastedSvg("");
    } catch (error) {
      setCustomShapeError(error?.message || "Couldn’t parse that SVG.");
    }
  };

  return (
    <aside className="control-panel">
      <div className="map-area-section">
        <SearchableSelect
          label="Country or region"
          value={selection}
          onChange={(value) => {
            setSelection(value);
            if (value !== `country:${US_COUNTRY_ID}`) setStateSelection("all");
          }}
          options={areaOptions}
          placeholder="Search countries…"
        />
        {showStates && (
          <SearchableSelect
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
            placeholder="Search states…"
          />
        )}
      </div>

      <PanelSection title="Surface">
        {renderMode === "dots" && (
          <OptionRow label="Show map">
            <ToggleControl checked={dotsVisible} onChange={setDotsVisible} label="Show or hide the map" />
          </OptionRow>
        )}
        <OptionRow label="Style">
          <SegmentedControl
            label="World style"
            value={renderMode}
            onChange={setRenderMode}
            options={[
              { value: "dots", label: "Shape" },
              { value: "solid", label: "Solid" },
            ]}
          />
        </OptionRow>
        {renderMode === "solid" && (
          <>
            <OptionRow label="Land">
              <ToggleControl
                label="Show land"
                checked={worldFillVisible}
                onChange={(value) => setWorldFillVisible?.(value)}
              />
            </OptionRow>
            {worldFillVisible && (
              <OptionRow label="Land color">
                <ColorSwatch
                  value={worldFill}
                  onChange={setWorldFill}
                  label="Land fill"
                  alpha={worldFillAlpha}
                  onAlphaChange={setWorldFillAlpha}
                  gradient={worldFillGradient}
                  onGradientChange={setWorldFillGradient}
                />
              </OptionRow>
            )}
            <OptionRow label="Stroke">
              <ToggleControl
                label="Show country stroke"
                checked={worldStrokeVisible}
                onChange={(value) => setWorldStrokeVisible?.(value)}
              />
            </OptionRow>
            {worldStrokeVisible && (
              <>
                <OptionRow label="Stroke color">
                  <ColorSwatch
                    value={worldStroke}
                    onChange={setWorldStroke}
                    label="Country stroke"
                    alpha={worldStrokeAlpha}
                    onAlphaChange={setWorldStrokeAlpha}
                    gradient={worldStrokeGradient}
                    onGradientChange={setWorldStrokeGradient}
                  />
                </OptionRow>
                <OptionRow label="Stroke width" value={formatSvgNumber(worldStrokeWidth, 1)}>
                  <RangeControl
                    label="Stroke width"
                    min={0.1}
                    max={8}
                    step={0.1}
                    value={worldStrokeWidth}
                    onChange={setWorldStrokeWidth}
                  />
                </OptionRow>
              </>
            )}
            {/* Rivers overlay — lazy-loads ~120KB of slim Natural Earth river +
                lake centerlines on first toggle. Drawn into the solid-mode
                texture between fill and country stroke. See docs/plans/
                map-data-rollout.md Phase 4. */}
            <OptionRow label="Rivers">
              <ToggleControl
                label="Show rivers + lake centerlines"
                checked={riversVisible}
                onChange={(value) => setRiversVisible?.(value)}
              />
            </OptionRow>
            {/* Cities overlay — lazy-loads ~50KB of slim Natural Earth
                populated places. Dot size scales by log(pop_max) so a 30M
                megacity reads bigger than a 500k regional capital. See
                docs/plans/map-data-rollout.md Phase 5. */}
            <OptionRow label="Cities">
              <ToggleControl
                label="Show populated places"
                checked={citiesVisible}
                onChange={(value) => setCitiesVisible?.(value)}
              />
            </OptionRow>
            {citiesVisible && (
              <OptionRow label="Min population" value={citiesMinPop >= 1e6 ? `${(citiesMinPop / 1e6).toFixed(1)}M` : citiesMinPop >= 1e3 ? `${Math.round(citiesMinPop / 1e3)}k` : citiesMinPop}>
                <RangeControl
                  label="Minimum city population"
                  min={0}
                  max={5000000}
                  step={50000}
                  value={citiesMinPop}
                  onChange={setCitiesMinPop}
                />
              </OptionRow>
            )}
            {/* Custom GeoJSON upload — paste-in box for any FeatureCollection
                with LineString / MultiLineString / Point / MultiPoint
                features. Polygons silently ignored in v1. The parsed result
                + filter live in App.jsx as `customTopology`; visibility
                toggle here. See docs/plans/map-data-rollout.md Phase 6. */}
            <OptionRow label="Custom data">
              <ToggleControl
                label="Show custom GeoJSON overlay"
                checked={customTopologyVisible}
                onChange={(value) => setCustomTopologyVisible?.(value)}
              />
            </OptionRow>
            {customTopologyVisible && (
              <OptionRow
                label="Paste GeoJSON"
                value={
                  customTopology
                    ? `${customTopology.features.length} features`
                    : customTopologyRaw
                      ? "Invalid JSON"
                      : "Empty"
                }
              >
                <textarea
                  className="custom-topology-input"
                  aria-label="Paste GeoJSON FeatureCollection"
                  placeholder='Paste a GeoJSON FeatureCollection. Supports LineString, MultiLineString, Point, MultiPoint.'
                  value={customTopologyRaw}
                  onChange={(event) => setCustomTopologyRaw?.(event.target.value)}
                  spellCheck={false}
                  rows={4}
                />
              </OptionRow>
            )}
            {/* Flat-plane projection picker. Only visible in flat view since
                the sphere always uses equirectangular for UV unwrap. Solid
                mode only — when dots are active they're stuck in Mercator
                via dotted-map. See docs/research/2026-05-map-data-alternatives.md
                Finding 3. */}
            <Collapsible open={viewMode === "flat"}>
              <OptionRow label="Projection">
                <SearchableSelect
                  label="Flat plane projection"
                  value={flatProjection}
                  onChange={setFlatProjection}
                  options={FLAT_PROJECTION_OPTIONS}
                />
              </OptionRow>
            </Collapsible>
          </>
        )}
        {renderMode === "dots" && (<>
        <OptionRow label="Shape">
          <ShapeSelect
            label="Dot shape"
            value={shape}
            onChange={setShape}
            options={dotShapeOptions}
            asciiSymbol={asciiSymbol}
            customShape={customShape}
          />
        </OptionRow>
        {shape === "ASCII" && (
          <OptionRow label="Symbol">
            <input
              type="text"
              className="ascii-symbol-input"
              aria-label="ASCII symbol"
              maxLength={4}
              value={asciiSymbol}
              placeholder="*"
              onChange={(event) => setAsciiSymbol(event.target.value)}
            />
          </OptionRow>
        )}
        {shape === "Custom" && (
          <OptionRow label="Upload" stacked>
            <div className="custom-shape-upload">
              <input
                ref={customShapeInputRef}
                type="file"
                accept="image/svg+xml,image/png,image/jpeg,image/webp"
                aria-label="Upload custom shape"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file) handleCustomShapeFile(file);
                  event.target.value = "";
                }}
              />
              <button
                type="button"
                className="custom-shape-pick"
                onClick={() => customShapeInputRef.current?.click()}
              >
                {customShape?.dataUrl ? (
                  <img
                    src={customShape.dataUrl}
                    alt=""
                    className="custom-shape-thumb"
                    aria-hidden="true"
                  />
                ) : (
                  <span className="custom-shape-pick-icon" aria-hidden="true">+</span>
                )}
                <span className="custom-shape-pick-label">
                  {customShape?.name || "Choose SVG or PNG…"}
                </span>
              </button>
              {customShape?.dataUrl && (
                <button
                  type="button"
                  className="custom-shape-clear"
                  onClick={() => {
                    setCustomShape?.(null);
                    setCustomShapeError("");
                    setPastedSvg("");
                  }}
                >
                  Clear
                </button>
              )}
              <div className="custom-shape-paste">
                <textarea
                  className="custom-shape-paste-input"
                  placeholder="…or paste SVG code"
                  aria-label="Paste SVG code"
                  value={pastedSvg}
                  rows={3}
                  spellCheck={false}
                  onChange={(event) => setPastedSvg(event.target.value)}
                  onKeyDown={(event) => {
                    if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                      event.preventDefault();
                      handleApplyPastedSvg();
                    }
                  }}
                />
                {pastedSvg.trim().length > 0 && (
                  <button
                    type="button"
                    className="custom-shape-apply"
                    onClick={handleApplyPastedSvg}
                  >
                    Apply SVG
                  </button>
                )}
              </div>
              {customShapeError && (
                <p className="custom-shape-error" role="alert">{customShapeError}</p>
              )}
            </div>
          </OptionRow>
        )}
        <OptionRow label="Color">
          <ColorSwatch
            value={dotColor}
            onChange={setDotColor}
            label="Select dot color"
            alpha={dotColorAlpha}
            onAlphaChange={setDotColorAlpha}
            gradient={dotGradient}
            onGradientChange={setDotGradient}
          />
        </OptionRow>
        <OptionRow label="Density" value={density}>
          {/* Capped at 90 — beyond that the dot count climbs into the
              tens-of-thousands range and per-frame InstancedMesh upload
              becomes the bottleneck on low-end hardware. 90 still gives a
              visibly dense map without crossing into "morph stutters" land. */}
          <RangeControl
            label="Density"
            min={1}
            max={90}
            value={density}
            onChange={setDensity}
          />
        </OptionRow>
        <OptionRow label="Size" value={formatSvgNumber(dotSize, 1)}>
          <RangeControl
            label="Size"
            min={0.1}
            max={25}
            step={0.1}
            value={dotSize}
            onChange={setDotSize}
          />
        </OptionRow>
        <OptionRow label="Vary size">
          <ToggleControl
            label="Vary dot sizes"
            checked={sizeVary}
            onChange={(value) => setSizeVary?.(value)}
          />
        </OptionRow>
        <OptionRow label="Rotation" value={`${dotRotation ?? 0}°`}>
          <RangeControl
            label="Dot rotation"
            min={0}
            max={360}
            step={1}
            value={dotRotation ?? 0}
            onChange={setDotRotation}
          />
        </OptionRow>
        </>)}
      </PanelSection>

      <Collapsible open={viewMode === "globe"}>
        <PanelSection title="Globe">
          {/* Globe shell aesthetic. One segmented toggle drives both
              the glow layer AND the historical "look" pivot — "Glow"
              gives the full luminous experience (atmosphere + cyan-
              tinted halo + ambient equatorial rings); "No glow"
              is the plain dotted-globe (no atmosphere, no rings).
              The strength/spread sliders below stay gated on the
              same `glow` field. Same toggle idiom used in
              Network > Color/Mono. */}
          <SegmentedToggle
            value={globeSettings.glow ? "on" : "off"}
            onChange={(next) => {
              if (next === "on") {
                // "Glow" = the full luminous experience. Apply the
                // borderlessPreset which sets look=borderless +
                // turns on the atmosphere/glow at sensible defaults.
                updateGlobeLook("borderless");
              } else {
                setGlobeSettings((s) => ({
                  ...s,
                  glow: false,
                  look: "classic",
                }));
              }
            }}
            options={[
              { value: "off", label: "No glow" },
              { value: "on", label: "Glow" },
            ]}
            ariaLabel="Globe glow"
          />
          {globeSettings.glow && (
            <>
              <OptionRow label="Strength" value={globeSettings.glowStrength}>
                <RangeControl
                  label="Glow strength"
                  min={0}
                  max={100}
                  value={globeSettings.glowStrength}
                  onChange={(value) => updateGlobeSetting("glowStrength", value)}
                />
              </OptionRow>
              {/* "Blur" is the user-facing name; the persisted field
                  stays glowSpread for backwards-compat with saved
                  configs and shared URLs. The CSS filter:blur() range
                  was raised in App.jsx so the slider visibly diffuses
                  the halo end-to-end. */}
              <OptionRow label="Blur" value={globeSettings.glowSpread ?? 50}>
                <RangeControl
                  label="Glow blur"
                  min={0}
                  max={100}
                  value={globeSettings.glowSpread ?? 50}
                  onChange={(value) => updateGlobeSetting("glowSpread", value)}
                />
              </OptionRow>
            </>
          )}

          {/* Surface (sphere fill) layer */}
          <OptionRow label="Surface">
            <ToggleControl
              label="Toggle globe surface"
              checked={globeSettings.surface}
              onChange={(value) => updateGlobeSetting("surface", value)}
            />
          </OptionRow>
          {globeSettings.surface && (
            <OptionRow label="Strength" value={globeSettings.surfaceStrength}>
              <RangeControl
                label="Surface strength"
                min={0}
                max={100}
                value={globeSettings.surfaceStrength}
                onChange={(value) => updateGlobeSetting("surfaceStrength", value)}
              />
            </OptionRow>
          )}

          {/* Grid layer */}
          <OptionRow label="Grid">
            <ToggleControl
              label="Toggle globe grid"
              checked={globeSettings.grid}
              onChange={(value) => updateGlobeSetting("grid", value)}
            />
          </OptionRow>
          {globeSettings.grid && (
            <>
              <OptionRow label="Strength" value={globeSettings.gridStrength}>
                <RangeControl
                  label="Grid strength"
                  min={0}
                  max={100}
                  value={globeSettings.gridStrength}
                  onChange={(value) => updateGlobeSetting("gridStrength", value)}
                />
              </OptionRow>
              <OptionRow label="Size" value={`${globeSettings.gridSize}°`}>
                <RangeControl
                  label="Grid size"
                  min={12}
                  max={60}
                  step={3}
                  value={globeSettings.gridSize}
                  onChange={(value) => updateGlobeSetting("gridSize", value)}
                />
              </OptionRow>
              <OptionRow label="Lift" value={globeSettings.gridLift}>
                <RangeControl
                  label="Grid lift"
                  min={0}
                  max={100}
                  value={globeSettings.gridLift}
                  onChange={(value) => updateGlobeSetting("gridLift", value)}
                />
              </OptionRow>
            </>
          )}

          {/* Routes — only relevant in the borderless look */}
          {globeSettings.look === "borderless" && (
            <>
              <OptionRow label="Routes">
                <ToggleControl
                  label="Toggle borderless routes"
                  checked={globeSettings.routes}
                  onChange={(value) => updateGlobeSetting("routes", value)}
                />
              </OptionRow>
              {globeSettings.routes && (
                <OptionRow label="Strength" value={globeSettings.routesStrength}>
                  <RangeControl
                    label="Route strength"
                    min={0}
                    max={100}
                    value={globeSettings.routesStrength}
                    onChange={(value) => updateGlobeSetting("routesStrength", value)}
                  />
                </OptionRow>
              )}
            </>
          )}

          {/* Global adjustments — sit at the bottom because they're not gated */}
          <OptionRow label="Dot lift" value={globeSettings.dotLift}>
            <RangeControl
              label="Globe dot lift"
              min={0}
              max={100}
              value={globeSettings.dotLift}
              onChange={(value) => updateGlobeSetting("dotLift", value)}
            />
          </OptionRow>
        </PanelSection>
      </Collapsible>

      {/* Network section — only relevant in 3D mode where arcs orbit
          the globe. Mono lives at the top as a segmented Color/Mono
          switch (visual idiom matches the Flat/Globe canvas toggle);
          the three sliders below let users dial density on each layer. */}
      <Collapsible open={viewMode === "globe"}>
        <PanelSection title="Network">
          <SegmentedToggle
            value={(globeSettings.networkMono ?? true) ? "mono" : "color"}
            onChange={(next) => updateGlobeSetting("networkMono", next === "mono")}
            options={[
              { value: "color", label: "Color" },
              { value: "mono", label: "Mono" },
            ]}
            ariaLabel="Network color mode"
          />
          <OptionRow label="Arcs" value={networkLevelDisplay(globeSettings.networkArcs, 60)}>
            <RangeControl
              label="Arc density"
              min={0}
              max={100}
              value={networkLevelDisplay(globeSettings.networkArcs, 60)}
              onChange={(value) => updateGlobeSetting("networkArcs", value)}
            />
          </OptionRow>
          <OptionRow label="Pulses" value={networkLevelDisplay(globeSettings.networkPulses, 50)}>
            <RangeControl
              label="Pulse density"
              min={0}
              max={100}
              value={networkLevelDisplay(globeSettings.networkPulses, 50)}
              onChange={(value) => updateGlobeSetting("networkPulses", value)}
            />
          </OptionRow>
          <OptionRow label="Strength" value={globeSettings.networkStrength ?? 70}>
            <RangeControl
              label="Network strength"
              min={0}
              max={100}
              value={globeSettings.networkStrength ?? 70}
              onChange={(value) => updateGlobeSetting("networkStrength", value)}
            />
          </OptionRow>
        </PanelSection>
      </Collapsible>

      {/* Animations section. No abstract "all animations" master
          toggle — each motion is its own concrete control. The
          internal animationsEnabled state still exists (gated by
          prefers-reduced-motion and reachable via Cmd+K) but isn't
          exposed as a panel row since "all animations" reads as
          redundant when the specific motions each have their own
          switch.
          Each animation is now a single 0–100 slider — the toggle is
          implicit (0 = stopped). Same density-slider pattern used in
          the Network section above.
          - Shape rotation: applies in both views.
          - Auto spin: only in 3D mode. */}
      <PanelSection title="Animations">
        <OptionRow label="Shape rotation" value={shapeRotationSpeed}>
          <RangeControl
            label="Shape rotation speed"
            min={0}
            max={100}
            value={shapeRotationSpeed}
            onChange={setShapeRotationSpeed}
          />
        </OptionRow>
        <Collapsible open={viewMode === "globe"}>
          {(() => {
            // Legacy `autoSpin: false` from older saved configs coerces
            // to speed = 0 so the slider reflects the prior off state.
            const autoSpinSpeed = globeSettings.autoSpin === false
              ? 0
              : (globeSettings.autoSpinSpeed ?? 35);
            return (
              <OptionRow label="Auto spin" value={autoSpinSpeed}>
                <RangeControl
                  label="Globe auto spin speed"
                  min={0}
                  max={100}
                  value={autoSpinSpeed}
                  onChange={(value) => {
                    updateGlobeSetting("autoSpinSpeed", value);
                    // Keep the legacy bool in sync so exported configs
                    // and shared URLs remain readable on older builds.
                    if (value === 0 && globeSettings.autoSpin !== false) {
                      updateGlobeSetting("autoSpin", false);
                    } else if (value > 0 && globeSettings.autoSpin === false) {
                      updateGlobeSetting("autoSpin", true);
                    }
                  }}
                />
              </OptionRow>
            );
          })()}
        </Collapsible>
      </PanelSection>

      <PanelSection title="Shaders">
        <OptionRow label="Pass">
          <SelectControl
            label="Shader effect"
            value={shaderEffect}
            onChange={(value) => {
              setShaderSettings((settings) => ({
                ...settings,
                ...presetForEffect(value),
                effect: value,
              }));
            }}
            options={shaderEffectOptions}
          />
        </OptionRow>
        {shaderEffect !== "none" && (
          <>
            <OptionRow label="Intensity" value={shaderSettings.intensity}>
              <RangeControl
                label="Effect intensity"
                min={0}
                max={100}
                value={shaderSettings.intensity}
                onChange={(value) => updateShaderSetting("intensity", value)}
              />
            </OptionRow>
            {effectsWithSplit.has(shaderEffect) && (
              <OptionRow label="Split" value={`${shaderSettings.split}px`}>
                <RangeControl
                  label="Chromatic split"
                  min={0}
                  max={30}
                  value={shaderSettings.split}
                  onChange={(value) => updateShaderSetting("split", value)}
                />
              </OptionRow>
            )}
            {effectsWithCellSize.has(shaderEffect) && (
              <OptionRow label="Cell Size" value={shaderSettings.cellSize}>
                <RangeControl
                  label="Effect cell size"
                  min={4}
                  max={42}
                  value={shaderSettings.cellSize}
                  onChange={(value) => updateShaderSetting("cellSize", value)}
                />
              </OptionRow>
            )}
            {effectsWithScanlines.has(shaderEffect) && (
              <OptionRow label="Scanlines" value={shaderSettings.scanlines}>
                <RangeControl
                  label="Scanline strength"
                  min={0}
                  max={100}
                  value={shaderSettings.scanlines}
                  onChange={(value) => updateShaderSetting("scanlines", value)}
                />
              </OptionRow>
            )}
            {effectsWithThreshold.has(shaderEffect) && (
              <OptionRow label="Threshold" value={shaderSettings.threshold}>
                <RangeControl
                  label="Threshold"
                  min={0}
                  max={100}
                  value={shaderSettings.threshold}
                  onChange={(value) => updateShaderSetting("threshold", value)}
                />
              </OptionRow>
            )}
            {effectsWithWarp.has(shaderEffect) && (
              <OptionRow label="Warp" value={shaderSettings.warp}>
                <RangeControl
                  label="Shader warp"
                  min={0}
                  max={100}
                  value={shaderSettings.warp}
                  onChange={(value) => updateShaderSetting("warp", value)}
                />
              </OptionRow>
            )}
            {effectsWithMotion.has(shaderEffect) && (
              <OptionRow label="Motion" value={shaderSettings.motion}>
                <RangeControl
                  label="Shader motion"
                  min={0}
                  max={100}
                  value={shaderSettings.motion}
                  onChange={(value) => updateShaderSetting("motion", value)}
                />
              </OptionRow>
            )}
            <OptionRow label="Grain" value={shaderSettings.grain}>
              <RangeControl
                label="Grain"
                min={0}
                max={100}
                value={shaderSettings.grain}
                onChange={(value) => updateShaderSetting("grain", value)}
              />
            </OptionRow>
          </>
        )}
      </PanelSection>

      <PanelSection title="Background">
        <OptionRow label="Style">
          <SelectControl
            label="Background style"
            value={backgroundStyle}
            onChange={(value) => {
              setBackgroundStyle(value);
              // Keep the transparent flag in sync so the legacy toggle still works.
              if (value === "transparent") setTransparent(true);
              else if (value === "solid") setTransparent(false);
            }}
            options={[
              { value: "solid", label: "Solid" },
              { value: "transparent", label: "Transparent" },
              { value: "space", label: "Space" },
            ]}
          />
        </OptionRow>
        {backgroundStyle === "solid" && (
          <OptionRow label="Color">
            <ColorSwatch value={background} onChange={setBackground} label="Select background color" />
          </OptionRow>
        )}
        {backgroundStyle === "space" && spaceSettings && (
          <>
            <OptionRow label="Density" value={spaceSettings.density}>
              <RangeControl
                label="Star density"
                min={0}
                max={100}
                value={spaceSettings.density}
                onChange={(value) => setSpaceSettings((s) => ({ ...s, density: value }))}
              />
            </OptionRow>
            <OptionRow label="Motion" value={spaceSettings.motion}>
              <RangeControl
                label="Drift speed"
                min={0}
                max={100}
                value={spaceSettings.motion}
                onChange={(value) => setSpaceSettings((s) => ({ ...s, motion: value }))}
              />
            </OptionRow>
            <OptionRow label="Nebula" value={spaceSettings.nebula}>
              <RangeControl
                label="Nebula intensity"
                min={0}
                max={100}
                value={spaceSettings.nebula}
                onChange={(value) => setSpaceSettings((s) => ({ ...s, nebula: value }))}
              />
            </OptionRow>
            <OptionRow label="Brightness" value={spaceSettings.brightness ?? 100}>
              <RangeControl
                label="Star brightness"
                min={0}
                max={150}
                value={spaceSettings.brightness ?? 100}
                onChange={(value) => setSpaceSettings((s) => ({ ...s, brightness: value }))}
              />
            </OptionRow>
            <OptionRow label="Tint" value={spaceSettings.hue}>
              <RangeControl
                label="Hue tint cool to warm"
                min={-50}
                max={50}
                value={spaceSettings.hue}
                onChange={(value) => setSpaceSettings((s) => ({ ...s, hue: value }))}
              />
            </OptionRow>
          </>
        )}
        <Collapsible open={viewMode === "flat"}>
          <OptionRow label="Tilt X" value={`${tiltX} deg`}>
            <TiltControl label="Tilt X" value={tiltX} onChange={setTiltX} />
          </OptionRow>
          <OptionRow label="Tilt Y" value={`${tiltY} deg`}>
            <TiltControl label="Tilt Y" value={tiltY} onChange={setTiltY} />
          </OptionRow>
          <OptionRow label="Depth" value={`${mapDepth}%`}>
            <DepthControl value={mapDepth} onChange={setMapDepth} />
          </OptionRow>
        </Collapsible>
      </PanelSection>
    </aside>
  );
};
