import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import { FaUser, FaEnvelope, FaLock, FaIdCard, FaUserGraduate, FaEye, FaEyeSlash, FaGift } from "react-icons/fa";
import API from "../api";

const Signup = () => {
  const [formData, setFormData] = useState({ name: "", email: "", universityId: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const ref = searchParams.get("ref"); // referral link: /signup?ref=<inviterUserId>

  const ALLOWED_EMAIL_DOMAIN = "mul.edu.pk";

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");

    // University email hi allow hai, backend bhejne se pehle turant check kar lo
    const domain = formData.email.split("@")[1]?.toLowerCase().trim();
    if (domain !== ALLOWED_EMAIL_DOMAIN) {
      setError(`Only @${ALLOWED_EMAIL_DOMAIN} email addresses are allowed to register.`);
      return;
    }

    try {
      // Backend ko data bheja
      const { data } = await API.post("/users/register", { ...formData, ref });
      // Registration ke baad seedha login nahi, pehle email verify karana hai
      navigate("/verify-otp", { state: { email: data.email || formData.email } });
    } catch (err) {
      setError(err.response?.data?.message || "Registration Failed! Email or ID might already exist.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">

      {/* Card */}
      <motion.div 
        initial={{ opacity: 0, x: -50 }} 
        animate={{ opacity: 1, x: 0 }} 
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md p-8 bg-white border border-gray-200 rounded-2xl shadow-sm"
      >
        <div className="text-center mb-6">
          <FaUserGraduate className="text-5xl text-blue-600 mx-auto mb-2" />
          <h2 className="text-3xl font-bold text-gray-900 tracking-wide">Join UniHub</h2>
          <p className="text-gray-500 text-sm">Create your Student Account</p>
        </div>

        {ref && (
          <div className="mb-4 flex items-center gap-2 bg-purple-50 border border-purple-200 text-purple-700 text-xs font-semibold px-3 py-2 rounded-xl">
            <FaGift /> You were invited by a friend — sign up to connect!
          </div>
        )}

        {error && <div className="bg-red-50 border border-red-200 text-red-700 p-2 rounded mb-4 text-center text-sm">{error}</div>}

        <form onSubmit={handleSignup} className="space-y-4">
          
          {/* Name */}
          <div className="relative">
            <FaUser className="absolute top-4 left-4 text-gray-400" />
            <input 
              name="name" type="text" placeholder="Full Name" required
              className="w-full pl-12 py-3 bg-white text-gray-900 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none placeholder-gray-400"
              onChange={handleChange}
            />
          </div>

          {/* Uni ID */}
          <div className="relative">
            <FaIdCard className="absolute top-4 left-4 text-gray-400" />
            <input 
              name="universityId" type="text" placeholder="University ID (e.g. F2023-112)" required
              className="w-full pl-12 py-3 bg-white text-gray-900 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none placeholder-gray-400"
              onChange={handleChange}
            />
          </div>

          {/* Email */}
          <div className="relative">
            <FaEnvelope className="absolute top-4 left-4 text-gray-400" />
            <input 
              name="email" type="email" placeholder="University Email (e.g. name@mul.edu.pk)" required
              pattern=".+@mul\.edu\.pk$"
              title="Only @mul.edu.pk email addresses are allowed"
              className="w-full pl-12 py-3 bg-white text-gray-900 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none placeholder-gray-400"
              onChange={handleChange}
            />
          </div>

          {/* Password */}
          <div className="relative">
            <FaLock className="absolute top-4 left-4 text-gray-400" />
            <input 
              name="password" type={showPassword ? "text" : "password"} placeholder="Password" required
              className="w-full pl-12 pr-12 py-3 bg-white text-gray-900 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 focus:outline-none placeholder-gray-400"
              onChange={handleChange}
            />
            <button
              type="button"
              onClick={() => setShowPassword((s) => !s)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
              tabIndex={-1}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
          </div>

          <motion.button 
            whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            type="submit" 
            className="w-full py-3 bg-blue-600 text-white font-bold rounded-xl shadow-sm hover:bg-blue-700 transition"
          >
            REGISTER
          </motion.button>
        </form>

        <p className="mt-6 text-center text-gray-500 text-sm">
          Already have an ID? 
          <Link to="/login" className="text-blue-600 hover:text-blue-700 font-bold ml-1 underline">Login</Link>
        </p>
      </motion.div>
    </div>
  );
};

export default Signup;
