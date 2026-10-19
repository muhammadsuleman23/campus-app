import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion"; 
import { FaGraduationCap, FaLock, FaEnvelope, FaEye, FaEyeSlash } from "react-icons/fa"; // New Icons
import API from "../api"; 

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    try {
      const { data } = await API.post("/users/login", { email, password });
      localStorage.setItem("token", data.token);
      localStorage.setItem("userInfo", JSON.stringify(data));
      navigate("/dashboard");
    } catch (err) {
      if (err.response?.data?.needsVerification) {
        navigate("/verify-otp", { state: { email: err.response.data.email || email } });
        return;
      }
      setError(err.response?.data?.message || "Login Failed! Email/Password check karein.");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">

      {/* Card */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.9 }} 
        animate={{ opacity: 1, scale: 1 }} 
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-md p-8 bg-white border border-gray-200 rounded-2xl shadow-sm"
      >
        
        {/* Logo */}
        <div className="flex flex-col items-center mb-6">
          <div className="bg-blue-600 p-4 rounded-full shadow-sm mb-3">
            <FaGraduationCap className="text-white text-4xl" />
          </div>
          <h2 className="text-4xl font-extrabold text-gray-900 tracking-wide">
            UniHub
          </h2>
          <p className="text-gray-500 text-sm mt-1">Smart Campus Solution</p>
        </div>

        {error && <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg mb-4 text-center text-sm font-semibold">{error}</div>}

        <form onSubmit={handleLogin} className="space-y-5">
          
          {/* Email Input with Icon */}
          <div className="relative">
            <FaEnvelope className="absolute top-4 left-4 text-gray-400" />
            <input 
              type="email" 
              required
              className="w-full pl-12 pr-4 py-3 bg-white text-gray-900 border border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition-all placeholder-gray-400"
              placeholder="University Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          {/* Password Input with Icon */}
          <div className="relative">
            <FaLock className="absolute top-4 left-4 text-gray-400" />
            <input 
              type={showPassword ? "text" : "password"} 
              required
              className="w-full pl-12 pr-12 py-3 bg-white text-gray-900 border border-gray-300 rounded-xl focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500 transition-all placeholder-gray-400"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
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

          <div className="text-right -mt-2">
            <Link to="/forgot-password" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
              Forgot password?
            </Link>
          </div>

          <motion.button 
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            type="submit" 
            className="w-full py-3.5 bg-blue-600 text-white font-bold rounded-xl shadow-sm hover:bg-blue-700 transition duration-300 uppercase tracking-wider"
          >
            Access Portal
          </motion.button>
        </form>

        <p className="mt-8 text-center text-gray-500 text-sm">
          New Student? 
          <Link to="/signup" className="text-blue-600 hover:text-blue-700 font-semibold ml-1 underline decoration-blue-400 decoration-2 underline-offset-4 transition-colors">
            Register Here
          </Link>
        </p>
      </motion.div>
    </div>
  );
};

export default Login;