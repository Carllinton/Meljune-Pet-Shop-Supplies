const express = require("express");
const router = express.Router();

const {
    getSales,
    getSaleById,
    createSale
} = require("../controllers/saleController");


// GET ALL SALES
router.get("/", getSales);


// GET SALE BY ID
router.get("/:id", getSaleById);


// CREATE SALE
router.post("/", createSale);


module.exports = router;