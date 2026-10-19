require('dns').setDefaultResultOrder('ipv4first');
const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

// Routes Imports
const userRoutes = require("./routes/userRoutes"); 
const productRoutes = require("./routes/productRoutes");
const lostItemRoutes = require("./routes/lostItemRoutes");
const skillRoutes = require("./routes/skillRoutes");
const roommateRoutes = require("./routes/roommateRoutes");
const rideRoutes = require("./routes/rideRoutes");
const chatbotRoutes = require("./routes/chatbotRoutes");
const messageRoutes = require("./routes/messageRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const adminRoutes = require("./routes/adminRoutes");
const searchRoutes = require("./routes/searchRoutes");
const geoRoutes = require("./routes/geoRoutes");

// ✅ Restore Human Chat Routes
const chatRoutes = require("./routes/chatRoutes"); 
const { startCleanupScheduler } = require("./utils/cleanupExpired");

dotenv.config();
const app = express();

const server = http.createServer(app);
const io = new Server(server, {
  pingTimeout: 60000,
  cors: {
    origin: (process.env.CORS_ORIGIN || "http://localhost:5173").split(","),
    methods: ["GET", "POST"],
  },
});

app.use((req, res, next) => { req.io = io; next(); });
app.use(express.json({ limit: "50mb" })); 
app.use(express.urlencoded({ limit: "50mb", extended: true }));
app.use(cors());

// Neon (Postgres) connection check
const { sql } = require("./config/db");
const connectDB = async () => {
    try {
        await sql`SELECT 1`;
        console.log("✅ Neon Postgres Connected");
    } catch (error) {
        console.log("❌ Neon connection failed:", error.message);
        process.exit(1);
    }
};
connectDB();

// ✅ FIXED ROUTES MAPPING
app.use("/api/users", userRoutes); 
app.use("/api/products", productRoutes);
app.use("/api/lost-found", lostItemRoutes);
app.use("/api/skills", skillRoutes);
app.use("/api/roommates", roommateRoutes);
app.use("/api/rides", rideRoutes);

app.use("/api/chat", chatRoutes);       // 👈 Human Chat (Messages.jsx isay use karega)
app.use("/api/chatbot", chatbotRoutes); // 👈 AI Chatbot (Iska rasta badal diya)
app.use("/api/messages", messageRoutes);  
app.use("/api/notifications", notificationRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/search", searchRoutes);
app.use("/api/geo", geoRoutes);

io.on("connection", (socket) => {
  console.log("Connected to socket.io");
  socket.on("setup", (userData) => { socket.join(userData._id); socket.emit("connected"); });
  socket.on("join chat", (room) => { socket.join(room); });

  // Typing indicator — just relayed through the room, nothing persisted.
  socket.on("typing", ({ room, user }) => socket.in(room).emit("typing", { user }));
  socket.on("stop typing", ({ room }) => socket.in(room).emit("stop typing"));

  socket.on("new message", (newMessageRecieved) => {
    var chat = newMessageRecieved.chat;
    if (!chat.users) return console.log("chat.users not defined");
    chat.users.forEach((user) => {
      if (user._id == newMessageRecieved.sender._id) return;
      socket.in(user._id).emit("message received", newMessageRecieved);
    });
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on ${PORT}`);
  startCleanupScheduler(); // auto-remove sold/completed/expired listings
});