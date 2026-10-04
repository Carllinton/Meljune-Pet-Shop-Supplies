import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../services/api";
import ConfirmDialog from "../components/ConfirmDialog";
import { getErrorMessage } from "../utils/format";
import { getUser } from "../services/auth";

const EMPTY_FORM = {
  name: "",
  description: "",
  icon: "tag",
  color: "#4CAF50",
};

function Categories() {
  const user = getUser();
  const isAdmin = user?.role === "admin";

  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [search, setSearch] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteCategory, setDeleteCategory] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // ==========================================
  // LOAD CATEGORIES + PRODUCTS
  // ==========================================
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [categoryResponse, productResponse] =
        await Promise.all([
          api.get("/categories"),
          api.get("/products"),
        ]);

      const categoryData =
        categoryResponse?.data?.data ??
        categoryResponse?.data ??
        [];

      const productData =
        productResponse?.data?.data ??
        productResponse?.data ??
        [];

      setCategories(
        Array.isArray(categoryData)
          ? categoryData
          : []
      );

      setProducts(
        Array.isArray(productData)
          ? productData
          : []
      );
    } catch (err) {
      console.error(
        "Failed to load categories:",
        err
      );

      setError(
        getErrorMessage(
          err,
          "Failed to load categories."
        )
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ==========================================
  // SUCCESS MESSAGE AUTO HIDE
  // ==========================================
  useEffect(() => {
    if (!message) return;

    const timer = setTimeout(() => {
      setMessage("");
    }, 3000);

    return () => clearTimeout(timer);
  }, [message]);

  // ==========================================
  // CATEGORY PRODUCT COUNTS
  // ==========================================
  const categoriesWithCounts = useMemo(() => {
    return categories.map((category) => {
      const categoryId = String(category.id);

      const categoryName = String(
        category.name || ""
      )
        .trim()
        .toLowerCase();

      const productCount = products.filter(
        (product) => {
          // Match by category ID
          const sameId =
            product.category_id !== undefined &&
            product.category_id !== null &&
            String(product.category_id) ===
              categoryId;

          // Match by category name
          const productCategoryName = String(
            product.category_name ||
              product.category ||
              ""
          )
            .trim()
            .toLowerCase();

          const sameName =
            productCategoryName !== "" &&
            productCategoryName === categoryName;

          // Don't count discontinued products
          const isDiscontinued =
            String(product.status || "")
              .toLowerCase() ===
            "discontinued";

          return (
            (sameId || sameName) &&
            !isDiscontinued
          );
        }
      ).length;

      return {
        ...category,
        product_count: productCount,
      };
    });
  }, [categories, products]);

  // ==========================================
  // SEARCH
  // ==========================================
  const filteredCategories = useMemo(() => {
    const query = search
      .trim()
      .toLowerCase();

    if (!query) {
      return categoriesWithCounts;
    }

    return categoriesWithCounts.filter(
      (category) => {
        return (
          String(category.name || "")
            .toLowerCase()
            .includes(query) ||
          String(category.description || "")
            .toLowerCase()
            .includes(query)
        );
      }
    );
  }, [
    categoriesWithCounts,
    search,
  ]);

  // ==========================================
  // ADD CATEGORY
  // ==========================================
  const openAddModal = () => {
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
    setError("");
    setModalOpen(true);
  };

  // ==========================================
  // EDIT CATEGORY
  // ==========================================
  const openEditModal = (category) => {
    setEditingId(category.id);

    setForm({
      name: category.name || "",
      description:
        category.description || "",
      icon: category.icon || "tag",
      color:
        category.color || "#4CAF50",
    });

    setError("");
    setModalOpen(true);
  };

  // ==========================================
  // CLOSE MODAL
  // ==========================================
  const closeModal = () => {
    if (saving) return;

    setModalOpen(false);
    setEditingId(null);
    setForm({ ...EMPTY_FORM });
  };

  // ==========================================
  // FORM CHANGE
  // ==========================================
  const handleChange = (event) => {
    const { name, value } =
      event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  };

  // ==========================================
  // SAVE CATEGORY
  // ==========================================
  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      setSaving(true);
      setError("");

      if (!form.name.trim()) {
        throw new Error(
          "Category name is required."
        );
      }

      const payload = {
        name: form.name.trim(),
        description:
          form.description.trim() || null,
        icon:
          form.icon.trim() || "tag",
        color:
          form.color || "#4CAF50",
      };

      if (editingId) {
        await api.put(
          `/categories/${editingId}`,
          payload
        );

        setMessage(
          "Category updated successfully."
        );
      } else {
        await api.post(
          "/categories",
          payload
        );

        setMessage(
          "Category added successfully."
        );
      }

      closeModal();

      await loadData();
    } catch (err) {
      console.error(
        "Failed to save category:",
        err
      );

      setError(
        getErrorMessage(
          err,
          "Failed to save category."
        )
      );
    } finally {
      setSaving(false);
    }
  };

  // ==========================================
  // DELETE
  // ==========================================
  const askDelete = (category) => {
    setDeleteCategory(category);
    setConfirmOpen(true);
  };

  const cancelDelete = () => {
    if (deleting) return;

    setConfirmOpen(false);
    setDeleteCategory(null);
  };

  const confirmDelete = async () => {
    if (!deleteCategory) return;

    try {
      setDeleting(true);
      setError("");

      await api.delete(
        `/categories/${deleteCategory.id}`
      );

      setMessage(
        "Category deleted successfully."
      );

      setConfirmOpen(false);
      setDeleteCategory(null);

      await loadData();
    } catch (err) {
      console.error(
        "Failed to delete category:",
        err
      );

      setError(
        getErrorMessage(
          err,
          "Cannot delete this category. It may still have products."
        )
      );
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="page-content">

      {/* ==========================================
          PAGE HEADER
      ========================================== */}
      <div className="page-header">
        <div className="page-header-left">
          <h1>
            <i data-feather="tag"></i>
            Categories
          </h1>

          <p>
            Organize your products into categories
          </p>
        </div>

        <div className="page-actions">
          {isAdmin && (
            <button
              type="button"
              className="btn btn-primary"
              onClick={openAddModal}
            >
              <i data-feather="plus"></i>
              Add Category
            </button>
          )}
        </div>
      </div>

      {/* ==========================================
          NOTIFICATIONS
      ========================================== */}
      {message && (
        <div className="alert alert-success">
          <i data-feather="check-circle"></i>
          <span>{message}</span>
        </div>
      )}

      {error && !modalOpen && (
        <div className="alert alert-danger">
          <i data-feather="alert-circle"></i>
          <span>{error}</span>
        </div>
      )}

      {/* ==========================================
          SEARCH
      ========================================== */}
      <div className="card">
        <div className="card-body">
          <div className="filter-bar">

            <div className="search-box">
              <i data-feather="search"></i>

              <input
                type="text"
                className="form-control"
                placeholder="Search categories..."
                value={search}
                onChange={(event) =>
                  setSearch(
                    event.target.value
                  )
                }
              />
            </div>

            {search && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() =>
                  setSearch("")
                }
              >
                <i data-feather="x"></i>
                Reset
              </button>
            )}

          </div>
        </div>
      </div>

      {/* ==========================================
          CATEGORY GRID
      ========================================== */}
      {loading ? (
        <div className="card">
          <div className="card-body">
            <div className="empty-state">
              Loading categories...
            </div>
          </div>
        </div>
      ) : filteredCategories.length === 0 ? (
        <div className="card">
          <div className="card-body">
            <div className="empty-state">
              <i data-feather="tag"></i>

              <p>
                {search
                  ? "No categories found."
                  : "No categories available."}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div
          className="grid-3"
          style={{
            gap: "16px",
          }}
        >
          {filteredCategories.map(
            (category) => {
              const categoryColor =
                category.color ||
                "#4CAF50";

              return (
                <div
                  className="card"
                  key={category.id}
                  style={{
                    borderTop:
                      `4px solid ${categoryColor}`,
                  }}
                >
                  <div className="card-body">

                    {/* ICON + ACTIONS */}
                    <div
                      className="flex justify-between items-center"
                      style={{
                        marginBottom: "12px",
                      }}
                    >
                      <div
                        className="stat-icon"
                        style={{
                          width: "44px",
                          height: "44px",
                          borderRadius:
                            "12px",
                          background:
                            `${categoryColor}22`,
                          color:
                            categoryColor,
                        }}
                      >
                        <i
                          data-feather={
                            category.icon ||
                            "tag"
                          }
                        ></i>
                      </div>

                      {isAdmin && (
                        <div className="action-group">

                          <button
                            type="button"
                            className="action-btn action-btn-edit"
                          title="Edit Category"
                          onClick={() =>
                            openEditModal(
                              category
                            )
                          }
                        >
                          <i data-feather="edit-2"></i>
                        </button>

                        <button
                          type="button"
                          className="action-btn action-btn-delete"
                          title="Delete Category"
                          onClick={() =>
                            askDelete(
                              category
                            )
                          }
                        >
                          <i data-feather="trash-2"></i>
                          </button>

                        </div>
                      )}
                    </div>

                    {/* NAME */}
                    <h3
                      style={{
                        fontWeight: 700,
                        marginBottom: "4px",
                      }}
                    >
                      {category.name}
                    </h3>

                    {/* DESCRIPTION */}
                    <p
                      className="text-sm text-muted"
                      style={{
                        marginBottom:
                          "12px",
                      }}
                    >
                      {category.description ||
                        "No description"}
                    </p>

                    {/* PRODUCT COUNT */}
                    <div className="flex items-center gap-8">
                      <span className="chip chip-primary">
                        {category.product_count}{" "}
                        {category.product_count ===
                        1
                          ? "product"
                          : "products"}
                      </span>
                    </div>

                  </div>
                </div>
              );
            }
          )}
        </div>
      )}

      {/* ==========================================
          FOOTER COUNT
      ========================================== */}
      {!loading && (
        <div
          className="text-sm text-muted"
          style={{
            marginTop: "16px",
          }}
        >
          Showing{" "}
          {filteredCategories.length} of{" "}
          {categories.length} categories
        </div>
      )}

      {/* ==========================================
          ADD / EDIT MODAL
      ========================================== */}
      {modalOpen && (
        <div
          className="modal-overlay"
          onMouseDown={(event) => {
            if (
              event.target ===
              event.currentTarget
            ) {
              closeModal();
            }
          }}
        >
          <div
            className="modal-box"
            style={{
              maxWidth: "480px",
            }}
          >
            <div className="modal-header">
              <h2>
                {editingId
                  ? "Edit Category"
                  : "Add Category"}
              </h2>

              <button
                type="button"
                className="modal-close"
                onClick={closeModal}
                disabled={saving}
              >
                <i data-feather="x"></i>
              </button>
            </div>

            <form
              onSubmit={handleSubmit}
            >
              <div className="modal-body">

                {error && (
                  <div className="alert alert-danger">
                    <i data-feather="alert-circle"></i>

                    <span>
                      {error}
                    </span>
                  </div>
                )}

                <div className="form-grid">

                  {/* NAME */}
                  <div className="form-group">
                    <label>
                      Name{" "}
                      <span className="req">
                        *
                      </span>
                    </label>

                    <input
                      type="text"
                      name="name"
                      className="form-control"
                      value={form.name}
                      onChange={
                        handleChange
                      }
                      required
                      placeholder="e.g. Dog Food"
                    />
                  </div>

                  {/* ICON */}
                  <div className="form-group">
                    <label>
                      Icon (Feather icon name)
                    </label>

                    <input
                      type="text"
                      name="icon"
                      className="form-control"
                      value={form.icon}
                      onChange={
                        handleChange
                      }
                      placeholder="tag"
                    />

                    <span className="form-hint">
                      Use a Feather icon
                      name such as dog,
                      cat, tag, heart,
                      or box.
                    </span>
                  </div>

                  {/* COLOR */}
                  <div className="form-group">
                    <label>
                      Color
                    </label>

                    <input
                      type="color"
                      name="color"
                      className="form-control"
                      value={form.color}
                      onChange={
                        handleChange
                      }
                      style={{
                        height: "40px",
                        cursor:
                          "pointer",
                      }}
                    />
                  </div>

                  {/* DESCRIPTION */}
                  <div className="form-group">
                    <label>
                      Description
                    </label>

                    <textarea
                      name="description"
                      className="form-control"
                      rows="3"
                      value={
                        form.description
                      }
                      onChange={
                        handleChange
                      }
                      placeholder="Optional..."
                    />
                  </div>

                </div>
              </div>

              <div className="modal-footer">

                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={
                    closeModal
                  }
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={saving}
                >
                  <i data-feather="save"></i>

                  {saving
                    ? "Saving..."
                    : "Save"}
                </button>

              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==========================================
          DELETE CONFIRMATION
      ========================================== */}
      <ConfirmDialog
        open={confirmOpen}
        title="Delete Category"
        message={
          deleteCategory
            ? `Delete "${deleteCategory.name}"? Categories that still have products cannot be deleted.`
            : "Delete this category?"
        }
        confirmText={
          deleting
            ? "Deleting..."
            : "Delete"
        }
        cancelText="Cancel"
        onConfirm={
          confirmDelete
        }
        onCancel={
          cancelDelete
        }
        danger
      />

    </div>
  );
}

export default Categories;