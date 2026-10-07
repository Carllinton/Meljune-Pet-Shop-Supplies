import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../services/api";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import useDebounce from "../hooks/useDebounce";
import PencilIcon from "../assets/icons/pencil.png";
import TrashIcon from "../assets/icons/trash.png";
import { getUser } from "../services/auth";
import {
  formatPeso,
  getErrorMessage,
  toDateInput,
} from "../utils/format";

const API_BASE_URL = "http://localhost:5000";

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
  existingImage: "",
  imageFile: null,
};

function Products() {
  const user = getUser();
  const isAdmin = user?.role === "admin";

  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);

  const [categoryFilter, setCategoryFilter] = useState("");
  const [stockFilter, setStockFilter] = useState("");
  const [sortBy, setSortBy] = useState("date_added");
  const [sortOrder, setSortOrder] = useState("desc");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const [imagePreview, setImagePreview] = useState("");

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // =============================================
  // IMAGE URL
  // =============================================

  const getImageUrl = useCallback((image) => {
    if (!image) return "";

    if (
      image.startsWith("http://") ||
      image.startsWith("https://") ||
      image.startsWith("blob:")
    ) {
      return image;
    }

    if (image.startsWith("/")) {
      return `${API_BASE_URL}${image}`;
    }

    return `${API_BASE_URL}/${image}`;
  }, []);

  // =============================================
  // LOAD PRODUCTS
  // =============================================

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      let response;

      if (debouncedSearch.trim()) {
        response = await api.get("/products/search", {
          params: {
            query: debouncedSearch.trim(),
          },
        });
      } else {
        response = await api.get("/products");
      }

      const data = response?.data?.data ?? response?.data ?? [];

      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to load products:", err);
      setError(getErrorMessage(err, "Failed to load products."));
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch]);

  // =============================================
  // LOAD LOOKUPS
  // =============================================

  const loadLookups = useCallback(async () => {
    try {
      const [categoryResponse, supplierResponse] = await Promise.all([
        api.get("/categories"),
        api.get("/suppliers"),
      ]);

      const categoryData =
        categoryResponse?.data?.data ?? categoryResponse?.data ?? [];

      const supplierData =
        supplierResponse?.data?.data ?? supplierResponse?.data ?? [];

      setCategories(Array.isArray(categoryData) ? categoryData : []);
      setSuppliers(Array.isArray(supplierData) ? supplierData : []);
    } catch (err) {
      console.error("Failed to load product lookups:", err);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    loadLookups();
  }, [loadLookups]);

  useEffect(() => {
    if (!message) return;

    const timer = setTimeout(() => {
      setMessage("");
    }, 3000);

    return () => clearTimeout(timer);
  }, [message]);

  // =============================================
  // CATEGORY / SUPPLIER NAMES
  // =============================================

  const getCategoryName = useCallback(
    (product) => {
      if (product.category_name) {
        return product.category_name;
      }

      const category = categories.find(
        (item) => String(item.id) === String(product.category_id)
      );

      return category?.name || "—";
    },
    [categories]
  );

  const getSupplierName = useCallback(
    (product) => {
      if (product.supplier_name) {
        return product.supplier_name;
      }

      const supplier = suppliers.find(
        (item) => String(item.id) === String(product.supplier_id)
      );

      return supplier?.name || "";
    },
    [suppliers]
  );

  // =============================================
  // FILTER + SORT
  // =============================================

  const filteredProducts = useMemo(() => {
    let result = [...products];

    if (categoryFilter) {
      result = result.filter(
        (product) =>
          String(product.category_id) === String(categoryFilter) ||
          String(product.category_name || "").toLowerCase() ===
            String(
              categories.find(
                (category) =>
                  String(category.id) === String(categoryFilter)
              )?.name || ""
            ).toLowerCase()
      );
    }

    if (stockFilter === "in_stock") {
      result = result.filter(
        (product) => Number(product.quantity) > 0
      );
    }

    if (stockFilter === "low_stock") {
      result = result.filter(
        (product) =>
          Number(product.quantity) > 0 &&
          Number(product.quantity) <=
            Number(product.low_stock_threshold ?? 10)
      );
    }

    if (stockFilter === "out_of_stock") {
      result = result.filter(
        (product) => Number(product.quantity) <= 0
      );
    }

    result.sort((a, b) => {
      let valueA;
      let valueB;

      switch (sortBy) {
        case "name":
          valueA = String(a.name || "").toLowerCase();
          valueB = String(b.name || "").toLowerCase();
          break;

        case "quantity":
          valueA = Number(a.quantity || 0);
          valueB = Number(b.quantity || 0);
          break;

        case "price":
          valueA = Number(a.price || 0);
          valueB = Number(b.price || 0);
          break;

        case "expiration_date":
          valueA = a.expiration_date
            ? new Date(a.expiration_date).getTime()
            : Infinity;
          valueB = b.expiration_date
            ? new Date(b.expiration_date).getTime()
            : Infinity;
          break;

        case "date_added":
        default:
          valueA = a.date_added
            ? new Date(a.date_added).getTime()
            : 0;
          valueB = b.date_added
            ? new Date(b.date_added).getTime()
            : 0;
          break;
      }

      if (valueA < valueB) {
        return sortOrder === "asc" ? -1 : 1;
      }

      if (valueA > valueB) {
        return sortOrder === "asc" ? 1 : -1;
      }

      return 0;
    });

    return result;
  }, [
    products,
    categoryFilter,
    stockFilter,
    sortBy,
    sortOrder,
    categories,
  ]);

  // =============================================
  // OPEN ADD MODAL
  // =============================================

  const openAddModal = () => {
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
    });
    setImagePreview("");
    setError("");
    setModalOpen(true);
  };

  // =============================================
  // OPEN EDIT MODAL
  // =============================================

  const openEditModal = async (id) => {
    try {
      setError("");

      const response = await api.get(`/products/${id}`);
      const product = response?.data?.data ?? response?.data;

      const existingImage = product.image || "";

      setEditingId(id);

      setForm({
        product_code: product.product_code || "",
        name: product.name || "",
        category_id: product.category_id || "",
        brand: product.brand || "",
        quantity: String(product.quantity ?? 0),
        unit: product.unit || "pcs",
        price: String(product.price ?? ""),
        cost_price: String(product.cost_price ?? 0),
        low_stock_threshold: String(
          product.low_stock_threshold ?? 10
        ),
        expiration_date: toDateInput(product.expiration_date),
        supplier_id: product.supplier_id || "",
        description: product.description || "",
        status: product.status || "active",
        existingImage,
        imageFile: null,
      });

      setImagePreview(getImageUrl(existingImage));

      setModalOpen(true);
    } catch (err) {
      console.error("Failed to load product:", err);
      setError(getErrorMessage(err, "Failed to load product."));
    }
  };

  // =============================================
  // CLOSE MODAL
  // =============================================

  const closeModal = () => {
    if (saving) return;

    setModalOpen(false);
    setEditingId(null);
    setForm({
      ...EMPTY_FORM,
    });
    setImagePreview("");
  };

  // =============================================
  // HANDLE FORM CHANGE
  // =============================================

  const handleChange = (event) => {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  // =============================================
  // HANDLE IMAGE CHANGE
  // =============================================

  const handleImageChange = (event) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
    ];

    const maxSize = 5 * 1024 * 1024;

    if (!allowedTypes.includes(file.type)) {
      setError(
        "Invalid image format. Only JPG, JPEG, PNG, and WEBP are allowed."
      );

      event.target.value = "";
      return;
    }

    if (file.size > maxSize) {
      setError("Image is too large. Maximum allowed size is 5 MB.");

      event.target.value = "";
      return;
    }

    setError("");

    setForm((current) => ({
      ...current,
      imageFile: file,
    }));

    const previewUrl = URL.createObjectURL(file);

    setImagePreview(previewUrl);
  };

  // =============================================
  // REMOVE SELECTED IMAGE
  // =============================================

  const removeSelectedImage = () => {
    setForm((current) => ({
      ...current,
      imageFile: null,
    }));

    if (form.existingImage) {
      setImagePreview(getImageUrl(form.existingImage));
    } else {
      setImagePreview("");
    }

    const fileInput = document.getElementById("product-image-input");

    if (fileInput) {
      fileInput.value = "";
    }
  };

  // =============================================
  // SUBMIT
  // =============================================

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");

      // =============================================
      // VALIDATION
      // =============================================

      if (!form.product_code.trim()) {
        throw new Error("Product code is required.");
      }

      if (!form.name.trim()) {
        throw new Error("Product name is required.");
      }

      if (!form.category_id) {
        throw new Error("Category is required.");
      }

      if (!form.price || Number(form.price) < 0) {
        throw new Error("Please enter a valid selling price.");
      }

      if (Number(form.quantity) < 0) {
        throw new Error("Quantity cannot be negative.");
      }

      // =============================================
      // CREATE FORMDATA
      // =============================================

      const formData = new FormData();

      formData.append(
        "product_code",
        form.product_code.trim()
      );

      formData.append(
        "name",
        form.name.trim()
      );

      formData.append(
        "category_id",
        String(Number(form.category_id))
      );

      formData.append(
        "brand",
        form.brand.trim()
      );

      formData.append(
        "quantity",
        String(Number(form.quantity))
      );

      formData.append(
        "unit",
        form.unit
      );

      formData.append(
        "price",
        String(Number(form.price))
      );

      formData.append(
        "cost_price",
        String(Number(form.cost_price || 0))
      );

      formData.append(
        "low_stock_threshold",
        String(Number(form.low_stock_threshold || 10))
      );

      formData.append(
        "expiration_date",
        form.expiration_date || ""
      );

      formData.append(
        "supplier_id",
        form.supplier_id
          ? String(Number(form.supplier_id))
          : ""
      );

      formData.append(
        "description",
        form.description.trim()
      );

      formData.append(
        "status",
        form.status
      );

      // =============================================
      // IMAGE
      // =============================================

      if (form.imageFile) {
        formData.append(
          "image",
          form.imageFile
        );
      }

      // =============================================
      // SEND REQUEST
      // =============================================

      if (editingId) {
        await api.put(
          `/products/${editingId}`,
          formData
        );

        setMessage("Product updated successfully.");
      } else {
        await api.post(
          "/products",
          formData
        );

        setMessage("Product added successfully.");
      }

      closeModal();

      await loadProducts();
    } catch (err) {
      console.error("Failed to save product:", err);

      setError(
        getErrorMessage(
          err,
          "Failed to save product."
        )
      );
    } finally {
      setSaving(false);
    }
  };

  // =============================================
  // DELETE
  // =============================================

  const askDelete = (id) => {
    setDeleteId(id);
    setConfirmOpen(true);
  };

  const cancelDelete = () => {
    if (deleting) return;

    setConfirmOpen(false);
    setDeleteId(null);
  };

  const confirmDelete = async () => {
    if (!deleteId) return;

    try {
      setDeleting(true);
      setError("");

      await api.delete(`/products/${deleteId}`);

      setMessage("Product deleted successfully.");

      setConfirmOpen(false);
      setDeleteId(null);

      await loadProducts();
    } catch (err) {
      console.error("Failed to delete product:", err);

      setError(
        getErrorMessage(
          err,
          "Failed to delete product."
        )
      );
    } finally {
      setDeleting(false);
    }
  };

  // =============================================
  // FILTER RESET
  // =============================================

  const resetFilters = () => {
    setSearch("");
    setCategoryFilter("");
    setStockFilter("");
    setSortBy("date_added");
    setSortOrder("desc");
  };

  // =============================================
  // SORT
  // =============================================

  const handleSortChange = (event) => {
    const value = event.target.value;

    if (value === "name_asc") {
      setSortBy("name");
      setSortOrder("asc");
    } else if (value === "quantity") {
      setSortBy("quantity");
      setSortOrder("desc");
    } else if (value === "price") {
      setSortBy("price");
      setSortOrder("desc");
    } else if (value === "expiry") {
      setSortBy("expiration_date");
      setSortOrder("asc");
    } else {
      setSortBy("date_added");
      setSortOrder("desc");
    }
  };

  // =============================================
  // STOCK
  // =============================================

  const getStockClass = (product) => {
    const quantity = Number(product.quantity || 0);
    const threshold = Number(
      product.low_stock_threshold ?? 10
    );

    if (quantity <= 0) return "chip-danger";
    if (quantity <= threshold) return "chip-warning";

    return "chip-success";
  };

  const getStockLabel = (product) => {
    const quantity = Number(product.quantity || 0);
    const threshold = Number(
      product.low_stock_threshold ?? 10
    );

    if (quantity <= 0) return "Out of Stock";
    if (quantity <= threshold) return "Low Stock";

    return "In Stock";
  };

  // =============================================
  // DATE
  // =============================================

  const formatDate = (date) => {
    if (!date) return "—";

    const parsed = new Date(date);

    if (Number.isNaN(parsed.getTime())) {
      return "—";
    }

    return parsed.toLocaleDateString("en-US", {
      month: "short",
      day: "2-digit",
      year: "numeric",
    });
  };

  const getExpiryClass = (date) => {
    if (!date) return "";

    const expiry = new Date(date);
    const today = new Date();

    today.setHours(0, 0, 0, 0);
    expiry.setHours(0, 0, 0, 0);

    const difference =
      Math.ceil(
        (expiry - today) /
          (1000 * 60 * 60 * 24)
      );

    if (difference < 0) return "chip-danger";
    if (difference <= 30) return "chip-warning";

    return "";
  };

  return (
    <div className="page-content">

      {/* PAGE HEADER */}
      <div className="page-header">

        <div className="page-header-left">

          <h1>
            Products
          </h1>

          <p>
            Manage your pet shop inventory (
            {products.length} products)
          </p>

        </div>

        <div className="page-actions">

          {isAdmin && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={openAddModal}
            >
              Add Product
            </button>
          )}

        </div>

      </div>


      {/* NOTIFICATIONS */}

      {message && (
        <div className="alert alert-success">
          <span>{message}</span>
        </div>
      )}

      {error && !modalOpen && (
        <div className="alert alert-danger">
          <span>{error}</span>
        </div>
      )}


      {/* FILTER CARD */}

      <div className="card">

        <div className="card-body">

          <div className="filter-bar">

            <div className="search-box">

              <input
                type="text"
                className="form-control"
                placeholder="Search by name, code or brand..."
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
              />

            </div>


            <select
              className="form-control"
              value={categoryFilter}
              onChange={(event) =>
                setCategoryFilter(
                  event.target.value
                )
              }
            >
              <option value="">
                All Categories
              </option>

              {categories.map((category) => (
                <option
                  key={category.id}
                  value={category.id}
                >
                  {category.name}
                </option>
              ))}

            </select>


            <select
              className="form-control"
              value={stockFilter}
              onChange={(event) =>
                setStockFilter(
                  event.target.value
                )
              }
            >
              <option value="">
                All Stock
              </option>

              <option value="in_stock">
                In Stock
              </option>

              <option value="low_stock">
                Low Stock
              </option>

              <option value="out_of_stock">
                Out of Stock
              </option>

            </select>


            <select
              className="form-control"
              value={
                sortBy === "name"
                  ? "name_asc"
                  : sortBy === "quantity"
                  ? "quantity"
                  : sortBy === "price"
                  ? "price"
                  : sortBy ===
                    "expiration_date"
                  ? "expiry"
                  : "newest"
              }
              onChange={handleSortChange}
            >

              <option value="newest">
                Newest First
              </option>

              <option value="name_asc">
                Name A-Z
              </option>

              <option value="quantity">
                Quantity
              </option>

              <option value="price">
                Price
              </option>

              <option value="expiry">
                Expiry Date
              </option>

            </select>


            <button
              type="button"
              className="btn btn-secondary btn-sm"
            >
              Filter
            </button>


            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={resetFilters}
            >
              Reset
            </button>

          </div>

        </div>

      </div>


      {/* PRODUCTS TABLE */}

      <div className="card">

        <div className="card-body">

          <div className="table-wrap">

            <table>

              <thead>

                <tr>

                  <th>Product</th>
                  <th>Category</th>
                  <th>Brand</th>
                  <th>Qty</th>
                  <th>Price</th>
                  <th>Expiry</th>
                  <th>Status</th>
                  <th>Actions</th>

                </tr>

              </thead>


              <tbody>

                {loading ? (

                  <tr>

                    <td colSpan="8">

                      <div className="empty-state">
                        Loading products...
                      </div>

                    </td>

                  </tr>

                ) : filteredProducts.length === 0 ? (

                  <tr>

                    <td colSpan="8">

                      <div className="empty-state">

                        <p>
                          No products found.
                        </p>

                      </div>

                    </td>

                  </tr>

                ) : (

                  filteredProducts.map(
                    (product) => (

                      <tr key={product.id}>

                        {/* PRODUCT */}

                        <td>

                          <div className="product-info">

                            {product.image ? (

                              <img
                                src={getImageUrl(
                                  product.image
                                )}
                                alt={
                                  product.name
                                }
                                className="product-thumb"
                                onError={(
                                  event
                                ) => {
                                  event.currentTarget.style.display =
                                    "none";
                                }}
                              />

                            ) : (

                              <div className="product-thumb product-thumb-placeholder">

                              </div>

                            )}

                            <div>

                              <strong>
                                {product.name}
                              </strong>

                              <div className="text-muted text-sm">
                                {product.product_code ||
                                  "—"}
                              </div>

                            </div>

                          </div>

                        </td>


                        {/* CATEGORY */}

                        <td>

                          <span className="chip chip-info">
                            {getCategoryName(
                              product
                            )}
                          </span>

                        </td>


                        {/* BRAND */}

                        <td>
                          {product.brand ||
                            "—"}
                        </td>


                        {/* QUANTITY */}

                        <td>
                          <strong>
                            {product.quantity ??
                              0}
                          </strong>
                        </td>


                        {/* PRICE */}

                        <td>
                          {formatPeso(
                            product.price
                          )}
                        </td>


                        {/* EXPIRY */}

                        <td>

                          {product.expiration_date ? (

                            <span
                              className={`chip ${getExpiryClass(
                                product.expiration_date
                              )}`}
                            >
                              {formatDate(
                                product.expiration_date
                              )}
                            </span>

                          ) : (

                            "—"

                          )}

                        </td>


                        {/* STATUS */}

                        <td>

                          <span
                            className={`chip ${getStockClass(
                              product
                            )}`}
                          >
                            {getStockLabel(
                              product
                            )}
                          </span>

                        </td>


                        {/* ACTIONS */}

                        <td>

                          {isAdmin && (

                            <div className="action-group">

                              <button
                                type="button"
                                className="action-btn action-btn-edit"
                                title="Edit Product"
                                onClick={() =>
                                  openEditModal(
                                    product.id
                                  )
                                }
                              >
                              <img src={PencilIcon} alt="Edit" />
                              </button>


                              <button
                                type="button"
                                className="action-btn action-btn-delete"
                                title="Delete Product"
                                onClick={() =>
                                  askDelete(
                                    product.id
                                  )
                                }
                              >
                              <img src={TrashIcon} alt="Delete" />
                              </button>

                            </div>

                          )}

                        </td>

                      </tr>

                    )
                  )

                )}

              </tbody>

            </table>

          </div>

        </div>


        {!loading && (

          <div className="card-footer">

            Showing{" "}
            {filteredProducts.length} of{" "}
            {products.length} products

          </div>

        )}

      </div>


      {/* ADD / EDIT MODAL */}

      <Modal
        open={modalOpen}
        onClose={closeModal}
        title={
          editingId
            ? "Edit Product"
            : "Add Product"
        }
        size="large"
      >

        <form onSubmit={handleSubmit}>

          {error && (

            <div className="alert alert-danger">

              <span>{error}</span>

            </div>

          )}


          <div className="form-grid form-grid-2">


            {/* PRODUCT CODE */}

            <div className="form-group">

              <label>
                Product Code{" "}
                <span className="req">*</span>
              </label>

              <input
                type="text"
                name="product_code"
                className="form-control"
                value={
                  form.product_code
                }
                onChange={handleChange}
                required
              />

            </div>


            {/* PRODUCT NAME */}

            <div className="form-group">

              <label>
                Product Name{" "}
                <span className="req">*</span>
              </label>

              <input
                type="text"
                name="name"
                className="form-control"
                value={form.name}
                onChange={handleChange}
                required
              />

            </div>


            {/* CATEGORY */}

            <div className="form-group">

              <label>
                Category{" "}
                <span className="req">*</span>
              </label>

              <select
                name="category_id"
                className="form-control"
                value={
                  form.category_id
                }
                onChange={handleChange}
                required
              >

                <option value="">
                  Select Category
                </option>

                {categories.map(
                  (category) => (

                    <option
                      key={category.id}
                      value={category.id}
                    >
                      {category.name}
                    </option>

                  )
                )}

              </select>

            </div>


            {/* BRAND */}

            <div className="form-group">

              <label>Brand</label>

              <input
                type="text"
                name="brand"
                className="form-control"
                value={form.brand}
                onChange={handleChange}
              />

            </div>


            {/* QUANTITY */}

            <div className="form-group">

              <label>Quantity</label>

              <input
                type="number"
                name="quantity"
                className="form-control"
                min="0"
                step="1"
                value={
                  form.quantity
                }
                onChange={handleChange}
              />

              <div className="form-hint">
                Stock changes are
                automatically recorded.
              </div>

            </div>


            {/* UNIT */}

            <div className="form-group">

              <label>Unit</label>

              <select
                name="unit"
                className="form-control"
                value={form.unit}
                onChange={handleChange}
              >

                <option value="pcs">
                  Pieces
                </option>

                <option value="box">
                  Box
                </option>

                <option value="pack">
                  Pack
                </option>

                <option value="kg">
                  Kilogram
                </option>

                <option value="g">
                  Gram
                </option>

                <option value="bottle">
                  Bottle
                </option>

                <option value="bag">
                  Bag
                </option>

              </select>

            </div>


            {/* SELLING PRICE */}

            <div className="form-group">

              <label>
                Selling Price{" "}
                <span className="req">*</span>
              </label>

              <input
                type="number"
                name="price"
                className="form-control"
                min="0"
                step="0.01"
                value={form.price}
                onChange={handleChange}
                required
              />

            </div>


            {/* COST PRICE */}

            <div className="form-group">

              <label>
                Cost Price
              </label>

              <input
                type="number"
                name="cost_price"
                className="form-control"
                min="0"
                step="0.01"
                value={
                  form.cost_price
                }
                onChange={handleChange}
              />

            </div>


            {/* LOW STOCK */}

            <div className="form-group">

              <label>
                Low Stock Threshold
              </label>

              <input
                type="number"
                name="low_stock_threshold"
                className="form-control"
                min="0"
                step="1"
                value={
                  form.low_stock_threshold
                }
                onChange={handleChange}
              />

            </div>


            {/* EXPIRATION */}

            <div className="form-group">

              <label>
                Expiration Date
              </label>

              <input
                type="date"
                name="expiration_date"
                className="form-control"
                value={
                  form.expiration_date
                }
                onChange={handleChange}
              />

            </div>


            {/* SUPPLIER */}

            <div className="form-group">

              <label>Supplier</label>

              <select
                name="supplier_id"
                className="form-control"
                value={
                  form.supplier_id
                }
                onChange={handleChange}
              >

                <option value="">
                  No Supplier
                </option>

                {suppliers.map(
                  (supplier) => (

                    <option
                      key={supplier.id}
                      value={supplier.id}
                    >
                      {supplier.name}
                    </option>

                  )
                )}

              </select>

            </div>


            {/* STATUS */}

            <div className="form-group">

              <label>Status</label>

              <select
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

              </select>

            </div>


            {/* IMAGE */}

            <div className="form-group">

              <label>
                Product Image
              </label>

              <input
                id="product-image-input"
                type="file"
                accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                className="form-control"
                onChange={
                  handleImageChange
                }
              />

              <div className="form-hint">
                JPG, JPEG, PNG, or WEBP.
                Maximum 5 MB.
              </div>


              {imagePreview && (

                <div
                  style={{
                    marginTop: "12px",
                    display: "flex",
                    flexDirection: "column",
                    gap: "10px",
                  }}
                >

                  <img
                    src={imagePreview}
                    alt="Product preview"
                    style={{
                      width: "180px",
                      height: "180px",
                      objectFit: "cover",
                      borderRadius: "8px",
                      border: "1px solid #ddd",
                    }}
                  />


                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={
                      removeSelectedImage
                    }
                    disabled={saving}
                    style={{
                      width: "fit-content",
                    }}
                  >
                    Remove Selected Image
                  </button>

                </div>

              )}

            </div>


            {/* DESCRIPTION */}

            <div className="form-group">

              <label>
                Description
              </label>

              <textarea
                name="description"
                className="form-control"
                rows="4"
                value={
                  form.description
                }
                onChange={handleChange}
              />

            </div>

          </div>


          {/* MODAL FOOTER */}

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

                  {editingId
                    ? "Update Product"
                    : "Save Product"}
                </>

              )}

            </button>

          </div>

        </form>

      </Modal>


      {/* DELETE CONFIRMATION */}

      <ConfirmDialog
        open={confirmOpen}
        title="Delete Product"
        message="Are you sure you want to delete this product? This action cannot be undone."
        confirmText={
          deleting
            ? "Deleting..."
            : "Delete"
        }
        cancelText="Cancel"
        onConfirm={confirmDelete}
        onCancel={cancelDelete}
        danger
      />

    </div>
  );
}

export default Products;
