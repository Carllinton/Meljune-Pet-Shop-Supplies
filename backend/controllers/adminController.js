const db = require("../config/database");

const getAdmins = async (req, res) => {
    try {
        const [admins] = await db.query(`
            SELECT
                id,
                username,
                full_name,
                email,
                avatar,
                created_at
            FROM admins
            ORDER BY id ASC
        `);

        res.json({
            success: true,
            data: admins
        });

    } catch (error) {
        console.error("Error fetching admins:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch admins"
        });
    }
};

const getAdminById = async (req, res) => {
    try {
        const { id } = req.params;

        const [admins] = await db.query(`
            SELECT
                id,
                username,
                full_name,
                email,
                avatar,
                created_at
            FROM admins
            WHERE id = ?
        `, [id]);

        if (admins.length === 0) {
            return res.status(404).json({
                success: false,
                message: "Admin not found"
            });
        }

        res.json({
            success: true,
            data: admins[0]
        });

    } catch (error) {
        console.error("Error fetching admin:", error);

        res.status(500).json({
            success: false,
            message: "Failed to fetch admin"
        });
    }
};

module.exports = {
    getAdmins,
    getAdminById
};