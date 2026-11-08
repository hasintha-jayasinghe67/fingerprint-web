import type { ReactNode } from "react";

/** Red alert used at the top of a page when a request fails. */
export function ErrorBanner({ children }: { children: ReactNode }) {
  return (
    <div
      role="alert"
      className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm"
    >
      <strong>Error:</strong> {children}
    </div>
  );
}
