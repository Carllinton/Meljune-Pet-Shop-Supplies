import { useCallback, useEffect, useMemo, useState } from "react";
import api from "../services/api";
import ConfirmDialog from "../components/ConfirmDialog";
import { getErrorMessage } from "../utils/format";
import { getUser } from "../services/auth";
import editIcon from "../assets/icons/pencil.png";
import deleteIcon from "../assets/icons/trash.png";

const API_BASE_URL = "http://localhost:5000";

const EMPTY_FORM = {
  name: "",
  description: "",
  color: "#4CAF50",
  existingImage: "",
  imageFile: null,
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
  const [form, setForm] = useState({
    ...EMPTY_FORM,
  });

  const [imagePreview, setImagePreview] = useState("");

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [deleteCategory, setDeleteCategory] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // ==========================================
  // IMAGE URL
  // ==========================================
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
          const sameId =
            product.category_id !== undefined &&
            product.category_id !== null &&
            String(product.category_id) ===
              categoryId;

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
    setForm({
      ...EMPTY_FORM,
    });
    setImagePreview("");
    setError("");
    setModalOpen(true);
  };

  // ==========================================
  // EDIT CATEGORY
  // ==========================================
  const openEditModal = (category) => {
    setEditingId(category.id);

    const existingImage =
      category.image || "";

    setForm({
      name: category.name || "",
      description:
        category.description || "",
      color:
        category.color || "#4CAF50",
      existingImage,
      imageFile: null,
    });

    setImagePreview(
      getImageUrl(existingImage)
    );

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
    setForm({
      ...EMPTY_FORM,
    });
    setImagePreview("");
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
  // IMAGE CHANGE
  // ==========================================
  const handleImageChange = (event) => {
    const file =
      event.target.files?.[0];

    if (!file) return;

    const allowedTypes = [
      "image/jpeg",
      "image/jpg",
      "image/png",
      "image/webp",
    ];

    const maxSize =
      5 * 1024 * 1024;

    if (!allowedTypes.includes(file.type)) {
      setError(
        "Invalid image format. Only JPG, JPEG, PNG, and WEBP are allowed."
      );

      event.target.value = "";
      return;
    }

    if (file.size > maxSize) {
      setError(
        "Image is too large. Maximum allowed size is 5 MB."
      );

      event.target.value = "";
      return;
    }

    setError("");

    setForm((current) => ({
      ...current,
      imageFile: file,
    }));

    const previewUrl =
      URL.createObjectURL(file);

    setImagePreview(previewUrl);
  };

  // ==========================================
  // REMOVE SELECTED IMAGE
  // ==========================================
  const removeSelectedImage = () => {
    setForm((current) => ({
      ...current,
      imageFile: null,
    }));

    if (form.existingImage) {
      setImagePreview(
        getImageUrl(form.existingImage)
      );
    } else {
      setImagePreview("");
    }

    const fileInput =
      document.getElementById(
        "category-image-input"
      );

    if (fileInput) {
      fileInput.value = "";
    }
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

      const formData =
        new FormData();

      formData.append(
        "name",
        form.name.trim()
      );

      formData.append(
        "description",
        form.description.trim() ||
          ""
      );

      formData.append(
        "color",
        form.color || "#4CAF50"
      );

      if (form.imageFile) {
        formData.append(
          "image",
          form.imageFile
        );
      }

      if (editingId) {
        await api.put(
          `/categories/${editingId}`,
          formData
        );

        setMessage(
          "Category updated successfully."
        );
      } else {
        await api.post(
          "/categories",
          formData
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

      {/* PAGE HEADER */}
      <div className="page-header">

        <div className="page-header-left">

          <h1>
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
              Add Category
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


      {/* SEARCH */}

      <div className="card" style={{ marginBottom: "16px" }}>

        <div className="card-body">

          <div className="filter-bar">

            <div className="search-box">

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
                Reset
              </button>
            )}

          </div>

        </div>

      </div>


      {/* CATEGORY GRID */}

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

                    {/* NAME */}

                    <h3
                      style={{
                        fontWeight: 700,
                        fontSize: "1.7rem",
                        marginBottom:
                          "8px",
                      }}
                    >
                      {category.name}
                    </h3>


                    {/* DESCRIPTION */}

                    <p
                      className="text-sm text-muted"
                      style={{
                        marginBottom: "12px",
                        fontSize: "1rem",
                      }}
                    >
                      {category.description ||
                        "No description"}
                    </p>


                    {/* PRODUCT COUNT */}

                    <div
                      className="flex items-center gap-8"
                      style={{
                        justifyContent: "space-between",
                      }}
                    >

                      <span className="chip chip-primary">

                        {category.product_count}{" "}

                        {category.product_count ===
                        1
                          ? "product"
                          : "products"}

                      </span>

                      {isAdmin && (
                        <div className="action-group">
                          <button
                            type="button"
                            className="action-btn action-btn-edit"
                            onClick={() =>
                              openEditModal(category)
                            }
                            aria-label={`Edit ${category.name}`}
                            title={`Edit ${category.name}`}
                          >
                            <img src={editIcon} alt="" aria-hidden="true" />
                          </button>

                          <button
                            type="button"
                            className="action-btn action-btn-delete"
                            onClick={() =>
                              askDelete(category)
                            }
                            aria-label={`Delete ${category.name}`}
                            title={`Delete ${category.name}`}
                          >
                            <img src={deleteIcon} alt="" aria-hidden="true" />
                          </button>
                        </div>
                      )}

                    </div>

                  </div>

                </div>

              );
            }
          )}

        </div>

      )}


      {/* FOOTER COUNT */}

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


      {/* ADD / EDIT MODAL */}

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
              maxWidth: "520px",
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
              </button>

            </div>


            <form onSubmit={handleSubmit}>

              <div className="modal-body">

                {error && (

                  <div className="alert alert-danger">

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
                    : "Save"}

                </button>

              </div>

            </form>

          </div>

        </div>

      )}


      {/* DELETE CONFIRMATION */}

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