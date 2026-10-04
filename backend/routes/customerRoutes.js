const express = require("express");

const router = express.Router();

const {
    getCustomers,
    getCustomerById,
    createCustomer,
    updateCustomer,
    deleteCustomer
} = require("../controllers/customerController");

const authenticateToken = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");


// =============================================
// VIEW CUSTOMERS
// ADMIN + CASHIER
// =============================================

router.get(
    "/",
    authenticateToken,
    authorizeRoles("admin", "cashier"),
    getCustomers
);

router.get(
    "/:id",
    authenticateToken,
    authorizeRoles("admin", "cashier"),
    getCustomerById
);


// =============================================
// CUSTOMER MANAGEMENT
// ADMIN + CASHIER
// =============================================

router.post(
    "/",
    authenticateToken,
    authorizeRoles("admin", "cashier"),
    createCustomer
);

router.put(
    "/:id",
    authenticateToken,
    authorizeRoles("admin", "cashier"),
    updateCustomer
);


// =============================================
// DELETE CUSTOMER
// ADMIN ONLY
// =============================================

router.delete(
    "/:id",
    authenticateToken,
    authorizeRoles("admin"),
    deleteCustomer
);


module.exports = router;