import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  FaUsers, FaShoppingBag, FaCar, FaBolt, FaUserFriends,
  FaSearchLocation, FaTrash, FaCheckCircle, FaTimesCircle,
  FaArrowLeft, FaShieldAlt, FaUserShield
} from "react-icons/fa";
import { toast } from "react-toastify";
import API from "../api";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell,
} from "recharts";

const PIE_COLORS = ["#3b82f6", "#a855f7", "#f97316", "#6366f1", "#10b981"];

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [me, setMe] = useState(null);
  const [stats, setStats] = useState(null);
  const [signupTrend, setSignupTrend] = useState([]);
  const [categoryBreakdown, setCategoryBreakdown] = useState([]);
  const [users, setUsers] = useState([]);
  const [tab, setTab] = useState("users"); // users | listings
  const [listingType, setListingType] = useState("products");
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);

  // Guard: only admins may view this page
  useEffect(() => {
    const u = JSON.parse(localStorage.getItem("userInfo") || "null");
    if (!u) { navigate("/"); return; }
    if (!u.isAdmin) { toast.error("Admins only."); navigate("/dashboard"); return; }
    setMe(u);
  }, [navigate]);

  const loadStats = async () => {
    try { const { data } = await API.get("/admin/stats"); setStats(data); }
    catch { toast.error("Could not load stats."); }
  };

  const loadCharts = async () => {
    try {
      const [{ data: trend }, { data: categories }] = await Promise.all([
        API.get("/admin/stats/signups?days=14"),
        API.get("/admin/stats/categories"),
      ]);
      setSignupTrend(trend);
      setCategoryBreakdown(categories.filter((c) => c.value > 0));
    } catch { /* charts are a bonus — don't block the rest of the page */ }
  };

  const loadUsers = async () => {
    try { const { data } = await API.get("/admin/users"); setUsers(data); }
    catch { toast.error("Could not load users."); }
  };

  const listingEndpoints = {
    products: "/products",
    rides: "/rides",
    skills: "/skills",
    roommates: "/roommates",
    "lost-items": "/lost-found",
  };

  const loadListings = async (type) => {
    try {
      const { data } = await API.get(listingEndpoints[type]);
      setListings(data);
    } catch { toast.error("Could not load listings."); }
  };

  useEffect(() => {
    if (!me) return;
    (async () => {
      setLoading(true);
      await Promise.all([loadStats(), loadUsers(), loadCharts()]);
      setLoading(false);
    })();
  }, [me]);

  useEffect(() => {
    if (me && tab === "listings") loadListings(listingType);
  }, [me, tab, listingType]);

  const deleteUser = async (id, name) => {
    if (!window.confirm(`Delete user "${name}"? This also removes all their listings.`)) return;
    try {
      await API.delete(`/admin/users/${id}`);
      toast.success("User deleted.");
      setUsers((prev) => prev.filter((u) => u._id !== id));
      loadStats();
    } catch (e) {
      toast.error(e.response?.data?.message || "Delete failed.");
    }
  };

  const toggleVerify = async (u) => {
    try {
      const { data } = await API.put(`/admin/users/${u._id}/verify`, { value: !u.isVerified });
      setUsers((prev) => prev.map((x) => (x._id === u._id ? data : x)));
      toast.success(data.isVerified ? "User verified." : "Verification removed.");
    } catch (e) { toast.error(e.response?.data?.message || "Update failed."); }
  };

  const toggleAdmin = async (u) => {
    try {
      const { data } = await API.put(`/admin/users/${u._id}/admin`, { value: !u.isAdmin });
      setUsers((prev) => prev.map((x) => (x._id === u._id ? data : x)));
      toast.success(data.isAdmin ? "Promoted to admin." : "Admin rights removed.");
    } catch (e) { toast.error(e.response?.data?.message || "Update failed."); }
  };

  const deleteListing = async (id) => {
    if (!window.confirm("Delete this listing permanently?")) return;
    try {
      await API.delete(`/admin/${listingType}/${id}`);
      toast.success("Listing deleted.");
      setListings((prev) => prev.filter((l) => l._id !== id));
      loadStats();
    } catch (e) {
      toast.error(e.response?.data?.message || "Delete failed.");
    }
  };

  // Where a listing row should take you when clicked (view its real page).
  // Lost & Found items don't have their own detail page, so those go to the list.
  const detailRoute = (type, id) => {
    const routes = {
      products: `/marketplace/${id}`,
      rides: `/ride/${id}`,
      skills: `/skills/${id}`,
      roommates: `/roommates/${id}`,
      "lost-items": `/lost-found`,
    };
    return routes[type] || null;
  };

  const statCards = stats ? [
    { label: "Users", value: stats.users, icon: <FaUsers />, tint: "text-purple-700", tab: "users" },
    { label: "Listings", value: stats.products, icon: <FaShoppingBag />, tint: "text-cyan-700", tab: "listings", listingType: "products" },
    { label: "Rides", value: stats.rides, icon: <FaCar />, tint: "text-orange-700", tab: "listings", listingType: "rides" },
    { label: "Skills", value: stats.skills, icon: <FaBolt />, tint: "text-yellow-700", tab: "listings", listingType: "skills" },
    { label: "Roommates", value: stats.roommates, icon: <FaUserFriends />, tint: "text-pink-700", tab: "listings", listingType: "roommates" },
    { label: "Lost & Found", value: stats.lostItems, icon: <FaSearchLocation />, tint: "text-emerald-700", tab: "listings", listingType: "lost-items" },
  ] : [];

  const listingTabs = [
    ["products", "Listings"], ["rides", "Rides"], ["skills", "Skills"],
    ["roommates", "Roommates"], ["lost-items", "Lost & Found"],
  ];

  const titleOf = (l) =>
    l.title || (l.origin ? `${l.origin} → ${l.destination}` : null) || l.type || "Untitled";
  const ownerOf = (l) =>
    (l.seller && l.seller.name) || (l.driver && l.driver.name) ||
    (l.user && l.user.name) || "—";

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans relative pb-24 overflow-hidden">
      <div className="fixed inset-0 z-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[15%] w-[500px] h-[500px] bg-purple-100/60 rounded-full blur-[120px] opacity-60 animate-pulse" />
        <div className="absolute bottom-[-10%] right-[10%] w-[600px] h-[600px] bg-rose-100/50 rounded-full blur-[120px] opacity-50" />
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8 relative z-10">
        <div className="flex justify-between items-center bg-gray-50 backdrop-blur-xl border border-gray-200 p-4 rounded-2xl mb-8">
          <div className="flex items-center gap-3 pl-2">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-rose-500 to-purple-600 flex items-center justify-center text-xl shadow-[0_0_15px_rgba(244,63,94,0.4)]">
              <FaShieldAlt />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">Admin Control</h1>
              <p className="text-[10px] text-gray-400 uppercase tracking-widest font-semibold">
                UniHub Moderation
              </p>
            </div>
          </div>
          <button
            onClick={() => navigate("/dashboard")}
            className="flex items-center gap-2 px-5 py-2 rounded-full bg-gray-100 border border-gray-200 hover:bg-gray-200 transition text-sm font-medium text-gray-700"
          >
            <FaArrowLeft size={12} /> Back to app
          </button>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-8">
          {statCards.map((c, i) => (
            <motion.div
              key={c.label}
              initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => {
                setTab(c.tab);
                if (c.listingType) setListingType(c.listingType);
                document.getElementById("admin-tab-section")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="bg-gray-50 border border-gray-200 p-4 rounded-2xl backdrop-blur-sm cursor-pointer hover:border-purple-300 hover:shadow-md transition"
            >
              <div className={`text-lg mb-2 ${c.tint}`}>{c.icon}</div>
              <div className="text-2xl font-bold">{loading ? "…" : c.value}</div>
              <div className="text-[10px] text-gray-400 uppercase tracking-wider mt-1">{c.label}</div>
            </motion.div>
          ))}
        </div>

        {/* ANALYTICS */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-8">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="lg:col-span-2 bg-white border border-gray-200 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-gray-700 mb-4">Signups — last 14 days</h3>
            {signupTrend.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-gray-300 text-sm">No data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <AreaChart data={signupTrend} margin={{ left: -20, right: 10 }}>
                  <defs>
                    <linearGradient id="signupFill" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#7c3aed" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f1f4" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #eee", fontSize: 12 }} />
                  <Area type="monotone" dataKey="count" stroke="#7c3aed" strokeWidth={2} fill="url(#signupFill)" name="Signups" />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="bg-white border border-gray-200 rounded-2xl p-5">
            <h3 className="text-sm font-bold text-gray-700 mb-4">Active listings by category</h3>
            {categoryBreakdown.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-gray-300 text-sm">No data yet</div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={categoryBreakdown} dataKey="value" nameKey="name" innerRadius={45} outerRadius={70} paddingAngle={3}>
                    {categoryBreakdown.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #eee", fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            )}
            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2 justify-center">
              {categoryBreakdown.map((c, i) => (
                <span key={c.name} className="flex items-center gap-1.5 text-[10px] text-gray-500 font-medium">
                  <span className="w-2 h-2 rounded-full" style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}></span>
                  {c.name} ({c.value})
                </span>
              ))}
            </div>
          </motion.div>
        </div>

        <div id="admin-tab-section" className="flex gap-2 mb-5 scroll-mt-6">
          {["users", "listings"].map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2 rounded-full text-sm font-semibold transition border ${
                tab === t
                  ? "bg-purple-600/80 border-purple-400 text-white"
                  : "bg-gray-50 border-gray-200 text-gray-400 hover:text-gray-900"
              }`}
            >
              {t === "users" ? "Users" : "Listings"}
            </button>
          ))}
        </div>

        {tab === "users" && (
          <div className="bg-gray-50 border border-gray-200 rounded-2xl overflow-hidden backdrop-blur-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-400 text-xs uppercase tracking-wider">
                  <tr>
                    <th className="text-left px-5 py-3">Name</th>
                    <th className="text-left px-5 py-3">Email</th>
                    <th className="text-left px-5 py-3">Uni ID</th>
                    <th className="text-center px-5 py-3">Verified</th>
                    <th className="text-center px-5 py-3">Admin</th>
                    <th className="text-right px-5 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u._id} className="border-t border-gray-200 hover:bg-gray-50">
                      <td className="px-5 py-3 font-medium">{u.name}</td>
                      <td className="px-5 py-3 text-gray-400">{u.email}</td>
                      <td className="px-5 py-3 text-gray-400">{u.universityId}</td>
                      <td className="px-5 py-3 text-center">
                        <button onClick={() => toggleVerify(u)} title="Toggle verified">
                          {u.isVerified
                            ? <FaCheckCircle className="text-emerald-600 mx-auto" />
                            : <FaTimesCircle className="text-gray-600 mx-auto hover:text-gray-400" />}
                        </button>
                      </td>
                      <td className="px-5 py-3 text-center">
                        <button onClick={() => toggleAdmin(u)} title="Toggle admin"
                          className={u.isAdmin ? "text-purple-700" : "text-gray-600 hover:text-gray-400"}>
                          <FaUserShield className="mx-auto" />
                        </button>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <button
                          onClick={() => deleteUser(u._id, u.name)}
                          disabled={me && me._id === u._id}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-50 transition disabled:opacity-30 disabled:cursor-not-allowed text-xs"
                        >
                          <FaTrash size={11} /> Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {!loading && users.length === 0 && (
                    <tr><td colSpan="6" className="px-5 py-10 text-center text-gray-500">No users yet.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === "listings" && (
          <>
            <div className="flex flex-wrap gap-2 mb-4">
              {listingTabs.map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setListingType(key)}
                  className={`px-4 py-1.5 rounded-full text-xs font-semibold transition border ${
                    listingType === key
                      ? "bg-cyan-600/70 border-cyan-400 text-white"
                      : "bg-gray-50 border-gray-200 text-gray-400 hover:text-gray-900"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <div className="bg-gray-50 border border-gray-200 rounded-2xl overflow-hidden backdrop-blur-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50 text-gray-400 text-xs uppercase tracking-wider">
                    <tr>
                      <th className="text-left px-5 py-3">Title</th>
                      <th className="text-left px-5 py-3">Owner</th>
                      <th className="text-right px-5 py-3">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {listings.map((l) => (
                      <tr
                        key={l._id}
                        onClick={() => {
                          const route = detailRoute(listingType, l._id);
                          if (route) navigate(route);
                        }}
                        className="border-t border-gray-200 hover:bg-gray-100 cursor-pointer transition"
                      >
                        <td className="px-5 py-3 font-medium">{titleOf(l)}</td>
                        <td className="px-5 py-3 text-gray-400">{ownerOf(l)}</td>
                        <td className="px-5 py-3 text-right">
                          <button
                            onClick={(e) => { e.stopPropagation(); deleteListing(l._id); }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 transition text-xs"
                          >
                            <FaTrash size={11} /> Remove
                          </button>
                        </td>
                      </tr>
                    ))}
                    {listings.length === 0 && (
                      <tr><td colSpan="3" className="px-5 py-10 text-center text-gray-500">Nothing here.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminDashboard;