import { useEffect, useMemo, useState } from "react";
import api from "../services/api";
import Modal from "../components/Modal";
import ConfirmDialog from "../components/ConfirmDialog";
import PencilIcon from "../assets/icons/pencil.png";
import TrashIcon from "../assets/icons/trash.png";
import { getUser } from "../services/auth";

const API_BASE_URL = "http://localhost:5000";

const EMPTY_FORM = {
    name: "",
    contact_person: "",
    phone: "",
    email: "",
    address: "",
    existingImage: "",
    imageFile: null,
};

function Suppliers() {
    const user = getUser();
    const isAdmin = user?.role === "admin";

    const [suppliers, setSuppliers] = useState([]);
    const [search, setSearch] = useState("");

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [modalOpen, setModalOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState(null);
    const [form, setForm] = useState({
        ...EMPTY_FORM,
    });

    const [imagePreview, setImagePreview] =
        useState("");

    const [saving, setSaving] = useState(false);
    const [formError, setFormError] = useState("");

    const [confirmOpen, setConfirmOpen] =
        useState(false);

    const [supplierToDelete, setSupplierToDelete] =
        useState(null);

    const [deleting, setDeleting] =
        useState(false);

    // ==========================================
    // IMAGE URL
    // ==========================================
    const getImageUrl = (image) => {
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
    };

    // ==========================================
    // LOAD SUPPLIERS
    // ==========================================
    const loadSuppliers = async () => {
        try {
            setLoading(true);
            setError("");

            const response =
                await api.get("/suppliers");

            const data =
                response?.data?.data ??
                response?.data ??
                [];

            setSuppliers(
                Array.isArray(data)
                    ? data
                    : []
            );
        } catch (err) {
            console.error(
                "Failed to load suppliers:",
                err
            );

            setError(
                err?.response?.data?.message ||
                "Failed to load suppliers."
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadSuppliers();
    }, []);

    // ==========================================
    // SEARCH
    // ==========================================
    const filteredSuppliers =
        useMemo(() => {
            const query =
                search.trim().toLowerCase();

            if (!query) {
                return suppliers;
            }

            return suppliers.filter(
                (supplier) => {
                    return [
                        supplier.name,
                        supplier.contact_person,
                        supplier.phone,
                        supplier.email,
                        supplier.address,
                    ]
                        .filter(Boolean)
                        .some((value) =>
                            String(value)
                                .toLowerCase()
                                .includes(
                                    query
                                )
                        );
                }
            );
        }, [suppliers, search]);

    // ==========================================
    // OPEN ADD MODAL
    // ==========================================
    const openAddModal = () => {
        setEditingSupplier(null);

        setForm({
            ...EMPTY_FORM,
        });

        setImagePreview("");
        setFormError("");
        setModalOpen(true);
    };

    // ==========================================
    // OPEN EDIT MODAL
    // ==========================================
    const openEditModal = (supplier) => {
        setEditingSupplier(supplier);

        const existingImage =
            supplier.image || "";

        setForm({
            name: supplier.name || "",
            contact_person:
                supplier.contact_person ||
                "",
            phone:
                supplier.phone || "",
            email:
                supplier.email || "",
            address:
                supplier.address || "",
            existingImage,
            imageFile: null,
        });

        setImagePreview(
            getImageUrl(existingImage)
        );

        setFormError("");
        setModalOpen(true);
    };

    // ==========================================
    // CLOSE MODAL
    // ==========================================
    const closeModal = () => {
        if (saving) return;

        setModalOpen(false);
        setEditingSupplier(null);

        setForm({
            ...EMPTY_FORM,
        });

        setImagePreview("");
        setFormError("");
    };

    // ==========================================
    // FORM CHANGE
    // ==========================================
    const handleChange = (event) => {
        const {
            name,
            value,
        } = event.target;

        setForm((previous) => ({
            ...previous,
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

        if (
            !allowedTypes.includes(
                file.type
            )
        ) {
            setFormError(
                "Invalid image format. Only JPG, JPEG, PNG, and WEBP are allowed."
            );

            event.target.value = "";
            return;
        }

        if (file.size > maxSize) {
            setFormError(
                "Image is too large. Maximum allowed size is 5 MB."
            );

            event.target.value = "";
            return;
        }

        setFormError("");

        setForm((previous) => ({
            ...previous,
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
        setForm((previous) => ({
            ...previous,
            imageFile: null,
        }));

        if (form.existingImage) {
            setImagePreview(
                getImageUrl(
                    form.existingImage
                )
            );
        } else {
            setImagePreview("");
        }

        const fileInput =
            document.getElementById(
                "supplier-image-input"
            );

        if (fileInput) {
            fileInput.value = "";
        }
    };

    // ==========================================
    // SAVE SUPPLIER
    // ==========================================
    const handleSubmit = async (event) => {
        event.preventDefault();

        const name =
            form.name.trim();

        if (!name) {
            setFormError(
                "Supplier name is required."
            );
            return;
        }

        try {
            setSaving(true);
            setFormError("");

            const formData =
                new FormData();

            formData.append(
                "name",
                name
            );

            formData.append(
                "contact_person",
                form.contact_person.trim() ||
                    ""
            );

            formData.append(
                "phone",
                form.phone.trim() ||
                    ""
            );

            formData.append(
                "email",
                form.email.trim() ||
                    ""
            );

            formData.append(
                "address",
                form.address.trim() ||
                    ""
            );

            if (form.imageFile) {
                formData.append(
                    "image",
                    form.imageFile
                );
            }

            if (editingSupplier) {
                await api.put(
                    `/suppliers/${editingSupplier.id}`,
                    formData
                );
            } else {
                await api.post(
                    "/suppliers",
                    formData
                );
            }

            closeModal();

            await loadSuppliers();
        } catch (err) {
            console.error(
                "Failed to save supplier:",
                err
            );

            setFormError(
                err?.response?.data
                    ?.message ||
                "Failed to save supplier."
            );
        } finally {
            setSaving(false);
        }
    };

    // ==========================================
    // DELETE SUPPLIER
    // ==========================================
    const askDelete = (supplier) => {
        setSupplierToDelete(
            supplier
        );

        setConfirmOpen(true);
    };

    const cancelDelete = () => {
        if (deleting) return;

        setConfirmOpen(false);
        setSupplierToDelete(null);
    };

    const handleDelete = async () => {
        if (!supplierToDelete) return;

        try {
            setDeleting(true);
            setError("");

            await api.delete(
                `/suppliers/${supplierToDelete.id}`
            );

            setConfirmOpen(false);
            setSupplierToDelete(null);

            await loadSuppliers();
        } catch (err) {
            console.error(
                "Failed to delete supplier:",
                err
            );

            setError(
                err?.response?.data
                    ?.message ||
                "Failed to delete supplier."
            );
        } finally {
            setDeleting(false);
        }
    };

    return (
        <>
            {/* PAGE HEADER */}

            <div className="page-header">

                <div className="page-header-left">

                    <h1>
                        Suppliers
                    </h1>

                    <p>
                        Manage your product suppliers
                    </p>

                </div>

                <div className="page-actions">

                    {isAdmin && (
                        <button
                            className="btn btn-primary"
                            onClick={
                                openAddModal
                            }
                        >
                            Add Supplier
                        </button>
                    )}

                </div>

            </div>


            {/* ERROR */}

            {error && (
                <div
                    className="chip chip-danger"
                    style={{
                        marginBottom:
                            "16px",
                        padding:
                            "10px 16px",
                        borderRadius:
                            "8px",
                        display:
                            "block",
                    }}
                >
                    {error}
                </div>
            )}


            {/* SEARCH */}

            <div
                className="card"
                style={{
                    marginBottom:
                        "16px",
                }}
            >

                <div
                    className="card-body"
                    style={{
                        padding:
                            "14px 16px",
                    }}
                >

                    <div className="search-box">

                        <input
                            type="text"
                            placeholder="Search suppliers, contacts, phone or email..."
                            value={search}
                            onChange={(e) =>
                                setSearch(
                                    e.target.value
                                )
                            }
                        />

                    </div>

                </div>

            </div>


            {/* SUPPLIER TABLE */}

            <div className="card">

                <div className="card-header">

                    <div>

                        <div className="card-title">
                            Suppliers
                        </div>

                        <p
                            className="text-muted text-sm"
                            style={{
                                marginTop:
                                    "4px",
                            }}
                        >
                            {
                                filteredSuppliers.length
                            }{" "}
                            of{" "}
                            {
                                suppliers.length
                            }{" "}
                            suppliers
                        </p>

                    </div>

                </div>


                <div className="table-wrap">

                    <table>

                        <thead>

                            <tr>

                                <th>
                                    Supplier
                                </th>

                                <th>
                                    Contact Person
                                </th>

                                <th>
                                    Phone
                                </th>

                                <th>
                                    Email
                                </th>

                                <th>
                                    Address
                                </th>

                                <th>
                                    Actions
                                </th>

                            </tr>

                        </thead>


                        <tbody>

                            {loading ? (

                                <tr>

                                    <td
                                        colSpan="6"
                                        style={{
                                            textAlign:
                                                "center",
                                            padding:
                                                "40px",
                                        }}
                                    >
                                        Loading suppliers...
                                    </td>

                                </tr>

                            ) : filteredSuppliers.length === 0 ? (

                                <tr>

                                    <td
                                        colSpan="6"
                                        style={{
                                            textAlign:
                                                "center",
                                            padding:
                                                "40px",
                                        }}
                                    >

                                        <strong>
                                            No suppliers found
                                        </strong>

                                        <p
                                            className="text-muted text-sm"
                                            style={{
                                                marginTop:
                                                    "4px",
                                            }}
                                        >
                                            {search
                                                ? "Try a different search."
                                                : "Add your first supplier to get started."}
                                        </p>

                                    </td>

                                </tr>

                            ) : (

                                filteredSuppliers.map(
                                    (supplier) => (

                                        <tr
                                            key={
                                                supplier.id
                                            }
                                        >

                                            {/* SUPPLIER */}

                                            <td>

                                                <div
                                                    style={{
                                                        display:
                                                            "flex",
                                                        alignItems:
                                                            "center",
                                                        gap:
                                                            "12px",
                                                    }}
                                                >

                                                    {supplier.image ? (

                                                        <img
                                                            src={getImageUrl(
                                                                supplier.image
                                                            )}
                                                            alt={
                                                                supplier.name
                                                            }
                                                            style={{
                                                                width:
                                                                    "42px",
                                                                height:
                                                                    "42px",
                                                                minWidth:
                                                                    "42px",
                                                                borderRadius:
                                                                    "12px",
                                                                objectFit:
                                                                    "cover",
                                                            }}
                                                        />

                                                    ) : null}

                                                    <div>

                                                        <strong>
                                                            {
                                                                supplier.name
                                                            }
                                                        </strong>

                                                        <div
                                                            className="text-muted text-sm"
                                                            style={{
                                                                marginTop:
                                                                    "3px",
                                                            }}
                                                        >
                                                            Supplier #
                                                            {
                                                                supplier.id
                                                            }
                                                        </div>

                                                    </div>

                                                </div>

                                            </td>


                                            {/* CONTACT */}

                                            <td>
                                                {
                                                    supplier.contact_person ||
                                                    "—"
                                                }
                                            </td>


                                            {/* PHONE */}

                                            <td>

                                                {supplier.phone ? (

                                                    <span className="text-sm">
                                                        {
                                                            supplier.phone
                                                        }
                                                    </span>

                                                ) : (

                                                    <span className="text-muted">
                                                        —
                                                    </span>

                                                )}

                                            </td>


                                            {/* EMAIL */}

                                            <td>

                                                {supplier.email ? (

                                                    <span className="text-sm">
                                                        {
                                                            supplier.email
                                                        }
                                                    </span>

                                                ) : (

                                                    <span className="text-muted">
                                                        —
                                                    </span>

                                                )}

                                            </td>


                                            {/* ADDRESS */}

                                            <td>

                                                <span className="text-sm text-muted">
                                                    {
                                                        supplier.address ||
                                                        "—"
                                                    }
                                                </span>

                                            </td>


                                            {/* ACTIONS */}

                                            <td>

                                                {isAdmin && (

                                                    <div className="action-group">

                                                        <button
                                                            type="button"
                                                            className="action-btn action-btn-edit"
                                                            title="Edit supplier"
                                                            onClick={() =>
                                                                openEditModal(
                                                                    supplier
                                                                )
                                                            }
                                                        >
                                                        <img src={PencilIcon} alt="Edit" />
                                                        </button>

                                                        <button
                                                            type="button"
                                                            className="action-btn action-btn-delete"
                                                            title="Delete supplier"
                                                            onClick={() =>
                                                                askDelete(
                                                                    supplier
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


                {!loading &&
                    filteredSuppliers.length >
                        0 && (

                        <div className="card-footer">

                            Showing{" "}

                            <strong>
                                {
                                    filteredSuppliers.length
                                }
                            </strong>{" "}

                            of{" "}

                            <strong>
                                {
                                    suppliers.length
                                }
                            </strong>{" "}

                            suppliers

                        </div>

                    )}

            </div>


            {/* ADD / EDIT MODAL */}

            <Modal
                open={modalOpen}
                title={
                    editingSupplier
                        ? "Edit Supplier"
                        : "Add Supplier"
                }
                onClose={closeModal}
            >

                <form
                    onSubmit={
                        handleSubmit
                    }
                >

                    {formError && (

                        <div
                            className="chip chip-danger"
                            style={{
                                display:
                                    "block",
                                marginBottom:
                                    "16px",
                                padding:
                                    "10px 14px",
                            }}
                        >
                            {formError}
                        </div>

                    )}


                    <div className="form-grid">


                        {/* NAME */}

                        <div className="form-group">

                            <label>
                                Supplier Name{" "}
                                <span className="text-danger">
                                    *
                                </span>
                            </label>

                            <input
                                type="text"
                                name="name"
                                className="form-control"
                                placeholder="e.g. PetNutrition Corp"
                                value={
                                    form.name
                                }
                                onChange={
                                    handleChange
                                }
                                required
                                autoFocus
                            />

                        </div>


                        {/* CONTACT */}

                        <div className="form-group">

                            <label>
                                Contact Person
                            </label>

                            <input
                                type="text"
                                name="contact_person"
                                className="form-control"
                                placeholder="e.g. Juan Dela Cruz"
                                value={
                                    form.contact_person
                                }
                                onChange={
                                    handleChange
                                }
                            />

                        </div>


                        {/* PHONE */}

                        <div className="form-group">

                            <label>
                                Phone
                            </label>

                            <input
                                type="text"
                                name="phone"
                                className="form-control"
                                placeholder="e.g. 0917-123-4567"
                                value={
                                    form.phone
                                }
                                onChange={
                                    handleChange
                                }
                            />

                        </div>


                        {/* EMAIL */}

                        <div className="form-group">

                            <label>
                                Email
                            </label>

                            <input
                                type="email"
                                name="email"
                                className="form-control"
                                placeholder="supplier@example.com"
                                value={
                                    form.email
                                }
                                onChange={
                                    handleChange
                                }
                            />

                        </div>

                        {/* ADDRESS */}

                        <div
                            className="form-group"
                            style={{
                                gridColumn:
                                    "1 / -1",
                            }}
                        >

                            <label>
                                Address
                            </label>

                            <textarea
                                name="address"
                                className="form-control"
                                rows="3"
                                placeholder="Supplier address..."
                                value={
                                    form.address
                                }
                                onChange={
                                    handleChange
                                }
                            />

                        </div>

                    </div>


                    {/* FOOTER */}

                    <div className="modal-footer">

                        <button
                            type="button"
                            className="btn btn-ghost"
                            onClick={
                                closeModal
                            }
                            disabled={
                                saving
                            }
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            className="btn btn-primary"
                            disabled={
                                saving
                            }
                        >

                            {saving ? (

                                "Saving..."

                            ) : (

                                <>

                                    {editingSupplier
                                        ? "Save Changes"
                                        : "Add Supplier"}
                                </>

                            )}

                        </button>

                    </div>

                </form>

            </Modal>


            {/* DELETE CONFIRMATION */}

            <ConfirmDialog
                open={confirmOpen}
                title="Delete Supplier"
                message={
                    supplierToDelete
                        ? `Delete "${supplierToDelete.name}"? Products assigned to this supplier may lose their supplier reference.`
                        : "Delete this supplier?"
                }
                onCancel={
                    cancelDelete
                }
                onConfirm={
                    handleDelete
                }
                loading={
                    deleting
                }
            />

        </>
    );
}

export default Suppliers;