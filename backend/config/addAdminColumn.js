// One-time migration: adds the is_admin column to your existing users table.
//   node config/addAdminColumn.js
require('dns').setDefaultResultOrder('ipv4first');
require("dotenv").config();
const { neon } = require("@neondatabase/serverless");

(async () => {
  if (!process.env.DATABASE_URL) {
    console.error("❌ DATABASE_URL is not set in .env");
    process.exit(1);
  }
  const sql = neon(process.env.DATABASE_URL);
  try {
    await sql.query(
      "ALTER TABLE users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN NOT NULL DEFAULT FALSE"
    );
    console.log("✅ is_admin column added (or already existed).");
    process.exit(0);
  } catch (err) {
    console.error("❌ Migration failed:", err.message);
    process.exit(1);
  }
})();