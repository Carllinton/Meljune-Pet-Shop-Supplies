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
    const connection = await db.getConnection();

    try {
        const { id } = req.params;

        // ------------------------------------------
        // GET SALE
        // ------------------------------------------
        const [sales] = await connection.query(`
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

        // ------------------------------------------
        // GET SALE ITEMS
        // subtotal is calculated dynamically
        // ------------------------------------------
        const [items] = await connection.query(`
            SELECT
                si.id,
                si.sale_id,
                si.product_id,
                p.product_code,
                p.name AS product_name,
                si.quantity,
                si.unit_price,
                (si.quantity * si.unit_price) AS subtotal
            FROM sale_items si
            INNER JOIN products p
                ON si.product_id = p.id
            WHERE si.sale_id = ?
            ORDER BY si.id ASC
        `, [id]);

        res.json({
            success: true,
            data: {
                ...sales[0],
                items
            }
        });

    } catch (error) {
        console.error("Error fetching sale:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch sale"
        });

    } finally {
        connection.release();
    }
};


// ==========================================
// CREATE SALE
// ==========================================
const createSale = async (req, res) => {
    const connection = await db.getConnection();

    try {
        const {
            customer_id,
            payment_method,
            amount_tendered = 0,
            discount = 0,
            note = null,
            items
        } = req.body;

        // ------------------------------------------
        // GET LOGGED-IN ADMIN
        // ------------------------------------------
        const admin_id = req.user?.id;

        if (!admin_id) {
            return res.status(401).json({
                success: false,
                message: "Unauthorized. Admin account not found."
            });
        }

        // ------------------------------------------
        // VALIDATE PAYMENT METHOD
        // ------------------------------------------
        const validPaymentMethods = [
            "cash",
            "gcash",
            "maya",
            "credit"
        ];

        if (
            !payment_method ||
            !validPaymentMethods.includes(payment_method)
        ) {
            return res.status(400).json({
                success: false,
                message: "Invalid payment method."
            });
        }

        // ------------------------------------------
        // VALIDATE ITEMS
        // ------------------------------------------
        if (!Array.isArray(items) || items.length === 0) {
            return res.status(400).json({
                success: false,
                message: "Sale must contain at least one item."
            });
        }

        // ------------------------------------------
        // START TRANSACTION
        // ------------------------------------------
        await connection.beginTransaction();

        // ------------------------------------------
        // CHECK ADMIN
        // ------------------------------------------
        const [admins] = await connection.query(`
            SELECT id
            FROM admins
            WHERE id = ?
        `, [admin_id]);

        if (admins.length === 0) {
            throw new Error("Admin account not found.");
        }

        // ------------------------------------------
        // CHECK CUSTOMER
        // ------------------------------------------
        if (customer_id) {
            const [customers] = await connection.query(`
                SELECT
                    id,
                    name,
                    credit_limit,
                    status
                FROM customers
                WHERE id = ?
            `, [customer_id]);

            if (customers.length === 0) {
                throw new Error("Customer not found.");
            }

            if (customers[0].status !== "active") {
                throw new Error("Customer account is inactive.");
            }
        }

        // ------------------------------------------
        // PROCESS PRODUCTS
        // ------------------------------------------
        let subtotal = 0;

        const processedItems = [];

        for (const item of items) {
            const productId = Number(item.product_id);
            const quantity = Number(item.quantity);

            if (
                !productId ||
                !Number.isInteger(quantity) ||
                quantity <= 0
            ) {
                throw new Error(
                    "Invalid product or quantity."
                );
            }

            // ------------------------------------------
            // LOCK PRODUCT ROW
            // ------------------------------------------
            const [products] = await connection.query(`
                SELECT
                    id,
                    product_code,
                    name,
                    price,
                    quantity AS stock_quantity
                FROM products
                WHERE id = ?
                FOR UPDATE
            `, [productId]);

            if (products.length === 0) {
                throw new Error(
                    `Product with ID ${productId} not found.`
                );
            }

            const product = products[0];

            const currentStock =
                Number(product.stock_quantity);

            // ------------------------------------------
            // CHECK STOCK
            // ------------------------------------------
            if (currentStock < quantity) {
                throw new Error(
                    `Insufficient stock for ${product.name}. ` +
                    `Available stock: ${currentStock}.`
                );
            }

            // ------------------------------------------
            // CALCULATE ITEM SUBTOTAL
            // ------------------------------------------
            const unitPrice =
                Number(product.price);

            const itemSubtotal =
                unitPrice * quantity;

            subtotal += itemSubtotal;

            const quantityAfter =
                currentStock - quantity;

            processedItems.push({
                product_id: product.id,
                product_code: product.product_code,
                product_name: product.name,
                quantity: quantity,
                unit_price: unitPrice,
                subtotal: itemSubtotal,
                quantity_before: currentStock,
                quantity_after: quantityAfter
            });
        }

        // ------------------------------------------
        // VALIDATE DISCOUNT
        // ------------------------------------------
        const saleDiscount =
            Number(discount) || 0;

        if (saleDiscount < 0) {
            throw new Error(
                "Discount cannot be negative."
            );
        }

        if (saleDiscount > subtotal) {
            throw new Error(
                "Discount cannot be greater than the subtotal."
            );
        }

        // ------------------------------------------
        // CALCULATE TOTAL
        // ------------------------------------------
        const total = Math.max(
            0,
            subtotal - saleDiscount
        );

        // ------------------------------------------
        // PAYMENT VARIABLES
        // ------------------------------------------
        let finalAmountTendered =
            Number(amount_tendered) || 0;

        let changeGiven = 0;

        // ------------------------------------------
        // CASH / GCASH / MAYA
        // ------------------------------------------
        if (
            payment_method === "cash" ||
            payment_method === "gcash" ||
            payment_method === "maya"
        ) {
            if (finalAmountTendered < total) {
                throw new Error(
                    `Insufficient payment. ` +
                    `Total amount is ₱${total.toFixed(2)}.`
                );
            }

            changeGiven =
                finalAmountTendered - total;
        }

        // ------------------------------------------
        // CREDIT PAYMENT
        // ------------------------------------------
        if (payment_method === "credit") {

            if (!customer_id) {
                throw new Error(
                    "A customer is required for credit sales."
                );
            }

            // ------------------------------------------
            // GET CUSTOMER CREDIT LIMIT
            // ------------------------------------------
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
                    "Customer not found."
                );
            }

            const customer = customers[0];

            const creditLimit =
                Number(customer.credit_limit) || 0;

            // ------------------------------------------
            // GET CURRENT CREDIT BALANCE
            // ------------------------------------------
            const [balanceRows] = await connection.query(`
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
                Number(balanceRows[0].balance) || 0;

            const newBalance =
                currentBalance + total;

            // ------------------------------------------
            // CHECK CREDIT LIMIT
            // ------------------------------------------
            if (newBalance > creditLimit) {
                throw new Error(
                    `Credit limit exceeded. ` +
                    `Current balance: ₱${currentBalance.toFixed(2)}, ` +
                    `Credit limit: ₱${creditLimit.toFixed(2)}, ` +
                    `New balance: ₱${newBalance.toFixed(2)}.`
                );
            }

            finalAmountTendered = 0;
            changeGiven = 0;
        }

        // ------------------------------------------
        // GENERATE RECEIPT NUMBER
        // ------------------------------------------
        const receiptNo =
            `REC-${Date.now()}`;

        // ------------------------------------------
        // INSERT SALE
        // ------------------------------------------
        const [saleResult] = await connection.query(`
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
            Number(subtotal.toFixed(2)),
            Number(saleDiscount.toFixed(2)),
            Number(total.toFixed(2)),
            payment_method,
            Number(finalAmountTendered.toFixed(2)),
            Number(changeGiven.toFixed(2)),
            note || null,
            customer_id || null,
            admin_id
        ]);

        const saleId =
            saleResult.insertId;

        // ==========================================
        // INSERT SALE ITEMS
        // ==========================================
        // IMPORTANT:
        // sale_items DOES NOT HAVE subtotal.
        // We only store quantity and unit_price.
        // ==========================================

        for (const item of processedItems) {

            await connection.query(`
                INSERT INTO sale_items (
                    sale_id,
                    product_id,
                    quantity,
                    unit_price
                )
                VALUES (?, ?, ?, ?)
            `, [
                saleId,
                item.product_id,
                item.quantity,
                item.unit_price
            ]);
        }

        // ==========================================
        // UPDATE STOCK + CREATE STOCK TRANSACTION
        // ==========================================

        for (const item of processedItems) {

            // ------------------------------------------
            // UPDATE PRODUCT QUANTITY
            // ------------------------------------------
            await connection.query(`
                UPDATE products
                SET quantity = ?
                WHERE id = ?
            `, [
                item.quantity_after,
                item.product_id
            ]);

            // ------------------------------------------
            // INSERT STOCK TRANSACTION
            // ------------------------------------------
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
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                item.product_id,
                "stock_out",
                item.quantity,
                item.quantity_before,
                item.quantity_after,
                `Sale - ${receiptNo}`,
                receiptNo,
                admin_id
            ]);
        }

        // ==========================================
        // INSERT CREDIT TRANSACTION
        // ==========================================

        if (payment_method === "credit") {

            await connection.query(`
                INSERT INTO credit_transactions (
                    customer_id,
                    transaction_type,
                    amount,
                    reference,
                    notes,
                    admin_id
                )
                VALUES (?, ?, ?, ?, ?, ?)
            `, [
                customer_id,
                "credit",
                Number(total.toFixed(2)),
                receiptNo,
                note || `Credit sale ${receiptNo}`,
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
            message: "Sale completed successfully.",

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
                    Number(
                        finalAmountTendered.toFixed(2)
                    ),

                change_given:
                    Number(
                        changeGiven.toFixed(2)
                    ),

                customer_id:
                    customer_id || null,

                admin_id,

                items: processedItems
            }
        });

    } catch (error) {

        // ------------------------------------------
        // ROLLBACK
        // ------------------------------------------
        await connection.rollback();

        console.error(
            "Error creating sale:",
            error
        );

        res.status(400).json({
            success: false,
            message:
                error.message ||
                "Failed to create sale."
        });

    } finally {

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