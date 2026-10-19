const express = require("express");
const router = express.Router();
const { 
    getLostItems, 
    createLostItem, 
    updateLostItem,   // ✅ Ensure yeh Controller se import ho raha ho
    deleteLostItem    // ✅ Ensure yeh Controller se import ho raha ho
} = require("../controllers/lostItemController");

const { protect } = require("../middleware/authMiddleware");

// 1. Get All & Create New (Yeh pehle se tha)
router.route("/")
    .get(getLostItems)
    .post(protect, createLostItem);


router.route("/:id")
    .put(protect, updateLostItem)    // Edit ke liye
    .delete(protect, deleteLostItem); // Delete/Case Solved ke liye

module.exports = router;