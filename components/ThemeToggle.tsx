"use client";

import { useLayoutEffect, useState } from "react";
import { IconMoon, IconSun } from "@/components/icons";

export const THEME_STORAGE_KEY = "hpa-theme";

export function applyTheme(dark: boolean) {
  document.documentElement.classList.toggle("dark", dark);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, dark ? "dark" : "light");
  } catch {
    // Private mode can block storage; the class still applies for this visit.
  }
}

/** Icon-only light/dark switch. The glyph follows the `.dark` class on `<html>`. */
export default function ThemeToggle({
  className = "",
}: {
  className?: string;
}) {
  const [dark, setDark] = useState(false);

  useLayoutEffect(() => {
    // Hydration rewrites <html class> from the server and can drop the
    // class the boot script added. Put it back before the first paint.
    let storedDark = false;
    try {
      storedDark = localStorage.getItem(THEME_STORAGE_KEY) === "dark";
    } catch {
      storedDark = document.documentElement.classList.contains("dark");
    }
    document.documentElement.classList.toggle("dark", storedDark);
    setDark(storedDark);
  }, []);

  return (
    <button
      type="button"
      aria-pressed={dark}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={() => {
        const next = !document.documentElement.classList.contains("dark");
        applyTheme(next);
        setDark(next);
      }}
      className={`min-h-11 min-w-11 md:min-h-9 md:min-w-9 shrink-0 rounded-md bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-700 transition-colors ${className}`}
    >
      <IconMoon className="w-4 h-4 dark:hidden" />
      <IconSun className="w-4 h-4 hidden dark:inline-block" />
    </button>
  );
}
