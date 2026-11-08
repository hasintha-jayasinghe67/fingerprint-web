"use client";

import type { Dispatch, RefObject, SetStateAction } from "react";
import Modal from "@/components/Modal";
import { EXCUSE_TEXTAREA_ROWS } from "./types";

/** ES / EG lists applied onto a saved gate day. */
export function ExcusesModal({
  excusesOpen,
  excusing,
  setExcusesOpen,
  esTextareaRef,
  esList,
  setEsList,
  egTextareaRef,
  egList,
  setEgList,
  excuseError,
  handleExcuse,
  saving,
}: {
  excusesOpen: boolean;
  excusing: boolean;
  setExcusesOpen: (open: boolean) => void;
  esTextareaRef: RefObject<HTMLTextAreaElement | null>;
  esList: string;
  setEsList: Dispatch<SetStateAction<string>>;
  egTextareaRef: RefObject<HTMLTextAreaElement | null>;
  egList: string;
  setEgList: Dispatch<SetStateAction<string>>;
  excuseError: string | null;
  handleExcuse: () => void;
  saving: boolean;
}) {
  return (
      <Modal
        isOpen={excusesOpen}
        onClose={() => {
          if (excusing) return;
          setExcusesOpen(false);
        }}
        title="Add excuses"
        size="lg"
      >
        <div className="flex flex-col gap-4">
          <p className="text-sm text-slate-500">
            Lists are prefilled from logged leave excuses for this date and
            anyone already marked ES/EG. Enter one prefect code, full name,
            surname, or PIN per line (commas also work). Prefects in these
            lists become ES or EG, overwriting any current status. When every
            line matches, remaining unmarked prefects who did not sign in for
            the morning become Traitor, those with no gate duty become Present,
            and leftover gate-duty prefects become Absent.
          </p>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="excuse-es" className="text-sm font-medium text-slate-700">
              ES
            </label>
            <textarea
              id="excuse-es"
              ref={esTextareaRef}
              rows={EXCUSE_TEXTAREA_ROWS}
              value={esList}
              onChange={(e) => setEsList(e.target.value)}
              placeholder={"One code, name, or PIN per line"}
              className="w-full px-3 py-2 rounded-md border border-slate-300 text-sm font-mono text-slate-800 placeholder:text-slate-600 resize-none overflow-y-auto"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="excuse-eg" className="text-sm font-medium text-slate-700">
              EG
            </label>
            <textarea
              id="excuse-eg"
              ref={egTextareaRef}
              rows={EXCUSE_TEXTAREA_ROWS}
              value={egList}
              onChange={(e) => setEgList(e.target.value)}
              placeholder={"One code, name, or PIN per line"}
              className="w-full px-3 py-2 rounded-md border border-slate-300 text-sm font-mono text-slate-800 placeholder:text-slate-600 resize-none overflow-y-auto"
            />
          </div>

          {excuseError && (
            <div role="alert" className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700">
              {excuseError}
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={() => setExcusesOpen(false)}
              disabled={excusing}
              className="px-4 py-2 rounded-md text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 disabled:opacity-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleExcuse}
              disabled={excusing || saving}
              className="px-4 py-2 rounded-md text-sm font-semibold text-white min-h-11 bg-brand-700 hover:bg-brand-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {excusing || saving ? "Applying..." : "Excuse"}
            </button>
          </div>
        </div>
      </Modal>
  );
}
