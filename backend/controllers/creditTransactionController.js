const db = require("../config/database");


// =============================================
// GET ALL CREDIT TRANSACTIONS
// =============================================
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


// =============================================
// GET CREDIT TRANSACTIONS BY CUSTOMER
// =============================================
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


// =============================================
// RECORD CUSTOMER PAYMENT
// =============================================
const recordPayment = async (req, res) => {
    try {
        const {
            customer_id,
            amount,
            reference,
            notes,
            admin_id
        } = req.body;


        // -----------------------------
        // VALIDATE CUSTOMER
        // -----------------------------
        if (!customer_id) {
            return res.status(400).json({
                success: false,
                message: "Customer is required"
            });
        }


        // -----------------------------
        // VALIDATE AMOUNT
        // -----------------------------
        const paymentAmount = Number(amount);

        if (!Number.isFinite(paymentAmount) || paymentAmount <= 0) {
            return res.status(400).json({
                success: false,
                message: "Payment amount must be greater than zero"
            });
        }


        // -----------------------------
        // CHECK CUSTOMER
        // -----------------------------
        const [customers] = await db.query(`
            SELECT
                id,
                name,
                status
            FROM customers
            WHERE id = ?
        `, [customer_id]);


        if (customers.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Customer not found"
            });
        }


        const customer = customers[0];


        // -----------------------------
        // CHECK CUSTOMER STATUS
        // -----------------------------
        if (customer.status !== "active") {
            return res.status(400).json({
                success: false,
                message: "Cannot record payment for an inactive customer"
            });
        }


        // -----------------------------
        // CALCULATE CURRENT BALANCE
        // -----------------------------
        const [balanceResult] = await db.query(`
            SELECT
                COALESCE(
                    SUM(
                        CASE
                            WHEN transaction_type = 'credit'
                                THEN amount
                            WHEN transaction_type = 'payment'
                                THEN -amount
                            ELSE 0
                        END
                    ),
                    0
                ) AS balance
            FROM credit_transactions
            WHERE customer_id = ?
        `, [customer_id]);


        const currentBalance = Number(balanceResult[0].balance || 0);


        // -----------------------------
        // CHECK OUTSTANDING BALANCE
        // -----------------------------
        if (currentBalance <= 0) {
            return res.status(400).json({
                success: false,
                message: "Customer has no outstanding balance"
            });
        }


        // -----------------------------
        // PREVENT OVERPAYMENT
        // -----------------------------
        if (paymentAmount > currentBalance) {
            return res.status(400).json({
                success: false,
                message: `Payment cannot exceed the outstanding balance of ₱${currentBalance.toFixed(2)}`
            });
        }


        // -----------------------------
        // RECORD PAYMENT
        // -----------------------------
        const [result] = await db.query(`
            INSERT INTO credit_transactions
                (
                    customer_id,
                    sale_id,
                    transaction_type,
                    amount,
                    reference,
                    notes,
                    admin_id
                )
            VALUES (?, NULL, 'payment', ?, ?, ?, ?)
        `, [
            customer_id,
            paymentAmount,
            reference || null,
            notes || null,
            admin_id || 1
        ]);


        // -----------------------------
        // CALCULATE NEW BALANCE
        // -----------------------------
        const newBalance = currentBalance - paymentAmount;


        res.status(201).json({
            success: true,
            message: "Payment recorded successfully",
            data: {
                id: result.insertId,
                customer_id,
                amount: paymentAmount,
                previous_balance: currentBalance,
                new_balance: newBalance
            }
        });


    } catch (error) {
        console.error("Error recording payment:", error);

        res.status(500).json({
            success: false,
            message: "Failed to record payment"
        });
    }
};


module.exports = {
    getCreditTransactions,
    getCreditTransactionsByCustomer,
    recordPayment
};

