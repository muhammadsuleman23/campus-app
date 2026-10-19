const express = require("express");
const { accessChat, fetchChats, deleteChat, deleteChats } = require("../controllers/chatController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// /api/chat
router.route("/").post(protect, accessChat); // Chat shuru karne ke liye
router.route("/").get(protect, fetchChats);  // Chat list mangwane ke liye
// Bulk delete (select multiple chats) — must be registered before "/:chatId"
router.route("/bulk-delete").post(protect, deleteChats);
router.route("/:chatId").delete(protect, deleteChat); // Chat delete karne ke liye

module.exports = router;