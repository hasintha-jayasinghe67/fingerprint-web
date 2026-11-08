/**
 * Present-today ring. The stroke animates when the counts change
 * so a refresh feels like an update, not a new page.
 */
export function PresenceDonut({ present, total }: { present: number; total: number }) {
  const size = 96;
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  const safeTotal = Math.max(total, 0);
  const safePresent = Math.min(Math.max(present, 0), safeTotal || present);
  const ratio = safeTotal > 0 ? safePresent / safeTotal : 0;
  const dash = circumference * ratio;
  const percent = safeTotal > 0 ? Math.round(ratio * 100) : 0;
  const absent = Math.max(safeTotal - safePresent, 0);

  return (
    <div
      className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm flex items-center gap-4"
      role="img"
      aria-label={`${safePresent} of ${safeTotal} prefects present today (${percent}%)`}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="shrink-0 -rotate-90"
        aria-hidden="true"
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className="stroke-slate-200"
          strokeWidth={stroke}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          className="stroke-brand-700 transition-[stroke-dasharray] duration-500 ease-out"
          strokeWidth={stroke}
          strokeLinecap={dash > 0 && dash < circumference ? "round" : "butt"}
          strokeDasharray={`${dash} ${circumference - dash}`}
        />
      </svg>
      <div className="min-w-0">
        <span className="text-xs text-slate-500">Present today</span>
        <p className="text-2xl font-semibold text-slate-900 mt-1 leading-none">{percent}%</p>
        <p className="text-sm text-slate-600 mt-1.5">
          <span className="font-medium text-slate-900">{safePresent}</span> of{" "}
          <span className="font-medium text-slate-900">{safeTotal}</span> prefects
        </p>
        <div className="flex items-center gap-3 mt-2 text-xs text-slate-500">
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-brand-700" />
            Present {safePresent}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-slate-200" />
            Not yet {absent}
          </span>
        </div>
      </div>
    </div>
  );
}
