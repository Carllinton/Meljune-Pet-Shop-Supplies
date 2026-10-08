import { useEffect, useMemo, useState } from "react";
import api from "../services/api";

function Reports() {
    const [products, setProducts] = useState([]);
    const [categories, setCategories] = useState([]);
    const [stockTransactions, setStockTransactions] = useState([]);
    const [sales, setSales] = useState([]);

    const [filter, setFilter] = useState("all");
    const [categoryFilter, setCategoryFilter] = useState("");
    const [loading, setLoading] = useState(true);
    const [activeSection, setActiveSection] = useState("products");

    const formatPeso = (value) =>
        `₱${Number(value || 0).toLocaleString("en-PH", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        })}`;

    const getQuantity = (product) =>
        Number(product.quantity || 0);

    const getPrice = (product) =>
        Number(product.price || 0);

    const getCostPrice = (product) =>
        Number(product.cost_price || 0);

    const getCategoryId = (product) =>
        product.category_id ??
        product.categoryId ??
        product.category?.id ??
        "";

    const getCategoryName = (product) => {
        if (product.category_name) {
            return String(product.category_name).trim();
        }

        if (product.category?.name) {
            return String(product.category.name).trim();
        }

        if (typeof product.category === "string") {
            return product.category.trim();
        }

        const category = categories.find(
            (c) =>
                String(c.id) ===
                String(getCategoryId(product))
        );

        return category?.name
            ? String(category.name).trim()
            : "—";
    };

    const normalizeCategoryName = (value) =>
        String(value || "")
            .trim()
            .toLowerCase();

    const getExpirationDate = (product) => {
        if (!product.expiration_date) {
            return null;
        }

        const date = new Date(product.expiration_date);

        if (Number.isNaN(date.getTime())) {
            return null;
        }

        return date;
    };

    const getDaysDifference = (date) => {
        if (!date) {
            return null;
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const target = new Date(date);
        target.setHours(0, 0, 0, 0);

        return Math.ceil(
            (target - today) /
                (1000 * 60 * 60 * 24)
        );
    };

    const isExpired = (product) => {
        const date = getExpirationDate(product);

        if (!date) {
            return false;
        }

        return getDaysDifference(date) < 0;
    };

    const isExpiringSoon = (product) => {
        const date = getExpirationDate(product);

        if (!date) {
            return false;
        }

        const days = getDaysDifference(date);

        return days >= 0 && days <= 30;
    };

    const isLowStock = (product) => {
        const quantity = getQuantity(product);

        const threshold = Number(
            product.low_stock_threshold ?? 10
        );

        return (
            quantity > 0 &&
            quantity <= threshold
        );
    };

    const isOutOfStock = (product) => {
        return getQuantity(product) === 0;
    };

    const loadReports = async () => {
        try {
            setLoading(true);

            const [
                productsResponse,
                categoriesResponse,
                salesResponse,
            ] = await Promise.all([
                api.get("/products"),
                api.get("/categories"),
                api.get("/sales"),
            ]);

            const productData =
                productsResponse?.data?.data ??
                productsResponse?.data ??
                [];

            const categoryData =
                categoriesResponse?.data?.data ??
                categoriesResponse?.data ??
                [];

            const salesData =
                salesResponse?.data?.data ??
                salesResponse?.data ??
                [];

            setProducts(
                Array.isArray(productData)
                    ? productData
                    : []
            );

            setCategories(
                Array.isArray(categoryData)
                    ? categoryData
                    : []
            );

            setSales(
                Array.isArray(salesData)
                    ? salesData
                    : []
            );

            try {
                const transactionsResponse =
                    await api.get(
                        "/stock-transactions"
                    );

                const transactionData =
                    transactionsResponse?.data?.data ??
                    transactionsResponse?.data ??
                    [];

                setStockTransactions(
                    Array.isArray(transactionData)
                        ? transactionData
                        : []
                );
            } catch (error) {
                console.error(
                    "Failed to load stock transactions:",
                    error
                );

                setStockTransactions([]);
            }
        } catch (error) {
            console.error(
                "Failed to load reports:",
                error
            );

            setProducts([]);
            setCategories([]);
            setStockTransactions([]);
            setSales([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadReports();
    }, []);

    const activeProducts = useMemo(() => {
        return products.filter(
            (product) =>
                product.status === "active"
        );
    }, [products]);

    /*
     * MAIN REPORT PRODUCTS
     */
    const filteredProducts = useMemo(() => {
        let result = products.filter(
            (product) => product.status === "active"
        );

        if (categoryFilter) {
            result = result.filter(
                (product) =>
                    String(getCategoryId(product)) ===
                    String(categoryFilter)
            );
        }

        switch (filter) {
            case "low_stock":
                result = result.filter(isLowStock);
                break;

            case "out_of_stock":
                result = result.filter(isOutOfStock);
                break;

            case "expired":
                result = result.filter(isExpired);
                break;

            case "expiring":
                result = result.filter(isExpiringSoon);
                break;

            default:
                break;
        }

        /*
        * Sort categories using the same order
        * as the Value by Category section:
        * highest retail value first.
        */
        const categoryRetailValues = {};

        activeProducts.forEach((product) => {
            const categoryName = normalizeCategoryName(
                getCategoryName(product)
            );

            if (!categoryRetailValues[categoryName]) {
                categoryRetailValues[categoryName] = 0;
            }

            categoryRetailValues[categoryName] +=
                getQuantity(product) * getPrice(product);
        });

        result.sort((a, b) => {
            const categoryA = normalizeCategoryName(
                getCategoryName(a)
            );

            const categoryB = normalizeCategoryName(
                getCategoryName(b)
            );

            const retailA =
                categoryRetailValues[categoryA] || 0;

            const retailB =
                categoryRetailValues[categoryB] || 0;

            /*
            * Highest-value categories first.
            */
            if (retailA !== retailB) {
                return retailB - retailA;
            }

            /*
            * Same category:
            * sort products alphabetically.
            */
            return String(a.name || "").localeCompare(
                String(b.name || "")
            );
        });

        /*
        * Special sorting for report types.
        */
        if (filter === "expired") {
            result.sort((a, b) => {
                const dateA = getExpirationDate(a);
                const dateB = getExpirationDate(b);

                return (
                    (dateA?.getTime() || 0) -
                    (dateB?.getTime() || 0)
                );
            });
        }

        if (filter === "expiring") {
            result.sort((a, b) => {
                const daysA = getDaysDifference(
                    getExpirationDate(a)
                );

                const daysB = getDaysDifference(
                    getExpirationDate(b)
                );

                return (
                    (daysA ?? Infinity) -
                    (daysB ?? Infinity)
                );
            });
        }

        if (filter === "low_stock") {
            result.sort(
                (a, b) =>
                    getQuantity(a) -
                    getQuantity(b)
            );
        }

        if (filter === "out_of_stock") {
            result.sort((a, b) =>
                String(a.name || "").localeCompare(
                    String(b.name || "")
                )
            );
        }

        return result;
    }, [
        products,
        categories,
        categoryFilter,
        filter,
    ]);

    /*
     * GRAND TOTALS
     */

    const grandRetail = useMemo(() => {
        return activeProducts.reduce(
            (total, product) =>
                total +
                getQuantity(product) *
                    getPrice(product),
            0
        );
    }, [activeProducts]);

    const grandCost = useMemo(() => {
        return activeProducts.reduce(
            (total, product) =>
                total +
                getQuantity(product) *
                    getCostPrice(product),
            0
        );
    }, [activeProducts]);

    const grandUnits = useMemo(() => {
        return activeProducts.reduce(
            (total, product) =>
                total +
                getQuantity(product),
            0
        );
    }, [activeProducts]);

    /*
     * STOCK ISSUES
     */
    const stockIssues = useMemo(() => {
        return (
            activeProducts.filter(
                isLowStock
            ).length +
            activeProducts.filter(
                isOutOfStock
            ).length
        );
    }, [activeProducts]);

    /*
     * VALUE BY CATEGORY
     */
    const categorySummary = useMemo(() => {
        const summaries = categories.map(
            (category) => {
                const categoryName =
                    String(
                        category.name || ""
                    ).trim();

                const normalizedCategory =
                    normalizeCategoryName(
                        categoryName
                    );

                const categoryProducts =
                    activeProducts.filter(
                        (product) => {
                            const productCategoryId =
                                getCategoryId(
                                    product
                                );

                            if (
                                productCategoryId !==
                                    "" &&
                                productCategoryId !==
                                    null &&
                                productCategoryId !==
                                    undefined &&
                                String(
                                    productCategoryId
                                ) ===
                                    String(
                                        category.id
                                    )
                            ) {
                                return true;
                            }

                            const productCategoryName =
                                normalizeCategoryName(
                                    getCategoryName(
                                        product
                                    )
                                );

                            return (
                                productCategoryName ===
                                normalizedCategory
                            );
                        }
                    );

                const productCount =
                    categoryProducts.length;

                const totalUnits =
                    categoryProducts.reduce(
                        (total, product) =>
                            total +
                            getQuantity(product),
                        0
                    );

                const retailValue =
                    categoryProducts.reduce(
                        (total, product) =>
                            total +
                            getQuantity(product) *
                                getPrice(product),
                        0
                    );

                const costValue =
                    categoryProducts.reduce(
                        (total, product) =>
                            total +
                            getQuantity(product) *
                                getCostPrice(product),
                        0
                    );

                return {
                    ...category,
                    productCount,
                    totalUnits,
                    retailValue,
                    costValue,
                    profit:
                        retailValue -
                        costValue,
                };
            }
        );

        return summaries
            .filter(
                (category) =>
                    category.productCount > 0
            )
            .sort(
                (a, b) =>
                    b.retailValue -
                    a.retailValue
            );
    }, [categories, activeProducts]);

    /*
     * STOCK MOVEMENT
     */
    const movementSummary = useMemo(() => {
        const now = new Date();

        const thirtyDaysAgo =
            new Date(now);

        thirtyDaysAgo.setDate(
            thirtyDaysAgo.getDate() - 30
        );

        const summary = {
            stock_in: {
                quantity: 0,
                transactions: 0,
            },

            stock_out: {
                quantity: 0,
                transactions: 0,
            },

            adjustment: {
                quantity: 0,
                transactions: 0,
            },
        };

        stockTransactions.forEach(
            (transaction) => {
                const dateValue =
                    transaction.created_at ||
                    transaction.date ||
                    transaction.createdAt;

                const transactionDate =
                    dateValue
                        ? new Date(dateValue)
                        : null;

                if (
                    transactionDate &&
                    transactionDate <
                        thirtyDaysAgo
                ) {
                    return;
                }

                const type =
                    transaction.transaction_type ||
                    transaction.type;

                if (!summary[type]) {
                    return;
                }

                summary[type].quantity +=
                    Number(
                        transaction.quantity ||
                            0
                    );

                summary[type].transactions +=
                    1;
            }
        );

        return summary;
    }, [stockTransactions]);

    /*
     * SALES REPORT
     *
     * Sales are read directly from the sales table through
     * GET /sales. The backend already records each completed
     * POS transaction with total, payment method, customer,
     * cashier/admin and created_at.
     */
    const validSales = useMemo(() => {
        return sales.filter((sale) => {
            const total = Number(sale.total || 0);
            const id = sale.id ?? sale.receipt_no;

            return id !== undefined && id !== null && total >= 0;
        });
    }, [sales]);

    const salesSummary = useMemo(() => {
        const now = new Date();

        const startOfToday = new Date(now);
        startOfToday.setHours(0, 0, 0, 0);

        const startOfTomorrow = new Date(startOfToday);
        startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

        let totalRevenue = 0;
        let todayRevenue = 0;
        let todaySales = 0;
        let totalDiscount = 0;

        const paymentMethods = {
            cash: { transactions: 0, revenue: 0 },
            gcash: { transactions: 0, revenue: 0 },
            maya: { transactions: 0, revenue: 0 },
            credit: { transactions: 0, revenue: 0 },
        };

        validSales.forEach((sale) => {
            const total = Number(sale.total || 0);
            const discount = Number(sale.discount || 0);

            totalRevenue += total;
            totalDiscount += discount;

            const dateValue =
                sale.created_at ||
                sale.createdAt ||
                sale.date;

            const saleDate = dateValue
                ? new Date(dateValue)
                : null;

            if (
                saleDate &&
                !Number.isNaN(saleDate.getTime()) &&
                saleDate >= startOfToday &&
                saleDate < startOfTomorrow
            ) {
                todaySales += 1;
                todayRevenue += total;
            }

            const method = String(
                sale.payment_method ||
                sale.paymentMethod ||
                "cash"
            ).toLowerCase();

            if (paymentMethods[method]) {
                paymentMethods[method].transactions += 1;
                paymentMethods[method].revenue += total;
            }
        });

        return {
            transactionCount: validSales.length,
            totalRevenue,
            todaySales,
            todayRevenue,
            totalDiscount,
            averageSale:
                validSales.length > 0
                    ? totalRevenue / validSales.length
                    : 0,
            paymentMethods,
        };
    }, [validSales]);

    const sortedSales = useMemo(() => {
        return [...validSales].sort((a, b) => {
            const dateA = new Date(
                a.created_at ||
                a.createdAt ||
                a.date ||
                0
            ).getTime();

            const dateB = new Date(
                b.created_at ||
                b.createdAt ||
                b.date ||
                0
            ).getTime();

            return dateB - dateA;
        });
    }, [validSales]);

    const formatDateTime = (dateValue) => {
        if (!dateValue) {
            return "—";
        }

        const date = new Date(dateValue);

        if (Number.isNaN(date.getTime())) {
            return "—";
        }

        return date.toLocaleString("en-PH", {
            month: "short",
            day: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
        });
    };

    const formatPaymentMethod = (method) => {
        const value = String(method || "cash").toLowerCase();

        const labels = {
            cash: "Cash",
            gcash: "GCash",
            maya: "Maya",
            credit: "Credit",
        };

        return labels[value] || value;
    };

    const getPaymentChip = (method) => {
        const value = String(method || "cash").toLowerCase();

        if (value === "credit") {
            return "chip-warning";
        }

        if (value === "gcash" || value === "maya") {
            return "chip-info";
        }

        return "chip-success";
    };

    const getCashierName = (sale) => {
        return (
            sale.admin_name ||
            sale.cashier_name ||
            sale.full_name ||
            (sale.admin_id
                ? `Admin #${sale.admin_id}`
                : "—")
        );
    };

    const reportInfo = {
        all: {
            title:
                "All Products Inventory Report",
        },

        low_stock: {
            title:
                "Low Stock Alert Report",
        },

        out_of_stock: {
            title:
                "Out of Stock Report",
        },

        expired: {
            title:
                "Expired Products Report",
        },

        expiring: {
            title:
                "Expiring Soon (Next 30 Days)",
        },
    };

    const currentReport =
        reportInfo[filter] ||
        reportInfo.all;

    const formatDate = (dateValue) => {
        if (!dateValue) {
            return "—";
        }

        const date =
            new Date(dateValue);

        if (
            Number.isNaN(
                date.getTime()
            )
        ) {
            return "—";
        }

        return date.toLocaleDateString(
            "en-US",
            {
                month: "short",
                day: "numeric",
                year: "numeric",
            }
        );
    };

    /*
     * Product status is independent
     * from expiration status.
     */
    const getStatus = (product) => {
        if (
            product.status ===
            "active"
        ) {
            return (
                <span className="chip chip-success">
                    Active
                </span>
            );
        }

        const status =
            String(
                product.status ||
                    "Inactive"
            );

        return (
            <span className="chip chip-muted">
                {status
                    .charAt(0)
                    .toUpperCase() +
                    status.slice(1)}
            </span>
        );
    };

    const getStockChip = (product) => {
        const quantity =
            getQuantity(product);

        if (quantity === 0) {
            return "chip-danger";
        }

        if (isLowStock(product)) {
            return "chip-warning";
        }

        return "chip-success";
    };

    const handlePrint = () => {
        window.print();
    };

    if (loading) {
        return (
            <div className="page-content">
                <div className="page-header">
                    <div className="page-header-left">
                        <h1>Reports</h1>

                        <p>
                            Inventory reports,
                            stock status and
                            movement summaries
                        </p>
                    </div>
                </div>

                <div className="card">
                    <div
                        className="card-body"
                        style={{
                            textAlign:
                                "center",
                            padding:
                                "40px",
                        }}
                    >
                        Loading reports...
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="page-content">
            {/* PAGE HEADER */}
            <div className="page-header no-print">
                <div className="page-header-left">
                    <h1>Reports</h1>

                    <p>
                        Inventory reports,
                        stock status and
                        movement summaries
                    </p>
                </div>

                <div className="page-actions">
                    <button
                        className="btn btn-ghost btn-sm"
                        onClick={loadReports}
                    >
                        Refresh
                    </button>

                    <button
                        className="btn btn-primary btn-sm"
                        onClick={handlePrint}
                    >
                        Print Report
                    </button>
                </div>
            </div>

            {/* REPORT SECTION NAVIGATION */}
            <div className="card no-print" style={{ marginBottom: 20 }}>
                <div className="card-body" style={{ padding: "10px 12px" }}>
                    <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button
                            className={`btn ${activeSection === "category" ? "btn-primary" : "btn-ghost"} btn-sm`}
                            onClick={() => setActiveSection("category")}
                        >
                            Category
                        </button>
                        <button
                            className={`btn ${activeSection === "products" ? "btn-primary" : "btn-ghost"} btn-sm`}
                            onClick={() => setActiveSection("products")}
                        >
                            Products
                        </button>
                        <button
                            className={`btn ${activeSection === "sales" ? "btn-primary" : "btn-ghost"} btn-sm`}
                            onClick={() => setActiveSection("sales")}
                        >
                            Sales
                        </button>
                    </div>
                </div>
            </div>

            {activeSection === "products" && (
                <>
            {/* FILTER BAR */}
            <div
                className="card no-print"
                style={{
                    marginBottom: 20,
                }}
            >
                <div
                    className="card-body"
                    style={{
                        padding:
                            "14px 16px",
                    }}
                >
                    <div className="filter-bar">
                        <select
                            className="form-control"
                            value={filter}
                            onChange={(e) =>
                                setFilter(
                                    e.target.value
                                )
                            }
                            style={{
                                maxWidth:
                                    220,
                            }}
                        >
                            <option value="all">
                                All Products
                            </option>

                            <option value="low_stock">
                                Low Stock
                            </option>

                            <option value="out_of_stock">
                                Out of Stock
                            </option>

                            <option value="expired">
                                Expired
                            </option>

                            <option value="expiring">
                                Expiring Soon
                                (30 days)
                            </option>
                        </select>

                        <select
                            className="form-control"
                            value={
                                categoryFilter
                            }
                            onChange={(e) =>
                                setCategoryFilter(
                                    e.target.value
                                )
                            }
                            style={{
                                maxWidth:
                                    220,
                            }}
                        >
                            <option value="">
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
                                        {
                                            category.name
                                        }
                                    </option>
                                )
                            )}
                        </select>

                        <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => {
                                setFilter(
                                    "all"
                                );
                                setCategoryFilter(
                                    ""
                                );
                            }}
                        >
                            Reset
                        </button>
                    </div>
                </div>
            </div>

            {/* REPORT TITLE */}
            <div
                className="card"
                style={{
                    marginBottom: 20,
                    borderLeft:
                        "4px solid var(--primary)",
                }}
            >
                <div
                    className="card-body"
                    style={{
                        padding:
                            "16px 20px",
                    }}
                >
                    <h2
                        style={{
                            fontSize:
                                "1.1rem",
                            fontWeight:
                                800,
                            marginBottom:
                                4,
                        }}
                    >
                        {currentReport.title}
                    </h2>

                    <p className="text-muted text-sm">
                        Generated on{" "}
                        {new Date().toLocaleDateString(
                            "en-US",
                            {
                                month:
                                    "long",
                                day:
                                    "numeric",
                                year:
                                    "numeric",
                            }
                        )}
                    </p>
                </div>
            </div>

            {/* SUMMARY STATS */}
            <div
                className="stats-grid"
                style={{
                    marginBottom: 20,
                }}
            >
                <div className="stat-card success">

                    <div className="stat-info">
                        <div
                            className="stat-value"
                            style={{
                                fontSize:
                                    "1.3rem",
                            }}
                        >
                            {formatPeso(
                                grandRetail
                            )}
                        </div>

                        <div className="stat-label">
                            Total Retail Value
                        </div>
                    </div>
                </div>

                <div className="stat-card info">

                    <div className="stat-info">
                        <div
                            className="stat-value"
                            style={{
                                fontSize:
                                    "1.3rem",
                            }}
                        >
                            {formatPeso(
                                grandCost
                            )}
                        </div>

                        <div className="stat-label">
                            Total Cost Value
                        </div>
                    </div>
                </div>

                <div className="stat-card primary">

                    <div className="stat-info">
                        <div className="stat-value">
                            {grandUnits.toLocaleString()}
                        </div>

                        <div className="stat-label">
                            Total Units
                        </div>
                    </div>
                </div>

                <div className="stat-card warning">

                    <div className="stat-info">
                        <div className="stat-value">
                            {stockIssues}
                        </div>

                        <div className="stat-label">
                            Stock Issues
                        </div>
                    </div>
                </div>
            </div>
                </>
            )}


            {/* VALUE BY CATEGORY */}
            {activeSection === "category" && filter === "all" && (
                <div
                    className="card"
                    style={{
                        marginBottom: 20,
                    }}
                >
                    <div className="card-header">
                        <span className="card-title">
                            Value by Category
                        </span>
                    </div>

                    <div className="table-wrap">
                        <table>
                            <thead>
                                <tr>
                                    <th>
                                        Category
                                    </th>

                                    <th>
                                        Products
                                    </th>

                                    <th>
                                        Total Units
                                    </th>

                                    <th>
                                        Cost Value
                                    </th>

                                    <th>
                                        Retail Value
                                    </th>

                                    <th>
                                        Potential
                                        Profit
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {categorySummary.map(
                                    (
                                        category
                                    ) => (
                                        <tr
                                            key={
                                                category.id
                                            }
                                        >
                                            <td>
                                                <strong>
                                                    {
                                                        category.name
                                                    }
                                                </strong>
                                            </td>

                                            <td>
                                                {
                                                    category.productCount
                                                }
                                            </td>

                                            <td>
                                                {category.totalUnits.toLocaleString()}
                                            </td>

                                            <td>
                                                {formatPeso(
                                                    category.costValue
                                                )}
                                            </td>

                                            <td>
                                                <strong>
                                                    {formatPeso(
                                                        category.retailValue
                                                    )}
                                                </strong>
                                            </td>

                                            <td>
                                                <strong
                                                    style={{
                                                        color:
                                                            "var(--success)",
                                                    }}
                                                >
                                                    {formatPeso(
                                                        category.profit
                                                    )}
                                                </strong>
                                            </td>
                                        </tr>
                                    )
                                )}
                            </tbody>

                            <tfoot
                                style={{
                                    background:
                                        "var(--surface-2)",
                                    fontWeight:
                                        700,
                                }}
                            >
                                <tr>
                                    <td>
                                        TOTAL
                                    </td>

                                    <td>
                                        {
                                            activeProducts.length
                                        }
                                    </td>

                                    <td>
                                        {grandUnits.toLocaleString()}
                                    </td>

                                    <td>
                                        {formatPeso(
                                            grandCost
                                        )}
                                    </td>

                                    <td
                                        style={{
                                            color:
                                                "var(--primary)",
                                        }}
                                    >
                                        {formatPeso(
                                            grandRetail
                                        )}
                                    </td>

                                    <td
                                        style={{
                                            color:
                                                "var(--success)",
                                        }}
                                    >
                                        {formatPeso(
                                            grandRetail -
                                                grandCost
                                        )}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>
                </div>
            )}

            {/* MAIN REPORT TABLE */}
            {activeSection === "products" && (
                            <div className="card">
                <div className="card-header">
                    <span className="card-title">
                        {currentReport.title} (
                        {
                            filteredProducts.length
                        }{" "}
                        items)
                    </span>
                </div>

                <div className="table-wrap">
                    {filteredProducts.length ===
                    0 ? (
                        <div
                            className="empty-state"
                            style={{
                                padding:
                                    "40px",
                                textAlign:
                                    "center",
                            }}
                        >
                            <p>
                                No products
                                match this
                                report
                                criteria.
                            </p>
                        </div>
                    ) : (
                        <table>
                            <thead>
                                <tr>
                                    <th>
                                        Product
                                        Code
                                    </th>

                                    <th>
                                        Product
                                    </th>

                                    <th>
                                        Brand
                                    </th>

                                    <th>
                                        Category
                                    </th>

                                    <th>
                                        Stock
                                    </th>

                                    {filter ===
                                        "expired" ||
                                    filter ===
                                        "expiring" ? (
                                        <>
                                            <th>
                                                Expiration
                                            </th>

                                            <th>
                                                {filter ===
                                                "expired"
                                                    ? "Days Expired"
                                                    : "Days Left"}
                                            </th>
                                        </>
                                    ) : (
                                        <>
                                            <th>
                                                Unit
                                                Price
                                            </th>

                                            <th>
                                                Cost
                                                Price
                                            </th>

                                            <th>
                                                Retail
                                                Value
                                            </th>
                                        </>
                                    )}

                                    <th>
                                        Status
                                    </th>
                                </tr>
                            </thead>

                            {/* NORMAL REPORT TOTAL */}
                            {filter !== "expired" &&
                                filter !== "expiring" &&
                                filteredProducts.length > 0 && (
                                    <tfoot
                                        style={{
                                            background: "var(--surface-2)",
                                            fontWeight: 700,
                                        }}
                                    >
                                        <tr>
                                            <td colSpan="4">
                                                <strong>
                                                    TOTAL ({filteredProducts.length} items)
                                                </strong>
                                            </td>

                                            <td>
                                                <strong>
                                                    {filteredProducts
                                                        .reduce(
                                                            (total, product) =>
                                                                total +
                                                                getQuantity(product),
                                                            0
                                                        )
                                                        .toLocaleString()}
                                                </strong>
                                            </td>

                                            <td>—</td>

                                            <td>—</td>

                                            <td
                                                className="font-mono"
                                                style={{
                                                    color: "var(--primary)",
                                                }}
                                            >
                                                <strong>
                                                    {formatPeso(
                                                        filteredProducts.reduce(
                                                            (total, product) =>
                                                                total +
                                                                getQuantity(product) *
                                                                    getPrice(product),
                                                            0
                                                        )
                                                    )}
                                                </strong>
                                            </td>

                                            <td>—</td>
                                        </tr>
                                    </tfoot>
                                )}

                            {/* EXPIRED / EXPIRING TOTAL */}
                            {(filter === "expired" ||
                                filter === "expiring") &&
                                filteredProducts.length > 0 && (
                                    <tfoot
                                        style={{
                                            background: "var(--surface-2)",
                                            fontWeight: 700,
                                        }}
                                    >
                                        <tr>
                                            <td colSpan="4">
                                                <strong>
                                                    TOTAL ({filteredProducts.length} items)
                                                </strong>
                                            </td>

                                            <td>
                                                <strong>
                                                    {filteredProducts
                                                        .reduce(
                                                            (total, product) =>
                                                                total +
                                                                getQuantity(product),
                                                            0
                                                        )
                                                        .toLocaleString()}
                                                </strong>
                                            </td>

                                            <td>—</td>

                                            <td>—</td>

                                            <td>—</td>
                                        </tr>
                                    </tfoot>
                                )}

                            <tbody>
                                {filteredProducts.map(
                                    (
                                        product
                                    ) => {
                                        const quantity =
                                            getQuantity(
                                                product
                                            );

                                        const price =
                                            getPrice(
                                                product
                                            );

                                        const costPrice =
                                            getCostPrice(
                                                product
                                            );

                                        const expirationDate =
                                            getExpirationDate(
                                                product
                                            );

                                        const days =
                                            getDaysDifference(
                                                expirationDate
                                            );

                                        return (
                                            <tr
                                                key={
                                                    product.id
                                                }
                                            >
                                                <td className="font-mono text-sm">
                                                    {
                                                        product.product_code
                                                    }
                                                </td>

                                                <td>
                                                    <strong>
                                                        {
                                                            product.name
                                                        }
                                                    </strong>
                                                </td>

                                                <td className="text-muted text-sm">
                                                    {
                                                        product.brand ||
                                                        "—"
                                                    }
                                                </td>

                                                <td>
                                                    <span className="chip chip-muted">
                                                        {getCategoryName(
                                                            product
                                                        )}
                                                    </span>
                                                </td>

                                                <td>
                                                    <span
                                                        className={`chip ${getStockChip(
                                                            product
                                                        )}`}
                                                    >
                                                        {
                                                            quantity
                                                        }{" "}
                                                        {product.unit ||
                                                            ""}
                                                    </span>
                                                </td>

                                                {filter ===
                                                    "expired" ||
                                                filter ===
                                                    "expiring" ? (
                                                    <>
                                                        <td className="font-mono text-sm">
                                                            {formatDate(
                                                                expirationDate
                                                            )}
                                                        </td>

                                                        <td>
                                                            {filter ===
                                                            "expired" ? (
                                                                <span className="chip chip-danger">
                                                                    {Math.abs(
                                                                        days ||
                                                                            0
                                                                    )}{" "}
                                                                    days
                                                                    ago
                                                                </span>
                                                            ) : (
                                                                <span
                                                                    className={`chip ${
                                                                        (days ||
                                                                            0) <=
                                                                        7
                                                                            ? "chip-danger"
                                                                            : "chip-warning"
                                                                    }`}
                                                                >
                                                                    {Math.max(
                                                                        0,
                                                                        days ||
                                                                            0
                                                                    )}{" "}
                                                                    days
                                                                </span>
                                                            )}
                                                        </td>
                                                    </>
                                                ) : (
                                                    <>
                                                        <td className="font-mono">
                                                            {formatPeso(
                                                                price
                                                            )}
                                                        </td>

                                                        <td className="font-mono">
                                                            {formatPeso(
                                                                costPrice
                                                            )}
                                                        </td>

                                                        <td className="font-mono font-bold">
                                                            {formatPeso(
                                                                quantity *
                                                                    price
                                                            )}
                                                        </td>
                                                    </>
                                                )}

                                                <td>
                                                    {getStatus(
                                                        product
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
            )}

            {/* SALES REPORT */}
            {activeSection === "sales" && (
            <div
                className="card"
                style={{
                    marginTop: 20,
                }}
            >
                <div className="card-header">
                    <div>
                        <span className="card-title">
                            Sales Report
                        </span>

                        <div
                            className="text-muted text-sm"
                            style={{ marginTop: 4 }}
                        >
                            Sales recorded from completed POS transactions
                        </div>
                    </div>

                    <span className="chip chip-primary">
                        {salesSummary.transactionCount} transactions
                    </span>
                </div>

                <div className="card-body">
                    <div
                        className="stats-grid"
                        style={{
                            marginBottom: 20,
                        }}
                    >
                        <div className="stat-card success">

                            <div className="stat-info">
                                <div className="stat-value">
                                    {formatPeso(
                                        salesSummary.totalRevenue
                                    )}
                                </div>

                                <div className="stat-label">
                                    Total Revenue
                                </div>
                            </div>
                        </div>

                        <div className="stat-card primary">

                            <div className="stat-info">
                                <div className="stat-value">
                                    {formatPeso(
                                        salesSummary.todayRevenue
                                    )}
                                </div>

                                <div className="stat-label">
                                    Today's Revenue
                                </div>
                            </div>
                        </div>

                        <div className="stat-card info">

                            <div className="stat-info">
                                <div className="stat-value">
                                    {salesSummary.todaySales.toLocaleString()}
                                </div>

                                <div className="stat-label">
                                    Today's Sales
                                </div>
                            </div>
                        </div>

                        <div className="stat-card warning">

                            <div className="stat-info">
                                <div className="stat-value">
                                    {formatPeso(
                                        salesSummary.averageSale
                                    )}
                                </div>

                                <div className="stat-label">
                                    Average Sale
                                </div>
                            </div>
                        </div>
                    </div>

                    <div
                        className="table-wrap"
                        style={{
                            marginBottom: 20,
                        }}
                    >
                        <table>
                            <thead>
                                <tr>
                                    <th>
                                        Payment Method
                                    </th>

                                    <th>
                                        Transactions
                                    </th>

                                    <th>
                                        Revenue
                                    </th>
                                </tr>
                            </thead>

                            <tbody>
                                {Object.entries(
                                    salesSummary.paymentMethods
                                ).map(
                                    ([method, data]) => (
                                        <tr key={method}>
                                            <td>
                                                <span
                                                    className={`chip ${getPaymentChip(
                                                        method
                                                    )}`}
                                                >
                                                    {formatPaymentMethod(
                                                        method
                                                    )}
                                                </span>
                                            </td>

                                            <td>
                                                {data.transactions.toLocaleString()}
                                            </td>

                                            <td className="font-mono font-bold">
                                                {formatPeso(
                                                    data.revenue
                                                )}
                                            </td>
                                        </tr>
                                    )
                                )}
                            </tbody>

                            <tfoot
                                style={{
                                    background:
                                        "var(--surface-2)",
                                    fontWeight: 700,
                                }}
                            >
                                <tr>
                                    <td>
                                        TOTAL
                                    </td>

                                    <td>
                                        {salesSummary.transactionCount.toLocaleString()}
                                    </td>

                                    <td
                                        className="font-mono"
                                        style={{
                                            color:
                                                "var(--primary)",
                                        }}
                                    >
                                        {formatPeso(
                                            salesSummary.totalRevenue
                                        )}
                                    </td>
                                </tr>
                            </tfoot>
                        </table>
                    </div>

                    <div
                        className="table-wrap"
                        style={{
                            maxHeight: 500,
                            overflowY: "auto",
                        }}
                    >
                        {sortedSales.length === 0 ? (
                            <div
                                className="empty-state"
                                style={{
                                    padding: "40px",
                                    textAlign: "center",
                                }}
                            >
                                <p>
                                    No sales have been recorded yet.
                                </p>
                            </div>
                        ) : (
                            <table>
                                <thead>
                                    <tr>
                                        <th>
                                            Receipt #
                                        </th>

                                        <th>
                                            Date / Time
                                        </th>

                                        <th>
                                            Customer
                                        </th>

                                        <th>
                                            Payment
                                        </th>

                                        <th>
                                            Total
                                        </th>

                                        <th>
                                            Cashier
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {sortedSales.map(
                                        (sale) => (
                                            <tr
                                                key={
                                                    sale.id ||
                                                    sale.receipt_no
                                                }
                                            >
                                                <td className="font-mono text-sm">
                                                    {sale.receipt_no ||
                                                        `#${sale.id}`}
                                                </td>

                                                <td className="text-sm">
                                                    {formatDateTime(
                                                        sale.created_at ||
                                                            sale.createdAt ||
                                                            sale.date
                                                    )}
                                                </td>

                                                <td>
                                                    {sale.customer_name ||
                                                        sale.customer ||
                                                        "Walk-in Customer"}
                                                </td>

                                                <td>
                                                    <span
                                                        className={`chip ${getPaymentChip(
                                                            sale.payment_method ||
                                                                sale.paymentMethod
                                                        )}`}
                                                    >
                                                        {formatPaymentMethod(
                                                            sale.payment_method ||
                                                                sale.paymentMethod
                                                        )}
                                                    </span>
                                                </td>

                                                <td className="font-mono font-bold">
                                                    {formatPeso(
                                                        sale.total
                                                    )}
                                                </td>

                                                <td>
                                                    {getCashierName(
                                                        sale
                                                    )}
                                                </td>
                                            </tr>
                                        )
                                    )}
                                </tbody>

                                <tfoot
                                    style={{
                                        background:
                                            "var(--surface-2)",
                                        fontWeight: 700,
                                    }}
                                >
                                    <tr>
                                        <td colSpan="4">
                                            TOTAL
                                        </td>

                                        <td className="font-mono">
                                            {formatPeso(
                                                sortedSales.reduce(
                                                    (sum, sale) =>
                                                        sum +
                                                        Number(
                                                            sale.subtotal ||
                                                                0
                                                        ),
                                                    0
                                                )
                                            )}
                                        </td>

                                        <td
                                            className="font-mono"
                                            style={{
                                                color:
                                                    "var(--primary)",
                                            }}
                                        >
                                            {formatPeso(
                                                salesSummary.totalRevenue
                                            )}
                                        </td>

                                        <td>—</td>
                                    </tr>
                                </tfoot>
                            </table>
                        )}
                    </div>
                </div>
            </div>

            )}

            {/* STOCK MOVEMENT */}
            {activeSection === "products" && (
            <div
                className="card"
                style={{
                    marginTop: 20,
                }}
            >
                <div className="card-header">
                    <span className="card-title">
                        Stock Movement - Last 30
                        Days
                    </span>
                </div>

                <div className="table-wrap">
                    <table>
                        <thead>
                            <tr>
                                <th>
                                    Movement Type
                                </th>

                                <th>
                                    Quantity
                                </th>

                                <th>
                                    Transactions
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            <tr>
                                <td>
                                    <span className="chip chip-success">
                                        Stock In
                                    </span>
                                </td>

                                <td>
                                    {movementSummary
                                        .stock_in
                                        .quantity.toLocaleString()}
                                </td>

                                <td>
                                    {
                                        movementSummary
                                            .stock_in
                                            .transactions
                                    }
                                </td>
                            </tr>

                            <tr>
                                <td>
                                    <span className="chip chip-danger">
                                        Stock Out
                                    </span>
                                </td>

                                <td>
                                    {movementSummary
                                        .stock_out
                                        .quantity.toLocaleString()}
                                </td>

                                <td>
                                    {
                                        movementSummary
                                            .stock_out
                                            .transactions
                                    }
                                </td>
                            </tr>

                            <tr>
                                <td>
                                    <span className="chip chip-warning">
                                        Adjustment
                                    </span>
                                </td>

                                <td>
                                    {movementSummary
                                        .adjustment
                                        .quantity.toLocaleString()}
                                </td>

                                <td>
                                    {
                                        movementSummary
                                            .adjustment
                                            .transactions
                                    }
                                </td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>

            )}

            {/* QUICK REPORTS */}
            {activeSection === "products" && (
            <div
                className="card no-print"
                style={{
                    marginTop: 20,
                }}
            >
                <div className="card-header">
                    <span className="card-title">
                        Quick Reports
                    </span>
                </div>

                <div className="card-body">
                    <div
                        style={{
                            display: "flex",
                            flexWrap:
                                "wrap",
                            gap: 10,
                        }}
                    >
                        <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => {
                                setFilter(
                                    "all"
                                );
                                setCategoryFilter(
                                    ""
                                );
                            }}
                        >
                            All Products
                        </button>

                        <button
                            className="btn btn-ghost btn-sm"
                            onClick={() =>
                                setFilter(
                                    "low_stock"
                                )
                            }
                        >
                            Low Stock
                        </button>

                        <button
                            className="btn btn-ghost btn-sm"
                            onClick={() =>
                                setFilter(
                                    "out_of_stock"
                                )
                            }
                        >
                            Out of Stock
                        </button>

                        <button
                            className="btn btn-ghost btn-sm"
                            onClick={() =>
                                setFilter(
                                    "expired"
                                )
                            }
                        >
                            Expired
                        </button>

                        <button
                            className="btn btn-ghost btn-sm"
                            onClick={() =>
                                setFilter(
                                    "expiring"
                                )
                            }
                        >
                            Expiring Soon
                        </button>

                        <button
                            className="btn btn-primary btn-sm"
                            onClick={
                                handlePrint
                            }
                        >
                            Print This Report
                        </button>
                    </div>
                </div>
            </div>            )}
        </div>
    );
}

export default Reports;