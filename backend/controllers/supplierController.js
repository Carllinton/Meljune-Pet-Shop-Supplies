const db = require("../config/database");


// =============================================
// GET ALL SUPPLIERS
// =============================================
const getSuppliers = async (req, res) => {
    try {
        const [suppliers] = await db.query(`
            SELECT
                id,
                name,
                contact_person,
                phone,
                email,
                address,
                created_at
            FROM suppliers
            ORDER BY id ASC
        `);

        res.json({
            success: true,
            data: suppliers
        });

    } catch (error) {
        console.error("Error fetching suppliers:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch suppliers"
        });
    }
};


// =============================================
// GET SUPPLIER BY ID
// =============================================
const getSupplierById = async (req, res) => {
    try {
        const { id } = req.params;

        const [suppliers] = await db.query(`
            SELECT
                id,
                name,
                contact_person,
                phone,
                email,
                address,
                created_at
            FROM suppliers
            WHERE id = ?
        `, [id]);


        if (suppliers.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Supplier not found"
            });
        }


        res.json({
            success: true,
            data: suppliers[0]
        });


    } catch (error) {
        console.error("Error fetching supplier:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch supplier"
        });
    }
};


// =============================================
// CREATE SUPPLIER
// =============================================
const createSupplier = async (req, res) => {
    try {
        const {
            name,
            contact_person,
            phone,
            email,
            address
        } = req.body;


        // -----------------------------
        // VALIDATION
        // -----------------------------
        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: "Supplier name is required"
            });
        }


        // -----------------------------
        // INSERT SUPPLIER
        // -----------------------------
        const [result] = await db.query(`
            INSERT INTO suppliers (
                name,
                contact_person,
                phone,
                email,
                address
            )
            VALUES (?, ?, ?, ?, ?)
        `, [
            name.trim(),
            contact_person || null,
            phone || null,
            email || null,
            address || null
        ]);


        res.status(201).json({
            success: true,
            message: "Supplier created successfully",
            data: {
                id: result.insertId
            }
        });


    } catch (error) {
        console.error("Error creating supplier:", error);

        res.status(500).json({
            success: false,
            message: "Failed to create supplier"
        });
    }
};


// =============================================
// UPDATE SUPPLIER
// =============================================
const updateSupplier = async (req, res) => {
    try {
        const { id } = req.params;

        const {
            name,
            contact_person,
            phone,
            email,
            address
        } = req.body;


        // -----------------------------
        // CHECK SUPPLIER
        // -----------------------------
        const [existingSupplier] = await db.query(`
            SELECT id
            FROM suppliers
            WHERE id = ?
        `, [id]);


        if (existingSupplier.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Supplier not found"
            });
        }


        // -----------------------------
        // VALIDATION
        // -----------------------------
        if (!name || !name.trim()) {
            return res.status(400).json({
                success: false,
                message: "Supplier name is required"
            });
        }


        // -----------------------------
        // UPDATE SUPPLIER
        // -----------------------------
        await db.query(`
            UPDATE suppliers
            SET
                name = ?,
                contact_person = ?,
                phone = ?,
                email = ?,
                address = ?
            WHERE id = ?
        `, [
            name.trim(),
            contact_person || null,
            phone || null,
            email || null,
            address || null,
            id
        ]);


        res.json({
            success: true,
            message: "Supplier updated successfully"
        });


    } catch (error) {
        console.error("Error updating supplier:", error);

        res.status(500).json({
            success: false,
            message: "Failed to update supplier"
        });
    }
};


// =============================================
// DELETE SUPPLIER
// =============================================
const deleteSupplier = async (req, res) => {
    try {
        const { id } = req.params;


        // -----------------------------
        // CHECK SUPPLIER
        // -----------------------------
        const [supplier] = await db.query(`
            SELECT id
            FROM suppliers
            WHERE id = ?
        `, [id]);


        if (supplier.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Supplier not found"
            });
        }


        // -----------------------------
        // DELETE SUPPLIER
        // -----------------------------
        await db.query(`
            DELETE FROM suppliers
            WHERE id = ?
        `, [id]);


        /*
            The products table uses:

            FOREIGN KEY (supplier_id)
            REFERENCES suppliers(id)
            ON DELETE SET NULL

            Therefore, when this supplier is deleted,
            MySQL automatically sets supplier_id = NULL
            for products belonging to this supplier.
        */


        res.json({
            success: true,
            message: "Supplier deleted successfully"
        });


    } catch (error) {
        console.error("Error deleting supplier:", error);


        res.status(500).json({
            success: false,
            message: "Failed to delete supplier"
        });
    }
};


// =============================================
// EXPORT
// =============================================
module.exports = {
    getSuppliers,
    getSupplierById,
    createSupplier,
    updateSupplier,
    deleteSupplier
};