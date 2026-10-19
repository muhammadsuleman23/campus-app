import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { FaArrowLeft, FaBell, FaCheckCircle, FaInfoCircle, FaExclamationTriangle, FaTimes, FaCheckDouble } from "react-icons/fa";
import { toast } from "react-toastify";
import API from "../api";

const Notifications = () => {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const hasUnread = notifications.some((n) => !n.read);

  // Fetch Notifications
  const fetchNotifications = async () => {
    try {
      const { data } = await API.get("/notifications");
      setNotifications(data);
    } catch (error) {
      console.error("Error fetching notifications");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchNotifications(); }, []);

  // Mark as Read + open the related page
  const handleMarkRead = async (notif) => {
    const id = notif._id;
    try {
      await API.put(`/notifications/${id}/read`);
      setNotifications((prev) => prev.map(n => n._id === id ? { ...n, read: true } : n));
    } catch (error) {
      console.error("Error updating notification");
    }

    // Take the user to whatever this notification is about
    const msg = (notif.message || "").toLowerCase();
    if (msg.includes("message")) {
      navigate("/messages");
    } else if (msg.includes("review")) {
      if (notif.referenceId) navigate(`/skills/${notif.referenceId}`);
      else navigate("/skills");
    }
  };

  // Mark every notification as read in one tap
  const handleMarkAllRead = async () => {
    if (!hasUnread || markingAll) return;
    setMarkingAll(true);
    try {
      await API.put("/notifications/read-all");
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      toast.success("All notifications marked as read");
    } catch (error) {
      toast.error("Couldn't mark notifications as read");
    } finally {
      setMarkingAll(false);
    }
  };

  // Icon Helper
  const getIcon = (type) => {
    switch (type) {
      case "success": return <FaCheckCircle className="text-green-600 text-xl" />;
      case "warning": return <FaExclamationTriangle className="text-yellow-600 text-xl" />;
      case "alert": return <FaTimes className="text-red-600 text-xl" />;
      default: return <FaInfoCircle className="text-blue-600 text-xl" />;
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 font-sans pb-20">
      
      {/* Header */}
      <div className="p-6 sticky top-0 bg-white/95 backdrop-blur-xl z-20 border-b border-gray-200 flex items-center gap-4 shadow-lg">
        <button onClick={() => navigate("/dashboard")} className="p-2 rounded-full hover:bg-gray-50 transition">
            <FaArrowLeft />
        </button>
        <h1 className="text-2xl font-bold flex items-center gap-2 flex-1">
            <FaBell className="text-yellow-600" /> Notifications
        </h1>
        {hasUnread && (
          <button
            onClick={handleMarkAllRead}
            disabled={markingAll}
            className="flex items-center gap-2 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 px-3 py-2 rounded-full transition disabled:opacity-50"
          >
            <FaCheckDouble /> {markingAll ? "Marking..." : "Mark all as read"}
          </button>
        )}
      </div>

      {/* List */}
      <div className="max-w-3xl mx-auto p-4">
        {loading ? (
            <div className="text-center mt-20 text-gray-500 animate-pulse">Loading updates...</div>
        ) : notifications.length === 0 ? (
            <div className="text-center mt-20 opacity-50 flex flex-col items-center">
                <FaBell className="text-6xl mb-4 text-gray-700" />
                <h3 className="text-xl font-bold text-gray-500">No Notifications</h3>
                <p className="text-gray-600">You are all caught up!</p>
            </div>
        ) : (
            <div className="space-y-3">
                {notifications.map((notif) => (
                    <motion.div 
                        key={notif._id}
                        initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                        onClick={() => handleMarkRead(notif)}
                        className={`p-4 rounded-2xl flex items-start gap-4 border transition-all cursor-pointer ${
                            notif.read 
                            ? "bg-gray-50/40 border-gray-800 text-gray-400" // Read Style
                            : "bg-gray-50 border-gray-300 shadow-lg text-gray-900" // Unread Style
                        }`}
                    >
                        <div className="mt-1">{getIcon(notif.type)}</div>
                        <div className="flex-1">
                            <p className="font-medium text-sm md:text-base leading-relaxed">{notif.message}</p>
                            <p className="text-xs mt-2 opacity-60">{new Date(notif.createdAt).toLocaleString()}</p>
                        </div>
                        {!notif.read && (
                            <div className="w-2 h-2 rounded-full bg-red-500 mt-2"></div>
                        )}
                    </motion.div>
                ))}
            </div>
        )}
      </div>

    </div>
  );
};

export default Notifications;