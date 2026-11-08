"use client";

import { useEffect, useRef, useState } from "react";
import { headerMenuItemClass } from "@/components/HeaderMenu";
import { IconDownload, IconMoreVertical } from "@/components/icons";
import type { GateSheetPdfVariant } from "@/lib/gateSheetPdf";

/** Compact kebab menu for per-batch PDF downloads (hidden until opened). */
export function BatchDownloadMenu({
  disabled,
  onDownload,
}: {
  disabled?: boolean;
  onDownload: (variant: GateSheetPdfVariant) => void;
}) {
  const [open, setOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
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
  }, [open]);

  return (
    <div className="relative shrink-0">
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        aria-label="Download options"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        className="min-h-11 min-w-11 inline-flex items-center justify-center rounded-md text-slate-600 border border-slate-300 bg-white hover:bg-slate-50 hover:text-slate-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <IconMoreVertical className="w-4 h-4" />
      </button>
      {open && (
        <div
          ref={panelRef}
          role="menu"
          className="absolute right-0 top-full mt-1.5 z-40 min-w-[14rem] rounded-lg border border-slate-200 bg-white p-1.5 shadow-lg"
        >
          <button
            type="button"
            role="menuitem"
            className={`${headerMenuItemClass} w-full`}
            onClick={() => {
              setOpen(false);
              onDownload("full");
            }}
          >
            <IconDownload className="w-3.5 h-3.5 text-slate-500" />
            Download gate sheet
          </button>
          <button
            type="button"
            role="menuitem"
            className={`${headerMenuItemClass} w-full`}
            onClick={() => {
              setOpen(false);
              onDownload("offProbation");
            }}
          >
            <IconDownload className="w-3.5 h-3.5 text-slate-500" />
            Download off probation
          </button>
        </div>
      )}
    </div>
  );
}

