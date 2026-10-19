const Ride = require("../models/Ride");
const RideBooking = require("../models/RideBooking");
const Notification = require("../models/Notification");

// 1. Create Ride
const createRide = async (req, res) => {
  try {
    const {
      type, origin, destination, date, time, seats, price, vehicle, description, contact,
      originLat, originLng, destinationLat, destinationLng, distanceKm, durationMins, arrivalTime,
    } = req.body;

    if (!origin || !destination || !date || !price || !contact) {
      return res.status(400).json({ message: "Please fill required fields" });
    }

    // ✅ FIX: Ensure type is lowercase ('Offer' -> 'offer')
    const safeType = type ? type.toLowerCase() : "offer"; 

    const ride = new Ride({
      driver: req.user._id,
      type: safeType, 
      origin, destination, date, time, seats, price, vehicle, description, contact,
      originLat, originLng, destinationLat, destinationLng, distanceKm, durationMins, arrivalTime,
    });

    const savedRide = await ride.save();

    if (req.io) {
      const msg = safeType === "request" 
        ? `🙋‍♂️ New Ride Request: Need ride to ${destination}`
        : `🚗 New Ride Offer: Going to ${destination}`;
      req.io.emit("global_notification", { message: msg });
    }

    res.status(201).json(savedRide);
  } catch (error) {
    console.error("Create Ride Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// 2. Get All Rides (completed/past-date rides auto-hidden — see Ride.activeWhere)
const getRides = async (req, res) => {
  try {
    const rides = await Ride.findActive().populate("driver", "name email").sort({ date: 1 });
    res.json(rides);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

// 3. Get Single Ride
// Once a ride is fully booked/completed it's hidden from the public list
// (see Ride.activeWhere) — but it should still be reachable by direct link
// ONLY for the driver and the people who actually booked it. Everyone else
// gets a 404, same as if the ride didn't exist.
const getRideById = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id).populate("driver", "name email");
    if (!ride) return res.status(404).json({ message: "Ride not found" });

    if (ride.isCompleted && req.user) {
      const isDriver = String(ride.driver._id) === String(req.user._id);
      const isBooker = isDriver ? true : await RideBooking.isParticipant(ride._id, req.user._id);
      if (!isDriver && !isBooker) {
        return res.status(404).json({ message: "Ride not found" });
      }
    } else if (ride.isCompleted && !req.user) {
      return res.status(404).json({ message: "Ride not found" });
    }

    const bookedSeats = await RideBooking.bookedSeats(ride._id);
    const myBooking = req.user ? await RideBooking.findOne(ride._id, req.user._id) : null;
    res.json({
      ...ride,
      bookedSeats,
      seatsLeft: Math.max(0, ride.seats - bookedSeats),
      myBooking: myBooking && myBooking.status === "confirmed" ? myBooking : null,
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
};

// ✅ 4. UPDATE RIDE (CRITICAL FIX HERE)
const updateRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);
    
    if (!ride) {
        return res.status(404).json({ message: "Ride not found" });
    }

    if (ride.driver.toString() !== req.user._id.toString()) {
        return res.status(401).json({ message: "Not Authorized" });
    }

    // ✅ AUTO-FIX OLD DATA: Agar purana data "Offer" (Capital) hai to usay small kar do
    if (ride.type === "Offer") ride.type = "offer";
    if (ride.type === "Request") ride.type = "request";

    // ✅ NEW DATA FIX: Agar user update bhej raha hai to usay bhi small karo
    if (req.body.type) ride.type = req.body.type.toLowerCase();

    // Baaki Fields
    if (req.body.isCompleted !== undefined) ride.isCompleted = req.body.isCompleted;
    if (req.body.origin) ride.origin = req.body.origin;
    if (req.body.destination) ride.destination = req.body.destination;
    if (req.body.price) ride.price = req.body.price;
    if (req.body.seats) ride.seats = req.body.seats;
    if (req.body.time) ride.time = req.body.time;
    if (req.body.date) ride.date = req.body.date;
    if (req.body.vehicle) ride.vehicle = req.body.vehicle;
    if (req.body.description) ride.description = req.body.description;
    if (req.body.contact) ride.contact = req.body.contact;
    // Route/ETA fields — only overwritten when the client actually recalculated them
    if (req.body.originLat !== undefined) ride.originLat = req.body.originLat;
    if (req.body.originLng !== undefined) ride.originLng = req.body.originLng;
    if (req.body.destinationLat !== undefined) ride.destinationLat = req.body.destinationLat;
    if (req.body.destinationLng !== undefined) ride.destinationLng = req.body.destinationLng;
    if (req.body.distanceKm !== undefined) ride.distanceKm = req.body.distanceKm;
    if (req.body.durationMins !== undefined) ride.durationMins = req.body.durationMins;
    if (req.body.arrivalTime !== undefined) ride.arrivalTime = req.body.arrivalTime;

    const updatedRide = await ride.save();
    res.json(updatedRide);

  } catch (error) {
    console.error("Update Ride Error:", error); 
    // Validation error details bhejo taake samajh aye
    res.status(500).json({ message: error.message || "Server Error" });
  }
};

// 5. Delete Ride
const deleteRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);
    if (!ride) return res.status(404).json({ message: "Ride not found" });

    if (ride.driver.toString() !== req.user._id.toString()) {
      return res.status(401).json({ message: "Not Authorized" });
    }

    await ride.deleteOne();
    res.json({ message: "Ride Removed" });
  } catch (error) {
    console.error("Delete Ride Error:", error);
    res.status(500).json({ message: "Server Error" });
  }
};

// 6. Book a seat on a ride
const bookRide = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);
    if (!ride) return res.status(404).json({ message: "Ride not found" });

    if (String(ride.driver) === String(req.user._id) || String(ride.driver?._id) === String(req.user._id)) {
      return res.status(400).json({ message: "You can't book your own ride" });
    }
    if (ride.isCompleted) {
      return res.status(400).json({ message: "This ride is no longer available" });
    }

    const seatsRequested = Math.max(1, Number(req.body.seats) || 1);
    const alreadyBooked = await RideBooking.bookedSeats(ride._id);
    const existing = await RideBooking.findOne(ride._id, req.user._id);
    const otherBooked = alreadyBooked - (existing?.status === "confirmed" ? existing.seats : 0);

    if (otherBooked + seatsRequested > ride.seats) {
      return res.status(400).json({ message: "Not enough seats left on this ride" });
    }

    const booking = await RideBooking.create({ ride: ride._id, user: req.user._id, seats: seatsRequested });

    // If the ride is now fully booked, close it — it should disappear from
    // the public list and only be visible to the driver + whoever booked.
    const totalBooked = otherBooked + seatsRequested;
    if (totalBooked >= ride.seats) {
      ride.isCompleted = true;
      await ride.save();
    }

    // 🔔 Let the driver know someone booked their ride
    try {
      const note = await Notification.create({
        user: ride.driver?._id || ride.driver,
        type: "success",
        message: `${req.user.name} booked ${seatsRequested} seat(s) on your ride to ${ride.destination}`,
        referenceId: ride._id,
        read: false,
      });
      if (req.io) req.io.to(String(ride.driver?._id || ride.driver)).emit("notification", note);
    } catch (notifyErr) {
      console.error("Notification error (booking):", notifyErr.message);
    }

    res.status(201).json(booking);
  } catch (error) {
    console.error("Book Ride Error:", error);
    res.status(500).json({ message: error.message || "Server Error" });
  }
};

// 7. Cancel own booking
const cancelBooking = async (req, res) => {
  try {
    const ok = await RideBooking.cancel(req.params.id, req.user._id);
    if (!ok) return res.status(404).json({ message: "You don't have a booking on this ride" });

    // Re-open the ride if it had been auto-closed for being full
    const ride = await Ride.findById(req.params.id);
    if (ride && ride.isCompleted) {
      const booked = await RideBooking.bookedSeats(ride._id);
      if (booked < ride.seats) {
        ride.isCompleted = false;
        await ride.save();
      }
    }
    res.json({ message: "Booking cancelled" });
  } catch (error) {
    res.status(500).json({ message: error.message || "Server Error" });
  }
};

// 8. List everyone who booked this ride — driver only
const getRideBookings = async (req, res) => {
  try {
    const ride = await Ride.findById(req.params.id);
    if (!ride) return res.status(404).json({ message: "Ride not found" });
    const isDriver = String(ride.driver?._id || ride.driver) === String(req.user._id);
    if (!isDriver) return res.status(401).json({ message: "Not Authorized" });

    const bookings = await RideBooking.findForRide(ride._id);
    res.json(bookings);
  } catch (error) {
    res.status(500).json({ message: error.message || "Server Error" });
  }
};

module.exports = {
  createRide, getRides, getRideById, updateRide, deleteRide,
  bookRide, cancelBooking, getRideBookings,
};