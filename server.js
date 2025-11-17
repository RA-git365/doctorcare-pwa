// ======================================================
// DoctorCare Unified Server (OTP + Email + SMS + Signaling)
// Author: Rohith Annadatha
// Version: 2025-11-18 — FINAL PRODUCTION BUILD
// ======================================================

const express = require("express");
const http = require("http");
const cors = require("cors");
const path = require("path");
const axios = require("axios");
const nodemailer = require("nodemailer");
const { Server } = require("socket.io");

const app = express();

// ---------------------------
// CONFIG (SET THESE)
// ---------------------------

// 1️⃣ Your 2Factor API Key
const TWO_FACTOR_API_KEY = "bf4daa49-c38c-11f0-a6b2-0200cd936042";

// 2️⃣ Email account for OTP (Gmail)
const EMAIL_USER = "YOUR_GMAIL@gmail.com";
const EMAIL_PASS = "YOUR_GMAIL_APP_PASSWORD";

// ---------------------------
// Middlewares
// ---------------------------
app.use(cors({ origin: "*", methods: ["GET", "POST"] }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ---------------------------
// Email Transport (Gmail)
// ---------------------------
const emailTransport = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: EMAIL_USER,
    pass: EMAIL_PASS,
  },
});

// -----------------------------------------------------
// OTP GENERATION
// -----------------------------------------------------
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// =====================================================
// 🚀 In-Memory OTP Storage  (Simple + Fast)
// =====================================================
let otpStore = {}; // { email: { emailOtp, mobileOtp, expires }, mobile: { ... } }
let users = { doctors: [], patients: [] }; // temporary storage (since no DB)

// =====================================================
// 📌 Send SMS OTP (2FACTOR)
// =====================================================
async function sendSmsOtp(mobile, otp) {
  const url = `https://2factor.in/API/V1/${"bf4daa49-c38c-11f0-a6b2-0200cd936042"}/SMS/${mobile}/${otp}`;
  try {
    const resp = await axios.get(url);
    return resp.data;
  } catch (err) {
    console.error("SMS ERROR:", err);
    throw new Error("SMS OTP failed");
  }
}

// =====================================================
// 📌 Send Email OTP
// =====================================================
async function sendEmailOtp(email, otp) {
  return emailTransport.sendMail({
    from: `DoctorCare <${EMAIL_USER}>`,
    to: email,
    subject: "DoctorCare OTP Verification",
    text: `Your OTP is ${otp}`,
  });
}

// =====================================================
// 📌 🔥 UNIQUE CHECK (email + mobile)
// =====================================================
function isDuplicateUser(role, email, mobile) {
  const doctorMatch = users.doctors.find(
    (u) => u.email === email || u.mobile === mobile
  );
  const patientMatch = users.patients.find(
    (u) => u.email === email || u.mobile === mobile
  );

  if (doctorMatch || patientMatch) return true;
  return false;
}

// =====================================================
// 📌 API: Send OTP for SIGNUP
// =====================================================
app.post("/api/signup/sendOtp", async (req, res) => {
  try {
    const { role, name, email, mobile } = req.body;
    if (!name || !email || !mobile || !role)
      return res.status(400).json({ message: "Missing fields" });

    // 🔐 Unique check
    if (isDuplicateUser(role, email, mobile)) {
      return res.status(409).json({ message: "Email or Mobile already exists" });
    }

    // Create OTP pair
    const emailOtp = generateOTP();
    const mobileOtp = generateOTP();

    // Store temporary OTP
    otpStore[email] = {
      emailOtp,
      mobileOtp,
      expires: Date.now() + 5 * 60 * 1000,
      role,
      name,
      email,
      mobile,
    };

    // Send Email OTP
    await sendEmailOtp(email, emailOtp);

    // Send SMS OTP
    await sendSmsOtp(mobile, mobileOtp);

    return res.json({ message: "OTP sent successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Failed to send OTP" });
  }
});

// =====================================================
// 📌 API: Verify OTP & Create Account
// =====================================================
app.post("/api/signup/verifyOtp", async (req, res) => {
  try {
    const { role, name, email, mobile, emailOtp, mobileOtp, password } = req.body;

    const record = otpStore[email];
    if (!record) return res.status(400).json({ message: "OTP expired / invalid" });
    if (Date.now() > record.expires) return res.status(400).json({ message: "OTP expired" });
    if (record.emailOtp !== emailOtp) return res.status(400).json({ message: "Wrong Email OTP" });
    if (record.mobileOtp !== mobileOtp) return res.status(400).json({ message: "Wrong Mobile OTP" });

    // Create user
    const user = {
      id: Date.now().toString(),
      role,
      name,
      email,
      mobile,
      password,
    };

    if (role === "doctor") users.doctors.push(user);
    else users.patients.push(user);

    delete otpStore[email];

    return res.json({ message: "Signup complete", user });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Signup failed" });
  }
});

// =====================================================
// 📌 API: Forgot Password — Send OTP
// =====================================================
app.post("/api/forgot/sendOtp", async (req, res) => {
  const { role, email } = req.body;

  // Find user
  const userList = role === "doctor" ? users.doctors : users.patients;
  const user = userList.find(u => u.email === email);

  if (!user) return res.status(404).json({ message: "Email not found" });

  const otp = generateOTP();
  otpStore[email] = { otp, expires: Date.now() + 5 * 60 * 1000, role };

  // Send OTP by email
  await sendEmailOtp(email, otp);

  return res.json({ message: "OTP sent for password reset" });
});

// =====================================================
// 📌 API: Forgot Password — Reset
// =====================================================
app.post("/api/forgot/resetPassword", (req, res) => {
  const { role, email, otp, newPassword } = req.body;
  const record = otpStore[email];

  if (!record || record.otp !== otp)
    return res.status(400).json({ message: "Invalid OTP" });

  const list = role === "doctor" ? users.doctors : users.patients;
  const user = list.find(u => u.email === email);

  if (!user) return res.status(404).json({ message: "User not found" });

  user.password = newPassword;
  delete otpStore[email];

  res.json({ message: "Password updated" });
});

// =====================================================
// STATIC FILE HOSTING (PWA)
// =====================================================
app.use(express.static(__dirname));
app.use("/assets", express.static(path.join(__dirname, "assets")));
app.use("/js", express.static(path.join(__dirname, "js")));
app.use("/css", express.static(path.join(__dirname, "assets/css")));

app.get("/*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// =====================================================
// SOCKET.IO (WebRTC Signaling)
// =====================================================
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

io.on("connection", (socket) => {
  console.log("Connected:", socket.id);

  socket.on("join-room", (roomId) => {
    socket.join(roomId);
  });

  socket.on("offer", (payload) => {
    socket.to(payload.roomId).emit("offer", payload);
  });

  socket.on("answer", (payload) => {
    socket.to(payload.roomId).emit("answer", payload);
  });

  socket.on("ice-candidate", (payload) => {
    socket.to(payload.roomId).emit("ice-candidate", payload);
  });
});

// =====================================================
// START SERVER
// =====================================================
const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 DoctorCare Server Running on port ${PORT}`);
});


