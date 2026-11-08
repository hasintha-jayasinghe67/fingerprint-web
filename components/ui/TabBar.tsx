import type { ReactNode } from "react";

/**
 * The row of rounded tabs used on attendance, tie duties, and suspensions.
 * `fill` stretches each tab so two tabs share the row.
 */
export function TabBar<T extends string>({
  ariaLabel,
  tabs,
  value,
  onChange,
  fill = false,
}: {
  ariaLabel: string;
  tabs: { id: T; label: ReactNode }[];
  value: T;
  onChange: (id: T) => void;
  fill?: boolean;
}) {
  return (
    <div
      className="flex gap-2 mb-6 overflow-x-auto pb-1"
      aria-label={ariaLabel}
    >
      {tabs.map((tab) => {
        const selected = tab.id === value;
        return (
          <button
            key={tab.id}
            type="button"
            aria-pressed={selected}
            onClick={() => onChange(tab.id)}
            className={`shrink-0 min-h-11 px-4 sm:px-5 py-2.5 rounded-md text-sm font-semibold transition-colors ${
              fill ? "flex-1" : ""
            } ${
              selected
                ? "bg-slate-800 text-white"
                : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
