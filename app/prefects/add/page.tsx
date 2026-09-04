"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";

// -------------------------------------------------------
// Types
// -------------------------------------------------------

interface Prefect {
  id: number;
  name: string;
  class: string | null;
  code: string | null;
  pin: string;
  registered: boolean;
  created_at: string;
}

// -------------------------------------------------------
// Main Component
// -------------------------------------------------------

export default function AddPrefectPage() {
  const router = useRouter();

  // Form state
  const [name, setName] = useState("");
  const [prefectClass, setPrefectClass] = useState("");
  const [code, setCode] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // After creation
  const [created, setCreated] = useState<Prefect | null>(null);
  const [registering, setRegistering] = useState(false);
  const [registerResult, setRegisterResult] = useState<string | null>(null);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [registrationDone, setRegistrationDone] = useState(false);

  // Prefects list
  const [prefects, setPrefects] = useState<Prefect[]>([]);
  const [loadingList, setLoadingList] = useState(true);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const fetchPrefects = useCallback(async () => {
    try {
      const res = await fetch("/api/prefects");
      if (res.ok) {
        const data = await res.json();
        setPrefects(data.prefects);
        // Keep the "created" card in sync with the DB registration flag
        setCreated((prev) => {
          if (!prev) return prev;
          const fresh = data.prefects.find((p: Prefect) => p.id === prev.id);
          return fresh ? { ...fresh } : prev;
        });
      }
    } catch {
      // silent
    } finally {
      setLoadingList(false);
    }
  }, []);

  useEffect(() => {
    fetchPrefects();
  }, [fetchPrefects]);

  // Once enrollment is queued, poll until the device confirms the
  // fingerprint was actually stored (registered -> true) or 3 min pass.
  useEffect(() => {
    if (!registrationDone || !created?.id) return;
    const createdId = created.id;
    const startedAt = Date.now();
    const interval = setInterval(async () => {
      if (Date.now() - startedAt > 3 * 60 * 1000) {
        setRegistrationDone(false);
        return;
      }
      try {
        const res = await fetch("/api/prefects");
        if (!res.ok) return;
        const list: Prefect[] = (await res.json()).prefects || [];
        setPrefects(list);
        const target = list.find((p) => p.id === createdId);
        if (target) {
          setCreated(target);
          if (target.registered) {
            setRegistrationDone(false);
            setRegisterResult(
              "Fingerprint confirmed! The prefect is now enrolled on the device."
            );
          }
        }
      } catch {
        // keep polling
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [registrationDone, created?.id]);

  // -------------------------------------------------------
  // Create prefect
  // -------------------------------------------------------

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch("/api/prefects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          class: prefectClass,
          code: code || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create prefect");
      }

      const prefect: Prefect = await res.json();
      setCreated(prefect);
      setRegisterResult(null);
      setRegisterError(null);
      setRegistrationDone(false);
      setName("");
      setPrefectClass("");
      setCode("");
      fetchPrefects();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setSubmitting(false);
    }
  }

  // -------------------------------------------------------
  // Register on device
  // -------------------------------------------------------

  async function handleRegisterDevice(prefectId: number) {
    setRegistering(true);
    setRegisterResult(null);
    setRegisterError(null);

    try {
      const res = await fetch(`/api/prefects/${prefectId}/register-device`, {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to register on device");
      }

      setRegisterResult(
        "Enrollment started — the device is prompting for a fingerprint. Waiting for confirmation..."
      );
      setRegistrationDone(true);
      fetchPrefects();
    } catch (err) {
      setRegisterError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setRegistering(false);
    }
  }

  // -------------------------------------------------------
  // Delete prefect
  // -------------------------------------------------------

  async function handleDelete(id: number) {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/prefects/${id}`, { method: "DELETE" });
      if (res.ok) {
        setPrefects((prev) => prev.filter((p) => p.id !== id));
        if (created?.id === id) setCreated(null);
      }
    } finally {
      setDeletingId(null);
    }
  }

  // -------------------------------------------------------
  // Render
  // -------------------------------------------------------

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Header */}
      <header className="border-b border-slate-200 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center gap-3">
            <button
              onClick={() => router.push("/")}
              className="w-9 h-9 rounded-lg bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 transition-colors"
            >
              ←
            </button>
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                Add House Prefect
              </h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Left: Form */}
          <div>
            {/* Success card */}
            {created && (
              <div className="mb-6 bg-emerald-50 border border-emerald-200 rounded-2xl p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-semibold text-emerald-800">
                    Prefect Created
                  </h3>
                  {created.registered && (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-600 text-white">
                      ✓ Enrolled
                    </span>
                  )}
                </div>
                <div className="space-y-2 text-sm text-emerald-700 mb-4">
                  <p>
                    <strong>Name:</strong> {created.name}
                  </p>
                  {created.class && (
                    <p>
                      <strong>Class:</strong> {created.class}
                    </p>
                  )}
                  {created.code && (
                    <p>
                      <strong>Code:</strong> {created.code}
                    </p>
                  )}
                  <p>
                    <strong>PIN:</strong>{" "}
                    <span className="font-mono bg-emerald-100 px-2 py-0.5 rounded">
                      {created.pin}
                    </span>
                  </p>
                </div>

                {/* Device registration status */}
                {registerResult && (
                  <div
                    className={`p-3 rounded-xl text-sm mb-3 flex items-start gap-2 ${
                      created.registered
                        ? "bg-emerald-600 text-white"
                        : "bg-emerald-100 text-emerald-800"
                    }`}
                  >
                    {!created.registered && (
                      <span className="mt-0.5 w-3.5 h-3.5 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin shrink-0" />
                    )}
                    {registerResult}
                  </div>
                )}
                {registerError && (
                  <div className="p-3 bg-red-100 rounded-xl text-sm text-red-700 mb-3">
                    {registerError}
                  </div>
                )}

                <div className="flex gap-3">
                  {!created.registered && (
                    <button
                      onClick={() => handleRegisterDevice(created.id)}
                      disabled={registering || registrationDone}
                      className="flex-1 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                    >
                      {registering || registrationDone ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          {registrationDone ? "Awaiting fingerprint..." : "Queuing..."}
                        </span>
                      ) : (
                        "Register Fingerprint on Device"
                      )}
                    </button>
                  )}
                  <button
                    onClick={() => setCreated(null)}
                    className="px-4 py-2.5 rounded-xl bg-slate-100 text-slate-600 text-sm font-semibold hover:bg-slate-200 transition-all"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            {/* Registration form */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-800 mb-4">
                New Prefect Details
              </h2>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                  {error}
                </div>
              )}

              <form onSubmit={handleCreate} className="space-y-5">
                <div>
                  <label
                    htmlFor="name"
                    className="block text-sm font-medium text-slate-700 mb-1.5"
                  >
                    Name with initials <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="e.g. H. Perera"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>

                <div>
                  <label
                    htmlFor="class"
                    className="block text-sm font-medium text-slate-700 mb-1.5"
                  >
                    Class <span className="text-red-500">*</span>
                  </label>
                  <input
                    id="class"
                    type="text"
                    value={prefectClass}
                    onChange={(e) => setPrefectClass(e.target.value)}
                    required
                    placeholder="e.g. 10A"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>

                <div>
                  <label
                    htmlFor="code"
                    className="block text-sm font-medium text-slate-700 mb-1.5"
                  >
                    Code{" "}
                    <span className="text-slate-400 font-normal">
                      (optional)
                    </span>
                  </label>
                  <input
                    id="code"
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="e.g. HP001"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-300 bg-white text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting || !name.trim() || !prefectClass.trim()}
                  className="w-full px-4 py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all active:scale-[0.98]"
                >
                  {submitting ? (
                    <span className="flex items-center justify-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Creating...
                    </span>
                  ) : (
                    "Create Prefect"
                  )}
                </button>
              </form>
            </div>

            {/* Info box */}
            <div className="mt-6 bg-amber-50 border border-amber-200 rounded-2xl p-5">
              <h3 className="font-semibold text-amber-800 text-sm mb-2">
                How Device Registration Works
              </h3>
              <ol className="text-sm text-amber-700 space-y-1.5 list-decimal list-inside">
                <li>Create the prefect above — they get assigned a PIN.</li>
                <li>
                  Click{" "}
                  <strong>&quot;Register Fingerprint on Device&quot;</strong> to
                  queue the command.
                </li>
                <li>
                  The K40 Pro picks up the command on its next poll and prompts
                  for fingerprint enrollment.
                </li>
                <li>
                  The prefect places their finger on the reader to complete
                  enrollment.
                </li>
                <li>
                  The prefect is only marked{" "}
                  <strong>enrolled</strong> after the device confirms the
                  fingerprint was actually stored.
                </li>
              </ol>
            </div>
          </div>

          {/* Right: Existing prefects list */}
          <div>
            <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
              <div className="px-6 py-4 border-b border-slate-100">
                <h2 className="font-semibold text-slate-800">
                  Registered Prefects{" "}
                  <span className="text-slate-400 font-normal">
                    ({prefects.length})
                  </span>
                </h2>
              </div>

              {loadingList ? (
                <div className="p-8 text-center">
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin mx-auto" />
                </div>
              ) : prefects.length === 0 ? (
                <div className="p-8 text-center text-sm text-slate-400">
                  No prefects registered yet.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {prefects.map((p) => (
                    <div
                      key={p.id}
                      className="px-6 py-4 flex items-center justify-between hover:bg-slate-50/50 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                          {p.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-800">
                            {p.name}
                          </p>
                          <p className="text-xs text-slate-400">
                            {p.class && (
                              <span className="mr-2 font-medium text-slate-500">
                                {p.class}
                              </span>
                            )}
                            {p.code && (
                              <span className="mr-2 font-mono">{p.code}</span>
                            )}
                            PIN: <span className="font-mono">{p.pin}</span>
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {p.registered ? (
                          <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full font-medium">
                            ✓ On device
                          </span>
                        ) : (
                          <button
                            onClick={() => handleRegisterDevice(p.id)}
                            disabled={registering}
                            className="text-xs bg-blue-100 text-blue-700 px-2.5 py-1 rounded-full font-medium hover:bg-blue-200 transition-colors disabled:opacity-50"
                          >
                            Register
                          </button>
                        )}
                        <button
                          onClick={() => handleDelete(p.id)}
                          disabled={deletingId === p.id}
                          className="text-xs text-slate-400 hover:text-red-500 px-1.5 py-1 rounded transition-colors disabled:opacity-50"
                          title="Delete prefect"
                        >
                          {deletingId === p.id ? "..." : "✕"}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
