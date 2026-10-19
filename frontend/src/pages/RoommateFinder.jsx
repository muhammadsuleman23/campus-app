import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FaSearch, FaPlus, FaArrowLeft, FaBed, FaUserFriends, FaMapMarkerAlt, 
  FaMoneyBillWave, FaVenusMars, FaWhatsapp, FaCamera, FaTimes, FaEllipsisV, FaEdit, FaTrash 
} from "react-icons/fa";
import { toast } from "react-toastify";
import API from "../api";

const RoommateFinder = () => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [filteredPosts, setFilteredPosts] = useState([]);
  
  // TABS: 'need-room' (Seeker), 'have-room' (Provider), 'my'
  const [view, setView] = useState("need-room"); 
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);

  // Menu & Modal
  const [activeMenu, setActiveMenu] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState(null);

  // LIFESTYLE TAGS
  const lifestyleTags = ["Non-Smoker", "Early Riser", "Night Owl", "Pet Friendly", "Studious", "Party Lover", "Clean Freak", "Vegan"];

  const [formData, setFormData] = useState({
    type: "Need Room", location: "", budget: "", gender: "Any Gender", contact: "", description: "", tags: [], images: []
  });

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("userInfo"));
    if (user) setCurrentUser(user);
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const { data } = await API.get("/roommates");
      setPosts(data);
      setFilteredPosts(data);
    } catch (error) { toast.error("Failed to load posts"); } 
    finally { setLoading(false); }
  };

  // ✅ FILTER LOGIC
  useEffect(() => {
    let result = posts;

    if (view === "my" && currentUser) {
        result = result.filter(p => p.user?._id === currentUser._id);
    } else if (view === "need-room") {
        result = result.filter(p => p.type === "Need Room");
    } else if (view === "have-room") {
        result = result.filter(p => p.type === "Have Room");
    }

    if (searchTerm) {
        result = result.filter(p => p.location.toLowerCase().includes(searchTerm.toLowerCase()));
    }
    setFilteredPosts(result);
  }, [view, searchTerm, posts, currentUser]);

  // ✅ IMAGE HANDLER
  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFormData(prev => ({ ...prev, images: [reader.result] })); // Single image for now, array support ready
      };
      reader.readAsDataURL(file);
    }
  };

  // ✅ TAG HANDLER
  const toggleTag = (tag) => {
      setFormData(prev => {
          const newTags = prev.tags.includes(tag) 
              ? prev.tags.filter(t => t !== tag) 
              : [...prev.tags, tag];
          return { ...prev, tags: newTags };
      });
  };

  const openAddModal = () => {
      setFormData({ type: view === "have-room" ? "Have Room" : "Need Room", location: "", budget: "", gender: "Any Gender", contact: "", description: "", tags: [], images: [] });
      setIsEditing(false);
      setShowModal(true);
  };

  const openEditModal = (post, e) => {
      e.stopPropagation();
      setFormData({ ...post });
      setEditId(post._id);
      setIsEditing(true);
      setShowModal(true);
      setActiveMenu(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (isEditing) {
          await API.put(`/roommates/${editId}`, formData);
          toast.success("Post Updated!");
      } else {
          await API.post("/roommates", formData);
          toast.success("Post Created!");
      }
      setShowModal(false);
      fetchPosts();
    } catch (error) { toast.error("Failed to save post"); }
  };

  const handleDelete = async (id, e) => {
      e.stopPropagation();
      if(!window.confirm("Delete this post?")) return;
      try {
          await API.delete(`/roommates/${id}`);
          toast.success("Deleted!");
          fetchPosts();
      } catch (error) { toast.error("Action failed"); }
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans relative pb-20" onClick={() => setActiveMenu(null)}>
      
      {/* Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-100/50 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-indigo-100/50 rounded-full blur-[120px]"></div>
      </div>

      {/* Header */}
      <div className="sticky top-0 z-20 bg-white/90 backdrop-blur-md border-b border-gray-200 p-4">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 w-full md:w-auto">
                <button onClick={() => navigate("/dashboard")} className="p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition"><FaArrowLeft /></button>
                <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-purple-600 to-indigo-600">Roommate Finder</h1>
            </div>
            
            {/* ✅ TABS */}
            <div className="flex bg-gray-50 rounded-full p-1 border border-gray-200">
                <button onClick={() => setView("need-room")} className={`px-5 py-2 rounded-full text-xs font-bold transition flex items-center gap-2 ${view === "need-room" ? "bg-purple-600 text-white shadow-lg" : "text-gray-400"}`}><FaBed /> I Need a Room</button>
                <button onClick={() => setView("have-room")} className={`px-5 py-2 rounded-full text-xs font-bold transition flex items-center gap-2 ${view === "have-room" ? "bg-indigo-600 text-white shadow-lg" : "text-gray-400"}`}><FaUserFriends /> I Have a Room</button>
                <button onClick={() => setView("my")} className={`px-5 py-2 rounded-full text-xs font-bold transition ${view === "my" ? "bg-gray-100 text-gray-900 shadow-lg" : "text-gray-400"}`}>My Listings</button>
            </div>
        </div>
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 mt-6 space-y-6">
        {/* Search */}
        <div className="relative">
            <FaSearch className="absolute left-4 top-4 text-gray-500" />
            <input type="text" placeholder="Search by location..." className="w-full bg-gray-50 pl-12 pr-4 py-3 rounded-2xl border border-gray-200 focus:border-purple-500 outline-none transition" onChange={(e) => setSearchTerm(e.target.value)} />
        </div>

        {/* ✅ GRID */}
        {loading ? <div className="text-center mt-10">Loading...</div> : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredPosts.length === 0 ? <div className="col-span-full text-center text-gray-500 py-10">No listings found.</div> : 
                    filteredPosts.map((post) => (
                        <motion.div 
                            key={post._id} 
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} 
                            onClick={() => navigate(`/roommates/${post._id}`)}
                            className={`bg-white border border-gray-200 rounded-3xl overflow-hidden cursor-pointer relative group shadow-xl hover:bg-gray-50 transition ${post.isClosed ? "opacity-60" : ""}`}
                        >
                            {post.isClosed && (
                                <span className="absolute top-3 left-3 z-20 bg-red-600 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg">CLOSED</span>
                            )}
                            {/* Image (Only for Have Room) */}
                            {post.type === "Have Room" && post.images && post.images.length > 0 && (
                                <div className="h-48 w-full overflow-hidden">
                                    <img src={post.images[0]} alt="Room" className={`w-full h-full object-cover group-hover:scale-110 transition duration-500 ${post.isClosed ? "grayscale" : ""}`} />
                                </div>
                            )}

                            <div className="p-5">
                                <div className="flex justify-between items-start mb-3">
                                    <span className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase ${post.type === "Need Room" ? "bg-purple-50 text-purple-700" : "bg-indigo-50 text-indigo-700"} border border-gray-200`}>
                                        {post.type}
                                    </span>

                                    {/* 3 DOTS MENU */}
                                    {currentUser && post.user?._id === currentUser._id && (
                                        <div className="relative" onClick={(e) => e.stopPropagation()}>
                                            <button onClick={() => setActiveMenu(activeMenu === post._id ? null : post._id)} className="p-2 text-gray-400 hover:text-gray-900 bg-gray-50 rounded-full"><FaEllipsisV /></button>
                                            <AnimatePresence>
                                                {activeMenu === post._id && (
                                                    <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="absolute right-0 top-8 bg-white border border-gray-200 rounded-xl shadow-2xl p-2 w-32 z-50">
                                                        <button onClick={(e) => openEditModal(post, e)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:bg-gray-100 hover:text-blue-600 rounded-lg"><FaEdit /> Edit</button>
                                                        <button onClick={(e) => handleDelete(post._id, e)} className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg"><FaTrash /> Delete</button>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    )}
                                </div>

                                <div className="mb-4">
                                    <h3 className="font-bold text-xl text-gray-900 mb-1">Rs. {post.budget}</h3>
                                    <p className="flex items-center gap-2 text-sm text-gray-400"><FaMapMarkerAlt /> {post.location}</p>
                                </div>

                                {/* Tags Pill */}
                                <div className="flex flex-wrap gap-2 mb-4">
                                    {post.tags.slice(0, 3).map((tag, i) => (
                                        <span key={i} className="text-[10px] bg-gray-50 border border-gray-200 px-2 py-1 rounded-md text-gray-600">{tag}</span>
                                    ))}
                                    {post.tags.length > 3 && <span className="text-[10px] text-gray-500">+{post.tags.length - 3} more</span>}
                                </div>

                                <div className="border-t border-gray-200 pt-3 flex justify-between items-center text-xs text-gray-500">
                                     <span className="flex items-center gap-1"><FaVenusMars /> {post.gender}</span>
                                     <span className="text-indigo-600 font-bold group-hover:translate-x-1 transition">View &rarr;</span>
                                </div>
                            </div>
                        </motion.div>
                    ))
                }
            </div>
        )}
      </div>

      {/* Floating Add Button */}
      <motion.button whileHover={{ scale: 1.1, rotate: 90 }} onClick={openAddModal} className="fixed bottom-8 right-8 w-16 h-16 bg-gradient-to-r from-purple-500 to-indigo-600 rounded-full flex items-center justify-center shadow-2xl z-30 border border-gray-300"><FaPlus className="text-2xl text-white" /></motion.button>

      {/* ✅ CREATE POST MODAL (Styled like Image) */}
      <AnimatePresence>
        {showModal && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white border border-gray-200 p-6 rounded-[2rem] w-full max-w-lg shadow-2xl relative overflow-y-auto max-h-[90vh]">
                    <button onClick={() => setShowModal(false)} className="absolute top-5 right-5 text-gray-400 hover:text-gray-900"><FaTimes /></button>
                    <h2 className="text-2xl font-bold mb-6 text-purple-600">Create Post</h2>
                    
                    <form onSubmit={handleSubmit} className="space-y-4">
                        
                        {/* TOGGLE TABS */}
                        <div className="flex gap-2 p-1 bg-gray-100 rounded-xl border border-gray-200 mb-4">
                            <button type="button" onClick={() => setFormData({...formData, type: "Need Room"})} className={`flex-1 py-3 rounded-lg font-bold transition ${formData.type === "Need Room" ? "bg-purple-600 text-white" : "text-gray-400 hover:text-gray-900"}`}>I Need a Room</button>
                            <button type="button" onClick={() => setFormData({...formData, type: "Have Room"})} className={`flex-1 py-3 rounded-lg font-bold transition ${formData.type === "Have Room" ? "bg-indigo-600 text-white" : "text-gray-400 hover:text-gray-900"}`}>I Have a Room</button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <input type="text" placeholder="Location" value={formData.location} className="bg-gray-50 border border-gray-200 p-3 rounded-xl text-gray-900 outline-none" required onChange={(e)=>setFormData({...formData, location:e.target.value})}/>
                            <input type="number" placeholder="Budget (Rs.)" value={formData.budget} className="bg-gray-50 border border-gray-200 p-3 rounded-xl text-gray-900 outline-none" required onChange={(e)=>setFormData({...formData, budget:e.target.value})}/>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <select value={formData.gender} className="bg-white border border-gray-200 p-3 rounded-xl text-gray-900 outline-none" onChange={(e)=>setFormData({...formData, gender:e.target.value})}>
                                <option>Any Gender</option><option>Male</option><option>Female</option>
                            </select>
                            <input type="text" placeholder="WhatsApp Number" value={formData.contact} className="bg-gray-50 border border-gray-200 p-3 rounded-xl text-gray-900 outline-none" required onChange={(e)=>setFormData({...formData, contact:e.target.value})}/>
                        </div>

                        {/* ✅ LIFESTYLE TAGS */}
                        <div>
                            <p className="text-xs text-gray-400 mb-2 uppercase font-bold">Lifestyle & Preferences</p>
                            <div className="flex flex-wrap gap-2">
                                {lifestyleTags.map(tag => (
                                    <button 
                                        type="button" 
                                        key={tag} 
                                        onClick={() => toggleTag(tag)}
                                        className={`px-3 py-1 rounded-full text-xs font-bold border transition ${formData.tags.includes(tag) ? "bg-purple-50 border-purple-500 text-purple-700" : "bg-gray-50 border-gray-200 text-gray-400"}`}
                                    >
                                        {tag}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <textarea rows="3" placeholder="Describe requirements..." value={formData.description} className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl text-gray-900 outline-none" required onChange={(e)=>setFormData({...formData, description:e.target.value})}></textarea>

                        {/* ✅ IMAGE UPLOAD (Only for 'Have Room') */}
                        {formData.type === "Have Room" && (
                            <label className="cursor-pointer flex items-center justify-center gap-2 px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition w-full text-gray-600">
                                <FaCamera /> {formData.images.length > 0 ? "Change Room Photo" : "Upload Room Photo"}
                                <input type="file" accept="image/*" className="hidden" onChange={handleImageChange} />
                            </label>
                        )}

                        <button type="submit" className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 p-4 rounded-xl font-bold text-white shadow-lg">Post Request 🏠</button>
                    </form>
                </motion.div>
            </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default RoommateFinder;