const { buildModel } = require("./_ownedModel");

const base = buildModel({
  table: "rides",
  ownerColumn: "driver",
  ownerProp: "driver",
  defaultSort: "date ASC",
  // Hide rides that are done (marked completed, or the date has passed)...
  activeWhere: "is_completed = false AND date >= CURRENT_DATE",
  // ...and hard-delete them a day after they're done (either the driver
  // marked it completed, or the ride date itself is now in the past).
  expireWhere: "(is_completed = true AND updated_at < NOW() - INTERVAL '24 hours') OR date < CURRENT_DATE - INTERVAL '1 day'",
  columns: [
    { col: "type", prop: "type" },
    { col: "origin", prop: "origin" },
    { col: "destination", prop: "destination" },
    { col: "date", prop: "date" },
    { col: "time", prop: "time" },
    { col: "seats", prop: "seats" },
    { col: "price", prop: "price" },
    { col: "vehicle", prop: "vehicle" },
    { col: "description", prop: "description" },
    { col: "contact", prop: "contact" },
    { col: "is_completed", prop: "isCompleted" },
    { col: "origin_lat", prop: "originLat" },
    { col: "origin_lng", prop: "originLng" },
    { col: "destination_lat", prop: "destinationLat" },
    { col: "destination_lng", prop: "destinationLng" },
    { col: "distance_km", prop: "distanceKm" },
    { col: "duration_mins", prop: "durationMins" },
    { col: "arrival_time", prop: "arrivalTime" },
  ],
});

function Ride(data) { return base._make(data); }
Ride.find = base.find.bind(base);
Ride.findActive = () => base.find({ _activeOnly: true });
Ride.findById = base.findById.bind(base);
Ride.create = base.create.bind(base);
Ride.count = base.count.bind(base);
Ride.adminDelete = base.adminDelete.bind(base);
Ride.cleanupExpired = base.cleanupExpired.bind(base);

module.exports = Ride;
