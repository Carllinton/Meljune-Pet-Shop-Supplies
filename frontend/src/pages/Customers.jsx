import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";

const EMPTY_FORM = {
    customer_code: "",
    name: "",
    phone: "",
    address: "",
    credit_limit: "0",
    status: "active",
};

function Customers() {
    const [customers, setCustomers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [search, setSearch] = useState("");

    const [modalOpen, setModalOpen] = useState(false);
    const [editingCustomer, setEditingCustomer] = useState(null);
    const [form, setForm] = useState(EMPTY_FORM);
    const [error, setError] = useState("");

    const [confirmOpen, setConfirmOpen] = useState(false);
    const [customerToDelete, setCustomerToDelete] = useState(null);

    const loadCustomers = async () => {
        try {
            setLoading(true);

            const res = await api.get("/customers");

            if (res.data?.success) {
                setCustomers(res.data.data || []);
            } else {
                setCustomers([]);
            }
        } catch (err) {
            console.error("Failed to load customers:", err);
            setCustomers([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadCustomers();
    }, []);

    const filteredCustomers = useMemo(() => {
        const query = search.trim().toLowerCase();

        if (!query) return customers;

        return customers.filter((customer) =>
            [
                customer.customer_code,
                customer.name,
                customer.phone,
                customer.address,
                customer.status,
            ]
                .filter(Boolean)
                .some((value) =>
                    String(value).toLowerCase().includes(query)
                )
        );
    }, [customers, search]);

    const openAddModal = () => {
        setEditingCustomer(null);
        setForm(EMPTY_FORM);
        setError("");
        setModalOpen(true);
    };

    const openEditModal = (customer) => {
        setEditingCustomer(customer);

        setForm({
            customer_code: customer.customer_code || "",
            name: customer.name || "",
            phone: customer.phone || "",
            address: customer.address || "",
            credit_limit: String(customer.credit_limit ?? 0),
            status: customer.status || "active",
        });

        setError("");
        setModalOpen(true);
    };

    const closeModal = () => {
        if (saving) return;

        setModalOpen(false);
        setEditingCustomer(null);
        setForm(EMPTY_FORM);
        setError("");
    };

    const handleChange = (e) => {
        const { name, value } = e.target;

        setForm((prev) => ({
            ...prev,
            [name]: value,
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");

        if (!form.name.trim()) {
            setError("Customer name is required.");
            return;
        }

        const creditLimit = Number(form.credit_limit);

        if (Number.isNaN(creditLimit) || creditLimit < 0) {
            setError("Credit limit must be a valid non-negative number.");
            return;
        }

        const payload = {
            customer_code: form.customer_code.trim() || null,
            name: form.name.trim(),
            phone: form.phone.trim() || null,
            address: form.address.trim() || null,
            credit_limit: creditLimit,
            status: form.status || "active",
        };

        try {
            setSaving(true);

            if (editingCustomer) {
                await api.put(
                    `/customers/${editingCustomer.id}`,
                    payload
                );
            } else {
                await api.post("/customers", payload);
            }

            closeModal();
            await loadCustomers();
        } catch (err) {
            console.error("Failed to save customer:", err);

            setError(
                err.response?.data?.message ||
                    "Failed to save customer. Please try again."
            );
        } finally {
            setSaving(false);
        }
    };

    const askDelete = (customer) => {
        setCustomerToDelete(customer);
        setConfirmOpen(true);
    };

    const closeConfirm = () => {
        setConfirmOpen(false);
        setCustomerToDelete(null);
    };

    const handleDelete = async () => {
        if (!customerToDelete) return;

        try {
            await api.delete(`/customers/${customerToDelete.id}`);

            closeConfirm();
            await loadCustomers();
        } catch (err) {
            console.error("Failed to delete customer:", err);

            alert(
                err.response?.data?.message ||
                    "Failed to delete customer. The customer may already be linked to a sale."
            );

            closeConfirm();
        }
    };

    const formatPeso = (value) => {
        const amount = Number(value || 0);

        return `₱${amount.toLocaleString("en-PH", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })}`;
    };

    const getStatusClass = (status) => {
        if (status === "inactive") return "chip-muted";
        if (status === "blocked") return "chip-danger";

        return "chip-success";
    };

    return (
        <div className="page-content">
            <div className="page-header">
                <div className="page-header-left">
                    <h1>Customers</h1>
                    <p>Manage your customers and credit information</p>
                </div>

                <div className="page-actions">
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={openAddModal}
                    >
                        + Add Customer
                    </button>
                </div>
            </div>

            <div className="card">
                <div className="card-header">
                    <div className="card-title">
                        Customers
                    </div>

                    <div className="filter-bar">
                        <div className="search-box">
                            <span>⌕</span>

                            <input
                                type="text"
                                value={search}
                                onChange={(e) =>
                                    setSearch(e.target.value)
                                }
                                placeholder="Search customers..."
                            />
                        </div>
                    </div>
                </div>

                <div className="card-body">
                    {loading ? (
                        <div className="empty-state">
                            Loading customers...
                        </div>
                    ) : filteredCustomers.length === 0 ? (
                        <div className="empty-state">
                            {search
                                ? "No customers found."
                                : "No customers yet."}
                        </div>
                    ) : (
                        <div className="table-wrap">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Customer</th>
                                        <th>Phone</th>
                                        <th>Address</th>
                                        <th>Credit Limit</th>
                                        <th>Status</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {filteredCustomers.map(
                                        (customer) => (
                                            <tr key={customer.id}>
                                                <td>
                                                    <div className="product-info">
                                                        <div>
                                                            <strong>
                                                                {
                                                                    customer.name
                                                                }
                                                            </strong>

                                                            <small>
                                                                {customer.customer_code ||
                                                                    `Customer #${customer.id}`}
                                                            </small>
                                                        </div>
                                                    </div>
                                                </td>

                                                <td>
                                                    {customer.phone || "—"}
                                                </td>

                                                <td>
                                                    {customer.address || "—"}
                                                </td>

                                                <td>
                                                    {formatPeso(
                                                        customer.credit_limit
                                                    )}
                                                </td>

                                                <td>
                                                    <span
                                                        className={`chip ${getStatusClass(
                                                            customer.status
                                                        )}`}
                                                    >
                                                        {customer.status ||
                                                            "active"}
                                                    </span>
                                                </td>

                                                <td>
                                                    <div className="action-group">
                                                        <button
                                                            type="button"
                                                            className="action-btn edit"
                                                            onClick={() =>
                                                                openEditModal(
                                                                    customer
                                                                )
                                                            }
                                                        >
                                                            Edit
                                                        </button>

                                                        <button
                                                            type="button"
                                                            className="action-btn delete"
                                                            onClick={() =>
                                                                askDelete(
                                                                    customer
                                                                )
                                                            }
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        )
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>

                <div className="card-footer">
                    Showing {filteredCustomers.length} of{" "}
                    {customers.length} customers
                </div>
            </div>

            <Modal
                open={modalOpen}
                onClose={closeModal}
                title={
                    editingCustomer
                        ? "Edit Customer"
                        : "Add Customer"
                }
            >
                <form onSubmit={handleSubmit}>
                    {error && (
                        <div className="alert alert-danger">
                            {error}
                        </div>
                    )}

                    <div className="form-grid-2">
                        <div className="form-group">
                            <label htmlFor="customer_code">
                                Customer Code
                            </label>

                            <input
                                id="customer_code"
                                name="customer_code"
                                type="text"
                                className="form-control"
                                value={form.customer_code}
                                onChange={handleChange}
                                placeholder="e.g. CUST-001"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="name">
                                Customer Name
                                <span>*</span>
                            </label>

                            <input
                                id="name"
                                name="name"
                                type="text"
                                className="form-control"
                                value={form.name}
                                onChange={handleChange}
                                placeholder="Enter customer name"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="phone">
                                Phone
                            </label>

                            <input
                                id="phone"
                                name="phone"
                                type="text"
                                className="form-control"
                                value={form.phone}
                                onChange={handleChange}
                                placeholder="e.g. 0917-123-4567"
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="credit_limit">
                                Credit Limit
                            </label>

                            <input
                                id="credit_limit"
                                name="credit_limit"
                                type="number"
                                min="0"
                                step="0.01"
                                className="form-control"
                                value={form.credit_limit}
                                onChange={handleChange}
                            />
                        </div>

                        <div className="form-group">
                            <label htmlFor="status">
                                Status
                            </label>

                            <select
                                id="status"
                                name="status"
                                className="form-control"
                                value={form.status}
                                onChange={handleChange}
                            >
                                <option value="active">
                                    Active
                                </option>
                                <option value="inactive">
                                    Inactive
                                </option>
                                <option value="blocked">
                                    Blocked
                                </option>
                            </select>
                        </div>

                        <div className="form-group form-grid-full">
                            <label htmlFor="address">
                                Address
                            </label>

                            <textarea
                                id="address"
                                name="address"
                                className="form-control"
                                value={form.address}
                                onChange={handleChange}
                                placeholder="Enter customer address"
                                rows="3"
                            />
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button
                            type="button"
                            className="btn btn-secondary"
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
                            {saving
                                ? "Saving..."
                                : editingCustomer
                                ? "Update Customer"
                                : "Add Customer"}
                        </button>
                    </div>
                </form>
            </Modal>

            <ConfirmDialog
                open={confirmOpen}
                title="Delete Customer"
                message={
                    customerToDelete
                        ? `Delete "${customerToDelete.name}"?`
                        : "Delete this customer?"
                }
                onConfirm={handleDelete}
                onCancel={closeConfirm}
            />
        </div>
    );
}

export default Customers;