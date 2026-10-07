const jwt = require("jsonwebtoken");
const db = require("../config/database");

const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;

        if (!authHeader || !authHeader.startsWith("Bearer ")) {
            return res.status(401).json({
                success: false,
                message: "Authentication required"
            });
        }

        const token = authHeader.split(" ")[1];

        if (!token) {
            return res.status(401).json({
                success: false,
                message: "Authentication token is missing"
            });
        }

        let decoded;
        try {
            decoded = jwt.verify(token, process.env.JWT_SECRET);
        } catch (error) {
            console.error("Authentication error:", error.message);

            if (error.name === "TokenExpiredError") {
                return res.status(401).json({
                    success: false,
                    message: "Authentication token has expired"
                });
            }

            return res.status(401).json({
                success: false,
                message: "Invalid authentication token"
            });
        }

        const [admins] = await db.query(
            "SELECT id, username, full_name, role FROM admins WHERE id = ? LIMIT 1",
            [decoded.id]
        );

        if (admins.length === 0) {
            return res.status(401).json({
                success: false,
                message: "This user account is no longer active"
            });
        }

        req.user = {
            ...decoded,
            username: admins[0].username,
            full_name: admins[0].full_name,
            role: admins[0].role
        };

        return next();
    } catch (error) {
        console.error("Failed to validate authenticated user:", error);

        return res.status(500).json({
            success: false,
            message: "Failed to validate user session"
        });
    }
};

module.exports = authenticateToken;