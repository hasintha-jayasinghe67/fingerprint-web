"use client";

import { useEffect, useMemo, useState } from "react";
import Modal from "@/components/Modal";
import { IconCheck } from "@/components/icons";
import { apiUrl, readApiJson } from "@/lib/api";
import { matchesSearch } from "@/lib/search";

type Audience = "everyone" | "selected";

interface PrefectOption {
  id: number;
  name: string;
  class: string | null;
  code?: string | null;
  pin: string;
}

const DURATION_OPTIONS = [
  { value: 60, label: "1 hour" },
  { value: 240, label: "4 hours" },
  { value: 480, label: "8 hours" },
  { value: 1440, label: "24 hours" },
] as const;

/**
 * Queue a public or personal notice on the ZKTeco device.
 * Personal notices appear on the LCD after the selected prefect verifies.
 */
export function SendNoticeModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const [audience, setAudience] = useState<Audience>("everyone");
  const [message, setMessage] = useState("");
  const [minutes, setMinutes] = useState(240);
  const [prefects, setPrefects] = useState<PrefectOption[]>([]);
  const [prefectsLoading, setPrefectsLoading] = useState(false);
  const [prefectsError, setPrefectsError] = useState<string | null>(null);
  const [selectedPins, setSelectedPins] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [resultOk, setResultOk] = useState(true);

  useEffect(() => {
    if (!isOpen) return;

    setAudience("everyone");
    setMessage("");
    setMinutes(240);
    setSelectedPins(new Set());
    setQuery("");
    setSending(false);
    setResult(null);
    setResultOk(true);
    setPrefectsError(null);

    let cancelled = false;
    (async () => {
      setPrefectsLoading(true);
      try {
        const res = await fetch(apiUrl("/api/prefects"));
        const data = await readApiJson<{
          prefects?: Array<{
            id: number;
            name: string;
            class: string | null;
            code?: string | null;
            pin?: string | null;
          }>;
          error?: string;
        }>(res);
        if (!res.ok) {
          throw new Error(data.error || "Failed to load prefects");
        }
        if (cancelled) return;
        const list = (data.prefects || [])
          .map((p) => ({
            id: p.id,
            name: p.name,
            class: p.class,
            code: p.code,
            pin: String(p.pin ?? "").trim(),
          }))
          .filter((p) => p.pin)
          .sort((a, b) =>
            a.name.localeCompare(b.name, undefined, { sensitivity: "base" })
          );
        setPrefects(list);
      } catch (err) {
        if (!cancelled) {
          setPrefectsError(
            err instanceof Error ? err.message : "Failed to load prefects"
          );
          setPrefects([]);
        }
      } finally {
        if (!cancelled) setPrefectsLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const filteredPrefects = useMemo(
    () =>
      prefects.filter((p) =>
        matchesSearch(query, p.name, p.pin, p.class, p.code)
      ),
    [prefects, query]
  );

  const canSend =
    message.trim().length > 0 &&
    !sending &&
    (audience === "everyone" || selectedPins.size > 0);

  function togglePin(pin: string) {
    setSelectedPins((prev) => {
      const next = new Set(prev);
      if (next.has(pin)) next.delete(pin);
      else next.add(pin);
      return next;
    });
  }

  function selectVisible() {
    setSelectedPins((prev) => {
      const next = new Set(prev);
      for (const p of filteredPrefects) next.add(p.pin);
      return next;
    });
  }

  function clearSelection() {
    setSelectedPins(new Set());
  }

  async function handleSend() {
    if (!canSend) return;
    setSending(true);
    setResult(null);
    try {
      const body: {
        message: string;
        minutes: number;
        wait: boolean;
        pins?: string[];
      } = {
        message: message.trim(),
        minutes,
        wait: true,
      };
      if (audience === "selected") {
        body.pins = Array.from(selectedPins);
      }

      const res = await fetch(apiUrl("/api/sms"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await readApiJson<{
        error?: string;
        message?: string;
        deviceSN?: string;
        delivery?: string;
        audience?: string;
      }>(res);

      if (res.ok) {
        setResultOk(true);
        setResult(
          data.message ||
            `Notice sent to device ${data.deviceSN || ""}.`.trim()
        );
      } else {
        setResultOk(false);
        setResult(`Failed: ${data.error || data.message || "Unknown error"}`);
      }
    } catch (err) {
      setResultOk(false);
      setResult(
        `Error: ${err instanceof Error ? err.message : "Network error"}`
      );
    } finally {
      setSending(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      dismissible={!sending}
      onClose={() => {
        if (!sending) onClose();
      }}
      title="Send notice to device"
      size="lg"
    >
      {result ? (
        <div className="text-center py-2" role="status">
          <div
            className={`flex justify-center mb-3 ${
              resultOk ? "text-emerald-700" : "text-red-700"
            }`}
          >
            {resultOk ? (
              <IconCheck className="w-8 h-8" />
            ) : (
              <span className="text-2xl font-semibold" aria-hidden="true">
                !
              </span>
            )}
          </div>
          <p className="text-sm font-medium text-slate-700">{result}</p>
          <button
            type="button"
            onClick={onClose}
            className="mt-4 min-h-11 px-4 rounded-md text-sm font-medium bg-slate-800 text-white hover:bg-slate-900 transition-colors"
          >
            Close
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          <p className="text-xs text-slate-600">
            Public notices show an SMS icon on the idle screen (press M/OK to
            read). Personal notices appear for about 30 seconds after the
            selected prefect signs in. Confirmation can take up to ~20s while
            the device polls.
          </p>

          <div>
            <span className="block text-sm font-medium text-slate-700 mb-1.5">
              Audience
            </span>
            <div className="flex flex-wrap gap-2">
              {(
                [
                  ["everyone", "Everyone (public)"],
                  ["selected", "Selected prefects"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setAudience(value)}
                  disabled={sending}
                  className={`min-h-11 px-4 py-2 rounded-md text-sm font-medium border transition-colors disabled:opacity-50 ${
                    audience === value
                      ? "bg-brand-700 text-white border-brand-700"
                      : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {audience === "selected" && (
            <div className="rounded-md border border-slate-200 overflow-hidden">
              <div className="px-3 py-3 border-b border-slate-100 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-medium text-slate-700">
                    Recipients
                    {selectedPins.size > 0
                      ? ` (${selectedPins.size} selected)`
                      : ""}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={selectVisible}
                      disabled={
                        sending ||
                        prefectsLoading ||
                        filteredPrefects.length === 0
                      }
                      className="min-h-9 px-2.5 rounded-md text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-50"
                    >
                      Select visible
                    </button>
                    <button
                      type="button"
                      onClick={clearSelection}
                      disabled={sending || selectedPins.size === 0}
                      className="min-h-9 px-2.5 rounded-md text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 disabled:opacity-50"
                    >
                      Clear
                    </button>
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="notice-prefect-search"
                    className="block text-sm font-medium text-slate-700 mb-1.5"
                  >
                    Find prefects
                  </label>
                  <input
                    id="notice-prefect-search"
                    type="search"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search by name, PIN, class…"
                    disabled={sending}
                    className="w-full min-h-11 px-3.5 py-2.5 rounded-md border border-slate-300 bg-white text-base text-slate-900 placeholder:text-slate-600 disabled:opacity-50"
                  />
                </div>
              </div>

              {prefectsLoading ? (
                <div className="flex justify-center py-10">
                  <div className="w-6 h-6 border-2 border-slate-800 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : prefectsError ? (
                <p className="px-4 py-6 text-sm text-red-700">{prefectsError}</p>
              ) : filteredPrefects.length === 0 ? (
                <p className="px-4 py-6 text-sm text-slate-500 text-center">
                  {prefects.length === 0
                    ? "No prefects with device PINs are registered yet."
                    : "No prefects match this search."}
                </p>
              ) : (
                <div className="max-h-56 overflow-y-auto divide-y divide-slate-100">
                  {filteredPrefects.map((p) => (
                    <label
                      key={p.id}
                      className="flex items-start gap-3 px-4 py-2.5 hover:bg-slate-50 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedPins.has(p.pin)}
                        onChange={() => togglePin(p.pin)}
                        disabled={sending}
                        className="mt-0.5 rounded border-slate-300 text-brand-800"
                      />
                      <span className="min-w-0">
                        <span className="block text-sm font-medium text-slate-800">
                          {p.name}
                        </span>
                        <span className="block text-xs text-slate-500">
                          PIN {p.pin}
                          {p.class ? ` · ${p.class}` : ""}
                          {p.code ? ` · ${p.code}` : ""}
                        </span>
                      </span>
                    </label>
                  ))}
                </div>
              )}
            </div>
          )}

          <div>
            <label
              htmlFor="notice-message"
              className="block text-sm font-medium text-slate-700 mb-2"
            >
              Notice content
            </label>
            <textarea
              id="notice-message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Enter the message to display on the device…"
              rows={4}
              disabled={sending}
              maxLength={255}
              className="w-full px-3 py-2.5 rounded-md border border-slate-300 text-slate-800 placeholder:text-slate-600 resize-none disabled:opacity-50"
            />
            <p className="mt-1 text-xs text-slate-500">
              {message.trim().length}/255 characters
            </p>
          </div>

          <div>
            <label
              htmlFor="notice-duration"
              className="block text-sm font-medium text-slate-700 mb-1.5"
            >
              Effective for
            </label>
            <select
              id="notice-duration"
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value))}
              disabled={sending}
              className="w-full min-h-11 px-3 py-2.5 rounded-md border border-slate-300 bg-white text-slate-900 disabled:opacity-50"
            >
              {DURATION_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={sending}
              className="min-h-11 px-4 rounded-md text-sm font-medium bg-slate-100 text-slate-700 hover:bg-slate-200 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                void handleSend();
              }}
              disabled={!canSend}
              className="min-h-11 px-4 rounded-md text-sm font-medium bg-brand-700 text-white hover:bg-brand-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? (
                <span className="flex items-center gap-2">
                  <span
                    className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"
                    aria-hidden="true"
                  />
                  Waiting for device…
                </span>
              ) : audience === "selected" ? (
                `Send to ${selectedPins.size || "…"}`
              ) : (
                "Send notice"
              )}
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
}
