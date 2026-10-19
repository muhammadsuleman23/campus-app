const express = require("express");
const router = express.Router();
// ✅ Import check karein (Controller sahi file se aa raha ho)
const { getNotifications, markAsRead, markAllAsRead } = require("../controllers/notificationController");
const { protect } = require("../middleware/authMiddleware");

router.route("/").get(protect, getNotifications);
// "Mark all as read" — must be registered before "/:id/read" so it isn't
// swallowed by the :id param route.
router.route("/read-all").put(protect, markAllAsRead);
// Frontend calls PUT /notifications/:id/read
router.route("/:id/read").put(protect, markAsRead);
// Keep the old path working too, just in case
router.route("/:id").put(protect, markAsRead);

module.exports = router;