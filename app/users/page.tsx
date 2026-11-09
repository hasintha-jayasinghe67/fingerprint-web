"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import {
  useAuth,
  isAdminOrAbove,
  isSuperuser,
  type Role,
} from "@/lib/AuthContext";
import SiteHeader from "@/components/site-header";
import Modal from "@/components/Modal";
import PasswordInput from "@/components/PasswordInput";
import ConfirmPasswordModal from "@/components/ConfirmPasswordModal";

interface DbUser {
  id: number;
  username: string;
  role: Role;
  created_at: string;
  disabled: boolean;
}

async function apiRequest(
  url: string,
  options: RequestInit
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(url, {
      ...options,
      headers: { "Content-Type": "application/json" },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: data.error || "Request failed" };
    }
    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

export default function UsersPage() {
  const { authenticated, user: currentUser } = useAuth();
  const router = useRouter();

  const [users, setUsers] = useState<DbUser[]>([]);
  const [loading, setLoading] = useState(true);

  const [newUsername, setNewUsername] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<Role>("view-only");
  const [adding, setAdding] = useState(false);

  const [editUser, setEditUser] = useState<DbUser | null>(null);
  const [editUsername, setEditUsername] = useState("");
  const [editPassword, setEditPassword] = useState("");
  const [editRole, setEditRole] = useState<Role>("view-only");
  const [savingEdit, setSavingEdit] = useState(false);
  const [disableTarget, setDisableTarget] = useState<DbUser | null>(null);

  useEffect(() => {
    if (!authenticated) {
      router.push("/login");
    }
  }, [authenticated, router]);

  useEffect(() => {
    if (authenticated && !isAdminOrAbove(currentUser)) {
      router.push("/");
    }
  }, [authenticated, currentUser, router]);

  const fetchUsers = async () => {
    setLoading(true);
    let query = supabase
      .from("users")
      .select("id, username, role, created_at, disabled");
    if (!isSuperuser(currentUser)) {
      query = query.neq("role", "superuser");
    }
    const { data, error } = await query.order("username", { ascending: true });
    if (error) {
      let fallback = supabase
        .from("users")
        .select("id, username, role, created_at");
      if (!isSuperuser(currentUser)) {
        fallback = fallback.neq("role", "superuser");
      }
      const retry = await fallback.order("username", { ascending: true });
      setUsers(
        (retry.data || []).map((u) => ({ ...u, disabled: false }))
      );
    } else {
      setUsers(
        (data || []).map((u) => ({ ...u, disabled: Boolean(u.disabled) }))
      );
    }
    setLoading(false);
  };

  useEffect(() => {
    if (authenticated && isAdminOrAbove(currentUser)) {
      void fetchUsers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch when auth identity changes
  }, [authenticated, currentUser]);

  const handleAddUser = async () => {
    if (!newUsername.trim() || !newPassword.trim()) return;
    setAdding(true);
    try {
      const { ok, error } = await apiRequest("/api/users", {
        method: "POST",
        body: JSON.stringify({
          username: newUsername.trim(),
          password: newPassword,
          role: newRole,
        }),
      });
      if (!ok) {
        alert(error || "Failed to add user");
        return;
      }
      setNewUsername("");
      setNewPassword("");
      setNewRole("view-only");
      await fetchUsers();
    } catch (err) {
      alert(
        "Failed to add user: " +
          (err instanceof Error ? err.message : String(err))
      );
    } finally {
      setAdding(false);
    }
  };

  const openEditModal = (user: DbUser) => {
    setEditUser(user);
    setEditUsername(user.username);
    setEditPassword("");
    setEditRole(user.role);
  };

  const handleSaveEdit = async () => {
    if (!editUser) return;
    if (editUser.id === currentUser?.id && editRole !== editUser.role) {
      alert("You cannot change your own role.");
      return;
    }
    if (
      editUser.role === "superuser" &&
      editRole !== "superuser" &&
      users.filter((u) => u.role === "superuser" && u.id !== editUser.id)
        .length === 0
    ) {
      alert("At least one superuser must remain in the system.");
      return;
    }
    setSavingEdit(true);
    try {
      const payload: { role: string; password?: string } = { role: editRole };
      if (editPassword.trim()) {
        payload.password = editPassword;
      }
      const { ok, error } = await apiRequest(`/api/users/${editUser.id}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
      if (!ok) {
        alert(error || "Failed to update user");
        return;
      }
      setEditUser(null);
      await fetchUsers();
    } catch (err) {
      alert(
        "Failed to update user: " +
          (err instanceof Error ? err.message : String(err))
      );
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteUser = async (targetUser: DbUser) => {
    if (targetUser.id === currentUser?.id) {
      alert("You cannot delete your own account.");
      return;
    }
    if (targetUser.role === "superuser") {
      const superuserCount = users.filter(
        (u) => u.role === "superuser" && u.id !== targetUser.id
      ).length;
      if (superuserCount === 0) {
        alert("At least one superuser must remain in the system.");
        return;
      }
    }
    if (
      !confirm(`Are you sure you want to delete user "${targetUser.username}"?`)
    ) {
      return;
    }

    const { ok, error } = await apiRequest(`/api/users/${targetUser.id}`, {
      method: "DELETE",
    });
    if (!ok) {
      alert(error || "Failed to delete user");
      return;
    }
    await fetchUsers();
  };

  const handleDisableUser = async (password: string) => {
    if (!disableTarget) return;
    const { ok, error } = await apiRequest(`/api/users/${disableTarget.id}`, {
      method: "PATCH",
      body: JSON.stringify({ disabled: true, confirmPassword: password }),
    });
    if (!ok) {
      throw new Error(error || "Failed to disable user");
    }
    setDisableTarget(null);
    await fetchUsers();
  };

  const handleEnableUser = async (targetUser: DbUser) => {
    if (
      !confirm(
        `Re-enable "${targetUser.username}"? They will be able to sign in again.`
      )
    ) {
      return;
    }
    const { ok, error } = await apiRequest(`/api/users/${targetUser.id}`, {
      method: "PATCH",
      body: JSON.stringify({ disabled: false }),
    });
    if (!ok) {
      alert(error || "Failed to enable user");
      return;
    }
    await fetchUsers();
  };

  if (!authenticated) return null;
  if (!isAdminOrAbove(currentUser)) return null;

  const visibleUsers = isSuperuser(currentUser)
    ? users
    : users.filter((u) => u.role !== "superuser");

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });

  const fieldClass =
    "w-full px-3 py-2 rounded-md border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-600";

  return (
    <div className="min-h-screen">
      <SiteHeader title="Users" backTo="/" maxWidth="3xl" />

      <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col gap-6">
        <div>
          <h2 className="text-xl font-semibold tracking-tight text-slate-900">
            User management
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            {isSuperuser(currentUser)
              ? "Add, edit, disable, or delete users"
              : "View all users (read-only)"}
          </p>
        </div>

        {!isSuperuser(currentUser) && (
          <div className="bg-amber-50 border border-amber-200 rounded-md px-4 py-3 text-sm text-amber-800">
            You have <span className="font-semibold">read-only</span> access.
            Only superusers can add, edit, disable, or delete users.
          </div>
        )}

        {isSuperuser(currentUser) && (
          <div className="bg-white rounded-lg border border-slate-200 shadow-sm p-4 sm:p-5">
            <h3 className="text-sm font-semibold text-slate-900 mb-3">
              Add new user
            </h3>
            <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-3">
              <div className="flex-1">
                <label
                  htmlFor="new-username"
                  className="block text-xs font-medium text-slate-600 mb-1"
                >
                  Username
                </label>
                <input
                  id="new-username"
                  type="text"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  placeholder="Username"
                  className={fieldClass}
                />
              </div>
              <div className="flex-1">
                <label
                  htmlFor="new-password"
                  className="block text-xs font-medium text-slate-600 mb-1"
                >
                  Password
                </label>
                <PasswordInput
                  id="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Password"
                  className={fieldClass}
                />
              </div>
              <div className="w-full sm:w-36">
                <label
                  htmlFor="new-role"
                  className="block text-xs font-medium text-slate-600 mb-1"
                >
                  Role
                </label>
                <select
                  id="new-role"
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as Role)}
                  className={fieldClass}
                >
                  <option value="superuser">Superuser</option>
                  <option value="admin">Admin</option>
                  <option value="view-only">View-only</option>
                </select>
              </div>
              <button
                onClick={handleAddUser}
                disabled={
                  adding || !newUsername.trim() || !newPassword.trim()
                }
                className="px-5 py-2 rounded-md min-h-11 bg-brand-700 text-white text-sm font-semibold hover:bg-brand-800 disabled:opacity-50 transition-colors whitespace-nowrap"
              >
                {adding ? "Adding..." : "Add user"}
              </button>
            </div>
            <p className="text-xs text-slate-600 mt-2">
              Min 8 characters. Username cannot be changed later.
            </p>
          </div>
        )}

        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-600 text-sm">
              Loading users...
            </div>
          ) : visibleUsers.length === 0 ? (
            <div className="p-8 text-center">
              <h3 className="text-lg font-semibold text-slate-700 mb-1">
                No users yet
              </h3>
              <p className="text-sm text-slate-500">
                {isSuperuser(currentUser)
                  ? "Add the first user above."
                  : "No users to display."}
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="text-left px-4 py-3 font-medium text-slate-500">
                    Username
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500">
                    Role
                  </th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500 hidden sm:table-cell">
                    Created
                  </th>
                  {isSuperuser(currentUser) && (
                    <th className="text-right px-4 py-3 font-medium text-slate-500">
                      Actions
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visibleUsers.map((u) => (
                  <tr
                    key={u.id}
                    className={
                      u.disabled
                        ? "bg-slate-50/80 text-slate-500 hover:bg-slate-50"
                        : "hover:bg-slate-50/50"
                    }
                  >
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {u.username}
                      {u.id === currentUser?.id && (
                        <span className="ml-2 text-xs bg-brand-100 text-brand-800 font-semibold px-1.5 py-0.5 rounded">
                          You
                        </span>
                      )}
                      {u.disabled && (
                        <span className="ml-2 text-xs bg-slate-200 text-slate-700 font-semibold px-1.5 py-0.5 rounded">
                          Disabled
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded ${
                          u.role === "superuser"
                            ? "bg-slate-800 text-white"
                            : u.role === "admin"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {u.role === "superuser"
                          ? "Superuser"
                          : u.role === "admin"
                            ? "Admin"
                            : "View-only"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 hidden sm:table-cell">
                      {formatDate(u.created_at)}
                    </td>
                    {isSuperuser(currentUser) && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(u)}
                            className="min-h-11 inline-flex items-center px-3 rounded-md text-xs font-medium text-brand-800 hover:bg-brand-50"
                          >
                            Edit
                          </button>
                          {u.disabled ? (
                            <button
                              type="button"
                              onClick={() => void handleEnableUser(u)}
                              className="min-h-11 inline-flex items-center px-3 rounded-md text-xs font-medium text-emerald-800 hover:bg-emerald-50"
                            >
                              Enable
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                if (u.id === currentUser?.id) {
                                  alert("You cannot disable your own account.");
                                  return;
                                }
                                if (
                                  u.role === "superuser" &&
                                  users.filter(
                                    (other) =>
                                      other.role === "superuser" &&
                                      !other.disabled &&
                                      other.id !== u.id
                                  ).length === 0
                                ) {
                                  alert(
                                    "At least one active superuser must remain in the system."
                                  );
                                  return;
                                }
                                setDisableTarget(u);
                              }}
                              disabled={u.id === currentUser?.id}
                              className="min-h-11 inline-flex items-center px-3 rounded-md text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-40 disabled:hover:bg-transparent"
                            >
                              Disable
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDeleteUser(u)}
                            aria-label={`Delete ${u.username}`}
                            className="min-h-11 inline-flex items-center px-3 rounded-md text-xs font-medium text-red-700 hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </main>

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

      <ConfirmPasswordModal
        isOpen={disableTarget !== null}
        onClose={() => setDisableTarget(null)}
        title={`Disable ${disableTarget?.username || "user"}`}
        confirmLabel="Disable account"
        message={
          <>
            <p>
              <strong>{disableTarget?.username}</strong> will not be able to
              sign in. Any session they have open will be signed out on the
              next server check.
            </p>
          </>
        }
        onVerified={handleDisableUser}
      />
    </div>
  );
}
