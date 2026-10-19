// One-time helper: create (or promote) an admin account directly in the
// database, bypassing the normal @mul.edu.pk registration restriction.
// Usage:
//   node scripts/createAdmin.js "Full Name" "email@example.com" "password123" "ADMIN-001"
//
// If a user with that email already exists, this just promotes them to
// admin + verified instead of creating a duplicate.

require("dotenv").config();
const bcrypt = require("bcryptjs");
const User = require("../models/User");

(async () => {
  const [, , name, email, password, universityId] = process.argv;

  if (!name || !email || !password || !universityId) {
    console.error(
      "Usage: node scripts/createAdmin.js \"Full Name\" \"email@example.com\" \"password123\" \"ADMIN-001\""
    );
    process.exit(1);
  }

  try {
    const existing = await User.findOne({ email });

    if (existing) {
      await User.setAdmin(existing._id, true);
      await User.setVerified(existing._id, true);
      console.log(`✅ Existing user ${email} is now an admin (and marked verified).`);
      process.exit(0);
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({ name, email, password: hashedPassword, universityId });
    await User.setAdmin(user._id, true);
    await User.setVerified(user._id, true);

    console.log(`✅ Admin account created: ${email} (password not shown here — use what you typed).`);
    process.exit(0);
  } catch (err) {
    console.error("❌ Failed to create admin:", err.message);
    process.exit(1);
  }
})();
