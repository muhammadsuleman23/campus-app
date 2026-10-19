// Free, no-API-key geocoding (Nominatim) + routing (OSRM public demo server).
// Both are called server-side (not straight from the browser) so we can set
// a proper User-Agent, per Nominatim's usage policy, and keep API endpoints
// out of frontend network tab noise.

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";
const OSRM_BASE = "https://router.project-osrm.org";
const APP_USER_AGENT = "CampusHub-StudentApp/1.0 (educational project)";

// GET /api/geo/reverse?lat=&lng=  -> { address }
const reverseGeocode = async (req, res) => {
  const { lat, lng } = req.query;
  if (!lat || !lng) return res.status(400).json({ message: "lat and lng are required" });

  try {
    const url = `${NOMINATIM_BASE}/reverse?format=jsonv2&lat=${encodeURIComponent(lat)}&lon=${encodeURIComponent(lng)}`;
    const r = await fetch(url, { headers: { "User-Agent": APP_USER_AGENT } });
    const data = await r.json();
    res.json({
      address: data.display_name || `${lat}, ${lng}`,
      lat: Number(lat),
      lng: Number(lng),
    });
  } catch (error) {
    res.status(502).json({ message: "Could not reach the location service. Try typing the address instead." });
  }
};

// GET /api/geo/geocode?q=<address>  -> { lat, lng, address }
const geocode = async (req, res) => {
  const q = (req.query.q || "").trim();
  if (!q) return res.status(400).json({ message: "q is required" });

  try {
    const url = `${NOMINATIM_BASE}/search?format=jsonv2&limit=1&q=${encodeURIComponent(q)}`;
    const r = await fetch(url, { headers: { "User-Agent": APP_USER_AGENT } });
    const data = await r.json();
    if (!data[0]) return res.status(404).json({ message: `Couldn't find "${q}" on the map. Try a more specific address.` });
    res.json({ lat: Number(data[0].lat), lng: Number(data[0].lon), address: data[0].display_name });
  } catch (error) {
    res.status(502).json({ message: "Could not reach the location service. Try again in a moment." });
  }
};

// GET /api/geo/route?originLat=&originLng=&destLat=&destLng=
// -> { distanceKm, durationMins } using the REAL road route, not a straight line.
const route = async (req, res) => {
  const { originLat, originLng, destLat, destLng } = req.query;
  if (!originLat || !originLng || !destLat || !destLng) {
    return res.status(400).json({ message: "originLat, originLng, destLat, destLng are all required" });
  }

  try {
    const url = `${OSRM_BASE}/route/v1/driving/${originLng},${originLat};${destLng},${destLat}?overview=false`;
    const r = await fetch(url);
    const data = await r.json();
    const leg = data.routes?.[0];
    if (!leg) return res.status(404).json({ message: "Couldn't calculate a route between these two points." });

    res.json({
      distanceKm: Math.round((leg.distance / 1000) * 10) / 10, // meters -> km, 1 decimal
      durationMins: Math.max(1, Math.round(leg.duration / 60)), // seconds -> minutes
    });
  } catch (error) {
    res.status(502).json({ message: "Could not reach the routing service. Try again in a moment." });
  }
};

module.exports = { reverseGeocode, geocode, route };
