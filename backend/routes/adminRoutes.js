const express = require("express");
const router = express.Router();

const {
    getAdmins,
    getAdminById
} = require("../controllers/adminController");

router.get("/", getAdmins);
router.get("/:id", getAdminById);

module.exports = router;