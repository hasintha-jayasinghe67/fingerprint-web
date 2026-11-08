"use client";

import type { RefObject } from "react";

type ListMatch = { unmatchedTokens: string[] };

/** Pasted present and excused lists, with a live match preview. */
export function PasteLists({
  presentList,
  setPresentList,
  excusedList,
  setExcusedList,
  setPasteTouched,
  presentTextareaRef,
  excusedTextareaRef,
  pastePreview,
}: {
  presentList: string;
  setPresentList: (value: string) => void;
  excusedList: string;
  setExcusedList: (value: string) => void;
  setPasteTouched: (value: boolean) => void;
  presentTextareaRef: RefObject<HTMLTextAreaElement | null>;
  excusedTextareaRef: RefObject<HTMLTextAreaElement | null>;
  pastePreview: {
    presentMatch: ListMatch;
    excusedMatch: ListMatch;
    presentCount: number;
    excusedCount: number;
    traitorCount: number;
  };
}) {
  return (
        <div className="bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="font-semibold text-slate-800">
                Paste excused &amp; present lists
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                Paste one code, full name, surname, or PIN per line (commas also
                work). Any prefect not in the present or excused list will be
                marked as <strong className="text-red-700">Traitor</strong> when
                saved.
              </p>
            </div>
            {(presentList.trim() || excusedList.trim()) && (
              <button
                type="button"
                onClick={() => {
                  setPresentList("");
                  setExcusedList("");
                  setPasteTouched(true);
                }}
                className="min-h-11 px-3 py-2 rounded-md text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
              >
                Clear lists
              </button>
            )}
          </div>

          <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="general-excused-list"
                  className="text-sm font-medium text-slate-700"
                >
                  Excused list
                </label>
                <span className="text-xs font-medium text-sky-700 bg-sky-50 border border-sky-200 px-2 py-0.5 rounded-full">
                  {pastePreview.excusedCount} matched
                </span>
              </div>
              <textarea
                id="general-excused-list"
                ref={excusedTextareaRef}
                rows={10}
                value={excusedList}
                onChange={(e) => {
                  setExcusedList(e.target.value);
                  setPasteTouched(true);
                }}
                placeholder={
                  "Paste excused prefects here…\nOne code, name, or PIN per line"
                }
                className="w-full px-3.5 py-2.5 rounded-md border border-slate-300 bg-white text-slate-900 text-sm font-mono placeholder:text-slate-500 resize-y min-h-[12rem]"
              />
              {pastePreview.excusedMatch.unmatchedTokens.length > 0 && (
                <p className="text-xs text-amber-700 mt-1">
                  Unmatched in excused list:{" "}
                  <span className="font-mono">
                    {pastePreview.excusedMatch.unmatchedTokens
                      .slice(0, 6)
                      .join(", ")}
                    {pastePreview.excusedMatch.unmatchedTokens.length > 6
                      ? "…"
                      : ""}
                  </span>
                </p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label
                  htmlFor="general-present-list"
                  className="text-sm font-medium text-slate-700"
                >
                  Present list
                </label>
                <span className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
                  {pastePreview.presentCount} matched
                </span>
              </div>
              <textarea
                id="general-present-list"
                ref={presentTextareaRef}
                rows={10}
                value={presentList}
                onChange={(e) => {
                  setPresentList(e.target.value);
                  setPasteTouched(true);
                }}
                placeholder={
                  "Paste present prefects here…\nOne code, name, or PIN per line"
                }
                className="w-full px-3.5 py-2.5 rounded-md border border-slate-300 bg-white text-slate-900 text-sm font-mono placeholder:text-slate-500 resize-y min-h-[12rem]"
              />
              {pastePreview.presentMatch.unmatchedTokens.length > 0 && (
                <p className="text-xs text-amber-700 mt-1">
                  Unmatched in present list:{" "}
                  <span className="font-mono">
                    {pastePreview.presentMatch.unmatchedTokens
                      .slice(0, 6)
                      .join(", ")}
                    {pastePreview.presentMatch.unmatchedTokens.length > 6
                      ? "…"
                      : ""}
                  </span>
                </p>
              )}
            </div>
          </div>

          <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex flex-wrap items-center gap-4 text-xs">
            <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600" />
              Present: {pastePreview.presentCount}
            </span>
            <span className="inline-flex items-center gap-1.5 font-medium text-sky-700">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-600" />
              Excused: {pastePreview.excusedCount}
            </span>
            <span className="inline-flex items-center gap-1.5 font-medium text-red-700">
              <span className="w-2.5 h-2.5 rounded-full bg-red-600" />
              Traitors (remaining): {pastePreview.traitorCount}
            </span>
          </div>
        </div>
  );
}
