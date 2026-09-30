import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import Modal from "./Modal";
import ConfirmDialog from "./ConfirmDialog";
import { getErrorMessage } from "../utils/format";

/**
 * A config-driven list + add/edit/delete page.
 * Categories, Suppliers and Customers are all just configs for this component.
 *
 * Props
 *  title, subtitle, singular   – headings / messages ("Category")
 *  endpoint                    – e.g. "/categories"
 *  columns                     – [{ key, label, render?(row) }]
 *  fields                      – [{ name, label, type, required, full, options, hint, readOnlyOnEdit, ... }]
 *  getEmptyForm()              – initial form values for "Add"
 *  toPayload(form)             – form values -> request body
 *  validate(form)              – returns an error string, or "" when valid
 *  searchKeys / searchPlaceholder
 *  fetchDetail                 – load GET /endpoint/:id before editing (when the list lacks fields)
 *  canDelete / deleteMessage(row)
 *  extraActions                – [{ label(row), className, onClick(row, ctx) }]
 */
function ResourcePage({
    title,
    subtitle,
    singular,
    endpoint,
    columns,
    fields,
    getEmptyForm,
    toPayload,
    validate = () => "",
    searchKeys = ["name"],
    searchPlaceholder = "Search...",
    fetchDetail = false,
    canDelete = true,
    deleteMessage,
    extraActions = [],
}) {
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");
    const [search, setSearch] = useState("");
    const [reloadKey, setReloadKey] = useState(0);

    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [form, setForm] = useState({});
    const [formError, setFormError] = useState("");
    const [saving, setSaving] = useState(false);

    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);

    const reload = () => {
        setLoading(true);
        setReloadKey((k) => k + 1);
    };

    useEffect(() => {
        let cancelled = false;

        api.get(endpoint)
            .then((response) => {
                if (cancelled || !response.data.success) return;
                setRows(response.data.data);
                setError("");
            })
            .catch((err) => {
                if (cancelled) return;
                console.error(`Error loading ${endpoint}:`, err);
                setError(getErrorMessage(err, `Failed to load ${title.toLowerCase()}.`));
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [endpoint, title, reloadKey]);

    const filteredRows = useMemo(() => {
        const q = search.trim().toLowerCase();
        if (!q) return rows;
        return rows.filter((row) =>
            searchKeys.some((key) =>
                String(row[key] ?? "").toLowerCase().includes(q)
            )
        );
    }, [rows, search, searchKeys]);

    // ---------- Add / Edit ----------
    const closeModal = () => {
        if (!saving) setModalOpen(false);
    };

    const openAdd = () => {
        setNotice("");
        setEditingId(null);
        setForm(getEmptyForm());
        setFormError("");
        setModalOpen(true);
    };

    const openEdit = async (row) => {
        setNotice("");
        setError("");

        try {
            let data = row;

            if (fetchDetail) {
                const response = await api.get(`${endpoint}/${row.id}`);
                data = response.data.data;
            }

            // Build form values from the row, using each field's name
            const values = {};
            fields.forEach((f) => {
                values[f.name] = data[f.name] ?? "";
            });

            setEditingId(row.id);
            setForm(values);
            setFormError("");
            setModalOpen(true);
        } catch (err) {
            setError(getErrorMessage(err, `Failed to load ${singular.toLowerCase()}.`));
        }
    };

    const updateField = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        const problem = validate(form);
        if (problem) return setFormError(problem);

        try {
            setSaving(true);
            setFormError("");

            if (editingId) {
                await api.put(`${endpoint}/${editingId}`, toPayload(form));
            } else {
                await api.post(endpoint, toPayload(form));
            }

            setNotice(`${singular} ${editingId ? "updated" : "added"} successfully.`);
            setModalOpen(false);
            reload();
        } catch (err) {
            setFormError(getErrorMessage(err, `Failed to save ${singular.toLowerCase()}.`));
        } finally {
            setSaving(false);
        }
    };

    // ---------- Delete ----------
    const confirmDelete = async () => {
        try {
            setDeleting(true);
            await api.delete(`${endpoint}/${deleteTarget.id}`);
            setNotice(`${singular} deleted.`);
            setDeleteTarget(null);
            reload();
        } catch (err) {
            setDeleteTarget(null);
            setNotice("");
            setError(getErrorMessage(err, `Failed to delete ${singular.toLowerCase()}.`));
        } finally {
            setDeleting(false);
        }
    };

    const actionContext = { reload, setNotice, setError };

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1>{title}</h1>
                    <p>{subtitle}</p>
                </div>

                <button className="primary-button" onClick={openAdd}>
                    + Add {singular}
                </button>
            </div>

            {error && <div className="error-message">{error}</div>}
            {notice && <div className="success-message">{notice}</div>}

            <div className="product-toolbar">
                <input
                    type="text"
                    className="search-input"
                    placeholder={searchPlaceholder}
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                />

                <span className="product-count">
                    {loading
                        ? "Loading..."
                        : `${filteredRows.length} ${singular.toLowerCase()}(s)`}
                </span>
            </div>

            <div className={`table-container ${loading ? "table-loading" : ""}`}>
                <table className="data-table">
                    <thead>
                        <tr>
                            {columns.map((col) => (
                                <th key={col.key}>{col.label}</th>
                            ))}
                            <th>Actions</th>
                        </tr>
                    </thead>

                    <tbody>
                        {filteredRows.map((row) => (
                            <tr key={row.id}>
                                {columns.map((col) => (
                                    <td key={col.key}>
                                        {col.render
                                            ? col.render(row)
                                            : (row[col.key] ?? "-")}
                                    </td>
                                ))}
                                <td>
                                    <button
                                        className="table-button edit-button"
                                        onClick={() => openEdit(row)}
                                    >
                                        Edit
                                    </button>

                                    {extraActions.map((action, i) => (
                                        <button
                                            key={i}
                                            className={`table-button ${action.className || ""}`}
                                            onClick={() => action.onClick(row, actionContext)}
                                        >
                                            {action.label(row)}
                                        </button>
                                    ))}

                                    {canDelete && (
                                        <button
                                            className="table-button delete-button"
                                            onClick={() => setDeleteTarget(row)}
                                        >
                                            Delete
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {!loading && filteredRows.length === 0 && (
                    <div className="empty-message">
                        {search.trim()
                            ? `No ${title.toLowerCase()} match your search.`
                            : `No ${title.toLowerCase()} yet. Click "+ Add ${singular}" to create one.`}
                    </div>
                )}
            </div>

            <Modal
                open={modalOpen}
                title={editingId ? `Edit ${singular}` : `Add ${singular}`}
                onClose={closeModal}
                width={620}
            >
                <form onSubmit={handleSubmit} noValidate>
                    {formError && <div className="form-error">{formError}</div>}

                    <div className="form-grid">
                        {fields.map((f) => {
                            const id = `field_${f.name}`;
                            const common = {
                                id,
                                name: f.name,
                                value: form[f.name] ?? "",
                                onChange: updateField,
                            };

                            return (
                                <div
                                    key={f.name}
                                    className={`form-field ${f.full ? "full" : ""}`}
                                >
                                    <label htmlFor={id}>
                                        {f.label}
                                        {f.required && " *"}
                                    </label>

                                    {f.type === "textarea" ? (
                                        <textarea rows="3" {...common} />
                                    ) : f.type === "select" ? (
                                        <select {...common}>
                                            {f.options.map((o) => (
                                                <option key={o.value} value={o.value}>
                                                    {o.label}
                                                </option>
                                            ))}
                                        </select>
                                    ) : (
                                        <input
                                            type={f.type || "text"}
                                            min={f.min}
                                            step={f.step}
                                            placeholder={f.placeholder}
                                            readOnly={Boolean(editingId) && f.readOnlyOnEdit}
                                            {...common}
                                        />
                                    )}

                                    {f.hint && <span className="field-hint">{f.hint}</span>}
                                </div>
                            );
                        })}
                    </div>

                    <div className="modal-actions">
                        <button
                            type="button"
                            className="secondary-button"
                            onClick={closeModal}
                            disabled={saving}
                        >
                            Cancel
                        </button>
                        <button type="submit" className="primary-button" disabled={saving}>
                            {saving
                                ? "Saving..."
                                : editingId
                                  ? "Save Changes"
                                  : `Add ${singular}`}
                        </button>
                    </div>
                </form>
            </Modal>

            <ConfirmDialog
                open={Boolean(deleteTarget)}
                title={`Delete ${singular.toLowerCase()}`}
                message={
                    deleteTarget
                        ? deleteMessage
                            ? deleteMessage(deleteTarget)
                            : `Delete "${deleteTarget.name}"? This cannot be undone.`
                        : ""
                }
                loading={deleting}
                onConfirm={confirmDelete}
                onCancel={() => setDeleteTarget(null)}
            />
        </div>
    );
}

export default ResourcePage;
