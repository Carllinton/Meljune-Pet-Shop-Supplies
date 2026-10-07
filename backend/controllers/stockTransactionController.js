const db = require("../config/database");

const getStockTransactions = async (req, res) => {
    try {
        const [transactions] = await db.query(`
            SELECT
                st.*,

                p.name AS product_name,
                p.product_code AS product_code,

                c.name AS category_name,

                CASE
                    WHEN st.admin_id = 1 THEN 'Cashier'
                    WHEN st.admin_id = 2 THEN 'Manager'
                    ELSE 'Unknown'
                END AS admin_role

            FROM stock_transactions st

            LEFT JOIN products p
                ON st.product_id = p.id

            LEFT JOIN categories c
                ON p.category_id = c.id

            ORDER BY st.created_at DESC
        `);

        res.status(200).json({
            success: true,
            data: transactions
        });

    } catch (error) {
        console.error(
            "Get stock transactions error:",
            error
        );

        res.status(500).json({
            success: false,
            message: "Failed to fetch stock transactions."
        });
    }
};

const getStockTransactionsByProduct = async (req, res) => {
    try {
        const { productId } = req.params;

        const [transactions] = await db.query(`
            SELECT
                st.id,
                st.product_id,
                p.product_code,
                p.name AS product_name,
                c.name AS category_name,
                st.transaction_type,
                st.quantity,
                st.quantity_before,
                st.quantity_after,
                st.reason,
                st.reference,
                st.admin_id,
                st.created_at
            FROM stock_transactions st
                INNER JOIN products p ON st.product_id = p.id
                LEFT JOIN categories c ON p.category_id = c.id
            WHERE st.product_id = ?
            ORDER BY st.id DESC
        `, [productId]);

        res.json({
            success: true,
            data: transactions
        });

    } catch (error) {
        console.error("Error fetching product stock transactions:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch product stock transactions"
        });
    }
};

const adjustStock = async (req, res) => {
    const {
        product_id,
        transaction_type,
        quantity,
        reference,
        reason,
        admin_id = 1
    } = req.body;

    if (!product_id || !transaction_type || quantity === undefined) {
        return res.status(400).json({
            success: false,
            message: "Product, transaction type, and quantity are required."
        });
    }

    const validTypes = ["stock_in", "stock_out", "adjustment"];

    if (!validTypes.includes(transaction_type)) {
        return res.status(400).json({
            success: false,
            message: "Invalid transaction type."
        });
    }

    const inputQuantity = Number(quantity);

    if (!Number.isInteger(inputQuantity) || inputQuantity < 0) {
        return res.status(400).json({
            success: false,
            message: "Quantity must be a non-negative whole number."
        });
    }

    const connection = await db.getConnection();

    try {
        await connection.beginTransaction();

        // Get current product stock
        const [products] = await connection.query(
            `SELECT id, quantity
             FROM products
             WHERE id = ?
             FOR UPDATE`,
            [product_id]
        );

        if (products.length === 0) {
            await connection.rollback();

            return res.status(404).json({
                success: false,
                message: "Product not found."
            });
        }

        const currentQuantity = Number(products[0].quantity);
        let newQuantity;
        let changeQuantity;

        // STOCK IN
        if (transaction_type === "stock_in") {
            if (inputQuantity <= 0) {
                throw new Error("Stock In quantity must be greater than 0.");
            }

            newQuantity = currentQuantity + inputQuantity;
            changeQuantity = inputQuantity;
        }

        // STOCK OUT
        else if (transaction_type === "stock_out") {
            if (inputQuantity <= 0) {
                throw new Error("Stock Out quantity must be greater than 0.");
            }

            if (inputQuantity > currentQuantity) {
                throw new Error(
                    `Insufficient stock. Current stock is ${currentQuantity}.`
                );
            }

            newQuantity = currentQuantity - inputQuantity;
            changeQuantity = inputQuantity;
        }

        // EXACT ADJUSTMENT
        else {
            newQuantity = inputQuantity;
            changeQuantity = Math.abs(newQuantity - currentQuantity);
        }

        // Nothing actually changed
        if (newQuantity === currentQuantity) {
            throw new Error("The new quantity is the same as the current stock.");
        }

        // Update product quantity
        await connection.query(
            `UPDATE products
             SET quantity = ?
             WHERE id = ?`,
            [newQuantity, product_id]
        );

        // Determine transaction quantity
        const transactionQuantity =
            transaction_type === "adjustment"
                ? Math.abs(newQuantity - currentQuantity)
                : changeQuantity;

        await connection.query(
            `INSERT INTO stock_transactions
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
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                product_id,
                transaction_type,
                transactionQuantity,
                currentQuantity,
                newQuantity,
                reason || null,
                reference || null,
                admin_id
            ]
        );

        await connection.commit();

        return res.status(200).json({
            success: true,
            message: "Stock updated successfully.",
            data: {
                product_id,
                transaction_type,
                quantity: transactionQuantity,
                quantity_before: currentQuantity,
                quantity_after: newQuantity
            }
        });

    } catch (error) {
        await connection.rollback();

        return res.status(400).json({
            success: false,
            message: error.message
        });

    } finally {
        connection.release();
    }
};

module.exports = {
    getStockTransactions,
    getStockTransactionsByProduct,
    adjustStock
};