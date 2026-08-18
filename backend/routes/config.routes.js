const express = require("express");
const router = express.Router();

const { authMiddleware, isAdmin } = require("../middlewares/auth");

const {
    updateConfig,
    getConfig,
    getLastBackup,
} = require("../controllers/config.controller");

router.post("/update", authMiddleware, isAdmin, updateConfig);
router.get("/", authMiddleware, getConfig);
router.get("/last-backup", authMiddleware, getLastBackup);

module.exports = router;
