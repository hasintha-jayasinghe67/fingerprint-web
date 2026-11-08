"use client";

import { isSuperuser, type UserInfo } from "@/lib/AuthContext";
import type { DbUser } from "./types";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Every account, with edit, disable, and delete for superusers. */
export function UserTable({
  loading,
  visibleUsers,
  currentUser,
  users,
  openEditModal,
  handleEnableUser,
  setDisableTarget,
  handleDeleteUser,
}: {
  loading: boolean;
  visibleUsers: DbUser[];
  currentUser: UserInfo | null;
  users: DbUser[];
  openEditModal: (user: DbUser) => void;
  handleEnableUser: (user: DbUser) => void;
  setDisableTarget: (user: DbUser) => void;
  handleDeleteUser: (user: DbUser) => void;
}) {
  return (
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
  );
}
