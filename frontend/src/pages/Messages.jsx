import { useEffect, useState, useRef } from "react";
import { useNavigate, useLocation } from "react-router-dom"; // ✅ useLocation added
import {
  FaPaperPlane, FaArrowLeft, FaHome, FaBoxOpen, FaCar, FaLightbulb, FaUserFriends, FaTag,
  FaCheck, FaCheckDouble, FaTrash, FaCheckSquare, FaMapMarkerAlt, FaEdit, FaRoute,
} from "react-icons/fa";
import API from "../api";
import io from "socket.io-client";
import { toast } from "react-toastify";
import { gradientFor, initials } from "../utils/avatar";
import SharedAvatar from "../components/Avatar";

const ENDPOINT = window.location.origin; // same origin (dev: Vite proxy, prod: CloudFront)
var socket, selectedChatCompare;

// Small icon + label for the "what is this chat about" banner
const CONTEXT_META = {
  product: { icon: FaBoxOpen, label: "Marketplace item" },
  ride: { icon: FaCar, label: "Ride" },
  skill: { icon: FaLightbulb, label: "Skill" },
  roommate: { icon: FaUserFriends, label: "Roommate post" },
};

// Colorful circular avatar shared by the chat list + chat header — shows
// the person's uploaded photo when they have one, initials otherwise.
const Avatar = ({ userId, name, avatar, size = "w-12 h-12", textSize = "text-lg", onClick }) => (
  <SharedAvatar userId={userId} name={name} avatar={avatar} size={size} textSize={textSize} onClick={onClick} />
);

const Messages = () => {
  const navigate = useNavigate();
  const location = useLocation(); // ✅ Location hook to catch passed data
  const [chats, setChats] = useState([]);
  const [selectedChat, setSelectedChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false); // is the OTHER person typing
  const typingTimeoutRef = useRef(null);

  const messagesEndRef = useRef(null);

  // --- Multi-select chat delete ---
  const [selectMode, setSelectMode] = useState(false);
  const [selectedChatIds, setSelectedChatIds] = useState(new Set());

  // --- Message hold -> edit/delete menu ---
  const [activeMenuId, setActiveMenuId] = useState(null); // message._id whose menu is open
  const [editingMessage, setEditingMessage] = useState(null); // { _id, content } | null
  const holdTimerRef = useRef(null);

  // --- Location sharing / ETA ---
  const [sharingLocation, setSharingLocation] = useState(false);
  const [routeInfo, setRouteInfo] = useState(null); // { distanceKm, durationMins, arrivalTime }

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("userInfo"));
    if (!user) { navigate("/"); return; }
    setCurrentUser(user);

    socket = io(ENDPOINT);
    socket.emit("setup", user);

    // ✅ MAGIC FIX: Check if we were redirected with a specific chat
    if (location.state && location.state.chat) {
        setSelectedChat(location.state.chat);
        // Clear state so it doesn't persist on refresh
        window.history.replaceState({}, document.title);
    }

    fetchChats();
  }, [location.state]); // Dependency added

  const fetchChats = async () => {
    try {
      const { data } = await API.get("/chat");
      setChats(data);
    } catch (error) { console.error(error); }
  };

  const fetchMessages = async () => {
    if (!selectedChat) return;
    setLoading(true);
    try {
      const { data } = await API.get(`/messages/${selectedChat._id}`);
      setMessages(data);
      socket.emit("join chat", selectedChat._id);
      // Tell the backend we've now seen everything in this chat, so the
      // sender's ticks flip to "read" live.
      API.put(`/messages/${selectedChat._id}/read`).catch(() => {});
    } catch (error) { toast.error("Failed to load messages"); } 
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchMessages();
    selectedChatCompare = selectedChat;
  }, [selectedChat]);

  useEffect(() => {
    const handler = (newMessageRecieved) => {
      const incomingChatId = newMessageRecieved.chat?._id || newMessageRecieved.chat;
      if (!selectedChatCompare || selectedChatCompare._id !== incomingChatId) {
         toast.info(`New message from ${newMessageRecieved.sender?.name || "someone"}`);
         fetchChats();
      } else {
        // functional update -> no stale `messages` closure
        setMessages((prev) => [...prev, newMessageRecieved]);
      }
    };
    socket.on("message received", handler);

    // Typing indicator — only relevant to whichever chat is open right now.
    const onTyping = () => setIsTyping(true);
    const onStopTyping = () => setIsTyping(false);
    socket.on("typing", onTyping);
    socket.on("stop typing", onStopTyping);

    // Read receipts — when the other person opens the chat, flip our
    // sent messages in that chat over to "read" (double blue tick).
    const onMessagesRead = ({ chatId }) => {
      if (!selectedChatCompare || selectedChatCompare._id !== chatId) return;
      setMessages((prev) => prev.map((m) => (m.readAt ? m : { ...m, readAt: new Date().toISOString() })));
    };
    socket.on("messages read", onMessagesRead);

    // Live-update edited/deleted messages for the other participant
    const onMessageEdited = (msg) => {
      if (!selectedChatCompare || selectedChatCompare._id !== (msg.chat?._id || msg.chat)) return;
      setMessages((prev) => prev.map((m) => (m._id === msg._id ? { ...m, ...msg } : m)));
    };
    const onMessageDeleted = ({ _id, chat }) => {
      if (!selectedChatCompare || selectedChatCompare._id !== chat) return;
      setMessages((prev) => prev.map((m) => (m._id === _id ? { ...m, isDeleted: true, content: null, location: null } : m)));
    };
    socket.on("message edited", onMessageEdited);
    socket.on("message deleted", onMessageDeleted);

    // Clean up so we don't stack duplicate listeners on every render
    return () => {
      socket.off("message received", handler);
      socket.off("typing", onTyping);
      socket.off("stop typing", onStopTyping);
      socket.off("messages read", onMessagesRead);
      socket.off("message edited", onMessageEdited);
      socket.off("message deleted", onMessageDeleted);
    };
  }, []);

  // Whenever both people have shared a location in this chat, ask the
  // server to work out the real road route between their latest spots and
  // show the distance + an estimated arrival time above the message box.
  useEffect(() => {
    if (!selectedChat || !currentUser) { setRouteInfo(null); return; }
    const myLast = [...messages].reverse().find((m) => m.messageType === "location" && isMine(m) && !m.isDeleted);
    const otherLast = [...messages].reverse().find((m) => m.messageType === "location" && !isMine(m) && !m.isDeleted);
    if (!myLast || !otherLast) { setRouteInfo(null); return; }

    let cancelled = false;
    API.get("/geo/route", {
      params: {
        originLat: myLast.location.lat, originLng: myLast.location.lng,
        destLat: otherLast.location.lat, destLng: otherLast.location.lng,
      },
    })
      .then(({ data }) => {
        if (cancelled) return;
        const arrivalTime = new Date(Date.now() + data.durationMins * 60000);
        setRouteInfo({ ...data, arrivalTime });
      })
      .catch(() => { if (!cancelled) setRouteInfo(null); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [messages, selectedChat, currentUser]);

  // Reset the typing bubble whenever the open chat changes
  useEffect(() => { setIsTyping(false); }, [selectedChat]);

  // Debounced "typing"/"stop typing" emit while the user types.
  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    if (!selectedChat) return;
    socket.emit("typing", { room: selectedChat._id, user: currentUser?.name });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("stop typing", { room: selectedChat._id });
    }, 2000);
  };

  const sendMessage = async () => {
    if (newMessage.trim()) {
        try {
          const msgToSend = newMessage;
          setNewMessage("");
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          socket.emit("stop typing", { room: selectedChat._id });
          const { data } = await API.post("/messages", {
            content: msgToSend,
            chatId: selectedChat._id,
          });
          socket.emit("new message", data);
          setMessages([...messages, data]);
          
          // Refresh chat list to show latest message on top
          fetchChats();
        } catch (error) { toast.error("Failed to send"); }
    }
  };

  const handleKeyDown = (e) => { if (e.key === "Enter") sendMessage(); }

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, isTyping]);

  // Return the OTHER participant in a 1-on-1 chat (never the logged-in user).
  const getSender = (users) => {
    if (!users || users.length === 0) return { name: "Unknown" };
    const other = users.find((u) => u._id !== currentUser?._id);
    return other || users[0]; // fallback (e.g. chat with yourself)
  };

  const goToProfile = (userId) => {
    if (!userId) return;
    navigate(`/profile/${userId}`);
  };

  // Deletes the whole thread for both people (messages included) — confirm
  // first since this can't be undone.
  const handleDeleteChat = (chatId, e) => {
    if (e) e.stopPropagation();
    if (!window.confirm("Delete this conversation? This can't be undone.")) return;
    API.delete(`/chat/${chatId}`)
      .then(() => {
        setChats((prev) => prev.filter((c) => c._id !== chatId));
        setSelectedChat((prev) => (prev && prev._id === chatId ? null : prev));
        toast.success("Chat deleted");
      })
      .catch(() => toast.error("Couldn't delete this chat"));
  };

  // --- Multi-select chat delete ---
  const toggleSelectMode = () => {
    setSelectMode((prev) => !prev);
    setSelectedChatIds(new Set());
  };

  const toggleChatSelected = (chatId, e) => {
    if (e) e.stopPropagation();
    setSelectedChatIds((prev) => {
      const next = new Set(prev);
      next.has(chatId) ? next.delete(chatId) : next.add(chatId);
      return next;
    });
  };

  const handleBulkDeleteChats = async () => {
    if (selectedChatIds.size === 0) return;
    if (!window.confirm(`Delete ${selectedChatIds.size} conversation(s)? This can't be undone.`)) return;
    try {
      const chatIds = Array.from(selectedChatIds);
      await API.post("/chat/bulk-delete", { chatIds });
      setChats((prev) => prev.filter((c) => !selectedChatIds.has(c._id)));
      setSelectedChat((prev) => (prev && selectedChatIds.has(prev._id) ? null : prev));
      toast.success("Selected chats deleted");
      setSelectMode(false);
      setSelectedChatIds(new Set());
    } catch (error) {
      toast.error("Couldn't delete selected chats");
    }
  };

  // --- Message hold -> edit/delete menu ---
  const startHold = (msg) => {
    if (!isMine(msg)) return;
    if (holdTimerRef.current) clearTimeout(holdTimerRef.current);
    holdTimerRef.current = setTimeout(() => setActiveMenuId(msg._id), 450);
  };
  const cancelHold = () => {
    if (holdTimerRef.current) { clearTimeout(holdTimerRef.current); holdTimerRef.current = null; }
  };
  const isMine = (msg) => {
    const senderId = msg.sender?._id;
    return senderId && currentUser && String(senderId) === String(currentUser._id);
  };

  const startEditMessage = (msg) => {
    setActiveMenuId(null);
    setEditingMessage({ _id: msg._id, content: msg.content || "" });
  };

  const cancelEditMessage = () => setEditingMessage(null);

  const saveEditMessage = async () => {
    if (!editingMessage || !editingMessage.content.trim()) return;
    try {
      const { data } = await API.put(`/messages/${editingMessage._id}`, { content: editingMessage.content });
      setMessages((prev) => prev.map((m) => (m._id === data._id ? { ...m, ...data } : m)));
      setEditingMessage(null);
    } catch (error) {
      toast.error("Couldn't edit message");
    }
  };

  const handleDeleteMessage = async (msg) => {
    setActiveMenuId(null);
    if (!window.confirm("Delete this message?")) return;
    try {
      await API.delete(`/messages/${msg._id}`);
      setMessages((prev) => prev.map((m) => (m._id === msg._id ? { ...m, isDeleted: true, content: null, location: null } : m)));
    } catch (error) {
      toast.error("Couldn't delete message");
    }
  };

  // --- Location sharing ---
  const handleShareLocation = () => {
    if (!selectedChat || sharingLocation) return;
    if (!navigator.geolocation) { toast.error("Location isn't available on this device"); return; }
    setSharingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const { data } = await API.post("/messages", {
            chatId: selectedChat._id,
            messageType: "location",
            location: { lat: pos.coords.latitude, lng: pos.coords.longitude },
          });
          socket.emit("new message", data);
          setMessages((prev) => [...prev, data]);
          fetchChats();
        } catch (error) {
          toast.error("Couldn't share location");
        } finally {
          setSharingLocation(false);
        }
      },
      () => { toast.error("Couldn't get your location — check location permission"); setSharingLocation(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/40 to-blue-50 text-gray-900 font-sans flex flex-col md:flex-row h-screen overflow-hidden">
      
      {/* MOBILE HEADER */}
      <div className={`md:hidden p-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white flex justify-between items-center ${selectedChat ? "hidden" : "flex"}`}>
         <div className="flex items-center gap-2">
            <button onClick={() => navigate("/dashboard")} className="p-2 bg-white/15 rounded-full hover:bg-white/25 transition"><FaHome /></button>
            <h2 className="text-xl font-bold">Messages</h2>
         </div>
         {chats.length > 0 && (
           <button
             onClick={toggleSelectMode}
             className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-full transition ${selectMode ? "bg-white text-purple-700" : "bg-white/15 hover:bg-white/25"}`}
           >
             <FaCheckSquare /> {selectMode ? "Cancel" : "Select"}
           </button>
         )}
      </div>

      {/* LEFT SIDE: Chat List */}
      <div className={`${selectedChat ? "hidden md:flex" : "flex"} w-full md:w-1/3 flex-col border-r border-gray-200 bg-white h-full`}>
        <div className="hidden md:flex p-5 bg-gradient-to-r from-purple-600 to-blue-600 text-white items-center justify-between">
          <h2 className="text-xl font-bold">Chats</h2>
          <div className="flex items-center gap-2">
            {chats.length > 0 && (
              <button
                onClick={toggleSelectMode}
                className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-full transition ${selectMode ? "bg-white text-purple-700" : "bg-white/15 hover:bg-white/25"}`}
              >
                <FaCheckSquare /> {selectMode ? "Cancel" : "Select"}
              </button>
            )}
            <button onClick={() => navigate("/dashboard")} className="flex items-center gap-2 text-xs bg-white/15 px-3 py-1.5 rounded-full hover:bg-white/25 transition"><FaHome /> Dashboard</button>
          </div>
        </div>

        {selectMode && (
          <div className="flex items-center justify-between px-4 py-2 bg-purple-50 border-b border-purple-100 text-sm">
            <span className="text-purple-700 font-semibold">{selectedChatIds.size} selected</span>
            <button
              onClick={handleBulkDeleteChats}
              disabled={selectedChatIds.size === 0}
              className="flex items-center gap-1.5 text-red-600 font-bold disabled:opacity-40 disabled:cursor-not-allowed hover:text-red-700"
            >
              <FaTrash size={12} /> Delete selected
            </button>
          </div>
        )}

        <div className="flex-1 overflow-y-auto custom-scrollbar">
            {chats.length === 0 && (
              <div className="p-8 text-center text-gray-400 text-sm">No conversations yet. Start one from any listing!</div>
            )}
            {chats.map((chat) => {
                const other = !chat.isGroupChat ? getSender(chat.users) : null;
                const isSelected = selectedChat && selectedChat._id === chat._id;
                const isChecked = selectedChatIds.has(chat._id);
                return (
                  <div 
                      key={chat._id}
                      onClick={() => (selectMode ? toggleChatSelected(chat._id) : setSelectedChat(chat))}
                      className={`group p-4 flex items-center gap-3 cursor-pointer hover:bg-purple-50/60 transition border-b border-gray-100 ${isSelected && !selectMode ? "bg-gradient-to-r from-purple-50 to-blue-50 border-l-4 border-l-purple-500" : ""} ${isChecked ? "bg-purple-50/80" : ""}`}
                  >
                      {selectMode && (
                        <button
                          onClick={(e) => toggleChatSelected(chat._id, e)}
                          className={`shrink-0 w-5 h-5 rounded-md border-2 flex items-center justify-center transition ${isChecked ? "bg-purple-600 border-purple-600 text-white" : "border-gray-300"}`}
                        >
                          {isChecked && <FaCheck size={10} />}
                        </button>
                      )}
                      <Avatar
                        userId={other?._id}
                        name={!chat.isGroupChat ? other?.name : chat.chatName}
                        avatar={other?.avatar}
                        onClick={!selectMode && other?._id ? (e) => { e.stopPropagation(); goToProfile(other._id); } : undefined}
                      />
                      <div className="overflow-hidden w-full">
                          <h4 className="font-bold text-gray-800 truncate">{!chat.isGroupChat ? other.name : chat.chatName}</h4>
                          {chat.context?.title && (
                              <p className="text-[11px] text-blue-600 font-semibold truncate flex items-center gap-1">
                                  <FaTag className="text-[9px]" /> {chat.context.title}
                              </p>
                          )}
                          <p className="text-xs text-gray-500 truncate">
                               {chat.latestMessage
                                 ? (chat.latestMessage.messageType === "location" ? "📍 Location shared" : chat.latestMessage.content)
                                 : "Tap to chat"}
                          </p>
                      </div>
                      {!selectMode && (
                        <button
                          onClick={(e) => handleDeleteChat(chat._id, e)}
                          title="Delete chat"
                          className="shrink-0 text-gray-300 hover:text-red-500 hover:bg-red-50 p-2 rounded-full transition opacity-60 md:opacity-0 md:group-hover:opacity-100"
                        >
                          <FaTrash size={13} />
                        </button>
                      )}
                  </div>
                );
            })}
        </div>
      </div>

      {/* RIGHT SIDE: Chat Box */}
      <div className={`${!selectedChat ? "hidden md:flex" : "flex"} w-full md:w-2/3 flex-col bg-gray-50 relative h-full`}>
        {selectedChat ? (
            <>
                <div className="p-4 bg-white border-b border-gray-200 flex items-center gap-3 shadow-sm z-10">
                    <button onClick={() => setSelectedChat(null)} className="md:hidden text-gray-400 p-2"><FaArrowLeft /></button>
                    <Avatar
                      userId={getSender(selectedChat.users)?._id}
                      name={!selectedChat.isGroupChat ? getSender(selectedChat.users).name : selectedChat.chatName}
                      avatar={getSender(selectedChat.users)?.avatar}
                      size="w-10 h-10" textSize="text-sm"
                      onClick={!selectedChat.isGroupChat ? () => goToProfile(getSender(selectedChat.users)?._id) : undefined}
                    />
                    <div className="cursor-pointer" onClick={!selectedChat.isGroupChat ? () => goToProfile(getSender(selectedChat.users)?._id) : undefined}>
                        <h3 className="font-bold hover:text-purple-600 transition">{!selectedChat.isGroupChat ? getSender(selectedChat.users).name : selectedChat.chatName}</h3>
                        {isTyping ? (
                            <p className="text-xs text-emerald-600 font-semibold">typing...</p>
                        ) : selectedChat.context?.title && (() => {
                            const meta = CONTEXT_META[selectedChat.context.type] || { icon: FaTag, label: "Regarding" };
                            const Icon = meta.icon;
                            return (
                                <p className="text-xs text-blue-600 font-medium flex items-center gap-1">
                                    <Icon className="text-[10px]" /> {meta.label}: {selectedChat.context.title}
                                </p>
                            );
                        })()}
                    </div>
                    <button
                      onClick={() => handleDeleteChat(selectedChat._id)}
                      title="Delete chat"
                      className="ml-auto text-gray-300 hover:text-red-500 hover:bg-red-50 p-2.5 rounded-full transition shrink-0"
                    >
                      <FaTrash size={14} />
                    </button>
                </div>

                {routeInfo && (
                  <div className="px-4 py-2 bg-blue-50 border-b border-blue-100 flex items-center gap-2 text-xs text-blue-700 font-semibold">
                    <FaRoute /> {routeInfo.distanceKm} km away · ETA {routeInfo.arrivalTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} (~{routeInfo.durationMins} min)
                  </div>
                )}

                <div className="flex-1 overflow-y-auto p-4 space-y-1 bg-gradient-to-b from-white to-purple-50/30">
                    {loading ? <div className="text-center text-gray-500 mt-10">Loading...</div> : messages.map((m, idx) => {
                        // Null-safe: sender may be null if that user was deleted
                        const senderId = m.sender?._id;
                        const isMyMessage = senderId && currentUser && String(senderId) === String(currentUser._id);
                        const senderName = m.sender?.name || "Unknown";
                        // Only show the name label when the sender changes (cleaner UI)
                        const prev = messages[idx - 1];
                        const showName = !isMyMessage && (!prev || prev.sender?._id !== senderId);
                        const menuOpen = activeMenuId === m._id;
                        const isEditing = editingMessage?._id === m._id;
                        return (
                            <div key={m._id} className={`relative flex flex-col w-full ${isMyMessage ? "items-end" : "items-start"} ${showName ? "mt-3" : "mt-1"}`}>
                                {showName && (
                                    <span className="text-[11px] text-purple-600 ml-2 mb-1 font-bold">{senderName}</span>
                                )}

                                {isEditing ? (
                                  <div className="max-w-[80%] w-full flex items-center gap-2">
                                    <input
                                      autoFocus
                                      value={editingMessage.content}
                                      onChange={(e) => setEditingMessage((p) => ({ ...p, content: e.target.value }))}
                                      onKeyDown={(e) => { if (e.key === "Enter") saveEditMessage(); if (e.key === "Escape") cancelEditMessage(); }}
                                      className="flex-1 bg-white border border-purple-300 rounded-full px-4 py-2 text-sm text-gray-900 outline-none"
                                    />
                                    <button onClick={saveEditMessage} className="text-purple-600 font-bold text-xs">Save</button>
                                    <button onClick={cancelEditMessage} className="text-gray-400 text-xs">Cancel</button>
                                  </div>
                                ) : (
                                  <div
                                    onMouseDown={() => startHold(m)}
                                    onMouseUp={cancelHold}
                                    onMouseLeave={cancelHold}
                                    onTouchStart={() => startHold(m)}
                                    onTouchEnd={cancelHold}
                                    className={`relative max-w-[75%] px-4 py-2.5 rounded-2xl text-sm shadow-sm select-none ${isMyMessage ? "bg-gradient-to-br from-purple-600 to-blue-600 text-white rounded-br-md" : "bg-white text-gray-700 rounded-bl-md border border-gray-100"} ${m.isDeleted ? "italic opacity-60" : ""}`}
                                  >
                                    {m.isDeleted ? (
                                      "This message was deleted"
                                    ) : m.messageType === "location" && m.location ? (
                                      <a
                                        href={`https://www.google.com/maps?q=${m.location.lat},${m.location.lng}`}
                                        target="_blank" rel="noreferrer"
                                        className={`flex items-center gap-2 font-semibold underline decoration-dotted ${isMyMessage ? "text-white" : "text-blue-600"}`}
                                      >
                                        <FaMapMarkerAlt /> Location shared — open in Maps
                                      </a>
                                    ) : (
                                      <>
                                        {m.content}
                                        {m.isEdited && <span className={`ml-1.5 text-[9px] ${isMyMessage ? "text-white/70" : "text-gray-400"}`}>(edited)</span>}
                                      </>
                                    )}

                                    {/* Hold-to-open edit/delete menu (own messages only) */}
                                    {menuOpen && isMyMessage && !m.isDeleted && (
                                      <div
                                        className={`absolute z-20 top-full mt-1 ${isMyMessage ? "right-0" : "left-0"} bg-white text-gray-700 rounded-xl shadow-xl border border-gray-100 overflow-hidden w-32`}
                                        onMouseLeave={() => setActiveMenuId(null)}
                                      >
                                        {m.messageType !== "location" && (
                                          <button
                                            onClick={() => startEditMessage(m)}
                                            className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold hover:bg-gray-50"
                                          >
                                            <FaEdit /> Edit
                                          </button>
                                        )}
                                        <button
                                          onClick={() => handleDeleteMessage(m)}
                                          className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold text-red-600 hover:bg-red-50"
                                        >
                                          <FaTrash /> Delete
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                )}

                                <span className={`text-[9px] text-gray-400 mt-0.5 flex items-center gap-1 ${isMyMessage ? "mr-2" : "ml-2"}`}>
                                    {m.createdAt ? new Date(m.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : ""}
                                    {isMyMessage && (m.readAt ? <FaCheckDouble className="text-blue-500" /> : <FaCheck className="text-gray-400" />)}
                                </span>
                            </div>
                        );
                    })}
                    {isTyping && (
                        <div className="flex items-center gap-1 ml-2 mt-2 w-fit bg-white border border-gray-100 rounded-2xl rounded-bl-md px-4 py-2.5 shadow-sm">
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></span>
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></span>
                            <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></span>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <div className="p-4 bg-white border-t border-gray-200 flex gap-2">
                    <button
                      onClick={handleShareLocation}
                      disabled={sharingLocation}
                      title="Share your location"
                      className="p-3 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition disabled:opacity-50 shrink-0"
                    >
                      <FaMapMarkerAlt />
                    </button>
                    <input type="text" placeholder="Type a message..." className="flex-1 bg-gray-50 border border-gray-200 rounded-full px-4 py-2 text-gray-900 outline-none focus:border-purple-400 transition" value={newMessage} onChange={handleTyping} onKeyDown={handleKeyDown}/>
                    <button onClick={sendMessage} className="p-3 bg-gradient-to-br from-purple-600 to-blue-600 rounded-full text-white shadow-md hover:opacity-90 transition"><FaPaperPlane /></button>
                </div>
            </>
        ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-100 to-blue-100 flex items-center justify-center mb-4">
                  <FaPaperPlane className="text-3xl text-purple-500"/>
                </div>
                <p>Select a chat to start messaging</p>
            </div>
        )}
      </div>
    </div>
  );
};

export default Messages;
