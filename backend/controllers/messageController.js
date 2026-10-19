const Message = require("../models/Message");
const Chat = require("../models/Chat");
const Notification = require("../models/Notification");

// ✅ sendMessage
const sendMessage = async (req, res) => {
  const { content, chatId, userId, messageType, location } = req.body;
  const isLocation = messageType === "location";

  if (isLocation) {
    if (!location || typeof location.lat !== "number" || typeof location.lng !== "number") {
      return res.status(400).json({ message: "A valid { lat, lng } location is required" });
    }
  } else if (!content) {
    return res.status(400).json({ message: "Content and ChatID/UserID required" });
  }
  if (!chatId && !userId) {
    return res.status(400).json({ message: "Content and ChatID/UserID required" });
  }

  try {
    let finalChatId = chatId;

    // 1. If no chatId but a userId is given (e.g. messaging from a product page)
    if (!finalChatId && userId) {
      const existing = await Chat.findOneToOne(req.user._id, userId);
      if (existing.length > 0) {
        finalChatId = existing[0]._id;
      } else {
        finalChatId = await Chat.createOneToOne(req.user._id, userId);
      }
    }

    // 2. Create the message
    const newMessageId = await Message.create({
      sender: req.user._id,
      content: isLocation ? null : content,
      chat: finalChatId,
      messageType: isLocation ? "location" : "text",
      location: isLocation ? location : null,
    });

    const message = await Message.findByIdFull(newMessageId);

    // 3. Update chat's latest message
    await Chat.setLatestMessage(finalChatId, newMessageId);

    // 4. 🔔 Notify every OTHER participant of this chat
    try {
      const recipients = (message.chat?.users || []).filter(
        (u) => String(u._id) !== String(req.user._id)
      );
      for (const r of recipients) {
        const note = await Notification.create({
          user: r._id,
          type: "info",
          message: isLocation ? `${req.user.name} shared their location` : `New message from ${req.user.name}`,
          referenceId: finalChatId,
          read: false,
        });
        // Real-time push to that user's personal socket room
        if (req.io) req.io.to(String(r._id)).emit("notification", note);
      }
    } catch (notifyErr) {
      // A notification failure must never break sending a message
      console.error("Notification error (message):", notifyErr.message);
    }

    res.json(message);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// ✅ allMessages
const allMessages = async (req, res) => {
  try {
    const messages = await Message.findForChat(req.params.chatId);
    res.json(messages);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// ✅ markRead — call this when a chat is opened. Marks every message the
// current user didn't send as read, then pings the sender(s) live so their
// UI can flip single-tick → double-tick without a refresh.
const markRead = async (req, res) => {
  try {
    const senderIds = await Message.markChatRead(req.params.chatId, req.user._id);
    if (req.io) {
      senderIds.forEach((senderId) => {
        req.io.to(String(senderId)).emit("messages read", {
          chatId: req.params.chatId,
          readerId: req.user._id,
        });
      });
    }
    res.json({ ok: true });
  } catch (error) {
    // Non-critical: don't let a missing `read_at` column (un-migrated DB)
    // break the chat — read receipts just won't show up.
    console.error("⚠️ markRead failed (run `node config/initDb.js`?):", error.message);
    res.json({ ok: false });
  }
};

// ✅ editMessage — sender can edit the text of their own message.
// PUT /api/messages/:id  { content }
const editMessage = async (req, res) => {
  const { content } = req.body;
  if (!content || !content.trim()) {
    return res.status(400).json({ message: "Content is required" });
  }
  try {
    const updated = await Message.editIfSender(req.params.id, req.user._id, content);
    if (!updated) {
      return res.status(404).json({ message: "Message not found, not yours, or can't be edited" });
    }
    const full = await Message.findByIdFull(updated._id);
    if (req.io && full?.chat?.users) {
      full.chat.users
        .filter((u) => String(u._id) !== String(req.user._id))
        .forEach((u) => req.io.to(String(u._id)).emit("message edited", full));
    }
    res.json(full);
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

// ✅ deleteMessage — sender can delete (soft-delete) their own message.
// DELETE /api/messages/:id
const deleteMessage = async (req, res) => {
  try {
    const deleted = await Message.deleteIfSender(req.params.id, req.user._id);
    if (!deleted) {
      return res.status(404).json({ message: "Message not found or not yours" });
    }
    if (req.io) {
      req.io.in(String(deleted.chat)).emit("message deleted", { _id: deleted.id, chat: deleted.chat });
    }
    res.json({ message: "Message deleted", _id: deleted.id, chat: deleted.chat });
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
};

module.exports = { sendMessage, allMessages, markRead, editMessage, deleteMessage };
