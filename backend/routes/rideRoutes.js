const express = require("express");
const router = express.Router();
const { 
  createRide, getRides, getRideById, updateRide, deleteRide,
  bookRide, cancelBooking, getRideBookings,
} = require("../controllers/rideController");
const { protect } = require("../middleware/authMiddleware");

router.route("/")
  .get(getRides)
  .post(protect, createRide);

router.route("/:id")
  // protect (not just optional auth) so we know who's asking — needed to
  // decide whether a fully-booked ride is visible to this viewer.
  .get(protect, getRideById)
  .put(protect, updateRide)    
  .delete(protect, deleteRide);

// Booking a seat on a ride
router.route("/:id/book").post(protect, bookRide).delete(protect, cancelBooking);
// Driver-only: who has booked this ride
router.route("/:id/bookings").get(protect, getRideBookings);

module.exports = router;