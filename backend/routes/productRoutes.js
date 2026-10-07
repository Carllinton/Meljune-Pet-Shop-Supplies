const express = require("express");

const router = express.Router();

const {
    getProducts,
    getProductById,
    searchProducts,
    createProduct,
    updateProduct,
    deleteProduct
} = require("../controllers/productController");

const authenticateToken = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");

const createImageUploader =
    require("../middleware/uploadMiddleware");

const uploadProductImage =
    createImageUploader("products", "product");


// =============================================
// VIEW PRODUCTS
// ADMIN + CASHIER
// =============================================

router.get(
    "/",
    authenticateToken,
    authorizeRoles("admin", "cashier"),
    getProducts
);


router.get(
    "/search",
    authenticateToken,
    authorizeRoles("admin", "cashier"),
    searchProducts
);


router.get(
    "/:id",
    authenticateToken,
    authorizeRoles("admin", "cashier"),
    getProductById
);


// =============================================
// PRODUCT MANAGEMENT
// ADMIN ONLY
// =============================================

router.post(
    "/",
    authenticateToken,
    authorizeRoles("admin"),
    uploadProductImage.single("image"),
    createProduct
);


router.put(
    "/:id",
    authenticateToken,
    authorizeRoles("admin"),
    uploadProductImage.single("image"),
    updateProduct
);


router.delete(
    "/:id",
    authenticateToken,
    authorizeRoles("admin"),
    deleteProduct
);


module.exports = router;