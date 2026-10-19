const Chat = require("../models/Chat");

// 1. Access or Create Chat
const accessChat = async (req, res) => {
  const { userId, contextType, contextId, contextTitle } = req.body;
  const context = contextTitle ? { type: contextType, id: contextId, title: contextTitle } : null;

  if (!userId) {
    console.log("UserId param not sent with request");
    return res.status(400).json({ message: "UserId param not sent with request" });
  }

  try {
    // Look for a chat between these two users about THIS SAME listing
    // (or, if no listing was given, a general chat with no listing tag).
    // A different listing between the same two users gets its own thread.
    const existing = await Chat.findOneToOne(req.user._id, userId, context);

    if (existing.length > 0) {
      return res.send(existing[0]);
    }

    // Otherwise create a new chat thread for this listing
    const chatId = await Chat.createOneToOne(req.user._id, userId, "sender", context);
    const fullChat = await Chat.loadFullChat(chatId);
    res.status(200).json(fullChat);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// 2. Fetch All Chats
const fetchChats = async (req, res) => {
  try {
    const results = await Chat.findForUser(req.user._id);
    res.status(200).send(results);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// 3. Delete a chat (only a participant can do this; wipes the whole
// thread + messages for both people, since this is a 1-on-1 chat).
const deleteChat = async (req, res) => {
  try {
    const deleted = await Chat.deleteIfParticipant(req.params.chatId, req.user._id);
    if (!deleted) {
      return res.status(404).json({ message: "Chat not found or you're not part of it" });
    }
    res.json({ message: "Chat deleted" });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// 4. Delete multiple chats at once (the "select" mode in the chat list).
// Body: { chatIds: [id, id, ...] }
const deleteChats = async (req, res) => {
  try {
    const { chatIds } = req.body;
    if (!Array.isArray(chatIds) || chatIds.length === 0) {
      return res.status(400).json({ message: "chatIds array is required" });
    }
    const deletedIds = await Chat.deleteManyIfParticipant(chatIds, req.user._id);
    res.json({ message: `${deletedIds.length} chat(s) deleted`, deletedIds });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = { accessChat, fetchChats, deleteChat, deleteChats };
