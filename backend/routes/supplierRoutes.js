const express = require("express");

const router = express.Router();

const {
    getSuppliers,
    getSupplierById,
    createSupplier,
    updateSupplier,
    deleteSupplier
} = require("../controllers/supplierController");

const authenticateToken = require("../middleware/authMiddleware");

const authorizeRoles = require("../middleware/roleMiddleware");


// =============================================
// VIEW SUPPLIERS
// ADMIN + CASHIER
// =============================================

router.get(
    "/",
    authenticateToken,
    authorizeRoles("admin", "cashier"),
    getSuppliers
);

router.get(
    "/:id",
    authenticateToken,
    authorizeRoles("admin", "cashier"),
    getSupplierById
);


// =============================================
// SUPPLIER MANAGEMENT
// ADMIN ONLY
// =============================================

router.post(
    "/",
    authenticateToken,
    authorizeRoles("admin"),
    createSupplier
);

router.put(
    "/:id",
    authenticateToken,
    authorizeRoles("admin"),
    updateSupplier
);

router.delete(
    "/:id",
    authenticateToken,
    authorizeRoles("admin"),
    deleteSupplier
);


module.exports = router;