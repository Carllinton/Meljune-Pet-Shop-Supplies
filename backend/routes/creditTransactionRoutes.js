const express = require("express");

const router = express.Router();

const {
    getCreditTransactions,
    getCreditTransactionsByCustomer,
    recordPayment
} = require("../controllers/creditTransactionController");


// =============================================
// GET ALL CREDIT TRANSACTIONS
// =============================================
router.get("/", getCreditTransactions);


// =============================================
// GET CUSTOMER CREDIT HISTORY
// =============================================
router.get(
    "/customer/:customerId",
    getCreditTransactionsByCustomer
);


// =============================================
// RECORD CUSTOMER PAYMENT
// =============================================
router.post(
    "/payment",
    recordPayment
);


module.exports = router;
