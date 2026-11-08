/** Search box shared by list pages. Filtering stays in the page. */
export function SearchField({
  id,
  value,
  onChange,
  placeholder,
  label = "Search",
  className = "",
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  label?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1.5">
        {label}
      </label>
      <input
        id={id}
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={label}
        className="w-full min-h-11 px-3.5 py-2.5 rounded-md border border-slate-300 bg-white text-base text-slate-900 placeholder:text-slate-600"
      />
    </div>
  );
}
