// DoctorCare Phase 1 — Landing + Auth UI + Basic Local Auth

(function () {
  const root = document.getElementById('app');

  const DB_KEY = 'doctorcare_db_v1';
  const SESSION_KEY = 'doctorcare_session_v1';

  function defaultDB() {
    return {
      users: [] // {id, role, name, email, mobile, password}
    };
  }

  function loadDB() {
    try {
      const raw = localStorage.getItem(DB_KEY);
      if (!raw) return defaultDB();
      return JSON.parse(raw);
    } catch (e) {
      console.error('DB parse error', e);
      return defaultDB();
    }
  }

  function saveDB(db) {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  }

  function saveSession(session) {
    if (!session) {
      localStorage.removeItem(SESSION_KEY);
    } else {
      localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    }
  }

  function loadSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      return null;
    }
  }

  function uid() {
    return 'id_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  // =======================
  // Router
  // =======================
  function handleRoute() {
    const hash = window.location.hash || '#/';

    if (hash === '#/' || hash === '') {
      renderLanding();
      return;
    }

    if (hash.startsWith('#/doctor/signup')) {
      renderSignup('doctor');
      return;
    }

    if (hash.startsWith('#/patient/signup')) {
      renderSignup('patient');
      return;
    }

    if (hash.startsWith('#/doctor/login')) {
      renderLogin('doctor');
      return;
    }

    if (hash.startsWith('#/patient/login')) {
      renderLogin('patient');
      return;
    }

    // default
    renderLanding();
  }

  window.addEventListener('hashchange', handleRoute);

  // =======================
  // STEP 1 — Landing Page
  // =======================
  function renderLanding() {
    root.innerHTML = `
      <div class="landing-container">

        <!-- TOP BUTTONS -->
        <div class="landing-top-buttons">
          <button class="btn-top" id="btnDoctorSignupTop">Doctor Sign Up</button>
          <button class="btn-top" id="btnDoctorLoginTop">Doctor Log In</button>
          <button class="btn-top" id="btnPatientSignupTop">Patient Sign Up</button>
          <button class="btn-top" id="btnPatientLoginTop">Patient Log In</button>
        </div>

        <!-- MAIN CONTENT -->
        <div class="landing-main">
          <!-- LEFT -->
          <div class="landing-text-box">
            <h1 class="landing-title">Health in<br>Your Hands.</h1>
            <p class="landing-subtext">Just Click, Book, and<br>Feel Better.</p>

            <button class="btn-main" id="btnMainBook">Book Appointment</button>

            <div class="icon-row">
              <div class="icon-item">
                <div class="icon-circle">✔</div>
                <p>Click</p>
              </div>
              <div class="icon-item">
                <div class="icon-circle">📅</div>
                <p>Book</p>
              </div>
              <div class="icon-item">
                <div class="icon-circle">🙂</div>
                <p>Feel Better</p>
              </div>
            </div>
          </div>

          <!-- RIGHT IMAGE -->
          <div class="landing-image">
            <!-- replace src with your own illustration -->
            <img src="./images/doctorcare-hero.png" alt="DoctorCare" />
          </div>
        </div>

        <div class="landing-footer">DoctorCare</div>
      </div>
    `;

    // Top buttons
    document.getElementById('btnDoctorSignupTop').onclick = () => {
      location.hash = '#/doctor/signup';
    };
    document.getElementById('btnDoctorLoginTop').onclick = () => {
      location.hash = '#/doctor/login';
    };
    document.getElementById('btnPatientSignupTop').onclick = () => {
      location.hash = '#/patient/signup';
    };
    document.getElementById('btnPatientLoginTop').onclick = () => {
      location.hash = '#/patient/login';
    };

    // Main orange button → patient booking (later)
    document.getElementById('btnMainBook').onclick = () => {
      // for now go to patient login; later to patient home/booking
      location.hash = '#/patient/login';
    };
  }

  // =======================
  // STEP 2 — Sign Up (Doctor / Patient)
  // =======================
  function renderSignup(role) {
    const roleLabel = role === 'doctor' ? 'Doctor' : 'Patient';

    root.innerHTML = `
      <div class="auth-shell">
        <div class="auth-card">
          <div class="auth-role-tag">${roleLabel} Sign Up</div>
          <h2 class="auth-title">${roleLabel} Account</h2>
          <p class="auth-subtitle">Create your ${roleLabel.toLowerCase()} profile to use DoctorCare.</p>

          <div class="auth-input-group">
            <label class="auth-label">Full Name</label>
            <input type="text" id="suName" class="auth-input" />
          </div>

          <div class="auth-input-group">
            <label class="auth-label">Email</label>
            <input type="email" id="suEmail" class="auth-input" />
          </div>

          <div class="auth-input-group">
            <label class="auth-label">Mobile Number</label>
            <input type="tel" id="suMobile" class="auth-input" />
          </div>

          <div class="auth-input-group">
            <label class="auth-label">Password</label>
            <input type="password" id="suPassword" class="auth-input" />
          </div>

          <!-- extra doctor fields (we’ll expand later) -->
          <div id="extraDoctorFields" style="${role === 'doctor' ? '' : 'display:none;'}">
            <div class="auth-input-group">
              <label class="auth-label">Specialization</label>
              <input type="text" id="suSpecialization" class="auth-input" />
            </div>
            <div class="auth-input-group">
              <label class="auth-label">Clinic Address</label>
              <input type="text" id="suClinic" class="auth-input" />
            </div>
          </div>

          <div class="auth-actions">
            <button class="btn-auth-primary" id="btnCompleteSignup">Create ${roleLabel} Account</button>
            <button class="btn-auth-secondary" id="btnBackFromSignup">Back</button>
          </div>
        </div>
      </div>
    `;

    document.getElementById('btnBackFromSignup').onclick = () => {
      location.hash = '#/';
    };

    document.getElementById('btnCompleteSignup').onclick = () => {
      const name = document.getElementById('suName').value.trim();
      const email = document.getElementById('suEmail').value.trim().toLowerCase();
      const mobile = document.getElementById('suMobile').value.trim();
      const password = document.getElementById('suPassword').value;

      if (!name || !email || !mobile || !password) {
        alert('Please fill all required fields.');
        return;
      }

      const db = loadDB();

      // Step 9: Unique email + mobile across all users
      const existing = db.users.find(
        u => u.email === email || u.mobile === mobile
      );
      if (existing) {
        alert('An account already exists with this email or mobile number.');
        return;
      }

      const user = {
        id: uid(),
        role,
        name,
        email,
        mobile,
        password // NOTE: plain text here; in real backend we hash
      };

      db.users.push(user);
      saveDB(db);

      // auto-login
      saveSession({ userId: user.id, role: user.role });

      if (role === 'doctor') {
        // later: go to doctor dashboard
        alert('Doctor account created. (Next phase: redirect to doctor home)');
        location.hash = '#/doctor/login';
      } else {
        // later: go to patient dashboard
        alert('Patient account created. (Next phase: redirect to patient home)');
        location.hash = '#/patient/login';
      }
    };
  }

  // =======================
  // STEP 3 — Login (Doctor / Patient)
  // =======================
  function renderLogin(role) {
    const roleLabel = role === 'doctor' ? 'Doctor' : 'Patient';

    root.innerHTML = `
      <div class="login-shell">
        <div class="login-card">
          <div class="login-logo">DC</div>
          <h2 class="login-title">${roleLabel} Log In</h2>
          <p class="login-subtitle">Use your email or mobile number to access your ${roleLabel.toLowerCase()} account.</p>

          <div class="login-input-group">
            <label class="login-label">Email or Mobile</label>
            <input type="text" id="liIdentifier" class="login-input" />
          </div>

          <div class="login-input-group">
            <label class="login-label">Password</label>
            <input type="password" id="liPassword" class="login-input" />
          </div>

          <div class="login-actions">
            <button class="btn-login-primary" id="btnDoLogin">Log In</button>
            <button class="btn-login-secondary" id="btnBackFromLogin">Back</button>
          </div>

          <div class="login-footer-row">
            <span>Need an account?</span>
            <button class="login-forgot" id="btnGoSignup">Sign Up</button>
          </div>

          <div class="login-footer-row">
            <span>Forgot your password?</span>
            <button class="login-forgot" id="btnForgot">Reset</button>
          </div>
        </div>
      </div>
    `;

    document.getElementById('btnBackFromLogin').onclick = () => {
      location.hash = '#/';
    };

    document.getElementById('btnGoSignup').onclick = () => {
      location.hash = role === 'doctor' ? '#/doctor/signup' : '#/patient/signup';
    };

    document.getElementById('btnForgot').onclick = () => {
      alert('Reset password flow will be implemented when we connect the online server (email/SMS).');
    };

    document.getElementById('btnDoLogin').onclick = () => {
      const identifier = document.getElementById('liIdentifier').value.trim().toLowerCase();
      const password = document.getElementById('liPassword').value;

      if (!identifier || !password) {
        alert('Please fill both fields.');
        return;
      }

      const db = loadDB();

      // Step 9: login by email OR mobile + password + correct role
      const user = db.users.find(
        u =>
          u.role === role &&
          (u.email === identifier || u.mobile === identifier) &&
          u.password === password
      );

      if (!user) {
        alert('Invalid credentials or role.');
        return;
      }

      saveSession({ userId: user.id, role: user.role });

      if (role === 'doctor') {
        // later: doctor home screen
        alert('Logged in as doctor. (Next phase: doctor home UI)');
        // location.hash = '#/doctor/home'; // reserved for next phase
      } else {
        // later: patient home screen
        alert('Logged in as patient. (Next phase: patient home UI)');
        // location.hash = '#/patient/home'; // reserved for next phase
      }
    };
  }

  // Init
  handleRoute();
})();
