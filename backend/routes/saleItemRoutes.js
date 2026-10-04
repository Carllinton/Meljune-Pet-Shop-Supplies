const express = require("express");

const router = express.Router();

const {
    getSaleItems,
    getSaleItemsBySaleId
} = require("../controllers/saleItemController");

const authenticateToken = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");


// =============================================
// VIEW ALL SALE ITEMS
// ADMIN + CASHIER
// =============================================

router.get(
    "/",
    authenticateToken,
    authorizeRoles("admin", "cashier"),
    getSaleItems
);


// =============================================
// VIEW SALE ITEMS BY SALE
// ADMIN + CASHIER
// =============================================

router.get(
    "/sale/:saleId",
    authenticateToken,
    authorizeRoles("admin", "cashier"),
    getSaleItemsBySaleId
);


module.exports = router;