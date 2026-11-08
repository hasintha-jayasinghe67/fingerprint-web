import type { ReactNode } from "react";

/** Centred message for a page or a filtered list with nothing to show. */
export function EmptyState({
  title,
  children,
}: {
  title: string;
  children?: ReactNode;
}) {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="flex flex-col items-center gap-3 text-center">
        <h3 className="text-lg font-semibold text-slate-700">{title}</h3>
        {children && <div className="text-sm text-slate-500 max-w-md">{children}</div>}
      </div>
    </div>
  );
}
