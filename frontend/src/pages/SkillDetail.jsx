import { toWhatsAppNumber } from "../utils/whatsapp";
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  FaArrowLeft, FaWhatsapp, FaUser, FaMapMarkerAlt, FaCommentDots, 
  FaTrash, FaEdit, FaTimes, FaStar, FaPaperPlane, FaCheckCircle 
} from "react-icons/fa";
import API from "../api";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";

const SkillDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [skill, setSkill] = useState(null);
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  
  // Edit State
  const [showEditModal, setShowEditModal] = useState(false);
  const [editData, setEditData] = useState({});

  // Review State
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("userInfo"));
    if (user) setCurrentUser(user);
    fetchSkill();
  }, [id]);

  const fetchSkill = async () => {
    try {
      const { data } = await API.get(`/skills/${id}`);
      setSkill(data);
      setEditData(data);
    } catch (error) { toast.error("Error loading skill"); } 
    finally { setLoading(false); }
  };

  // ✅ CHAT FEATURE (CRASH FIXED)
  const handleChat = async () => {
    if (!currentUser) { 
        toast.error("Please login first!"); 
        return; 
    }

    // 🛑 SAFETY CHECK: Agar user database se delete ho chuka hai to crash mat ho
    if (!skill.user || !skill.user._id) {
        toast.error("User not found! This post might be old.");
        return;
    }

    // Khud se chat rokne ke liye
    if (skill.user._id === currentUser._id) { 
        toast.info("You can't chat with yourself!"); 
        return; 
    }

    try {
      const { data: chat } = await API.post("/chat", {
        userId: skill.user._id,
        contextType: "skill",
        contextId: skill._id,
        contextTitle: skill.title,
      });
      await API.post("/messages", {
        chatId: chat._id,
        content: `Hi, I am interested in your skill: ${skill.title}`,
      });
      navigate("/messages", { state: { chat } });
    } catch (error) {
        console.error(error);
        toast.error("Chat Error: Try logging in again"); 
    }
  };

  // ✅ REVIEW SUBMIT FUNCTION
  const submitReview = async (e) => {
    e.preventDefault();
    if (rating === 0) return toast.error("Please select a rating");
    try {
      await API.post(`/skills/${id}/reviews`, { rating, comment });
      toast.success("Review Added!");
      setComment("");
      setRating(0);
      fetchSkill(); // Refresh page to show new review
    } catch (error) {
      toast.error(error.response?.data?.message || "Failed to add review");
    }
  };

  const handleDelete = async () => {
    if(!window.confirm("Delete this skill post?")) return;
    try { await API.delete(`/skills/${id}`); toast.success("Deleted!"); navigate("/skills"); } 
    catch (error) { toast.error("Failed to delete"); }
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const { data } = await API.put(`/skills/${id}`, editData);
      setSkill(data);
      setShowEditModal(false);
      toast.success("Skill Updated!");
    } catch (error) { toast.error("Update failed"); }
  };

  // Owner: pause / re-activate the gig
  const handleToggleActive = async () => {
    try {
      const { data } = await API.put(`/skills/${id}`, { isActive: skill.isActive === false ? true : false });
      setSkill(data);
      toast.success(data.isActive === false ? "Gig Paused" : "Gig Active");
    } catch (error) { toast.error("Failed to update"); }
  };

  const handleWhatsApp = () => window.open(`https://wa.me/${toWhatsAppNumber(skill.contact)}`, "_blank");

  if (loading) return <div className="min-h-screen bg-gray-50 text-gray-900 flex items-center justify-center">Loading...</div>;
  if (!skill) return <div className="min-h-screen bg-gray-50 text-gray-900 flex items-center justify-center">Skill not found</div>;

  // ✅ OWNER CHECK (Robust Logic)
  // Check karein ke skill.user exist karta hai ya nahi taake crash na ho
  const isOwner = currentUser && skill?.user && String(currentUser._id) === String(skill.user._id);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans relative pb-20">
      
      {/* Detail Content */}
      <div className="relative z-10 max-w-4xl mx-auto p-6 md:p-10">
        <button onClick={() => navigate(-1)} className="mb-6 flex items-center gap-2 text-gray-400 hover:text-gray-900 transition px-4 py-2 bg-gray-50 rounded-full w-fit"><FaArrowLeft /> Back</button>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="bg-white border border-gray-200 rounded-[2rem] p-8 shadow-2xl">
            <span className="inline-block px-3 py-1 rounded-lg text-xs font-bold uppercase bg-pink-50 text-pink-600 border border-pink-500/20 mb-4">{skill.category}</span>
            {skill.isActive === false && (
                <span className="inline-block ml-2 px-3 py-1 rounded-lg text-xs font-bold uppercase bg-yellow-50 text-yellow-600 border border-yellow-500/20 mb-4">Paused</span>
            )}
            <h1 className="text-3xl md:text-5xl font-bold text-gray-900 mb-6">{skill.title}</h1>

            <div className="flex flex-wrap gap-4 mb-8">
                {/* User Name Check */}
                <div
                    className={`flex items-center gap-2 bg-gray-50 px-4 py-3 rounded-xl border border-gray-200 ${skill.user ? "cursor-pointer hover:bg-purple-50 hover:border-purple-200 transition" : ""}`}
                    onClick={() => skill.user && navigate(`/profile/${skill.user._id}`)}
                >
                    <FaUser className="text-purple-600"/>
                    <p className="text-sm font-medium">{skill.user ? skill.user.name : "Unknown User"}</p>
                </div>
                <div className="flex items-center gap-2 bg-gray-50 px-4 py-3 rounded-xl border border-gray-200"><FaMapMarkerAlt className="text-blue-600"/><p className="text-sm font-medium">{skill.location}</p></div>
                <div className="flex items-center gap-2 bg-gray-50 px-4 py-3 rounded-xl border border-gray-200"><FaStar className="text-yellow-600"/><p className="text-sm font-medium">{Number(skill.rating || 0).toFixed(1)} ({skill.numReviews || 0} Reviews)</p></div>
            </div>

            <div className="bg-gray-50 rounded-2xl p-6 border border-gray-200 mb-8">
                <h3 className="text-lg font-bold text-gray-700 mb-2">Description</h3>
                <p className="text-gray-400 leading-relaxed whitespace-pre-wrap">{skill.description}</p>
            </div>

            {/* ✅ ACTION BUTTONS (Update/Delete/Chat) */}
            <div className="flex flex-col sm:flex-row gap-4 mb-10">
                {isOwner ? (
                    <>
                        <button onClick={() => setShowEditModal(true)} className="flex-1 py-4 rounded-xl bg-blue-50 border border-blue-500/20 text-blue-600 font-bold flex items-center justify-center gap-2 hover:bg-blue-50 transition"><FaEdit /> Edit</button>
                        <button onClick={handleToggleActive} className={`flex-1 py-4 rounded-xl border font-bold flex items-center justify-center gap-2 transition ${skill.isActive === false ? "bg-green-50 border-green-500/20 text-green-600 hover:bg-green-50" : "bg-yellow-50 border-yellow-500/20 text-yellow-600 hover:bg-yellow-50"}`}><FaCheckCircle /> {skill.isActive === false ? "Activate" : "Pause"}</button>
                        <button onClick={handleDelete} className="flex-1 py-4 rounded-xl bg-red-50 border border-red-500/20 text-red-600 font-bold flex items-center justify-center gap-2 hover:bg-red-50 transition"><FaTrash /> Delete</button>
                    </>
                ) : (
                    <>
                        <button onClick={handleChat} className="flex-1 py-4 rounded-xl bg-gray-100 border border-gray-200 hover:bg-gray-200 transition font-bold flex items-center justify-center gap-2 text-gray-900"><FaCommentDots className="text-pink-600" /> Chat</button>
                        <button onClick={handleWhatsApp} className="flex-1 py-4 rounded-xl bg-green-600 hover:bg-green-500 transition font-bold flex items-center justify-center gap-2 text-white shadow-lg"><FaWhatsapp className="text-xl" /> WhatsApp</button>
                    </>
                )}
            </div>

            {/* ✅ REVIEWS SECTION */}
            <div className="border-t border-gray-200 pt-8">
                <h3 className="text-2xl font-bold mb-6">Reviews</h3>
                
                {/* List Reviews */}
                {(!Array.isArray(skill.reviews) || skill.reviews.length === 0) ? <p className="text-gray-500 mb-6">No reviews yet.</p> : (
                    <div className="space-y-4 mb-8">
                        {skill.reviews.map((rev, idx) => (
                            <div key={rev._id || idx} className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                                <div className="flex justify-between items-center mb-2">
                                    <strong className={`text-pink-600 ${rev.user ? "cursor-pointer hover:underline" : ""}`} onClick={() => rev.user && navigate(`/profile/${rev.user}`)}>{rev.name || "Anonymous"}</strong>
                                    <div className="flex text-yellow-600 text-sm">{[...Array(5)].map((_, i) => <FaStar key={i} className={i < (rev.rating || 0) ? "opacity-100" : "opacity-20"} />)}</div>
                                </div>
                                <p className="text-gray-600 text-sm">{rev.comment}</p>
                            </div>
                        ))}
                    </div>
                )}

                {/* Review Form */}
                {!isOwner && currentUser && (
                    <form onSubmit={submitReview} className="bg-gray-50 p-6 rounded-2xl border border-gray-200">
                        <h4 className="font-bold mb-4">Write a Review</h4>
                        <div className="flex gap-2 mb-4">
                            {[1, 2, 3, 4, 5].map((star) => (
                                <FaStar key={star} className={`cursor-pointer text-2xl ${rating >= star ? "text-yellow-600" : "text-gray-600"}`} onClick={() => setRating(star)} />
                            ))}
                        </div>
                        <textarea className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl text-gray-900 outline-none focus:border-pink-500 mb-4" rows="3" placeholder="Share your experience..." value={comment} onChange={(e) => setComment(e.target.value)} required></textarea>
                        <button type="submit" className="bg-pink-600 text-white px-6 py-2 rounded-xl font-bold flex items-center gap-2 hover:bg-pink-700 transition"><FaPaperPlane /> Submit</button>
                    </form>
                )}
            </div>

        </motion.div>
      </div>

      {/* EDIT MODAL */}
      <AnimatePresence>
        {showEditModal && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white border border-gray-200 p-6 rounded-[2rem] w-full max-w-lg shadow-2xl relative">
                    <button onClick={() => setShowEditModal(false)} className="absolute top-5 right-5 text-gray-400 hover:text-gray-900"><FaTimes /></button>
                    <h2 className="text-2xl font-bold mb-6 text-pink-600">Edit Skill</h2>
                    <form onSubmit={handleUpdate} className="space-y-4">
                        <input type="text" value={editData.title} className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl text-gray-900 outline-none" onChange={(e)=>setEditData({...editData, title:e.target.value})}/>
                        <div className="grid grid-cols-2 gap-4">
                             <select value={editData.category} className="bg-white border border-gray-200 p-3 rounded-xl text-gray-900 outline-none" onChange={(e)=>setEditData({...editData, category:e.target.value})}>
                                {["Tech", "Design", "Tutor", "Writing", "Other"].map(c => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <input type="text" value={editData.location} className="bg-gray-50 border border-gray-200 p-3 rounded-xl text-gray-900 outline-none" onChange={(e)=>setEditData({...editData, location:e.target.value})}/>
                        </div>
                        <textarea rows="3" value={editData.description} className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl text-gray-900 outline-none" onChange={(e)=>setEditData({...editData, description:e.target.value})}></textarea>
                        <input type="text" value={editData.contact} className="w-full bg-gray-50 border border-gray-200 p-3 rounded-xl text-gray-900 outline-none" onChange={(e)=>setEditData({...editData, contact:e.target.value})}/>
                        <button type="submit" className="w-full bg-blue-600 p-3 rounded-xl font-bold text-white shadow-lg">Update Skill</button>
                    </form>
                </motion.div>
            </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SkillDetail;