const { sql } = require("../config/db");

// One query per table, ILIKE match on the fields that matter for that
// listing type, active/unsold rows only, capped at a handful of results
// per category so the response stays fast and scannable.
const search = async (req, res) => {
  const q = (req.query.q || "").trim();
  if (!q) return res.json({ products: [], skills: [], rides: [], roommates: [] });

  const like = `%${q}%`;
  try {
    const [products, skills, rides, roommates] = await Promise.all([
      sql`
        SELECT p.id, p.title, p.price, p.category, p.images, u.name AS owner_name
        FROM products p LEFT JOIN users u ON u.id = p.seller
        WHERE p.is_sold = false AND (p.title ILIKE ${like} OR p.description ILIKE ${like} OR p.category ILIKE ${like})
        ORDER BY p.created_at DESC LIMIT 6`,
      sql`
        SELECT s.id, s.title, s.category, u.name AS owner_name
        FROM skills s LEFT JOIN users u ON u.id = s."user"
        WHERE s.is_active = true AND (s.title ILIKE ${like} OR s.description ILIKE ${like} OR s.category ILIKE ${like})
        ORDER BY s.created_at DESC LIMIT 6`,
      sql`
        SELECT r.id, r.origin, r.destination, r.date, u.name AS owner_name
        FROM rides r LEFT JOIN users u ON u.id = r.driver
        WHERE r.is_completed = false AND r.date >= CURRENT_DATE
          AND (r.origin ILIKE ${like} OR r.destination ILIKE ${like} OR r.description ILIKE ${like})
        ORDER BY r.date ASC LIMIT 6`,
      sql`
        SELECT rm.id, rm.type, rm.location, rm.budget, u.name AS owner_name
        FROM roommates rm LEFT JOIN users u ON u.id = rm."user"
        WHERE rm.is_closed = false AND (rm.location ILIKE ${like} OR rm.description ILIKE ${like})
        ORDER BY rm.created_at DESC LIMIT 6`,
    ]);

    res.json({
      products: products.map((p) => ({ _id: p.id, title: p.title, price: p.price, category: p.category, image: p.images?.[0] || null, ownerName: p.owner_name })),
      skills: skills.map((s) => ({ _id: s.id, title: s.title, category: s.category, ownerName: s.owner_name })),
      rides: rides.map((r) => ({ _id: r.id, title: `${r.origin} → ${r.destination}`, date: r.date, ownerName: r.owner_name })),
      roommates: roommates.map((rm) => ({ _id: rm.id, title: `${rm.type} · ${rm.location}`, budget: rm.budget, ownerName: rm.owner_name })),
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { search };
