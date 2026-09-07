"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/lib/AuthContext";
import Modal from "./Modal";
import PasswordInput from "./PasswordInput";

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Self-service password change. Re-auth with the current password, then
 * updateUser. Client min-length only — no dedicated API route.
 */
export default function ChangePasswordModal({
  isOpen,
  onClose,
}: ChangePasswordModalProps) {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setBusy(false);
      setError("");
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    if (!user || busy) return;
    if (!currentPassword || !newPassword || !confirmPassword) {
      setError("All fields are required.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("New passwords do not match.");
      return;
    }
    if (newPassword.length < 8) {
      setError("New password must be at least 8 characters.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const { error: reauthError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      if (reauthError) {
        setError("Current password is incorrect.");
        return;
      }
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (updateError) {
        setError(updateError.message);
        return;
      }
      onClose();
      alert("Password changed successfully.");
    } catch (err) {
      setError(
        "Failed to change password: " +
          (err instanceof Error ? err.message : String(err))
      );
    } finally {
      setBusy(false);
    }
  };

  const fieldClass =
    "w-full px-3.5 py-2.5 rounded-md border border-slate-300 bg-white text-slate-900 text-sm placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500";

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Change password">
      <div className="flex flex-col gap-4">
        <div>
          <label
            htmlFor="change-current-password"
            className="block text-sm font-medium text-slate-700 mb-1.5"
          >
            Current password
          </label>
          <PasswordInput
            id="change-current-password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Your current password"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSubmit();
              }
            }}
            className={fieldClass}
          />
        </div>
        <div>
          <label
            htmlFor="change-new-password"
            className="block text-sm font-medium text-slate-700 mb-1.5"
          >
            New password
          </label>
          <PasswordInput
            id="change-new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="At least 8 characters"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSubmit();
              }
            }}
            className={fieldClass}
          />
        </div>
        <div>
          <label
            htmlFor="change-confirm-password"
            className="block text-sm font-medium text-slate-700 mb-1.5"
          >
            Confirm new password
          </label>
          <PasswordInput
            id="change-confirm-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Repeat the new password"
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSubmit();
              }
            }}
            className={fieldClass}
          />
        </div>
        {error && (
          <div className="text-sm text-red-700 bg-red-50 border border-red-200 rounded-md px-3 py-2">
            {error}
          </div>
        )}
        <div className="flex w-full gap-2 pt-2 border-t border-slate-100">
          <button
            onClick={handleSubmit}
            disabled={busy}
            className="flex-1 px-4 py-2.5 rounded-md bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-60 transition-colors"
          >
            {busy ? "Changing..." : "Change password"}
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
