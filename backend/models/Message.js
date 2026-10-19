const { sql } = require("../config/db");

function shapeMessage(m) {
  return {
    _id: m.id,
    content: m.is_deleted ? null : m.content,
    messageType: m.message_type || "text",
    location: m.location_lat != null && m.location_lng != null
      ? { lat: Number(m.location_lat), lng: Number(m.location_lng) }
      : null,
    chat: m.chat,
    sender: m.sender ? { _id: m.sender, name: m.s_name, email: m.s_email } : null,
    readAt: m.read_at || null,
    isEdited: !!m.is_edited,
    isDeleted: !!m.is_deleted,
    createdAt: m.created_at,
    updatedAt: m.updated_at,
  };
}

const Message = {
  async create({ sender, content, chat, messageType, location }) {
    const rows = await sql`
      INSERT INTO messages (sender, content, chat, message_type, location_lat, location_lng)
      VALUES (
        ${sender}, ${content ?? null}, ${chat},
        ${messageType || "text"}, ${location?.lat ?? null}, ${location?.lng ?? null}
      ) RETURNING *`;
    return rows[0].id;
  },

  // Only the sender can edit their own message, and only text messages.
  async editIfSender(id, senderId, newContent) {
    const rows = await sql`
      UPDATE messages
      SET content = ${newContent}, is_edited = true, updated_at = NOW()
      WHERE id = ${id} AND sender = ${senderId} AND message_type = 'text' AND is_deleted = false
      RETURNING *`;
    return rows[0] ? shapeMessage(rows[0]) : null;
  },

  // Soft-delete: keeps the row (so chat history / latest_message pointers
  // don't break) but blanks the content and flags it so the UI can render
  // "This message was deleted".
  async deleteIfSender(id, senderId) {
    const rows = await sql`
      UPDATE messages
      SET is_deleted = true, content = NULL, location_lat = NULL, location_lng = NULL, updated_at = NOW()
      WHERE id = ${id} AND sender = ${senderId}
      RETURNING id, chat`;
    return rows[0] || null;
  },

  // Full message with sender {name,email} and chat with its users
  async findByIdFull(id) {
    const rows = await sql`
      SELECT m.*, s.name AS s_name, s.email AS s_email
      FROM messages m LEFT JOIN users s ON s.id = m.sender
      WHERE m.id = ${id} LIMIT 1`;
    if (!rows[0]) return null;
    const msg = shapeMessage(rows[0]);
    // attach chat with users
    const chatUsers = await sql`
      SELECT u.id, u.name, u.email FROM chat_users cu
      JOIN users u ON u.id = cu.user_id WHERE cu.chat_id = ${msg.chat}`;
    msg.chat = {
      _id: rows[0].chat,
      users: chatUsers.map((u) => ({ _id: u.id, name: u.name, email: u.email })),
    };
    return msg;
  },

  // Message.find({ chat }).populate("sender").populate("chat")
  async findForChat(chatId) {
    const rows = await sql`
      SELECT m.*, s.name AS s_name, s.email AS s_email
      FROM messages m LEFT JOIN users s ON s.id = m.sender
      WHERE m.chat = ${chatId} ORDER BY m.created_at ASC`;
    return rows.map(shapeMessage);
  },

  // Marks every not-yet-read message in this chat that the reader did NOT
  // send as read. Returns the distinct sender ids so the caller can push a
  // live "messages read" event to whoever sent them (double-tick UI).
  async markChatRead(chatId, readerId) {
    const rows = await sql`
      UPDATE messages SET read_at = NOW()
      WHERE chat = ${chatId} AND sender != ${readerId} AND read_at IS NULL
      RETURNING sender`;
    return [...new Set(rows.map((r) => r.sender).filter(Boolean))];
  },
};

module.exports = Message;
