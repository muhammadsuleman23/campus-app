const jwt = require("jsonwebtoken");
const User = require("../models/User");

const protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    try {
      // Get token from header
      token = req.headers.authorization.split(" ")[1];

      // Verify token
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      console.log("🔐 Token Verified for User ID:", decoded.id); // ✅ DEBUG LOG

      // Get user from the token
      req.user = await User.findById(decoded.id).select("-password");

      if (!req.user) {
        console.log("❌ User not found in DB (Deleted?)"); // ✅ DEBUG LOG
        return res.status(401).json({ message: "User not found" });
      }

      next(); // Controller ke paas jane do
    } catch (error) {
      console.error("⛔ Auth Failed:", error.message); // ✅ DEBUG LOG
      res.status(401).json({ message: "Not authorized" });
    }
  }

  if (!token) {
    console.log("⚠️ No Token Provided"); // ✅ DEBUG LOG
    res.status(401).json({ message: "Not authorized, no token" });
  }
};

// Must run AFTER `protect`. Blocks anyone who isn't an admin.
const admin = (req, res, next) => {
  if (req.user && req.user.isAdmin) {
    return next();
  }
  return res.status(403).json({ message: "Not authorized as admin" });
};

module.exports = { protect, admin };