const db = require("../config/database");


// =============================================
// GET ALL CATEGORIES
// =============================================
const getCategories = async (req, res) => {
    try {
        const [categories] = await db.query(`
            SELECT
                id,
                name,
                description,
                icon,
                color,
                created_at
            FROM categories
            ORDER BY id ASC
        `);

        res.json({
            success: true,
            data: categories
        });

    } catch (error) {
        console.error("Error fetching categories:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch categories"
        });
    }
};


// =============================================
// GET CATEGORY BY ID
// =============================================
const getCategoryById = async (req, res) => {
    try {
        const { id } = req.params;

        const [categories] = await db.query(`
            SELECT
                id,
                name,
                description,
                icon,
                color,
                created_at
            FROM categories
            WHERE id = ?
        `, [id]);

        if (categories.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Category not found"
            });
        }

        res.json({
            success: true,
            data: categories[0]
        });

    } catch (error) {
        console.error("Error fetching category:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch category"
        });
    }
};


// =============================================
// CREATE CATEGORY
// =============================================
const createCategory = async (req, res) => {
    try {
        const {
            name,
            description,
            icon,
            color
        } = req.body;


        // -----------------------------
        // VALIDATION
        // -----------------------------
        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: "Category name is required"
            });
        }


        // -----------------------------
        // CHECK DUPLICATE NAME
        // -----------------------------
        const [existingCategory] = await db.query(`
            SELECT id
            FROM categories
            WHERE name = ?
        `, [name.trim()]);


        if (existingCategory.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Category name already exists"
            });
        }


        // -----------------------------
        // INSERT CATEGORY
        // -----------------------------
        const [result] = await db.query(`
            INSERT INTO categories (
                name,
                description,
                icon,
                color
            )
            VALUES (?, ?, ?, ?)
        `, [
            name.trim(),
            description || null,
            icon || "tag",
            color || "#4CAF50"
        ]);


        // -----------------------------
        // RESPONSE
        // -----------------------------
        res.status(201).json({
            success: true,
            message: "Category created successfully",
            data: {
                id: result.insertId
            }
        });


    } catch (error) {
        console.error("Error creating category:", error);


        // MySQL duplicate key protection
        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                success: false,
                message: "Category name already exists"
            });
        }


        res.status(500).json({
            success: false,
            message: "Failed to create category"
        });
    }
};


// =============================================
// UPDATE CATEGORY
// =============================================
const updateCategory = async (req, res) => {
    try {
        const { id } = req.params;

        const {
            name,
            description,
            icon,
            color
        } = req.body;


        // -----------------------------
        // CHECK CATEGORY
        // -----------------------------
        const [existingCategory] = await db.query(`
            SELECT id
            FROM categories
            WHERE id = ?
        `, [id]);


        if (existingCategory.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Category not found"
            });
        }


        // -----------------------------
        // VALIDATION
        // -----------------------------
        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: "Category name is required"
            });
        }


        // -----------------------------
        // CHECK DUPLICATE NAME
        // -----------------------------
        const [duplicateCategory] = await db.query(`
            SELECT id
            FROM categories
            WHERE name = ?
            AND id != ?
        `, [name.trim(), id]);


        if (duplicateCategory.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Category name already exists"
            });
        }


        // -----------------------------
        // UPDATE CATEGORY
        // -----------------------------
        await db.query(`
            UPDATE categories
            SET
                name = ?,
                description = ?,
                icon = ?,
                color = ?
            WHERE id = ?
        `, [
            name.trim(),
            description || null,
            icon || "tag",
            color || "#4CAF50",
            id
        ]);


        res.json({
            success: true,
            message: "Category updated successfully"
        });


    } catch (error) {
        console.error("Error updating category:", error);


        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                success: false,
                message: "Category name already exists"
            });
        }


        res.status(500).json({
            success: false,
            message: "Failed to update category"
        });
    }
};


// =============================================
// DELETE CATEGORY
// =============================================
const deleteCategory = async (req, res) => {
    try {
        const { id } = req.params;


        // -----------------------------
        // CHECK CATEGORY
        // -----------------------------
        const [category] = await db.query(`
            SELECT id
            FROM categories
            WHERE id = ?
        `, [id]);


        if (category.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Category not found"
            });
        }


        // -----------------------------
        // CHECK PRODUCTS
        // -----------------------------
        const [products] = await db.query(`
            SELECT id
            FROM products
            WHERE category_id = ?
            LIMIT 1
        `, [id]);


        if (products.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Category cannot be deleted because it is being used by products"
            });
        }


        // -----------------------------
        // DELETE CATEGORY
        // -----------------------------
        await db.query(`
            DELETE FROM categories
            WHERE id = ?
        `, [id]);


        res.json({
            success: true,
            message: "Category deleted successfully"
        });


    } catch (error) {
        console.error("Error deleting category:", error);


        res.status(500).json({
            success: false,
            message: "Failed to delete category"
        });
    }
};


// =============================================
// EXPORT
// =============================================
module.exports = {
    getCategories,
    getCategoryById,
    createCategory,
    updateCategory,
    deleteCategory
};