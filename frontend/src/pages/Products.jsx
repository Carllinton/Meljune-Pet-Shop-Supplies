import { useCallback, useEffect, useState } from "react";
import api from "../services/api";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import useDebounce from "../hooks/useDebounce";
import { formatPeso, getErrorMessage, toDateInput } from "../utils/format";

const EMPTY_FORM = {
    product_code: "",
    name: "",
    category_id: "",
    brand: "",
    quantity: "0",
    unit: "pcs",
    price: "",
    cost_price: "0",
    low_stock_threshold: "10",
    expiration_date: "",
    supplier_id: "",
    description: "",
    status: "active",
};

function Products() {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [suppliers, setSuppliers] = useState([]);

    const [search, setSearch] = useState("");
    const debouncedSearch = useDebounce(search, 300);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [notice, setNotice] = useState("");

    // Add / Edit modal
    const [modalOpen, setModalOpen] = useState(false);
    const [editingId, setEditingId] = useState(null);
    // Kept so editing doesn't wipe the image the backend already has
    const [existingImage, setExistingImage] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [formError, setFormError] = useState("");
    const [saving, setSaving] = useState(false);

    // Delete confirmation
    const [deleteTarget, setDeleteTarget] = useState(null);
    const [deleting, setDeleting] = useState(false);

    // Bump this to force a reload (after save / delete)
    const [reloadKey, setReloadKey] = useState(0);

    const reload = () => {
        setLoading(true);
        setReloadKey((k) => k + 1);
    };

    // Load products whenever the (debounced) search text changes or reload() is called.
    // The `cancelled` flag drops responses from out-of-date requests (fast typing).
    useEffect(() => {
        let cancelled = false;
        const query = debouncedSearch.trim();
        const url = query
            ? `/products/search?query=${encodeURIComponent(query)}`
            : "/products";

        api.get(url)
            .then((response) => {
                if (cancelled || !response.data.success) return;
                setProducts(response.data.data);
                setError("");
            })
            .catch((err) => {
                if (cancelled) return;
                console.error("Error loading products:", err);
                setError(getErrorMessage(err, "Failed to load products."));
            })
            .finally(() => {
                if (!cancelled) setLoading(false);
            });

        return () => {
            cancelled = true;
        };
    }, [debouncedSearch, reloadKey]);

    // Dropdown data for the form
    useEffect(() => {
        const loadLookups = async () => {
            try {
                const [cat, sup] = await Promise.all([
                    api.get("/categories"),
                    api.get("/suppliers"),
                ]);
                setCategories(cat.data.data || []);
                setSuppliers(sup.data.data || []);
            } catch (err) {
                console.error("Error loading categories/suppliers:", err);
            }
        };

        loadLookups();
    }, []);

    // ---------- Modal helpers ----------
    const closeModal = useCallback(() => {
        if (!saving) setModalOpen(false);
    }, [saving]);

    const openAdd = () => {
        setEditingId(null);
        setExistingImage(null);
        setForm(EMPTY_FORM);
        setFormError("");
        setModalOpen(true);
    };

    const openEdit = async (product) => {
        setNotice("");
        setError("");

        try {
            // The list doesn't include category_id, so fetch the full row
            const response = await api.get(`/products/${product.id}`);
            const p = response.data.data;

            setEditingId(p.id);
            setExistingImage(p.image || null);
            setForm({
                product_code: p.product_code ?? "",
                name: p.name ?? "",
                category_id: p.category_id ?? "",
                brand: p.brand ?? "",
                quantity: String(p.quantity ?? 0),
                unit: p.unit ?? "pcs",
                price: String(p.price ?? ""),
                cost_price: String(p.cost_price ?? 0),
                low_stock_threshold: String(p.low_stock_threshold ?? 10),
                expiration_date: toDateInput(p.expiration_date),
                supplier_id: p.supplier_id ?? "",
                description: p.description ?? "",
                status: p.status ?? "active",
            });
            setFormError("");
            setModalOpen(true);
        } catch (err) {
            setError(getErrorMessage(err, "Failed to load product details."));
        }
    };

    const updateField = (e) => {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setFormError("");

        // Quick client-side checks (backend validates again)
        if (!form.product_code.trim()) return setFormError("Product code is required.");
        if (!form.name.trim()) return setFormError("Product name is required.");
        if (!form.category_id) return setFormError("Please choose a category.");
        if (form.price === "" || Number(form.price) < 0)
            return setFormError("Enter a valid price.");

        const payload = {
            product_code: form.product_code.trim(),
            name: form.name.trim(),
            category_id: Number(form.category_id),
            brand: form.brand.trim() || null,
            quantity: Number(form.quantity || 0),
            unit: form.unit.trim() || "pcs",
            price: Number(form.price),
            cost_price: Number(form.cost_price || 0),
            low_stock_threshold: Number(form.low_stock_threshold || 10),
            expiration_date: form.expiration_date || null,
            supplier_id: form.supplier_id ? Number(form.supplier_id) : null,
            image: existingImage,
            description: form.description.trim() || null,
            status: form.status,
        };

        try {
            setSaving(true);

            if (editingId) {
                await api.put(`/products/${editingId}`, payload);
                setNotice("Product updated successfully.");
            } else {
                await api.post("/products", payload);
                setNotice("Product added successfully.");
            }

            setModalOpen(false);
            reload();
        } catch (err) {
            setFormError(getErrorMessage(err, "Failed to save product."));
        } finally {
            setSaving(false);
        }
    };

    // ---------- Delete ----------
    const confirmDelete = async () => {
        try {
            setDeleting(true);
            await api.delete(`/products/${deleteTarget.id}`);
            setNotice(`"${deleteTarget.name}" was deleted.`);
            setDeleteTarget(null);
            reload();
        } catch (err) {
            // e.g. 409: product has existing sales records
            setDeleteTarget(null);
            setNotice("");
            setError(getErrorMessage(err, "Failed to delete product."));
        } finally {
            setDeleting(false);
        }
    };

    return (
        <div className="page-container">
            <div className="page-header">
                <div>
                    <h1>Products</h1>
                    <p>Manage your pet shop products</p>
                </div>

                <button className="primary-button" onClick={openAdd}>
                    + Add Product
                </button>
            </div>

            {error && <div className="error-message">{error}</div>}
            {notice && <div className="success-message">{notice}</div>}

            <div className="product-toolbar">
                <input
                    type="text"
                    placeholder="Search by name, code or brand..."
                    value={search}
                    onChange={(e) => {
                        setSearch(e.target.value);
                        setLoading(true);
                    }}
                    className="search-input"
                />

                <span className="product-count">
                    {loading ? "Loading..." : `${products.length} product(s)`}
                </span>
            </div>

            <div className={`table-container ${loading ? "table-loading" : ""}`}>
                <table className="data-table">
                    <thead>
                        <tr>
                            <th>Code</th>
                            <th>Product</th>
                            <th>Category</th>
                            <th>Brand</th>
                            <th>Stock</th>
                            <th>Unit</th>
                            <th>Price</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>

                    <tbody>
                        {products.map((product) => {
                            const isLow =
                                Number(product.quantity) <=
                                Number(product.low_stock_threshold);

                            return (
                                <tr key={product.id}>
                                    <td>{product.product_code}</td>
                                    <td>
                                        <strong>{product.name}</strong>
                                    </td>
                                    <td>{product.category_name || "-"}</td>
                                    <td>{product.brand || "-"}</td>
                                    <td className={isLow ? "low-stock" : ""}>
                                        {product.quantity}
                                        {isLow && " ⚠"}
                                    </td>
                                    <td>{product.unit}</td>
                                    <td>{formatPeso(product.price)}</td>
                                    <td>
                                        <span
                                            className={
                                                product.status === "active"
                                                    ? "status active-status"
                                                    : "status inactive-status"
                                            }
                                        >
                                            {product.status}
                                        </span>
                                    </td>
                                    <td>
                                        <button
                                            className="table-button edit-button"
                                            onClick={() => openEdit(product)}
                                        >
                                            Edit
                                        </button>
                                        <button
                                            className="table-button delete-button"
                                            onClick={() => setDeleteTarget(product)}
                                        >
                                            Delete
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>

                {!loading && products.length === 0 && (
                    <div className="empty-message">No products found.</div>
                )}
            </div>

            {/* Add / Edit */}
            <Modal
                open={modalOpen}
                title={editingId ? "Edit Product" : "Add Product"}
                onClose={closeModal}
            >
                <form onSubmit={handleSubmit} noValidate>
                    {formError && <div className="form-error">{formError}</div>}

                    <div className="form-grid">
                        <div className="form-field">
                            <label htmlFor="product_code">Product code *</label>
                            <input
                                id="product_code"
                                name="product_code"
                                value={form.product_code}
                                onChange={updateField}
                            />
                        </div>

                        <div className="form-field">
                            <label htmlFor="name">Product name *</label>
                            <input
                                id="name"
                                name="name"
                                value={form.name}
                                onChange={updateField}
                            />
                        </div>

                        <div className="form-field">
                            <label htmlFor="category_id">Category *</label>
                            <select
                                id="category_id"
                                name="category_id"
                                value={form.category_id}
                                onChange={updateField}
                            >
                                <option value="">Select category</option>
                                {categories.map((c) => (
                                    <option key={c.id} value={c.id}>
                                        {c.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-field">
                            <label htmlFor="supplier_id">Supplier</label>
                            <select
                                id="supplier_id"
                                name="supplier_id"
                                value={form.supplier_id}
                                onChange={updateField}
                            >
                                <option value="">No supplier</option>
                                {suppliers.map((s) => (
                                    <option key={s.id} value={s.id}>
                                        {s.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        <div className="form-field">
                            <label htmlFor="brand">Brand</label>
                            <input
                                id="brand"
                                name="brand"
                                value={form.brand}
                                onChange={updateField}
                            />
                        </div>

                        <div className="form-field">
                            <label htmlFor="unit">Unit</label>
                            <input
                                id="unit"
                                name="unit"
                                value={form.unit}
                                onChange={updateField}
                                placeholder="pcs, kg, pack..."
                            />
                        </div>

                        <div className="form-field">
                            <label htmlFor="price">Selling price (₱) *</label>
                            <input
                                id="price"
                                name="price"
                                type="number"
                                min="0"
                                step="0.01"
                                value={form.price}
                                onChange={updateField}
                            />
                        </div>

                        <div className="form-field">
                            <label htmlFor="cost_price">Cost price (₱)</label>
                            <input
                                id="cost_price"
                                name="cost_price"
                                type="number"
                                min="0"
                                step="0.01"
                                value={form.cost_price}
                                onChange={updateField}
                            />
                        </div>

                        <div className="form-field">
                            <label htmlFor="quantity">Stock quantity</label>
                            <input
                                id="quantity"
                                name="quantity"
                                type="number"
                                min="0"
                                step="1"
                                value={form.quantity}
                                onChange={updateField}
                            />
                        </div>

                        <div className="form-field">
                            <label htmlFor="low_stock_threshold">Low stock alert at</label>
                            <input
                                id="low_stock_threshold"
                                name="low_stock_threshold"
                                type="number"
                                min="0"
                                step="1"
                                value={form.low_stock_threshold}
                                onChange={updateField}
                            />
                        </div>

                        <div className="form-field">
                            <label htmlFor="expiration_date">Expiration date</label>
                            <input
                                id="expiration_date"
                                name="expiration_date"
                                type="date"
                                value={form.expiration_date}
                                onChange={updateField}
                            />
                        </div>

                        <div className="form-field">
                            <label htmlFor="status">Status</label>
                            <select
                                id="status"
                                name="status"
                                value={form.status}
                                onChange={updateField}
                            >
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                            </select>
                        </div>

                        <div className="form-field full">
                            <label htmlFor="description">Description</label>
                            <textarea
                                id="description"
                                name="description"
                                rows="3"
                                value={form.description}
                                onChange={updateField}
                            />
                        </div>
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
                                  : "Add Product"}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Delete confirmation */}
            <ConfirmDialog
                open={Boolean(deleteTarget)}
                title="Delete product"
                message={`Delete "${deleteTarget?.name}"? This cannot be undone.`}
                loading={deleting}
                onConfirm={confirmDelete}
                onCancel={() => setDeleteTarget(null)}
            />
        </div>
    );
}

export default Products;
