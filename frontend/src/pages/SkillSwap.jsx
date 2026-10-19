import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FaSearch, FaPlus, FaArrowLeft, FaCode, FaPaintBrush, 
  FaChalkboardTeacher, FaPenNib, FaEllipsisH, FaUser, FaTimes, 
  FaEllipsisV, FaEdit, FaTrash, FaLayerGroup 
} from "react-icons/fa";
import { toast } from "react-toastify";
import API from "../api";

const SkillSwap = () => {
  const navigate = useNavigate();
  const [skills, setSkills] = useState([]);
  const [filteredSkills, setFilteredSkills] = useState([]);
  
  // Tabs: 'explore' (Sabki skills) vs 'my' (Meri skills)
  const [view, setView] = useState("explore"); 

  const [filter, setFilter] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  // Menu State (3 Dots ke liye)
  const [activeMenu, setActiveMenu] = useState(null);

  // Modal & Edit State
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false); // New: Check if editing
  const [editId, setEditId] = useState(null); // ID of skill being edited
  const [formData, setFormData] = useState({
    title: "", description: "", category: "Tech", location: "", contact: ""
  });

  const categories = ["All", "Tech", "Design", "Tutor", "Writing", "Other"];

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("userInfo"));
    if (user) setCurrentUser(user);
    fetchSkills();
  }, []);

  const fetchSkills = async () => {
    try {
      const { data } = await API.get("/skills");
      setSkills(data);
      setFilteredSkills(data);
    } catch (error) { toast.error("Failed to load skills"); } 
    finally { setLoading(false); }
  };

  // ✅ FILTER LOGIC (Explore vs My Gigs)
  useEffect(() => {
    let result = skills;

    // Step 1: Filter by View (Explore vs My Gigs)
    if (view === "my" && currentUser) {
        result = result.filter(s => s.user?._id === currentUser._id);
    }

    // Step 2: Filter by Category
    if (filter !== "All") {
        result = result.filter(skill => skill.category === filter);
    }

    // Step 3: Filter by Search
    if (searchTerm) {
        result = result.filter(skill => skill.title.toLowerCase().includes(searchTerm.toLowerCase()));
    }

    setFilteredSkills(result);
  }, [filter, searchTerm, skills, view, currentUser]);

  // ✅ OPEN ADD MODAL
  const openAddModal = () => {
      setFormData({ title: "", description: "", category: "Tech", location: "", contact: "" });
      setIsEditing(false);
      setShowModal(true);
  };

  // ✅ OPEN EDIT MODAL (Populate Data)
  const openEditModal = (skill, e) => {
      e.stopPropagation(); // Card click hone se roko
      setFormData({
          title: skill.title,
          description: skill.description,
          category: skill.category,
          location: skill.location,
          contact: skill.contact
      });
      setEditId(skill._id);
      setIsEditing(true);
      setShowModal(true);
      setActiveMenu(null); // Menu band karo
  };

  // ✅ HANDLE SUBMIT (Create OR Update)
  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
          // UPDATE Logic
          await API.put(`/skills/${editId}`, formData);
          toast.success("Gig Updated!");
      } else {
          // CREATE Logic
          await API.post("/skills", formData);
          toast.success("Gig Posted!");
      }
      setShowModal(false);
      fetchSkills(); // Refresh
    } catch (error) { toast.error("Failed to save skill"); }
  };

  // ✅ DELETE FUNCTION
  const handleDelete = async (id, e) => {
      e.stopPropagation();
      if(!window.confirm("Delete this gig permanently?")) return;
      try {
          await API.delete(`/skills/${id}`);
          toast.success("Gig Deleted");
          fetchSkills();
      } catch (error) { toast.error("Delete failed"); }
  };

  const getCategoryIcon = (cat) => {
    switch(cat) {
      case "Tech": return <FaCode />;
      case "Design": return <FaPaintBrush />;
      case "Tutor": return <FaChalkboardTeacher />;
      case "Writing": return <FaPenNib />;
      default: return <FaEllipsisH />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans relative pb-20" onClick={() => setActiveMenu(null)}>
      
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-gray-200 p-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
            <div className="flex items-center gap-4">
                <button onClick={() => navigate("/dashboard")} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition"><FaArrowLeft /></button>
                <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-pink-600 to-purple-600">Skill Swap</h1>
            </div>
            
            {/* ✅ VIEW TOGGLE (Explore vs My Gigs) */}
            <div className="flex bg-gray-50 rounded-full p-1 border border-gray-200">
                <button 
                    onClick={() => setView("explore")} 
                    className={`px-4 py-2 rounded-full text-xs font-bold transition ${view === "explore" ? "bg-pink-600 text-white shadow-lg" : "text-gray-400 hover:text-gray-900"}`}
                >
                    Explore
                </button>
                <button 
                    onClick={() => setView("my")} 
                    className={`px-4 py-2 rounded-full text-xs font-bold transition ${view === "my" ? "bg-purple-600 text-white shadow-lg" : "text-gray-400 hover:text-gray-900"}`}
                >
                    My Gigs
                </button>
            </div>
        </div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 mt-6 space-y-6">
        
        {/* Search & Filters (Only show in Explore mode or if My Gigs has items) */}
        <div className="space-y-4">
            <div className="relative group">
                <FaSearch className="absolute left-4 top-4 text-gray-500" />
                <input type="text" placeholder="Search skills..." className="w-full bg-gray-50 pl-12 pr-4 py-3 rounded-2xl border border-gray-200 focus:border-pink-500 outline-none transition" onChange={(e) => setSearchTerm(e.target.value)} />
            </div>

            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                {categories.map((cat) => (
                    <button key={cat} onClick={() => setFilter(cat)} className={`px-6 py-2 rounded-full text-sm font-bold border transition whitespace-nowrap ${filter === cat ? "bg-pink-600 border-pink-500" : "bg-gray-50 border-gray-200 text-gray-400"}`}>{cat}</button>
                ))}
            </div>
        </div>

        {/* ✅ GRID */}
        {loading ? <div className="text-center mt-10">Loading...</div> : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredSkills.length === 0 ? (
                    <div className="col-span-full text-center text-gray-500 py-10">No gigs found.</div>
                ) : (
                    filteredSkills.map((skill) => (
                        <motion.div 
                            key={skill._id} 
                            initial={{ opacity: 0, y: 10 }} 
                            animate={{ opacity: 1, y: 0 }} 
                            onClick={() => navigate(`/skills/${skill._id}`)} 
                            className={`bg-white border border-gray-200 rounded-3xl p-5 cursor-pointer hover:border-pink-500/50 transition relative group shadow-xl ${skill.isActive === false ? "opacity-60" : ""}`}
                        >
                            {skill.isActive === false && (
                                <span className="absolute top-3 left-3 z-20 bg-yellow-600 text-gray-900 text-[10px] font-bold px-3 py-1 rounded-full shadow-lg">PAUSED</span>
                            )}
                            {/* Header */}
                            <div className="flex justify-between mb-4 relative">
                                <div className="w-12 h-12 rounded-2xl bg-pink-50 flex items-center justify-center text-pink-600 text-xl">{getCategoryIcon(skill.category)}</div>
                                
                                {/* ✅ 3 DOTS MENU (Only for Owner) */}
                                {currentUser && skill.user?._id === currentUser._id && (
                                    <div className="relative" onClick={(e) => e.stopPropagation()}>
                                        <button 
                                            onClick={() => setActiveMenu(activeMenu === skill._id ? null : skill._id)}
                                            className="p-2 text-gray-400 hover:text-gray-900 bg-gray-50 rounded-full"
                                        >
                                            <FaEllipsisV />
                                        </button>

                                        {/* Dropdown Menu */}
                                        <AnimatePresence>
                                            {activeMenu === skill._id && (
                                                <motion.div 
                                                    initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                                                    className="absolute right-0 top-10 bg-white border border-gray-200 rounded-xl shadow-2xl p-2 w-32 z-50 overflow-hidden"
                                                >
                                                    <button onClick={(e) => openEditModal(skill, e)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 hover:text-blue-600 rounded-lg text-left"><FaEdit /> Edit</button>
                                                    <button onClick={(e) => handleDelete(skill._id, e)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg text-left"><FaTrash /> Delete</button>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                )}
                            </div>

                            <h3 className="font-bold text-xl mb-2 line-clamp-1">{skill.title}</h3>
                            <p className="text-gray-400 text-sm line-clamp-2 mb-4 h-10">{skill.description}</p>
                            
                            <div className="border-t border-gray-200 pt-3 flex justify-between items-center text-xs text-gray-500">
                                 <div className="flex items-center gap-2"><FaUser /> {skill.user?.name || "User"}</div>
                                 <span className="text-pink-600 font-bold group-hover:translate-x-1 transition">View &rarr;</span>
                            </div>
                        </motion.div>
                    ))
                )}
            </div>
        )}
      </div>

      {/* Floating Add Button */}
      <motion.button whileHover={{ scale: 1.1, rotate: 90 }} onClick={openAddModal} className="fixed bottom-8 right-8 w-16 h-16 bg-gradient-to-r from-pink-500 to-purple-600 rounded-full flex items-center justify-center shadow-2xl z-30 border border-gray-300"><FaPlus className="text-2xl text-white" /></motion.button>

      {/* ADD / EDIT MODAL */}
      <AnimatePresence>
        {showModal && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white border border-gray-200 p-6 rounded-[2rem] w-full max-w-lg shadow-2xl relative">
                    <button onClick={() => setShowModal(false)} className="absolute top-5 right-5 text-gray-400 hover:text-gray-900"><FaTimes /></button>
                    
                    <h2 className="text-2xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-pink-600 to-purple-600">
                        {isEditing ? "Edit Gig" : "Post a Gig"}
                    </h2>
                    
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <input type="text" placeholder="Title (e.g. Teach React)" value={formData.title} className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl text-gray-900 outline-none focus:border-pink-500" required onChange={(e)=>setFormData({...formData, title:e.target.value})}/>
                        <div className="grid grid-cols-2 gap-4">
                            <select value={formData.category} className="bg-white border border-gray-200 p-3 rounded-xl text-gray-900 outline-none" onChange={(e)=>setFormData({...formData, category:e.target.value})}>
                                {categories.filter(c => c !== "All").map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <input type="text" placeholder="Location" value={formData.location} className="bg-gray-50 border border-gray-200 p-3 rounded-xl text-gray-900 outline-none focus:border-pink-500" required onChange={(e)=>setFormData({...formData, location:e.target.value})}/>
                        </div>
                        <textarea rows="3" placeholder="Description..." value={formData.description} className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl text-gray-900 outline-none focus:border-pink-500" required onChange={(e)=>setFormData({...formData, description:e.target.value})}></textarea>
                        <input type="text" placeholder="Contact Info" value={formData.contact} className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl text-gray-900 outline-none focus:border-pink-500" required onChange={(e)=>setFormData({...formData, contact:e.target.value})}/>
                        
                        <button type="submit" className="w-full bg-gradient-to-r from-pink-500 to-purple-600 p-3 rounded-xl font-bold text-white shadow-lg">
                            {isEditing ? "Update Gig" : "Post Now"}
                        </button>
                    </form>
                </motion.div>
            </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SkillSwap;