const Skill = require("../models/Skill");
const Notification = require("../models/Notification");

// 1. Create Skill
const createSkill = async (req, res) => {
  try {
    const { title, description, category, location, contact } = req.body;
    if (!title || !description || !category || !location || !contact) {
      return res.status(400).json({ message: "Please fill all fields" });
    }
    const skill = await Skill.create({
      user: req.user._id,
      title, description, category, location, contact
    });
    res.status(201).json(skill);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// 2. Get Skills (deactivated ones auto-hidden — see Skill.activeWhere)
const getSkills = async (req, res) => {
  try {
    const skills = await Skill.findActive().populate("user", "name email").sort({ createdAt: -1 });
    res.json(skills);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// 3. Get Single Skill
const getSkillById = async (req, res) => {
  try {
    const skill = await Skill.findById(req.params.id).populate("user", "name email");
    if (skill) res.json(skill);
    else res.status(404).json({ message: "Skill not found" });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// 4. Update Skill
const updateSkill = async (req, res) => {
  try {
    const skill = await Skill.findById(req.params.id);
    if (!skill) return res.status(404).json({ message: "Not found" });
    if (skill.user.toString() !== req.user._id.toString()) return res.status(401).json({ message: "Not authorized" });

    skill.title = req.body.title || skill.title;
    skill.description = req.body.description || skill.description;
    skill.category = req.body.category || skill.category;
    skill.location = req.body.location || skill.location;
    skill.contact = req.body.contact || skill.contact;
    if (req.body.isActive !== undefined) skill.isActive = req.body.isActive;

    const updatedSkill = await skill.save();
    res.json(updatedSkill);
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// 5. Delete Skill
const deleteSkill = async (req, res) => {
  try {
    const skill = await Skill.findById(req.params.id);
    if (!skill) return res.status(404).json({ message: "Not found" });
    if (skill.user.toString() !== req.user._id.toString()) return res.status(401).json({ message: "Not authorized" });

    await skill.deleteOne();
    res.json({ message: "Skill Removed" });
  } catch (error) { res.status(500).json({ message: error.message }); }
};

// ✅ 6. ADD REVIEW (Yeh Naya Feature Hai)
const createSkillReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const skill = await Skill.findById(req.params.id);

    if (skill) {
      // Check: Banda pehle review de chuka hai?
      const alreadyReviewed = skill.reviews.find(
        (r) => r.user.toString() === req.user._id.toString()
      );

      if (alreadyReviewed) {
        return res.status(400).json({ message: "Product already reviewed" });
      }

      const review = {
        name: req.user.name,
        rating: Number(rating),
        comment,
        user: req.user._id,
      };

      skill.reviews.push(review);
      skill.numReviews = skill.reviews.length;
      skill.rating =
        skill.reviews.reduce((acc, item) => item.rating + acc, 0) /
        skill.reviews.length;

      await skill.save();

      // 🔔 Notify the skill owner (skill.user is the raw owner id here)
      try {
        const ownerId = skill.user?._id || skill.user;
        if (ownerId && String(ownerId) !== String(req.user._id)) {
          const note = await Notification.create({
            user: ownerId,
            type: "success",
            message: `${req.user.name} left a ${Number(rating)}★ review on "${skill.title}"`,
            referenceId: skill._id,
            read: false,
          });
          if (req.io) req.io.to(String(ownerId)).emit("notification", note);
        }
      } catch (notifyErr) {
        console.error("Notification error (review):", notifyErr.message);
      }

      res.status(201).json({ message: "Review added" });
    } else {
      res.status(404).json({ message: "Skill not found" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { createSkill, getSkills, getSkillById, deleteSkill, updateSkill, createSkillReview };