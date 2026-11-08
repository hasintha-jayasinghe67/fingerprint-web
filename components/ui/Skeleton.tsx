/**
 * Grey blocks in the shape of the page that is about to appear.
 * A skeleton feels faster than a spinner because the layout is
 * already there while the data arrives.
 */

type SkeletonVariant = "cards" | "table" | "rows";

export function PageSkeleton({
  variant = "rows",
  label = "Loading",
}: {
  variant?: SkeletonVariant;
  label?: string;
}) {
  return (
    <div role="status" aria-busy="true" aria-label={label} className="animate-pulse">
      <span className="sr-only">{label}</span>
      {variant === "cards" && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="h-28 rounded-lg bg-slate-200/80 border border-slate-200" />
          ))}
        </div>
      )}
      {variant === "table" && (
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <div className="h-14 bg-slate-100 border-b border-slate-200" />
          {Array.from({ length: 8 }, (_, index) => (
            <div key={index} className="px-6 py-4 border-b border-slate-100 last:border-b-0">
              <div className="h-4 w-2/3 rounded bg-slate-100" />
              <div className="h-3 w-1/3 rounded bg-slate-100 mt-2" />
            </div>
          ))}
        </div>
      )}
      {variant === "rows" && (
        <div className="space-y-3">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="h-16 rounded-lg bg-slate-200/80 border border-slate-200" />
          ))}
        </div>
      )}
    </div>
  );
}

/** Thin bar shown while fresh data replaces what is already on screen. */
export function RefreshBar({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div
      className="h-0.5 bg-brand-700/80 animate-pulse mb-4"
      role="progressbar"
      aria-label="Refreshing"
    />
  );
}
