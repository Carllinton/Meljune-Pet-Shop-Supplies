const express = require("express");

const router = express.Router();

const {
    getDashboard
} = require("../controllers/dashboardController");

const authenticateToken = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");


router.get(
    "/",
    authenticateToken,
    authorizeRoles("admin", "cashier"),
    getDashboard
);


module.exports = router;