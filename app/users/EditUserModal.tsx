"use client";

import Modal from "@/components/Modal";
import PasswordInput from "@/components/PasswordInput";
import type { Role } from "@/lib/AuthContext";
import type { DbUser } from "./types";

/** Change a user's name, password, or role. */
export function EditUserModal({
  editUser,
  setEditUser,
  editUsername,
  setEditUsername,
  editPassword,
  setEditPassword,
  editRole,
  setEditRole,
  fieldClass,
  savingEdit,
  handleSaveEdit,
}: {
  editUser: DbUser | null;
  setEditUser: (user: DbUser | null) => void;
  editUsername: string;
  setEditUsername: (value: string) => void;
  editPassword: string;
  setEditPassword: (value: string) => void;
  editRole: Role;
  setEditRole: (value: Role) => void;
  fieldClass: string;
  savingEdit: boolean;
  handleSaveEdit: () => void;
}) {
  return (
      <Modal
        isOpen={editUser !== null}
        onClose={() => setEditUser(null)}
        title={`Edit user: ${editUser?.username || ""}`}
      >
        <div className="flex flex-col gap-3">
          <div>
            <label
              htmlFor="edit-username"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              Username
            </label>
            <input
              id="edit-username"
              type="text"
              value={editUsername}
              readOnly
              className="w-full px-3 py-2.5 rounded-md border border-slate-200 bg-slate-50 text-slate-400 cursor-not-allowed"
            />
            <p className="text-xs text-slate-600 mt-1">
              Usernames cannot be changed after creation.
            </p>
          </div>
          <div>
            <label
              htmlFor="edit-password"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              New password{" "}
              <span className="text-slate-600 font-normal">
                (leave blank to keep current)
              </span>
            </label>
            <PasswordInput
              id="edit-password"
              value={editPassword}
              onChange={(e) => setEditPassword(e.target.value)}
              placeholder="Leave blank to keep current"
              className={fieldClass}
            />
          </div>
          <div>
            <label
              htmlFor="edit-role"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              Role
            </label>
            <select
              id="edit-role"
              value={editRole}
              onChange={(e) => setEditRole(e.target.value as Role)}
              className={fieldClass}
            >
              <option value="superuser">Superuser</option>
              <option value="admin">Admin</option>
              <option value="view-only">View-only</option>
            </select>
          </div>
        </div>
        <div className="flex w-full gap-2 mt-5 pt-4 border-t border-slate-100">
          <button
            onClick={handleSaveEdit}
            disabled={savingEdit}
            className="flex-1 px-4 py-2.5 rounded-md min-h-11 bg-brand-700 text-white text-sm font-semibold hover:bg-brand-800 disabled:opacity-60"
          >
            {savingEdit ? "Saving..." : "Save"}
          </button>
          <button
            onClick={() => setEditUser(null)}
            className="flex-1 px-4 py-2.5 rounded-md bg-slate-100 text-slate-700 text-sm font-medium hover:bg-slate-200"
          >
            Cancel
          </button>
        </div>
      </Modal>
  );
}
