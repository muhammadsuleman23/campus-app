import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FaSearch, FaPlus, FaMapMarkerAlt, FaArrowLeft, FaTimes, FaCamera, 
  FaWhatsapp, FaEllipsisV, FaTrash, FaEdit, FaCheckCircle, FaShoppingBag, FaImages 
} from "react-icons/fa";
import { toast } from "react-toastify";
import API from "../api";

const Marketplace = () => {
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [view, setView] = useState("all"); 
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [searchTerm, setSearchTerm] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState(null);
  const [activeMenu, setActiveMenu] = useState(null);

  const [formData, setFormData] = useState({ 
    title: "", description: "", price: "", category: "Gadgets", condition: "New", location: "", contact: "" 
  });
  
  const [images, setImages] = useState([]); 
  const [previews, setPreviews] = useState([]); 
  
  const [editMode, setEditMode] = useState(false); 
  const [editId, setEditId] = useState(null);

  const categoriesList = ["All", "Gadgets", "Books", "Furniture", "Stationery", "Clothing", "Notes", "Other"];

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("userInfo"));
    if (user) setUserId(user._id);
    fetchItems();
  }, []);

  const fetchItems = async () => {
    try {
      const { data } = await API.get("/products");
      setItems(data);
    } catch (error) { toast.error("Failed to load items"); } 
    finally { setLoading(false); }
  };

  useEffect(() => {
    let result = items;
    if (selectedCategory !== "All") result = result.filter(item => item.category === selectedCategory);
    if (searchTerm) result = result.filter(item => item.title.toLowerCase().includes(searchTerm.toLowerCase()));
    
    if (view === "my") result = result.filter(item => item.seller?._id === userId);
    else result = result.filter(item => !item.isSold); 

    setFilteredItems(result);
  }, [searchTerm, items, view, userId, selectedCategory]);

  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    setImages(files); 
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setPreviews(newPreviews);
  };

  const handleEditClick = (item) => {
    setEditMode(true);
    setEditId(item._id);
    setFormData({
      title: item.title, description: item.description, price: item.price,
      category: item.category, condition: item.condition, location: item.location, contact: item.contact
    });
    setPreviews(item.images || []);
    setImages([]); 
    setShowModal(true);
    setActiveMenu(null);
  };

  const handleDelete = async (id) => {
    if(!window.confirm("Delete this item?")) return;
    try { await API.delete(`/products/${id}`); fetchItems(); toast.success("Deleted"); } 
    catch (error) { toast.error("Error deleting"); }
  };

  const handleMarkSold = async (item) => {
    try { await API.put(`/products/${item._id}`, { isSold: !item.isSold }); fetchItems(); setActiveMenu(null); } 
    catch (error) { toast.error("Error updating"); }
  };

  const handleSubmit = async (e) => {
      e.preventDefault();
      try {
        let base64Images = [];
        if (images.length > 0) {
            const promises = images.map(file => {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.readAsDataURL(file);
                    reader.onload = () => resolve(reader.result);
                    reader.onerror = error => reject(error);
                });
            });
            base64Images = await Promise.all(promises);
        } else if (editMode) {
            base64Images = previews; 
        }

        const payload = { ...formData, images: base64Images };

        if (editMode) {
          await API.put(`/products/${editId}`, payload);
          toast.success("Updated!");
        } else {
          await API.post("/products", payload);
          toast.success("Listed!");
        }
        setShowModal(false); fetchItems(); resetForm();
      } catch (error) { 
          console.error(error);
          toast.error("Failed (File might be too large)"); 
      }
  };

  const resetForm = () => {
    setFormData({ title: "", description: "", price: "", category: "Gadgets", condition: "New", location: "", contact: "" });
    setImages([]); setPreviews([]); setEditMode(false); setEditId(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans relative pb-20 overflow-hidden" onClick={() => setActiveMenu(null)}>
      
      {/* Background */}
      <div className="fixed inset-0 z-0 pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] bg-purple-100/50 rounded-full blur-[120px]"></div>
          <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] bg-blue-100/50 rounded-full blur-[120px]"></div>
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-10"></div>
      </div>

      {/* ✅ HEADER FIX: Removed 'relative' because 'sticky' is present */}
      <div className="z-10 bg-white/90 backdrop-blur-xl border-b border-gray-200 p-6 shadow-2xl sticky top-0">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-4 w-full md:w-auto">
                <button onClick={() => navigate("/dashboard")} className="p-3 bg-gray-50 rounded-full hover:bg-gray-100 transition border border-gray-200"><FaArrowLeft /></button>
                <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">Marketplace</h1>
            </div>
            <div className="flex bg-gray-50 p-1 rounded-xl border border-gray-200">
                <button onClick={() => setView("all")} className={`px-6 py-2 rounded-lg text-sm font-bold transition ${view === "all" ? "bg-gradient-to-r from-blue-600 to-blue-500 text-white" : "text-gray-400"}`}>Browse</button>
                <button onClick={() => setView("my")} className={`px-6 py-2 rounded-lg text-sm font-bold transition ${view === "my" ? "bg-gradient-to-r from-purple-600 to-purple-500 text-white" : "text-gray-400"}`}>My Listings</button>
            </div>
        </div>
      </div>

      {/* Filters */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 mt-6 space-y-6">
        <div className="relative group">
            <FaSearch className="absolute left-5 top-4 text-gray-400" />
            <input type="text" placeholder="Search..." className="w-full bg-gray-50 backdrop-blur-md text-gray-900 pl-14 pr-6 py-4 rounded-2xl border border-gray-200 focus:outline-none focus:border-blue-500/50" onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
            {categoriesList.map((cat) => (
                <button key={cat} onClick={() => setSelectedCategory(cat)} className={`px-6 py-2.5 rounded-full text-sm font-medium border transition whitespace-nowrap ${selectedCategory === cat ? "bg-cyan-600 border-cyan-500 text-white" : "bg-gray-50 border-gray-200 text-gray-400"}`}>{cat}</button>
            ))}
        </div>
      </div>

      {/* Grid */}
      <div className="relative z-10 max-w-7xl mx-auto px-6 mt-8">
        {loading ? <div className="text-center mt-20 text-gray-500 animate-pulse">Loading...</div> : filteredItems.length === 0 ? <div className="text-center mt-20 opacity-50"><FaShoppingBag className="text-6xl mx-auto mb-4 text-gray-700" /><h3 className="text-xl">No Items</h3></div> : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredItems.map((item) => (
                    <motion.div key={item._id} onClick={() => navigate(`/marketplace/${item._id}`)} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className={`group relative bg-gray-50 backdrop-blur-md rounded-3xl overflow-hidden border border-gray-200 cursor-pointer shadow-lg ${item.isSold ? 'opacity-70 grayscale' : ''}`}>
                        {item.isSold && <div className="absolute top-0 right-0 z-20 bg-red-600 text-white text-[10px] font-bold px-3 py-1 rounded-bl-xl shadow-lg">SOLD</div>}
                        
                        <div className="h-48 bg-gray-50 overflow-hidden relative">
                            {item.images && item.images.length > 0 ? (
                                <img src={item.images[0]} alt={item.title} className="w-full h-full object-cover group-hover:scale-110 transition duration-500" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-500"><FaCamera className="text-3xl" /></div>
                            )}
                             {item.images && item.images.length > 1 && (
                                <div className="absolute bottom-2 right-2 bg-black/60 px-2 py-1 rounded text-xs flex items-center gap-1"><FaImages /> {item.images.length}</div>
                             )}

                            {view === "my" && (
                                <div className="absolute top-3 right-3 z-30" onClick={(e) => e.stopPropagation()}>
                                    <button onClick={() => setActiveMenu(activeMenu === item._id ? null : item._id)} className="p-2 bg-black/60 rounded-full text-white"><FaEllipsisV /></button>
                                    {activeMenu === item._id && (
                                        <div className="absolute right-0 mt-2 w-44 bg-white border border-gray-200 rounded-xl shadow-2xl overflow-hidden z-50">
                                            <button onClick={(e) => { e.stopPropagation(); handleEditClick(item); }} className="w-full text-left px-4 py-3 text-sm hover:bg-gray-100 flex gap-2"><FaEdit className="text-blue-600"/> Edit</button>
                                            <button onClick={(e) => { e.stopPropagation(); handleMarkSold(item); }} className="w-full text-left px-4 py-3 text-sm hover:bg-gray-100 flex gap-2 text-gray-900"><FaCheckCircle className={item.isSold ? "text-gray-400" : "text-green-600"}/> {item.isSold ? "Mark Available" : "Mark Sold"}</button>
                                            <button onClick={(e) => { e.stopPropagation(); handleDelete(item._id); }} className="w-full text-left px-4 py-3 text-sm hover:bg-red-50 text-red-600 flex gap-2"><FaTrash /> Delete</button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="p-5">
                            <div className="flex justify-between items-start mb-2"><h3 className="text-lg font-bold text-gray-900 line-clamp-1">{item.title}</h3><span className="text-green-600 font-bold bg-green-50 px-2 py-1 rounded-lg text-xs">Rs. {item.price}</span></div>
                            <p className="text-gray-400 text-xs mb-3 flex items-center gap-1"><FaMapMarkerAlt /> {item.location}</p>
                            <div className="flex items-center gap-2 text-xs text-gray-500 mb-2 bg-gray-50 p-2 rounded-lg"><span className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[10px]">{item.condition}</span><span>• {item.seller?.name}</span></div>
                        </div>
                    </motion.div>
                ))}
            </div>
        )}
      </div>

      <motion.button whileHover={{ scale: 1.1, rotate: 90 }} whileTap={{ scale: 0.9 }} onClick={() => { resetForm(); setShowModal(true); }} className="fixed bottom-8 right-8 bg-gradient-to-r from-cyan-500 to-blue-600 text-white p-5 rounded-full shadow-2xl z-40 border-2 border-gray-300"><FaPlus className="text-2xl" /></motion.button>
      
      {/* Modal */}
       <AnimatePresence>
        {showModal && (
            <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }} className="bg-white border border-gray-200 p-6 rounded-[2rem] w-full max-w-lg shadow-2xl relative overflow-hidden">
                    <button onClick={() => setShowModal(false)} className="absolute top-5 right-5 text-gray-400 hover:text-gray-900"><FaTimes /></button>
                    <h2 className="text-2xl font-bold mb-6 bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">{editMode ? "Edit Item" : "Sell Item"}</h2>
                    
                    <form onSubmit={handleSubmit} className="space-y-4 max-h-[70vh] overflow-y-auto pr-2 scrollbar-hide">
                        <div className="flex items-center gap-4">
                            <label className="flex-1 flex flex-col items-center justify-center h-32 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-blue-500 bg-gray-50 transition relative overflow-hidden">
                                {previews.length > 0 ? (
                                    <div className="grid grid-cols-3 gap-1 w-full h-full p-2">
                                        {previews.slice(0, 3).map((src, i) => (
                                            <img key={i} src={src} className="w-full h-full object-cover rounded" />
                                        ))}
                                        {previews.length > 3 && <div className="flex items-center justify-center text-xs text-gray-400">+{previews.length - 3}</div>}
                                    </div>
                                ) : (
                                    <div className="text-center text-gray-500"><FaCamera className="text-2xl mx-auto mb-1"/> <span className="text-xs">Select Photos (Max 5)</span></div>
                                )}
                                <input type="file" multiple className="hidden" onChange={handleImageChange} accept="image/*" />
                            </label>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                             <input type="text" placeholder="Item Name" className="bg-white text-gray-900 p-3 rounded-xl border border-gray-200 focus:border-blue-500 outline-none" value={formData.title} onChange={(e) => setFormData({...formData, title: e.target.value})} required />
                             <input type="number" placeholder="Price (Rs)" className="bg-white text-gray-900 p-3 rounded-xl border border-gray-200 focus:border-blue-500 outline-none" value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})} required />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                             <select className="bg-white text-gray-900 p-3 rounded-xl border border-gray-200 outline-none" value={formData.category} onChange={(e) => setFormData({...formData, category: e.target.value})}>
                                 {categoriesList.filter(c => c !== "All").map(c => <option key={c} value={c}>{c}</option>)}
                             </select>
                             <select className="bg-white text-gray-900 p-3 rounded-xl border border-gray-200 outline-none" value={formData.condition} onChange={(e) => setFormData({...formData, condition: e.target.value})}>
                                 {["New", "Used - Good", "Used - Fair"].map(c => <option key={c} value={c}>{c}</option>)}
                             </select>
                        </div>
                        <input type="text" placeholder="Location" className="w-full bg-white text-gray-900 p-3 rounded-xl border border-gray-200 focus:border-blue-500 outline-none" value={formData.location} onChange={(e) => setFormData({...formData, location: e.target.value})} required />
                        <input type="text" placeholder="WhatsApp Number" className="w-full bg-white text-gray-900 p-3 rounded-xl border border-gray-200 focus:border-blue-500 outline-none" value={formData.contact} onChange={(e) => setFormData({...formData, contact: e.target.value})} required />
                        <textarea rows="3" placeholder="Description..." className="w-full bg-white text-gray-900 p-3 rounded-xl border border-gray-200 focus:border-blue-500 outline-none" value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} required></textarea>
                        <button type="submit" className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-3.5 rounded-xl shadow-lg hover:scale-[1.02] transition">{editMode ? "Update Item" : "List Item"}</button>
                    </form>
                </motion.div>
            </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Marketplace;