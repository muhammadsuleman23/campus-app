// Helpers to map snake_case Postgres rows into the camelCase / _id shape
// the frontend and controllers already expect (mirrors old Mongoose docs).

function mapUser(row, { withPassword = false } = {}) {
  if (!row) return null;
  const u = {
    _id: row.id,
    name: row.name,
    email: row.email,
    universityId: row.university_id,
    isVerified: row.is_verified,
    isAdmin: row.is_admin,
    trustScore: row.trust_score,
    referredBy: row.referred_by,
    avatar: row.avatar || null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  if (withPassword) u.password = row.password;
  return u;
}

// Build a minimal populated user object from a left-joined query
// (columns aliased as u_id, u_name, u_email).
function mapPopulatedUser(row, prefix = "u_") {
  if (!row[`${prefix}id`]) return null;
  return {
    _id: row[`${prefix}id`],
    name: row[`${prefix}name`],
    email: row[`${prefix}email`],
  };
}

module.exports = { mapUser, mapPopulatedUser };
