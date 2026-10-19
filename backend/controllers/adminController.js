const User = require("../models/User");
const Product = require("../models/Product");
const Ride = require("../models/Ride");
const Skill = require("../models/Skill");
const Roommate = require("../models/Roommate");
const LostItem = require("../models/LostItem");
const { sql } = require("../config/db");

const resourceModels = {
  products: Product,
  rides: Ride,
  skills: Skill,
  roommates: Roommate,
  "lost-items": LostItem,
};

const getStats = async (req, res) => {
  try {
    const [users, products, rides, skills, roommates, lostItems] =
      await Promise.all([
        User.count(), Product.count(), Ride.count(),
        Skill.count(), Roommate.count(), LostItem.count(),
      ]);
    res.json({ users, products, rides, skills, roommates, lostItems });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Daily signups for the last N days — powers the admin growth chart.
const getSignupTrend = async (req, res) => {
  try {
    const days = Math.min(Number(req.query.days) || 14, 90);
    const rows = await sql`
      SELECT to_char(d::date, 'Mon DD') AS day, COUNT(u.id)::int AS count
      FROM generate_series(CURRENT_DATE - (${days - 1} || ' days')::interval, CURRENT_DATE, '1 day') d
      LEFT JOIN users u ON u.created_at::date = d::date
      GROUP BY d
      ORDER BY d`;
    res.json(rows);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// How many ACTIVE listings sit in each module — powers the admin pie/bar chart.
const getCategoryBreakdown = async (req, res) => {
  try {
    const [products, skills, rides, roommates, lostItems] = await Promise.all([
      sql`SELECT COUNT(*)::int AS n FROM products WHERE is_sold = false`,
      sql`SELECT COUNT(*)::int AS n FROM skills WHERE is_active = true`,
      sql`SELECT COUNT(*)::int AS n FROM rides WHERE is_completed = false`,
      sql`SELECT COUNT(*)::int AS n FROM roommates WHERE is_closed = false`,
      sql`SELECT COUNT(*)::int AS n FROM lost_items WHERE is_resolved = false`,
    ]);
    res.json([
      { name: "Marketplace", value: products[0].n },
      { name: "Skills", value: skills[0].n },
      { name: "Rides", value: rides[0].n },
      { name: "Roommates", value: roommates[0].n },
      { name: "Lost & Found", value: lostItems[0].n },
    ]);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getUsers = async (req, res) => {
  try {
    const users = await User.findAll();
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteUser = async (req, res) => {
  try {
    if (req.user._id === req.params.id) {
      return res.status(400).json({ message: "You cannot delete your own admin account." });
    }
    await User.deleteById(req.params.id);
    res.json({ message: "User deleted" });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const setUserVerified = async (req, res) => {
  try {
    const value = req.body.value !== undefined ? !!req.body.value : true;
    const user = await User.setVerified(req.params.id, value);
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const setUserAdmin = async (req, res) => {
  try {
    const value = req.body.value !== undefined ? !!req.body.value : true;
    const user = await User.setAdmin(req.params.id, value);
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteResource = async (req, res) => {
  const { type, id } = req.params;
  const Model = resourceModels[type];
  if (!Model) {
    return res.status(400).json({ message: `Unknown resource type: ${type}` });
  }
  try {
    await Model.adminDelete(id);
    res.json({ message: `${type} item deleted` });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getStats, getUsers, deleteUser,
  setUserVerified, setUserAdmin, deleteResource,
  getSignupTrend, getCategoryBreakdown,
};