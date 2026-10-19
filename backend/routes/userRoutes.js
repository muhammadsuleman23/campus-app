const express = require("express");
const router = express.Router();
const rateLimit = require("express-rate-limit");
const {
  registerUser, loginUser, verifyOtp, resendOtp, forgotPassword, resetPassword,
  getUserProfile, getUserReviews, createUserReview, getMyReferrals, getLeaderboard,
  updateAvatar, updateUserReview, deleteUserReview,
} = require("../controllers/userController");
const { protect } = require("../middleware/authMiddleware");

// 🛡️ Extra anti-spam layer: max 10 review submissions per IP per hour
// (on top of the per-account daily cap + "must have messaged them" check
// inside the controller).
const reviewLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: "Too many reviews submitted. Please try again later." },
});

router.post("/register", registerUser);           // http://localhost:5000/api/users/register
router.post("/login", loginUser);                 // http://localhost:5000/api/users/login
router.post("/verify-otp", verifyOtp);             // http://localhost:5000/api/users/verify-otp
router.post("/resend-otp", resendOtp);             // http://localhost:5000/api/users/resend-otp
router.post("/forgot-password", forgotPassword);   // http://localhost:5000/api/users/forgot-password
router.post("/reset-password", resetPassword);     // http://localhost:5000/api/users/reset-password

// ⚠️ These fixed-path routes must be registered BEFORE the generic "/:id"
// route below, or Express will treat "leaderboard"/"me" as a user id.
router.get("/leaderboard/top", protect, getLeaderboard);   // http://localhost:5000/api/users/leaderboard/top
router.get("/me/referrals", protect, getMyReferrals);      // http://localhost:5000/api/users/me/referrals
router.put("/me/avatar", protect, updateAvatar);           // http://localhost:5000/api/users/me/avatar

// Edit/delete a review you wrote (ownership checked in the controller)
router.put("/reviews/:reviewId", protect, updateUserReview);    // http://localhost:5000/api/users/reviews/:reviewId
router.delete("/reviews/:reviewId", protect, deleteUserReview); // http://localhost:5000/api/users/reviews/:reviewId

// ✅ Public profile page (name, member-since, trust score, rating from reviews)
router.get("/:id", protect, getUserProfile);              // http://localhost:5000/api/users/:id
router.get("/:id/reviews", protect, getUserReviews);       // http://localhost:5000/api/users/:id/reviews
router.post("/:id/reviews", protect, reviewLimiter, createUserReview); // http://localhost:5000/api/users/:id/reviews

module.exports = router;