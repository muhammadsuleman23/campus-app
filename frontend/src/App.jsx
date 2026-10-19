import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Pages Imports
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import Signup from "./pages/Signup";
import VerifyOtp from "./pages/VerifyOtp";
import Dashboard from "./pages/Dashboard";
import Chatbot from "./pages/Chatbot";
import Marketplace from "./pages/Marketplace";
import SellItem from "./pages/SellItem";
import ProductDetail from "./pages/ProductDetail";
import LostFound from "./pages/LostFound";
import SkillSwap from "./pages/SkillSwap";
import SkillDetail from "./pages/SkillDetail";
import RoommateFinder from "./pages/RoommateFinder";
import RoommateDetail from "./pages/RoommateDetail";
import RideShare from "./pages/RideShare";
import RideDetail from "./pages/RideDetail";
import Notifications from "./pages/Notifications";
import Messages from "./pages/Messages";
import Profile from "./pages/Profile";
import Leaderboard from "./pages/Leaderboard";
import SearchResults from "./pages/SearchResults";
import AdminDashboard from "./pages/AdminDashboard";

function App() {
  return (
    <Router>
      <ToastContainer
        position="top-right"
        theme="dark"
        autoClose={3000}
        style={{ zIndex: 99999 }}
      />
      <Routes>
        {/* Authentication */}
        <Route path="/" element={<Login />} />
        <Route path="/login" element={<Login />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/verify-otp" element={<VerifyOtp />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/admin" element={<AdminDashboard />} />

        {/* AI & Communication */}
        <Route path="/chat" element={<Chatbot />} />
        <Route path="/notifications" element={<Notifications />} />
        <Route path="/messages" element={<Messages />} />
        <Route path="/profile/:id" element={<Profile />} />
        <Route path="/leaderboard" element={<Leaderboard />} />
        <Route path="/search" element={<SearchResults />} />

        {/* Marketplace */}
        <Route path="/marketplace" element={<Marketplace />} />
        <Route path="/sell" element={<SellItem />} />
        <Route path="/marketplace/:id" element={<ProductDetail />} />

        {/* Other Modules */}
        <Route path="/lost-found" element={<LostFound />} />
        <Route path="/skills" element={<SkillSwap />} />
        <Route path="/skills/:id" element={<SkillDetail />} />
        <Route path="/roommates" element={<RoommateFinder />} />
        <Route path="/roommates/:id" element={<RoommateDetail />} />

        {/* ✅ RIDE SHARE - MULTIPLE PATH FIX */}
        {/* Agar aap /rides ya /rideshare dono mein se koi bhi likhein ge, page khul jaye ga */}
        <Route path="/rideshare" element={<RideShare />} />
        <Route path="/rides" element={<Navigate to="/rideshare" replace />} />
        
        {/* Single Ride Detail */}
        <Route path="/ride/:id" element={<RideDetail />} />

      </Routes>
    </Router>
  );
}

export default App;