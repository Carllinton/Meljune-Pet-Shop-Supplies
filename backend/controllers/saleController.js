const db = require("../config/database");

// ==========================================
// GET ALL SALES
// ==========================================
const getSales = async (req, res) => {
    try {
        const [sales] = await db.query(`
            SELECT
                s.id,
                s.receipt_no,
                s.subtotal,
                s.discount,
                s.total,
                s.payment_method,
                s.amount_tendered,
                s.change_given,
                s.note,
                s.customer_id,
                c.name AS customer_name,
                s.admin_id,
                s.created_at
            FROM sales s
            LEFT JOIN customers c
                ON s.customer_id = c.id
            ORDER BY s.id DESC
        `);

        res.json({
            success: true,
            data: sales
        });

    } catch (error) {
        console.error("Error fetching sales:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch sales"
        });
    }
};


// ==========================================
// GET SALE BY ID
// ==========================================
const getSaleById = async (req, res) => {
    try {
        const { id } = req.params;

        const [sales] = await db.query(`
            SELECT
                s.id,
                s.receipt_no,
                s.subtotal,
                s.discount,
                s.total,
                s.payment_method,
                s.amount_tendered,
                s.change_given,
                s.note,
                s.customer_id,
                c.name AS customer_name,
                s.admin_id,
                s.created_at
            FROM sales s
            LEFT JOIN customers c
                ON s.customer_id = c.id
            WHERE s.id = ?
        `, [id]);

        if (sales.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Sale not found"
            });
        }

        res.json({
            success: true,
            data: sales[0]
        });

    } catch (error) {
        console.error("Error fetching sale:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch sale"
        });
    }
};


// ==========================================
// CREATE SALE / POS TRANSACTION
// ==========================================
const createSale = async (req, res) => {

    const connection = await db.getConnection();

    try {

        const {
            customer_id,
            admin_id,
            payment_method,
            amount_tendered,
            discount,
            note,
            items
        } = req.body;


        // ==========================================
        // BASIC VALIDATION
        // ==========================================

        if (!admin_id) {
            return res.status(400).json({
                success: false,
                message: "Admin ID is required"
            });
        }

        if (!payment_method) {
            return res.status(400).json({
                success: false,
                message: "Payment method is required"
            });
        }

        const validPaymentMethods = [
            "cash",
            "gcash",
            "maya",
            "credit"
        ];

        if (!validPaymentMethods.includes(payment_method)) {
            return res.status(400).json({
                success: false,
                message: "Invalid payment method"
            });
        }

        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: "At least one product is required"
            });
        }


        // ==========================================
        // START TRANSACTION
        // ==========================================

        await connection.beginTransaction();


        // ==========================================
        // CHECK ADMIN
        // ==========================================

        const [admins] = await connection.query(`
            SELECT id
            FROM admins
            WHERE id = ?
        `, [admin_id]);

        if (admins.length === 0) {
            throw new Error("Admin not found");
        }


        // ==========================================
        // CHECK CUSTOMER
        // ==========================================

        if (customer_id) {

            const [customers] = await connection.query(`
                SELECT
                    id,
                    name,
                    credit_limit,
                    status
                FROM customers
                WHERE id = ?
                FOR UPDATE
            `, [customer_id]);

            if (customers.length === 0) {
                throw new Error("Customer not found");
            }

            if (customers[0].status !== "active") {
                throw new Error("Customer is inactive");
            }
        }


        // ==========================================
        // PROCESS PRODUCTS
        // ==========================================

        let subtotal = 0;

        const processedItems = [];

        for (const item of items) {

            const product_id = Number(item.product_id);
            const quantity = Number(item.quantity);


            // Validate item
            if (
                !Number.isInteger(product_id) ||
                product_id <= 0 ||
                !Number.isInteger(quantity) ||
                quantity <= 0
            ) {
                throw new Error(
                    "Each item must have a valid product ID and quantity"
                );
            }


            // Get product and lock row
            const [products] = await connection.query(`
                SELECT
                    id,
                    product_code,
                    name,
                    quantity,
                    price,
                    status
                FROM products
                WHERE id = ?
                FOR UPDATE
            `, [product_id]);


            if (products.length === 0) {
                throw new Error(
                    `Product ${product_id} not found`
                );
            }


            const product = products[0];


            // Check product status
            if (product.status !== "active") {
                throw new Error(
                    `Product "${product.name}" is not active`
                );
            }


            // Check stock
            if (product.quantity < quantity) {
                throw new Error(
                    `Insufficient stock for "${product.name}". Available: ${product.quantity}`
                );
            }


            const unitPrice = Number(product.price);

            const itemSubtotal =
                unitPrice * quantity;


            subtotal += itemSubtotal;


            processedItems.push({
                product_id: product.id,
                product_code: product.product_code,
                product_name: product.name,
                quantity: quantity,
                unit_price: unitPrice,
                subtotal: itemSubtotal,
                quantity_before: product.quantity,
                quantity_after:
                    product.quantity - quantity
            });
        }


        // ==========================================
        // DISCOUNT
        // ==========================================

        const saleDiscount =
            Number(discount || 0);


        if (saleDiscount < 0) {
            throw new Error(
                "Discount cannot be negative"
            );
        }


        if (saleDiscount > subtotal) {
            throw new Error(
                "Discount cannot exceed subtotal"
            );
        }


        const total =
            subtotal - saleDiscount;


        // ==========================================
        // PAYMENT
        // ==========================================

        let amountTendered =
            Number(amount_tendered || 0);

        let changeGiven = 0;


        // ------------------------------------------
        // CASH
        // ------------------------------------------

        if (payment_method === "cash") {

            if (amountTendered < total) {
                throw new Error(
                    `Insufficient payment. Total is ${total.toFixed(2)}`
                );
            }

            changeGiven =
                amountTendered - total;
        }


        // ------------------------------------------
        // GCASH / MAYA
        // ------------------------------------------

        else if (
            payment_method === "gcash" ||
            payment_method === "maya"
        ) {

            if (amountTendered < total) {
                throw new Error(
                    `Payment must cover the total of ${total.toFixed(2)}`
                );
            }

            changeGiven =
                amountTendered - total;
        }


        // ------------------------------------------
        // CREDIT
        // ------------------------------------------

        else if (payment_method === "credit") {

            if (!customer_id) {
                throw new Error(
                    "Customer is required for credit sales"
                );
            }


            // Get customer again with lock
            const [customers] = await connection.query(`
                SELECT
                    id,
                    name,
                    credit_limit
                FROM customers
                WHERE id = ?
                FOR UPDATE
            `, [customer_id]);


            if (customers.length === 0) {
                throw new Error(
                    "Customer not found"
                );
            }


            const customer = customers[0];


            // Calculate current credit balance
            const [creditResult] =
                await connection.query(`
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


            const currentBalance =
                Number(creditResult[0].balance);


            const newBalance =
                currentBalance + total;


            // Check credit limit
            if (
                newBalance >
                Number(customer.credit_limit)
            ) {
                throw new Error(
                    `Credit limit exceeded. Current balance: ${currentBalance.toFixed(2)}, Credit limit: ${Number(customer.credit_limit).toFixed(2)}`
                );
            }


            amountTendered = 0;
            changeGiven = 0;
        }


        // ==========================================
        // GENERATE RECEIPT NUMBER
        // ==========================================

        const receiptNo =
            `REC-${Date.now()}`;


        // ==========================================
        // INSERT SALE
        // ==========================================

        const [saleResult] =
            await connection.query(`
                INSERT INTO sales (
                    receipt_no,
                    subtotal,
                    discount,
                    total,
                    payment_method,
                    amount_tendered,
                    change_given,
                    note,
                    customer_id,
                    admin_id
                )
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                receiptNo,
                subtotal,
                saleDiscount,
                total,
                payment_method,
                amountTendered,
                changeGiven,
                note || null,
                customer_id || null,
                admin_id
            ]);


        const saleId =
            saleResult.insertId;


        // ==========================================
        // INSERT SALE ITEMS
        // UPDATE STOCK
        // CREATE STOCK TRANSACTION
        // ==========================================

        for (const item of processedItems) {


            // Insert sale item
            await connection.query(`
                INSERT INTO sale_items (
                    sale_id,
                    product_id,
                    quantity,
                    unit_price,
                    subtotal
                )
                VALUES (?, ?, ?, ?, ?)
            `, [
                saleId,
                item.product_id,
                item.quantity,
                item.unit_price,
                item.subtotal
            ]);


            // Update product quantity
            await connection.query(`
                UPDATE products
                SET quantity = ?
                WHERE id = ?
            `, [
                item.quantity_after,
                item.product_id
            ]);


            // Record stock transaction
            await connection.query(`
                INSERT INTO stock_transactions (
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
            `, [
                item.product_id,
                item.quantity,
                item.quantity_before,
                item.quantity_after,
                "Sale",
                receiptNo,
                admin_id
            ]);
        }


        // ==========================================
        // CREATE CREDIT TRANSACTION
        // ==========================================

        if (payment_method === "credit") {

            await connection.query(`
                INSERT INTO credit_transactions (
                    customer_id,
                    sale_id,
                    transaction_type,
                    amount,
                    reference,
                    notes,
                    admin_id
                )
                VALUES (?, ?, 'credit', ?, ?, ?, ?)
            `, [
                customer_id,
                saleId,
                total,
                receiptNo,
                "Credit sale",
                admin_id
            ]);
        }


        // ==========================================
        // COMMIT
        // ==========================================

        await connection.commit();


        // ==========================================
        // RESPONSE
        // ==========================================

        res.status(201).json({
            success: true,
            message: "Sale completed successfully",

            data: {
                sale_id: saleId,
                receipt_no: receiptNo,

                subtotal:
                    Number(subtotal.toFixed(2)),

                discount:
                    Number(saleDiscount.toFixed(2)),

                total:
                    Number(total.toFixed(2)),

                payment_method,

                amount_tendered:
                    Number(amountTendered.toFixed(2)),

                change_given:
                    Number(changeGiven.toFixed(2)),

                customer_id:
                    customer_id || null,

                items: processedItems
            }
        });


    } catch (error) {

        // Rollback everything
        await connection.rollback();

        console.error(
            "Error creating sale:",
            error
        );

        res.status(400).json({
            success: false,
            message:
                error.message ||
                "Failed to create sale"
        });

    } finally {

        // Return connection to pool
        connection.release();
    }
};


// ==========================================
// EXPORT
// ==========================================

module.exports = {
    getSales,
    getSaleById,
    createSale
};