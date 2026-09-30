const express = require("express");
const router = express.Router();

const {
    getStockTransactions,
    getStockTransactionsByProduct
} = require("../controllers/stockTransactionController");

router.get("/", getStockTransactions);
router.get("/product/:productId", getStockTransactionsByProduct);

module.exports = router;