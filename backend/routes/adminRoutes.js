const express = require("express");

const router = express.Router();

const {
    getAdmins,
    getAdminById,
    updateAdmin,
    updateAdminPassword,
    deleteAdmin
} = require("../controllers/adminController");

const authenticateToken = require("../middleware/authMiddleware");
const authorizeRoles = require("../middleware/roleMiddleware");


router.get(
    "/",
    authenticateToken,
    authorizeRoles("admin"),
    getAdmins
);

router.get(
    "/:id",
    authenticateToken,
    authorizeRoles("admin"),
    getAdminById
);

router.put(
    "/:id/password",
    authenticateToken,
    authorizeRoles("admin"),
    updateAdminPassword
);

router.put(
    "/:id",
    authenticateToken,
    authorizeRoles("admin"),
    updateAdmin
);

router.delete(
    "/:id",
    authenticateToken,
    authorizeRoles("admin"),
    deleteAdmin
);


module.exports = router;