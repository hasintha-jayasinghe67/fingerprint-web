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
import PasswordInput from "@/components/PasswordInput";
import ConfirmPasswordModal from "@/components/ConfirmPasswordModal";
import { EditUserModal } from "./EditUserModal";
import type { DbUser } from "./types";
import { UserTable } from "./UserTable";

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

        <UserTable
          loading={loading}
          visibleUsers={visibleUsers}
          currentUser={currentUser}
          users={users}
          openEditModal={openEditModal}
          handleEnableUser={(user) => { void handleEnableUser(user); }}
          setDisableTarget={setDisableTarget}
          handleDeleteUser={handleDeleteUser}
        />
      </main>

      <EditUserModal
        editUser={editUser}
        setEditUser={setEditUser}
        editUsername={editUsername}
        setEditUsername={setEditUsername}
        editPassword={editPassword}
        setEditPassword={setEditPassword}
        editRole={editRole}
        setEditRole={setEditRole}
        fieldClass={fieldClass}
        savingEdit={savingEdit}
        handleSaveEdit={() => { void handleSaveEdit(); }}
      />

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
