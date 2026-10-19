const { sql } = require("../config/db");

function mapBooking(row) {
  if (!row) return null;
  return {
    _id: row.id,
    ride: row.ride,
    user: row.u_id
      ? { _id: row.u_id, name: row.u_name, email: row.u_email, avatar: row.u_avatar || null }
      : row.user,
    seats: row.seats,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const RideBooking = {
  // All confirmed bookings for a ride, with the booker's info populated —
  // used on the ride detail page so the driver can see who booked.
  async findForRide(rideId) {
    const rows = await sql`
      SELECT rb.*, u.id AS u_id, u.name AS u_name, u.email AS u_email, u.avatar AS u_avatar
      FROM ride_bookings rb
      JOIN users u ON u.id = rb."user"
      WHERE rb.ride = ${rideId} AND rb.status = 'confirmed'
      ORDER BY rb.created_at ASC`;
    return rows.map(mapBooking);
  },

  // A specific user's booking on a ride (any status), or null.
  async findOne(rideId, userId) {
    const rows = await sql`
      SELECT * FROM ride_bookings WHERE ride = ${rideId} AND "user" = ${userId} LIMIT 1`;
    return mapBooking(rows[0]);
  },

  // Total confirmed seats already booked on this ride.
  async bookedSeats(rideId) {
    const rows = await sql`
      SELECT COALESCE(SUM(seats), 0)::int AS total
      FROM ride_bookings WHERE ride = ${rideId} AND status = 'confirmed'`;
    return rows[0]?.total || 0;
  },

  // Create a new booking, or re-confirm a previously cancelled one for the
  // same user (the UNIQUE(ride, user) constraint means one row per pair).
  async create({ ride, user, seats }) {
    const rows = await sql`
      INSERT INTO ride_bookings (ride, "user", seats, status)
      VALUES (${ride}, ${user}, ${seats || 1}, 'confirmed')
      ON CONFLICT (ride, "user")
      DO UPDATE SET seats = ${seats || 1}, status = 'confirmed', updated_at = NOW()
      RETURNING *`;
    return mapBooking(rows[0]);
  },

  async cancel(rideId, userId) {
    const rows = await sql`
      UPDATE ride_bookings SET status = 'cancelled', updated_at = NOW()
      WHERE ride = ${rideId} AND "user" = ${userId} AND status = 'confirmed'
      RETURNING id`;
    return rows.length > 0;
  },

  // Is this user allowed to see a fully-booked/completed ride's details?
  // (the driver, or anyone who has a confirmed booking on it)
  async isParticipant(rideId, userId) {
    const rows = await sql`
      SELECT 1 FROM ride_bookings WHERE ride = ${rideId} AND "user" = ${userId} AND status = 'confirmed' LIMIT 1`;
    return rows.length > 0;
  },
};

module.exports = RideBooking;
