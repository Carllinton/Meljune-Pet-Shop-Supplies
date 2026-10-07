import { useEffect, useState } from "react";
import api from "../services/api";
import { getUser } from "../services/auth";
import ConfirmDialog from "./ConfirmDialog";
import Modal from "./Modal";

const EMPTY_FORM = {
    username: "",
    full_name: "",
    email: "",
    role: "cashier",
};

function AdminUserManagement() {
    const currentUser = getUser();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [search, setSearch] = useState("");
    const [editingUser, setEditingUser] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [formError, setFormError] = useState("");
    const [saving, setSaving] = useState(false);
    const [viewingUser, setViewingUser] = useState(null);
    const [deletingUser, setDeletingUser] = useState(null);
    const [deleting, setDeleting] = useState(false);
    const [notice, setNotice] = useState(null);

    const loadUsers = async () => {
        try {
            setLoading(true);
            setError("");
            const response = await api.get("/admins");

            if (!response.data?.success || !Array.isArray(response.data.data)) {
                throw new Error(response.data?.message || "Invalid user list response");
            }

            setUsers(response.data.data);
        } catch (loadError) {
            console.error("Failed to load user accounts:", loadError);
            setError(
                loadError.response?.data?.message ||
                    "Could not load user accounts. Please try again."
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUsers();
    }, []);

    const filteredUsers = users.filter((account) =>
        [account.username, account.full_name, account.email, account.role]
            .filter(Boolean)
            .some((value) =>
                String(value).toLowerCase().includes(search.trim().toLowerCase())
            )
    );

    const openEdit = (account) => {
        setEditingUser(account);
        setForm({
            username: account.username || "",
            full_name: account.full_name || "",
            email: account.email || "",
            role: account.role || "cashier",
        });
        setFormError("");
    };

    const closeEdit = () => {
        if (saving) return;
        setEditingUser(null);
        setForm(EMPTY_FORM);
        setFormError("");
    };

    const saveUser = async (event) => {
        event.preventDefault();
        setFormError("");

        const payload = {
            username: form.username.trim(),
            full_name: form.full_name.trim(),
            email: form.email.trim(),
            role: form.role,
        };

        if (!payload.username || !payload.full_name || !payload.email) {
            setFormError("Username, full name, and email are required.");
            return;
        }

        try {
            setSaving(true);
            await api.put(`/admins/${editingUser.id}`, payload);
            setEditingUser(null);
            setForm(EMPTY_FORM);
            setNotice({ type: "success", text: "User details updated." });
            await loadUsers();
        } catch (saveError) {
            console.error("Failed to update user account:", saveError);
            setFormError(
                saveError.response?.data?.message ||
                    "Could not save user changes. Please try again."
            );
        } finally {
            setSaving(false);
        }
    };

    const removeUser = async () => {
        if (!deletingUser) return;

        try {
            setDeleting(true);
            await api.delete(`/admins/${deletingUser.id}`);
            setDeletingUser(null);
            setNotice({ type: "success", text: "User account removed." });
            await loadUsers();
        } catch (deleteError) {
            console.error("Failed to remove user account:", deleteError);
            setDeletingUser(null);
            setNotice({
                type: "error",
                text:
                    deleteError.response?.data?.message ||
                    "Could not remove this account. Please try again.",
            });
        } finally {
            setDeleting(false);
        }
    };

    const formatCreatedAt = (value, includeTime = false) => {
        if (!value) return "—";
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return "—";

        return date.toLocaleString("en-PH", includeTime
            ? { dateStyle: "medium", timeStyle: "short" }
            : { year: "numeric", month: "short", day: "numeric" }
        );
    };

    return (
        <>
            <section className="card settings-users-card">
                <div className="card-header settings-users-header">
                    <div>
                        <span className="card-title">User Accounts</span>
                        <p className="text-muted text-sm">
                            View and manage administrator and cashier accounts.
                        </p>
                    </div>
                    <span className="chip chip-primary">
                        {users.length} {users.length === 1 ? "account" : "accounts"}
                    </span>
                </div>

                <div className="card-body">
                    {notice && (
                        <div
                            className={notice.type === "success" ? "alert alert-success" : "alert alert-danger"}
                            role="status"
                        >
                            {notice.text}
                            <button
                                type="button"
                                className="settings-notice-dismiss"
                                aria-label="Dismiss notification"
                                onClick={() => setNotice(null)}
                            >
                                ×
                            </button>
                        </div>
                    )}

                    <div className="settings-users-toolbar">
                        <label htmlFor="user-search">Search accounts</label>
                        <input
                            id="user-search"
                            className="form-control"
                            type="search"
                            placeholder="Name, username, email, or role"
                            value={search}
                            onChange={(event) => setSearch(event.target.value)}
                        />
                    </div>

                    {error ? (
                        <div className="settings-users-state" role="alert">
                            <p>{error}</p>
                            <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={loadUsers}
                                disabled={loading}
                            >
                                Retry
                            </button>
                        </div>
                    ) : loading ? (
                        <div className="settings-users-state">Loading user accounts…</div>
                    ) : filteredUsers.length === 0 ? (
                        <div className="settings-users-state">
                            {search ? "No accounts match your search." : "No user accounts found."}
                        </div>
                    ) : (
                        <div className="table-wrap">
                            <table className="settings-users-table">
                                <thead>
                                    <tr>
                                        <th>User</th>
                                        <th>Username</th>
                                        <th>Email</th>
                                        <th>Role</th>
                                        <th>Joined</th>
                                        <th style={{ margin: "16px" }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredUsers.map((account) => {
                                        const isCurrentUser =
                                            Number(account.id) === Number(currentUser?.id);
                                        return (
                                            <tr key={account.id}>
                                                <td>
                                                    <div className="settings-user-name">
                                                        <span>{account.full_name || "—"}</span>
                                                        {isCurrentUser && (
                                                            <span className="chip chip-muted">You</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td>{account.username || "—"}</td>
                                                <td>{account.email || "—"}</td>
                                                <td>
                                                    <span
                                                        className={`chip ${
                                                            account.role === "admin"
                                                                ? "chip-primary"
                                                                : "chip-info"
                                                        }`}
                                                    >
                                                        {account.role}
                                                    </span>
                                                </td>
                                                <td>{formatCreatedAt(account.created_at)}</td>
                                                <td>
                                                    <div className="settings-user-actions">
                                                        <button
                                                            type="button"
                                                            className="btn btn-ghost btn-sm"
                                                            onClick={() => openEdit(account)}
                                                        >
                                                            Edit
                                                        </button>
                                                        {!isCurrentUser && (
                                                            <button
                                                                type="button"
                                                                className="btn btn-danger btn-sm"
                                                                onClick={() => setDeletingUser(account)}
                                                            >
                                                                Remove
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </section>

            <Modal
                open={Boolean(editingUser)}
                title="Edit user account"
                onClose={closeEdit}
                width={560}
            >
                {editingUser && (
                    <form onSubmit={saveUser}>
                        {formError && (
                            <div className="alert alert-danger" role="alert">
                                {formError}
                            </div>
                        )}
                        <div className="form-grid">
                            <div className="form-group">
                                <label htmlFor="edit-user-name">Full name</label>
                                <input
                                    id="edit-user-name"
                                    className="form-control"
                                    name="full_name"
                                    value={form.full_name}
                                    onChange={(event) =>
                                        setForm({ ...form, full_name: event.target.value })
                                    }
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="edit-user-username">Username</label>
                                <input
                                    id="edit-user-username"
                                    className="form-control"
                                    name="username"
                                    autoComplete="username"
                                    value={form.username}
                                    onChange={(event) =>
                                        setForm({ ...form, username: event.target.value })
                                    }
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="edit-user-email">Email</label>
                                <input
                                    id="edit-user-email"
                                    className="form-control"
                                    type="email"
                                    name="email"
                                    value={form.email}
                                    onChange={(event) =>
                                        setForm({ ...form, email: event.target.value })
                                    }
                                    required
                                />
                            </div>
                            <div className="form-group">
                                <label htmlFor="edit-user-role">Role</label>
                                <select
                                    id="edit-user-role"
                                    className="form-control"
                                    value={form.role}
                                    onChange={(event) =>
                                        setForm({ ...form, role: event.target.value })
                                    }
                                    disabled={Number(editingUser.id) === Number(currentUser?.id)}
                                >
                                    <option value="admin">Administrator</option>
                                    <option value="cashier">Cashier</option>
                                </select>
                                {Number(editingUser.id) === Number(currentUser?.id) && (
                                    <span className="form-hint">You cannot change your own role.</span>
                                )}
                            </div>
                        </div>
                        <div className="modal-actions settings-modal-actions">
                            <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={closeEdit}
                                disabled={saving}
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="btn btn-primary btn-sm"
                                disabled={saving}
                            >
                                {saving ? "Saving…" : "Save changes"}
                            </button>
                        </div>
                    </form>
                )}
            </Modal>

            <Modal
                open={Boolean(viewingUser)}
                title="User account details"
                onClose={() => setViewingUser(null)}
                width={520}
            >
                {viewingUser && (
                    <dl className="settings-user-details">
                        <div><dt>Full name</dt><dd>{viewingUser.full_name || "—"}</dd></div>
                        <div><dt>Username</dt><dd>{viewingUser.username || "—"}</dd></div>
                        <div><dt>Email</dt><dd>{viewingUser.email || "—"}</dd></div>
                        <div><dt>Role</dt><dd>{viewingUser.role || "—"}</dd></div>
                        <div><dt>Created</dt><dd>{formatCreatedAt(viewingUser.created_at, true)}</dd></div>
                    </dl>
                )}
            </Modal>

            <ConfirmDialog
                open={Boolean(deletingUser)}
                title="Remove user account?"
                message={
                    deletingUser
                        ? `Remove ${deletingUser.full_name || deletingUser.username}? This cannot be undone.`
                        : ""
                }
                confirmLabel="Remove account"
                loading={deleting}
                onConfirm={removeUser}
                onCancel={() => !deleting && setDeletingUser(null)}
            />
        </>
    );
}

export default AdminUserManagement;
