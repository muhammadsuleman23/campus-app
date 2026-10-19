import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FaCloudUploadAlt, FaArrowLeft, FaTag, FaMoneyBillWave, FaAlignLeft, FaStar, FaTimes } from "react-icons/fa";
import { toast } from "react-toastify"; // Toast Import
import API from "../api";

const SellItem = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    title: "",
    price: "",
    category: "Books",
    condition: "Used",
    description: "",
  });
  
  const [images, setImages] = useState([]); // Ab yeh Array hai
  const [previews, setPreviews] = useState([]); // Previews ka bhi Array

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  // Multiple Images Handle Karna
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    
    // Limit: 5 photos max
    if (files.length + images.length > 5) {
      toast.error("You can upload max 5 photos!");
      return;
    }

    setImages([...images, ...files]);

    // Previews generate karna
    const newPreviews = files.map(file => URL.createObjectURL(file));
    setPreviews([...previews, ...newPreviews]);
  };

  // Remove Image Function
  const removeImage = (index) => {
    const newImages = images.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    setImages(newImages);
    setPreviews(newPreviews);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (images.length === 0) {
      toast.error("Please upload at least one photo!");
      return;
    }
    
    setLoading(true);

    try {
      // Sare images ko Base64 mein convert karna (Promise.all use kar ke)
      const imagePromises = images.map((file) => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.readAsDataURL(file);
          reader.onload = () => resolve(reader.result);
          reader.onerror = (error) => reject(error);
        });
      });

      const base64Images = await Promise.all(imagePromises);

      const payload = {
        ...formData,
        images: base64Images // Ab hum array bhej rahe hain
      };

      await API.post("/products", payload); // Make sure route '/add' hi ho
      
      toast.success("Item Listed Successfully! 🚀");
      setTimeout(() => navigate("/marketplace"), 1500); // Thora wait taake user toast parh le
      
    } catch (error) {
      toast.error("Failed to list item. Try again!");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white text-gray-900 flex items-center justify-center p-4 relative overflow-hidden font-sans">
      
      {/* Background Decor */}
      <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-purple-50 rounded-full blur-[100px]"></div>
      <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-blue-50 rounded-full blur-[100px]"></div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="bg-gray-50/80 backdrop-blur-md border border-gray-200 p-8 rounded-3xl shadow-2xl w-full max-w-lg relative z-10 my-10"
      >
        <div className="flex items-center gap-4 mb-6">
          <button onClick={() => navigate("/marketplace")} className="p-2 rounded-full hover:bg-gray-100 transition">
            <FaArrowLeft />
          </button>
          <h1 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
            Sell an Item
          </h1>
        </div>

        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* Multiple Image Upload Area */}
          <div className="space-y-3">
            <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-gray-300 rounded-2xl cursor-pointer hover:border-blue-500 hover:bg-gray-100/50 transition bg-white/50">
                <div className="flex flex-col items-center justify-center pt-5 pb-6 text-gray-400">
                  <FaCloudUploadAlt className="text-3xl mb-2 group-hover:text-blue-600 transition" />
                  <p className="text-sm">Click to upload photos (Max 5)</p>
                </div>
              <input type="file" multiple className="hidden" onChange={handleImageChange} accept="image/*" />
            </label>

            {/* Previews Grid */}
            {previews.length > 0 && (
              <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                {previews.map((src, index) => (
                  <div key={index} className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden border border-gray-300 group">
                    <img src={src} alt="preview" className="w-full h-full object-cover" />
                    <button 
                      type="button"
                      onClick={() => removeImage(index)}
                      className="absolute top-0 right-0 bg-red-600 text-white p-1 rounded-bl-lg opacity-0 group-hover:opacity-100 transition"
                    >
                      <FaTimes size={10} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Title */}
          <div className="relative">
            <FaTag className="absolute top-4 left-4 text-gray-400" />
            <input 
              type="text" name="title" placeholder="Item Title" 
              className="w-full bg-white text-gray-900 pl-12 pr-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:border-blue-500 transition"
              onChange={handleChange} required
            />
          </div>

          {/* Price & Category */}
          <div className="flex gap-4">
            <div className="relative w-1/2">
              <FaMoneyBillWave className="absolute top-4 left-4 text-gray-400" />
              <input 
                type="number" name="price" placeholder="Price (Rs)" 
                className="w-full bg-white text-gray-900 pl-12 pr-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:border-blue-500 transition"
                onChange={handleChange} required
              />
            </div>
            <div className="relative w-1/2">
              <select name="category" onChange={handleChange} className="w-full bg-white text-gray-900 px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:border-blue-500 transition">
                <option>Books</option>
                <option>Gadgets</option>
                <option>Furniture</option>
                <option>Notes</option>
              </select>
            </div>
          </div>

          {/* Condition */}
          <div className="relative">
            <FaStar className="absolute top-4 left-4 text-gray-400" />
            <select name="condition" onChange={handleChange} className="w-full bg-white text-gray-900 pl-12 pr-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:border-blue-500 transition">
              <option value="New">Condition: New</option>
              <option value="Like New">Condition: Like New</option>
              <option value="Used">Condition: Used</option>
            </select>
          </div>

          {/* Description */}
          <textarea 
            name="description" placeholder="Description..." rows="3"
            className="w-full bg-white text-gray-900 px-4 py-3 rounded-xl border border-gray-300 focus:outline-none focus:border-blue-500 transition resize-none"
            onChange={handleChange} required
          ></textarea>

          {/* Submit Button */}
          <button 
            type="submit" disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white font-bold py-3.5 rounded-xl shadow-lg hover:shadow-blue-500/30 transition active:scale-95 disabled:opacity-50"
          >
            {loading ? "Uploading..." : "List Item Now"}
          </button>

        </form>
      </motion.div>
    </div>
  );
};

export default SellItem;