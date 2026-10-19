import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  FaCar, FaPlus, FaSearch, FaEllipsisV, FaTrash, FaEdit, 
  FaCircle, FaTimes, FaMapMarkerAlt, FaCalendarAlt, FaClock, FaUsers, FaArrowLeft,
  FaLocationArrow, FaRoute
} from "react-icons/fa";
import API from "../api";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "react-toastify";

const RideShare = () => {
  const [rides, setRides] = useState([]);
  const [view, setView] = useState("browse"); 
  const [filter, setFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [locating, setLocating] = useState(false);   // fetching GPS / reverse geocoding
  const [calculatingEta, setCalculatingEta] = useState(false);

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [rideType, setRideType] = useState("offer"); 
  const [editMode, setEditMode] = useState(false);
  const [editId, setEditId] = useState(null);
  const [activeMenu, setActiveMenu] = useState(null);

  const [formData, setFormData] = useState({
    origin: "", destination: "", date: "", time: "", seats: 1, price: "", vehicle: "Car", contact: "", description: "",
    originLat: null, originLng: null, destinationLat: null, destinationLng: null,
    distanceKm: null, durationMins: null, arrivalTime: null,
  });

  const navigate = useNavigate();

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("userInfo"));
    if (user) setCurrentUser(user);
    fetchRides();
  }, []);

  const fetchRides = async () => {
    try {
      const { data } = await API.get("/rides");
      setRides(data);
    } catch (error) { toast.error("Error loading rides"); }
    finally { setLoading(false); }
  };

  // --- EDIT HANDLER (Marketplace Style) ---
  const handleEditClick = (ride) => {
    setEditMode(true);
    setEditId(ride._id);
    setRideType(ride.type);
    setFormData({
      origin: ride.origin,
      destination: ride.destination,
      date: ride.date ? ride.date.split('T')[0] : "", // Date format fix
      time: ride.time,
      seats: ride.seats,
      price: ride.price,
      vehicle: ride.vehicle,
      contact: ride.contact,
      description: ride.description || "",
      originLat: ride.originLat ?? null,
      originLng: ride.originLng ?? null,
      destinationLat: ride.destinationLat ?? null,
      destinationLng: ride.destinationLng ?? null,
      distanceKm: ride.distanceKm ?? null,
      durationMins: ride.durationMins ?? null,
      arrivalTime: ride.arrivalTime ?? null,
    });
    setIsModalOpen(true);
    setActiveMenu(null);
  };

  const resetForm = () => {
    setFormData({
      origin: "", destination: "", date: "", time: "", seats: 1, price: "", vehicle: "Car", contact: "", description: "",
      originLat: null, originLng: null, destinationLat: null, destinationLng: null,
      distanceKm: null, durationMins: null, arrivalTime: null,
    });
    setEditMode(false);
    setEditId(null);
    setRideType("offer");
  };

  // 📍 "Use current location" — pulls the browser's GPS position, then asks
  // the backend to turn it into a readable address (reverse geocoding).
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      toast.error("Your browser doesn't support location access");
      return;
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const { data } = await API.get(`/geo/reverse?lat=${latitude}&lng=${longitude}`);
          setFormData((f) => ({ ...f, origin: data.address, originLat: latitude, originLng: longitude, arrivalTime: null }));
          toast.success("Current location added!");
        } catch (error) {
          toast.error(error.response?.data?.message || "Couldn't figure out your address");
        } finally {
          setLocating(false);
        }
      },
      () => { toast.error("Location permission denied"); setLocating(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // 🧭 "Calculate arrival time" — geocodes origin/destination (whichever
  // don't already have coordinates) then asks OSRM for the real driving
  // route duration, so the ETA reflects actual roads, not a straight line.
  const handleCalculateEta = async () => {
    if (!formData.origin || !formData.destination) {
      toast.error("Fill in both origin and destination first");
      return;
    }
    if (!formData.date || !formData.time) {
      toast.error("Pick a date and time first — the ETA is calculated from your departure time");
      return;
    }
    setCalculatingEta(true);
    try {
      let { originLat, originLng, destinationLat, destinationLng } = formData;

      if (!originLat || !originLng) {
        const { data } = await API.get(`/geo/geocode?q=${encodeURIComponent(formData.origin)}`);
        originLat = data.lat; originLng = data.lng;
      }
      if (!destinationLat || !destinationLng) {
        const { data } = await API.get(`/geo/geocode?q=${encodeURIComponent(formData.destination)}`);
        destinationLat = data.lat; destinationLng = data.lng;
      }

      const { data: routeData } = await API.get(
        `/geo/route?originLat=${originLat}&originLng=${originLng}&destLat=${destinationLat}&destLng=${destinationLng}`
      );

      const departure = new Date(`${formData.date}T${formData.time}`);
      const arrival = new Date(departure.getTime() + routeData.durationMins * 60000);

      setFormData((f) => ({
        ...f,
        originLat, originLng, destinationLat, destinationLng,
        distanceKm: routeData.distanceKm,
        durationMins: routeData.durationMins,
        arrivalTime: arrival.toISOString(),
      }));
      toast.success(`ETA calculated: ${routeData.durationMins} min drive`);
    } catch (error) {
      toast.error(error.response?.data?.message || "Couldn't calculate the route. Try more specific addresses.");
    } finally {
      setCalculatingEta(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editMode) {
        await API.put(`/rides/${editId}`, { ...formData, type: rideType });
        toast.success("Ride Updated!");
      } else {
        await API.post("/rides", { ...formData, type: rideType });
        toast.success("Ride Posted!");
      }
      setIsModalOpen(false);
      fetchRides();
      resetForm();
    } catch (error) { toast.error("Action failed"); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm("Delete this ride?")) return;
    try {
      await API.delete(`/rides/${id}`);
      fetchRides();
      toast.success("Deleted");
    } catch (error) { toast.error("Delete failed"); }
  };

  const filteredRides = rides.filter(r => {
    const matchesSearch = r.destination.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          r.origin.toLowerCase().includes(searchTerm.toLowerCase());
    const isMyRide = view === "myRides" ? r.driver?._id === currentUser?._id : true;
    const matchesType = filter === "all" ? true : r.type === filter;
    return matchesSearch && isMyRide && matchesType;
  });

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans p-6 overflow-hidden" onClick={() => setActiveMenu(null)}>
      <div className="max-w-7xl mx-auto relative z-10">
        
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-4">
             <button onClick={() => navigate("/dashboard")} className="p-3 bg-gray-50 rounded-full hover:bg-gray-100 transition border border-gray-200"><FaArrowLeft className="text-blue-500" /></button>
             <h1 className="text-2xl font-bold">Ride Share</h1>
          </div>
          <div className="bg-gray-50 p-1 rounded-xl border border-gray-200 flex gap-2">
            <button onClick={() => setView("browse")} className={`px-6 py-2 rounded-lg text-sm font-bold transition ${view === "browse" ? "bg-blue-600 shadow-lg shadow-blue-900/20" : "text-gray-400"}`}>Browse</button>
            <button onClick={() => setView("myRides")} className={`px-6 py-2 rounded-lg text-sm font-bold transition ${view === "myRides" ? "bg-blue-600 shadow-lg shadow-blue-900/20" : "text-gray-400"}`}>My Rides</button>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="relative mb-8">
          <FaSearch className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-500" />
          <input type="text" placeholder="Search destination..." className="w-full bg-white border border-gray-200 rounded-2xl py-4 pl-14 pr-6 outline-none focus:border-gray-300 transition" onChange={(e) => setSearchTerm(e.target.value)} />
        </div>

        <div className="flex gap-3 mb-10 overflow-x-auto pb-2 scrollbar-hide">
          {["all", "offer", "request"].map((cat) => (
            <button key={cat} onClick={() => setFilter(cat)} className={`px-6 py-2.5 rounded-full text-xs font-bold uppercase tracking-wider transition border ${filter === cat ? "bg-cyan-500 border-cyan-400 text-black shadow-lg shadow-cyan-900/20" : "bg-gray-50 border-gray-200 text-gray-400"}`}>
              {cat === "all" ? "All Rides" : cat === "offer" ? "Offers" : "Requests"}
            </button>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <AnimatePresence mode="popLayout">
            {filteredRides.map((ride) => (
              <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} key={ride._id} className={`bg-white border border-gray-200 rounded-[2rem] p-6 relative group hover:border-gray-300 transition-all ${ride.isCompleted ? "opacity-60" : ""}`}>
                
                {ride.isCompleted && (
                  <span className="absolute top-5 left-5 z-20 bg-green-600 text-white text-[10px] font-bold px-3 py-1 rounded-full shadow-lg">COMPLETED</span>
                )}
                {view === "myRides" && (
                  <div className="absolute top-5 right-5 z-20" onClick={(e) => e.stopPropagation()}>
                    <button onClick={() => setActiveMenu(activeMenu === ride._id ? null : ride._id)} className="p-2 text-gray-500 hover:text-gray-900 transition bg-gray-50 rounded-full"><FaEllipsisV /></button>
                    {activeMenu === ride._id && (
                      <div className="absolute right-0 mt-2 w-36 bg-white border border-gray-200 rounded-xl shadow-2xl p-2 z-30">
                        <button onClick={() => handleEditClick(ride)} className="w-full flex items-center gap-2 text-xs p-3 hover:bg-gray-50 rounded-lg text-blue-600 font-bold"><FaEdit /> Edit</button>
                        <button onClick={() => handleDelete(ride._id)} className="w-full flex items-center gap-2 text-xs p-3 hover:bg-gray-50 rounded-lg text-red-600 font-bold"><FaTrash /> Delete</button>
                      </div>
                    )}
                  </div>
                )}

                <div onClick={() => navigate(`/ride/${ride._id}`)} className="cursor-pointer">
                  <div className="flex justify-between items-center mb-6">
                    <span className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase border ${ride.type === 'offer' ? 'bg-green-50 text-green-600 border-green-500/20' : 'bg-orange-50 text-orange-600 border-orange-500/20'}`}>{ride.type}</span>
                    <span className="text-green-600 font-bold bg-green-50 px-3 py-1 rounded-lg border border-green-500/20">Rs. {ride.price}</span>
                  </div>
                  
                  <div className="flex items-center justify-between gap-4 mb-8 px-2">
                    <div className="flex flex-col items-center"><div className="w-2.5 h-2.5 bg-gray-500 rounded-full"></div><p className="text-[10px] text-gray-500 mt-1 uppercase font-bold">From</p></div>
                    <div className="flex-1 border-t border-dashed border-gray-300 relative"><FaCar className="absolute -top-2 left-1/2 -translate-x-1/2 text-blue-500 text-xs opacity-50" /></div>
                    <div className="flex flex-col items-center text-right"><div className="w-2.5 h-2.5 bg-blue-500 rounded-full shadow-[0_0_8px_#3b82f6]"></div><p className="text-[10px] text-blue-500 mt-1 uppercase font-bold">To</p></div>
                  </div>

                  <div className="flex justify-between items-start mb-6 px-1">
                    <h3 className="text-sm font-bold text-gray-600 w-[45%] truncate">{ride.origin}</h3>
                    <h3 className="text-sm font-bold text-gray-900 w-[45%] text-right truncate">{ride.destination}</h3>
                  </div>

                  <div className="bg-gray-50 rounded-2xl p-3 flex justify-between items-center text-[10px] text-gray-500 border border-gray-200">
                    <p className="flex items-center gap-2"><FaCircle className={`text-[6px] ${ride.type === 'offer' ? 'text-green-500' : 'text-orange-500'} animate-pulse`} /> {ride.seats} {ride.type === 'offer' ? 'Seats Left' : 'Seats Needed'}</p>
                    <p>{new Date(ride.date).toLocaleDateString()}</p>
                  </div>
                  {ride.arrivalTime && (
                    <div className="mt-2 flex items-center justify-center gap-1.5 text-[10px] font-bold text-blue-600 bg-blue-50 border border-blue-100 rounded-xl py-2">
                      <FaRoute size={10} /> ETA {new Date(ride.arrivalTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      {ride.distanceKm ? ` · ${ride.distanceKm} km` : ""}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>

        {/* Modal Overlay */}
        <AnimatePresence>
          {isModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => { setIsModalOpen(false); resetForm(); }} className="absolute inset-0 bg-black/80 backdrop-blur-md" />
              <motion.div initial={{ scale: 0.9, y: 50 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 50 }} className="relative bg-white border border-gray-200 w-full max-w-lg rounded-[2.5rem] overflow-hidden shadow-2xl">
                
                {/* 2 Tabs */}
                <div className="flex border-b border-gray-200">
                  <button onClick={() => setRideType("offer")} className={`flex-1 py-5 font-bold text-sm transition-all ${rideType === "offer" ? "bg-blue-600 text-white" : "text-gray-500 hover:text-gray-600"}`}>Offer a Ride</button>
                  <button onClick={() => setRideType("request")} className={`flex-1 py-5 font-bold text-sm transition-all ${rideType === "request" ? "bg-blue-600 text-white" : "text-gray-500 hover:text-gray-600"}`}>Request a Ride</button>
                </div>

                <form onSubmit={handleSubmit} className="p-8 space-y-4 max-h-[75vh] overflow-y-auto custom-scrollbar">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-500 font-bold ml-2 flex items-center justify-between">
                        ORIGIN
                        <button type="button" onClick={handleUseCurrentLocation} disabled={locating} className="flex items-center gap-1 text-blue-600 normal-case font-semibold disabled:opacity-50">
                          <FaLocationArrow size={9} /> {locating ? "Locating..." : "Use current"}
                        </button>
                      </label>
                      <input type="text" placeholder="Pickup point" required className="w-full bg-gray-50 border border-gray-200 p-4 rounded-2xl outline-none focus:border-blue-500 transition" value={formData.origin} onChange={(e) => setFormData({...formData, origin: e.target.value, originLat: null, originLng: null, arrivalTime: null})} />
                    </div>
                    <div className="space-y-1"><label className="text-[10px] text-gray-500 font-bold ml-2">DESTINATION</label><input type="text" placeholder="Drop point" required className="w-full bg-gray-50 border border-gray-200 p-4 rounded-2xl outline-none focus:border-blue-500 transition" value={formData.destination} onChange={(e) => setFormData({...formData, destination: e.target.value, destinationLat: null, destinationLng: null, arrivalTime: null})} /></div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1"><label className="text-[10px] text-gray-500 font-bold ml-2">DATE</label><input type="date" required className="w-full bg-gray-50 border border-gray-200 p-4 rounded-2xl outline-none text-gray-400" value={formData.date} onChange={(e) => setFormData({...formData, date: e.target.value, arrivalTime: null})} /></div>
                    <div className="space-y-1"><label className="text-[10px] text-gray-500 font-bold ml-2">TIME</label><input type="time" required className="w-full bg-gray-50 border border-gray-200 p-4 rounded-2xl outline-none text-gray-400" value={formData.time} onChange={(e) => setFormData({...formData, time: e.target.value, arrivalTime: null})} /></div>
                  </div>

                  {/* ETA calculator */}
                  <div className="bg-blue-50/60 border border-blue-100 rounded-2xl p-4">
                    <button type="button" onClick={handleCalculateEta} disabled={calculatingEta} className="w-full flex items-center justify-center gap-2 text-sm font-bold text-blue-700 disabled:opacity-50">
                      <FaRoute /> {calculatingEta ? "Calculating real route..." : "Calculate arrival time"}
                    </button>
                    {formData.arrivalTime && (
                      <div className="mt-3 flex items-center justify-center gap-4 text-xs text-gray-600 font-semibold">
                        <span>🛣️ {formData.distanceKm} km</span>
                        <span>⏱️ {formData.durationMins} min drive</span>
                        <span>🏁 ETA {new Date(formData.arrivalTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-500 font-bold ml-2">VEHICLE</label>
                      <select className="w-full bg-gray-50 border border-gray-200 p-4 rounded-2xl outline-none text-gray-400" value={formData.vehicle} onChange={(e) => setFormData({...formData, vehicle: e.target.value})}>
                        <option value="Car">🚗 Car</option>
                        <option value="Bike">🏍️ Bike</option>
                        <option value="Rickshaw">🛺 Rickshaw</option>
                        <option value="Bus">🚌 Bus</option>
                        {rideType === "request" && <option value="Any">Any</option>}
                      </select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] text-gray-500 font-bold ml-2">{rideType === "offer" ? "AVAILABLE SEATS" : "SEATS NEEDED"}</label>
                      <input type="number" min="1" placeholder="Seats" className="w-full bg-gray-50 border border-gray-200 p-4 rounded-2xl outline-none focus:border-blue-500 transition" value={formData.seats} onChange={(e) => setFormData({...formData, seats: e.target.value})} />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] text-gray-500 font-bold ml-2">{rideType === "offer" ? "PRICE PER SEAT (RS)" : "YOUR BUDGET (RS)"}</label>
                    <input type="number" placeholder="Amount" required className="w-full bg-gray-50 border border-gray-200 p-4 rounded-2xl outline-none focus:border-blue-500 transition" value={formData.price} onChange={(e) => setFormData({...formData, price: e.target.value})} />
                  </div>

                  <div className="space-y-1"><label className="text-[10px] text-gray-500 font-bold ml-2">CONTACT</label><input type="text" placeholder="03XXXXXXXXX" required className="w-full bg-gray-50 border border-gray-200 p-4 rounded-2xl outline-none focus:border-blue-500 transition" value={formData.contact} onChange={(e) => setFormData({...formData, contact: e.target.value})} /></div>

                  <button type="submit" className="w-full bg-blue-600 py-4 rounded-2xl font-bold hover:bg-blue-700 transition-all mt-4 shadow-lg shadow-blue-900/30">
                    {editMode ? "Update Ride" : "Post Ride"}
                  </button>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>

        <button onClick={() => { resetForm(); setIsModalOpen(true); }} className="fixed bottom-10 right-10 w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center text-2xl shadow-xl z-50 border-4 border-black hover:scale-110 transition-all"><FaPlus /></button>
      </div>
    </div>
  );
};

export default RideShare;