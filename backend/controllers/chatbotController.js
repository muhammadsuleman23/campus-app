require("dotenv").config();
const { GoogleGenerativeAI } = require("@google/generative-ai");

const Product = require("../models/Product");
const Ride = require("../models/Ride");
const Skill = require("../models/Skill");
const LostItem = require("../models/LostItem");
const Roommate = require("../models/Roommate");

// Gemini Initialize (free tier available at https://aistudio.google.com/apikey)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

const handleChat = async (req, res) => {
  try {
    const { message } = req.body;

    // --- STEP 1: Fetch Data (Exactly your logic) ---
    const [products, rides, skills, lostItems, roommates] = await Promise.all([
      Product.findActive().select("title price category condition seller").populate("seller", "name"),
      Ride.findActive().select("origin destination date time price vehicle driver").populate("driver", "name"),
      Skill.findActive().populate("user", "name"), 
      LostItem.find({}).select("title category location date"),
      Roommate.findActive().populate("user", "name"),
    ]);

    // --- STEP 2: Logic Formatting (Your exact format) ---
    const productList = products.length > 0 ? products.map(p => `- ${p.title} (Rs.${p.price})`).join("\n") : "None";
    const rideList = rides.length > 0 ? rides.map(r => `- ${r.origin} to ${r.destination}`).join("\n") : "None";
    const skillList = skills.length > 0 ? skills.map(s => `- ${s.title} by ${s.user?.name}`).join("\n") : "None";
    const lostList = lostItems.length > 0 ? lostItems.map(l => `- ${l.title} at ${l.location}`).join("\n") : "None";
    const roomList = roommates.length > 0 ? roommates.map(rm => `- ${rm.type} in ${rm.location}`).join("\n") : "None";

    // --- STEP 3: Master Context (Exactly your logic) ---
    const context = `You are UniHub AI. Answer based on this campus database:
      === MARKETPLACE ===
      ${productList}
      === RIDES ===
      ${rideList}
      === SKILLS ===
      ${skillList}
      === LOST & FOUND ===
      ${lostList}
      === ROOMMATES ===
      ${roomList}

      RULES:
      1. If found, give details. If not, say "Currently, no such listing is available."
      2. Reply in Roman Urdu or English.`;

    // --- STEP 4: Gemini API Call ---
    const fullPrompt = `${context}\n\nUser: ${message}`;
    const result = await model.generateContent(fullPrompt);
    const reply = result.response.text();
    res.json({ reply });

  } catch (error) {
    console.error("Gemini Error:", error.message);
    res.status(500).json({ error: "AI is busy. Please try again later." });
  }
};

module.exports = { handleChat };