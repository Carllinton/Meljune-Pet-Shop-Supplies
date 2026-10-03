const express = require("express");
const router = express.Router();

const {
    getStockTransactions,
    getStockTransactionsByProduct,
    adjustStock
} = require("../controllers/stockTransactionController");

router.get("/", getStockTransactions);
router.get("/product/:productId", getStockTransactionsByProduct);
router.post("/adjust", adjustStock);

module.exports = router;