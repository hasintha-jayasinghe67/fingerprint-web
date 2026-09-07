"use client";

import { useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import Modal from "./Modal";
import PasswordInput from "./PasswordInput";

interface ConfirmPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: ReactNode;
  confirmLabel?: string;
  /** Called only after the current user's password has been verified. */
  onVerified: () => Promise<void>;
}

/**
 * Destructive-action confirmation: re-enter password (real signInWithPassword)
 * before `onVerified` runs. Not MFA / step-up — a full re-login.
 */
export default function ConfirmPasswordModal({
  isOpen,
  onClose,
  title,
  message,
  confirmLabel = "Confirm",
  onVerified,
}: ConfirmPasswordModalProps) {
  const { user } = useAuth();
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setPassword("");
      setBusy(false);
      setError("");
    }
  }, [isOpen]);

  const handleConfirm = async () => {
    if (!user || busy || !password.trim()) return;
    setBusy(true);
    setError("");
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password,
      });
      if (authError) {
        setError("Incorrect password. Action aborted.");
        return;
      }
      await onVerified();
      onClose();
    } catch (err) {
      setError(
        "Action failed: " + (err instanceof Error ? err.message : String(err))
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="flex flex-col gap-4">
        <div className="bg-red-50 border border-red-200 rounded-md p-3 text-sm text-red-700">
          {message}
        </div>
        <div>
          <label
            htmlFor="confirm-password"
            className="block text-sm font-medium text-slate-700 mb-1.5"
          >
            Enter your password to confirm
          </label>
          <PasswordInput
            id="confirm-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Your password"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleConfirm();
              }
            }}
            className="w-full px-3.5 py-2.5 rounded-md border border-slate-300 bg-white text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-red-500/30 focus:border-red-400"
          />
        </div>
        {error && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {error}
          </div>
        )}
        <div className="flex w-full gap-2 pt-2 border-t border-slate-100">
          <button
            onClick={handleConfirm}
            disabled={busy || !password.trim()}
            className="flex-1 px-4 py-2.5 rounded-md bg-red-600 text-white text-sm font-semibold hover:bg-red-700 disabled:opacity-60 transition-colors"
          >
            {busy ? "Verifying..." : confirmLabel}
          </button>
          <button
            onClick={onClose}
            disabled={busy}
            className="flex-1 px-4 py-2.5 rounded-md bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200 disabled:opacity-60 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </Modal>
  );
}
