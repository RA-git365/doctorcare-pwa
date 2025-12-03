// DoctorCare — Phase 2
// Landing + Auth + Doctor Profile + Doctor Dashboard (localStorage-based)

(function () {
  const root = document.getElementById('app');

  const DB_KEY = 'doctorcare_db_v2';
  const SESSION_KEY = 'doctorcare_session_v1';

  function defaultDB() {
    return {
      users: [],         // {id, role, name, email, mobile, password, doctorProfile?}
      appointments: [],  // will use in later phase
      prescriptions: [],
      bills: []
    };
  }

  function loadDB() {
    try {
      const raw = localStorage.getItem(DB_KEY);
      if (!raw) return defaultDB();
      return JSON.parse(raw);
    } catch {
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
    } catch {
      return null;
    }
  }

  function saveSession(sess) {
    if (!sess) localStorage.removeItem(SESSION_KEY);
    else localStorage.setItem(SESSION_KEY, JSON.stringify(sess));
  }

  function uid() {
    return 'id_' + Math.random().toString(36).slice(2) + Date.now().toString(36);
  }

  // Small helper to convert file -> base64 data URL for localStorage
  function fileToDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
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

    if (hash.startsWith('#/doctor/profile')) {
      renderDoctorProfile();
      return;
    }

    if (hash.startsWith('#/doctor/dashboard')) {
      renderDoctorDashboard();
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
            <img src="./images/doctorcare-hero.png" alt="DoctorCare" />
          </div>
        </div>

        <div class="landing-footer">DoctorCare</div>
      </div>
    `;

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

    document.getElementById('btnMainBook').onclick = () => {
      // for now: go to patient login, later direct to AI/manual booking
      location.hash = '#/patient/login';
    };
  }

  // =======================
  // STEP 2 — SIGN UP
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
      const exists = db.users.find(
        u => u.email === email || u.mobile === mobile
      );
      if (exists) {
        alert('An account already exists with this email or mobile number.');
        return;
      }

      const user = {
        id: uid(),
        role,
        name,
        email,
        mobile,
        password,
        doctorProfile: role === 'doctor' ? {
          profileComplete: false
        } : undefined
      };

      db.users.push(user);
      saveDB(db);
      saveSession({ userId: user.id, role: user.role });

      if (role === 'doctor') {
        alert('Doctor account created. Please complete your profile.');
        location.hash = '#/doctor/profile';
      } else {
        alert('Patient account created. (Patient dashboard will be added in next phase.)');
        location.hash = '#/patient/login';
      }
    };
  }

  // =======================
  // STEP 3 — LOGIN
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
      alert('Password reset will be connected to email/SMS in the online-server phase.');
    };

    document.getElementById('btnDoLogin').onclick = () => {
      const identifier = document.getElementById('liIdentifier').value.trim().toLowerCase();
      const password = document.getElementById('liPassword').value;
      if (!identifier || !password) {
        alert('Please fill both fields.');
        return;
      }

      const db = loadDB();
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
        // Check profile completion
        if (!user.doctorProfile || !user.doctorProfile.profileComplete) {
          alert('Please complete your doctor profile.');
          location.hash = '#/doctor/profile';
        } else {
          location.hash = '#/doctor/dashboard';
        }
      } else {
        alert('Logged in as patient. (Patient dashboard comes next phase.)');
        // later: location.hash = '#/patient/dashboard';
      }
    };
  }

  // =======================
  // Helper — Require Doctor Session
  // =======================
  function getCurrentDoctorOrRedirect() {
    const session = loadSession();
    if (!session || session.role !== 'doctor') {
      location.hash = '#/doctor/login';
      return null;
    }
    const db = loadDB();
    const doctor = db.users.find(u => u.id === session.userId && u.role === 'doctor');
    if (!doctor) {
      saveSession(null);
      location.hash = '#/doctor/login';
      return null;
    }
    return { db, doctor };
  }

  // =======================
  // Doctor Profile (MANDATORY)
  // =======================
  function renderDoctorProfile() {
    const ctx = getCurrentDoctorOrRedirect();
    if (!ctx) return;
    const { db, doctor } = ctx;

    const profile = doctor.doctorProfile || { profileComplete: false };

    root.innerHTML = `
      <div class="doc-profile-shell">
        <div class="doc-profile-card">
          <div class="doc-profile-header">
            <div>
              <div class="doc-profile-title">Complete Your Doctor Profile</div>
              <div class="doc-profile-warning">
                All fields with <span class="doc-required-mark">*</span> are required before patients can book appointments.
              </div>
            </div>
            <span class="doc-profile-badge">${profile.profileComplete ? 'Profile Complete' : 'Profile Incomplete'}</span>
          </div>

          <div class="doc-profile-grid">
            <!-- LEFT: text fields -->
            <div>
              <div class="doc-profile-section-title">Basic Details</div>

              <div class="doc-profile-field">
                <label class="doc-profile-label">Full Name <span class="doc-required-mark">*</span></label>
                <input type="text" id="dpName" class="doc-profile-input" value="${doctor.name || ''}" />
              </div>

              <div class="doc-profile-field">
                <label class="doc-profile-label">Email <span class="doc-required-mark">*</span></label>
                <input type="email" id="dpEmail" class="doc-profile-input" value="${doctor.email || ''}" />
              </div>

              <div class="doc-profile-field">
                <label class="doc-profile-label">Phone Number (visible to patients) <span class="doc-required-mark">*</span></label>
                <input type="tel" id="dpMobile" class="doc-profile-input" value="${doctor.mobile || ''}" />
              </div>

              <div class="doc-profile-field">
                <label class="doc-profile-label">Specialization <span class="doc-required-mark">*</span></label>
                <input type="text" id="dpSpec" class="doc-profile-input" value="${profile.specialization || ''}" placeholder="Cardiologist, Orthopedic, etc." />
              </div>

              <div class="doc-profile-field">
                <label class="doc-profile-label">Years of Experience <span class="doc-required-mark">*</span></label>
                <input type="number" id="dpExp" class="doc-profile-input" value="${profile.experienceYears || ''}" min="0" />
              </div>

              <div class="doc-profile-field">
                <label class="doc-profile-label">Consultation Fee (₹) <span class="doc-required-mark">*</span></label>
                <input type="number" id="dpFee" class="doc-profile-input" value="${profile.fee || ''}" min="0" />
              </div>

              <div class="doc-profile-field">
                <label class="doc-profile-label">Clinic Address <span class="doc-required-mark">*</span></label>
                <input type="text" id="dpAddress" class="doc-profile-input" value="${profile.clinicAddress || ''}" />
              </div>

              <div class="doc-profile-field">
                <label class="doc-profile-label">Location / Map Link <span class="doc-required-mark">*</span></label>
                <input type="text" id="dpLocation" class="doc-profile-input" value="${profile.location || ''}" placeholder="Google Maps URL or area name" />
              </div>

              <div class="doc-profile-field">
                <label class="doc-profile-label">Available Days & Time Slots <span class="doc-required-mark">*</span></label>
                <input type="text" id="dpAvailability" class="doc-profile-input" value="${profile.availability || ''}" placeholder="Mon–Sat, 10:00–13:00 & 17:00–21:00" />
              </div>

              <div class="doc-profile-field">
                <label class="doc-profile-label">About You</label>
                <textarea id="dpAbout" class="doc-profile-textarea" placeholder="Short introduction for patients...">${profile.about || ''}</textarea>
              </div>

              <div class="doc-profile-field">
                <label class="doc-profile-label">Services</label>
                <textarea id="dpServices" class="doc-profile-textarea" placeholder="e.g. General Consultation, Diabetes Management, ECG...">${profile.services || ''}</textarea>
              </div>
            </div>

            <!-- RIGHT: avatar + documents -->
            <div>
              <div class="doc-profile-section-title">Profile Image</div>
              <div class="doc-profile-field">
                <label class="doc-profile-label">Upload Profile Photo <span class="doc-required-mark">*</span></label>
                <input type="file" id="dpPhoto" accept="image/*" class="doc-file-input" />
                <div class="doc-upload-note">JPEG/PNG recommended. Used in both doctor and patient views.</div>
              </div>

              <div class="doc-profile-section-title" style="margin-top:12px;">Documents</div>

              <div class="doc-profile-field">
                <label class="doc-profile-label">Degree Certificate <span class="doc-required-mark">*</span></label>
                <input type="file" id="dpDegree" accept=".pdf,image/*" class="doc-file-input" />
                <div class="doc-upload-note">Required. Shows your qualification.</div>
              </div>

              <div class="doc-profile-field">
                <label class="doc-profile-label">Medical License <span class="doc-required-mark">*</span></label>
                <input type="file" id="dpLicense" accept=".pdf,image/*" class="doc-file-input" />
                <div class="doc-upload-note">Required. Shows registration with medical council.</div>
              </div>

              <div class="doc-profile-field">
                <label class="doc-profile-label">Experience Letters</label>
                <input type="file" id="dpExperienceDocs" multiple accept=".pdf,image/*" class="doc-file-input" />
                <div class="doc-upload-note">Optional. You can upload letters from hospitals/clinics.</div>
              </div>

              <div class="doc-profile-field">
                <label class="doc-profile-label">Additional Certificates</label>
                <input type="file" id="dpExtraCerts" multiple accept=".pdf,image/*" class="doc-file-input" />
                <div class="doc-upload-note">Optional. Workshops, fellowships, etc.</div>
              </div>
            </div>
          </div>

          <div class="doc-profile-actions">
            <button class="btn-doc-cancel" id="btnProfileBack">Back</button>
            <button class="btn-doc-save" id="btnProfileSave">Save & Continue</button>
          </div>
        </div>
      </div>
    `;

    document.getElementById('btnProfileBack').onclick = () => {
      // if incomplete, back to landing; else to dashboard
      if (!profile.profileComplete) {
        location.hash = '#/';
      } else {
        location.hash = '#/doctor/dashboard';
      }
    };

    document.getElementById('btnProfileSave').onclick = async () => {
      const name = document.getElementById('dpName').value.trim();
      const email = document.getElementById('dpEmail').value.trim().toLowerCase();
      const mobile = document.getElementById('dpMobile').value.trim();
      const spec = document.getElementById('dpSpec').value.trim();
      const expYears = document.getElementById('dpExp').value.trim();
      const fee = document.getElementById('dpFee').value.trim();
      const address = document.getElementById('dpAddress').value.trim();
      const locationField = document.getElementById('dpLocation').value.trim();
      const availability = document.getElementById('dpAvailability').value.trim();
      const about = document.getElementById('dpAbout').value.trim();
      const services = document.getElementById('dpServices').value.trim();

      if (!name || !email || !mobile || !spec || !expYears || !fee || !address || !locationField || !availability) {
        alert('Please fill all required fields.');
        return;
      }

      // Check unique email/mobile if changed
      const dbLatest = loadDB(); // re-load to be safe
      const conflict = dbLatest.users.find(
        u =>
          u.id !== doctor.id &&
          (u.email === email || u.mobile === mobile)
      );
      if (conflict) {
        alert('Email or mobile already used by another account.');
        return;
      }

      const photoFile = document.getElementById('dpPhoto').files[0];
      const degreeFile = document.getElementById('dpDegree').files[0];
      const licenseFile = document.getElementById('dpLicense').files[0];
      const expFiles = Array.from(document.getElementById('dpExperienceDocs').files || []);
      const extraFiles = Array.from(document.getElementById('dpExtraCerts').files || []);

      // For required docs: if none newly selected AND none existing -> invalid
      if (!photoFile && !profile.photoData) {
        alert('Please upload a profile photo.');
        return;
      }
      if (!degreeFile && !profile.degree) {
        alert('Please upload your degree certificate.');
        return;
      }
      if (!licenseFile && !profile.license) {
        alert('Please upload your medical license.');
        return;
      }

      // Convert new files to data URLs (local demo; later move to server)
      let photoData = profile.photoData || null;
      let degreeData = profile.degree || null;
      let licenseData = profile.license || null;
      let expDocs = profile.expDocs || [];
      let extraCerts = profile.extraCerts || [];

      try {
        if (photoFile) {
          photoData = await fileToDataURL(photoFile);
        }
        if (degreeFile) {
          degreeData = await fileToDataURL(degreeFile);
        }
        if (licenseFile) {
          licenseData = await fileToDataURL(licenseFile);
        }
        if (expFiles.length > 0) {
          expDocs = [];
          for (const f of expFiles) {
            const data = await fileToDataURL(f);
            expDocs.push({ name: f.name, data });
          }
        }
        if (extraFiles.length > 0) {
          extraCerts = [];
          for (const f of extraFiles) {
            const data = await fileToDataURL(f);
            extraCerts.push({ name: f.name, data });
          }
        }
      } catch (err) {
        console.error('File conversion error', err);
        alert('Error reading some files. Try again with smaller files.');
        return;
      }

      // Save back to doctor object in DB
      doctor.name = name;
      doctor.email = email;
      doctor.mobile = mobile;
      doctor.doctorProfile = {
        profileComplete: true,
        specialization: spec,
        experienceYears: expYears,
        fee,
        clinicAddress: address,
        location: locationField,
        availability,
        about,
        services,
        photoData,
        degree: degreeData,
        license: licenseData,
        expDocs,
        extraCerts
      };

      // Update DB and save
      const index = dbLatest.users.findIndex(u => u.id === doctor.id);
      dbLatest.users[index] = doctor;
      saveDB(dbLatest);

      alert('Profile saved successfully.');
      location.hash = '#/doctor/dashboard';
    };
  }

  // =======================
  // Doctor Dashboard (UI)
  // =======================
  function renderDoctorDashboard() {
    const ctx = getCurrentDoctorOrRedirect();
    if (!ctx) return;
    const { db, doctor } = ctx;
    const profile = doctor.doctorProfile;

    if (!profile || !profile.profileComplete) {
      alert('Please complete your profile first.');
      location.hash = '#/doctor/profile';
      return;
    }

    // Placeholder stats until we wire appointments/prescriptions in next phase
    const todayAppointments = db.appointments.filter(
      a => a.doctorId === doctor.id && a.date === new Date().toISOString().slice(0,10)
    );
    const totalPrescriptions = db.prescriptions.filter(p => p.doctorId === doctor.id);
    const totalBills = db.bills.filter(b => b.doctorId === doctor.id);

    root.innerHTML = `
      <div class="doc-layout">
        <!-- SIDEBAR -->
        <aside class="doc-sidebar">
          <div>
            <div class="doc-brand">
              <div class="doc-logo">DC</div>
              <div class="doc-brand-title">DoctorCare</div>
            </div>

            <nav class="doc-nav" id="docNav">
              <button class="doc-nav-item active" data-tab="dashboard"><span>🏠</span>Dashboard</button>
              <button class="doc-nav-item" data-tab="appointments"><span>📅</span>Appointments</button>
              <button class="doc-nav-item" data-tab="patients"><span>👥</span>Patients</button>
              <button class="doc-nav-item" data-tab="prescriptions"><span>💊</span>Prescriptions</button>
              <button class="doc-nav-item" data-tab="earnings"><span>💰</span>Earnings</button>
              <button class="doc-nav-item" data-tab="messages"><span>✉️</span>Messages</button>
              <button class="doc-nav-item" data-tab="settings"><span>⚙️</span>Settings</button>
              <button class="doc-nav-item" data-tab="notifications"><span>🔔</span>Notifications</button>
            </nav>
          </div>

          <div class="doc-sidebar-bottom">
            <button class="doc-logout-btn" id="btnDoctorLogout">Log Out</button>
          </div>
        </aside>

        <!-- MAIN -->
        <main class="doc-main">
          <div class="doc-main-header">
            <div>
              <div class="doc-main-title">Welcome, ${doctor.name.split(' ')[0] || 'Doctor'}</div>
              <div class="text-sm text-muted">Dashboard overview</div>
            </div>
            <div class="doc-top-right">
              <div class="doc-avatar">
                ${
                  profile.photoData
                    ? `<img src="${profile.photoData}" alt="Profile" />`
                    : (doctor.name ? doctor.name[0].toUpperCase() : 'D')
                }
              </div>
              <button class="doc-profile-btn" id="btnGoProfile">My Profile</button>
            </div>
          </div>

          <!-- DASHBOARD CONTENT -->
          <section id="docDashboardContent">
            <div class="doc-card" style="margin-top:8px;">
              <div class="doc-section-title">Welcome, Dr. ${doctor.name || ''}</div>
              <div class="doc-summary">
                <div class="doc-card">
                  <div class="doc-card-title">Today’s Appointments</div>
                  <div class="doc-card-value">${todayAppointments.length}</div>
                </div>
                <div class="doc-card">
                  <div class="doc-card-title">Total Prescriptions</div>
                  <div class="doc-card-value">${totalPrescriptions.length}</div>
                </div>
                <div class="doc-card">
                  <div class="doc-card-title">Bills Generated</div>
                  <div class="doc-card-value">${totalBills.length}</div>
                </div>
              </div>
            </div>

            <div class="doc-grid" style="margin-top:16px;">
              <!-- LEFT COLUMN -->
              <div>
                <div class="doc-card">
                  <div class="doc-section-title">Upcoming Appointments</div>
                  <div class="doc-upcoming-list" id="docUpcomingList">
                    ${
                      todayAppointments.length === 0
                        ? '<div class="text-sm text-muted">No appointments booked yet.</div>'
                        : todayAppointments.map(a => `
                            <div class="doc-upcoming-item">
                              <div>
                                <div>${a.patientName || 'Patient'}</div>
                                <div class="doc-upcoming-sub">${a.reason || 'Consultation'}</div>
                              </div>
                              <div>${a.time || ''}</div>
                            </div>
                          `).join('')
                    }
                  </div>
                </div>

                <div class="doc-card" style="margin-top:12px;">
                  <div class="doc-section-title">Quick Actions</div>
                  <div class="doc-quick-grid">
                    <button class="doc-quick-btn" data-action="addPatient">
                      <span>➕</span>Add Patient
                    </button>
                    <button class="doc-quick-btn" data-action="createAppt">
                      <span>📅</span>Create Appointment
                    </button>
                    <button class="doc-quick-btn" data-action="prescribe">
                      <span>💊</span>Prescribe
                    </button>
                    <button class="doc-quick-btn" data-action="viewSchedule">
                      <span>🗓</span>View Schedule
                    </button>
                  </div>
                </div>
              </div>

              <!-- RIGHT COLUMN -->
              <div>
                <div class="doc-card-small">
                  <div class="doc-section-title">Messages</div>
                  <div class="doc-list">
                    <div class="doc-list-item">
                      <span>Inbox is empty.</span>
                      <span class="text-xs text-muted">–</span>
                    </div>
                  </div>
                </div>

                <div class="doc-card-small">
                  <div class="doc-section-title">Earnings Snapshot</div>
                  <div class="text-sm text-muted">Detailed earnings will be added in the billing phase.</div>
                </div>
              </div>
            </div>
          </section>

          <!-- Placeholder containers for other tabs (Appointments, etc.) to be filled later -->
          <section id="docTabPlaceholder" style="display:none;">
            <div class="doc-card">
              <div class="doc-section-title" id="docTabTitle"></div>
              <div class="text-sm text-muted">This section will be implemented in the next phase.</div>
            </div>
          </section>
        </main>
      </div>
    `;

    document.getElementById('btnGoProfile').onclick = () => {
      location.hash = '#/doctor/profile';
    };

    document.getElementById('btnDoctorLogout').onclick = () => {
      // When doctor logs out, patients should not be able to book → we’ll enforce in booking logic later
      saveSession(null);
      alert('Logged out. Patients cannot book appointments while you are offline (will be enforced in booking phase).');
      location.hash = '#/';
    };

    // Sidebar tab navigation (show placeholder for now except dashboard)
    const nav = document.getElementById('docNav');
    const dashboardSection = document.getElementById('docDashboardContent');
    const tabPlaceholder = document.getElementById('docTabPlaceholder');
    const tabTitle = document.getElementById('docTabTitle');

    nav.addEventListener('click', (e) => {
      const btn = e.target.closest('.doc-nav-item');
      if (!btn) return;
      const tab = btn.getAttribute('data-tab');

      // Active style
      nav.querySelectorAll('.doc-nav-item').forEach(el => el.classList.remove('active'));
      btn.classList.add('active');

      if (tab === 'dashboard') {
        dashboardSection.style.display = 'block';
        tabPlaceholder.style.display = 'none';
      } else {
        dashboardSection.style.display = 'none';
        tabPlaceholder.style.display = 'block';
        tabTitle.textContent = tab.charAt(0).toUpperCase() + tab.slice(1);
      }
    });

    // Quick actions (for now just show info)
    document.querySelectorAll('.doc-quick-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const action = btn.getAttribute('data-action');
        alert(`"${action}" flow will be implemented in upcoming phases.`);
      });
    });
  }

  // Kick off
  handleRoute();
  // =======================
// PATIENT PROFILE & DASHBOARD
// =======================

function getCurrentPatientOrRedirect() {
  const session = loadSession();
  if (!session || session.role !== 'patient') {
    location.hash = '#/patient/login';
    return null;
  }
  const db = loadDB();
  const patient = db.users.find(u => u.id === session.userId);
  return { db, patient };
}

function renderPatientDashboard() {
  const ctx = getCurrentPatientOrRedirect();
  if (!ctx) return;
  const { patient } = ctx;

  // Require profile completion later (Phase 4 update)
  
  root.innerHTML = `
  <div class="patient-layout">
    
    <div class="patient-top">
      <div>
        <div class="patient-name">Hi, ${patient.name?.split(" ")[0]}</div>
        <div class="text-sm text-muted">Welcome back</div>
      </div>
      <div class="patient-avatar">${patient.photoData ? `<img src="${patient.photoData}" width="100%">` : patient.name[0]}</div>
    </div>

    <div class="patient-cards-grid">
      <div class="patient-card" id="cardDoctors">
        <div class="patient-card-title">Doctors Near Me</div>
        <div class="patient-card-sub">Find specialists</div>
      </div>

      <div class="patient-card" id="cardAppointments">
        <div class="patient-card-title">Appointments</div>
        <div class="patient-card-sub">View or reschedule</div>
      </div>

      <div class="patient-card" id="cardPrescriptions">
        <div class="patient-card-title">Prescriptions</div>
        <div class="patient-card-sub">Your medical history</div>
      </div>

      <div class="patient-card" id="cardBilling">
        <div class="patient-card-title">Billing Summary</div>
        <div class="patient-card-sub">Payments & receipts</div>
      </div>
    </div>

    <div class="patient-btn-row">
      <button class="btn-big" id="btnBook">Book Appointment</button>
      <button class="btn-big" id="btnProfile">Edit Profile</button>
    </div>

  </div>
  `;

  document.getElementById("btnBook").onclick = () => renderDoctorSelection();
}


// ===========================
// STEP: Doctor Selection Screen
// ===========================

function renderDoctorSelection() {
  const { db } = getCurrentPatientOrRedirect();
  const doctors = db.users.filter(u => u.role === 'doctor' && u.doctorProfile?.profileComplete);

  root.innerHTML = `
    <div class="patient-layout">
      <h2>Select Doctor</h2>
      <div style="display:flex;flex-direction:column;gap:10px;">
      ${
        doctors.map(d=>`
        <div class="patient-card" data-id="${d.id}">
          <div class="patient-card-title">${d.name} — ${d.doctorProfile.specialization}</div>
          <div class="patient-card-sub">Fee: ₹${d.doctorProfile.fee}</div>
          <div class="patient-card-sub">📞 ${d.mobile}</div>
        </div>
        `).join('')
      }
      </div>
    </div>
  `;

  document.querySelectorAll('.patient-card').forEach(card=>{
    card.onclick = ()=>{
      const id = card.getAttribute("data-id");
      renderIOSBooking(id);
    }
  });
}


// ===========================
// STEP: iOS Booking Modal
// ===========================

function renderIOSBooking(doctorId) {
  const ctx = getCurrentPatientOrRedirect();
  if (!ctx) return;
  const { db, patient } = ctx;
  const doctor = db.users.find(u => u.id === doctorId);

  // Generate next 7 days
  const today = new Date();
  const dates = [];
  for(let i=0;i<7;i++){
    const d = new Date(today);
    d.setDate(today.getDate()+i);
    dates.push(d.toISOString().slice(0,10));
  }

  // Generate time slots based on doctor's availability rules
  const duration = parseInt(doctor.doctorProfile.slotDuration || 15);
  const fullRange = [];

  // Simple demo: assume availability time is "9:00-17:00"
  // Real parsing later
  let start = 9 * 60; 
  let end = 17 * 60;

  for(let t=start; t<end; t+=duration){
    const h = String(Math.floor(t/60)).padStart(2,'0');
    const m = String(t%60).padStart(2,'0');
    fullRange.push(`${h}:${m}`);
  }

  // Remove booked slot
  const booked = db.appointments.filter(a=>a.doctorId===doctorId).map(a=>a.time);
  const availableSlots = fullRange.filter(t=>!booked.includes(t));

  root.innerHTML = `
  <div class="patient-layout">
    <h2>Choose Date & Time</h2>
    <button class="btn-big" id="openPicker">📅 Select Slot</button>
  </div>

  <div class="ios-modal-bg" id="pickerModal" style="display:none;">
    <div class="ios-picker">

      <div class="ios-wheel">
        <select id="datePicker">
          ${dates.map(d=>`<option>${d}</option>`).join('')}
        </select>
      </div>

      <div class="ios-wheel">
        <select id="timePicker">
          ${availableSlots.length 
            ? availableSlots.map(t=>`<option>${t}</option>`).join('')
            : `<option>No slots</option>`}
        </select>
      </div>

      <div class="ios-picker-actions">
        <button class="btn-picker btn-cancel" id="cancelPicker">Cancel</button>
        <button class="btn-picker btn-confirm" id="confirmPicker">Confirm</button>
      </div>
    </div>
  </div>
  `;

  document.getElementById("openPicker").onclick = ()=>{
    document.getElementById("pickerModal").style.display="flex";
  };

  document.getElementById("cancelPicker").onclick = ()=>{
    document.getElementById("pickerModal").style.display="none";
  };

  document.getElementById("confirmPicker").onclick = ()=>{
    const date = document.getElementById("datePicker").value;
    const time = document.getElementById("timePicker").value;

    db.appointments.push({
      id: uid(),
      doctorId,
      patientId: patient.id,
      date,
      time,
      status: "confirmed"
    });

    saveDB(db);

    // Notification for doctor
    if (!db.notifications) db.notifications=[];
    db.notifications.push({
      doctorId,
      message:`New appointment booked by ${patient.name} on ${date} at ${time}`,
      timestamp:Date.now(),
      read:false
    });
    saveDB(db);

    alert("Appointment confirmed!");

    renderPatientDashboard();
  };
} 
  // ======================================================
// PHASE 4 — PRESCRIPTION BUILDER (Compact Card Layout)
// ======================================================

function renderPrescription(appointmentId) {
  const { db } = getCurrentDoctorOrRedirect();
  const appointment = db.appointments.find(a => a.id === appointmentId);
  const patient = db.users.find(u => u.id === appointment.patientId);

  // Create object if not exists
  if (!appointment.prescription) {
    appointment.prescription = {
      diagnosis: "",
      symptoms: "",
      medicines: [],
      advice: "",
      notes: ""
    };
    saveDB(db);
  }

  const p = appointment.prescription;

  root.innerHTML = `
    <div class="app-content">

      <h2 class="section-title">Prescription for ${patient.name}</h2>

      <div class="card">
        <label class="input-label">Diagnosis</label>
        <input class="input-control" id="diagInput" value="${p.diagnosis}">
      </div>

      <div class="card">
        <label class="input-label">Symptoms</label>
        <textarea class="textarea-control" id="symptomInput">${p.symptoms}</textarea>
      </div>

      <div class="card">
        <label class="input-label">Medicines</label>

        <div id="medList">
          ${
            p.medicines.length
            ? p.medicines.map((m,i)=>`
              <div class="simple-list-item" style="display:flex;justify-content:space-between;align-items:center;">
                <span>${m.name} — ${m.dose} — ${m.frequency} — ${m.days} days</span>
                <button class="btn btn-danger" onclick="removeMedicine('${appointmentId}',${i})">✕</button>
              </div>
            `).join('')
            : `<p class="text-muted">No medicines added yet</p>`
          }
        </div>

        <button class="btn btn-primary mt-12" onclick="renderAddMedicine('${appointmentId}')">+ Add Medicine</button>
      </div>

      <div class="card">
        <label class="input-label">Lifestyle Advice</label>
        <textarea class="textarea-control" id="adviceInput">${p.advice}</textarea>
      </div>

      <div class="card">
        <label class="input-label">Additional Notes (Voice Supported Soon)</label>
        <textarea class="textarea-control" id="notesInput">${p.notes}</textarea>
        <button class="btn-ghost mt-8">🎤 Voice Dictation (Coming Soon)</button>
      </div>

      <button class="btn-primary w-100 mt-16" onclick="savePrescription('${appointmentId}')">Save & Continue ➜ Billing</button>

      <button class="btn-ghost w-100 mt-8" onclick="renderDoctorDashboard()">Cancel</button>
    </div>
  `;
}


// ======================================================
// ADD / REMOVE MEDICINE HANDLERS
// ======================================================

function renderAddMedicine(appointmentId) {
  root.innerHTML = `
    <div class="app-content">
      <h2>Add Medicine</h2>

      <div class="card">
        <label class="input-label">Medicine Name</label>
        <input class="input-control" id="medName">
      </div>

      <div class="card">
        <label class="input-label">Dose</label>
        <input class="input-control" id="medDose" placeholder="Ex: 500mg">
      </div>

      <div class="card">
        <label class="input-label">Frequency</label>
        <input class="input-control" id="medFrequency" placeholder="Ex: 1-0-1">
      </div>

      <div class="card">
        <label class="input-label">Days</label>
        <input class="input-control" id="medDays" placeholder="Ex: 5">
      </div>

      <div class="card">
        <label class="input-label">Notes (Optional)</label>
        <textarea class="textarea-control" id="medNotes"></textarea>
      </div>

      <button class="btn-primary w-100" onclick="addMedicine('${appointmentId}')">➕ Add</button>
      <button class="btn-ghost w-100 mt-8" onclick="renderPrescription('${appointmentId}')">Back</button>
    </div>
  `;
}

function addMedicine(appointmentId) {
  const { db } = getCurrentDoctorOrRedirect();
  const appointment = db.appointments.find(a => a.id === appointmentId);

  const med = {
    name: document.getElementById("medName").value.trim(),
    dose: document.getElementById("medDose").value.trim(),
    frequency: document.getElementById("medFrequency").value.trim(),
    days: document.getElementById("medDays").value.trim(),
    notes: document.getElementById("medNotes").value.trim(),
  };

  if (!med.name || !med.dose) return alert("Medicine name and dose are required.");

  appointment.prescription.medicines.push(med);
  saveDB(db);

  renderPrescription(appointmentId);
}

function removeMedicine(appointmentId, index) {
  const { db } = getCurrentDoctorOrRedirect();
  const appointment = db.appointments.find(a => a.id === appointmentId);
  appointment.prescription.medicines.splice(index,1);
  saveDB(db);
  renderPrescription(appointmentId);
}


// ======================================================
// SAVE PRESCRIPTION & MOVE TO BILLING
// ======================================================

function savePrescription(appointmentId) {
  const { db } = getCurrentDoctorOrRedirect();
  const appointment = db.appointments.find(a => a.id === appointmentId);

  appointment.prescription.diagnosis = document.getElementById("diagInput").value;
  appointment.prescription.symptoms  = document.getElementById("symptomInput").value;
  appointment.prescription.advice    = document.getElementById("adviceInput").value;
  appointment.prescription.notes     = document.getElementById("notesInput").value;
  appointment.status = "prescribed";

  saveDB(db);

  alert("Prescription saved. Proceeding to billing...");
  renderBilling(appointmentId);
} 
  // ======================================================
// PHASE 4 — BILLING MODULE
// ======================================================

function renderBilling(appointmentId) {
  const { db } = getCurrentDoctorOrRedirect();
  const appointment = db.appointments.find(a => a.id === appointmentId);
  const doctor = db.users.find(u => u.id === appointment.doctorId);
  const patient = db.users.find(u => u.id === appointment.patientId);

  // Create billing object if not exists
  if (!appointment.billing) {
    appointment.billing = {
      consultationFee: doctor.doctorProfile?.fee || 500,
      items: [],
      discount: 0,
      total: 0,
      status: "pending"
    };
    saveDB(db);
  }

  const bill = appointment.billing;

  root.innerHTML = `
    <div class="app-content">

      <h2 class="section-title">Billing for ${patient.name}</h2>

      <div class="card">
        <label class="input-label">Consultation Fee</label>
        <input class="input-control" id="consultFee" type="number" value="${bill.consultationFee}">
      </div>

      <div class="card">
        <label class="input-label">Additional Charges</label>
        ${
          bill.items.length
          ? bill.items.map((i,idx)=>`
            <div class="simple-list-item" style="display:flex; justify-content:space-between; align-items:center;">
              <span>${i.title}: ₹${i.amount}</span>
              <button class="btn btn-danger" onclick="removeBillingItem('${appointmentId}', ${idx})">✕</button>
            </div>
          `).join('')
          : `<p class="text-muted">No extra charges added</p>`
        }
        <button class="btn-primary mt-12" onclick="renderAddBillingItem('${appointmentId}')">+ Add Charge</button>
      </div>

      <div class="card">
        <label class="input-label">Discount (₹)</label>
        <input class="input-control" id="discountInput" type="number" value="${bill.discount}">
      </div>

      <button class="btn-primary w-100 mt-16" onclick="calculateBill('${appointmentId}')">Calculate Total</button>

      <button class="btn-ghost w-100 mt-8" onclick="renderDoctorDashboard()">Cancel</button>
    </div>
  `;
}



// ===============================
// ADD BILL ITEM SCREEN
// ===============================

function renderAddBillingItem(appointmentId) {
  root.innerHTML = `
    <div class="app-content">
      <h2>Add Charge</h2>

      <div class="card">
        <label class="input-label">Charge Title</label>
        <input class="input-control" id="billTitle" placeholder="Ex: Blood Test, X-Ray">
      </div>

      <div class="card">
        <label class="input-label">Amount (₹)</label>
        <input class="input-control" id="billAmount" type="number" placeholder="Ex: 500">
      </div>

      <button class="btn-primary w-100" onclick="addBillingItem('${appointmentId}')">Add</button>
      <button class="btn-ghost w-100 mt-8" onclick="renderBilling('${appointmentId}')">Back</button>
    </div>
  `;
}

function addBillingItem(appointmentId) {
  const { db } = getCurrentDoctorOrRedirect();
  const appointment = db.appointments.find(a => a.id === appointmentId);

  const title = document.getElementById("billTitle").value.trim();
  const amount = parseInt(document.getElementById("billAmount").value.trim());

  if (!title || !amount) return alert("Both title and amount are required.");

  appointment.billing.items.push({ title, amount });
  saveDB(db);

  renderBilling(appointmentId);
}

function removeBillingItem(appointmentId, idx) {
  const { db } = getCurrentDoctorOrRedirect();
  const appointment = db.appointments.find(a => a.id === appointmentId);

  appointment.billing.items.splice(idx,1);
  saveDB(db);

  renderBilling(appointmentId);
}



// ===============================
// CALCULATE BILL + FINAL CONFIRMATION
// ===============================

function calculateBill(appointmentId) {
  const { db } = getCurrentDoctorOrRedirect();
  const appointment = db.appointments.find(a => a.id === appointmentId);

  const consultFee = parseInt(document.getElementById("consultFee").value);
  const discount = parseInt(document.getElementById("discountInput").value);

  const extraTotal = appointment.billing.items.reduce((sum,i)=>sum+i.amount,0);
  const total = consultFee + extraTotal - discount;

  appointment.billing.consultationFee = consultFee;
  appointment.billing.discount = discount;
  appointment.billing.total = total;
  appointment.billing.status = "ready";
  appointment.status = "completed"; // Appointment fully processed

  saveDB(db);

  alert(`Bill Created Successfully.\nTotal: ₹${total}`);

  // Notify patient
  if (!db.notifications) db.notifications=[];
  db.notifications.push({
    patientId: appointment.patientId,
    message:`Your bill is ready. Total: ₹${total}`,
    timestamp:Date.now(),
    read:false
  });
  saveDB(db);

  renderBillingSummary(appointmentId);
}



// ===============================
// BILL SUMMARY (Review + PDF/Download next)
// ===============================

function renderBillingSummary(appointmentId) {
  const { db } = getCurrentDoctorOrRedirect();
  const appointment = db.appointments.find(a => a.id === appointmentId);
  const bill = appointment.billing;
  const patient = db.users.find(u => u.id === appointment.patientId);

  root.innerHTML = `
    <div class="app-content">

      <h2>Final Bill</h2>

      <div class="card">
        <strong>Patient:</strong> ${patient.name}<br>
        <strong>Total:</strong> ₹${bill.total}
      </div>

      <button class="btn-primary w-100 mt-16" onclick="alert('PDF + Print will be available in next phase')">📄 Download PDF (Coming Next)</button>
      <button class="btn-ghost w-100 mt-8" onclick="renderDoctorDashboard()">Finish</button>
    </div>
  `;
}
  // ======================================================
// PRESCRIPTION PDF GENERATOR (PDFMake Hybrid Style)
// ======================================================

async function generatePrescriptionPDF(appointmentId) {
  const { db } = getCurrentDoctorOrRedirect();
  const appointment = db.appointments.find(a => a.id === appointmentId);
  const doctor = db.users.find(u => u.id === appointment.doctorId);
  const patient = db.users.find(u => u.id === appointment.patientId);
  const p = appointment.prescription;

  // Smart QR Token
  const token = `${appointmentId}-${Date.now()}`;
  appointment.qrToken = token;
  saveDB(db);

  // Medicines table format
  const medRows = [
    ["Medicine", "Dose", "Frequency", "Days", "Notes"],
    ...p.medicines.map(m => [m.name, m.dose, m.frequency, m.days, m.notes || "-"])
  ];

  const docDefinition = {
    content: [
      {
        text: "DOCTORCARE",
        style: "header"
      },
      { text: "Your health, made simple.\n\n", style: "subheader" },
      { text: `${doctor.name}`, style: "docname" },
      { text: `${doctor.doctorProfile.specialization}\n\n`, style: "subtitle" },

      {
        text: `Patient: ${patient.name}\nDate: ${appointment.date}\nTime: ${appointment.time}\n\n`,
        style: "section"
      },

      { text: `Diagnosis:\n${p.diagnosis}\n\n`, style: "section" },
      { text: `Symptoms:\n${p.symptoms}\n\n`, style: "section" },

      { text: "Medicines", style: "tableHeader" },
      {
        table: { headerRows: 1, widths: ["*", 50, 60, 40, "*"], body: medRows },
        margin: [0, 10, 0, 20]
      },

      { text: `Advice:\n${p.advice}\n\n`, style: "section" },
      { text: `Additional Notes:\n${p.notes}\n\n`, style: "section" },

      {
        text: `Signature: ______________________`,
        margin: [0, 40, 0, 10]
      },
      {
        text: `Verification QR Token: ${token}`,
        style: "qr"
      }
    ],

    styles: {
      header: { fontSize: 22, bold: true, alignment: "center", margin: [0, 10, 0, 0] },
      subheader: { fontSize: 12, alignment: "center", margin: [0, 0, 0, 20] },
      docname: { fontSize: 18, bold: true, alignment: "center" },
      subtitle: { fontSize: 12, alignment: "center", color: "#444", margin: [0, 0, 0, 20] },
      section: { fontSize: 12, margin: [0, 4] },
      tableHeader: { bold: true, fontSize: 14, margin: [0, 6] },
      qr: { fontSize: 9, opacity: 0.6, alignment: "center" }
    }
  };

  pdfMake.createPdf(docDefinition).download(`Prescription-${patient.name}.pdf`);

  // Save "PDF generated" record
  appointment.prescription.pdfGenerated = true;
  saveDB(db);

  alert("Prescription PDF created.");
}




})();
