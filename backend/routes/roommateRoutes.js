const express = require("express");
const router = express.Router();
const { 
    getRoommatePosts, getRoommatePostById, createRoommatePost, updateRoommatePost, deleteRoommatePost 
} = require("../controllers/roommateController");
const { protect } = require("../middleware/authMiddleware");

router.route("/").get(getRoommatePosts).post(protect, createRoommatePost);
router.route("/:id").get(getRoommatePostById).put(protect, updateRoommatePost).delete(protect, deleteRoommatePost);

module.exports = router;