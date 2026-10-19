const express = require("express");
const router = express.Router();
const { 
    getSkills, 
    createSkill, 
    getSkillById, 
    updateSkill, 
    deleteSkill,
    createSkillReview 
} = require("../controllers/skillController"); // ✅ Correct Controller Imported
const { protect } = require("../middleware/authMiddleware");

// Routes
router.route("/")
    .get(getSkills)               // ✅ Now calls getSkills, NOT getLostItems
    .post(protect, createSkill);

router.route("/:id")
    .get(getSkillById)
    .put(protect, updateSkill)
    .delete(protect, deleteSkill);

router.route("/:id/reviews").post(protect, createSkillReview);

module.exports = router;