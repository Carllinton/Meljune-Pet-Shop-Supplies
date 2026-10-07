const db = require("../config/database");
const generateReference = require("../utils/generateReference");

const fs = require("fs");
const path = require("path");


// =============================================
// DELETE IMAGE FILE
// =============================================

const deleteImageFile = (imagePath) => {

    if (!imagePath) {
        return;
    }

    // Only delete local uploaded images
    if (!imagePath.startsWith("/uploads/products/")) {
        return;
    }

    const filename = path.basename(imagePath);

    const filePath = path.join(
        __dirname,
        "../uploads/products",
        filename
    );

    if (fs.existsSync(filePath)) {
        try {
            fs.unlinkSync(filePath);
        } catch (error) {
            console.error("Error deleting image file:", error);
        }
    }
};


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
                p.category_id,
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
                p.category_id,
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
            WHERE
                p.product_code LIKE ?
                OR p.name LIKE ?
                OR p.brand LIKE ?
            ORDER BY p.name ASC
        `, [
            searchTerm,
            searchTerm,
            searchTerm
        ]);


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
            description,
            status
        } = req.body;


        // =============================================
        // IMAGE
        // =============================================

        const imagePath = req.file
            ? `/uploads/products/${req.file.filename}`
            : null;


        // =============================================
        // REQUIRED FIELDS
        // =============================================

        if (
            !name ||
            !category_id ||
            !unit ||
            price === undefined
        ) {

            if (req.file) {
                deleteImageFile(imagePath);
            }

            return res.status(400).json({
                success: false,
                message: "Product name, category, unit, and price are required"
            });

        }


        const initialQuantity = Number(quantity) || 0;


        // =============================================
        // VALIDATE QUANTITY
        // =============================================

        if (initialQuantity < 0) {

            if (req.file) {
                deleteImageFile(imagePath);
            }

            return res.status(400).json({
                success: false,
                message: "Quantity cannot be negative"
            });

        }


        const productCode = generateReference("PRD");


        // =============================================
        // CHECK CATEGORY
        // =============================================

        const [category] = await connection.query(
            `
            SELECT id
            FROM categories
            WHERE id = ?
            `,
            [category_id]
        );


        if (category.length === 0) {

            if (req.file) {
                deleteImageFile(imagePath);
            }

            return res.status(400).json({
                success: false,
                message: "Category not found"
            });

        }


        // =============================================
        // CHECK SUPPLIER
        // =============================================

        if (supplier_id) {

            const [supplier] = await connection.query(
                `
                SELECT id
                FROM suppliers
                WHERE id = ?
                `,
                [supplier_id]
            );


            if (supplier.length === 0) {

                if (req.file) {
                    deleteImageFile(imagePath);
                }

                return res.status(400).json({
                    success: false,
                    message: "Supplier not found"
                });

            }

        }


        // =============================================
        // START TRANSACTION
        // =============================================

        await connection.beginTransaction();


        // =============================================
        // INSERT PRODUCT
        // =============================================

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
                productCode,
                name.trim(),
                category_id,
                brand || null,
                initialQuantity,
                unit,
                price,
                cost_price || 0,
                low_stock_threshold || 0,
                expiration_date || null,
                supplier_id || null,
                imagePath,
                description || null,
                status || "active"
            ]
        );


        // =============================================
        // RECORD INITIAL STOCK
        // =============================================

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
                    reference,
                    admin_id
                )
                VALUES (?, 'stock_in', ?, ?, ?, ?, ?, ?)
                `,
                [
                    result.insertId,
                    initialQuantity,
                    0,
                    initialQuantity,
                    "Initial stock",
                    generateReference("STK"),
                    req.user.id
                ]
            );

        }


        // =============================================
        // COMMIT
        // =============================================

        await connection.commit();


        res.status(201).json({

            success: true,

            message: "Product created successfully",

            data: {
                id: result.insertId,
                image: imagePath,
                product_code: productCode
            }

        });


    } catch (error) {

        try {
            await connection.rollback();
        } catch (rollbackError) {
            console.error("Rollback error:", rollbackError);
        }


        if (req.file) {

            const imagePath =
                `/uploads/products/${req.file.filename}`;

            deleteImageFile(imagePath);

        }


        console.error("Error creating product:", error);


        if (error.code === "ER_DUP_ENTRY") {

            return res.status(409).json({
                success: false,
                message: "Product code already exists"
            });

        }


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

    let newImagePath = null;

    try {

        const { id } = req.params;


        const {
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
            description,
            status
        } = req.body;


        // =============================================
        // CHECK PRODUCT
        // =============================================

        const [existingProduct] = await connection.query(
            `
            SELECT
                id,
                quantity,
                image,
                product_code
            FROM products
            WHERE id = ?
            `,
            [id]
        );


        if (existingProduct.length === 0) {

            if (req.file) {

                newImagePath =
                    `/uploads/products/${req.file.filename}`;

                deleteImageFile(newImagePath);

            }

            return res.status(404).json({
                success: false,
                message: "Product not found"
            });

        }


        const oldQuantity =
            Number(existingProduct[0].quantity);

        const oldImage =
            existingProduct[0].image;


        // =============================================
        // VALIDATION
        // =============================================

        if (!name || !name.trim()) {

            if (req.file) {
                deleteImageFile(
                    `/uploads/products/${req.file.filename}`
                );
            }

            return res.status(400).json({
                success: false,
                message: "Product name is required"
            });

        }


        if (!category_id) {

            if (req.file) {
                deleteImageFile(
                    `/uploads/products/${req.file.filename}`
                );
            }

            return res.status(400).json({
                success: false,
                message: "Category is required"
            });

        }


        if (
            price === undefined ||
            price === null ||
            price === ""
        ) {

            if (req.file) {
                deleteImageFile(
                    `/uploads/products/${req.file.filename}`
                );
            }

            return res.status(400).json({
                success: false,
                message: "Price is required"
            });

        }


        // =============================================
        // VALIDATE QUANTITY
        // =============================================

        const newQuantity =
            Number(quantity ?? 0);


        if (
            !Number.isInteger(newQuantity) ||
            newQuantity < 0
        ) {

            if (req.file) {
                deleteImageFile(
                    `/uploads/products/${req.file.filename}`
                );
            }

            return res.status(400).json({
                success: false,
                message: "Quantity must be a non-negative whole number"
            });

        }


        // =============================================
        // CHECK CATEGORY
        // =============================================

        const [category] =
            await connection.query(
                `
                SELECT id
                FROM categories
                WHERE id = ?
                `,
                [category_id]
            );


        if (category.length === 0) {

            if (req.file) {
                deleteImageFile(
                    `/uploads/products/${req.file.filename}`
                );
            }

            return res.status(400).json({
                success: false,
                message: "Category not found"
            });

        }


        // =============================================
        // CHECK SUPPLIER
        // =============================================

        if (
            supplier_id !== undefined &&
            supplier_id !== null &&
            supplier_id !== ""
        ) {

            const [supplier] =
                await connection.query(
                    `
                    SELECT id
                    FROM suppliers
                    WHERE id = ?
                    `,
                    [supplier_id]
                );


            if (supplier.length === 0) {

                if (req.file) {
                    deleteImageFile(
                        `/uploads/products/${req.file.filename}`
                    );
                }

                return res.status(400).json({
                    success: false,
                    message: "Supplier not found"
                });

            }

        }


        // =============================================
        // IMAGE
        // =============================================

        if (req.file) {

            newImagePath =
                `/uploads/products/${req.file.filename}`;

        } else {

            newImagePath = oldImage || null;

        }


        // =============================================
        // START TRANSACTION
        // =============================================

        await connection.beginTransaction();


        // =============================================
        // UPDATE PRODUCT
        // =============================================

        await connection.query(
            `
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
            `,
            [
                existingProduct[0].product_code,
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
                newImagePath,
                description || null,
                status || "active",
                id
            ]
        );


        // =============================================
        // STOCK IN
        // =============================================

        if (newQuantity > oldQuantity) {

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
                    reference,
                    admin_id
                )
                VALUES (?, 'stock_in', ?, ?, ?, ?, ?, ?)
                `,
                [
                    id,
                    newQuantity - oldQuantity,
                    oldQuantity,
                    newQuantity,
                    "Stock increased through product edit",
                    generateReference("STK"),
                    req.user.id
                ]
            );

        }


        // =============================================
        // STOCK OUT
        // =============================================

        else if (newQuantity < oldQuantity) {

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
                    reference,
                    admin_id
                )
                VALUES (?, 'stock_out', ?, ?, ?, ?, ?, ?)
                `,
                [
                    id,
                    oldQuantity - newQuantity,
                    oldQuantity,
                    newQuantity,
                    "Stock decreased through product edit",
                    generateReference("STK"),
                    req.user.id
                ]
            );

        }


        // =============================================
        // COMMIT
        // =============================================

        await connection.commit();


        // =============================================
        // DELETE OLD IMAGE
        // =============================================

        if (
            req.file &&
            oldImage &&
            oldImage !== newImagePath
        ) {

            deleteImageFile(oldImage);

        }


        res.json({

            success: true,

            message: "Product updated successfully",

            data: {
                image: newImagePath
            }

        });


    } catch (error) {

        try {
            await connection.rollback();
        } catch (rollbackError) {
            console.error("Rollback error:", rollbackError);
        }


        // Delete newly uploaded image if update failed
        if (req.file) {

            const uploadedImage =
                `/uploads/products/${req.file.filename}`;

            deleteImageFile(uploadedImage);

        }


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


        // =============================================
        // CHECK PRODUCT
        // =============================================

        const [product] = await db.query(
            `
            SELECT
                id,
                image
            FROM products
            WHERE id = ?
            `,
            [id]
        );


        if (product.length === 0) {

            return res.status(404).json({
                success: false,
                message: "Product not found"
            });

        }


        // =============================================
        // CHECK EXISTING SALES
        // =============================================

        const [saleItems] = await db.query(
            `
            SELECT id
            FROM sale_items
            WHERE product_id = ?
            LIMIT 1
            `,
            [id]
        );


        if (saleItems.length > 0) {

            return res.status(409).json({
                success: false,
                message:
                    "Product cannot be deleted because it has existing sales records"
            });

        }


        const imagePath = product[0].image;


        // =============================================
        // DELETE PRODUCT
        // =============================================

        await db.query(
            `
            DELETE FROM products
            WHERE id = ?
            `,
            [id]
        );


        // =============================================
        // DELETE IMAGE FILE
        // =============================================

        if (imagePath) {
            deleteImageFile(imagePath);
        }


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