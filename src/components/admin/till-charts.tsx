import { formatPkr } from "@/lib/admin-nav";

const TEAL = "#3f6f73";
const CLAY = "#c4a484";
const MUTED = "#d6d1c9";

export function TillBarChart({
  data,
}: {
  data: { date: string; salesPkr: number; expensesPkr: number }[];
}) {
  const width = 640;
  const height = 180;
  const pad = { top: 12, right: 8, bottom: 28, left: 8 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;
  const max = Math.max(1, ...data.flatMap((row) => [row.salesPkr, row.expensesPkr]));
  const gap = 4;
  const group = data.length ? innerW / data.length : innerW;
  const bar = Math.max(2, (group - gap) / 2);

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${width} ${height}`} className="h-44 w-full min-w-[480px]" role="img" aria-label="Sales versus expenses">
        {data.map((row, index) => {
          const x = pad.left + index * group;
          const salesH = (row.salesPkr / max) * innerH;
          const expH = (row.expensesPkr / max) * innerH;
          const showLabel = data.length <= 14 || index % Math.ceil(data.length / 8) === 0;
          return (
            <g key={row.date}>
              <rect
                x={x}
                y={pad.top + innerH - salesH}
                width={bar}
                height={salesH}
                fill={TEAL}
                rx="1"
              />
              <rect
                x={x + bar + 1}
                y={pad.top + innerH - expH}
                width={bar}
                height={expH}
                fill={CLAY}
                rx="1"
              />
              {showLabel ? (
                <text
                  x={x + bar}
                  y={height - 8}
                  textAnchor="middle"
                  className="fill-muted-foreground"
                  fontSize="9"
                >
                  {row.date.slice(5)}
                </text>
              ) : null}
            </g>
          );
        })}
      </svg>
      <div className="mt-1 flex gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <span className="size-2 rounded-sm" style={{ background: TEAL }} /> Sales
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="size-2 rounded-sm" style={{ background: CLAY }} /> Expenses
        </span>
      </div>
    </div>
  );
}

export function TillDonut({
  slices,
  label,
}: {
  slices: { label: string; value: number }[];
  label: string;
}) {
  const total = slices.reduce((sum, slice) => sum + slice.value, 0) || 1;
  const colors = [TEAL, CLAY, "#6b8f71", "#8c6b5a", MUTED, "#2c4a4e"];
  const radius = 42;
  const cx = 54;
  const cy = 54;
  let angle = -Math.PI / 2;
  const arcs = slices.map((slice, index) => {
    const delta = (slice.value / total) * Math.PI * 2;
    const start = angle;
    angle += delta;
    const x1 = cx + radius * Math.cos(start);
    const y1 = cy + radius * Math.sin(start);
    const x2 = cx + radius * Math.cos(angle);
    const y2 = cy + radius * Math.sin(angle);
    const large = delta > Math.PI ? 1 : 0;
    return {
      ...slice,
      color: colors[index % colors.length]!,
      d: `M ${cx} ${cy} L ${x1} ${y1} A ${radius} ${radius} 0 ${large} 1 ${x2} ${y2} Z`,
    };
  });

  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 108 108" className="size-28 shrink-0" role="img" aria-label={label}>
        {total === 1 && slices.every((slice) => slice.value === 0) ? (
          <circle cx={cx} cy={cy} r={radius} fill={MUTED} />
        ) : (
          arcs.map((arc) => <path key={arc.label} d={arc.d} fill={arc.color} />)
        )}
        <circle cx={cx} cy={cy} r="24" fill="white" />
      </svg>
      <ul className="space-y-1 text-xs">
        {slices.length === 0 ? (
          <li className="text-muted-foreground">No data in this range.</li>
        ) : (
          slices.map((slice, index) => (
            <li key={slice.label} className="flex justify-between gap-3">
              <span className="inline-flex items-center gap-1 capitalize">
                <span
                  className="size-2 rounded-sm"
                  style={{ background: colors[index % colors.length] }}
                />
                {slice.label.replace(/_/g, " ")}
              </span>
              <span>{formatPkr(slice.value)}</span>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

export function TillHBar({
  rows,
}: {
  rows: { label: string; value: number }[];
}) {
  const max = Math.max(1, ...rows.map((row) => row.value));
  return (
    <ul className="space-y-2">
      {rows.map((row) => (
        <li key={row.label}>
          <div className="mb-1 flex justify-between text-xs">
            <span className="capitalize">{row.label}</span>
            <span>{formatPkr(row.value)}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-[oklch(0.42_0.05_210)]"
              style={{ width: `${Math.max(4, (row.value / max) * 100)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
