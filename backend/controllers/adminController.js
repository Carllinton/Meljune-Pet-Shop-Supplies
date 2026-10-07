const db = require("../config/database");
const bcrypt = require("bcryptjs");

const getAdminId = (req) => {
    const id = Number(req.params.id);
    return Number.isInteger(id) && id > 0 ? id : null;
};

const getAdmins = async (req, res) => {
    try {
        const [admins] = await db.query(`
            SELECT
                id,
                username,
                full_name,
                email,
                avatar,
                role,
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
                role,
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

const updateAdmin = async (req, res) => {
    const id = getAdminId(req);

    if (!id) {
        return res.status(400).json({
            success: false,
            message: "A valid user ID is required"
        });
    }

    const allowedFields = ["username", "full_name", "email", "role"];
    const updates = [];
    const values = [];
    const body = req.body || {};

    for (const field of allowedFields) {
        if (Object.prototype.hasOwnProperty.call(body, field)) {
            const value = typeof body[field] === "string"
                ? body[field].trim()
                : "";

            if (!value) {
                return res.status(400).json({
                    success: false,
                    message: `${field.replace("_", " ")} is required`
                });
            }

            if (field === "role" && !["admin", "cashier"].includes(value)) {
                return res.status(400).json({
                    success: false,
                    message: "Role must be admin or cashier"
                });
            }

            if (
                field === "email" &&
                !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
            ) {
                return res.status(400).json({
                    success: false,
                    message: "A valid email address is required"
                });
            }

            if (field === "role" && id === Number(req.user.id) && value !== req.user.role) {
                return res.status(400).json({
                    success: false,
                    message: "You cannot change your own role"
                });
            }

            updates.push(`${field} = ?`);
            values.push(value);
        }
    }

    if (updates.length === 0) {
        return res.status(400).json({
            success: false,
            message: "At least one user detail must be provided"
        });
    }

    try {
        const [result] = await db.query(
            `UPDATE admins SET ${updates.join(", ")} WHERE id = ?`,
            [...values, id]
        );

        if (result.affectedRows === 0) {
            const [admins] = await db.query(
                "SELECT id FROM admins WHERE id = ?",
                [id]
            );

            if (admins.length === 0) {
                return res.status(404).json({
                    success: false,
                    message: "User not found"
                });
            }
        }

        const [admins] = await db.query(`
            SELECT id, username, full_name, email, avatar, role, created_at
            FROM admins
            WHERE id = ?
        `, [id]);

        res.json({
            success: true,
            message: "User details updated",
            data: admins[0]
        });
    } catch (error) {
        console.error("Error updating user:", error);

        if (error.code === "ER_DUP_ENTRY") {
            return res.status(409).json({
                success: false,
                message: "That username or email is already in use"
            });
        }

        res.status(500).json({
            success: false,
            message: "Failed to update user"
        });
    }
};

const updateAdminPassword = async (req, res) => {
    const id = getAdminId(req);

    if (!id || id !== Number(req.user.id)) {
        return res.status(403).json({
            success: false,
            message: "You can only change your own password"
        });
    }

    const { current_password, new_password } = req.body || {};

    if (
        typeof current_password !== "string" ||
        typeof new_password !== "string" ||
        new_password.length < 6
    ) {
        return res.status(400).json({
            success: false,
            message: "Current password and a new password of at least 6 characters are required"
        });
    }

    try {
        const [admins] = await db.query(
            "SELECT password FROM admins WHERE id = ?",
            [id]
        );

        if (admins.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        const matches = await bcrypt.compare(
            current_password,
            admins[0].password
        );

        if (!matches) {
            return res.status(400).json({
                success: false,
                message: "Current password is incorrect"
            });
        }

        const hashedPassword = await bcrypt.hash(new_password, 10);
        await db.query(
            "UPDATE admins SET password = ? WHERE id = ?",
            [hashedPassword, id]
        );

        res.json({
            success: true,
            message: "Password changed successfully"
        });
    } catch (error) {
        console.error("Error changing password:", error);
        res.status(500).json({
            success: false,
            message: "Failed to change password"
        });
    }
};

const deleteAdmin = async (req, res) => {
    const id = getAdminId(req);

    if (!id) {
        return res.status(400).json({
            success: false,
            message: "A valid user ID is required"
        });
    }

    if (id === Number(req.user.id)) {
        return res.status(400).json({
            success: false,
            message: "You cannot remove your own account"
        });
    }

    try {
        const [admins] = await db.query(
            "SELECT id, role FROM admins WHERE id = ?",
            [id]
        );

        if (admins.length === 0) {
            return res.status(404).json({
                success: false,
                message: "User not found"
            });
        }

        if (admins[0].role === "admin") {
            const [[adminCount]] = await db.query(
                "SELECT COUNT(*) AS total FROM admins WHERE role = 'admin'"
            );

            if (Number(adminCount.total) <= 1) {
                return res.status(409).json({
                    success: false,
                    message: "The last administrator cannot be removed"
                });
            }
        }

        const [[salesCount]] = await db.query(
            "SELECT COUNT(*) AS total FROM sales WHERE admin_id = ?",
            [id]
        );

        const [[stockTransactionCount]] = await db.query(
            "SELECT COUNT(*) AS total FROM stock_transactions WHERE admin_id = ?",
            [id]
        );

        if (
            Number(salesCount.total) > 0 ||
            Number(stockTransactionCount.total) > 0
        ) {
            return res.status(409).json({
                success: false,
                message: "This account has sales or inventory history and cannot be removed"
            });
        }

        await db.query("DELETE FROM admins WHERE id = ?", [id]);

        res.json({
            success: true,
            message: "User removed"
        });
    } catch (error) {
        console.error("Error removing user:", error);

        if (error.code === "ER_ROW_IS_REFERENCED_2") {
            return res.status(409).json({
                success: false,
                message: "This account is linked to existing records and cannot be removed"
            });
        }

        res.status(500).json({
            success: false,
            message: "Failed to remove user"
        });
    }
};

module.exports = {
    getAdmins,
    getAdminById,
    updateAdmin,
    updateAdminPassword,
    deleteAdmin
};