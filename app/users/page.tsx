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

interface DbUser {
  id: number;
  username: string;
  role: Role;
  created_at: string;
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
    let query = supabase.from("users").select("id, username, role, created_at");
    if (!isSuperuser(currentUser)) {
      query = query.neq("role", "superuser");
    }
    const { data } = await query.order("username", { ascending: true });
    setUsers(data || []);
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
    "w-full px-3 py-2 rounded-md border border-slate-300 bg-white text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-500";

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
              ? "Add, edit, or delete users"
              : "View all users (read-only)"}
          </p>
        </div>

        {!isSuperuser(currentUser) && (
          <div className="bg-amber-50 border border-amber-200 rounded-md px-4 py-3 text-sm text-amber-800">
            You have <span className="font-semibold">read-only</span> access.
            Only superusers can add, edit, or delete users.
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
                className="px-5 py-2 rounded-md bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-50 transition-colors whitespace-nowrap"
              >
                {adding ? "Adding..." : "Add user"}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              Min 8 characters. Username cannot be changed later.
            </p>
          </div>
        )}

        <div className="bg-white rounded-lg border border-slate-200 shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-8 text-center text-slate-400 text-sm">
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
                  <tr key={u.id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {u.username}
                      {u.id === currentUser?.id && (
                        <span className="ml-2 text-[10px] bg-brand-100 text-brand-800 font-semibold px-1.5 py-0.5 rounded">
                          You
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`text-[11px] font-semibold px-2 py-0.5 rounded ${
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
                            onClick={() => openEditModal(u)}
                            className="text-xs font-medium text-brand-700 hover:text-brand-800"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDeleteUser(u)}
                            className="text-xs font-medium text-red-600 hover:text-red-700"
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
            <p className="text-xs text-slate-400 mt-1">
              Usernames cannot be changed after creation.
            </p>
          </div>
          <div>
            <label
              htmlFor="edit-password"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              New password{" "}
              <span className="text-slate-400 font-normal">
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
            className="flex-1 px-4 py-2.5 rounded-md bg-brand-600 text-white text-sm font-semibold hover:bg-brand-700 disabled:opacity-60"
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
    </div>
  );
}
