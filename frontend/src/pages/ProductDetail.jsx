import { toWhatsAppNumber } from "../utils/whatsapp";
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  FaArrowLeft, FaMapMarkerAlt, FaWhatsapp, FaUser, FaTag, 
  FaInfoCircle, FaBoxOpen, FaCommentDots, FaShieldAlt, FaCheckCircle, FaTrash 
} from "react-icons/fa";
import API from "../api";
import { motion } from "framer-motion";
import { toast } from "react-toastify";

const ProductDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    // 1. Load Current User
    const user = JSON.parse(localStorage.getItem("userInfo"));
    if (user) setCurrentUser(user);

    // 2. Fetch Product Details
    const fetchProduct = async () => {
      try {
        const { data } = await API.get(`/products/${id}`);
        setItem(data);
        if(data.images && data.images.length > 0) setActiveImage(data.images[0]);
      } catch (error) {
        toast.error("Error loading product");
      } finally {
        setLoading(false);
      }
    };
    fetchProduct();
  }, [id]);

  // ✅ CHAT FEATURE (FIXED: Ab default message bhejega taake crash na ho)
  const handleChat = async () => {
    if (!currentUser) { toast.error("Please login first!"); return; }
    if (!item.seller || !item.seller._id) { toast.error("Seller not found!"); return; }
    if (String(item.seller._id) === String(currentUser._id)) { toast.info("This is your own listing!"); return; }
    try {
      // Create/get the conversation, then send the opening message
      const { data: chat } = await API.post("/chat", {
        userId: item.seller._id,
        contextType: "product",
        contextId: item._id,
        contextTitle: item.title,
      });
      await API.post("/messages", {
        chatId: chat._id,
        content: `Hi, I am interested in your listing: ${item.title}`,
      });
      // Navigate straight into that conversation
      navigate("/messages", { state: { chat } });
    } catch (error) {
        console.error("Chat Error:", error);
        toast.error("Could not start chat");
    }
  };

  // ✅ MARK AS SOLD LOGIC
  const handleMarkSold = async () => {
    try {
      const { data } = await API.put(`/products/${item._id}`, { isSold: !item.isSold });
      setItem(data); // State update immediately
      toast.success(data.isSold ? "Marked as Sold!" : "Marked as Available!");
    } catch (error) { 
      console.error(error);
      toast.error("Failed to update status"); 
    }
  };

  // ✅ DELETE LOGIC
  const handleDelete = async () => {
    if(!window.confirm("Are you sure you want to delete this listing?")) return;
    try {
      await API.delete(`/products/${item._id}`);
      toast.success("Item Deleted");
      navigate("/marketplace");
    } catch (error) { toast.error("Failed to delete"); }
  };

  const handleWhatsApp = () => {
    window.open(`https://wa.me/${toWhatsAppNumber(item.contact)}?text=Hi, I am interested in your listing: ${item.title}`, "_blank");
  };

  // Check if current user is the owner
  const isOwner = currentUser && item?.seller && String(currentUser._id) === String(item.seller._id);

  if (loading) return <div className="min-h-screen bg-gray-50 text-gray-900 flex items-center justify-center">Loading...</div>;
  if (!item) return <div className="min-h-screen bg-gray-50 text-gray-900 flex items-center justify-center">Item not found</div>;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans relative overflow-hidden">
      
      {/* Background Glows */}
      <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute top-[-20%] right-[-10%] w-[600px] h-[600px] bg-purple-100/50 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-[-20%] left-[-10%] w-[600px] h-[600px] bg-blue-100/50 rounded-full blur-[120px]"></div>
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10"></div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto p-6 md:p-10">
        <button onClick={() => navigate(-1)} className="mb-6 flex items-center gap-2 text-gray-400 hover:text-gray-900 transition group bg-gray-50 px-4 py-2 rounded-full border border-gray-200 hover:border-gray-300">
            <FaArrowLeft className="group-hover:-translate-x-1 transition" /> Back to Marketplace
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            
            {/* --- LEFT: IMAGES --- */}
            <motion.div initial={{ opacity: 0, x: -50 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col gap-4">
                <div className="relative h-[350px] md:h-[500px] rounded-[2rem] overflow-hidden border border-gray-200 shadow-2xl bg-white group">
                    {activeImage ? (
                        <img src={activeImage} alt={item.title} className={`w-full h-full object-cover transition duration-700 ${item.isSold ? "grayscale opacity-50" : "group-hover:scale-105"}`} />
                    ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center text-gray-500">
                            <FaBoxOpen className="text-6xl mb-4 opacity-50"/>
                            <p>No Image Available</p>
                        </div>
                    )}
                    
                    <div className="absolute top-5 left-5 bg-black/60 backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider border border-white/20 text-white">
                        {item.category}
                    </div>

                    {/* SOLD OVERLAY */}
                    {item.isSold && (
                        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-20">
                            <span className="bg-red-600 text-white px-10 py-4 rounded-full font-bold text-3xl rotate-[-12deg] border-4 border-white shadow-2xl">SOLD</span>
                        </div>
                    )}
                </div>

                {/* Thumbnails */}
                {item.images && item.images.length > 1 && (
                    <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
                        {item.images.map((img, index) => (
                            <button 
                                key={index} 
                                onClick={() => setActiveImage(img)}
                                className={`w-20 h-20 flex-shrink-0 rounded-xl overflow-hidden border-2 transition relative ${activeImage === img ? "border-blue-500 shadow-lg scale-105" : "border-gray-200 opacity-60 hover:opacity-100"}`}
                            >
                                <img src={img} className="w-full h-full object-cover" />
                            </button>
                        ))}
                    </div>
                )}
            </motion.div>

            {/* --- RIGHT: DETAILS --- */}
            <motion.div initial={{ opacity: 0, x: 50 }} animate={{ opacity: 1, x: 0 }} className="flex flex-col justify-center">
                
                <h1 className="text-3xl md:text-5xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white via-gray-200 to-gray-400 mb-4 leading-tight">{item.title}</h1>
                <div className="flex items-center flex-wrap gap-4 mb-8">
                    <span className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-500">Rs. {item.price.toLocaleString()}</span>
                    <span className="px-3 py-1 bg-blue-50 text-blue-700 rounded-lg text-sm border border-blue-500/20 flex items-center gap-2 font-medium">
                        <FaTag /> {item.condition}
                    </span>
                </div>

                <div className="bg-gray-50 backdrop-blur-xl border border-gray-200 rounded-3xl p-6 md:p-8 mb-8 shadow-xl">
                    <div className="flex items-start gap-3 mb-6">
                        <FaInfoCircle className="text-gray-400 mt-1 flex-shrink-0" />
                        <p className="text-gray-600 leading-relaxed text-sm md:text-base">{item.description}</p>
                    </div>
                    
                    <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent my-6"></div>
                    
                    <div className="grid grid-cols-2 gap-6">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center text-red-600"><FaMapMarkerAlt /></div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-bold">Location</p>
                                <p className="text-gray-900 font-medium">{item.location}</p>
                            </div>
                        </div>
                        <div className={`flex items-center gap-3 ${item.seller?._id ? "cursor-pointer group" : ""}`} onClick={() => item.seller?._id && navigate(`/profile/${item.seller._id}`)}>
                            <div className="w-10 h-10 rounded-full bg-purple-50 flex items-center justify-center text-purple-600 group-hover:bg-purple-100 transition"><FaUser /></div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase font-bold">Seller</p>
                                <p className="text-gray-900 font-medium group-hover:text-purple-600 transition">{item.seller?.name || "Student"}</p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* ✅ CONTROL BUTTONS */}
                <div className="flex flex-col sm:flex-row gap-4">
                    
                    {/* CASE 1: AGAR AAP OWNER HAIN */}
                    {isOwner ? (
                        <>
                            <button 
                                onClick={handleMarkSold}
                                className={`flex-1 py-4 rounded-2xl border transition shadow-lg flex items-center justify-center gap-3 font-bold ${item.isSold ? "bg-gray-100 text-gray-500 border-gray-300 hover:bg-gray-200" : "bg-green-50 text-green-600 border-green-500/50 hover:bg-green-100"}`}
                            >
                                <FaCheckCircle className="text-xl" /> 
                                {item.isSold ? "Mark as Available" : "Mark as Sold"}
                            </button>
                            
                            <button 
                                onClick={handleDelete}
                                className="flex-1 py-4 rounded-2xl bg-red-50 border border-red-500/50 hover:bg-red-100 text-red-600 transition shadow-lg flex items-center justify-center gap-3 font-bold"
                            >
                                <FaTrash className="text-xl" /> 
                                Delete Listing
                            </button>
                        </>
                    ) : (
                        /* CASE 2: AGAR AAP BUYER HAIN */
                        <>
                             {!item.isSold && (
                                <>
                                    <button 
                                        onClick={handleChat}
                                        className="flex-1 py-4 rounded-2xl bg-white border border-gray-200 hover:bg-gray-100 hover:border-blue-500/50 transition shadow-lg flex items-center justify-center gap-3 font-bold text-gray-900 group"
                                    >
                                        <FaCommentDots className="text-xl text-blue-600 group-hover:scale-110 transition" /> 
                                        Chat with Seller
                                    </button>
                                    
                                    <button 
                                        onClick={handleWhatsApp}
                                        className="flex-1 py-4 rounded-2xl bg-gradient-to-r from-green-600 to-emerald-600 hover:scale-[1.02] transition shadow-lg flex items-center justify-center gap-3 font-bold text-white"
                                    >
                                        <FaWhatsapp className="text-2xl" /> 
                                        WhatsApp
                                    </button>
                                </>
                             )}
                        </>
                    )}
                </div>
                
                <div className="mt-6 flex items-center justify-center gap-2 text-xs text-gray-500">
                    {isOwner ? (
                        <span className="text-purple-600">You are viewing your own listing.</span>
                    ) : (
                        <>
                            <FaShieldAlt /> Please verify item before payment.
                        </>
                    )}
                </div>

            </motion.div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;