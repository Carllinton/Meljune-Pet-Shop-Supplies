import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../services/api";

function Dashboard() {
    const navigate = useNavigate();

    const [dashboard, setDashboard] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // Sales Analytics period selector
    const [salesPeriod, setSalesPeriod] = useState("monthly");

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

    // =========================================
    // FORMATTERS
    // =========================================

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

    // =========================================
    // DASHBOARD DATA
    // =========================================

    const categories = dashboard?.categories || [];
    const lowStock = dashboard?.low_stock || [];
    const recentTransactions =
        dashboard?.recent_transactions || [];

    const monthly = dashboard?.monthly || [];

    // SALES ANALYTICS
    const sales = dashboard?.sales || {};

    const yearlySales = sales.yearly || [];
    const monthlySales = sales.monthly || [];
    const weeklySales = sales.weekly || [];
    const dailySales = sales.daily || [];

    const topSellingProducts =
        sales.top_products || [];

    // =========================================
    // SALES PERIOD DATA
    // =========================================

    const salesChartData = useMemo(() => {
        switch (salesPeriod) {
            case "yearly":
                return yearlySales;

            case "weekly":
                return weeklySales;

            case "daily":
                return dailySales;

            case "monthly":
            default:
                return monthlySales;
        }
    }, [
        salesPeriod,
        yearlySales,
        monthlySales,
        weeklySales,
        dailySales
    ]);

    const salesPeriodLabel = useMemo(() => {
        switch (salesPeriod) {
            case "yearly":
                return "Yearly";

            case "weekly":
                return "Weekly";

            case "daily":
                return "Daily";

            case "monthly":
            default:
                return "Monthly";
        }
    }, [salesPeriod]);

    // =========================================
    // CATEGORY CALCULATIONS
    // =========================================

    const maxCategoryQty = useMemo(() => {
        if (!categories.length) return 1;

        return Math.max(
            ...categories.map((category) =>
                Number(category.total_qty || 0)
            ),
            1
        );
    }, [categories]);

    const categoryTotal = useMemo(() => {
        return categories.reduce(
            (total, category) =>
                total +
                Number(category.product_count || 0),
            0
        );
    }, [categories]);

    // =========================================
    // STOCK MOVEMENT CALCULATIONS
    // =========================================

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

    // =========================================
    // SALES CALCULATIONS
    // =========================================

    const maxSalesRevenue = useMemo(() => {
        if (!salesChartData.length) return 1;

        return Math.max(
            ...salesChartData.map((period) =>
                Number(period.revenue || 0)
            ),
            1
        );
    }, [salesChartData]);

    // =========================================
    // LOADING
    // =========================================

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

    // =========================================
    // ERROR
    // =========================================

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

    // =========================================
    // NO DATA
    // =========================================

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

    // =========================================
    // RENDER
    // =========================================

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
                        onClick={() =>
                            navigate("/reports")
                        }
                    >
                        Reports
                    </button>

                    <button
                        type="button"
                        className="btn btn-primary btn-sm"
                        onClick={() =>
                            navigate("/products")
                        }
                    >
                        Add Product
                    </button>

                </div>
            </div>

            {/* =========================================
                INVENTORY STAT CARDS
            ========================================== */}

            <div className="stats-grid">

                {/* TOTAL PRODUCTS */}
                <div className="stat-card primary">
                    <div className="stat-info">

                        <div className="stat-value">
                            {formatNumber(
                                dashboard.products
                                    .total_products
                            )}
                        </div>

                        <div className="stat-label">
                            Total Products
                        </div>

                    </div>
                </div>

                {/* TOTAL STOCK */}
                <div className="stat-card success">
                    <div className="stat-info">

                        <div className="stat-value">
                            {formatNumber(
                                dashboard.products
                                    .total_stock
                            )}
                        </div>

                        <div className="stat-label">
                            Total Stock Units
                        </div>

                    </div>
                </div>

                {/* LOW STOCK */}
                <div className="stat-card warning">
                    <div className="stat-info">

                        <div className="stat-value">
                            {formatNumber(
                                dashboard.products
                                    .low_stock
                            )}
                        </div>

                        <div className="stat-label">
                            Low Stock Items
                        </div>

                    </div>
                </div>

                {/* OUT OF STOCK */}
                <div className="stat-card danger">
                    <div className="stat-info">

                        <div className="stat-value">
                            {formatNumber(
                                dashboard.products
                                    .out_of_stock
                            )}
                        </div>

                        <div className="stat-label">
                            Out of Stock
                        </div>

                    </div>
                </div>

                {/* CATEGORIES */}
                <div className="stat-card info">
                    <div className="stat-info">

                        <div className="stat-value">
                            {formatNumber(
                                dashboard.products
                                    .total_categories
                            )}
                        </div>

                        <div className="stat-label">
                            Categories
                        </div>

                    </div>
                </div>

                {/* INVENTORY VALUE */}
                <div
                    className="stat-card success"
                    style={{
                        "--primary-light":
                            "var(--success-light)"
                    }}
                >
                    <div className="stat-info">

                        <div
                            className="stat-value"
                            style={{
                                fontSize: "1.3rem"
                            }}
                        >
                            {formatPeso(
                                dashboard.products
                                    .total_value
                            )}
                        </div>

                        <div className="stat-label">
                            Total Inventory Value
                        </div>

                    </div>
                </div>

            </div>

            {/* =========================================
                SALES ANALYTICS
            ========================================== */}

            <div className="card mt-16">

                <div className="card-header">

                    <span className="card-title">
                        Sales Analytics
                    </span>

                    <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        onClick={() =>
                            navigate("/reports")
                        }
                    >
                        View Reports
                    </button>

                </div>

                <div className="card-body">

                    {/* SALES SUMMARY */}

                    <div className="stats-grid">

                        {/* TOTAL SALES */}
                        <div className="stat-card primary">
                            <div className="stat-info">

                                <div className="stat-value">
                                    {formatNumber(
                                        sales.total_sales
                                    )}
                                </div>

                                <div className="stat-label">
                                    Total Sales
                                </div>

                            </div>
                        </div>

                        {/* TOTAL REVENUE */}
                        <div className="stat-card success">
                            <div className="stat-info">

                                <div className="stat-value">
                                    {formatPeso(
                                        sales.total_revenue
                                    )}
                                </div>

                                <div className="stat-label">
                                    Total Revenue
                                </div>

                            </div>
                        </div>

                        {/* AVERAGE SALE */}
                        <div className="stat-card info">
                            <div className="stat-info">

                                <div className="stat-value">
                                    {formatPeso(
                                        sales.average_sale
                                    )}
                                </div>

                                <div className="stat-label">
                                    Average Sale
                                </div>

                            </div>
                        </div>

                        {/* TODAY'S TRANSACTIONS */}
                        <div className="stat-card warning">
                            <div className="stat-info">

                                <div className="stat-value">
                                    {formatNumber(
                                        sales.today_sales
                                    )}
                                </div>

                                <div className="stat-label">
                                    Today's Transactions
                                </div>

                            </div>
                        </div>

                        {/* TODAY'S REVENUE */}
                        <div className="stat-card success">
                            <div className="stat-info">

                                <div className="stat-value">
                                    {formatPeso(
                                        sales.today_revenue
                                    )}
                                </div>

                                <div className="stat-label">
                                    Today's Revenue
                                </div>

                            </div>
                        </div>

                    </div>

                    {/* =========================================
                        SALES CHART + TOP PRODUCTS
                    ========================================== */}

                    <div className="dashboard-sales-layout">

                        {/* SALES REVENUE CHART */}

                        <div className="dashboard-chart-panel sales-revenue-panel">

                            {/* CHART HEADER */}

                            <div
                                style={{
                                    display: "flex",
                                    justifyContent:
                                        "space-between",
                                    alignItems: "center",
                                    gap: "12px",
                                    marginBottom: "18px",
                                    flexWrap: "wrap"
                                }}
                            >

                                <div>
                                    <div
                                        style={{
                                            fontWeight: 700
                                        }}
                                    >
                                        Sales Revenue
                                    </div>

                                    <div
                                        style={{
                                            fontSize: ".78rem",
                                            color:
                                                "var(--text-muted, #5A6376)",
                                            marginTop: "3px"
                                        }}
                                    >
                                        View revenue by{" "}
                                        {salesPeriodLabel.toLowerCase()}
                                    </div>
                                </div>

                                {/* PERIOD SELECTOR */}

                                <div
                                    style={{
                                        display: "flex",
                                        alignItems:
                                            "center",
                                        gap: "8px"
                                    }}
                                >

                                    <label
                                        htmlFor="sales-period"
                                        style={{
                                            fontSize: ".8rem",
                                            fontWeight: 600,
                                            color:
                                                "var(--text-muted, #5A6376)"
                                        }}
                                    >
                                        View by
                                    </label>

                                    <select
                                        id="sales-period"
                                        value={salesPeriod}
                                        onChange={(e) =>
                                            setSalesPeriod(
                                                e.target.value
                                            )
                                        }
                                        style={{
                                            padding:
                                                "7px 10px",
                                            border:
                                                "1px solid var(--border, #D1D5DB)",
                                            borderRadius:
                                                "7px",
                                            background:
                                                "var(--surface, #fff)",
                                            color:
                                                "var(--text, #1F2937)",
                                            fontSize:
                                                ".82rem",
                                            fontWeight:
                                                600,
                                            cursor:
                                                "pointer",
                                            outline:
                                                "none"
                                        }}
                                    >

                                        <option value="yearly">
                                            Yearly
                                        </option>

                                        <option value="monthly">
                                            Monthly
                                        </option>

                                        <option value="weekly">
                                            Weekly
                                        </option>

                                        <option value="daily">
                                            Daily
                                        </option>

                                    </select>

                                </div>

                            </div>

                            {salesChartData.length === 0 ? (

                                <div className="empty-state">
                                    <p>
                                        No sales data available
                                        for this period.
                                    </p>
                                </div>

                            ) : (

                                <div className="sales-chart-with-axis">
                                    <div
                                        className="sales-chart-y-axis"
                                        aria-hidden="true"
                                    >
                                        {[4, 3, 2, 1, 0].map((tick) => (
                                            <span key={tick}>
                                                {formatPeso(
                                                    (maxSalesRevenue * tick) / 4
                                                )}
                                            </span>
                                        ))}
                                    </div>
                                    <div className="sales-chart-scroll">

                                    <div
                                        style={{
                                            minWidth:
                                                salesChartData.length >
                                                12
                                                    ? `${salesChartData.length *
                                                          65}px`
                                                    : "100%"
                                        }}
                                        className="sales-chart-plot"
                                    >

                                        {salesChartData.map(
                                            (
                                                period,
                                                index
                                            ) => {

                                                const revenue =
                                                    Number(
                                                        period.revenue ||
                                                            0
                                                    );

                                                const height =
                                                    (revenue /
                                                        maxSalesRevenue) *
                                                    190;

                                                const label =
                                                    period.period ||
                                                    period.month ||
                                                    period.month_key ||
                                                    "—";

                                                return (
                                                    <div
                                                        key={`${label}-${index}`}
                                                        style={{
                                                            flex:
                                                                salesChartData.length >
                                                                12
                                                                    ? "0 0 44px"
                                                                    : "1 1 0",
                                                            minWidth:
                                                                salesChartData.length >
                                                                12
                                                                    ? "44px"
                                                                    : 0,
                                                        }}
                                                        className="sales-chart-column"
                                                    >

                                                        {/* REVENUE BAR */}

                                                        <div
                                                            title={`${label}: ${formatPeso(
                                                                revenue
                                                            )}`}
                                                            style={{
                                                                height: `${Math.max(
                                                                    revenue >
                                                                        0
                                                                        ? height
                                                                        : 3,
                                                                    3
                                                                )}px`,
                                                            }}
                                                            className="sales-chart-bar"
                                                        />

                                                        {/* PERIOD LABEL */}

                                                        <div
                                                            className="sales-chart-label"
                                                        >
                                                            {label}
                                                        </div>

                                                    </div>
                                                );
                                            }
                                        )}

                                    </div>

                                    </div>
                                </div>
                            )}

                            {/* CHART LEGEND */}

                            {salesChartData.length > 0 && (
                                <div className="dashboard-chart-legend">

                                    <span
                                        style={{
                                            display: "flex",
                                            alignItems:
                                                "center",
                                            gap: "6px"
                                        }}
                                    >

                                        <span
                                            style={{
                                                width: "10px",
                                                height: "10px",
                                                borderRadius:
                                                    "3px",
                                                background:
                                                    "#2D3A8C"
                                            }}
                                        />

                                        Revenue

                                    </span>

                                </div>
                            )}

                        </div>

                        {/* TOP SELLING PRODUCTS */}

                        <div className="dashboard-chart-panel top-products-panel">

                            <div
                                style={{
                                    fontWeight: 700,
                                    marginBottom: "14px"
                                }}
                            >
                                Top Selling Products
                            </div>

                            {topSellingProducts.length ===
                            0 ? (
                                <div className="empty-state">
                                    <p>
                                        No sales yet.
                                    </p>
                                </div>
                            ) : (
                                <div>

                                    {topSellingProducts.map(
                                        (
                                            product,
                                            index
                                        ) => (

                                            <div
                                                key={
                                                    product.id
                                                }
                                                style={{
                                                    display:
                                                        "flex",
                                                    alignItems:
                                                        "center",
                                                    gap: "10px",
                                                    padding:
                                                        "10px 0",
                                                    borderBottom:
                                                        index <
                                                        topSellingProducts.length -
                                                            1
                                                            ? "1px solid var(--border, #E4E8EF)"
                                                            : "none"
                                                }}
                                            >

                                                {/* RANK */}

                                                <div
                                                    style={{
                                                        width: "28px",
                                                        height: "28px",
                                                        borderRadius:
                                                            "50%",
                                                        background:
                                                            "var(--surface-muted, #F1F5F9)",
                                                        display:
                                                            "flex",
                                                        alignItems:
                                                            "center",
                                                        justifyContent:
                                                            "center",
                                                        fontWeight:
                                                            700,
                                                        fontSize:
                                                            ".75rem",
                                                        flexShrink:
                                                            0
                                                    }}
                                                >
                                                    {index +
                                                        1}
                                                </div>

                                                {/* PRODUCT */}

                                                <div
                                                    style={{
                                                        flex: 1,
                                                        minWidth: 0
                                                    }}
                                                >

                                                    <div
                                                        className="truncate"
                                                        style={{
                                                            fontWeight:
                                                                600
                                                        }}
                                                    >
                                                        {
                                                            product.name
                                                        }
                                                    </div>

                                                    <div className="text-muted text-sm">
                                                        {
                                                            product.quantity_sold
                                                        }{" "}
                                                        units
                                                        sold
                                                    </div>

                                                </div>

                                                {/* REVENUE */}

                                                <div
                                                    style={{
                                                        fontWeight:
                                                            700,
                                                        fontSize:
                                                            ".85rem",
                                                        whiteSpace:
                                                            "nowrap"
                                                    }}
                                                >
                                                    {formatPeso(
                                                        product.revenue
                                                    )}
                                                </div>

                                            </div>

                                        )
                                    )}

                                </div>
                            )}

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

                    <div className="stock-chart-body">

                        {monthly.length === 0 ? (
                            <div className="empty-state">
                                <p>
                                    No stock movement data yet.
                                </p>
                            </div>
                        ) : (
                            <div className="stock-chart-with-axis">
                                <div
                                    className="stock-chart-y-axis"
                                    aria-hidden="true"
                                >
                                    {[4, 3, 2, 1, 0].map((tick) => (
                                        <span key={tick}>
                                            {formatNumber(
                                                (maxMonthlyValue * tick) / 4
                                            )}
                                        </span>
                                    ))}
                                </div>
                                <div className="stock-chart-plot">

                                {monthly.map(
                                    (
                                        month,
                                        index
                                    ) => {

                                        const stockIn =
                                            Number(
                                                month.stock_in ||
                                                    0
                                            );

                                        const stockOut =
                                            Number(
                                                month.stock_out ||
                                                    0
                                            );

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
                                                className="stock-chart-column"
                                            >

                                                <div
                                                    className="stock-chart-bars"
                                                >

                                                    {/* STOCK IN */}

                                                    <div
                                                        title={`Stock In: ${stockIn}`}
                                                        className="stock-chart-bar stock-in-bar"
                                                        style={{
                                                            height: `${Math.max(
                                                                stockIn >
                                                                    0
                                                                    ? inHeight
                                                                    : 2,
                                                                2
                                                            )}px`,
                                                        }}
                                                    />

                                                    {/* STOCK OUT */}

                                                    <div
                                                        title={`Stock Out: ${stockOut}`}
                                                        className="stock-chart-bar stock-out-bar"
                                                        style={{
                                                            height: `${Math.max(
                                                                stockOut >
                                                                    0
                                                                    ? outHeight
                                                                    : 2,
                                                                2
                                                            )}px`,
                                                        }}
                                                    />

                                                </div>

                                                <div className="stock-chart-label">
                                                    {
                                                        month.month
                                                    }
                                                </div>

                                            </div>
                                        );
                                    }
                                )}

                            </div>
                            </div>
                        )}

                        {monthly.length > 0 && (
                            <div className="dashboard-chart-legend stock-chart-legend">

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
                                            marginRight:
                                                "6px"
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
                                            marginRight:
                                                "6px"
                                        }}
                                    />

                                    Stock Out

                                </span>

                            </div>
                        )}

                    </div>
                </div>

                {/* RIGHT COLUMN */}

                <div className="dashboard-chart-sidebar">

                    {/* CATEGORY DONUT */}

                    <div className="card chart-card">

                        <div className="card-header">

                            <span className="card-title">
                                ◔ By Category
                            </span>

                        </div>

                        <div className="category-chart-body">

                            {categories.length === 0 ? (
                                <div className="empty-state">
                                    <p>
                                        No categories yet.
                                    </p>
                                </div>
                            ) : (
                                <div className="category-chart-content">

                                    <div
                                        className="category-donut"
                                        style={{
                                            background:
                                                (() => {
                                                    let start =
                                                        0;

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
                                        }}
                                    >

                                        <div
                                            className="category-donut-hole"
                                        >
                                            {categoryTotal}
                                        </div>

                                    </div>

                                    <div className="category-chart-legend">

                                        {categories.map(
                                            (
                                                category,
                                                index
                                            ) => (

                                                <span
                                                    key={
                                                        category.name
                                                    }
                                                    className="category-legend-item"
                                                >

                                                    <span
                                                        className="category-legend-dot"
                                                        style={{
                                                            background: getCategoryColor(
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
                            dashboard.products
                                .expired || 0
                        ) > 0 ||
                        Number(
                            dashboard.products
                                .expiring_soon || 0
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
                                    padding:
                                        "14px 16px"
                                }}
                            >

                                {/* EXPIRED */}

                                {Number(
                                    dashboard.products
                                        .expired || 0
                                ) > 0 && (

                                    <div
                                        style={{
                                            display:
                                                "flex",
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

                                {/* EXPIRING SOON */}

                                {Number(
                                    dashboard.products
                                        .expiring_soon || 0
                                ) > 0 && (

                                    <div
                                        style={{
                                            display:
                                                "flex",
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
                                            Expiring in
                                            30 days

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
                                                            padding: 0,
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
                                                    style={{
                                                        textAlign:
                                                            "center"
                                                    }}
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

                            <p>
                                No category data available.
                            </p>

                        </div>

                    ) : (

                        <div className="grid-2">

                            {categories.map(
                                (
                                    category,
                                    index
                                ) => {

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