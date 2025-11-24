// ===============================================
// DoctorCare — Unified Front-End SPA
// Frontend-only (localStorage + mock flows)
// Optimized for Android + iOS + iPad (PWA / mobile browsers)
// ===============================================
console.log('[DoctorCare] app.js loading...');

// -----------------------
// Platform helpers (Android / iOS / iPad / PWA)
// -----------------------
const UA = navigator.userAgent || navigator.vendor || window.opera || '';
const IS_IOS = /iphone|ipad|ipod/i.test(UA);
const IS_ANDROID = /android/i.test(UA);
const IS_STANDALONE =
  window.matchMedia && window.matchMedia('(display-mode: standalone)').matches ||
  (typeof window.navigator.standalone === 'boolean' && window.navigator.standalone);

// -----------------------
// Simple DOM helpers
// -----------------------
const $ = id => document.getElementById(id);
const appRoot = document.getElementById('page-container');
const STORE_KEY = 'doctorcare_store_v2';

// -----------------------
// Storage helpers (safe for Safari / Android)
// -----------------------
function loadStore() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.warn('LocalStorage load error', e);
    return {};
  }
}
function saveStore(s) {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(s));
  } catch (e) {
    console.warn('LocalStorage save error', e);
  }
}

const store = loadStore();
if (!store.doctors) store.doctors = [];
if (!store.patients) store.patients = [];
if (!store.appointments) store.appointments = [];
if (!store.prescriptions) store.prescriptions = [];
if (!store.bills) store.bills = [];
if (!store.session) store.session = { role: null, id: null };
saveStore(store);

// -----------------------
// Utilities
// -----------------------
const uid = () =>
  Math.random().toString(36).slice(2) + Date.now().toString(36);

const hash = s => {
  try {
    return btoa(unescape(encodeURIComponent(s || '')));
  } catch {
    return s || '';
  }
};

function toast(m) {
  const t = $('toast');
  if (t) {
    t.innerText = m;
    t.classList.remove('hidden');
    t.style.display = 'block';
    setTimeout(() => {
      t.classList.add('hidden');
      t.style.display = 'none';
    }, 2500);
  }
  console.log('[toast]', m);
}

function escapeHtml(s) {
  if (!s) return '';
  return s.replace(/[&<>"']/g, m => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[m]));
}

// Distance (km) between two lat/lng points (Haversine)
function distanceKm(lat1, lon1, lat2, lon2) {
  if (lat1 == null || lon1 == null || lat2 == null || lon2 == null) return null;
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) *
      Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

// -----------------------
// Session helpers
// -----------------------
function setSession(role, id) {
  store.session = { role, id };
  saveStore(store);
}

function endSession() {
  const role = store.session.role;
  store.session = { role: null, id: null };
  saveStore(store);

  if (role === 'doctor') navigate('#/doctor-login');
  else if (role === 'patient') navigate('#/patient-login');
  else navigate('#/');
}

function currentDoctor() {
  return store.session.role === 'doctor'
    ? store.doctors.find(d => d.id === store.session.id)
    : null;
}

function currentPatient() {
  return store.session.role === 'patient'
    ? store.patients.find(p => p.id === store.session.id)
    : null;
}

// -----------------------
// Layout helpers
// -----------------------
function render(html) {
  if (!appRoot) return;
  appRoot.innerHTML = html;
  // mobile-friendly scroll reset
  window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
}

function layoutLanding(content) {
  render(`<div class="landing-wrapper">${content}</div>`);
}

function layoutAuth(content) {
  render(`<div class="auth-container">${content}</div>`);
}

function layoutDashboard(content, role) {
  const sidebarLinks = role === 'doctor'
    ? `
    <a onclick="navigate('#/doctor-dashboard')">Dashboard</a>
    <a onclick="navigate('#/appointments')">Appointments</a>
    <a onclick="navigate('#/prescriptions')">Prescriptions</a>
    <a onclick="navigate('#/billing')">Billing</a>
    <a onclick="navigate('#/video-call')">Video Call</a>
    <a onclick="navigate('#/profile')">My Profile</a>
    <a onclick="endSession()">Logout</a>
  `
    : `
    <a onclick="navigate('#/patient-dashboard')">Dashboard</a>
    <a onclick="navigate('#/doctors-near-me')">Doctors Near Me</a>
    <a onclick="navigate('#/appointments')">Appointments</a>
    <a onclick="navigate('#/prescriptions')">Prescriptions</a>
    <a onclick="navigate('#/billing')">Billing</a>
    <a onclick="navigate('#/profile')">My Profile</a>
    <a onclick="endSession()">Logout</a>
  `;

  render(`
    <div class="dashboard-layout">
      <aside class="sidebar">
        <div class="sb-logo">
          <img src="./assets/doctorcare-logo.png" alt="DoctorCare">
          <span>DoctorCare</span>
        </div>
        <nav class="sb-nav">${sidebarLinks}</nav>
      </aside>
      <section class="content-area">${content}</section>
    </div>
  `);
}

// -----------------------
// Router
// -----------------------
const ROUTES = {
  '#/': routeLanding,
  '#/doctor-signup': routeDoctorSignup,
  '#/patient-signup': routePatientSignup,
  '#/doctor-login': routeDoctorLogin,
  '#/patient-login': routePatientLogin,
  '#/doctor-profile-complete': routeDoctorProfileCompletion,
  '#/patient-profile-complete': routePatientProfileCompletion,
  '#/doctor-dashboard': routeDoctorDashboard,
  '#/patient-dashboard': routePatientDashboard,
  '#/doctors-near-me': routeDoctorsNearMe,
  '#/book-appointment': routeBookAppointment,
  '#/appointments': routeAppointmentsList,
  '#/prescriptions': routePrescriptions,
  '#/billing': routeBilling,
  '#/video-call': routeVideoCall,
  '#/profile': routeProfile,
  '#/emergency-book': routeEmergencyBooking
};

function navigate(hash) {
  location.hash = hash;
}

function router() {
  const h = location.hash || '#/';
  const fn = ROUTES[h] || ROUTES['#/'];
  try {
    fn();
  } catch (e) {
    console.error('Router error:', e);
    ROUTES['#/']();
  }
}

// iOS sometimes fires load later; DOMContentLoaded is more reliable
window.addEventListener('hashchange', router);
window.addEventListener('DOMContentLoaded', router);

// -----------------------
// Landing page (matches your design)
// -----------------------
function routeLanding() {
  layoutLanding(`
    <div class="top-buttons">
      <button onclick="navigate('#/doctor-signup')">Doctor Sign Up</button>
      <button onclick="navigate('#/doctor-login')">Doctor Log In</button>
      <button onclick="navigate('#/patient-signup')">Patient Sign Up</button>
      <button onclick="navigate('#/patient-login')">Patient Log In</button>
    </div>

    <div class="landing-hero">
      <div class="hero-left">
        <h1>Health in<br>Your Hands.</h1>
        <p class="lead">Just Click, Book, and<br>Feel Better.</p>
        <button class="button-primary-landing" onclick="handleLandingBook()">Book Appointment</button>
      </div>
      <div class="hero-right">
        <!-- Use your final hero PNG here -->
        <img src="./assets/doctorcare-landing-hero.png" alt="DoctorCare Phone" />
      </div>
    </div>

    <section class="icon-row">
      <div class="icon-item">
        <div class="icon-circle"><img src="./assets/icons/check.png" alt="Click"></div>
        <p>Click</p>
      </div>
      <div class="icon-item">
        <div class="icon-circle"><img src="./assets/icons/calendar.png" alt="Book"></div>
        <p>Book</p>
      </div>
      <div class="icon-item">
        <div class="icon-circle"><img src="./assets/icons/smile.png" alt="Feel Better"></div>
        <p>Feel Better</p>
      </div>
    </section>

    <div class="footer-logo">DoctorCare</div>
  `);
}

// If logged in → normal booking; else → emergency booking
function handleLandingBook() {
  if (store.session.role === 'patient') {
    navigate('#/book-appointment');
  } else {
    navigate('#/emergency-book');
  }
}

// -----------------------
// AUTH — SIGNUP & LOGIN
// -----------------------
function routeDoctorSignup() {
  layoutAuth(`
    <div class="auth-box">
      <div class="auth-logo">
        <img src="./assets/doctorcare-logo.png" alt="DoctorCare">
        <span>DoctorCare</span>
      </div>
      <h2>Doctor Sign Up</h2>
      <input id="ds_name" class="input" placeholder="Full Name">
      <input id="ds_email" class="input" placeholder="Email">
      <input id="ds_mobile" class="input" placeholder="Mobile Number">
      <input id="ds_pass" type="password" class="input" placeholder="Password">
      <input id="ds_confirm" type="password" class="input" placeholder="Confirm Password">
      <button class="button primary" onclick="doDoctorSignup()">Sign Up</button>
      <div class="auth-links">
        <a onclick="navigate('#/doctor-login')">Already have an account? Log In</a>
        <a onclick="navigate('#/')">Back to Home</a>
      </div>
    </div>
  `);
}

function doDoctorSignup() {
  const name = $('ds_name').value.trim();
  const email = $('ds_email').value.trim();
  const mobile = $('ds_mobile').value.trim();
  const pass = $('ds_pass').value;
  const confirm = $('ds_confirm').value;

  if (!name || !email || !mobile || !pass || !confirm) return toast('Fill all fields');
  if (pass !== confirm) return toast('Passwords do not match');
  if (store.doctors.some(d => d.email === email)) return toast('Email already registered');

  const d = {
    id: uid(),
    name,
    email,
    mobile,
    password: hash(pass),
    profileCompleted: false,
    rating: [],
    lat: null,
    lng: null
  };

  store.doctors.push(d);
  saveStore(store);
  toast('Doctor registered. Please login.');
  navigate('#/doctor-login');
}

function routePatientSignup() {
  layoutAuth(`
    <div class="auth-box">
      <div class="auth-logo">
        <img src="./assets/doctorcare-logo.png" alt="DoctorCare">
        <span>DoctorCare</span>
      </div>
      <h2>Patient Sign Up</h2>
      <input id="ps_name" class="input" placeholder="Full Name">
      <input id="ps_email" class="input" placeholder="Email">
      <input id="ps_mobile" class="input" placeholder="Mobile Number">
      <input id="ps_pass" type="password" class="input" placeholder="Password">
      <input id="ps_confirm" type="password" class="input" placeholder="Confirm Password">
      <button class="button primary" onclick="doPatientSignup()">Sign Up</button>
      <div class="auth-links">
        <a onclick="navigate('#/patient-login')">Already have an account? Log In</a>
        <a onclick="navigate('#/')">Back to Home</a>
      </div>
    </div>
  `);
}

function doPatientSignup() {
  const name = $('ps_name').value.trim();
  const email = $('ps_email').value.trim();
  const mobile = $('ps_mobile').value.trim();
  const pass = $('ps_pass').value;
  const confirm = $('ps_confirm').value;

  if (!name || !email || !mobile || !pass || !confirm) return toast('Fill all fields');
  if (pass !== confirm) return toast('Passwords do not match');
  if (store.patients.some(p => p.email === email)) return toast('Email already registered');

  const p = {
    id: uid(),
    name,
    email,
    mobile,
    password: hash(pass),
    profileCompleted: false,
    lat: null,
    lng: null
  };

  store.patients.push(p);
  saveStore(store);
  toast('Patient registered. Please login.');
  navigate('#/patient-login');
}

function routeDoctorLogin() {
  layoutAuth(`
    <div class="auth-box">
      <div class="auth-logo">
        <img src="./assets/doctorcare-logo.png" alt="DoctorCare">
        <span>DoctorCare</span>
      </div>
      <h2>Doctor Log In</h2>
      <input id="dl_email" class="input" placeholder="Email">
      <input id="dl_pass" type="password" class="input" placeholder="Password">
      <button class="button primary" onclick="doDoctorLogin()">Log In</button>
      <div class="auth-links">
        <a onclick="navigate('#/doctor-signup')">Create doctor account</a>
        <a onclick="navigate('#/')">Back to Home</a>
      </div>
    </div>
  `);
}

function doDoctorLogin() {
  const email = $('dl_email').value.trim();
  const pass = hash($('dl_pass').value);
  const d = store.doctors.find(x => x.email === email && x.password === pass);
  if (!d) return toast('Invalid credentials');

  setSession('doctor', d.id);
  toast('Welcome Dr. ' + d.name);

  if (!d.profileCompleted) navigate('#/doctor-profile-complete');
  else navigate('#/doctor-dashboard');
}

function routePatientLogin() {
  layoutAuth(`
    <div class="auth-box">
      <div class="auth-logo">
        <img src="./assets/doctorcare-logo.png" alt="DoctorCare">
        <span>DoctorCare</span>
      </div>
      <h2>Patient Log In</h2>
      <input id="pl_email" class="input" placeholder="Email">
      <input id="pl_pass" type="password" class="input" placeholder="Password">
      <button class="button primary" onclick="doPatientLogin()">Log In</button>
      <div class="auth-links">
        <a onclick="navigate('#/patient-signup')">Create patient account</a>
        <a onclick="navigate('#/')">Back to Home</a>
      </div>
    </div>
  `);
}

function doPatientLogin() {
  const email = $('pl_email').value.trim();
  const pass = hash($('pl_pass').value);
  const p = store.patients.find(x => x.email === email && x.password === pass);
  if (!p) return toast('Invalid credentials');

  setSession('patient', p.id);
  toast('Welcome ' + p.name);

  if (!p.profileCompleted) navigate('#/patient-profile-complete');
  else navigate('#/patient-dashboard');
}

// -----------------------
// PROFILE COMPLETION
// -----------------------
function routeDoctorProfileCompletion() {
  const d = currentDoctor();
  if (!d) return navigate('#/doctor-login');

  layoutAuth(`
    <div class="auth-box-large">
      <h2>Complete Your Profile (Doctor)</h2>
      <p class="subtitle">Add professional details. Mobile & Gender required.</p>
      <input id="dp_mobile" class="input" placeholder="Mobile Number" value="${escapeHtml(d.mobile || '')}">
      <select id="dp_gender" class="input">
        <option value="">Select Gender</option>
        <option ${d.gender === 'Male' ? 'selected' : ''}>Male</option>
        <option ${d.gender === 'Female' ? 'selected' : ''}>Female</option>
        <option ${d.gender === 'Other' ? 'selected' : ''}>Other</option>
        <option ${d.gender === 'Prefer not to say' ? 'selected' : ''}>Prefer not to say</option>
      </select>
      <input id="dp_degree" class="input" placeholder="Degree (MBBS, MD)" value="${escapeHtml(d.degree || '')}">
      <input id="dp_spec" class="input" placeholder="Specialization" value="${escapeHtml(d.spec || '')}">
      <input id="dp_exp" class="input" placeholder="Experience (years)" value="${escapeHtml(d.exp || '')}">
      <input id="dp_clinic" class="input" placeholder="Clinic/Hospital Name" value="${escapeHtml(d.clinic || '')}">
      <input id="dp_addr" class="input" placeholder="Clinic Address" value="${escapeHtml(d.address || '')}">
      <input id="dp_fee" class="input" placeholder="Consultation Fee" value="${escapeHtml(d.fee || '')}">
      <input id="dp_time" class="input" placeholder="Availability (e.g. 10:00 - 17:00)" value="${escapeHtml(d.time || '')}">
      <button class="button primary" onclick="saveDoctorProfile()">Save & Continue</button>
    </div>
  `);
}

function saveDoctorProfile() {
  const d = currentDoctor();
  if (!d) return;

  const mobile = $('dp_mobile').value.trim();
  const gender = $('dp_gender').value.trim();
  if (!mobile || !gender) return toast('Mobile & Gender required');

  d.mobile = mobile;
  d.gender = gender;
  d.degree = $('dp_degree').value.trim();
  d.spec = $('dp_spec').value.trim();
  d.exp = $('dp_exp').value.trim();
  d.clinic = $('dp_clinic').value.trim();
  d.address = $('dp_addr').value.trim();
  d.fee = $('dp_fee').value.trim();
  d.time = $('dp_time').value.trim();
  d.profileCompleted = true;

  saveStore(store);
  toast('Profile saved');
  navigate('#/doctor-dashboard');
}

function routePatientProfileCompletion() {
  const p = currentPatient();
  if (!p) return navigate('#/patient-login');

  layoutAuth(`
    <div class="auth-box-large">
      <h2>Complete Your Profile (Patient)</h2>
      <input id="pp_mobile" class="input" placeholder="Mobile Number" value="${escapeHtml(p.mobile || '')}">
      <select id="pp_gender" class="input">
        <option value="">Select Gender</option>
        <option ${p.gender === 'Male' ? 'selected' : ''}>Male</option>
        <option ${p.gender === 'Female' ? 'selected' : ''}>Female</option>
        <option ${p.gender === 'Other' ? 'selected' : ''}>Other</option>
        <option ${p.gender === 'Prefer not to say' ? 'selected' : ''}>Prefer not to say</option>
      </select>
      <input id="pp_dob" class="input" placeholder="Date of Birth (DD/MM/YYYY)" value="${escapeHtml(p.dob || '')}">
      <input id="pp_address" class="input" placeholder="Full Address" value="${escapeHtml(p.address || '')}">
      <input id="pp_emergency" class="input" placeholder="Emergency Contact" value="${escapeHtml(p.emergency || '')}">
      <button class="button primary" onclick="savePatientProfile()">Save & Continue</button>
    </div>
  `);
}

function savePatientProfile() {
  const p = currentPatient();
  if (!p) return;

  const mobile = $('pp_mobile').value.trim();
  const gender = $('pp_gender').value.trim();
  if (!mobile || !gender) return toast('Mobile & Gender required');

  p.mobile = mobile;
  p.gender = gender;
  p.dob = $('pp_dob').value.trim();
  p.address = $('pp_address').value.trim();
  p.emergency = $('pp_emergency').value.trim();
  p.profileCompleted = true;

  saveStore(store);
  toast('Profile saved');
  navigate('#/patient-dashboard');
}

// -----------------------
// DOCTORS NEAR ME (with distance & rating)
// -----------------------
function routeDoctorsNearMe() {
  const p = currentPatient();
  if (!p) return navigate('#/patient-login');

  // Try to get patient location (auto GPS)
  if (navigator.geolocation && (p.lat == null || p.lng == null)) {
    navigator.geolocation.getCurrentPosition(
      pos => {
        p.lat = pos.coords.latitude;
        p.lng = pos.coords.longitude;
        saveStore(store);
        renderDoctorsNearMeList(p);
      },
      () => {
        toast('Location permission denied (showing all doctors)');
        renderDoctorsNearMeList(p);
      },
      {
        enableHighAccuracy: true,
        timeout: 8000,
        maximumAge: 600000
      }
    );
  } else {
    renderDoctorsNearMeList(p);
  }
}

function renderDoctorsNearMeList(p) {
  const docs = store.doctors.map(d => {
    const dist =
      p.lat != null && p.lng != null && d.lat != null && d.lng != null
        ? distanceKm(p.lat, p.lng, d.lat, d.lng)
        : null;
    const avgRating =
      d.rating && d.rating.length
        ? d.rating.reduce((a, b) => a + b, 0) / d.rating.length
        : 0;
    return { ...d, dist, avgRating };
  });

  docs.sort((a, b) => {
    const da = a.dist == null ? 99999 : a.dist;
    const db = b.dist == null ? 99999 : b.dist;
    if (da !== db) return da - db;
    return b.avgRating - a.avgRating;
  });

  const list =
    docs.map(d => `
    <div class="doctor-card-big ${
      d.dist != null && d.dist <= 5 ? 'highlight' : ''
    }">
      <img src="./assets/default-doctor.png" alt="Doctor">
      <div class="doc-meta">
        <h3>Dr. ${escapeHtml(d.name)}</h3>
        <p>${escapeHtml(d.spec || 'Specialist')} • ⭐ ${d.avgRating.toFixed(
      1
    )} • ${d.dist != null ? d.dist + ' km away' : 'Distance N/A'}</p>
        <p>${escapeHtml(d.clinic || 'Clinic')}</p>
        <div class="doc-actions">
          <button class="button small" onclick="startBooking('${d.id}')">Book</button>
        </div>
      </div>
    </div>
  `).join('') || '<p>No doctors available yet.</p>';

  layoutDashboard(
    `
    <h2 class="page-title">Doctors Near You</h2>
    <div class="card">
      ${list}
    </div>
  `,
    'patient'
  );
}

function startBooking(docId) {
  navigate('#/book-appointment');
  setTimeout(() => {
    const sel = $('bk_doc');
    if (sel) sel.value = docId;
  }, 50);
}

// -----------------------
// DASHBOARDS
// -----------------------
function dailyEarningsForDoctor(doctorId) {
  const today = new Date().toISOString().slice(0, 10);
  return store.bills
    .filter(b => b.doctorId === doctorId && b.date && b.date.startsWith(today))
    .reduce((sum, b) => sum + (b.totalAmount || 0), 0);
}

function routeDoctorDashboard() {
  const d = currentDoctor();
  if (!d) return navigate('#/doctor-login');

  const todayAppts = store.appointments.filter(a => a.doctorId === d.id);
  const uniquePatients = new Set(todayAppts.map(a => a.patientId)).size;
  const todaysEarn = dailyEarningsForDoctor(d.id);

  layoutDashboard(
    `
    <h2 class="page-title">Welcome, Dr. ${escapeHtml(d.name)}</h2>
    <div class="grid-3">
      <div class="card stat-card"><h3>Today's Appointments</h3><p>${
        todayAppts.length
      }</p></div>
      <div class="card stat-card"><h3>My Patients</h3><p>${uniquePatients}</p></div>
      <div class="card stat-card"><h3>Today's Earnings</h3><p>₹${todaysEarn}</p></div>
    </div>

    <div class="two-col">
      <div class="card">
        <h3>Upcoming Appointments</h3>
        ${
          todayAppts.slice(0, 6).map(a => {
            const p = store.patients.find(x => x.id === a.patientId);
            const label = p ? p.name : 'Patient';
            return `<div class="appt-row">
              <strong>${escapeHtml(label)}</strong>
              <div>${escapeHtml(a.time || '')}</div>
              <button class="button small" onclick="openAppointmentDetails('${a.id}')">Open</button>
            </div>`;
          }).join('') || '<p>No appointments.</p>'
        }
      </div>

      <div class="card">
        <h3>AI Assistant (Demo)</h3>
        <div id="chatbox" class="chat-area"></div>
        <div class="chat-input-row">
          <input id="chatInput" class="input" placeholder="Ask DoctorCare...">
          <button class="button primary" onclick="chatSend()">Send</button>
        </div>
      </div>
    </div>
  `,
    'doctor'
  );

  setTimeout(() => {
    chatInit();
    chatBotWelcome();
  }, 50);
}

function routePatientDashboard() {
  const p = currentPatient();
  if (!p) return navigate('#/patient-login');

  const myAppts = store.appointments.filter(a => a.patientId === p.id);
  const myPres = store.prescriptions.filter(pr => pr.patientId === p.id);
  const myBills = store.bills.filter(b => b.patientId === p.id);

  layoutDashboard(
    `
    <h2 class="page-title">Welcome, ${escapeHtml(p.name)}</h2>
    <div class="grid-3">
      <div class="card stat-card"><h3>Upcoming Appointments</h3><p>${
        myAppts.length
      }</p></div>
      <div class="card stat-card"><h3>Prescriptions</h3><p>${
        myPres.length
      }</p></div>
      <div class="card stat-card"><h3>Bills</h3><p>${myBills.length}</p></div>
    </div>

    <div class="card">
      <button class="button primary" onclick="navigate('#/doctors-near-me')">Doctors Near Me</button>
      <button class="button secondary" style="margin-left:8px" onclick="navigate('#/patient-profile-complete')">Complete Profile</button>
    </div>

    <div class="two-col">
      <div class="card">
        <h3>Quick Doctors</h3>
        <div class="doctor-preview">
          ${
            store.doctors.slice(0, 4).map(d => `
              <div class="doc-preview">
                <img src="./assets/default-doctor.png">
                <div>
                  <strong>Dr. ${escapeHtml(d.name)}</strong>
                  <div>${escapeHtml(d.spec || '')}</div>
                </div>
                <button class="button small" onclick="startBooking('${d.id}')">Book</button>
              </div>
          `).join('') || '<p>No doctors yet.</p>'
          }
        </div>
      </div>

      <div class="card">
        <h3>AI Assistant (Demo)</h3>
        <div id="chatbox" class="chat-area"></div>
        <div class="chat-input-row">
          <input id="chatInput" class="input" placeholder="Ask DoctorCare...">
          <button class="button primary" onclick="chatSend()">Send</button>
        </div>
      </div>
    </div>
  `,
    'patient'
  );

  setTimeout(() => {
    chatInit();
    chatBotWelcome();
  }, 50);
}

// -----------------------
// APPOINTMENTS / BOOKING
// -----------------------
function routeBookAppointment() {
  const docs = store.doctors
    .map(
      d =>
        `<option value="${d.id}">Dr. ${escapeHtml(d.name)} — ${escapeHtml(
          d.spec || ''
        )}</option>`
    )
    .join('');
  const pats = store.patients
    .map(p => `<option value="${p.id}">${escapeHtml(p.name)}</option>`)
    .join('');

  const role = store.session.role || 'patient';

  layoutDashboard(
    `
    <h2 class="page-title">Book Appointment</h2>
    <div class="card booking-box">
      <label>Doctor</label>
      <select id="bk_doc" class="input">${docs}</select>
      <label>Patient</label>
      <select id="bk_pat" class="input">${pats}</select>
      <label>Date & Time</label>
      <input id="bk_time" class="input" placeholder="YYYY-MM-DD HH:MM">
      <button class="button primary" onclick="saveAppointmentPro()">Save</button>
    </div>
  `,
    role
  );
}

function saveAppointmentPro() {
  const doctorId = $('bk_doc').value;
  const patientId = $('bk_pat').value;
  const time = $('bk_time').value.trim();
  if (!doctorId || !patientId || !time) return toast('Fill all booking fields');

  const a = {
    id: uid(),
    doctorId,
    patientId,
    time,
    status: 'Booked',
    emergency: false
  };

  store.appointments.push(a);
  saveStore(store);
  toast('Appointment saved');

  const role = store.session.role;
  if (role === 'doctor') navigate('#/doctor-dashboard');
  else navigate('#/patient-dashboard');
}

function routeAppointmentsList() {
  const role = store.session.role;
  const id = store.session.id;
  if (!role) return navigate('#/');

  const isDoctor = role === 'doctor';
  const list =
    store.appointments
      .filter(a => (isDoctor ? a.doctorId === id : a.patientId === id))
      .map(a => {
        const doc = store.doctors.find(d => d.id === a.doctorId);
        const pat = store.patients.find(p => p.id === a.patientId);
        const label = isDoctor
          ? pat
            ? pat.name
            : 'Patient'
          : doc
          ? 'Dr. ' + doc.name
          : 'Doctor';
        return `<div class="appt-row ${a.emergency ? 'emergency' : ''}">
        <strong>${escapeHtml(label)}</strong>
        <div>${escapeHtml(a.time || '')} • ${
          a.emergency ? 'Emergency' : 'Normal'
        }</div>
        <button class="button small" onclick="openAppointmentDetails('${a.id}')">Open</button>
      </div>`;
      })
      .join('') || '<p>No appointments.</p>';

  layoutDashboard(
    `
    <h2 class="page-title">Appointments</h2>
    <div class="card">${list}</div>
  `,
    role
  );
}

function openAppointmentDetails(apptId) {
  const a = store.appointments.find(x => x.id === apptId);
  if (!a) return toast('Appointment not found');

  const doc = store.doctors.find(d => d.id === a.doctorId);
  const pat = store.patients.find(p => p.id === a.patientId);
  const role = store.session.role || 'doctor';

  layoutDashboard(
    `
    <h2 class="page-title">Appointment Details</h2>
    <div class="card">
      <p><strong>Doctor:</strong> Dr. ${escapeHtml(doc ? doc.name : '')}</p>
      <p><strong>Patient:</strong> ${escapeHtml(pat ? pat.name : '')}</p>
      <p><strong>Time:</strong> ${escapeHtml(a.time || '')}</p>
      <p><strong>Type:</strong> ${a.emergency ? 'Emergency' : 'Normal'}</p>

      <h3>Create Prescription</h3>
      <button class="button small" onclick="startVoicePrescription('${a.id}')">Start Recording (Demo)</button>
      <button class="button small" onclick="generateVoicePrescription('${a.id}')">Generate from Voice (Demo)</button>
      <button class="button small" onclick="openManualPrescription('${a.id}')">Create Manually</button>

      <h3 style="margin-top:16px;">Billing</h3>
      <button class="button small" onclick="openBilling('${a.id}')">Create Bill</button>
    </div>
  `,
    role
  );
}

// -----------------------
// EMERGENCY BOOKING (No signup)
// -----------------------
function routeEmergencyBooking() {
  layoutAuth(`
    <div class="auth-box-large">
      <h2>Emergency Appointment</h2>
      <p class="subtitle">For accidents / sudden serious conditions only.</p>
      <input id="em_mobile" class="input" placeholder="Mobile Number (required)">
      <textarea id="em_desc" class="input" style="height:80px;" placeholder="Describe emergency"></textarea>
      <button class="button primary" onclick="saveEmergency()">Find Doctor (Demo)</button>
      <div class="auth-links"><a onclick="navigate('#/')">Back to Home</a></div>
    </div>
  `);
}

function saveEmergency() {
  const mobile = $('em_mobile').value.trim();
  const desc = $('em_desc').value.trim();
  if (!mobile || !desc) return toast('Mobile & description required');

  const doc = store.doctors[0];
  if (!doc) {
    toast('No doctors available yet.');
    return;
  }

  const emergencyAppt = {
    id: uid(),
    doctorId: doc.id,
    patientId: null,
    time: new Date().toISOString(),
    status: 'Emergency',
    emergency: true,
    emergencyMobile: mobile,
    emergencyDesc: desc
  };

  store.appointments.push(emergencyAppt);
  saveStore(store);
  toast('Emergency request created (demo). Doctor will see it in their list.');
  navigate('#/');
}

// -----------------------
// PRESCRIPTIONS (Voice + Manual, simplified)
// -----------------------
function routePrescriptions() {
  const role = store.session.role;
  if (!role) return navigate('#/');

  const id = store.session.id;
  const list =
    store.prescriptions
      .filter(pr => (role === 'doctor' ? pr.doctorId === id : pr.patientId === id))
      .map(pr => {
        const doc = store.doctors.find(d => d.id === pr.doctorId);
        const pat = store.patients.find(p => p.id === pr.patientId);
        return `<div class="appt-row">
        <strong>${escapeHtml(doc ? 'Dr. ' + doc.name : '')} → ${escapeHtml(
          pat ? pat.name : ''
        )}</strong>
        <div>${escapeHtml(pr.createdAt || '')}</div>
        <button class="button small" onclick="viewPrescription('${pr.id}')">View / Print</button>
      </div>`;
      })
      .join('') || '<p>No prescriptions yet.</p>';

  layoutDashboard(
    `
    <h2 class="page-title">Prescriptions</h2>
    <div class="card">${list}</div>
  `,
    role
  );
}

function startVoicePrescription(apptId) {
  toast('🎙 Voice recording demo started (no real audio).');
}

function generateVoicePrescription(apptId) {
  const a = store.appointments.find(x => x.id === apptId);
  if (!a) return toast('Appointment missing');

  const pr = {
    id: uid(),
    doctorId: a.doctorId,
    patientId: a.patientId,
    appointmentId: a.id,
    symptoms: 'Fever, cough (auto from voice demo)',
    testsRequired: 'CBC, Chest X-ray (demo)',
    diagnosis: 'Viral fever (demo)',
    medicines: [
      { name: 'Paracetamol 650mg', freq: '3 times/day', duration: '5 days', note: 'After food' }
    ],
    advice: 'Drink water, rest (demo)',
    followUp: '5 days',
    createdAt: new Date().toLocaleString(),
    method: 'voice'
  };

  store.prescriptions.push(pr);
  saveStore(store);
  toast('Prescription generated (demo).');
}

function openManualPrescription(apptId) {
  const a = store.appointments.find(x => x.id === apptId);
  if (!a) return toast('Appointment missing');

  const role = store.session.role || 'doctor';
  const doc = store.doctors.find(d => d.id === a.doctorId);
  const pat = store.patients.find(p => p.id === a.patientId);

  layoutDashboard(
    `
    <h2 class="page-title">Manual Prescription</h2>
    <div class="card">
      <p><strong>Doctor:</strong> Dr. ${escapeHtml(doc ? doc.name : '')}</p>
      <p><strong>Patient:</strong> ${escapeHtml(pat ? pat.name : '')}</p>
      <textarea id="pr_symptoms" class="input" style="height:60px;" placeholder="Symptoms"></textarea>
      <textarea id="pr_tests" class="input" style="height:60px;" placeholder="Tests Required"></textarea>
      <textarea id="pr_diag" class="input" style="height:60px;" placeholder="Diagnosis"></textarea>
      <textarea id="pr_advice" class="input" style="height:60px;" placeholder="Advice"></textarea>
      <input id="pr_follow" class="input" placeholder="Follow up (e.g. After 5 days)">
      <textarea id="pr_meds" class="input" style="height:80px;" placeholder="Medicines (free text)"></textarea>
      <button class="button primary" onclick="saveManualPrescription('${a.id}')">Save Prescription</button>
    </div>
  `,
    role
  );
}

function saveManualPrescription(apptId) {
  const a = store.appointments.find(x => x.id === apptId);
  if (!a) return toast('Appointment missing');

  const pr = {
    id: uid(),
    doctorId: a.doctorId,
    patientId: a.patientId,
    appointmentId: a.id,
    symptoms: $('pr_symptoms').value,
    testsRequired: $('pr_tests').value,
    diagnosis: $('pr_diag').value,
    advice: $('pr_advice').value,
    followUp: $('pr_follow').value,
    medicinesText: $('pr_meds').value,
    medicines: [],
    createdAt: new Date().toLocaleString(),
    method: 'manual'
  };

  store.prescriptions.push(pr);
  saveStore(store);
  toast('Prescription saved');
  routePrescriptions();
}

function viewPrescription(prId) {
  const pr = store.prescriptions.find(p => p.id === prId);
  if (!pr) return toast('Prescription missing');

  const doc = store.doctors.find(d => d.id === pr.doctorId);
  const pat = store.patients.find(p => p.id === pr.patientId);
  const role = store.session.role || 'patient';

  layoutDashboard(
    `
    <h2 class="page-title">Prescription</h2>
    <div class="card">
      <p><strong>Doctor:</strong> Dr. ${escapeHtml(doc ? doc.name : '')}</p>
      <p><strong>Clinic:</strong> ${escapeHtml(doc ? doc.clinic || '' : '')}</p>
      <p><strong>Patient:</strong> ${escapeHtml(pat ? pat.name : '')}</p>
      <p><strong>Date:</strong> ${escapeHtml(pr.createdAt || '')}</p>
      <hr>
      <p><strong>Symptoms:</strong><br>${escapeHtml(pr.symptoms || '')}</p>
      <p><strong>Tests Required:</strong><br>${escapeHtml(pr.testsRequired || '')}</p>
      <p><strong>Diagnosis:</strong><br>${escapeHtml(pr.diagnosis || '')}</p>
      <p><strong>Advice:</strong><br>${escapeHtml(pr.advice || '')}</p>
      <p><strong>Follow-up:</strong><br>${escapeHtml(pr.followUp || '')}</p>
      <p><strong>Medicines:</strong><br>${escapeHtml(
        pr.medicinesText ||
          '(auto) ' +
            (pr.medicines || [])
              .map(m => m.name + ' ' + m.freq + ' ' + m.duration)
              .join('; ')
      )}</p>

      <button class="button primary" onclick="printPrescription('${pr.id}')">Print</button>
    </div>
  `,
    role
  );
}

// unified print helper (better for iOS/Android)
function openPrintWindow(html) {
  const win = window.open('', '_blank', 'noopener,noreferrer');
  if (!win) {
    toast('Popup blocked by browser');
    return;
  }
  win.document.write(html);
  win.document.close();
  // Some mobile browsers need a small delay before print
  setTimeout(() => {
    if (win.focus) win.focus();
    if (win.print) win.print();
  }, 200);
}

function printPrescription(prId) {
  const pr = store.prescriptions.find(p => p.id === prId);
  if (!pr) return toast('Prescription missing');

  const doc = store.doctors.find(d => d.id === pr.doctorId);
  const pat = store.patients.find(p => p.id === pr.patientId);

  openPrintWindow(`
    <html><head><title>Prescription</title></head>
    <body style="font-family:Arial, sans-serif; padding:20px;">
      <h2>DoctorCare Prescription</h2>
      <p><strong>Doctor:</strong> Dr. ${escapeHtml(doc ? doc.name : '')}</p>
      <p><strong>Clinic:</strong> ${escapeHtml(doc ? doc.clinic || '' : '')}</p>
      <p><strong>Patient:</strong> ${escapeHtml(pat ? pat.name : '')}</p>
      <p><strong>Date:</strong> ${escapeHtml(pr.createdAt || '')}</p>
      <hr>
      <p><strong>Symptoms:</strong><br>${escapeHtml(pr.symptoms || '')}</p>
      <p><strong>Tests Required:</strong><br>${escapeHtml(pr.testsRequired || '')}</p>
      <p><strong>Diagnosis:</strong><br>${escapeHtml(pr.diagnosis || '')}</p>
      <p><strong>Advice:</strong><br>${escapeHtml(pr.advice || '')}</p>
      <p><strong>Follow-up:</strong><br>${escapeHtml(pr.followUp || '')}</p>
      <p><strong>Medicines:</strong><br>${escapeHtml(
        pr.medicinesText || '(auto prescription demo)'
      )}</p>
      <br><br>
      <p>Signature: ___________________________</p>
    </body></html>
  `);
}

// -----------------------
// BILLING & EARNINGS
// -----------------------
function routeBilling() {
  const role = store.session.role;
  if (!role) return navigate('#/');

  const id = store.session.id;
  const list =
    store.bills
      .filter(b => (role === 'doctor' ? b.doctorId === id : b.patientId === id))
      .map(b => {
        const pat = store.patients.find(p => p.id === b.patientId);
        return `<div class="appt-row">
        <strong>Bill #${escapeHtml(b.id.slice(-6))}</strong>
        <div>${escapeHtml(pat ? pat.name : '')} • ₹${b.totalAmount} • ${escapeHtml(
          b.method
        )} • ${escapeHtml(b.status)}</div>
        <button class="button small" onclick="printBill('${b.id}')">Print</button>
      </div>`;
      })
      .join('') || '<p>No bills yet.</p>';

  layoutDashboard(
    `
    <h2 class="page-title">Billing</h2>
    <div class="card">${list}</div>
  `,
    role
  );
}

function openBilling(apptId) {
  const a = store.appointments.find(x => x.id === apptId);
  if (!a) return toast('Appointment missing');

  const doc = store.doctors.find(d => d.id === a.doctorId);
  const pat = store.patients.find(p => p.id === a.patientId);
  const role = store.session.role || 'doctor';

  layoutDashboard(
    `
    <h2 class="page-title">Create Bill</h2>
    <div class="card">
      <p><strong>Doctor:</strong> Dr. ${escapeHtml(doc ? doc.name : '')}</p>
      <p><strong>Patient:</strong> ${escapeHtml(pat ? pat.name : '')}</p>
      <input id="bl_consult" class="input" placeholder="Consultation Fee (₹)">
      <input id="bl_tests" class="input" placeholder="Test Charges (₹)">
      <input id="bl_other" class="input" placeholder="Other Charges (₹)">
      <input id="bl_discount" class="input" placeholder="Discount (₹)">
      <select id="bl_method" class="input">
        <option value="UPI">UPI</option>
        <option value="CARD">Card</option>
        <option value="CASH">Cash</option>
      </select>
      <button class="button primary" onclick="saveBill('${a.id}')">Save Bill</button>
    </div>
  `,
    role
  );
}

function saveBill(apptId) {
  const a = store.appointments.find(x => x.id === apptId);
  if (!a) return toast('Appointment missing');

  const consult = parseFloat($('bl_consult').value || '0');
  const tests = parseFloat($('bl_tests').value || '0');
  const other = parseFloat($('bl_other').value || '0');
  const discount = parseFloat($('bl_discount').value || '0');
  const method = $('bl_method').value;

  const total = Math.max(0, consult + tests + other - discount);

  const bill = {
    id: uid(),
    doctorId: a.doctorId,
    patientId: a.patientId,
    appointmentId: a.id,
    consult,
    tests,
    other,
    discount,
    totalAmount: total,
    method,
    status: 'PAID',
    date: new Date().toISOString()
  };

  store.bills.push(bill);
  saveStore(store);
  toast('Bill saved (demo paid).');
  routeBilling();
}

function printBill(billId) {
  const b = store.bills.find(x => x.id === billId);
  if (!b) return toast('Bill missing');

  const doc = store.doctors.find(d => d.id === b.doctorId);
  const pat = store.patients.find(p => p.id === b.patientId);

  openPrintWindow(`
    <html><head><title>Bill</title></head>
    <body style="font-family:Arial, sans-serif; padding:20px;">
      <h2>DoctorCare Bill</h2>
      <p><strong>Doctor:</strong> Dr. ${escapeHtml(doc ? doc.name : '')}</p>
      <p><strong>Patient:</strong> ${escapeHtml(pat ? pat.name : '')}</p>
      <p><strong>Date:</strong> ${escapeHtml(b.date || '')}</p>
      <p><strong>Bill #:</strong> ${escapeHtml(b.id.slice(-6))}</p>
      <hr>
      <div>Consultation Fee: ₹${b.consult}</div>
      <div>Test Charges: ₹${b.tests}</div>
      <div>Other Charges: ₹${b.other}</div>
      <div>Discount: -₹${b.discount}</div>
      <hr>
      <div><strong>Total: ₹${b.totalAmount}</strong></div>
      <p>Payment Method: ${escapeHtml(b.method)} • Status: ${escapeHtml(b.status)}</p>
      <br><br>
      <p>Thank you for visiting DoctorCare.</p>
    </body></html>
  `);
}

// -----------------------
// PROFILE VIEW
// -----------------------
function routeProfile() {
  const role = store.session.role;
  if (!role) return navigate('#/');

  const me = role === 'doctor' ? currentDoctor() : currentPatient();
  if (!me) return navigate(role === 'doctor' ? '#/doctor-login' : '#/patient-login');

  layoutDashboard(
    `
    <h2 class="page-title">My Profile</h2>
    <div class="card profile-card">
      <div class="profile-left">
        <img src="./assets/default-doctor.png" alt="Profile">
      </div>
      <div class="profile-right">
        <h3>${escapeHtml(me.name || '')}</h3>
        <p><strong>Email:</strong> ${escapeHtml(me.email || '')}</p>
        <p><strong>Mobile:</strong> ${escapeHtml(me.mobile || '')}</p>
        <p><strong>Gender:</strong> ${escapeHtml(me.gender || '')}</p>
        ${
          role === 'doctor'
            ? `<p><strong>Specialization:</strong> ${escapeHtml(me.spec || '')}</p>`
            : ''
        }
        <button class="button small" onclick="navigate('${
          role === 'doctor'
            ? '#/doctor-profile-complete'
            : '#/patient-profile-complete'
        }')">Edit Profile</button>
      </div>
    </div>
  `,
    role
  );
}

// -----------------------
// VIDEO CALL (DEMO ONLY)
// -----------------------
function routeVideoCall() {
  const role = store.session.role || 'patient';
  layoutDashboard(
    `
    <h2 class="page-title">Video Consultation (Demo)</h2>
    <div class="card">
      <p>This is a front-end demo only. Real video call needs a backend signaling server.</p>
      <div class="video-box">
        <video autoplay muted playsinline></video>
        <video autoplay playsinline></video>
      </div>
      <p style="margin-top:10px;">You can integrate WebRTC + Socket.IO later on your Node.js server.</p>
    </div>
  `,
    role
  );
}

// -----------------------
// SIMPLE CHATBOT (local)
// -----------------------
function chatInit() {
  const box = $('chatbox');
  if (!box) return;
  box.innerHTML = '';
  box._history = [];
}

function chatBotWelcome() {
  appendMessage(
    'assistant',
    'Hi! I am DoctorCare assistant (demo). I can help with booking, symptoms, and basic questions.'
  );
}

function appendMessage(role, text) {
  const box = $('chatbox');
  if (!box) return;

  const el = document.createElement('div');
  el.className = 'chat-message ' + (role === 'user' ? 'user-msg' : 'assistant-msg');
  el.innerHTML = `<div>${escapeHtml(text).replace(/\n/g, '<br>')}</div>`;
  box.appendChild(el);
  box.scrollTop = box.scrollHeight;
  box._history = box._history || [];
  box._history.push({ role, text });
  if (box._history.length > 80) box._history.shift();
}

function chatSend() {
  const input = $('chatInput');
  if (!input) return;
  const msg = (input.value || '').trim();
  if (!msg) return;

  appendMessage('user', msg);
  input.value = '';
  const reply = localBotResponse(msg);
  appendMessage('assistant', reply);
}

function localBotResponse(message) {
  const msg = message.toLowerCase();
  if (/(hello|hi|hey)/.test(msg))
    return 'Hello! 👋 How can I help you today?';
  if (/book.*appointment/.test(msg))
    return "You can book an appointment from the 'Book Appointment' screen or 'Doctors Near Me'.";
  if (/fever|cough|cold/.test(msg))
    return 'For fever/cough: rest, fluids. If symptoms worsen or persist, please see a doctor.';
  if (/billing|payment/.test(msg))
    return 'You can see your bills in the Billing section.';
  return "I'm a simple demo assistant. Try asking about booking, fever, or billing.";
}

// -----------------------
// Boot
// -----------------------
console.log(
  '[DoctorCare] app.js initialized ✅ — ready for Android, iOS, iPad & desktop'
);
