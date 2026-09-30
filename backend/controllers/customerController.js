const db = require("../config/database");

const getCustomers = async (req, res) => {
    try {
        const [customers] = await db.query(`
            SELECT
                id,
                name,
                phone,
                address,
                credit_limit,
                created_at
            FROM customers
            ORDER BY id ASC
        `);

        res.json({
            success: true,
            data: customers
        });

    } catch (error) {
        console.error("Error fetching customers:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch customers"
        });
    }
};

const getCustomerById = async (req, res) => {
    try {
        const { id } = req.params;

        const [customers] = await db.query(`
            SELECT
                id,
                name,
                phone,
                address,
                credit_limit,
                created_at
            FROM customers
            WHERE id = ?
        `, [id]);

        if (customers.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Customer not found"
            });
        }

        res.json({
            success: true,
            data: customers[0]
        });

    } catch (error) {
        console.error("Error fetching customer:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch customer"
        });
    }
};

const createCustomer = async (req, res) => {
    try {
        const {
            customer_code,
            name,
            phone,
            address,
            credit_limit,
            status
        } = req.body;

        if (!customer_code || !name) {
            return res.status(400).json({
                success: false,
                message: "Customer code and name are required"
            });
        }

        const [result] = await db.query(`
            INSERT INTO customers
                (customer_code, name, phone, address, credit_limit, status)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [
            customer_code,
            name,
            phone || null,
            address || null,
            credit_limit || 0,
            status || "active"
        ]);

        res.status(201).json({
            success: true,
            message: "Customer created successfully",
            data: {
                id: result.insertId
            }
        });

    } catch (error) {
        console.error("Error creating customer:", error);

        res.status(500).json({
            success: false,
            message: "Failed to create customer"
        });
    }
};

// =============================================
// UPDATE CUSTOMER
// =============================================
const updateCustomer = async (req, res) => {
    try {
        const { id } = req.params;

        const {
            customer_code,
            name,
            phone,
            address,
            credit_limit,
            status
        } = req.body;


        // -----------------------------
        // CHECK CUSTOMER
        // -----------------------------
        const [existingCustomer] = await db.query(`
            SELECT id
            FROM customers
            WHERE id = ?
        `, [id]);


        if (existingCustomer.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Customer not found"
            });
        }


        // -----------------------------
        // VALIDATION
        // -----------------------------
        if (!customer_code || !customer_code.trim()) {
            return res.status(400).json({
                success: false,
                message: "Customer code is required"
            });
        }

        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: "Customer name is required"
            });
        }


        // -----------------------------
        // UPDATE CUSTOMER
        // -----------------------------
        await db.query(`
            UPDATE customers
            SET
                customer_code = ?,
                name = ?,
                phone = ?,
                address = ?,
                credit_limit = ?,
                status = ?
            WHERE id = ?
        `, [
            customer_code.trim(),
            name.trim(),
            phone || null,
            address || null,
            credit_limit || 0,
            status || "active",
            id
        ]);


        res.json({
            success: true,
            message: "Customer updated successfully"
        });


    } catch (error) {
        console.error("Error updating customer:", error);

        res.status(500).json({
            success: false,
            message: "Failed to update customer"
        });
    }
};


// =============================================
// DELETE CUSTOMER
// =============================================
const deleteCustomer = async (req, res) => {
    try {
        const { id } = req.params;


        // -----------------------------
        // CHECK CUSTOMER
        // -----------------------------
        const [customer] = await db.query(`
            SELECT id
            FROM customers
            WHERE id = ?
        `, [id]);


        if (customer.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Customer not found"
            });
        }


        // -----------------------------
        // DELETE CUSTOMER
        // -----------------------------
        await db.query(`
            DELETE FROM customers
            WHERE id = ?
        `, [id]);


        res.json({
            success: true,
            message: "Customer deleted successfully"
        });


    } catch (error) {
        console.error("Error deleting customer:", error);

        res.status(500).json({
            success: false,
            message: "Failed to delete customer"
        });
    }
};

module.exports = {
    getCustomers,
    getCustomerById,
    createCustomer,
    updateCustomer,
    deleteCustomer
};