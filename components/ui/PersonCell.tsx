import type { ReactNode } from "react";

/**
 * Round initial plus a name and a second line.
 * Used wherever a prefect or a scan is shown in a list.
 */
export function PersonCell({
  name,
  avatar,
  meta,
}: {
  name: string;
  avatar: string;
  meta?: ReactNode;
}) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-8 h-8 shrink-0 bg-slate-100 rounded-full flex items-center justify-center text-slate-600 text-xs font-semibold">
        {avatar}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-800">{name}</p>
        {meta != null && <div className="text-xs text-slate-600">{meta}</div>}
      </div>
    </div>
  );
}

/** Class, PIN, and code line under a prefect's name. */
export function PrefectMeta({
  className,
  pin,
  code,
  extra,
}: {
  className?: string | null;
  pin: string;
  code?: string | null;
  extra?: ReactNode;
}) {
  return (
    <p>
      {className ? (
        <span className="mr-2 font-medium text-slate-500">{className}</span>
      ) : null}
      <span className="font-mono">PIN: {pin}</span>
      {code ? <span className="ml-2 font-mono">Code: {code}</span> : null}
      {extra}
    </p>
  );
}
