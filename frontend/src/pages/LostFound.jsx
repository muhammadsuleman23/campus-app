import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FaSearch, FaPlus, FaArrowLeft, FaMapMarkerAlt, FaCalendarAlt, 
  FaQuestionCircle, FaCommentDots, FaEllipsisV, FaEdit, FaTrash, 
  FaCheckCircle, FaTimes, FaExclamationCircle, FaSearchLocation, FaCamera, FaImage 
} from "react-icons/fa";
import { toast } from "react-toastify";
import API from "../api";

const LostFound = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  
  // Tabs
  const [view, setView] = useState("lost"); 
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  // Menu State
  const [activeMenu, setActiveMenu] = useState(null);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);
  
  const [formData, setFormData] = useState({
    title: "", description: "", category: "Lost", location: "", date: "", contact: "", securityQuestion: "", image: ""
  });

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("userInfo"));
    if (user) setCurrentUser(user);
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const { data } = await API.get("/lost-found");
      setItems(data);
      setFilteredItems(data);
    } catch (error) { toast.error("Failed to load items"); } 
    finally { setLoading(false); }
  };

  // Filter Logic
  useEffect(() => {
    let result = items;
    if (view === "my" && currentUser) {
        result = result.filter(item => item.user?._id === currentUser._id);
    } else if (view === "lost") {
        result = result.filter(item => item.category === "Lost");
    } else if (view === "found") {
        result = result.filter(item => item.category === "Found");
    }
    if (searchTerm) {
        result = result.filter(item => item.title.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    setFilteredItems(result);
  }, [view, searchTerm, items, currentUser]);

  // ✅ IMAGE HANDLING FUNCTION
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData({ ...formData, image: reader.result });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleChat = async (item, e) => {
    e.stopPropagation();
    if (!currentUser) { toast.error("Please login first!"); return; }
    if (!item.user || !item.user._id) { toast.error("User details not found"); return; }
    if (item.user._id === currentUser._id) { toast.info("This is your own post!"); return; }

    try {
      const { data: chat } = await API.post("/chat", { userId: item.user._id });
      await API.post("/messages", {
        chatId: chat._id,
        content: `Hi, I saw your post regarding: ${item.title} (${item.category})`,
      });
      navigate("/messages", { state: { chat } });
    } catch (error) { console.error(error); toast.error("Chat creation failed"); }
  };

  const openAddModal = () => {
      setFormData({ title: "", description: "", category: "Lost", location: "", date: "", contact: "", securityQuestion: "", image: "" });
      setIsEditing(false);
      setShowModal(true);
  };

  const openEditModal = (item, e) => {
      e.stopPropagation();
      setFormData({
          title: item.title, description: item.description, category: item.category,
          location: item.location, date: item.date.split("T")[0], 
          contact: item.contact, securityQuestion: item.securityQuestion || "",
          image: item.image || ""
      });
      setEditId(item._id);
      setIsEditing(true);
      setShowModal(true);
      setActiveMenu(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
          await API.put(`/lost-found/${editId}`, formData);
          toast.success("Item Updated!");
      } else {
          await API.post("/lost-found", formData);
          toast.success("Item Reported!");
      }
      setShowModal(false);
      fetchItems();
    } catch (error) { toast.error("Failed to save item"); }
  };

  const handleDelete = async (id, isSolved = false) => {
      if(!window.confirm(isSolved ? "Mark case as solved?" : "Delete this post?")) return;
      try {
          await API.delete(`/lost-found/${id}`);
          toast.success(isSolved ? "Case Solved!" : "Post Deleted");
          fetchItems();
      } catch (error) { toast.error("Action failed"); }
  };

  // Toggle resolved WITHOUT deleting the post (keeps a record)
  const handleMarkResolved = async (item, e) => {
      if (e) e.stopPropagation();
      try {
          await API.put(`/lost-found/${item._id}`, { isResolved: !item.isResolved });
          toast.success(item.isResolved ? "Re-opened!" : (item.category === "Lost" ? "Marked as Found!" : "Marked as Returned!"));
          setActiveMenu(null);
          fetchItems();
      } catch (error) { toast.error("Action failed"); }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans relative pb-20" onClick={() => setActiveMenu(null)}>
      
      {/* Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-red-100/50 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-100/50 rounded-full blur-[120px]"></div>
      </div>

      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-gray-200 p-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 w-full md:w-auto">
                <button onClick={() => navigate("/dashboard")} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition"><FaArrowLeft /></button>
                <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-red-600 to-blue-600">Lost & Found</h1>
            </div>
            
            <div className="flex bg-gray-50 rounded-full p-1 border border-gray-200">
                {["lost", "found", "my"].map((tab) => (
                    <button 
                        key={tab}
                        onClick={() => setView(tab)} 
                        className={`px-6 py-2 rounded-full text-xs font-bold transition uppercase ${
                            view === tab 
                            ? tab === "lost" ? "bg-red-600 text-white shadow-lg" 
                            : tab === "found" ? "bg-blue-600 text-white shadow-lg" 
                            : "bg-purple-600 text-white shadow-lg"
                            : "text-gray-400 hover:text-gray-900"
                        }`}
                    >
                        {tab === "my" ? "My Listings" : tab}
                    </button>
                ))}
            </div>
        </div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 mt-6 space-y-6">
        {/* Search */}
        <div className="relative">
            <FaSearch className="absolute left-4 top-4 text-gray-500" />
            <input type="text" placeholder="Search items..." className="w-full bg-gray-50 pl-12 pr-4 py-3 rounded-2xl border border-gray-200 focus:border-red-500 outline-none transition" onChange={(e) => setSearchTerm(e.target.value)} />
        </div>

        {/* GRID */}
        {loading ? <div className="text-center mt-10">Loading...</div> : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredItems.length === 0 ? <div className="col-span-full text-center text-gray-500 py-10">No items found.</div> : 
                    filteredItems.map((item) => (
                        <motion.div 
                            key={item._id} 
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} 
                            className={`bg-white border border-gray-200 rounded-3xl overflow-hidden relative group shadow-xl hover:bg-gray-50 transition ${item.isResolved ? "opacity-60" : ""}`}
                        >
                            {item.isResolved && (
                                <div className="absolute top-3 left-3 z-20 bg-green-600 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg flex items-center gap-1">
                                    <FaCheckCircle /> {item.category === "Lost" ? "FOUND" : "RETURNED"}
                                </div>
                            )}
                            {/* ✅ IMAGE DISPLAY */}
                            {item.image && (
                                <div className="h-48 w-full overflow-hidden">
                                    <img src={item.image} alt={item.title} className={`w-full h-full object-cover group-hover:scale-110 transition duration-500 ${item.isResolved ? "grayscale" : ""}`} />
                                </div>
                            )}

                            <div className="p-5">
                                <div className="flex justify-between items-start mb-4">
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${item.category === "Lost" ? "bg-red-50 text-red-600 border-red-500/30" : "bg-blue-50 text-blue-600 border-blue-500/30"} border`}>
                                        {item.category}
                                    </span>

                                    {currentUser && item.user?._id === currentUser._id && (
                                        <div className="relative" onClick={(e) => e.stopPropagation()}>
                                            <button onClick={() => setActiveMenu(activeMenu === item._id ? null : item._id)} className="p-2 text-gray-400 hover:text-gray-900 bg-gray-50 rounded-full"><FaEllipsisV /></button>
                                            
                                            <AnimatePresence>
                                                {activeMenu === item._id && (
                                                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="absolute right-0 top-10 bg-white border border-gray-200 rounded-xl shadow-2xl p-2 w-44 z-50 overflow-hidden">
                                                        <button onClick={(e) => handleMarkResolved(item, e)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-green-600 hover:bg-green-50 rounded-lg text-left font-bold"><FaCheckCircle /> {item.isResolved ? "Re-open Case" : (item.category === "Lost" ? "Mark as Found" : "Mark Returned")}</button>
                                                        <button onClick={(e) => openEditModal(item, e)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 hover:text-blue-600 rounded-lg text-left"><FaEdit /> Edit</button>
                                                        <button onClick={(e) => { e.stopPropagation(); handleDelete(item._id, false); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg text-left"><FaTrash /> Delete</button>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    )}
                                </div>

                                <h3 className="font-bold text-xl mb-2 line-clamp-1">{item.title}</h3>
                                <div className="space-y-2 mb-4 text-sm text-gray-400">
                                    <p className="flex items-center gap-2"><FaMapMarkerAlt className="text-gray-500"/> {item.location}</p>
                                    <p className="flex items-center gap-2"><FaCalendarAlt className="text-gray-500"/> {new Date(item.date).toLocaleDateString()}</p>
                                </div>

                                {currentUser && item.user?._id !== currentUser._id && !item.isResolved && (
                                    <button onClick={(e) => handleChat(item, e)} className="w-full py-3 bg-gray-100 hover:bg-gray-200 border border-gray-200 rounded-xl font-bold flex items-center justify-center gap-2 transition text-gray-900">
                                        <FaCommentDots className="text-blue-600"/> Chat with {item.category === "Lost" ? "Owner" : "Finder"}
                                    </button>
                                )}
                            </div>
                        </motion.div>
                    ))
                }
            </div>
        )}
      </div>

      {/* Floating Add Button */}
      <motion.button whileHover={{ scale: 1.1, rotate: 90 }} onClick={openAddModal} className="fixed bottom-8 right-8 w-16 h-16 bg-gradient-to-r from-red-500 to-blue-600 rounded-full flex items-center justify-center shadow-2xl z-30 border border-gray-300"><FaPlus className="text-2xl text-white" /></motion.button>

      {/* ADD / EDIT MODAL */}
      <AnimatePresence>
        {showModal && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white border border-gray-200 p-6 rounded-[2rem] w-full max-w-lg shadow-2xl relative overflow-y-auto max-h-[90vh]">
                    <button onClick={() => setShowModal(false)} className="absolute top-5 right-5 text-gray-400 hover:text-gray-900"><FaTimes /></button>
                    
                    <h2 className="text-2xl font-bold mb-6 text-center">
                        {isEditing ? "Edit Report" : "Report an Item"}
                    </h2>
                    
                    <form onSubmit={handleSubmit} className="space-y-4">
                        
                        {/* CATEGORY BUTTONS */}
                        <div className="flex gap-4 p-1 bg-gray-50 rounded-2xl border border-gray-200">
                            <button type="button" onClick={() => setFormData({...formData, category: "Lost"})} className={`flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition ${formData.category === "Lost" ? "bg-red-600 text-white shadow-lg" : "text-gray-400 hover:text-gray-900"}`}><FaExclamationCircle /> LOST</button>
                            <button type="button" onClick={() => setFormData({...formData, category: "Found"})} className={`flex-1 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition ${formData.category === "Found" ? "bg-blue-600 text-white shadow-lg" : "text-gray-400 hover:text-gray-900"}`}><FaSearchLocation /> FOUND</button>
                        </div>

                        {/* ✅ IMAGE UPLOAD (NEW) */}
                        <div className="relative group">
                            <label className="block text-xs text-gray-400 mb-2 ml-2">Upload Image (Optional)</label>
                            <div className="flex items-center gap-4">
                                <label className="cursor-pointer flex items-center justify-center gap-2 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition w-full text-gray-600">
                                    <FaCamera /> {formData.image ? "Change Photo" : "Take Photo / Upload"}
                                    <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                                </label>
                                {formData.image && <img src={formData.image} alt="Preview" className="h-12 w-12 rounded-lg object-cover border border-gray-300" />}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="text-xs text-gray-400 ml-2">Date</label>
                                <input type="date" value={formData.date} className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl text-gray-900 outline-none" required onChange={(e)=>setFormData({...formData, date:e.target.value})}/>
                            </div>
                            <div>
                                <label className="text-xs text-gray-400 ml-2">Location</label>
                                <input type="text" placeholder="e.g. Cafeteria" value={formData.location} className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl text-gray-900 outline-none focus:border-red-500" required onChange={(e)=>setFormData({...formData, location:e.target.value})}/>
                            </div>
                        </div>

                        <input type="text" placeholder="Item Name (e.g. Wallet, Keys)" value={formData.title} className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl text-gray-900 outline-none focus:border-red-500" required onChange={(e)=>setFormData({...formData, title:e.target.value})}/>
                        
                        <textarea rows="3" placeholder="Description (Color, Brand, Identifying Marks...)" value={formData.description} className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl text-gray-900 outline-none focus:border-red-500" required onChange={(e)=>setFormData({...formData, description:e.target.value})}></textarea>
                        
                        {formData.category === "Found" && (
                             <div className="bg-yellow-50 border border-yellow-500/20 p-4 rounded-xl">
                                <p className="text-xs text-yellow-500 mb-2 font-bold uppercase">Security Check</p>
                                <input type="text" placeholder="Security Question (e.g. What is inside?)" value={formData.securityQuestion} className="w-full bg-transparent border-b border-yellow-500/30 p-2 text-yellow-200 placeholder-yellow-500/50 outline-none" onChange={(e)=>setFormData({...formData, securityQuestion:e.target.value})}/>
                             </div>
                        )}

                        <input type="text" placeholder="Contact Info (WhatsApp/Email)" value={formData.contact} className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl text-gray-900 outline-none focus:border-red-500" required onChange={(e)=>setFormData({...formData, contact:e.target.value})}/>
                        
                        <button type="submit" className={`w-full p-4 rounded-xl font-bold text-white shadow-lg transition hover:scale-[1.02] ${formData.category === 'Lost' ? 'bg-gradient-to-r from-red-500 to-orange-500' : 'bg-gradient-to-r from-blue-500 to-cyan-500'}`}>
                            {isEditing ? "Update Report" : `Report ${formData.category} Item`}
                        </button>
                    </form>
                </motion.div>
            </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default LostFound;