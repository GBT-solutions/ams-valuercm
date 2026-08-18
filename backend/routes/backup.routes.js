const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const fs = require("fs");

const {
    createManualBackup,
    getBackupList,
    deleteLocalBackupRange,
    downloadBackupFile,
    deleteBackupFile,
    restoreBackup,
} = require("../controllers/backup.controller");
const { authMiddleware, isAdmin } = require("../middlewares/auth");

// Configure storage for backup uploads
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        const uploadDir = path.join(__dirname, "..", "backups", "temp");
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
        cb(null, "backup-" + uniqueSuffix + ".ams");
    },
});

const fileFilter = (req, file, cb) => {
    if (file.originalname.endsWith(".ams")) {
        cb(null, true);
    } else {
        cb(new Error("Only .ams backup files are allowed!"), false);
    }
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 100 * 1024 * 1024, // 100MB limit
    },
});

const uploadBackup = upload.single("backupFile");

const handleBackupUpload = (req, res, next) => {
    uploadBackup(req, res, function (err) {
        if (err) {
            return res.status(400).json({ success: false, message: err.message });
        }
        next();
    });
};

router.post("/manual-backup", authMiddleware, isAdmin, createManualBackup);
router.get("/list", authMiddleware, getBackupList);
router.post("/delete-local-range", authMiddleware, deleteLocalBackupRange);
router.get("/download/:filename", authMiddleware, downloadBackupFile);
router.delete("/delete/:filename", authMiddleware, isAdmin, deleteBackupFile);
router.post("/restore", authMiddleware, isAdmin, handleBackupUpload, restoreBackup);

module.exports = router;

