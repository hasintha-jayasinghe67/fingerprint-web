import { IconRefresh } from "@/components/icons";

/** Dark header button that reloads the current screen. */
export function RefreshButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="min-h-11 inline-flex items-center px-3 py-2 rounded-md text-xs font-medium bg-slate-800 text-white hover:bg-slate-900 transition-colors"
    >
      <IconRefresh className="w-3 h-3 mr-1" />
      Refresh
    </button>
  );
}
