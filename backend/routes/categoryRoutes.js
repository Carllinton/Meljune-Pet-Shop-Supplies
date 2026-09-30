const express = require("express");

const router = express.Router();

const {
    getCategories,
    getCategoryById,
    createCategory,
    updateCategory,
    deleteCategory
} = require("../controllers/categoryController");


// GET all categories
router.get("/", getCategories);

// GET category by ID
router.get("/:id", getCategoryById);

// CREATE category
router.post("/", createCategory);

// UPDATE category
router.put("/:id", updateCategory);

// DELETE category
router.delete("/:id", deleteCategory);


module.exports = router;