const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const Otp = require("../models/Otp");
const UserReview = require("../models/UserReview");
const Notification = require("../models/Notification");
const { sendOtpEmail, sendPasswordResetEmail } = require("../config/mailer");

// Sirf isi domain ke emails allow karne hain
const ALLOWED_EMAIL_DOMAIN = "mul.edu.pk";

const isAllowedEmail = (email) => {
  if (!email || typeof email !== "string") return false;
  const domain = email.split("@")[1]?.toLowerCase().trim();
  return domain === ALLOWED_EMAIL_DOMAIN;
};

// 1. REGISTER USER
const registerUser = async (req, res) => {
  const { name, email, password, universityId, ref } = req.body;

  try {
    // Sirf university ka email allow karo
    if (!isAllowedEmail(email)) {
      return res.status(400).json({
        message: `Only @${ALLOWED_EMAIL_DOMAIN} email addresses are allowed to register.`,
      });
    }

    // Check karein ke user pehle se to nahi?
    const userExists = await User.findOne({ email });
    if (userExists) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Referral: if a valid ?ref=<userId> link was used to sign up, remember
    // who invited them (reward is granted once they verify their email).
    let referredBy = null;
    if (ref) {
      const referrer = await User.findById(ref).select("-password");
      if (referrer) referredBy = referrer._id;
    }

    // Password ko secure (Hash) karein
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Naya User banayen (is_verified defaults to false in the DB)
    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      universityId,
      referredBy,
    });

    if (user) {
      // Generate + email an OTP, don't log the user in yet
      const code = await Otp.create(user._id);
      try {
        await sendOtpEmail(user.email, user.name, code);
      } catch (mailError) {
        console.error("⛔ Failed to send OTP email:", mailError.message);
        return res.status(500).json({
          message: "Account created but failed to send verification email. Try resending the code.",
        });
      }

      res.status(201).json({
        message: "Registered. Please verify your email with the code we sent you.",
        email: user.email,
        needsVerification: true,
      });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 2. LOGIN USER
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await User.findOne({ email });

    // Check karein password match hua ya nahi
    if (user && (await bcrypt.compare(password, user.password))) {
      if (!user.isVerified) {
        // Auto-send a fresh code so the user doesn't have to manually hit
        // "Resend" right after being redirected — but still respect the
        // cooldown so repeated failed logins can't spam their inbox.
        const cooldown = await Otp.cooldownRemaining(user._id);
        if (cooldown === 0) {
          try {
            const code = await Otp.create(user._id);
            await sendOtpEmail(user.email, user.name, code);
          } catch (mailError) {
            console.error("⛔ Failed to send OTP email on login:", mailError.message);
          }
        }

        return res.status(403).json({
          message: "Email not verified. We've sent a verification code to your email.",
          needsVerification: true,
          email: user.email,
        });
      }

      res.json({
        _id: user._id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin,
        avatar: user.avatar,
        token: generateToken(user._id),
      });
    } else {
      res.status(401).json({ message: "Invalid email or password" });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 3. VERIFY OTP
const verifyOtp = async (req, res) => {
  const { email, code } = req.body;

  if (!email || !code) {
    return res.status(400).json({ message: "Email and code are required" });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (user.isVerified) {
      return res.status(400).json({ message: "Email already verified" });
    }

    const result = await Otp.verify(user._id, code);

    if (!result.ok) {
      const messages = {
        NOT_FOUND: "No pending verification for this account. Please request a new code.",
        EXPIRED: "This code has expired. Please request a new one.",
        TOO_MANY_ATTEMPTS: "Too many incorrect attempts. Please request a new code.",
        INVALID: "Incorrect code. Please try again.",
      };
      return res.status(400).json({ message: messages[result.reason] || "Invalid code" });
    }

    const updatedUser = await User.setVerified(user._id, true);

    // 🎁 Referral reward: give the referrer a small trust-score bump now
    // that the invited friend has proven they're a real, verified student.
    if (updatedUser.referredBy) {
      try {
        await User.bumpTrustScore(updatedUser.referredBy, 5);
        const note = await Notification.create({
          user: updatedUser.referredBy,
          type: "success",
          message: `🎉 ${updatedUser.name} joined using your invite! +5 trust score`,
          referenceId: updatedUser._id,
          read: false,
        });
        if (req.io) req.io.to(String(updatedUser.referredBy)).emit("notification", note);
      } catch (refErr) {
        console.error("Referral reward error:", refErr.message);
      }
    }

    res.json({
      _id: updatedUser._id,
      name: updatedUser.name,
      email: updatedUser.email,
      isAdmin: updatedUser.isAdmin,
      avatar: updatedUser.avatar,
      token: generateToken(updatedUser._id),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 4. RESEND OTP
const resendOtp = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    if (user.isVerified) {
      return res.status(400).json({ message: "Email already verified" });
    }

    const cooldown = await Otp.cooldownRemaining(user._id);
    if (cooldown > 0) {
      return res.status(429).json({
        message: `Please wait ${cooldown}s before requesting another code.`,
        cooldown,
      });
    }

    const code = await Otp.create(user._id);
    await sendOtpEmail(user.email, user.name, code);

    res.json({ message: "A new code has been sent to your email." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 5. FORGOT PASSWORD (send reset code)
const forgotPassword = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "Email is required" });
  }

  try {
    const user = await User.findOne({ email });
    // Don't reveal whether the account exists — same response either way
    if (!user) {
      return res.json({ message: "If that account exists, a reset code has been sent." });
    }

    const cooldown = await Otp.cooldownRemaining(user._id);
    if (cooldown > 0) {
      return res.status(429).json({
        message: `Please wait ${cooldown}s before requesting another code.`,
        cooldown,
      });
    }

    const code = await Otp.create(user._id);
    await sendPasswordResetEmail(user.email, user.name, code);

    res.json({ message: "If that account exists, a reset code has been sent." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 6. RESET PASSWORD (verify code + set new password)
const resetPassword = async (req, res) => {
  const { email, code, newPassword } = req.body;

  if (!email || !code || !newPassword) {
    return res.status(400).json({ message: "Email, code and new password are required" });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters" });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const result = await Otp.verify(user._id, code);
    if (!result.ok) {
      const messages = {
        NOT_FOUND: "No pending reset request for this account. Please request a new code.",
        EXPIRED: "This code has expired. Please request a new one.",
        TOO_MANY_ATTEMPTS: "Too many incorrect attempts. Please request a new code.",
        INVALID: "Incorrect code. Please try again.",
      };
      return res.status(400).json({ message: messages[result.reason] || "Invalid code" });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);
    await User.updatePassword(user._id, hashedPassword);

    res.json({ message: "Password reset successfully. You can now log in." });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 7. GET PUBLIC PROFILE (name, member-since, trust score, review rating)
const getUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) return res.status(404).json({ message: "User not found" });

    // Degrade gracefully if the user_reviews table/migration hasn't been
    // run yet — the profile should still load with a 0 rating rather than
    // 500ing the whole page.
    let stats = { average: 0, count: 0 };
    try {
      stats = await UserReview.getStats(user._id);
    } catch (statsErr) {
      console.error("⚠️ user_reviews lookup failed (did you run `node config/initDb.js`?):", statsErr.message);
    }

    res.json({
      _id: user._id,
      name: user.name,
      universityId: user.universityId,
      isVerified: user.isVerified,
      trustScore: user.trustScore,
      createdAt: user.createdAt,
      avatar: user.avatar,
      rating: stats.average,
      numReviews: stats.count,
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 8. GET REVIEWS LEFT ON A USER'S PROFILE
const getUserReviews = async (req, res) => {
  try {
    const reviews = await UserReview.findByTarget(req.params.id);
    res.json(reviews);
  } catch (error) {
    // Same graceful-degradation logic as above: an un-migrated DB shouldn't
    // break the whole profile page, just show zero reviews.
    console.error("⚠️ user_reviews lookup failed (did you run `node config/initDb.js`?):", error.message);
    res.json([]);
  }
};

// 9. WRITE A REVIEW ON SOMEONE'S PROFILE (protect)
const createUserReview = async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const { rating, comment } = req.body;

    if (!rating || Number(rating) < 1 || Number(rating) > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }
    if (String(targetUserId) === String(req.user._id)) {
      return res.status(400).json({ message: "You can't review your own profile" });
    }
    if (comment && comment.length > 500) {
      return res.status(400).json({ message: "Review is too long (max 500 characters)" });
    }

    const targetUser = await User.findById(targetUserId).select("-password");
    if (!targetUser) return res.status(404).json({ message: "User not found" });

    const already = await UserReview.hasReviewed(req.user._id, targetUserId);
    if (already) {
      return res.status(400).json({ message: "You've already reviewed this user" });
    }

    // 🛡️ Anti-fake-review gate #1: you must have actually messaged this
    // person — stops strangers/bots from posting reviews with no real interaction.
    const interacted = await UserReview.hasInteracted(req.user._id, targetUserId);
    if (!interacted) {
      return res.status(403).json({
        message: "You can only review someone after messaging them at least once.",
      });
    }

    // 🛡️ Anti-fake-review gate #2: cap how many reviews one account can post
    // in a day — stops review-bombing / bulk fake reviews.
    const recentCount = await UserReview.countRecentByReviewer(req.user._id, 24);
    if (recentCount >= 5) {
      return res.status(429).json({
        message: "You've posted several reviews recently. Please try again later.",
      });
    }

    await UserReview.create({
      reviewer: req.user._id,
      targetUser: targetUserId,
      rating: Number(rating),
      comment,
    });

    // 🔔 Let the reviewed user know
    try {
      const note = await Notification.create({
        user: targetUserId,
        type: "success",
        message: `${req.user.name} left you a ${Number(rating)}★ profile review`,
        referenceId: req.user._id,
        read: false,
      });
      if (req.io) req.io.to(String(targetUserId)).emit("notification", note);
    } catch (notifyErr) {
      console.error("Notification error (profile review):", notifyErr.message);
    }

    const stats = await UserReview.getStats(targetUserId);
    res.status(201).json({ message: "Review submitted", rating: stats.average, numReviews: stats.count });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// EDIT MY OWN REVIEW (protect) — only the person who wrote it can change it
const updateUserReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    if (!rating || Number(rating) < 1 || Number(rating) > 5) {
      return res.status(400).json({ message: "Rating must be between 1 and 5" });
    }
    if (comment && comment.length > 500) {
      return res.status(400).json({ message: "Review is too long (max 500 characters)" });
    }

    const review = await UserReview.findById(req.params.reviewId);
    if (!review) return res.status(404).json({ message: "Review not found" });
    if (String(review.reviewer) !== String(req.user._id)) {
      return res.status(403).json({ message: "You can only edit your own review" });
    }

    await UserReview.updateById(req.params.reviewId, { rating: Number(rating), comment });
    const stats = await UserReview.getStats(review.targetUser);
    res.json({ message: "Review updated", rating: stats.average, numReviews: stats.count });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// DELETE MY OWN REVIEW (protect)
const deleteUserReview = async (req, res) => {
  try {
    const review = await UserReview.findById(req.params.reviewId);
    if (!review) return res.status(404).json({ message: "Review not found" });
    if (String(review.reviewer) !== String(req.user._id)) {
      return res.status(403).json({ message: "You can only delete your own review" });
    }

    await UserReview.deleteById(req.params.reviewId);
    const stats = await UserReview.getStats(review.targetUser);
    res.json({ message: "Review deleted", rating: stats.average, numReviews: stats.count });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 10. UPDATE MY PROFILE PICTURE (protect) — expects a base64 data URL
const updateAvatar = async (req, res) => {
  try {
    const { avatar } = req.body;
    if (!avatar || typeof avatar !== "string") {
      return res.status(400).json({ message: "No image provided" });
    }
    // Rough cap so nobody stuffs a huge file into the DB (~3MB raw image).
    if (avatar.length > 4 * 1024 * 1024) {
      return res.status(400).json({ message: "Image is too large. Please use a smaller photo (under ~3MB)." });
    }
    const updated = await User.updateAvatar(req.user._id, avatar);
    res.json({ avatar: updated.avatar });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 11. MY REFERRAL STATS (protect) — used by the "Invite friends" card
const getMyReferrals = async (req, res) => {
  try {
    let count = 0;
    try {
      count = await User.countReferrals(req.user._id);
    } catch (e) {
      console.error("⚠️ referred_by lookup failed (run `node config/initDb.js`?):", e.message);
    }
    res.json({ referralCode: req.user._id, count });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// 11. LEADERBOARD — top rated students campus-wide
const getLeaderboard = async (req, res) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 10, 50);
    const leaders = await UserReview.getLeaderboard(limit);
    res.json(leaders);
  } catch (error) {
    console.error("⚠️ leaderboard lookup failed (run `node config/initDb.js`?):", error.message);
    res.json([]);
  }
};

// Token Banane ka Function
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET || "secret123", {
    expiresIn: "30d",
  });
};

module.exports = {
  registerUser, loginUser, verifyOtp, resendOtp, forgotPassword, resetPassword,
  getUserProfile, getUserReviews, createUserReview, getMyReferrals, getLeaderboard,
  updateAvatar, updateUserReview, deleteUserReview,
};
