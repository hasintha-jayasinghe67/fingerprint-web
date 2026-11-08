/** Primary save button. Shows a spinner while the request is in flight. */
export function SaveButton({
  saving,
  label,
  onClick,
  disabled,
}: {
  saving: boolean;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || saving}
      className="px-5 py-2.5 rounded-md min-h-11 bg-brand-700 text-white text-sm font-semibold hover:bg-brand-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
    >
      {saving ? (
        <span className="flex items-center gap-2">
          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          Saving...
        </span>
      ) : (
        label
      )}
    </button>
  );
}
