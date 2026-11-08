"use client";

export function StackedValues({ values }: { values: string[] }) {
  if (values.length === 0) return <>—</>;
  return (
    <span className="flex flex-col gap-0.5">
      {values.map((value) => (
        <span key={value}>{value}</span>
      ))}
    </span>
  );
}

