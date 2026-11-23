"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  Crown,
  KeyRound,
  Loader2,
  Lock,
  Plus,
  RefreshCw,
  ShieldCheck,
  ShieldOff,
  UserRound,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  isActive: boolean;
  emailVerified: boolean;
  createdAt?: string | null;
  updatedAt?: string | null;
}

interface CreateForm {
  name: string;
  email: string;
  phone: string;
  password: string;
  role: "admin" | "superadmin";
}

const EMPTY_CREATE: CreateForm = {
  name: "",
  email: "",
  phone: "",
  password: "",
  role: "admin",
};

export default function AdminUsersPage() {
  const { authFetch } = useAuth();
  const [users, setUsers] = useState<AdminUserRow[]>([]);
  const [me, setMe] = useState<{ role: string; identifier: string }>({
    role: "admin",
    identifier: "",
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [accessDenied, setAccessDenied] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<CreateForm>(EMPTY_CREATE);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [editUser, setEditUser] = useState<AdminUserRow | null>(null);
  const [editRole, setEditRole] = useState<"admin" | "superadmin">("admin");
  const [editActive, setEditActive] = useState(true);
  const [savingEdit, setSavingEdit] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const [pwUser, setPwUser] = useState<AdminUserRow | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [savingPw, setSavingPw] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);

  const isSuperAdmin = me.role === "superadmin";

  const load = useCallback(
    async (manual = false) => {
      if (manual) setRefreshing(true);
      try {
        const res = await authFetch("/api/admin/users");
        const data = await res.json().catch(() => null);
        if (res.status === 403) {
          setAccessDenied(true);
          setError(null);
          return;
        }
        if (!res.ok) {
          setError(data?.error || "Could not load administrators.");
          return;
        }
        setUsers(Array.isArray(data.users) ? data.users : []);
        setMe(data.me || { role: "admin", identifier: "" });
        setError(null);
      } catch {
        setError("Connection error while loading administrators.");
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [authFetch]
  );

  useEffect(() => {
    void load();
  }, [load]);

  const stats = useMemo(() => {
    return {
      total: users.length,
      superadmins: users.filter((u) => u.role === "superadmin").length,
      suspended: users.filter((u) => !u.isActive).length,
    };
  }, [users]);

  const isSelf = (u: AdminUserRow) =>
    u.email.toLowerCase() === me.identifier.toLowerCase() ||
    u.name.toLowerCase() === me.identifier.toLowerCase();

  const createUser = async () => {
    setCreateError(null);
    const f = createForm;
    if (f.name.trim().length < 2) return setCreateError("Enter the administrator's name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(f.email.trim()))
      return setCreateError("Enter a valid email address.");
    if (f.password.length < 8) return setCreateError("Password must be at least 8 characters.");

    setCreating(true);
    try {
      const res = await authFetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: f.name.trim(),
          email: f.email.trim(),
          phone: f.phone.trim(),
          password: f.password,
          role: f.role,
        }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setCreateError(data?.error || "Could not create the administrator.");
        return;
      }
      setCreateOpen(false);
      setCreateForm(EMPTY_CREATE);
      setNotice(`Administrator ${data.user?.name || ""} created.`);
      await load();
    } catch {
      setCreateError("Connection error while creating the administrator.");
    } finally {
      setCreating(false);
    }
  };

  const openEdit = (u: AdminUserRow) => {
    setEditUser(u);
    setEditRole(u.role === "superadmin" ? "superadmin" : "admin");
    setEditActive(u.isActive);
    setEditError(null);
  };

  const saveEdit = async () => {
    if (!editUser) return;
    setEditError(null);
    setSavingEdit(true);
    try {
      const body: Record<string, unknown> = {};
      if (editRole !== editUser.role) body.role = editRole;
      if (editActive !== editUser.isActive) body.isActive = editActive;
      if (Object.keys(body).length === 0) {
        setEditUser(null);
        return;
      }
      const res = await authFetch(`/api/admin/users/${editUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setEditError(data?.error || "Could not update the administrator.");
        return;
      }
      setEditUser(null);
      setNotice(`Updated ${editUser.name}.`);
      await load();
    } catch {
      setEditError("Connection error while updating the administrator.");
    } finally {
      setSavingEdit(false);
    }
  };

  const resetPassword = async () => {
    if (!pwUser) return;
    setPwError(null);
    if (newPassword.length < 8) {
      setPwError("Password must be at least 8 characters.");
      return;
    }
    setSavingPw(true);
    try {
      const res = await authFetch(`/api/admin/users/${pwUser.id}/password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newPassword }),
      });
      const data = await res.json().catch(() => null);
      if (!res.ok) {
        setPwError(data?.error || "Could not reset the password.");
        return;
      }
      setPwUser(null);
      setNewPassword("");
      setNotice(`Password reset for ${pwUser.name}. Share it securely.`);
    } catch {
      setPwError("Connection error while resetting the password.");
    } finally {
      setSavingPw(false);
    }
  };

  // Superadmin-only route: show a clear access panel instead of an empty table.
  if (accessDenied) {
    return (
      <div className="flex flex-col items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-6">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-amber-700 shadow-xs">
          <Lock className="h-5 w-5" />
        </span>
        <div>
          <h1 className="text-[15px] font-bold text-amber-900">
            Super administrator access required
          </h1>
          <p className="mt-1 max-w-lg text-[12px] leading-relaxed text-amber-800">
            Users &amp; Access is restricted to super administrators. Sign in with a super
            administrator account to manage administrator roles and credentials.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-purple-100/80 bg-purple-50 text-purple-600 shadow-sm">
            <Users className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-gray-900">Users & Access</h1>
            <p className="text-[12.5px] text-gray-500">
              Administrator accounts, roles and sign-in access.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => void load(true)}
            disabled={refreshing}
            className="inline-flex items-center gap-1.5 rounded-xl border border-stone-200/90 bg-white px-3 py-1.5 text-[12px] font-semibold text-gray-600 transition hover:border-purple-300 hover:text-purple-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
          {isSuperAdmin && (
            <button
              type="button"
              onClick={() => {
                setCreateForm(EMPTY_CREATE);
                setCreateError(null);
                setCreateOpen(true);
              }}
              className="inline-flex items-center gap-1.5 rounded-xl bg-purple-600 px-3.5 py-1.5 text-[12px] font-bold text-white shadow-sm shadow-purple-200 transition hover:bg-purple-700"
            >
              <Plus className="h-3.5 w-3.5" />
              New administrator
            </button>
          )}
        </div>
      </div>

      {!isSuperAdmin && !loading && (
        <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11.5px] font-semibold text-amber-800">
          <AlertCircle className="h-3.5 w-3.5" />
          You have read-only access. Only a super administrator can create or change accounts.
        </div>
      )}

      {notice && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-[11.5px] font-semibold text-emerald-700">
          <CheckCircle2 className="h-3.5 w-3.5" /> {notice}
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11.5px] font-semibold text-rose-700">
          <AlertCircle className="h-3.5 w-3.5" /> {error}
        </div>
      )}

      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3">
        {[
          { label: "Administrators", value: stats.total, tone: "bg-purple-100 text-purple-600", icon: Users },
          { label: "Super admins", value: stats.superadmins, tone: "bg-amber-100 text-amber-700", icon: Crown },
          { label: "Suspended", value: stats.suspended, tone: "bg-rose-100 text-rose-600", icon: ShieldOff },
        ].map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.label} className="rounded-2xl border border-stone-200/90 bg-white p-3.5 shadow-xs">
              <div className="flex items-center justify-between">
                <p className="text-[11px] font-semibold text-gray-500">{s.label}</p>
                <span className={`flex h-7 w-7 items-center justify-center rounded-lg ${s.tone}`}>
                  <Icon className="h-3.5 w-3.5" />
                </span>
              </div>
              <p className="mt-1 text-[18px] font-bold tabular-nums text-gray-900">{s.value}</p>
            </div>
          );
        })}
      </div>

      <div className="overflow-hidden rounded-2xl border border-stone-200/90 bg-white shadow-xs">
        <div className="hidden grid-cols-[1.4fr_1.2fr_110px_110px_1fr_150px] items-center gap-3 border-b border-stone-200/80 bg-stone-50/80 px-4 py-2.5 text-[10px] font-bold uppercase tracking-wider text-gray-500 lg:grid">
          <span>Administrator</span>
          <span>Email</span>
          <span>Role</span>
          <span>Status</span>
          <span>Created</span>
          <span className="text-right">Actions</span>
        </div>

        {loading ? (
          <div className="space-y-1.5 p-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-xl bg-purple-50/40" />
            ))}
          </div>
        ) : users.length === 0 ? (
          <p className="py-16 text-center text-[12px] text-gray-400">No administrators found.</p>
        ) : (
          <div className="divide-y divide-stone-100">
            {users.map((u) => {
              const self = isSelf(u);
              const superAdmin = u.role === "superadmin";
              return (
                <div
                  key={u.id}
                  className="grid grid-cols-1 gap-2 px-4 py-3 lg:grid-cols-[1.4fr_1.2fr_110px_110px_1fr_150px] lg:items-center lg:gap-3"
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span
                      className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[10px] font-bold text-white ${
                        superAdmin
                          ? "bg-gradient-to-br from-purple-600 via-indigo-600 to-amber-500"
                          : "bg-gradient-to-br from-purple-500 to-purple-600"
                      }`}
                    >
                      {u.name
                        .split(" ")
                        .map((w) => w[0])
                        .filter(Boolean)
                        .slice(0, 2)
                        .join("")
                        .toUpperCase() || "AD"}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[12.5px] font-bold text-gray-800">
                        {u.name}
                        {self && (
                          <span className="ml-1.5 rounded bg-purple-100 px-1.5 py-0.5 text-[8.5px] font-bold text-purple-700">
                            YOU
                          </span>
                        )}
                      </p>
                      <p className="truncate text-[10.5px] text-gray-400">
                        {u.phone || "No phone"}
                      </p>
                    </div>
                  </div>

                  <p className="min-w-0 truncate text-[11.5px] font-medium text-gray-600 lg:whitespace-normal">
                    {u.email}
                  </p>

                  <div>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9.5px] font-bold ${
                        superAdmin
                          ? "border-amber-200 bg-amber-50 text-amber-800"
                          : "border-stone-200 bg-stone-50 text-stone-600"
                      }`}
                    >
                      {superAdmin ? <Crown className="h-2.5 w-2.5" /> : <UserRound className="h-2.5 w-2.5" />}
                      {superAdmin ? "Super admin" : "Admin"}
                    </span>
                  </div>

                  <div>
                    <span
                      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9.5px] font-bold ${
                        u.isActive
                          ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                          : "border-rose-200 bg-rose-50 text-rose-700"
                      }`}
                    >
                      {u.isActive ? <ShieldCheck className="h-2.5 w-2.5" /> : <ShieldOff className="h-2.5 w-2.5" />}
                      {u.isActive ? "Active" : "Suspended"}
                    </span>
                  </div>

                  <p className="text-[10.5px] text-gray-400">
                    {u.createdAt
                      ? new Date(u.createdAt).toLocaleDateString("en-BD", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })
                      : "—"}
                  </p>

                  <div className="flex items-center gap-1.5 lg:justify-end">
                    {isSuperAdmin ? (
                      <>
                        <button
                          type="button"
                          onClick={() => openEdit(u)}
                          className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-white px-2 py-1 text-[10.5px] font-bold text-gray-600 hover:border-purple-300 hover:text-purple-700"
                          title="Change role or access"
                        >
                          <ShieldCheck className="h-3 w-3" /> Access
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setPwUser(u);
                            setNewPassword("");
                            setPwError(null);
                          }}
                          className="inline-flex items-center gap-1 rounded-lg border border-stone-200 bg-white px-2 py-1 text-[10.5px] font-bold text-gray-600 hover:border-purple-300 hover:text-purple-700"
                          title="Reset password"
                        >
                          <KeyRound className="h-3 w-3" /> Password
                        </button>
                      </>
                    ) : (
                      <span className="text-[10.5px] text-gray-300">—</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create modal */}
      {createOpen && (
        <Modal title="New administrator" onClose={() => setCreateOpen(false)}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Full name">
              <input
                value={createForm.name}
                onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })}
                className={inputCls}
                placeholder="e.g. Nusrat Jahan"
              />
            </Field>
            <Field label="Email">
              <input
                value={createForm.email}
                onChange={(e) => setCreateForm({ ...createForm, email: e.target.value })}
                type="email"
                className={inputCls}
                placeholder="admin@example.com"
              />
            </Field>
            <Field label="Phone (optional)">
              <input
                value={createForm.phone}
                onChange={(e) => setCreateForm({ ...createForm, phone: e.target.value })}
                className={inputCls}
                placeholder="01XXXXXXXXX"
              />
            </Field>
            <Field label="Role">
              <select
                value={createForm.role}
                onChange={(e) =>
                  setCreateForm({ ...createForm, role: e.target.value as "admin" | "superadmin" })
                }
                className={inputCls}
              >
                <option value="admin">Administrator</option>
                <option value="superadmin">Super administrator</option>
              </select>
            </Field>
            <div className="sm:col-span-2">
              <Field label="Temporary password (min 8 characters)">
                <input
                  value={createForm.password}
                  onChange={(e) => setCreateForm({ ...createForm, password: e.target.value })}
                  type="password"
                  autoComplete="new-password"
                  className={inputCls}
                />
              </Field>
            </div>
          </div>
          {createError && <ErrorLine text={createError} />}
          <ModalActions
            busy={creating}
            busyLabel="Creating…"
            confirmLabel="Create administrator"
            onCancel={() => setCreateOpen(false)}
            onConfirm={() => void createUser()}
          />
        </Modal>
      )}

      {/* Edit access modal */}
      {editUser && (
        <Modal title={`Access · ${editUser.name}`} onClose={() => setEditUser(null)}>
          <div className="space-y-3">
            <Field label="Role">
              <select
                value={editRole}
                onChange={(e) => setEditRole(e.target.value as "admin" | "superadmin")}
                disabled={isSelf(editUser)}
                className={inputCls}
              >
                <option value="admin">Administrator</option>
                <option value="superadmin">Super administrator</option>
              </select>
            </Field>
            <label className="flex items-center justify-between gap-3 rounded-xl border border-stone-200 bg-stone-50/60 px-3 py-2.5">
              <span>
                <span className="block text-[11.5px] font-bold text-gray-800">Account active</span>
                <span className="block text-[10px] text-gray-500">
                  Suspended accounts cannot sign in or use the API.
                </span>
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={editActive}
                disabled={isSelf(editUser)}
                onClick={() => setEditActive((v) => !v)}
                className={`relative h-6 w-11 shrink-0 rounded-full transition ${
                  editActive ? "bg-emerald-500" : "bg-stone-300"
                } ${isSelf(editUser) ? "opacity-50" : ""}`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
                    editActive ? "left-[22px]" : "left-0.5"
                  }`}
                />
              </button>
            </label>
            {isSelf(editUser) && (
              <p className="text-[10.5px] text-amber-700">
                You cannot change your own role or suspend yourself.
              </p>
            )}
          </div>
          {editError && <ErrorLine text={editError} />}
          <ModalActions
            busy={savingEdit}
            busyLabel="Saving…"
            confirmLabel="Save access"
            onCancel={() => setEditUser(null)}
            onConfirm={() => void saveEdit()}
          />
        </Modal>
      )}

      {/* Reset password modal */}
      {pwUser && (
        <Modal title={`Reset password · ${pwUser.name}`} onClose={() => setPwUser(null)}>
          <p className="text-[11px] text-gray-500">
            Set a new temporary password and share it with the administrator through a secure
            channel. Their current sessions stay signed in.
          </p>
          <div className="mt-3">
            <Field label="New password (min 8 characters)">
              <input
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                type="password"
                autoComplete="new-password"
                className={inputCls}
              />
            </Field>
          </div>
          {pwError && <ErrorLine text={pwError} />}
          <ModalActions
            busy={savingPw}
            busyLabel="Updating…"
            confirmLabel="Reset password"
            onCancel={() => setPwUser(null)}
            onConfirm={() => void resetPassword()}
          />
        </Modal>
      )}
    </div>
  );
}

const inputCls =
  "w-full rounded-xl border border-gray-200 bg-white px-3 py-2 text-[12.5px] text-gray-800 focus:border-purple-400 focus:outline-none focus:ring-2 focus:ring-purple-100";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[10.5px] font-semibold text-gray-500">{label}</span>
      {children}
    </label>
  );
}

function ErrorLine({ text }: { text: string }) {
  return (
    <p className="mt-3 flex items-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-[11.5px] font-semibold text-rose-700">
      <AlertCircle className="h-3.5 w-3.5 shrink-0" /> {text}
    </p>
  );
}

function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className="fixed inset-0 z-[250] flex items-center justify-center bg-black/40 p-4 backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <div className="w-full max-w-[520px] rounded-2xl border border-stone-200 bg-white shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-stone-100 px-5 py-4">
          <h2 className="text-[14px] font-bold text-gray-900">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-400 hover:bg-stone-100 hover:text-gray-700"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

function ModalActions({
  busy,
  busyLabel,
  confirmLabel,
  onCancel,
  onConfirm,
}: {
  busy: boolean;
  busyLabel: string;
  confirmLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <div className="mt-4 flex items-center justify-end gap-2">
      <button
        type="button"
        onClick={onCancel}
        disabled={busy}
        className="rounded-xl border border-stone-200 px-4 py-2 text-[12px] font-semibold text-gray-600 hover:bg-stone-50 disabled:opacity-50"
      >
        Cancel
      </button>
      <button
        type="button"
        onClick={onConfirm}
        disabled={busy}
        className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-[12px] font-bold text-white shadow-sm shadow-purple-200 hover:bg-purple-700 disabled:opacity-60"
      >
        {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        {busy ? busyLabel : confirmLabel}
      </button>
    </div>
  );
}
