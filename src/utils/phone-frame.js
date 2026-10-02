import { GLOBE_RADIUS } from "../config/globe-settings.js";

// On the phone layout the canvas fills the screen, but what a person can see
// of it runs from under the top bar to the top of the sheet. The scene is
// drawn into that space through a camera view offset: one uniform scale and
// a vertical shift of the whole picture. Nothing is re-rendered at a new
// size while the sheet moves, and exports clear the offset, so they keep the
// full-canvas framing.

// The flat map's width in world units and how far it sits behind the globe's
// centre (pointToFlatVector3 and the flat solid plane use the same numbers).
const FLAT_MAP_WIDTH = 5.35;
const FLAT_MAP_DEPTH = 0.18;

// Room between the content and the top bar, and the sheet, in CSS px.
const GAP_TOP = 4;
const GAP_BOTTOM = 8;
// Below this the free space is treated as this tall, so a sheet dragged over
// nearly everything never collapses the picture to nothing.
const MIN_FREE_HEIGHT = 48;

// Share of the free height the content fills at the default zoom. The globe
// leaves room for its glow and the network orbiting it; the flat map sits
// closer to the edges.
const GLOBE_FILL = 0.86;
const FLAT_FILL = 0.94;

const lerp = (a, b, t) => a + (b - a) * t;

// Camera distance at which the flat map spans `fill` of the width of a
// canvas with this aspect (width / height) and vertical field of view (deg).
export const flatFitDistance = ({ aspect, fov, fill = 0.96 }) =>
  FLAT_MAP_WIDTH / (fill * 2 * Math.tan((fov * Math.PI) / 360) * Math.max(aspect, 0.01)) - FLAT_MAP_DEPTH;

// On-screen size in CSS px of what is drawn, with the camera `distance` from
// the globe's centre, on a canvas `height` px tall: the sphere's outline for
// the globe, the map's box for the flat view (flatAspect = height / width),
// blended by how far the morph has turned the map into a globe.
export const contentSize = ({ height, fov, distance, flatAspect, globeProgress }) => {
  const tanHalf = Math.tan((fov * Math.PI) / 360);
  const r = GLOBE_RADIUS;
  const globe = (height * r) / Math.sqrt(Math.max(distance * distance - r * r, 1e-6)) / tanHalf;
  const flatWidth = (FLAT_MAP_WIDTH * height) / (2 * (distance + FLAT_MAP_DEPTH) * tanHalf);
  return {
    width: lerp(flatWidth, globe, globeProgress),
    height: lerp(flatWidth * flatAspect, globe, globeProgress),
  };
};

// Scale and vertical shift that fit the content into the space between the
// top bar (its bottom edge at `top`) and the sheet (its top edge at
// `sheetTop`), both measured from the top of the canvas. Content already
// smaller than that space keeps its size and is only centred in it.
export const phoneFrame = ({ width, height, top, sheetTop, content, globeProgress }) => {
  const freeTop = Math.max(0, top + GAP_TOP);
  const freeBottom = Math.min(height, sheetTop - GAP_BOTTOM);
  const freeHeight = Math.max(MIN_FREE_HEIGHT, freeBottom - freeTop);
  const fill = lerp(FLAT_FILL, GLOBE_FILL, globeProgress);
  const scale = Math.min(
    1,
    (fill * freeHeight) / Math.max(1, content.height),
    width / Math.max(1, content.width),
  );
  return { scale, shiftY: freeTop + freeHeight / 2 - height / 2 };
};

// The desktop layout on a window too narrow for the globe to clear the open
// side panel: the content moves to the middle of the space right of the
// panel (its right edge at `panelRight`, from the left of the canvas) and
// shrinks when that space is narrower than it.
export const besidePanelFrame = ({ width, panelRight, content, globeProgress }) => {
  const fill = lerp(FLAT_FILL, GLOBE_FILL, globeProgress);
  const scale = Math.min(1, (fill * (width - panelRight)) / Math.max(1, content.width));
  return { scale, shiftX: panelRight / 2, shiftY: 0 };
};

// PerspectiveCamera.setViewOffset arguments that draw the full-canvas picture
// scaled by `scale` about the canvas centre and moved right by `shiftX` px
// and down by `shiftY` px.
export const frameViewOffset = ({ width, height, scale, shiftX = 0, shiftY }) => [
  width,
  height,
  width / 2 - (width / 2 + shiftX) / scale,
  height / 2 - (height / 2 + shiftY) / scale,
  width / scale,
  height / scale,
];
