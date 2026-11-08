import type { ReactNode } from "react";

/** One labelled number on a white card. */
export function SummaryCard({
  label,
  value,
  hint,
  valueClassName = "text-slate-900",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  valueClassName?: string;
}) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 p-4 shadow-sm">
      <p className="text-xs text-slate-500 mb-1">{label}</p>
      <p className={`text-2xl font-semibold ${valueClassName}`}>{value}</p>
      {hint ? <p className="text-xs text-slate-600 mt-1">{hint}</p> : null}
    </div>
  );
}
