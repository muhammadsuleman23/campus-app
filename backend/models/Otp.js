const { sql } = require("../config/db");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");

const OTP_EXPIRY_MINUTES = 10;
const RESEND_COOLDOWN_SECONDS = 60;
const MAX_ATTEMPTS = 5;

const Otp = {
  // Generates a secure 6-digit code, hashes it, and stores it for the user.
  // Overwrites any existing OTP row for that user (only one active OTP at a time).
  async create(userId) {
    const code = crypto.randomInt(100000, 999999).toString();
    const codeHash = await bcrypt.hash(code, 10);
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await sql`DELETE FROM otp_codes WHERE user_id = ${userId}`;
    await sql`
      INSERT INTO otp_codes (user_id, code_hash, expires_at, attempts, last_sent_at)
      VALUES (${userId}, ${codeHash}, ${expiresAt}, 0, NOW())`;

    return code; // plain code returned only so it can be emailed, never stored
  },

  async findByUserId(userId) {
    const rows = await sql`SELECT * FROM otp_codes WHERE user_id = ${userId} LIMIT 1`;
    return rows[0] || null;
  },

  async verify(userId, code) {
    const otp = await Otp.findByUserId(userId);

    if (!otp) {
      return { ok: false, reason: "NOT_FOUND" };
    }
    if (new Date(otp.expires_at) < new Date()) {
      return { ok: false, reason: "EXPIRED" };
    }
    if (otp.attempts >= MAX_ATTEMPTS) {
      return { ok: false, reason: "TOO_MANY_ATTEMPTS" };
    }

    const matches = await bcrypt.compare(code, otp.code_hash);
    if (!matches) {
      await sql`UPDATE otp_codes SET attempts = attempts + 1 WHERE user_id = ${userId}`;
      return { ok: false, reason: "INVALID" };
    }

    await sql`DELETE FROM otp_codes WHERE user_id = ${userId}`;
    return { ok: true };
  },

  // Returns seconds remaining before a resend is allowed, or 0 if allowed now.
  async cooldownRemaining(userId) {
    const otp = await Otp.findByUserId(userId);
    if (!otp) return 0;
    const elapsedMs = Date.now() - new Date(otp.last_sent_at).getTime();
    const remaining = RESEND_COOLDOWN_SECONDS - Math.floor(elapsedMs / 1000);
    return remaining > 0 ? remaining : 0;
  },
};

module.exports = Otp;
module.exports.OTP_EXPIRY_MINUTES = OTP_EXPIRY_MINUTES;
module.exports.RESEND_COOLDOWN_SECONDS = RESEND_COOLDOWN_SECONDS;
