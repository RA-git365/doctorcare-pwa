// =====================================
// DoctorCare Signaling + Static Server
// =====================================
//
// Author: Rohith Annadatha
// App: DoctorCare (PWA + WebRTC)
// Purpose: Serve PWA frontend + handle real-time signaling
// =====================================

const express = require("express");
const http = require("http");
const path = require("path");
const cors = require("cors");
const { Server } = require("socket.io");

const app = express();

// Allow cross-origin (for LAN access via IP)
app.use(cors({
  origin: "*",
  methods: ["GET", "POST"]
}));

// =============================
// STATIC FILES (Frontend PWA)
// =============================

// ✅ Serve main static directory
app.use(express.static(__dirname, {
  extensions: ['html', 'js', 'css', 'json', 'png', 'jpg', 'jpeg', 'svg', 'webp']
}));

// ✅ Optional: If you use subfolders like /css, /js, /assets, include these
app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

// ✅ Fallback route for SPA (must come LAST)
app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// =============================
// CREATE SERVER + SOCKET.IO
// =============================
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// ========================
// REAL-TIME SIGNALING LOGIC
// ========================
io.on("connection", socket => {
  console.log("✅ User connected:", socket.id);

  // User joins a room (doctor ↔ patient)
  socket.on("join-room", roomId => {
    socket.join(roomId);
    console.log(`➡️ User ${socket.id} joined room: ${roomId}`);
  });

  // Forward offer from caller → callee
  socket.on("offer", payload => {
    console.log("📨 Offer received, forwarding to remote user…");
    socket.to(payload.roomId).emit("offer", payload);
  });

  // Forward answer from callee → caller
  socket.on("answer", payload => {
    console.log("📨 Answer received, forwarding to remote user…");
    socket.to(payload.roomId).emit("answer", payload);
  });

  // Exchange ICE candidates
  socket.on("ice-candidate", payload => {
    socket.to(payload.roomId).emit("ice-candidate", payload);
  });

  // Handle disconnect
  socket.on("disconnect", () => {
    console.log("❌ User disconnected:", socket.id);
  });
});

// =============================
// START SERVER
// =============================
const PORT = 5000;
const HOST = "0.0.0.0";

server.listen(PORT, HOST, () => {
  console.log(`🚀 DoctorCare signaling + static server running`);
  console.log(`🌐 Access locally:   http://localhost:${PORT}`);
  console.log(`📱 Access from LAN:  http://<your-laptop-ip>:${PORT}`);
  console.log(`💡 Example: http://192.168.29.199:${PORT}`);
});
