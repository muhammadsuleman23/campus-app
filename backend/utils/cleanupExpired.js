const cron = require("node-cron");
const Product = require("../models/Product");
const Ride = require("../models/Ride");
const Skill = require("../models/Skill");
const Roommate = require("../models/Roommate");

// Runs the actual cleanup once. Exported separately so it can also be
// triggered manually (e.g. from a script) without waiting for the schedule.
async function runCleanup() {
  const results = { products: 0, rides: 0, skills: 0, roommates: 0 };
  try {
    results.products = await Product.cleanupExpired();
    results.rides = await Ride.cleanupExpired();
    results.skills = await Skill.cleanupExpired();
    results.roommates = await Roommate.cleanupExpired();

    const total = results.products + results.rides + results.skills + results.roommates;
    if (total > 0) {
      console.log(`🧹 Cleanup: removed ${total} expired listing(s)`, results);
    }
  } catch (error) {
    console.error("🧹 Cleanup job failed:", error.message);
  }
  return results;
}

// Sold products, completed/past-date rides, deactivated skills and closed
// roommate posts are hidden from listings immediately (see each model's
// `activeWhere`), then permanently deleted 24h later by this job.
function startCleanupScheduler() {
  // Every hour, on the hour.
  cron.schedule("0 * * * *", runCleanup);
  // Also run once shortly after boot so nothing waits a full hour on deploy.
  setTimeout(runCleanup, 15 * 1000);
  console.log("🧹 Auto-cleanup scheduler started (hourly)");
}

module.exports = { startCleanupScheduler, runCleanup };
