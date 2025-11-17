// =====================================
// DoctorCare Combined Server
// Static + Signaling + OTP + Auth Backend
// Author: Rohith Annadatha
// Updated: 2025-11-17
// =====================================

// ===============================
// REQUIRE PACKAGES
// ===============================
const express = require("express");
const http = require("http");
const path = require("path");
const cors = require("cors");
const fs = require("fs");
const bcrypt = require("bcryptjs");
const { Server } = require("socket.io");

// For email sending (Gmail SMTP)
const nodemailer = require("nodemailer");

// For SMS sending (Fast2SMS or any provider)
const axios = require("axios");

// ===============================
// EXPRESS APP
// ===============================
const app = express();
app.use(cors({ origin: "*", methods: ["GET", "POST"] }));
app.use(express.json());

// ===============================
// SIMPLE JSON DATABASE
// ===============================
const DB_FILE = path.join(__dirname, "doctorcare_db.json");

// Load DB or create new
let DB = {
  doctors: [],
  patients: []
};

// Load existing DB file
if (fs.existsSync(DB_FILE)) {
  try {
    DB = JSON.parse(fs.readFileSync(DB_FILE, "utf8"));
  } catch (e) {
    console.log("⚠ Error loading DB, creating fresh DB.");
  }
}

// Save DB to file
function saveDB() {
  fs.writeFileSync(DB_FILE, JSON.stringify(DB, null, 2));
}

// ===============================
// TEMP OTP STORE (NOT PERMANENT)
// ===============================
const OTP_STORE = {}; 
// format:
// OTP_STORE[email] = { emailOtp, mobileOtp, role, name, mobile, spec?, expires }

// ===============================
// EMAIL SENDER (Gmail SMTP)
// ===============================
const mailer = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "YOUR_GMAIL@gmail.com",
    pass: "YOUR_APP_PASSWORD"  // Gmail App Password ONLY
  }
});

// ===============================
// SMS SENDER (Fast2SMS or other)
// ===============================
// Replace "YOUR_API_KEY"
async function sendSMS(mobile, otp) {
  try {
    await axios.post("https://www.fast2sms.com/dev/bulkV2", {
      route: "v3",
      sender_id: "TXTIND",
      message: `Your DoctorCare OTP is ${otp}`,
      language: "english",
      flash: 0,
      numbers: mobile
    }, {
      headers: {
        authorization: "YOUR_FAST2SMS_API_KEY"
      }
    });
    return true;
  } catch (err) {
    console.log("SMS ERROR:", err.response?.data || err);
    return false;
  }
}

// ===============================
// OTP GENERATOR
// ===============================
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ===============================
// API: SEND OTP FOR SIGNUP
// ===============================
app.post("/api/signup/sendOtp", async (req, res) => {
  const { role, name, email, mobile, spec } = req.body;

  if (!role || !name || !email || !mobile)
    return res.status(400).json({ message: "Missing fields" });

  // Check already exists in server DB
  if (DB[role + "s"].some(u => u.email === email))
    return res.status(409).json({ message: "Email already exists" });

  if (DB[role + "s"].some(u => u.mobile === mobile))
    return res.status(409).json({ message: "Mobile already exists" });

  const emailOtp = generateOTP();
  const mobileOtp = generateOTP();

  // Save OTP data
  OTP_STORE[email] = {
    role, name, email, mobile, spec,
    emailOtp, mobileOtp,
    expires: Date.now() + (5 * 60 * 1000)
  };

  // Send email OTP
  try {
    await mailer.sendMail({
      from: "DoctorCare <YOUR_GMAIL@gmail.com>",
      to: email,
      subject: "DoctorCare Email Verification OTP",
      text: `Your email OTP is: ${emailOtp}`
    });
  } catch (e) {
    console.log("Email error:", e);
  }

  // Send mobile OTP via SMS
  await sendSMS(mobile, mobileOtp);

  return res.json({ message: "OTP Sent to Email & Mobile" });
});

// ===============================
// API: VERIFY SIGNUP OTP + CREATE ACCOUNT
// ===============================
app.post("/api/signup/verifyOtp", async (req, res) => {
  const { role, name, email, mobile, spec, emailOtp, mobileOtp, password } = req.body;

  const record = OTP_STORE[email];
  if (!record)
    return res.status(400).json({ message: "OTP not requested" });

  if (Date.now() > record.expires)
    return res.status(400).json({ message: "OTP expired" });

  if (record.emailOtp !== emailOtp)
    return res.status(400).json({ message: "Wrong Email OTP" });

  if (record.mobileOtp !== mobileOtp)
    return res.status(400).json({ message: "Wrong Mobile OTP" });

  // Hash password
  const hashed = await bcrypt.hash(password, 10);

  const user = {
    id: Date.now().toString(),
    name,
    email,
    mobile,
    spec: spec || "",
    password: hashed
  };

  DB[role + "s"].push(user);
  saveDB();

  // Delete OTP temp
  delete OTP_STORE[email];

  return res.json({ message: "Signup Successful", user });
});

// ===============================
// API: SEND OTP FOR FORGOT PASSWORD
// ===============================
app.post("/api/forgot/sendOtp", async (req, res) => {
  const { role, email } = req.body;

  if (!role || !email)
    return res.status(400).json({ message: "Missing fields" });

  const user = DB[role + "s"].find(u => u.email === email);
  if (!user)
    return res.status(404).json({ message: "Email not found" });

  const otp = generateOTP();

  OTP_STORE[email] = {
    role,
    email,
    forgotOtp: otp,
    expires: Date.now() + (5 * 60 * 1000)
  };

  // Send Email OTP
  try {
    await mailer.sendMail({
      from: "DoctorCare <YOUR_GMAIL@gmail.com>",
      to: email,
      subject: "DoctorCare Password Reset OTP",
      text: `Your OTP is: ${otp}`
    });
  } catch (e) {}

  // SMS
  await sendSMS(user.mobile, otp);

  return res.json({ message: "OTP Sent" });
});

// ===============================
// API: RESET PASSWORD
// ===============================
app.post("/api/forgot/resetPassword", async (req, res) => {
  const { role, email, otp, newPassword } = req.body;

  const record = OTP_STORE[email];
  if (!record)
    return res.status(400).json({ message: "OTP not requested" });

  if (Date.now() > record.expires)
    return res.status(400).json({ message: "OTP expired" });

  if (record.forgotOtp !== otp)
    return res.status(400).json({ message: "Invalid OTP" });

  const user = DB[role + "s"].find(u => u.email === email);
  if (!user)
    return res.status(404).json({ message: "User not found" });

  user.password = await bcrypt.hash(newPassword, 10);
  saveDB();

  delete OTP_STORE[email];

  return res.json({ message: "Password reset successful" });
});

// ===============================
// STATIC FILES (FRONTEND PWA)
// ===============================
app.use(express.static(__dirname));

app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));

app.get(/.*/, (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ===============================
// SOCKET.IO SIGNALING SERVER
// ===============================
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: "*", methods: ["GET", "POST"] }
});

io.on("connection", socket => {
  console.log("User connected:", socket.id);

  socket.on("join-room", roomId => {
    socket.join(roomId);
  });

  socket.on("offer", payload => {
    socket.to(payload.roomId).emit("offer", payload);
  });

  socket.on("answer", payload => {
    socket.to(payload.roomId).emit("answer", payload);
  });

  socket.on("ice-candidate", payload => {
    socket.to(payload.roomId).emit("ice-candidate", payload);
  });

  socket.on("disconnect", () => {});
});

// ===============================
// START SERVER
// ===============================
const PORT = 5000;
server.listen(PORT, "0.0.0.0", () => {
  console.log(`🚀 DoctorCare Combined Server running`);
  console.log(`🌐 http://localhost:${PORT}`);
});
