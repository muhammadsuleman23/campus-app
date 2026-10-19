const express = require("express");
const router = express.Router();
const { reverseGeocode, geocode, route } = require("../controllers/geoController");
const { protect } = require("../middleware/authMiddleware");

router.get("/reverse", protect, reverseGeocode); // http://localhost:5000/api/geo/reverse?lat=&lng=
router.get("/geocode", protect, geocode);        // http://localhost:5000/api/geo/geocode?q=
router.get("/route", protect, route);            // http://localhost:5000/api/geo/route?originLat=&originLng=&destLat=&destLng=

module.exports = router;
