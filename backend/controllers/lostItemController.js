const LostItem = require("../models/LostItem");

// 1. Get All Items
const getLostItems = async (req, res) => {
  try {
    const items = await LostItem.find({})
      .populate("user", "name email")
      .sort({ createdAt: -1 });
    res.json(items);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

// 2. Create Item
const createLostItem = async (req, res) => {
  try {
    const { title, description, category, location, date, contact, image, securityQuestion } = req.body;

    if (!title || !description || !category || !location || !date || !contact) {
      return res.status(400).json({ message: "Please fill all required fields" });
    }

    const lostItem = new LostItem({
      title, description, category, location, date, contact, image, securityQuestion,
      user: req.user._id,
    });

    const savedItem = await lostItem.save();

    // Notification
    if (req.io) {
      req.io.emit("global_notification", {
        message: `📢 Lost & Found: New ${category} item "${title}" reported by ${req.user.name}`,
      });
    }

    res.status(201).json(savedItem);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

// ✅ 3. Update Item (Edit ke liye)
const updateLostItem = async (req, res) => {
  try {
    const item = await LostItem.findById(req.params.id);

    if (!item) return res.status(404).json({ message: "Item not found" });

    // Check Owner
    if (item.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: "Not authorized" });
    }

    // Update Fields
    item.title = req.body.title || item.title;
    item.description = req.body.description || item.description;
    item.category = req.body.category || item.category;
    item.location = req.body.location || item.location;
    item.date = req.body.date || item.date;
    item.contact = req.body.contact || item.contact;
    item.image = req.body.image || item.image;
    item.securityQuestion = req.body.securityQuestion || item.securityQuestion;
    if (req.body.isResolved !== undefined) item.isResolved = req.body.isResolved;

    const updatedItem = await item.save();
    res.json(updatedItem);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ✅ 4. Delete Item (Delete & Case Solved ke liye)
const deleteLostItem = async (req, res) => {
  try {
    const item = await LostItem.findById(req.params.id);

    if (!item) return res.status(404).json({ message: "Item not found" });

    if (item.user.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: "Not authorized" });
    }

    await item.deleteOne();
    res.json({ message: "Item Removed" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getLostItems, createLostItem, updateLostItem, deleteLostItem };