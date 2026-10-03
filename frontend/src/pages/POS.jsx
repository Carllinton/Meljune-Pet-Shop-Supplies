import { useEffect, useMemo, useState } from "react";
import api from "../services/api";

const ADMIN_ID = 1;

const EMPTY_PAYMENT = {
    paymentMethod: "cash",
    customerId: "",
    amountTendered: "",
    discount: "",
    note: "",
};

function POS() {
    const [products, setProducts] = useState([]);
    const [customers, setCustomers] = useState([]);

    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState(false);

    const [search, setSearch] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("all");

    const [cart, setCart] = useState([]);

    const [payment, setPayment] = useState(EMPTY_PAYMENT);

    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const [receipt, setReceipt] = useState(null);

    // =========================================================
    // LOAD DATA
    // =========================================================

    useEffect(() => {
        loadPOSData();
    }, []);

    const loadPOSData = async () => {
        try {
            setLoading(true);
            setError("");

            const [productsResponse, customersResponse] =
                await Promise.all([
                    api.get("/products"),
                    api.get("/customers"),
                ]);

            const productData =
                productsResponse?.data?.data ||
                productsResponse?.data ||
                [];

            const customerData =
                customersResponse?.data?.data ||
                customersResponse?.data ||
                [];

            setProducts(Array.isArray(productData) ? productData : []);
            setCustomers(Array.isArray(customerData) ? customerData : []);
        } catch (err) {
            console.error("Error loading POS:", err);

            setError(
                err?.response?.data?.message ||
                "Failed to load POS data."
            );
        } finally {
            setLoading(false);
        }
    };

    // =========================================================
    // CATEGORIES
    // =========================================================

    const categories = useMemo(() => {
        const categoryMap = new Map();

        products.forEach((product) => {
            const id =
                product.category_id ??
                product.categoryId ??
                null;

            const name =
                product.category_name ||
                product.category ||
                "Uncategorized";

            if (!categoryMap.has(id)) {
                categoryMap.set(id, {
                    id,
                    name,
                });
            }
        });

        return Array.from(categoryMap.values());
    }, [products]);

    // =========================================================
    // FILTER PRODUCTS
    // =========================================================

    const filteredProducts = useMemo(() => {
        const keyword = search.trim().toLowerCase();

        return products.filter((product) => {
            const matchesSearch =
                !keyword ||
                String(product.name || "")
                    .toLowerCase()
                    .includes(keyword) ||
                String(product.product_code || "")
                    .toLowerCase()
                    .includes(keyword) ||
                String(product.brand || "")
                    .toLowerCase()
                    .includes(keyword);

            const productCategoryId =
                product.category_id ??
                product.categoryId ??
                null;

            const matchesCategory =
                selectedCategory === "all" ||
                String(productCategoryId) ===
                    String(selectedCategory);

            return matchesSearch && matchesCategory;
        });
    }, [products, search, selectedCategory]);

    // =========================================================
    // CART TOTALS
    // =========================================================

    const subtotal = useMemo(() => {
        return cart.reduce((sum, item) => {
            return (
                sum +
                Number(item.price || 0) *
                    Number(item.quantity || 0)
            );
        }, 0);
    }, [cart]);

    const discount = Math.max(
        0,
        Number(payment.discount || 0)
    );

    const total = Math.max(
        0,
        subtotal - discount
    );

    const amountTendered = Number(
        payment.amountTendered || 0
    );

    const change =
        payment.paymentMethod === "credit"
            ? 0
            : Math.max(
                  0,
                  amountTendered - total
              );

    // =========================================================
    // FORMAT
    // =========================================================

    const formatPeso = (value) => {
        return `₱${Number(value || 0).toLocaleString(
            "en-PH",
            {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
            }
        )}`;
    };

    // =========================================================
    // ADD TO CART
    // =========================================================

    const addToCart = (product) => {
        setError("");
        setSuccess("");

        const stock = Number(product.quantity || 0);

        if (stock <= 0) {
            setError(
                `"${product.name}" is out of stock.`
            );
            return;
        }

        if (product.status !== "active") {
            setError(
                `"${product.name}" is not active.`
            );
            return;
        }

        setCart((currentCart) => {
            const existing = currentCart.find(
                (item) =>
                    Number(item.id) ===
                    Number(product.id)
            );

            if (existing) {
                if (
                    Number(existing.quantity) >=
                    stock
                ) {
                    setError(
                        `Only ${stock} unit(s) of "${product.name}" are available.`
                    );

                    return currentCart;
                }

                return currentCart.map((item) =>
                    Number(item.id) ===
                    Number(product.id)
                        ? {
                              ...item,
                              quantity:
                                  Number(
                                      item.quantity
                                  ) + 1,
                          }
                        : item
                );
            }

            return [
                ...currentCart,
                {
                    ...product,
                    quantity: 1,
                },
            ];
        });
    };

    // =========================================================
    // CHANGE CART QUANTITY
    // =========================================================

    const changeQuantity = (productId, amount) => {
        setError("");

        setCart((currentCart) =>
            currentCart
                .map((item) => {
                    if (
                        Number(item.id) !==
                        Number(productId)
                    ) {
                        return item;
                    }

                    const product = products.find(
                        (p) =>
                            Number(p.id) ===
                            Number(productId)
                    );

                    const availableStock = Number(
                        product?.quantity || 0
                    );

                    const newQuantity =
                        Number(item.quantity) +
                        amount;

                    if (newQuantity <= 0) {
                        return null;
                    }

                    if (
                        newQuantity >
                        availableStock
                    ) {
                        setError(
                            `Only ${availableStock} unit(s) of "${item.name}" are available.`
                        );

                        return item;
                    }

                    return {
                        ...item,
                        quantity: newQuantity,
                    };
                })
                .filter(Boolean)
        );
    };

    // =========================================================
    // REMOVE ITEM
    // =========================================================

    const removeFromCart = (productId) => {
        setCart((currentCart) =>
            currentCart.filter(
                (item) =>
                    Number(item.id) !==
                    Number(productId)
            )
        );
    };

    // =========================================================
    // CLEAR CART
    // =========================================================

    const clearCart = () => {
        setCart([]);
        setPayment(EMPTY_PAYMENT);
        setError("");
        setSuccess("");
    };

    // =========================================================
    // PAYMENT METHOD
    // =========================================================

    const handlePaymentMethod = (method) => {
        setError("");

        setPayment((current) => ({
            ...current,
            paymentMethod: method,
            customerId:
                method === "credit"
                    ? current.customerId
                    : "",
            amountTendered:
                method === "credit"
                    ? ""
                    : current.amountTendered,
        }));
    };

    // =========================================================
    // DISCOUNT
    // =========================================================

    const handleDiscountChange = (value) => {
        const numericValue = Number(value);

        if (numericValue < 0) {
            return;
        }

        if (numericValue > subtotal) {
            setError(
                "Discount cannot exceed the subtotal."
            );
        } else {
            setError("");
        }

        setPayment((current) => ({
            ...current,
            discount: value,
        }));
    };

    // =========================================================
    // COMPLETE SALE
    // =========================================================

    const completeSale = async () => {
        setError("");
        setSuccess("");

        // -----------------------------------------
        // CART VALIDATION
        // -----------------------------------------

        if (cart.length === 0) {
            setError(
                "Please add at least one product."
            );
            return;
        }

        // -----------------------------------------
        // DISCOUNT VALIDATION
        // -----------------------------------------

        if (discount > subtotal) {
            setError(
                "Discount cannot exceed the subtotal."
            );
            return;
        }

        // -----------------------------------------
        // CREDIT CUSTOMER VALIDATION
        // -----------------------------------------

        if (
            payment.paymentMethod === "credit" &&
            !payment.customerId
        ) {
            setError(
                "Please select a customer for credit sales."
            );
            return;
        }

        // -----------------------------------------
        // CASH / GCASH / MAYA VALIDATION
        // -----------------------------------------

        if (
            payment.paymentMethod !== "credit"
        ) {
            if (
                !payment.amountTendered ||
                amountTendered <= 0
            ) {
                setError(
                    "Please enter the amount tendered."
                );
                return;
            }

            if (amountTendered < total) {
                setError(
                    `Insufficient payment. Total is ${formatPeso(
                        total
                    )}.`
                );
                return;
            }
        }

        try {
            setProcessing(true);

            // -------------------------------------
            // EXACT PAYLOAD EXPECTED BY BACKEND
            // -------------------------------------

            const payload = {
                customer_id:
                    payment.paymentMethod ===
                    "credit"
                        ? Number(
                              payment.customerId
                          )
                        : null,

                admin_id: ADMIN_ID,

                payment_method:
                    payment.paymentMethod,

                amount_tendered:
                    payment.paymentMethod ===
                    "credit"
                        ? 0
                        : amountTendered,

                discount: discount,

                note:
                    payment.note.trim() ||
                    null,

                items: cart.map((item) => ({
                    product_id: Number(item.id),
                    quantity: Number(
                        item.quantity
                    ),
                })),
            };

            const response = await api.post(
                "/sales",
                payload
            );

            if (!response?.data?.success) {
                throw new Error(
                    response?.data?.message ||
                        "Failed to complete sale."
                );
            }

            const saleData =
                response.data.data;

            // -------------------------------------
            // SAVE RECEIPT FOR MODAL
            // -------------------------------------

            setReceipt({
                ...saleData,
                items: saleData.items || [],
            });

            setSuccess(
                "Sale completed successfully."
            );

            // -------------------------------------
            // CLEAR CART
            // -------------------------------------

            setCart([]);

            setPayment(EMPTY_PAYMENT);

            // -------------------------------------
            // REFRESH PRODUCTS
            // -------------------------------------

            try {
                const productsResponse =
                    await api.get("/products");

                const refreshedProducts =
                    productsResponse?.data?.data ||
                    productsResponse?.data ||
                    [];

                if (
                    Array.isArray(
                        refreshedProducts
                    )
                ) {
                    setProducts(
                        refreshedProducts
                    );
                }
            } catch (refreshError) {
                console.error(
                    "Failed to refresh products:",
                    refreshError
                );
            }
        } catch (err) {
            console.error(
                "Error completing sale:",
                err
            );

            setError(
                err?.response?.data?.message ||
                    err?.message ||
                    "Failed to complete sale."
            );
        } finally {
            setProcessing(false);
        }
    };

    // =========================================================
    // CLOSE RECEIPT
    // =========================================================

    const closeReceipt = () => {
        setReceipt(null);
        setSuccess("");
    };

    // =========================================================
    // LOADING
    // =========================================================

    if (loading) {
        return (
            <div className="page-content">
                <div className="card">
                    <div
                        className="card-body"
                        style={{
                            padding: "40px",
                            textAlign: "center",
                        }}
                    >
                        Loading POS...
                    </div>
                </div>
            </div>
        );
    }

    // =========================================================
    // RENDER
    // =========================================================

    return (
        <>
            <div
                className="page-content"
                style={{
                    padding: "24px",
                    minHeight: "calc(100vh - 70px)",
                    overflow: "visible",
                }}
            >
                {/* ==========================================
                    PAGE HEADER
                ========================================== */}

                <div className="page-header">
                    <div className="page-header-left">
                        <h1>Point of Sale</h1>

                        <p>
                            Process sales and manage
                            customer payments
                        </p>
                    </div>
                </div>

                {/* ==========================================
                    ERROR
                ========================================== */}

                {error && (
                    <div
                        className="alert alert-danger"
                        style={{
                            marginBottom: "16px",
                        }}
                    >
                        {error}
                    </div>
                )}

                {/* ==========================================
                    SUCCESS
                ========================================== */}

                {success && !receipt && (
                    <div
                        className="alert alert-success"
                        style={{
                            marginBottom: "16px",
                        }}
                    >
                        {success}
                    </div>
                )}

                {/* ==========================================
                    POS LAYOUT
                ========================================== */}

                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns:
                            "minmax(0, 1fr) 400px",
                        gap: "20px",
                        alignItems: "start",
                    }}
                >
                    {/* ======================================
                        LEFT SIDE
                    ====================================== */}

                    <div>
                        <div className="card">
                            <div className="card-header">
                                <div>
                                    <div className="card-title">
                                        Products
                                    </div>

                                    <div
                                        style={{
                                            fontSize:
                                                "13px",
                                            color:
                                                "#6b7280",
                                            marginTop:
                                                "4px",
                                        }}
                                    >
                                        Select a product
                                        to add it to the
                                        cart
                                    </div>
                                </div>
                            </div>

                            <div className="card-body">
                                {/* SEARCH */}

                                <div
                                    className="filter-bar"
                                    style={{
                                        marginBottom:
                                            "16px",
                                    }}
                                >
                                    <div
                                        className="search-box"
                                        style={{
                                            flex: 1,
                                        }}
                                    >
                                        <span>
                                            🔍
                                        </span>

                                        <input
                                            type="text"
                                            className="form-control"
                                            placeholder="Search by name, code or brand..."
                                            value={
                                                search
                                            }
                                            onChange={(
                                                e
                                            ) =>
                                                setSearch(
                                                    e
                                                        .target
                                                        .value
                                                )
                                            }
                                        />
                                    </div>
                                </div>

                                {/* CATEGORIES */}

                                <div
                                    style={{
                                        display:
                                            "flex",
                                        gap: "8px",
                                        flexWrap:
                                            "wrap",
                                        marginBottom:
                                            "20px",
                                    }}
                                >
                                    <button
                                        type="button"
                                        className={
                                            selectedCategory ===
                                            "all"
                                                ? "btn btn-primary btn-sm"
                                                : "btn btn-ghost btn-sm"
                                        }
                                        onClick={() =>
                                            setSelectedCategory(
                                                "all"
                                            )
                                        }
                                    >
                                        All
                                    </button>

                                    {categories.map(
                                        (category) => (
                                            <button
                                                type="button"
                                                key={
                                                    category.id ??
                                                    category.name
                                                }
                                                className={
                                                    String(
                                                        selectedCategory
                                                    ) ===
                                                    String(
                                                        category.id
                                                    )
                                                        ? "btn btn-primary btn-sm"
                                                        : "btn btn-ghost btn-sm"
                                                }
                                                onClick={() =>
                                                    setSelectedCategory(
                                                        category.id
                                                    )
                                                }
                                            >
                                                {
                                                    category.name
                                                }
                                            </button>
                                        )
                                    )}
                                </div>

                                {/* PRODUCT GRID */}

                                {filteredProducts.length ===
                                0 ? (
                                    <div
                                        style={{
                                            textAlign:
                                                "center",
                                            padding:
                                                "50px 20px",
                                            color:
                                                "#6b7280",
                                        }}
                                    >
                                        No products found.
                                    </div>
                                ) : (
                                    <div
                                        style={{
                                            display: "grid",
                                            gridTemplateColumns:
                                                "repeat(4, minmax(0, 1fr))",
                                            gap: "14px",
                                        }}
                                    >
                                        {filteredProducts.map(
                                            (
                                                product
                                            ) => {
                                                const stock =
                                                    Number(
                                                        product.quantity ||
                                                            0
                                                    );

                                                const disabled =
                                                    stock <=
                                                        0 ||
                                                    product.status !==
                                                        "active";

                                                return (
                                                    <button
                                                        type="button"
                                                        key={
                                                            product.id
                                                        }
                                                        disabled={
                                                            disabled
                                                        }
                                                        onClick={() =>
                                                            addToCart(
                                                                product
                                                            )
                                                        }
                                                        style={{
                                                            textAlign:
                                                                "left",
                                                            border:
                                                                "1px solid #e5e7eb",
                                                            borderRadius:
                                                                "10px",
                                                            padding:
                                                                "14px",
                                                            background:
                                                                disabled
                                                                    ? "#f3f4f6"
                                                                    : "#fff",
                                                            cursor:
                                                                disabled
                                                                    ? "not-allowed"
                                                                    : "pointer",
                                                            opacity:
                                                                disabled
                                                                    ? 0.6
                                                                    : 1,
                                                        }}
                                                    >
                                                        <div
                                                            style={{
                                                                fontWeight:
                                                                    600,
                                                                marginBottom:
                                                                    "6px",
                                                                color:
                                                                    "#1f2937",
                                                            }}
                                                        >
                                                            {
                                                                product.name
                                                            }
                                                        </div>

                                                        <div
                                                            style={{
                                                                fontSize:
                                                                    "12px",
                                                                color:
                                                                    "#6b7280",
                                                                marginBottom:
                                                                    "10px",
                                                            }}
                                                        >
                                                            {product.product_code ||
                                                                "No code"}
                                                        </div>

                                                        <div
                                                            style={{
                                                                display:
                                                                    "flex",
                                                                justifyContent:
                                                                    "space-between",
                                                                alignItems:
                                                                    "center",
                                                            }}
                                                        >
                                                            <strong
                                                                style={{
                                                                    color:
                                                                        "#FF6B35",
                                                                }}
                                                            >
                                                                {formatPeso(
                                                                    product.price
                                                                )}
                                                            </strong>

                                                            <span
                                                                className={
                                                                    stock <=
                                                                    Number(
                                                                        product.low_stock_threshold ||
                                                                            10
                                                                    )
                                                                        ? "chip-warning"
                                                                        : "chip-success"
                                                                }
                                                            >
                                                                Stock:{" "}
                                                                {
                                                                    stock
                                                                }
                                                            </span>
                                                        </div>
                                                    </button>
                                                );
                                            }
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* ======================================
                        RIGHT SIDE
                    ====================================== */}

                    <div
                        style={{
                            position: "sticky",
                            top: "20px",
                        }}
                    >
                        <div className="card">
                            <div className="card-header">
                                <div className="card-title">
                                    Current Sale
                                </div>

                                {cart.length > 0 && (
                                    <button
                                        type="button"
                                        className="btn btn-ghost btn-sm"
                                        onClick={
                                            clearCart
                                        }
                                    >
                                        Clear
                                    </button>
                                )}
                            </div>

                            <div className="card-body">
                                {/* CART */}

                                {cart.length ===
                                0 ? (
                                    <div
                                        style={{
                                            textAlign:
                                                "center",
                                            padding:
                                                "35px 10px",
                                            color:
                                                "#6b7280",
                                        }}
                                    >
                                        <div
                                            style={{
                                                fontSize:
                                                    "32px",
                                                marginBottom:
                                                    "10px",
                                            }}
                                        >
                                            🛒
                                        </div>

                                        <div>
                                            Cart is
                                            empty
                                        </div>

                                        <div
                                            style={{
                                                fontSize:
                                                    "12px",
                                                marginTop:
                                                    "5px",
                                            }}
                                        >
                                            Click a
                                            product to
                                            add it
                                        </div>
                                    </div>
                                ) : (
                                    <div>
                                        {cart.map(
                                            (item) => (
                                                <div
                                                    key={
                                                        item.id
                                                    }
                                                    style={{
                                                        padding:
                                                            "12px 0",
                                                        borderBottom:
                                                            "1px solid #e5e7eb",
                                                    }}
                                                >
                                                    <div
                                                        style={{
                                                            display:
                                                                "flex",
                                                            justifyContent:
                                                                "space-between",
                                                            gap: "10px",
                                                        }}
                                                    >
                                                        <div
                                                            style={{
                                                                minWidth: 0,
                                                            }}
                                                        >
                                                            <div
                                                                style={{
                                                                    fontWeight:
                                                                        600,
                                                                    fontSize:
                                                                        "14px",
                                                                }}
                                                            >
                                                                {
                                                                    item.name
                                                                }
                                                            </div>

                                                            <div
                                                                style={{
                                                                    fontSize:
                                                                        "12px",
                                                                    color:
                                                                        "#6b7280",
                                                                    marginTop:
                                                                        "3px",
                                                                }}
                                                            >
                                                                {formatPeso(
                                                                    item.price
                                                                )}{" "}
                                                                each
                                                            </div>
                                                        </div>

                                                        <button
                                                            type="button"
                                                            className="btn-icon"
                                                            onClick={() =>
                                                                removeFromCart(
                                                                    item.id
                                                                )
                                                            }
                                                            title="Remove"
                                                        >
                                                            ×
                                                        </button>
                                                    </div>

                                                    <div
                                                        style={{
                                                            display:
                                                                "flex",
                                                            justifyContent:
                                                                "space-between",
                                                            alignItems:
                                                                "center",
                                                            marginTop:
                                                                "10px",
                                                        }}
                                                    >
                                                        <div
                                                            style={{
                                                                display:
                                                                    "flex",
                                                                alignItems:
                                                                    "center",
                                                                gap: "8px",
                                                            }}
                                                        >
                                                            <button
                                                                type="button"
                                                                className="btn btn-ghost btn-sm"
                                                                onClick={() =>
                                                                    changeQuantity(
                                                                        item.id,
                                                                        -1
                                                                    )
                                                                }
                                                            >
                                                                −
                                                            </button>

                                                            <strong>
                                                                {
                                                                    item.quantity
                                                                }
                                                            </strong>

                                                            <button
                                                                type="button"
                                                                className="btn btn-ghost btn-sm"
                                                                onClick={() =>
                                                                    changeQuantity(
                                                                        item.id,
                                                                        1
                                                                    )
                                                                }
                                                            >
                                                                +
                                                            </button>
                                                        </div>

                                                        <strong>
                                                            {formatPeso(
                                                                Number(
                                                                    item.price
                                                                ) *
                                                                    Number(
                                                                        item.quantity
                                                                    )
                                                            )}
                                                        </strong>
                                                    </div>
                                                </div>
                                            )
                                        )}
                                    </div>
                                )}

                                {/* TOTALS */}

                                <div
                                    style={{
                                        marginTop:
                                            "18px",
                                        paddingTop:
                                            "15px",
                                        borderTop:
                                            "2px solid #e5e7eb",
                                    }}
                                >
                                    <div
                                        style={{
                                            display:
                                                "flex",
                                            justifyContent:
                                                "space-between",
                                            marginBottom:
                                                "8px",
                                        }}
                                    >
                                        <span>
                                            Subtotal
                                        </span>

                                        <strong>
                                            {formatPeso(
                                                subtotal
                                            )}
                                        </strong>
                                    </div>

                                    {/* DISCOUNT */}

                                    <div
                                        className="form-group"
                                        style={{
                                            marginTop:
                                                "14px",
                                        }}
                                    >
                                        <label className="form-label">
                                            Discount
                                        </label>

                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            className="form-control"
                                            placeholder="0.00"
                                            value={
                                                payment.discount
                                            }
                                            onChange={(
                                                e
                                            ) =>
                                                handleDiscountChange(
                                                    e
                                                        .target
                                                        .value
                                                )
                                            }
                                        />
                                    </div>

                                    <div
                                        style={{
                                            display:
                                                "flex",
                                            justifyContent:
                                                "space-between",
                                            marginTop:
                                                "12px",
                                            fontSize:
                                                "18px",
                                        }}
                                    >
                                        <strong>
                                            Total
                                        </strong>

                                        <strong
                                            style={{
                                                color:
                                                    "#FF6B35",
                                            }}
                                        >
                                            {formatPeso(
                                                total
                                            )}
                                        </strong>
                                    </div>
                                </div>

                                {/* PAYMENT METHOD */}

                                <div
                                    style={{
                                        marginTop:
                                            "20px",
                                    }}
                                >
                                    <label className="form-label">
                                        Payment Method
                                    </label>

                                    <div
                                        style={{
                                            display:
                                                "grid",
                                            gridTemplateColumns:
                                                "repeat(2, 1fr)",
                                            gap: "8px",
                                            marginTop:
                                                "8px",
                                        }}
                                    >
                                        {[
                                            [
                                                "cash",
                                                "Cash",
                                            ],
                                            [
                                                "gcash",
                                                "GCash",
                                            ],
                                            [
                                                "maya",
                                                "Maya",
                                            ],
                                            [
                                                "credit",
                                                "Credit",
                                            ],
                                        ].map(
                                            ([
                                                value,
                                                label,
                                            ]) => (
                                                <button
                                                    type="button"
                                                    key={
                                                        value
                                                    }
                                                    className={
                                                        payment.paymentMethod ===
                                                        value
                                                            ? "btn btn-primary"
                                                            : "btn btn-ghost"
                                                    }
                                                    onClick={() =>
                                                        handlePaymentMethod(
                                                            value
                                                        )
                                                    }
                                                >
                                                    {
                                                        label
                                                    }
                                                </button>
                                            )
                                        )}
                                    </div>
                                </div>

                                {/* CREDIT CUSTOMER */}

                                {payment.paymentMethod ===
                                    "credit" && (
                                    <div
                                        className="form-group"
                                        style={{
                                            marginTop:
                                                "16px",
                                        }}
                                    >
                                        <label className="form-label">
                                            Customer
                                        </label>

                                        <select
                                            className="form-control"
                                            value={
                                                payment.customerId
                                            }
                                            onChange={(
                                                e
                                            ) =>
                                                setPayment(
                                                    (
                                                        current
                                                    ) => ({
                                                        ...current,
                                                        customerId:
                                                            e
                                                                .target
                                                                .value,
                                                    })
                                                )
                                            }
                                        >
                                            <option value="">
                                                Select customer
                                            </option>

                                            {customers
                                                .filter(
                                                    (
                                                        customer
                                                    ) =>
                                                        customer.status ===
                                                            "active" ||
                                                        !customer.status
                                                )
                                                .map(
                                                    (
                                                        customer
                                                    ) => (
                                                        <option
                                                            key={
                                                                customer.id
                                                            }
                                                            value={
                                                                customer.id
                                                            }
                                                        >
                                                            {customer.name}{" "}
                                                            —{" "}
                                                            {customer.customer_code ||
                                                                `ID ${customer.id}`}
                                                        </option>
                                                    )
                                                )}
                                        </select>
                                    </div>
                                )}

                                {/* AMOUNT TENDERED */}

                                {payment.paymentMethod !==
                                    "credit" && (
                                    <div
                                        className="form-group"
                                        style={{
                                            marginTop:
                                                "16px",
                                        }}
                                    >
                                        <label className="form-label">
                                            Amount Tendered
                                        </label>

                                        <input
                                            type="number"
                                            min="0"
                                            step="0.01"
                                            className="form-control"
                                            placeholder="0.00"
                                            value={
                                                payment.amountTendered
                                            }
                                            onChange={(
                                                e
                                            ) =>
                                                setPayment(
                                                    (
                                                        current
                                                    ) => ({
                                                        ...current,
                                                        amountTendered:
                                                            e
                                                                .target
                                                                .value,
                                                    })
                                                )
                                            }
                                        />

                                        <div
                                            style={{
                                                marginTop:
                                                    "8px",
                                                display:
                                                    "flex",
                                                justifyContent:
                                                    "space-between",
                                                fontSize:
                                                    "13px",
                                            }}
                                        >
                                            <span>
                                                Change
                                            </span>

                                            <strong
                                                style={{
                                                    color:
                                                        change >=
                                                        0
                                                            ? "#059669"
                                                            : "#dc2626",
                                                }}
                                            >
                                                {formatPeso(
                                                    change
                                                )}
                                            </strong>
                                        </div>
                                    </div>
                                )}

                                {/* NOTE */}

                                <div
                                    className="form-group"
                                    style={{
                                        marginTop:
                                            "16px",
                                    }}
                                >
                                    <label className="form-label">
                                        Note
                                    </label>

                                    <textarea
                                        className="form-control"
                                        rows="2"
                                        placeholder="Optional note..."
                                        value={
                                            payment.note
                                        }
                                        onChange={(
                                            e
                                        ) =>
                                            setPayment(
                                                (
                                                    current
                                                ) => ({
                                                    ...current,
                                                    note: e
                                                        .target
                                                        .value,
                                                })
                                            )
                                        }
                                    />
                                </div>
                            </div>

                            {/* CHECKOUT */}

                            <div className="card-footer">
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    style={{
                                        width: "100%",
                                        justifyContent:
                                            "center",
                                        padding:
                                            "12px",
                                    }}
                                    disabled={
                                        processing ||
                                        cart.length ===
                                            0
                                    }
                                    onClick={
                                        completeSale
                                    }
                                >
                                    {processing
                                        ? "Processing..."
                                        : `Complete Sale — ${formatPeso(
                                              total
                                          )}`}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* =================================================
                RECEIPT MODAL
            ================================================= */}

            {receipt && (
                <div
                    className="modal-overlay"
                    onClick={closeReceipt}
                >
                    <div
                        className="modal-box"
                        style={{
                            maxWidth: "520px",
                        }}
                        onClick={(e) =>
                            e.stopPropagation()
                        }
                    >
                        <div className="modal-header">
                            <div>
                                <div className="modal-title">
                                    Sale Completed
                                </div>

                                <div
                                    style={{
                                        fontSize:
                                            "13px",
                                        color:
                                            "#6b7280",
                                        marginTop:
                                            "3px",
                                    }}
                                >
                                    Receipt generated
                                    successfully
                                </div>
                            </div>

                            <button
                                type="button"
                                className="modal-close"
                                onClick={
                                    closeReceipt
                                }
                            >
                                ×
                            </button>
                        </div>

                        <div className="modal-body">
                            <div
                                style={{
                                    textAlign:
                                        "center",
                                    marginBottom:
                                        "20px",
                                }}
                            >
                                <div
                                    style={{
                                        fontSize:
                                            "40px",
                                        marginBottom:
                                            "8px",
                                    }}
                                >
                                    ✓
                                </div>

                                <strong
                                    style={{
                                        fontSize:
                                            "20px",
                                    }}
                                >
                                    Sale Successful
                                </strong>
                            </div>

                            <div
                                style={{
                                    display:
                                        "grid",
                                    gap: "8px",
                                }}
                            >
                                <div
                                    style={{
                                        display:
                                            "flex",
                                        justifyContent:
                                            "space-between",
                                    }}
                                >
                                    <span>
                                        Receipt No.
                                    </span>

                                    <strong>
                                        {
                                            receipt.receipt_no
                                        }
                                    </strong>
                                </div>

                                <div
                                    style={{
                                        display:
                                            "flex",
                                        justifyContent:
                                            "space-between",
                                    }}
                                >
                                    <span>
                                        Payment
                                    </span>

                                    <strong
                                        style={{
                                            textTransform:
                                                "uppercase",
                                        }}
                                    >
                                        {
                                            receipt.payment_method
                                        }
                                    </strong>
                                </div>

                                <div
                                    style={{
                                        display:
                                            "flex",
                                        justifyContent:
                                            "space-between",
                                    }}
                                >
                                    <span>
                                        Subtotal
                                    </span>

                                    <strong>
                                        {formatPeso(
                                            receipt.subtotal
                                        )}
                                    </strong>
                                </div>

                                <div
                                    style={{
                                        display:
                                            "flex",
                                        justifyContent:
                                            "space-between",
                                    }}
                                >
                                    <span>
                                        Discount
                                    </span>

                                    <strong>
                                        {formatPeso(
                                            receipt.discount
                                        )}
                                    </strong>
                                </div>

                                <div
                                    style={{
                                        display:
                                            "flex",
                                        justifyContent:
                                            "space-between",
                                        fontSize:
                                            "18px",
                                        paddingTop:
                                            "10px",
                                        marginTop:
                                            "5px",
                                        borderTop:
                                            "1px solid #e5e7eb",
                                    }}
                                >
                                    <strong>
                                        Total
                                    </strong>

                                    <strong
                                        style={{
                                            color:
                                                "#FF6B35",
                                        }}
                                    >
                                        {formatPeso(
                                            receipt.total
                                        )}
                                    </strong>
                                </div>

                                {receipt.payment_method !==
                                    "credit" && (
                                    <>
                                        <div
                                            style={{
                                                display:
                                                    "flex",
                                                justifyContent:
                                                    "space-between",
                                            }}
                                        >
                                            <span>
                                                Amount
                                                Tendered
                                            </span>

                                            <strong>
                                                {formatPeso(
                                                    receipt.amount_tendered
                                                )}
                                            </strong>
                                        </div>

                                        <div
                                            style={{
                                                display:
                                                    "flex",
                                                justifyContent:
                                                    "space-between",
                                                color:
                                                    "#059669",
                                            }}
                                        >
                                            <span>
                                                Change
                                            </span>

                                            <strong>
                                                {formatPeso(
                                                    receipt.change_given
                                                )}
                                            </strong>
                                        </div>
                                    </>
                                )}
                            </div>

                            <div
                                style={{
                                    marginTop:
                                        "20px",
                                    borderTop:
                                        "1px solid #e5e7eb",
                                    paddingTop:
                                        "15px",
                                }}
                            >
                                <strong>
                                    Items
                                </strong>

                                <div
                                    style={{
                                        marginTop:
                                            "10px",
                                    }}
                                >
                                    {receipt.items.map(
                                        (
                                            item,
                                            index
                                        ) => (
                                            <div
                                                key={
                                                    `${item.product_id}-${index}`
                                                }
                                                style={{
                                                    display:
                                                        "flex",
                                                    justifyContent:
                                                        "space-between",
                                                    gap: "10px",
                                                    padding:
                                                        "7px 0",
                                                    fontSize:
                                                        "13px",
                                                }}
                                            >
                                                <span>
                                                    {
                                                        item.product_name
                                                    }{" "}
                                                    ×{" "}
                                                    {
                                                        item.quantity
                                                    }
                                                </span>

                                                <strong>
                                                    {formatPeso(
                                                        item.subtotal
                                                    )}
                                                </strong>
                                            </div>
                                        )
                                    )}
                                </div>
                            </div>
                        </div>

                        <div className="modal-footer">
                            <button
                                type="button"
                                className="btn btn-primary"
                                onClick={
                                    closeReceipt
                                }
                            >
                                Done
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default POS;