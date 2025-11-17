// ===============================================
// DoctorCare — Offline PWA (LocalStorage + WebRTC)
// Author: Rohith Annadatha
// Updated: 2025-11-17
// ===============================================

console.log('[DoctorCare] app.js loading...');

// -----------------------
// Local Storage Handling
// -----------------------
const STORE_KEY = 'doctorcare_store_v1';

function loadStore() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; }
  catch { return {}; }
}

function saveStore(data) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(data)); }
  catch {}
}

const store = loadStore();
if (!store.doctors) store.doctors = [];
if (!store.patients) store.patients = [];
if (!store.appointments) store.appointments = [];
if (!store.prescriptions) store.prescriptions = [];
if (!store.session) store.session = { role: null, id: null };
saveStore(store);

// -----------------------
// Utilities
// -----------------------
const $ = (id) => document.getElementById(id);
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const hash = (s) => btoa(unescape(encodeURIComponent(s)));

const toast = (m) => {
  const t = $('toast');
  if (t) {
    t.innerText = m;
    t.style.display = 'block';
    setTimeout(() => (t.style.display = 'none'), 2500);
  }
  console.log('[toast]', m);
};

// -----------------------
// OTP Management
// -----------------------
function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

let tempPatientSignup = null;
let doctorFPTemp = null;
let patientFPTemp = null;

// -----------------------
// Mobile Number Verification
// -----------------------
function mobileExists(mobile) {
  return store.doctors.some(d => d.mobile === mobile) ||
         store.patients.some(p => p.mobile === mobile);
}

// -----------------------
// Session Helpers
// -----------------------
function setSession(role, id) {
  store.session = { role, id };
  saveStore(store);
}

function currentDoctor() {
  return store.session.role === 'doctor' ?
    store.doctors.find((d) => d.id === store.session.id) : null;
}

function currentPatient() {
  return store.session.role === 'patient' ?
    store.patients.find((p) => p.id === store.session.id) : null;
}

function endSession() {
  store.session = { role: null, id: null };
  saveStore(store);
  navigate('#/');
}

// -----------------------
// Router
// -----------------------
const routes = {
  '#/': routeHome,
  '#/doctor-login': routeDoctorLogin,
  '#/doctor-signup': routeDoctorSignup,
  '#/patient-login': routePatientLogin,
  '#/patient-signup': routePatientSignup,
  '#/doctor-dashboard': routeDoctorDashboard,
  '#/patient-dashboard': routePatientDashboard,
  '#/book-appointment': routeBookAppointment,
  '#/prescriptions': routePrescriptions,
  '#/billing': routeBilling,
  '#/video-call': routeVideoCall,
  '#/doctor-forgot': routeDoctorForgot,
  '#/patient-forgot': routePatientForgot
};

function navigate(hash) {
  location.hash = hash;
}

function router() {
  const h = location.hash || '#/';
  (routes[h] || routeHome)();
}

window.addEventListener('hashchange', router);
window.addEventListener('load', () => {
  if ('serviceWorker' in navigator)
    navigator.serviceWorker.register('./service-worker.js').catch(() => {});
  router();
});

// -----------------------
// Layout Shell
// -----------------------
function shell(title, body) {
  $('app').innerHTML = `
    <div class="container">
      <div class="card">
        <h2>${title}</h2>
        ${body}
      </div>
    </div>`;
}

// -----------------------
// HOME SCREEN
// -----------------------
function routeHome() {
  $('app').innerHTML = `
    <div class="container">
      <div class="row">

        <div class="col card zig1" onclick="navigate('#/doctor-signup')">
          <h3>🩺 Doctor Signup</h3>
          <p class="small">Create your doctor account</p>
        </div>

        <div class="col card zig2" onclick="navigate('#/doctor-login')">
          <h3>👨‍⚕️ Doctor Login</h3>
          <p class="small">Access your dashboard</p>
        </div>

        <div class="col card zig1" onclick="navigate('#/patient-signup')">
          <h3>📝 Patient Signup</h3>
          <p class="small">Create your patient account</p>
        </div>

        <div class="col card zig2" onclick="navigate('#/patient-login')">
          <h3>👩‍⚕️ Patient Login</h3>
          <p class="small">Book appointments & view records</p>
        </div>

      </div>
    </div>`;
}

// -----------------------
// DOCTOR SIGNUP
// -----------------------
function routeDoctorSignup() {
  shell('Doctor Signup', `
    <input id="ds_name" class="input" placeholder="Full Name"><br>
    <input id="ds_email" class="input" placeholder="Email"><br>
    <input id="ds_mobile" class="input" placeholder="Mobile Number"><br>
    <input id="ds_spec" class="input" placeholder="Specialization"><br>
    <input id="ds_password" type="password" class="input" placeholder="Password"><br>

    <button class="button" onclick="doDoctorSignup()">Create Account</button>
    <button class="button secondary" onclick="history.back()">Cancel</button>
  `);
}

function doDoctorSignup() {
  const d = {
    id: uid(),
    name: $('ds_name').value,
    email: $('ds_email').value,
    mobile: $('ds_mobile').value,
    spec: $('ds_spec').value,
    password: hash($('ds_password').value)
  };

  if (!d.name || !d.email || !d.mobile || !d.password)
    return toast('Missing details');

  if (store.doctors.some(x => x.email === d.email))
    return toast('Email already exists');

  if (mobileExists(d.mobile))
    return toast('Mobile number already registered');

  store.doctors.push(d);
  saveStore(store);

  toast('Doctor registered');
  navigate('#/doctor-login');
}

// -----------------------
// DOCTOR LOGIN
// -----------------------
function routeDoctorLogin() {
  shell('Doctor Login', `
    <input id="dl_email" class="input" placeholder="Email"><br>
    <input id="dl_password" type="password" class="input" placeholder="Password"><br>

    <button class="button" onclick="doDoctorLogin()">Login</button>
    <button class="button secondary" onclick="navigate('#/doctor-forgot')">Forgot Password?</button>
    <button class="button secondary" onclick="history.back()">Cancel</button>
  `);
}

function doDoctorLogin() {
  const email = $('dl_email').value;
  const pass = hash($('dl_password').value);

  const d = store.doctors.find(x => x.email === email && x.password === pass);
  if (!d) return toast('Invalid credentials');

  setSession('doctor', d.id);
  toast('Welcome ' + d.name);
  navigate('#/doctor-dashboard');
}

// -----------------------
// DOCTOR FORGOT PASSWORD
// -----------------------
function routeDoctorForgot() {
  shell('Reset Password (Doctor)', `
    <input id="fp_email" class="input" placeholder="Enter Email"><br>
    <button class="button" onclick="doctorSendOTP()">Send OTP</button>

    <div id="doctor_fp_area" style="display:none;margin-top:10px">
      <input id="fp_otp" class="input" placeholder="Enter OTP"><br>
      <input id="fp_new" type="password" class="input" placeholder="New Password"><br>
      <button class="button" onclick="doctorResetPassword()">Reset</button>
    </div>

    <button class="button secondary" onclick="history.back()">Cancel</button>
  `);
}

function doctorSendOTP() {
  const email = $('fp_email').value.trim();
  const user = store.doctors.find(d => d.email === email);

  if (!user) return toast('Email not found');

  const code = generateOTP();
  doctorFPTemp = { email, code };

  toast('Doctor OTP: ' + code);
  $('doctor_fp_area').style.display = 'block';
}

function doctorResetPassword() {
  const otp = $('fp_otp').value.trim();
  const newPass = $('fp_new').value;

  if (!doctorFPTemp) return toast('Request OTP first');
  if (otp !== doctorFPTemp.code) return toast('Wrong OTP');

  const user = store.doctors.find(d => d.email === doctorFPTemp.email);
  user.password = hash(newPass);
  saveStore(store);

  toast('Password updated!');
  navigate('#/doctor-login');
}

// -----------------------
// PATIENT SIGNUP (with OTP)
// -----------------------
function routePatientSignup() {
  shell('Patient Signup', `
    <input id="ps_name" class="input" placeholder="Full Name"><br>
    <input id="ps_email" class="input" placeholder="Email"><br>
    <input id="ps_mobile" class="input" placeholder="Mobile Number"><br>

    <button class="button" onclick="patientSendOTP()">Verify Email & Mobile</button>

    <div id="ps_otp_section" style="display:none;margin-top:10px">
      <input id="ps_eotp" class="input" placeholder="Enter Email OTP"><br>
      <input id="ps_motp" class="input" placeholder="Enter Mobile OTP"><br>
      <input id="ps_password" type="password" class="input" placeholder="Password"><br>
      <button class="button" onclick="doPatientSignup()">Create Account</button>
    </div>

    <button class="button secondary" onclick="history.back()">Cancel</button>
  `);
}

function patientSendOTP() {
  const name = $('ps_name').value.trim();
  const email = $('ps_email').value.trim();
  const mobile = $('ps_mobile').value.trim();

  if (!name || !email || !mobile)
    return toast('Fill all fields');

  if (store.patients.some(x => x.email === email))
    return toast('Email already exists');

  if (mobileExists(mobile))
    return toast('Mobile number already registered');

  const eOTP = generateOTP();
  const mOTP = generateOTP();

  tempPatientSignup = {
    name, email, mobile,
    eOTP, mOTP
  };

  toast(`Email OTP: ${eOTP} | Mobile OTP: ${mOTP}`);
  $('ps_otp_section').style.display = 'block';
}

function doPatientSignup() {
  if (!tempPatientSignup) return toast('Verify details first');

  const eotp = $('ps_eotp').value.trim();
  const motp = $('ps_motp').value.trim();
  const pass = $('ps_password').value;

  if (eotp !== tempPatientSignup.eOTP) return toast('Wrong Email OTP');
  if (motp !== tempPatientSignup.mOTP) return toast('Wrong Mobile OTP');

  const p = {
    id: uid(),
    name: tempPatientSignup.name,
    email: tempPatientSignup.email,
    mobile: tempPatientSignup.mobile,
    password: hash(pass)
  };

  store.patients.push(p);
  saveStore(store);

  toast('Patient Registered');
  navigate('#/patient-login');
}

// -----------------------
// PATIENT LOGIN
// -----------------------
function routePatientLogin() {
  shell('Patient Login', `
    <input id="pl_email" class="input" placeholder="Email"><br>
    <input id="pl_pass" type="password" class="input" placeholder="Password"><br>

    <button class="button" onclick="doPatientLogin()">Login</button>
    <button class="button secondary" onclick="navigate('#/patient-forgot')">Forgot Password?</button>
    <button class="button secondary" onclick="history.back()">Cancel</button>
  `);
}

function doPatientLogin() {
  const email = $('pl_email').value;
  const password = hash($('pl_pass').value);

  const p = store.patients.find(u => u.email === email && u.password === password);
  if (!p) return toast('Invalid credentials');

  setSession('patient', p.id);
  toast('Welcome ' + p.name);
  navigate('#/patient-dashboard');
}

// -----------------------
// PATIENT FORGOT PASSWORD
// -----------------------
function routePatientForgot() {
  shell('Reset Password (Patient)', `
    <input id="pf_email" class="input" placeholder="Enter Email"><br>
    <button class="button" onclick="patientSendFPOTP()">Send OTP</button>

    <div id="pf_box" style="display:none;margin-top:10px">
      <input id="pf_otp" class="input" placeholder="OTP"><br>
      <input id="pf_new" class="input" type="password" placeholder="New Password"><br>
      <button class="button" onclick="patientResetPassword()">Reset</button>
    </div>

    <button class="button secondary" onclick="history.back()">Cancel</button>
  `);
}

function patientSendFPOTP() {
  const email = $('pf_email').value.trim();
  const p = store.patients.find(u => u.email === email);

  if (!p) return toast('Email not found');

  const OTP = generateOTP();
  patientFPTemp = { email, otp: OTP };

  toast('Patient OTP: ' + OTP);
  $('pf_box').style.display = 'block';
}

function patientResetPassword() {
  const otp = $('pf_otp').value.trim();
  const pass = $('pf_new').value;

  if (!patientFPTemp) return toast('Request OTP first');
  if (otp !== patientFPTemp.otp) return toast('Wrong OTP');

  const user = store.patients.find(u => u.email === patientFPTemp.email);
  user.password = hash(pass);
  saveStore(store);

  toast('Password Updated');
  navigate('#/patient-login');
}

// -----------------------
// DOCTOR DASHBOARD
// -----------------------
function routeDoctorDashboard() {
  const d = currentDoctor();
  if (!d) return navigate('#/doctor-login');

  $('app').innerHTML = `
    <div class="container">
      <div class="card">
        <h2>Doctor Dashboard</h2>
        <p>${d.name}</p>

        <button class="button" onclick="navigate('#/book-appointment')">Appointments</button>
        <button class="button" onclick="navigate('#/prescriptions')">Prescriptions</button>
        <button class="button" onclick="navigate('#/billing')">Billing</button>
        <button class="button" onclick="navigate('#/video-call')">Video Call</button>
        <button class="button secondary" onclick="endSession()">Logout</button>
      </div>
    </div>
  `;
}

// -----------------------
// PATIENT DASHBOARD
// -----------------------
function routePatientDashboard() {
  const p = currentPatient();
  if (!p) return navigate('#/patient-login');

  $('app').innerHTML = `
    <div class="container">
      <div class="card">
        <h2>Patient Dashboard</h2>
        <p>${p.name}</p>

        <button class="button" onclick="navigate('#/book-appointment')">Book Appointment</button>
        <button class="button" onclick="navigate('#/prescriptions')">Prescriptions</button>
        <button class="button" onclick="navigate('#/billing')">Billing</button>
        <button class="button" onclick="navigate('#/video-call')">Video Call</button>
        <button class="button secondary" onclick="endSession()">Logout</button>
      </div>
    </div>
  `;
}

// -----------------------
// BOOK APPOINTMENT
// -----------------------
function routeBookAppointment() {
  const doctors = store.doctors.map(d => `<option value="${d.id}">${d.name}</option>`).join('');
  const patients = store.patients.map(p => `<option value="${p.id}">${p.name}</option>`).join('');

  shell('Book Appointment', `
    <select id="doctorId" class="input">${doctors}</select><br>
    <select id="patientId" class="input">${patients}</select><br>
    <input id="apptTime" class="input" placeholder="Time (YYYY-MM-DD HH:MM)"><br>

    <button class="button" onclick="saveAppointment()">Save</button>
    <button class="button secondary" onclick="history.back()">Cancel</button>
  `);
}

function saveAppointment() {
  const a = {
    id: uid(),
    doctorId: $('doctorId').value,
    patientId: $('patientId').value,
    time: $('apptTime').value,
    status: 'Pending'
  };

  store.appointments.push(a);
  saveStore(store);
  toast('Appointment saved');
  history.back();
}

// -----------------------
// PRESCRIPTIONS & BILLING
// -----------------------
function routePrescriptions() {
  shell('Prescriptions', `
    <p>Prescription records coming soon.</p>
    <button class="button secondary" onclick="history.back()">Back</button>
  `);
}

function routeBilling() {
  shell('Billing Summary', `
    <p>Billing records coming soon.</p>
    <button class="button secondary" onclick="history.back()">Back</button>
  `);
}

// -----------------------
// VIDEO CALL (WebRTC)
// -----------------------
const SIGNALING_URL = window.location.origin;
const RTC_CONFIG = { iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }] };

let socket = null, pc = null, currentRoomId = null;

function ensureSocket() {
  if (socket) return;
  socket = io(SIGNALING_URL, { transports: ['websocket'], forceNew: true });

  socket.on('offer', onOffer);
  socket.on('answer', onAnswer);
  socket.on('ice-candidate', onRemoteIce);
}

async function routeVideoCall() {
  shell('Video Consultation', `
    <video id="localVideo" autoplay muted playsinline style="width:100%;background:#000;border-radius:10px"></video>
    <video id="remoteVideo" autoplay playsinline style="width:100%;background:#000;border-radius:10px"></video><br>

    <input id="roomId" class="input" placeholder="Room ID"><br>

    <button class="button" onclick="startCall()">Start Call</button>
    <button class="button secondary" onclick="joinCall()">Join Call</button>
    <button class="button secondary" onclick="endCall()">End</button>
  `);
}

async function startCall() {
  ensureSocket();
  currentRoomId = $('roomId').value || uid();

  socket.emit('join-room', currentRoomId);

  const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  $('localVideo').srcObject = stream;

  pc = new RTCPeerConnection(RTC_CONFIG);
  stream.getTracks().forEach(t => pc.addTrack(t, stream));

  pc.ontrack = e => $('remoteVideo').srcObject = e.streams[0];
  pc.onicecandidate = e => e.candidate && socket.emit('ice-candidate', { roomId: currentRoomId, candidate: e.candidate });

  const offer = await pc.createOffer();
  await pc.setLocalDescription(offer);

  socket.emit('offer', { roomId: currentRoomId, sdp: offer.sdp, type: 'offer' });
  toast('Room ID: ' + currentRoomId);
}

async function joinCall() {
  ensureSocket();
  currentRoomId = $('roomId').value.trim();
  if (!currentRoomId) return toast('Enter Room ID');

  socket.emit('join-room', currentRoomId);

  const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  $('localVideo').srcObject = stream;

  pc = new RTCPeerConnection(RTC_CONFIG);
  stream.getTracks().forEach(t => pc.addTrack(t, stream));

  pc.ontrack = e => $('remoteVideo').srcObject = e.streams[0];
  pc.onicecandidate = e => e.candidate && socket.emit('ice-candidate', { roomId: currentRoomId, candidate: e.candidate });
}

async function onOffer(payload) {
  ensureSocket();
  currentRoomId = payload.roomId;

  socket.emit('join-room', currentRoomId);

  pc = new RTCPeerConnection(RTC_CONFIG);
  pc.ontrack = e => $('remoteVideo').srcObject = e.streams[0];
  pc.onicecandidate = e => e.candidate && socket.emit('ice-candidate', {
    roomId: currentRoomId,
    candidate: e.candidate
  });

  const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
  $('localVideo').srcObject = stream;
  stream.getTracks().forEach(t => pc.addTrack(t, stream));

  await pc.setRemoteDescription({ type: 'offer', sdp: payload.sdp });
  const answer = await pc.createAnswer();
  await pc.setLocalDescription(answer);

  socket.emit('answer', { roomId: currentRoomId, sdp: answer.sdp, type: 'answer' });
}

async function onAnswer(payload) {
  await pc.setRemoteDescription({ type: 'answer', sdp: payload.sdp });
}

function onRemoteIce(payload) {
  if (pc && payload.candidate)
    pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
}

function endCall() {
  if (pc) pc.close();
  pc = null;
  toast('Call ended');
}

console.log('[DoctorCare] app.js initialized successfully!');
