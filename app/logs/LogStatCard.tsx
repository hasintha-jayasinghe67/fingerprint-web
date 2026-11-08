"use client";

export function LogStatCard({
  label,
  value,
  hint,
  tone = "plain",
}: {
  label: string;
  value: string;
  hint: string;
  tone?: "plain" | "warn";
}) {
  return (
    <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4">
      <p className="text-xs font-medium text-slate-600">{label}</p>
      <p
        className={`mt-1 text-2xl font-semibold tracking-tight ${
          tone === "warn" ? "text-red-800" : "text-slate-900"
        }`}
      >
        {value}
      </p>
      <p className="mt-1 text-xs text-slate-600">{hint}</p>
    </div>
  );
}

