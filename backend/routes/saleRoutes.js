const express = require("express");

const router = express.Router();

const {
    getSales,
    getSaleById,
    createSale
} = require("../controllers/saleController");

const authenticateToken = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");


// =============================================
// SALES
// ADMIN + CASHIER
// =============================================

router.get(
    "/",
    authenticateToken,
    authorizeRoles("admin", "cashier"),
    getSales
);

router.get(
    "/:id",
    authenticateToken,
    authorizeRoles("admin", "cashier"),
    getSaleById
);

router.post(
    "/",
    authenticateToken,
    authorizeRoles("admin", "cashier"),
    createSale
);


module.exports = router;