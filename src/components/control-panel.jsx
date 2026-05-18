import { useRef, useState } from "react";
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
import { globeLookOptions } from "../config/globe-settings.js";
import { areaOptions } from "../data/geography.js";
import { formatSvgNumber } from "../utils/math.js";
import { ColorSwatch } from "./ui/color-swatch.jsx";
import { DepthControl } from "./ui/depth-control.jsx";
import { OptionRow } from "./ui/option-row.jsx";
import { PanelSection } from "./ui/panel-section.jsx";
import { RangeControl } from "./ui/range-control.jsx";
import { SearchableSelect } from "./ui/searchable-select.jsx";
import { SelectControl } from "./ui/select-control.jsx";
import { ShapeSelect } from "./ui/shape-select.jsx";
import { TiltControl } from "./ui/tilt-control.jsx";
import { ToggleControl } from "./ui/toggle-control.jsx";

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
  rotateAnimating = false,
  setRotateAnimating,
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
  worldStroke,
  setWorldStroke,
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
          <SelectControl
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
              <ColorSwatch value={worldFill} onChange={setWorldFill} label="Land fill" />
            </OptionRow>
            <OptionRow label="Stroke">
              <ColorSwatch value={worldStroke} onChange={setWorldStroke} label="Country stroke" />
            </OptionRow>
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
          <RangeControl
            label="Density"
            min={1}
            max={100}
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
        <OptionRow label="Animate rotation">
          <ToggleControl
            label="Animate dot rotation"
            checked={rotateAnimating}
            onChange={(value) => setRotateAnimating?.(value)}
          />
        </OptionRow>
        </>)}
      </PanelSection>

      {viewMode === "globe" && (
        <PanelSection title="Globe">
          <OptionRow label="Animations">
            <ToggleControl
              label="Toggle globe animations"
              checked={animationsEnabled}
              onChange={(value) => setAnimationsEnabled?.(value)}
            />
          </OptionRow>
          <OptionRow label="Look">
            <SelectControl
              label="Globe look"
              value={globeSettings.look}
              onChange={updateGlobeLook}
              options={globeLookOptions}
            />
          </OptionRow>
          <OptionRow label="Glow">
            <ToggleControl
              label="Toggle globe glow"
              checked={globeSettings.glow}
              onChange={(value) => updateGlobeSetting("glow", value)}
            />
          </OptionRow>
          {globeSettings.glow && (
            <>
              <OptionRow label="Glow" value={globeSettings.glowStrength}>
                <RangeControl
                  label="Glow strength"
                  min={0}
                  max={100}
                  value={globeSettings.glowStrength}
                  onChange={(value) => updateGlobeSetting("glowStrength", value)}
                />
              </OptionRow>
              <OptionRow label="Spread" value={globeSettings.glowSpread ?? 50}>
                <RangeControl
                  label="Glow spread"
                  min={0}
                  max={100}
                  value={globeSettings.glowSpread ?? 50}
                  onChange={(value) => updateGlobeSetting("glowSpread", value)}
                />
              </OptionRow>
            </>
          )}
          <OptionRow label="Surface">
            <ToggleControl
              label="Toggle globe surface"
              checked={globeSettings.surface}
              onChange={(value) => updateGlobeSetting("surface", value)}
            />
          </OptionRow>
          {globeSettings.surface && (
            <OptionRow label="Surface" value={globeSettings.surfaceStrength}>
              <RangeControl
                label="Surface strength"
                min={0}
                max={100}
                value={globeSettings.surfaceStrength}
                onChange={(value) => updateGlobeSetting("surfaceStrength", value)}
              />
            </OptionRow>
          )}
          <OptionRow label="Grid">
            <ToggleControl
              label="Toggle globe grid"
              checked={globeSettings.grid}
              onChange={(value) => updateGlobeSetting("grid", value)}
            />
          </OptionRow>
          {globeSettings.grid && (
            <>
              <OptionRow label="Grid" value={globeSettings.gridStrength}>
                <RangeControl
                  label="Grid strength"
                  min={0}
                  max={100}
                  value={globeSettings.gridStrength}
                  onChange={(value) => updateGlobeSetting("gridStrength", value)}
                />
              </OptionRow>
              <OptionRow label="Grid Size" value={`${globeSettings.gridSize} deg`}>
                <RangeControl
                  label="Grid size"
                  min={12}
                  max={60}
                  step={3}
                  value={globeSettings.gridSize}
                  onChange={(value) => updateGlobeSetting("gridSize", value)}
                />
              </OptionRow>
              <OptionRow label="Grid Lift" value={globeSettings.gridLift}>
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
          <OptionRow label="Dot Lift" value={globeSettings.dotLift}>
            <RangeControl
              label="Globe dot lift"
              min={0}
              max={100}
              value={globeSettings.dotLift}
              onChange={(value) => updateGlobeSetting("dotLift", value)}
            />
          </OptionRow>
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
                <OptionRow label="Routes" value={globeSettings.routesStrength}>
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
          <OptionRow label="Network">
            <ToggleControl
              label="Toggle live network"
              checked={globeSettings.network ?? true}
              onChange={(value) => updateGlobeSetting("network", value)}
            />
          </OptionRow>
          {(globeSettings.network ?? true) && (
            <>
              <OptionRow label="Arcs">
                <ToggleControl
                  label="Toggle flying route arcs"
                  checked={globeSettings.networkArcs ?? true}
                  onChange={(value) => updateGlobeSetting("networkArcs", value)}
                />
              </OptionRow>
              <OptionRow label="Pulses">
                <ToggleControl
                  label="Toggle city pulse rings"
                  checked={globeSettings.networkPulses ?? true}
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
            </>
          )}
          <OptionRow label="Auto Spin">
            <ToggleControl
              label="Toggle globe auto spin"
              checked={globeSettings.autoSpin}
              onChange={(value) => updateGlobeSetting("autoSpin", value)}
            />
          </OptionRow>
          {globeSettings.autoSpin && (
            <OptionRow label="Spin" value={shaderSettings.motion}>
              <RangeControl
                label="Globe spin"
                min={0}
                max={100}
                value={shaderSettings.motion}
                onChange={(value) => updateShaderSetting("motion", value)}
              />
            </OptionRow>
          )}
        </PanelSection>
      )}

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
        {viewMode === "flat" && (
          <>
            <OptionRow label="Tilt X" value={`${tiltX} deg`}>
              <TiltControl label="Tilt X" value={tiltX} onChange={setTiltX} />
            </OptionRow>
            <OptionRow label="Tilt Y" value={`${tiltY} deg`}>
              <TiltControl label="Tilt Y" value={tiltY} onChange={setTiltY} />
            </OptionRow>
            <OptionRow label="Depth" value={`${mapDepth}%`}>
              <DepthControl value={mapDepth} onChange={setMapDepth} />
            </OptionRow>
          </>
        )}
      </PanelSection>
    </aside>
  );
};
