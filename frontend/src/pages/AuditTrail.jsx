import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../services/api";

function AuditTrail() {
    const [transactions, setTransactions] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [typeFilter, setTypeFilter] = useState("all");
    const [categoryFilter, setCategoryFilter] = useState("all");
    const [repackOnly, setRepackOnly] = useState(false);
    const [dateFrom, setDateFrom] = useState("");
    const [dateTo, setDateTo] = useState("");

    // loadData goes here
    const loadData = useCallback(async () => {
        console.log("loadData start");
        try {
            setLoading(true);
            setError("");

            const [transactionRes, categoryRes] = await Promise.all([
                api.get("/stock-transactions"),
                api.get("/categories")
            ]);

            setTransactions(transactionRes.data?.data || []);
            setCategories(categoryRes.data?.data || []);
            console.log("loadData got data");
        } catch (err) {
            console.error("Audit trail loading error:", err);
            setError(
                err.response?.data?.message ||
                    "Failed to load audit trail."
            );
        } finally {
            console.log("loadDatafinally");
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        loadData();
    }, [loadData]);

    // filteredTransactions + summary go here
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
                matchesType &&
                matchesCategory &&
                matchesRepack &&
                matchesFrom &&
                matchesTo
            );
        });
    }, [
        transactions,
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

    // helper functions go here

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

    if (loading) { /* copy loading block from Inventory  */
        return (
            <div className="page-content">
                <div className="page-header">
                    <div className="page-header-left">
                        <h1>Audit Trail</h1>
                        <p>Loading audit trail...</p>
                    </div>
                </div>
            </div>
        );
        
    }

    return (
            <div>
                {/* header, error, summary cards, filters, log table */}
                {/* HEADER */}
                <div className="page-header">
                    <div className="page-header-left">
                        <h1>Audit Trail</h1>
                        <p>
                            Monitor current stock and track
                            inventory movements.
                        </p>
                    </div>

                    <div className="page-actions">
                        
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

                
            </div>

            
        )
}

export default AuditTrail;