const express = require("express");
const { sendMessage, allMessages, markRead, editMessage, deleteMessage } = require("../controllers/messageController");
const { protect } = require("../middleware/authMiddleware");

const router = express.Router();

// ✅ Route 1: Message bhejne ke liye (POST /api/messages)
router.route("/").post(protect, sendMessage);

// ✅ Route 2: Kisi chat ke messages lene ke liye (GET /api/messages/:chatId)
router.route("/:chatId").get(protect, allMessages);

// ✅ Route 3: Chat khulte hi uske messages ko "read" mark karna (PUT /api/messages/:chatId/read)
router.route("/:chatId/read").put(protect, markRead);

// ✅ Route 4/5: Ek single message edit/delete karne ke liye (hold -> edit/delete)
router.route("/:id").put(protect, editMessage).delete(protect, deleteMessage);

module.exports = router;