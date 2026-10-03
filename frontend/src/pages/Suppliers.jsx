import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";

const EMPTY_FORM = {
    name: "",
    contact_person: "",
    phone: "",
    email: "",
    address: "",
};

function Suppliers() {
    const [suppliers, setSuppliers] = useState([]);
    const [search, setSearch] = useState("");

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [modalOpen, setModalOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState("");

    const [confirmOpen, setConfirmOpen] = useState(false);
    const [supplierToDelete, setSupplierToDelete] = useState(null);
    const [deleting, setDeleting] = useState(false);

    // ==========================================
    // LOAD SUPPLIERS
    // ==========================================
    const loadSuppliers = async () => {
        try {
            setLoading(true);
            setError("");

            const response = await api.get("/suppliers");

            const data = response?.data?.data ?? response?.data ?? [];

            setSuppliers(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error("Failed to load suppliers:", err);

            setError(
                err?.response?.data?.message ||
                "Failed to load suppliers."
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSuppliers();
    }, []);

    // ==========================================
    // SEARCH
    // ==========================================
    const filteredSuppliers = useMemo(() => {
        const query = search.trim().toLowerCase();

        if (!query) {
            return suppliers;
        }

        return suppliers.filter((supplier) => {
            return [
                supplier.name,
                supplier.contact_person,
                supplier.phone,
                supplier.email,
                supplier.address,
            ]
                .filter(Boolean)
                .some((value) =>
                    String(value).toLowerCase().includes(query)
                );
        });
    }, [suppliers, search]);

    // ==========================================
    // FORM HELPERS
    // ==========================================
    const openAddModal = () => {
        setEditingSupplier(null);
        setForm(EMPTY_FORM);
        setFormError("");
        setModalOpen(true);
    };

    const openEditModal = (supplier) => {
        setEditingSupplier(supplier);

        setForm({
            name: supplier.name || "",
            contact_person: supplier.contact_person || "",
            phone: supplier.phone || "",
            email: supplier.email || "",
            address: supplier.address || "",
        });

        setFormError("");
        setModalOpen(true);
    };

    const closeModal = () => {
        if (saving) return;

        setModalOpen(false);
        setEditingSupplier(null);
        setForm(EMPTY_FORM);
        setFormError("");
    };

    const handleChange = (event) => {
        const { name, value } = event.target;

        setForm((previous) => ({
            ...previous,
            [name]: value,
        }));
    };

    // ==========================================
    // SAVE SUPPLIER
    // ==========================================
    const handleSubmit = async (event) => {
        event.preventDefault();

        const name = form.name.trim();

        if (!name) {
            setFormError("Supplier name is required.");
            return;
        }

        try {
            setSaving(true);
            setFormError("");

            const payload = {
                name,
                contact_person: form.contact_person.trim() || null,
                phone: form.phone.trim() || null,
                email: form.email.trim() || null,
                address: form.address.trim() || null,
            };

            if (editingSupplier) {
                await api.put(
                    `/suppliers/${editingSupplier.id}`,
                    payload
                );
            } else {
                await api.post("/suppliers", payload);
            }

            closeModal();
            await loadSuppliers();
        } catch (err) {
            console.error("Failed to save supplier:", err);

            setFormError(
                err?.response?.data?.message ||
                "Failed to save supplier."
            );
        } finally {
            setSaving(false);
        }
    };

    // ==========================================
    // DELETE SUPPLIER
    // ==========================================
    const askDelete = (supplier) => {
        setSupplierToDelete(supplier);
        setConfirmOpen(true);
    };

    const cancelDelete = () => {
        if (deleting) return;

        setConfirmOpen(false);
        setSupplierToDelete(null);
    };

    const handleDelete = async () => {
        if (!supplierToDelete) return;

        try {
            setDeleting(true);

            await api.delete(`/suppliers/${supplierToDelete.id}`);

            setConfirmOpen(false);
            setSupplierToDelete(null);

            await loadSuppliers();
        } catch (err) {
            console.error("Failed to delete supplier:", err);

            setError(
                err?.response?.data?.message ||
                "Failed to delete supplier."
            );
        } finally {
            setDeleting(false);
        }
    };

    // ==========================================
    // RENDER
    // ==========================================
    return (
        <>
            {/* PAGE HEADER */}
            <div className="page-header">
                <div className="page-header-left">
                    <h1>
                        <i data-feather="truck"></i>
                        Suppliers
                    </h1>

                    <p>
                        Manage your product suppliers
                    </p>
                </div>

                <div className="page-actions">
                    <button
                        className="btn btn-primary"
                        onClick={openAddModal}
                    >
                        <i data-feather="plus"></i>
                        Add Supplier
                    </button>
                </div>
            </div>

            {/* ERROR */}
            {error && (
                <div
                    className="chip chip-danger"
                    style={{
                        marginBottom: "16px",
                        padding: "10px 16px",
                        borderRadius: "8px",
                        display: "block",
                    }}
                >
                    {error}
                </div>
            )}

            {/* SEARCH */}
            <div
                className="card"
                style={{ marginBottom: "16px" }}
            >
                <div
                    className="card-body"
                    style={{ padding: "14px 16px" }}
                >
                    <div className="search-box">
                        <i data-feather="search"></i>

                        <input
                            type="text"
                            placeholder="Search suppliers, contacts, phone or email..."
                            value={search}
                            onChange={(e) =>
                                setSearch(e.target.value)
                            }
                        />
                    </div>
                </div>
            </div>

            {/* SUPPLIER TABLE */}
            <div className="card">
                <div className="card-header">
                    <div>
                        <div className="card-title">
                            Suppliers
                        </div>

                        <p
                            className="text-muted text-sm"
                            style={{ marginTop: "4px" }}
                        >
                            {filteredSuppliers.length} of{" "}
                            {suppliers.length} suppliers
                        </p>
                    </div>
                </div>

                <div className="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>Supplier</th>
                                <th>Contact Person</th>
                                <th>Phone</th>
                                <th>Email</th>
                                <th>Address</th>
                                <th style={{ width: "110px" }}>
                                    Actions
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            {loading ? (
                                <tr>
                                    <td
                                        colSpan="6"
                                        style={{
                                            textAlign: "center",
                                            padding: "40px",
                                        }}
                                    >
                                        Loading suppliers...
                                    </td>
                                </tr>
                            ) : filteredSuppliers.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan="6"
                                        style={{
                                            textAlign: "center",
                                            padding: "40px",
                                        }}
                                    >
                                        <div
                                            style={{
                                                fontSize: "32px",
                                                marginBottom: "8px",
                                            }}
                                        >
                                            📦
                                        </div>

                                        <strong>
                                            No suppliers found
                                        </strong>

                                        <p
                                            className="text-muted text-sm"
                                            style={{
                                                marginTop: "4px",
                                            }}
                                        >
                                            {search
                                                ? "Try a different search."
                                                : "Add your first supplier to get started."}
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                filteredSuppliers.map((supplier) => (
                                    <tr key={supplier.id}>
                                        {/* SUPPLIER */}
                                        <td>
                                            <div
                                                style={{
                                                    display: "flex",
                                                    alignItems: "center",
                                                    gap: "12px",
                                                }}
                                            >
                                                <div
                                                    className="stat-icon"
                                                    style={{
                                                        width: "42px",
                                                        height: "42px",
                                                        minWidth: "42px",
                                                        borderRadius: "12px",
                                                        background:
                                                            "rgba(255, 107, 53, 0.12)",
                                                        color:
                                                            "var(--primary)",
                                                    }}
                                                >
                                                    <i data-feather="truck"></i>
                                                </div>

                                                <div>
                                                    <strong>
                                                        {supplier.name}
                                                    </strong>

                                                    <div
                                                        className="text-muted text-sm"
                                                        style={{
                                                            marginTop: "3px",
                                                        }}
                                                    >
                                                        Supplier #{supplier.id}
                                                    </div>
                                                </div>
                                            </div>
                                        </td>

                                        {/* CONTACT */}
                                        <td>
                                            {supplier.contact_person ||
                                                "—"}
                                        </td>

                                        {/* PHONE */}
                                        <td>
                                            {supplier.phone ? (
                                                <span className="text-sm">
                                                    {supplier.phone}
                                                </span>
                                            ) : (
                                                <span className="text-muted">
                                                    —
                                                </span>
                                            )}
                                        </td>

                                        {/* EMAIL */}
                                        <td>
                                            {supplier.email ? (
                                                <span className="text-sm">
                                                    {supplier.email}
                                                </span>
                                            ) : (
                                                <span className="text-muted">
                                                    —
                                                </span>
                                            )}
                                        </td>

                                        {/* ADDRESS */}
                                        <td>
                                            <span className="text-sm text-muted">
                                                {supplier.address ||
                                                    "—"}
                                            </span>
                                        </td>

                                        {/* ACTIONS */}
                                        <td>
                                            <div className="action-group">
                                                <button
                                                    type="button"
                                                    className="action-btn action-btn-edit"
                                                    title="Edit supplier"
                                                    onClick={() =>
                                                        openEditModal(
                                                            supplier
                                                        )
                                                    }
                                                >
                                                    <i data-feather="edit-2"></i>
                                                </button>

                                                <button
                                                    type="button"
                                                    className="action-btn action-btn-delete"
                                                    title="Delete supplier"
                                                    onClick={() =>
                                                        askDelete(
                                                            supplier
                                                        )
                                                    }
                                                >
                                                    <i data-feather="trash-2"></i>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {!loading &&
                    filteredSuppliers.length > 0 && (
                        <div className="card-footer">
                            Showing{" "}
                            <strong>
                                {filteredSuppliers.length}
                            </strong>{" "}
                            of{" "}
                            <strong>
                                {suppliers.length}
                            </strong>{" "}
                            suppliers
                        </div>
                    )}
            </div>

            {/* ADD / EDIT MODAL */}
            <Modal
                open={modalOpen}
                title={
                    editingSupplier
                        ? "Edit Supplier"
                        : "Add Supplier"
                }
                onClose={closeModal}
            >
                <form onSubmit={handleSubmit}>
                    {formError && (
                        <div
                            className="chip chip-danger"
                            style={{
                                display: "block",
                                marginBottom: "16px",
                                padding: "10px 14px",
                            }}
                        >
                            {formError}
                        </div>
                    )}

                    <div className="form-grid">
                        <div className="form-group">
                            <label>
                                Supplier Name{" "}
                                <span className="text-danger">
                                    *
                                </span>
                            </label>

                            <input
                                type="text"
                                name="name"
                                className="form-control"
                                placeholder="e.g. PetNutrition Corp"
                                value={form.name}
                                onChange={handleChange}
                                required
                                autoFocus
                            />
                        </div>

                        <div className="form-group">
                            <label>
                                Contact Person
                            </label>

                            <input
                                type="text"
                                name="contact_person"
                                className="form-control"
                                placeholder="e.g. Juan Dela Cruz"
                                value={form.contact_person}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="form-group">
                            <label>Phone</label>

                            <input
                                type="text"
                                name="phone"
                                className="form-control"
                                placeholder="e.g. 0917-123-4567"
                                value={form.phone}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="form-group">
                            <label>Email</label>

                            <input
                                type="email"
                                name="email"
                                className="form-control"
                                placeholder="supplier@example.com"
                                value={form.email}
                                onChange={handleChange}
                            />
                        </div>

                        <div
                            className="form-group"
                            style={{
                                gridColumn: "1 / -1",
                            }}
                        >
                            <label>Address</label>

                            <textarea
                                name="address"
                                className="form-control"
                                rows="3"
                                placeholder="Supplier address..."
                                value={form.address}
                                onChange={handleChange}
                            />
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={closeModal}
                            disabled={saving}
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={saving}
                        >
                            {saving ? (
                                "Saving..."
                            ) : (
                                <>
                                    <i data-feather="save"></i>
                                    {editingSupplier
                                        ? "Save Changes"
                                        : "Add Supplier"}
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* DELETE CONFIRMATION */}
            <ConfirmDialog
                open={confirmOpen}
                title="Delete Supplier"
                message={
                    supplierToDelete
                        ? `Delete "${supplierToDelete.name}"? Products assigned to this supplier may lose their supplier reference.`
                        : "Delete this supplier?"
                }
                onCancel={cancelDelete}
                onConfirm={handleDelete}
                loading={deleting}
            />
        </>
    );
}

export default Suppliers;