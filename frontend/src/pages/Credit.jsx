import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../services/api";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";

const EMPTY_CUSTOMER = {
    customer_code: "",
    name: "",
    phone: "",
    address: "",
    credit_limit: "0",
};

const EMPTY_PAYMENT = {
    customer_id: "",
    amount: "",
    reference: "",
    notes: "",
};

function formatPeso(value) {
    return `₱${Number(value || 0).toLocaleString("en-PH", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })}`;
}

function formatDate(value) {
    if (!value) return "—";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return "—";

    return date.toLocaleString("en-PH", {
        month: "short",
        day: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
}

function getBalance(customer) {
    return Math.max(0, Number(customer?.balance || 0));
}

function generateCustomerCode() {
    const date = new Date();

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    const randomPart = Math.random()
        .toString(36)
        .substring(2, 7)
        .toUpperCase();

    return `CUS-${year}${month}${day}-${randomPart}`;
}

function getErrorMessage(error, fallback = "Something went wrong.") {
    return (
        error?.response?.data?.message ||
        error?.response?.data?.error ||
        error?.message ||
        fallback
    );
}

function Credit() {
    const [customers, setCustomers] = useState([]);
    const [selectedCustomer, setSelectedCustomer] = useState(null);
    const [history, setHistory] = useState([]);

    const [search, setSearch] = useState("");

    const [loading, setLoading] = useState(true);
    const [historyLoading, setHistoryLoading] = useState(false);

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const [showCustomerModal, setShowCustomerModal] = useState(false);
    const [showPaymentModal, setShowPaymentModal] = useState(false);
    const [showHistoryModal, setShowHistoryModal] = useState(false);

    const [editingCustomer, setEditingCustomer] = useState(null);

    const [customerForm, setCustomerForm] = useState(EMPTY_CUSTOMER);

    const [paymentForm, setPaymentForm] = useState(EMPTY_PAYMENT);

    const [confirmDialog, setConfirmDialog] = useState({
        open: false,
        customer: null,
    });

    const loadCustomers = useCallback(async () => {
        try {
            setLoading(true);
            setError("");

            const response = await api.get("/customers");

            const data = response?.data?.data ?? response?.data ?? [];

            setCustomers(Array.isArray(data) ? data : []);
        } catch (err) {
            setError(
                getErrorMessage(
                    err,
                    "Failed to load customer accounts."
                )
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadCustomers();
    }, [loadCustomers]);

    useEffect(() => {
        if (!success) return;

        const timer = setTimeout(() => {
            setSuccess("");
        }, 3000);

        return () => clearTimeout(timer);
    }, [success]);

    const filteredCustomers = useMemo(() => {
        const query = search.trim().toLowerCase();

        if (!query) return customers;

        return customers.filter((customer) => {
            return (
                String(customer.name || "")
                    .toLowerCase()
                    .includes(query) ||
                String(customer.customer_code || "")
                    .toLowerCase()
                    .includes(query) ||
                String(customer.phone || "")
                    .toLowerCase()
                    .includes(query)
            );
        });
    }, [customers, search]);

    const totalOutstanding = useMemo(() => {
        return customers.reduce((total, customer) => {
            return total + getBalance(customer);
        }, 0);
    }, [customers]);

    const customersWithBalance = useMemo(() => {
        return customers.filter(
            (customer) => getBalance(customer) > 0
        ).length;
    }, [customers]);

    const openAddCustomer = () => {
        setEditingCustomer(null);

        setCustomerForm({
            ...EMPTY_CUSTOMER,
            customer_code: generateCustomerCode(),
        });

        setError("");
        setShowCustomerModal(true);
    };

    const openEditCustomer = (customer) => {
        setEditingCustomer(customer);

        setCustomerForm({
            customer_code: customer.customer_code || "",
            name: customer.name || "",
            phone: customer.phone || "",
            address: customer.address || "",
            credit_limit: String(customer.credit_limit ?? 0),
        });

        setError("");
        setShowCustomerModal(true);
    };

    const closeCustomerModal = () => {
        setShowCustomerModal(false);
        setEditingCustomer(null);
        setCustomerForm(EMPTY_CUSTOMER);
    };

    const handleCustomerSubmit = async (event) => {
        event.preventDefault();

        const customerCode = customerForm.customer_code.trim();
        const name = customerForm.name.trim();

        if (!customerCode || !name) {
            setError("Customer code and name are required.");
            return;
        }

        const creditLimit = Number(customerForm.credit_limit || 0);

        if (Number.isNaN(creditLimit) || creditLimit < 0) {
            setError("Credit limit must be 0 or greater.");
            return;
        }

        try {
            setError("");

            const payload = {
                customer_code: customerCode,
                name,
                phone: customerForm.phone.trim(),
                address: customerForm.address.trim(),
                credit_limit: creditLimit,
            };

            if (editingCustomer) {
                await api.put(
                    `/customers/${editingCustomer.id}`,
                    payload
                );

                setSuccess("Customer updated successfully.");
            } else {
                await api.post("/customers", payload);

                setSuccess("Customer added successfully.");
            }

            closeCustomerModal();
            await loadCustomers();
        } catch (err) {
            setError(
                getErrorMessage(
                    err,
                    editingCustomer
                        ? "Failed to update customer."
                        : "Failed to add customer."
                )
            );
        }
    };

    const openPaymentModal = (customer) => {
        setSelectedCustomer(customer);

        setPaymentForm({
            ...EMPTY_PAYMENT,
            customer_id: String(customer.id),
        });

        setError("");
        setShowPaymentModal(true);
    };

    const closePaymentModal = () => {
        setShowPaymentModal(false);
        setPaymentForm(EMPTY_PAYMENT);
    };

    const handlePaymentSubmit = async (event) => {
        event.preventDefault();

        if (!selectedCustomer) {
            setError("No customer selected.");
            return;
        }

        const amount = Number(paymentForm.amount);

        if (!amount || amount <= 0) {
            setError("Payment amount must be greater than 0.");
            return;
        }

        const balance = getBalance(selectedCustomer);

        if (amount > balance) {
            setError(
                `Payment cannot exceed the outstanding balance of ${formatPeso(
                    balance
                )}.`
            );
            return;
        }

        try {
            setError("");

            await api.post("/credit-transactions/payment", {
                customer_id: selectedCustomer.id,
                amount,
                reference: paymentForm.reference.trim(),
                notes: paymentForm.notes.trim(),
                admin_id: 1,
            });

            setSuccess("Payment recorded successfully.");

            closePaymentModal();

            await loadCustomers();

            if (selectedCustomer?.id) {
                await loadCustomerHistory(
                    selectedCustomer.id,
                    false
                );
            }
        } catch (err) {
            setError(
                getErrorMessage(
                    err,
                    "Failed to record payment."
                )
            );
        }
    };

    const loadCustomerHistory = async (
        customerId,
        openModal = true
    ) => {
        try {
            setHistoryLoading(true);
            setError("");

            const response = await api.get(
                `/credit-transactions/customer/${customerId}`
            );

            const data =
                response?.data?.data ?? response?.data ?? [];

            setHistory(Array.isArray(data) ? data : []);

            if (openModal) {
                setShowHistoryModal(true);
            }
        } catch (err) {
            setError(
                getErrorMessage(
                    err,
                    "Failed to load payment history."
                )
            );
        } finally {
            setHistoryLoading(false);
        }
    };

    const openHistory = async (customer) => {
        setSelectedCustomer(customer);
        await loadCustomerHistory(customer.id, true);
    };

    const openToggleStatus = (customer) => {
        setConfirmDialog({
            open: true,
            customer,
        });
    };

    const closeConfirmDialog = () => {
        setConfirmDialog({
            open: false,
            customer: null,
        });
    };

    const handleToggleStatus = async () => {
        const customer = confirmDialog.customer;

        if (!customer) return;

        try {
            setError("");

            const nextStatus =
                String(customer.status).toLowerCase() === "active"
                    ? "inactive"
                    : "active";

            await api.put(`/customers/${customer.id}`, {
                customer_code: customer.customer_code,
                name: customer.name,
                phone: customer.phone || "",
                address: customer.address || "",
                credit_limit: Number(customer.credit_limit || 0),
                status: nextStatus,
            });

            setSuccess(
                nextStatus === "active"
                    ? "Customer activated successfully."
                    : "Customer deactivated successfully."
            );

            closeConfirmDialog();
            await loadCustomers();
        } catch (err) {
            setError(
                getErrorMessage(
                    err,
                    "Failed to update customer status."
                )
            );
        }
    };

    return (
        <div className="page-content">
            <div className="page-header">
                <div className="page-header-left">
                    <h1>Credit Management</h1>

                    <p>
                        Manage customer credit accounts,
                        outstanding balances, and payment history.
                    </p>
                </div>

                <div className="page-actions">
                    <button
                        type="button"
                        className="btn btn-primary"
                        onClick={openAddCustomer}
                    >
                        Add Customer
                    </button>
                </div>
            </div>

            {error && (
                <div className="alert alert-danger">
                    {error}
                </div>
            )}

            {success && (
                <div className="alert alert-success">
                    {success}
                </div>
            )}

            <div className="stats-grid">
                <div className="stat-card">

                    <div className="stat-info">
                        <div className="stat-value">
                            {customers.length}
                        </div>

                        <div className="stat-label">
                            Customer Accounts
                        </div>
                    </div>
                </div>

                <div className="stat-card">

                    <div className="stat-info">
                        <div className="stat-value">
                            {formatPeso(totalOutstanding)}
                        </div>

                        <div className="stat-label">
                            Total Outstanding
                        </div>
                    </div>
                </div>

                <div className="stat-card">

                    <div className="stat-info">
                        <div className="stat-value">
                            {customersWithBalance}
                        </div>

                        <div className="stat-label">
                            Customers With Balance
                        </div>
                    </div>
                </div>
            </div>

            <div className="card">
                <div className="card-header">
                    <div className="card-title">
                        Customer Accounts
                    </div>

                    <div className="search-box">
                        <input
                            type="text"
                            className="form-control"
                            placeholder="Search customer, code or phone..."
                            value={search}
                            onChange={(e) =>
                                setSearch(e.target.value)
                            }
                        />
                    </div>
                </div>

                <div className="card-body">
                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>Customer</th>
                                    <th>Customer Code</th>
                                    <th>Phone</th>
                                    <th>Credit Limit</th>
                                    <th>Outstanding Balance</th>
                                    <th>Status</th>
                                    <th>Last Activity</th>
                                    <th className="credit-actions-header">
                                        Actions
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td
                                            colSpan="8"
                                            style={{
                                                textAlign: "center",
                                                padding: "30px",
                                            }}
                                        >
                                            Loading customers...
                                        </td>
                                    </tr>
                                ) : filteredCustomers.length === 0 ? (
                                    <tr>
                                        <td
                                            colSpan="8"
                                            style={{
                                                textAlign: "center",
                                                padding: "30px",
                                            }}
                                        >
                                            No customer accounts found.
                                        </td>
                                    </tr>
                                ) : (
                                    filteredCustomers.map(
                                        (customer) => {
                                            const balance =
                                                getBalance(customer);

                                            const isActive =
                                                String(
                                                    customer.status || ""
                                                ).toLowerCase() ===
                                                "active";

                                            return (
                                                <tr
                                                    key={customer.id}
                                                >
                                                    <td>
                                                        <div className="product-info">
                                                            <strong>
                                                                {customer.name ||
                                                                    "—"}
                                                            </strong>
                                                        </div>
                                                    </td>

                                                    <td>
                                                        {customer.customer_code ||
                                                            "—"}
                                                    </td>

                                                    <td>
                                                        {customer.phone ||
                                                            "—"}
                                                    </td>

                                                    <td>
                                                        {formatPeso(
                                                            customer.credit_limit
                                                        )}
                                                    </td>

                                                    <td>
                                                        <strong>
                                                            {formatPeso(
                                                                balance
                                                            )}
                                                        </strong>
                                                    </td>

                                                    <td>
                                                        <span  style={{padding: "3px 6px", borderRadius: "10px", fontSize: "0.9em"}}
                                                            className={
                                                                isActive
                                                                    ? "chip-success"
                                                                    : "chip-muted"
                                                            }
                                                        >
                                                            {customer.status ||
                                                                "Inactive"}
                                                        </span>
                                                    </td>

                                                    <td>
                                                        {formatDate(
                                                            customer.updated_at ||
                                                                customer.created_at
                                                        )}
                                                    </td>

                                                    <td className="credit-actions-cell">
                                                        <div className="credit-action-group">
                                                            <button
                                                                type="button"
                                                                className="credit-action-btn credit-action-view"
                                                                data-tooltip="View credit history"
                                                                aria-label="View credit history"
                                                                onClick={() =>
                                                                    openHistory(
                                                                        customer
                                                                    )
                                                                }
                                                            >
                                                                View
                                                            </button>

                                                            {balance > 0 && (
                                                                <button
                                                                    type="button"
                                                                    className="credit-action-btn credit-action-payment"
                                                                    data-tooltip="Record payment"
                                                                    aria-label="Record payment"
                                                                    onClick={() =>
                                                                        openPaymentModal(
                                                                            customer
                                                                        )
                                                                    }
                                                                >
                                                                    Payment
                                                                </button>
                                                            )}

                                                            <button
                                                                type="button"
                                                                className="credit-action-btn credit-action-edit"
                                                                data-tooltip="Edit customer"
                                                                aria-label="Edit customer"
                                                                onClick={() =>
                                                                    openEditCustomer(
                                                                        customer
                                                                    )
                                                                }
                                                            >
                                                                Edit
                                                            </button>

                                                            <button
                                                                type="button"
                                                                className={
                                                                    isActive
                                                                        ? "credit-action-btn credit-action-deactivate"
                                                                        : "credit-action-btn credit-action-activate"
                                                                }
                                                                data-tooltip={
                                                                    isActive
                                                                        ? "Deactivate customer"
                                                                        : "Activate customer"
                                                                }
                                                                aria-label={
                                                                    isActive
                                                                        ? "Deactivate customer"
                                                                        : "Activate customer"
                                                                }
                                                                onClick={() =>
                                                                    openToggleStatus(
                                                                        customer
                                                                    )
                                                                }
                                                            >
                                                                {isActive
                                                                    ? "Deactivate"
                                                                    : "Activate"}
                                                            </button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        }
                                    )
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

            {/* ADD / EDIT CUSTOMER */}
            <Modal
                open={showCustomerModal}
                title={
                    editingCustomer
                        ? "Edit Customer"
                        : "Add Customer"
                }
                onClose={closeCustomerModal}
                width={650}
            >
                <form onSubmit={handleCustomerSubmit}>
                    {!editingCustomer && (
                        <div
                            className="alert alert-success"
                            style={{
                                marginBottom: "18px",
                            }}
                        >
                            Customer code generated
                            automatically.
                        </div>
                    )}

                    <div className="form-grid">
                        <div className="form-group">
                            <label>Customer Code</label>

                            <input
                                type="text"
                                className="form-control"
                                value={
                                    customerForm.customer_code
                                }
                                readOnly
                            />

                            <div className="form-hint">
                                Automatically generated by
                                the system.
                            </div>
                        </div>

                        <div className="form-group">
                            <label>
                                Customer Name{" "}
                                <span
                                    style={{
                                        color: "red",
                                    }}
                                >
                                    *
                                </span>
                            </label>

                            <input
                                type="text"
                                className="form-control"
                                value={customerForm.name}
                                onChange={(e) =>
                                    setCustomerForm({
                                        ...customerForm,
                                        name: e.target.value,
                                    })
                                }
                                placeholder="Enter customer name"
                                required
                            />
                        </div>

                        <div className="form-group">
                            <label>Phone</label>

                            <input
                                type="text"
                                className="form-control"
                                value={customerForm.phone}
                                onChange={(e) =>
                                    setCustomerForm({
                                        ...customerForm,
                                        phone: e.target.value,
                                    })
                                }
                                placeholder="Enter phone number"
                            />
                        </div>

                        <div className="form-group">
                            <label>Address</label>

                            <input
                                type="text"
                                className="form-control"
                                value={customerForm.address}
                                onChange={(e) =>
                                    setCustomerForm({
                                        ...customerForm,
                                        address: e.target.value,
                                    })
                                }
                                placeholder="Enter address"
                            />
                        </div>

                        <div className="form-group">
                            <label>
                                Credit Limit (₱)
                            </label>

                            <input
                                type="number"
                                className="form-control"
                                min="0"
                                step="0.01"
                                value={
                                    customerForm.credit_limit
                                }
                                onChange={(e) =>
                                    setCustomerForm({
                                        ...customerForm,
                                        credit_limit:
                                            e.target.value,
                                    })
                                }
                                placeholder="0.00"
                            />

                            <div className="form-hint">
                                Set to 0 for no credit limit.
                            </div>
                        </div>
                    </div>

                    <div className="modal-footer">
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={closeCustomerModal}
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            className="btn btn-primary"
                        >
                            {editingCustomer
                                ? "Update Customer"
                                : "Save Customer"}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* PAYMENT MODAL */}
            <Modal
                open={showPaymentModal}
                title="Record Payment"
                onClose={closePaymentModal}
                width={550}
            >
                {selectedCustomer && (
                    <form onSubmit={handlePaymentSubmit}>
                        <div
                            className="alert alert-success"
                            style={{
                                marginBottom: "18px",
                            }}
                        >
                            <strong>
                                {selectedCustomer.name}
                            </strong>
                            <br />
                            Outstanding Balance:{" "}
                            <strong>
                                {formatPeso(
                                    getBalance(
                                        selectedCustomer
                                    )
                                )}
                            </strong>
                        </div>

                        <div className="form-grid">
                            <div className="form-group">
                                <label>
                                    Payment Amount (₱){" "}
                                    <span
                                        style={{
                                            color: "red",
                                        }}
                                    >
                                        *
                                    </span>
                                </label>

                                <input
                                    type="number"
                                    className="form-control"
                                    min="0.01"
                                    max={getBalance(
                                        selectedCustomer
                                    )}
                                    step="0.01"
                                    value={
                                        paymentForm.amount
                                    }
                                    onChange={(e) =>
                                        setPaymentForm({
                                            ...paymentForm,
                                            amount: e.target.value,
                                        })
                                    }
                                    placeholder="0.00"
                                    required
                                />
                            </div>

                            <div className="form-group">
                                <label>Reference</label>

                                <input
                                    type="text"
                                    className="form-control"
                                    value={
                                        paymentForm.reference
                                    }
                                    onChange={(e) =>
                                        setPaymentForm({
                                            ...paymentForm,
                                            reference:
                                                e.target.value,
                                        })
                                    }
                                    placeholder="OR number / reference"
                                />
                            </div>

                            <div className="form-group">
                                <label>Notes</label>

                                <textarea
                                    className="form-control"
                                    rows="3"
                                    value={paymentForm.notes}
                                    onChange={(e) =>
                                        setPaymentForm({
                                            ...paymentForm,
                                            notes: e.target.value,
                                        })
                                    }
                                    placeholder="Optional notes"
                                />
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={closePaymentModal}
                            >
                                Cancel
                            </button>

                            <button
                                type="submit"
                                className="btn btn-success"
                            >
                                Record Payment
                            </button>
                        </div>
                    </form>
                )}
            </Modal>

            {/* HISTORY MODAL */}
            <Modal
                open={showHistoryModal}
                title={
                    selectedCustomer
                        ? `Credit History - ${selectedCustomer.name}`
                        : "Credit History"
                }
                onClose={() =>
                    setShowHistoryModal(false)
                }
                width={850}
            >
                <div className="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>Date</th>
                                <th>Transaction</th>
                                <th>Amount</th>
                                <th>Reference</th>
                                <th>Notes</th>
                            </tr>
                        </thead>

                        <tbody>
                            {historyLoading ? (
                                <tr>
                                    <td
                                        colSpan="5"
                                        style={{
                                            textAlign: "center",
                                            padding: "30px",
                                        }}
                                    >
                                        Loading history...
                                    </td>
                                </tr>
                            ) : history.length === 0 ? (
                                <tr>
                                    <td
                                        colSpan="5"
                                        style={{
                                            textAlign: "center",
                                            padding: "30px",
                                        }}
                                    >
                                        No credit transactions
                                        found.
                                    </td>
                                </tr>
                            ) : (
                                history.map(
                                    (transaction) => {
                                        const type =
                                            String(
                                                transaction.transaction_type ||
                                                    ""
                                            ).toLowerCase();

                                        const isPayment =
                                            type === "payment";

                                        return (
                                            <tr
                                                key={
                                                    transaction.id
                                                }
                                            >
                                                <td>
                                                    {formatDate(
                                                        transaction.created_at
                                                    )}
                                                </td>

                                                <td>
                                                    <span
                                                        className={
                                                            isPayment
                                                                ? "chip-success"
                                                                : "chip-warning"
                                                        }
                                                    >
                                                        {isPayment
                                                            ? "Payment"
                                                            : "Credit"}
                                                    </span>
                                                </td>

                                                <td>
                                                    <strong>
                                                        {formatPeso(
                                                            transaction.amount
                                                        )}
                                                    </strong>
                                                </td>

                                                <td>
                                                    {transaction.reference ||
                                                        "—"}
                                                </td>

                                                <td>
                                                    {transaction.notes ||
                                                        "—"}
                                                </td>
                                            </tr>
                                        );
                                    }
                                )
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="modal-footer">
                    <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() =>
                            setShowHistoryModal(false)
                        }
                    >
                        Close
                    </button>
                </div>
            </Modal>

            {/* ACTIVATE / DEACTIVATE */}
            <ConfirmDialog
                open={confirmDialog.open}
                title={
                    confirmDialog.customer &&
                    String(
                        confirmDialog.customer.status || ""
                    ).toLowerCase() === "active"
                        ? "Deactivate Customer"
                        : "Activate Customer"
                }
                message={
                    confirmDialog.customer
                        ? String(
                              confirmDialog.customer.status ||
                                  ""
                          ).toLowerCase() === "active"
                            ? `Are you sure you want to deactivate ${confirmDialog.customer.name}?`
                            : `Are you sure you want to activate ${confirmDialog.customer.name}?`
                        : ""
                }
                onConfirm={handleToggleStatus}
                onCancel={closeConfirmDialog}
            />
        </div>
    );
}

export default Credit;