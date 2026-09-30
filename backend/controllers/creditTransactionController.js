const db = require("../config/database");

const getCreditTransactions = async (req, res) => {
    try {
        const [transactions] = await db.query(`
            SELECT
                ct.id,
                ct.customer_id,
                c.customer_code,
                c.name AS customer_name,
                ct.sale_id,
                ct.transaction_type,
                ct.amount,
                ct.reference,
                ct.notes,
                ct.admin_id,
                ct.created_at
            FROM credit_transactions ct
            INNER JOIN customers c
                ON ct.customer_id = c.id
            ORDER BY ct.id DESC
        `);

        res.json({
            success: true,
            data: transactions
        });

    } catch (error) {
        console.error("Error fetching credit transactions:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch credit transactions"
        });
    }
};

const getCreditTransactionsByCustomer = async (req, res) => {
    try {
        const { customerId } = req.params;

        const [transactions] = await db.query(`
            SELECT
                ct.id,
                ct.customer_id,
                c.customer_code,
                c.name AS customer_name,
                ct.sale_id,
                ct.transaction_type,
                ct.amount,
                ct.reference,
                ct.notes,
                ct.admin_id,
                ct.created_at
            FROM credit_transactions ct
            INNER JOIN customers c
                ON ct.customer_id = c.id
            WHERE ct.customer_id = ?
            ORDER BY ct.id DESC
        `, [customerId]);

        res.json({
            success: true,
            data: transactions
        });

    } catch (error) {
        console.error("Error fetching customer credit transactions:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch customer credit transactions"
        });
    }
};

module.exports = {
    getCreditTransactions,
    getCreditTransactionsByCustomer
};