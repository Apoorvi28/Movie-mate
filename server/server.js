const express = require('express');
const http = require('http');
const multer = require("multer");
const socketIo = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path'); 
require('dotenv').config();

// Correct the path to your auth.js
const authRoutes = require('./Routes/auth');  // Adjusted import for the auth.js

const app = express();

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(cors());
app.use(express.json());
// Serve static files from uploads/
app.use('/uploads', express.static('uploads'));
app.use('/api/auth', authRoutes);  // Mount the authentication routes

// Multer setup for video uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, "uploads/"),
  filename: (req, file, cb) => cb(null, Date.now() + "-" + file.originalname),
});
const upload = multer({ storage });

// Video upload endpoint
app.post("/upload", upload.single("video"), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: "No file uploaded" });
  }

  const videoURL = `http://localhost:4000/uploads/${req.file.filename}`;
  res.json({ videoURL });
});

// MongoDB connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log('MongoDB Connected'))
  .catch((err) => console.error('MongoDB connection error:', err));

// Sample route
app.get('/', (req, res) => {
  res.send('Server is running');
});

// ====== Socket.IO logic ======

const videoURLs = {};       // roomId -> video URL
const users = {};           // socketId -> { roomId, username }
const roomCreators = {};    // roomId -> creator socketId

io.on("connection", (socket) => {

  socket.on("joinRoom", ({ roomId, username }, callback) => {
    socket.join(roomId);
    users[socket.id] = { roomId, username };

    const room = io.sockets.adapter.rooms.get(roomId);
    const isCreator = room?.size === 1;

    if (isCreator) {
      roomCreators[roomId] = socket.id;
    }

    // Send video URL to new participant if available
    if (videoURLs[roomId]) {
      socket.emit("video-url", { url: videoURLs[roomId] });
    }

    socket.to(roomId).emit("userJoined", username);
    callback({ isCreator });
  });

  socket.on("video-url", ({ roomId, url }) => {
    videoURLs[roomId] = url;
    socket.to(roomId).emit("video-url", { url });
  });

  socket.on("play", ({ roomId, time }) => {
    socket.to(roomId).emit("video-play", { time });
  });

  socket.on("pause", ({ roomId }) => {
    socket.to(roomId).emit("video-pause");
  });

  socket.on("seek", ({ roomId, time }) => {
    if (roomCreators[roomId] === socket.id) {
      io.to(roomId).emit("seek", time);
    }
  });

  socket.on("chatMessage", ({ roomId, username, message }) => {
    io.to(roomId).emit("chatMessage", { username, message });
  });

  socket.on("chatImage", ({ roomId, username, image }) => {
    io.to(roomId).emit("chatImage", { username, image });
  });

  socket.on("leaveRoom", (roomId) => {
    const user = users[socket.id];
    if (user) {
      socket.leave(roomId);
      socket.to(roomId).emit("userLeft", user.username);
      delete users[socket.id];

      // If creator leaves, clean up video data and notify others
      if (roomCreators[roomId] === socket.id) {
        delete videoURLs[roomId];
        delete roomCreators[roomId];
        io.to(roomId).emit("video-url", { url: null });
      }
    }
  });

  socket.on("disconnect", () => {
    const user = users[socket.id];
    if (user) {
      const { roomId, username } = user;
      socket.to(roomId).emit("userLeft", username);
      delete users[socket.id];

      // If creator disconnects, clean up video data and notify others
      if (roomCreators[roomId] === socket.id) {
        delete videoURLs[roomId];
        delete roomCreators[roomId];
        io.to(roomId).emit("video-url", { url: null });
      }
    }
  });
});

// ====== Start Server ======

server.listen(4000, () => {
  console.log('Server is running on port 4000');
});
