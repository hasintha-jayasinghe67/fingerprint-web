"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { logout } from "@/app/login/actions";

interface SiteHeaderProps {
  title: string;
  subtitle?: string;
  /** Route for the back button. Pass "back" to use the browser's history. */
  backTo?: string | "back";
  /** Controls shown on the right (links, buttons). */
  actions?: ReactNode;
  /**
   * "menu" collapses actions behind a hamburger menu on mobile (default).
   * "wrap" keeps them inline on mobile, wrapping onto extra lines — use for
   * one or two essential actions like a primary CTA.
   */
  actionsLayout?: "menu" | "wrap";
  maxWidth?: "3xl" | "5xl" | "7xl";
}

export default function SiteHeader({
  title,
  subtitle,
  backTo,
  actions,
  actionsLayout = "menu",
  maxWidth = "7xl",
}: SiteHeaderProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const logoutButton = (
    <button
      onClick={() => logout()}
      title="Sign out"
      className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white text-slate-600 border border-slate-200 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-colors active:scale-95 shrink-0"
    >
      Log out
    </button>
  );

  // Close the menu on outside click / Escape. A plain outside-click handler
  // is used instead of a fixed backdrop because the header's backdrop-blur
  // would turn into the containing block for fixed descendants.
  useEffect(() => {
    if (!menuOpen) return;
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (
        panelRef.current &&
        !panelRef.current.contains(target) &&
        buttonRef.current &&
        !buttonRef.current.contains(target)
      ) {
        setMenuOpen(false);
      }
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setMenuOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const containerWidth =
    maxWidth === "3xl"
      ? "max-w-3xl"
      : maxWidth === "5xl"
        ? "max-w-5xl"
        : "max-w-7xl";

  return (
    <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
      <div className={`${containerWidth} mx-auto px-4 sm:px-6 lg:px-8 py-3 sm:py-4`}>
        <div className="flex items-center justify-between gap-3">
          {/* Left: back button + title */}
          <div className="flex items-center gap-3 min-w-0">
            {backTo && (
              <button
                onClick={() =>
                  backTo === "back" ? router.back() : router.push(backTo)
                }
                aria-label="Go back"
                className="w-9 h-9 shrink-0 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors active:scale-95"
              >
                ←
              </button>
            )}
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight truncate">
                {title}
              </h1>
              {subtitle && (
                <p className="text-xs text-slate-500 truncate">{subtitle}</p>
              )}
            </div>
          </div>

          {/* Right: actions */}
          <div className="flex items-center gap-2 justify-end min-w-0 shrink-0">
            {actions &&
              (actionsLayout === "wrap" ? (
                <div className="flex items-center gap-2 flex-wrap justify-end">
                  {actions}
                </div>
              ) : (
                <>
                  <div className="hidden md:flex items-center gap-2 flex-wrap justify-end">
                    {actions}
                  </div>
                  <div className="md:hidden relative shrink-0">
                    <button
                      ref={buttonRef}
                      onClick={() => setMenuOpen((v) => !v)}
                      aria-label="Toggle menu"
                      aria-expanded={menuOpen}
                      className="w-9 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors active:scale-95"
                    >
                      {menuOpen ? "✕" : "☰"}
                    </button>
                    {menuOpen && (
                      <div
                        ref={panelRef}
                        onClick={() => setMenuOpen(false)}
                        className="absolute right-0 top-full mt-2 z-30 w-60 max-h-[70vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-2 shadow-xl flex flex-col gap-1.5 [&>*]:w-full [&>*]:justify-center"
                      >
                        {actions}
                        {logoutButton}
                      </div>
                    )}
                  </div>
                </>
              ))}
            {actions && actionsLayout !== "wrap" && (
              <div className="hidden md:block">{logoutButton}</div>
            )}
            {(!actions || actionsLayout === "wrap") && logoutButton}
          </div>
        </div>
      </div>
    </header>
  );
}