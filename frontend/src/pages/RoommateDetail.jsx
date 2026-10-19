import { toWhatsAppNumber } from "../utils/whatsapp";
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { FaArrowLeft, FaMapMarkerAlt, FaMoneyBillWave, FaWhatsapp, FaUser, FaCommentDots, FaTrash, FaEdit, FaCheckCircle } from "react-icons/fa";
import API from "../api";
import { motion } from "framer-motion";
import { toast } from "react-toastify";

const RoommateDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("userInfo"));
    if (user) setCurrentUser(user);
    const fetchPost = async () => {
      try { const { data } = await API.get(`/roommates/${id}`); setPost(data); } 
      catch (error) { toast.error("Error loading post"); }
    };
    fetchPost();
  }, [id]);

  const handleChat = async () => {
    if (!currentUser) return toast.error("Login required!");
    if (post.user._id === currentUser._id) return toast.info("Your own post!");
    try {
      const { data: chat } = await API.post("/chat", {
        userId: post.user._id,
        contextType: "roommate",
        contextId: post._id,
        contextTitle: `Roommate: ${post.type || "Post"} in ${post.location || "N/A"}`,
      });
      await API.post("/messages", { chatId: chat._id, content: `Hi, interested in your roommate post: ${post.description.substring(0, 20)}...` });
      navigate("/messages", { state: { chat } });
    } catch (error) { toast.error("Chat error"); }
  };

  const handleWhatsApp = () => window.open(`https://wa.me/${toWhatsAppNumber(post.contact)}`, "_blank");

  const handleMarkClosed = async () => {
    try {
      const { data } = await API.put(`/roommates/${id}`, { isClosed: !post.isClosed });
      setPost(data);
      toast.success(data.isClosed ? "Marked as Closed/Taken!" : "Re-opened!");
    } catch (error) { toast.error("Failed to update"); }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this post?")) return;
    try {
      await API.delete(`/roommates/${id}`);
      toast.success("Post deleted");
      navigate("/roommates");
    } catch (error) { toast.error("Failed to delete"); }
  };

  if (!post) return <div className="min-h-screen bg-gray-50 text-gray-900 flex items-center justify-center">Loading...</div>;

  const isOwner = currentUser && post.user && String(post.user._id) === String(currentUser._id);

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-6 relative">
      <div className="max-w-4xl mx-auto relative z-10">
        <button onClick={() => navigate(-1)} className="mb-6 flex items-center gap-2 text-gray-400 hover:text-gray-900 bg-gray-50 px-4 py-2 rounded-full w-fit"><FaArrowLeft /> Back</button>
        
        <div className="bg-white border border-gray-200 rounded-[2rem] overflow-hidden">
            {/* Image Banner */}
            {post.images && post.images.length > 0 && (
                <div className="h-64 w-full"><img src={post.images[0]} className="w-full h-full object-cover" alt="Room" /></div>
            )}
            
            <div className="p-8">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-50 text-purple-700 border border-purple-500/30">{post.type}</span>
                        <h1 className="text-3xl font-bold mt-3">Rs. {post.budget} <span className="text-sm text-gray-500 font-normal">/ month</span></h1>
                    </div>
                    {post.isClosed && (
                        <span className="px-4 py-2 rounded-full text-xs font-bold bg-red-50 text-red-700 border border-red-500/30">CLOSED / TAKEN</span>
                    )}
                </div>

                <div className="flex flex-wrap gap-4 mb-8">
                    <div className="flex items-center gap-2 bg-gray-50 px-4 py-3 rounded-xl border border-gray-200"><FaMapMarkerAlt className="text-blue-600"/> {post.location}</div>
                    <div className="flex items-center gap-2 bg-gray-50 px-4 py-3 rounded-xl border border-gray-200"><FaUser className="text-green-600"/> {post.gender}</div>
                </div>

                <div className="flex flex-wrap gap-2 mb-6">
                    {post.tags.map(tag => <span key={tag} className="text-xs bg-gray-100 px-3 py-1 rounded-full text-gray-600">{tag}</span>)}
                </div>

                <p className="text-gray-400 mb-8 leading-relaxed">{post.description}</p>

                {isOwner ? (
                    <div className="flex gap-4">
                        <button onClick={handleMarkClosed} className={`flex-1 py-4 rounded-xl font-bold flex items-center justify-center gap-2 border transition ${post.isClosed ? "bg-gray-100 border-gray-300 hover:bg-gray-200" : "bg-green-50 border-green-500/50 text-green-600 hover:bg-green-100"}`}>
                            <FaCheckCircle /> {post.isClosed ? "Re-open Post" : "Mark Closed / Taken"}
                        </button>
                        <button onClick={handleDelete} className="flex-1 py-4 rounded-xl bg-red-50 border border-red-500/50 text-red-600 hover:bg-red-100 font-bold flex items-center justify-center gap-2 transition">
                            <FaTrash /> Delete
                        </button>
                    </div>
                ) : post.isClosed ? (
                    <div className="text-center text-gray-500 py-4 bg-gray-50 rounded-xl border border-gray-200">
                        This post is closed. The room is no longer available.
                    </div>
                ) : currentUser && (
                    <div className="flex gap-4">
                        <button onClick={handleChat} className="flex-1 py-4 rounded-xl bg-gray-100 hover:bg-gray-200 font-bold flex items-center justify-center gap-2 border border-gray-200"><FaCommentDots className="text-purple-600"/> Chat</button>
                        <button onClick={handleWhatsApp} className="flex-1 py-4 rounded-xl bg-green-600 hover:bg-green-500 font-bold flex items-center justify-center gap-2 shadow-lg"><FaWhatsapp className="text-xl"/> WhatsApp</button>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
};
export default RoommateDetail;