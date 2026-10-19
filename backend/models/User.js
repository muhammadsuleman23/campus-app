const { sql } = require("../config/db");
const { mapUser } = require("./_helpers");

const User = {
  // User.findOne({ email }) -> includes password (needed for login)
  async findOne({ email }) {
    const rows = await sql`SELECT * FROM users WHERE email = ${email} LIMIT 1`;
    return mapUser(rows[0], { withPassword: true });
  },

  // Supports: User.findById(id)  and  User.findById(id).select("-password")
  findById(id) {
    let excludePassword = false;
    const run = async () => {
      const rows = await sql`SELECT * FROM users WHERE id = ${id} LIMIT 1`;
      return mapUser(rows[0], { withPassword: !excludePassword });
    };
    return {
      select(fields) {
        if (typeof fields === "string" && fields.includes("-password")) {
          excludePassword = true;
        }
        return run();
      },
      then(resolve, reject) {
        return run().then(resolve, reject);
      },
    };
  },

  // User.create({ name, email, password, universityId, referredBy })
  async create({ name, email, password, universityId, referredBy = null }) {
    const rows = await sql`
      INSERT INTO users (name, email, password, university_id, referred_by)
      VALUES (${name}, ${email}, ${password}, ${universityId}, ${referredBy})
      RETURNING *`;
    return mapUser(rows[0], { withPassword: true });
  },

  // +N trust score, capped at 100 (used for referral rewards etc.)
  async bumpTrustScore(id, amount) {
    const rows = await sql`
      UPDATE users SET trust_score = LEAST(100, trust_score + ${amount}), updated_at = NOW()
      WHERE id = ${id} RETURNING *`;
    return mapUser(rows[0]);
  },

  async countReferrals(id) {
    const rows = await sql`SELECT COUNT(*)::int AS n FROM users WHERE referred_by = ${id}`;
    return rows[0].n;
  },

  // Base64 data URL, same convention as product/roommate images elsewhere.
  async updateAvatar(id, avatar) {
    const rows = await sql`
      UPDATE users SET avatar = ${avatar}, updated_at = NOW()
      WHERE id = ${id} RETURNING *`;
    return mapUser(rows[0]);
  },

  // ---------- Admin helpers ----------
  async findAll() {
    const rows = await sql`SELECT * FROM users ORDER BY created_at DESC`;
    return rows.map((r) => mapUser(r));
  },

  async deleteById(id) {
    await sql`DELETE FROM users WHERE id = ${id}`;
    return { acknowledged: true };
  },

  async setVerified(id, value) {
    const rows = await sql`
      UPDATE users SET is_verified = ${value}, updated_at = NOW()
      WHERE id = ${id} RETURNING *`;
    return mapUser(rows[0]);
  },

  async updatePassword(id, hashedPassword) {
    const rows = await sql`
      UPDATE users SET password = ${hashedPassword}, updated_at = NOW()
      WHERE id = ${id} RETURNING *`;
    return mapUser(rows[0]);
  },

  async setAdmin(id, value) {
    const rows = await sql`
      UPDATE users SET is_admin = ${value}, updated_at = NOW()
      WHERE id = ${id} RETURNING *`;
    return mapUser(rows[0]);
  },

  async count() {
    const rows = await sql`SELECT COUNT(*)::int AS n FROM users`;
    return rows[0].n;
  },
};

module.exports = User;
