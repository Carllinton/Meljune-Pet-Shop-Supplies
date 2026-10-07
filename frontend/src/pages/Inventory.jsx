import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../services/api";
import Modal from "../components/Modal";
import { getUser } from "../services/auth";

function Inventory() {
    const user = getUser();
    const isAdmin = user?.role === "admin";

    const [transactions, setTransactions] = useState([]);
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [successMessage, setSuccessMessage] = useState("");

    // Filters
    const [search, setSearch] = useState("");
    const [typeFilter, setTypeFilter] = useState("all");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [repackOnly, setRepackOnly] = useState(false);
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");

    // Stock adjustment modal
    const [showModal, setShowModal] = useState(false);
    const [saving, setSaving] = useState(false);
    const [modalError, setModalError] = useState("");

    const [form, setForm] = useState({
        transaction_type: "stock_in",
        product_id: "",
        quantity: "",
        reason: ""
    });

    // --------------------------------------------------
    // FETCH DATA
    // --------------------------------------------------

    const loadData = useCallback(async () => {
        try {
            setLoading(true);
            setError("");

            const [transactionRes, productRes, categoryRes] =
                await Promise.all([
                    api.get("/stock-transactions"),
                    api.get("/products"),
                    api.get("/categories")
                ]);

            setTransactions(transactionRes.data?.data || []);
            setProducts(productRes.data?.data || []);
            setCategories(categoryRes.data?.data || []);
        } catch (err) {
            console.error("Inventory loading error:", err);

            setError(
                err.response?.data?.message ||
                    "Failed to load inventory data."
            );
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // --------------------------------------------------
    // CATEGORY HELPER
    // --------------------------------------------------

    const getCategoryName = useCallback(
        (product) => {
            if (!product) return "Uncategorized";

            if (product.category_name) {
                return product.category_name;
            }

            if (
                product.category &&
                typeof product.category === "object" &&
                product.category.name
            ) {
                return product.category.name;
            }

            if (
                product.category &&
                typeof product.category === "string"
            ) {
                return product.category;
            }

            const categoryId =
                product.category_id ?? product.categoryId;

            if (categoryId !== undefined && categoryId !== null) {
                const category = categories.find(
                    (item) =>
                        Number(item.id) === Number(categoryId)
                );

                if (category) {
                    return category.name;
                }
            }

            return "Uncategorized";
        },
        [categories]
    );


    // --------------------------------------------------
    // CASHIER NAME HELPER
    // --------------------------------------------------

    const getCashierName = (transaction) => {
        return (
            transaction.admin_name ||
            transaction.cashier_name ||
            transaction.full_name ||
            (transaction.admin_id
                ? `Admin #${transaction.admin_id}`
                : "—")
        );
    };

    // --------------------------------------------------
    // CURRENT INVENTORY SUMMARY
    // --------------------------------------------------

    const inventorySummary = useMemo(() => {
        const activeProducts = products.filter(
            (product) => product.status === "active"
        );

        let totalUnits = 0;
        let lowStock = 0;
        let outOfStock = 0;

        activeProducts.forEach((product) => {
            const quantity = Number(product.quantity) || 0;

            const threshold =
                Number(product.low_stock_threshold) || 10;

            totalUnits += quantity;

            if (quantity === 0) {
                outOfStock++;
            } else if (quantity <= threshold) {
                lowStock++;
            }
        });

        return {
            totalProducts: activeProducts.length,
            totalUnits,
            lowStock,
            outOfStock
        };
    }, [products]);

    // --------------------------------------------------
    // CURRENT INVENTORY PRODUCTS
    // --------------------------------------------------

    const currentInventory = useMemo(() => {
        return products
            .filter(
                (product) => product.status === "active"
            )
            .sort((a, b) =>
                String(a.name || "").localeCompare(
                    String(b.name || "")
                )
            );
    }, [products]);

    // --------------------------------------------------
    // FILTERED TRANSACTIONS
    // --------------------------------------------------

    const filteredTransactions = useMemo(() => {
        return transactions.filter((transaction) => {
            const productName =
                transaction.product_name ||
                transaction.product?.name ||
                "";

            const productCode =
                transaction.product_code ||
                transaction.product?.product_code ||
                "";

            const reason = transaction.reason || "";
            const reference = transaction.reference || "";

            const categoryName =
                transaction.category_name ||
                transaction.category?.name ||
                "";

            const searchValue = search
                .toLowerCase()
                .trim();

            const matchesSearch =
                !searchValue ||
                productName
                    .toLowerCase()
                    .includes(searchValue) ||
                productCode
                    .toLowerCase()
                    .includes(searchValue) ||
                reason
                    .toLowerCase()
                    .includes(searchValue) ||
                reference
                    .toLowerCase()
                    .includes(searchValue);

            const matchesType =
                typeFilter === "all" ||
                transaction.transaction_type === typeFilter;

            const matchesCategory =
                categoryFilter === "all" ||
                String(
                    transaction.category_id ??
                        transaction.product_category_id ??
                        ""
                ) === String(categoryFilter) ||
                categoryName === categoryFilter;

            const combinedText =
                `${reason} ${reference}`.toLowerCase();

            const matchesRepack =
                !repackOnly ||
                combinedText.includes("repack");

            const transactionDate =
                transaction.created_at
                    ? new Date(transaction.created_at)
                    : null;

            let matchesFrom = true;
            let matchesTo = true;

            if (dateFrom && transactionDate) {
                const from = new Date(`${dateFrom}T00:00:00`);
                matchesFrom = transactionDate >= from;
            }

            if (dateTo && transactionDate) {
                const to = new Date(`${dateTo}T23:59:59`);
                matchesTo = transactionDate <= to;
            }

            return (
                matchesSearch &&
                matchesType &&
                matchesCategory &&
                matchesRepack &&
                matchesFrom &&
                matchesTo
            );
        });
    }, [
        transactions,
        search,
        typeFilter,
        categoryFilter,
        repackOnly,
        dateFrom,
        dateTo
    ]);

    // --------------------------------------------------
    // TRANSACTION SUMMARY
    // --------------------------------------------------

    const summary = useMemo(() => {
        let stockIn = 0;
        let stockOut = 0;
        let adjustments = 0;

        filteredTransactions.forEach((transaction) => {
            const quantity =
                Number(transaction.quantity) || 0;

            if (
                transaction.transaction_type ===
                "stock_in"
            ) {
                stockIn += quantity;
            } else if (
                transaction.transaction_type ===
                "stock_out"
            ) {
                stockOut += quantity;
            } else if (
                transaction.transaction_type ===
                "adjustment"
            ) {
                adjustments += quantity;
            }
        });

        return {
            stockIn,
            stockOut,
            adjustments,
            net: stockIn - stockOut
        };
    }, [filteredTransactions]);

    // --------------------------------------------------
    // FORM HELPERS
    // --------------------------------------------------

    const selectedProduct = useMemo(() => {
        return products.find(
            (product) =>
                String(product.id) ===
                String(form.product_id)
        );
    }, [products, form.product_id]);

    const calculatedStock = useMemo(() => {
        if (!selectedProduct) return 0;

        const current =
            Number(selectedProduct.quantity) || 0;

        const quantity =
            Number(form.quantity) || 0;

        if (form.transaction_type === "stock_in") {
            return current + quantity;
        }

        if (form.transaction_type === "stock_out") {
            return current - quantity;
        }

        return quantity;
    }, [
        selectedProduct,
        form.quantity,
        form.transaction_type
    ]);

    // --------------------------------------------------
    // MODAL
    // --------------------------------------------------

    const openModal = () => {
        setForm({
            transaction_type: "stock_in",
            product_id: "",
            quantity: "",
            reason: ""
        });

        setModalError("");
        setShowModal(true);
    };

    const closeModal = () => {
        if (saving) return;

        setShowModal(false);
        setModalError("");
    };

    const handleFormChange = (event) => {
        const { name, value } = event.target;

        setForm((previous) => ({
            ...previous,
            [name]: value
        }));

        if (modalError) {
            setModalError("");
        }
    };

    // --------------------------------------------------
    // SAVE STOCK TRANSACTION
    // --------------------------------------------------

    const handleSubmit = async (event) => {
        event.preventDefault();

        setModalError("");

        if (!form.product_id) {
            setModalError("Please select a product.");
            return;
        }

        const quantity = Number(form.quantity);

        if (!Number.isInteger(quantity)) {
            setModalError(
                "Quantity must be a whole number."
            );
            return;
        }

        if (
            form.transaction_type !== "adjustment" &&
            quantity <= 0
        ) {
            setModalError(
                "Quantity must be greater than zero."
            );
            return;
        }

        if (
            form.transaction_type === "adjustment" &&
            quantity < 0
        ) {
            setModalError(
                "Adjustment quantity cannot be negative."
            );
            return;
        }

        const currentStock =
            Number(selectedProduct?.quantity) || 0;

        if (
            form.transaction_type === "stock_out" &&
            quantity > currentStock
        ) {
            setModalError(
                `Cannot stock out ${quantity} units. Current stock is ${currentStock}.`
            );
            return;
        }

        if (
            form.transaction_type === "stock_out" &&
            calculatedStock < 0
        ) {
            setModalError(
                "Stock cannot become negative."
            );
            return;
        }

        try {
            setSaving(true);

            const response = await api.post(
                "/stock-transactions/adjust",
                {
                    product_id: Number(form.product_id),
                    transaction_type:
                        form.transaction_type,
                    quantity,
                    reason:
                        form.reason.trim() || null
                }
            );

            const reference = response.data?.data?.reference;
            setSuccessMessage(
                reference
                    ? `Stock updated successfully. Reference: ${reference}`
                    : "Stock updated successfully."
            );
            setShowModal(false);

            await loadData();
        } catch (err) {
            console.error(
                "Stock adjustment error:",
                err
            );

            setModalError(
                err.response?.data?.message ||
                    "Failed to save stock transaction."
            );
        } finally {
            setSaving(false);
        }
    };

    // --------------------------------------------------
    // DISPLAY HELPERS
    // --------------------------------------------------

    const formatDate = (date) => {
        if (!date) return "—";

        return new Date(date).toLocaleDateString(
            "en-PH",
            {
                year: "numeric",
                month: "short",
                day: "numeric"
            }
        );
    };

    const formatDateTime = (date) => {
        if (!date) return "—";

        return new Date(date).toLocaleString(
            "en-PH",
            {
                year: "numeric",
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit"
            }
        );
    };

    const getTransactionTypeLabel = (type) => {
        switch (type) {
            case "stock_in":
                return "Stock In";

            case "stock_out":
                return "Stock Out";

            case "adjustment":
                return "Adjustment";

            default:
                return type || "Unknown";
        }
    };

    const getTransactionTypeClass = (type) => {
        switch (type) {
            case "stock_in":
                return "chip-success";

            case "stock_out":
                return "chip-danger";

            case "adjustment":
                return "chip-warning";

            default:
                return "chip-muted";
        }
    };

    const getQuantityChange = (transaction) => {
        const quantity =
            Number(transaction.quantity) || 0;

        if (
            transaction.transaction_type ===
            "stock_in"
        ) {
            return `+${quantity}`;
        }

        if (
            transaction.transaction_type ===
            "stock_out"
        ) {
            return `-${quantity}`;
        }

        return quantity;
    };

    const getQuantityChangeClass = (transaction) => {
        if (
            transaction.transaction_type ===
            "stock_in"
        ) {
            return "chip-success";
        }

        if (
            transaction.transaction_type ===
            "stock_out"
        ) {
            return "chip-danger";
        }

        return "chip-warning";
    };

    const getStockStatus = (product) => {
        const quantity =
            Number(product.quantity) || 0;

        const threshold =
            Number(product.low_stock_threshold) || 10;

        if (quantity === 0) {
            return {
                label: "Out of Stock",
                className: "chip-danger"
            };
        }

        if (quantity <= threshold) {
            return {
                label: "Low Stock",
                className: "chip-warning"
            };
        }

        return {
            label: "In Stock",
            className: "chip-success"
        };
    };

    // --------------------------------------------------
    // LOADING
    // --------------------------------------------------

    if (loading) {
        return (
            <div className="page-content">
                <div className="page-header">
                    <div className="page-header-left">
                        <h1>Inventory</h1>
                        <p>
                            Loading inventory data...
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    // --------------------------------------------------
    // PAGE
    // --------------------------------------------------

    return (
        <div className="page-content">
            {/* HEADER */}
            <div className="page-header">
                <div className="page-header-left">
                    <h1>Inventory</h1>
                    <p>
                        Monitor current stock and track
                        inventory movements.
                    </p>
                </div>

                <div className="page-actions">
                    {isAdmin && (
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={openModal}
                        >
                            Stock Adjustment
                        </button>
                    )}
                </div>
            </div>

            {/* ERROR */}
            {error && (
                <div className="alert alert-danger">
                    {error}
                </div>
            )}

            {successMessage && (
                <div className="alert alert-success" role="status">
                    {successMessage}
                    <button
                        type="button"
                        className="alert-dismiss"
                        aria-label="Dismiss notification"
                        onClick={() => setSuccessMessage("")}
                    >
                        ×
                    </button>
                </div>
            )}

            {/* CURRENT INVENTORY STATS */}
            <div className="stats-grid">
                <div className="stat-card primary">

                    <div className="stat-info">
                        <div className="stat-value">
                            {
                                inventorySummary.totalProducts
                            }
                        </div>

                        <div className="stat-label">
                            Total Products
                        </div>
                    </div>
                </div>

                <div className="stat-card success">

                    <div className="stat-info">
                        <div className="stat-value">
                            {inventorySummary.totalUnits.toLocaleString()}
                        </div>

                        <div className="stat-label">
                            Total Units
                        </div>
                    </div>
                </div>

                <div className="stat-card warning">

                    <div className="stat-info">
                        <div className="stat-value">
                            {inventorySummary.lowStock}
                        </div>

                        <div className="stat-label">
                            Low Stock
                        </div>
                    </div>
                </div>

                <div className="stat-card danger">

                    <div className="stat-info">
                        <div className="stat-value">
                            {inventorySummary.outOfStock}
                        </div>

                        <div className="stat-label">
                            Out of Stock
                        </div>
                    </div>
                </div>
            </div>

            {/* CURRENT INVENTORY */}
            <div className="card">
                <div className="card-header">
                    <div>
                        <div className="card-title">
                            Current Inventory
                        </div>

                        <div
                            style={{
                                color:
                                    "var(--text-muted)",
                                fontSize: "13px",
                                marginTop: "4px"
                            }}
                        >
                            Current stock levels for all
                            active products.
                        </div>
                    </div>
                </div>

                <div className="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>Product Code</th>
                                <th>Product</th>
                                <th>Category</th>
                                <th>Stock</th>
                                <th>Unit</th>
                                <th style={{textAlign:"center"}}>Low Stock Threshold</th>
                                <th>Status</th>
                            </tr>
                        </thead>

                        <tbody>
                            {currentInventory.length ===
                            0 ? (
                                <tr>
                                    <td
                                        colSpan="7"
                                        style={{
                                            textAlign:
                                                "center",
                                            padding:
                                                "30px"
                                        }}
                                    >
                                        No active products
                                        found.
                                    </td>
                                </tr>
                            ) : (
                                currentInventory.map(
                                    (product) => {
                                        const status =
                                            getStockStatus(
                                                product
                                            );

                                        return (
                                            <tr
                                                key={
                                                    product.id
                                                }
                                            >
                                                <td className="font-mono">
                                                    {
                                                        product.product_code
                                                    }
                                                </td>

                                                <td>
                                                    <div className="product-info">
                                                        <strong>
                                                            {
                                                                product.name
                                                            }
                                                        </strong>

                                                        {product.brand && (
                                                            <span>
                                                                {
                                                                    product.brand
                                                                }
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>

                                                <td>
                                                    {
                                                        getCategoryName(
                                                            product
                                                        )
                                                    }
                                                </td>

                                                <td>
                                                    <strong>
                                                        {Number(
                                                            product.quantity
                                                        ).toLocaleString()}
                                                    </strong>
                                                </td>

                                                <td>
                                                    {product.unit ||
                                                        "pcs"}
                                                </td>

                                                <td style={{
                                            textAlign:
                                                "center"}}
                                                >
                                                    {Number(
                                                        product.low_stock_threshold
                                                    ) ||
                                                        10}
                                                </td>

                                                <td>
                                                    <span
                                                        className={`chip ${status.className}`}
                                                    >
                                                        {
                                                            status.label
                                                        }
                                                    </span>
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

            {/* TRANSACTION SUMMARY */}
            <div
                className="stats-grid"
                style={{
                    marginTop: "24px"
                }}
            >
                <div className="stat-card success">

                    <div className="stat-info">
                        <div className="stat-value">
                            {summary.stockIn.toLocaleString()}
                        </div>

                        <div className="stat-label">
                            Stock In
                        </div>
                    </div>
                </div>

                <div className="stat-card danger">

                    <div className="stat-info">
                        <div className="stat-value">
                            {summary.stockOut.toLocaleString()}
                        </div>

                        <div className="stat-label">
                            Stock Out
                        </div>
                    </div>
                </div>

                <div className="stat-card warning">

                    <div className="stat-info">
                        <div className="stat-value">
                            {summary.adjustments.toLocaleString()}
                        </div>

                        <div className="stat-label">
                            Adjustments
                        </div>
                    </div>
                </div>

                <div className="stat-card primary">

                    <div className="stat-info">
                        <div className="stat-value">
                            {summary.net.toLocaleString()}
                        </div>

                        <div className="stat-label">
                            Net Movement
                        </div>
                    </div>
                </div>
            </div>

            {/* FILTERS */}
            <div
                className="card"
                style={{
                    marginTop: "24px"
                }}
            >
                <div className="card-body">
                    <div className="filter-bar">
                        <div className="search-box">
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Search by product, code, reason or reference..."
                                value={search}
                                onChange={(event) =>
                                    setSearch(
                                        event.target.value
                                    )
                                }
                            />
                        </div>

                        <select
                            className="form-control"
                            value={typeFilter}
                            onChange={(event) =>
                                setTypeFilter(
                                    event.target.value
                                )
                            }
                        >
                            <option value="all">
                                All Types
                            </option>

                            <option value="stock_in">
                                Stock In
                            </option>

                            <option value="stock_out">
                                Stock Out
                            </option>

                            <option value="adjustment">
                                Adjustment
                            </option>
                        </select>

                        <select
                            className="form-control"
                            value={categoryFilter}
                            onChange={(event) =>
                                setCategoryFilter(
                                    event.target.value
                                )
                            }
                        >
                            <option value="all">
                                All Categories
                            </option>

                            {categories.map(
                                (category) => (
                                    <option
                                        key={
                                            category.id
                                        }
                                        value={
                                            category.id
                                        }
                                    >
                                        {category.name}
                                    </option>
                                )
                            )}
                        </select>

                        <input
                            type="date"
                            className="form-control"
                            value={dateFrom}
                            onChange={(event) =>
                                setDateFrom(
                                    event.target.value
                                )
                            }
                        />

                        <input
                            type="date"
                            className="form-control"
                            value={dateTo}
                            onChange={(event) =>
                                setDateTo(
                                    event.target.value
                                )
                            }
                        />
                    </div>
                </div>
            </div>

            {/* TRANSACTION LOG */}
            <div
                className="card"
                style={{
                    marginTop: "24px"
                }}
            >
                <div className="card-header">
                    <div>
                        <div className="card-title">
                            Inventory Transaction Log
                        </div>

                        <div
                            style={{
                                color:
                                    "var(--text-muted)",
                                fontSize: "13px",
                                marginTop: "4px"
                            }}
                        >
                            {filteredTransactions.length.toLocaleString()}{" "}
                            transaction
                            {filteredTransactions.length !==
                            1
                                ? "s"
                                : ""}
                        </div>
                    </div>
                </div>

                <div className="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Date & Time</th>
                                <th>Product</th>
                                <th>Category</th>
                                <th>Type</th>
                                <th style={{
                                            textAlign:
                                                "center"}}>Qty Before</th>
                                <th>Change</th>
                                <th style={{
                                            textAlign:
                                                "center"}}>Qty After</th>
                                <th>Reference</th>
                                <th>User</th>
                            </tr>
                        </thead>

                        <tbody>
                            {filteredTransactions.length ===
                            0 ? (
                                <tr>
                                    <td
                                        colSpan="11"
                                        style={{
                                            textAlign:
                                                "center",
                                            padding:
                                                "40px"
                                        }}
                                    >
                                        No inventory
                                        transactions found.
                                    </td>
                                </tr>
                            ) : (
                                filteredTransactions.map(
                                    (
                                        transaction,
                                        index
                                    ) => (
                                        <tr
                                            key={
                                                transaction.id
                                            }
                                        >
                                            <td>
                                                {index +
                                                    1}
                                            </td>

                                            <td>
                                                {formatDateTime(
                                                    transaction.created_at
                                                )}
                                            </td>

                                            <td>
                                                <div className="product-info">
                                                    <strong>
                                                        {transaction.product_name ||
                                                            transaction
                                                                .product
                                                                ?.name ||
                                                            "Unknown Product"}
                                                    </strong>

                                                    <span>
                                                        {transaction.product_code ||
                                                            transaction
                                                                .product
                                                                ?.product_code ||
                                                            ""}
                                                    </span>
                                                </div>
                                            </td>

                                            <td>
                                                {transaction.category_name ||
                                                    transaction
                                                        .category
                                                        ?.name ||
                                                    "Uncategorized"}
                                            </td>

                                            <td>
                                                <span
                                                    className={`chip ${getTransactionTypeClass(
                                                        transaction.transaction_type
                                                    )}`}
                                                >
                                                    {getTransactionTypeLabel(
                                                        transaction.transaction_type
                                                    )}
                                                </span>
                                            </td>

                                            <td style={{
                                            textAlign:
                                                "center"}}>
                                                {Number(
                                                    transaction.quantity_before
                                                ).toLocaleString()}
                                            </td>

                                            <td>
                                                <span
                                                    className={`chip ${getQuantityChangeClass(
                                                        transaction
                                                    )}`}
                                                >
                                                    {getQuantityChange(
                                                        transaction
                                                    )}
                                                </span>
                                            </td>

                                            <td style={{
                                            textAlign:
                                                "center"}}>
                                                {Number(
                                                    transaction.quantity_after
                                                ).toLocaleString()}
                                            </td>

                                            <td>
                                                {transaction.reference ||
                                                    "—"}
                                            </td>

                                            <td>
                                                {transaction.admin_role || "—"}
                                            </td>
                                        </tr>
                                    )
                                )
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* STOCK ADJUSTMENT MODAL */}
            <Modal
                open={showModal}
                onClose={closeModal}
                title="Stock Adjustment"
            >
                <form onSubmit={handleSubmit}>
                    {modalError && (
                        <div className="alert alert-danger">
                            {modalError}
                        </div>
                    )}

                    <div className="form-grid">
                        <div className="form-group">
                            <label>
                                Transaction Type
                            </label>

                            <select
                                name="transaction_type"
                                className="form-control"
                                value={
                                    form.transaction_type
                                }
                                onChange={
                                    handleFormChange
                                }
                            >
                                <option value="stock_in">
                                    Stock In
                                </option>

                                <option value="stock_out">
                                    Stock Out
                                </option>

                                <option value="adjustment">
                                    Adjustment
                                </option>
                            </select>
                        </div>

                        <div className="form-group">
                            <label>
                                Product
                            </label>

                            <select
                                name="product_id"
                                className="form-control"
                                value={form.product_id}
                                onChange={
                                    handleFormChange
                                }
                            >
                                <option value="">
                                    Select product
                                </option>

                                {products
                                    .filter(
                                        (product) =>
                                            product.status ===
                                            "active"
                                    )
                                    .map(
                                        (product) => (
                                            <option
                                                key={
                                                    product.id
                                                }
                                                value={
                                                    product.id
                                                }
                                            >
                                                {
                                                    product.name
                                                }{" "}
                                                —{" "}
                                                {
                                                    product.product_code
                                                }
                                            </option>
                                        )
                                    )}
                            </select>
                        </div>

                        {selectedProduct && (
                            <div className="form-group">
                                <label>
                                    Current Stock
                                </label>

                                <input
                                    type="text"
                                    className="form-control"
                                    value={`${Number(
                                        selectedProduct.quantity
                                    ).toLocaleString()} ${
                                        selectedProduct.unit ||
                                        "pcs"
                                    }`}
                                    disabled
                                />
                            </div>
                        )}

                        <div className="form-group">
                            <label>
                                Quantity
                            </label>

                            <input
                                type="number"
                                name="quantity"
                                className="form-control"
                                min="0"
                                step="1"
                                value={form.quantity}
                                onChange={
                                    handleFormChange
                                }
                                placeholder="Enter quantity"
                            />

                            {selectedProduct &&
                                form.quantity !==
                                    "" && (
                                    <div className="form-hint">
                                        Resulting stock:{" "}
                                        <strong>
                                            {calculatedStock.toLocaleString()}
                                        </strong>
                                    </div>
                                )}
                        </div>

                        <div className="form-group">
                            <label>Reference</label>

                            <input
                                type="text"
                                className="form-control"
                                placeholder="Generated automatically when saved"
                                disabled
                                readOnly
                            />
                            <span className="form-hint">
                                A unique reference will be assigned to this stock movement.
                            </span>
                        </div>

                        <div className="form-group">
                            <label>
                                Reason
                            </label>

                            <textarea
                                name="reason"
                                className="form-control"
                                value={form.reason}
                                onChange={
                                    handleFormChange
                                }
                                placeholder="Enter reason for this transaction"
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
                                : "Save Transaction"}
                        </button>
                    </div>
                </form>
            </Modal>
        </div>
    );
}

export default Inventory;