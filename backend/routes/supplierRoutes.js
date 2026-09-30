const express = require("express");

const router = express.Router();

const {
    getSuppliers,
    getSupplierById,
    createSupplier,
    updateSupplier,
    deleteSupplier
} = require("../controllers/supplierController");


// GET all suppliers
router.get("/", getSuppliers);

// GET supplier by ID
router.get("/:id", getSupplierById);

// CREATE supplier
router.post("/", createSupplier);

// UPDATE supplier
router.put("/:id", updateSupplier);

// DELETE supplier
router.delete("/:id", deleteSupplier);


module.exports = router;