import { toWhatsAppNumber } from "../utils/whatsapp";
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { 
  FaArrowLeft, FaCommentDots, FaWhatsapp, FaUserCircle, 
  FaCalendarAlt, FaClock, FaUsers, FaCar, FaCheckCircle, FaTrash,
  FaRoute, FaMapMarkerAlt, FaTicketAlt, FaBan
} from "react-icons/fa";
import API from "../api";
import { toast } from "react-toastify";
import Avatar from "../components/Avatar";

const RideDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [ride, setRide] = useState(null);
  const [loading, setLoading] = useState(true);
  const [bookings, setBookings] = useState([]);
  const [myBooking, setMyBooking] = useState(null);
  const [seatsToBook, setSeatsToBook] = useState(1);
  const [booking, setBooking] = useState(false);
  const user = JSON.parse(localStorage.getItem("userInfo"));

  const isDriver = ride?.driver && String(ride.driver._id) === String(user?._id);

  const fetchRide = async () => {
    try {
      const { data } = await API.get(`/rides/${id}`);
      setRide(data);
    } catch (error) {
      toast.error("Ride not found");
      navigate("/rideshare");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRide();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, navigate]);

  // Driver: load who booked, so they can see the list of bookers.
  useEffect(() => {
    if (!ride || !user || !isDriver) return;
    API.get(`/rides/${id}/bookings`).then(({ data }) => setBookings(data)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ride, isDriver]);

  // Whether *I* already booked this ride comes straight back on the ride
  // object itself (see backend getRideById).
  useEffect(() => {
    setMyBooking(ride?.myBooking || null);
  }, [ride]);

  const handleBook = async () => {
    if (!user) { toast.error("Please login!"); return; }
    setBooking(true);
    try {
      const { data } = await API.post(`/rides/${id}/book`, { seats: seatsToBook });
      setMyBooking(data);
      toast.success("Ride booked!");
      await fetchRide();
    } catch (error) {
      toast.error(error?.response?.data?.message || "Couldn't book this ride");
    } finally {
      setBooking(false);
    }
  };

  const handleCancelBooking = async () => {
    if (!window.confirm("Cancel your booking on this ride?")) return;
    try {
      await API.delete(`/rides/${id}/book`);
      setMyBooking(null);
      toast.success("Booking cancelled");
      await fetchRide();
    } catch (error) {
      toast.error("Couldn't cancel booking");
    }
  };

  const handleChat = async () => {
    if (!user) {
      toast.error("Please login!");
      return;
    }
    if (ride?.driver?._id === user._id) {
      toast.info("This is your own ride!");
      return;
    }
    
    try {
      // Find or Create Chat
      const { data: chatData } = await API.post("/chat", {
        userId: ride.driver._id,
        contextType: "ride",
        contextId: ride._id,
        contextTitle: `${ride.origin} ➔ ${ride.destination}`,
      });
      
      // Navigate to Messages page with chat context
      navigate("/messages", { state: { chat: chatData } });
    } catch (error) {
      toast.error("Error starting chat");
    }
  };

  // Owner: mark this ride as completed / re-open it
  const handleMarkCompleted = async () => {
    try {
      const { data } = await API.put(`/rides/${ride._id}`, { isCompleted: !ride.isCompleted });
      setRide(data);
      toast.success(data.isCompleted ? "Ride marked as Completed!" : "Ride re-opened!");
    } catch (error) {
      toast.error("Failed to update ride");
    }
  };

  const handleDelete = async () => {
    if (!window.confirm("Delete this ride?")) return;
    try {
      await API.delete(`/rides/${ride._id}`);
      toast.success("Ride deleted");
      navigate("/rideshare");
    } catch (error) {
      toast.error("Failed to delete");
    }
  };

  if (loading) return <div className="min-h-screen bg-gray-50 text-gray-900 flex items-center justify-center">Loading...</div>;
  if (!ride) return <div className="min-h-screen bg-gray-50 text-gray-900 flex items-center justify-center">Ride not found</div>;

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 p-6 relative overflow-hidden">
      {/* Background Glow */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-100/50 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="relative z-10 max-w-4xl mx-auto">
        <button onClick={() => navigate(-1)} className="mb-6 flex items-center gap-2 text-gray-400 hover:text-gray-900 transition">
          <FaArrowLeft /> Back
        </button>

        <div className="bg-white border border-gray-200 rounded-[2.5rem] p-10 shadow-2xl">
          <div className="flex justify-between items-center mb-10">
            <h1 className="text-3xl md:text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-500">
              {ride.origin} ➔ {ride.destination}
            </h1>
            <span className="text-3xl font-bold text-blue-600">Rs. {ride.price}</span>
          </div>

          {ride.isCompleted && (
            <div className="mb-8 -mt-4 flex items-center gap-2 bg-green-50 border border-green-500/30 text-green-600 px-4 py-2 rounded-xl w-fit text-sm font-bold">
              <FaCheckCircle /> This ride is completed
            </div>
          )}

          {/* Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
             <div className="bg-gray-50 p-4 rounded-2xl text-center border border-gray-200">
                <FaCalendarAlt className="mx-auto text-blue-600 mb-2"/>
                <p className="text-[10px] text-gray-500 uppercase font-bold">Date</p>
                <p className="text-sm font-bold">{new Date(ride.date).toLocaleDateString()}</p>
             </div>
             <div className="bg-gray-50 p-4 rounded-2xl text-center border border-gray-200">
                <FaClock className="mx-auto text-purple-600 mb-2"/>
                <p className="text-[10px] text-gray-500 uppercase font-bold">Departure</p>
                <p className="text-sm font-bold">{ride.time}</p>
             </div>
             <div className="bg-gray-50 p-4 rounded-2xl text-center border border-gray-200">
                <FaUsers className="mx-auto text-green-600 mb-2"/>
                <p className="text-[10px] text-gray-500 uppercase font-bold">Seats</p>
                <p className="text-sm font-bold">
                  {ride.bookedSeats != null ? `${ride.bookedSeats}/${ride.seats} booked` : ride.seats}
                </p>
             </div>
             <div className="bg-gray-50 p-4 rounded-2xl text-center border border-gray-200">
                <FaCar className="mx-auto text-cyan-600 mb-2"/>
                <p className="text-[10px] text-gray-500 uppercase font-bold">Vehicle</p>
                <p className="text-sm font-bold">{ride.vehicle}</p>
             </div>
             {ride.arrivalTime && (
               <div className="bg-blue-50 p-4 rounded-2xl text-center border border-blue-100">
                  <FaRoute className="mx-auto text-blue-600 mb-2"/>
                  <p className="text-[10px] text-gray-500 uppercase font-bold">Est. Arrival</p>
                  <p className="text-sm font-bold text-blue-700">{new Date(ride.arrivalTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
               </div>
             )}
             {ride.distanceKm && (
               <div className="bg-blue-50 p-4 rounded-2xl text-center border border-blue-100">
                  <FaMapMarkerAlt className="mx-auto text-blue-600 mb-2"/>
                  <p className="text-[10px] text-gray-500 uppercase font-bold">Distance</p>
                  <p className="text-sm font-bold text-blue-700">{ride.distanceKm} km{ride.durationMins ? ` · ${ride.durationMins} min` : ""}</p>
               </div>
             )}
          </div>

          {/* Driver Info */}
          <div className="flex items-center gap-4 p-6 bg-gray-50 rounded-2xl mb-10 border border-gray-200">
             <FaUserCircle className="text-4xl text-gray-500" />
             <div>
                <p className="text-xs text-gray-500 font-bold uppercase tracking-widest">Driver / Requester</p>
                <p className="text-lg font-bold">{ride.driver?.name || "User"}</p>
             </div>
          </div>

          {/* Driver-only: who booked this ride */}
          {isDriver && (
            <div className="mb-10">
              <h3 className="text-sm font-bold text-gray-500 uppercase tracking-widest mb-3 flex items-center gap-2">
                <FaTicketAlt /> Bookings ({bookings.length})
              </h3>
              {bookings.length === 0 ? (
                <p className="text-sm text-gray-400 bg-gray-50 p-4 rounded-2xl border border-gray-200">No one has booked yet.</p>
              ) : (
                <div className="space-y-2">
                  {bookings.map((b) => (
                    <div key={b._id} className="flex items-center gap-3 bg-gray-50 p-3 rounded-2xl border border-gray-200">
                      <Avatar userId={b.user?._id} name={b.user?.name} avatar={b.user?.avatar} size="w-9 h-9" textSize="text-xs" />
                      <div className="flex-1">
                        <p className="font-bold text-sm">{b.user?.name}</p>
                        <p className="text-xs text-gray-500">{b.user?.email}</p>
                      </div>
                      <span className="text-xs font-bold text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full">{b.seats} seat{b.seats > 1 ? "s" : ""}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Booking confirmation for a non-driver who already booked */}
          {!isDriver && myBooking && (
            <div className="mb-8 -mt-2 flex items-center gap-2 bg-blue-50 border border-blue-500/30 text-blue-700 px-4 py-3 rounded-xl w-fit text-sm font-bold">
              <FaTicketAlt /> You booked {myBooking.seats} seat{myBooking.seats > 1 ? "s" : ""} on this ride
            </div>
          )}

          {/* Buttons */}
          <div className="flex flex-col sm:flex-row gap-4">
            {isDriver ? (
              <>
                <button
                  onClick={handleMarkCompleted}
                  className={`flex-1 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition shadow-lg border ${ride.isCompleted ? "bg-gray-100 border-gray-300 text-gray-500 hover:bg-gray-200" : "bg-green-50 border-green-500/50 text-green-600 hover:bg-green-100"}`}
                >
                  <FaCheckCircle /> {ride.isCompleted ? "Re-open Ride" : "Mark Completed"}
                </button>
                <button
                  onClick={handleDelete}
                  className="flex-1 bg-red-50 border border-red-500/50 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 text-red-600 hover:bg-red-100 transition shadow-lg"
                >
                  <FaTrash /> Delete
                </button>
              </>
            ) : myBooking ? (
              <>
                <button
                  onClick={handleChat}
                  className="flex-1 bg-blue-600 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition shadow-lg shadow-blue-900/20"
                >
                  <FaCommentDots /> Chat Now
                </button>
                <button
                  onClick={handleCancelBooking}
                  className="flex-1 bg-red-50 border border-red-500/50 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 text-red-600 hover:bg-red-100 transition shadow-lg"
                >
                  <FaBan /> Cancel Booking
                </button>
              </>
            ) : ride.isCompleted ? (
              <div className="flex-1 text-center text-gray-500 py-4 bg-gray-50 rounded-2xl border border-gray-200">
                This ride is no longer available.
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-2xl px-4">
                  <label className="text-xs font-bold text-gray-500 uppercase">Seats</label>
                  <select
                    value={seatsToBook}
                    onChange={(e) => setSeatsToBook(Number(e.target.value))}
                    className="bg-transparent py-4 font-bold outline-none"
                  >
                    {Array.from({ length: Math.max(1, ride.seatsLeft ?? ride.seats) }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>{n}</option>
                    ))}
                  </select>
                </div>
                <button
                  onClick={handleBook}
                  disabled={booking || (ride.seatsLeft != null && ride.seatsLeft <= 0)}
                  className="flex-1 bg-purple-600 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-purple-700 transition shadow-lg shadow-purple-900/20 disabled:opacity-50"
                >
                  <FaTicketAlt /> {booking ? "Booking..." : "Book Ride"}
                </button>
                <button 
                  onClick={handleChat} 
                  className="flex-1 bg-blue-600 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition shadow-lg shadow-blue-900/20"
                >
                  <FaCommentDots /> Chat Now
                </button>
                <button 
                  onClick={() => window.open(`https://wa.me/${toWhatsAppNumber(ride.contact)}`, "_blank")} 
                  className="flex-1 bg-green-600 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-green-700 transition shadow-lg shadow-green-900/20"
                >
                  <FaWhatsapp /> WhatsApp
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RideDetail;