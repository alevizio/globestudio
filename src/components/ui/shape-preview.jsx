import {
  createDiamondPoints,
  createHexagonPoints,
  createParticleGridOffsets,
  createPlusPointArray,
  createRegularPolygonPointArray,
  createStarPointArray,
  formatPointList,
} from "../../utils/svg-shapes.js";

const STROKE_WIDTH = 1;

export const ShapePreview = ({ shape, asciiSymbol = "*", size = 14, color = "currentColor" }) => {
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.36;

  const wrap = (children) => (
    <svg
      className="shape-preview"
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      aria-hidden="true"
      focusable="false"
    >
      {children}
    </svg>
  );

  if (shape === "Circle") {
    return wrap(<circle cx={cx} cy={cy} r={radius} fill={color} />);
  }

  if (shape === "Hexagon") {
    return wrap(<polygon points={createHexagonPoints(cx, cy, radius * 0.5)} fill={color} />);
  }

  if (shape === "Triangle") {
    return wrap(
      <polygon points={formatPointList(createRegularPolygonPointArray(cx, cy, radius * 1.1, 3))} fill={color} />,
    );
  }

  if (shape === "Pentagon") {
    return wrap(
      <polygon points={formatPointList(createRegularPolygonPointArray(cx, cy, radius * 1.05, 5))} fill={color} />,
    );
  }

  if (shape === "Square") {
    const half = radius;
    return wrap(<rect x={cx - half} y={cy - half} width={half * 2} height={half * 2} fill={color} />);
  }

  if (shape === "Diamond") {
    return wrap(<polygon points={createDiamondPoints(cx, cy, radius)} fill={color} />);
  }

  if (shape === "Star") {
    return wrap(
      <polygon points={formatPointList(createStarPointArray(cx, cy, radius * 1.1, radius * 0.52))} fill={color} />,
    );
  }

  if (shape === "Plus") {
    return wrap(<polygon points={formatPointList(createPlusPointArray(cx, cy, radius * 0.85))} fill={color} />);
  }

  if (shape === "Ring") {
    return wrap(
      <circle cx={cx} cy={cy} r={radius * 0.72} fill="none" stroke={color} strokeWidth={STROKE_WIDTH * 1.4} />,
    );
  }

  if (shape === "Voxel") {
    const r = radius * 0.85;
    return wrap(
      <>
        <polygon points={`${cx},${cy - r} ${cx + r * 1.2},${cy - r / 2} ${cx},${cy} ${cx - r * 1.2},${cy - r / 2}`} fill={color} fillOpacity="0.95" />
        <polygon points={`${cx - r * 1.2},${cy - r / 2} ${cx},${cy} ${cx},${cy + r} ${cx - r * 1.2},${cy + r / 2}`} fill={color} fillOpacity="0.6" />
        <polygon points={`${cx + r * 1.2},${cy - r / 2} ${cx},${cy} ${cx},${cy + r} ${cx + r * 1.2},${cy + r / 2}`} fill={color} fillOpacity="0.8" />
      </>,
    );
  }

  if (shape === "Particle Grid") {
    return wrap(
      <>
        {createParticleGridOffsets(radius * 0.55).map(([dx, dy], index) => (
          <circle key={index} cx={cx + dx} cy={cy + dy} r={radius * 0.18} fill={color} />
        ))}
      </>,
    );
  }

  if (shape === "ASCII") {
    const symbol = asciiSymbol && asciiSymbol.length > 0 ? asciiSymbol : "*";
    const fontSize = symbol.length > 1 ? size * 0.55 / Math.min(symbol.length, 3) : size * 0.72;
    return wrap(
      <text
        x={cx}
        y={cy}
        textAnchor="middle"
        dominantBaseline="central"
        fill={color}
        fontFamily="ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
        fontSize={fontSize}
        fontWeight="700"
      >
        {symbol}
      </text>,
    );
  }

  return wrap(<circle cx={cx} cy={cy} r={radius} fill={color} />);
};
