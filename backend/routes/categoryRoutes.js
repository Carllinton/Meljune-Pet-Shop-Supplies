const express = require("express");

const router = express.Router();

const {
    getCategories,
    getCategoryById,
    createCategory,
    updateCategory,
    deleteCategory
} = require("../controllers/categoryController");

const authenticateToken = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const createImageUploader =
    require("../middleware/uploadMiddleware");

const uploadCategoryImage =
    createImageUploader("categories", "category");

// =============================================
// VIEW CATEGORIES
// ADMIN + CASHIER
// =============================================

router.get(
    "/",
    authenticateToken,
    authorizeRoles("admin", "cashier"),
    getCategories
);

router.get(
    "/:id",
    authenticateToken,
    authorizeRoles("admin", "cashier"),
    getCategoryById
);


// =============================================
// CATEGORY MANAGEMENT
// ADMIN ONLY
// =============================================

router.post(
    "/",
    authenticateToken,
    authorizeRoles("admin"),
    uploadCategoryImage.single("image"),
    createCategory
);

router.put(
    "/:id",
    authenticateToken,
    authorizeRoles("admin"),
    uploadCategoryImage.single("image"),
    updateCategory
);

router.delete(
    "/:id",
    authenticateToken,
    authorizeRoles("admin"),
    deleteCategory
);


module.exports = router;