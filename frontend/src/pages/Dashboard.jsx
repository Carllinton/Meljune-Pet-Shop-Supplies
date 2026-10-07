import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

function Dashboard() {
    const navigate = useNavigate();

    const [dashboard, setDashboard] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        let cancelled = false;

        api.get("/dashboard")
            .then((response) => {
                if (!cancelled && response.data.success) {
                    setDashboard(response.data.data);
                }
            })
            .catch((err) => {
                if (cancelled) return;

                console.error("Error fetching dashboard:", err);
                setError("Failed to load dashboard data.");
            })
            .finally(() => {
                if (!cancelled) {
                    setLoading(false);
                }
            });

        return () => {
            cancelled = true;
        };
    }, []);

    const formatNumber = (value) => {
        return Number(value || 0).toLocaleString("en-PH");
    };

    const formatPeso = (value) => {
        return `₱${Number(value || 0).toLocaleString("en-PH", {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        })}`;
    };

    const formatDate = (value) => {
        if (!value) return "—";

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return "—";
        }

        return date.toLocaleDateString("en-PH", {
            month: "short",
            day: "2-digit"
        });
    };

    const getCategoryColor = (color, index) => {
        if (color) return color;

        const fallbackColors = [
            "#FF6B35",
            "#2D3A8C",
            "#00C9A7",
            "#10B981",
            "#F59E0B",
            "#EF4444",
            "#8B5CF6",
            "#06B6D4"
        ];

        return fallbackColors[index % fallbackColors.length];
    };

    const categories = dashboard?.categories || [];
    const lowStock = dashboard?.low_stock || [];
    const recentTransactions = dashboard?.recent_transactions || [];
    const monthly = dashboard?.monthly || [];

    const maxCategoryQty = useMemo(() => {
        if (!categories.length) return 1;

        return Math.max(
            ...categories.map((category) =>
                Number(category.total_qty || 0)
            ),
            1
        );
    }, [categories]);

    const maxMonthlyValue = useMemo(() => {
        if (!monthly.length) return 1;

        return Math.max(
            ...monthly.flatMap((month) => [
                Number(month.stock_in || 0),
                Number(month.stock_out || 0)
            ]),
            1
        );
    }, [monthly]);

    const categoryTotal = useMemo(() => {
        return categories.reduce(
            (total, category) =>
                total + Number(category.product_count || 0),
            0
        );
    }, [categories]);

    if (loading) {
        return (
            <div className="page-container">
                <div className="page-header">
                    <div>
                        <h1>Dashboard</h1>
                        <p>Loading dashboard...</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="page-container">
                <div className="page-header">
                    <div>
                        <h1>Dashboard</h1>
                        <p>{error}</p>
                    </div>
                </div>
            </div>
        );
    }

    if (!dashboard) {
        return (
            <div className="page-container">
                <div className="page-header">
                    <div>
                        <h1>Dashboard</h1>
                        <p>No dashboard data available.</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="page-container">

            {/* =========================================
                PAGE HEADER
            ========================================== */}
            <div className="page-header">
                <div>
                    <h1>Dashboard</h1>
                    <p>
                        Welcome back! Here's what's happening today.
                    </p>
                </div>

                <div className="page-actions">
                    <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() => navigate("/reports")}
                    >
                        Reports
                    </button>

                    <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() => navigate("/products")}
                    >
                        Add Product
                    </button>
                </div>
            </div>

            {/* =========================================
                STAT CARDS
            ========================================== */}
            <div className="stats-grid">

                <div className="stat-card primary">

                    <div className="stat-info">
                        <div className="stat-value">
                            {formatNumber(
                                dashboard.products.total_products
                            )}
                        </div>

                        <div className="stat-label">
                            Total Products
                        </div>
                    </div>
                </div>

                <div className="stat-card success">

                    <div className="stat-info">
                        <div className="stat-value">
                            {formatNumber(
                                dashboard.products.total_stock
                            )}
                        </div>

                        <div className="stat-label">
                            Total Stock Units
                        </div>
                    </div>
                </div>

                <div className="stat-card warning">

                    <div className="stat-info">
                        <div className="stat-value">
                            {formatNumber(
                                dashboard.products.low_stock
                            )}
                        </div>

                        <div className="stat-label">
                            Low Stock Items
                        </div>
                    </div>
                </div>

                <div className="stat-card danger">

                    <div className="stat-info">
                        <div className="stat-value">
                            {formatNumber(
                                dashboard.products.out_of_stock
                            )}
                        </div>

                        <div className="stat-label">
                            Out of Stock
                        </div>
                    </div>
                </div>

                <div className="stat-card info">

                    <div className="stat-info">
                        <div className="stat-value">
                            {formatNumber(
                                dashboard.products.total_categories
                            )}
                        </div>

                        <div className="stat-label">
                            Categories
                        </div>
                    </div>
                </div>

                <div
                    className="stat-card success"
                    style={{
                        "--primary-light": "var(--success-light)"
                    }}
                >
                    <div className="stat-info">
                        <div
                            className="stat-value"
                            style={{ fontSize: "1.3rem" }}
                        >
                            {formatPeso(
                                dashboard.products.total_value
                            )}
                        </div>

                        <div className="stat-label">
                            Total Inventory Value
                        </div>
                    </div>
                </div>

            </div>

            {/* =========================================
                CHARTS + ALERTS
            ========================================== */}
            <div className="dashboard-grid">

                {/* STOCK MOVEMENT */}
                <div className="card chart-card">
                    <div className="card-header">
                        <span className="card-title">
                            Stock Movement (Last 6 Months)
                        </span>
                    </div>

                    <div
                        style={{
                            minHeight: "280px",
                            padding: "24px"
                        }}
                    >
                        {monthly.length === 0 ? (
                            <div className="empty-state">
                                <p>No stock movement data yet.</p>
                            </div>
                        ) : (
                            <div
                                style={{
                                    height: "240px",
                                    display: "flex",
                                    alignItems: "stretch",
                                    gap: "18px",
                                    borderBottom:
                                        "1px solid var(--border, #E4E8EF)",
                                    paddingTop: "10px"
                                }}
                            >
                                {monthly.map((month, index) => {
                                    const stockIn =
                                        Number(month.stock_in || 0);

                                    const stockOut =
                                        Number(month.stock_out || 0);

                                    const inHeight =
                                        (stockIn /
                                            maxMonthlyValue) *
                                        190;

                                    const outHeight =
                                        (stockOut /
                                            maxMonthlyValue) *
                                        190;

                                    return (
                                        <div
                                            key={`${month.month}-${index}`}
                                            style={{
                                                flex: 1,
                                                minWidth: 0,
                                                display: "flex",
                                                flexDirection:
                                                    "column",
                                                justifyContent:
                                                    "flex-end",
                                                alignItems:
                                                    "center"
                                            }}
                                        >
                                            <div
                                                style={{
                                                    display: "flex",
                                                    alignItems:
                                                        "flex-end",
                                                    justifyContent:
                                                        "center",
                                                    gap: "5px",
                                                    height: "200px",
                                                    width: "100%"
                                                }}
                                            >
                                                <div
                                                    title={`Stock In: ${stockIn}`}
                                                    style={{
                                                        width: "18px",
                                                        maxWidth: "45%",
                                                        height: `${Math.max(
                                                            stockIn > 0
                                                                ? inHeight
                                                                : 2,
                                                            2
                                                        )}px`,
                                                        background:
                                                            "#10B981",
                                                        borderRadius:
                                                            "6px 6px 0 0",
                                                        transition:
                                                            "height .2s"
                                                    }}
                                                />

                                                <div
                                                    title={`Stock Out: ${stockOut}`}
                                                    style={{
                                                        width: "18px",
                                                        maxWidth: "45%",
                                                        height: `${Math.max(
                                                            stockOut > 0
                                                                ? outHeight
                                                                : 2,
                                                            2
                                                        )}px`,
                                                        background:
                                                            "#EF4444",
                                                        borderRadius:
                                                            "6px 6px 0 0",
                                                        transition:
                                                            "height .2s"
                                                    }}
                                                />
                                            </div>

                                            <div
                                                style={{
                                                    marginTop: "8px",
                                                    fontSize:
                                                        ".75rem",
                                                    color:
                                                        "var(--text-muted, #5A6376)",
                                                    textAlign:
                                                        "center",
                                                    whiteSpace:
                                                        "nowrap"
                                                }}
                                            >
                                                {month.month}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        )}

                        {monthly.length > 0 && (
                            <div
                                style={{
                                    display: "flex",
                                    justifyContent:
                                        "center",
                                    gap: "22px",
                                    marginTop: "14px",
                                    fontSize: ".8rem"
                                }}
                            >
                                <span>
                                    <span
                                        style={{
                                            display:
                                                "inline-block",
                                            width: "10px",
                                            height: "10px",
                                            borderRadius:
                                                "3px",
                                            background:
                                                "#10B981",
                                            marginRight: "6px"
                                        }}
                                    />
                                    Stock In
                                </span>

                                <span>
                                    <span
                                        style={{
                                            display:
                                                "inline-block",
                                            width: "10px",
                                            height: "10px",
                                            borderRadius:
                                                "3px",
                                            background:
                                                "#EF4444",
                                            marginRight: "6px"
                                        }}
                                    />
                                    Stock Out
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* RIGHT COLUMN */}
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "16px"
                    }}
                >

                    {/* CATEGORY DONUT */}
                    <div className="card chart-card">
                        <div className="card-header">
                            <span className="card-title">
                                ◔ By Category
                            </span>
                        </div>

                        <div
                            style={{
                                minHeight: "200px",
                                padding: "18px"
                            }}
                        >
                            {categories.length === 0 ? (
                                <div className="empty-state">
                                    <p>No categories yet.</p>
                                </div>
                            ) : (
                                <div
                                    style={{
                                        display: "flex",
                                        flexDirection:
                                            "column",
                                        alignItems:
                                            "center",
                                        gap: "16px"
                                    }}
                                >
                                    <div
                                        style={{
                                            width: "150px",
                                            height: "150px",
                                            borderRadius:
                                                "50%",
                                            background:
                                                (() => {
                                                    let start = 0;

                                                    return `conic-gradient(${categories
                                                        .map(
                                                            (
                                                                category,
                                                                index
                                                            ) => {
                                                                const value =
                                                                    Number(
                                                                        category.product_count ||
                                                                            0
                                                                    );

                                                                const percentage =
                                                                    categoryTotal >
                                                                    0
                                                                        ? (value /
                                                                              categoryTotal) *
                                                                          100
                                                                        : 0;

                                                                const color =
                                                                    getCategoryColor(
                                                                        category.color,
                                                                        index
                                                                    );

                                                                const end =
                                                                    start +
                                                                    percentage;

                                                                const part = `${color} ${start}% ${end}%`;

                                                                start =
                                                                    end;

                                                                return part;
                                                            }
                                                        )
                                                        .join(", ")})`;
                                                })(),
                                            display: "flex",
                                            alignItems:
                                                "center",
                                            justifyContent:
                                                "center"
                                        }}
                                    >
                                        <div
                                            style={{
                                                width: "82px",
                                                height: "82px",
                                                borderRadius:
                                                    "50%",
                                                background:
                                                    "var(--surface, #fff)",
                                                display: "flex",
                                                alignItems:
                                                    "center",
                                                justifyContent:
                                                    "center",
                                                fontWeight: 700,
                                                fontSize:
                                                    "1.2rem"
                                            }}
                                        >
                                            {categoryTotal}
                                        </div>
                                    </div>

                                    <div
                                        style={{
                                            display: "flex",
                                            flexWrap:
                                                "wrap",
                                            justifyContent:
                                                "center",
                                            gap: "8px 14px"
                                        }}
                                    >
                                        {categories.map(
                                            (
                                                category,
                                                index
                                            ) => (
                                                <span
                                                    key={
                                                        category.name
                                                    }
                                                    style={{
                                                        fontSize:
                                                            ".72rem",
                                                        display:
                                                            "flex",
                                                        alignItems:
                                                            "center",
                                                        gap: "5px"
                                                    }}
                                                >
                                                    <span
                                                        style={{
                                                            width: "9px",
                                                            height: "9px",
                                                            borderRadius:
                                                                "3px",
                                                            background:
                                                                getCategoryColor(
                                                                    category.color,
                                                                    index
                                                                )
                                                        }}
                                                    />

                                                    {
                                                        category.name
                                                    }
                                                </span>
                                            )
                                        )}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* EXPIRY ALERTS */}
                    {(
                        Number(
                            dashboard.products.expired || 0
                        ) > 0 ||
                        Number(
                            dashboard.products.expiring_soon ||
                                0
                        ) > 0
                    ) && (
                        <div className="card">
                            <div className="card-header">
                                <span
                                    className="card-title"
                                    style={{
                                        color:
                                            "var(--danger)"
                                    }}
                                >
                                    ◷ Expiry Alerts
                                </span>
                            </div>

                            <div
                                style={{
                                    padding: "14px 16px"
                                }}
                            >
                                {Number(
                                    dashboard.products.expired ||
                                        0
                                ) > 0 && (
                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems:
                                                "center",
                                            gap: "8px",
                                            marginBottom:
                                                "8px"
                                        }}
                                    >
                                        <span className="chip chip-danger">
                                            {
                                                dashboard
                                                    .products
                                                    .expired
                                            }{" "}
                                            Expired
                                        </span>

                                        <button
                                            type="button"
                                            className="btn btn-ghost btn-sm"
                                            style={{
                                                color:
                                                    "var(--danger)"
                                            }}
                                            onClick={() =>
                                                navigate(
                                                    "/reports"
                                                )
                                            }
                                        >
                                            View →
                                        </button>
                                    </div>
                                )}

                                {Number(
                                    dashboard.products
                                        .expiring_soon || 0
                                ) > 0 && (
                                    <div
                                        style={{
                                            display: "flex",
                                            alignItems:
                                                "center",
                                            gap: "8px"
                                        }}
                                    >
                                        <span className="chip chip-warning">
                                            {
                                                dashboard
                                                    .products
                                                    .expiring_soon
                                            }{" "}
                                            Expiring in 30
                                            days
                                        </span>

                                        <button
                                            type="button"
                                            className="btn btn-ghost btn-sm"
                                            style={{
                                                color:
                                                    "var(--warning)"
                                            }}
                                            onClick={() =>
                                                navigate(
                                                    "/reports"
                                                )
                                            }
                                        >
                                            View →
                                        </button>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                </div>
            </div>

            {/* =========================================
                LOW STOCK + RECENT ACTIVITY
            ========================================== */}
            <div className="grid-2 mt-16">

                {/* LOW STOCK */}
                <div className="card">
                    <div className="card-header">
                        <span className="card-title">
                            Low Stock Alert
                        </span>

                        <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() =>
                                navigate("/inventory")
                            }
                        >
                            View All
                        </button>
                    </div>

                    <div className="table-wrap">
                        {lowStock.length === 0 ? (
                            <div className="empty-state">
                                <div
                                    style={{
                                        color:
                                            "var(--success)"
                                    }}
                                >
                                    ✓
                                </div>

                                <p>
                                    All products are
                                    well-stocked!
                                </p>
                            </div>
                        ) : (
                            <table>
                                <thead>
                                    <tr>
                                        <th>Product</th>
                                        <th>Category</th>
                                        <th>Stock</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {lowStock.map(
                                        (product) => (
                                            <tr
                                                key={
                                                    product.id
                                                }
                                            >
                                                <td>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            navigate(
                                                                `/products?edit=${product.id}`
                                                            )
                                                        }
                                                        style={{
                                                            border:
                                                                "none",
                                                            background:
                                                                "none",
                                                            padding:
                                                                0,
                                                            fontWeight:
                                                                600,
                                                            color:
                                                                "var(--primary)",
                                                            cursor:
                                                                "pointer",
                                                            textAlign:
                                                                "left"
                                                        }}
                                                    >
                                                        {
                                                            product.name
                                                        }
                                                    </button>
                                                </td>

                                                <td>
                                                    <span className="chip chip-muted">
                                                        {
                                                            product.category
                                                        }
                                                    </span>
                                                </td>

                                                <td 
                                                    className={`font-mono ${
                                                        Number(
                                                            product.quantity
                                                        ) ===
                                                        0
                                                            ? "text-danger"
                                                            : "text-warning"
                                                    }`}
                                                    style={{ textAlign: "center" }}
                                                >
                                                    {
                                                        product.quantity
                                                    }
                                                </td>

                                                <td>
                                                    {Number(
                                                        product.quantity
                                                    ) ===
                                                    0 ? (
                                                        <span className="chip chip-danger">
                                                            Out of
                                                            Stock
                                                        </span>
                                                    ) : (
                                                        <span className="chip chip-warning">
                                                            Low
                                                            Stock
                                                        </span>
                                                    )}
                                                </td>
                                            </tr>
                                        )
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

                {/* RECENT TRANSACTIONS */}
                <div className="card">
                    <div className="card-header">
                        <span className="card-title">
                            Recent Transactions
                        </span>

                        <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() =>
                                navigate("/inventory")
                            }
                        >
                            View All
                        </button>
                    </div>

                    <div className="table-wrap">
                        {recentTransactions.length ===
                        0 ? (
                            <div className="empty-state">
                                <p>
                                    No transactions yet.
                                </p>
                            </div>
                        ) : (
                            <table>
                                <thead>
                                    <tr>
                                        <th>Product</th>
                                        <th>Type</th>
                                        <th>Qty</th>
                                        <th>Date</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {recentTransactions.map(
                                        (transaction) => {
                                            const type =
                                                transaction.transaction_type;

                                            const isIn =
                                                type ===
                                                "stock_in";

                                            const isOut =
                                                type ===
                                                "stock_out";

                                            return (
                                                <tr
                                                    key={
                                                        transaction.id
                                                    }
                                                >
                                                    <td
                                                        className="truncate"
                                                        style={{
                                                            maxWidth:
                                                                "150px"
                                                        }}
                                                    >
                                                        {
                                                            transaction.product_name
                                                        }
                                                    </td>

                                                    <td>
                                                        {isIn ? (
                                                            <span className="chip chip-success">
                                                                IN
                                                            </span>
                                                        ) : isOut ? (
                                                            <span className="chip chip-danger">
                                                                OUT
                                                            </span>
                                                        ) : (
                                                            <span className="chip chip-info">
                                                                ADJ
                                                            </span>
                                                        )}
                                                    </td>

                                                    <td className="font-mono">
                                                        {isIn
                                                            ? "+"
                                                            : "-"}
                                                        {
                                                            transaction.quantity
                                                        }
                                                    </td>

                                                    <td className="text-muted text-sm">
                                                        {formatDate(
                                                            transaction.created_at
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        }
                                    )}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>

            </div>

            {/* =========================================
                CATEGORY STOCK OVERVIEW
            ========================================== */}
            <div className="card mt-16">
                <div className="card-header">
                    <span className="card-title">
                        Category Stock Overview
                    </span>
                </div>

                <div className="card-body">
                    {categories.length === 0 ? (
                        <div className="empty-state">
                            <p>No category data available.</p>
                        </div>
                    ) : (
                        <div className="grid-2">
                            {categories.map(
                                (category, index) => {
                                    const quantity =
                                        Number(
                                            category.total_qty ||
                                                0
                                        );

                                    const percentage =
                                        maxCategoryQty >
                                        0
                                            ? Math.round(
                                                  (quantity /
                                                      maxCategoryQty) *
                                                      100
                                              )
                                            : 0;

                                    return (
                                        <div
                                            key={
                                                category.name
                                            }
                                            style={{
                                                marginBottom:
                                                    "12px"
                                            }}
                                        >
                                            <div
                                                style={{
                                                    display:
                                                        "flex",
                                                    justifyContent:
                                                        "space-between",
                                                    alignItems:
                                                        "center",
                                                    marginBottom:
                                                        "4px"
                                                }}
                                            >
                                                <span className="text-sm font-bold">
                                                    {
                                                        category.name
                                                    }
                                                </span>

                                                <span className="text-sm text-muted">
                                                    {formatNumber(
                                                        quantity
                                                    )}{" "}
                                                    units
                                                </span>
                                            </div>

                                            <div className="progress-bar">
                                                <div
                                                    className="progress-fill"
                                                    style={{
                                                        width: `${percentage}%`,
                                                        background:
                                                            getCategoryColor(
                                                                category.color,
                                                                index
                                                            )
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    );
                                }
                            )}
                        </div>
                    )}
                </div>
            </div>

        </div>
    );
}

export default Dashboard;
