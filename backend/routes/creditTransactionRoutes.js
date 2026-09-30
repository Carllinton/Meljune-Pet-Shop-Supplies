const express = require("express");
const router = express.Router();

const {
    getCreditTransactions,
    getCreditTransactionsByCustomer
} = require("../controllers/creditTransactionController");

router.get("/", getCreditTransactions);
router.get("/customer/:customerId", getCreditTransactionsByCustomer);

module.exports = router;