import { useEffect, useState } from "react";
import { FaTrash, FaCheckCircle, FaEyeSlash } from "react-icons/fa";
import { toast } from "react-toastify";
import API from "../api";

const MyAds = () => {
  const [myProducts, setMyProducts] = useState([]);

  // Apni Ads Mangwana
  const fetchMyAds = async () => {
    try {
      const { data } = await API.get("/products/my-ads");
      setMyProducts(data);
    } catch (error) {
      console.error("Error fetching my ads");
    }
  };

  useEffect(() => {
    fetchMyAds();
  }, []);

  // Delete Logic
  const handleDelete = async (id) => {
    if (!window.confirm("Are you sure you want to delete this ad?")) return;
    try {
      await API.delete(`/products/${id}`);
      toast.success("Ad Deleted!");
      fetchMyAds(); // List refresh karo
    } catch (error) {
      toast.error("Failed to delete");
    }
  };

  // Mark Sold Logic
  const handleMarkSold = async (id) => {
    try {
      await API.put(`/products/${id}/sold`);
      toast.success("Marked as Sold! (Hidden from Marketplace)");
      fetchMyAds(); // List refresh karo
    } catch (error) {
      toast.error("Failed to update");
    }
  };

  return (
    <div className="mt-10 bg-gray-50 p-6 rounded-2xl border border-gray-300">
      <h2 className="text-xl font-bold text-gray-900 mb-4 border-b border-gray-300 pb-2">My Listings</h2>
      
      {myProducts.length === 0 ? (
        <p className="text-gray-400">You haven't listed anything yet.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {myProducts.map((item) => (
            <div key={item._id} className={`flex justify-between items-center p-4 rounded-xl border ${item.isSold ? 'bg-gray-100/50 border-gray-300 opacity-75' : 'bg-white border-gray-300'}`}>
              
              <div className="flex items-center gap-4">
                <img 
                   src={item.images?.[0] || item.image} 
                   alt="img" 
                   className="w-16 h-16 rounded-lg object-cover" 
                />
                <div>
                  <h3 className="font-bold text-gray-900">{item.title}</h3>
                  <p className="text-sm text-green-600">Rs. {item.price}</p>
                  {item.isSold && <span className="text-xs bg-green-500 text-white px-2 py-0.5 rounded-full">SOLD OUT</span>}
                </div>
              </div>

              <div className="flex gap-2">
                {!item.isSold && (
                  <button 
                    onClick={() => handleMarkSold(item._id)}
                    className="p-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-600 hover:text-white transition"
                    title="Mark as Sold"
                  >
                    <FaCheckCircle />
                  </button>
                )}
                
                <button 
                  onClick={() => handleDelete(item._id)}
                  className="p-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-600 hover:text-white transition"
                  title="Delete Ad"
                >
                  <FaTrash />
                </button>
              </div>

            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyAds;