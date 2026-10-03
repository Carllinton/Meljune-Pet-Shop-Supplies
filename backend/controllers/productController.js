const db = require("../config/database");


// =============================================
// GET ALL PRODUCTS
// =============================================
const getProducts = async (req, res) => {
    try {
        const [products] = await db.query(`
            SELECT
                p.id,
                p.product_code,
                p.name,
                p.brand,
                p.quantity,
                p.unit,
                p.price,
                p.cost_price,
                p.low_stock_threshold,
                p.expiration_date,
                p.supplier_id,
                p.image,
                p.description,
                p.status,
                c.name AS category_name,
                s.name AS supplier_name
            FROM products p
            INNER JOIN categories c
                ON p.category_id = c.id
            LEFT JOIN suppliers s
                ON p.supplier_id = s.id
            ORDER BY p.id DESC
        `);

        res.json({
            success: true,
            data: products
        });

    } catch (error) {
        console.error("Error fetching products:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch products"
        });
    }
};


// =============================================
// GET PRODUCT BY ID
// =============================================
const getProductById = async (req, res) => {
    try {
        const { id } = req.params;

        const [products] = await db.query(`
            SELECT
                p.*,
                c.name AS category_name,
                s.name AS supplier_name
            FROM products p
            INNER JOIN categories c
                ON p.category_id = c.id
            LEFT JOIN suppliers s
                ON p.supplier_id = s.id
            WHERE p.id = ?
        `, [id]);

        if (products.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }

        res.json({
            success: true,
            data: products[0]
        });

    } catch (error) {
        console.error("Error fetching product:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch product"
        });
    }
};


// =============================================
// SEARCH PRODUCTS
// =============================================
const searchProducts = async (req, res) => {
    try {
        const { query } = req.query;

        if (!query || query.trim() === "") {
            return res.json({
                success: true,
                data: []
            });
        }

        const searchTerm = `%${query.trim()}%`;

        const [products] = await db.query(`
            SELECT
                p.id,
                p.product_code,
                p.name,
                p.brand,
                p.quantity,
                p.unit,
                p.price,
                p.cost_price,
                p.low_stock_threshold,
                p.expiration_date,
                p.image,
                p.status,
                c.name AS category_name,
                s.name AS supplier_name
            FROM products p
            INNER JOIN categories c
                ON p.category_id = c.id
            LEFT JOIN suppliers s
                ON p.supplier_id = s.id
            WHERE
                p.product_code LIKE ?
                OR p.name LIKE ?
                OR p.brand LIKE ?
            ORDER BY p.name ASC
        `, [searchTerm, searchTerm, searchTerm]);

        res.json({
            success: true,
            data: products
        });

    } catch (error) {
        console.error("Error searching products:", error);

        res.status(500).json({
            success: false,
            message: "Failed to search products"
        });
    }
};


// =============================================
// CREATE PRODUCT
// =============================================
const createProduct = async (req, res) => {
    const connection = await db.getConnection();

    try {
        const {
            product_code,
            name,
            category_id,
            brand,
            quantity,
            unit,
            price,
            cost_price,
            low_stock_threshold,
            expiration_date,
            supplier_id,
            image,
            description,
            status
        } = req.body;

        // Required fields
        if (!product_code || !name || !category_id || !unit || price === undefined) {
            return res.status(400).json({
                success: false,
                message: "Product code, name, category, unit, and price are required"
            });
        }

        const initialQuantity = Number(quantity) || 0;

        // Prevent negative initial stock
        if (initialQuantity < 0) {
            return res.status(400).json({
                success: false,
                message: "Quantity cannot be negative"
            });
        }

        // Check duplicate product code
        const [existingProduct] = await connection.query(
            `SELECT id FROM products WHERE product_code = ?`,
            [product_code]
        );

        if (existingProduct.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Product code already exists"
            });
        }

        // Check category
        const [category] = await connection.query(
            `SELECT id FROM categories WHERE id = ?`,
            [category_id]
        );

        if (category.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Category not found"
            });
        }

        // Check supplier if provided
        if (supplier_id) {
            const [supplier] = await connection.query(
                `SELECT id FROM suppliers WHERE id = ?`,
                [supplier_id]
            );

            if (supplier.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: "Supplier not found"
                });
            }
        }

        // Start transaction
        await connection.beginTransaction();

        // Create product
        const [result] = await connection.query(
            `
            INSERT INTO products
            (
                product_code,
                name,
                category_id,
                brand,
                quantity,
                unit,
                price,
                cost_price,
                low_stock_threshold,
                expiration_date,
                supplier_id,
                image,
                description,
                status
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
            [
                product_code,
                name,
                category_id,
                brand || null,
                initialQuantity,
                unit,
                price,
                cost_price || 0,
                low_stock_threshold || 0,
                expiration_date || null,
                supplier_id || null,
                image || null,
                description || null,
                status || "active"
            ]
        );

        // If initial stock was added, record it in stock_transactions
        if (initialQuantity > 0) {
            await connection.query(
                `
                INSERT INTO stock_transactions
                (
                    product_id,
                    transaction_type,
                    quantity,
                    quantity_before,
                    quantity_after,
                    reason,
                    admin_id
                )
                VALUES (?, 'stock_in', ?, ?, ?, ?, ?)
                `,
                [
                    result.insertId,
                    initialQuantity,
                    0,
                    initialQuantity,
                    "Initial stock",
                    1
                ]
            );
        }

        // Complete transaction
        await connection.commit();

        res.status(201).json({
            success: true,
            message: "Product created successfully",
            data: {
                id: result.insertId
            }
        });

    } catch (error) {
        // Undo everything if something fails
        await connection.rollback();

        console.error("Error creating product:", error);

        res.status(500).json({
            success: false,
            message: "Failed to create product"
        });

    } finally {
        connection.release();
    }
};


// =============================================
// UPDATE PRODUCT
// =============================================
const updateProduct = async (req, res) => {
    const connection = await db.getConnection();

    try {
        const { id } = req.params;

        const {
            product_code,
            name,
            category_id,
            brand,
            quantity,
            unit,
            price,
            cost_price,
            low_stock_threshold,
            expiration_date,
            supplier_id,
            image,
            description,
            status
        } = req.body;


        // -----------------------------
        // CHECK PRODUCT
        // -----------------------------
        const [existingProduct] = await connection.query(`
            SELECT id, quantity
            FROM products
            WHERE id = ?
        `, [id]);


        if (existingProduct.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }


        // -----------------------------
        // VALIDATION
        // -----------------------------
        if (!product_code || !product_code.trim()) {
            return res.status(400).json({
                success: false,
                message: "Product code is required"
            });
        }

        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: "Product name is required"
            });
        }

        if (!category_id) {
            return res.status(400).json({
                success: false,
                message: "Category is required"
            });
        }

        if (price === undefined || price === null || price === "") {
            return res.status(400).json({
                success: false,
                message: "Price is required"
            });
        }


        // -----------------------------
        // VALIDATE QUANTITY
        // -----------------------------
        const newQuantity = Number(quantity ?? 0);

        if (!Number.isInteger(newQuantity) || newQuantity < 0) {
            return res.status(400).json({
                success: false,
                message: "Quantity must be a non-negative whole number"
            });
        }

        const oldQuantity = Number(existingProduct[0].quantity);


        // -----------------------------
        // CHECK DUPLICATE PRODUCT CODE
        // -----------------------------
        const [duplicateProduct] = await connection.query(`
            SELECT id
            FROM products
            WHERE product_code = ?
            AND id != ?
        `, [product_code.trim(), id]);


        if (duplicateProduct.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Product code already exists"
            });
        }


        // -----------------------------
        // CHECK CATEGORY
        // -----------------------------
        const [category] = await connection.query(`
            SELECT id
            FROM categories
            WHERE id = ?
        `, [category_id]);


        if (category.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Category not found"
            });
        }


        // -----------------------------
        // CHECK SUPPLIER
        // -----------------------------
        if (supplier_id !== undefined && supplier_id !== null && supplier_id !== "") {

            const [supplier] = await connection.query(`
                SELECT id
                FROM suppliers
                WHERE id = ?
            `, [supplier_id]);


            if (supplier.length === 0) {
                return res.status(400).json({
                    success: false,
                    message: "Supplier not found"
                });
            }
        }


        // -----------------------------
        // START DATABASE TRANSACTION
        // -----------------------------
        await connection.beginTransaction();


        // -----------------------------
        // UPDATE PRODUCT
        // -----------------------------
        await connection.query(`
            UPDATE products
            SET
                product_code = ?,
                name = ?,
                category_id = ?,
                brand = ?,
                quantity = ?,
                unit = ?,
                price = ?,
                cost_price = ?,
                low_stock_threshold = ?,
                expiration_date = ?,
                supplier_id = ?,
                image = ?,
                description = ?,
                status = ?
            WHERE id = ?
        `, [
            product_code.trim(),
            name.trim(),
            category_id,
            brand || null,
            newQuantity,
            unit || "pcs",
            price,
            cost_price ?? 0,
            low_stock_threshold ?? 10,
            expiration_date || null,
            supplier_id || null,
            image || null,
            description || null,
            status || "active",
            id
        ]);


        // -----------------------------
        // CREATE STOCK TRANSACTION
        // -----------------------------

        if (newQuantity > oldQuantity) {

            // Stock increased
            await connection.query(`
                INSERT INTO stock_transactions
                (
                    product_id,
                    transaction_type,
                    quantity,
                    quantity_before,
                    quantity_after,
                    reason,
                    admin_id
                )
                VALUES (?, 'stock_in', ?, ?, ?, ?, ?)
            `, [
                id,
                newQuantity - oldQuantity,
                oldQuantity,
                newQuantity,
                "Stock increased through product edit",
                1
            ]);

        } else if (newQuantity < oldQuantity) {

            // Stock decreased
            await connection.query(`
                INSERT INTO stock_transactions
                (
                    product_id,
                    transaction_type,
                    quantity,
                    quantity_before,
                    quantity_after,
                    reason,
                    admin_id
                )
                VALUES (?, 'stock_out', ?, ?, ?, ?, ?)
            `, [
                id,
                oldQuantity - newQuantity,
                oldQuantity,
                newQuantity,
                "Stock decreased through product edit",
                1
            ]);
        }


        // -----------------------------
        // COMPLETE TRANSACTION
        // -----------------------------
        await connection.commit();


        res.json({
            success: true,
            message: "Product updated successfully"
        });


    } catch (error) {

        await connection.rollback();

        console.error("Error updating product:", error);

        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                success: false,
                message: "Product code already exists"
            });
        }

        res.status(500).json({
            success: false,
            message: "Failed to update product"
        });

    } finally {
        connection.release();
    }
};


// =============================================
// DELETE PRODUCT
// =============================================
const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;


        // -----------------------------
        // CHECK PRODUCT
        // -----------------------------
        const [product] = await db.query(`
            SELECT id
            FROM products
            WHERE id = ?
        `, [id]);


        if (product.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Product not found"
            });
        }


        // -----------------------------
        // CHECK EXISTING SALES
        // -----------------------------
        const [saleItems] = await db.query(`
            SELECT id
            FROM sale_items
            WHERE product_id = ?
            LIMIT 1
        `, [id]);


        if (saleItems.length > 0) {
            return res.status(409).json({
                success: false,
                message: "Product cannot be deleted because it has existing sales records"
            });
        }


        // -----------------------------
        // DELETE PRODUCT
        // -----------------------------
        await db.query(`
            DELETE FROM products
            WHERE id = ?
        `, [id]);


        res.json({
            success: true,
            message: "Product deleted successfully"
        });


    } catch (error) {

        console.error("Error deleting product:", error);

        res.status(500).json({
            success: false,
            message: "Failed to delete product"
        });
    }
};


// =============================================
// EXPORT
// =============================================
module.exports = {
    getProducts,
    getProductById,
    searchProducts,
    createProduct,
    updateProduct,
    deleteProduct
};