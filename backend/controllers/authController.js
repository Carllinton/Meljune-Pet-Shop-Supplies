const db = require("../config/database");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const login = async (req, res) => {
    try {
        const { username, password } = req.body;

        // Validate input
        if (!username || !password) {
            return res.status(400).json({
                success: false,
                message: "Username and password are required"
            });
        }

        // Find user
        const [admins] = await db.query(
            `
            SELECT
                id,
                username,
                password,
                full_name,
                email,
                avatar,
                role,
                created_at
            FROM admins
            WHERE username = ?
            LIMIT 1
            `,
            [username]
        );

        if (admins.length === 0) {
            return res.status(401).json({
                success: false,
                message: "Invalid username or password"
            });
        }

        const admin = admins[0];

        // Compare entered password with bcrypt hash
        const passwordMatch = await bcrypt.compare(
            password,
            admin.password
        );

        if (!passwordMatch) {
            return res.status(401).json({
                success: false,
                message: "Invalid username or password"
            });
        }

        // Make sure JWT secret exists
        if (!process.env.JWT_SECRET) {
            console.error("JWT_SECRET is not configured");

            return res.status(500).json({
                success: false,
                message: "Authentication configuration error"
            });
        }

        // Create authentication token
        const token = jwt.sign(
            {
                id: admin.id,
                username: admin.username,
                role: admin.role,
                full_name: admin.full_name
            },
            process.env.JWT_SECRET,
            {
                expiresIn: "8h"
            }
        );

        // Never send the password/hash back to the frontend
        delete admin.password;

        res.json({
            success: true,
            message: "Login successful",
            token,
            user: admin
        });

    } catch (error) {
        console.error("Login error:", error);

        res.status(500).json({
            success: false,
            message: "Login failed"
        });
    }
};

module.exports = {
    login
};