const express = require("express");
const router = express.Router();

const {
    getSaleItems,
    getSaleItemsBySaleId
} = require("../controllers/saleItemController");

router.get("/", getSaleItems);
router.get("/sale/:saleId", getSaleItemsBySaleId);

module.exports = router;