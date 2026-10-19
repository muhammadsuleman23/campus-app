const Notification = require("../models/Notification");

// 1. Get Notifications
const getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 });
    res.json(notifications);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

// 2. Mark as Read
const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findById(req.params.id);
    if (notification) {
      notification.read = true;
      await notification.save();
      res.json({ message: "Notification marked as read" });
    } else {
      res.status(404).json({ message: "Notification not found" });
    }
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

// 3. Mark ALL as Read (the "mark all as read" button)
const markAllAsRead = async (req, res) => {
  try {
    const count = await Notification.markAllRead(req.user._id);
    res.json({ message: "All notifications marked as read", count });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

// ✅ Zaroori: Export karna na bhulein
module.exports = { getNotifications, markAsRead, markAllAsRead };