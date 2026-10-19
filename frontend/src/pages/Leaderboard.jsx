import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FaArrowLeft, FaTrophy, FaStar, FaShieldAlt } from "react-icons/fa";
import API from "../api";
import { toast } from "react-toastify";
import { gradientFor, initials } from "../utils/avatar";
import Avatar from "../components/Avatar";

const MEDAL = ["text-amber-500", "text-gray-400", "text-orange-600"]; // gold, silver, bronze

const Leaderboard = () => {
  const navigate = useNavigate();
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await API.get("/users/leaderboard/top?limit=20");
        setLeaders(data);
      } catch (error) {
        toast.error("Couldn't load the leaderboard");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-purple-50/40 to-blue-50 text-gray-900 font-sans pb-20">
      <div className="max-w-2xl mx-auto px-4 md:px-6 pt-6">
        <button onClick={() => navigate(-1)} className="mb-6 flex items-center gap-2 text-gray-500 hover:text-gray-900 transition px-4 py-2 bg-white shadow-sm rounded-full w-fit">
          <FaArrowLeft /> Back
        </button>

        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white text-2xl mx-auto mb-4 shadow-lg">
            <FaTrophy />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Top rated students</h1>
          <p className="text-gray-500 text-sm mt-1">Ranked by average rating from real profile reviews</p>
        </motion.div>

        {loading ? (
          <div className="text-center text-gray-400 py-10">Loading...</div>
        ) : leaders.length === 0 ? (
          <div className="text-center text-gray-400 py-10">No rated students yet — be the first to leave a review!</div>
        ) : (
          <div className="space-y-3">
            {leaders.map((leader, i) => (
              <motion.div
                key={leader._id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => navigate(`/profile/${leader._id}`)}
                className="bg-white border border-gray-100 rounded-2xl p-4 flex items-center gap-4 shadow-sm hover:shadow-md hover:border-purple-200 transition cursor-pointer"
              >
                <div className={`w-8 text-center font-bold ${i < 3 ? MEDAL[i] : "text-gray-300"}`}>
                  {i < 3 ? <FaTrophy /> : `#${i + 1}`}
                </div>
                <Avatar userId={leader._id} name={leader.name} avatar={leader.avatar} size="w-11 h-11" />
                <div className="flex-1 overflow-hidden">
                  <p className="font-bold text-gray-900 truncate">{leader.name}</p>
                  <p className="text-xs text-gray-400">{leader.numReviews} review{leader.numReviews === 1 ? "" : "s"}</p>
                </div>
                <div className="flex items-center gap-1 text-amber-600 font-bold shrink-0">
                  <FaStar /> {leader.rating.toFixed(1)}
                </div>
                <div className="flex items-center gap-1 text-blue-600 text-xs font-semibold shrink-0 bg-blue-50 border border-blue-100 px-2 py-1 rounded-full">
                  <FaShieldAlt size={10} /> {leader.trustScore}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Leaderboard;
