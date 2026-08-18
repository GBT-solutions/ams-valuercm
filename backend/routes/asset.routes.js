const express = require("express");
const router = express.Router();

const { authMiddleware, isAdmin } = require("../middlewares/auth");
const { uploadCSV, handleUploadError } = require("../utils/csvUpload");
const {
    addNewAsset,
    getAssets,
    getAllAssets,
    update,
    // getAssetById,
    createCSVBackup,
    generateQRCode,
    getAssetTypes,
    uploadAssetsCSV,
    getSampleCSV,
    getExpiringAssets,
    disposeAsset,
    getDisposedAssets,
    createDisposedCSVBackup,
    assetAllocationHistory,
} = require("../controllers/asset.controller");

router.post("/add", authMiddleware, addNewAsset);
router.get("/", authMiddleware, getAssets);
router.put("/update/:id", authMiddleware, isAdmin, update);
// router.get("/asset", authMiddleware, getAssetById);
router.get("/all", authMiddleware, getAllAssets);
router.get("/backup", authMiddleware, createCSVBackup);
router.post("/generate-qr", generateQRCode);
router.get("/types", authMiddleware, getAssetTypes);
router.post("/upload-csv", authMiddleware, isAdmin, uploadCSV, handleUploadError, uploadAssetsCSV);
router.get("/sample-csv", authMiddleware, getSampleCSV);
router.get("/expiring", authMiddleware, getExpiringAssets);
router.post("/dispose", authMiddleware, disposeAsset);
router.get("/disposed", authMiddleware, getDisposedAssets);
router.get("/disposed-backup", authMiddleware, createDisposedCSVBackup);
router.get("/allocation-history", authMiddleware, assetAllocationHistory);

module.exports = router;
