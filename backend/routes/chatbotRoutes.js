const express = require("express");
const router = express.Router();
// ✅ Destructuring check karein { handleChat }
const { handleChat } = require("../controllers/chatbotController"); 
const { protect } = require("../middleware/authMiddleware");

// ✅ Route define karein
// Error line 8 yahan thi, ab ye sahi function call karega
router.post("/", protect, handleChat); 

module.exports = router;