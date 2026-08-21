interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
  color?: string;
  fill?: boolean;
}

export default function Sparkline({
  values,
  width = 64,
  height = 20,
  color = "#e8a23a",
  fill = false,
}: SparklineProps) {
  if (values.length < 2) {
    return (
      <svg width={width} height={height} aria-hidden className="shrink-0">
        <line
          x1="0"
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke="rgba(255,255,255,0.15)"
          strokeWidth="1"
        />
      </svg>
    );
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = width / (values.length - 1);
  const points = values.map((v, i) => {
    const x = i * step;
    const y = height - 2 - ((v - min) / span) * (height - 4);
    return { x, y };
  });
  const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(" ");
  const area = `${d} L${width.toFixed(1)},${height} L0,${height} Z`;

  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden className="shrink-0">
      {fill ? <path d={area} fill={color} fillOpacity="0.16" /> : null}
      <path d={d} fill="none" stroke={color} strokeWidth="1.25" />
    </svg>
  );
}
