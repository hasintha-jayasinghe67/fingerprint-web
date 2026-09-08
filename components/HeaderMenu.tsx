"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";

interface HeaderMenuProps {
  label: string;
  children: ReactNode;
  /** Align the panel to the trigger's end edge (default) or start. */
  align?: "end" | "start";
}

/** Shared class for items inside a HeaderMenu panel. */
export const headerMenuItemClass =
  "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors";

/**
 * When "inline", HeaderMenu expands in-flow (for the mobile overflow panel)
 * instead of using an absolute dropdown that would close/clip the parent.
 */
export const HeaderMenuLayoutContext = createContext<"dropdown" | "inline">(
  "dropdown"
);

/**
 * Compact header dropdown ("context menu") for secondary links/actions so the
 * bar stays uncluttered. Closes on outside click, Escape, or choosing an item.
 * Inside a mobile overflow panel (layout="inline") it expands accordion-style.
 */
export default function HeaderMenu({
  label,
  children,
  align = "end",
}: HeaderMenuProps) {
  const layout = useContext(HeaderMenuLayoutContext);
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const inline = layout === "inline";

  useEffect(() => {
    if (!open || inline) return;
    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node;
      if (
        panelRef.current?.contains(target) ||
        buttonRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, inline]);

  return (
    <div
      className={
        inline
          ? "flex w-full flex-col gap-1"
          : "relative shrink-0"
      }
    >
      <button
        ref={buttonRef}
        type="button"
        data-header-menu-trigger=""
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        aria-haspopup="menu"
        aria-expanded={open}
        className={
          inline
            ? "inline-flex w-full items-center justify-between gap-1 px-3 py-1.5 rounded-md text-xs font-medium bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-800 transition-colors"
            : "inline-flex items-center gap-1 px-3 py-1.5 rounded-md text-xs font-medium bg-white text-slate-600 border border-slate-200 hover:bg-slate-50 hover:text-slate-800 transition-colors"
        }
      >
        {label}
        <svg
          className={`w-3 h-3 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.2}
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M6 9l6 6 6-6"
          />
        </svg>
      </button>
      {open && (
        <div
          ref={panelRef}
          role="menu"
          onClick={() => setOpen(false)}
          className={
            inline
              ? "flex w-full flex-col gap-0.5 rounded-md border border-slate-200 bg-slate-50 p-1.5"
              : `absolute top-full mt-1.5 z-40 min-w-[11rem] max-h-[70vh] overflow-y-auto rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg ${
                  align === "end" ? "right-0" : "left-0"
                }`
          }
        >
          {children}
        </div>
      )}
    </div>
  );
}
