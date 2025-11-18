// ===============================================
// DoctorCare — app.js (Full production-ready)
// Combines: Router, Auth (OTP), Dashboards, Profile Completion,
// Doctors Near Me, Booking, Video Call (WebRTC), AI Chatbot
// Author: Rohith Annadatha (rewritten 2025)
// ===============================================
console.log('[DoctorCare] app.js loading...');

// -----------------------
// CONFIG
// -----------------------
const USE_REMOTE_AI = false; // toggle remote AI / server proxy for chat
const SERVER_URL = 'https://your-server-url.com'; // change to your backend
const STORE_KEY = 'doctorcare_store_v1';

// -----------------------
// Simple DOM helpers
// -----------------------
const $ = id => document.getElementById(id);
const appRoot = document.getElementById('page-container') || document.getElementById('app') || document.body;
const header = document.getElementById('global-header');

// -----------------------
// Storage helpers
// -----------------------
function loadStore() {
  try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch { return {}; }
}
function saveStore(s) {
  try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch {}
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
const uid = () => Math.random().toString(36).slice(2) + Date.now().toString(36);
const hash = s => btoa(unescape(encodeURIComponent(s || '')));
function toast(m) {
  const t = $('toast');
  if (t) {
    t.innerText = m; t.classList.remove('hidden'); t.style.display = 'block';
    setTimeout(() => { t.classList.add('hidden'); t.style.display = 'none'; }, 3000);
  }
  console.log('[toast]', m);
}
function escapeHtml(s){ if(!s) return ''; return s.replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }

// -----------------------
// Session helpers
// -----------------------
function setSession(role, id) {
  store.session = { role, id }; saveStore(store);
}
function endSession() {
  store.session = { role: null, id: null }; saveStore(store); navigate('#/');
}
function currentDoctor() {
  return store.session.role === 'doctor' ? store.doctors.find(d=>d.id===store.session.id) : null;
}
function currentPatient() {
  return store.session.role === 'patient' ? store.patients.find(p=>p.id===store.session.id) : null;
}

// -----------------------
// Temp holders for OTP flows
// -----------------------
let tempDoctorSignup = null;
let tempPatientSignup = null;
let doctorFPTemp = null;
let patientFPTemp = null;

// -----------------------
// Mobile duplicate check
// -----------------------
function mobileExists(mobile) {
  if (!mobile) return false;
  return store.doctors.some(d => d.mobile === mobile) || store.patients.some(p => p.mobile === mobile);
}

// -----------------------
// Layout / Renderer
// -----------------------
function render(html) { appRoot.innerHTML = html; window.scrollTo(0,0); }
function showHeader(show) {
  if (!header) return;
  if (show) header.classList.remove('hidden'); else header.classList.add('hidden');
}

// Landing layout (header visible)
function layoutLanding(content) {
  showHeader(true);
  render(`<div class="landing-wrapper">${content}</div>`);
}

// Dashboard layout (sidebar + content)
function layoutDashboard(content, role='doctor') {
  showHeader(false);
  const sidebarLinks = role === 'doctor' ? `
    <a onclick="navigate('#/doctor-dashboard')">Dashboard</a>
    <a onclick="navigate('#/appointments')">Appointments</a>
    <a onclick="navigate('#/prescriptions')">Prescriptions</a>
    <a onclick="navigate('#/billing')">Billing</a>
    <a onclick="navigate('#/video-call')">Video Call</a>
    <a onclick="navigate('#/profile')">My Profile</a>
    <a onclick="endSession()">Logout</a>` :
  `
    <a onclick="navigate('#/patient-dashboard')">Dashboard</a>
    <a onclick="navigate('#/doctors-near-me')">Doctors Near Me</a>
    <a onclick="navigate('#/appointments')">Appointments</a>
    <a onclick="navigate('#/prescriptions')">Prescriptions</a>
    <a onclick="navigate('#/billing')">Billing</a>
    <a onclick="navigate('#/profile')">My Profile</a>
    <a onclick="endSession()">Logout</a>`;

  render(`
    <div class="dashboard-layout">
      <aside class="sidebar">
        <div class="sb-logo">
          <img src="./assets/doctorcare-logo.png" alt="logo" />
          <span>DoctorCare</span>
        </div>
        <nav class="sb-nav">${sidebarLinks}</nav>
      </aside>
      <section class="content-area">${content}</section>
    </div>
  `);
}

// -----------------------
// Router Map & navigation
// -----------------------
const ROUTES = {
  '#/': routeLanding,
  '#/doctor-login': routeDoctorLogin,
  '#/doctor-signup': routeDoctorSignup,
  '#/patient-login': routePatientLogin,
  '#/patient-signup': routePatientSignup,
  '#/doctor-forgot': routeDoctorForgot,
  '#/patient-forgot': routePatientForgot,
  '#/doctor-dashboard': routeDoctorDashboard,
  '#/patient-dashboard': routePatientDashboard,
  '#/doctor-profile-complete': routeDoctorProfileCompletion,
  '#/patient-profile-complete': routePatientProfileCompletion,
  '#/doctors-near-me': routeDoctorsNearMe,
  '#/book-appointment': routeBookAppointment,
  '#/appointments': routeAppointmentsList,
  '#/prescriptions': routePrescriptions,
  '#/billing': routeBilling,
  '#/video-call': routeVideoCall,
  '#/profile': routeProfile
};

function navigate(h) { location.hash = h; }
function router() {
  const h = location.hash || '#/';
  const fn = ROUTES[h] || ROUTES['#/'];
  try { fn(); } catch (e) { console.error('route error', e); ROUTES['#/'](); }
}
window.addEventListener('hashchange', router);
window.addEventListener('load', () => {
  // register SW (index.html also does it; safe to double-check)
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('./service-worker.js').catch(()=>{});
  router();
});

// -----------------------
// HOME / LANDING
// -----------------------
function routeLanding() {
  layoutLanding(`
    <div class="landing-hero">
      <div class="hero-left">
        <h1>Health in Your Hands</h1>
        <p class="lead">Just Click, Book & Feel Better.</p>
        <div class="landing-buttons">
          <button class="button primary" onclick="navigate('#/doctor-signup')">Doctor Sign Up</button>
          <button class="button" onclick="navigate('#/doctor-login')">Doctor Login</button>
          <button class="button" onclick="navigate('#/patient-signup')">Patient Sign Up</button>
          <button class="button" onclick="navigate('#/patient-login')">Patient Login</button>
        </div>
      </div>
      <div class="hero-right">
        <img src="./assets/doctorcare-phone.png" alt="DoctorCare app" class="hero-img">
      </div>
    </div>
  `);
}

// -----------------------
// AUTH PAGES (Doctor + Patient) - LOGIN / SIGNUP / FORGOT
// -----------------------

// DOCTOR SIGNUP
function routeDoctorSignup() {
  layoutLanding(`
    <div class="auth-box">
      <h2>Doctor Sign Up</h2>
      <input id="ds_name" class="input" placeholder="Full Name"><br>
      <input id="ds_email" class="input" placeholder="Email"><br>
      <input id="ds_mobile" class="input" placeholder="Mobile Number"><br>
      <input id="ds_spec" class="input" placeholder="Specialization"><br>
      <div id="ds_verify_area">
        <button class="button primary" onclick="doctorSendSignupOtp()">Verify Email & Mobile</button>
      </div>
      <div id="ds_otp_section" style="display:none;margin-top:10px">
        <input id="ds_eotp" class="input" placeholder="Enter Email OTP"><br>
        <input id="ds_motp" class="input" placeholder="Enter Mobile OTP"><br>
        <input id="ds_password" type="password" class="input" placeholder="Password"><br>
        <button class="button primary" onclick="doDoctorSignup()">Create Account</button>
      </div>
      <div class="auth-links">
        <a onclick="navigate('#/doctor-login')">Already have an account?</a>
      </div>
      <button class="button secondary" onclick="navigate('#/')">Back</button>
    </div>
  `);
}

// Doctor: send signup OTP to server
async function doctorSendSignupOtp() {
  const name = $('ds_name').value && $('ds_name').value.trim();
  const email = $('ds_email').value && $('ds_email').value.trim();
  const mobile = $('ds_mobile').value && $('ds_mobile').value.trim();
  const spec = $('ds_spec').value && $('ds_spec').value.trim();
  if (!name || !email || !mobile || !spec) return toast('Fill all fields');
  if (mobileExists(mobile)) return toast('Mobile number already registered locally');
  try {
    const resp = await fetch(`${SERVER_URL}/api/signup/sendOtp`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ role:'doctor', name, email, mobile, spec })
    });
    const j = await resp.json();
    if (!resp.ok) return toast(j.message || 'Server error');
    tempDoctorSignup = { name, email, mobile, spec };
    $('ds_otp_section').style.display = 'block';
    toast('OTP sent to email & mobile');
  } catch (e) {
    console.error(e); toast('Unable to contact server');
  }
}

// Doctor: verify OTP and create account
async function doDoctorSignup() {
  if (!tempDoctorSignup) return toast('Verify email & mobile first');
  const eotp = $('ds_eotp').value && $('ds_eotp').value.trim();
  const motp = $('ds_motp').value && $('ds_motp').value.trim();
  const password = $('ds_password').value || '';
  if (!eotp || !motp || !password) return toast('Enter OTPs and password');
  try {
    const resp = await fetch(`${SERVER_URL}/api/signup/verifyOtp`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({
        role:'doctor', name: tempDoctorSignup.name, email: tempDoctorSignup.email,
        mobile: tempDoctorSignup.mobile, spec: tempDoctorSignup.spec,
        emailOtp: eotp, mobileOtp: motp, password
      })
    });
    const j = await resp.json();
    if (!resp.ok) return toast(j.message || 'Verification failed');
    const created = j.user || { id: uid(), name: tempDoctorSignup.name, email: tempDoctorSignup.email, mobile: tempDoctorSignup.mobile, spec: tempDoctorSignup.spec };
    // save locally (hash password)
    const d = { id: created.id || uid(), name: created.name, email: created.email, mobile: created.mobile, spec: created.spec || '', password: hash(password), profileCompleted: false };
    store.doctors.push(d); saveStore(store);
    tempDoctorSignup = null;
    $('ds_otp_section').style.display = 'none';
    toast('Doctor registered');
    navigate('#/doctor-login');
  } catch (e) { console.error(e); toast('Server error'); }
}

// DOCTOR LOGIN
function routeDoctorLogin() {
  layoutLanding(`
    <div class="auth-box">
      <h2>Doctor Login</h2>
      <input id="dl_email" class="input" placeholder="Email"><br>
      <input id="dl_password" type="password" class="input" placeholder="Password"><br>
      <button class="button primary" onclick="doDoctorLogin()">Login</button>
      <div class="auth-links"><a onclick="navigate('#/doctor-forgot')">Forgot Password?</a><a onclick="navigate('#/doctor-signup')">Create Doctor Account</a></div>
      <button class="button secondary" onclick="navigate('#/')">Back</button>
    </div>
  `);
}
function doDoctorLogin() {
  const email = $('dl_email').value && $('dl_email').value.trim();
  const pass = hash($('dl_password').value || '');
  const d = store.doctors.find(x => x.email === email && x.password === pass);
  if (!d) return toast('Invalid credentials');
  setSession('doctor', d.id);
  toast('Welcome ' + d.name);
  // if profile incomplete, force completion
  if (!d.profileCompleted) return navigate('#/doctor-profile-complete');
  navigate('#/doctor-dashboard');
}

// DOCTOR FORGOT
function routeDoctorForgot() {
  layoutLanding(`
    <div class="auth-box">
      <h2>Reset Password (Doctor)</h2>
      <input id="fp_email" class="input" placeholder="Enter Email"><br>
      <button class="button primary" onclick="doctorSendOTP()">Send OTP</button>
      <div id="doctor_fp_area" style="display:none;margin-top:10px">
        <input id="fp_otp" class="input" placeholder="Enter OTP"><br>
        <input id="fp_new" type="password" class="input" placeholder="New Password"><br>
        <button class="button primary" onclick="doctorResetPassword()">Reset</button>
      </div>
      <button class="button secondary" onclick="navigate('#/doctor-login')">Back</button>
    </div>
  `);
}
async function doctorSendOTP() {
  const email = $('fp_email').value && $('fp_email').value.trim();
  if (!email) return toast('Enter email');
  try {
    const resp = await fetch(`${SERVER_URL}/api/forgot/sendOtp`, {
      method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ role:'doctor', email })
    });
    const j = await resp.json();
    if (!resp.ok) return toast(j.message || 'Server error');
    doctorFPTemp = { email };
    $('doctor_fp_area').style.display = 'block';
    toast('OTP sent to registered email/mobile');
  } catch (e) { console.error(e); toast('Unable to contact server'); }
}
async function doctorResetPassword() {
  if (!doctorFPTemp) return toast('Request OTP first');
  const otp = $('fp_otp').value && $('fp_otp').value.trim();
  const newPass = $('fp_new').value && $('fp_new').value.trim();
  if (!otp || !newPass) return toast('Enter OTP and new password');
  try {
    const resp = await fetch(`${SERVER_URL}/api/forgot/resetPassword`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ role:'doctor', email: doctorFPTemp.email, otp, newPassword: newPass })
    });
    const j = await resp.json();
    if (!resp.ok) return toast(j.message || 'Reset failed');
    // update local store
    const doc = store.doctors.find(d => d.email === doctorFPTemp.email);
    if (doc) { doc.password = hash(newPass); saveStore(store); }
    doctorFPTemp = null; toast('Password updated'); navigate('#/doctor-login');
  } catch (e) { console.error(e); toast('Server error'); }
}

// PATIENT SIGNUP
function routePatientSignup() {
  layoutLanding(`
    <div class="auth-box">
      <h2>Patient Sign Up</h2>
      <input id="ps_name" class="input" placeholder="Full Name"><br>
      <input id="ps_email" class="input" placeholder="Email"><br>
      <input id="ps_mobile" class="input" placeholder="Mobile Number"><br>
      <div id="ps_verify_area">
        <button class="button primary" onclick="patientSendOTP()">Verify Email & Mobile</button>
      </div>
      <div id="ps_otp_section" style="display:none;margin-top:10px">
        <input id="ps_eotp" class="input" placeholder="Enter Email OTP"><br>
        <input id="ps_motp" class="input" placeholder="Enter Mobile OTP"><br>
        <input id="ps_password" type="password" class="input" placeholder="Password"><br>
        <button class="button primary" onclick="doPatientSignup()">Create Account</button>
      </div>
      <div class="auth-links"><a onclick="navigate('#/patient-login')">Already have an account?</a></div>
      <button class="button secondary" onclick="navigate('#/')">Back</button>
    </div>
  `);
}

async function patientSendOTP() {
  const name = $('ps_name').value && $('ps_name').value.trim();
  const email = $('ps_email').value && $('ps_email').value.trim();
  const mobile = $('ps_mobile').value && $('ps_mobile').value.trim();
  if (!name || !email || !mobile) return toast('Fill all fields');
  if (mobileExists(mobile)) return toast('Mobile number already registered locally');
  try {
    const resp = await fetch(`${SERVER_URL}/api/signup/sendOtp`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ role:'patient', name, email, mobile })
    });
    const j = await resp.json(); if (!resp.ok) return toast(j.message || 'Server error');
    tempPatientSignup = { name, email, mobile };
    $('ps_otp_section').style.display = 'block';
    toast('OTP sent to email & mobile');
  } catch (e) { console.error(e); toast('Unable to contact server'); }
}
async function doPatientSignup() {
  if (!tempPatientSignup) return toast('Verify details first');
  const eotp = $('ps_eotp').value && $('ps_eotp').value.trim();
  const motp = $('ps_motp').value && $('ps_motp').value.trim();
  const password = $('ps_password').value || '';
  if (!eotp || !motp || !password) return toast('Enter OTPs and password');
  try {
    const resp = await fetch(`${SERVER_URL}/api/signup/verifyOtp`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ role:'patient', name: tempPatientSignup.name, email: tempPatientSignup.email, mobile: tempPatientSignup.mobile, emailOtp: eotp, mobileOtp: motp, password })
    });
    const j = await resp.json(); if (!resp.ok) return toast(j.message || 'Verification failed');
    const created = j.user || { id: uid(), name: tempPatientSignup.name, email: tempPatientSignup.email, mobile: tempPatientSignup.mobile };
    const p = { id: created.id || uid(), name: created.name, email: created.email, mobile: created.mobile, password: hash(password), profileCompleted: false };
    store.patients.push(p); saveStore(store);
    tempPatientSignup = null; $('ps_otp_section').style.display = 'none'; toast('Patient registered'); navigate('#/patient-login');
  } catch (e) { console.error(e); toast('Server error'); }
}

// PATIENT LOGIN
function routePatientLogin() {
  layoutLanding(`
    <div class="auth-box">
      <h2>Patient Login</h2>
      <input id="pl_email" class="input" placeholder="Email"><br>
      <input id="pl_pass" type="password" class="input" placeholder="Password"><br>
      <button class="button primary" onclick="doPatientLogin()">Login</button>
      <div class="auth-links"><a onclick="navigate('#/patient-forgot')">Forgot Password?</a><a onclick="navigate('#/patient-signup')">Create Patient Account</a></div>
      <button class="button secondary" onclick="navigate('#/')">Back</button>
    </div>
  `);
}
function doPatientLogin() {
  const email = $('pl_email').value && $('pl_email').value.trim();
  const pass = hash($('pl_pass').value || '');
  const p = store.patients.find(x => x.email === email && x.password === pass);
  if (!p) return toast('Invalid credentials');
  setSession('patient', p.id); toast('Welcome ' + p.name);
  if (!p.profileCompleted) return navigate('#/patient-profile-complete');
  navigate('#/patient-dashboard');
}

// PATIENT FORGOT
function routePatientForgot() {
  layoutLanding(`
    <div class="auth-box">
      <h2>Reset Password (Patient)</h2>
      <input id="pf_email" class="input" placeholder="Enter Email"><br>
      <button class="button primary" onclick="patientSendFPOTP()">Send OTP</button>
      <div id="pf_box" style="display:none;margin-top:10px">
        <input id="pf_otp" class="input" placeholder="OTP"><br>
        <input id="pf_new" class="input" type="password" placeholder="New Password"><br>
        <button class="button primary" onclick="patientResetPassword()">Reset</button>
      </div>
      <button class="button secondary" onclick="navigate('#/patient-login')">Back</button>
    </div>
  `);
}
async function patientSendFPOTP() {
  const email = $('pf_email').value && $('pf_email').value.trim();
  if (!email) return toast('Enter email');
  try {
    const resp = await fetch(`${SERVER_URL}/api/forgot/sendOtp`, {
      method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ role:'patient', email })
    });
    const j = await resp.json(); if (!resp.ok) return toast(j.message || 'Server error');
    patientFPTemp = { email }; $('pf_box').style.display = 'block'; toast('OTP sent');
  } catch (e) { console.error(e); toast('Unable to contact server'); }
}
async function patientResetPassword() {
  if (!patientFPTemp) return toast('Request OTP first');
  const otp = $('pf_otp').value && $('pf_otp').value.trim();
  const newPass = $('pf_new').value && $('pf_new').value.trim();
  if (!otp || !newPass) return toast('Enter OTP and new password');
  try {
    const resp = await fetch(`${SERVER_URL}/api/forgot/resetPassword`, {
      method:'POST', headers:{'Content-Type':'application/json'},
      body: JSON.stringify({ role:'patient', email: patientFPTemp.email, otp, newPassword: newPass })
    });
    const j = await resp.json(); if (!resp.ok) return toast(j.message || 'Reset failed');
    const user = store.patients.find(u => u.email === patientFPTemp.email); if (user) { user.password = hash(newPass); saveStore(store); }
    patientFPTemp = null; toast('Password Updated'); navigate('#/patient-login');
  } catch (e) { console.error(e); toast('Server error'); }
}

// -----------------------
// PROFILE COMPLETION
// -----------------------
function routeDoctorProfileCompletion() {
  const d = currentDoctor(); if (!d) return navigate('#/doctor-login');
  layoutLanding(`
    <div class="auth-box-large">
      <h2>Complete Your Profile (Doctor)</h2>
      <p class="subtitle">Upload profile photo and professional details</p>
      <input id="dp_photo" type="file" accept="image/*" class="input"><br>
      <input id="dp_mobile" class="input" placeholder="Mobile Number"><br>
      <select id="dp_gender" class="input">
        <option value="">Select Gender</option>
        <option>Male</option><option>Female</option><option>Other</option><option>Prefer not to say</option>
      </select><br>
      <input id="dp_degree" class="input" placeholder="Degree (MBBS, MD etc.)"><br>
      <input id="dp_spec" class="input" placeholder="Specialization"><br>
      <input id="dp_exp" class="input" placeholder="Experience (years)"><br>
      <input id="dp_clinic" class="input" placeholder="Clinic/Hospital Name"><br>
      <input id="dp_addr" class="input" placeholder="Clinic Address"><br>
      <input id="dp_fee" class="input" placeholder="Consultation Fee"><br>
      <input id="dp_time" class="input" placeholder="Availability (e.g., 10:00 - 17:00)"><br>
      <button class="button primary" onclick="saveDoctorProfile()">Save & Continue</button>
    </div>
  `);
}
function saveDoctorProfile() {
  const d = currentDoctor(); if (!d) return;
  const mobile = $('dp_mobile').value && $('dp_mobile').value.trim();
  const gender = $('dp_gender').value && $('dp_gender').value.trim();
  if (!mobile || !gender) return toast('Mobile and Gender are required');
  d.profileCompleted = true;
  d.mobile = mobile;
  d.gender = gender;
  d.degree = $('dp_degree').value;
  d.spec = $('dp_spec').value;
  d.exp = $('dp_exp').value;
  d.clinic = $('dp_clinic').value;
  d.address = $('dp_addr').value;
  d.fee = $('dp_fee').value;
  d.time = $('dp_time').value;
  saveStore(store);
  toast('Profile Completed');
  navigate('#/doctor-dashboard');
}

function routePatientProfileCompletion() {
  const p = currentPatient(); if (!p) return navigate('#/patient-login');
  layoutLanding(`
    <div class="auth-box-large">
      <h2>Complete Your Profile</h2>
      <input id="pp_photo" type="file" class="input"><br>
      <input id="pp_mobile" class="input" placeholder="Mobile Number"><br>
      <select id="pp_gender" class="input">
        <option value="">Select Gender</option>
        <option>Male</option><option>Female</option><option>Other</option><option>Prefer not to say</option>
      </select><br>
      <input id="pp_dob" class="input" placeholder="Date of Birth (DD/MM/YYYY)"><br>
      <input id="pp_address" class="input" placeholder="Full Address"><br>
      <input id="pp_emergency" class="input" placeholder="Emergency Contact"><br>
      <button class="button primary" onclick="savePatientProfile()">Save & Continue</button>
    </div>
  `);
}
function savePatientProfile() {
  const p = currentPatient(); if (!p) return;
  const mobile = $('pp_mobile').value && $('pp_mobile').value.trim();
  const gender = $('pp_gender').value && $('pp_gender').value.trim();
  if (!mobile || !gender) return toast('Mobile and Gender are required');
  p.profileCompleted = true;
  p.mobile = mobile;
  p.gender = gender;
  p.dob = $('pp_dob').value;
  p.address = $('pp_address').value;
  p.emergency = $('pp_emergency').value;
  saveStore(store);
  toast('Profile Completed');
  navigate('#/patient-dashboard');
}

// -----------------------
// DOCTORS NEAR ME
// -----------------------
function routeDoctorsNearMe() {
  const docs = store.doctors;
  const list = docs.map(d => `
    <div class="doctor-card-big">
      <img src="./assets/default-doctor.png" alt="doc" />
      <div class="doc-meta">
        <h3>Dr. ${escapeHtml(d.name)}</h3>
        <p>${escapeHtml(d.spec || 'Specialist')}</p>
        <p>${escapeHtml(d.clinic || 'Clinic')}</p>
        <div class="doc-actions">
          <button class="button small" onclick="startBooking('${d.id}')">Book</button>
        </div>
      </div>
    </div>
  `).join('');
  layoutPatientDashboard(`<h2 class="page-title">Doctors Near You</h2><div class="doctor-list-big">${list || '<p>No doctors found.</p>'}</div>`, 'patient');
}
function startBooking(docId) {
  // preselect doctor and go to booking page
  navigate('#/book-appointment');
  setTimeout(()=>{ if($('bk_doc')) $('bk_doc').value = docId; }, 200);
}

// -----------------------
// APPOINTMENTS / BOOKINGS
// -----------------------
function routeBookAppointment() {
  const docs = store.doctors.map(d => `<option value="${d.id}">Dr. ${escapeHtml(d.name)} — ${escapeHtml(d.spec||'')}</option>`).join('');
  const pats = store.patients.map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`).join('');
  layoutDashboard(`
    <h2 class="page-title">Book Appointment</h2>
    <div class="card booking-box">
      <label>Doctor</label>
      <select id="bk_doc" class="input">${docs}</select>
      <label>Patient</label>
      <select id="bk_pat" class="input">${pats}</select>
      <label>Date & Time</label>
      <input id="bk_time" class="input" placeholder="YYYY-MM-DD HH:MM">
      <button class="button primary" onclick="saveAppointmentPro()">Book Appointment</button>
    </div>
  `, store.session.role === 'doctor' ? 'doctor' : 'patient');
}
function saveAppointmentPro() {
  const doctorId = $('bk_doc').value;
  const patientId = $('bk_pat').value;
  const time = $('bk_time').value && $('bk_time').value.trim();
  if (!doctorId || !patientId || !time) return toast('Fill all booking fields');
  const appt = { id: uid(), doctorId, patientId, time, status: 'Pending' };
  store.appointments.push(appt); saveStore(store);
  toast('Appointment Booked');
  navigate(store.session.role === 'doctor' ? '#/doctor-dashboard' : '#/patient-dashboard');
}

// Simple appointments list (for both)
function routeAppointmentsList() {
  const role = store.session.role;
  const userId = store.session.id;
  if (!role || !userId) return navigate(role === 'doctor' ? '#/doctor-login' : '#/patient-login');
  const isDoctor = role === 'doctor';
  const items = store.appointments.filter(a => (isDoctor ? a.doctorId === userId : a.patientId === userId))
    .map(a => {
      const doc = store.doctors.find(d=>d.id===a.doctorId);
      const pat = store.patients.find(p=>p.id===a.patientId);
      return `<div class="appt-card"><strong>${escapeHtml(isDoctor ? (pat?pat.name:'Patient') : (doc?('Dr. '+doc.name):'Doctor'))}</strong><div>${escapeHtml(a.time)} — ${escapeHtml(a.status)}</div></div>`;
    }).join('') || '<p>No appointments.</p>';
  layoutDashboard(`<h2 class="page-title">Appointments</h2><div class="card">${items}</div>`, role);
}

// -----------------------
// PRESCRIPTIONS / BILLING
// -----------------------
function routePrescriptions() {
  layoutDashboard(`<h2 class="page-title">Prescriptions</h2><div class="card"><p>Prescription records coming soon.</p></div>`, store.session.role || 'patient');
}
function routeBilling() {
  layoutDashboard(`<h2 class="page-title">Billing</h2><div class="card"><p>Billing records coming soon.</p></div>`, store.session.role || 'patient');
}

// -----------------------
// PROFILE (view/edit)
 // -----------------------
function routeProfile() {
  const role = store.session.role;
  if (!role) return navigate('#/');
  const me = role === 'doctor' ? currentDoctor() : currentPatient();
  if (!me) return navigate(role === 'doctor' ? '#/doctor-login' : '#/patient-login');
  layoutDashboard(`
    <h2 class="page-title">My Profile</h2>
    <div class="card profile-card">
      <div class="profile-left"><img src="./assets/default-doctor.png" alt="profile"/></div>
      <div class="profile-right">
        <h3>${escapeHtml(me.name || '')}</h3>
        <p><strong>Email:</strong> ${escapeHtml(me.email || '')}</p>
        <p><strong>Mobile:</strong> ${escapeHtml(me.mobile || '')}</p>
        <p><strong>Gender:</strong> ${escapeHtml(me.gender || '')}</p>
        <p><strong>Specialization:</strong> ${escapeHtml(me.spec || '')}</p>
        <div style="margin-top:10px">
          <button class="button" onclick="navigate('#/doctor-profile-complete')">Edit Profile</button>
        </div>
      </div>
    </div>
  `, role);
}

// -----------------------
// VIDEO CALL (WebRTC + Socket.IO)
// -----------------------
const SIGNALING_URL = window.location.origin; // if using same server, else change
const RTC_CONFIG = { iceServers: [{ urls:['stun:stun.l.google.com:19302'] }] };
let socket = null, pc = null, currentRoomId = null;

function ensureSocket() {
  if (socket) return;
  if (!window.io) { console.warn('Socket.IO not loaded'); return; }
  socket = io(SIGNALING_URL, { transports:['websocket'], forceNew:true });
  socket.on('offer', onOffer); socket.on('answer', onAnswer); socket.on('ice-candidate', onRemoteIce);
}

async function routeVideoCall() {
  layoutDashboard(`
    <h2 class="page-title">Video Consultation</h2>
    <div class="video-box card">
      <video id="localVideo" autoplay muted playsinline></video>
      <video id="remoteVideo" autoplay playsinline></video>
    </div>
    <div class="video-controls card">
      <input id="roomId" class="input" placeholder="Room ID"><br>
      <button class="button primary" onclick="startCall()">Start Call</button>
      <button class="button" onclick="joinCall()">Join Call</button>
      <button class="button secondary" onclick="endCall()">End</button>
    </div>
  `, store.session.role || 'patient');
}

async function startCall() {
  ensureSocket(); currentRoomId = $('roomId').value || uid();
  socket.emit('join-room', currentRoomId);
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video:true, audio:true });
    $('localVideo').srcObject = stream;
    pc = new RTCPeerConnection(RTC_CONFIG);
    stream.getTracks().forEach(t => pc.addTrack(t, stream));
    pc.ontrack = e => $('remoteVideo').srcObject = e.streams[0];
    pc.onicecandidate = e => e.candidate && socket.emit('ice-candidate', { roomId: currentRoomId, candidate: e.candidate });
    const offer = await pc.createOffer(); await pc.setLocalDescription(offer);
    socket.emit('offer', { roomId: currentRoomId, sdp: offer.sdp, type: 'offer' });
    toast('Room ID: ' + currentRoomId);
  } catch (e) { console.error(e); toast('Camera / Mic error'); }
}

async function joinCall() {
  ensureSocket(); currentRoomId = $('roomId').value && $('roomId').value.trim(); if (!currentRoomId) return toast('Enter Room ID');
  socket.emit('join-room', currentRoomId);
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ video:true, audio:true });
    $('localVideo').srcObject = stream;
    pc = new RTCPeerConnection(RTC_CONFIG);
    stream.getTracks().forEach(t => pc.addTrack(t, stream));
    pc.ontrack = e => $('remoteVideo').srcObject = e.streams[0];
    pc.onicecandidate = e => e.candidate && socket.emit('ice-candidate', { roomId: currentRoomId, candidate: e.candidate });
    toast('Joined room: ' + currentRoomId);
  } catch (e) { console.error(e); toast('Camera/Mic error'); }
}

async function onOffer(payload) {
  ensureSocket(); currentRoomId = payload.roomId; socket.emit('join-room', currentRoomId);
  pc = new RTCPeerConnection(RTC_CONFIG);
  pc.ontrack = e => $('remoteVideo').srcObject = e.streams[0];
  pc.onicecandidate = e => e.candidate && socket.emit('ice-candidate', { roomId: currentRoomId, candidate: e.candidate });
  const stream = await navigator.mediaDevices.getUserMedia({ video:true, audio:true }); $('localVideo').srcObject = stream; stream.getTracks().forEach(t => pc.addTrack(t, stream));
  await pc.setRemoteDescription({ type: 'offer', sdp: payload.sdp });
  const answer = await pc.createAnswer(); await pc.setLocalDescription(answer);
  socket.emit('answer', { roomId: currentRoomId, sdp: answer.sdp, type: 'answer' });
}
async function onAnswer(payload) { if (pc) await pc.setRemoteDescription({ type:'answer', sdp: payload.sdp }); }
function onRemoteIce(payload) { if (pc && payload.candidate) pc.addIceCandidate(new RTCIceCandidate(payload.candidate)); }
function endCall() { try { if (pc) pc.close(); pc = null; if (socket) socket.emit('leave', currentRoomId); toast('Call ended'); } catch(e){console.warn(e);} }

// -----------------------
// AI Chatbot (local fallback + remote option)
// -----------------------
function chatInit() { const box = $('chatbox'); if (!box) return; box.innerHTML=''; box._history = box._history || []; }
function chatBotWelcome() { appendMessage('assistant', `Hi! I'm DoctorCare assistant. I can help with booking, symptoms, prescriptions, and billing.`); }
function appendMessage(role, text) {
  const box = $('chatbox'); if (!box) return;
  const el = document.createElement('div'); el.className = 'chat-message ' + (role==='user'?'user-msg':'assistant-msg');
  el.innerHTML = `<div>${escapeHtml(text).replace(/\n/g,'<br>')}</div>`;
  box.appendChild(el); box.scrollTop = box.scrollHeight;
  box._history = box._history || []; box._history.push({ role, text }); if (box._history.length > 80) box._history.shift();
}
function chatClear() { const box = $('chatbox'); if (!box) return; box.innerHTML=''; box._history = []; chatBotWelcome(); }
function chatSuggest(text) { if($('chatInput')) $('chatInput').value = text; chatSend(); }
async function chatSend() {
  const input = $('chatInput'); if (!input) return;
  const message = (input.value || '').trim(); if (!message) return;
  appendMessage('user', message); input.value=''; appendMessage('assistant', '...');
  const box = $('chatbox');
  try {
    const reply = await chatGetReply(message, box._history || []);
    // remove last '...' message
    const lastChild = box.lastChild; if (lastChild && lastChild.innerText.trim() === '...') lastChild.remove();
    appendMessage('assistant', reply);
  } catch (e) {
    console.error(e);
    appendMessage('assistant', 'Sorry — I had an error. Try again.');
  }
}
async function chatGetReply(message, history) {
  if (USE_REMOTE_AI) {
    try {
      const resp = await fetch(`${SERVER_URL}/api/chat`, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ message, history }) });
      if (!resp.ok) throw new Error('server error');
      const data = await resp.json(); if (data && data.reply) return data.reply;
      throw new Error('invalid response');
    } catch (e) {
      console.warn('remote ai failed, falling back to local', e); return localBotResponse(message);
    }
  } else return localBotResponse(message);
}
function localBotResponse(message) {
  const msg = message.toLowerCase();
  if (/(hello|hi|hey)/.test(msg)) return "Hello! 👋 I can help you book appointments, check prescriptions, triage symptoms, and explain billing.";
  if (/open booking/.test(msg)) { navigate('#/book-appointment'); return "Opening booking page now."; }
  if (/book.*appointment|how.*book.*appointment/.test(msg)) return "To book: go to 'Book Appointment', choose doctor & time, then save. Want me to open booking?";
  if (/prescription|prescribe|medication/.test(msg)) {
    const p = currentPatient(); if (!p) return "Please login as a patient to view prescriptions.";
    const pres = store.prescriptions.filter(x => x.patientId === p.id); if (!pres.length) return "You have no saved prescriptions yet.";
    return `You have ${pres.length} prescription(s).`;
  }
  if (/fever|cough|cold|headache|sore throat/.test(msg)) {
    const hasBreathless = /shortness of breath|difficulty breathing|breathless/.test(msg);
    if (hasBreathless) return "If you're having difficulty breathing, seek urgent medical attention!";
    if (/fever/.test(msg) && /cough/.test(msg)) return "You may have a viral infection. Rest, hydrate, monitor temp. Book a doctor if worsens.";
    if (/fever/.test(msg)) return "For fever: rest, fluids, monitor. If >39°C or >48hrs, consult a doctor.";
    if (/cough/.test(msg)) return "For cough: rest, fluids, steam inhalation. See a doctor if persists >2 weeks.";
  }
  if (/appointment|appointments|my appointments/.test(msg)) {
    const p = currentPatient(); if (!p) return "Please login as a patient to see appointments.";
    const my = store.appointments.filter(a=>a.patientId===p.id);
    if (!my.length) return "You have no upcoming appointments.";
    return "Your appointments:\n" + my.map(a => {
      const doc = store.doctors.find(d=>d.id===a.doctorId); return `${doc?('Dr. '+doc.name):'Doctor'} — ${a.time} — ${a.status}`;
    }).join("\n");
  }
  if (/bill|billing|payment/.test(msg)) return "Billing demo-mode. Billing screen will show invoices.";
  if (/thank|thanks/.test(msg)) return "You're welcome! Anything else I can help with?";
  return "I can help with booking, symptoms, prescriptions, and billing. Try: 'How do I book an appointment?' or 'I have fever'.";
}

// -----------------------
// DASHBOARDS (Doctor + Patient) - final UI
// -----------------------
function routeDoctorDashboard() {
  const d = currentDoctor(); if (!d) return navigate('#/doctor-login');
  layoutDashboard(`
    <h2 class="page-title">Welcome, Dr. ${escapeHtml(d.name)}</h2>
    <div class="grid-3">
      <div class="card stat-card"><h3>Today's Appointments</h3><p>${store.appointments.filter(a=>a.doctorId===d.id && a.status==='Pending').length}</p></div>
      <div class="card stat-card"><h3>My Patients</h3><p>${new Set(store.appointments.filter(a=>a.doctorId===d.id).map(a=>a.patientId)).size}</p></div>
      <div class="card stat-card"><h3>Earnings</h3><p>₹${d.fee||0}</p></div>
    </div>

    <div class="two-col">
      <div class="card">
        <h3>Upcoming Appointments</h3>
        ${store.appointments.filter(a=>a.doctorId===d.id).slice(0,6).map(a => {
          const p = store.patients.find(x=>x.id===a.patientId);
          return `<div class="appt-row"><strong>${escapeHtml(p? p.name:'Patient')}</strong><div>${escapeHtml(a.time)} • ${escapeHtml(a.status)}</div></div>`;
        }).join('') || '<p>No upcoming appointments.</p>'}
      </div>

      <div class="card">
        <h3>AI Assistant</h3>
        <div id="chatbox" class="chat-area"></div>
        <div class="chat-input-row">
          <input id="chatInput" class="input" placeholder="Ask DoctorCare...">
          <button class="button primary" onclick="chatSend()">Send</button>
        </div>
      </div>
    </div>

  `, 'doctor');

  setTimeout(()=>{ chatInit(); chatBotWelcome(); }, 50);
}

function routePatientDashboard() {
  const p = currentPatient(); if (!p) return navigate('#/patient-login');
  layoutDashboard(`
    <h2 class="page-title">Welcome, ${escapeHtml(p.name)}</h2>
    <div class="grid-3">
      <div class="card stat-card"><h3>Upcoming Appointments</h3><p>${store.appointments.filter(a=>a.patientId===p.id).length}</p></div>
      <div class="card stat-card"><h3>Prescriptions</h3><p>${store.prescriptions.filter(x=>x.patientId===p.id).length}</p></div>
      <div class="card stat-card"><h3>Billing</h3><p>0</p></div>
    </div>

    <div class="card">
      <button class="button primary" onclick="navigate('#/doctors-near-me')">Book Appointment</button>
    </div>

    <div class="two-col">
      <div class="card">
        <h3>Doctors Near You</h3>
        <div class="doctor-preview">
          ${store.doctors.slice(0,4).map(d => `<div class="doc-preview"><img src="./assets/default-doctor.png"/><div><strong>Dr. ${escapeHtml(d.name)}</strong><div>${escapeHtml(d.spec||'')}</div></div><button class="button small" onclick="startBooking('${d.id}')">Book</button></div>`).join('') || '<p>No doctors yet.</p>'}
        </div>
      </div>

      <div class="card">
        <h3>AI Assistant</h3>
        <div id="chatbox" class="chat-area"></div>
        <div class="chat-input-row">
          <input id="chatInput" class="input" placeholder="Ask DoctorCare...">
          <button class="button primary" onclick="chatSend()">Send</button>
        </div>
      </div>
    </div>
  `, 'patient');

  setTimeout(()=>{ chatInit(); chatBotWelcome(); }, 50);
}

// -----------------------
// Boot message
// -----------------------
console.log('[DoctorCare] app.js initialized — full PWA features active ✅');
