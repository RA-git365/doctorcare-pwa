console.log('[DoctorCare] app.js loaded');

const App = (() => {
  const root = document.getElementById('app');

  const DB_KEY = 'doctorcare_db_v1';
  const SESSION_KEY = 'doctorcare_session_v1';

  // -------------------------------------------
  // DB helpers
  // -------------------------------------------

  function defaultDB() {
    return {
      doctors: [],
      patients: [],
      appointments: [],
      prescriptions: [],
      bills: []
    };
  }

  function loadDB() {
    try {
      const raw = localStorage.getItem(DB_KEY);
      if (!raw) return defaultDB();
      return JSON.parse(raw);
    } catch (e) {
      console.error('Failed to parse DB', e);
      return defaultDB();
    }
  }

  function saveDB(db) {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
  }

  function loadSession() {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch (e) {
      console.error('Failed to parse session', e);
      return null;
    }
  }

  function saveSession(sess) {
    if (!sess) {
      localStorage.removeItem(SESSION_KEY);
    } else {
      localStorage.setItem(SESSION_KEY, JSON.stringify(sess));
    }
  }

  function logout() {
    saveSession(null);
    location.hash = '#/';
  }

  // Simple ID
  function uid() {
    return 'id_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  // -------------------------------------------
  // Router
  // -------------------------------------------
  function render() {
    const hash = location.hash || '#/';
    const session = loadSession();

    if (hash === '#/' || hash === '') {
      // If logged in redirect to dashboard
      if (session?.role === 'doctor') {
        return renderDoctorDashboard();
      }
      if (session?.role === 'patient') {
        return renderPatientHome();
      }
      return renderLanding();
    }

    if (hash === '#/doctor/auth') return renderDoctorAuth();
    if (hash === '#/patient/auth') return renderPatientAuth();
    if (hash === '#/doctor/dashboard') return renderDoctorDashboard();
    if (hash === '#/doctor/profile') return renderDoctorProfile();
    if (hash === '#/patient/home') return renderPatientHome();
    if (hash === '#/patient/book') return renderPatientBook();
    if (hash === '#/patient/prescriptions') return renderPatientPrescriptions();
    if (hash === '#/patient/billing') return renderPatientBilling();

    // default
    return renderLanding();
  }

  window.addEventListener('hashchange', render);

  // -------------------------------------------
  // Landing screen
  // -------------------------------------------
  function renderLanding() {
    root.innerHTML = `
      <div class="app-shell">
        <div class="app-inner">
          <div class="app-topbar">
            <div class="app-logo-circle">DC</div>
            <div class="app-title-block">
              <h1 class="app-title">DoctorCare</h1>
              <div class="app-subtitle">Appointments • Prescriptions • Billing</div>
            </div>
          </div>

          <div class="app-content">

            <div class="landing-header">
              <div class="landing-title">Welcome to DoctorCare</div>
              <div class="landing-subtitle">
                Connect patients and doctors in one place. Secure, simple, and optimized for mobile.
              </div>
            </div>

            <div class="landing-hero">
              <div class="landing-hero-title">Your clinic in your pocket</div>
              <div class="landing-hero-text">
                Doctors can manage appointments, prescriptions, and billing. Patients can book visits, track prescriptions, and view bills.
              </div>
            </div>

            <div class="role-grid">
              <div class="role-card doctor">
                <div class="role-title">Doctor</div>
                <div class="role-text">
                  Login or register to manage your daily appointments, prescriptions, and billing.
                </div>
                <button class="btn btn-primary w-100" id="btnDoctorAuth">Doctor Login / Signup</button>
              </div>

              <div class="role-card patient">
                <div class="role-title">Patient</div>
                <div class="role-text">
                  Book appointments, view prescriptions, and keep your billing history in one place.
                </div>
                <button class="btn btn-ghost w-100" id="btnPatientAuth">Patient Login / Signup</button>
              </div>
            </div>
          </div>

          <div class="app-footer">
            DoctorCare PWA • Works offline for saved data
          </div>
        </div>
      </div>
    `;

    document.getElementById('btnDoctorAuth').onclick = () => {
      location.hash = '#/doctor/auth';
    };
    document.getElementById('btnPatientAuth').onclick = () => {
      location.hash = '#/patient/auth';
    };
  }

  // -------------------------------------------
  // Doctor Auth (Login / Signup)
  // -------------------------------------------
  function renderDoctorAuth() {
    root.innerHTML = `
      <div class="app-shell">
        <div class="app-inner">
          <div class="app-topbar">
            <div class="app-logo-circle">D</div>
            <div class="app-title-block">
              <h1 class="app-title">Doctor Login</h1>
              <div class="app-subtitle">Sign in or create a new doctor account</div>
            </div>
          </div>

          <div class="app-content">

            <div class="auth-toggle">
              <button id="docLoginTab" class="active">Login</button>
              <button id="docSignupTab">Signup</button>
            </div>

            <!-- LOGIN -->
            <div id="doctorLoginForm">
              <div class="card">
                <div class="section-title">Doctor Login</div>
                <div class="input-group">
                  <label class="input-label">Email</label>
                  <input type="email" id="docLoginEmail" class="input-control" />
                </div>
                <div class="input-group">
                  <label class="input-label">Password</label>
                  <input type="password" id="docLoginPassword" class="input-control" />
                </div>
                <button class="btn btn-primary w-100 mt-12" id="btnDoctorLogin">Login</button>
                <button class="btn btn-ghost w-100 mt-8" id="btnBackFromDocLogin">Back</button>
              </div>
            </div>

            <!-- SIGNUP -->
            <div id="doctorSignupForm" style="display:none;">
              <div class="card">
                <div class="section-title">Doctor Signup</div>

                <div class="input-group">
                  <label class="input-label">Full Name</label>
                  <input type="text" id="docSignupName" class="input-control" />
                </div>
                <div class="input-group">
                  <label class="input-label">Email</label>
                  <input type="email" id="docSignupEmail" class="input-control" />
                </div>
                <div class="input-group">
                  <label class="input-label">Password</label>
                  <input type="password" id="docSignupPassword" class="input-control" />
                </div>
                <div class="input-group">
                  <label class="input-label">Mobile</label>
                  <input type="tel" id="docSignupMobile" class="input-control" />
                </div>
                <div class="input-group">
                  <label class="input-label">Specialization</label>
                  <input type="text" id="docSignupSpecialization" class="input-control" />
                </div>
                <div class="input-group">
                  <label class="input-label">Degree</label>
                  <input type="text" id="docSignupDegree" class="input-control" />
                </div>
                <div class="input-group">
                  <label class="input-label">Clinic Address</label>
                  <input type="text" id="docSignupClinic" class="input-control" />
                </div>
                <div class="input-group">
                  <label class="input-label">Availability Time</label>
                  <input type="text" id="docSignupAvailability" class="input-control" placeholder="e.g., 10:00–13:00, 17:00–21:00" />
                </div>
                <div class="input-group">
                  <label class="input-label">Profile Image (URL or leave blank)</label>
                  <input type="text" id="docSignupProfileImage" class="input-control" />
                </div>

                <button class="btn btn-primary w-100 mt-12" id="btnDoctorSignup">Create Account</button>
                <button class="btn btn-ghost w-100 mt-8" id="btnBackFromDocSignup">Back</button>
              </div>
            </div>

          </div>

          <div class="app-footer">
            DoctorCare • Doctor access
          </div>
        </div>
      </div>
    `;

    const loginTab = document.getElementById('docLoginTab');
    const signupTab = document.getElementById('docSignupTab');
    const loginForm = document.getElementById('doctorLoginForm');
    const signupForm = document.getElementById('doctorSignupForm');

    loginTab.onclick = () => {
      loginTab.classList.add('active');
      signupTab.classList.remove('active');
      loginForm.style.display = 'block';
      signupForm.style.display = 'none';
    };

    signupTab.onclick = () => {
      signupTab.classList.add('active');
      loginTab.classList.remove('active');
      loginForm.style.display = 'none';
      signupForm.style.display = 'block';
    };

    document.getElementById('btnBackFromDocLogin').onclick =
      document.getElementById('btnBackFromDocSignup').onclick = () => {
        location.hash = '#/';
      };

    document.getElementById('btnDoctorSignup').onclick = () => {
      const db = loadDB();

      const name = document.getElementById('docSignupName').value.trim();
      const email = document.getElementById('docSignupEmail').value.trim().toLowerCase();
      const password = document.getElementById('docSignupPassword').value;
      const mobile = document.getElementById('docSignupMobile').value.trim();
      const specialization = document.getElementById('docSignupSpecialization').value.trim();
      const degree = document.getElementById('docSignupDegree').value.trim();
      const clinic = document.getElementById('docSignupClinic').value.trim();
      const availability = document.getElementById('docSignupAvailability').value.trim();
      const profileImage = document.getElementById('docSignupProfileImage').value.trim();

      if (!name || !email || !password) {
        alert('Please fill name, email, and password.');
        return;
      }

      if (db.doctors.some(d => d.email === email)) {
        alert('A doctor with this email already exists.');
        return;
      }

      const doc = {
        id: uid(),
        name,
        email,
        password, // NOTE: plain text for demo only
        mobile,
        specialization,
        degree,
        clinicAddress: clinic,
        availabilityTime: availability,
        profileImage
      };

      db.doctors.push(doc);
      saveDB(db);

      // Auto login
      saveSession({ role: 'doctor', userId: doc.id });
      location.hash = '#/doctor/dashboard';
    };

    document.getElementById('btnDoctorLogin').onclick = () => {
      const db = loadDB();
      const email = document.getElementById('docLoginEmail').value.trim().toLowerCase();
      const password = document.getElementById('docLoginPassword').value;

      const doc = db.doctors.find(d => d.email === email && d.password === password);
      if (!doc) {
        alert('Invalid credentials.');
        return;
      }

      saveSession({ role: 'doctor', userId: doc.id });
      location.hash = '#/doctor/dashboard';
    };
  }

  // -------------------------------------------
  // Patient Auth (Login / Signup)
  // -------------------------------------------
  function renderPatientAuth() {
    root.innerHTML = `
      <div class="app-shell">
        <div class="app-inner">
          <div class="app-topbar">
            <div class="app-logo-circle">P</div>
            <div class="app-title-block">
              <h1 class="app-title">Patient Login</h1>
              <div class="app-subtitle">Sign in or create a new patient account</div>
            </div>
          </div>

          <div class="app-content">

            <div class="auth-toggle">
              <button id="patLoginTab" class="active">Login</button>
              <button id="patSignupTab">Signup</button>
            </div>

            <!-- LOGIN -->
            <div id="patientLoginForm">
              <div class="card">
                <div class="section-title">Patient Login</div>
                <div class="input-group">
                  <label class="input-label">Email</label>
                  <input type="email" id="patLoginEmail" class="input-control" />
                </div>
                <div class="input-group">
                  <label class="input-label">Password</label>
                  <input type="password" id="patLoginPassword" class="input-control" />
                </div>
                <button class="btn btn-primary w-100 mt-12" id="btnPatientLogin">Login</button>
                <button class="btn btn-ghost w-100 mt-8" id="btnBackFromPatLogin">Back</button>
              </div>
            </div>

            <!-- SIGNUP -->
            <div id="patientSignupForm" style="display:none;">
              <div class="card">
                <div class="section-title">Patient Signup</div>

                <div class="input-group">
                  <label class="input-label">Full Name</label>
                  <input type="text" id="patSignupName" class="input-control" />
                </div>
                <div class="input-group">
                  <label class="input-label">Email</label>
                  <input type="email" id="patSignupEmail" class="input-control" />
                </div>
                <div class="input-group">
                  <label class="input-label">Password</label>
                  <input type="password" id="patSignupPassword" class="input-control" />
                </div>

                <button class="btn btn-primary w-100 mt-12" id="btnPatientSignup">Create Account</button>
                <button class="btn btn-ghost w-100 mt-8" id="btnBackFromPatSignup">Back</button>
              </div>
            </div>

          </div>

          <div class="app-footer">
            DoctorCare • Patient access
          </div>
        </div>
      </div>
    `;

    const loginTab = document.getElementById('patLoginTab');
    const signupTab = document.getElementById('patSignupTab');
    const loginForm = document.getElementById('patientLoginForm');
    const signupForm = document.getElementById('patientSignupForm');

    loginTab.onclick = () => {
      loginTab.classList.add('active');
      signupTab.classList.remove('active');
      loginForm.style.display = 'block';
      signupForm.style.display = 'none';
    };

    signupTab.onclick = () => {
      signupTab.classList.add('active');
      loginTab.classList.remove('active');
      loginForm.style.display = 'none';
      signupForm.style.display = 'block';
    };

    document.getElementById('btnBackFromPatLogin').onclick =
      document.getElementById('btnBackFromPatSignup').onclick = () => {
        location.hash = '#/';
      };

    document.getElementById('btnPatientSignup').onclick = () => {
      const db = loadDB();

      const name = document.getElementById('patSignupName').value.trim();
      const email = document.getElementById('patSignupEmail').value.trim().toLowerCase();
      const password = document.getElementById('patSignupPassword').value;

      if (!name || !email || !password) {
        alert('Please fill name, email, and password.');
        return;
      }

      if (db.patients.some(p => p.email === email)) {
        alert('A patient with this email already exists.');
        return;
      }

      const patient = {
        id: uid(),
        name,
        email,
        password
      };

      db.patients.push(patient);
      saveDB(db);

      // Auto login
      saveSession({ role: 'patient', userId: patient.id });
      location.hash = '#/patient/home';
    };

    document.getElementById('btnPatientLogin').onclick = () => {
      const db = loadDB();
      const email = document.getElementById('patLoginEmail').value.trim().toLowerCase();
      const password = document.getElementById('patLoginPassword').value;

      const patient = db.patients.find(p => p.email === email && p.password === password);
      if (!patient) {
        alert('Invalid credentials.');
        return;
      }

      saveSession({ role: 'patient', userId: patient.id });
      location.hash = '#/patient/home';
    };
  }

  // -------------------------------------------
  // Doctor Dashboard
  // -------------------------------------------
  function renderDoctorDashboard() {
    const session = loadSession();
    if (!session || session.role !== 'doctor') {
      location.hash = '#/doctor/auth';
      return;
    }

    const db = loadDB();
    const doctor = db.doctors.find(d => d.id === session.userId);
    if (!doctor) {
      logout();
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    const todaysAppointments = db.appointments.filter(a => a.doctorId === doctor.id && a.date === today);
    const patientMap = new Map(db.patients.map(p => [p.id, p]));

    root.innerHTML = `
      <div class="app-shell">
        <div class="app-inner">
          <div class="app-topbar">
            <div class="app-logo-circle">D</div>
            <div class="app-title-block">
              <h1 class="app-title">Doctor Dashboard</h1>
              <div class="app-subtitle">${doctor.name || 'Doctor'} • ${doctor.specialization || 'Specialist'}</div>
            </div>
            <button class="btn btn-ghost" id="btnDoctorLogout">Logout</button>
          </div>

          <div class="app-content">

            <div class="card">
              <div class="flex-between">
                <div>
                  <div class="section-title">Today’s Appointments</div>
                  <div class="text-xs text-muted">${today}</div>
                </div>
                <span class="badge badge-muted">${todaysAppointments.length} booked</span>
              </div>

              <div class="mt-12" id="doctorAppointmentsList">
                ${
                  todaysAppointments.length === 0
                    ? '<div class="text-sm text-muted">No appointments for today.</div>'
                    : todaysAppointments.map(a => {
                        const patient = patientMap.get(a.patientId);
                        return `
                          <div class="appointment-item">
                            <div class="appointment-top-row">
                              <div>${patient?.name || 'Unknown patient'}</div>
                              <div>${a.timeSlot}</div>
                            </div>
                            <div class="appointment-sub-row">
                              <div>Status: ${a.status}</div>
                              <div>
                                <button class="btn btn-ghost text-xs" data-prescribe="${a.id}">Prescription</button>
                                <button class="btn btn-ghost text-xs" data-bill="${a.id}">Bill</button>
                              </div>
                            </div>
                          </div>
                        `;
                      }).join('')
                }
              </div>
            </div>

            <div class="card mt-16">
              <div class="section-title">Profile</div>
              <div class="text-sm text-muted">Keep your DoctorCare profile up to date.</div>
              <div class="mt-12 flex-gap-8">
                <button class="btn btn-primary" id="btnDoctorEditProfile">Edit Profile</button>
              </div>
            </div>

          </div>

          <div class="app-footer">
            DoctorCare • Doctor side
          </div>
        </div>
      </div>
    `;

    document.getElementById('btnDoctorLogout').onclick = () => logout();
    document.getElementById('btnDoctorEditProfile').onclick = () => {
      location.hash = '#/doctor/profile';
    };

    const listEl = document.getElementById('doctorAppointmentsList');
    listEl.addEventListener('click', (e) => {
      const prescribeId = e.target.getAttribute('data-prescribe');
      const billId = e.target.getAttribute('data-bill');

      if (prescribeId) {
        openPrescriptionModal(prescribeId);
      }
      if (billId) {
        openBillingModal(billId);
      }
    });
  }

  // -------------------------------------------
  // Doctor Profile Edit
  // -------------------------------------------
  function renderDoctorProfile() {
    const session = loadSession();
    if (!session || session.role !== 'doctor') {
      location.hash = '#/doctor/auth';
      return;
    }

    const db = loadDB();
    const doctor = db.doctors.find(d => d.id === session.userId);
    if (!doctor) {
      logout();
      return;
    }

    root.innerHTML = `
      <div class="app-shell">
        <div class="app-inner">
          <div class="app-topbar">
            <div class="app-logo-circle">D</div>
            <div class="app-title-block">
              <h1 class="app-title">Doctor Profile</h1>
              <div class="app-subtitle">Update your DoctorCare details</div>
            </div>
          </div>

          <div class="app-content">
            <div class="card">
              <div class="section-title">Profile Details</div>

              <div class="input-group">
                <label class="input-label">Full Name</label>
                <input type="text" id="docName" class="input-control" value="${doctor.name || ''}" />
              </div>
              <div class="input-group">
                <label class="input-label">Email</label>
                <input type="email" id="docEmail" class="input-control" value="${doctor.email || ''}" />
              </div>
              <div class="input-group">
                <label class="input-label">Mobile</label>
                <input type="tel" id="docMobile" class="input-control" value="${doctor.mobile || ''}" />
              </div>
              <div class="input-group">
                <label class="input-label">Specialization</label>
                <input type="text" id="docSpec" class="input-control" value="${doctor.specialization || ''}" />
              </div>
              <div class="input-group">
                <label class="input-label">Degree</label>
                <input type="text" id="docDegree" class="input-control" value="${doctor.degree || ''}" />
              </div>
              <div class="input-group">
                <label class="input-label">Clinic Address</label>
                <input type="text" id="docClinic" class="input-control" value="${doctor.clinicAddress || ''}" />
              </div>
              <div class="input-group">
                <label class="input-label">Availability Time</label>
                <input type="text" id="docAvail" class="input-control" value="${doctor.availabilityTime || ''}" />
              </div>
              <div class="input-group">
                <label class="input-label">Profile Image URL</label>
                <input type="text" id="docImg" class="input-control" value="${doctor.profileImage || ''}" />
              </div>

              <button class="btn btn-primary w-100 mt-12" id="btnSaveDocProfile">Save</button>
              <button class="btn btn-ghost w-100 mt-8" id="btnBackDocProfile">Back</button>
            </div>
          </div>

          <div class="app-footer">
            DoctorCare • Profile
          </div>
        </div>
      </div>
    `;

    document.getElementById('btnBackDocProfile').onclick = () => {
      location.hash = '#/doctor/dashboard';
    };

    document.getElementById('btnSaveDocProfile').onclick = () => {
      const name = document.getElementById('docName').value.trim();
      const email = document.getElementById('docEmail').value.trim().toLowerCase();
      const mobile = document.getElementById('docMobile').value.trim();
      const specialization = document.getElementById('docSpec').value.trim();
      const degree = document.getElementById('docDegree').value.trim();
      const clinic = document.getElementById('docClinic').value.trim();
      const avail = document.getElementById('docAvail').value.trim();
      const img = document.getElementById('docImg').value.trim();

      if (!name || !email) {
        alert('Name and email cannot be empty.');
        return;
      }

      doctor.name = name;
      doctor.email = email;
      doctor.mobile = mobile;
      doctor.specialization = specialization;
      doctor.degree = degree;
      doctor.clinicAddress = clinic;
      doctor.availabilityTime = avail;
      doctor.profileImage = img;

      saveDB(db);
      alert('Profile updated.');
      location.hash = '#/doctor/dashboard';
    };
  }

  // -------------------------------------------
  // Patient Home (FIXED UI LAYOUT)
  // -------------------------------------------
  function renderPatientHome() {
    const session = loadSession();
    if (!session || session.role !== 'patient') {
      location.hash = '#/patient/auth';
      return;
    }

    const db = loadDB();
    const patient = db.patients.find(p => p.id === session.userId);
    if (!patient) {
      logout();
      return;
    }

    const upcomingAppointments = db.appointments.filter(a => a.patientId === patient.id);
    const upcomingCount = upcomingAppointments.length;
    const prescriptionCount = db.prescriptions.filter(p => p.patientId === patient.id).length;
    const billCount = db.bills.filter(b => b.patientId === patient.id).length;

    root.innerHTML = `
      <div class="app-shell">
        <div class="app-inner">
          <div class="app-topbar">
            <div class="app-logo-circle">P</div>
            <div class="app-title-block">
              <h1 class="app-title">Patient Home</h1>
              <div class="app-subtitle">Welcome back, ${patient.name || 'Patient'}</div>
            </div>
            <button class="btn btn-ghost" id="btnPatientLogout">Logout</button>
          </div>

          <div class="app-content">

            <!-- FIXED PATIENT HOME UI START -->

            <!-- Banner -->
            <div class="patient-banner">
              <div class="patient-banner-title">Welcome ${patient.name || ''}</div>
              <div class="patient-banner-subtitle">
                Book appointments, check prescriptions, and manage your medical bills — all in one place.
              </div>
            </div>

            <!-- Patient details section -->
            <div class="card patient-details-card">
              <div class="patient-details-title">Your Details</div>
              <div class="patient-details-row">
                <span>Email</span>
                <span>${patient.email}</span>
              </div>
              <div class="patient-details-row">
                <span>Upcoming visits</span>
                <span>${upcomingCount}</span>
              </div>
            </div>

            <!-- Four main cards -->
            <div class="patient-main-grid">
              <div class="patient-main-card">
                <div class="patient-main-card-title">Doctors Near Me</div>
                <div class="patient-main-card-sub">View available doctors and book slots.</div>
              </div>
              <div class="patient-main-card">
                <div class="patient-main-card-title">Appointments</div>
                <div class="patient-main-card-sub">You have ${upcomingCount} booked appointments.</div>
              </div>
              <div class="patient-main-card">
                <div class="patient-main-card-title">Prescriptions</div>
                <div class="patient-main-card-sub">${prescriptionCount} prescriptions saved.</div>
              </div>
              <div class="patient-main-card">
                <div class="patient-main-card-title">Billing Summary</div>
                <div class="patient-main-card-sub">${billCount} bills in your history.</div>
              </div>
            </div>

            <!-- Four buttons (DO NOT CHANGE CORE LAYOUT) -->
            <div class="patient-actions-row">
              <button class="btn btn-primary" id="btnBookAppointment">Book Appointment</button>
              <button class="btn btn-ghost" id="btnEditPatientProfile">Edit Profile</button>
              <button class="btn btn-ghost" id="btnViewPrescriptions">Prescriptions</button>
              <button class="btn btn-ghost" id="btnViewBilling">Billing</button>
            </div>

            <!-- FIXED PATIENT HOME UI END -->

          </div>

          <div class="app-footer">
            DoctorCare • Patient side
          </div>
        </div>
      </div>
    `;

    document.getElementById('btnPatientLogout').onclick = () => logout();

    document.getElementById('btnBookAppointment').onclick = () => {
      location.hash = '#/patient/book';
    };

    // For now Edit Profile = re-use signup fields (simple, local)
    document.getElementById('btnEditPatientProfile').onclick = () => {
      const newName = prompt('Update name:', patient.name || '');
      if (newName !== null) {
        patient.name = newName.trim();
        saveDB(db);
        renderPatientHome();
      }
    };

    document.getElementById('btnViewPrescriptions').onclick = () => {
      location.hash = '#/patient/prescriptions';
    };

    document.getElementById('btnViewBilling').onclick = () => {
      location.hash = '#/patient/billing';
    };
  }

  // -------------------------------------------
  // Patient — Book Appointment
  // -------------------------------------------
  function renderPatientBook() {
    const session = loadSession();
    if (!session || session.role !== 'patient') {
      location.hash = '#/patient/auth';
      return;
    }

    const db = loadDB();
    const patient = db.patients.find(p => p.id === session.userId);
    if (!patient) {
      logout();
      return;
    }

    if (db.doctors.length === 0) {
      alert('No doctors registered yet. Ask a doctor to sign up first.');
      location.hash = '#/patient/home';
      return;
    }

    const doctorOptions = db.doctors.map(d => `<option value="${d.id}">${d.name} (${d.specialization || 'Doctor'})</option>`).join('');

    root.innerHTML = `
      <div class="app-shell">
        <div class="app-inner">
          <div class="app-topbar">
            <div class="app-logo-circle">P</div>
            <div class="app-title-block">
              <h1 class="app-title">Book Appointment</h1>
              <div class="app-subtitle">${patient.name || 'Patient'}</div>
            </div>
          </div>

          <div class="app-content">
            <div class="card">
              <div class="section-title">Choose doctor & time</div>

              <div class="input-group">
                <label class="input-label">Doctor</label>
                <select id="bookDoctor" class="select-control">
                  ${doctorOptions}
                </select>
              </div>

              <div class="input-group">
                <label class="input-label">Date</label>
                <input type="date" id="bookDate" class="input-control" />
              </div>

              <div class="input-group">
                <label class="input-label">Preferred Time Slot</label>
                <select id="bookTime" class="select-control">
                  <option value="">Select slot</option>
                  <option>10:00–10:30</option>
                  <option>10:30–11:00</option>
                  <option>11:00–11:30</option>
                  <option>11:30–12:00</option>
                  <option>17:00–17:30</option>
                  <option>17:30–18:00</option>
                  <option>18:00–18:30</option>
                </select>
              </div>

              <button class="btn btn-primary w-100 mt-12" id="btnConfirmBooking">Confirm Booking</button>
              <button class="btn btn-ghost w-100 mt-8" id="btnBackFromBooking">Back</button>
            </div>
          </div>

          <div class="app-footer">
            DoctorCare • Appointment booking
          </div>
        </div>
      </div>
    `;

    document.getElementById('btnBackFromBooking').onclick = () => {
      location.hash = '#/patient/home';
    };

    document.getElementById('btnConfirmBooking').onclick = () => {
      const doctorId = document.getElementById('bookDoctor').value;
      const date = document.getElementById('bookDate').value;
      const timeSlot = document.getElementById('bookTime').value;

      if (!doctorId || !date || !timeSlot) {
        alert('Please select doctor, date, and time.');
        return;
      }

      // One appointment per slot per doctor
      const clash = db.appointments.find(a =>
        a.doctorId === doctorId &&
        a.date === date &&
        a.timeSlot === timeSlot
      );
      if (clash) {
        alert('This slot is already booked. Choose another time.');
        return;
      }

      const appt = {
        id: uid(),
        doctorId,
        patientId: patient.id,
        date,
        timeSlot,
        status: 'Booked'
      };
      db.appointments.push(appt);
      saveDB(db);

      alert('Appointment booked successfully.');
      location.hash = '#/patient/home';
    };
  }

  // -------------------------------------------
  // Patient — View Prescriptions
  // -------------------------------------------
  function renderPatientPrescriptions() {
    const session = loadSession();
    if (!session || session.role !== 'patient') {
      location.hash = '#/patient/auth';
      return;
    }

    const db = loadDB();
    const patient = db.patients.find(p => p.id === session.userId);
    if (!patient) {
      logout();
      return;
    }

    const prescs = db.prescriptions.filter(p => p.patientId === patient.id);
    const docMap = new Map(db.doctors.map(d => [d.id, d]));

    root.innerHTML = `
      <div class="app-shell">
        <div class="app-inner">
          <div class="app-topbar">
            <div class="app-logo-circle">Rx</div>
            <div class="app-title-block">
              <h1 class="app-title">Prescriptions</h1>
              <div class="app-subtitle">${patient.name || 'Patient'}</div>
            </div>
          </div>

          <div class="app-content">
            <div class="card">
              <div class="section-title">Your prescriptions</div>

              <div class="simple-list mt-12">
                ${
                  prescs.length === 0
                    ? '<div class="text-sm text-muted">No prescriptions yet.</div>'
                    : prescs.map(p => {
                        const doc = docMap.get(p.doctorId);
                        return `
                          <div class="simple-list-item">
                            <div class="flex-between">
                              <div class="text-sm"><strong>${doc?.name || 'Doctor'}</strong></div>
                              <div class="text-xs text-muted">${(p.createdAt || '').slice(0,10)}</div>
                            </div>
                            <div class="text-xs mt-8">${p.content.replace(/\n/g, '<br>')}</div>
                          </div>
                        `;
                      }).join('')
                }
              </div>

              <button class="btn btn-ghost w-100 mt-12" id="btnBackFromPresc">Back</button>
            </div>
          </div>

          <div class="app-footer">
            DoctorCare • Prescriptions
          </div>
        </div>
      </div>
    `;

    document.getElementById('btnBackFromPresc').onclick = () => {
      location.hash = '#/patient/home';
    };
  }

  // -------------------------------------------
  // Patient — Billing
  // -------------------------------------------
  function renderPatientBilling() {
    const session = loadSession();
    if (!session || session.role !== 'patient') {
      location.hash = '#/patient/auth';
      return;
    }

    const db = loadDB();
    const patient = db.patients.find(p => p.id === session.userId);
    if (!patient) {
      logout();
      return;
    }

    const bills = db.bills.filter(b => b.patientId === patient.id);
    const docMap = new Map(db.doctors.map(d => [d.id, d]));

    root.innerHTML = `
      <div class="app-shell">
        <div class="app-inner">
          <div class="app-topbar">
            <div class="app-logo-circle">₹</div>
            <div class="app-title-block">
              <h1 class="app-title">Billing Summary</h1>
              <div class="app-subtitle">${patient.name || 'Patient'}</div>
            </div>
          </div>

          <div class="app-content">
            <div class="card">
              <div class="section-title">Your bills</div>

              <div class="simple-list mt-12">
                ${
                  bills.length === 0
                    ? '<div class="text-sm text-muted">No bills yet.</div>'
                    : bills.map(b => {
                        const doc = docMap.get(b.doctorId);
                        return `
                          <div class="simple-list-item">
                            <div class="flex-between">
                              <div class="text-sm"><strong>${doc?.name || 'Doctor'}</strong></div>
                              <div class="text-xs text-muted">${(b.createdAt || '').slice(0,10)}</div>
                            </div>
                            <div class="flex-between mt-8">
                              <span class="text-sm">₹${b.amount}</span>
                              <span class="badge ${b.status === 'Paid' ? 'badge-success' : 'badge-muted'}">
                                ${b.status}
                              </span>
                            </div>
                          </div>
                        `;
                      }).join('')
                }
              </div>

              <button class="btn btn-ghost w-100 mt-12" id="btnBackFromBilling">Back</button>
            </div>
          </div>

          <div class="app-footer">
            DoctorCare • Billing
          </div>
        </div>
      </div>
    `;

    document.getElementById('btnBackFromBilling').onclick = () => {
      location.hash = '#/patient/home';
    };
  }

  // -------------------------------------------
  // Doctor: Prescription Modal (simple prompt-based)
  // -------------------------------------------
  function openPrescriptionModal(appointmentId) {
    const db = loadDB();
    const appt = db.appointments.find(a => a.id === appointmentId);
    if (!appt) return;

    const existing = db.prescriptions.find(p => p.appointmentId === appointmentId);
    const currentText = existing ? existing.content : '';

    const content = prompt('Enter prescription details:', currentText || '');
    if (content === null) return;

    if (existing) {
      existing.content = content;
      existing.createdAt = new Date().toISOString();
    } else {
      db.prescriptions.push({
        id: uid(),
        appointmentId,
        doctorId: appt.doctorId,
        patientId: appt.patientId,
        content,
        createdAt: new Date().toISOString()
      });
    }

    appt.status = 'Completed';
    saveDB(db);
    alert('Prescription saved.');
    renderDoctorDashboard();
  }

  // -------------------------------------------
  // Doctor: Billing Modal (simple prompt-based)
  // -------------------------------------------
  function openBillingModal(appointmentId) {
    const db = loadDB();
    const appt = db.appointments.find(a => a.id === appointmentId);
    if (!appt) return;

    const existing = db.bills.find(b => b.appointmentId === appointmentId);
    const currentAmount = existing ? existing.amount : '';

    const amount = prompt('Enter consultation fee (₹):', currentAmount || '');
    if (amount === null) return;

    const numeric = parseFloat(amount);
    if (isNaN(numeric) || numeric <= 0) {
      alert('Invalid amount.');
      return;
    }

    if (existing) {
      existing.amount = numeric;
      existing.status = 'Paid'; // For demo assume paid
      existing.createdAt = new Date().toISOString();
    } else {
      db.bills.push({
        id: uid(),
        appointmentId,
        doctorId: appt.doctorId,
        patientId: appt.patientId,
        amount: numeric,
        status: 'Paid', // For demo
        createdAt: new Date().toISOString()
      });
    }

    saveDB(db);
    alert('Bill saved (marked as Paid).');
    renderDoctorDashboard();
  }

  // -------------------------------------------
  // PWA: Service Worker registration
  // -------------------------------------------
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./service-worker.js').then(
        reg => console.log('[DoctorCare] SW registered', reg.scope),
        err => console.warn('[DoctorCare] SW registration failed', err)
      );
    });
  }

  // Kick off
  render();
})();

