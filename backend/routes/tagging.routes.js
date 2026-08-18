const express = require("express");
const router = express.Router();

const { authMiddleware, isAdmin } = require("../middlewares/auth");

const {
    getTaggingDetails,
    addTagging,
    removeTagging,
    getTaggingList,
} = require("../controllers/tagging.controller");

router.post("/details", authMiddleware, getTaggingDetails);
router.post("/add", authMiddleware, isAdmin, addTagging);
router.post("/remove", authMiddleware, isAdmin, removeTagging);
router.get("/list", authMiddleware, getTaggingList);

module.exports = router;
