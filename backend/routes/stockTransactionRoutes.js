const express = require("express");

const router = express.Router();

const {
    getStockTransactions,
    getStockTransactionsByProduct,
    adjustStock
} = require("../controllers/stockTransactionController");

const authenticateToken = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");


// =============================================
// VIEW INVENTORY / TRANSACTIONS
// ADMIN + CASHIER
// =============================================

router.get(
    "/",
    authenticateToken,
    authorizeRoles("admin", "cashier"),
    getStockTransactions
);

router.get(
    "/product/:productId",
    authenticateToken,
    authorizeRoles("admin", "cashier"),
    getStockTransactionsByProduct
);


// =============================================
// MANUAL STOCK ADJUSTMENT
// ADMIN ONLY
// =============================================

router.post(
    "/adjust",
    authenticateToken,
    authorizeRoles("admin"),
    adjustStock
);


module.exports = router;