const express = require("express");

const router = express.Router();

const {
    getProducts,
    getProductById,
    searchProducts,
    createProduct,
    updateProduct,
    deleteProduct
} = require("../controllers/productController")

// GET all products
router.get("/", getProducts);

// Search products
router.get("/search", searchProducts);

// GET product by ID
router.get("/:id", getProductById);

// CREATE product
router.post("/", createProduct);

// UPDATE product
router.put("/:id", updateProduct);

// DELETE product
router.delete("/:id", deleteProduct);

module.exports = router;