export default function AttendanceBreakdown({
  present,
  excused,
  traitors,
  total,
}: {
  present: number;
  excused: number;
  traitors: number;
  total: number;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_minmax(0,22rem)] gap-4">
      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 shrink-0" />
            <span className="text-xs font-medium text-slate-600">Present</span>
          </div>
          <p className="text-2xl sm:text-3xl font-semibold text-emerald-700 mt-2">
            {present}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            prefect{present !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-600 shrink-0" />
            <span className="text-xs font-medium text-slate-600">Excused</span>
          </div>
          <p className="text-2xl sm:text-3xl font-semibold text-sky-700 mt-2">
            {excused}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            prefect{excused !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm flex flex-col justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-red-600 shrink-0" />
            <span className="text-xs font-medium text-slate-600">Traitors</span>
          </div>
          <p className="text-2xl sm:text-3xl font-semibold text-red-600 mt-2">
            {traitors}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            prefect{traitors !== 1 ? "s" : ""}
          </p>
        </div>
      </div>

      <AttendanceDonut
        present={present}
        excused={excused}
        traitors={traitors}
        total={total}
      />
    </div>
  );
}

function AttendanceDonut({
  present,
  excused,
  traitors,
  total,
}: {
  present: number;
  excused: number;
  traitors: number;
  total: number;
}) {
  const size = 96;
  const stroke = 12;
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  const denom = Math.max(total, present + excused + traitors, 1);
  const presentLen = (Math.max(present, 0) / denom) * circumference;
  const excusedLen = (Math.max(excused, 0) / denom) * circumference;
  const traitorLen = (Math.max(traitors, 0) / denom) * circumference;

  const presentPct = total > 0 ? Math.round((present / total) * 100) : 0;

  return (
    <div
      className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm flex items-center gap-4"
      role="img"
      aria-label={`Attendance breakdown: ${present} present, ${excused} excused, ${traitors} traitors out of ${total} prefects`}
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
          stroke="var(--color-slate-200)"
          strokeWidth={stroke}
        />
        {presentLen > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#16a34a"
            strokeWidth={stroke}
            strokeDasharray={`${presentLen} ${Math.max(circumference - presentLen, 0)}`}
            strokeDashoffset={0}
          />
        )}
        {excusedLen > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#0284c7"
            strokeWidth={stroke}
            strokeDasharray={`${excusedLen} ${Math.max(circumference - excusedLen, 0)}`}
            strokeDashoffset={-presentLen}
          />
        )}
        {traitorLen > 0 && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#dc2626"
            strokeWidth={stroke}
            strokeDasharray={`${traitorLen} ${Math.max(circumference - traitorLen, 0)}`}
            strokeDashoffset={-(presentLen + excusedLen)}
          />
        )}
      </svg>

      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className="text-xs font-medium text-slate-500">Breakdown</span>
          <span className="text-xs font-mono text-slate-600">
            {presentPct}% present
          </span>
        </div>
        <div className="mt-2 space-y-1.5 text-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-slate-700">
              <span className="w-2.5 h-2.5 rounded-full bg-green-600 shrink-0" />
              Present
            </span>
            <span className="font-mono font-semibold text-emerald-700">
              {present}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-slate-700">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-600 shrink-0" />
              Excused
            </span>
            <span className="font-mono font-semibold text-sky-700">
              {excused}
            </span>
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="inline-flex items-center gap-1.5 text-slate-700">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600 shrink-0" />
              Traitors
            </span>
            <span className="font-mono font-semibold text-red-600">
              {traitors}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
