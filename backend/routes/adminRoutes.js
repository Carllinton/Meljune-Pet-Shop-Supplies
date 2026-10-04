const express = require("express");

const router = express.Router();

const {
    getAdmins,
    getAdminById
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


module.exports = router;