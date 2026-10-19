const { sql } = require("../config/db");

function mapReview(row) {
  if (!row) return null;
  return {
    _id: row.id,
    targetUser: row.target_user,
    rating: Number(row.rating),
    comment: row.comment,
    reviewer: { _id: row.reviewer_id, name: row.reviewer_name, avatar: row.reviewer_avatar || null },
    createdAt: row.created_at,
  };
}

const UserReview = {
  // All reviews written ABOUT this user, newest first, with reviewer name joined in
  async findByTarget(targetUserId) {
    const rows = await sql`
      SELECT r.*, u.id AS reviewer_id, u.name AS reviewer_name, u.avatar AS reviewer_avatar
      FROM user_reviews r
      JOIN users u ON u.id = r.reviewer
      WHERE r.target_user = ${targetUserId}
      ORDER BY r.created_at DESC`;
    return rows.map(mapReview);
  },

  // Raw row (no join) — used for ownership checks before edit/delete.
  async findById(id) {
    const rows = await sql`SELECT * FROM user_reviews WHERE id = ${id} LIMIT 1`;
    if (!rows[0]) return null;
    return {
      _id: rows[0].id,
      reviewer: rows[0].reviewer,
      targetUser: rows[0].target_user,
      rating: Number(rows[0].rating),
      comment: rows[0].comment,
    };
  },

  async updateById(id, { rating, comment }) {
    const rows = await sql`
      UPDATE user_reviews SET rating = ${rating}, comment = ${comment || ""}, updated_at = NOW()
      WHERE id = ${id} RETURNING *`;
    return mapReview(rows[0]);
  },

  async deleteById(id) {
    await sql`DELETE FROM user_reviews WHERE id = ${id}`;
    return { acknowledged: true };
  },

  async hasReviewed(reviewer, targetUser) {
    const rows = await sql`
      SELECT id FROM user_reviews
      WHERE reviewer = ${reviewer} AND target_user = ${targetUser}
      LIMIT 1`;
    return rows.length > 0;
  },

  // Anti-fake-review gate: you can only review someone you've actually
  // messaged (1-on-1 chat, at least one message sent BY the reviewer).
  // Blocks drive-by / bot reviews from people with zero real interaction.
  async hasInteracted(reviewer, targetUser) {
    const rows = await sql`
      SELECT m.id
      FROM chats c
      JOIN chat_users cu1 ON cu1.chat_id = c.id AND cu1.user_id = ${reviewer}
      JOIN chat_users cu2 ON cu2.chat_id = c.id AND cu2.user_id = ${targetUser}
      JOIN messages m ON m.chat = c.id AND m.sender = ${reviewer}
      WHERE c.is_group_chat = false
      LIMIT 1`;
    return rows.length > 0;
  },

  // Simple review-bombing guard: how many reviews has this person posted
  // (on anyone) in the last 24 hours.
  async countRecentByReviewer(reviewer, hours = 24) {
    const rows = await sql`
      SELECT COUNT(*)::int AS n FROM user_reviews
      WHERE reviewer = ${reviewer} AND created_at > NOW() - (${hours} || ' hours')::interval`;
    return rows[0].n;
  },

  async create({ reviewer, targetUser, rating, comment }) {
    const rows = await sql`
      INSERT INTO user_reviews (reviewer, target_user, rating, comment)
      VALUES (${reviewer}, ${targetUser}, ${rating}, ${comment || ""})
      RETURNING *`;
    return mapReview(rows[0]);
  },

  // Average rating + total count for a user's profile badge
  async getStats(targetUserId) {
    const rows = await sql`
      SELECT COUNT(*)::int AS count, COALESCE(AVG(rating), 0)::float AS avg
      FROM user_reviews WHERE target_user = ${targetUserId}`;
    return { count: rows[0].count, average: Number(rows[0].avg) };
  },
  // Simple ranked list: highest average rating first (min 1 review),
  // ties broken by review count. Powers the /leaderboard page.
  async getLeaderboard(limit = 10) {
    const rows = await sql`
      SELECT u.id, u.name, u.trust_score, u.avatar,
             COUNT(r.id)::int AS num_reviews,
             COALESCE(AVG(r.rating), 0)::float AS avg_rating
      FROM users u
      JOIN user_reviews r ON r.target_user = u.id
      GROUP BY u.id, u.name, u.trust_score, u.avatar
      ORDER BY avg_rating DESC, num_reviews DESC
      LIMIT ${limit}`;
    return rows.map((r) => ({
      _id: r.id,
      name: r.name,
      trustScore: r.trust_score,
      avatar: r.avatar || null,
      numReviews: r.num_reviews,
      rating: Number(r.avg_rating),
    }));
  },
};

module.exports = UserReview;
