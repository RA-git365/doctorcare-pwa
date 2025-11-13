// ===============================================
// DoctorCare — Offline PWA (LocalStorage + WebRTC)
// Author: Rohith Annadatha
// ===============================================

console.log('[DoctorCare] app.js loading...');

// -----------------------
// Local Storage Handling
// -----------------------
const STORE_KEY = 'doctorcare_store_v1';
function loadStore() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch { return {}; }
}
function saveStore(data) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(data)); } catch {}
}

const store = loadStore();
if (!store.doctors) store.doctors = [];
if (!store.patients) store.patients = [];
if (!store.appointments) store.appointments = [];
if (!store.prescriptions) store.prescriptions = [];
if (!store.session) store.session = { role: null, id: null };
saveStore(store);

const $ = (id) => document.getElementById(id);
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const hash = (s) => btoa(unescape(encodeURIComponent(s)));
const toast = (m) => {
  const t = $('toast');
  if (t) {
    t.innerText = m;
    t.style.display = 'block';
    setTimeout(() => (t.style.display = 'none'), 2000);
  }
  console.log('[toast]', m);
};

// -----------------------
// Session Helpers
// -----------------------
function setSession(role, id) {
  store.session = { role, id };
  saveStore(store);
}
function currentDoctor() {
  return store.session.role === 'doctor'
    ? store.doctors.find((d) => d.id === store.session.id)
    : null;
}
function currentPatient() {
  return store.session.role === 'patient'
    ? store.patients.find((p) => p.id === store.session.id)
    : null;
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
  '#/video-call': routeVideoCall
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
// AUTH SCREENS
// -----------------------
function routeDoctorSignup() {
  shell('Doctor Signup', `
    <input id="ds_name" class="input" placeholder="Full Name"><br>
    <input id="ds_email" class="input" placeholder="Email"><br>
    <input id="ds_mobile" class="input" placeholder="Mobile"><br>
    <input id="ds_spec" class="input" placeholder="Specialization"><br>
    <input id="ds_password" type="password" class="input" placeholder="Password"><br>
    <button class="button" onclick="doDoctorSignup()">Create Account</button>
    <button class="button secondary" onclick="navigate('#/')">Cancel</button>
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
  if (!d.name || !d.email || !d.password) return toast('Missing details');
  if (store.doctors.some((x) => x.email === d.email)) return toast('Email exists');
  store.doctors.push(d);
  saveStore(store);
  toast('Doctor registered');
  navigate('#/doctor-login');
}

function routeDoctorLogin() {
  shell('Doctor Login', `
    <input id="dl_email" class="input" placeholder="Email"><br>
    <input id="dl_password" type="password" class="input" placeholder="Password"><br>
    <button class="button" onclick="doDoctorLogin()">Login</button>
    <button class="button secondary" onclick="navigate('#/')">Cancel</button>
  `);
}
function doDoctorLogin() {
  const email = $('dl_email').value, pass = hash($('dl_password').value);
  const d = store.doctors.find((x) => x.email === email && x.password === pass);
  if (!d) return toast('Invalid credentials');
  setSession('doctor', d.id);
  toast('Welcome ' + d.name);
  navigate('#/doctor-dashboard');
}

function routePatientSignup() {
  shell('Patient Signup', `
    <input id="ps_name" class="input" placeholder="Full Name"><br>
    <input id="ps_email" class="input" placeholder="Email"><br>
    <input id="ps_password" type="password" class="input" placeholder="Password"><br>
    <button class="button" onclick="doPatientSignup()">Create Account</button>
    <button class="button secondary" onclick="navigate('#/')">Cancel</button>
  `);
}
function doPatientSignup() {
  const p = {
    id: uid(),
    name: $('ps_name').value,
    email: $('ps_email').value,
    password: hash($('ps_password').value)
  };
  if (!p.name || !p.email || !p.password) return toast('Missing details');
  if (store.patients.some((x) => x.email === p.email)) return toast('Email exists');
  store.patients.push(p);
  saveStore(store);
  toast('Patient registered');
  navigate('#/patient-login');
}

function routePatientLogin() {
  shell('Patient Login', `
    <input id="pl_email" class="input" placeholder="Email"><br>
    <input id="pl_password" type="password" class="input" placeholder="Password"><br>
    <button class="button" onclick="doPatientLogin()">Login</button>
    <button class="button secondary" onclick="navigate('#/')">Cancel</button>
  `);
}
function doPatientLogin() {
  const email = $('pl_email').value, pass = hash($('pl_password').value);
  const p = store.patients.find((x) => x.email === email && x.password === pass);
  if (!p) return toast('Invalid credentials');
  setSession('patient', p.id);
  toast('Welcome ' + p.name);
  navigate('#/patient-dashboard');
}

// -----------------------
// DASHBOARDS
// -----------------------
function routeDoctorDashboard() {
  const d = currentDoctor(); if (!d) return navigate('#/doctor-login');
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
    </div>`;
}

function routePatientDashboard() {
  const p = currentPatient(); if (!p) return navigate('#/patient-login');
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
    </div>`;
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
    <input id="apptTime" class="input" placeholder="Time (e.g., 2025-11-20 10:00)"><br>
    <button class="button" onclick="saveAppointment()">Save</button>
    <button class="button secondary" onclick="navigate('#/')">Cancel</button>
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
  navigate('#/');
}

// -----------------------
// PRESCRIPTIONS + BILLING (simple demo)
// -----------------------
function routePrescriptions() {
  shell('Prescriptions', `<p>Prescription records coming soon.</p>
    <button class="button secondary" onclick="navigate('#/')">Back</button>`);
}
function routeBilling() {
  shell('Billing Summary', `<p>Billing records coming soon.</p>
    <button class="button secondary" onclick="navigate('#/')">Back</button>`);
}

// -----------------------
// VIDEO CALL (WebRTC + Socket.io)
// -----------------------
const SIGNALING_URL = window.location.origin;
const RTC_CONFIG = { iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }] };
let socket = null, pc = null, localStream = null, currentRoomId = null;

function ensureSocket() {
  if (socket) return;
  socket = io(SIGNALING_URL, { transports: ['websocket'], forceNew: true });
  socket.on('offer', onOffer);
  socket.on('answer', onAnswer);
  socket.on('ice-candidate', onRemoteIce);
}

async function routeVideoCall() {
  shell('Video Consultation', `
    <video id="localVideo" autoplay muted playsinline style="width:100%;border-radius:10px;background:#000"></video>
    <video id="remoteVideo" autoplay playsinline style="width:100%;border-radius:10px;background:#000"></video>
    <br>
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
  toast('Call started. Share Room ID: ' + currentRoomId);
}

async function joinCall() {
  ensureSocket();
  currentRoomId = $('roomId').value.trim();
  if (!currentRoomId) return toast('Enter room ID');
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
  pc.onicecandidate = e => e.candidate && socket.emit('ice-candidate', { roomId: currentRoomId, candidate: e.candidate });
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
  if (pc && payload.candidate) pc.addIceCandidate(new RTCIceCandidate(payload.candidate));
}

function endCall() {
  if (pc) pc.close();
  pc = null;
  toast('Call ended');
}

console.log('[DoctorCare] app.js initialized ✅');
