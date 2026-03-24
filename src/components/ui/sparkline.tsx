interface SparklineProps {
  data: number[];
  width?: number;
  height?: number;
  className?: string;
}

export function Sparkline({
  data,
  width = 80,
  height = 24,
  className,
}: SparklineProps) {
  if (data.length === 0) return null;

  const padding = 2;
  const w = width - padding * 2;
  const h = height - padding * 2;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data.map((v, i) => {
    const x = padding + (data.length === 1 ? w / 2 : (i / (data.length - 1)) * w);
    const y = padding + h - ((v - min) / range) * h;
    return `${x},${y}`;
  });

  // Color based on trend: compare last value to average
  const avg = data.reduce((a, b) => a + b, 0) / data.length;
  const last = data[data.length - 1];
  const color =
    last <= avg * 0.9
      ? "stroke-green-400"
      : last <= avg * 1.2
        ? "stroke-yellow-400"
        : "stroke-red-400";

  if (data.length === 1) {
    const cx = padding + w / 2;
    const cy = padding + h / 2;
    return (
      <svg width={width} height={height} className={className}>
        <circle cx={cx} cy={cy} r={2} className={color.replace("stroke-", "fill-")} />
      </svg>
    );
  }

  return (
    <svg width={width} height={height} className={className}>
      <polyline
        points={points.join(" ")}
        fill="none"
        className={color}
        strokeWidth={1.5}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Dot on last value */}
      <circle
        cx={parseFloat(points[points.length - 1].split(",")[0])}
        cy={parseFloat(points[points.length - 1].split(",")[1])}
        r={2}
        className={color.replace("stroke-", "fill-")}
      />
    </svg>
  );
}
