const express = require("express");
const router = express.Router();
const { protect, admin } = require("../middleware/authMiddleware");
const {
  getStats, getUsers, deleteUser,
  setUserVerified, setUserAdmin, deleteResource,
  getSignupTrend, getCategoryBreakdown,
} = require("../controllers/adminController");

// Every admin route needs a valid token AND admin rights.
router.use(protect, admin);

router.get("/stats", getStats);
router.get("/stats/signups", getSignupTrend);
router.get("/stats/categories", getCategoryBreakdown);
router.get("/users", getUsers);
router.delete("/users/:id", deleteUser);
router.put("/users/:id/verify", setUserVerified);
router.put("/users/:id/admin", setUserAdmin);

// Moderate listings: /api/admin/products/:id, /api/admin/rides/:id, etc.
router.delete("/:type/:id", deleteResource);

module.exports = router;