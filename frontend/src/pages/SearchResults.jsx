import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { FaArrowLeft, FaBoxOpen, FaLightbulb, FaCar, FaUserFriends, FaSearch } from "react-icons/fa";
import API from "../api";
import { toast } from "react-toastify";

const SECTIONS = [
  { key: "products", label: "Marketplace", icon: FaBoxOpen, color: "text-blue-600 bg-blue-50 border-blue-100", path: (id) => `/marketplace/${id}` },
  { key: "skills", label: "Skill swap", icon: FaLightbulb, color: "text-purple-600 bg-purple-50 border-purple-100", path: (id) => `/skills/${id}` },
  { key: "rides", label: "Rides", icon: FaCar, color: "text-orange-600 bg-orange-50 border-orange-100", path: (id) => `/ride/${id}` },
  { key: "roommates", label: "Roommates", icon: FaUserFriends, color: "text-indigo-600 bg-indigo-50 border-indigo-100", path: (id) => `/roommates/${id}` },
];

const SearchResults = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQ = searchParams.get("q") || "";
  const [q, setQ] = useState(initialQ);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialQ) runSearch(initialQ);
    // eslint-disable-next-line
  }, [initialQ]);

  const runSearch = async (term) => {
    if (!term.trim()) return;
    setLoading(true);
    try {
      const { data } = await API.get(`/search?q=${encodeURIComponent(term)}`);
      setResults(data);
    } catch (error) {
      toast.error("Search failed");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setSearchParams({ q });
    runSearch(q);
  };

  const totalResults = results ? Object.values(results).reduce((sum, arr) => sum + arr.length, 0) : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/40 to-blue-50 text-gray-900 font-sans pb-20">
      <div className="max-w-3xl mx-auto px-4 md:px-6 pt-6">
        <button onClick={() => navigate("/dashboard")} className="mb-6 flex items-center gap-2 text-gray-500 hover:text-gray-900 transition px-4 py-2 bg-white shadow-sm rounded-full w-fit">
          <FaArrowLeft /> Dashboard
        </button>

        <form onSubmit={handleSubmit} className="flex gap-2 mb-8">
          <div className="relative flex-1">
            <FaSearch className="absolute top-1/2 left-4 -translate-y-1/2 text-gray-400" />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search marketplace, skills, rides, roommates..."
              className="w-full pl-11 pr-4 py-3.5 bg-white border border-gray-200 rounded-2xl shadow-sm outline-none focus:border-purple-400 transition"
            />
          </div>
          <button type="submit" className="px-6 py-3.5 rounded-2xl bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold shadow-sm hover:opacity-90 transition">Search</button>
        </form>

        {loading && <div className="text-center text-gray-400 py-10">Searching...</div>}

        {!loading && results && totalResults === 0 && (
          <div className="text-center text-gray-400 py-10">No results for "{initialQ}"</div>
        )}

        {!loading && results && SECTIONS.map(({ key, label, icon: Icon, color, path }) => {
          const items = results[key] || [];
          if (items.length === 0) return null;
          return (
            <motion.div key={key} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wide mb-3">{label}</h3>
              <div className="space-y-2">
                {items.map((item) => (
                  <div key={item._id} onClick={() => navigate(path(item._id))} className={`flex items-center gap-3 p-4 rounded-2xl border cursor-pointer hover:shadow-md transition bg-white ${color}`}>
                    <div className="w-10 h-10 rounded-xl bg-white/70 flex items-center justify-center text-lg shrink-0"><Icon /></div>
                    <div className="overflow-hidden flex-1">
                      <p className="font-bold text-gray-900 truncate">{item.title}</p>
                      <p className="text-xs opacity-70 truncate">by {item.ownerName || "a student"}</p>
                    </div>
                    {item.price != null && <span className="font-bold shrink-0">Rs. {item.price}</span>}
                  </div>
                ))}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default SearchResults;
