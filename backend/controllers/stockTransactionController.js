const db = require("../config/database");

const getStockTransactions = async (req, res) => {
    try {
        const [transactions] = await db.query(`
            SELECT
                st.id,
                st.product_id,
                p.product_code,
                p.name AS product_name,
                st.transaction_type,
                st.quantity,
                st.quantity_before,
                st.quantity_after,
                st.reason,
                st.reference,
                st.admin_id,
                st.created_at
            FROM stock_transactions st
            INNER JOIN products p
                ON st.product_id = p.id
            ORDER BY st.id DESC
        `);

        res.json({
            success: true,
            data: transactions
        });

    } catch (error) {
        console.error("Error fetching stock transactions:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch stock transactions"
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
                st.transaction_type,
                st.quantity,
                st.quantity_before,
                st.quantity_after,
                st.reason,
                st.reference,
                st.admin_id,
                st.created_at
            FROM stock_transactions st
            INNER JOIN products p
                ON st.product_id = p.id
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

module.exports = {
    getStockTransactions,
    getStockTransactionsByProduct
};