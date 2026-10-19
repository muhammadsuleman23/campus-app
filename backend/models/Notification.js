const { sql } = require("../config/db");

function mapNotification(row) {
  if (!row) return null;
  const doc = {
    _id: row.id,
    user: row.user,
    type: row.type,
    message: row.message,
    referenceId: row.reference_id,
    read: row.read,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
  doc.save = async function () {
    const rows = await sql`
      UPDATE notifications
      SET type = ${this.type}, message = ${this.message},
          reference_id = ${this.referenceId ?? null}, read = ${this.read},
          updated_at = NOW()
      WHERE id = ${this._id} RETURNING *`;
    Object.assign(this, mapNotification(rows[0]));
    return this;
  };
  return doc;
}

const Notification = {
  // Notification.find({ user }).sort({ createdAt: -1 })
  find(filter = {}) {
    const userId = filter.user;
    const builder = {
      sort() { return builder; },
      async then(resolve, reject) {
        try {
          const rows = userId
            ? await sql`SELECT * FROM notifications WHERE "user" = ${userId} ORDER BY created_at DESC`
            : await sql`SELECT * FROM notifications ORDER BY created_at DESC`;
          resolve(rows.map(mapNotification));
        } catch (e) { reject(e); }
      },
    };
    return builder;
  },

  async findById(id) {
    const rows = await sql`SELECT * FROM notifications WHERE id = ${id} LIMIT 1`;
    return mapNotification(rows[0]);
  },

  async create({ user, type, message, referenceId, read }) {
    const rows = await sql`
      INSERT INTO notifications ("user", type, message, reference_id, read)
      VALUES (${user}, ${type}, ${message}, ${referenceId ?? null}, ${read ?? false})
      RETURNING *`;
    return mapNotification(rows[0]);
  },

  // Mark every unread notification for this user as read in one shot.
  // Returns how many rows were flipped.
  async markAllRead(userId) {
    const rows = await sql`
      UPDATE notifications SET read = true, updated_at = NOW()
      WHERE "user" = ${userId} AND read = false
      RETURNING id`;
    return rows.length;
  },
};

module.exports = Notification;
