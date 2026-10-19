const { sql } = require("../config/db");

// Loads a chat with users[] populated (no password) and latestMessage populated
// (including latestMessage.sender as {name,email}). Returns the old shape.
async function loadFullChat(chatId) {
  const chatRows = await sql`SELECT * FROM chats WHERE id = ${chatId} LIMIT 1`;
  if (!chatRows[0]) return null;
  return shapeChats(chatRows).then((arr) => arr[0]);
}

// Given raw chat rows, attach users[], groupAdmin, latestMessage
async function shapeChats(chatRows) {
  if (chatRows.length === 0) return [];
  const ids = chatRows.map((c) => c.id);

  // users for all chats
  const userRows = await sql`
    SELECT cu.chat_id, u.id, u.name, u.email, u.university_id, u.is_verified, u.trust_score, u.avatar
    FROM chat_users cu
    JOIN users u ON u.id = cu.user_id
    WHERE cu.chat_id = ANY(${ids})`;

  // latest messages + their senders
  const lmIds = chatRows.map((c) => c.latest_message).filter(Boolean);
  let msgById = {};
  if (lmIds.length) {
    const msgRows = await sql`
      SELECT m.*, s.name AS s_name, s.email AS s_email
      FROM messages m LEFT JOIN users s ON s.id = m.sender
      WHERE m.id = ANY(${lmIds})`;
    for (const m of msgRows) {
      msgById[m.id] = {
        _id: m.id,
        content: m.content,
        chat: m.chat,
        sender: m.sender ? { _id: m.sender, name: m.s_name, email: m.s_email } : null,
        createdAt: m.created_at,
        updatedAt: m.updated_at,
      };
    }
  }

  const usersByChat = {};
  for (const r of userRows) {
    (usersByChat[r.chat_id] ||= []).push({
      _id: r.id, name: r.name, email: r.email,
      universityId: r.university_id, isVerified: r.is_verified, trustScore: r.trust_score,
      avatar: r.avatar || null,
    });
  }

  return chatRows.map((c) => ({
    _id: c.id,
    chatName: c.chat_name,
    isGroupChat: c.is_group_chat,
    users: usersByChat[c.id] || [],
    groupAdmin: c.group_admin,
    latestMessage: c.latest_message ? msgById[c.latest_message] || null : null,
    context: c.context_type
      ? { type: c.context_type, id: c.context_id, title: c.context_title }
      : null,
    createdAt: c.created_at,
    updatedAt: c.updated_at,
  }));
}

const Chat = {
  // Find a 1-on-1 chat shared by exactly the two users, about the SAME
  // listing (if a context is given). This means the same pair of users can
  // have multiple separate chat threads — one per listing they've messaged
  // about — instead of one thread whose "what's this about" tag keeps
  // getting overwritten every time they message about something new.
  async findOneToOne(userA, userB, context = null) {
    const rows = context
      ? await sql`
          SELECT c.* FROM chats c
          WHERE c.is_group_chat = FALSE
            AND c.context_type = ${context.type}
            AND c.context_id = ${context.id}
            AND EXISTS (SELECT 1 FROM chat_users WHERE chat_id = c.id AND user_id = ${userA})
            AND EXISTS (SELECT 1 FROM chat_users WHERE chat_id = c.id AND user_id = ${userB})
          LIMIT 1`
      : await sql`
          SELECT c.* FROM chats c
          WHERE c.is_group_chat = FALSE
            AND c.context_type IS NULL
            AND EXISTS (SELECT 1 FROM chat_users WHERE chat_id = c.id AND user_id = ${userA})
            AND EXISTS (SELECT 1 FROM chat_users WHERE chat_id = c.id AND user_id = ${userB})
          LIMIT 1`;
    return shapeChats(rows);
  },

  // All chats a user belongs to, newest first, fully populated
  async findForUser(userId) {
    const rows = await sql`
      SELECT c.* FROM chats c
      JOIN chat_users cu ON cu.chat_id = c.id
      WHERE cu.user_id = ${userId}
      ORDER BY c.updated_at DESC`;
    return shapeChats(rows);
  },

  // Create a 1-on-1 chat between two users, optionally tagged with what
  // listing (product/ride/skill/roommate) this conversation is about.
  async createOneToOne(userA, userB, chatName = "sender", context = null) {
    const rows = await sql`
      INSERT INTO chats (chat_name, is_group_chat, context_type, context_id, context_title)
      VALUES (${chatName}, FALSE, ${context?.type || null}, ${context?.id || null}, ${context?.title || null})
      RETURNING *`;
    const chatId = rows[0].id;
    await sql`INSERT INTO chat_users (chat_id, user_id) VALUES (${chatId}, ${userA})`;
    await sql`INSERT INTO chat_users (chat_id, user_id) VALUES (${chatId}, ${userB})`;
    return chatId;
  },

  // Update the "what is this chat about" tag — used when a user opens an
  // existing chat with someone from a different listing's detail page.
  async setContext(chatId, context) {
    await sql`
      UPDATE chats
      SET context_type = ${context.type}, context_id = ${context.id}, context_title = ${context.title}, updated_at = NOW()
      WHERE id = ${chatId}`;
  },

  async setLatestMessage(chatId, messageId) {
    await sql`UPDATE chats SET latest_message = ${messageId}, updated_at = NOW() WHERE id = ${chatId}`;
  },

  // Only deletes if the requester is actually a participant — messages and
  // chat_users rows cascade-delete automatically (see schema.sql).
  async deleteIfParticipant(chatId, userId) {
    const rows = await sql`
      DELETE FROM chats
      WHERE id = ${chatId}
        AND EXISTS (SELECT 1 FROM chat_users WHERE chat_id = ${chatId} AND user_id = ${userId})
      RETURNING id`;
    return rows.length > 0;
  },

  // Bulk delete for the "select multiple chats" flow. Only chats the
  // requester actually participates in are removed; ids for other people's
  // chats are silently ignored instead of erroring the whole batch out.
  async deleteManyIfParticipant(chatIds, userId) {
    if (!Array.isArray(chatIds) || chatIds.length === 0) return [];
    const rows = await sql`
      DELETE FROM chats
      WHERE id = ANY(${chatIds})
        AND EXISTS (SELECT 1 FROM chat_users cu WHERE cu.chat_id = chats.id AND cu.user_id = ${userId})
      RETURNING id`;
    return rows.map((r) => r.id);
  },

  loadFullChat,
};

module.exports = Chat;
