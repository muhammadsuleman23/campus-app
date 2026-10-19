// Creates (or promotes) an admin user.
//   node config/seedAdmin.js
require('dns').setDefaultResultOrder('ipv4first');
require("dotenv").config();
const bcrypt = require("bcryptjs");
const { neon } = require("@neondatabase/serverless");

// ---- EDIT THESE ----
const ADMIN_NAME = "Site Admin";
const ADMIN_EMAIL = "admin@unihub.com";
const ADMIN_PASSWORD = "Admin@12345";          // change this!
const ADMIN_UNIVERSITY_ID = "ADMIN-0001";
// --------------------

(async () => {
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL is not set in .env");
    process.exit(1);
  }
  const sql = neon(process.env.DATABASE_URL);

  try {
    const hashed = await bcrypt.hash(ADMIN_PASSWORD, await bcrypt.genSalt(10));
    const existing = await sql`SELECT id FROM users WHERE email = ${ADMIN_EMAIL} LIMIT 1`;

    if (existing.length > 0) {
      await sql`UPDATE users SET is_admin = TRUE, is_verified = TRUE WHERE email = ${ADMIN_EMAIL}`;
      console.log(`✅ Existing user ${ADMIN_EMAIL} promoted to admin.`);
    } else {
      await sql`
        INSERT INTO users (name, email, password, university_id, is_admin, is_verified)
        VALUES (${ADMIN_NAME}, ${ADMIN_EMAIL}, ${hashed}, ${ADMIN_UNIVERSITY_ID}, TRUE, TRUE)`;
      console.log("✅ Admin account created.");
    }

    console.log("\n   Login with:");
    console.log("   Email:    " + ADMIN_EMAIL);
    console.log("   Password: " + ADMIN_PASSWORD);
    process.exit(0);
  } catch (err) {
    console.error("❌ Failed to seed admin:", err.message);
    process.exit(1);
  }
})();