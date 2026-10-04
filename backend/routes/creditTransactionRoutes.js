const express = require("express");

const router = express.Router();

const {
    getCreditTransactions,
    getCreditTransactionsByCustomer,
    recordPayment
} = require("../controllers/creditTransactionController");

const authenticateToken = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");


// =============================================
// VIEW CREDIT TRANSACTIONS
// ADMIN + CASHIER
// =============================================

router.get(
    "/",
    authenticateToken,
    authorizeRoles("admin", "cashier"),
    getCreditTransactions
);

router.get(
    "/customer/:customerId",
    authenticateToken,
    authorizeRoles("admin", "cashier"),
    getCreditTransactionsByCustomer
);


// =============================================
// RECORD PAYMENT
// ADMIN + CASHIER
// =============================================

router.post(
    "/payment",
    authenticateToken,
    authorizeRoles("admin", "cashier"),
    recordPayment
);


module.exports = router;