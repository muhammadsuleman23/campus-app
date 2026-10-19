require("dotenv").config();
const { neon } = require("@neondatabase/serverless");

if (!process.env.DATABASE_URL) {
  console.error("❌ DATABASE_URL is not set. Add your Neon connection string to .env");
}

const sql = neon(process.env.DATABASE_URL);

module.exports = { sql };