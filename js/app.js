// ===============================================
// DoctorCare — Online OTP + Forgot Password (client-side)
// Author: Rohith Annadatha
// Updated: 2025-11-17 (Full rewrite — online OTP & forgot password integrated)
// ===============================================

console.log('[DoctorCare] app.js loading...');

// -----------------------
// CONFIG
// -----------------------
// Toggle remote AI usage (chatbot). Leave false unless you deploy server proxy.
const USE_REMOTE_AI = false;

// Replace with your deployed backend URL (no trailing slash)
const SERVER_URL = 'https://your-server-url.com';

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
// Temp holders (client-side only)
// -----------------------
let tempPatientSignup = null; // { name, email, mobile }
let tempDoctorSignup = null;  // { name, email, mobile, spec }
let doctorFPTemp = null;      // { email }
let patientFPTemp = null;     // { email }

// -----------------------
// Mobile check (client-side quick check)
// -----------------------
function mobileExists(mobile) {
  return store.doctors.some(d => d.mobile === mobile) || store.patients.some(p => p.mobile === mobile);
}

// -----------------------
// Session Helpers
// -----------------------
function setSession(role, id) {
  store.session = { role, id };
  saveStore(store);
}
function currentDoctor() {
  return store.session.role === 'doctor' ? store.doctors.find((d) => d.id === store.session.id) : null;
}
function currentPatient() {
  return store.session.role === 'patient' ? store.patients.find((p) => p.id === store.session.id) : null;
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
function navigate(hash) { location.hash = hash; }
function router() {
  const h = location.hash || '#/';
  (routes[h] || routeHome)();
}
window.addEventListener('hashchange', router);
window.addEventListener('load', () => {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./service-worker.js').catch(()=>{});
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
          <h3>🩺 Doctor Signup</h3><p class="small">Create your doctor account</p>
        </div>
        <div class="col card zig2" onclick="navigate('#/doctor-login')">
          <h3>👨‍⚕️ Doctor Login</h3><p class="small">Access your dashboard</p>
        </div>
        <div class="col card zig1" onclick="navigate('#/patient-signup')">
          <h3>📝 Patient Signup</h3><p class="small">Create your patient account</p>
        </div>
        <div class="col card zig2" onclick="navigate('#/patient-login')">
          <h3>👩‍⚕️ Patient Login</h3><p class="small">Book appointments & view records</p>
        </div>
      </div>
    </div>`;
}

// -----------------------
// DOCTOR: Signup / Login / Forgot (ONLINE verification)
// -----------------------
function routeDoctorSignup() {
  shell('Doctor Signup', `
    <input id="ds_name" class="input" placeholder="Full Name"><br>
    <input id="ds_email" class="input" placeholder="Email"><br>
    <input id="ds_mobile" class="input" placeholder="Mobile Number"><br>
    <input id="ds_spec" class="input" placeholder="Specialization"><br>
    <div id="ds_verify_area">
      <button class="button" onclick="doctorSendSignupOtp()">Verify Email & Mobile</button>
    </div>

    <div id="ds_otp_section" style="display:none;margin-top:10px">
      <input id="ds_eotp" class="input" placeholder="Enter Email OTP"><br>
      <input id="ds_motp" class="input" placeholder="Enter Mobile OTP"><br>
      <input id="ds_password" type="password" class="input" placeholder="Password"><br>
      <button class="button" onclick="doDoctorSignup()">Create Account</button>
    </div>

    <button class="button secondary" onclick="history.back()">Cancel</button>
  `);
}

// sends signup OTPs (server will validate uniqueness and send OTPs via email+SMS)
async function doctorSendSignupOtp() {
  const name = $('ds_name').value && $('ds_name').value.trim();
  const email = $('ds_email').value && $('ds_email').value.trim();
  const mobile = $('ds_mobile').value && $('ds_mobile').value.trim();
  const spec = $('ds_spec').value && $('ds_spec').value.trim();

  if (!name || !email || !mobile || !spec) return toast('Fill all fields');

  // quick client check
  if (mobileExists(mobile)) return toast('Mobile number already registered locally');

  try {
    const resp = await fetch(`${SERVER_URL}/api/signup/sendOtp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'doctor', name, email, mobile, spec })
    });
    const j = await resp.json();
    if (!resp.ok) return toast(j.message || 'Server error');

    // server accepted — show OTP inputs
    tempDoctorSignup = { name, email, mobile, spec };
    $('ds_otp_section').style.display = 'block';
    toast('OTP sent to email & mobile');
  } catch (e) {
    console.error(e);
    toast('Unable to contact server');
  }
}

// verifies OTPs via server and creates account on server; also save to local store
async function doDoctorSignup() {
  if (!tempDoctorSignup) return toast('Verify email & mobile first');

  const eotp = $('ds_eotp').value && $('ds_eotp').value.trim();
  const motp = $('ds_motp').value && $('ds_motp').value.trim();
  const password = $('ds_password').value;

  if (!eotp || !motp || !password) return toast('Enter OTPs and password');

  try {
    const resp = await fetch(`${SERVER_URL}/api/signup/verifyOtp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: 'doctor',
        name: tempDoctorSignup.name,
        email: tempDoctorSignup.email,
        mobile: tempDoctorSignup.mobile,
        spec: tempDoctorSignup.spec,
        emailOtp: eotp,
        mobileOtp: motp,
        password // plain password sent to server for account creation (server must hash)
      })
    });
    const j = await resp.json();
    if (!resp.ok) return toast(j.message || 'Verification failed');

    // server returns created user object (id, name, email, mobile, spec)
    const created = j.user;
    if (!created) return toast('Server did not return user');

    // save to local store (hash password for local)
    const d = {
      id: created.id || uid(),
      name: created.name,
      email: created.email,
      mobile: created.mobile,
      spec: created.spec || '',
      password: hash(password)
    };
    store.doctors.push(d);
    saveStore(store);

    tempDoctorSignup = null;
    $('ds_otp_section').style.display = 'none';
    toast('Doctor registered');
    navigate('#/doctor-login');

  } catch (e) {
    console.error(e);
    toast('Server error');
  }
}

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
  const email = $('dl_email').value, pass = hash($('dl_password').value);
  const d = store.doctors.find((x) => x.email === email && x.password === pass);
  if (!d) return toast('Invalid credentials');
  setSession('doctor', d.id); toast('Welcome ' + d.name); navigate('#/doctor-dashboard');
}

// -----------------------
// DOCTOR FORGOT PASSWORD (ONLINE)
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

// Server sends OTP to email/SMS for forgot password
async function doctorSendOTP() {
  const email = $('fp_email').value && $('fp_email').value.trim();
  if (!email) return toast('Enter email');

  try {
    const resp = await fetch(`${SERVER_URL}/api/forgot/sendOtp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'doctor', email })
    });
    const j = await resp.json();
    if (!resp.ok) return toast(j.message || 'Server error');

    doctorFPTemp = { email };
    $('doctor_fp_area').style.display = 'block';
    toast('OTP sent to registered email/mobile');

  } catch (e) {
    console.error(e);
    toast('Unable to contact server');
  }
}

// Verify OTP with server and reset. Update local store password.
async function doctorResetPassword() {
  if (!doctorFPTemp) return toast('Request OTP first');
  const otp = $('fp_otp').value && $('fp_otp').value.trim();
  const newPass = $('fp_new').value && $('fp_new').value.trim();
  if (!otp || !newPass) return toast('Enter OTP and new password');

  try {
    const resp = await fetch(`${SERVER_URL}/api/forgot/resetPassword`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'doctor', email: doctorFPTemp.email, otp, newPassword: newPass })
    });
    const j = await resp.json();
    if (!resp.ok) return toast(j.message || 'Reset failed');

    // update local store if doctor exists locally
    const doc = store.doctors.find(d => d.email === doctorFPTemp.email);
    if (doc) {
      doc.password = hash(newPass);
      saveStore(store);
    }

    doctorFPTemp = null;
    toast('Password updated');
    navigate('#/doctor-login');

  } catch (e) {
    console.error(e);
    toast('Server error');
  }
}

// -----------------------
// PATIENT: Signup / Login / Forgot (ONLINE verification)
// -----------------------
function routePatientSignup() {
  shell('Patient Signup', `
    <input id="ps_name" class="input" placeholder="Full Name"><br>
    <input id="ps_email" class="input" placeholder="Email"><br>
    <input id="ps_mobile" class="input" placeholder="Mobile Number"><br>

    <div id="ps_verify_area">
      <button class="button" onclick="patientSendOTP()">Verify Email & Mobile</button>
    </div>

    <div id="ps_otp_section" style="display:none;margin-top:10px">
      <input id="ps_eotp" class="input" placeholder="Enter Email OTP"><br>
      <input id="ps_motp" class="input" placeholder="Enter Mobile OTP"><br>
      <input id="ps_password" type="password" class="input" placeholder="Password"><br>
      <button class="button" onclick="doPatientSignup()">Create Account</button>
    </div>

    <button class="button secondary" onclick="history.back()">Cancel</button>
  `);
}

// request server to send OTPs - server will enforce unique email/mobile
async function patientSendOTP() {
  const name = $('ps_name').value && $('ps_name').value.trim();
  const email = $('ps_email').value && $('ps_email').value.trim();
  const mobile = $('ps_mobile').value && $('ps_mobile').value.trim();

  if (!name || !email || !mobile) return toast('Fill all fields');

  if (mobileExists(mobile)) return toast('Mobile number already registered locally');

  try {
    const resp = await fetch(`${SERVER_URL}/api/signup/sendOtp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'patient', name, email, mobile })
    });
    const j = await resp.json();
    if (!resp.ok) return toast(j.message || 'Server error');

    tempPatientSignup = { name, email, mobile };
    $('ps_otp_section').style.display = 'block';
    toast('OTP sent to email & mobile');

  } catch (e) {
    console.error(e);
    toast('Unable to contact server');
  }
}

// verify OTP with server and create account (server returns created user)
async function doPatientSignup() {
  if (!tempPatientSignup) return toast('Verify details first');

  const eotp = $('ps_eotp').value && $('ps_eotp').value.trim();
  const motp = $('ps_motp').value && $('ps_motp').value.trim();
  const password = $('ps_password').value;

  if (!eotp || !motp || !password) return toast('Enter OTPs and password');

  try {
    const resp = await fetch(`${SERVER_URL}/api/signup/verifyOtp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        role: 'patient',
        name: tempPatientSignup.name,
        email: tempPatientSignup.email,
        mobile: tempPatientSignup.mobile,
        emailOtp: eotp,
        mobileOtp: motp,
        password
      })
    });
    const j = await resp.json();
    if (!resp.ok) return toast(j.message || 'Verification failed');

    const created = j.user;
    if (!created) return toast('Server did not return user');

    // save locally
    const p = {
      id: created.id || uid(),
      name: created.name,
      email: created.email,
      mobile: created.mobile,
      password: hash(password)
    };
    store.patients.push(p);
    saveStore(store);

    tempPatientSignup = null;
    $('ps_otp_section').style.display = 'none';
    toast('Patient registered');
    navigate('#/patient-login');

  } catch (e) {
    console.error(e);
    toast('Server error');
  }
}

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
  const email = $('pl_email').value, password = hash($('pl_pass').value);
  const p = store.patients.find(u => u.email === email && u.password === password);
  if (!p) return toast('Invalid credentials');
  setSession('patient', p.id); toast('Welcome ' + p.name); navigate('#/patient-dashboard');
}

// -----------------------
// PATIENT FORGOT PASSWORD (ONLINE)
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

// request server to send OTP for forgot password
async function patientSendFPOTP() {
  const email = $('pf_email').value && $('pf_email').value.trim();
  if (!email) return toast('Enter email');

  try {
    const resp = await fetch(`${SERVER_URL}/api/forgot/sendOtp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'patient', email })
    });
    const j = await resp.json();
    if (!resp.ok) return toast(j.message || 'Server error');

    patientFPTemp = { email };
    $('pf_box').style.display = 'block';
    toast('OTP sent');

  } catch (e) {
    console.error(e);
    toast('Unable to contact server');
  }
}

// verify OTP + reset via server, update local store if user exists locally
async function patientResetPassword() {
  if (!patientFPTemp) return toast('Request OTP first');
  const otp = $('pf_otp').value && $('pf_otp').value.trim();
  const newPass = $('pf_new').value && $('pf_new').value.trim();
  if (!otp || !newPass) return toast('Enter OTP and new password');

  try {
    const resp = await fetch(`${SERVER_URL}/api/forgot/resetPassword`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role: 'patient', email: patientFPTemp.email, otp, newPassword: newPass })
    });
    const j = await resp.json();
    if (!resp.ok) return toast(j.message || 'Reset failed');

    // update local store if present
    const user = store.patients.find(u => u.email === patientFPTemp.email);
    if (user) { user.password = hash(newPass); saveStore(store); }

    patientFPTemp = null;
    toast('Password Updated');
    navigate('#/patient-login');

  } catch (e) {
    console.error(e);
    toast('Server error');
  }
}

// -----------------------
// DASHBOARDS (unchanged)
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

        <div style="display:grid;grid-template-columns:1fr 360px;gap:16px;">
          <div>
            <button class="button" onclick="navigate('#/book-appointment')">Book Appointment</button>
            <button class="button" onclick="navigate('#/prescriptions')">Prescriptions</button>
            <button class="button" onclick="navigate('#/billing')">Billing</button>
            <button class="button" onclick="navigate('#/video-call')">Video Call</button>
          </div>

          <!-- Chatbot panel (local or remote depending on USE_REMOTE_AI) -->
          <div style="display:flex;flex-direction:column;gap:8px;">
            <div id="chatbox" style="height:360px;overflow:auto;border:1px solid #ddd;padding:10px;border-radius:8px;background:#fafafa"></div>
            <div style="display:flex;gap:8px;">
              <input id="chatInput" class="input" placeholder="Ask DoctorCare (symptoms, appointments, billing)..." style="flex:1">
              <button class="button" onclick="chatSend()">Send</button>
            </div>
            <div style="display:flex;gap:8px;">
              <button class="button secondary" onclick="chatClear()">Clear Chat</button>
              <button class="button secondary" onclick="chatSuggest('How do I book an appointment?')">Suggest</button>
              <button class="button secondary" onclick="chatSuggest('Symptoms: fever and cough')">Symptoms</button>
            </div>
          </div>
        </div>

        <br>
        <button class="button secondary" onclick="endSession()">Logout</button>
      </div>
    </div>
  `;

  setTimeout(() => { chatInit(); chatBotWelcome(); }, 50);
}

// -----------------------
// APPOINTMENT / PRESCRIPTIONS / BILLING (unchanged)
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
  const a = { id: uid(), doctorId: $('doctorId').value, patientId: $('patientId').value, time: $('apptTime').value, status: 'Pending' };
  store.appointments.push(a); saveStore(store);
  toast('Appointment saved'); history.back();
}
function routePrescriptions() { shell('Prescriptions', `<p>Prescription records coming soon.</p><button class="button secondary" onclick="history.back()">Back</button>`); }
function routeBilling() { shell('Billing Summary', `<p>Billing records coming soon.</p><button class="button secondary" onclick="history.back()">Back</button>`); }

// -----------------------
// VIDEO CALL (WebRTC) - unchanged
// -----------------------
const SIGNALING_URL = window.location.origin;
const RTC_CONFIG = { iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }] };
let socket = null, pc = null, currentRoomId = null;
function ensureSocket() {
  if (socket) return;
  socket = io(SIGNALING_URL, { transports: ['websocket'], forceNew: true });
  socket.on('offer', onOffer); socket.on('answer', onAnswer); socket.on('ice-candidate', onRemoteIce);
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
  ensureSocket(); currentRoomId = $('roomId').value || uid(); socket.emit('join-room', currentRoomId);
  const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true }); $('localVideo').srcObject = stream;
  pc = new RTCPeerConnection(RTC_CONFIG); stream.getTracks().forEach(t => pc.addTrack(t, stream));
  pc.ontrack = e => $('remoteVideo').srcObject = e.streams[0];
  pc.onicecandidate = e => e.candidate && socket.emit('ice-candidate', { roomId: currentRoomId, candidate: e.candidate });
  const offer = await pc.createOffer(); await pc.setLocalDescription(offer);
  socket.emit('offer', { roomId: currentRoomId, sdp: offer.sdp, type: 'offer' });
  toast('Room ID: ' + currentRoomId);
}
async function joinCall() {
  ensureSocket(); currentRoomId = $('roomId').value.trim(); if (!currentRoomId) return toast('Enter Room ID');
  socket.emit('join-room', currentRoomId);
  const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true }); $('localVideo').srcObject = stream;
  pc = new RTCPeerConnection(RTC_CONFIG); stream.getTracks().forEach(t => pc.addTrack(t, stream));
  pc.ontrack = e => $('remoteVideo').srcObject = e.streams[0];
  pc.onicecandidate = e => e.candidate && socket.emit('ice-candidate', { roomId: currentRoomId, candidate: e.candidate });
}
async function onOffer(payload) {
  ensureSocket(); currentRoomId = payload.roomId; socket.emit('join-room', currentRoomId);
  pc = new RTCPeerConnection(RTC_CONFIG);
  pc.ontrack = e => $('remoteVideo').srcObject = e.streams[0];
  pc.onicecandidate = e => e.candidate && socket.emit('ice-candidate', { roomId: currentRoomId, candidate: e.candidate });
  const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true }); $('localVideo').srcObject = stream; stream.getTracks().forEach(t => pc.addTrack(t, stream));
  await pc.setRemoteDescription({ type: 'offer', sdp: payload.sdp }); const answer = await pc.createAnswer(); await pc.setLocalDescription(answer);
  socket.emit('answer', { roomId: currentRoomId, sdp: answer.sdp, type: 'answer' });
}
async function onAnswer(payload) { await pc.setRemoteDescription({ type: 'answer', sdp: payload.sdp }); }
function onRemoteIce(payload) { if (pc && payload.candidate) pc.addIceCandidate(new RTCIceCandidate(payload.candidate)); }
function endCall() { if (pc) pc.close(); pc = null; toast('Call ended'); }

// -----------------------
// CHATBOT (local fallback OR remote via /api/chat if USE_REMOTE_AI true)
// -----------------------
// ... (same chatbot code as before; using localBotResponse if remote fails)
// For brevity I will reuse the same helper functions from earlier:
function chatInit() {
  const box = $('chatbox'); if (!box) return; box.innerHTML = ''; box._history = box._history || [];
}
function chatBotWelcome() { appendMessage('assistant', `Hi! I'm DoctorCare assistant. I can help with booking appointments, symptom triage, prescriptions, and billing. Try asking "I have fever" or "How do I book an appointment?"`); }
function appendMessage(role, text) {
  const box = $('chatbox'); if (!box) return;
  const el = document.createElement('div'); el.style.marginBottom = '8px'; el.style.display = 'flex'; el.style.flexDirection = 'column';
  if (role === 'user') el.innerHTML = `<div style="align-self:flex-end;background:#cfe9ff;padding:8px;border-radius:8px;max-width:85%">${escapeHtml(text)}</div>`;
  else el.innerHTML = `<div style="align-self:flex-start;background:#fff;padding:8px;border-radius:8px;max-width:85%;border:1px solid #eee">${escapeHtml(text)}</div>`;
  box.appendChild(el); box.scrollTop = box.scrollHeight;
  box._history = box._history || []; box._history.push({ role, text }); if (box._history.length > 50) box._history.shift();
}
function escapeHtml(s) { if (!s) return ''; return s.replace(/[&<>"']/g, function(m){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]); }); }
function chatClear() { const box = $('chatbox'); if (!box) return; box.innerHTML = ''; box._history = []; chatBotWelcome(); }
function chatSuggest(text) { $('chatInput').value = text; chatSend(); }
async function chatSend() {
  const input = $('chatInput'); if (!input) return; const message = (input.value || '').trim(); if (!message) return;
  appendMessage('user', message); input.value = ''; appendMessage('assistant', '...'); const box = $('chatbox');
  try {
    const reply = await chatGetReply(message, box._history || []);
    const last = box.lastChild; if (last && last.innerText.trim() === '...') last.remove();
    appendMessage('assistant', reply);
  } catch (err) {
    const last = box.lastChild; if (last && last.innerText.trim() === '...') last.remove();
    appendMessage('assistant', 'Sorry, I had an error. Try again.'); console.error('chat error', err);
  }
}
async function chatGetReply(message, history) {
  if (USE_REMOTE_AI) {
    try {
      const resp = await fetch(`${SERVER_URL}/api/chat`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ message, history }) });
      if (!resp.ok) throw new Error('server error');
      const data = await resp.json();
      if (data && data.reply) return data.reply;
      throw new Error('invalid response');
    } catch (e) {
      console.warn('remote ai failed, falling back to local', e);
      return localBotResponse(message);
    }
  } else return localBotResponse(message);
}
function localBotResponse(message) {
  const msg = message.toLowerCase();
  if (/(hello|hi|hey|good morning|good evening)/.test(msg)) return "Hello! 👋 I can help you book appointments, check prescriptions, triage symptoms, and explain billing. What would you like to do?";
  if (/book.*appointment|how.*book.*appointment/.test(msg)) return "To book an appointment: go to 'Book Appointment' → choose a doctor and time → Save. Would you like me to open the booking page for you? (type 'open booking')";
  if (/open booking/.test(msg)) { navigate('#/book-appointment'); return "Opening booking page now."; }
  if (/prescription|prescribe|medication/.test(msg)) {
    const p = currentPatient(); if (!p) return "Please login as a patient to view prescriptions.";
    const pres = store.prescriptions.filter(x => x.patientId === p.id); if (!pres.length) return "You have no saved prescriptions yet.";
    return "You have " + pres.length + " prescription(s). (This demo does not show full details.)";
  }
  if (/fever|temperature|cough|cold|headache|sore throat/.test(msg)) {
    const hasFever = /fever|temperature/.test(msg); const hasCough = /cough|sore throat/.test(msg);
    const hasBreathless = /shortness of breath|breathless|difficulty breathing/.test(msg);
    if (hasBreathless) return "If you are having difficulty breathing, seek urgent medical attention or call emergency services immediately. I can help book an urgent appointment.";
    if (hasFever && hasCough) return "You may have a viral infection. Rest, stay hydrated, and monitor temperature. If fever > 102°F (39°C) or symptoms worsen, book a doctor visit. Would you like me to help book?";
    if (hasFever) return "For fever, rest and fluids help. Monitor your temperature. If fever persists for >48 hours or is very high, consult a doctor.";
    if (hasCough) return "For cough/cold: rest, fluids, steam inhalation. If cough persists >2 weeks or is severe, consult a doctor.";
  }
  if (/bill|billing|payment|fee/.test(msg)) return "Billing is currently demo-mode. You can generate bills from the Billing screen (coming soon). For now, contact the clinic directly for invoice requests.";
  if (/my appointments|appointments|upcoming appointment/.test(msg)) {
    const p = currentPatient(); if (!p) return "Please login as patient to see your appointments.";
    const myAppts = store.appointments.filter(a => a.patientId === p.id); if (!myAppts.length) return "You have no upcoming appointments.";
    const lines = myAppts.slice(0,5).map(a => { const doc = store.doctors.find(d=>d.id===a.doctorId); return `${doc ? doc.name : 'Doctor'} — ${a.time} — ${a.status}`; });
    return "Your appointments:\n" + lines.join("\n");
  }
  if (/thank|thx|thanks/.test(msg)) return "You're welcome! Anything else I can do?";
  if (/bye|goodbye|see you/.test(msg)) return "Goodbye — take care!";
  return "I can help with: booking appointments, symptom triage, prescriptions, and billing. Try asking 'How do I book an appointment?' or describe your symptoms like 'I have fever and cough'.";
}

// -----------------------
// Init
// -----------------------
console.log('[DoctorCare] app.js initialized — online OTP & forgot-password integrated ✅');
