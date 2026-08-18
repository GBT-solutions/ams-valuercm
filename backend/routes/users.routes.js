const express = require("express");
const router = express.Router();

const {
    signUp,
    signIn,
    signOut,
    getUsers,
    updateUser,
    getDaashboardData,
    backupCSV,
    forgotPassword,
    resetPassword,
    backupUpcommingCSV,
    backupExpiredCSV,
    changePassword,
} = require("../controllers/users.controller");
const { authMiddleware, isAdmin } = require("../middlewares/auth");

router.post("/signup", signUp);
router.post("/signin", signIn);
router.post("/signout", signOut);
router.get("/", authMiddleware, getUsers);
router.patch("/:id", authMiddleware, isAdmin, updateUser);
router.post("/dashboard", authMiddleware, getDaashboardData);
router.post("/backup-dashboard", authMiddleware, backupCSV);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.post("/change-password", authMiddleware, changePassword);
router.post("/backup-upcoming-csv", authMiddleware, backupUpcommingCSV);
router.post("/backup-expiring-csv", authMiddleware, backupExpiredCSV);

module.exports = router;
