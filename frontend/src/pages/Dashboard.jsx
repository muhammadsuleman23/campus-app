import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion"; 
import { 
  FaShoppingBag, FaSearchLocation, FaLightbulb, 
  FaUserFriends, FaCar, FaRobot, FaBell, 
  FaArrowRight, FaBoxOpen, FaBolt, FaCommentDots, FaTimes, FaShieldAlt, FaUserCircle, FaSearch, FaTrophy
} from "react-icons/fa";
import API from "../api";
import io from "socket.io-client";
import { toast } from "react-toastify";
import Chatbot from "./Chatbot"; 
import { gradientFor, initials } from "../utils/avatar";
import Avatar from "../components/Avatar";

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState({ name: "User" });
  const [isChatOpen, setIsChatOpen] = useState(false); 
  
  const [stats, setStats] = useState({
    marketplaceItems: 0, activeGigs: 0, activeRides: 0, loading: true
  });
  const [unreadCount, setUnreadCount] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("userInfo"));
    if (!userData) { navigate("/"); return; }
    setUser(userData);

    const fetchStats = async () => {
      try {
        const [productsRes, skillsRes, ridesRes] = await Promise.all([
          API.get("/products"), API.get("/skills"), API.get("/rides")
        ]);
        setStats({
          marketplaceItems: productsRes.data.length,
          activeGigs: skillsRes.data.length,
          activeRides: ridesRes.data.length,
          loading: false
        });
      } catch (error) {
        setStats(prev => ({ ...prev, loading: false }));
      }
    };
    fetchStats();

    // How many unread notifications do I have right now?
    const fetchUnread = async () => {
      try {
        const { data } = await API.get("/notifications");
        setUnreadCount(data.filter((n) => !n.read).length);
      } catch (e) { /* ignore */ }
    };
    fetchUnread();

    const socket = io(window.location.origin);
    // Join my personal room so the server can push notifications to ME
    socket.emit("setup", userData);

    socket.on("global_notification", (data) => {
        toast.info(data.message, {
            position: "top-right", autoClose: 5000, icon: "🔔"
        });
        fetchStats(); 
    });

    // 🔔 Personal notification (someone messaged me, reviewed my skill, etc.)
    socket.on("notification", (note) => {
        toast.info(note.message, {
            position: "top-right", autoClose: 5000, icon: "🔔"
        });
        setUnreadCount((c) => c + 1);
    });

    return () => { socket.disconnect(); };
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("userInfo");
    navigate("/");
  };

  const StatCard = ({ title, count, icon, color, glow, delay, onClick }) => (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: delay * 0.1 }} whileHover={{ y: -3 }} onClick={onClick} className="relative overflow-hidden bg-white border border-gray-200 p-6 rounded-2xl group hover:border-gray-300 hover:shadow-lg transition-all duration-300 shadow-sm cursor-pointer">
      <div className={`absolute -top-6 -right-6 w-24 h-24 rounded-full ${glow} opacity-20 blur-xl group-hover:opacity-40 transition`}></div>
      <div className="relative z-10">
           <div className={`w-11 h-11 rounded-xl flex items-center justify-center text-lg mb-3 ${color} text-white shadow-md`}>{icon}</div>
           <h3 className="text-3xl font-bold text-gray-900 tracking-tight">{stats.loading ? "..." : count}</h3>
           <p className="text-gray-500 text-xs font-bold uppercase tracking-wider mt-1">{title}</p>
      </div>
    </motion.div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/40 to-blue-50 text-gray-900 font-sans relative pb-40">

      {/* Navbar Section */}
      <div className="max-w-7xl mx-auto px-6 py-8 relative z-20">
        <div className="flex justify-between items-center bg-white/90 backdrop-blur border border-gray-200 p-4 rounded-full shadow-md">
            <div className="flex items-center gap-4 pl-2">
                <Avatar
                  userId={user._id}
                  name={user.name}
                  avatar={user.avatar}
                  size="w-11 h-11"
                  className="shadow-md hover:scale-105 transition cursor-pointer"
                  onClick={() => navigate(`/profile/${user._id}`)}
                />
                <div>
                    <h1 className="text-lg font-bold text-gray-900">Hello, {user.name.split(" ")[0]} 👋</h1>
                    <p className="text-[10px] text-purple-600 uppercase tracking-widest font-bold">Student Dashboard</p>
                </div>
            </div>
            <div className="flex gap-2 pr-2">
                {user.isAdmin && (
                  <button onClick={() => navigate("/admin")} className="px-5 py-2 rounded-full bg-purple-50 border border-purple-200 hover:bg-purple-100 transition text-sm font-medium text-purple-700 flex items-center gap-2">
                    <FaShieldAlt size={12} /> Admin
                  </button>
                )}
                <button onClick={() => navigate("/leaderboard")} className="hidden sm:flex px-5 py-2 rounded-full bg-amber-50 border border-amber-200 hover:bg-amber-100 transition text-sm font-medium text-amber-700 items-center gap-2">
                  <FaTrophy size={14} /> Leaderboard
                </button>
                <button onClick={() => navigate(`/profile/${user._id}`)} className="hidden sm:flex px-5 py-2 rounded-full bg-blue-50 border border-blue-200 hover:bg-blue-100 transition text-sm font-medium text-blue-700 items-center gap-2">
                  <FaUserCircle size={14} /> Profile
                </button>
                <button onClick={() => navigate("/notifications")} className="w-10 h-10 rounded-full flex items-center justify-center hover:bg-gray-100 transition relative">
                    <FaBell className="text-gray-500 hover:text-gray-900 transition" />
                    {unreadCount > 0 && (
                      <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center text-[10px] font-bold bg-red-500 text-white rounded-full">
                        {unreadCount > 9 ? "9+" : unreadCount}
                      </span>
                    )}
                </button>
                <button onClick={handleLogout} className="px-5 py-2 rounded-full bg-gray-100 border border-gray-200 hover:bg-red-50 hover:text-red-600 transition text-sm font-medium text-gray-600">Logout</button>
            </div>
        </div>

        {/* Unified search */}
        <form
          onSubmit={(e) => { e.preventDefault(); if (searchTerm.trim()) navigate(`/search?q=${encodeURIComponent(searchTerm.trim())}`); }}
          className="mt-4"
        >
          <div className="relative">
            <FaSearch className="absolute top-1/2 left-5 -translate-y-1/2 text-gray-400" />
            <input
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search marketplace, skills, rides, roommates..."
              className="w-full pl-12 pr-4 py-3 bg-white/90 backdrop-blur border border-gray-200 rounded-full shadow-sm outline-none focus:border-purple-400 transition text-sm"
            />
          </div>
        </form>
      </div>

      {/* Stats Section */}
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 relative z-10">
         <StatCard title="Total Listings" count={stats.marketplaceItems} icon={<FaBoxOpen />} color="bg-gradient-to-br from-blue-500 to-cyan-400" glow="bg-blue-400" delay={0} onClick={() => navigate("/marketplace")} />
         <StatCard title="Active Gigs" count={stats.activeGigs} icon={<FaBolt />} color="bg-gradient-to-br from-purple-500 to-fuchsia-400" glow="bg-purple-400" delay={1} onClick={() => navigate("/skills")} />
         <StatCard title="Rides Available" count={stats.activeRides} icon={<FaCar />} color="bg-gradient-to-br from-orange-500 to-amber-400" glow="bg-orange-400" delay={2} onClick={() => navigate("/rides")} />
      </div>

      {/* Grid Content */}
      <div className="max-w-7xl mx-auto px-6 relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 auto-rows-[240px]">
            <motion.div onClick={() => navigate("/marketplace")} whileHover={{ scale: 1.01 }} className="md:col-span-2 md:row-span-2 relative group rounded-[2rem] overflow-hidden border border-blue-100 cursor-pointer bg-white shadow-sm hover:shadow-xl hover:shadow-blue-100/60 hover:border-blue-300 transition-all duration-300">
                <div className="absolute inset-0 bg-gradient-to-br from-blue-50 via-transparent to-purple-50 opacity-60 group-hover:opacity-100 transition duration-700"></div>
                <div className="p-10 h-full flex flex-col justify-between relative z-10">
                    <div className="flex justify-between items-start">
                        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 flex items-center justify-center text-3xl text-white shadow-md">{<FaShoppingBag />}</div>
                        <div className="px-3 py-1 rounded-full border border-blue-200 bg-blue-50 text-xs text-blue-700 font-bold">Marketplace</div>
                    </div>
                    <div>
                        <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-2">Campus Bazaar.</h2>
                        <p className="text-lg text-gray-500 max-w-md">Buy and sell gadgets & books.</p>
                        <div className="mt-6 inline-flex items-center gap-2 text-blue-600 font-bold tracking-wide text-sm group-hover:translate-x-2 transition">Start Trading <FaArrowRight /></div>
                    </div>
                </div>
            </motion.div>
            
            <motion.div onClick={() => navigate("/rides")} whileHover={{ scale: 1.02 }} className="relative group rounded-[2rem] overflow-hidden border border-orange-100 cursor-pointer bg-white shadow-sm hover:shadow-xl hover:shadow-orange-100/60 hover:border-orange-300 transition-all duration-300 p-8 flex flex-col justify-between">
                <div className="absolute inset-0 bg-gradient-to-b from-orange-50 to-transparent opacity-60 group-hover:opacity-100 transition"></div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-orange-500 to-amber-400 flex items-center justify-center text-white text-xl shadow-md">{<FaCar />}</div>
                <div><h3 className="text-2xl font-bold text-gray-900 mb-1">Campus Ride</h3><p className="text-sm text-gray-500">Carpooling made easy.</p></div>
            </motion.div>

            <motion.div onClick={() => navigate("/skills")} whileHover={{ scale: 1.02 }} className="relative group rounded-[2rem] overflow-hidden border border-purple-100 cursor-pointer bg-white shadow-sm hover:shadow-xl hover:shadow-purple-100/60 hover:border-purple-300 transition-all duration-300 p-8 flex flex-col justify-between">
                <div className="absolute inset-0 bg-gradient-to-b from-purple-50 to-transparent opacity-60 group-hover:opacity-100 transition"></div>
                <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-400 flex items-center justify-center text-white text-xl shadow-md">{<FaLightbulb />}</div>
                <div><h3 className="text-2xl font-bold text-gray-900 mb-1">Skill Swap</h3><p className="text-sm text-gray-500">Monetize your talent.</p></div>
            </motion.div>

            <motion.div onClick={() => navigate("/lost-found")} whileHover={{ scale: 1.02 }} className="relative group rounded-[2rem] overflow-hidden border border-pink-100 cursor-pointer bg-white shadow-sm hover:shadow-xl hover:shadow-pink-100/60 hover:border-pink-300 transition-all duration-300 p-8 flex flex-col justify-between">
                 <div className="absolute inset-0 bg-gradient-to-b from-pink-50 to-transparent opacity-60 group-hover:opacity-100 transition"></div>
                 <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-pink-500 to-rose-400 flex items-center justify-center text-white text-xl shadow-md">{<FaSearchLocation />}</div>
                <div><h3 className="text-2xl font-bold text-gray-900 mb-1">Lost & Found</h3><p className="text-sm text-gray-500">Recover items.</p></div>
            </motion.div>

            <div className="flex flex-col gap-6">
                <motion.div onClick={() => navigate("/roommates")} whileHover={{ scale: 1.02 }} className="flex-1 bg-white border border-indigo-100 rounded-[2rem] p-6 flex items-center gap-4 cursor-pointer group relative overflow-hidden shadow-sm hover:shadow-lg hover:border-indigo-300 transition-all duration-300">
                     <div className="absolute inset-0 bg-gradient-to-r from-indigo-50 to-transparent opacity-0 group-hover:opacity-100 transition"></div>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-violet-400 flex items-center justify-center text-white relative z-10">{<FaUserFriends />}</div>
                    <div className="relative z-10"><h4 className="font-bold text-gray-900 text-lg">Roommates</h4></div>
                </motion.div>
                <motion.div onClick={() => setIsChatOpen(true)} whileHover={{ scale: 1.02 }} className="flex-1 bg-white border border-emerald-100 rounded-[2rem] p-6 flex items-center gap-4 cursor-pointer group relative overflow-hidden shadow-sm hover:shadow-lg hover:border-emerald-300 transition-all duration-300">
                    <div className="absolute inset-0 bg-gradient-to-r from-emerald-50 to-transparent opacity-0 group-hover:opacity-100 transition"></div>
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-500 to-teal-400 flex items-center justify-center text-white relative z-10">{<FaRobot />}</div>
                    <div className="relative z-10"><h4 className="font-bold text-gray-900 text-lg">UniBot AI</h4></div>
                </motion.div>
            </div>
        </div>
      </div>

      {/* ✅ FIXED FLOATING CHATBOT UI */}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col items-end gap-4">
        <AnimatePresence>
          {isChatOpen && (
            <motion.div 
              initial={{ opacity: 0, y: 50, scale: 0.8 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 50, scale: 0.8 }}
              className="w-[350px] md:w-[400px] h-[550px] bg-white border border-gray-200 rounded-3xl shadow-xl overflow-hidden flex flex-col"
            >
              {/* Header */}
              <div className="p-4 bg-gray-50 border-b border-gray-200 flex justify-between items-center z-50">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-emerald-50 flex items-center justify-center text-emerald-600"><FaRobot /></div>
                  <span className="font-bold text-sm tracking-wide text-gray-900">UniBot AI</span>
                </div>
                <button onClick={() => setIsChatOpen(false)} className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-gray-100 transition text-gray-400 hover:text-gray-900">
                  <FaTimes />
                </button>
              </div>

              {/* ✅ SCROLLABLE CHAT CONTAINER */}
              <div className="flex-1 overflow-y-auto scrollbar-hide bg-white">
                <Chatbot isFloating={true} /> 
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {!isChatOpen && (
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={() => setIsChatOpen(true)}
            className="relative w-14 h-14 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-2xl text-white shadow-lg hover:opacity-90 transition"
          >
            <span className="absolute inset-0 rounded-full bg-purple-400 opacity-40 animate-ping"></span>
            <FaRobot className="relative z-10" />
          </motion.button>
        )}
      </div>

      {/* Bottom Nav Bar */}
      <div className="fixed bottom-8 left-1/2 transform -translate-x-1/2 z-50">
        <div className="flex items-center gap-2 bg-white border border-gray-200 px-4 py-3 rounded-2xl shadow-lg">
            {[
                { icon: <FaShoppingBag />, path: "/marketplace", hint: "Bazaar" },
                { icon: <FaCar />, path: "/rides", hint: "Ride" },
                { icon: <FaLightbulb />, path: "/skills", hint: "Skills" },
                { icon: <FaCommentDots />, path: "/messages", hint: "Inbox" },
                { icon: <FaUserFriends />, path: "/roommates", hint: "Rooms" },
                { icon: <FaUserCircle />, path: `/profile/${user._id}`, hint: "Profile" },
                { icon: <FaTrophy />, path: "/leaderboard", hint: "Top" },
                { icon: <FaRobot />, onClick: () => setIsChatOpen(true), hint: "AI" },
            ].map((item, i) => {
                const isActive = item.path && location.pathname === item.path;
                return (
                  <button key={i} onClick={item.onClick ? item.onClick : () => navigate(item.path)} className={`p-3 rounded-xl transition-all hover:scale-110 relative group ${isActive ? "bg-gradient-to-br from-purple-600 to-blue-600 text-white shadow-md" : "text-gray-500 hover:bg-gray-100 hover:text-gray-900"}`}>
                      <span className="text-xl">{item.icon}</span>
                      <span className="absolute -top-10 left-1/2 transform -translate-x-1/2 bg-gray-900 text-white text-[10px] font-bold px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition pointer-events-none">{item.hint}</span>
                  </button>
                );
            })}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
