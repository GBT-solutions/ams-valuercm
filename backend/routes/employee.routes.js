const express = require("express");
const router = express.Router();

const { authMiddleware, isAdmin } = require("../middlewares/auth");
const { uploadCSV, handleUploadError } = require("../utils/csvUpload");

const {
    addEmployee,
    updateEmployee,
    uploadEmployeesCSV,
    getEmployees,
    createCSVBackup,
    getAllUntaggedEmployees,
    getSampleCSV,
} = require("../controllers/employee.controller");

router.post("/add", authMiddleware, isAdmin, addEmployee);
router.post("/update/:id", authMiddleware, isAdmin, updateEmployee);
router.post(
    "/upload-csv",
    authMiddleware,
    isAdmin,
    uploadCSV,
    handleUploadError,
    uploadEmployeesCSV
);
router.get("/", authMiddleware, getEmployees);
router.get("/backup", authMiddleware, createCSVBackup);
router.get("/all-untagged", authMiddleware, getAllUntaggedEmployees);
router.get("/sample-csv", authMiddleware, getSampleCSV);

module.exports = router;
